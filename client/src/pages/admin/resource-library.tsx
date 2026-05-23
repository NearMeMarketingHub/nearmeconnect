import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus, Search, ExternalLink, Pencil, Trash2, FolderOpen, AlertCircle, RefreshCw,
  Archive, CheckCircle2, Globe, Lock, Eye, BookOpen, Share2, Briefcase, FileText,
  Star, Link2, Building2, ShieldCheck,
} from "lucide-react";
import type { ClientResource, Company } from "@shared/schema";
import { resourceTypeEnum, resourceStatusEnum, resourceVisibilityEnum } from "@shared/schema";

const TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  sharepoint_main_folder: { label: "SharePoint Main Folder", icon: FolderOpen },
  brand_kit: { label: "Brand Kit", icon: Star },
  logo_creative_assets: { label: "Logo / Creative Assets", icon: Share2 },
  brand_guidelines: { label: "Brand Guidelines", icon: BookOpen },
  website_admin: { label: "Website / Admin", icon: Globe },
  social_profile: { label: "Social Profile", icon: Share2 },
  directory_profile: { label: "Directory Profile", icon: Building2 },
  google_business_profile: { label: "Google Business Profile", icon: Globe },
  hubspot_record: { label: "HubSpot Record", icon: Briefcase },
  campaign_folder: { label: "Campaign Folder", icon: FolderOpen },
  reporting_folder: { label: "Reporting Folder", icon: FileText },
  credentials_reference: { label: "Credentials Reference", icon: ShieldCheck },
  strategy_doc: { label: "Strategy Doc", icon: BookOpen },
  meeting_notes_folder: { label: "Meeting Notes Folder", icon: FileText },
  other: { label: "Other", icon: Link2 },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  active: { label: "Active", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: CheckCircle2 },
  missing: { label: "Missing", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: AlertCircle },
  needs_update: { label: "Needs Update", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", icon: RefreshCw },
  archived: { label: "Archived", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: Archive },
};

const VISIBILITY_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  internal_only: { label: "Internal Only", icon: Lock },
  client_visible: { label: "Client Visible", icon: Eye },
  admin_only: { label: "Admin Only", icon: ShieldCheck },
};

const EMPTY_FORM = {
  title: "",
  resourceType: "other" as typeof resourceTypeEnum[number],
  url: "",
  description: "",
  visibility: "internal_only" as typeof resourceVisibilityEnum[number],
  status: "active" as typeof resourceStatusEnum[number],
  owner: "",
  notes: "",
  lastCheckedDate: "",
  relatedCampaignId: "",
  relatedTaskId: "",
  relatedContentItemId: "",
};

