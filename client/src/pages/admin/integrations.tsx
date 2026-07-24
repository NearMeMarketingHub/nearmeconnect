import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
import {
  CheckCircle2, AlertTriangle, Circle, XCircle, Ban,
  Building2, Mail, FolderOpen, MapPin, Puzzle, ArrowRight,
  Filter, Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntegrationStatus, IntegrationType, IntegrationStatusValue } from "@shared/schema";

// ── Config ────────────────────────────────────────────────────────────────────

const INTEGRATION_LABELS: Record<IntegrationType, string> = {
  hubspot: "HubSpot",
  sharepoint: "SharePoint",
  resend: "Resend",
  google_business_profile: "Google Business",
  other: "Other",
};

const INTEGRATION_ICONS: Record<IntegrationType, React.ReactNode> = {
  hubspot: <Building2 className="h-4 w-4 text-orange-500" />,
  sharepoint: <FolderOpen className="h-4 w-4 text-blue-600" />,
  resend: <Mail className="h-4 w-4 text-purple-500" />,
  google_business_profile: <MapPin className="h-4 w-4 text-green-600" />,
  other: <Puzzle className="h-4 w-4 text-gray-500" />,
};

const STATUS_CONFIG: Record<IntegrationStatusValue, { label: string; color: string; icon: React.ReactNode; priority: number }> = {
  error: { label: "Error", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400", icon: <XCircle className="h-3.5 w-3.5" />, priority: 0 },
  needs_credentials: { label: "Needs Setup", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400", icon: <AlertTriangle className="h-3.5 w-3.5" />, priority: 1 },
  warning: { label: "Warning", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400", icon: <AlertTriangle className="h-3.5 w-3.5" />, priority: 2 },
  not_configured: { label: "Not Configured", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: <Circle className="h-3.5 w-3.5" />, priority: 3 },
  connected: { label: "Connected", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400", icon: <CheckCircle2 className="h-3.5 w-3.5" />, priority: 4 },
  disabled: { label: "Disabled", color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500", icon: <Ban className="h-3.5 w-3.5" />, priority: 5 },
};

const ALL_TYPES: IntegrationType[] = ["hubspot", "sharepoint", "resend", "google_business_profile"];

type CompanyRow = { id: string; name: string };
type AllStatusesResponse = { companies: CompanyRow[]; statuses: IntegrationStatus[] };

function StatusCell({ status }: { status?: IntegrationStatusValue }) {
  const s = status ?? "not_configured";
  const cfg = STATUS_CONFIG[s];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap", cfg.color)}>
      {cfg.icon} <span className="hidden sm:inline">{cfg.label}</span>
    </span>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminIntegrations() {
  const [filterType, setFilterType] = useState<IntegrationType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<IntegrationStatusValue | "all">("all");
  const [sortBy, setSortBy] = useState<"name" | "issues">("issues");

  const { data, isLoading } = useQuery<AllStatusesResponse>({
    queryKey: ["/api/admin/integrations"],
  });

  const { companies = [], statuses = [] } = data ?? {};

  // Build a lookup: companyId → type → status
  const lookup = useMemo(() => {
    const map: Record<string, Record<string, IntegrationStatus>> = {};
    for (const s of statuses) {
      if (!map[s.companyId]) map[s.companyId] = {};
      map[s.companyId][s.integrationType] = s;
    }
    return map;
  }, [statuses]);

  const getStatus = (companyId: string, type: IntegrationType): IntegrationStatusValue =>
    lookup[companyId]?.[type]?.status ?? "not_configured";

  // Summary counts
  const summary = useMemo(() => {
    let connected = 0, issues = 0, unconfigured = 0;
    for (const c of companies) {
      for (const t of ALL_TYPES) {
        const s = getStatus(c.id, t);
        if (s === "connected") connected++;
        else if (["error", "warning", "needs_credentials"].includes(s)) issues++;
        else unconfigured++;
      }
    }
    return { connected, issues, unconfigured, total: companies.length * ALL_TYPES.length };
  }, [companies, lookup]);

  // Filter and sort companies
  const filteredCompanies = useMemo(() => {
    let rows = [...companies];

    if (filterType !== "all" || filterStatus !== "all") {
      rows = rows.filter(c => {
        const types = filterType !== "all" ? [filterType] : ALL_TYPES;
        return types.some(t => {
          const s = getStatus(c.id, t);
          return filterStatus === "all" || s === filterStatus;
        });
      });
    }

    return rows.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      // Sort by worst status first
      const worstPriority = (companyId: string) => {
        const types = filterType !== "all" ? [filterType] : ALL_TYPES;
        return Math.min(...types.map(t => STATUS_CONFIG[getStatus(companyId, t)].priority));
      };
      return worstPriority(a.id) - worstPriority(b.id);
    });
  }, [companies, lookup, filterType, filterStatus, sortBy]);

  const displayTypes = filterType !== "all" ? [filterType] : ALL_TYPES;

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 max-w-screen-xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Wifi className="h-6 w-6 text-primary" /> Integration Health
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track connection status for every client across HubSpot, SharePoint, Resend, and Google Business Profile.
          </p>
        </div>

        {/* Summary tiles */}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-green-200 dark:border-green-800/50">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold font-mono text-green-600 dark:text-green-400">{summary.connected}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Connected</p>
              </CardContent>
            </Card>
            <Card className={cn("border-orange-200 dark:border-orange-800/50", summary.issues > 0 ? "bg-orange-50/40 dark:bg-orange-950/10" : "")}>
              <CardContent className="p-4 text-center">
                <p className={cn("text-3xl font-bold font-mono", summary.issues > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground")}>{summary.issues}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Need Attention</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold font-mono text-muted-foreground">{summary.unconfigured}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1"><Circle className="h-3.5 w-3.5" /> Not Configured</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={filterType} onValueChange={v => setFilterType(v as IntegrationType | "all")}>
            <SelectTrigger className="w-44 h-8 text-xs" data-testid="filter-integration-type">
              <SelectValue placeholder="Integration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Integrations</SelectItem>
              {ALL_TYPES.map(t => (
                <SelectItem key={t} value={t}>{INTEGRATION_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={v => setFilterStatus(v as IntegrationStatusValue | "all")}>
            <SelectTrigger className="w-40 h-8 text-xs" data-testid="filter-integration-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {(Object.keys(STATUS_CONFIG) as IntegrationStatusValue[]).map(s => (
                <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1 ml-auto">
            <Button variant={sortBy === "issues" ? "default" : "outline"} size="sm" className="h-8 text-xs"
              onClick={() => setSortBy("issues")} data-testid="sort-by-issues">
              Issues First
            </Button>
            <Button variant={sortBy === "name" ? "default" : "outline"} size="sm" className="h-8 text-xs"
              onClick={() => setSortBy("name")} data-testid="sort-by-name">
              A–Z
            </Button>
          </div>
        </div>

        {/* Main table */}
        {isLoading ? (
          <div className="space-y-1.5">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-12" />)}</div>
        ) : filteredCompanies.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Wifi className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No clients match this filter.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs">
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Client</th>
                    {displayTypes.map(t => (
                      <th key={t} className="text-center px-3 py-2.5 font-medium text-muted-foreground min-w-[100px]">
                        <div className="flex items-center justify-center gap-1.5">
                          {INTEGRATION_ICONS[t]}
                          <span className="hidden md:inline">{INTEGRATION_LABELS[t]}</span>
                        </div>
                      </th>
                    ))}
                    <th className="text-right px-3 py-2.5 font-medium text-muted-foreground w-24">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map(c => {
                    const hasIssue = displayTypes.some(t => ["error", "warning", "needs_credentials"].includes(getStatus(c.id, t)));
                    return (
                      <tr key={c.id}
                        className={cn("border-b last:border-0 hover:bg-muted/20 transition-colors", hasIssue ? "bg-orange-50/30 dark:bg-orange-950/10" : "")}
                        data-testid={`integration-row-${c.id}`}>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            {hasIssue && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />}
                            <span className="font-medium">{c.name}</span>
                          </div>
                        </td>
                        {displayTypes.map(t => (
                          <td key={t} className="px-3 py-2.5 text-center">
                            <StatusCell status={getStatus(c.id, t)} />
                            {lookup[c.id]?.[t]?.externalAccountId && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 hidden md:block truncate max-w-[120px] mx-auto">
                                {lookup[c.id][t].externalAccountId}
                              </p>
                            )}
                          </td>
                        ))}
                        <td className="px-3 py-2.5 text-right">
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" asChild>
                            <Link href={`/admin/companies/${c.id}?tab=admin&sub=integrations`}>
                              Manage <ArrowRight className="h-3 w-3" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Missing setup alert */}
        {!isLoading && summary.unconfigured > 0 && filterStatus === "all" && (
          <p className="text-xs text-muted-foreground text-center">
            {summary.unconfigured} integration slot{summary.unconfigured !== 1 ? "s" : ""} not yet configured across all clients.
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
