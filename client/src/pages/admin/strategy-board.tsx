import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Pencil, Columns2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tldraw, type Editor, type TLEditorSnapshot, getSnapshot, loadSnapshot } from "tldraw";
import "tldraw/tldraw.css";
import type { Company, StrategyBoard } from "@shared/schema";

type ViewMode = "split" | "notes" | "draw";

export default function StrategyBoardPage() {
  const params = useParams<{ companyId?: string }>();
  const [, navigate] = useLocation();
  const companyId = params.companyId || "";

  const { data: companies = [], isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const sortedCompanies = useMemo(
    () => [...companies].sort((a, b) => a.name.localeCompare(b.name)),
    [companies]
  );

  const [view, setView] = useState<ViewMode>("split");

  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="border-b px-6 py-3 flex items-center justify-between gap-3 bg-background flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold" data-testid="text-strategy-board-title">Strategy Board</h1>
            <Badge variant="outline" className="text-xs">Notes + freeform canvas</Badge>
          </div>
          <div className="flex items-center gap-2">
            {companyId && (
              <div className="hidden sm:flex items-center gap-1 border rounded-md p-0.5">
                <Button
                  variant={view === "notes" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setView("notes")}
                  data-testid="button-view-notes"
                  className="h-7 px-2"
                >
                  <FileText className="h-3.5 w-3.5 mr-1" /> Notes
                </Button>
                <Button
                  variant={view === "split" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setView("split")}
                  data-testid="button-view-split"
                  className="h-7 px-2"
                >
                  <Columns2 className="h-3.5 w-3.5 mr-1" /> Split
                </Button>
                <Button
                  variant={view === "draw" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setView("draw")}
                  data-testid="button-view-draw"
                  className="h-7 px-2"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Draw
                </Button>
              </div>
            )}
            <div className="w-64">
              {companiesLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select
                  value={companyId}
                  onValueChange={(val) => navigate(`/admin/strategy/${val}`)}
                >
                  <SelectTrigger data-testid="select-strategy-company">
                    <SelectValue placeholder="Select a company..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedCompanies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          {!companyId ? (
            <div className="h-full flex items-center justify-center p-8">
              <Card className="max-w-md">
                <CardContent className="p-6 text-center space-y-2">
                  <h2 className="font-semibold">Pick a company to open its board</h2>
                  <p className="text-sm text-muted-foreground">
                    Each company has its own strategy workspace — type notes (SOWs, SOPs, ideas)
                    on the left and draw webs, workflows, and arrows on the right.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <BoardWorkspace companyId={companyId} view={view} />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function BoardWorkspace({ companyId, view }: { companyId: string; view: ViewMode }) {
  const { data: board, isLoading } = useQuery<StrategyBoard | null>({
    queryKey: ["/api/companies", companyId, "strategy-board"],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/strategy-board`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load strategy board");
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="h-full p-6"><Skeleton className="h-full w-full" /></div>;
  }

  return (
    <div className="h-full w-full flex" data-testid="strategy-board-workspace">
      {(view === "notes" || view === "split") && (
        <div
          className={`${view === "split" ? "w-1/2 border-r" : "w-full"} h-full min-h-0 flex flex-col bg-background`}
        >
          <NotesPanel companyId={companyId} initialNotes={board?.notes ?? ""} />
        </div>
      )}
      {(view === "draw" || view === "split") && (
        <div
          className={`${view === "split" ? "w-1/2" : "w-full"} h-full min-h-0 relative`}
          data-testid="strategy-board-canvas"
        >
          <BoardCanvas companyId={companyId} initialSnapshot={board?.snapshot ?? null} />
        </div>
      )}
    </div>
  );
}

function NotesPanel({ companyId, initialNotes }: { companyId: string; initialNotes: string }) {
  const [notes, setNotes] = useState<string>(initialNotes || "");
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedCompany = useRef<string>(companyId);

  // Reset notes when switching companies
  useEffect(() => {
    if (lastSyncedCompany.current !== companyId) {
      setNotes(initialNotes || "");
      lastSyncedCompany.current = companyId;
      setSaved("idle");
    }
  }, [companyId, initialNotes]);

  const saveMutation = useMutation({
    mutationFn: async (value: string) => {
      const res = await apiRequest("PUT", `/api/companies/${companyId}/strategy-board`, { notes: value });
      return res.json();
    },
    onMutate: () => setSaved("saving"),
    onSuccess: () => {
      setSaved("saved");
      queryClient.setQueryData(["/api/companies", companyId, "strategy-board"], (prev: any) =>
        prev ? { ...prev, notes } : prev,
      );
    },
    onError: () => setSaved("idle"),
  });

  const handleChange = (val: string) => {
    setNotes(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveMutation.mutate(val), 800);
  };

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-2 border-b flex items-center justify-between bg-muted/30">
        <div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
          <FileText className="h-3.5 w-3.5" /> Notes — SOWs, SOPs, ideas
        </div>
        <div className="text-[11px] text-muted-foreground" data-testid="text-notes-save-status">
          {saved === "saving" ? "Saving…" : saved === "saved" ? "Saved" : ""}
        </div>
      </div>
      <Textarea
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Type freely — outline ideas, paste SOWs/SOPs, jot workflows. Auto-saves as you type."
        className="flex-1 min-h-0 resize-none rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-6 text-sm leading-relaxed font-mono"
        data-testid="textarea-strategy-notes"
      />
    </div>
  );
}

function BoardCanvas({ companyId, initialSnapshot }: { companyId: string; initialSnapshot: unknown }) {
  const editorRef = useRef<Editor | null>(null);
  const loadedForRef = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const snapshotRef = useRef<unknown>(initialSnapshot);
  snapshotRef.current = initialSnapshot;

  const saveMutation = useMutation({
    mutationFn: async (snapshot: unknown) => {
      const res = await apiRequest("PUT", `/api/companies/${companyId}/strategy-board`, { snapshot });
      return res.json();
    },
  });
  const saveRef = useRef(saveMutation);
  saveRef.current = saveMutation;

  // Reset load tracker + cancel pending save when switching company
  useEffect(() => {
    loadedForRef.current = null;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
  }, [companyId]);

  const attach = (editor: Editor) => {
    editorRef.current = editor;
    if (loadedForRef.current === companyId) return;
    const snap = snapshotRef.current as TLEditorSnapshot | undefined | null;
    if (snap) {
      try {
        loadSnapshot(editor.store, snap);
      } catch (e) {
        console.error("Failed to load strategy board snapshot:", e);
      }
    }
    loadedForRef.current = companyId;

    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    const boundCompanyId = companyId;
    unsubRef.current = editor.store.listen(
      () => {
        if (loadedForRef.current !== boundCompanyId) return;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          try {
            const snapshot = getSnapshot(editor.store);
            saveRef.current.mutate(snapshot);
          } catch (err) {
            console.error("Strategy board save failed:", err);
          }
        }, 1000);
      },
      { source: "user", scope: "document" }
    );
  };

  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return (
    <div className="absolute inset-0" data-testid="tldraw-container">
      <Tldraw
        onMount={attach}
        persistenceKey={`strategy-${companyId}`}
      />
    </div>
  );
}