export default function AdminResourceLibrary() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterVisibility, setFilterVisibility] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ClientResource | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM, companyId: "" });

  const { data: companies = [] } = useQuery<Company[]>({ queryKey: ["/api/companies"] });
  const { data: resources = [], isLoading } = useQuery<ClientResource[]>({ queryKey: ["/api/resources"] });

  const filtered = useMemo(() => {
    return resources.filter(r => {
      if (filterCompany !== "all" && r.companyId !== filterCompany) return false;
      if (filterType !== "all" && r.resourceType !== filterType) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterVisibility !== "all" && r.visibility !== filterVisibility) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.title.toLowerCase().includes(q) && !(r.description ?? "").toLowerCase().includes(q) && !(r.owner ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [resources, filterCompany, filterType, filterStatus, filterVisibility, search]);

  const grouped = useMemo(() => {
    const map: Record<string, { company: Company | undefined; items: ClientResource[] }> = {};
    for (const r of filtered) {
      if (!map[r.companyId]) map[r.companyId] = { company: companies.find(c => c.id === r.companyId), items: [] };
      map[r.companyId].items.push(r);
    }
    return Object.entries(map).sort(([, a], [, b]) => (a.company?.name ?? "").localeCompare(b.company?.name ?? ""));
  }, [filtered, companies]);

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", `/api/companies/${data.companyId}/resources`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      if (form.companyId) queryClient.invalidateQueries({ queryKey: [`/api/companies/${form.companyId}/resources`] });
      toast({ title: "Resource created" });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Failed to create resource", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof form & { id: string }) =>
      apiRequest("PATCH", `/api/companies/${data.companyId}/resources/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      if (form.companyId) queryClient.invalidateQueries({ queryKey: [`/api/companies/${form.companyId}/resources`] });
      toast({ title: "Resource updated" });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Failed to update resource", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (r: ClientResource) => apiRequest("DELETE", `/api/companies/${r.companyId}/resources/${r.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      toast({ title: "Resource deleted" });
    },
    onError: () => toast({ title: "Failed to delete resource", variant: "destructive" }),
  });

  function openCreate() {
    setEditingResource(null);
    setForm({ ...EMPTY_FORM, companyId: filterCompany !== "all" ? filterCompany : "" });
    setDialogOpen(true);
  }

  function openEdit(r: ClientResource) {
    setEditingResource(r);
    setForm({
      companyId: r.companyId,
      title: r.title,
      resourceType: r.resourceType as any,
      url: r.url ?? "",
      description: r.description ?? "",
      visibility: r.visibility as any,
      status: r.status as any,
      owner: r.owner ?? "",
      notes: r.notes ?? "",
      lastCheckedDate: r.lastCheckedDate ?? "",
      relatedCampaignId: r.relatedCampaignId ?? "",
      relatedTaskId: r.relatedTaskId ?? "",
      relatedContentItemId: r.relatedContentItemId ?? "",
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyId || !form.title || !form.resourceType) return;
    const payload = {
      ...form,
      url: form.url || null,
      description: form.description || null,
      owner: form.owner || null,
      notes: form.notes || null,
      lastCheckedDate: form.lastCheckedDate || null,
      relatedCampaignId: form.relatedCampaignId || null,
      relatedTaskId: form.relatedTaskId || null,
      relatedContentItemId: form.relatedContentItemId || null,
    };
    if (editingResource) {
      updateMutation.mutate({ ...payload, id: editingResource.id } as any);
    } else {
      createMutation.mutate(payload as any);
    }
  }

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Resource Library</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Central hub for all client SharePoint folders, brand assets, profiles, and documents.</p>
          </div>
          <Button onClick={openCreate} data-testid="button-add-resource">
            <Plus className="h-4 w-4 mr-2" /> Add Resource
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search resources…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" data-testid="input-search-resources" />
          </div>
          <Select value={filterCompany} onValueChange={setFilterCompany}>
            <SelectTrigger className="w-48" data-testid="select-filter-company"><SelectValue placeholder="All Companies" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48" data-testid="select-filter-type"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {resourceTypeEnum.map(t => <SelectItem key={t} value={t}>{TYPE_CONFIG[t]?.label ?? t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40" data-testid="select-filter-status"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {resourceStatusEnum.map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterVisibility} onValueChange={setFilterVisibility}>
            <SelectTrigger className="w-44" data-testid="select-filter-visibility"><SelectValue placeholder="All Visibility" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Visibility</SelectItem>
              {resourceVisibilityEnum.map(v => <SelectItem key={v} value={v}>{VISIBILITY_CONFIG[v]?.label ?? v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Summary chips */}
        {filtered.length > 0 && (
          <div className="flex gap-2 flex-wrap text-xs">
            {(["missing", "needs_update"] as const).map(s => {
              const count = filtered.filter(r => r.status === s).length;
              if (!count) return null;
              return (
                <button key={s} onClick={() => setFilterStatus(s)} className={`px-2 py-1 rounded-full font-medium ${STATUS_CONFIG[s].color}`} data-testid={`chip-status-${s}`}>
                  {count} {STATUS_CONFIG[s].label}
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No resources found</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting filters or add a resource to get started.</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {["sharepoint_main_folder", "brand_kit", "social_profile"].map(t => (
                  <Button key={t} size="sm" variant="outline" onClick={() => { openCreate(); setForm(f => ({ ...f, resourceType: t as any })); }} data-testid={`button-quick-add-${t}`}>
                    <Plus className="h-3 w-3 mr-1" /> Add {TYPE_CONFIG[t]?.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : filterCompany !== "all" ? (
          // Single-company flat view
          <ResourceTable resources={filtered} companies={companies} onEdit={openEdit} onDelete={r => deleteMutation.mutate(r)} />
        ) : (
          // Multi-company grouped view
          <div className="space-y-6">
            {grouped.map(([companyId, { company, items }]) => (
              <Card key={companyId}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {company?.name ?? companyId}
                    <Badge variant="secondary" className="ml-1">{items.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ResourceTable resources={items} companies={companies} onEdit={openEdit} onDelete={r => deleteMutation.mutate(r)} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingResource ? "Edit Resource" : "Add Resource"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Company *</Label>
                <Select value={form.companyId} onValueChange={v => setForm(f => ({ ...f, companyId: v }))}>
                  <SelectTrigger data-testid="select-resource-company"><SelectValue placeholder="Select company…" /></SelectTrigger>
                  <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Client SharePoint Folder" data-testid="input-resource-title" />
              </div>
              <div className="space-y-2">
                <Label>Resource Type *</Label>
                <Select value={form.resourceType} onValueChange={v => setForm(f => ({ ...f, resourceType: v as any }))}>
                  <SelectTrigger data-testid="select-resource-type"><SelectValue /></SelectTrigger>
                  <SelectContent>{resourceTypeEnum.map(t => <SelectItem key={t} value={t}>{TYPE_CONFIG[t]?.label ?? t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                  <SelectTrigger data-testid="select-resource-status"><SelectValue /></SelectTrigger>
                  <SelectContent>{resourceStatusEnum.map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select value={form.visibility} onValueChange={v => setForm(f => ({ ...f, visibility: v as any }))}>
                  <SelectTrigger data-testid="select-resource-visibility"><SelectValue /></SelectTrigger>
                  <SelectContent>{resourceVisibilityEnum.map(v => <SelectItem key={v} value={v}>{VISIBILITY_CONFIG[v]?.label ?? v}</SelectItem>)}</SelectContent>
                </Select>
                {form.resourceType === "credentials_reference" && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                    <ShieldCheck className="h-3 w-3" /> Credential values are never shown here — link to the secure credentials section instead.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Owner</Label>
                <Input value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="e.g., John Smith" data-testid="input-resource-owner" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>URL</Label>
                <Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://…" data-testid="input-resource-url" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of this resource…" rows={2} data-testid="textarea-resource-description" />
              </div>
              <div className="space-y-2">
                <Label>Last Checked Date</Label>
                <Input type="date" value={form.lastCheckedDate} onChange={e => setForm(f => ({ ...f, lastCheckedDate: e.target.value }))} data-testid="input-resource-last-checked" />
              </div>
              <div className="space-y-2">
                <Label>Related Campaign ID</Label>
                <Input value={form.relatedCampaignId} onChange={e => setForm(f => ({ ...f, relatedCampaignId: e.target.value }))} placeholder="Optional" data-testid="input-resource-campaign-id" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes…" rows={2} data-testid="textarea-resource-notes" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isMutating || !form.companyId || !form.title} data-testid="button-save-resource">
                {isMutating ? "Saving…" : editingResource ? "Save Changes" : "Add Resource"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function ResourceTable({
  resources,
  companies,
  onEdit,
  onDelete,
}: {
  resources: ClientResource[];
  companies: Company[];
  onEdit: (r: ClientResource) => void;
  onDelete: (r: ClientResource) => void;
}) {
  return (
    <div className="divide-y divide-border">
      {resources.map(r => {
        const TypeIcon = TYPE_CONFIG[r.resourceType]?.icon ?? Link2;
        const statusCfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.active;
        const StatusIcon = statusCfg.icon;
        const visCfg = VISIBILITY_CONFIG[r.visibility] ?? VISIBILITY_CONFIG.internal_only;
        const VisIcon = visCfg.icon;
        const isCredential = r.resourceType === "credentials_reference";

        return (
          <div key={r.id} className="flex items-center gap-3 py-3 group" data-testid={`row-resource-${r.id}`}>
            <div className="p-2 rounded-lg bg-muted shrink-0">
              <TypeIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm truncate">{r.title}</span>
                <Badge variant="outline" className="text-xs shrink-0">{TYPE_CONFIG[r.resourceType]?.label ?? r.resourceType}</Badge>
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                  <StatusIcon className="h-3 w-3" />{statusCfg.label}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <VisIcon className="h-3 w-3" />{visCfg.label}
                </span>
              </div>
              {r.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{r.description}</p>}
              {r.owner && <p className="text-xs text-muted-foreground mt-0.5">Owner: {r.owner}</p>}
              {isCredential && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Credential values stored securely — view in the Marketing Hub credentials section.
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {r.url && !isCredential && (
                <Button size="icon" variant="ghost" asChild className="h-8 w-8" data-testid={`button-open-resource-${r.id}`}>
                  <a href={r.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => onEdit(r)} data-testid={`button-edit-resource-${r.id}`}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive" data-testid={`button-delete-resource-${r.id}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Resource</AlertDialogTitle>
                    <AlertDialogDescription>Remove "{r.title}" from the resource library? This cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(r)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        );
      })}
    </div>
  );
}
