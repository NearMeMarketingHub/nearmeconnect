import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import InviteSignup from "@/pages/invite-signup";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminCompanies from "@/pages/admin/companies";
import AdminAddCompany from "@/pages/admin/add-company";
import AdminDeliverableTypes from "@/pages/admin/deliverable-types";
import AdminCampaigns from "@/pages/admin/campaigns";
import AdminMeetings from "@/pages/admin/meetings";
import AdminTraining from "@/pages/admin/training";
import AdminMediaProfiles from "@/pages/admin/media-profiles";
import AdminMediaSubmissions from "@/pages/admin/media-submissions";
import AdminCreditStore from "@/pages/admin/credit-store";
import AdminSettings from "@/pages/admin/settings";
import ClientDashboard from "@/pages/client/dashboard";
import ClientTasks from "@/pages/client/tasks";
import ClientCredits from "@/pages/client/credits";
import ClientSettings from "@/pages/client/settings";
import ClientOnboarding from "@/pages/client/onboarding";
import ClientMediaUploads from "@/pages/client/media-uploads";
import ClientCalendar from "@/pages/client/calendar";
import ClientChat from "@/pages/client/chat";
import ClientCampaigns from "@/pages/client/campaigns";
import ClientMeetings from "@/pages/client/meetings";
import ClientTraining from "@/pages/client/training";
import ClientTeam from "@/pages/client/team";
import AdminCalendar from "@/pages/admin/calendar";
import AdminChat from "@/pages/admin/chat";
import AdminTasks from "@/pages/admin/tasks";
import AdminSandbox from "@/pages/admin/sandbox";
import AdminGovernment from "@/pages/admin/government";
import AdminReporting from "@/pages/admin/reporting";
import AdminUserManagement from "@/pages/admin/user-management";
import AdminCustomRoles from "@/pages/admin/custom-roles";
import AdminSubscriptionTiers from "@/pages/admin/subscription-tiers";
import CompanyDashboard from "@/pages/admin/company-dashboard";
import ClientGovernment from "@/pages/client/government";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import SignPage from "@/pages/sign";
import NotFound from "@/pages/not-found";
import { ErrorBoundary } from "@/components/error-boundary";
import { useWebSocket } from "@/hooks/use-websocket";
import { useNotificationHandler } from "@/hooks/use-notification-handler";

interface UserInfo {
  userId: string;
  isAdmin: boolean;
  companies: Array<{ companyId: string; role: string; onboardingComplete: boolean }>;
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-4">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Skeleton className="w-10 h-10 rounded-md" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
        <div className="flex justify-between gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const [location, navigate] = useLocation();
  useWebSocket(isAuthenticated);
  useNotificationHandler(isAuthenticated);

