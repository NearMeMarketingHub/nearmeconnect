import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Eye, Trash2, X, Mail, AlertCircle, CheckCircle, Clock, Ban } from "lucide-react";
import type { EmailLog, EmailLogStatus, EmailLogTemplateType } from "@shared/schema";

const STATUS_CONFIG: Record<EmailLogStatus, { label: string; icon: any; className: string }> = {
  draft:     { label: "Draft",     icon: Clock,        className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  queued:    { label: "Queued",    icon: Clock,        className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  sent:      { label: "Sent",      icon: CheckCircle,  className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  failed:    { label: "Failed",    icon: AlertCircle,  className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  cancelled: { label: "Cancelled", icon: Ban,          className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
};

const TEMPLATE_LABELS: Record<EmailLogTemplateType, string> = {
  approval_request:    "Approval Request",
  meeting_recap:       "Meeting Recap",
  task_reminder:       "Task Reminder",
  monthly_report_ready: "Report — Admin Review",
  monthly_report_client: "Report — Client",
  planning_gap_alert:  "Planning Gap Alert",
};

interface EmailHistoryProps {
  companyId: string;
  isAdmin?: boolean;
  relatedTaskId?: string;
  relatedCampaignId?: string;
  relatedMeetingId?: string;
  compact?: boolean;
}

export function EmailHistory({
  companyId,
  isAdmin = false,
  relatedTaskId,
  relatedCampaignId,
  relatedMeetingId,
  compact = false,
}: EmailHistoryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [previewLog, setPreviewLog] = useState<EmailLog | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (relatedTaskId) params.set("relatedTaskId", relatedTaskId);
  if (relatedCampaignId) params.set("relatedCampaignId", relatedCampaignId);
  if (relatedMeetingId) params.set("relatedMeetingId", relatedMeetingId);
  const queryStr = params.toString() ? `?${params.toString()}` : "";

  const { data: logs = [], isLoading } = useQuery<EmailLog[]>({
    queryKey: [`/api/companies/${companyId}/email-logs${queryStr}`],
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      setSendingId(id);
      const data = await apiRequest("POST", `/api/email-logs/${id}/send`, {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${companyId}/email-logs`] });
      toast({ title: "Email sent successfully" });
    },
    onError: (e: any) => toast({ title: "Send failed", description: e.message, variant: "destructive" }),
    onSettled: () => setSendingId(null),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/email-logs/${id}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${companyId}/email-logs`] });
      toast({ title: "Draft cancelled" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/email-logs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${companyId}/email-logs`] });
      toast({ title: "Email log deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = logs.filter(log => {
    if (statusFilter !== "all" && log.status !== statusFilter) return false;
    if (typeFilter !== "all" && log.templateType !== typeFilter) return false;
    return true;
  });

  if (isLoading) return (
    <div className="flex items-center gap-2 text-muted-foreground py-4 text-sm">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading email history...
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Filters */}
      {!compact && (
        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-36 text-xs" data-testid="select-email-status-filter">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(Object.keys(STATUS_CONFIG) as EmailLogStatus[]).map(s => (
                <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-48 text-xs" data-testid="select-email-type-filter">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {(Object.keys(TEMPLATE_LABELS) as EmailLogTemplateType[]).map(t => (
                <SelectItem key={t} value={t}>{TEMPLATE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
          <Mail className="h-8 w-8 opacity-30" />
          <p className="text-sm">No emails yet</p>
          {isAdmin && <p className="text-xs">Use the "Compose Email" button to create your first workflow email.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => {
            const statusCfg = STATUS_CONFIG[log.status];
            const StatusIcon = statusCfg.icon;
            return (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                data-testid={`email-log-row-${log.id}`}
              >
                <StatusIcon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{log.subject}</span>
                    <Badge className={`text-xs px-1.5 py-0 font-medium ${statusCfg.className}`}>
                      {statusCfg.label}
                    </Badge>
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {TEMPLATE_LABELS[log.templateType] || log.templateType}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      To: {log.recipients.join(", ")}
                    </span>
                    {log.sentAt && (
                      <span className="text-xs text-muted-foreground">
                        · Sent {new Date(log.sentAt).toLocaleDateString()}
                      </span>
                    )}
                    {!log.sentAt && log.createdAt && (
                      <span className="text-xs text-muted-foreground">
                        · Created {new Date(log.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {log.status === "failed" && log.errorMessage && (
                    <p className="text-xs text-red-500 mt-1 truncate">Error: {log.errorMessage}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setPreviewLog(log)}
                    title="Preview email"
                    data-testid={`btn-preview-log-${log.id}`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  {isAdmin && (log.status === "draft" || log.status === "failed") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-orange-600 hover:text-orange-700"
                      onClick={() => sendMutation.mutate(log.id)}
                      disabled={sendingId === log.id}
                      title="Send email"
                      data-testid={`btn-send-log-${log.id}`}
                    >
                      {sendingId === log.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Send className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                  {isAdmin && log.status === "draft" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => cancelMutation.mutate(log.id)}
                      title="Cancel draft"
                      data-testid={`btn-cancel-log-${log.id}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {isAdmin && (log.status === "cancelled" || log.status === "failed") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteMutation.mutate(log.id)}
                      title="Delete"
                      data-testid={`btn-delete-log-${log.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview modal */}
      <Dialog open={!!previewLog} onOpenChange={o => !o && setPreviewLog(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-orange-500" />
              {previewLog?.subject}
            </DialogTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {previewLog && (
                <Badge className={`text-xs ${STATUS_CONFIG[previewLog.status]?.className}`}>
                  {STATUS_CONFIG[previewLog.status]?.label}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">To: {previewLog?.recipients.join(", ")}</span>
              {previewLog?.sentAt && <span className="text-xs text-muted-foreground">Sent {new Date(previewLog.sentAt).toLocaleString()}</span>}
              {previewLog?.resendEmailId && <span className="text-xs text-muted-foreground font-mono">ID: {previewLog.resendEmailId}</span>}
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-4" style={{ minHeight: 400 }}>
            {previewLog?.htmlBody && (
              <iframe
                srcDoc={previewLog.htmlBody}
                className="w-full h-full rounded-lg border"
                style={{ minHeight: 400 }}
                title="Email Preview"
                sandbox="allow-same-origin"
                data-testid="iframe-log-preview"
              />
            )}
          </div>
          {isAdmin && previewLog && (previewLog.status === "draft" || previewLog.status === "failed") && (
            <div className="px-6 py-4 border-t flex justify-end">
              <Button
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => {
                  sendMutation.mutate(previewLog.id, {
                    onSuccess: () => setPreviewLog(null),
                  });
                }}
                disabled={sendMutation.isPending}
                data-testid="btn-send-from-preview"
              >
                {sendMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                Send Now
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
