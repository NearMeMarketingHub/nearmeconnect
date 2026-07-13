import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Trash2, Pencil, ClipboardList, GripVertical, X, CheckSquare } from "lucide-react";

interface TemplateItem {
  id: string;
  templateId: string;
  text: string;
  sortOrder: number;
  createdAt: string;
}

interface ChecklistTemplate {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string | null;
  items: TemplateItem[];
}

export default function AdminChecklistTemplates() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<ChecklistTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [newItemText, setNewItemText] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState("");

  const { data: templates = [], isLoading } = useQuery<ChecklistTemplate[]>({
    queryKey: ["/api/admin/checklist-templates"],
  });

  const createMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/admin/checklist-templates", { name: newName.trim(), description: newDesc.trim() || null }),
    onSuccess: async (res) => {
      const created = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/checklist-templates"] });
      toast({ title: "Template created" });
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      setSelectedTemplate(created);
    },
    onError: () => toast({ title: "Failed to create template", variant: "destructive" }),
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("PATCH", `/api/admin/checklist-templates/${id}`, { name: editName.trim(), description: editDesc.trim() || null }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/checklist-templates"] });
      toast({ title: "Template updated" });
      setEditTemplate(null);
    },
    onError: () => toast({ title: "Failed to update template", variant: "destructive" }),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/checklist-templates/${id}`, {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/checklist-templates"] });
      toast({ title: "Template deleted" });
      setSelectedTemplate(null);
    },
    onError: () => toast({ title: "Failed to delete template", variant: "destructive" }),
  });

  const addItemMutation = useMutation({
    mutationFn: async ({ templateId, text }: { templateId: string; text: string }) =>
      apiRequest("POST", `/api/admin/checklist-templates/${templateId}/items`, { text }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/checklist-templates"] });
      setNewItemText("");
    },
    onError: () => toast({ title: "Failed to add item", variant: "destructive" }),
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) =>
      apiRequest("PATCH", `/api/admin/checklist-template-items/${id}`, { text }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/checklist-templates"] });
      setEditingItemId(null);
      setEditingItemText("");
    },
    onError: () => toast({ title: "Failed to update item", variant: "destructive" }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/checklist-template-items/${id}`, {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/checklist-templates"] });
    },
    onError: () => toast({ title: "Failed to delete item", variant: "destructive" }),
  });

  const refreshedSelected = selectedTemplate ? templates.find(t => t.id === selectedTemplate.id) ?? selectedTemplate : null;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <ClipboardList className="w-6 h-6" />
              Checklist Templates
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Create reusable project management checklists that can be applied to any client portal.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-create-template">
            <Plus className="w-4 h-4 mr-2" />New Template
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Template list */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Templates ({templates.length})</p>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
              </div>
            ) : templates.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <ClipboardList className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">No templates yet.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreateOpen(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1" />Create one
                  </Button>
                </CardContent>
              </Card>
            ) : (
              templates.map(t => (
                <Card
                  key={t.id}
                  className={`cursor-pointer transition-colors hover-elevate ${refreshedSelected?.id === t.id ? "border-primary" : ""}`}
                  onClick={() => setSelectedTemplate(t)}
                  data-testid={`card-template-${t.id}`}
                >
                  <CardHeader className="pb-2 pt-3 px-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-sm truncate">{t.name}</CardTitle>
                        {t.description && <CardDescription className="text-xs mt-0.5 line-clamp-2">{t.description}</CardDescription>}
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">{t.items.length}</Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>

          {/* Template detail / item editor */}
          <div className="md:col-span-2">
            {!refreshedSelected ? (
              <Card className="h-full">
                <CardContent className="py-16 text-center">
                  <CheckSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                  <p className="text-sm text-muted-foreground">Select a template to manage its items.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle>{refreshedSelected.name}</CardTitle>
                      {refreshedSelected.description && <CardDescription className="mt-1">{refreshedSelected.description}</CardDescription>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => { setEditTemplate(refreshedSelected); setEditName(refreshedSelected.name); setEditDesc(refreshedSelected.description || ""); }} data-testid="button-edit-template">
                        <Pencil className="w-3.5 h-3.5 mr-1" />Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" data-testid="button-delete-template">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete template?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently delete "{refreshedSelected.name}" and all its items. This does not affect checklists already imported into client portals.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteTemplateMutation.mutate(refreshedSelected.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    {refreshedSelected.items.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-3 text-center">No items yet. Add some below.</p>
                    ) : (
                      refreshedSelected.items.map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-2 group p-2 border rounded-lg" data-testid={`item-template-${item.id}`}>
                          <GripVertical className="w-4 h-4 text-muted-foreground opacity-40 shrink-0" />
                          <span className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground shrink-0">{idx + 1}</span>
                          {editingItemId === item.id ? (
                            <div className="flex-1 flex gap-2">
                              <Input
                                value={editingItemText}
                                onChange={e => setEditingItemText(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") updateItemMutation.mutate({ id: item.id, text: editingItemText }); if (e.key === "Escape") setEditingItemId(null); }}
                                className="h-7 text-sm"
                                autoFocus
                                data-testid={`input-edit-item-${item.id}`}
                              />
                              <Button size="sm" className="h-7 px-2" onClick={() => updateItemMutation.mutate({ id: item.id, text: editingItemText })} disabled={updateItemMutation.isPending}>Save</Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingItemId(null)}><X className="w-3.5 h-3.5" /></Button>
                            </div>
                          ) : (
                            <>
                              <span className="flex-1 text-sm">{item.text}</span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditingItemId(item.id); setEditingItemText(item.text); }} data-testid={`button-edit-item-${item.id}`}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => deleteItemMutation.mutate(item.id)} data-testid={`button-delete-item-${item.id}`}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a checklist item..."
                      value={newItemText}
                      onChange={e => setNewItemText(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && newItemText.trim()) addItemMutation.mutate({ templateId: refreshedSelected.id, text: newItemText.trim() }); }}
                      className="h-8 text-sm"
                      data-testid="input-new-item"
                    />
                    <Button
                      size="sm"
                      className="h-8"
                      disabled={!newItemText.trim() || addItemMutation.isPending}
                      onClick={() => addItemMutation.mutate({ templateId: refreshedSelected.id, text: newItemText.trim() })}
                      data-testid="button-add-item"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Create template dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Checklist Template</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Template Name *</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Government Onboarding" className="mt-1" data-testid="input-template-name" /></div>
            <div><Label>Description</Label><Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Optional description..." rows={2} className="mt-1" data-testid="input-template-desc" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!newName.trim() || createMutation.isPending} data-testid="button-confirm-create-template">
              {createMutation.isPending ? "Creating…" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit template dialog */}
      <Dialog open={!!editTemplate} onOpenChange={v => !v && setEditTemplate(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Template</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Template Name *</Label><Input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1" data-testid="input-edit-template-name" /></div>
            <div><Label>Description</Label><Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2} className="mt-1" data-testid="input-edit-template-desc" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTemplate(null)}>Cancel</Button>
            <Button onClick={() => editTemplate && updateTemplateMutation.mutate(editTemplate.id)} disabled={!editName.trim() || updateTemplateMutation.isPending} data-testid="button-confirm-edit-template">
              {updateTemplateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
