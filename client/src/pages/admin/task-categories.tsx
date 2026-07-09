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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, LayoutGrid, Search, ChevronLeft, ChevronRight, X, GripVertical } from "lucide-react";
import type { TaskCategory } from "@shared/schema";

const PRESET_COLORS = [
  "#f97316", "#ef4444", "#eab308", "#22c55e", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#6366f1",
  "#84cc16", "#06b6d4", "#a855f7", "#10b981", "#0ea5e9",
];

export default function AdminTaskCategories() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null);

  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: categories, isLoading } = useQuery<TaskCategory[]>({
    queryKey: ["/api/task-categories/global"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      return apiRequest("POST", "/api/task-categories/global", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-categories/global"] });
      setCreateOpen(false);
      resetForm();
      toast({ title: "Task category created" });
    },
    onError: () => {
      toast({ title: "Failed to create task category", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TaskCategory> }) => {
      return apiRequest("PATCH", `/api/task-categories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-categories/global"] });
      setEditOpen(false);
      setEditingCategory(null);
      resetForm();
      toast({ title: "Task category updated" });
    },
    onError: () => {
      toast({ title: "Failed to update task category", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/task-categories/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-categories/global"] });
      toast({ title: "Task category deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete task category", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/task-categories/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-categories/global"] });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setName("");
    setColor(PRESET_COLORS[0]);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim(), color });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !name.trim()) return;
    updateMutation.mutate({ id: editingCategory.id, data: { name: name.trim(), color } });
  };

  const openEditDialog = (cat: TaskCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setColor(cat.color || PRESET_COLORS[0]);
    setEditOpen(true);
  };

  const filteredCategories = useMemo(() => {
    if (!categories) return { active: [], inactive: [] };
    const q = searchQuery.toLowerCase().trim();
    const filtered = q ? categories.filter(c => c.name.toLowerCase().includes(q)) : categories;
    return {
      active: filtered.filter(c => c.isActive),
      inactive: filtered.filter(c => !c.isActive),
    };
  }, [categories, searchQuery]);

  const allFiltered = useMemo(() => [
    ...filteredCategories.active,
    ...filteredCategories.inactive,
  ], [filteredCategories]);

  const totalItems = allFiltered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedItems = allFiltered.slice(startIndex, endIndex);
  const paginatedActive = paginatedItems.filter(c => c.isActive);
  const paginatedInactive = paginatedItems.filter(c => !c.isActive);

  const ColorPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map(c => (
          <button
            key={c}
            type="button"
            className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${value === c ? "border-foreground scale-110" : "border-transparent"}`}
            style={{ backgroundColor: c }}
            onClick={() => onChange(c)}
            data-testid={`color-swatch-${c.replace("#", "")}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full border" style={{ backgroundColor: value }} />
        <Input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-16 h-8 p-0.5 cursor-pointer"
          data-testid="input-color-custom"
        />
        <span className="text-xs text-muted-foreground">Custom color</span>
      </div>
    </div>
  );

  const renderCategoryRow = (cat: TaskCategory, dimmed?: boolean) => (
    <div
      key={cat.id}
      className={`flex items-center justify-between gap-4 py-3 ${dimmed ? "opacity-60" : ""}`}
      data-testid={`category-row-${cat.id}`}
    >
      <div className="flex items-center gap-4">
        <Switch
          checked={cat.isActive}
          onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: cat.id, isActive: checked })}
          data-testid={`switch-active-${cat.id}`}
        />
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full shrink-0"
            style={{ backgroundColor: cat.color || "#94a3b8" }}
            data-testid={`color-dot-${cat.id}`}
          />
          <p className={`font-medium ${dimmed ? "" : "text-foreground"}`}>{cat.name}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          Global
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => openEditDialog(cat)}
          data-testid={`button-edit-${cat.id}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-delete-${cat.id}`}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task Category?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{cat.name}" and remove it from all tasks. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(cat.id)}
                className="bg-destructive text-destructive-foreground"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid gap-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
              Task Categories
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage global task categories that appear across all company boards
            </p>
          </div>

          <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-category">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Task Category</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g., Social Media, SEO, Website"
                    data-testid="input-category-name"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <ColorPicker value={color} onChange={setColor} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || !name.trim()}
                    data-testid="button-submit-category"
                  >
                    {createMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-3 flex-wrap mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search categories..."
              className="pl-9"
              data-testid="input-search-categories"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                data-testid="button-clear-search"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Show</span>
            <Select
              value={String(pageSize)}
              onValueChange={val => { setPageSize(Number(val)); setCurrentPage(1); }}
            >
              <SelectTrigger className="w-[80px]" data-testid="select-page-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground whitespace-nowrap">per page</span>
          </div>
        </div>

        <div className="space-y-6">
          {paginatedActive.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5" />
                  Active Categories
                  <Badge variant="secondary">{filteredCategories.active.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {paginatedActive.map(cat => renderCategoryRow(cat))}
                </div>
              </CardContent>
            </Card>
          )}

          {paginatedInactive.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                  <LayoutGrid className="h-5 w-5" />
                  Inactive Categories
                  <Badge variant="secondary">{filteredCategories.inactive.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {paginatedInactive.map(cat => renderCategoryRow(cat, true))}
                </div>
              </CardContent>
            </Card>
          )}

          {paginatedActive.length === 0 && paginatedInactive.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <LayoutGrid className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">
                  {searchQuery ? `No categories match "${searchQuery}"` : "No global task categories yet"}
                </p>
                {!searchQuery && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Create your first category to organize tasks across all company boards.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 flex-wrap mt-6">
            <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
              Showing {startIndex + 1}–{endIndex} of {totalItems}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage(safeCurrentPage - 1)}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => totalPages <= 7 || page === 1 || page === totalPages || Math.abs(page - safeCurrentPage) <= 1)
                .reduce<(number | string)[]>((acc, page, idx, arr) => {
                  if (idx > 0 && page - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(page);
                  return acc;
                }, [])
                .map((item, idx) =>
                  typeof item === "string" ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">...</span>
                  ) : (
                    <Button
                      key={item}
                      variant={item === safeCurrentPage ? "default" : "outline"}
                      size="icon"
                      onClick={() => setCurrentPage(item)}
                      data-testid={`button-page-${item}`}
                    >
                      {item}
                    </Button>
                  )
                )}
              <Button
                variant="outline"
                size="icon"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage(safeCurrentPage + 1)}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) { setEditingCategory(null); resetForm(); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Task Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Social Media"
                  data-testid="input-edit-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <ColorPicker value={color} onChange={setColor} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending || !name.trim()}
                  data-testid="button-update-category"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
