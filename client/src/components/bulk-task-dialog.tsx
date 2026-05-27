import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Company } from "@shared/schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkTaskDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { data: companies = [] } = useQuery<Company[]>({ queryKey: ["/api/companies"] });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [dueDate, setDueDate] = useState<string>("");
  const [creditCost, setCreditCost] = useState<string>("1");
  const [noCredit, setNoCredit] = useState(true);
  const [clientVisible, setClientVisible] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const sortedCompanies = useMemo(
    () =>
      [...companies]
        .filter((c) => c.name?.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [companies, search],
  );

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelectedIds(new Set(sortedCompanies.map((c) => c.id)));
  const clearAll = () => setSelectedIds(new Set());

  const reset = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate("");
    setCreditCost("1");
    setNoCredit(true);
    setClientVisible(true);
    setSelectedIds(new Set());
    setSearch("");
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tasks/bulk-companies", {
        companyIds: Array.from(selectedIds),
        task: {
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          dueDate: dueDate || undefined,
          creditCost: noCredit ? "0" : creditCost,
          noCredit,
          clientVisible,
        },
      });
      return res.json() as Promise<{ created: any[]; failed: any[]; total: number }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      const okCount = data.created?.length || 0;
      const failCount = data.failed?.length || 0;
      toast({
        title: `Created ${okCount}/${data.total} tasks`,
        description: failCount > 0 ? `${failCount} failed — see console.` : "All tasks created successfully.",
        variant: failCount > 0 ? "destructive" : "default",
      });
      if (failCount === 0) {
        reset();
        onOpenChange(false);
      }
    },
    onError: (e: any) => {
      toast({ title: "Bulk creation failed", description: e?.message || "", variant: "destructive" });
    },
  });

  const canSubmit = title.trim().length > 0 && selectedIds.size > 0 && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-bulk-task">
        <DialogHeader>
          <DialogTitle>Create task for multiple companies</DialogTitle>
          <DialogDescription>
            Create the same task across many client companies in one go. One task record is created per
            selected company.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden flex-1">
          {/* Task fields */}
          <div className="space-y-4 overflow-y-auto pr-2">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="bulk-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Update Facebook cover photo"
                data-testid="input-bulk-title"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-desc">Description</Label>
              <Textarea
                id="bulk-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What needs to be done for each company?"
                rows={4}
                data-testid="textarea-bulk-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger data-testid="select-bulk-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bulk-due">Due date</Label>
                <Input
                  id="bulk-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  data-testid="input-bulk-duedate"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="bulk-nocredit"
                checked={noCredit}
                onCheckedChange={(v) => setNoCredit(!!v)}
                data-testid="checkbox-bulk-nocredit"
              />
              <Label htmlFor="bulk-nocredit" className="text-sm font-normal">
                No credit cost (internal / housekeeping)
              </Label>
            </div>
            {!noCredit && (
              <div className="space-y-1.5">
                <Label htmlFor="bulk-credit">Credit cost per company</Label>
                <Input
                  id="bulk-credit"
                  type="number"
                  min="0"
                  step="0.5"
                  value={creditCost}
                  onChange={(e) => setCreditCost(e.target.value)}
                  data-testid="input-bulk-credit"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Checkbox
                id="bulk-client-visible"
                checked={clientVisible}
                onCheckedChange={(v) => setClientVisible(!!v)}
                data-testid="checkbox-bulk-visible"
              />
              <Label htmlFor="bulk-client-visible" className="text-sm font-normal">
                Visible to client
              </Label>
            </div>
          </div>

          {/* Company multi-select */}
          <div className="flex flex-col min-h-0 border rounded-md">
            <div className="px-3 py-2 border-b flex items-center justify-between gap-2">
              <div className="text-sm font-medium">
                Companies <Badge variant="secondary" className="ml-1" data-testid="badge-selected-count">{selectedIds.size}</Badge>
              </div>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={selectAll} data-testid="button-select-all">All</Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearAll} data-testid="button-clear-all">None</Button>
              </div>
            </div>
            <div className="px-3 py-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search companies..."
                  className="pl-7 h-8"
                  data-testid="input-company-search"
                />
              </div>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <ul className="divide-y">
                {sortedCompanies.map((c) => {
                  const checked = selectedIds.has(c.id);
                  return (
                    <li key={c.id}>
                      <label
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/40"
                        data-testid={`row-company-${c.id}`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggle(c.id)}
                          data-testid={`checkbox-company-${c.id}`}
                        />
                        <span className="text-sm">{c.name}</span>
                      </label>
                    </li>
                  );
                })}
                {sortedCompanies.length === 0 && (
                  <li className="px-3 py-6 text-sm text-muted-foreground text-center">No companies match.</li>
                )}
              </ul>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-bulk-cancel">Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            data-testid="button-bulk-create"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Create {selectedIds.size > 0 ? `${selectedIds.size} task${selectedIds.size === 1 ? "" : "s"}` : "tasks"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
