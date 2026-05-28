import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
            <span className="text-xs text-muted-foreground">Type freely · tag people with @</span>
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
                    Each company has its own strategy workspace. Type notes, SOWs, SOPs, and ideas.
                    Tag agency staff with <code className="bg-muted px-1 rounded">@</code> to mention them.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <NotesWorkspace companyId={companyId} />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

interface MentionUser {
  id: string;
  name: string;
  email: string;
}

function NotesWorkspace({ companyId }: { companyId: string }) {
  const { data: board, isLoading } = useQuery<StrategyBoard | null>({
    queryKey: ["/api/companies", companyId, "strategy-board"],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/strategy-board`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load strategy board");
      return res.json();
    },
  });

  const { data: adminUsersRaw } = useQuery<any>({
    queryKey: ["/api/admin/users"],
    staleTime: 60000,
  });

  const { data: companyUsersRaw } = useQuery<any[]>({
    queryKey: ["/api/admin/companies", companyId, "users"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/companies/${companyId}/users`, { credentials: "include" });
      if (!res.ok) return [];
      const d = await res.json();
      return Array.isArray(d) ? d : [];
    },
    staleTime: 60000,
  });

  const mentionUsers: MentionUser[] = useMemo(() => {
    const users: MentionUser[] = [];
    const seen = new Set<string>();
    const admins = Array.isArray(adminUsersRaw) ? adminUsersRaw : (adminUsersRaw?.admins || []);
    for (const u of admins) {
      const id = u.userId || u.id;
      if (!seen.has(id)) {
        seen.add(id);
        users.push({ id, name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email, email: u.email || "" });
      }
    }
    const members = Array.isArray(companyUsersRaw) ? companyUsersRaw : [];
    for (const u of members) {
      if (!seen.has(u.id)) {
        seen.add(u.id);
        users.push({ id: u.id, name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email, email: u.email || "" });
      }
    }
    return users;
  }, [adminUsersRaw, companyUsersRaw]);

  if (isLoading) {
    return <div className="h-full p-6"><Skeleton className="h-full w-full" /></div>;
  }

  return (
    <NotesPad
      companyId={companyId}
      initialNotes={board?.notes ?? ""}
      mentionUsers={mentionUsers}
    />
  );
}

function NotesPad({
  companyId,
  initialNotes,
  mentionUsers,
}: {
  companyId: string;
  initialNotes: string;
  mentionUsers: MentionUser[];
}) {
  const [notes, setNotes] = useState(initialNotes || "");
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCompany = useRef(companyId);

  const [mention, setMention] = useState<{ query: string; startIndex: number } | null>(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lastCompany.current !== companyId) {
      setNotes(initialNotes || "");
      lastCompany.current = companyId;
      setSaved("idle");
      setMention(null);
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

  const scheduleSave = useCallback((val: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveMutation.mutate(val), 800);
  }, [saveMutation]);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const filteredMentions = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return mentionUsers.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [mention, mentionUsers]);

  useEffect(() => { setMentionIdx(0); }, [filteredMentions]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart ?? val.length;
    setNotes(val);
    scheduleSave(val);

    const textBefore = val.slice(0, pos);
    const match = textBefore.match(/@([\w\s]*)$/);
    if (match) {
      const startIndex = pos - match[0].length;
      setMention({ query: match[1], startIndex });
    } else {
      setMention(null);
    }
  };

  const insertMention = (user: MentionUser) => {
    if (!mention || !textareaRef.current) return;
    const ta = textareaRef.current;
    const pos = ta.selectionStart ?? notes.length;
    const before = notes.slice(0, mention.startIndex);
    const after = notes.slice(pos);
    const inserted = `@${user.name} `;
    const newVal = before + inserted + after;
    setNotes(newVal);
    scheduleSave(newVal);
    setMention(null);
    setTimeout(() => {
      ta.focus();
      const cur = before.length + inserted.length;
      ta.setSelectionRange(cur, cur);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mention || filteredMentions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setMentionIdx((i) => (i + 1) % filteredMentions.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setMentionIdx((i) => (i - 1 + filteredMentions.length) % filteredMentions.length); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(filteredMentions[mentionIdx]); }
    else if (e.key === "Escape") { setMention(null); }
  };

  return (
    <div className="relative h-full flex flex-col" data-testid="strategy-notes-workspace">
      <div className="px-6 py-2 border-b flex items-center justify-between bg-muted/20 flex-shrink-0">
        <span className="text-xs text-muted-foreground">
          Notes — SOWs, SOPs, ideas · type <code className="bg-muted px-1 rounded text-[11px]">@</code> to tag someone
        </span>
        <span className="text-[11px] text-muted-foreground" data-testid="text-notes-save-status">
          {saved === "saving" ? "Saving…" : saved === "saved" ? "Saved ✓" : ""}
        </span>
      </div>

      <div className="relative flex-1 min-h-0">
        <textarea
          ref={textareaRef}
          value={notes}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={"Type freely — outline ideas, paste SOWs / SOPs, jot workflows.\n\nType @ to tag a team member."}
          className="absolute inset-0 w-full h-full resize-none border-0 bg-background p-6 text-sm leading-relaxed font-mono outline-none focus:ring-0 focus:outline-none"
          data-testid="textarea-strategy-notes"
          spellCheck
        />

        {mention && filteredMentions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute left-6 top-14 z-50 bg-popover border rounded-lg shadow-lg py-1 min-w-56 max-w-72"
            data-testid="mention-dropdown"
          >
            {filteredMentions.map((u, i) => (
              <button
                key={u.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  i === mentionIdx ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                }`}
                data-testid={`mention-option-${u.id}`}
              >
                <Avatar className="h-6 w-6 flex-shrink-0">
                  <AvatarFallback className="text-[10px]">{getInitials(u.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium truncate">{u.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
