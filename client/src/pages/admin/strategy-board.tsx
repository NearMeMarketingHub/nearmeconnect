import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tldraw, type Editor, type TLEditorSnapshot, getSnapshot, loadSnapshot } from "tldraw";
import "tldraw/tldraw.css";
import type { Company, StrategyBoard } from "@shared/schema";

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
        <div className="border-b px-6 py-3 flex items-center justify-between gap-3 bg-background">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold" data-testid="text-strategy-board-title">Strategy Board</h1>
            <Badge variant="outline" className="text-xs">Freeform whiteboard</Badge>
          </div>
          <div className="w-72">
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
        <div className="flex-1 min-h-0">
          {!companyId ? (
            <div className="h-full flex items-center justify-center p-8">
              <Card className="max-w-md">
                <CardContent className="p-6 text-center space-y-2">
                  <h2 className="font-semibold">Pick a company to open its board</h2>
                  <p className="text-sm text-muted-foreground">
                    Each company has its own freeform strategy board for brainstorming,
                    drawing webs of ideas, sticky notes, and arrows.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <BoardCanvas companyId={companyId} />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function BoardCanvas({ companyId }: { companyId: string }) {
  const editorRef = useRef<Editor | null>(null);
  const loadedForRef = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const { data: board, isLoading } = useQuery<StrategyBoard | null>({
    queryKey: ["/api/companies", companyId, "strategy-board"],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/strategy-board`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load strategy board");
      return res.json();
    },
  });

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

  // Load snapshot + (re)attach listener once both editor + data ready
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || isLoading) return;
    if (loadedForRef.current === companyId) return;

    const snap = board?.snapshot as TLEditorSnapshot | undefined | null;
    if (snap) {
      try {
        loadSnapshot(editor.store, snap);
      } catch (e) {
        console.error("Failed to load strategy board snapshot:", e);
      }
    }
    loadedForRef.current = companyId;

    // Detach prior listener (in case of company switch)
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
  }, [board, isLoading, companyId]);

  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  if (isLoading) {
    return <div className="h-full p-6"><Skeleton className="h-full w-full" /></div>;
  }

  return (
    <div className="h-full w-full" data-testid="strategy-board-canvas">
      <Tldraw
        onMount={(editor) => { editorRef.current = editor; }}
        persistenceKey={`strategy-${companyId}`}
      />
    </div>
  );
}
