import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Zap, CheckCircle2, Clock, AlertCircle, ExternalLink, StickyNote,
  Trash2, ArrowRight,
} from "lucide-react";
import type { HubspotWorkflowTemplate, CompanyWorkflow } from "@shared/schema";

type CWWithTemplate = CompanyWorkflow & { template: HubspotWorkflowTemplate };

const STATUS_CONFIG = {
  planned:  { label: "Planned",     className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  building: { label: "Building",    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  active:   { label: "Active",      className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
};

const COMPLEXITY_CONFIG = {
  easy:     { icon: CheckCircle2, className: "text-green-500" },
  medium:   { icon: Clock,        className: "text-yellow-500" },
  advanced: { icon: AlertCircle,  className: "text-red-500" },
};

const QUICK_WIN_IDS_HINT = ["Google Review Request", "New Lead Welcome Sequence", "Deal Stuck in Stage", "Monthly Client Performance", "Before/After Photo"];

function isQuickWin(cw: CWWithTemplate) {
  return cw.template.isQuickWin;
}

function ComplexityIcon({ complexity }: { complexity: string }) {
  const cfg = COMPLEXITY_CONFIG[complexity as keyof typeof COMPLEXITY_CONFIG] ?? COMPLEXITY_CONFIG.medium;
  const Icon = cfg.icon;
  return <Icon className={`h-3.5 w-3.5 ${cfg.className}`} />;
}

function WorkflowRow({
  cw,
  companyId,
  onRefresh,
}: {
  cw: CWWithTemplate;
  companyId: string;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [activateOpen, setActivateOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [hsId, setHsId] = useState(cw.hubspotWorkflowId ?? "");
  const [note, setNote] = useState(cw.notes ?? "");

  const update = useMutation({
    mutationFn: (data: Record<string, string>) =>
      apiRequest("PATCH", `/api/admin/workflow-library/companies/${companyId}/${cw.id}`, data),
    onSuccess: () => { onRefresh(); toast({ title: "Updated" }); setActivateOpen(false); setNoteOpen(false); },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: () =>
      apiRequest("DELETE", `/api/admin/workflow-library/companies/${companyId}/${cw.id}`),
    onSuccess: () => { onRefresh(); toast({ title: "Removed" }); },
    onError: () => toast({ title: "Failed to remove", variant: "destructive" }),
  });

  const statusCfg = STATUS_CONFIG[cw.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.planned;

  return (
    <>
      <div
        className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border transition-all group"
        data-testid={`workflow-row-${cw.id}`}
      >
        <ComplexityIcon complexity={cw.template.complexity} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight truncate">{cw.template.name}</p>
          {cw.notes && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{cw.notes}</p>
          )}
          {cw.hubspotWorkflowId && (
            <p className="text-xs text-muted-foreground font-mono">HS ID: {cw.hubspotWorkflowId}</p>
          )}
        </div>
        <Badge variant="secondary" className={`text-xs shrink-0 ${statusCfg.className}`}>
          {statusCfg.label}
        </Badge>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {cw.hubspotWorkflowId && (
            <a
              href={`https://app.hubspot.com/workflows/${cw.hubspotWorkflowId}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`btn-view-hubspot-${cw.id}`}
            >
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => { setNote(cw.notes ?? ""); setNoteOpen(true); }}
            data-testid={`btn-note-${cw.id}`}
            title="Add/edit note"
          >
            <StickyNote className="h-3.5 w-3.5" />
          </Button>
          {cw.status !== "active" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
              onClick={() => { setHsId(cw.hubspotWorkflowId ?? ""); setActivateOpen(true); }}
              data-testid={`btn-activate-${cw.id}`}
              title="Mark Active"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {cw.status !== "building" && cw.status !== "active" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
              onClick={() => update.mutate({ status: "building" })}
              data-testid={`btn-start-building-${cw.id}`}
              title="Mark as Building"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:bg-destructive/10"
            onClick={() => remove.mutate()}
            data-testid={`btn-remove-${cw.id}`}
            title="Remove"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Activate Dialog */}
      <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as Active</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Optionally link the HubSpot Workflow ID so you can open it directly.
            </p>
            <Input
              placeholder="HubSpot Workflow ID (optional)"
              value={hsId}
              onChange={(e) => setHsId(e.target.value)}
              data-testid="input-hubspot-workflow-id"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => update.mutate({ status: "active", hubspotWorkflowId: hsId })}
              disabled={update.isPending}
              data-testid="btn-confirm-activate"
            >
              {update.isPending ? "Saving…" : "Mark Active"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Notes about this workflow for this client…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            data-testid="textarea-workflow-note"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)}>Cancel</Button>
            <Button
              onClick={() => update.mutate({ notes: note })}
              disabled={update.isPending}
              data-testid="btn-save-note"
            >
              {update.isPending ? "Saving…" : "Save Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function CompanyWorkflowsPanel({ companyId }: { companyId: string }) {
  const { data: assigned = [], refetch } = useQuery<CWWithTemplate[]>({
    queryKey: ["/api/admin/workflow-library/companies", companyId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/workflow-library/companies/${companyId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: allTemplates = [] } = useQuery<HubspotWorkflowTemplate[]>({
    queryKey: ["/api/admin/workflow-library"],
  });

  const assignedTemplateIds = new Set(assigned.map((a) => a.templateId));
  const recommended = allTemplates.filter((t) => !assignedTemplateIds.has(t.id));
  const inProgress = assigned.filter((a) => a.status === "planned" || a.status === "building");
  const active = assigned.filter((a) => a.status === "active");

  const quickWinsUnassigned = recommended.filter((t) => t.isQuickWin);

  const totalCount = allTemplates.length || 100;
  const activeCount = active.length;
  const pct = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-5 p-4">
      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">HubSpot Automation Progress</span>
          <span className="text-muted-foreground">
            <strong className="text-foreground">{activeCount}</strong> / {totalCount} active
          </span>
        </div>
        <Progress value={pct} className="h-2" data-testid="progress-workflows" />
        <p className="text-xs text-muted-foreground">
          {pct}% of top 100 HubSpot automations active for this client
        </p>
      </div>

      {/* Quick Wins highlight */}
      {quickWinsUnassigned.length > 0 && (
        <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Quick Wins Available</span>
            <Badge variant="secondary" className="text-xs">Done in &lt;1 hour</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            These high-impact workflows can be built and activated quickly — start here!
          </p>
          <div className="space-y-1.5">
            {quickWinsUnassigned.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-sm">
                <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{t.name}</span>
                <Badge variant="secondary" className="text-xs ml-auto">{t.complexity}</Badge>
              </div>
            ))}
          </div>
          <p className="text-xs text-primary font-medium">
            Go to Workflow Library to assign these workflows →
          </p>
        </div>
      )}

      <Tabs defaultValue="recommended" data-testid="tabs-workflows">
        <TabsList className="h-8">
          <TabsTrigger value="recommended" className="text-xs" data-testid="tab-recommended">
            Recommended
            {recommended.length > 0 && (
              <span className="ml-1.5 bg-muted-foreground/20 text-xs rounded-full px-1.5 py-0.5 leading-none">{recommended.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="inprogress" className="text-xs" data-testid="tab-inprogress">
            In Progress
            {inProgress.length > 0 && (
              <span className="ml-1.5 bg-yellow-500/20 text-xs rounded-full px-1.5 py-0.5 leading-none">{inProgress.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="text-xs" data-testid="tab-active">
            Active
            {active.length > 0 && (
              <span className="ml-1.5 bg-green-500/20 text-xs rounded-full px-1.5 py-0.5 leading-none">{active.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommended" className="mt-3 space-y-1">
          {recommended.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              All 100 workflows have been assigned to this client! 🎉
            </p>
          ) : (
            recommended.slice(0, 30).map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50">
                <ComplexityIcon complexity={t.complexity} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.category}</p>
                </div>
                {t.isQuickWin && (
                  <span className="flex items-center gap-1 text-xs text-primary font-medium shrink-0">
                    <Zap className="h-3 w-3" /> Quick Win
                  </span>
                )}
                <Badge variant="secondary" className="text-xs shrink-0">{t.complexity}</Badge>
              </div>
            ))
          )}
          {recommended.length > 30 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              + {recommended.length - 30} more — assign from the Workflow Library
            </p>
          )}
        </TabsContent>

        <TabsContent value="inprogress" className="mt-3 space-y-1">
          {inProgress.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No workflows in progress. Assign from the Workflow Library to get started.
            </p>
          ) : (
            inProgress.map((cw) => (
              <WorkflowRow key={cw.id} cw={cw} companyId={companyId} onRefresh={refetch} />
            ))
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-3 space-y-1">
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No active workflows yet. Mark a planned workflow as active when it's live in HubSpot.
            </p>
          ) : (
            active.map((cw) => (
              <WorkflowRow key={cw.id} cw={cw} companyId={companyId} onRefresh={refetch} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
