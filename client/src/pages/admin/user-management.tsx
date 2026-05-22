import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { CustomRole } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, UserPlus, Trash2, Building2, Users, Mail, Clock, KeyRound, Pencil } from "lucide-react";

interface AdminUserWithDetails {
  id: string;
  userId: string;
  createdAt: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface MemberWithDetails {
  id: string;
  companyId: string;
  userId: string;
  role: string;
  customRoleId: string | null;
  createdAt: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface CompanyWithMembers {
  id: string;
  name: string;
  clientType: string;
  subscriptionTier: string;
  members: MemberWithDetails[];
}

interface AdminInvitation {
  id: string;
  email: string;
  invitedBy: string;
  expiresAt: string;
  usedAt: string | null;
  usedBy: string | null;
  createdAt: string;
}

interface UsersData {
  admins: AdminUserWithDetails[];
  companies: CompanyWithMembers[];
  adminInvitations: AdminInvitation[];
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  company_owner: "Owner",
  company_admin: "Company Admin",
  team_member: "Team Member",
  custom: "Custom Role",
};

const BASE_ROLES = [
  { value: "company_owner", label: "Owner" },
  { value: "company_admin", label: "Company Admin" },
  { value: "team_member", label: "Team Member" },
];

export default function UserManagement() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [deleteUserTarget, setDeleteUserTarget] = useState<{ userId: string; name: string } | null>(null);
  const [editNameTarget, setEditNameTarget] = useState<AdminUserWithDetails | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editMemberNameTarget, setEditMemberNameTarget] = useState<MemberWithDetails | null>(null);
  const [editMemberFirstName, setEditMemberFirstName] = useState("");
  const [editMemberLastName, setEditMemberLastName] = useState("");
  const { toast } = useToast();

  const { data, isLoading } = useQuery<UsersData>({
    queryKey: ["/api/admin/users"],
  });

  const { data: customRoles } = useQuery<CustomRole[]>({
    queryKey: ["/api/admin/custom-roles"],
  });

