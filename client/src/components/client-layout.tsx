import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { LayoutDashboard, ListTodo, CreditCard, Settings, LogOut, Building2, Upload, Calendar, MessageCircle, Megaphone, Video, GraduationCap, AlertTriangle, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationBell } from "@/components/notification-bell";
import logoImage from "@assets/LogoNewMedium_1768860762303.png";
import { MobileBackButton } from "@/components/mobile-back-button";
import type { Company, CustomRole } from "@shared/schema";

// pageKey maps to the allowedViews array in custom_roles
const allNavItems = [
  { title: "Dashboard", href: "/client/dashboard", icon: LayoutDashboard, pageKey: "dashboard", roles: ["company_owner", "company_admin"], clientTypes: ["marketing", "government"] },
  { title: "Tasks", href: "/client/tasks", icon: ListTodo, pageKey: "tasks", roles: ["company_owner", "company_admin", "team_member"], clientTypes: ["marketing", "government"] },
  { title: "Campaigns", href: "/client/campaigns", icon: Megaphone, pageKey: "campaigns", roles: ["company_owner", "company_admin"], clientTypes: ["marketing", "government"] },
  { title: "Meetings", href: "/client/meetings", icon: Video, pageKey: "meetings", roles: ["company_owner", "company_admin"], clientTypes: ["marketing", "government"] },
  { title: "Training", href: "/client/training", icon: GraduationCap, pageKey: "training", roles: ["company_owner", "company_admin", "team_member"], clientTypes: ["marketing", "government"] },
  { title: "Calendar", href: "/client/calendar", icon: Calendar, pageKey: "calendar", roles: ["company_owner", "company_admin", "team_member"], clientTypes: ["marketing", "government"] },
  { title: "Chat", href: "/client/chat", icon: MessageCircle, pageKey: "chat", roles: ["company_owner", "company_admin", "team_member"], clientTypes: ["marketing", "government"] },
  { title: "Credits", href: "/client/credits", icon: CreditCard, pageKey: "credits", roles: ["company_owner", "company_admin"], clientTypes: ["marketing", "government"] },
  { title: "Media Uploads", href: "/client/media-uploads", icon: Upload, pageKey: "media_uploads", roles: ["company_owner", "company_admin"], clientTypes: ["marketing", "government"] },
  { title: "Team", href: "/client/team", icon: Users, pageKey: "team", roles: ["company_owner", "company_admin"], clientTypes: ["marketing", "government"] },
  { title: "Settings", href: "/client/settings", icon: Settings, pageKey: "settings", roles: ["company_owner", "company_admin"], clientTypes: ["marketing", "government"] },
];

interface UserInfo {
  userId: string;
  companyId: string;
  firstName: string;
  lastName: string;
  companyRole: string | null;
  customRoleId: string | null;
}

interface ClientLayoutProps {
  children: React.ReactNode;
  companyId?: string;
}

export function ClientLayout({ children, companyId: propCompanyId }: ClientLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const isClientDashboard = location.split('?')[0] === '/client/dashboard';

  // Fetch user info to get companyId and role
  const { data: userInfo } = useQuery<UserInfo>({
    queryKey: ["/api/auth/user"],
  });

  const companyId = propCompanyId || userInfo?.companyId;
  const userRole = userInfo?.companyRole || "team_member";
  const customRoleId = userInfo?.customRoleId || null;

  const { data: company } = useQuery<Company>({
    queryKey: ["/api/companies", companyId],
    enabled: !!companyId,
  });

  const { data: customRole } = useQuery<CustomRole>({
    queryKey: ["/api/custom-roles", customRoleId],
    enabled: userRole === "custom" && !!customRoleId,
  });

  const clientType = (company as any)?.clientType || "marketing";

  const navItems = allNavItems.filter(item => {
    const hasClientType = item.clientTypes.includes(clientType);
    if (!hasClientType) return false;

    if (userRole === "custom" && customRole) {
      return customRole.allowedViews.includes(item.pageKey);
    }

    return item.roles.includes(userRole);
  });

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarContent>
            <div className="p-4 border-b">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border">
                  {company?.logoUrl ? (
                    <AvatarImage src={company.logoUrl} alt={company.name} />
                  ) : null}
                  <AvatarFallback className="bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm block truncate tracking-tight">
                    {company?.name || "Client Portal"}
                  </span>
                  {company && (
                    <Badge variant="outline" className="text-xs capitalize mt-0.5">
                      {company.subscriptionTier}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.href}
                      >
                        <Link href={item.href} data-testid={`nav-${item.title.toLowerCase()}`}>
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <div className="px-4 py-2 border-t text-center">
            <span className="text-xs text-muted-foreground" data-testid="text-version">v1.2</span>
          </div>
        </Sidebar>

        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-3 border-b bg-background">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              {!isClientDashboard && (
                <MobileBackButton to="/client/dashboard" />
              )}
            </div>
            <div className="flex items-center gap-3">
              {company && (
                <Badge variant="secondary" className="font-mono" data-testid="credit-badge">
                  {company.credits} credits
                </Badge>
              )}
              <NotificationBell />
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="button-user-menu">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>
                        {user?.firstName?.[0] || user?.email?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()} className="cursor-pointer" data-testid="button-logout">
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-muted/30">
            {company?.isPaused ? (
              <div className="flex items-center justify-center min-h-full p-6">
                <Card className="max-w-md w-full text-center">
                  <CardHeader>
                    <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                      <AlertTriangle className="h-8 w-8 text-destructive" />
                    </div>
                    <CardTitle className="text-xl">Account On Hold</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      Your account has been temporarily paused. Please contact your account manager to resolve any outstanding issues.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Once resolved, your account will be restored with full access to all features.
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
