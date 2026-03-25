import { useState, useEffect } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Megaphone, Coins, Package, Minus, X, Search } from "lucide-react";
import type { CampaignType, DeliverableType } from "@shared/schema";

type DeliverableQuantityMap = Record<string, number>;

export default function AdminCampaignTypes() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingType, setEditingType] = useState<CampaignType | null>(null);
  const [createPickerOpen, setCreatePickerOpen] = useState(false);
  const [editPickerOpen, setEditPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<DeliverableQuantityMap>({});

  const { data: campaignTypes, isLoading } = useQuery<CampaignType[]>({
    queryKey: ["/api/campaign-types"],
  });

  const { data: deliverableTypes } = useQuery<DeliverableType[]>({
    queryKey: ["/api/deliverable-types"],
  });

  const activeDeliverables = deliverableTypes?.filter(d => d.isActive) || [];

  const calculateEstimatedCredits = (deliverableIds: string[], qtys: DeliverableQuantityMap): number => {
    if (!deliverableTypes) return 0;
    return deliverableIds.reduce((sum, id) => {
      const deliverable = deliverableTypes.find(d => d.id === id);
      const qty = qtys[id] || 1;
      return sum + (deliverable ? parseFloat(deliverable.credits) * qty : 0);
    }, 0);
  };

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; includedDeliverableIds: string[]; deliverableQuantities: string; estimatedCredits: string }) => {
      return apiRequest("POST", "/api/campaign-types", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaign-types"] });
      setCreateOpen(false);
      resetForm();
      toast({ title: "Campaign type created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create campaign type", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CampaignType> }) => {
      return apiRequest("PATCH", `/api/campaign-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaign-types"] });
      setEditOpen(false);
      setEditingType(null);
      resetForm();
      toast({ title: "Campaign type updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update campaign type", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/campaign-types/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaign-types"] });
      toast({ title: "Campaign type deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete campaign type", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/campaign-types/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaign-types"] });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setSelectedDeliverables([]);
    setQuantities({});
    setCreatePickerOpen(false);
    setEditPickerOpen(false);
  };

  const parseQuantities = (type: CampaignType): DeliverableQuantityMap => {
    if (!type.deliverableQuantities) return {};
    try {
      return JSON.parse(type.deliverableQuantities);
    } catch {
      return {};
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedDeliverables.length === 0) {
      toast({ title: "Please provide a name and add at least one deliverable", variant: "destructive" });
      return;
    }
    const estimatedCredits = calculateEstimatedCredits(selectedDeliverables, quantities);
    createMutation.mutate({
      name,
      description,
      includedDeliverableIds: selectedDeliverables,
      deliverableQuantities: JSON.stringify(quantities),
      estimatedCredits: String(estimatedCredits),
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType || !name.trim() || selectedDeliverables.length === 0) {
      toast({ title: "Please provide a name and add at least one deliverable", variant: "destructive" });
      return;
    }
    const estimatedCredits = calculateEstimatedCredits(selectedDeliverables, quantities);
    updateMutation.mutate({
      id: editingType.id,
      data: {
        name,
        description,
        includedDeliverableIds: selectedDeliverables,
        deliverableQuantities: JSON.stringify(quantities),
        estimatedCredits: String(estimatedCredits),
      },
    });
  };

  const openEditDialog = (type: CampaignType) => {
    setEditingType(type);
    setName(type.name);
    setDescription(type.description || "");
    const ids = type.includedDeliverableIds || [];
    setSelectedDeliverables(ids);
    const parsed = parseQuantities(type);
    const normalized: DeliverableQuantityMap = {};
    for (const id of ids) {
      normalized[id] = parsed[id] || 1;
    }
    setQuantities(normalized);
    setEditOpen(true);
  };

  const addDeliverable = (id: string) => {
    if (!selectedDeliverables.includes(id)) {
      setSelectedDeliverables(prev => [...prev, id]);
      setQuantities(prev => ({ ...prev, [id]: 1 }));
    }
  };

  const removeDeliverable = (id: string) => {
    setSelectedDeliverables(prev => prev.filter(d => d !== id));
    setQuantities(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty < 1) qty = 1;
    if (qty > 999) qty = 999;
    setQuantities(prev => ({ ...prev, [id]: qty }));
  };

  const getDeliverableName = (id: string): string => {
    const deliverable = deliverableTypes?.find(d => d.id === id);
    return deliverable?.name || id;
  };

  const getDeliverableCredits = (id: string): string => {
    const deliverable = deliverableTypes?.find(d => d.id === id);
    return deliverable?.credits || "0";
  };

  const availableToAdd = activeDeliverables.filter(d => !selectedDeliverables.includes(d.id));

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const filterBySearch = (t: CampaignType) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q);
  };
  const activeTypes = campaignTypes?.filter(t => t.isActive && filterBySearch(t)) || [];
  const inactiveTypes = campaignTypes?.filter(t => !t.isActive && filterBySearch(t)) || [];

  const [deliverablePickerSearch, setDeliverablePickerSearch] = useState("");

  const renderDeliverablePickerAndList = (prefix: string, pickerOpen: boolean, setPickerOpen: (v: boolean) => void) => {
    const filteredAvailable = availableToAdd.filter(d =>
      d.name.toLowerCase().includes(deliverablePickerSearch.toLowerCase())
    );

    return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Included Deliverables</Label>
        <Popover open={pickerOpen} onOpenChange={(open) => { setPickerOpen(open); if (!open) setDeliverablePickerSearch(""); }} modal={false}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={availableToAdd.length === 0}
              data-testid={`button-${prefix}-add-deliverable`}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Deliverable
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-3 py-2 border-b">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Search deliverables..."
                value={deliverablePickerSearch}
                onChange={(e) => setDeliverablePickerSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                data-testid={`input-${prefix}-deliverable-search`}
              />
            </div>
            <div className="space-y-1 max-h-72 overflow-y-auto overscroll-contain p-2">
              {filteredAvailable.map((deliverable) => (
                <button
                  key={deliverable.id}
                  type="button"
                  className="w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-left hover-elevate"
                  onClick={() => { addDeliverable(deliverable.id); setPickerOpen(false); setDeliverablePickerSearch(""); }}
                  data-testid={`button-${prefix}-pick-${deliverable.id}`}
                >
                  <span className="truncate">{deliverable.name}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{deliverable.credits} cr</span>
                </button>
              ))}
              {filteredAvailable.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  {availableToAdd.length === 0 ? "All deliverables added" : "No matches found"}
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {selectedDeliverables.length === 0 ? (
        <div className="border border-dashed rounded-md p-4 text-center">
          <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No deliverables added yet. Click "Add Deliverable" to get started.</p>
        </div>
      ) : (
        <div className="border rounded-md divide-y">
          {selectedDeliverables.map((id) => {
            const qty = quantities[id] || 1;
            const creditsPer = parseFloat(getDeliverableCredits(id));
            const totalCredits = creditsPer * qty;
            return (
              <div key={id} className="flex items-center gap-3 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{getDeliverableName(id)}</p>
                  <p className="text-xs text-muted-foreground">{creditsPer} credits each</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => updateQuantity(id, qty - 1)}
                    disabled={qty <= 1}
                    data-testid={`button-${prefix}-qty-minus-${id}`}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    max={999}
                    value={qty}
                    onChange={(e) => updateQuantity(id, parseInt(e.target.value) || 1)}
                    className="w-14 text-center h-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    data-testid={`input-${prefix}-qty-${id}`}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => updateQuantity(id, qty + 1)}
                    data-testid={`button-${prefix}-qty-plus-${id}`}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                <Badge variant="secondary" className="text-xs whitespace-nowrap">
                  {totalCredits.toFixed(1)} cr
                </Badge>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeDeliverable(id)}
                  data-testid={`button-${prefix}-remove-${id}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-muted/50 rounded-md p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Estimated Credits:</span>
          <Badge className="flex items-center gap-1">
            <Coins className="w-3 h-3" />
            {calculateEstimatedCredits(selectedDeliverables, quantities).toFixed(1)} credits
          </Badge>
        </div>
      </div>
    </div>
  );
  };

  const renderCampaignTypeCard = (type: CampaignType, isInactive: boolean) => {
    const qtys = parseQuantities(type);
    return (
      <Card key={type.id} className={isInactive ? "opacity-60" : ""} data-testid={`card-campaign-type-${type.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Megaphone className={`w-5 h-5 ${isInactive ? "text-muted-foreground" : "text-primary"}`} />
                <h3 className={`font-medium ${isInactive ? "text-muted-foreground" : "text-foreground"}`}>{type.name}</h3>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  {type.estimatedCredits} credits
                </Badge>
              </div>
              {type.description && (
                <p className="text-sm text-muted-foreground mb-3">{type.description}</p>
              )}
              <div className="flex flex-wrap gap-1">
                {type.includedDeliverableIds?.map((id) => {
                  const qty = qtys[id] || 1;
                  return (
                    <Badge key={id} variant="outline" className="text-xs" data-testid={`badge-deliverable-${type.id}-${id}`}>
                      {getDeliverableName(id)}{qty > 1 ? ` x${qty}` : ""}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={type.isActive}
                onCheckedChange={(checked) =>
                  toggleActiveMutation.mutate({ id: type.id, isActive: checked })
                }
                data-testid={`switch-active-${type.id}`}
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => openEditDialog(type)}
                data-testid={`button-edit-${type.id}`}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    data-testid={`button-delete-${type.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Campaign Type</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{type.name}"? This action cannot be undone.
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
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
              Campaign Types
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Define campaign templates that clients can request
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-create-campaign-type">
            <Plus className="w-4 h-4 mr-2" />
            Add Campaign Type
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaign types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-campaign-types"
          />
        </div>

        {activeTypes.length === 0 && inactiveTypes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Megaphone className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No campaign types defined yet. Create your first campaign type to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {activeTypes.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-medium text-foreground">Active Campaign Types</h2>
                <div className="grid gap-4">
                  {activeTypes.map((type) => renderCampaignTypeCard(type, false))}
                </div>
              </div>
            )}

            {inactiveTypes.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-medium text-muted-foreground">Inactive Campaign Types</h2>
                <div className="grid gap-4">
                  {inactiveTypes.map((type) => renderCampaignTypeCard(type, true))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Campaign Type</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Social Media Blitz"
                  data-testid="input-campaign-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this campaign includes..."
                  rows={3}
                  data-testid="input-campaign-description"
                />
              </div>

              {renderDeliverablePickerAndList("create", createPickerOpen, setCreatePickerOpen)}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create">
                  {createMutation.isPending ? "Creating..." : "Create Campaign Type"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) { setEditingType(null); resetForm(); } }}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Campaign Type</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Campaign Name</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Social Media Blitz"
                  data-testid="input-edit-campaign-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this campaign includes..."
                  rows={3}
                  data-testid="input-edit-campaign-description"
                />
              </div>

              {renderDeliverablePickerAndList("edit", editPickerOpen, setEditPickerOpen)}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit">
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
