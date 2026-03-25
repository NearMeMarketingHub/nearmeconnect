import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClientLayout } from "@/components/client-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { CreditCard, TrendingDown, TrendingUp, Calendar, Package, Loader2, Tag, Sparkles, ShoppingCart, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Company, CreditTransaction, CreditPackage, CreditSale, CreditPurchase } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ClientCreditsProps {
  companyId: string;
  embedded?: boolean;
  sandboxMode?: boolean;
}

export default function ClientCredits({ companyId, embedded = false, sandboxMode = false }: ClientCreditsProps) {
  const queryClient = useQueryClient();
  const creditResetChecked = useRef(false);
  const { toast } = useToast();

  const { data: meInfo } = useQuery<{ userId: string; isAdmin: boolean; companies: Array<{ companyId: string; role: string }> }>({
    queryKey: ["/api/me"],
  });

  const userRole = meInfo?.companies?.find(c => c.companyId === companyId)?.role;

  const { data: company, isLoading: companyLoading } = useQuery<Company>({
    queryKey: ["/api/companies", companyId],
    enabled: !!companyId,
  });

  // Credit store data
  const { data: packages = [] } = useQuery<CreditPackage[]>({
    queryKey: ["/api/credit-store/packages?active=true"],
  });

  const { data: sales = [] } = useQuery<CreditSale[]>({
    queryKey: ["/api/credit-store/sales?active=true"],
  });

  const { data: stripeStatus } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/credit-store/stripe-status"],
  });

  const { data: purchases = [] } = useQuery<CreditPurchase[]>({
    queryKey: ["/api/credit-store/purchases"],
  });

  // Check and reset credits if new month has started
  const creditResetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/companies/${companyId}/check-credit-reset`);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.wasReset) {
        queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
      }
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const response = await apiRequest("POST", "/api/credit-store/checkout", { packageId });
      return response.json();
    },
    onSuccess: (data: { url?: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Could not start checkout",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  // Sandbox simulation purchase
  const sandboxPurchaseMutation = useMutation({
    mutationFn: async ({ packageId, creditAmount, price }: { packageId: string; creditAmount: number; price: number }) => {
      const response = await apiRequest("POST", "/api/sandbox/purchase-credits", { packageId, creditAmount, price });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Simulated Purchase Complete",
        description: data.message || `Credits added to sandbox account`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-store/purchases"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Simulation failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (companyId && !creditResetChecked.current) {
      creditResetChecked.current = true;
      creditResetMutation.mutate();
    }
  }, [companyId]);

  // Handle success/cancel from Stripe
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("success") === "true") {
      toast({
        title: "Payment Successful!",
        description: "Your credits have been added to your account.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-store/purchases"] });
      window.history.replaceState({}, "", "/client/credits");
    } else if (searchParams.get("canceled") === "true") {
      toast({
        title: "Payment Canceled",
        description: "Your payment was canceled. No charges were made.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/client/credits");
    }
  }, [toast, queryClient, companyId]);

  const { data: transactions, isLoading: transactionsLoading } = useQuery<CreditTransaction[]>({
    queryKey: ["/api/credit-transactions", { companyId }],
    queryFn: async () => {
      const response = await fetch(`/api/credit-transactions?companyId=${companyId}`);
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json();
    },
    enabled: !!companyId,
  });

  const canPurchase = userRole === "company_owner" || userRole === "company_admin";

  const getDiscountedPrice = (pkg: CreditPackage): { price: number; discount: number } => {
    let price = parseFloat(pkg.price);
    let discount = 0;

    for (const sale of sales) {
      if (sale.appliesTo === "all" || sale.appliesTo.split(",").includes(pkg.id)) {
        const saleDiscount = parseFloat(sale.discountPercentage);
        discount = price * (saleDiscount / 100);
        price = price - discount;
        break;
      }
    }

    return { price, discount };
  };

  const [chartRange, setChartRange] = useState<"7" | "30" | "90">("30");

  const effectiveAllotment = company ? company.monthlyCredits + (company.bonusCredits || 0) : 0;
  const usedCredits = company ? effectiveAllotment - company.credits : 0;
  const usagePercentage = effectiveAllotment > 0 ? (usedCredits / effectiveAllotment) * 100 : 0;

  const chartData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    const days = parseInt(chartRange);
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);

    const dailyUsage: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i + 1);
      const key = d.toISOString().split("T")[0];
      dailyUsage[key] = 0;
    }

    transactions.forEach((tx) => {
      const amount = parseFloat(tx.amount);
      if (amount < 0) {
        const date = new Date(tx.createdAt).toISOString().split("T")[0];
        if (dailyUsage[date] !== undefined) {
          dailyUsage[date] += Math.abs(amount);
        }
      }
    });

    return Object.entries(dailyUsage).map(([date, used]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      used,
    }));
  }, [transactions, chartRange]);

  const content = (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Credits</h1>
        <p className="text-muted-foreground">
          Track your credit usage and transaction history.
        </p>
      </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {companyLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-3xl font-bold font-mono">{company?.credits || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">credits remaining</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {(company?.bonusCredits || 0) > 0 ? "Effective Allotment" : "Monthly Allocation"}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {companyLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-3xl font-bold font-mono" data-testid="text-effective-allotment">{effectiveAllotment}</div>
              )}
              {(company?.bonusCredits || 0) > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {company?.monthlyCredits} monthly + {company?.bonusCredits} bonus
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">credits per month</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Reset</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {companyLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="text-lg font-medium" data-testid="text-next-reset-date">
                  {(() => {
                    const now = new Date();
                    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                    return nextMonth.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  })()}
                </div>
              )}
              <p className="text-xs text-muted-foreground">credits reset monthly</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-4">
              <span>Credit Usage</span>
              <Badge variant="outline" className="capitalize">
                {company?.subscriptionTier} tier
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {companyLoading ? (
              <Skeleton className="h-4 w-full" />
            ) : (
              <div className="space-y-2">
                <Progress value={usagePercentage} className="h-3" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{usedCredits} used</span>
                  <span>{company?.credits} remaining</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Credit Usage Chart */}
        {transactions && transactions.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Usage Over Time
              </CardTitle>
              <div className="flex items-center gap-1">
                {(["7", "30", "90"] as const).map((range) => (
                  <Button
                    key={range}
                    variant={chartRange === range ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setChartRange(range)}
                    data-testid={`button-chart-range-${range}`}
                  >
                    {range}d
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <div className="h-64" data-testid="credit-usage-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        className="fill-muted-foreground"
                        interval={chartRange === "7" ? 0 : "preserveStartEnd"}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        className="fill-muted-foreground"
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                          fontSize: "13px",
                        }}
                        formatter={(value: number) => [`${value} credits`, "Used"]}
                      />
                      <Bar dataKey="used" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No usage data available for this period.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Credit Store Section */}
        {packages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Buy More Credits
              </CardTitle>
              <CardDescription>
                {canPurchase 
                  ? "Select a package to purchase additional credits"
                  : "Only Company Owners and Company Admins can purchase credits"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sales.length > 0 && (
                <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                  <Sparkles className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800 dark:text-green-200">
                    <strong>{sales[0].name}:</strong> {sales[0].discountPercentage}% off until {new Date(sales[0].endDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-3">
                {packages.map((pkg) => {
                  const { price, discount } = getDiscountedPrice(pkg);
                  const hasDiscount = discount > 0;

                  return (
                    <div key={pkg.id} className="relative p-4 border rounded-lg" data-testid={`package-card-${pkg.id}`}>
                      {hasDiscount && (
                        <Badge className="absolute -top-2 -right-2 bg-green-500">
                          <Tag className="w-3 h-3 mr-1" />
                          Sale
                        </Badge>
                      )}
                      <div className="space-y-2">
                        <h4 className="font-semibold">{pkg.name}</h4>
                        <p className="text-2xl font-bold">
                          {pkg.creditAmount}
                          <span className="text-sm font-normal text-muted-foreground ml-1">credits</span>
                        </p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-medium">${price.toFixed(2)}</span>
                          {hasDiscount && (
                            <span className="text-sm text-muted-foreground line-through">${pkg.price}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ${(price / pkg.creditAmount).toFixed(2)} per credit
                        </p>
                        {sandboxMode ? (
                          <Button
                            className="w-full mt-2"
                            size="sm"
                            variant="secondary"
                            disabled={sandboxPurchaseMutation.isPending}
                            onClick={() => sandboxPurchaseMutation.mutate({ 
                              packageId: pkg.id, 
                              creditAmount: pkg.creditAmount, 
                              price: Math.round(price * 100) 
                            })}
                            data-testid={`button-simulate-buy-${pkg.id}`}
                          >
                            {sandboxPurchaseMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : null}
                            Simulate Purchase
                          </Button>
                        ) : (
                          <Button
                            className="w-full mt-2"
                            size="sm"
                            disabled={!canPurchase || !stripeStatus?.configured || checkoutMutation.isPending}
                            onClick={() => checkoutMutation.mutate(pkg.id)}
                            data-testid={`button-buy-${pkg.id}`}
                          >
                            {checkoutMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : null}
                            {!stripeStatus?.configured ? "Coming Soon" : "Purchase"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : transactions && transactions.length > 0 ? (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${parseFloat(tx.amount) >= 0 ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"}`}>
                        {parseFloat(tx.amount) >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-mono font-medium ${parseFloat(tx.amount) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {parseFloat(tx.amount) >= 0 ? "+" : ""}{tx.amount}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        Balance: {tx.balanceAfter}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No transactions yet.
              </p>
            )}
          </CardContent>
        </Card>
    </>
  );

  if (embedded) {
    return <div className="space-y-6" data-testid="credits-page">{content}</div>;
  }

  return (
    <ClientLayout companyId={companyId}>
      <div className="p-6 space-y-6" data-testid="credits-page">
        {content}
      </div>
    </ClientLayout>
  );
}
