import { useState } from "react";
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
  BookOpen,
  Package,
  Briefcase,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  MessageSquare,
  Video,
  ClipboardList,
  Repeat,
  Target,
  UserPlus,
  Shield,
  FolderOpen,
  Globe,
  Wifi,
} from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { MobileBackButton } from "@/components/mobile-back-button";
import logoImage from "@assets/LogoNewMedium_1768860762303.png";

interface UserInfo {
  isAdmin: boolean;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
  adminOnly?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    key: "clients",
    label: "Clients",
    items: [
      { title: "All Companies", href: "/admin/companies", icon: Building2 },
      { title: "Add Company",   href: "/admin/companies", icon: UserPlus },
    ],
  },
  {
    key: "work",
    label: "Work",
    items: [
      { title: "All Tasks",        href: "/admin/tasks",            icon: ClipboardList },
      { title: "Content Calendar", href: "/admin/content-calendar", icon: Calendar },
      { title: "Cadences",         href: "/admin/cadences",         icon: Repeat },
      { title: "Campaigns",        href: "/admin/campaigns",        icon: Target },
    ],
  },
  {
    key: "marketing",
    label: "Marketing",
    items: [
      { title: "Strategy Board",     href: "/admin/strategy",       icon: Zap },
      { title: "AI Brief Generator", href: "/admin/ai-brief",       icon: Star },
      { title: "Asset Library",      href: "/admin/asset-library",  icon: Image },
      { title: "Resource Library",   href: "/admin/resource-library", icon: FolderOpen },
      { title: "Workflows Library",  href: "/admin/workflow-library", icon: Activity },
      { title: "SEO / Directories",  href: "/admin/seo",              icon: Globe },
      { title: "Integrations",       href: "/admin/integrations",     icon: Wifi },
    ],
  },
  {
    key: "communicate",
    label: "Communicate",
    items: [
      { title: "Messages", href: "/admin/messages", icon: MessageSquare },
      { title: "Meetings",  href: "/admin/meetings",  icon: Video },
    ],
  },
  {
    key: "admin",
    label: "Admin",
    adminOnly: true,
    items: [
      { title: "Users",             href: "/admin/user-management", icon: User },
      { title: "Reporting",         href: "/admin/reporting",       icon: BarChart3 },
      { title: "Training",          href: "/admin/training",        icon: BookOpen },
      { title: "Deliverable Types",  href: "/admin/deliverables",       icon: Package },
      { title: "Campaign Types",     href: "/admin/campaign-types",     icon: Briefcase },
      { title: "Retainer Templates", href: "/admin/retainer-templates", icon: Package },
      { title: "Service Tracks",     href: "/admin/service-tracks",     icon: Briefcase },
      { title: "Task Templates",     href: "/admin/task-templates",     icon: Package },
      { title: "Check-ins",          href: "/admin/check-ins",          icon: Shield },
    ],
  },
];

const ACCOUNT_ITEMS: NavItem[] = [
  { title: "Notifications", href: "/admin/settings", icon: Bell },
  { title: "Settings",      href: "/admin/settings", icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const isAdminDashboard = location.split("?")[0] === "/admin/dashboard";

  const { data: userInfo } = useQuery<UserInfo>({
    queryKey: ["/api/me"],
  });
  const isAdmin = userInfo?.isAdmin ?? true;

  // Collapsible state persisted in localStorage
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("sidebar-collapsed-groups") || "{}");
    } catch {
      return {};
    }
  });

  const toggleGroup = (key: string) => {
    setCollapsed(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("sidebar-collapsed-groups", JSON.stringify(next));
      return next;
    });
  };

  const isOpen = (key: string) => !collapsed[key];

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const isActive = (href: string) => {
    const path = location.split("?")[0];
    if (href === "/admin/dashboard") return path === href;
    return path === href || path.startsWith(href + "/");
  };

  const renderItem = (item: NavItem) => (
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

  const renderGroup = (group: NavGroup) => {
    if (group.adminOnly && !isAdmin) return null;
    const open = isOpen(group.key);
    return (
      <SidebarGroup key={group.key}>
        <button
          onClick={() => toggleGroup(group.key)}
          className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors rounded-sm"
          data-testid={`sidebar-group-${group.key}`}
        >
          <span>{group.label}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
          />
        </button>
        {open && (
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        )}
      </SidebarGroup>
    );
  };

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
            {/* Dashboard — direct link, no sub-items */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/admin/dashboard")}>
                      <Link href="/admin/dashboard" data-testid="nav-dashboard">
                        <Home className="w-4 h-4" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Collapsible groups */}
            {NAV_GROUPS.map(renderGroup)}
          </SidebarContent>

          {/* ACCOUNT — pinned to bottom */}
          <div className="border-t">
            <SidebarGroup>
              <button
                onClick={() => toggleGroup("account")}
                className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors rounded-sm"
                data-testid="sidebar-group-account"
              >
                <span>Account</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen("account") ? "" : "-rotate-90"}`}
                />
              </button>
              {isOpen("account") && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {ACCOUNT_ITEMS.map(renderItem)}
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
              )}
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
