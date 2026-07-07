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
import { Plus, Pencil, Trash2, Tag, Coins, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { DeliverableType } from "@shared/schema";

export default function AdminDeliverableTypes() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingType, setEditingType] = useState<DeliverableType | null>(null);

  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [credits, setCredits] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: deliverableTypes, isLoading } = useQuery<DeliverableType[]>({
    queryKey: ["/api/deliverable-types"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { key: string; name: string; credits: string }) => {
      return apiRequest("POST", "/api/deliverable-types", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deliverable-types"] });
      setCreateOpen(false);
      resetForm();
      toast({ title: "Deliverable type created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create deliverable type", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DeliverableType> }) => {
      return apiRequest("PATCH", `/api/deliverable-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deliverable-types"] });
      setEditOpen(false);
      setEditingType(null);
      resetForm();
      toast({ title: "Deliverable type updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update deliverable type", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/deliverable-types/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deliverable-types"] });
      toast({ title: "Deliverable type deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete deliverable type", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/deliverable-types/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deliverable-types"] });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setName("");
    setKey("");
    setCredits("");
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !key.trim() || !credits) return;
    createMutation.mutate({
      key: key.toLowerCase().replace(/\s+/g, '_'),
      name,
      credits,
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType || !name.trim() || !credits) return;
    updateMutation.mutate({
      id: editingType.id,
      data: {
        name,
        credits,
      },
    });
  };

  const openEditDialog = (type: DeliverableType) => {
    setEditingType(type);
    setName(type.name);
    setCredits(String(type.credits));
    setEditOpen(true);
  };

  const generateKey = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  };

  const filteredTypes = useMemo(() => {
    if (!deliverableTypes) return { active: [], inactive: [] };
    const q = searchQuery.toLowerCase().trim();
    const filtered = q
      ? deliverableTypes.filter(t =>
          t.name.toLowerCase().includes(q) ||
          t.key.toLowerCase().includes(q) ||
          String(t.credits).includes(q)
        )
      : deliverableTypes;
    return {
      active: filtered.filter(t => t.isActive),
      inactive: filtered.filter(t => !t.isActive),
    };
  }, [deliverableTypes, searchQuery]);

  const allFiltered = useMemo(() => {
    return [...filteredTypes.active, ...filteredTypes.inactive];
  }, [filteredTypes]);

  const totalItems = allFiltered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedItems = allFiltered.slice(startIndex, endIndex);

  const paginatedActive = paginatedItems.filter(t => t.isActive);
  const paginatedInactive = paginatedItems.filter(t => !t.isActive);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const renderDeliverableRow = (type: DeliverableType, dimmed?: boolean) => (
    <div
      key={type.id}
      className={`flex items-center justify-between gap-4 py-3 ${dimmed ? "opacity-60" : ""}`}
      data-testid={`deliverable-row-${type.id}`}
    >
      <div className="flex items-center gap-4">
        <Switch
          checked={type.isActive}
          onCheckedChange={(checked) =>
            toggleActiveMutation.mutate({ id: type.id, isActive: checked })
          }
          data-testid={`switch-active-${type.id}`}
        />
        <div>
          <p className={`font-medium ${dimmed ? "" : "text-foreground"}`}>{type.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{type.key}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="flex items-center gap-1">
          <Coins className="h-3 w-3" />
          {type.credits} credits
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => openEditDialog(type)}
          data-testid={`button-edit-${type.id}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-delete-${type.id}`}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Deliverable Type?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{type.name}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(type.id)}
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

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
              Deliverable Types
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage the types of deliverables and their credit costs
            </p>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-deliverable">
                <Plus className="h-4 w-4 mr-2" />
                Add Deliverable Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Deliverable Type</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setKey(generateKey(e.target.value));
                    }}
                    placeholder="e.g., Social Media Post"
                    data-testid="input-deliverable-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="key">Key (auto-generated)</Label>
                  <Input
                    id="key"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="e.g., social_media_post"
                    data-testid="input-deliverable-key"
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique identifier used internally
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="credits">Credit Cost</Label>
                  <Input
                    id="credits"
                    type="number"
                    step="0.25"
                    min="0"
                    value={credits}
                    onChange={(e) => setCredits(e.target.value)}
                    placeholder="e.g., 2.5"
                    data-testid="input-deliverable-credits"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-deliverable">
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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, key, or credits..."
              className="pl-9"
              data-testid="input-search-deliverables"
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
              onValueChange={(val) => {
                setPageSize(Number(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[80px]" data-testid="select-page-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25" data-testid="select-page-size-25">25</SelectItem>
                <SelectItem value="50" data-testid="select-page-size-50">50</SelectItem>
                <SelectItem value="100" data-testid="select-page-size-100">100</SelectItem>
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
                  <Tag className="h-5 w-5" />
                  Active Deliverable Types
                  <Badge variant="secondary">{filteredTypes.active.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {paginatedActive.map((type) => renderDeliverableRow(type))}
                </div>
              </CardContent>
            </Card>
          )}

          {paginatedInactive.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                  <Tag className="h-5 w-5" />
                  Inactive Deliverable Types
                  <Badge variant="secondary">{filteredTypes.inactive.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {paginatedInactive.map((type) => renderDeliverableRow(type, true))}
                </div>
              </CardContent>
            </Card>
          )}

          {paginatedActive.length === 0 && paginatedInactive.length === 0 && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  {searchQuery
                    ? `No deliverable types match "${searchQuery}"`
                    : "No deliverable types found"}
                </p>
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
                .filter(page => {
                  if (totalPages <= 7) return true;
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - safeCurrentPage) <= 1) return true;
                  return false;
                })
                .reduce<(number | string)[]>((acc, page, idx, arr) => {
                  if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                    acc.push("...");
                  }
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

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Deliverable Type</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Social Media Post"
                  data-testid="input-edit-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-key">Key</Label>
                <Input
                  id="edit-key"
                  value={editingType?.key || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Keys cannot be changed after creation
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-credits">Credit Cost</Label>
                <Input
                  id="edit-credits"
                  type="number"
                  step="0.25"
                  min="0"
                  value={credits}
                  onChange={(e) => setCredits(e.target.value)}
                  placeholder="e.g., 2.5"
                  data-testid="input-edit-credits"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-update-deliverable">
                  {updateMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
