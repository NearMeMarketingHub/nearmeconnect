import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, Plus, Pencil, Trash2, DollarSign, Package, Tag, CreditCard, AlertTriangle } from "lucide-react";
import type { CreditPackage, CreditSale, CreditStoreSettings } from "@shared/schema";

export default function AdminCreditStore() {
  const { toast } = useToast();
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CreditPackage | null>(null);
  const [editingSale, setEditingSale] = useState<CreditSale | null>(null);

  const { data: settings, isLoading: settingsLoading } = useQuery<CreditStoreSettings>({
    queryKey: ["/api/credit-store/settings"],
  });

  const { data: packages = [], isLoading: packagesLoading } = useQuery<CreditPackage[]>({
    queryKey: ["/api/credit-store/packages"],
  });

  const { data: sales = [], isLoading: salesLoading } = useQuery<CreditSale[]>({
    queryKey: ["/api/credit-store/sales"],
  });

  const { data: stripeStatus } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/credit-store/stripe-status"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<CreditStoreSettings>) => {
      return apiRequest("PUT", "/api/credit-store/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credit-store/settings"] });
      toast({ title: "Settings updated" });
    },
    onError: () => toast({ title: "Failed to update settings", variant: "destructive" }),
  });

  const createPackageMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/credit-store/packages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credit-store/packages"] });
      setShowPackageDialog(false);
      setEditingPackage(null);
      toast({ title: "Package created" });
    },
    onError: () => toast({ title: "Failed to create package", variant: "destructive" }),
  });

  const updatePackageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PUT", `/api/credit-store/packages/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credit-store/packages"] });
      setShowPackageDialog(false);
      setEditingPackage(null);
      toast({ title: "Package updated" });
    },
    onError: () => toast({ title: "Failed to update package", variant: "destructive" }),
  });

  const deletePackageMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/credit-store/packages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credit-store/packages"] });
      toast({ title: "Package deleted" });
    },
    onError: () => toast({ title: "Failed to delete package", variant: "destructive" }),
  });

  const createSaleMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/credit-store/sales", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credit-store/sales"] });
      setShowSaleDialog(false);
      setEditingSale(null);
      toast({ title: "Sale created" });
    },
    onError: () => toast({ title: "Failed to create sale", variant: "destructive" }),
  });

  const updateSaleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PUT", `/api/credit-store/sales/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credit-store/sales"] });
      setShowSaleDialog(false);
      setEditingSale(null);
      toast({ title: "Sale updated" });
    },
    onError: () => toast({ title: "Failed to update sale", variant: "destructive" }),
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/credit-store/sales/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credit-store/sales"] });
      toast({ title: "Sale deleted" });
    },
    onError: () => toast({ title: "Failed to delete sale", variant: "destructive" }),
  });

  const handlePackageSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      description: formData.get("description"),
      creditAmount: parseInt(formData.get("creditAmount") as string),
      price: formData.get("price"),
      isActive: formData.get("isActive") === "on",
      sortOrder: parseInt(formData.get("sortOrder") as string) || 0,
    };

    if (editingPackage) {
      updatePackageMutation.mutate({ id: editingPackage.id, data });
    } else {
      createPackageMutation.mutate(data);
    }
  };

  const handleSaleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      description: formData.get("description"),
      discountPercentage: formData.get("discountPercentage"),
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
      appliesTo: formData.get("appliesTo") || "all",
      isActive: formData.get("isActive") === "on",
    };

    if (editingSale) {
      updateSaleMutation.mutate({ id: editingSale.id, data });
    } else {
      createSaleMutation.mutate(data);
    }
  };

  if (settingsLoading || packagesLoading || salesLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Credit Store Settings</h1>
            <p className="text-muted-foreground">Manage credit pricing, packages, and sales</p>
          </div>
        </div>

        {!stripeStatus?.configured && (
          <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="flex items-center gap-3 pt-4">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">Stripe Not Configured</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Add STRIPE_SECRET_KEY to secrets to enable payments. Clients can view packages but cannot purchase.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Pricing Settings
              </CardTitle>
              <CardDescription>Set the base price per credit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price Per Credit ($)</Label>
                <Input
                  id="basePrice"
                  type="number"
                  step="0.01"
                  defaultValue={settings?.basePricePerCredit || "125.00"}
                  data-testid="input-base-price"
                  onBlur={(e) => {
                    updateSettingsMutation.mutate({ basePricePerCredit: e.target.value });
                  }}
                />
              </div>
                          </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Status
              </CardTitle>
              <CardDescription>Stripe integration status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant={stripeStatus?.configured ? "default" : "secondary"}>
                  {stripeStatus?.configured ? "Connected" : "Not Configured"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {stripeStatus?.configured 
                    ? "Payments are enabled" 
                    : "Add STRIPE_SECRET_KEY to enable"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Credit Packages
              </CardTitle>
              <CardDescription>Bundled credit options for clients</CardDescription>
            </div>
            <Dialog open={showPackageDialog} onOpenChange={(open) => {
              setShowPackageDialog(open);
              if (!open) setEditingPackage(null);
            }}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-package">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Package
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handlePackageSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingPackage ? "Edit Package" : "Create Package"}</DialogTitle>
                    <DialogDescription>
                      Define a credit bundle for purchase
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" name="name" defaultValue={editingPackage?.name} required data-testid="input-package-name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" name="description" defaultValue={editingPackage?.description || ""} data-testid="input-package-description" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="creditAmount">Credits</Label>
                        <Input id="creditAmount" name="creditAmount" type="number" defaultValue={editingPackage?.creditAmount} required data-testid="input-package-credits" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price">Price ($)</Label>
                        <Input id="price" name="price" type="number" step="0.01" defaultValue={editingPackage?.price} required data-testid="input-package-price" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sortOrder">Sort Order</Label>
                      <Input id="sortOrder" name="sortOrder" type="number" defaultValue={editingPackage?.sortOrder || 0} data-testid="input-package-sort" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch id="isActive" name="isActive" defaultChecked={editingPackage?.isActive ?? true} data-testid="switch-package-active" />
                      <Label htmlFor="isActive">Active</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createPackageMutation.isPending || updatePackageMutation.isPending} data-testid="button-save-package">
                      {(createPackageMutation.isPending || updatePackageMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save Package
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {packages.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No packages created yet</p>
            ) : (
              <div className="space-y-3">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`package-${pkg.id}`}>
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{pkg.name}</span>
                          {!pkg.isActive && <Badge variant="secondary">Inactive</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {pkg.creditAmount} credits for ${pkg.price}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingPackage(pkg);
                          setShowPackageDialog(true);
                        }}
                        data-testid={`button-edit-package-${pkg.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePackageMutation.mutate(pkg.id)}
                        data-testid={`button-delete-package-${pkg.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Active Sales
              </CardTitle>
              <CardDescription>Time-limited promotions and discounts</CardDescription>
            </div>
            <Dialog open={showSaleDialog} onOpenChange={(open) => {
              setShowSaleDialog(open);
              if (!open) setEditingSale(null);
            }}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-sale">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Sale
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSaleSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingSale ? "Edit Sale" : "Create Sale"}</DialogTitle>
                    <DialogDescription>
                      Create a time-limited discount promotion
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="saleName">Name</Label>
                      <Input id="saleName" name="name" defaultValue={editingSale?.name} required data-testid="input-sale-name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="saleDescription">Description</Label>
                      <Textarea id="saleDescription" name="description" defaultValue={editingSale?.description || ""} data-testid="input-sale-description" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="saleDiscount">Discount %</Label>
                      <Input id="saleDiscount" name="discountPercentage" type="number" step="0.01" defaultValue={editingSale?.discountPercentage} required data-testid="input-sale-discount" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input id="startDate" name="startDate" type="datetime-local" defaultValue={editingSale?.startDate?.slice(0, 16)} required data-testid="input-sale-start" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate">End Date</Label>
                        <Input id="endDate" name="endDate" type="datetime-local" defaultValue={editingSale?.endDate?.slice(0, 16)} required data-testid="input-sale-end" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="appliesTo">Applies To</Label>
                      <Input id="appliesTo" name="appliesTo" defaultValue={editingSale?.appliesTo || "all"} placeholder="all or comma-separated package IDs" data-testid="input-sale-applies" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch id="saleActive" name="isActive" defaultChecked={editingSale?.isActive ?? true} data-testid="switch-sale-active" />
                      <Label htmlFor="saleActive">Active</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createSaleMutation.isPending || updateSaleMutation.isPending} data-testid="button-save-sale">
                      {(createSaleMutation.isPending || updateSaleMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save Sale
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {sales.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No sales created yet</p>
            ) : (
              <div className="space-y-3">
                {sales.map((sale) => {
                  const now = new Date();
                  const start = new Date(sale.startDate);
                  const end = new Date(sale.endDate);
                  const isActive = sale.isActive && now >= start && now <= end;
                  
                  return (
                    <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`sale-${sale.id}`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{sale.name}</span>
                          <Badge variant={isActive ? "default" : "secondary"}>
                            {isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline" className="text-green-600">
                            {sale.discountPercentage}% off
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(sale.startDate).toLocaleDateString()} - {new Date(sale.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingSale(sale);
                            setShowSaleDialog(true);
                          }}
                          data-testid={`button-edit-sale-${sale.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSaleMutation.mutate(sale.id)}
                          data-testid={`button-delete-sale-${sale.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
