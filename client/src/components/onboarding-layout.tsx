import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Building2 } from "lucide-react";
import logoImage from "@assets/LogoNewMedium_1768860762303.png";

interface OnboardingLayoutProps {
  children: React.ReactNode;
  companyName?: string;
  companyLogoUrl?: string;
}

export function OnboardingLayout({ children, companyName, companyLogoUrl }: OnboardingLayoutProps) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="flex items-center justify-between gap-4 p-4 border-b bg-background">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border">
            {companyLogoUrl ? (
              <AvatarImage src={companyLogoUrl} alt={companyName} />
            ) : null}
            <AvatarFallback className="bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </AvatarFallback>
          </Avatar>
          <div>
            <span className="font-bold text-sm block tracking-tight">
              {companyName || "Client Onboarding"}
            </span>
            <span className="text-xs text-muted-foreground">Complete your setup to get started</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
