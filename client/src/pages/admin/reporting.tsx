import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  BarChart3, TrendingUp, CreditCard, CheckCircle2, Clock, ListTodo, Building2,
  Mail, Send, Loader2, Filter, FileEdit, ExternalLink, Download, Save, Trash2,
  CalendarDays, ChevronDown, Users, Tag, RefreshCw, Star, Wifi, WifiOff,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Link } from "wouter";
import type { Company, MonthlyReportNote, ReportPreset, TaskCategory, ContentPillar } from "@shared/schema";

// ── Types ────────────────────────────────────────────────────────────────────

type DatePreset = "today" | "week" | "month" | "last_month" | "quarter" | "custom";

interface ReportFilters {
  preset: DatePreset;
  from: string;
  to: string;
  companies: string[];
  assignedTo: string[];
  statuses: string[];
  categories: string[];
  platforms: string[];
}

interface AdminUser { userId: string; name: string; email: string; }

interface TasksReportData {
  total: number; completed: number; overdue: number; onTime: number; late: number;
  avgCompletionHours: number | null; creditConsumption: number; overdueRate: number;
  byAssignee: { name: string; assigned: number; completed: number }[];
  byCompany: { name: string; total: number; completed: number; overdue: number }[];
  byCategory: { name: string; count: number }[];
  weeklyTimeSeries: { week: string; count: number }[];
  dateRange: { from: string; to: string };
}

interface ContentReportData {
  total: number;
  byStatus: Record<string, number>;
  byPlatform: Record<string, number>;
  byPillar: { name: string; count: number }[];
  gbpByType: Record<string, number>;
  avgPerDay: number; avgPerWeek: number;
  dateRange: { from: string; to: string };
}

interface CompanyReportData {
  scorecard: { id: string; name: string; subscriptionTier: string; onboardingComplete: boolean; hubspotConnected: boolean; tasksCreated: number; completed: number; overdue: number; creditsUsed: number }[];
  dateRange: { from: string; to: string };
}

interface CreditsReportData {
  total: number; totalDebited: number; totalCredited: number; net: number;
  byType: { type: string; amount: number }[];
  byCompany: { name: string; debited: number; credited: number; count: number }[];
  weeklyTimeSeries: { week: string; debited: number; credited: number }[];
  dateRange: { from: string; to: string };
}

interface AnalyticsData {
  taskStats: { total: number; totalInPeriod: number; completed: number; completedInPeriod: number; pending: number; inProgress: number; completionRate: number; avgCompletionTimeHours: number | null };
  creditStats: { totalCreditsUsed: number; totalCreditsAdded: number; transactionCount: number; avgCreditsPerTask: number | null };
  companyStats: { totalCompanies: number; activeCompanies: number; avgCreditsPerCompany: number | null };
  timeSeriesData: { tasksCompleted: { date: string; count: number }[]; creditsUsed: { date: string; amount: number }[] };
}

// ── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_LABELS: Record<string, string> = {
  google_business: "Google Business", facebook: "Facebook", instagram: "Instagram",
  linkedin: "LinkedIn", email: "Email", blog: "Blog", other: "Other",
};

