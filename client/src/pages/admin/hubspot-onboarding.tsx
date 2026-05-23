import { useState, useRef } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { HUBSPOT_CHECKLIST_MASTER, SECTION_COLORS, SECTION_BG } from "@shared/hubspot-checklist";
import type { HubspotOnboardingItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Info,
  FileText,
  CheckCircle2,
  Clock,
  MessageSquare,
  Download,
  Loader2,
  BarChart3,
} from "lucide-react";

// ── Circular progress ring ────────────────────────────────────────────────────

function CircularProgress({ pct, done, total }: { pct: number; done: number; total: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative inline-flex items-center justify-center" data-testid="progress-ring">
      <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted" />
        <circle
          cx="70" cy="70" r={r} fill="none" stroke="currentColor" strokeWidth="10"
          className="text-orange-500 transition-all duration-700"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-bold leading-none">{pct}%</div>
        <div className="text-xs text-muted-foreground mt-1">{done}/{total}</div>
        <div className="text-xs text-muted-foreground">done</div>
      </div>
    </div>
  );
}

// ── Report dialog ─────────────────────────────────────────────────────────────

function ReportDialog({ items, companyName }: { items: HubspotOnboardingItem[]; companyName: string }) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>HubSpot Onboarding Report — ${companyName}</title>
      <style>body{font-family:sans-serif;padding:24px;color:#111}h1{font-size:22px;margin-bottom:8px}h2{font-size:15px;margin:16px 0 8px}
      .item{display:flex;gap:8px;align-items:flex-start;margin-bottom:4px;font-size:13px}
      .done{color:#16a34a}.todo{color:#dc2626}.section{margin-bottom:16px;border:1px solid #e5e7eb;border-radius:6px;padding:12px}
      .badge{display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600}
      .badge-done{background:#dcfce7;color:#15803d}.badge-partial{background:#fff7ed;color:#c2410c}.badge-todo{background:#fef2f2;color:#dc2626}
      </style></head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  const sectionStats = HUBSPOT_CHECKLIST_MASTER.map(({ section }) => {
    const sItems = items.filter(i => i.section === section);
    const done = sItems.filter(i => i.isCompleted).length;
    return { section, done, total: sItems.length, pct: sItems.length > 0 ? Math.round((done / sItems.length) * 100) : 0 };
  });

  const totalDone = items.filter(i => i.isCompleted).length;
  const overallPct = items.length > 0 ? Math.round((totalDone / items.length) * 100) : 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="button-generate-report">
          <FileText className="h-4 w-4" />
          Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>HubSpot Onboarding Report</span>
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-2 mr-6">
              <Download className="h-3 w-3" />
              Print / Save PDF
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div ref={printRef} className="space-y-4 pt-2">
          <div className="rounded-lg border p-4 bg-muted/30">
            <h1 className="text-lg font-bold">{companyName} — HubSpot Onboarding Status</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Generated {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="text-2xl font-bold text-orange-500">{overallPct}%</div>
              <div className="flex-1">
                <Progress value={overallPct} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{totalDone} of {items.length} items complete</p>
              </div>
            </div>
          </div>

          {sectionStats.map(({ section, done, total, pct }) => {
            const sectionItems = items.filter(i => i.section === section);
            const badge = pct === 100 ? "badge-done" : done > 0 ? "badge-partial" : "badge-todo";
            const badgeLabel = pct === 100 ? "Complete" : done > 0 ? `${pct}% done` : "Not started";
            return (
              <div key={section} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-sm">{section}</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{done}/{total}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      pct === 100
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : done > 0
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}>{badgeLabel}</span>
                  </div>
                </div>
                <Progress value={pct} className="h-1.5" />
                <div className="space-y-1">
                  {sectionItems.map(item => (
                    <div key={item.id} className="flex items-start gap-2 text-xs">
                      {item.isCompleted
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                        : <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      }
                      <span className={item.isCompleted ? "text-foreground" : "text-muted-foreground"}>
                        {item.label}
                        {item.isCompleted && item.completedByName && (
                          <span className="ml-1 text-muted-foreground">— {item.completedByName}</span>
                        )}
                        {item.notes && <span className="ml-1 italic text-muted-foreground">({item.notes})</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function HubspotOnboarding() {
  const [, params] = useRoute("/admin/companies/:id/hubspot-onboarding");
  const companyId = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [pendingNotes, setPendingNotes] = useState<Record<string, string>>({});

  const { data: company } = useQuery<{ id: string; name: string }>({
    queryKey: [`/api/companies/${companyId}`],
    enabled: !!companyId,
  });

  const { data: items = [], isLoading } = useQuery<HubspotOnboardingItem[]>({
    queryKey: [`/api/companies/${companyId}/hubspot-onboarding`],
    enabled: !!companyId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: Partial<HubspotOnboardingItem> }) =>
      apiRequest("PATCH", `/api/companies/${companyId}/hubspot-onboarding/${itemId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${companyId}/hubspot-onboarding`] });
    },
    onError: () => {
      toast({ title: "Failed to update item", variant: "destructive" });
    },
  });

  const toggleItem = (item: HubspotOnboardingItem) => {
    const now = new Date().toISOString();
    const userName = user
      ? `${(user as any).firstName ?? ""} ${(user as any).lastName ?? ""}`.trim() || (user as any).email
      : "Admin";
    updateMutation.mutate({
      itemId: item.id,
      data: item.isCompleted
        ? { isCompleted: false, completedBy: null as any, completedByName: null as any, completedAt: null as any }
        : { isCompleted: true, completedBy: (user as any)?.id, completedByName: userName, completedAt: now },
    });
  };

  const saveNotes = (item: HubspotOnboardingItem) => {
    const notes = pendingNotes[item.id] ?? item.notes ?? "";
    updateMutation.mutate({ itemId: item.id, data: { notes } });
    toast({ title: "Notes saved" });
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const totalItems = items.length;
  const totalDone = items.filter(i => i.isCompleted).length;
  const overallPct = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;

  const sectionStats = HUBSPOT_CHECKLIST_MASTER.map(({ section }) => {
    const sItems = items.filter(i => i.section === section);
    const done = sItems.filter(i => i.isCompleted).length;
    return { section, done, total: sItems.length, pct: sItems.length > 0 ? Math.round((done / sItems.length) * 100) : 0 };
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={`/admin/companies/${companyId}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <p className="text-sm text-muted-foreground">{company?.name}</p>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-orange-500" />
                HubSpot Onboarding Tracker
              </h1>
            </div>
          </div>
          <ReportDialog items={items} companyName={company?.name ?? "Company"} />
        </div>

        {/* Progress summary card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
              <div className="shrink-0">
                <CircularProgress pct={overallPct} done={totalDone} total={totalItems} />
              </div>
              <div className="flex-1 w-full space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Progress by section</p>
                {sectionStats.map(({ section, done, total, pct }) => (
                  <div key={section} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-medium ${SECTION_COLORS[section] ?? "text-foreground"}`}>{section}</span>
                      <span className="text-muted-foreground">{done}/{total}</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accordion sections */}
        <div className="space-y-3">
          {HUBSPOT_CHECKLIST_MASTER.map(({ section, items: masterItems }) => {
            const sItems = items.filter(i => i.section === section);
            const done = sItems.filter(i => i.isCompleted).length;
            const total = sItems.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const isOpen = openSections[section] ?? false;

            return (
              <Collapsible key={section} open={isOpen} onOpenChange={() => toggleSection(section)}>
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <CardHeader
                      className="cursor-pointer hover:bg-muted/30 transition-colors py-4"
                      data-testid={`section-header-${section.replace(/\s+/g, "-").toLowerCase()}`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {isOpen
                            ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          }
                          <CardTitle className={`text-base ${SECTION_COLORS[section] ?? ""}`}>{section}</CardTitle>
                          {pct === 100 && (
                            <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                              Complete ✓
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm text-muted-foreground">{done}/{total}</span>
                          <div className="w-24">
                            <Progress value={pct} className="h-2" />
                          </div>
                          <span className="text-sm font-medium w-10 text-right">{pct}%</span>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 space-y-0">
                      {masterItems.map((masterItem, idx) => {
                        const dbItem = sItems.find(i => i.itemKey === masterItem.key);
                        if (!dbItem) return null;
                        const noteOpen = expandedNotes[dbItem.id] ?? false;
                        const noteDraft = pendingNotes[dbItem.id] ?? dbItem.notes ?? "";
                        const isSaving = updateMutation.isPending;

                        return (
                          <div
                            key={dbItem.id}
                            className={`py-3 ${idx < masterItems.length - 1 ? "border-b border-border/50" : ""}`}
                            data-testid={`checklist-item-${dbItem.itemKey}`}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id={dbItem.id}
                                checked={dbItem.isCompleted}
                                onCheckedChange={() => toggleItem(dbItem)}
                                disabled={isSaving}
                                className="mt-0.5 shrink-0"
                                data-testid={`checkbox-${dbItem.itemKey}`}
                              />
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-start gap-2 flex-wrap">
                                  <label
                                    htmlFor={dbItem.id}
                                    className={`text-sm cursor-pointer leading-snug ${dbItem.isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}
                                  >
                                    {masterItem.label}
                                  </label>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0 mt-0.5" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs text-xs">
                                      {masterItem.description}
                                    </TooltipContent>
                                  </Tooltip>
                                </div>

                                {dbItem.isCompleted && dbItem.completedByName && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                    <span>
                                      {dbItem.completedByName}
                                      {dbItem.completedAt && ` · ${new Date(dbItem.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                                    </span>
                                  </div>
                                )}

                                {(dbItem.notes && !noteOpen) && (
                                  <p className="text-xs text-muted-foreground italic">{dbItem.notes}</p>
                                )}
                              </div>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => setExpandedNotes(prev => ({ ...prev, [dbItem.id]: !noteOpen }))}
                                data-testid={`button-notes-${dbItem.itemKey}`}
                                title="Add notes"
                              >
                                <MessageSquare className={`h-3.5 w-3.5 ${dbItem.notes ? "text-orange-500" : "text-muted-foreground"}`} />
                              </Button>
                            </div>

                            {noteOpen && (
                              <div className="ml-7 mt-2 space-y-2">
                                <Textarea
                                  placeholder="Add notes about this item…"
                                  value={noteDraft}
                                  onChange={e => setPendingNotes(prev => ({ ...prev, [dbItem.id]: e.target.value }))}
                                  className="text-xs min-h-[72px] resize-none"
                                  data-testid={`textarea-notes-${dbItem.itemKey}`}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => saveNotes(dbItem)}
                                    disabled={isSaving}
                                    data-testid={`button-save-notes-${dbItem.itemKey}`}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    onClick={() => {
                                      setPendingNotes(prev => ({ ...prev, [dbItem.id]: dbItem.notes ?? "" }));
                                      setExpandedNotes(prev => ({ ...prev, [dbItem.id]: false }));
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
