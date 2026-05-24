import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Settings, Play, CheckCircle2, AlertTriangle, Plus, Eye, FileText,
  Calendar, DollarSign, Layers, ChevronRight, RefreshCw,
} from "lucide-react";

interface CompanyRetainerTabProps {
  companyId: string;
  companyName?: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500",
  draft: "bg-yellow-500",
  paused: "bg-orange-500",
  cancelled: "bg-red-500",
};

const CADENCE_LABEL: Record<string, string> = {
  monthly: "Monthly", quarterly: "Quarterly", annual: "Annual",
  once: "Once", weekly: "Weekly", custom: "Custom",
};

const ROLE_LABEL: Record<string, string> = {
  account_manager: "Account Manager", strategist: "Strategist",
  content_lead: "Content Lead", designer: "Designer",
  developer: "Developer", hubspot_specialist: "HubSpot Specialist",
  ads_manager: "Ads Manager",
};

function useRetainerAssignment(companyId: string) {
  return useQuery<any>({
    queryKey: [`/api/companies/${companyId}/retainer-assignment`],
  });
}

function useRetainerTemplates() {
  return useQuery<any[]>({ queryKey: ["/api/retainer-templates"] });
}

function useServiceTracks() {
  return useQuery<any[]>({ queryKey: ["/api/service-tracks"] });
}

