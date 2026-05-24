import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, Send, Save, X, Plus, Trash2 } from "lucide-react";

export type EmailTemplateType =
  | "approval_request"
  | "meeting_recap"
  | "task_reminder"
  | "monthly_report_ready"
  | "monthly_report_client"
  | "planning_gap_alert";

const TEMPLATE_LABELS: Record<EmailTemplateType, string> = {
  approval_request: "Approval Request",
  meeting_recap: "Meeting Recap",
  task_reminder: "Task Reminder (Internal)",
  monthly_report_ready: "Monthly Report — Admin Review",
  monthly_report_client: "Monthly Report — Client",
  planning_gap_alert: "Planning Gap Alert (Internal)",
};

const TEMPLATE_DESCRIPTIONS: Record<EmailTemplateType, string> = {
  approval_request: "Ask a client to review and approve a deliverable.",
  meeting_recap: "Send meeting notes with decisions and follow-up tasks.",
  task_reminder: "Internal reminder about overdue or due-soon tasks.",
  monthly_report_ready: "Notify an admin that a report is ready for review.",
  monthly_report_client: "Send the monthly performance report to the client.",
  planning_gap_alert: "Internal alert when a client has no work scheduled soon.",
};

interface EmailComposerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName?: string;
  defaultTemplate?: EmailTemplateType;
  defaultRelatedTaskId?: string;
  defaultRelatedCampaignId?: string;
  defaultRelatedMeetingId?: string;
  defaultRelatedReportId?: string;
  onSuccess?: () => void;
}

