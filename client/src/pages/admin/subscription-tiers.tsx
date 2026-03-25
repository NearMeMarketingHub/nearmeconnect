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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, CreditCard, Coins, DollarSign, Star, GripVertical } from "lucide-react";
import type { SubscriptionTierDefinition } from "@shared/schema";

export default function AdminSubscriptionTiers() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<SubscriptionTierDefinition | null>(null);

  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [monthlyCredits, setMonthlyCredits] = useState("");
  const [features, setFeatures] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const { data: tiers, isLoading } = useQuery<SubscriptionTierDefinition[]>({
    queryKey: ["/api/admin/subscription-tiers"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/admin/subscription-tiers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-tiers"] });
      setCreateOpen(false);
      resetForm();
      toast({ title: "Subscription tier created successfully" });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Failed to create subscription tier", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SubscriptionTierDefinition> }) => {
      return apiRequest("PATCH", `/api/admin/subscription-tiers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-tiers"] });
      setEditOpen(false);
      setEditingTier(null);
      resetForm();
      toast({ title: "Subscription tier updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update subscription tier", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setName("");
    setKey("");
    setMonthlyPrice("");
    setMonthlyCredits("");
    setFeatures("");
    setSortOrder("0");
  };

  const openEdit = (tier: SubscriptionTierDefinition) => {
    setEditingTier(tier);
    setName(tier.name);
    setKey(tier.key);
    setMonthlyPrice(String(Math.round(tier.monthlyPrice / 100)));
    setMonthlyCredits(String(tier.monthlyCredits));
    setFeatures((tier.features || []).join("\n"));
    setSortOrder(String(tier.sortOrder));
    setEditOpen(true);
  };

  const handleCreate = () => {
    if (!name.trim() || !key.trim()) {
      toast({ title: "Name and key are required", variant: "destructive" });
      return;
    }
    const featuresArray = features.split("\n").map(f => f.trim()).filter(Boolean);
    createMutation.mutate({
      key: key.trim().toLowerCase().replace(/\s+/g, "_"),
      name: name.trim(),
      monthlyPrice: (parseInt(monthlyPrice) || 0) * 100,
      monthlyCredits: parseInt(monthlyCredits) || 0,
      features: featuresArray,
      sortOrder: parseInt(sortOrder) || 0,
      isActive: true,
    });
  };

  const handleUpdate = () => {
    if (!editingTier) return;
    const featuresArray = features.split("\n").map(f => f.trim()).filter(Boolean);
    updateMutation.mutate({
      id: editingTier.id,
      data: {
        name: name.trim(),
        monthlyPrice: (parseInt(monthlyPrice) || 0) * 100,
        monthlyCredits: parseInt(monthlyCredits) || 0,
        features: featuresArray,
        sortOrder: parseInt(sortOrder) || 0,
      },
    });
  };

  const handleToggleActive = (tier: SubscriptionTierDefinition) => {
    updateMutation.mutate({
      id: tier.id,
      data: { isActive: !tier.isActive },
    });
  };

  const formatPrice = (cents: number) => {
    const dollars = Math.round(cents / 100);
    return `$${dollars.toLocaleString("en-US")}`;
  };

  const sortedTiers = tiers ? [...tiers].sort((a, b) => a.monthlyPrice - b.monthlyPrice) : [];

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Subscription Tiers</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage subscription tier definitions, pricing, and included features
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-tier">
                <Plus className="w-4 h-4 mr-2" />
                New Tier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Subscription Tier</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Tier Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Premium"
                    data-testid="input-tier-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Key <span className="text-destructive">*</span></Label>
                  <Input
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="e.g., premium (lowercase, no spaces)"
                    data-testid="input-tier-key"
                  />
                  <p className="text-xs text-muted-foreground">Unique identifier used internally. Cannot be changed after creation.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Monthly Price ($)</Label>
                    <Input
                      type="number"
                      value={monthlyPrice}
                      onChange={(e) => setMonthlyPrice(e.target.value)}
                      placeholder="e.g., 2500"
                      data-testid="input-tier-price"
                    />
                    <p className="text-xs text-muted-foreground">Whole dollars (e.g., 2500 = $2,500)</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly Credits</Label>
                    <Input
                      type="number"
                      value={monthlyCredits}
                      onChange={(e) => setMonthlyCredits(e.target.value)}
                      placeholder="e.g., 20"
                      data-testid="input-tier-credits"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Features (one per line)</Label>
                  <Textarea
                    value={features}
                    onChange={(e) => setFeatures(e.target.value)}
                    placeholder="Basic marketing support&#10;Monthly reporting&#10;Email campaigns"
                    rows={5}
                    data-testid="input-tier-features"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-save-tier">
                  {createMutation.isPending ? "Creating..." : "Create Tier"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : !tiers || tiers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No subscription tiers defined yet</p>
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Tier
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedTiers.map((tier) => (
              <Card
                key={tier.id}
                className={`relative ${!tier.isActive ? "opacity-60" : ""}`}
                data-testid={`card-tier-${tier.key}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <CardTitle className="text-lg">{tier.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {!tier.isActive && (
                        <Badge variant="secondary" data-testid={`badge-inactive-${tier.key}`}>Inactive</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(tier)}
                        data-testid={`button-edit-tier-${tier.key}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <Badge variant="outline" className="w-fit text-xs">{tier.key}</Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="text-xl font-bold" data-testid={`text-tier-price-${tier.key}`}>
                        {formatPrice(tier.monthlyPrice)}
                      </span>
                      <span className="text-sm text-muted-foreground">/mo</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-orange-500" />
                    <span className="font-medium" data-testid={`text-tier-credits-${tier.key}`}>
                      {tier.monthlyCredits} credits/mo
                    </span>
                  </div>
                  {tier.features && tier.features.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t">
                      {tier.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <Star className="w-3.5 h-3.5 mt-0.5 text-orange-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="pt-2 border-t flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active</span>
                    <Switch
                      checked={tier.isActive}
                      onCheckedChange={() => handleToggleActive(tier)}
                      data-testid={`switch-tier-active-${tier.key}`}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) { setEditingTier(null); resetForm(); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Subscription Tier</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Tier Name <span className="text-destructive">*</span></Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Premium"
                  data-testid="input-edit-tier-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Key</Label>
                <Input
                  value={key}
                  disabled
                  className="bg-muted"
                  data-testid="input-edit-tier-key"
                />
                <p className="text-xs text-muted-foreground">Key cannot be changed after creation.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monthly Price ($)</Label>
                  <Input
                    type="number"
                    value={monthlyPrice}
                    onChange={(e) => setMonthlyPrice(e.target.value)}
                    placeholder="e.g., 2500"
                    data-testid="input-edit-tier-price"
                  />
                  <p className="text-xs text-muted-foreground">
                    Displays as: ${(parseInt(monthlyPrice) || 0).toLocaleString("en-US")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Monthly Credits</Label>
                  <Input
                    type="number"
                    value={monthlyCredits}
                    onChange={(e) => setMonthlyCredits(e.target.value)}
                    placeholder="e.g., 20"
                    data-testid="input-edit-tier-credits"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Features (one per line)</Label>
                <Textarea
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                  rows={5}
                  data-testid="input-edit-tier-features"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditOpen(false); setEditingTier(null); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending} data-testid="button-update-tier">
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
