import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun, Building2, User, Mail, Phone, Briefcase } from "lucide-react";
import type { Client } from "@shared/schema";

interface SettingsPageProps {
  client: Client;
}

export default function SettingsPage({ client }: SettingsPageProps) {
  const { theme, setTheme } = useTheme();

  const tierConfig: Record<string, { color: string; label: string }> = {
    starter: { color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", label: "Starter" },
    growth: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", label: "Growth" },
    professional: { color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", label: "Professional" },
    enterprise: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", label: "Enterprise" },
  };

  const tier = tierConfig[client.subscriptionTier] || tierConfig.starter;

  return (
    <div className="p-6 space-y-6" data-testid="settings-page">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Company Information
            </CardTitle>
            <CardDescription>
              Your company details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={client.companyName}
                  disabled
                  data-testid="input-settings-company"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={client.industry || "Not specified"}
                  disabled
                  data-testid="input-settings-industry"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Contact Name
                </Label>
                <Input
                  id="contactName"
                  value={client.contactName}
                  disabled
                  data-testid="input-settings-contact"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  value={client.email}
                  disabled
                  data-testid="input-settings-email"
                />
              </div>
            </div>
            {client.phone && (
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone
                </Label>
                <Input
                  id="phone"
                  value={client.phone}
                  disabled
                  className="max-w-sm"
                  data-testid="input-settings-phone"
                />
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Contact us to update your company information.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Subscription
            </CardTitle>
            <CardDescription>
              Your current subscription plan and credits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Current Plan</p>
                <p className="text-sm text-muted-foreground">
                  {client.monthlyCredits} credits per month
                </p>
              </div>
              <Badge className={tier.color} data-testid="badge-subscription-tier">
                {tier.label}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">Available Credits</p>
                <p className="text-2xl font-bold font-mono">{client.credits}</p>
              </div>
              <div className="p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">Monthly Allocation</p>
                <p className="text-2xl font-bold font-mono">{client.monthlyCredits}</p>
              </div>
              <div className="p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">Next Renewal</p>
                <p className="text-2xl font-bold">
                  {client.renewalDate || "N/A"}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Your subscription is managed through HubSpot. Contact us to upgrade or modify your plan.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Appearance</CardTitle>
            <CardDescription>
              Customize how the portal looks for you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Choose between light and dark mode
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                  data-testid="button-theme-light"
                >
                  <Sun className="w-4 h-4 mr-2" />
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                  data-testid="button-theme-dark"
                >
                  <Moon className="w-4 h-4 mr-2" />
                  Dark
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
