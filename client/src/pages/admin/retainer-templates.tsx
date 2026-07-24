import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, FileText, DollarSign, Coins, Layers, ChevronDown, ChevronUp } from "lucide-react";
import type { RetainerTemplate, ServiceTrack } from "@shared/schema";

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active:   { label: "Active",   className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  draft:    { label: "Draft",    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  inactive: { label: "Inactive", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
};

type TrackEntry = { serviceTrackId: string; includedByDefault: boolean };

interface TemplateFormProps {
  initial?: Partial<RetainerTemplate & { serviceTrackEntries: TrackEntry[] }>;
  tracks: ServiceTrack[];
  onSubmit: (data: any) => void;
  isPending: boolean;
  submitLabel: string;
}

function TemplateForm({ initial, tracks, onSubmit, isPending, submitLabel }: TemplateFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<string>(initial?.status ?? "draft");
  const [monthlyPrice, setMonthlyPrice] = useState(initial?.suggestedMonthlyPrice ? String(initial.suggestedMonthlyPrice) : "");
  const [monthlyCredits, setMonthlyCredits] = useState(initial?.monthlyCreditAllocation ? String(initial.monthlyCreditAllocation) : "");
  const [clientType, setClientType] = useState(initial?.recommendedClientType ?? "");
  const [includedScope, setIncludedScope] = useState(initial?.includedScopeSummary ?? "");
  const [excludedScope, setExcludedScope] = useState(initial?.excludedScopeSummary ?? "");
  const [overageRules, setOverageRules] = useState(initial?.overageRules ?? "");
  const [reportingCadence, setReportingCadence] = useState(initial?.reportingCadence ?? "");
  const [meetingCadence, setMeetingCadence] = useState(initial?.meetingCadence ?? "");
  const [genWindowDays, setGenWindowDays] = useState(String(initial?.generationWindowDays ?? 60));
  const [trackEntries, setTrackEntries] = useState<TrackEntry[]>(initial?.serviceTrackEntries ?? []);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const toggleTrack = (trackId: string) => {
    setTrackEntries(prev => {
      const existing = prev.find(e => e.serviceTrackId === trackId);
      if (existing) return prev.filter(e => e.serviceTrackId !== trackId);
      return [...prev, { serviceTrackId: trackId, includedByDefault: true }];
    });
  };

  const toggleDefault = (trackId: string, value: boolean) => {
    setTrackEntries(prev => prev.map(e => e.serviceTrackId === trackId ? { ...e, includedByDefault: value } : e));
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      slug: slug || toSlug(name),
      description: description || null,
      status,
      suggestedMonthlyPrice: monthlyPrice ? monthlyPrice : null,
      monthlyCreditAllocation: monthlyCredits ? parseFloat(monthlyCredits) : null,
      recommendedClientType: clientType || null,
      includedScopeSummary: includedScope || null,
      excludedScopeSummary: excludedScope || null,
      overageRules: overageRules || null,
      reportingCadence: reportingCadence || null,
      meetingCadence: meetingCadence || null,
      generationWindowDays: parseInt(genWindowDays) || 60,
      serviceTracks: trackEntries,
    });
  };

  return (
    <div className="space-y-5 overflow-y-auto max-h-[70vh] pr-1">
      {/* Core fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label>Name <span className="text-red-500">*</span></Label>
          <Input value={name} onChange={e => { setName(e.target.value); if (!initial?.slug) setSlug(toSlug(e.target.value)); }} placeholder="e.g. Growth Retainer" data-testid="input-template-name" />
        </div>
        <div className="space-y-1.5">
          <Label>Slug</Label>
          <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="auto-generated" className="font-mono text-sm" data-testid="input-template-slug" />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger data-testid="select-template-status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Description</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Brief overview of this retainer package…" data-testid="textarea-template-description" />
        </div>
      </div>

      <Separator />

      {/* Pricing & Credits */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Monthly Price</Label>
          <Input value={monthlyPrice} onChange={e => setMonthlyPrice(e.target.value)} type="number" min="0" step="100" placeholder="e.g. 2500" data-testid="input-monthly-price" />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1"><Coins className="h-3.5 w-3.5" /> Monthly Credits</Label>
          <Input value={monthlyCredits} onChange={e => setMonthlyCredits(e.target.value)} type="number" min="0" step="1" placeholder="e.g. 20" data-testid="input-monthly-credits" />
        </div>
        <div className="space-y-1.5">
          <Label>Client Type</Label>
          <Select value={clientType || "_any"} onValueChange={v => setClientType(v === "_any" ? "" : v)}>
            <SelectTrigger data-testid="select-client-type"><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_any">Any</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="government">Government</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Service Tracks */}
      {tracks.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Service Tracks</Label>
          <p className="text-xs text-muted-foreground">Select which service tracks are part of this retainer. Toggle "Default" to pre-check a track when assigning to a company.</p>
          <div className="border rounded-lg divide-y">
            {tracks.map(t => {
              const entry = trackEntries.find(e => e.serviceTrackId === t.id);
              const included = !!entry;
              return (
                <div key={t.id} className={`flex items-center justify-between px-3 py-2.5 gap-3 transition-colors ${included ? "" : "opacity-50"}`} data-testid={`track-entry-${t.id}`}>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={included}
                      onCheckedChange={() => toggleTrack(t.id)}
                      data-testid={`checkbox-track-${t.id}`}
                    />
                    <span className="text-sm font-medium">{t.name}</span>
                  </div>
                  {included && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Default</span>
                      <Switch
                        checked={entry.includedByDefault}
                        onCheckedChange={v => toggleDefault(t.id, v)}
                        data-testid={`switch-default-${t.id}`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">{trackEntries.length} track{trackEntries.length !== 1 ? "s" : ""} selected</p>
        </div>
      )}

      <Separator />

      {/* Advanced / scope fields */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-toggle-advanced"
        >
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showAdvanced ? "Hide" : "Show"} Scope &amp; Cadence Details
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Included Scope Summary</Label>
              <Textarea value={includedScope} onChange={e => setIncludedScope(e.target.value)} rows={3} placeholder="What's included in this retainer…" data-testid="textarea-included-scope" />
            </div>
            <div className="space-y-1.5">
              <Label>Excluded Scope Summary</Label>
              <Textarea value={excludedScope} onChange={e => setExcludedScope(e.target.value)} rows={2} placeholder="What's not included…" data-testid="textarea-excluded-scope" />
            </div>
            <div className="space-y-1.5">
              <Label>Overage Rules</Label>
              <Textarea value={overageRules} onChange={e => setOverageRules(e.target.value)} rows={2} placeholder="How overages are handled…" data-testid="textarea-overage-rules" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Reporting Cadence</Label>
                <Input value={reportingCadence} onChange={e => setReportingCadence(e.target.value)} placeholder="e.g. Monthly" data-testid="input-reporting-cadence" />
              </div>
              <div className="space-y-1.5">
                <Label>Meeting Cadence</Label>
                <Input value={meetingCadence} onChange={e => setMeetingCadence(e.target.value)} placeholder="e.g. Bi-weekly" data-testid="input-meeting-cadence" />
              </div>
              <div className="space-y-1.5">
                <Label>Generation Window (days)</Label>
                <Input type="number" min="1" value={genWindowDays} onChange={e => setGenWindowDays(e.target.value)} data-testid="input-gen-window-days" />
                <p className="text-xs text-muted-foreground">How far ahead tasks are generated. Default: 60</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button onClick={handleSubmit} disabled={isPending || !name.trim()} data-testid="button-submit-template">
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function AdminRetainerTemplates() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<any>(null);

  const { data: templates = [], isLoading } = useQuery<RetainerTemplate[]>({
    queryKey: ["/api/retainer-templates"],
  });

  const { data: allTracks = [] } = useQuery<ServiceTrack[]>({
    queryKey: ["/api/service-tracks"],
  });

  const activeTracks = allTracks.filter(t => t.status === "active");

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/retainer-templates", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/retainer-templates"] }); setCreateOpen(false); toast({ title: "Retainer template created" }); },
    onError: () => toast({ title: "Failed to create template", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/retainer-templates/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/retainer-templates"] }); setEditOpen(false); setEditingId(null); setEditingData(null); toast({ title: "Template updated" }); },
    onError: () => toast({ title: "Failed to update template", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/retainer-templates/${id}`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/retainer-templates"] }); toast({ title: "Template deleted" }); },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/retainer-templates/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/retainer-templates"] }),
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  });

  const openEdit = async (t: RetainerTemplate) => {
    try {
      const res = await apiRequest("GET", `/api/retainer-templates/${t.id}`);
      const data = await res.json() as RetainerTemplate & { serviceTracks: Array<{ serviceTrackId: string; includedByDefault: boolean }> };
      setEditingData({
        ...data,
        serviceTrackEntries: (data.serviceTracks || []).map((st: any) => ({ serviceTrackId: st.serviceTrackId, includedByDefault: st.includedByDefault })),
      });
      setEditingId(t.id);
      setEditOpen(true);
    } catch {
      toast({ title: "Failed to load template", variant: "destructive" });
    }
  };

  if (isLoading) return (
    <AdminLayout>
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    </AdminLayout>
  );

  const grouped: Record<string, RetainerTemplate[]> = { active: [], draft: [], inactive: [] };
  for (const t of templates) grouped[t.status]?.push(t) ?? grouped.draft.push(t);

  const renderGroup = (status: string, list: RetainerTemplate[]) => {
    if (list.length === 0) return null;
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
    return (
      <Card key={status}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            {cfg.label} Templates
            <Badge variant="secondary">{list.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {list.map(t => (
              <div key={t.id} className="flex items-start justify-between gap-4 py-4" data-testid={`template-row-${t.id}`}>
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Switch
                    checked={t.status === "active"}
                    onCheckedChange={checked => toggleStatusMutation.mutate({ id: t.id, status: checked ? "active" : "inactive" })}
                    data-testid={`switch-status-${t.id}`}
                    className="mt-0.5 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{t.name}</p>
                      <Badge className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
                      {t.recommendedClientType && <Badge variant="outline" className="text-xs capitalize">{t.recommendedClientType}</Badge>}
                    </div>
                    {t.description && <p className="text-sm text-muted-foreground mt-0.5 truncate">{t.description}</p>}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {t.suggestedMonthlyPrice && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />${Number(t.suggestedMonthlyPrice).toLocaleString()}/mo
                        </span>
                      )}
                      {t.monthlyCreditAllocation && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Coins className="h-3 w-3" />{t.monthlyCreditAllocation} credits/mo
                        </span>
                      )}
                      {t.reportingCadence && <span className="text-xs text-muted-foreground">Report: {t.reportingCadence}</span>}
                      {t.meetingCadence && <span className="text-xs text-muted-foreground">Meetings: {t.meetingCadence}</span>}
                      <span className="text-xs text-muted-foreground font-mono">{t.slug}</span>
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
                        <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete "{t.name}". This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(t.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">Retainer Templates</h1>
            <p className="text-sm text-muted-foreground mt-1">Define retainer packages with service tracks, pricing, and scope</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-add-template">
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>

        {templates.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground opacity-40 mb-3" />
              <p className="text-muted-foreground text-sm mb-1">No retainer templates yet.</p>
              <p className="text-xs text-muted-foreground mb-4">Create your first template to define reusable retainer packages.</p>
              <Button onClick={() => setCreateOpen(true)} variant="outline" data-testid="button-add-template-empty">
                <Plus className="h-4 w-4 mr-1.5" /> New Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {renderGroup("active", grouped.active)}
            {renderGroup("draft", grouped.draft)}
            {renderGroup("inactive", grouped.inactive)}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Retainer Template</DialogTitle>
              <DialogDescription>Define a reusable retainer package with pricing, service tracks, and scope.</DialogDescription>
            </DialogHeader>
            <TemplateForm
              tracks={activeTracks}
              onSubmit={data => createMutation.mutate(data)}
              isPending={createMutation.isPending}
              submitLabel="Create Template"
            />
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={o => { if (!o) { setEditOpen(false); setEditingId(null); setEditingData(null); } }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Retainer Template</DialogTitle>
              <DialogDescription>Update the retainer template details and service track assignments.</DialogDescription>
            </DialogHeader>
            {editingData && editingId && (
              <TemplateForm
                key={editingId}
                initial={editingData}
                tracks={activeTracks}
                onSubmit={data => updateMutation.mutate({ id: editingId, data })}
                isPending={updateMutation.isPending}
                submitLabel="Save Changes"
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
