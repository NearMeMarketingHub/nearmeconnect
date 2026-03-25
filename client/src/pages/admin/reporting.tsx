import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BarChart3, TrendingUp, CreditCard, CheckCircle2, Clock, ListTodo, Building2, Mail, Send, Loader2, Filter, FileEdit, ExternalLink } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "wouter";
import type { Company, MonthlyReportNote } from "@shared/schema";

interface AnalyticsData {
  taskStats: {
    total: number;
    totalInPeriod: number;
    completed: number;
    completedInPeriod: number;
    pending: number;
    inProgress: number;
    completionRate: number;
    avgCompletionTimeHours: number | null;
  };
  creditStats: {
    totalCreditsUsed: number;
    totalCreditsAdded: number;
    transactionCount: number;
    avgCreditsPerTask: number | null;
  };
  companyStats: {
    totalCompanies: number;
    activeCompanies: number;
    avgCreditsPerCompany: number | null;
  };
  timeSeriesData: {
    tasksCompleted: { date: string; count: number }[];
    creditsUsed: { date: string; amount: number }[];
  };
}

export default function AdminReporting() {
  const [dateRange, setDateRange] = useState<string>("30");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const { toast } = useToast();

  const now = new Date();
  const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const [reportMonth, setReportMonth] = useState<number>(lastMonth);
  const [reportYear, setReportYear] = useState<number>(lastMonthYear);

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const sendReportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/monthly-report/send", { year: reportYear, month: reportMonth });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Monthly Reports Sent",
        description: `Sent reports for ${data.companiesSent} companies (${data.totalEmails} emails).${data.errors?.length > 0 ? ` ${data.errors.length} errors occurred.` : ''}`,
      });
    },
    onError: () => {
      toast({
        title: "Failed to Send Reports",
        description: "Something went wrong sending the monthly reports. Please try again.",
        variant: "destructive",
      });
    },
  });

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics", { days: dateRange, companyId: selectedCompanyId }],
    queryFn: async () => {
      const params = new URLSearchParams({ days: dateRange });
      if (selectedCompanyId !== "all") params.set("companyId", selectedCompanyId);
      const response = await fetch(`/api/admin/analytics?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
  });

  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    loading 
  }: { 
    title: string; 
    value: string | number; 
    description?: string; 
    icon: React.ElementType; 
    loading: boolean;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <>
            <div className="text-2xl font-bold font-mono" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );

  const TimeSeriesLineChart = ({ 
    data, 
    valueKey, 
    labelKey, 
    title,
    loading,
    color = "hsl(var(--primary))"
  }: { 
    data: { [key: string]: any }[];
    valueKey: string;
    labelKey: string;
    title: string;
    loading: boolean;
    color?: string;
  }) => {
    if (loading) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      );
    }

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr + "T00:00:00");
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    const chartData = data.map(item => ({
      ...item,
      formattedDate: formatDate(item[labelKey]),
    }));

    const maxTickCount = data.length <= 14 ? data.length : 10;

    const AnimatedDot = (props: any) => {
      const { cx, cy, index, fill, stroke } = props;
      if (cx == null || cy == null) return null;
      const baseDelay = 0.6;
      const stagger = 0.04;
      const delay = baseDelay + index * stagger;
      return (
        <circle
          cx={cx}
          cy={cy}
          r={3}
          fill={fill || stroke || color}
          stroke="hsl(var(--card))"
          strokeWidth={2}
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            animation: `dotPopIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s both`,
          }}
        />
      );
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No data available for this period
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="formattedDate" 
                    tick={{ fontSize: 11 }}
                    interval={Math.max(0, Math.floor(data.length / maxTickCount) - 1)}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    allowDecimals={false}
                    className="text-muted-foreground"
                    width={40}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey={valueKey} 
                    stroke={color}
                    strokeWidth={2}
                    dot={data.length <= 31 ? (props: any) => <AnimatedDot {...props} /> : false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Reporting & Analytics
            </h1>
            <p className="text-muted-foreground">
              Overview of tasks, credits, and company activity
            </p>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label htmlFor="company-filter" className="text-sm text-muted-foreground">Company:</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger id="company-filter" className="w-48" data-testid="select-company-filter">
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies?.sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="date-range" className="text-sm text-muted-foreground">Time Period:</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger id="date-range" className="w-36" data-testid="select-date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Tasks"
            value={analytics?.taskStats.total || 0}
            description={`${analytics?.taskStats.totalInPeriod || 0} created in period`}
            icon={ListTodo}
            loading={isLoading}
          />
          <StatCard
            title="Completed"
            value={analytics?.taskStats.completedInPeriod || 0}
            description={`${analytics?.taskStats.completed || 0} all time`}
            icon={CheckCircle2}
            loading={isLoading}
          />
          <StatCard
            title="Credits Used"
            value={(analytics?.creditStats.totalCreditsUsed || 0).toLocaleString()}
            description={`${analytics?.creditStats.transactionCount || 0} transactions`}
            icon={CreditCard}
            loading={isLoading}
          />
          <StatCard
            title="Active Companies"
            value={analytics?.companyStats.activeCompanies || 0}
            description={`of ${analytics?.companyStats.totalCompanies || 0} total`}
            icon={Building2}
            loading={isLoading}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Pending Tasks"
            value={analytics?.taskStats.pending || 0}
            description="Awaiting action"
            icon={Clock}
            loading={isLoading}
          />
          <StatCard
            title="In Progress"
            value={analytics?.taskStats.inProgress || 0}
            description="Currently being worked on"
            icon={TrendingUp}
            loading={isLoading}
          />
        </div>

        <div className="grid gap-4">
          <TimeSeriesLineChart
            data={analytics?.timeSeriesData.tasksCompleted || []}
            valueKey="count"
            labelKey="date"
            title="Tasks Completed Over Time"
            loading={isLoading}
            color="hsl(var(--primary))"
          />
          <TimeSeriesLineChart
            data={analytics?.timeSeriesData.creditsUsed || []}
            valueKey="amount"
            labelKey="date"
            title="Credits Used Over Time"
            loading={isLoading}
            color="hsl(var(--chart-2))"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Monthly Client Reports
            </CardTitle>
            <CardDescription>
              Send monthly summary reports to Company Owners, Company Admins, and Agency Admins. Reports include completed tasks, deliverables, credits used, purchases, campaigns, and meetings with notes. Reports are automatically sent on the 1st of each month at 8:00 AM ET.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 flex-wrap">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Month</Label>
                <Select value={String(reportMonth)} onValueChange={(v) => setReportMonth(parseInt(v))}>
                  <SelectTrigger className="w-36" data-testid="select-report-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((name, i) => (
                      <SelectItem key={i} value={String(i)}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Year</Label>
                <Select value={String(reportYear)} onValueChange={(v) => setReportYear(parseInt(v))}>
                  <SelectTrigger className="w-28" data-testid="select-report-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[now.getFullYear() - 1, now.getFullYear()].map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => sendReportMutation.mutate()}
                disabled={sendReportMutation.isPending}
                data-testid="button-send-monthly-report"
              >
                {sendReportMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {sendReportMutation.isPending ? "Sending..." : "Send Reports Now"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <ReportNotesOverview companies={companies || []} reportMonth={reportMonth} reportYear={reportYear} />
      </div>
    </AdminLayout>
  );
}

function ReportNotesOverview({ companies, reportMonth, reportYear }: { companies: Company[]; reportMonth: number; reportYear: number }) {
  const month = reportMonth + 1;
  const year = reportYear;
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const { data: allNotes, isLoading } = useQuery<MonthlyReportNote[]>({
    queryKey: ["/api/admin/report-notes", month, year],
    queryFn: async () => {
      const res = await fetch(`/api/admin/report-notes?month=${month}&year=${year}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const notedCompanyIds = new Set((allNotes || []).map(n => n.companyId));
  const activeCompanies = companies.filter(c => !c.isPaused);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileEdit className="w-4 h-4" />
          Report Notes Status — {monthNames[reportMonth]} {reportYear}
        </CardTitle>
        <CardDescription>
          Admin notes that will be included in the &quot;Notes from Your Team&quot; section of each company&apos;s monthly report.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : activeCompanies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active companies</p>
        ) : (
          <div className="space-y-2">
            {activeCompanies.map(company => {
              const hasNotes = notedCompanyIds.has(company.id);
              return (
                <div key={company.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`report-notes-status-${company.id}`}>
                  <div className="flex items-center gap-3">
                    {hasNotes ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="font-medium text-sm">{company.name}</span>
                    {hasNotes ? (
                      <Badge variant="secondary" className="text-xs">Notes added</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">No notes yet</Badge>
                    )}
                  </div>
                  <Link href={`/admin/companies/${company.id}?tab=reporting`}>
                    <Button variant="ghost" size="sm" data-testid={`button-go-to-company-notes-${company.id}`}>
                      <ExternalLink className="w-3 h-3 mr-1" />
                      {hasNotes ? "Edit" : "Add Notes"}
                    </Button>
                  </Link>
                </div>
              );
            })}
            <div className="pt-2 text-xs text-muted-foreground">
              {notedCompanyIds.size} of {activeCompanies.length} companies have notes for this month
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
