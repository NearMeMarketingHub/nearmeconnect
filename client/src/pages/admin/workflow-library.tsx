import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Search, Zap, Users, CheckCircle2, Clock, AlertCircle, Filter, X,
} from "lucide-react";
import type { HubspotWorkflowTemplate } from "@shared/schema";

type Company = { id: string; name: string };

const CATEGORY_COLORS: Record<string, string> = {
  "Review & Reputation":       "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Lead Nurture":               "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Onboarding & Welcome":       "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Sales Pipeline":             "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "Email Marketing":            "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "Local SEO & GBP":            "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "Social Media":               "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  "Customer Retention":         "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  "Content Marketing":          "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  "Advertising":                "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  "Reporting & Alerts":         "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  "Service & Support":          "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
  "Construction & Home Services":"bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "AI & Personalization":       "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  "Data Hygiene":               "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300",
  "Internal Operations":        "bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300",
  "Advanced Multi-Touch":       "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
};

const COMPLEXITY_LABEL: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  easy:     { label: "Easy",     icon: CheckCircle2, className: "text-green-600 dark:text-green-400" },
  medium:   { label: "Medium",   icon: Clock,        className: "text-yellow-600 dark:text-yellow-400" },
  advanced: { label: "Advanced", icon: AlertCircle,  className: "text-red-600 dark:text-red-400" },
};

