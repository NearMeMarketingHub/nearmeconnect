import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle, CheckCircle2, Circle, Wifi, WifiOff,
  Building2, Mail, FolderOpen, MapPin, Puzzle,
  Pencil, Clock, Info, XCircle, Ban, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntegrationStatus, IntegrationType, IntegrationStatusValue } from "@shared/schema";

// ── Config ────────────────────────────────────────────────────────────────────

type IntegrationMeta = {
  label: string;
  icon: React.ReactNode;
  accountIdLabel: string;
  objectIdLabel: string;
  nextStepLabel: string;
  description: string;
};

const INTEGRATION_META: Record<IntegrationType | "other", IntegrationMeta> = {
  hubspot: {
    label: "HubSpot",
    icon: <Building2 className="h-5 w-5 text-orange-500" />,
    accountIdLabel: "HubSpot Portal ID",
    objectIdLabel: "HubSpot Company ID",
    nextStepLabel: "Add HubSpot Company ID",
    description: "CRM sync for contacts, deals, and pipeline data",
  },
  sharepoint: {
    label: "SharePoint",
    icon: <FolderOpen className="h-5 w-5 text-blue-600" />,
    accountIdLabel: "SharePoint Site URL",
    objectIdLabel: "Folder Path",
    nextStepLabel: "Add SharePoint Folder",
    description: "File storage and document collaboration",
  },
  resend: {
    label: "Resend",
    icon: <Mail className="h-5 w-5 text-purple-500" />,
    accountIdLabel: "Sender Domain",
    objectIdLabel: "From Address",
    nextStepLabel: "Configure Resend Sender",
    description: "Transactional email delivery",
  },
  google_business_profile: {
    label: "Google Business Profile",
    icon: <MapPin className="h-5 w-5 text-green-600" />,
    accountIdLabel: "Google Account Email",
    objectIdLabel: "Location / Place ID",
    nextStepLabel: "Add GBP Location",
    description: "Google Business Profile management and posts",
  },
  other: {
    label: "Other",
    icon: <Puzzle className="h-5 w-5 text-gray-500" />,
    accountIdLabel: "Account / ID",
    objectIdLabel: "Object / Resource ID",
    nextStepLabel: "Configure Integration",
    description: "Custom integration or third-party service",
  },
};

