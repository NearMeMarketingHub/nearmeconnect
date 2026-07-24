import { useQuery } from "@tanstack/react-query";
import { CreditCard, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import type { Client, CreditTransaction } from "@shared/schema";

interface CreditsPageProps {
  client: Client;
}

export default function CreditsPage({ client }: CreditsPageProps) {
  const { data: transactions, isLoading } = useQuery<CreditTransaction[]>({
    queryKey: ["/api/credit-transactions", client.id],
  });

  const creditUsagePercent = client.monthlyCredits > 0
    ? Math.round(((client.monthlyCredits - client.credits) / client.monthlyCredits) * 100)
    : 0;

  const creditsUsed = client.monthlyCredits - client.credits;

  const tierConfig: Record<string, { color: string; label: string }> = {
    starter: { color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", label: "Starter" },
    growth: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", label: "Growth" },
    professional: { color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", label: "Professional" },
    enterprise: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", label: "Enterprise" },
  };

  const tier = tierConfig[client.subscriptionTier] || tierConfig.starter;

  return (
    <div className="p-6 space-y-6" data-testid="credits-page">
      <div>
        <h1 className="text-2xl font-bold">Credits</h1>
        <p className="text-muted-foreground">
          Track your credit balance and usage history
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Credit Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-4">
              <p className="text-5xl font-bold font-mono text-primary">
                {client.credits}
              </p>
              <p className="text-muted-foreground mt-1">
                credits available
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Monthly usage</span>
                <span className="font-mono">
                  {creditsUsed} / {client.monthlyCredits}
                </span>
              </div>
              <Progress value={creditUsagePercent} className="h-3" />
              <p className="text-xs text-muted-foreground text-center">
                {creditUsagePercent}% of monthly allocation used
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Subscription</span>
                <Badge className={tier.color}>{tier.label}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monthly Allocation</span>
                <span className="font-mono font-medium">{client.monthlyCredits}</span>
              </div>
              {client.renewalDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Next Renewal</span>
                  <span>{client.renewalDate}</span>
                </div>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">
                Need more credits?
              </p>
              <p className="text-xs text-muted-foreground">
                Contact us to upgrade your subscription plan.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="w-5 h-5" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : transactions && transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id} data-testid={`transaction-${transaction.id}`}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {transaction.type === "debit" ? (
                              <div className="p-1 rounded-full bg-red-100 dark:bg-red-900/30">
                                <ArrowDownRight className="w-3 h-3 text-red-600 dark:text-red-400" />
                              </div>
                            ) : (
                              <div className="p-1 rounded-full bg-green-100 dark:bg-green-900/30">
                                <ArrowUpRight className="w-3 h-3 text-green-600 dark:text-green-400" />
                              </div>
                            )}
                            <span className="truncate max-w-[200px]">
                              {transaction.description}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-mono ${
                              transaction.type === "debit"
                                ? "text-red-600 dark:text-red-400"
                                : "text-green-600 dark:text-green-400"
                            }`}
                          >
                            {transaction.type === "debit" ? "-" : "+"}
                            {Math.abs(Number(transaction.amount))}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {transaction.balanceAfter}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                icon={CreditCard}
                title="No transactions yet"
                description="Your credit transaction history will appear here once you start using credits."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="hover-elevate">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">
                {transactions?.filter((t) => t.type === "credit").reduce((sum, t) => sum + Number(t.amount), 0) || 0}
              </p>
              <p className="text-sm text-muted-foreground">Credits added this month</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
              <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">
                {transactions?.filter((t) => t.type === "debit").reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) || 0}
              </p>
              <p className="text-sm text-muted-foreground">Credits used this month</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
