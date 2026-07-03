import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus, Pencil, Trash2, FileText, Search, X, ChevronDown, ChevronUp,
  Layers, Clock, User, DollarSign, RefreshCw, Coins
} from "lucide-react";
import type { TaskTemplate, ServiceTrack, DeliverableType, RetainerTemplate } from "@shared/schema";
import { taskTemplateRoleOwnerEnum, taskTemplateCadenceEnum, taskPriorities } from "@shared/schema";

const ROLE_OWNER_LABELS: Record<string, string> = {
  account_manager: "Account Manager",
  strategist: "Strategist",
  content_lead: "Content Lead",
  designer: "Designer",
  developer: "Developer",
  hubspot_specialist: "HubSpot Specialist",
  ads_manager: "Ads Manager",
};

const CADENCE_LABELS: Record<string, string> = {
  once: "One-time",
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Bi-Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
  custom: "Custom",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-slate-500",
  medium: "text-blue-600",
  high: "text-orange-500",
  urgent: "text-red-600",
};

const PACKAGE_BADGE_CLASSES: Record<string, string> = {
  launch:      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  launch_support: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  growth:      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  scale:       "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  accelerator: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
};

function getPackageBadgeClass(rt: RetainerTemplate): string {
  const slug = (rt.slug ?? rt.name ?? "").toLowerCase();
  if (slug.includes("accelerator")) return PACKAGE_BADGE_CLASSES.accelerator;
  if (slug.includes("scale")) return PACKAGE_BADGE_CLASSES.scale;
  if (slug.includes("growth")) return PACKAGE_BADGE_CLASSES.growth;
  return PACKAGE_BADGE_CLASSES.launch;
}

// ──────────────────────────────────────────────────────────────────────────────
// Template Form (used in both create and edit dialogs)
// ──────────────────────────────────────────────────────────────────────────────

interface TemplateFormState {
  title: string;
  description: string;
  defaultInstructions: string;
  serviceTrackId: string;
  deliverableTypeId: string;
  defaultCreditCost: string;
  cadence: string;
  defaultDueOffsetDays: string;
  defaultStartOffsetDays: string;
  defaultRoleOwner: string;
  defaultPriority: string;
  requiresClientApproval: boolean;
  createsClientVisibleTask: boolean;
  sortOrder: string;
  retainerTemplateIds: string[];
}

function blankForm(): TemplateFormState {
  return {
    title: "", description: "", defaultInstructions: "",
    serviceTrackId: "", deliverableTypeId: "", defaultCreditCost: "",
    cadence: "", defaultDueOffsetDays: "", defaultStartOffsetDays: "",
    defaultRoleOwner: "", defaultPriority: "medium",
    requiresClientApproval: false, createsClientVisibleTask: true,
    sortOrder: "0", retainerTemplateIds: [],
  };
}

function formFromTemplate(t: TaskTemplate & { retainerLinks?: { retainerTemplateId: string }[] }): TemplateFormState {
  return {
    title: t.title,
    description: t.description ?? "",
    defaultInstructions: t.defaultInstructions ?? "",
    serviceTrackId: t.serviceTrackId ?? "",
    deliverableTypeId: t.deliverableTypeId ?? "",
    defaultCreditCost: t.defaultCreditCost ? String(t.defaultCreditCost) : "",
    cadence: t.cadence ?? "",
    defaultDueOffsetDays: t.defaultDueOffsetDays != null ? String(t.defaultDueOffsetDays) : "",
    defaultStartOffsetDays: t.defaultStartOffsetDays != null ? String(t.defaultStartOffsetDays) : "",
    defaultRoleOwner: t.defaultRoleOwner ?? "",
    defaultPriority: t.defaultPriority ?? "medium",
    requiresClientApproval: t.requiresClientApproval,
    createsClientVisibleTask: t.createsClientVisibleTask,
    sortOrder: String(t.sortOrder),
    retainerTemplateIds: (t.retainerLinks ?? []).map(r => r.retainerTemplateId),
  };
}

