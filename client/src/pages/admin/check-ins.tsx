import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, ChevronDown, Trash2, Pencil, Calendar, Users, Clock, CheckCircle, Circle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { CheckinQuestion, CheckinResponse } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily", weekly: "Weekly", "bi-weekly": "Bi-weekly", monthly: "Monthly",
};
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function timeAgo(ts?: string | null) {
  if (!ts) return "";
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true }); } catch { return ""; }
}

function Avatar({ name, size = 7 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={cn("rounded-full bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 font-semibold flex items-center justify-center shrink-0 text-xs", `h-${size} w-${size}`)}>
      {initials}
    </div>
  );
}

export default function AdminCheckIns() {
  const { toast } = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [question, setQuestion] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [scheduledDays, setScheduledDays] = useState<string[]>(["Friday"]);
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [recipientType, setRecipientType] = useState("all_agency");

  const { data: questions = [], isLoading } = useQuery<CheckinQuestion[]>({
    queryKey: ["/api/check-ins"],
    queryFn: async () => { const r = await fetch("/api/check-ins"); return r.json(); },
  });

  const { data: responses = [] } = useQuery<CheckinResponse[]>({
    queryKey: ["/api/check-ins", expandedId, "responses"],
    queryFn: async () => {
      if (!expandedId) return [];
      const r = await fetch(`/api/check-ins/${expandedId}/responses`);
      return r.json();
    },
    enabled: !!expandedId,
  });

  const resetForm = () => {
    setQuestion(""); setFrequency("weekly"); setScheduledDays(["Friday"]);
    setScheduledTime("09:00"); setRecipientType("all_agency"); setEditingId(null);
  };

  const openNew = () => { resetForm(); setSheetOpen(true); };
  const openEdit = (q: CheckinQuestion) => {
    setQuestion(q.question); setFrequency(q.frequency);
    setScheduledDays(q.scheduledDays ?? ["Friday"]); setScheduledTime(q.scheduledTime ?? "09:00");
    setRecipientType(q.recipientType ?? "all_agency"); setEditingId(q.id);
    setSheetOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/check-ins", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/check-ins"] }); setSheetOpen(false); resetForm(); toast({ title: "Check-in created" }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PATCH", `/api/check-ins/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/check-ins"] }); setSheetOpen(false); resetForm(); toast({ title: "Check-in updated" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/check-ins/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/check-ins"] }); toast({ title: "Check-in deleted" }); },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: any) => apiRequest("PATCH", `/api/check-ins/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/check-ins"] }),
  });

  const handleSave = () => {
    const data = { question, frequency, scheduledDays, scheduledTime, recipientType, createdBy: "admin" };
    if (editingId) updateMutation.mutate({ id: editingId, data });
    else createMutation.mutate(data);
  };

  const toggleDay = (day: string) => {
    setScheduledDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  // Group responses by question + sentAt
  const groupedResponses = responses.reduce<Record<string, CheckinResponse[]>>((acc, r) => {
    const key = r.sentAt ?? r.respondedAt;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const sortedGroups = Object.entries(groupedResponses).sort(([a], [b]) => b.localeCompare(a));

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Check-ins</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Automatic questions sent to your team on a schedule</p>
          </div>
          <Button className="gap-2" onClick={openNew} data-testid="button-new-checkin">
            <Plus className="h-4 w-4" /> New Check-in
          </Button>
        </div>

        {/* Questions list */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
        ) : questions.length === 0 ? (
          <div className="text-center py-16 border rounded-lg text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No check-ins yet</p>
            <p className="text-sm mt-1">Create automated questions to keep your team aligned</p>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map(q => (
              <Collapsible key={q.id} open={expandedId === q.id} onOpenChange={open => setExpandedId(open ? q.id : null)}>
                <div className="border rounded-lg overflow-hidden">
                  <div className="p-4 flex items-start gap-4">
                    <div className="flex-1 space-y-1.5">
                      <p className="font-medium text-sm">{q.question}</p>
                      <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{FREQUENCY_LABELS[q.frequency] ?? q.frequency}
                          {q.scheduledDays?.length ? ` · ${q.scheduledDays.join(", ")}` : ""}
                        </span>
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{q.scheduledTime ?? "09:00"}</span>
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{q.recipientType === "all_agency" ? "Everyone" : "Specific people"}</span>
                        {q.lastSentAt && <span>Last sent {timeAgo(q.lastSentAt)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={q.isActive}
                        onCheckedChange={v => toggleActiveMutation.mutate({ id: q.id, isActive: v })}
                        data-testid={`toggle-active-${q.id}`}
                      />
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(q)} data-testid={`button-edit-${q.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" data-testid={`button-delete-${q.id}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete this check-in?</AlertDialogTitle><AlertDialogDescription>All response history will also be deleted.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(q.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`button-expand-${q.id}`}>
                          <ChevronDown className={cn("h-4 w-4 transition-transform", expandedId === q.id && "rotate-180")} />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>

                  <CollapsibleContent>
                    <div className="border-t bg-muted/20 p-4 space-y-4">
                      {sortedGroups.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No responses yet</p>
                      ) : (
                        sortedGroups.map(([sentAt, groupResponses]) => (
                          <div key={sentAt}>
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Sent {timeAgo(sentAt)}
                            </p>
                            <div className="space-y-2">
                              {groupResponses.map(resp => (
                                <div key={resp.id} className="flex gap-3 items-start" data-testid={`response-${resp.id}`}>
                                  <Avatar name={resp.responderName} size={7} />
                                  <div className="flex-1 bg-background border rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-medium">{resp.responderName}</span>
                                      <span className="text-xs text-muted-foreground">{timeAgo(resp.respondedAt)}</span>
                                      <CheckCircle className="h-3.5 w-3.5 text-green-500 ml-auto" />
                                    </div>
                                    <p className="text-sm">{resp.response}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}

        {/* Slide-out form */}
        <Sheet open={sheetOpen} onOpenChange={open => { setSheetOpen(open); if (!open) resetForm(); }}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{editingId ? "Edit Check-in" : "New Check-in"}</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Question</label>
                <Textarea
                  placeholder="e.g. What did you complete for clients this week?"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  rows={3}
                  data-testid="textarea-question"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Frequency</label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger data-testid="select-frequency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FREQUENCY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {(frequency === "weekly" || frequency === "bi-weekly") && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Send on</label>
                  <div className="flex gap-2 flex-wrap">
                    {DAYS.map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        data-testid={`day-${day.toLowerCase()}`}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-sm border transition-colors",
                          scheduledDays.includes(day)
                            ? "bg-orange-500 text-white border-orange-500"
                            : "border-border hover:bg-muted"
                        )}>
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Send at</label>
                <Input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="w-36" data-testid="input-time" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Recipients</label>
                <Select value={recipientType} onValueChange={setRecipientType}>
                  <SelectTrigger data-testid="select-recipients"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_agency">Everyone (all agency staff)</SelectItem>
                    <SelectItem value="specific">Specific people</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setSheetOpen(false); resetForm(); }}>Cancel</Button>
                <Button onClick={handleSave} disabled={!question.trim() || createMutation.isPending || updateMutation.isPending} data-testid="button-save-checkin">
                  {editingId ? "Save Changes" : "Create Check-in"}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </AdminLayout>
  );
}