function ComplexityBadge({ complexity }: { complexity: string }) {
  const cfg = COMPLEXITY_LABEL[complexity] ?? COMPLEXITY_LABEL.medium;
  const Icon = cfg.icon;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${cfg.className}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function WorkflowCard({
  wf,
  onAssign,
}: {
  wf: HubspotWorkflowTemplate;
  onAssign: (wf: HubspotWorkflowTemplate) => void;
}) {
  const catColor = CATEGORY_COLORS[wf.category] ?? "bg-gray-100 text-gray-700";
  return (
    <div
      className="bg-card border rounded-lg p-4 flex flex-col gap-2 hover:shadow-md transition-shadow"
      data-testid={`workflow-card-${wf.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            {wf.isQuickWin && (
              <span className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                <Zap className="h-3 w-3" /> Quick Win
              </span>
            )}
            <Badge variant="secondary" className={`text-xs px-2 py-0.5 ${catColor}`}>
              {wf.category}
            </Badge>
          </div>
          <p className="text-sm font-medium leading-snug">{wf.name}</p>
        </div>
        <ComplexityBadge complexity={wf.complexity} />
      </div>
      {wf.businessImpact && (
        <p className="text-xs text-muted-foreground line-clamp-2">{wf.businessImpact}</p>
      )}
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-muted-foreground bg-muted rounded px-2 py-0.5 font-mono truncate max-w-[55%]">
          {wf.hub}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => onAssign(wf)}
          data-testid={`btn-assign-${wf.id}`}
        >
          <Users className="h-3.5 w-3.5" />
          Assign to Client
        </Button>
      </div>
    </div>
  );
}

export default function WorkflowLibraryPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [complexityFilter, setComplexityFilter] = useState("all");
  const [assignTarget, setAssignTarget] = useState<HubspotWorkflowTemplate | null>(null);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);

  const { data: templates = [], isLoading } = useQuery<HubspotWorkflowTemplate[]>({
    queryKey: ["/api/admin/workflow-library"],
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/admin/companies"],
  });

  const assignMutation = useMutation({
    mutationFn: (vars: { templateId: string; companyIds: string[] }) =>
      apiRequest("POST", "/api/admin/workflow-library/assign", vars),
    onSuccess: () => {
      toast({ title: "Workflow assigned successfully" });
      setAssignTarget(null);
      setSelectedCompanies([]);
    },
    onError: () => toast({ title: "Failed to assign workflow", variant: "destructive" }),
  });

  const categories = useMemo(
    () => Array.from(new Set(templates.map((t) => t.category))).sort(),
    [templates],
  );

  const filtered = useMemo(() => {
    let list = templates;
    if (categoryFilter !== "all") list = list.filter((t) => t.category === categoryFilter);
    if (complexityFilter !== "all") list = list.filter((t) => t.complexity === complexityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }
    return list;
  }, [templates, categoryFilter, complexityFilter, search]);

  const quickWins = filtered.filter((t) => t.isQuickWin);
  const nonQuickWins = filtered.filter((t) => !t.isQuickWin);

  const grouped = useMemo(() => {
    const map = new Map<string, HubspotWorkflowTemplate[]>();
    for (const t of nonQuickWins) {
      if (!map.has(t.category)) map.set(t.category, []);
      map.get(t.category)!.push(t);
    }
    return map;
  }, [nonQuickWins]);

  const hasFilters = search || categoryFilter !== "all" || complexityFilter !== "all";

  function toggleCompany(id: string) {
    setSelectedCompanies((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Workflow Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {templates.length} HubSpot automations ready to assign to your clients
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>
            <strong className="text-foreground">{templates.filter((t) => t.complexity === "easy").length}</strong> Easy
          </span>
          <span className="text-muted-foreground/50">·</span>
          <span>
            <strong className="text-foreground">{templates.filter((t) => t.complexity === "medium").length}</strong> Medium
          </span>
          <span className="text-muted-foreground/50">·</span>
          <span>
            <strong className="text-foreground">{templates.filter((t) => t.complexity === "advanced").length}</strong> Advanced
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workflows…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
            data-testid="input-workflow-search"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-9 w-[200px]" data-testid="select-category-filter">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={complexityFilter} onValueChange={setComplexityFilter}>
          <SelectTrigger className="h-9 w-[160px]" data-testid="select-complexity-filter">
            <SelectValue placeholder="Complexity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1"
            onClick={() => { setSearch(""); setCategoryFilter("all"); setComplexityFilter("all"); }}
            data-testid="btn-clear-filters"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} workflow{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-36 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No workflows match your filters.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Quick Wins section */}
          {quickWins.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-base">Quick Wins</h2>
                <Badge variant="secondary" className="text-xs">Done in &lt;1 hour</Badge>
              </div>
              <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4">
                <p className="text-xs text-muted-foreground mb-3">
                  Start here — these workflows deliver immediate value and can be built in under an hour.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {quickWins.map((wf) => (
                    <WorkflowCard key={wf.id} wf={wf} onAssign={setAssignTarget} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Grouped by category */}
          {Array.from(grouped.entries()).map(([category, wfs]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-base">{category}</h2>
                <span className="text-xs text-muted-foreground">({wfs.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {wfs.map((wf) => (
                  <WorkflowCard key={wf.id} wf={wf} onAssign={setAssignTarget} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Dialog */}
      <Dialog open={!!assignTarget} onOpenChange={(o) => { if (!o) { setAssignTarget(null); setSelectedCompanies([]); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign to Clients</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{assignTarget?.name}</strong>
              {" "}will be added to the selected companies with status <em>Planned</em>.
            </p>
            <ScrollArea className="h-64 border rounded-md">
              <div className="p-2 space-y-1">
                {companies.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-3 px-2 py-2 rounded hover:bg-muted cursor-pointer"
                    data-testid={`checkbox-company-${c.id}`}
                  >
                    <Checkbox
                      checked={selectedCompanies.includes(c.id)}
                      onCheckedChange={() => toggleCompany(c.id)}
                    />
                    <span className="text-sm">{c.name}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {selectedCompanies.length} company selected
              {selectedCompanies.length !== 1 ? "s" : ""}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignTarget(null); setSelectedCompanies([]); }}>
              Cancel
            </Button>
            <Button
              disabled={selectedCompanies.length === 0 || assignMutation.isPending}
              onClick={() => assignMutation.mutate({ templateId: assignTarget!.id, companyIds: selectedCompanies })}
              data-testid="btn-confirm-assign"
            >
              {assignMutation.isPending ? "Assigning…" : `Assign to ${selectedCompanies.length || ""} Client${selectedCompanies.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
