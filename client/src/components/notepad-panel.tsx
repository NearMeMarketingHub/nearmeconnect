import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Pin, Plus, Search, Trash2, ClipboardCopy, CheckSquare, Clock, Lock, Link2, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { Notepad } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { value: "general", label: "General Note", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  { value: "campaign-idea", label: "Campaign Idea", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  { value: "campaign-brief", label: "Campaign Brief", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  { value: "meeting-notes", label: "Meeting Notes", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  { value: "client-call-recap", label: "Client Call Recap", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  { value: "seo-note", label: "SEO Note", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  { value: "content-idea", label: "Content Idea", color: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300" },
  { value: "internal-note", label: "Internal Note", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  { value: "decision", label: "Decision", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300" },
  { value: "risk-blocker", label: "Risk/Blocker", color: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300" },
  // legacy
  { value: "strategy", label: "Strategy", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  { value: "ideas", label: "Ideas", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  { value: "seo", label: "SEO", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
];

function categoryLabel(val: string) {
  return CATEGORIES.find(c => c.value === val) ?? CATEGORIES[0];
}

function timeAgo(ts?: string | null) {
  if (!ts) return "";
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true }); } catch { return ""; }
}

interface Props { companyId: string; currentUserId: string; currentUserName: string; isAdmin?: boolean; }

export function NotepadPanel({ companyId, currentUserId, currentUserName, isAdmin = true }: Props) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "idle">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localTitle, setLocalTitle] = useState("");
  const [localContent, setLocalContent] = useState("");
  const [localCategory, setLocalCategory] = useState("general");
  const [localPinned, setLocalPinned] = useState(false);
  const [localInternal, setLocalInternal] = useState(false);
  const [localLinkedCampaignId, setLocalLinkedCampaignId] = useState("");
  const [localLinkedTaskId, setLocalLinkedTaskId] = useState("");
  const [localLinkedMeetingId, setLocalLinkedMeetingId] = useState("");
  const [linksOpen, setLinksOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");

  const { data: notes = [] } = useQuery<Notepad[]>({
    queryKey: ["/api/companies", companyId, "notepads"],
    queryFn: async () => {
      const r = await fetch(`/api/companies/${companyId}/notepads`);
      return r.json();
    },
  });

  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: ["/api/companies", companyId, "campaign-requests"],
    queryFn: async () => {
      const r = await fetch(`/api/companies/${companyId}/campaign-requests`);
      return r.json();
    },
  });

  const { data: meetings = [] } = useQuery<any[]>({
    queryKey: ["/api/companies", companyId, "meeting-requests"],
    queryFn: async () => {
      const r = await fetch(`/api/companies/${companyId}/meeting-requests`);
      return r.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/companies/${companyId}/notepads`, data),
    onSuccess: async (r) => {
      const note = await r.json();
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "notepads"] });
      setSelectedId(note.id);
    },
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/companies/${companyId}/notepads/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "notepads"] });
      setSaveState("saved");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/companies/${companyId}/notepads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "notepads"] });
      setSelectedId(null);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/tasks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setCreateTaskOpen(false);
      setTaskTitle(""); setTaskDesc("");
      toast({ title: "Task created", description: "Follow-up task created successfully." });
    },
    onError: () => toast({ title: "Failed to create task", variant: "destructive" }),
  });

  const selected = notes.find(n => n.id === selectedId) ?? null;

  useEffect(() => {
    if (selected) {
      setLocalTitle(selected.title);
      setLocalContent(selected.content ?? "");
      setLocalCategory(selected.category ?? "general");
      setLocalPinned(selected.isPinned);
      setLocalInternal((selected as any).isInternal ?? false);
      setLocalLinkedCampaignId((selected as any).linkedCampaignId ?? "");
      setLocalLinkedTaskId((selected as any).linkedTaskId ?? "");
      setLocalLinkedMeetingId((selected as any).linkedMeetingId ?? "");
      setSaveState("idle");
    }
  }, [selected?.id]);

  const scheduleSave = useCallback((data: any) => {
    if (!selectedId) return;
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      patchMutation.mutate({ id: selectedId, data: { ...data, lastEditedBy: currentUserId, lastEditedByName: currentUserName } });
    }, 3000);
  }, [selectedId, currentUserId, currentUserName, patchMutation]);

  const handleTitleChange = (v: string) => { setLocalTitle(v); scheduleSave({ title: v, content: localContent, category: localCategory, isPinned: localPinned, isInternal: localInternal, linkedCampaignId: localLinkedCampaignId || null, linkedTaskId: localLinkedTaskId || null, linkedMeetingId: localLinkedMeetingId || null }); };
  const handleContentChange = (v: string) => { setLocalContent(v); scheduleSave({ title: localTitle, content: v, category: localCategory, isPinned: localPinned, isInternal: localInternal, linkedCampaignId: localLinkedCampaignId || null, linkedTaskId: localLinkedTaskId || null, linkedMeetingId: localLinkedMeetingId || null }); };

  const handleCategoryChange = (v: string) => {
    setLocalCategory(v);
    if (selectedId) patchMutation.mutate({ id: selectedId, data: { category: v, lastEditedBy: currentUserId, lastEditedByName: currentUserName } });
  };
  const handlePinToggle = () => {
    const next = !localPinned;
    setLocalPinned(next);
    if (selectedId) patchMutation.mutate({ id: selectedId, data: { isPinned: next, lastEditedBy: currentUserId, lastEditedByName: currentUserName } });
  };
  const handleInternalToggle = (v: boolean) => {
    setLocalInternal(v);
    if (selectedId) patchMutation.mutate({ id: selectedId, data: { isInternal: v, lastEditedBy: currentUserId, lastEditedByName: currentUserName } });
  };
  const handleLinkChange = (field: string, value: string) => {
    const val = value === "__none__" ? null : value;
    if (field === "campaign") setLocalLinkedCampaignId(val ?? "");
    if (field === "meeting") setLocalLinkedMeetingId(val ?? "");
    if (selectedId) {
      const patch: any = { lastEditedBy: currentUserId, lastEditedByName: currentUserName };
      if (field === "campaign") patch.linkedCampaignId = val;
      if (field === "meeting") patch.linkedMeetingId = val;
      patchMutation.mutate({ id: selectedId, data: patch });
    }
  };
  const handleTaskLinkChange = (v: string) => {
    setLocalLinkedTaskId(v);
    scheduleSave({ title: localTitle, content: localContent, category: localCategory, isPinned: localPinned, isInternal: localInternal, linkedCampaignId: localLinkedCampaignId || null, linkedTaskId: v || null, linkedMeetingId: localLinkedMeetingId || null });
  };

  const handleConvertToTask = () => {
    if (!selected) return;
    const stripped = selected.content?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? "";
    setTaskTitle(selected.title);
    setTaskDesc(stripped.slice(0, 500));
    setCreateTaskOpen(true);
  };

  const handleCopyAiBrief = () => {
    if (!selected) return;
    const text = `# ${selected.title}\n\n${selected.content?.replace(/<[^>]+>/g, "") ?? ""}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard", description: "Ready to paste into AI Brief" });
  };

  const filtered = notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()));
  const pinned = filtered.filter(n => n.isPinned);
  const unpinned = filtered.filter(n => !n.isPinned);
  const sorted = [...pinned, ...unpinned];
  const cat = categoryLabel(localCategory);

  const linkedCampaign = campaigns.find((c: any) => c.id === localLinkedCampaignId);
  const linkedMeeting = meetings.find((m: any) => m.id === localLinkedMeetingId);
  const hasLinks = localLinkedCampaignId || localLinkedTaskId || localLinkedMeetingId;

  return (
    <>
      <div className="flex h-full" style={{ minHeight: 500 }}>
        {/* Left panel */}
        <div className="w-64 shrink-0 border-r flex flex-col">
          <div className="p-3 border-b space-y-2">
            <Button size="sm" className="w-full gap-2" data-testid="button-new-note"
              onClick={() => createMutation.mutate({ title: "Untitled Note", content: "", category: "general", isPinned: false, isInternal: false, createdBy: currentUserId, createdByName: currentUserName })}
              disabled={createMutation.isPending}>
              <Plus className="h-4 w-4" /> New Note
            </Button>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search notes..." className="pl-7 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-notes" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sorted.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground text-center">No notes yet</p>
            )}
            {sorted.map(note => (
              <button
                key={note.id}
                onClick={() => setSelectedId(note.id)}
                data-testid={`note-item-${note.id}`}
                className={cn(
                  "w-full text-left px-3 py-2.5 border-b hover:bg-muted/50 transition-colors",
                  selectedId === note.id && "bg-orange-50 dark:bg-orange-950/30 border-l-2 border-l-orange-500"
                )}>
                <div className="flex items-center gap-1.5">
                  {note.isPinned && <Pin className="h-3 w-3 text-orange-500 shrink-0" />}
                  {(note as any).isInternal && <Lock className="h-3 w-3 text-red-500 shrink-0" />}
                  <span className="text-sm font-medium truncate">{note.title}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", categoryLabel(note.category ?? "general").color)}>
                    {categoryLabel(note.category ?? "general").label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(note.updatedAt ?? note.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Pin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Select a note or create a new one</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-4 border-b space-y-2">
                <input
                  className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground"
                  value={localTitle}
                  onChange={e => handleTitleChange(e.target.value)}
                  placeholder="Untitled Note"
                  data-testid="input-note-title"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={localCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="h-7 w-auto text-xs border-0 p-0 bg-transparent focus:ring-0" data-testid="select-note-category">
                      <span className={cn("text-xs px-2 py-1 rounded-full font-medium", cat.color)}>{cat.label}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.filter(c => !["strategy","ideas","seo"].includes(c.value)).map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={handlePinToggle} data-testid="button-pin-note">
                    <Pin className={cn("h-3.5 w-3.5", localPinned && "text-orange-500 fill-orange-500")} />
                    {localPinned ? "Pinned" : "Pin"}
                  </Button>
                  {isAdmin && (
                    <div className="flex items-center gap-1.5" data-testid="toggle-internal-note">
                      <Lock className={cn("h-3.5 w-3.5", localInternal ? "text-red-500" : "text-muted-foreground")} />
                      <span className="text-xs text-muted-foreground">Internal</span>
                      <Switch checked={localInternal} onCheckedChange={handleInternalToggle} className="h-4 w-7" />
                    </div>
                  )}
                  <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                    {saveState === "saving" && <><Clock className="h-3 w-3 animate-pulse" />Saving...</>}
                    {saveState === "saved" && <><CheckSquare className="h-3 w-3 text-green-500" />Saved</>}
                  </div>
                </div>

                {/* Internal warning */}
                {localInternal && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
                    <Lock className="h-3 w-3" />
                    This note is internal — not visible to clients
                  </div>
                )}

                {/* Links collapsible */}
                <Collapsible open={linksOpen} onOpenChange={setLinksOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className={cn("h-6 gap-1.5 text-xs px-2", hasLinks && "text-blue-600 dark:text-blue-400")} data-testid="button-toggle-links">
                      <Link2 className="h-3 w-3" />
                      {hasLinks ? "Links" : "Link to..."}
                      {linksOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid grid-cols-1 gap-2 pt-2 pl-1">
                      {/* Campaign */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-20 shrink-0">Campaign</span>
                        <Select value={localLinkedCampaignId || "__none__"} onValueChange={v => handleLinkChange("campaign", v)}>
                          <SelectTrigger className="h-7 text-xs flex-1" data-testid="select-linked-campaign">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {campaigns.map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>{c.title || c.name || c.id}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Meeting */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-20 shrink-0">Meeting</span>
                        <Select value={localLinkedMeetingId || "__none__"} onValueChange={v => handleLinkChange("meeting", v)}>
                          <SelectTrigger className="h-7 text-xs flex-1" data-testid="select-linked-meeting">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {meetings.map((m: any) => (
                              <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Task ID */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-20 shrink-0">Task ID</span>
                        <Input value={localLinkedTaskId} onChange={e => handleTaskLinkChange(e.target.value)} placeholder="Paste task ID..." className="h-7 text-xs flex-1" data-testid="input-linked-task-id" />
                      </div>
                    </div>
                    {/* Link badges */}
                    {hasLinks && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {linkedCampaign && <Badge variant="secondary" className="text-xs gap-1"><Link2 className="h-2.5 w-2.5" />{linkedCampaign.title || linkedCampaign.name}</Badge>}
                        {linkedMeeting && <Badge variant="secondary" className="text-xs gap-1"><Link2 className="h-2.5 w-2.5" />{linkedMeeting.title}</Badge>}
                        {localLinkedTaskId && <Badge variant="secondary" className="text-xs gap-1"><Link2 className="h-2.5 w-2.5" />Task linked</Badge>}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Editor */}
              <div className="flex-1 overflow-y-auto p-4">
                <RichTextEditor
                  key={selected.id}
                  value={localContent}
                  onChange={handleContentChange}
                  placeholder="Start writing your note..."
                  minHeight={300}
                />
              </div>

              {/* Footer */}
              <div className="p-3 border-t flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {selected.lastEditedByName
                    ? `Last edited by ${selected.lastEditedByName} · ${timeAgo(selected.updatedAt)}`
                    : `Created by ${selected.createdByName ?? "unknown"} · ${timeAgo(selected.createdAt)}`}
                </p>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleConvertToTask} data-testid="button-convert-task">
                    <CheckSquare className="h-3.5 w-3.5" /> Convert to Task
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleCopyAiBrief} data-testid="button-copy-ai-brief">
                    <ClipboardCopy className="h-3.5 w-3.5" /> Copy to AI Brief
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" data-testid="button-delete-note">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete note?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(selected.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Convert to Task dialog */}
      <Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Follow-up Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} className="mt-1" data-testid="input-task-title-from-note" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} rows={4} className="mt-1 resize-none" data-testid="textarea-task-desc-from-note" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTaskOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createTaskMutation.mutate({ title: taskTitle, description: taskDesc, companyId, status: "pending", priority: "medium", assignedByUserId: currentUserId, assignedByName: currentUserName })}
              disabled={!taskTitle.trim() || createTaskMutation.isPending}
              data-testid="button-submit-task-from-note">
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
