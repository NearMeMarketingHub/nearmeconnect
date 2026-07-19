import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, CreditCard, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { ClientLayout } from "@/components/client-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionStatus {
  saasTier: string;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  companyName: string;
}

const PLAN_NAMES: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
  internal: "Enterprise (Managed)",
};

const PLAN_PRICES: Record<string, number | null> = {
  starter: 69,
  growth: 89,
  pro: 99,
  internal: null,
};

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ["Task management", "Campaign management", "Meetings & calendar", "Training resources", "Media uploads", "Chat & messaging"],
  growth: ["Everything in Starter", "Credit system", "Credit tracking"],
  pro: ["Everything in Growth", "Reporting & analytics", "Credit store"],
  internal: ["Full access to all features", "Custom configuration", "Dedicated support"],
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status || status === "active") {
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0">Active</Badge>;
  }
  if (status === "past_due") {
    return <Badge variant="destructive">Payment past due</Badge>;
  }
  if (status === "canceled" || status === "cancelled") {
    return <Badge variant="secondary">Cancelled</Badge>;
  }
  if (status === "trialing") {
    return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-0">Trial</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
}

interface ClientSubscriptionProps {
  companyId: string;
}

export default function ClientSubscription({ companyId }: ClientSubscriptionProps) {
  const { toast } = useToast();
  const [portalLoading, setPortalLoading] = useState(false);

  const { data: sub, isLoading } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status", companyId],
    queryFn: () => fetch(`/api/subscription/status?companyId=${companyId}`).then(r => r.json()),
    enabled: !!companyId,
  });

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/subscription/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();
      if (!res.ok || !data.portalUrl) {
        toast({ title: "Error", description: data.error || "Could not open billing portal.", variant: "destructive" });
        return;
      }
      window.location.href = data.portalUrl;
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <ClientLayout companyId={companyId}>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscription</h1>
          <p className="text-muted-foreground mt-1">Manage your Near Me Connect plan and billing</p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : sub ? (
          <>
            <Card data-testid="card-subscription-plan">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">{PLAN_NAMES[sub.saasTier] ?? sub.saasTier}</CardTitle>
                  {PLAN_PRICES[sub.saasTier] && (
                    <CardDescription className="text-2xl font-bold text-foreground mt-1">
                      ${PLAN_PRICES[sub.saasTier]}<span className="text-sm font-normal text-muted-foreground">/month</span>
                    </CardDescription>
                  )}
                </div>
                <StatusBadge status={sub.subscriptionStatus} />
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-1.5">
                  {(PLAN_FEATURES[sub.saasTier] ?? []).map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {sub.subscriptionStatus === "past_due" && (
                  <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Your last payment failed. Please update your payment method to keep your account active.</span>
                  </div>
                )}

                {sub.stripeCustomerId && sub.saasTier !== "internal" && (
                  <Button
                    onClick={openBillingPortal}
                    disabled={portalLoading}
                    className="gap-2"
                    data-testid="button-manage-billing"
                  >
                    {portalLoading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Loading…</>
                    ) : (
                      <><CreditCard className="h-4 w-4" /> Manage billing <ExternalLink className="h-3 w-3 ml-1" /></>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {sub.saasTier === "starter" && (
              <Card className="border-orange-200 dark:border-orange-800">
                <CardContent className="pt-5">
                  <p className="text-sm font-medium mb-1">Unlock more features</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Upgrade to Growth to add credit tracking, or Pro for full reporting and the credit store.
                  </p>
                  <a href="mailto:hello@nearmemarketinghub.com">
                    <Button variant="outline" size="sm" className="border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                      Contact us to upgrade
                    </Button>
                  </a>
                </CardContent>
              </Card>
            )}

            {sub.saasTier === "growth" && (
              <Card className="border-orange-200 dark:border-orange-800">
                <CardContent className="pt-5">
                  <p className="text-sm font-medium mb-1">Add reporting & the credit store</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Upgrade to Pro ($99/mo) to unlock reporting analytics and the ability to purchase additional credits.
                  </p>
                  <a href="mailto:hello@nearmemarketinghub.com">
                    <Button variant="outline" size="sm" className="border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                      Contact us to upgrade
                    </Button>
                  </a>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No subscription data available.
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}
