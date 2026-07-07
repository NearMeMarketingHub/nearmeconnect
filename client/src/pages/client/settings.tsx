import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { ClientLayout } from "@/components/client-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Building2, Mail, User, LogOut, Bell, Save, Loader2, Pencil } from "lucide-react";
import { tierPricing } from "@shared/schema";
import type { Company } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface ClientSettingsProps {
  companyId: string;
}

interface NotificationPrefs {
  taskUpdates: boolean;
  chatMentions: boolean;
  campaignUpdates: boolean;
  creditAlerts: boolean;
  trainingReminders: boolean;
  meetingReminders: boolean;
  emailDigest: boolean;
}

interface UserInfo {
  userId: string;
  companyId: string;
  companyRole: string | null;
}

const NOTIFICATION_LABELS: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  { key: "taskUpdates", label: "Task Updates", description: "When tasks are assigned, updated, or completed" },
  { key: "chatMentions", label: "Chat Mentions", description: "When someone mentions you in a chat message" },
  { key: "campaignUpdates", label: "Campaign Updates", description: "When campaign requests are approved or rejected" },
  { key: "creditAlerts", label: "Credit Alerts", description: "Low credit warnings and purchase confirmations" },
  { key: "trainingReminders", label: "Training Reminders", description: "New training assignments and deadlines" },
  { key: "meetingReminders", label: "Meeting Reminders", description: "Upcoming meetings and scheduling updates" },
  { key: "emailDigest", label: "Email Digest", description: "Weekly summary of activity" },
];

export default function ClientSettings({ companyId }: ClientSettingsProps) {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [editingProfile, setEditingProfile] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [editingCompany, setEditingCompany] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyIndustry, setCompanyIndustry] = useState("");

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: ["/api/companies", companyId],
    enabled: !!companyId,
  });

  const { data: userInfo } = useQuery<UserInfo>({
    queryKey: ["/api/auth/user"],
  });

  const isOwnerOrAdmin = userInfo?.companyRole === "company_owner" || userInfo?.companyRole === "company_admin";

  const { data: notifPrefs, isLoading: prefsLoading } = useQuery<NotificationPrefs>({
    queryKey: ["/api/notification-preferences"],
  });

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
    }
  }, [user]);

  useEffect(() => {
    if (company) {
      setCompanyName(company.name || "");
      setCompanyIndustry(company.industry || "");
    }
  }, [company]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string }) => {
      const res = await apiRequest("PATCH", "/api/auth/profile", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Profile updated" });
      setEditingProfile(false);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update profile", description: err.message, variant: "destructive" });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async (data: { name: string; industry: string }) => {
      const res = await apiRequest("PATCH", `/api/companies/${companyId}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Company info updated" });
      setEditingCompany(false);
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update company", description: err.message, variant: "destructive" });
    },
  });

  const updatePrefMutation = useMutation({
    mutationFn: async (data: Partial<NotificationPrefs>) => {
      const res = await apiRequest("PATCH", "/api/notification-preferences", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-preferences"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update preference", description: err.message, variant: "destructive" });
    },
  });

  const togglePref = (key: keyof NotificationPrefs) => {
    if (!notifPrefs) return;
    updatePrefMutation.mutate({ [key]: !notifPrefs[key] });
  };

  const tierPrice = company?.subscriptionTier
    ? tierPricing[company.subscriptionTier as keyof typeof tierPricing]
    : 0;

  return (
    <ClientLayout companyId={companyId}>
      <div className="p-6 space-y-6" data-testid="settings-page">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account, company, and notification preferences.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Your Profile
                  </CardTitle>
                  <CardDescription>Your personal account information</CardDescription>
                </div>
                {!editingProfile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingProfile(true)}
                    data-testid="button-edit-profile"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="text-lg">
                    {user?.firstName?.[0] || user?.email?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-lg">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              {editingProfile ? (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        data-testid="input-first-name"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        data-testid="input-last-name"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        disabled={updateProfileMutation.isPending}
                        onClick={() => updateProfileMutation.mutate({ firstName: firstName.trim(), lastName: lastName.trim() })}
                        data-testid="button-save-profile"
                      >
                        {updateProfileMutation.isPending ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3 mr-1" />
                        )}
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingProfile(false);
                          setFirstName(user?.firstName || "");
                          setLastName(user?.lastName || "");
                        }}
                        data-testid="button-cancel-edit-profile"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{user?.email || "No email"}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Company
                  </CardTitle>
                  <CardDescription>Your company information and subscription</CardDescription>
                </div>
                {isOwnerOrAdmin && !editingCompany && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingCompany(true)}
                    data-testid="button-edit-company"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : company ? (
                <>
                  {editingCompany ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="companyName">Company Name</Label>
                        <Input
                          id="companyName"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          data-testid="input-company-name"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="companyIndustry">Industry</Label>
                        <Input
                          id="companyIndustry"
                          value={companyIndustry}
                          onChange={(e) => setCompanyIndustry(e.target.value)}
                          data-testid="input-company-industry"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          disabled={updateCompanyMutation.isPending}
                          onClick={() => updateCompanyMutation.mutate({
                            name: companyName.trim(),
                            industry: companyIndustry.trim(),
                          })}
                          data-testid="button-save-company"
                        >
                          {updateCompanyMutation.isPending ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3 mr-1" />
                          )}
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingCompany(false);
                            setCompanyName(company.name || "");
                            setCompanyIndustry(company.industry || "");
                          }}
                          data-testid="button-cancel-edit-company"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="font-medium text-lg">{company.name}</p>
                        <p className="text-muted-foreground">{company.industry || "No industry"}</p>
                      </div>
                    </>
                  )}
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Subscription</span>
                      <Badge variant="outline" className="capitalize">
                        {company.subscriptionTier}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Monthly Cost</span>
                      <span className="font-mono font-medium">
                        ${tierPrice.toLocaleString()}/mo
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Monthly Credits</span>
                      <span className="font-mono font-medium">
                        {company.monthlyCredits} credits
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Renewal Date</span>
                      <span className="font-medium">
                        {(() => {
                          const now = new Date();
                          const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                          return nextMonth.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
                        })()}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Company not found</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose which email notifications you want to receive.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {prefsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : notifPrefs ? (
              <div className="space-y-4">
                {NOTIFICATION_LABELS.map(({ key, label, description }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-4 py-2"
                    data-testid={`pref-row-${key}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                    <Switch
                      checked={notifPrefs[key]}
                      onCheckedChange={() => togglePref(key)}
                      data-testid={`switch-${key}`}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