  const activeCustomRoles = customRoles?.filter(r => r.isActive) || [];

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/admin/invite-admin", { email });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Invitation sent", description: data.message });
      setInviteEmail("");
      setInviteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to invite", description: err.message, variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/revoke-admin/${targetUserId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Admin access revoked" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to revoke", description: err.message, variant: "destructive" });
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ memberId, role, customRoleId }: { memberId: string; role: string; customRoleId?: string | null }) => {
      const res = await apiRequest("PATCH", `/api/admin/members/${memberId}/role`, { role, customRoleId });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Role updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update role", description: err.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User deleted", description: "The user and all associated data have been removed." });
      setDeleteUserTarget(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete user", description: err.message, variant: "destructive" });
    },
  });

  const passwordResetMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/admin/send-password-reset", { email });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password reset email sent", description: "The user will receive a link to reset their password." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send reset email", description: err.message, variant: "destructive" });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/invitations/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Invitation cancelled" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to cancel invitation", description: err.message, variant: "destructive" });
    },
  });

  const editNameMutation = useMutation({
    mutationFn: async ({ userId, firstName, lastName }: { userId: string; firstName: string; lastName: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/name`, { firstName, lastName });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Name updated" });
      setEditNameTarget(null);
      setEditMemberNameTarget(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update name", description: err.message, variant: "destructive" });
    },
  });

  const getInitials = (firstName: string | null, lastName: string | null, email: string) => {
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
    if (firstName) return firstName[0].toUpperCase();
    return email[0].toUpperCase();
  };

  const getDisplayName = (firstName: string | null, lastName: string | null, email: string) => {
    if (firstName || lastName) return `${firstName || ""} ${lastName || ""}`.trim();
    return email;
  };

  const openEditName = (admin: AdminUserWithDetails) => {
    setEditNameTarget(admin);
    setEditFirstName(admin.firstName || "");
    setEditLastName(admin.lastName || "");
  };

  const openEditMemberName = (member: MemberWithDetails) => {
    setEditMemberNameTarget(member);
    setEditMemberFirstName(member.firstName || "");
    setEditMemberLastName(member.lastName || "");
  };

  const filteredCompanies = companyFilter === "all"
    ? data?.companies || []
    : (data?.companies || []).filter(c => c.id === companyFilter);

  const pendingInvitations = data?.adminInvitations?.filter(
    inv => !inv.usedAt && new Date(inv.expiresAt) > new Date()
  ) || [];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">User Management</h1>
            <p className="text-muted-foreground">
              Manage agency admins and view all users in the system.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Agency Admins</CardTitle>
              <Badge variant="secondary" className="ml-1" data-testid="badge-admin-count">
                {data?.admins?.length || 0}
              </Badge>
            </div>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-invite-admin">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Admin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Agency Admin</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="admin@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      data-testid="input-invite-email"
                    />
                    <p className="text-xs text-muted-foreground">
                      If this person already has an account, they'll be granted admin access immediately. Otherwise, they'll receive an invite to register.
                    </p>
                  </div>
                  <Button
                    onClick={() => inviteMutation.mutate(inviteEmail)}
                    disabled={!inviteEmail || inviteMutation.isPending}
                    className="w-full"
                    data-testid="button-send-invite"
                  >
                    {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-3">
            {(!data?.admins || data.admins.length === 0) ? (
              <p className="text-muted-foreground text-sm">No agency admins found.</p>
            ) : (
              data.admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-md border"
                  data-testid={`admin-row-${admin.userId}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{getInitials(admin.firstName, admin.lastName, admin.email)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium" data-testid={`text-admin-name-${admin.userId}`}>
                        {getDisplayName(admin.firstName, admin.lastName, admin.email)}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid={`text-admin-email-${admin.userId}`}>
                        {admin.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Admin</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Edit name"
                      onClick={() => openEditName(admin)}
                      data-testid={`button-edit-name-${admin.userId}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Send password reset email"
                      onClick={() => admin.email && passwordResetMutation.mutate(admin.email)}
                      disabled={passwordResetMutation.isPending || !admin.email}
                      data-testid={`button-reset-password-admin-${admin.userId}`}
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`button-revoke-admin-${admin.userId}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke Admin Access</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove admin access for {getDisplayName(admin.firstName, admin.lastName, admin.email)}? They will no longer be able to access admin features.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-revoke">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => revokeMutation.mutate(admin.userId)}
                            data-testid="button-confirm-revoke"
                          >
                            Revoke Access
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))
            )}

            {pendingInvitations.length > 0 && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending Invitations
                </p>
                {pendingInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-md border border-dashed"
                    data-testid={`invite-row-${inv.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          <Mail className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium" data-testid={`text-invite-email-${inv.id}`}>{inv.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Expires {new Date(inv.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Pending</Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" data-testid={`button-cancel-invite-${inv.id}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will cancel the pending invitation for {inv.email}. They will no longer be able to use this invite link.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => cancelInvitationMutation.mutate(inv.id)}
                              data-testid={`button-confirm-cancel-invite-${inv.id}`}
                            >
                              Cancel Invitation
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Users by Company</CardTitle>
              <Badge variant="secondary" className="ml-1" data-testid="badge-company-count">
                {filteredCompanies.length}
              </Badge>
            </div>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-48" data-testid="select-company-filter">
                <SelectValue placeholder="Filter by company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {(data?.companies || []).map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-6">
            {filteredCompanies.length === 0 ? (
              <p className="text-muted-foreground text-sm">No companies found.</p>
            ) : (
              filteredCompanies.map((company) => (
                <div key={company.id} className="space-y-3" data-testid={`company-section-${company.id}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium" data-testid={`text-company-name-${company.id}`}>{company.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {company.clientType === "government" ? "Government" : "Marketing"}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {company.subscriptionTier}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {company.members.length} {company.members.length === 1 ? "member" : "members"}
                    </Badge>
                  </div>
                  {company.members.length === 0 ? (
                    <p className="text-sm text-muted-foreground ml-6">No members yet.</p>
                  ) : (
                    <div className="ml-6 space-y-2">
                      {company.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between gap-4 p-2 rounded-md border"
                          data-testid={`member-row-${member.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {getInitials(member.firstName, member.lastName, member.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium" data-testid={`text-member-name-${member.id}`}>
                                {getDisplayName(member.firstName, member.lastName, member.email)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {member.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={member.role === "custom" && member.customRoleId ? `custom:${member.customRoleId}` : (member.role === "owner" ? "company_owner" : member.role)}
                              onValueChange={(newValue) => {
                                if (newValue.startsWith("custom:")) {
                                  const customRoleId = newValue.replace("custom:", "");
                                  roleMutation.mutate({ memberId: member.id, role: "custom", customRoleId });
                                } else {
                                  roleMutation.mutate({ memberId: member.id, role: newValue, customRoleId: null });
                                }
                              }}
                            >
                              <SelectTrigger className="w-44" data-testid={`select-role-${member.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {BASE_ROLES.map((r) => (
                                  <SelectItem key={r.value} value={r.value}>
                                    {r.label}
                                  </SelectItem>
                                ))}
                                {activeCustomRoles.length > 0 && (
                                  <>
                                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t mt-1 pt-1">
                                      Custom Roles
                                    </div>
                                    {activeCustomRoles.map((cr) => (
                                      <SelectItem key={cr.id} value={`custom:${cr.id}`}>
                                        {cr.name}
                                      </SelectItem>
                                    ))}
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit name"
                              onClick={() => openEditMemberName(member)}
                              data-testid={`button-edit-name-member-${member.userId}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Send password reset email"
                              onClick={() => member.email && passwordResetMutation.mutate(member.email)}
                              disabled={passwordResetMutation.isPending || !member.email}
                              data-testid={`button-reset-password-${member.userId}`}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteUserTarget({
                                userId: member.userId,
                                name: getDisplayName(member.firstName, member.lastName, member.email),
                              })}
                              data-testid={`button-delete-user-${member.userId}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Admin Name Dialog */}
      <Dialog open={!!editNameTarget} onOpenChange={(open) => !open && setEditNameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Admin Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-first-name">First Name</Label>
              <Input
                id="edit-first-name"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                placeholder="First name"
                data-testid="input-edit-first-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-last-name">Last Name</Label>
              <Input
                id="edit-last-name"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                placeholder="Last name"
                data-testid="input-edit-last-name"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditNameTarget(null)} data-testid="button-cancel-edit-name">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (editNameTarget) {
                    editNameMutation.mutate({
                      userId: editNameTarget.userId,
                      firstName: editFirstName.trim(),
                      lastName: editLastName.trim(),
                    });
                  }
                }}
                disabled={!editFirstName.trim() || !editLastName.trim() || editNameMutation.isPending}
                data-testid="button-save-edit-name"
              >
                {editNameMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Member Name Dialog */}
      <Dialog open={!!editMemberNameTarget} onOpenChange={(open) => !open && setEditMemberNameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-member-first-name">First Name</Label>
              <Input
                id="edit-member-first-name"
                value={editMemberFirstName}
                onChange={(e) => setEditMemberFirstName(e.target.value)}
                placeholder="First name"
                data-testid="input-edit-member-first-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-member-last-name">Last Name</Label>
              <Input
                id="edit-member-last-name"
                value={editMemberLastName}
                onChange={(e) => setEditMemberLastName(e.target.value)}
                placeholder="Last name"
                data-testid="input-edit-member-last-name"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditMemberNameTarget(null)} data-testid="button-cancel-edit-member-name">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (editMemberNameTarget) {
                    editNameMutation.mutate({
                      userId: editMemberNameTarget.userId,
                      firstName: editMemberFirstName.trim(),
                      lastName: editMemberLastName.trim(),
                    });
                  }
                }}
                disabled={!editMemberFirstName.trim() || !editMemberLastName.trim() || editNameMutation.isPending}
                data-testid="button-save-edit-member-name"
              >
                {editNameMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteUserTarget} onOpenChange={(open) => !open && setDeleteUserTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{deleteUserTarget?.name}</strong>? This will remove their account, all company memberships, and notification preferences. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-user">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserTarget && deleteUserMutation.mutate(deleteUserTarget.userId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUserMutation.isPending}
              data-testid="button-confirm-delete-user"
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
