import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ClientLayout } from "@/components/client-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Mail, Shield, UserPlus, Clock, X, Copy, Check } from "lucide-react";

interface TeamProps {
  companyId: string;
}

interface TeamMember {
  id: string;
  userId: string;
  companyId: string;
  role: string;
  customRoleId: string | null;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

interface Invitation {
  id: string;
  companyId: string;
  email: string | null;
  token: string;
  role: string;
  expiresAt: string;
  usedAt: string | null;
  usedBy: string | null;
  createdBy: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  company_owner: "Company Owner",
  company_admin: "Company Admin",
  team_member: "Team Member",
  custom: "Custom Role",
};

function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  switch (role) {
    case "company_owner":
      return "default";
    case "company_admin":
      return "secondary";
    default:
      return "outline";
  }
}

function getInitials(firstName: string | null, lastName: string | null, email: string | null): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) return firstName[0].toUpperCase();
  if (email) return email[0].toUpperCase();
  return "?";
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

export default function ClientTeam({ companyId }: TeamProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("team_member");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: members, isLoading } = useQuery<TeamMember[]>({
    queryKey: [`/api/companies/${companyId}/members`],
  });

  const { data: invitations, isLoading: invitationsLoading } = useQuery<Invitation[]>({
    queryKey: [`/api/companies/${companyId}/invitations`],
  });

  const pendingInvitations = invitations?.filter(inv => !inv.usedAt) || [];

  const createInvitationMutation = useMutation({
    mutationFn: async (data: { companyId: string; email: string; role: string }) => {
      const res = await apiRequest("POST", "/api/invitations", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${companyId}/invitations`] });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("team_member");
      toast({ title: "Invitation sent", description: "The team member will receive an email with instructions to join." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send invitation", description: error.message, variant: "destructive" });
    },
  });

  const revokeInvitationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/invitations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${companyId}/invitations`] });
      toast({ title: "Invitation revoked" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to revoke invitation", description: error.message, variant: "destructive" });
    },
  });

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast({ title: "Email required", description: "Please enter the team member's email address.", variant: "destructive" });
      return;
    }
    createInvitationMutation.mutate({ companyId, email: inviteEmail.trim(), role: inviteRole });
  };

  const handleCopyLink = async (token: string) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/signup?invite=${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
      toast({ title: "Link copied to clipboard" });
    } catch {
      toast({ title: "Failed to copy link", variant: "destructive" });
    }
  };

  return (
    <ClientLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-muted-foreground" />
            <div>
              <h1 className="text-2xl font-semibold" data-testid="text-team-title">Team Members</h1>
              <p className="text-sm text-muted-foreground">
                Manage your team and send invitations
              </p>
            </div>
          </div>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-invite-member">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to add a new member to your team. They'll receive an email with a link to join.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    data-testid="input-invite-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger data-testid="select-invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company_admin">Company Admin</SelectItem>
                      <SelectItem value="team_member">Team Member</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {inviteRole === "company_admin"
                      ? "Company Admins can manage team members and approve task requests."
                      : "Team Members can view tasks, submit requests, and collaborate."}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)} data-testid="button-cancel-invite">
                  Cancel
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={createInvitationMutation.isPending}
                  data-testid="button-send-invite"
                >
                  {createInvitationMutation.isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !members || members.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No team members found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {members
              .sort((a, b) => {
                const roleOrder: Record<string, number> = {
                  company_owner: 0,
                  company_admin: 1,
                  team_member: 2,
                  custom: 3,
                };
                return (roleOrder[a.role] ?? 4) - (roleOrder[b.role] ?? 4);
              })
              .map((member) => (
                <Card key={member.id} data-testid={`card-team-member-${member.userId}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      <Avatar>
                        <AvatarFallback>
                          {getInitials(member.firstName, member.lastName, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium" data-testid={`text-member-name-${member.userId}`}>
                            {[member.firstName, member.lastName].filter(Boolean).join(" ") || "Unknown"}
                          </span>
                          <Badge variant={getRoleBadgeVariant(member.role)} data-testid={`badge-role-${member.userId}`}>
                            <Shield className="h-3 w-3 mr-1" />
                            {ROLE_LABELS[member.role] || member.role}
                          </Badge>
                        </div>
                        {member.email && (
                          <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            <span data-testid={`text-member-email-${member.userId}`}>{member.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {pendingInvitations.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-pending-invitations-title">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Pending Invitations
            </h2>
            {pendingInvitations.map((inv) => (
              <Card key={inv.id} className={isExpired(inv.expiresAt) ? "opacity-60" : ""} data-testid={`card-invitation-${inv.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar>
                        <AvatarFallback className="bg-muted">
                          <Mail className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm" data-testid={`text-invitation-email-${inv.id}`}>
                            {inv.email || "No email"}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {ROLE_LABELS[inv.role] || inv.role}
                          </Badge>
                          {isExpired(inv.expiresAt) && (
                            <Badge variant="destructive" className="text-xs" data-testid={`badge-expired-${inv.id}`}>
                              Expired
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isExpired(inv.expiresAt)
                            ? `Expired ${new Date(inv.expiresAt).toLocaleDateString()}`
                            : `Expires ${new Date(inv.expiresAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyLink(inv.token)}
                        data-testid={`button-copy-link-${inv.id}`}
                      >
                        {copiedToken === inv.token ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeInvitationMutation.mutate(inv.id)}
                        disabled={revokeInvitationMutation.isPending}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-revoke-invitation-${inv.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!invitationsLoading && pendingInvitations.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              No pending invitations. Use the "Invite Member" button above to add team members.
            </p>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
