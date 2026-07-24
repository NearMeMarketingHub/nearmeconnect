import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tldraw, Editor, getSnapshot, loadSnapshot } from "tldraw";
import "tldraw/tldraw.css";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StickyNote, ChevronDown, ChevronUp } from "lucide-react";
import type { Company, StrategyBoard } from "@shared/schema";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0] || "").join("").slice(0, 2).toUpperCase();
}

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

  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="border-b px-6 py-3 flex items-center justify-between gap-3 bg-background flex-wrap">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold" data-testid="text-strategy-board-title">Strategy Board</h1>
            <span className="text-xs text-muted-foreground hidden sm:block">Freeform whiteboard · one per company</span>
          </div>
          <div className="w-64">
            {companiesLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select
                value={companyId}
                onValueChange={(val) => navigate(`/admin/strategy/${val}`)}
              >
                <SelectTrigger data-testid="select-strategy-company">
                  <SelectValue placeholder="Select a company…" />
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

        <div className="flex-1 min-h-0">
          {!companyId ? (
            <div className="h-full flex items-center justify-center p-8">
              <Card className="max-w-md">
                <CardContent className="p-6 text-center space-y-2">
                  <h2 className="font-semibold">Pick a company to open its board</h2>
                  <p className="text-sm text-muted-foreground">
                    Each company has its own freeform strategy whiteboard. Draw diagrams, add sticky notes, paste images, and map out SOWs.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <BoardWorkspace key={companyId} companyId={companyId} />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function BoardWorkspace({ companyId }: { companyId: string }) {
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

  return <TldrawEditor companyId={companyId} initialSnapshot={board?.snapshot ?? null} initialNotes={board?.notes ?? ""} />;
}

function TldrawEditor({
  companyId,
  initialSnapshot,
  initialNotes,
}: {
  companyId: string;
  initialSnapshot: any;
  initialNotes: string;
}) {
  const editorRef = useRef<Editor | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState(initialNotes || "");
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotLoaded = useRef(false);

  const saveMutation = useMutation({
    mutationFn: async (data: { snapshot?: any; notes?: string }) => {
      const res = await apiRequest("PUT", `/api/companies/${companyId}/strategy-board`, data);
      return res.json();
    },
    onMutate: () => setSaveStatus("saving"),
    onSuccess: (updated) => {
      setSaveStatus("saved");
      queryClient.setQueryData(["/api/companies", companyId, "strategy-board"], updated);
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: () => setSaveStatus("idle"),
  });

  const scheduleBoardSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (!editorRef.current) return;
      const snapshot = getSnapshot(editorRef.current.store);
      saveMutation.mutate({ snapshot });
    }, 1000);
  }, [saveMutation]);

  const scheduleNotesSave = useCallback((val: string) => {
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      saveMutation.mutate({ notes: val });
    }, 1000);
  }, [saveMutation]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (notesTimer.current) clearTimeout(notesTimer.current);
  }, []);

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;

    if (initialSnapshot && !snapshotLoaded.current) {
      snapshotLoaded.current = true;
      try {
        loadSnapshot(editor.store, initialSnapshot);
      } catch (e) {
        console.warn("Failed to load tldraw snapshot:", e);
      }
    }

    const unsub = editor.store.listen(
      () => scheduleBoardSave(),
      { source: "user", scope: "document" }
    );
    return unsub;
  }, [initialSnapshot, scheduleBoardSave]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 relative">
        <Tldraw
          onMount={handleMount}
        />

        <div
          className="absolute top-2 right-2 z-10 text-[11px] text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded border"
          data-testid="text-board-save-status"
        >
          {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : ""}
        </div>
      </div>

      {/* Notes drawer */}
      <div className="border-t flex-shrink-0">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium hover:bg-muted/40 transition-colors"
          onClick={() => setNotesOpen((o) => !o)}
          data-testid="button-toggle-notes"
        >
          <span className="flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-muted-foreground" />
            Notes &amp; SOPs
            <span className="text-[11px] text-muted-foreground font-normal">SOWs, SOPs, ideas — type @ to tag someone</span>
          </span>
          {notesOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>

        {notesOpen && (
          <div className="h-48 border-t">
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); scheduleNotesSave(e.target.value); }}
              placeholder={"Paste SOWs, SOPs, workflows, or jot down ideas…\n\nType @ to tag a team member."}
              className="w-full h-full resize-none border-0 bg-background p-4 text-sm leading-relaxed font-mono outline-none focus:ring-0"
              data-testid="textarea-strategy-notes"
              spellCheck
            />
          </div>
        )}
      </div>
    </div>
  );
}