function formToPayload(f: TemplateFormState) {
  return {
    title: f.title.trim(),
    description: f.description || null,
    defaultInstructions: f.defaultInstructions || null,
    serviceTrackId: f.serviceTrackId || null,
    deliverableTypeId: f.deliverableTypeId || null,
    defaultCreditCost: f.defaultCreditCost ? f.defaultCreditCost : null,
    cadence: f.cadence || null,
    defaultDueOffsetDays: f.defaultDueOffsetDays !== "" ? parseInt(f.defaultDueOffsetDays) : null,
    defaultStartOffsetDays: f.defaultStartOffsetDays !== "" ? parseInt(f.defaultStartOffsetDays) : null,
    defaultRoleOwner: f.defaultRoleOwner || null,
    defaultPriority: f.defaultPriority || "medium",
    requiresClientApproval: f.requiresClientApproval,
    createsClientVisibleTask: f.createsClientVisibleTask,
    sortOrder: parseInt(f.sortOrder) || 0,
  };
}

interface TemplateFormProps {
  form: TemplateFormState;
  onChange: (patch: Partial<TemplateFormState>) => void;
  tracks: ServiceTrack[];
  deliverableTypes: DeliverableType[];
  retainerTemplates: RetainerTemplate[];
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
}

function TemplateFormFields({ form, onChange, tracks, deliverableTypes, retainerTemplates, showAdvanced, onToggleAdvanced }: TemplateFormProps) {
  return (
    <div className="space-y-5 overflow-y-auto max-h-[70vh] pr-1">
      {/* Core */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label>Title <span className="text-red-500">*</span></Label>
          <Input
            value={form.title}
            onChange={e => onChange({ title: e.target.value })}
            placeholder="e.g. Monthly Strategy & Priority Call"
            data-testid="input-tt-title"
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Description</Label>
          <Textarea
            value={form.description}
            onChange={e => onChange({ description: e.target.value })}
            rows={2}
            placeholder="Brief description of what this task involves…"
            data-testid="textarea-tt-description"
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Default Instructions</Label>
          <Textarea
            value={form.defaultInstructions}
            onChange={e => onChange({ defaultInstructions: e.target.value })}
            rows={3}
            placeholder="Step-by-step instructions pre-filled when creating from this template…"
            data-testid="textarea-tt-instructions"
          />
        </div>
      </div>

      <Separator />

      {/* Classification */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> Service Track</Label>
          <Select value={form.serviceTrackId || "_none"} onValueChange={v => onChange({ serviceTrackId: v === "_none" ? "" : v })}>
            <SelectTrigger data-testid="select-tt-service-track"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None</SelectItem>
              {tracks.filter(t => t.status === "active").map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Deliverable Type <span className="text-xs text-muted-foreground">(optional)</span></Label>
          <Select value={form.deliverableTypeId || "_none"} onValueChange={v => onChange({ deliverableTypeId: v === "_none" ? "" : v })}>
            <SelectTrigger data-testid="select-tt-deliverable-type"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None</SelectItem>
              {deliverableTypes.filter(d => d.isActive).map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1"><RefreshCw className="h-3.5 w-3.5" /> Cadence</Label>
          <Select value={form.cadence || "_none"} onValueChange={v => onChange({ cadence: v === "_none" ? "" : v })}>
            <SelectTrigger data-testid="select-tt-cadence"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None</SelectItem>
              {taskTemplateCadenceEnum.map(c => (
                <SelectItem key={c} value={c}>{CADENCE_LABELS[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Default Owner Role</Label>
          <Select value={form.defaultRoleOwner || "_none"} onValueChange={v => onChange({ defaultRoleOwner: v === "_none" ? "" : v })}>
            <SelectTrigger data-testid="select-tt-role-owner"><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Unassigned</SelectItem>
              {taskTemplateRoleOwnerEnum.map(r => (
                <SelectItem key={r} value={r}>{ROLE_OWNER_LABELS[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Default Priority</Label>
          <Select value={form.defaultPriority} onValueChange={v => onChange({ defaultPriority: v })}>
            <SelectTrigger data-testid="select-tt-priority"><SelectValue /></SelectTrigger>
            <SelectContent>
              {taskPriorities.map(p => (
                <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1"><Coins className="h-3.5 w-3.5" /> Default Credit Cost</Label>
          <Input
            type="number"
            min="0"
            step="0.25"
            value={form.defaultCreditCost}
            onChange={e => onChange({ defaultCreditCost: e.target.value })}
            placeholder="e.g. 2"
            data-testid="input-tt-credit-cost"
          />
        </div>
      </div>

      <Separator />

      {/* Scheduling offsets */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1 text-sm"><Clock className="h-3.5 w-3.5" /> Due Offset (days)</Label>
          <Input
            type="number"
            value={form.defaultDueOffsetDays}
            onChange={e => onChange({ defaultDueOffsetDays: e.target.value })}
            placeholder="e.g. 30"
            data-testid="input-tt-due-offset"
          />
          <p className="text-xs text-muted-foreground">Days after period start</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Start Offset (days)</Label>
          <Input
            type="number"
            value={form.defaultStartOffsetDays}
            onChange={e => onChange({ defaultStartOffsetDays: e.target.value })}
            placeholder="e.g. 0"
            data-testid="input-tt-start-offset"
          />
          <p className="text-xs text-muted-foreground">Days after period start</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Sort Order</Label>
          <Input
            type="number"
            min="0"
            value={form.sortOrder}
            onChange={e => onChange({ sortOrder: e.target.value })}
            data-testid="input-tt-sort-order"
          />
        </div>
      </div>

      <Separator />

      {/* Flags */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Requires Client Approval</p>
            <p className="text-xs text-muted-foreground">Task needs sign-off from the client before being marked complete</p>
          </div>
          <Switch
            checked={form.requiresClientApproval}
            onCheckedChange={v => onChange({ requiresClientApproval: v })}
            data-testid="switch-tt-client-approval"
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Creates Client-Visible Task</p>
            <p className="text-xs text-muted-foreground">Task appears in the client portal when generated</p>
          </div>
          <Switch
            checked={form.createsClientVisibleTask}
            onCheckedChange={v => onChange({ createsClientVisibleTask: v })}
            data-testid="switch-tt-client-visible"
          />
        </div>
      </div>

      {/* Retainer Template Links */}
      {retainerTemplates.length > 0 && (
        <>
          <Separator />
          <div>
            <button
              type="button"
              onClick={onToggleAdvanced}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-toggle-retainer-links"
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showAdvanced ? "Hide" : "Show"} Retainer Template Assignments ({form.retainerTemplateIds.length} linked)
            </button>
            {showAdvanced && (
              <div className="mt-3 border rounded-lg divide-y">
                {retainerTemplates.map(rt => {
                  const linked = form.retainerTemplateIds.includes(rt.id);
                  return (
                    <div key={rt.id} className={`flex items-center gap-3 px-3 py-2.5 ${linked ? "" : "opacity-50"}`} data-testid={`checkbox-retainer-${rt.id}`}>
                      <Checkbox
                        checked={linked}
                        onCheckedChange={checked => {
                          if (checked) {
                            onChange({ retainerTemplateIds: [...form.retainerTemplateIds, rt.id] });
                          } else {
                            onChange({ retainerTemplateIds: form.retainerTemplateIds.filter(id => id !== rt.id) });
                          }
                        }}
                      />
                      <span className="text-sm">{rt.name}</span>
                      <Badge variant="outline" className="text-xs capitalize ml-auto">{rt.status}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────────────────────────

export default function AdminTaskTemplates() {
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<TemplateFormState>(blankForm());
  const [editForm, setEditForm] = useState<TemplateFormState>(blankForm());
  const [showAdvancedCreate, setShowAdvancedCreate] = useState(false);
  const [showAdvancedEdit, setShowAdvancedEdit] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterTrack, setFilterTrack] = useState("_all");
  const [filterStatus, setFilterStatus] = useState("active");
  const [filterPackage, setFilterPackage] = useState("_all");

  const { data: templates = [], isLoading } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
  });
  const { data: tracks = [] } = useQuery<ServiceTrack[]>({
    queryKey: ["/api/service-tracks"],
  });
  const { data: deliverableTypes = [] } = useQuery<DeliverableType[]>({
    queryKey: ["/api/deliverable-types"],
  });
  const { data: retainerTemplates = [] } = useQuery<RetainerTemplate[]>({
    queryKey: ["/api/retainer-templates"],
  });

  const retainerTemplateIds = retainerTemplates.map(t => t.id);
  const { data: packageLinksData = [] } = useQuery<{ retainerTemplateId: string; taskTemplateId: string }[]>({
    queryKey: ["/api/retainer-template-task-links-all", retainerTemplateIds],
    queryFn: async () => {
      const results = await Promise.all(
        retainerTemplates.map(async rt => {
          const res = await fetch(`/api/retainer-templates/${rt.id}/task-templates`);
          const entries = await res.json() as { taskTemplateId: string }[];
          return entries.map(e => ({ retainerTemplateId: rt.id, taskTemplateId: e.taskTemplateId }));
        })
      );
      return results.flat();
    },
    enabled: retainerTemplates.length > 0,
  });

  const templatePackageMap = useMemo(() => {
    const map: Record<string, RetainerTemplate[]> = {};
    for (const link of packageLinksData) {
      const rt = retainerTemplates.find(r => r.id === link.retainerTemplateId);
      if (!rt) continue;
      if (!map[link.taskTemplateId]) map[link.taskTemplateId] = [];
      map[link.taskTemplateId].push(rt);
    }
    return map;
  }, [packageLinksData, retainerTemplates]);

  const createMutation = useMutation({
    mutationFn: async (f: TemplateFormState) => {
      const res = await apiRequest("POST", "/api/task-templates", formToPayload(f));
      const created = await res.json() as TaskTemplate;
      if (f.retainerTemplateIds.length > 0) {
        for (const rtId of f.retainerTemplateIds) {
          const existing = await apiRequest("GET", `/api/retainer-templates/${rtId}/task-templates`);
          const existingEntries = await existing.json() as any[];
          await apiRequest("PUT", `/api/retainer-templates/${rtId}/task-templates`, {
            entries: [...existingEntries.map((e: any) => ({ taskTemplateId: e.taskTemplateId, includedByDefault: e.includedByDefault, monthlyQuantity: e.monthlyQuantity, quarterlyQuantity: e.quarterlyQuantity, annualQuantity: e.annualQuantity, creditOverride: e.creditOverride })), { taskTemplateId: created.id, includedByDefault: true, monthlyQuantity: null, quarterlyQuantity: null, annualQuantity: null, creditOverride: null }],
          });
        }
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-templates"] });
      setCreateOpen(false);
      setCreateForm(blankForm());
      setShowAdvancedCreate(false);
      toast({ title: "Task template created" });
    },
    onError: () => toast({ title: "Failed to create task template", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, f }: { id: string; f: TemplateFormState }) => {
      await apiRequest("PATCH", `/api/task-templates/${id}`, formToPayload(f));
      // sync retainer links by updating all affected retainer templates
      const currentLinks = await apiRequest("GET", `/api/task-templates/${id}`);
      const current = await currentLinks.json() as TaskTemplate & { retainerLinks: { retainerTemplateId: string }[] };
      const currentIds = current.retainerLinks.map(r => r.retainerTemplateId);
      const toAdd = f.retainerTemplateIds.filter(rid => !currentIds.includes(rid));
      const toRemove = currentIds.filter(rid => !f.retainerTemplateIds.includes(rid));
      for (const rtId of [...toAdd, ...toRemove]) {
        const existing = await apiRequest("GET", `/api/retainer-templates/${rtId}/task-templates`);
        const existingEntries = await existing.json() as any[];
        const newEntries = toAdd.includes(rtId)
          ? [...existingEntries.map((e: any) => ({ taskTemplateId: e.taskTemplateId, includedByDefault: e.includedByDefault, monthlyQuantity: e.monthlyQuantity, quarterlyQuantity: e.quarterlyQuantity, annualQuantity: e.annualQuantity, creditOverride: e.creditOverride })), { taskTemplateId: id, includedByDefault: true, monthlyQuantity: null, quarterlyQuantity: null, annualQuantity: null, creditOverride: null }]
          : existingEntries.filter((e: any) => e.taskTemplateId !== id).map((e: any) => ({ taskTemplateId: e.taskTemplateId, includedByDefault: e.includedByDefault, monthlyQuantity: e.monthlyQuantity, quarterlyQuantity: e.quarterlyQuantity, annualQuantity: e.annualQuantity, creditOverride: e.creditOverride }));
        await apiRequest("PUT", `/api/retainer-templates/${rtId}/task-templates`, { entries: newEntries });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-templates"] });
      setEditOpen(false);
      setEditingId(null);
      setShowAdvancedEdit(false);
      toast({ title: "Task template updated" });
    },
    onError: () => toast({ title: "Failed to update task template", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/task-templates/${id}`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/task-templates"] }); toast({ title: "Task template deleted" }); },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiRequest("PATCH", `/api/task-templates/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/task-templates"] }),
    onError: () => toast({ title: "Failed to toggle status", variant: "destructive" }),
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/task-templates/seed", {});
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/task-templates"] }); toast({ title: "Default task templates seeded successfully" }); },
    onError: (e: any) => toast({ title: "Seed failed", description: String(e?.message ?? ""), variant: "destructive" }),
  });

  const openEdit = async (t: TaskTemplate) => {
    try {
      const res = await apiRequest("GET", `/api/task-templates/${t.id}`);
      const data = await res.json() as TaskTemplate & { retainerLinks: { retainerTemplateId: string }[] };
      setEditForm(formFromTemplate(data));
      setEditingId(t.id);
      setShowAdvancedEdit(false);
      setEditOpen(true);
    } catch {
      toast({ title: "Failed to load template", variant: "destructive" });
    }
  };

  const trackMap = useMemo(() => Object.fromEntries(tracks.map(t => [t.id, t.name])), [tracks]);
  const deliverableMap = useMemo(() => Object.fromEntries(deliverableTypes.map(d => [d.id, d.name])), [deliverableTypes]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return templates.filter(t => {
      if (filterStatus === "active" && !t.isActive) return false;
      if (filterStatus === "inactive" && t.isActive) return false;
      if (filterTrack !== "_all" && t.serviceTrackId !== filterTrack) return false;
      if (filterPackage !== "_all") {
        const pkgs = templatePackageMap[t.id] ?? [];
        if (!pkgs.some(p => p.id === filterPackage)) return false;
      }
      if (q) return t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q);
      return true;
    });
  }, [templates, searchQuery, filterTrack, filterStatus, filterPackage, templatePackageMap]);

  // Group by service track
  const grouped = useMemo(() => {
    const groups: Record<string, TaskTemplate[]> = { __none: [] };
    for (const t of filtered) {
      const key = t.serviceTrackId ?? "__none";
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }
    return groups;
  }, [filtered]);

  const groupKeys = useMemo(() => {
    const withTrack = Object.keys(grouped).filter(k => k !== "__none");
    withTrack.sort((a, b) => (trackMap[a] ?? "").localeCompare(trackMap[b] ?? ""));
    return [...withTrack, ...(grouped["__none"]?.length ? ["__none"] : [])];
  }, [grouped, trackMap]);

  if (isLoading) return (
    <AdminLayout>
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    </AdminLayout>
  );

  const renderRow = (t: TaskTemplate) => {
    const pkgs = templatePackageMap[t.id] ?? [];
    return (
    <div key={t.id} className={`flex items-start justify-between gap-4 py-3.5 ${t.isActive ? "" : "opacity-50"}`} data-testid={`tt-row-${t.id}`}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Switch
          checked={t.isActive}
          onCheckedChange={checked => toggleActiveMutation.mutate({ id: t.id, isActive: checked })}
          className="mt-0.5 shrink-0"
          data-testid={`switch-active-${t.id}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm">{t.title}</p>
            {t.cadence && <Badge variant="outline" className="text-xs">{CADENCE_LABELS[t.cadence] ?? t.cadence}</Badge>}
            {t.defaultPriority && t.defaultPriority !== "medium" && (
              <span className={`text-xs font-medium capitalize ${PRIORITY_COLORS[t.defaultPriority]}`}>{t.defaultPriority}</span>
            )}
            {t.requiresClientApproval && <Badge variant="secondary" className="text-xs">Client Approval</Badge>}
            {!t.createsClientVisibleTask && <Badge variant="outline" className="text-xs text-muted-foreground">Internal</Badge>}
          </div>
          {t.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.description}</p>}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {t.defaultRoleOwner && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />{ROLE_OWNER_LABELS[t.defaultRoleOwner] ?? t.defaultRoleOwner}
              </span>
            )}
            {t.defaultCreditCost && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Coins className="h-3 w-3" />{t.defaultCreditCost} cr
              </span>
            )}
            {t.defaultDueOffsetDays != null && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />+{t.defaultDueOffsetDays}d
              </span>
            )}
            {t.deliverableTypeId && deliverableMap[t.deliverableTypeId] && (
              <span className="text-xs text-muted-foreground">{deliverableMap[t.deliverableTypeId]}</span>
            )}
            {pkgs.length > 0 && (
              <span className="flex items-center gap-1 flex-wrap">
                {pkgs.map(p => (
                  <span
                    key={p.id}
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getPackageBadgeClass(p)}`}
                    data-testid={`badge-pkg-${t.id}-${p.id}`}
                  >
                    {p.name}
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => openEdit(t)} data-testid={`button-edit-${t.id}`}>
          <Pencil className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-delete-${t.id}`}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task Template?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete "{t.title}" and remove it from all retainer templates. This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMutation.mutate(t.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">Task Template Library</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Reusable task blueprints — link to service tracks, deliverable types, and retainer packages
            </p>
          </div>
          <div className="flex gap-2">
            {templates.length === 0 && (
              <Button variant="outline" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} data-testid="button-seed-templates">
                {seedMutation.isPending ? "Seeding…" : "Seed Defaults"}
              </Button>
            )}
            <Button onClick={() => { setCreateForm(blankForm()); setCreateOpen(true); }} data-testid="button-add-template">
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap mb-5">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search templates…"
              className="pl-9"
              data-testid="input-search"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <Select value={filterTrack} onValueChange={setFilterTrack}>
            <SelectTrigger className="w-[200px]" data-testid="select-filter-track">
              <SelectValue placeholder="All service tracks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Service Tracks</SelectItem>
              {tracks.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              <SelectItem value="__none">No Track Assigned</SelectItem>
            </SelectContent>
          </Select>
          {retainerTemplates.length > 0 && (
            <Select value={filterPackage} onValueChange={setFilterPackage}>
              <SelectTrigger className="w-[175px]" data-testid="select-filter-package">
                <SelectValue placeholder="All packages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Packages</SelectItem>
                {retainerTemplates.map(rt => (
                  <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px]" data-testid="select-filter-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="inactive">Inactive only</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground ml-auto">{filtered.length} template{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground opacity-40 mb-3" />
              {templates.length === 0 ? (
                <>
                  <p className="text-muted-foreground text-sm mb-1">No task templates yet.</p>
                  <p className="text-xs text-muted-foreground mb-4">Seed default templates based on common agency deliverables.</p>
                  <Button variant="outline" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} data-testid="button-seed-empty">
                    {seedMutation.isPending ? "Seeding…" : "Seed Default Templates"}
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">No templates match the current filters.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {groupKeys.map(groupKey => {
              const items = grouped[groupKey] ?? [];
              if (items.length === 0) return null;
              const trackName = groupKey === "__none" ? "No Service Track" : (trackMap[groupKey] ?? groupKey);
              return (
                <Card key={groupKey}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      {trackName}
                      <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="divide-y">
                      {items.map(renderRow)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={o => { if (!o) { setCreateOpen(false); setCreateForm(blankForm()); setShowAdvancedCreate(false); } }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Task Template</DialogTitle>
              <DialogDescription>Define a reusable task blueprint that can be attached to retainer packages.</DialogDescription>
            </DialogHeader>
            <TemplateFormFields
              form={createForm}
              onChange={patch => setCreateForm(prev => ({ ...prev, ...patch }))}
              tracks={tracks}
              deliverableTypes={deliverableTypes}
              retainerTemplates={retainerTemplates}
              showAdvanced={showAdvancedCreate}
              onToggleAdvanced={() => setShowAdvancedCreate(v => !v)}
            />
            <DialogFooter>
              <Button
                onClick={() => createMutation.mutate(createForm)}
                disabled={createMutation.isPending || !createForm.title.trim()}
                data-testid="button-submit-create"
              >
                {createMutation.isPending ? "Creating…" : "Create Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={o => { if (!o) { setEditOpen(false); setEditingId(null); setShowAdvancedEdit(false); } }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Task Template</DialogTitle>
              <DialogDescription>Update this task template and its retainer package assignments.</DialogDescription>
            </DialogHeader>
            {editingId && (
              <TemplateFormFields
                key={editingId}
                form={editForm}
                onChange={patch => setEditForm(prev => ({ ...prev, ...patch }))}
                tracks={tracks}
                deliverableTypes={deliverableTypes}
                retainerTemplates={retainerTemplates}
                showAdvanced={showAdvancedEdit}
                onToggleAdvanced={() => setShowAdvancedEdit(v => !v)}
              />
            )}
            <DialogFooter>
              <Button
                onClick={() => { if (editingId) updateMutation.mutate({ id: editingId, f: editForm }); }}
                disabled={updateMutation.isPending || !editForm.title.trim()}
                data-testid="button-submit-edit"
              >
                {updateMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