// ── Assignment Edit Dialog ────────────────────────────────────────────────────
function AssignmentEditDialog({
  open, onOpenChange, companyId, assignment, retainerTemplates, serviceTracks,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  assignment: any | null;
  retainerTemplates: any[];
  serviceTracks: any[];
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEdit = !!assignment;

  const [templateId, setTemplateId] = useState(assignment?.retainerTemplateId || "");
  const [status, setStatus] = useState(assignment?.status || "draft");
  const [startDate, setStartDate] = useState(assignment?.startDate || new Date().toISOString().split("T")[0]);
  const [billingDay, setBillingDay] = useState(String(assignment?.billingDayOfMonth || 1));
  const [creditOverride, setCreditOverride] = useState(assignment?.monthlyCreditAllocationOverride != null ? String(assignment.monthlyCreditAllocationOverride) : "");
  const [priceOverride, setPriceOverride] = useState(assignment?.monthlyPriceOverride != null ? String(assignment.monthlyPriceOverride) : "");
  const [genWindowOverride, setGenWindowOverride] = useState(assignment?.generationWindowDaysOverride != null ? String(assignment.generationWindowDaysOverride) : "");
  const [notes, setNotes] = useState(assignment?.notes || "");

  // Service track selections (from assignment or default to template defaults)
  const selectedTemplate = retainerTemplates.find(t => t.id === templateId);
  const existingTrackIds = new Set((assignment?.serviceTracks || []).map((st: any) => st.serviceTrackId));
  const [activeTrackIds, setActiveTrackIds] = useState<Set<string>>(
    existingTrackIds.size > 0
      ? existingTrackIds
      : new Set(serviceTracks.map(t => t.id))
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        retainerTemplateId: templateId,
        status,
        startDate,
        billingDayOfMonth: parseInt(billingDay) || 1,
        monthlyCreditAllocationOverride: creditOverride !== "" ? parseFloat(creditOverride) : null,
        monthlyPriceOverride: priceOverride !== "" ? parseFloat(priceOverride) : null,
        generationWindowDaysOverride: genWindowOverride !== "" ? parseInt(genWindowOverride) : null,
        notes: notes || null,
      };
      const r = await apiRequest("PUT", `/api/companies/${companyId}/retainer-assignment`, body);
      const saved = await r.json();

      // Save service tracks
      const tracks = serviceTracks.map(t => ({
        serviceTrackId: t.id,
        isActive: activeTrackIds.has(t.id),
        notes: null,
      }));
      await apiRequest("PUT", `/api/companies/${companyId}/retainer-assignment/service-tracks`, { tracks });
      return saved;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/companies/${companyId}/retainer-assignment`] });
      toast({ title: isEdit ? "Retainer updated" : "Retainer assigned" });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleTrack = (id: string) => {
    const next = new Set(activeTrackIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setActiveTrackIds(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Retainer Assignment" : "Assign Retainer Template"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Retainer Template *</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger data-testid="select-retainer-template">
                <SelectValue placeholder="Select a template…" />
              </SelectTrigger>
              <SelectContent>
                {retainerTemplates.filter(t => t.status === "active").map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate && (
              <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger data-testid="select-retainer-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} data-testid="input-retainer-start-date" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Billing Day</Label>
              <Input type="number" min={1} max={28} value={billingDay} onChange={e => setBillingDay(e.target.value)} data-testid="input-billing-day" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Credits Override</Label>
              <Input type="number" placeholder={selectedTemplate?.monthlyCreditAllocation || "—"} value={creditOverride} onChange={e => setCreditOverride(e.target.value)} data-testid="input-credit-override" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Gen. Window (days)</Label>
              <Input type="number" placeholder={selectedTemplate?.generationWindowDays || "60"} value={genWindowOverride} onChange={e => setGenWindowOverride(e.target.value)} data-testid="input-gen-window" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Monthly Price Override ($)</Label>
            <Input type="number" placeholder={selectedTemplate?.suggestedMonthlyPrice ? `Template default: $${selectedTemplate.suggestedMonthlyPrice}` : "—"} value={priceOverride} onChange={e => setPriceOverride(e.target.value)} data-testid="input-price-override" />
          </div>

          {serviceTracks.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Active Service Tracks</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {serviceTracks.map(t => (
                  <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-muted/50">
                    <Checkbox
                      checked={activeTrackIds.has(t.id)}
                      onCheckedChange={() => toggleTrack(t.id)}
                      data-testid={`checkbox-track-${t.id}`}
                    />
                    <span>{t.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes about this retainer arrangement…" rows={2} data-testid="textarea-retainer-notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!templateId || !startDate || saveMutation.isPending}
            className="bg-orange-500 hover:bg-orange-600 text-white"
            data-testid="button-save-retainer"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            {isEdit ? "Save Changes" : "Assign Retainer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Preview Dialog ────────────────────────────────────────────────────────────
function PreviewTasksDialog({
  open, onOpenChange, companyId, assignment, serviceTracks, monthlyAllowance,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  assignment: any;
  serviceTracks: any[];
  monthlyAllowance: number;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [periodStart, setPeriodStart] = useState(assignment?.startDate || new Date().toISOString().split("T")[0]);
  const [periodDays, setPeriodDays] = useState<30 | 60 | 90>(30);
  const [includeMonthly, setIncludeMonthly] = useState(true);
  const [includeQuarterly, setIncludeQuarterly] = useState(false);
  const [includeAnnual, setIncludeAnnual] = useState(false);
  const activeServiceTrackIds = (assignment?.serviceTracks || []).filter((t: any) => t.isActive).map((t: any) => t.serviceTrackId);
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>(activeServiceTrackIds);
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const previewMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", `/api/companies/${companyId}/retainer-assignment/preview-tasks`, {
        retainerTemplateId: assignment.retainerTemplateId,
        serviceTrackIds: selectedTrackIds,
        periodStart,
        periodDays,
        includeMonthly,
        includeQuarterly,
        includeAnnual,
      });
      return r.json();
    },
    onSuccess: (data) => setPreviewResult(data),
    onError: (e: any) => toast({ title: "Preview failed", description: e.message, variant: "destructive" }),
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const periodEnd = new Date(new Date(periodStart).getTime() + periodDays * 86400000).toISOString().split("T")[0];
      const r = await apiRequest("POST", `/api/companies/${companyId}/retainer-assignment/confirm-tasks`, {
        tasks: previewResult?.tasks || [],
        periodStart,
        periodEnd,
        retainerTemplateId: assignment?.retainerTemplateId ?? "",
        clientRetainerAssignmentId: assignment?.id ?? "",
      });
      return r.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [`/api/tasks`] });
      qc.invalidateQueries({ queryKey: [`/api/companies/${companyId}`] });
      qc.invalidateQueries({ queryKey: [`/api/companies/${companyId}/credit-projection`] });
      const skippedMsg = data.skipped > 0 ? ` (${data.skipped} skipped — already generated)` : "";
      toast({ title: `Created ${data.created} task${data.created !== 1 ? "s" : ""}${skippedMsg}` });
      setConfirmOpen(false);
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Error creating tasks", description: e.message, variant: "destructive" }),
  });

  const toggleTrack = (id: string) => {
    setSelectedTrackIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const duplicateCount = previewResult?.tasks.filter((t: any) => t.isDuplicate).length || 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Preview Retainer Tasks
            </DialogTitle>
          </DialogHeader>

          {/* Options row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-2 border-y">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Period Start</Label>
              <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} data-testid="input-preview-period-start" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Period Length</Label>
              <Select value={String(periodDays)} onValueChange={v => setPeriodDays(parseInt(v) as 30 | 60 | 90)}>
                <SelectTrigger data-testid="select-period-days">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cadences</Label>
              <div className="flex flex-col gap-1 pt-0.5">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox checked={includeMonthly} onCheckedChange={v => setIncludeMonthly(!!v)} data-testid="checkbox-include-monthly" />
                  Monthly
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox checked={includeQuarterly} onCheckedChange={v => setIncludeQuarterly(!!v)} data-testid="checkbox-include-quarterly" />
                  Quarterly
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox checked={includeAnnual} onCheckedChange={v => setIncludeAnnual(!!v)} data-testid="checkbox-include-annual" />
                  Annual
                </label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Service Tracks</Label>
              <div className="flex flex-col gap-1 pt-0.5 max-h-20 overflow-y-auto">
                {serviceTracks.map(t => (
                  <label key={t.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox checked={selectedTrackIds.includes(t.id)} onCheckedChange={() => toggleTrack(t.id)} data-testid={`checkbox-preview-track-${t.id}`} />
                    {t.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <p className="text-sm text-muted-foreground">Configure options above, then generate a preview.</p>
            <Button
              onClick={() => previewMutation.mutate()}
              disabled={previewMutation.isPending}
              variant="outline"
              className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-950/20"
              data-testid="button-generate-preview"
            >
              {previewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
              Generate Preview
            </Button>
          </div>

          {/* Preview results */}
          {previewResult && (
            <div className="flex-1 min-h-0 flex flex-col gap-3">
              {/* Totals bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border-0 bg-muted/40">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Projected Credits</p>
                    <p className="text-lg font-bold">{previewResult.totals.totalCredits.toFixed(1)}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-muted/40">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Monthly Allowance</p>
                    <p className="text-lg font-bold">{previewResult.totals.monthlyAllowance}</p>
                  </CardContent>
                </Card>
                <Card className={`border-0 ${previewResult.totals.projectedOverage > 0 ? "bg-red-50 dark:bg-red-950/20" : "bg-green-50 dark:bg-green-950/20"}`}>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">
                      {previewResult.totals.projectedOverage > 0 ? "Projected Overage" : "Remaining Credits"}
                    </p>
                    <p className={`text-lg font-bold ${previewResult.totals.projectedOverage > 0 ? "text-red-600" : "text-green-600"}`}>
                      {previewResult.totals.projectedOverage > 0
                        ? `+${previewResult.totals.projectedOverage.toFixed(1)}`
                        : previewResult.totals.remainingCredits.toFixed(1)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-muted/40">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Tasks</p>
                    <p className="text-lg font-bold">{previewResult.tasks.length}</p>
                    {duplicateCount > 0 && (
                      <p className="text-xs text-yellow-600">{duplicateCount} likely duplicate{duplicateCount > 1 ? "s" : ""}</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* By service track */}
              {Object.keys(previewResult.totals.byServiceTrack).length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(previewResult.totals.byServiceTrack).map(([track, credits]: any) => (
                    <Badge key={track} variant="secondary" className="text-xs">
                      {track}: {credits.toFixed(1)} cr
                    </Badge>
                  ))}
                </div>
              )}

              {/* Task table */}
              <ScrollArea className="flex-1 min-h-0 border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/60 backdrop-blur z-10">
                    <tr>
                      <th className="text-left p-2 font-medium text-muted-foreground">Task</th>
                      <th className="text-left p-2 font-medium text-muted-foreground hidden md:table-cell">Track</th>
                      <th className="text-left p-2 font-medium text-muted-foreground hidden md:table-cell">Cadence</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Due Date</th>
                      <th className="text-left p-2 font-medium text-muted-foreground hidden lg:table-cell">Owner Role</th>
                      <th className="text-right p-2 font-medium text-muted-foreground">Credits</th>
                      <th className="text-center p-2 font-medium text-muted-foreground hidden lg:table-cell">Client</th>
                      <th className="text-center p-2 font-medium text-muted-foreground hidden lg:table-cell">Approval</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewResult.tasks.map((t: any, i: number) => (
                      <tr key={i} className={`border-t ${t.isDuplicate ? "bg-yellow-50/60 dark:bg-yellow-950/20" : "hover:bg-muted/30"}`}>
                        <td className="p-2">
                          <div className="flex items-start gap-1.5">
                            {t.isDuplicate && (
                              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />
                            )}
                            <span className="font-medium">{t.title}{t.instanceIndex > 1 ? ` #${t.instanceIndex}` : ""}</span>
                          </div>
                        </td>
                        <td className="p-2 text-muted-foreground hidden md:table-cell">{t.serviceTrackName}</td>
                        <td className="p-2 hidden md:table-cell">
                          <Badge variant="outline" className="text-xs">{CADENCE_LABEL[t.cadence] || t.cadence}</Badge>
                        </td>
                        <td className="p-2 font-mono">{t.dueDate}</td>
                        <td className="p-2 text-muted-foreground hidden lg:table-cell">{ROLE_LABEL[t.roleOwner] || t.roleOwner}</td>
                        <td className="p-2 text-right font-mono">{t.creditCost}</td>
                        <td className="p-2 text-center hidden lg:table-cell">
                          {t.clientVisible ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 inline" /> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="p-2 text-center hidden lg:table-cell">
                          {t.requiresApproval ? <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 inline" /> : <span className="text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          )}

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            {previewResult && previewResult.tasks.length > 0 && (
              <Button
                onClick={() => setConfirmOpen(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white"
                data-testid="button-confirm-create-tasks"
              >
                <Play className="h-4 w-4 mr-1.5" />
                Confirm & Create {previewResult.tasks.length} Task{previewResult.tasks.length !== 1 ? "s" : ""}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create {previewResult?.tasks.length} tasks?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create {previewResult?.tasks.length} tasks for this company, consuming approximately{" "}
              <strong>{previewResult?.totals.totalCredits.toFixed(1)} credits</strong>.
              {duplicateCount > 0 && (
                <span className="block mt-1 text-yellow-600">⚠ {duplicateCount} task{duplicateCount > 1 ? "s" : ""} may already exist in this period.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
              data-testid="button-confirm-create-tasks-final"
            >
              {confirmMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Create Tasks
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Main Tab Component ────────────────────────────────────────────────────────
export function CompanyRetainerTab({ companyId, companyName }: CompanyRetainerTabProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: assignment, isLoading: assignmentLoading } = useRetainerAssignment(companyId);
  const { data: retainerTemplates = [] } = useRetainerTemplates();
  const { data: serviceTracks = [] } = useServiceTracks();

  const monthlyAllowance = assignment?.monthlyCreditAllocationOverride
    ?? assignment?.template?.monthlyCreditAllocation
    ?? 0;

  if (assignmentLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  const activeServiceTracks = (assignment?.serviceTracks || []).filter((t: any) => t.isActive);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold">Retainer Assignment</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Connect this company to a retainer template and configure its service tracks.</p>
        </div>
        <div className="flex items-center gap-2">
          {assignment && (
            <Button
              variant="outline"
              className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-950/20"
              onClick={() => setPreviewOpen(true)}
              data-testid="button-preview-retainer-tasks"
            >
              <Eye className="h-4 w-4 mr-1.5" />
              Preview Retainer Tasks
            </Button>
          )}
          <Button
            onClick={() => setEditOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white"
            data-testid="button-assign-retainer"
          >
            {assignment ? <Settings className="h-4 w-4 mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
            {assignment ? "Edit Assignment" : "Assign Retainer"}
          </Button>
        </div>
      </div>

      {!assignment ? (
        <Card>
          <CardContent className="pt-10 pb-10 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">No retainer assigned</p>
            <p className="text-sm text-muted-foreground mt-1">Assign a retainer template to start generating tasks for this client.</p>
            <Button className="mt-4 bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setEditOpen(true)} data-testid="button-assign-retainer-empty">
              <Plus className="h-4 w-4 mr-1.5" />
              Assign Retainer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Overview card */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  {assignment.template?.name || "Retainer Template"}
                </CardTitle>
                <Badge className={`${STATUS_COLORS[assignment.status]} text-white text-xs capitalize`}>
                  {assignment.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Start Date</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {assignment.startDate}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Monthly Credits</p>
                  <p className="font-medium">
                    {assignment.monthlyCreditAllocationOverride != null
                      ? `${assignment.monthlyCreditAllocationOverride} (override)`
                      : (assignment.template?.monthlyCreditAllocation || "—")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Monthly Price</p>
                  <p className="font-medium flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                    {assignment.monthlyPriceOverride != null
                      ? `$${parseFloat(assignment.monthlyPriceOverride).toFixed(0)} (override)`
                      : assignment.template?.suggestedMonthlyPrice
                        ? `$${parseFloat(assignment.template.suggestedMonthlyPrice).toFixed(0)}`
                        : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Gen. Window</p>
                  <p className="font-medium">
                    {assignment.generationWindowDaysOverride != null
                      ? `${assignment.generationWindowDaysOverride}d (override)`
                      : `${assignment.template?.generationWindowDays || 60}d`}
                  </p>
                </div>
              </div>

              {/* Scope summary */}
              {(assignment.template?.includedScopeSummary || assignment.template?.excludedScopeSummary || assignment.template?.overageRules) && (
                <>
                  <Separator className="my-3" />
                  <div className="grid md:grid-cols-3 gap-3 text-xs">
                    {assignment.template.includedScopeSummary && (
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Included Scope</p>
                        <p className="text-foreground/80 whitespace-pre-line">{assignment.template.includedScopeSummary}</p>
                      </div>
                    )}
                    {assignment.template.excludedScopeSummary && (
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Exclusions</p>
                        <p className="text-foreground/80 whitespace-pre-line">{assignment.template.excludedScopeSummary}</p>
                      </div>
                    )}
                    {assignment.template.overageRules && (
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Overage Rules</p>
                        <p className="text-foreground/80 whitespace-pre-line">{assignment.template.overageRules}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Cadences */}
              {(assignment.template?.reportingCadence || assignment.template?.meetingCadence) && (
                <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                  {assignment.template.reportingCadence && (
                    <span>Reporting: <strong className="text-foreground">{assignment.template.reportingCadence}</strong></span>
                  )}
                  {assignment.template.meetingCadence && (
                    <span>Meetings: <strong className="text-foreground">{assignment.template.meetingCadence}</strong></span>
                  )}
                </div>
              )}

              {assignment.notes && (
                <p className="mt-3 text-xs text-muted-foreground border-t pt-2">{assignment.notes}</p>
              )}
            </CardContent>
          </Card>

          {/* Service Tracks card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Active Service Tracks</CardTitle>
            </CardHeader>
            <CardContent>
              {assignment.serviceTracks?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No service tracks configured — click Edit Assignment to add them.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(assignment.serviceTracks || []).map((st: any) => (
                    <Badge
                      key={st.id}
                      variant={st.isActive ? "default" : "outline"}
                      className={st.isActive ? "bg-primary/10 text-primary border-primary/20" : "opacity-50"}
                      data-testid={`badge-track-${st.serviceTrackId}`}
                    >
                      {st.track?.name || st.serviceTrackId}
                      {!st.isActive && " (inactive)"}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialogs */}
      <AssignmentEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        companyId={companyId}
        assignment={assignment || null}
        retainerTemplates={retainerTemplates}
        serviceTracks={serviceTracks}
      />

      {assignment && (
        <PreviewTasksDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          companyId={companyId}
          assignment={assignment}
          serviceTracks={serviceTracks}
          monthlyAllowance={monthlyAllowance}
        />
      )}
    </div>
  );
}