  const { data: userInfo, isLoading: userInfoLoading } = useQuery<UserInfo>({
    queryKey: ["/api/me"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Handle redirects in useEffect to avoid setState during render
  useEffect(() => {
    if (authLoading || userInfoLoading || !isAuthenticated) return;
    
    if (userInfo?.isAdmin) {
      if (location === "/" || location === "/admin") {
        navigate("/admin/dashboard", { replace: true });
      }
    } else if (userInfo?.companies && userInfo.companies.length > 0) {
      const company = userInfo.companies[0];
      // Check if onboarding is incomplete - force redirect to onboarding
      if (!company.onboardingComplete && !location.startsWith("/client/onboarding")) {
        navigate("/client/onboarding", { replace: true });
        return;
      }
      if (location === "/" || location === "/client") {
        navigate("/client/dashboard", { replace: true });
      }
    }
  }, [location, navigate, authLoading, userInfoLoading, isAuthenticated, userInfo]);

  // Backward-compat: redirect old /accept-invite links to /signup
  if (location.startsWith("/accept-invite")) {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    navigate(`/signup?invite=${token || ""}`, { replace: true });
    return null;
  }

  // Always allow access to signup page, regardless of auth state
  if (location.startsWith("/signup")) {
    return <InviteSignup />;
  }

  // Always allow access to admin registration page, regardless of auth state
  if (location === "/register") {
    return <AuthPage />;
  }

  // Allow access to password reset pages without authentication
  if (location === "/forgot-password") {
    return <ForgotPassword />;
  }
  if (location.startsWith("/reset-password")) {
    return <ResetPassword />;
  }

  // Allow access to signing page without authentication
  if (location.startsWith("/sign")) {
    return <SignPage />;
  }

  if (authLoading || (isAuthenticated && userInfoLoading)) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    if (location === "/auth") {
      return <AuthPage />;
    }
    return <LandingPage />;
  }

  // Still loading or redirecting
  if (location === "/" || location === "/admin" || location === "/client") {
    return <LoadingScreen />;
  }

  if (userInfo?.isAdmin) {
    return (
      <Switch>
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/tasks" component={AdminTasks} />
        <Route path="/admin/companies" component={AdminCompanies} />
        <Route path="/admin/companies/new" component={AdminAddCompany} />
        <Route path="/admin/companies/:id" component={CompanyDashboard} />
        <Route path="/admin/deliverables" component={AdminDeliverableTypes} />
        <Route path="/admin/campaigns" component={AdminCampaigns} />
        <Route path="/admin/meetings" component={AdminMeetings} />
        <Route path="/admin/training" component={AdminTraining} />
        <Route path="/admin/media-profiles" component={AdminMediaProfiles} />
        <Route path="/admin/media-submissions" component={AdminMediaSubmissions} />
        <Route path="/admin/calendar" component={AdminCalendar} />
        <Route path="/admin/chat" component={AdminChat} />
        <Route path="/admin/credit-store" component={AdminCreditStore} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route path="/admin/sandbox" component={AdminSandbox} />
        <Route path="/admin/government" component={AdminGovernment} />
        <Route path="/admin/reporting" component={AdminReporting} />
        <Route path="/admin/user-management" component={AdminUserManagement} />
        <Route path="/admin/custom-roles" component={AdminCustomRoles} />
        <Route path="/admin/subscription-tiers" component={AdminSubscriptionTiers} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  if (userInfo?.companies && userInfo.companies.length > 0) {
    const companyId = userInfo.companies[0].companyId;
    return (
      <Switch>
        <Route path="/client/dashboard">
          {() => <ClientDashboard companyId={companyId} />}
        </Route>
        <Route path="/client/tasks">
          {() => <ClientTasks companyId={companyId} />}
        </Route>
        <Route path="/client/credits">
          {() => <ClientCredits companyId={companyId} />}
        </Route>
        <Route path="/client/settings">
          {() => <ClientSettings companyId={companyId} />}
        </Route>
        <Route path="/client/onboarding">
          {() => <ClientOnboarding companyId={companyId} />}
        </Route>
        <Route path="/client/media-uploads">
          {() => <ClientMediaUploads companyId={companyId} />}
        </Route>
        <Route path="/client/calendar">
          {() => <ClientCalendar companyId={companyId} />}
        </Route>
        <Route path="/client/chat">{() => <ClientChat />}</Route>
        <Route path="/client/campaigns">
          {() => <ClientCampaigns companyId={companyId} />}
        </Route>
        <Route path="/client/meetings">
          {() => <ClientMeetings companyId={companyId} />}
        </Route>
        <Route path="/client/training">{() => <ClientTraining />}</Route>
        <Route path="/client/team">
          {() => <ClientTeam companyId={companyId} />}
        </Route>
        <Route path="/client/government">{() => <ClientGovernment />}</Route>
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center p-8">
        <h1 className="text-2xl font-semibold mb-4">Welcome to Near Me Connect</h1>
        <p className="text-muted-foreground mb-6">
          Your account is set up. Please contact your administrator to be added to a company.
        </p>
        <button
          onClick={() => logout()}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 hover-elevate"
          data-testid="button-logout"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="portal-ui-theme">
        <TooltipProvider>
          <ErrorBoundary>
            <Toaster />
            <AppContent />
          </ErrorBoundary>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