const CHART_COLORS = ["hsl(var(--primary))", "#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

const PRESET_LABELS: Record<DatePreset, string> = {
  today: "Today", week: "This Week", month: "This Month",
  last_month: "Last Month", quarter: "This Quarter", custom: "Custom",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function defaultFilters(): ReportFilters {
  return { preset: "month", from: "", to: "", companies: [], assignedTo: [], statuses: [], categories: [], platforms: [] };
}

function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function filtersToParams(filters: ReportFilters): URLSearchParams {
  const p = new URLSearchParams({ preset: filters.preset });
  if (filters.preset === "custom") { if (filters.from) p.set("from", filters.from); if (filters.to) p.set("to", filters.to); }
  if (filters.companies.length) p.set("companies", filters.companies.join(","));
  if (filters.assignedTo.length) p.set("assignedTo", filters.assignedTo.join(","));
  if (filters.statuses.length) p.set("statuses", filters.statuses.join(","));
  if (filters.categories.length) p.set("categories", filters.categories.join(","));
  if (filters.platforms.length) p.set("platforms", filters.platforms.join(","));
  return p;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DateRangeSelector({ filters, onChange }: { filters: ReportFilters; onChange: (f: Partial<ReportFilters>) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {(Object.keys(PRESET_LABELS) as DatePreset[]).map(p => (
        <Button key={p} variant={filters.preset === p ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => onChange({ preset: p })} data-testid={`preset-${p}`}>
          {PRESET_LABELS[p]}
        </Button>
      ))}
      {filters.preset === "custom" && (
        <>
          <Input type="date" className="h-7 text-xs w-36" value={filters.from} onChange={e => onChange({ from: e.target.value })} data-testid="input-date-from" />
          <span className="text-muted-foreground text-xs">to</span>
          <Input type="date" className="h-7 text-xs w-36" value={filters.to} onChange={e => onChange({ to: e.target.value })} data-testid="input-date-to" />
        </>
      )}
    </div>
  );
}

function MultiSelectFilter({ label, options, value, onChange, testId }: {
  label: string; options: { id: string; name: string }[]; value: string[];
  onChange: (v: string[]) => void; testId?: string;
}) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" data-testid={testId}>
          <Filter className="h-3 w-3" />
          {label}
          {value.length > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px]">{value.length}</Badge>}
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {options.length === 0 ? (
            <p className="text-xs text-muted-foreground p-1">No options available</p>
          ) : options.map(opt => (
            <label key={opt.id} className="flex items-center gap-2 p-1 rounded hover:bg-muted/50 cursor-pointer text-xs">
              <Checkbox checked={value.includes(opt.id)} onCheckedChange={() => toggle(opt.id)} />
              <span className="truncate">{opt.name}</span>
            </label>
          ))}
        </div>
        {value.length > 0 && (
          <Button variant="ghost" size="sm" className="w-full h-6 text-[10px] mt-1" onClick={() => onChange([])}>Clear all</Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className={`text-2xl font-bold font-mono ${color || ""}`}>{value}</p>
        <p className="text-xs font-medium mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function SimpleBarChart({ data, dataKey, nameKey, title, color }: { data: { [k: string]: any }[]; dataKey: string; nameKey: string; title: string; color?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? <p className="text-xs text-muted-foreground py-4 text-center">No data</p> : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey={nameKey} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11, backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6 }} />
                <Bar dataKey={dataKey} fill={color || "hsl(var(--primary))"} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SimplePieChart({ data, title }: { data: { name: string; value: number }[]; title: string }) {
  const filtered = data.filter(d => d.value > 0);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        {filtered.length === 0 ? <p className="text-xs text-muted-foreground py-4 text-center">No data</p> : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={filtered} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {filtered.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SimpleLineChart({ data, dataKey, xKey, title, color }: { data: { [k: string]: any }[]; dataKey: string; xKey: string; title: string; color?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? <p className="text-xs text-muted-foreground py-4 text-center">No data</p> : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11, backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6 }} />
                <Line type="monotone" dataKey={dataKey} stroke={color || "hsl(var(--primary))"} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Tasks Report ──────────────────────────────────────────────────────────────

function TasksReport({ filters, companies, adminUsers, categories }: {
  filters: ReportFilters; companies: Company[]; adminUsers: AdminUser[]; categories: TaskCategory[];
}) {
  const params = filtersToParams(filters);
  const { data, isLoading } = useQuery<TasksReportData>({
    queryKey: ["/api/admin/reports/tasks", params.toString()],
    queryFn: async () => {
      const r = await fetch(`/api/admin/reports/tasks?${params}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  if (isLoading) return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  if (!data) return null;

  const categoryPieData = data.byCategory.slice(0, 8).map(c => ({ name: c.name, value: c.count }));
  const weeklyBarData = data.weeklyTimeSeries.map(w => ({ ...w, week: w.week.substring(5) }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">Period: {data.dateRange.from} → {data.dateRange.to}</p>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => downloadCSV(data.byCompany as any, "tasks-report.csv")} data-testid="btn-export-tasks">
          <Download className="h-3 w-3" /> Export CSV
        </Button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Total Tasks" value={data.total} />
        <MetricCard label="Completed" value={data.completed} sub={`${data.onTime} on time, ${data.late} late`} color="text-green-600 dark:text-green-400" />
        <MetricCard label="Overdue" value={data.overdue} sub={`${data.overdueRate}% overdue rate`} color={data.overdue > 0 ? "text-destructive" : ""} />
        <MetricCard label="Credits Used" value={data.creditConsumption} sub="from completed tasks" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MetricCard label="Avg Completion Time" value={data.avgCompletionHours ? `${Math.round(data.avgCompletionHours)}h` : "—"} sub="created → completed" />
        <MetricCard label="On-Time Rate" value={data.completed > 0 ? `${Math.round((data.onTime / data.completed) * 100)}%` : "—"} sub="of completed tasks" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <SimplePieChart data={categoryPieData} title="Tasks by Category" />
        <SimpleBarChart data={weeklyBarData} dataKey="count" nameKey="week" title="Task Volume by Week" />
      </div>

      {/* By Assignee table */}
      {data.byAssignee.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><Users className="h-4 w-4" />By Team Member</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead><tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Person</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Assigned</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Completed</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Rate</th>
              </tr></thead>
              <tbody>
                {data.byAssignee.map((a, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 font-medium">{a.name}</td>
                    <td className="p-3 text-center font-mono">{a.assigned}</td>
                    <td className="p-3 text-center font-mono text-green-600 dark:text-green-400">{a.completed}</td>
                    <td className="p-3 text-center font-mono">{a.assigned > 0 ? `${Math.round((a.completed / a.assigned) * 100)}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* By Company table */}
      {data.byCompany.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><Building2 className="h-4 w-4" />By Company</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead><tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Company</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Total</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Completed</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Overdue</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Rate</th>
              </tr></thead>
              <tbody>
                {data.byCompany.map((c, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3 text-center font-mono">{c.total}</td>
                    <td className="p-3 text-center font-mono text-green-600 dark:text-green-400">{c.completed}</td>
                    <td className="p-3 text-center font-mono text-destructive">{c.overdue}</td>
                    <td className="p-3 text-center font-mono">{c.total > 0 ? `${Math.round((c.completed / c.total) * 100)}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Content Report ────────────────────────────────────────────────────────────

function ContentReport({ filters, companies, pillars }: { filters: ReportFilters; companies: Company[]; pillars: ContentPillar[] }) {
  const params = filtersToParams(filters);
  const { data, isLoading } = useQuery<ContentReportData>({
    queryKey: ["/api/admin/reports/content", params.toString()],
    queryFn: async () => {
      const r = await fetch(`/api/admin/reports/content?${params}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  if (isLoading) return <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  if (!data) return null;

  const platformData = Object.entries(data.byPlatform).filter(([, v]) => v > 0).map(([k, v]) => ({ name: PLATFORM_LABELS[k] || k, value: v }));
  const statusData = Object.entries(data.byStatus).filter(([, v]) => v > 0).map(([k, v]) => ({ name: k.replace("_", " "), value: v }));
  const gbpData = Object.entries(data.gbpByType).filter(([, v]) => v > 0).map(([k, v]) => ({ name: k, value: v }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">Period: {data.dateRange.from} → {data.dateRange.to}</p>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => downloadCSV(data.byPillar as any, "content-report.csv")} data-testid="btn-export-content">
          <Download className="h-3 w-3" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Content Items" value={data.total} />
        <MetricCard label="Published" value={data.byStatus.published || 0} color="text-green-600 dark:text-green-400" />
        <MetricCard label="Scheduled" value={data.byStatus.scheduled || 0} color="text-blue-600 dark:text-blue-400" />
        <MetricCard label="Draft" value={data.byStatus.draft || 0} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MetricCard label="Avg Posts/Day" value={data.avgPerDay} />
        <MetricCard label="Avg Posts/Week" value={data.avgPerWeek} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SimplePieChart data={platformData} title="By Platform" />
        <SimplePieChart data={statusData} title="By Status" />
      </div>

      {data.byPillar.length > 0 && (
        <SimpleBarChart data={data.byPillar.slice(0, 8)} dataKey="count" nameKey="name" title="By Content Pillar" color="#8b5cf6" />
      )}

      {gbpData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Google Business Profile — Post Types</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {gbpData.map(d => <MetricCard key={d.name} label={d.name.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())} value={d.value} />)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Company Report ────────────────────────────────────────────────────────────

function CompanyReport({ filters }: { filters: ReportFilters }) {
  const params = filtersToParams(filters);
  const { data, isLoading } = useQuery<CompanyReportData>({
    queryKey: ["/api/admin/reports/companies", params.toString()],
    queryFn: async () => {
      const r = await fetch(`/api/admin/reports/companies?${params}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">Period: {data.dateRange.from} → {data.dateRange.to}</p>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => downloadCSV(data.scorecard as any, "company-report.csv")} data-testid="btn-export-companies">
          <Download className="h-3 w-3" /> Export CSV
        </Button>
      </div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">Company</th>
              <th className="text-center p-3 font-medium text-muted-foreground">Tasks Created</th>
              <th className="text-center p-3 font-medium text-muted-foreground">Completed</th>
              <th className="text-center p-3 font-medium text-muted-foreground">Overdue</th>
              <th className="text-center p-3 font-medium text-muted-foreground hidden md:table-cell">Credits Used</th>
              <th className="text-center p-3 font-medium text-muted-foreground hidden lg:table-cell">HubSpot</th>
              <th className="text-center p-3 font-medium text-muted-foreground hidden lg:table-cell">Onboarding</th>
            </tr></thead>
            <tbody>
              {data.scorecard.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20 cursor-pointer" onClick={() => window.location.href = `/admin/companies/${c.id}`} data-testid={`company-score-${c.id}`}>
                  <td className="p-3">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{c.subscriptionTier}</p>
                  </td>
                  <td className="p-3 text-center font-mono">{c.tasksCreated}</td>
                  <td className="p-3 text-center font-mono text-green-600 dark:text-green-400">{c.completed}</td>
                  <td className="p-3 text-center font-mono">
                    {c.overdue > 0 ? <span className="text-destructive font-semibold">{c.overdue}</span> : <span className="text-muted-foreground">0</span>}
                  </td>
                  <td className="p-3 text-center font-mono hidden md:table-cell">{c.creditsUsed}</td>
                  <td className="p-3 text-center hidden lg:table-cell">
                    {c.hubspotConnected ? <Wifi className="h-3.5 w-3.5 text-green-500 mx-auto" /> : <WifiOff className="h-3.5 w-3.5 text-muted-foreground mx-auto" />}
                  </td>
                  <td className="p-3 text-center hidden lg:table-cell">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.onboardingComplete ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"}`}>
                      {c.onboardingComplete ? "Complete" : "Incomplete"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Credits Report ────────────────────────────────────────────────────────────

function CreditsReport({ filters, companies }: { filters: ReportFilters; companies: Company[] }) {
  const params = filtersToParams(filters);
  const { data, isLoading } = useQuery<CreditsReportData>({
    queryKey: ["/api/admin/reports/credits", params.toString()],
    queryFn: async () => {
      const r = await fetch(`/api/admin/reports/credits?${params}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  if (isLoading) return <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  if (!data) return null;

  const typeData = data.byType.map(t => ({ name: t.type.replace(/_/g, " "), count: t.amount }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">Period: {data.dateRange.from} → {data.dateRange.to}</p>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => downloadCSV(data.byCompany as any, "credits-report.csv")} data-testid="btn-export-credits">
          <Download className="h-3 w-3" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Transactions" value={data.total} />
        <MetricCard label="Credits Used" value={data.totalDebited} color="text-destructive" />
        <MetricCard label="Credits Added" value={data.totalCredited} color="text-green-600 dark:text-green-400" />
        <MetricCard label="Net" value={data.net} color={data.net >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SimpleBarChart data={typeData} dataKey="count" nameKey="name" title="Credits by Transaction Type" color="#f97316" />
        <SimpleLineChart data={data.weeklyTimeSeries.map(w => ({ ...w, week: w.week.substring(5) }))} dataKey="debited" xKey="week" title="Weekly Credits Used" color="hsl(var(--primary))" />
      </div>

      {data.byCompany.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Credits by Company</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead><tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Company</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Transactions</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Used</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Added</th>
              </tr></thead>
              <tbody>
                {data.byCompany.map((c, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3 text-center font-mono">{c.count}</td>
                    <td className="p-3 text-center font-mono text-destructive">{c.debited}</td>
                    <td className="p-3 text-center font-mono text-green-600 dark:text-green-400">{c.credited}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── HubSpot Report stub ───────────────────────────────────────────────────────

function HubSpotReport({ filters }: { filters: ReportFilters }) {
  return (
    <Card>
      <CardContent className="py-12 text-center space-y-3">
        <Wifi className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
        <p className="font-medium text-muted-foreground">HubSpot Report</p>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Contacts created, deals closed, email campaign performance, and social post metrics for companies with a connected HubSpot account.
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/companies">View Connected Companies</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Saved Presets Panel ───────────────────────────────────────────────────────

function SavePresetModal({ open, onClose, reportType, filters }: {
  open: boolean; onClose: () => void; reportType: string; filters: ReportFilters;
}) {
  const [name, setName] = useState("");
  const [schedFreq, setSchedFreq] = useState("");
  const [schedEmails, setSchedEmails] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/report-presets", {
        name,
        reportType,
        filters: { ...filters },
        scheduledFrequency: schedFreq || null,
        scheduledEmails: schedEmails || null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Preset saved" });
      qc.invalidateQueries({ queryKey: ["/api/admin/report-presets"] });
      onClose();
      setName(""); setSchedFreq(""); setSchedEmails("");
    },
    onError: () => toast({ title: "Failed to save preset", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Save Report Preset</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-sm">Preset Name</Label>
            <Input placeholder="e.g. Monthly Tasks Overview" value={name} onChange={e => setName(e.target.value)} data-testid="input-preset-name" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Scheduled Email <span className="text-muted-foreground">(optional)</span></Label>
            <Select value={schedFreq} onValueChange={setSchedFreq}>
              <SelectTrigger data-testid="select-schedule-freq"><SelectValue placeholder="No schedule" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">No schedule</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {schedFreq && (
            <div className="space-y-1">
              <Label className="text-sm">Send To (comma-separated emails)</Label>
              <Input placeholder="admin@example.com, team@example.com" value={schedEmails} onChange={e => setSchedEmails(e.target.value)} data-testid="input-schedule-emails" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!name.trim() || mutation.isPending} data-testid="btn-save-preset-confirm">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save Preset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SavedPresetsList({ onLoad }: { onLoad: (preset: ReportPreset) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: presets = [], isLoading } = useQuery<ReportPreset[]>({ queryKey: ["/api/admin/report-presets"] });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/admin/report-presets/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/report-presets"] }); toast({ title: "Preset deleted" }); },
  });

  if (isLoading) return <Skeleton className="h-20 w-full" />;
  if (presets.length === 0) return <p className="text-xs text-muted-foreground text-center py-4">No saved presets yet</p>;

  return (
    <div className="space-y-2">
      {presets.map(p => (
        <div key={p.id} className="flex items-center gap-2 p-2 rounded-md border hover:bg-muted/30 transition-colors" data-testid={`preset-item-${p.id}`}>
          <Star className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{p.name}</p>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="capitalize">{p.reportType}</span>
              {p.scheduledFrequency && <Badge variant="outline" className="text-[9px] h-3.5 px-1">{p.scheduledFrequency}</Badge>}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onLoad(p)} data-testid={`btn-load-preset-${p.id}`}>Load</Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(p.id)} data-testid={`btn-delete-preset-${p.id}`}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}

// ── Analytics Overview ────────────────────────────────────────────────────────

function AnalyticsOverview() {
  const [dateRange, setDateRange] = useState("30");
  const [selectedCompanyId, setSelectedCompanyId] = useState("all");

  const { data: companies } = useQuery<Company[]>({ queryKey: ["/api/companies"] });

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics", { days: dateRange, companyId: selectedCompanyId }],
    queryFn: async () => {
      const p = new URLSearchParams({ days: dateRange });
      if (selectedCompanyId !== "all") p.set("companyId", selectedCompanyId);
      const r = await fetch(`/api/admin/analytics?${p}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const formatDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Company:</Label>
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger className="w-44 h-8 text-xs" data-testid="select-company-filter">
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
          <Label className="text-xs text-muted-foreground">Period:</Label>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32 h-8 text-xs" data-testid="select-date-range">
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total Tasks", value: analytics?.taskStats?.total || 0, sub: `${analytics?.taskStats?.totalInPeriod || 0} created in period`, icon: ListTodo },
          { title: "Completed", value: analytics?.taskStats?.completedInPeriod || 0, sub: `${analytics?.taskStats?.completed || 0} all time`, icon: CheckCircle2 },
          { title: "Credits Used", value: (analytics?.creditStats?.totalCreditsUsed || 0).toLocaleString(), sub: `${analytics?.creditStats?.transactionCount || 0} transactions`, icon: CreditCard },
          { title: "Active Companies", value: analytics?.companyStats?.activeCompanies || 0, sub: `of ${analytics?.companyStats?.totalCompanies || 0} total`, icon: Building2 },
        ].map(({ title, value, sub, icon: Icon }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <>
                  <div className="text-2xl font-bold font-mono" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>{value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Tasks Completed Over Time</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics?.timeSeriesData?.tasksCompleted?.map(d => ({ ...d, date: formatDate(d.date) })) || []} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={Math.max(0, Math.floor((analytics?.timeSeriesData?.tasksCompleted?.length || 0) / 10) - 1)} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Credits Used Over Time</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics?.timeSeriesData?.creditsUsed?.map(d => ({ ...d, date: formatDate(d.date) })) || []} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={Math.max(0, Math.floor((analytics?.timeSeriesData?.creditsUsed?.length || 0) / 10) - 1)} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
                    <Line type="monotone" dataKey="amount" stroke="hsl(var(--chart-2, #f97316))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminReporting() {
  const [mainTab, setMainTab] = useState("builder");
  const [reportType, setReportType] = useState<"tasks" | "content" | "companies" | "credits" | "hubspot">("tasks");
  const [filters, setFilters] = useState<ReportFilters>(defaultFilters());
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);

  const now = new Date();
  const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const [reportMonth, setReportMonth] = useState(lastMonth);
  const [reportYear, setReportYear] = useState(lastMonthYear);
  const { toast } = useToast();
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const sendReportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/monthly-report/send", { year: reportYear, month: reportMonth });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Monthly Reports Sent", description: `Sent for ${data.companiesSent} companies (${data.totalEmails} emails).` });
    },
    onError: () => toast({ title: "Failed to Send Reports", variant: "destructive" }),
  });

  // Shared data for filters
  const { data: companies = [] } = useQuery<Company[]>({ queryKey: ["/api/companies"] });
  const { data: adminUsers = [] } = useQuery<{ userId: string; name: string; email: string }[]>({
    queryKey: ["/api/admin/workload"],
    queryFn: async () => {
      const r = await fetch("/api/admin/workload", { credentials: "include" });
      const data = await r.json();
      return Array.isArray(data) ? data.map((d: any) => ({ userId: d.userId, name: d.name, email: d.email })) : [];
    },
  });
  const { data: categories = [] } = useQuery<TaskCategory[]>({
    queryKey: ["/api/task-categories-all"],
    queryFn: async () => {
      const r = await fetch("/api/tasks", { credentials: "include" });
      return [];
    },
  });
  const { data: pillars = [] } = useQuery<ContentPillar[]>({ queryKey: ["/api/content-pillars"] });

  const updateFilters = useCallback((patch: Partial<ReportFilters>) => {
    setFilters(prev => ({ ...prev, ...patch }));
  }, []);

  const loadPreset = useCallback((preset: ReportPreset) => {
    try {
      const f = JSON.parse(preset.filters) as ReportFilters;
      setFilters(f);
      setReportType(preset.reportType as any);
      setMainTab("builder");
      setPresetsOpen(false);
      toast({ title: `Loaded preset: ${preset.name}` });
    } catch { toast({ title: "Failed to load preset", variant: "destructive" }); }
  }, [toast]);

  const companyOptions = companies.map(c => ({ id: c.id, name: c.name }));
  const assigneeOptions = adminUsers.map(u => ({ id: u.userId, name: u.name || u.email }));
  const statusOptions = [
    { id: "pending", name: "Pending" }, { id: "in_progress", name: "In Progress" },
    { id: "review", name: "Review" }, { id: "approved", name: "Approved" },
    { id: "completed", name: "Completed" }, { id: "rejected", name: "Rejected" },
  ];
  const platformOptions = Object.entries(PLATFORM_LABELS).map(([id, name]) => ({ id, name }));

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Reporting & Analytics
            </h1>
            <p className="text-muted-foreground text-sm">Custom date ranges, cross-client reports, and saved presets</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => setPresetsOpen(!presetsOpen)} data-testid="btn-my-presets">
              <Star className="h-3.5 w-3.5" />
              My Saved Reports
            </Button>
            {mainTab === "builder" && (
              <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => setSaveModalOpen(true)} data-testid="btn-save-report">
                <Save className="h-3.5 w-3.5" />
                Save This Report
              </Button>
            )}
          </div>
        </div>

        {/* Saved Presets Panel */}
        {presetsOpen && (
          <Card data-testid="saved-presets-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Star className="h-4 w-4 text-yellow-500" />My Saved Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <SavedPresetsList onLoad={loadPreset} />
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs value={mainTab} onValueChange={setMainTab} data-testid="reporting-main-tabs">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="builder" className="gap-1.5 text-xs" data-testid="tab-builder">
              <Filter className="h-3.5 w-3.5" />
              Report Builder
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 text-xs" data-testid="tab-analytics">
              <TrendingUp className="h-3.5 w-3.5" />
              Quick Analytics
            </TabsTrigger>
            <TabsTrigger value="monthly" className="gap-1.5 text-xs" data-testid="tab-monthly">
              <Mail className="h-3.5 w-3.5" />
              Monthly Reports
            </TabsTrigger>
          </TabsList>

          {/* ── Report Builder Tab ── */}
          <TabsContent value="builder" className="mt-4 space-y-4">
            {/* Date Range */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Date Range</span>
                </div>
                <DateRangeSelector filters={filters} onChange={updateFilters} />
              </CardContent>
            </Card>

            {/* Report Type Tabs */}
            <Tabs value={reportType} onValueChange={v => setReportType(v as any)} data-testid="report-type-tabs">
              <div className="flex flex-wrap items-center gap-3">
                <TabsList className="h-auto flex-wrap gap-1">
                  <TabsTrigger value="tasks" className="text-xs gap-1" data-testid="tab-report-tasks"><ListTodo className="h-3.5 w-3.5" />Tasks</TabsTrigger>
                  <TabsTrigger value="content" className="text-xs gap-1" data-testid="tab-report-content"><BarChart3 className="h-3.5 w-3.5" />Content</TabsTrigger>
                  <TabsTrigger value="companies" className="text-xs gap-1" data-testid="tab-report-companies"><Building2 className="h-3.5 w-3.5" />Company</TabsTrigger>
                  <TabsTrigger value="credits" className="text-xs gap-1" data-testid="tab-report-credits"><CreditCard className="h-3.5 w-3.5" />Credits</TabsTrigger>
                  <TabsTrigger value="hubspot" className="text-xs gap-1" data-testid="tab-report-hubspot"><Wifi className="h-3.5 w-3.5" />HubSpot</TabsTrigger>
                </TabsList>

                {/* Filters row */}
                <div className="flex flex-wrap gap-2">
                  <MultiSelectFilter label="Company" options={companyOptions} value={filters.companies} onChange={v => updateFilters({ companies: v })} testId="filter-companies" />
                  {(reportType === "tasks") && (
                    <>
                      <MultiSelectFilter label="Assigned To" options={assigneeOptions} value={filters.assignedTo} onChange={v => updateFilters({ assignedTo: v })} testId="filter-assignees" />
                      <MultiSelectFilter label="Status" options={statusOptions} value={filters.statuses} onChange={v => updateFilters({ statuses: v })} testId="filter-statuses" />
                    </>
                  )}
                  {(reportType === "content") && (
                    <MultiSelectFilter label="Platform" options={platformOptions} value={filters.platforms} onChange={v => updateFilters({ platforms: v })} testId="filter-platforms" />
                  )}
                  {(filters.companies.length > 0 || filters.assignedTo.length > 0 || filters.statuses.length > 0 || filters.platforms.length > 0) && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => setFilters(prev => ({ ...prev, companies: [], assignedTo: [], statuses: [], platforms: [] }))}>
                      <RefreshCw className="h-3 w-3" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <TabsContent value="tasks"><TasksReport filters={filters} companies={companies} adminUsers={adminUsers} categories={categories} /></TabsContent>
                <TabsContent value="content"><ContentReport filters={filters} companies={companies} pillars={pillars} /></TabsContent>
                <TabsContent value="companies"><CompanyReport filters={filters} /></TabsContent>
                <TabsContent value="credits"><CreditsReport filters={filters} companies={companies} /></TabsContent>
                <TabsContent value="hubspot"><HubSpotReport filters={filters} /></TabsContent>
              </div>
            </Tabs>
          </TabsContent>

          {/* ── Quick Analytics Tab ── */}
          <TabsContent value="analytics" className="mt-4">
            <AnalyticsOverview />
          </TabsContent>

          {/* ── Monthly Reports Tab ── */}
          <TabsContent value="monthly" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Mail className="w-4 h-4" />Monthly Client Reports</CardTitle>
                <CardDescription>
                  Send monthly summary reports to Company Owners, Company Admins, and Agency Admins. Reports are automatically sent on the 1st of each month at 8:00 AM ET.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3 flex-wrap">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Month</Label>
                    <Select value={String(reportMonth)} onValueChange={v => setReportMonth(parseInt(v))}>
                      <SelectTrigger className="w-36" data-testid="select-report-month"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {monthNames.map((name, i) => <SelectItem key={i} value={String(i)}>{name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Year</Label>
                    <Select value={String(reportYear)} onValueChange={v => setReportYear(parseInt(v))}>
                      <SelectTrigger className="w-28" data-testid="select-report-year"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[now.getFullYear() - 1, now.getFullYear()].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => sendReportMutation.mutate()} disabled={sendReportMutation.isPending} data-testid="button-send-monthly-report">
                    {sendReportMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    {sendReportMutation.isPending ? "Sending..." : "Send Reports Now"}
                  </Button>
                </div>
              </CardContent>
            </Card>
            <ReportNotesOverview companies={companies} reportMonth={reportMonth} reportYear={reportYear} />
          </TabsContent>
        </Tabs>

        {/* Save Preset Modal */}
        <SavePresetModal
          open={saveModalOpen}
          onClose={() => setSaveModalOpen(false)}
          reportType={reportType}
          filters={filters}
        />
      </div>
    </AdminLayout>
  );
}

// ── Report Notes Overview (unchanged) ────────────────────────────────────────

function ReportNotesOverview({ companies, reportMonth, reportYear }: { companies: Company[]; reportMonth: number; reportYear: number }) {
  const month = reportMonth + 1;
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const { data: allNotes, isLoading } = useQuery<MonthlyReportNote[]>({
    queryKey: ["/api/admin/report-notes", month, reportYear],
    queryFn: async () => {
      const r = await fetch(`/api/admin/report-notes?month=${month}&year=${reportYear}`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
  });

  const notedCompanyIds = new Set((allNotes || []).map(n => n.companyId));
  const activeCompanies = companies.filter(c => !c.isPaused);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><FileEdit className="w-4 h-4" />Report Notes Status — {monthNames[reportMonth]} {reportYear}</CardTitle>
        <CardDescription>Admin notes included in the "Notes from Your Team" section of each company's monthly report.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : activeCompanies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active companies</p>
        ) : (
          <div className="space-y-2">
            {activeCompanies.map(company => {
              const hasNotes = notedCompanyIds.has(company.id);
              return (
                <div key={company.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`report-notes-status-${company.id}`}>
                  <div className="flex items-center gap-3">
                    {hasNotes ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-amber-500" />}
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
