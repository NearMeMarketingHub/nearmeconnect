import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Globe, Search, Download, CheckCircle2, Clock, AlertTriangle, ExternalLink, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SeoDirectory, Company } from "@shared/schema";

const STATUSES = [
  { value: "not_started", label: "Not Started", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  { value: "assigned", label: "Assigned", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  { value: "in_progress", label: "In Progress", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  { value: "submitted", label: "Submitted", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  { value: "pending_verification", label: "Pending Verification", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  { value: "live", label: "Live", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  { value: "needs_update", label: "Needs Update", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  { value: "archived", label: "Archived", color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
] as const;

const TYPES = [
  { value: "directory", label: "Directory" },
  { value: "citation", label: "Citation" },
  { value: "gbp", label: "GBP" },
  { value: "local_landing_page", label: "Local Landing Page" },
  { value: "public_blog", label: "Public Blog" },
  { value: "blog_post", label: "Blog Post" },
  { value: "backlink_resource", label: "Backlink/Resource" },
  { value: "other", label: "Other" },
] as const;

function statusInfo(val: string) {
  return STATUSES.find(s => s.value === val) ?? STATUSES[0];
}
function typeLabel(val: string) {
  return TYPES.find(t => t.value === val)?.label ?? val;
}

interface SeoDirectoryWithCompany extends SeoDirectory {
  companyName?: string;
}

export default function AdminSeo() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");

  const { data: allItems = [], isLoading } = useQuery<SeoDirectory[]>({
    queryKey: ["/api/seo-directories"],
    queryFn: async () => {
      const r = await fetch("/api/seo-directories");
      return r.json();
    },
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    queryFn: async () => {
      const r = await fetch("/api/companies");
      return r.json();
    },
  });

  const companyMap = useMemo(() => {
    const m: Record<string, string> = {};
    companies.forEach((c: Company) => { m[c.id] = c.name; });
    return m;
  }, [companies]);

  const enriched: SeoDirectoryWithCompany[] = useMemo(() =>
    allItems.map(i => ({ ...i, companyName: companyMap[i.companyId] ?? i.companyId })),
    [allItems, companyMap]
  );

  const owners = useMemo(() => {
    const s = new Set<string>();
    enriched.forEach(i => { if (i.owner) s.add(i.owner); });
    return [...s].sort();
  }, [enriched]);

  const filtered = enriched.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.companyName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (item.targetKeyword ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (item.targetCity ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || item.status === statusFilter;
    const matchType = typeFilter === "all" || item.type === typeFilter;
    const matchCompany = companyFilter === "all" || item.companyId === companyFilter;
    const matchOwner = ownerFilter === "all" || item.owner === ownerFilter;
    return matchSearch && matchStatus && matchType && matchCompany && matchOwner;
  });

  // Summary stats
  const total = allItems.length;
  const liveCount = allItems.filter(i => i.status === "live").length;
  const inProgressCount = allItems.filter(i => ["in_progress", "assigned", "submitted", "pending_verification"].includes(i.status)).length;
  const overdueCount = allItems.filter(i => i.dueDate && new Date(i.dueDate) < new Date() && i.status !== "live" && i.status !== "archived").length;
  const completionPct = total > 0 ? Math.round((liveCount / total) * 100) : 0;

  // CSV export
  const handleExport = () => {
    const headers = ["Company", "Name", "Type", "Status", "URL", "Target Keyword", "Target City", "Owner", "Due Date", "Submitted Date", "Live Date", "Published URL", "Notes"];
    const rows = filtered.map(i => [
      i.companyName ?? "", i.name, i.type, i.status, i.url ?? "",
      i.targetKeyword ?? "", i.targetCity ?? "", i.owner ?? "",
      i.dueDate ?? "", i.submittedDate ?? "", i.liveDate ?? "",
      i.publishedUrl ?? "", (i.notes ?? "").replace(/\n/g, " "),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "seo-directories-global.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // Group by company
  const byCompany = useMemo(() => {
    const map: Record<string, SeoDirectoryWithCompany[]> = {};
    filtered.forEach(i => {
      const key = i.companyId;
      if (!map[key]) map[key] = [];
      map[key].push(i);
    });
    return Object.entries(map).sort(([, a], [, b]) => (a[0]?.companyName ?? "").localeCompare(b[0]?.companyName ?? ""));
  }, [filtered]);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">SEO / Directory Tracker</h1>
            <p className="text-sm text-muted-foreground mt-1">Cross-client view of all SEO and directory submissions</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={handleExport} data-testid="button-global-seo-export">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>

        {/* Global stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Total Tracked</p>
            <p className="text-2xl font-bold">{total}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" />Live</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{liveCount}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Clock className="h-3 w-3 text-yellow-500" />In Progress</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{inProgressCount}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-red-500" />Overdue</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{overdueCount}</p>
          </CardContent></Card>
        </div>

        {total > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall live completion</span>
              <span className="font-medium">{completionPct}% ({liveCount}/{total})</span>
            </div>
            <Progress value={completionPct} className="h-2" />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search across all clients..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-global-seo-search" />
          </div>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="h-9 w-44" data-testid="select-global-company"><SelectValue placeholder="All Clients" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {companies.map((c: Company) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-44" data-testid="select-global-status"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-36" data-testid="select-global-type"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {owners.length > 0 && (
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="h-9 w-36" data-testid="select-global-owner"><SelectValue placeholder="All Owners" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                {owners.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No SEO items found</p>
            <p className="text-sm mt-1">Items will appear here once clients have SEO directories tracked in their company dashboards.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {byCompany.map(([companyId, items]) => {
              const companyLive = items.filter(i => i.status === "live").length;
              const companyPct = Math.round((companyLive / items.length) * 100);
              return (
                <div key={companyId} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{items[0]?.companyName ?? companyId}</h3>
                      <Badge variant="secondary" className="text-xs">{items.length} items</Badge>
                      <Badge className={cn("text-xs", companyPct === 100 ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground")}>{companyPct}% live</Badge>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setLocation(`/admin/companies/${companyId}?tab=marketing&sub=seo`)} data-testid={`button-view-company-seo-${companyId}`}>
                      View Client SEO →
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Name</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs hidden sm:table-cell">Type</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Status</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs hidden md:table-cell">Keyword / City</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs hidden lg:table-cell">Owner</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs hidden lg:table-cell">Due</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Links</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => {
                          const si = statusInfo(item.status);
                          const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && item.status !== "live" && item.status !== "archived";
                          return (
                            <tr key={item.id} className={cn("border-b last:border-0 hover:bg-muted/20 transition-colors", idx % 2 === 0 ? "" : "bg-muted/10")} data-testid={`row-global-seo-${item.id}`}>
                              <td className="px-3 py-2">
                                <p className="font-medium truncate max-w-[200px]">{item.name}</p>
                              </td>
                              <td className="px-3 py-2 hidden sm:table-cell">
                                <span className="text-xs text-muted-foreground">{typeLabel(item.type)}</span>
                              </td>
                              <td className="px-3 py-2">
                                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap", si.color)}>{si.label}</span>
                              </td>
                              <td className="px-3 py-2 hidden md:table-cell">
                                <p className="text-xs text-muted-foreground truncate max-w-[140px]">{[item.targetKeyword, item.targetCity].filter(Boolean).join(" · ") || "—"}</p>
                              </td>
                              <td className="px-3 py-2 hidden lg:table-cell">
                                <span className="text-xs text-muted-foreground">{item.owner || "—"}</span>
                              </td>
                              <td className="px-3 py-2 hidden lg:table-cell">
                                <span className={cn("text-xs", isOverdue && "text-red-500 font-medium")}>{item.dueDate || "—"}</span>
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1">
                                  {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700" title="Directory URL"><ExternalLink className="h-3.5 w-3.5" /></a>}
                                  {item.publishedUrl && <a href={item.publishedUrl} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-700" title="Live URL"><Globe className="h-3.5 w-3.5" /></a>}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
