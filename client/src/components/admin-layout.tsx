import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Home,
  Building2,
  CheckCircle,
  Calendar,
  Zap,
  Star,
  Image,
  Activity,
  Users,
  BarChart3,
  User,
  FolderOpen,
  BookOpen,
  Package,
  Briefcase,
  Bell,
  Settings,
  LogOut,
} from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { MobileBackButton } from "@/components/mobile-back-button";
import logoImage from "@assets/LogoNewMedium_1768860762303.png";

const mainItems = [
  { title: "Dashboard", href: "/admin/dashboard", icon: Home },
  { title: "Companies", href: "/admin/companies", icon: Building2 },
  { title: "Tasks", href: "/admin/tasks", icon: CheckCircle },
  { title: "Content Calendar", href: "/admin/content-calendar", icon: Calendar },
];

const marketingItems = [
  { title: "Strategy Board", href: "/admin/strategy", icon: Zap },
  { title: "AI Brief Generator", href: "/admin/ai-brief", icon: Star },
  { title: "Asset Library", href: "/admin/asset-library", icon: Image },
  { title: "Workflows", href: "/admin/workflow-library", icon: Activity },
];

const adminItems = [
  { title: "Meetings", href: "/admin/meetings", icon: Users },
  { title: "Reporting", href: "/admin/reporting", icon: BarChart3 },
  { title: "Users", href: "/admin/user-management", icon: User },
  { title: "Workflow Library", href: "/admin/workflow-library", icon: FolderOpen },
  { title: "Training", href: "/admin/training", icon: BookOpen },
  { title: "Deliverable Types", href: "/admin/deliverables", icon: Package },
  { title: "Campaign Types", href: "/admin/campaigns", icon: Briefcase },
];

interface UserInfo {
  isAdmin: boolean;
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const isAdminDashboard = location.split("?")[0] === "/admin/dashboard";

  const { data: userInfo } = useQuery<UserInfo>({
    queryKey: ["/api/me"],
  });
  const isAdmin = userInfo?.isAdmin ?? true;

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const isActive = (href: string) => {
    const path = location.split("?")[0];
    if (href === "/admin/dashboard") return path === href;
    return path === href || path.startsWith(href + "/");
  };

  const renderNavItem = (item: {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild isActive={isActive(item.href)}>
        <Link
          href={item.href}
          data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <item.icon className="w-4 h-4" />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <div className="p-4 border-b flex-shrink-0">
            <div className="flex items-center gap-2">
              <img src={logoImage} alt="Near Me Connect" className="h-8 w-auto" />
              <span className="font-bold tracking-tight">Admin Portal</span>
            </div>
          </div>

          <SidebarContent>
            {/* MAIN — no category label */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {mainItems.map(renderNavItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* MARKETING */}
            <SidebarGroup>
              <SidebarGroupLabel
                className="text-xs font-semibold text-muted-foreground tracking-wider uppercase"
                data-testid="group-marketing"
              >
                Marketing
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {marketingItems.map(renderNavItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* ADMIN — only for admin users */}
            {isAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel
                  className="text-xs font-semibold text-muted-foreground tracking-wider uppercase"
                  data-testid="group-admin"
                >
                  Admin
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {adminItems.map(renderNavItem)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          {/* ACCOUNT — pinned to bottom */}
          <div className="border-t">
            <SidebarGroup>
              <SidebarGroupLabel
                className="text-xs font-semibold text-muted-foreground tracking-wider uppercase"
                data-testid="group-account"
              >
                Account
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/admin/settings#notifications")}>
                      <Link href="/admin/settings" data-testid="nav-notifications">
                        <Bell className="w-4 h-4" />
                        <span>Notifications</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/admin/settings")}>
                      <Link href="/admin/settings" data-testid="nav-settings">
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => logout()}
                      data-testid="nav-logout"
                      className="cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log out</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <div className="px-4 py-2 border-t text-center">
              <span className="text-xs text-muted-foreground" data-testid="text-version">
                v1.7
              </span>
            </div>
          </div>
        </Sidebar>

        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-3 border-b bg-background">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              {!isAdminDashboard && (
                <MobileBackButton to="/admin/dashboard" />
              )}
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-9 w-9 rounded-full"
                    data-testid="button-user-menu"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>
                        {user?.firstName?.[0] || user?.email?.[0] || "A"}
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
                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="cursor-pointer"
                    data-testid="button-logout"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-muted/30">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