const STATUS_META: Record<IntegrationStatusValue, { label: string; color: string; icon: React.ReactNode }> = {
  not_configured: { label: "Not Configured", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: <Circle className="h-3.5 w-3.5" /> },
  needs_credentials: { label: "Needs Setup", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  connected: { label: "Connected", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  warning: { label: "Warning", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  error: { label: "Error", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400", icon: <XCircle className="h-3.5 w-3.5" /> },
  disabled: { label: "Disabled", color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500", icon: <Ban className="h-3.5 w-3.5" /> },
};

const ALL_TYPES: IntegrationType[] = ["hubspot", "sharepoint", "resend", "google_business_profile"];

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: IntegrationStatusValue }) {
  const m = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full", m.color)}>
      {m.icon} {m.label}
    </span>
  );
}

interface EditDialogProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  integrationType: IntegrationType;
  existing?: IntegrationStatus;
  isAdmin: boolean;
}

function EditDialog({ open, onClose, companyId, integrationType, existing, isAdmin }: EditDialogProps) {
  const meta = INTEGRATION_META[integrationType];
  const { toast } = useToast();
  const { user } = useAuth();

  const [status, setStatus] = useState<IntegrationStatusValue>(existing?.status ?? "not_configured");
  const [externalAccountId, setExternalAccountId] = useState(existing?.externalAccountId ?? "");
  const [externalObjectId, setExternalObjectId] = useState(existing?.externalObjectId ?? "");
  const [lastError, setLastError] = useState(existing?.lastError ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const mutation = useMutation({
    mutationFn: (data: object) => apiRequest("PUT", `/api/companies/${companyId}/integrations/${integrationType}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "integrations"] });
      toast({ title: "Integration updated" });
      onClose();
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const handleSave = () => {
    mutation.mutate({
      status,
      externalAccountId: externalAccountId || null,
      externalObjectId: externalObjectId || null,
      lastError: lastError || null,
      notes: notes || null,
      updatedBy: user!.id,
      updatedByName: [user!.firstName, user!.lastName].filter(Boolean).join(" ") || user!.email,
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {meta.icon} {meta.label} Integration
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={v => setStatus(v as IntegrationStatusValue)} disabled={!isAdmin}>
              <SelectTrigger data-testid="select-integration-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_META) as IntegrationStatusValue[]).map(s => (
                  <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{meta.accountIdLabel}</Label>
            <Input value={externalAccountId} onChange={e => setExternalAccountId(e.target.value)}
              placeholder={`e.g. ${meta.label} account identifier`} disabled={!isAdmin}
              data-testid="input-external-account-id" />
          </div>
          <div className="space-y-1.5">
            <Label>{meta.objectIdLabel}</Label>
            <Input value={externalObjectId} onChange={e => setExternalObjectId(e.target.value)}
              placeholder={`e.g. ${meta.objectIdLabel.toLowerCase()}`} disabled={!isAdmin}
              data-testid="input-external-object-id" />
          </div>
          {(status === "error" || status === "warning") && (
            <div className="space-y-1.5">
              <Label>Last Error / Warning Details</Label>
              <Textarea value={lastError} onChange={e => setLastError(e.target.value)}
                placeholder="Describe the issue…" rows={2} disabled={!isAdmin}
                data-testid="input-last-error" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Internal notes about this integration…" rows={2} disabled={!isAdmin}
              data-testid="input-integration-notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {isAdmin && (
            <Button onClick={handleSave} disabled={mutation.isPending} data-testid="btn-save-integration">
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface IntegrationHealthPanelProps {
  companyId: string;
  isAdmin?: boolean;
}

export function IntegrationHealthPanel({ companyId, isAdmin = false }: IntegrationHealthPanelProps) {
  const [editType, setEditType] = useState<IntegrationType | null>(null);
  const [expanded, setExpanded] = useState<IntegrationType | null>(null);

  const { data: statuses = [], isLoading } = useQuery<IntegrationStatus[]>({
    queryKey: ["/api/companies", companyId, "integrations"],
  });

  const byType = Object.fromEntries(statuses.map(s => [s.integrationType, s])) as Record<string, IntegrationStatus>;

  const getStatusFor = (type: IntegrationType): IntegrationStatusValue =>
    byType[type]?.status ?? "not_configured";

  const summaryCount = {
    connected: ALL_TYPES.filter(t => getStatusFor(t) === "connected").length,
    issues: ALL_TYPES.filter(t => ["error", "warning", "needs_credentials"].includes(getStatusFor(t))).length,
    unconfigured: ALL_TYPES.filter(t => getStatusFor(t) === "not_configured" || getStatusFor(t) === "disabled").length,
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="integration-health-panel">
      {/* Summary row */}
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" /> {summaryCount.connected} connected
        </span>
        {summaryCount.issues > 0 && (
          <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
            <AlertTriangle className="h-4 w-4" /> {summaryCount.issues} need attention
          </span>
        )}
        {summaryCount.unconfigured > 0 && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Circle className="h-4 w-4" /> {summaryCount.unconfigured} not configured
          </span>
        )}
      </div>

      {/* Integration cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ALL_TYPES.map(type => {
          const meta = INTEGRATION_META[type];
          const record = byType[type];
          const status = record?.status ?? "not_configured";
          const sm = STATUS_META[status];
          const isExpanded = expanded === type;
          const needsAction = ["not_configured", "needs_credentials", "error"].includes(status);

          return (
            <Card key={type} className={cn("transition-all", needsAction && status !== "not_configured" ? "border-orange-300/60 dark:border-orange-700/40" : "")}
              data-testid={`integration-card-${type}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 justify-between flex-wrap">
                      <span className="font-semibold text-sm">{meta.label}</span>
                      <StatusBadge status={status} />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{meta.description}</p>

                    {/* External IDs */}
                    {(record?.externalAccountId || record?.externalObjectId) && (
                      <div className="mt-2 space-y-0.5">
                        {record.externalAccountId && (
                          <p className="text-[11px] text-muted-foreground">
                            <span className="font-medium">{meta.accountIdLabel}:</span> {record.externalAccountId}
                          </p>
                        )}
                        {record.externalObjectId && (
                          <p className="text-[11px] text-muted-foreground">
                            <span className="font-medium">{meta.objectIdLabel}:</span> {record.externalObjectId}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Error message */}
                    {record?.lastError && (status === "error" || status === "warning") && (
                      <div className="mt-2 text-[11px] bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded px-2 py-1.5">
                        {record.lastError}
                      </div>
                    )}

                    {/* Last sync */}
                    {record?.lastSyncTime && (
                      <p className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1.5">
                        <Clock className="h-3 w-3" /> Last sync: {new Date(record.lastSyncTime).toLocaleString()}
                      </p>
                    )}

                    {/* Expand notes */}
                    {record?.notes && (
                      <button className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1 hover:text-foreground"
                        onClick={() => setExpanded(isExpanded ? null : type)}>
                        <Info className="h-3 w-3" /> Notes {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    )}
                    {isExpanded && record?.notes && (
                      <p className="mt-1.5 text-[11px] text-muted-foreground bg-muted/50 rounded px-2 py-1.5">{record.notes}</p>
                    )}

                    {/* Actions */}
                    <div className="mt-3 flex items-center gap-2">
                      {isAdmin && (
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                          onClick={() => setEditType(type)}
                          data-testid={`btn-edit-integration-${type}`}>
                          <Pencil className="h-3 w-3" />
                          {status === "not_configured" ? meta.nextStepLabel : "Edit"}
                        </Button>
                      )}
                      {!isAdmin && status === "not_configured" && (
                        <span className="text-[11px] text-muted-foreground italic">Contact your account manager to set up</span>
                      )}
                      {record?.updatedByName && (
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          Updated by {record.updatedByName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit dialog */}
      {editType && (
        <EditDialog
          open={true}
          onClose={() => setEditType(null)}
          companyId={companyId}
          integrationType={editType}
          existing={byType[editType]}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
