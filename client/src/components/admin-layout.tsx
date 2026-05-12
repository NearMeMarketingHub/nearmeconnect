import { useState, useEffect } from "react";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { LayoutDashboard, Building2, LogOut, Tag, Calendar, MessageCircle, Megaphone, Video, GraduationCap, ListTodo, Cloud, CreditCard, Settings, ChevronDown, Briefcase, Wrench, FlaskConical, Landmark, BarChart3, FileImage, Upload, Users, ShieldCheck, Layers } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { MobileBackButton } from "@/components/mobile-back-button";
import logoImage from "@assets/LogoNewMedium_1768860762303.png";

const coreItems = [
  { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Companies", href: "/admin/companies", icon: Building2 },
  { title: "Tasks", href: "/admin/tasks", icon: ListTodo },
];

const servicesItems = [
  { title: "Campaigns", href: "/admin/campaigns", icon: Megaphone },
  { title: "Meetings", href: "/admin/meetings", icon: Video },
  { title: "Training", href: "/admin/training", icon: GraduationCap },
  { title: "Media Profiles", href: "/admin/media-profiles", icon: FileImage },
  { title: "Government", href: "/admin/government", icon: Landmark },
];

const communicationItems = [
  { title: "Calendar", href: "/admin/calendar", icon: Calendar },
  { title: "Chat", href: "/admin/chat", icon: MessageCircle },
  { title: "Media Submissions", href: "/admin/media-submissions", icon: Upload },
];

const configurationItems = [
  { title: "User Management", href: "/admin/user-management", icon: Users },
  { title: "Custom Roles", href: "/admin/custom-roles", icon: ShieldCheck },
  { title: "Deliverables", href: "/admin/deliverables", icon: Tag },
  { title: "Subscription Tiers", href: "/admin/subscription-tiers", icon: Layers },
  { title: "Credit Store", href: "/admin/credit-store", icon: CreditCard },
  { title: "Reporting", href: "/admin/reporting", icon: BarChart3 },
  { title: "Settings", href: "/admin/settings", icon: Settings },
];

const devItems = [
  { title: "Sandbox", href: "/admin/sandbox", icon: FlaskConical },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const isAdminDashboard = location.split('?')[0] === '/admin/dashboard';
  
  // Load collapsed states from localStorage, default to false (collapsed)
  const [servicesOpen, setServicesOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar_services_open');
    return saved === 'true';
  });
  const [communicationOpen, setCommunicationOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar_communication_open');
    return saved === 'true';
  });
  const [configurationOpen, setConfigurationOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar_configuration_open');
    return saved === 'true';
  });

  // Persist collapsed states to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar_services_open', String(servicesOpen));
  }, [servicesOpen]);
  useEffect(() => {
    localStorage.setItem('sidebar_communication_open', String(communicationOpen));
  }, [communicationOpen]);
  useEffect(() => {
    localStorage.setItem('sidebar_configuration_open', String(configurationOpen));
  }, [configurationOpen]);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const isActive = (href: string) => location.split('?')[0] === href;

  const renderNavItem = (item: { title: string; href: string; icon: React.ComponentType<{ className?: string }> }) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild isActive={isActive(item.href)}>
        <Link href={item.href} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
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
          <SidebarContent>
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <img src={logoImage} alt="Near Me Connect" className="h-8 w-auto" />
                <span className="font-bold tracking-tight">Admin Portal</span>
              </div>
            </div>

            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {coreItems.map(renderNavItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <Collapsible open={servicesOpen} onOpenChange={setServicesOpen}>
              <SidebarGroup>
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="cursor-pointer hover-elevate flex items-center justify-between pr-2" data-testid="group-services">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Services</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${servicesOpen ? '' : '-rotate-90'}`} />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {servicesItems.map(renderNavItem)}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            <Collapsible open={communicationOpen} onOpenChange={setCommunicationOpen}>
              <SidebarGroup>
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="cursor-pointer hover-elevate flex items-center justify-between pr-2" data-testid="group-communication">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Communication</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${communicationOpen ? '' : '-rotate-90'}`} />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {communicationItems.map(renderNavItem)}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            <Collapsible open={configurationOpen} onOpenChange={setConfigurationOpen}>
              <SidebarGroup>
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="cursor-pointer hover-elevate flex items-center justify-between pr-2" data-testid="group-configuration">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Configuration</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${configurationOpen ? '' : '-rotate-90'}`} />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {configurationItems.map(renderNavItem)}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center gap-2" data-testid="group-development">
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Development</span>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {devItems.map(renderNavItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <div className="px-4 py-2 border-t text-center">
            <span className="text-xs text-muted-foreground" data-testid="text-version">v1.7</span>
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
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="button-user-menu">
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
                  <DropdownMenuItem onClick={() => logout()} className="cursor-pointer" data-testid="button-logout">
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-muted/30">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
