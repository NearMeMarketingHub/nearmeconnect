import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import type { CustomRole } from "@shared/schema";

const ALL_VIEWS = [
  { key: "dashboard", label: "Dashboard", description: "Company overview and stats" },
  { key: "tasks", label: "Tasks", description: "View and request tasks" },
  { key: "campaigns", label: "Campaigns", description: "Campaign requests" },
  { key: "meetings", label: "Meetings", description: "Schedule and view meetings" },
  { key: "training", label: "Training", description: "Training modules and assignments" },
  { key: "calendar", label: "Calendar", description: "Calendar view of events" },
  { key: "chat", label: "Chat", description: "Messaging system" },
  { key: "credits", label: "Credits", description: "Credit balance and purchases" },
  { key: "media_uploads", label: "Media Uploads", description: "Upload media files" },
  { key: "settings", label: "Settings", description: "Account and company settings" },
  { key: "government", label: "Government", description: "Government documents and e-signatures" },
];

export default function AdminCustomRoles() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allowedViews, setAllowedViews] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  const { data: roles, isLoading } = useQuery<CustomRole[]>({
    queryKey: ["/api/admin/custom-roles"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; allowedViews: string[]; isActive: boolean }) => {
      return apiRequest("POST", "/api/admin/custom-roles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/custom-roles"] });
      closeDialog();
      toast({ title: "Custom role created" });
    },
    onError: () => {
      toast({ title: "Failed to create role", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CustomRole> }) => {
      return apiRequest("PATCH", `/api/admin/custom-roles/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/custom-roles"] });
      closeDialog();
      toast({ title: "Custom role updated" });
    },
    onError: () => {
      toast({ title: "Failed to update role", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/custom-roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/custom-roles"] });
      toast({ title: "Custom role deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete role", variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRole(null);
    setName("");
    setDescription("");
    setAllowedViews([]);
    setIsActive(true);
  };

  const openCreate = () => {
    setEditingRole(null);
    setName("");
    setDescription("");
    setAllowedViews([]);
    setIsActive(true);
    setDialogOpen(true);
  };

  const openEdit = (role: CustomRole) => {
    setEditingRole(role);
    setName(role.name);
    setDescription(role.description || "");
    setAllowedViews(role.allowedViews || []);
    setIsActive(role.isActive);
    setDialogOpen(true);
  };

  const toggleView = (viewKey: string) => {
    setAllowedViews(prev =>
      prev.includes(viewKey)
        ? prev.filter(v => v !== viewKey)
        : [...prev, viewKey]
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: "Role name is required", variant: "destructive" });
      return;
    }

    const data = { name: name.trim(), description: description.trim(), allowedViews, isActive };

    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">Custom Roles</h1>
            <p className="text-muted-foreground">
              Define custom roles with specific page access for external users or special company members.
            </p>
          </div>
          <Button onClick={openCreate} data-testid="button-create-role">
            <Plus className="w-4 h-4 mr-2" />
            Create Role
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : !roles || roles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">No custom roles yet</p>
              <p className="text-sm text-muted-foreground">
                Create custom roles to define limited access for external users or specialized team members.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {roles.map((role) => (
              <Card key={role.id} data-testid={`role-card-${role.id}`}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium">{role.name}</h3>
                        {!role.isActive && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      {role.description && (
                        <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                        {role.allowedViews && role.allowedViews.length > 0 ? (
                          role.allowedViews.map((view) => {
                            const viewInfo = ALL_VIEWS.find(v => v.key === view);
                            return (
                              <Badge key={view} variant="outline" className="text-xs">
                                <Eye className="w-3 h-3 mr-1" />
                                {viewInfo?.label || view}
                              </Badge>
                            );
                          })
                        ) : (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <EyeOff className="w-3 h-3" />
                            No views assigned
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(role)}
                        data-testid={`button-edit-role-${role.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            data-testid={`button-delete-role-${role.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Custom Role</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the "{role.name}" role? Users currently assigned this role will lose their custom permissions.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(role.id)}
                              data-testid="button-confirm-delete-role"
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
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingRole ? "Edit Custom Role" : "Create Custom Role"}</DialogTitle>
              <DialogDescription>
                Define which pages this role can access. Users with this role will only see the selected pages.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role-name">Role Name</Label>
                <Input
                  id="role-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., External Contributor"
                  data-testid="input-role-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role-description">Description (optional)</Label>
                <Textarea
                  id="role-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this role is for..."
                  data-testid="input-role-description"
                />
              </div>
              <div className="space-y-2">
                <Label>Allowed Pages</Label>
                <p className="text-xs text-muted-foreground">Select which pages users with this role can access.</p>
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-3">
                  {ALL_VIEWS.map((view) => (
                    <label
                      key={view.key}
                      className="flex items-start gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                      data-testid={`checkbox-view-${view.key}`}
                    >
                      <Checkbox
                        checked={allowedViews.includes(view.key)}
                        onCheckedChange={() => toggleView(view.key)}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{view.label}</span>
                        <p className="text-xs text-muted-foreground">{view.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  data-testid="switch-role-active"
                />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isPending || !name.trim()}
                data-testid="button-save-role"
              >
                {isPending ? "Saving..." : editingRole ? "Update Role" : "Create Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