export function EmailComposerDialog({
  open,
  onOpenChange,
  companyId,
  companyName = "",
  defaultTemplate,
  defaultRelatedTaskId,
  defaultRelatedCampaignId,
  defaultRelatedMeetingId,
  defaultRelatedReportId,
  onSuccess,
}: EmailComposerDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"compose" | "preview">("compose");
  const [templateType, setTemplateType] = useState<EmailTemplateType>(defaultTemplate || "approval_request");
  const [recipients, setRecipients] = useState<string[]>([""]);
  const [previewData, setPreviewData] = useState<{ subject: string; html: string } | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);

  // Template-specific fields
  const [fields, setFields] = useState<Record<string, any>>({});

  useEffect(() => {
    setFields({});
    setPreviewData(null);
    setStep("compose");
    setDraftId(null);
  }, [templateType, open]);

  const setField = (key: string, value: any) => setFields(f => ({ ...f, [key]: value }));

  const buildTemplateData = () => {
    const portalLink = `${window.location.origin}/admin/companies/${companyId}`;
    switch (templateType) {
      case "approval_request":
        return {
          recipientName: fields.recipientName || "Client",
          companyName: fields.companyName || companyName,
          deliverableTitle: fields.deliverableTitle || "",
          deliverableType: fields.deliverableType || "task",
          deliverableDescription: fields.deliverableDescription || "",
          portalLink: fields.portalLink || portalLink,
          adminNotes: fields.adminNotes || "",
        };
      case "meeting_recap":
        return {
          recipientName: fields.recipientName || "Client",
          companyName: fields.companyName || companyName,
          meetingTitle: fields.meetingTitle || "",
          meetingDate: fields.meetingDate || "",
          decisions: (fields.decisions || "").split("\n").filter(Boolean),
          followUpTasks: (fields.followUpTasks || []),
          blockers: (fields.blockers || "").split("\n").filter(Boolean),
          portalLink: fields.portalLink || portalLink,
          adminNotes: fields.adminNotes || "",
        };
      case "task_reminder":
        return {
          recipientName: fields.recipientName || "Team",
          tasks: fields.tasks || [],
        };
      case "monthly_report_ready":
        return {
          recipientName: fields.recipientName || "Admin",
          companyName: fields.companyName || companyName,
          reportMonth: fields.reportMonth || new Date().toLocaleString("default", { month: "long" }),
          reportYear: fields.reportYear || new Date().getFullYear(),
          hasNotes: fields.hasNotes === "true" || fields.hasNotes === true,
          portalLink: fields.portalLink || portalLink,
        };
      case "monthly_report_client":
        return {
          recipientName: fields.recipientName || "Client",
          companyName: fields.companyName || companyName,
          reportMonth: fields.reportMonth || new Date().toLocaleString("default", { month: "long" }),
          reportYear: fields.reportYear || new Date().getFullYear(),
          portalLink: fields.portalLink || `${window.location.origin}/client/reports`,
          adminNotes: fields.adminNotes || "",
        };
      case "planning_gap_alert":
        return {
          recipientName: fields.recipientName || "Admin",
          companyName: fields.companyName || companyName,
          gapDays: parseInt(fields.gapDays) || 30,
          lastScheduledDate: fields.lastScheduledDate || "",
          tasksScheduledCount: parseInt(fields.tasksScheduledCount) || 0,
          portalLink: fields.portalLink || portalLink,
        };
    }
  };

  const previewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/email-logs/preview", {
        templateType,
        templateData: buildTemplateData(),
      });
      return (await res.json()) as { subject: string; html: string };
    },
    onSuccess: (data) => {
      setPreviewData(data);
      setStep("preview");
    },
    onError: (e: any) => toast({ title: "Preview failed", description: e.message, variant: "destructive" }),
  });

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const recipientList = recipients.filter(r => r.trim());
      if (!recipientList.length) throw new Error("Add at least one recipient email");
      const res = await apiRequest("POST", "/api/email-logs", {
        companyId,
        recipients: recipientList,
        templateType,
        templateData: buildTemplateData(),
        relatedTaskId: defaultRelatedTaskId || null,
        relatedCampaignId: defaultRelatedCampaignId || null,
        relatedMeetingId: defaultRelatedMeetingId || null,
        relatedReportId: defaultRelatedReportId || null,
      });
      return (await res.json()) as { id: string };
    },
    onSuccess: (data) => {
      setDraftId(data.id);
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${companyId}/email-logs`] });
      toast({ title: "Draft saved" });
    },
    onError: (e: any) => toast({ title: "Failed to save draft", description: e.message, variant: "destructive" }),
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      const data = await apiRequest("POST", `/api/email-logs/${id}/send`, {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${companyId}/email-logs`] });
      toast({ title: "Email sent", description: `Sent to ${recipients.filter(Boolean).join(", ")}` });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Send failed", description: e.message, variant: "destructive" }),
  });

  const handlePreview = () => previewMutation.mutate();

  const handleSaveAndSend = async () => {
    const recipientList = recipients.filter(r => r.trim());
    if (!recipientList.length) {
      toast({ title: "Add at least one recipient", variant: "destructive" });
      return;
    }
    if (!draftId) {
      saveDraftMutation.mutate(undefined, {
        onSuccess: (data) => sendMutation.mutate(data.id),
      });
    } else {
      sendMutation.mutate(draftId);
    }
  };

  const addRecipient = () => setRecipients(r => [...r, ""]);
  const removeRecipient = (i: number) => setRecipients(r => r.filter((_, idx) => idx !== i));
  const updateRecipient = (i: number, v: string) => setRecipients(r => r.map((x, idx) => idx === i ? v : x));

  const isLoading = previewMutation.isPending || saveDraftMutation.isPending || sendMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-orange-500" />
            Compose Workflow Email
            {companyName && <Badge variant="outline" className="text-xs font-normal ml-1">{companyName}</Badge>}
          </DialogTitle>
          <DialogDescription>
            Build, preview, and send a workflow email. Client-facing emails always require preview before sending.
          </DialogDescription>
        </DialogHeader>

        {step === "compose" ? (
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {/* Template Type */}
            <div className="space-y-1.5">
              <Label>Email Type</Label>
              <Select value={templateType} onValueChange={v => setTemplateType(v as EmailTemplateType)}>
                <SelectTrigger data-testid="select-template-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TEMPLATE_LABELS) as EmailTemplateType[]).map(t => (
                    <SelectItem key={t} value={t} data-testid={`template-option-${t}`}>
                      {TEMPLATE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{TEMPLATE_DESCRIPTIONS[templateType]}</p>
            </div>

            {/* Recipients */}
            <div className="space-y-1.5">
              <Label>Recipients</Label>
              {recipients.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={r}
                    onChange={e => updateRecipient(i, e.target.value)}
                    data-testid={`input-recipient-${i}`}
                  />
                  {recipients.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeRecipient(i)} data-testid={`btn-remove-recipient-${i}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={addRecipient} className="text-xs h-7 px-2" data-testid="btn-add-recipient">
                <Plus className="h-3 w-3 mr-1" /> Add recipient
              </Button>
            </div>

            <Separator />

            {/* Dynamic fields per template */}
            <TemplateFields type={templateType} fields={fields} setField={setField} companyName={companyName} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 px-6 py-4 gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Subject: {previewData?.subject}</p>
                <p className="text-xs text-muted-foreground">To: {recipients.filter(Boolean).join(", ") || "(no recipients)"}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setStep("compose")} data-testid="btn-back-compose">
                <X className="h-3.5 w-3.5 mr-1.5" /> Back to Edit
              </Button>
            </div>
            <div className="flex-1 border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900" style={{ minHeight: 360 }}>
              {previewData?.html && (
                <iframe
                  srcDoc={previewData.html}
                  className="w-full h-full"
                  style={{ minHeight: 360 }}
                  title="Email Preview"
                  sandbox="allow-same-origin"
                  data-testid="iframe-email-preview"
                />
              )}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={isLoading} data-testid="btn-cancel-composer">
            Cancel
          </Button>
          <div className="flex gap-2">
            {step === "compose" ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveDraftMutation.mutate()}
                  disabled={isLoading}
                  data-testid="btn-save-draft"
                >
                  {saveDraftMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  Save Draft
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                  disabled={isLoading}
                  data-testid="btn-preview-email"
                >
                  {previewMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Eye className="h-3.5 w-3.5 mr-1.5" />}
                  Preview
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveDraftMutation.mutate()}
                disabled={isLoading || !!draftId}
                data-testid="btn-save-draft-preview"
              >
                {saveDraftMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                {draftId ? "Draft Saved" : "Save Draft"}
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSaveAndSend}
              disabled={isLoading}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              data-testid="btn-send-email"
            >
              {sendMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
              Send Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Dynamic form fields per template type ────────────────────────────────────

interface TemplateFieldsProps {
  type: EmailTemplateType;
  fields: Record<string, any>;
  setField: (key: string, value: any) => void;
  companyName?: string;
}

function TemplateFields({ type, fields, setField, companyName }: TemplateFieldsProps) {
  const commonRecipientFields = (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label>Recipient Name</Label>
        <Input placeholder="e.g. Jane Smith" value={fields.recipientName || ""} onChange={e => setField("recipientName", e.target.value)} data-testid="input-recipient-name" />
      </div>
      <div className="space-y-1.5">
        <Label>Company Name</Label>
        <Input placeholder={companyName || "Company"} value={fields.companyName || ""} onChange={e => setField("companyName", e.target.value)} data-testid="input-company-name" />
      </div>
    </div>
  );

  if (type === "approval_request") return (
    <div className="space-y-3">
      {commonRecipientFields}
      <div className="space-y-1.5">
        <Label>Deliverable Title <span className="text-red-500">*</span></Label>
        <Input placeholder="e.g. Q2 Social Media Package" value={fields.deliverableTitle || ""} onChange={e => setField("deliverableTitle", e.target.value)} data-testid="input-deliverable-title" />
      </div>
      <div className="space-y-1.5">
        <Label>Deliverable Type</Label>
        <Select value={fields.deliverableType || "task"} onValueChange={v => setField("deliverableType", v)}>
          <SelectTrigger data-testid="select-deliverable-type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="task">Task</SelectItem>
            <SelectItem value="campaign">Campaign</SelectItem>
            <SelectItem value="content">Content</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea placeholder="Brief description of what needs reviewing..." value={fields.deliverableDescription || ""} onChange={e => setField("deliverableDescription", e.target.value)} rows={2} data-testid="textarea-deliverable-description" />
      </div>
      <div className="space-y-1.5">
        <Label>Portal Link</Label>
        <Input placeholder={`${window.location.origin}/...`} value={fields.portalLink || ""} onChange={e => setField("portalLink", e.target.value)} data-testid="input-portal-link" />
      </div>
      <div className="space-y-1.5">
        <Label>Notes from Your Team <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <Textarea placeholder="Any context for the client..." value={fields.adminNotes || ""} onChange={e => setField("adminNotes", e.target.value)} rows={2} data-testid="textarea-admin-notes" />
      </div>
    </div>
  );

  if (type === "meeting_recap") return (
    <div className="space-y-3">
      {commonRecipientFields}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Meeting Title <span className="text-red-500">*</span></Label>
          <Input placeholder="e.g. Monthly Strategy Review" value={fields.meetingTitle || ""} onChange={e => setField("meetingTitle", e.target.value)} data-testid="input-meeting-title" />
        </div>
        <div className="space-y-1.5">
          <Label>Meeting Date</Label>
          <Input type="date" value={fields.meetingDate || ""} onChange={e => setField("meetingDate", e.target.value)} data-testid="input-meeting-date" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Decisions Made <span className="text-muted-foreground text-xs">(one per line)</span></Label>
        <Textarea placeholder="Approved Q3 ad budget&#10;Agreed on new content topics" value={fields.decisions || ""} onChange={e => setField("decisions", e.target.value)} rows={3} data-testid="textarea-decisions" />
      </div>
      <div className="space-y-1.5">
        <Label>Follow-Up Tasks <span className="text-muted-foreground text-xs">(comma-separated: title, owner, due date)</span></Label>
        <FollowUpTasksEditor value={fields.followUpTasks || []} onChange={v => setField("followUpTasks", v)} />
      </div>
      <div className="space-y-1.5">
        <Label>Blockers <span className="text-muted-foreground text-xs">(one per line, optional)</span></Label>
        <Textarea placeholder="Waiting on brand assets from client" value={fields.blockers || ""} onChange={e => setField("blockers", e.target.value)} rows={2} data-testid="textarea-blockers" />
      </div>
      <div className="space-y-1.5">
        <Label>Additional Notes</Label>
        <Textarea placeholder="Any other context..." value={fields.adminNotes || ""} onChange={e => setField("adminNotes", e.target.value)} rows={2} data-testid="textarea-meeting-notes" />
      </div>
    </div>
  );

  if (type === "task_reminder") return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Recipient Name</Label>
        <Input placeholder="Team member name" value={fields.recipientName || ""} onChange={e => setField("recipientName", e.target.value)} data-testid="input-recipient-name-reminder" />
      </div>
      <div className="space-y-1.5">
        <Label>Tasks to Include</Label>
        <TaskListEditor value={fields.tasks || []} onChange={v => setField("tasks", v)} />
      </div>
    </div>
  );

  if (type === "monthly_report_ready") return (
    <div className="space-y-3">
      {commonRecipientFields}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Report Month</Label>
          <Input placeholder="e.g. May" value={fields.reportMonth || ""} onChange={e => setField("reportMonth", e.target.value)} data-testid="input-report-month" />
        </div>
        <div className="space-y-1.5">
          <Label>Report Year</Label>
          <Input type="number" placeholder={String(new Date().getFullYear())} value={fields.reportYear || ""} onChange={e => setField("reportYear", e.target.value)} data-testid="input-report-year" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Team Notes Added?</Label>
        <Select value={fields.hasNotes || "false"} onValueChange={v => setField("hasNotes", v)}>
          <SelectTrigger data-testid="select-has-notes"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes — notes added</SelectItem>
            <SelectItem value="false">No — not yet</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  if (type === "monthly_report_client") return (
    <div className="space-y-3">
      {commonRecipientFields}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Report Month</Label>
          <Input placeholder="e.g. May" value={fields.reportMonth || ""} onChange={e => setField("reportMonth", e.target.value)} data-testid="input-report-month-client" />
        </div>
        <div className="space-y-1.5">
          <Label>Report Year</Label>
          <Input type="number" placeholder={String(new Date().getFullYear())} value={fields.reportYear || ""} onChange={e => setField("reportYear", e.target.value)} data-testid="input-report-year-client" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Client Portal Link</Label>
        <Input placeholder={`${window.location.origin}/client/reports`} value={fields.portalLink || ""} onChange={e => setField("portalLink", e.target.value)} data-testid="input-portal-link-client" />
      </div>
      <div className="space-y-1.5">
        <Label>Notes from Your Team <span className="text-muted-foreground text-xs">(optional — shown in email)</span></Label>
        <Textarea placeholder="A personal message for the client..." value={fields.adminNotes || ""} onChange={e => setField("adminNotes", e.target.value)} rows={3} data-testid="textarea-report-notes" />
      </div>
    </div>
  );

  if (type === "planning_gap_alert") return (
    <div className="space-y-3">
      {commonRecipientFields}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Gap (days)</Label>
          <Input type="number" placeholder="30" value={fields.gapDays || ""} onChange={e => setField("gapDays", e.target.value)} data-testid="input-gap-days" />
        </div>
        <div className="space-y-1.5">
          <Label>Tasks in Pipeline</Label>
          <Input type="number" placeholder="0" value={fields.tasksScheduledCount || ""} onChange={e => setField("tasksScheduledCount", e.target.value)} data-testid="input-tasks-count" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Last Scheduled Date</Label>
        <Input type="date" value={fields.lastScheduledDate || ""} onChange={e => setField("lastScheduledDate", e.target.value)} data-testid="input-last-scheduled-date" />
      </div>
    </div>
  );

  return null;
}

// ── Sub-editor: follow-up tasks list ─────────────────────────────────────────
function FollowUpTasksEditor({ value, onChange }: { value: any[]; onChange: (v: any[]) => void }) {
  const add = () => onChange([...value, { title: "", owner: "", dueDate: "" }]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const update = (i: number, key: string, v: string) =>
    onChange(value.map((item, idx) => idx === i ? { ...item, [key]: v } : item));

  return (
    <div className="space-y-2">
      {value.map((item, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-1.5 items-center">
          <Input placeholder="Task title" value={item.title} onChange={e => update(i, "title", e.target.value)} className="text-xs h-8" data-testid={`input-followup-title-${i}`} />
          <Input placeholder="Owner" value={item.owner} onChange={e => update(i, "owner", e.target.value)} className="text-xs h-8" data-testid={`input-followup-owner-${i}`} />
          <Input type="date" value={item.dueDate} onChange={e => update(i, "dueDate", e.target.value)} className="text-xs h-8 w-32" data-testid={`input-followup-due-${i}`} />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(i)} data-testid={`btn-remove-followup-${i}`}><X className="h-3 w-3" /></Button>
        </div>
      ))}
      <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={add} data-testid="btn-add-followup">
        <Plus className="h-3 w-3 mr-1" /> Add task
      </Button>
    </div>
  );
}

// ── Sub-editor: task list for reminders ──────────────────────────────────────
function TaskListEditor({ value, onChange }: { value: any[]; onChange: (v: any[]) => void }) {
  const add = () => onChange([...value, { title: "", companyName: "", dueDate: "", status: "in_progress", portalLink: "", isOverdue: false }]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const update = (i: number, key: string, v: any) =>
    onChange(value.map((item, idx) => idx === i ? { ...item, [key]: v } : item));

  return (
    <div className="space-y-2">
      {value.map((item, i) => (
        <div key={i} className="p-2 border rounded space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <Input placeholder="Task title" value={item.title} onChange={e => update(i, "title", e.target.value)} className="text-xs h-7" data-testid={`input-task-title-${i}`} />
            <Input placeholder="Company" value={item.companyName} onChange={e => update(i, "companyName", e.target.value)} className="text-xs h-7" data-testid={`input-task-company-${i}`} />
          </div>
          <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-1.5 items-center">
            <Input type="date" value={item.dueDate} onChange={e => update(i, "dueDate", e.target.value)} className="text-xs h-7" data-testid={`input-task-due-${i}`} />
            <Input placeholder="Portal link" value={item.portalLink} onChange={e => update(i, "portalLink", e.target.value)} className="text-xs h-7" data-testid={`input-task-link-${i}`} />
            <label className="flex items-center gap-1 text-xs cursor-pointer">
              <input type="checkbox" checked={item.isOverdue} onChange={e => update(i, "isOverdue", e.target.checked)} data-testid={`check-task-overdue-${i}`} />
              Overdue
            </label>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(i)} data-testid={`btn-remove-task-${i}`}><X className="h-3 w-3" /></Button>
          </div>
        </div>
      ))}
      <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={add} data-testid="btn-add-task">
        <Plus className="h-3 w-3 mr-1" /> Add task
      </Button>
    </div>
  );
}
