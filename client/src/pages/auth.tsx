import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { Building2, Shield } from "lucide-react";
import logoImage from "@assets/LogoNewMedium_1768860762303.png";

type UserType = "client" | "admin";

export default function AuthPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const adminInviteToken = urlParams.get("adminInvite");

  const isInviteRegistration = !!adminInviteToken;

  const [userType, setUserType] = useState<UserType>(isInviteRegistration ? "admin" : "client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");

  const { login, register, isLoggingIn, isRegistering } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (isInviteRegistration) {
        await register({ email, password, firstName, lastName, userType, adminInviteToken: adminInviteToken || undefined });
      } else {
        await login({ email, password, userType });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const isLoading = isLoggingIn || isRegistering;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            <div className="flex items-center gap-2">
              <img src={logoImage} alt="Near Me Connect" className="h-10 w-auto" />
              <span className="text-lg font-bold tracking-tight">Near Me Connect</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4">
            {!isInviteRegistration && (
              <Tabs value={userType} onValueChange={(v) => setUserType(v as UserType)} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="client" className="gap-2" data-testid="tab-client">
                    <Building2 className="h-4 w-4" />
                    Client
                  </TabsTrigger>
                  <TabsTrigger value="admin" className="gap-2" data-testid="tab-admin">
                    <Shield className="h-4 w-4" />
                    Admin
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            <CardTitle className="text-center">
              {isInviteRegistration ? "Create Your Account" : `Sign In as ${userType === "admin" ? "Admin" : "Client"}`}
            </CardTitle>
            {isInviteRegistration && (
              <p className="text-sm text-center text-muted-foreground" data-testid="text-admin-invite-notice">
                You've been invited to join as an agency admin. Create your account to get started.
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isInviteRegistration && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      data-testid="input-last-name"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  data-testid="input-password"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive" data-testid="text-error">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-submit"
              >
                {isLoading ? "Please wait..." : isInviteRegistration ? "Create Account" : "Sign In"}
              </Button>

              {!isInviteRegistration && (
                <div className="text-center">
                  <a
                    href="/forgot-password"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    data-testid="link-forgot-password"
                  >
                    Forgot your password?
                  </a>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
