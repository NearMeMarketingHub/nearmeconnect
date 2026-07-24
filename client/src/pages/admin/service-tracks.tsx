import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";
import type { ServiceTrack } from "@shared/schema";

const DEFAULT_TRACKS = [
  { name: "Account Management and Strategy", sortOrder: 1 },
  { name: "Content Engine", sortOrder: 2 },
  { name: "Local SEO and GBP", sortOrder: 3 },
  { name: "HubSpot / CRM", sortOrder: 4 },
  { name: "Campaigns and Funnels", sortOrder: 5 },
  { name: "Paid Ads", sortOrder: 6 },
  { name: "Website and Technical", sortOrder: 7 },
  { name: "Reporting and Insights", sortOrder: 8 },
  { name: "RevOps and Enablement", sortOrder: 9 },
];

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export default function AdminServiceTracks() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceTrack | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const { data: tracks = [], isLoading } = useQuery<ServiceTrack[]>({
    queryKey: ["/api/service-tracks"],
  });

  const resetForm = () => { setName(""); setSlug(""); setDescription(""); setSortOrder("0"); };

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/service-tracks", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/service-tracks"] }); setCreateOpen(false); resetForm(); toast({ title: "Service track created" }); },
    onError: () => toast({ title: "Failed to create", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/service-tracks/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/service-tracks"] }); setEditOpen(false); setEditing(null); resetForm(); toast({ title: "Service track updated" }); },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/service-tracks/${id}`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/service-tracks"] }); toast({ title: "Service track deleted" }); },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/service-tracks/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/service-tracks"] }),
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      for (const t of DEFAULT_TRACKS) {
        await apiRequest("POST", "/api/service-tracks", { name: t.name, slug: toSlug(t.name), sortOrder: t.sortOrder, status: "active" });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/service-tracks"] }); toast({ title: "Default service tracks seeded" }); },
    onError: () => toast({ title: "Seed partially failed", variant: "destructive" }),
  });

  const openEdit = (t: ServiceTrack) => {
    setEditing(t);
    setName(t.name);
    setSlug(t.slug);
    setDescription(t.description ?? "");
    setSortOrder(String(t.sortOrder));
    setEditOpen(true);
  };

  if (isLoading) return (
    <AdminLayout>
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    </AdminLayout>
  );

  const active = tracks.filter(t => t.status === "active");
  const inactive = tracks.filter(t => t.status !== "active");

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">Service Tracks</h1>
            <p className="text-sm text-muted-foreground mt-1">Define the service categories included in retainer packages</p>
          </div>
          <div className="flex gap-2">
            {tracks.length === 0 && (
              <Button variant="outline" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} data-testid="button-seed-tracks">
                {seedMutation.isPending ? "Seeding…" : "Seed Defaults"}
              </Button>
            )}
            <Button onClick={() => setCreateOpen(true)} data-testid="button-add-track">
              <Plus className="h-4 w-4 mr-2" />
              Add Service Track
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {active.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Active Tracks
                  <Badge variant="secondary">{active.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {active.map(t => (
                    <div key={t.id} className="flex items-center justify-between gap-4 py-3" data-testid={`track-row-${t.id}`}>
                      <div className="flex items-center gap-4">
                        <Switch
                          checked={t.status === "active"}
                          onCheckedChange={checked => toggleStatusMutation.mutate({ id: t.id, status: checked ? "active" : "inactive" })}
                          data-testid={`switch-active-${t.id}`}
                        />
                        <div>
                          <p className="font-medium">{t.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{t.slug}</p>
                          {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Order {t.sortOrder}</Badge>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)} data-testid={`button-edit-${t.id}`}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-delete-${t.id}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Service Track?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently delete "{t.name}" and remove it from all retainer templates. This cannot be undone.</AlertDialogDescription>
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
          )}

          {inactive.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                  <Layers className="h-5 w-5" />
                  Inactive Tracks
                  <Badge variant="secondary">{inactive.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {inactive.map(t => (
                    <div key={t.id} className="flex items-center justify-between gap-4 py-3 opacity-60" data-testid={`track-row-${t.id}`}>
                      <div className="flex items-center gap-4">
                        <Switch
                          checked={false}
                          onCheckedChange={checked => toggleStatusMutation.mutate({ id: t.id, status: checked ? "active" : "inactive" })}
                          data-testid={`switch-active-${t.id}`}
                        />
                        <div>
                          <p className="font-medium">{t.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{t.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)} data-testid={`button-edit-${t.id}`}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-delete-${t.id}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Service Track?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently delete "{t.name}".</AlertDialogDescription>
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
          )}

          {tracks.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center">
                <Layers className="h-8 w-8 mx-auto text-muted-foreground opacity-40 mb-3" />
                <p className="text-muted-foreground text-sm mb-3">No service tracks yet.</p>
                <Button variant="outline" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
                  {seedMutation.isPending ? "Seeding…" : "Seed Default Tracks"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Service Track</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name <span className="text-red-500">*</span></Label>
                <Input value={name} onChange={e => { setName(e.target.value); setSlug(toSlug(e.target.value)); }} placeholder="e.g. Content Engine" data-testid="input-track-name" />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="auto-generated" className="font-mono text-sm" data-testid="input-track-slug" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What this service track covers…" data-testid="textarea-track-description" />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input type="number" min="0" value={sortOrder} onChange={e => setSortOrder(e.target.value)} data-testid="input-track-sort-order" />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  if (!name.trim()) return;
                  createMutation.mutate({ name: name.trim(), slug: slug || toSlug(name), description: description || null, sortOrder: parseInt(sortOrder) || 0, status: "active" });
                }}
                disabled={createMutation.isPending || !name.trim()}
                data-testid="button-submit-track"
              >
                {createMutation.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Service Track</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name <span className="text-red-500">*</span></Label>
                <Input value={name} onChange={e => setName(e.target.value)} data-testid="input-edit-name" />
              </div>
              <div className="space-y-2">
                <Label>Slug <span className="text-xs text-muted-foreground">(cannot change)</span></Label>
                <Input value={editing?.slug ?? ""} disabled className="bg-muted font-mono text-sm" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} data-testid="textarea-edit-description" />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input type="number" min="0" value={sortOrder} onChange={e => setSortOrder(e.target.value)} data-testid="input-edit-sort-order" />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  if (!editing || !name.trim()) return;
                  updateMutation.mutate({ id: editing.id, data: { name: name.trim(), description: description || null, sortOrder: parseInt(sortOrder) || 0 } });
                }}
                disabled={updateMutation.isPending || !name.trim()}
                data-testid="button-update-track"
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
