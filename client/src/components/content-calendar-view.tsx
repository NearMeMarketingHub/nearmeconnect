import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ContentCalendarItem, ContentPlatform, Company } from "@shared/schema";
import { contentPlatformEnum, contentStatusEnum } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight, Plus, Wand2, Loader2, Download, FileText, Calendar, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentItemModal, PLATFORM_CONFIG, STATUS_CONFIG } from "./content-item-modal";
import { BulkScheduleWizard } from "./bulk-schedule-wizard";

interface ContentCalendarViewProps {
  companyId?: string;
  companies: Company[];
}

type ViewMode = "month" | "week" | "list" | "queue";

// ── StatusDropdown ────────────────────────────────────────────────────────────
function StatusDropdown({ item, onStatusChange }: { item: ContentCalendarItem; onStatusChange: (id: string, status: string) => void }) {
  const cfg = STATUS_CONFIG[item.status];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity ${cfg?.color || ""}`} data-testid={`status-badge-${item.id}`}>
          {cfg?.label || item.status}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {contentStatusEnum.map(s => (
          <DropdownMenuItem key={s} onClick={() => onStatusChange(item.id, s)} data-testid={`status-option-${s}`}>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[s]?.color || ""}`}>
              {STATUS_CONFIG[s]?.label || s}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── MonthView ────────────────────────────────────────────────────────────────
