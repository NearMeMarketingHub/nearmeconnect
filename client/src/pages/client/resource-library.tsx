import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClientLayout } from "@/components/client-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, ExternalLink, FolderOpen, CheckCircle2, AlertCircle, RefreshCw,
  Archive, Globe, Lock, Eye, BookOpen, Share2, Briefcase, FileText,
  Star, Link2, Building2, ShieldCheck,
} from "lucide-react";
import type { ClientResource } from "@shared/schema";
import { resourceTypeEnum, resourceStatusEnum } from "@shared/schema";

const TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  sharepoint_main_folder: { label: "SharePoint Main Folder", icon: FolderOpen },
  brand_kit: { label: "Brand Kit", icon: Star },
  logo_creative_assets: { label: "Logo / Creative Assets", icon: Share2 },
  brand_guidelines: { label: "Brand Guidelines", icon: BookOpen },
  website_admin: { label: "Website / Admin", icon: Globe },
  social_profile: { label: "Social Profile", icon: Share2 },
  directory_profile: { label: "Directory Profile", icon: Building2 },
  google_business_profile: { label: "Google Business Profile", icon: Globe },
  hubspot_record: { label: "HubSpot Record", icon: Briefcase },
  campaign_folder: { label: "Campaign Folder", icon: FolderOpen },
  reporting_folder: { label: "Reporting Folder", icon: FileText },
  credentials_reference: { label: "Credentials", icon: ShieldCheck },
  strategy_doc: { label: "Strategy Doc", icon: BookOpen },
  meeting_notes_folder: { label: "Meeting Notes", icon: FileText },
  other: { label: "Other", icon: Link2 },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  active: { label: "Active", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: CheckCircle2 },
  missing: { label: "Missing", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: AlertCircle },
  needs_update: { label: "Needs Update", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", icon: RefreshCw },
  archived: { label: "Archived", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: Archive },
};

const TYPE_GROUPS: Record<string, string[]> = {
  "Brand Assets": ["brand_kit", "logo_creative_assets", "brand_guidelines"],
  "Storage & Folders": ["sharepoint_main_folder", "campaign_folder", "reporting_folder", "meeting_notes_folder"],
  "Online Presence": ["website_admin", "social_profile", "directory_profile", "google_business_profile"],
  "Business Tools": ["hubspot_record", "credentials_reference", "strategy_doc", "other"],
};

export default function ClientResourceLibrary({ companyId }: { companyId: string }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: resources = [], isLoading } = useQuery<ClientResource[]>({
    queryKey: [`/api/companies/${companyId}/resources`],
  });

  const filtered = useMemo(() => {
    return resources.filter(r => {
      if (r.status === "archived") return filterStatus === "archived";
      if (filterType !== "all" && r.resourceType !== filterType) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.title.toLowerCase().includes(q) && !(r.description ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [resources, filterType, filterStatus, search]);

  const missingCount = resources.filter(r => r.status === "missing").length;
  const needsUpdateCount = resources.filter(r => r.status === "needs_update").length;

  // Group by type category
  const grouped = useMemo(() => {
    const result: Record<string, ClientResource[]> = {};
    for (const [groupName, types] of Object.entries(TYPE_GROUPS)) {
      const items = filtered.filter(r => types.includes(r.resourceType));
      if (items.length > 0) result[groupName] = items;
    }
    const ungroupedTypes = Object.values(TYPE_GROUPS).flat();
    const ungrouped = filtered.filter(r => !ungroupedTypes.includes(r.resourceType));
    if (ungrouped.length > 0) result["Other"] = ungrouped;
    return result;
  }, [filtered]);

  return (
    <ClientLayout companyId={companyId}>
      <div className="space-y-6 p-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resource Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your team's shared links, brand assets, folders, and documents in one place.</p>
        </div>

        {/* Status alerts */}
        {(missingCount > 0 || needsUpdateCount > 0) && (
          <div className="flex gap-2 flex-wrap">
            {missingCount > 0 && (
              <button onClick={() => setFilterStatus("missing")} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-800" data-testid="alert-missing">
                <AlertCircle className="h-4 w-4" /> {missingCount} resource{missingCount > 1 ? "s" : ""} missing
              </button>
            )}
            {needsUpdateCount > 0 && (
              <button onClick={() => setFilterStatus("needs_update")} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800" data-testid="alert-needs-update">
                <RefreshCw className="h-4 w-4" /> {needsUpdateCount} resource{needsUpdateCount > 1 ? "s" : ""} need updating
              </button>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search resources…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" data-testid="input-search-resources" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48" data-testid="select-filter-type"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {resourceTypeEnum.map(t => <SelectItem key={t} value={t}>{TYPE_CONFIG[t]?.label ?? t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40" data-testid="select-filter-status"><SelectValue placeholder="Active Only" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {resourceStatusEnum.map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</SelectItem>)}
            </SelectContent>
          </Select>
          {filterStatus !== "all" || filterType !== "all" || search ? (
            <Button variant="ghost" size="sm" onClick={() => { setFilterStatus("all"); setFilterType("all"); setSearch(""); }} data-testid="button-clear-filters">
              Clear
            </Button>
          ) : null}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No resources found</p>
              {search || filterType !== "all" || filterStatus !== "all"
                ? <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters.</p>
                : <p className="text-sm text-muted-foreground mt-1">Your team hasn't added any resources yet. Contact your account manager to get started.</p>
              }
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([groupName, items]) => (
              <div key={groupName}>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{groupName}</h2>
                <div className="grid gap-3">
                  {items.map(r => <ResourceCard key={r.id} resource={r} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}

function ResourceCard({ resource: r }: { resource: ClientResource }) {
  const TypeIcon = TYPE_CONFIG[r.resourceType]?.icon ?? Link2;
  const statusCfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.active;
  const StatusIcon = statusCfg.icon;
  const isCredential = r.resourceType === "credentials_reference";

  return (
    <Card data-testid={`card-resource-${r.id}`} className="hover:border-primary/30 transition-colors">
      <CardContent className="flex items-center gap-4 py-4">
        <div className="p-2.5 rounded-xl bg-muted shrink-0">
          <TypeIcon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-sm">{r.title}</span>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
              <StatusIcon className="h-3 w-3" />{statusCfg.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{TYPE_CONFIG[r.resourceType]?.label ?? r.resourceType}</p>
          {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
          {isCredential && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Credentials are stored securely. Contact your account manager for access.
            </p>
          )}
          {r.lastCheckedDate && (
            <p className="text-xs text-muted-foreground mt-1">Last verified: {r.lastCheckedDate}</p>
          )}
        </div>
        {r.url && !isCredential && r.status !== "missing" && (
          <Button size="sm" variant="outline" asChild className="shrink-0" data-testid={`button-open-resource-${r.id}`}>
            <a href={r.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open
            </a>
          </Button>
        )}
        {r.status === "missing" && (
          <Badge variant="destructive" className="shrink-0">Not Available</Badge>
        )}
      </CardContent>
    </Card>
  );
}