function MonthView({ items, year, month, companies, onClickItem, onClickDay }: {
  items: ContentCalendarItem[]; year: number; month: number; companies: Company[];
  onClickItem: (item: ContentCalendarItem) => void; onClickDay: (date: string) => void;
}) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

  const itemsByDate = useMemo(() => {
    const map: Record<string, ContentCalendarItem[]> = {};
    for (const item of items) {
      if (item.scheduledDate) {
        if (!map[item.scheduledDate]) map[item.scheduledDate] = [];
        map[item.scheduledDate].push(item);
      }
    }
    return map;
  }, [items]);

  const days: Array<{ date: string | null; day: number; isCurrentMonth: boolean }> = [];
  for (let i = firstDay - 1; i >= 0; i--) days.push({ date: null, day: daysInPrevMonth - i, isCurrentMonth: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ date: dateStr, day: d, isCurrentMonth: true });
  }
  while (days.length < 42) days.push({ date: null, day: days.length - daysInMonth - firstDay + 1, isCurrentMonth: false });

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="grid grid-cols-7 border-b flex-shrink-0">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide border-r last:border-r-0">{d}</div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 overflow-auto" style={{ gridTemplateRows: "repeat(6, minmax(100px, 1fr))" }}>
        {days.map((day, i) => {
          const dayItems = day.date ? (itemsByDate[day.date] || []) : [];
          const isToday = day.date === today;
          return (
            <div
              key={i}
              className={`border-b border-r last:border-r-0 p-1 cursor-pointer transition-colors min-h-[100px] ${!day.isCurrentMonth ? "bg-muted/20" : "hover:bg-muted/20"} ${isToday ? "bg-primary/5" : ""}`}
              onClick={() => day.date && onClickDay(day.date)}
              data-testid={`calendar-day-${day.date || `overflow-${i}`}`}
            >
              <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 flex-shrink-0 ${isToday ? "bg-primary text-primary-foreground" : day.isCurrentMonth ? "" : "text-muted-foreground/40"}`}>
                {day.day}
              </div>
              <div className="space-y-0.5">
                {dayItems.slice(0, 3).map(item => {
                  const cfg = PLATFORM_CONFIG[item.platform];
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] font-medium truncate"
                      style={{ backgroundColor: (cfg?.color || "#6B7280") + "22", color: cfg?.color || "#6B7280", borderLeft: `2px solid ${cfg?.color || "#6B7280"}` }}
                      onClick={e => { e.stopPropagation(); onClickItem(item); }}
                      title={item.title}
                      data-testid={`chip-item-${item.id}`}
                    >
                      {cfg && <cfg.Icon className="h-2.5 w-2.5 flex-shrink-0" />}
                      <span className="truncate">{item.title.slice(0, 24)}</span>
                    </div>
                  );
                })}
                {dayItems.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1">+{dayItems.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── WeekView ─────────────────────────────────────────────────────────────────
function WeekView({ items, year, month, companies, onClickItem, onClickSlot }: {
  items: ContentCalendarItem[]; year: number; month: number; companies: Company[];
  onClickItem: (item: ContentCalendarItem) => void; onClickSlot: (date: string) => void;
}) {
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(year, month - 1, 1);
    d.setDate(d.getDate() - d.getDay());
    return d;
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const TIME_SLOTS = Array.from({ length: 13 }, (_, i) => i + 8);

  const getItemsForSlot = (date: Date, hour: number) => {
    const dateStr = date.toISOString().split("T")[0];
    return items.filter(item => {
      if (item.scheduledDate !== dateStr) return false;
      if (!item.scheduledTime) return false;
      return parseInt(item.scheduledTime.split(":")[0]) === hour;
    });
  };

  const getUnscheduled = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return items.filter(i => i.scheduledDate === dateStr && !i.scheduledTime);
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }} data-testid="week-prev">
          <ChevronLeft className="h-4 w-4 mr-1" />Prev
        </Button>
        <span className="text-sm font-medium flex-1 text-center">
          {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        <Button variant="ghost" size="sm" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }} data-testid="week-next">
          Next<ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="flex min-w-[600px]">
          <div className="w-14 flex-shrink-0 border-r">
            <div className="h-20 border-b bg-muted/20 flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground font-medium">Any Time</span>
            </div>
            {TIME_SLOTS.map(h => (
              <div key={h} className="h-14 border-b flex items-start pt-1 px-2 text-[10px] text-muted-foreground leading-tight">
                {h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`}
              </div>
            ))}
          </div>
          {weekDays.map((day, di) => {
            const dateStr = day.toISOString().split("T")[0];
            const isToday = dateStr === todayStr;
            return (
              <div key={di} className="flex-1 border-r last:border-r-0 min-w-[80px]">
                <div className={`h-20 border-b p-1 space-y-0.5 cursor-pointer ${isToday ? "bg-primary/5" : "hover:bg-muted/10"}`} onClick={() => onClickSlot(dateStr)}>
                  <div className="text-center pb-0.5">
                    <span className="text-[10px] text-muted-foreground">{day.toLocaleDateString("en-US", { weekday: "short" })}</span>
                    <p className={`text-xs font-semibold ${isToday ? "text-primary" : ""}`}>{day.getDate()}</p>
                  </div>
                  {getUnscheduled(day).map(item => {
                    const cfg = PLATFORM_CONFIG[item.platform];
                    return (
                      <div key={item.id} className="text-[9px] px-1 py-0.5 rounded truncate cursor-pointer"
                        style={{ backgroundColor: (cfg?.color || "#6B7280") + "22", color: cfg?.color || "#6B7280" }}
                        onClick={e => { e.stopPropagation(); onClickItem(item); }}>
                        {item.title.slice(0, 14)}
                      </div>
                    );
                  })}
                </div>
                {TIME_SLOTS.map(h => (
                  <div key={h} className="h-14 border-b p-0.5 space-y-0.5 cursor-pointer hover:bg-muted/10"
                    onClick={() => onClickSlot(dateStr)}>
                    {getItemsForSlot(day, h).map(item => {
                      const cfg = PLATFORM_CONFIG[item.platform];
                      return (
                        <div key={item.id} className="text-[9px] px-1 py-0.5 rounded truncate"
                          style={{ backgroundColor: (cfg?.color || "#6B7280") + "22", color: cfg?.color || "#6B7280" }}
                          onClick={e => { e.stopPropagation(); onClickItem(item); }}>
                          {item.title.slice(0, 14)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── ListView ─────────────────────────────────────────────────────────────────
function ListView({ items, companies, onClickItem, onStatusChange }: {
  items: ContentCalendarItem[]; companies: Company[];
  onClickItem: (item: ContentCalendarItem) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const { toast } = useToast();
  const [sortKey, setSortKey] = useState("scheduledDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const companyMap = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies]);

  const sorted = useMemo(() => [...items].sort((a, b) => {
    const av = (a as any)[sortKey] || "";
    const bv = (b as any)[sortKey] || "";
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  }), [items, sortKey, sortDir]);

  const toggleSort = (k: string) => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  const exportCSV = () => {
    const headers = ["Date", "Company", "Platform", "Type", "Title", "Status"];
    const rows = sorted.map(i => [
      i.scheduledDate || "",
      companyMap[i.companyId]?.name || i.companyId,
      PLATFORM_CONFIG[i.platform]?.label || i.platform,
      i.contentType,
      i.title,
      i.status,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "content-calendar.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported" });
  };

  const SortTH = ({ field, label }: { field: string; label: string }) => (
    <TableHead className="cursor-pointer select-none hover:text-foreground whitespace-nowrap" onClick={() => toggleSort(field)}>
      {label}{sortKey === field && <span className="ml-1 text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>}
    </TableHead>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
        <span className="text-sm text-muted-foreground">
          {selected.size > 0 ? `${selected.size} selected` : `${sorted.length} items`}
        </span>
        <Button variant="outline" size="sm" onClick={exportCSV} data-testid="button-export-csv">
          <Download className="h-4 w-4 mr-2" />Export CSV
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <input type="checkbox"
                  checked={selected.size === items.length && items.length > 0}
                  onChange={e => setSelected(e.target.checked ? new Set(items.map(i => i.id)) : new Set())}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <SortTH field="scheduledDate" label="Date" />
              <TableHead>Company</TableHead>
              <SortTH field="platform" label="Platform" />
              <SortTH field="contentType" label="Type" />
              <SortTH field="title" label="Title" />
              <SortTH field="status" label="Status" />
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <FileText className="h-10 w-10 opacity-20" />
                    <p className="text-sm font-medium">No content items yet</p>
                    <p className="text-xs">Use the <strong>New Item</strong> button above to add your first post.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : sorted.map(item => {
              const cfg = PLATFORM_CONFIG[item.platform];
              return (
                <TableRow key={item.id} data-testid={`row-content-${item.id}`}>
                  <TableCell>
                    <input type="checkbox" checked={selected.has(item.id)}
                      onChange={e => { const s = new Set(selected); e.target.checked ? s.add(item.id) : s.delete(item.id); setSelected(s); }}
                      onClick={e => e.stopPropagation()} data-testid={`checkbox-${item.id}`}
                    />
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {item.scheduledDate
                      ? new Date(item.scheduledDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm max-w-[120px] truncate">{companyMap[item.companyId]?.name || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs font-medium whitespace-nowrap" style={{ color: cfg?.color }}>
                      {cfg && <cfg.Icon className="h-3 w-3" />}
                      <span className="hidden sm:inline">{cfg?.label}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs capitalize whitespace-nowrap">{item.contentType}</TableCell>
                  <TableCell className="max-w-[180px] truncate text-sm cursor-pointer" onClick={() => onClickItem(item)} data-testid={`cell-title-${item.id}`}>
                    {item.title}
                  </TableCell>
                  <TableCell><StatusDropdown item={item} onStatusChange={onStatusChange} /></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onClickItem(item)} data-testid={`button-edit-${item.id}`}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── QueueView ────────────────────────────────────────────────────────────────
function QueueView({ items, companies, onClickItem }: {
  items: ContentCalendarItem[]; companies: Company[];
  onClickItem: (item: ContentCalendarItem) => void;
}) {
  const companyMap = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const thisWeekEnd = new Date(today); thisWeekEnd.setDate(today.getDate() + 7);
  const nextWeekEnd = new Date(today); nextWeekEnd.setDate(today.getDate() + 14);

  const grouped = useMemo(() => {
    const sorted = [...items].filter(i => i.scheduledDate)
      .sort((a, b) => ((a.scheduledDate || "") + (a.scheduledTime || "")) < ((b.scheduledDate || "") + (b.scheduledTime || "")) ? -1 : 1);
    const g: Record<string, ContentCalendarItem[]> = { Today: [], Tomorrow: [], "This Week": [], "Next Week": [], Later: [], Unscheduled: [] };
    for (const item of items.filter(i => !i.scheduledDate)) g.Unscheduled.push(item);
    for (const item of sorted) {
      const d = new Date(item.scheduledDate! + "T00:00:00");
      if (d.toDateString() === today.toDateString()) g.Today.push(item);
      else if (d.toDateString() === tomorrow.toDateString()) g.Tomorrow.push(item);
      else if (d < thisWeekEnd) g["This Week"].push(item);
      else if (d < nextWeekEnd) g["Next Week"].push(item);
      else g.Later.push(item);
    }
    return g;
  }, [items]);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {Object.entries(grouped).map(([label, groupItems]) => {
        if (groupItems.length === 0) return null;
        return (
          <div key={label}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label} <span className="font-normal">({groupItems.length})</span></h3>
            <div className="space-y-1.5">
              {groupItems.map(item => {
                const cfg = PLATFORM_CONFIG[item.platform];
                const company = companyMap[item.companyId];
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => onClickItem(item)}
                    data-testid={`queue-item-${item.id}`}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: (cfg?.color || "#6B7280") + "22" }}>
                      {cfg && <cfg.Icon className="h-4 w-4" style={{ color: cfg.color }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{item.title}</span>
                        {company && <Badge variant="outline" className="text-[10px] py-0 px-1.5 flex-shrink-0">{company.name}</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {item.scheduledDate ? new Date(item.scheduledDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "No date"}
                          {item.scheduledTime && ` · ${item.scheduledTime}`}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_CONFIG[item.status]?.color || ""}`}>
                          {STATUS_CONFIG[item.status]?.label || item.status}
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs flex-shrink-0 h-7" onClick={e => e.stopPropagation()} data-testid={`button-push-hubspot-${item.id}`}>
                      Push HubSpot
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {Object.values(grouped).every(g => g.length === 0) && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No scheduled content</p>
          <p className="text-xs mt-1">Create items and schedule them to see them here</p>
        </div>
      )}
    </div>
  );
}

// ── ContentCalendarView (main) ─────────────────────────────────────────────
export function ContentCalendarView({ companyId, companies }: ContentCalendarViewProps) {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedPlatforms, setSelectedPlatforms] = useState<ContentPlatform[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [companyFilter, setCompanyFilter] = useState(companyId || "");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentCalendarItem | null>(null);
  const [initialDate, setInitialDate] = useState<string | undefined>();
  const [wizardOpen, setWizardOpen] = useState(false);

  const queryCompanyId = companyFilter || companyId;
  const params = new URLSearchParams();
  if (queryCompanyId) params.set("companyId", queryCompanyId);
  params.set("month", String(month));
  params.set("year", String(year));

  const { data: items = [], isLoading } = useQuery<ContentCalendarItem[]>({
    queryKey: [`/api/content-calendar?${params.toString()}`],
  });

  const filteredItems = useMemo(() => items.filter(item =>
    (selectedPlatforms.length === 0 || selectedPlatforms.includes(item.platform as ContentPlatform)) &&
    (selectedStatus === "all" || item.status === selectedStatus)
  ), [items, selectedPlatforms, selectedStatus]);

  const statusChangeMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/content-calendar/${id}`, { status });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/content-calendar"] }),
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openNew = (date?: string) => { setEditingItem(null); setInitialDate(date); setModalOpen(true); };
  const openEdit = (item: ContentCalendarItem) => { setEditingItem(item); setInitialDate(undefined); setModalOpen(true); };

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const VIEW_MODES: Array<{ id: ViewMode; label: string }> = [
    { id: "month", label: "Month" },
    { id: "week", label: "Week" },
    { id: "list", label: "List" },
    { id: "queue", label: "Queue" },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b flex-shrink-0">
        <h1 className="text-lg font-semibold">Content Calendar</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWizardOpen(true)} data-testid="button-build-schedule">
            <Wand2 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Build Schedule</span>
          </Button>
          <Button size="sm" onClick={() => openNew()} data-testid="button-new-content-item">
            <Plus className="h-4 w-4 mr-2" />
            New Item
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b flex-shrink-0 bg-background">
        {/* View mode toggles */}
        <div className="flex rounded-md border overflow-hidden flex-shrink-0">
          {VIEW_MODES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              className={`px-3 py-1.5 text-sm transition-colors ${viewMode === id ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
              data-testid={`view-mode-${id}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Month navigation */}
        {(viewMode === "month" || viewMode === "week") && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth} data-testid="button-prev-month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[130px] text-center">
              {new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth} data-testid="button-next-month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Company filter (all-companies mode only) */}
        {!companyId && (
          <Select value={companyFilter || "_all"} onValueChange={v => setCompanyFilter(v === "_all" ? "" : v)}>
            <SelectTrigger className="h-8 w-40 text-sm" data-testid="select-company-filter">
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Companies</SelectItem>
              {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {/* Status filter */}
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="h-8 w-32 text-sm" data-testid="select-status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {contentStatusEnum.map(s => (
              <SelectItem key={s} value={s}>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_CONFIG[s]?.color || ""}`}>
                  {STATUS_CONFIG[s]?.label || s}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Platform filter pills */}
        <div className="flex flex-wrap gap-1">
          {contentPlatformEnum.map(platform => {
            const cfg = PLATFORM_CONFIG[platform];
            const active = selectedPlatforms.length === 0 || selectedPlatforms.includes(platform);
            return (
              <button
                key={platform}
                onClick={() => setSelectedPlatforms(prev =>
                  prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
                )}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-all ${active ? "opacity-100" : "opacity-30"}`}
                style={{ borderColor: cfg.color, color: cfg.color, backgroundColor: selectedPlatforms.includes(platform) ? cfg.darkBg : "transparent" }}
                data-testid={`filter-platform-${platform}`}
              >
                <cfg.Icon className="h-3 w-3" />
                <span className="hidden md:inline">{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            {viewMode === "month" ? (
              <div className="grid grid-cols-7 gap-1">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                  <Skeleton key={d} className="h-6 rounded" />
                ))}
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : viewMode === "list" ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-lg w-full" />
                ))}
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg w-full" />
                ))}
              </div>
            )}
          </div>
        ) : viewMode === "month" ? (
          <MonthView items={filteredItems} year={year} month={month} companies={companies} onClickItem={openEdit} onClickDay={date => openNew(date)} />
        ) : viewMode === "week" ? (
          <WeekView items={filteredItems} year={year} month={month} companies={companies} onClickItem={openEdit} onClickSlot={date => openNew(date)} />
        ) : viewMode === "list" ? (
          <ListView items={filteredItems} companies={companies} onClickItem={openEdit} onStatusChange={(id, status) => statusChangeMutation.mutate({ id, status })} />
        ) : (
          <QueueView items={filteredItems} companies={companies} onClickItem={openEdit} />
        )}
      </div>

      <ContentItemModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialDate={initialDate}
        initialCompanyId={queryCompanyId}
        item={editingItem}
        companies={companies}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["/api/content-calendar"] })}
      />

      <BulkScheduleWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        companyId={queryCompanyId}
        companies={companies}
        defaultMonth={month}
        defaultYear={year}
        onCreated={() => { queryClient.invalidateQueries({ queryKey: ["/api/content-calendar"] }); setWizardOpen(false); }}
      />
    </div>
  );
}
