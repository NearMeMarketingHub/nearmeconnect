import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, X, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { HillChart } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const ITEM_COLORS = ["#f97316","#3b82f6","#10b981","#8b5cf6","#ef4444","#f59e0b","#06b6d4","#ec4899","#84cc16","#6366f1"];

interface HillItem { id: string; label: string; position: number; note: string; color: string; movedAt: string; }

// Bell curve: y = -4*(x/100 - 0.5)^2 + 1, normalized to SVG height
const W = 600; const H = 260; const PAD = 30;
function curveY(pos: number): number {
  const x = pos / 100;
  const y = -4 * Math.pow(x - 0.5, 2) + 1;
  return H - PAD - y * (H - PAD * 2);
}
function curveX(pos: number): number { return PAD + (pos / 100) * (W - PAD * 2); }

function buildCurvePath(): string {
  const pts = Array.from({ length: 101 }, (_, i) => `${curveX(i)},${curveY(i)}`);
  return `M ${pts[0]} ` + pts.slice(1).map(p => `L ${p}`).join(" ");
}

const CURVE_PATH = buildCurvePath();

function HillChartSvg({ items, readOnly, onMove }: { items: HillItem[]; readOnly?: boolean; onMove?: (id: string, pos: number) => void; }) {
  const [tooltip, setTooltip] = useState<{ id: string; x: number; y: number } | null>(null);
  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 280 }}>
        {/* Background */}
        <rect x={0} y={0} width={W} height={H} fill="transparent" />
        {/* Center divider */}
        <line x1={W / 2} y1={PAD} x2={W / 2} y2={H - PAD + 10} stroke="currentColor" strokeOpacity={0.12} strokeDasharray="4 4" />
        {/* Curve */}
        <path d={CURVE_PATH} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeWidth={2} />
        {/* Labels */}
        <text x={W / 2 - 80} y={H / 2 + 10} textAnchor="middle" className="fill-muted-foreground" fontSize={12} fontStyle="italic" opacity={0.5}>Figuring It Out</text>
        <text x={W / 2 + 80} y={H / 2 + 10} textAnchor="middle" className="fill-muted-foreground" fontSize={12} fontStyle="italic" opacity={0.5}>Making It Happen</text>
        {/* X axis labels */}
        <text x={PAD} y={H - 5} textAnchor="middle" fontSize={10} opacity={0.5} className="fill-muted-foreground">Just Started</text>
        <text x={W / 2} y={H - 5} textAnchor="middle" fontSize={10} opacity={0.5} className="fill-muted-foreground">Over the Hill</text>
        <text x={W - PAD} y={H - 5} textAnchor="middle" fontSize={10} opacity={0.5} className="fill-muted-foreground">Done</text>
        {/* Items */}
        {items.map(item => {
          const cx = curveX(item.position);
          const cy = curveY(item.position);
          const initials = item.label.slice(0, 2).toUpperCase();
          return (
            <g key={item.id}
              onMouseEnter={() => setTooltip({ id: item.id, x: cx, y: cy })}
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: readOnly ? "default" : "pointer" }}>
              <circle cx={cx} cy={cy} r={14} fill={item.color} opacity={0.9} />
              <text x={cx} y={cy + 4} textAnchor="middle" fontSize={9} fontWeight="bold" fill="white">{initials}</text>
              {tooltip?.id === item.id && (
                <g>
                  <rect x={cx - 60} y={cy - 52} width={120} height={46} rx={4} fill="black" opacity={0.8} />
                  <text x={cx} y={cy - 36} textAnchor="middle" fontSize={10} fill="white" fontWeight="bold">{item.label.slice(0, 20)}</text>
                  {item.note && <text x={cx} y={cy - 22} textAnchor="middle" fontSize={9} fill="white" opacity={0.8}>{item.note.slice(0, 22)}</text>}
                  <text x={cx} y={cy - 10} textAnchor="middle" fontSize={9} fill="white" opacity={0.6}>
                    {item.movedAt ? formatDistanceToNow(new Date(item.movedAt), { addSuffix: true }) : ""}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface Props { companyId: string; currentUserId: string; }

export function HillChartPanel({ companyId, currentUserId }: Props) {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newItemText, setNewItemText] = useState("");
  const [newItems, setNewItems] = useState<{ label: string; color: string }[]>([]);

  const { data: charts = [] } = useQuery<HillChart[]>({
    queryKey: ["/api/companies", companyId, "hill-charts"],
    queryFn: async () => { const r = await fetch(`/api/companies/${companyId}/hill-charts`); return r.json(); },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/companies/${companyId}/hill-charts`, data),
    onSuccess: async (r) => {
      const chart = await r.json();
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "hill-charts"] });
      setSelectedId(chart.id);
      setNewOpen(false); setNewTitle(""); setNewDesc(""); setNewItems([]);
    },
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/companies/${companyId}/hill-charts/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "hill-charts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/companies/${companyId}/hill-charts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "hill-charts"] });
      setSelectedId(null);
    },
  });

  const chart = charts.find(c => c.id === selectedId) ?? (charts.length > 0 ? charts[0] : null);
  const items: HillItem[] = (() => { try { return JSON.parse(chart?.items ?? "[]"); } catch { return []; } })();

  const updateItems = useCallback((next: HillItem[]) => {
    if (!chart) return;
    patchMutation.mutate({ id: chart.id, data: { items: JSON.stringify(next) } });
  }, [chart, patchMutation]);

  const addNewItem = () => {
    if (!newItemText.trim()) return;
    setNewItems(prev => [...prev, { label: newItemText.trim(), color: ITEM_COLORS[prev.length % ITEM_COLORS.length] }]);
    setNewItemText("");
  };

  const handleCreate = () => {
    const itemsJson = JSON.stringify(newItems.map((it, i) => ({
      id: `item-${Date.now()}-${i}`,
      label: it.label,
      position: 5,
      note: "",
      color: it.color,
      movedAt: new Date().toISOString(),
    })));
    createMutation.mutate({ title: newTitle, description: newDesc, items: itemsJson, createdBy: currentUserId, companyId });
  };

  const handleSliderChange = (itemId: string, pos: number) => {
    const next = items.map(it => it.id === itemId ? { ...it, position: pos, movedAt: new Date().toISOString() } : it);
    updateItems(next);
  };

  const handleNoteChange = (itemId: string, note: string) => {
    const next = items.map(it => it.id === itemId ? { ...it, note } : it);
    updateItems(next);
  };

  const handleRemoveItem = (itemId: string) => {
    updateItems(items.filter(it => it.id !== itemId));
  };

  const addItemToChart = () => {
    if (!newItemText.trim() || !chart) return;
    const next: HillItem = {
      id: `item-${Date.now()}`,
      label: newItemText.trim(),
      position: 5,
      note: "",
      color: ITEM_COLORS[items.length % ITEM_COLORS.length],
      movedAt: new Date().toISOString(),
    };
    updateItems([...items, next]);
    setNewItemText("");
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {charts.map(c => (
            <Button key={c.id} size="sm" variant={c.id === (chart?.id) ? "default" : "outline"}
              className={cn("h-8 text-xs", c.id === chart?.id && "bg-orange-500 hover:bg-orange-600")}
              onClick={() => setSelectedId(c.id)} data-testid={`chart-tab-${c.id}`}>
              {c.title}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" data-testid="button-new-hill-chart"><Plus className="h-4 w-4" />New Hill Chart</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>New Hill Chart</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Title (e.g. June Campaign)" value={newTitle} onChange={e => setNewTitle(e.target.value)} data-testid="input-hill-title" />
                <Input placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} data-testid="input-hill-desc" />
                <div>
                  <p className="text-sm font-medium mb-1.5">Work Items</p>
                  <div className="flex gap-2 mb-2">
                    <Input placeholder="Type item name, press Enter" value={newItemText}
                      onChange={e => setNewItemText(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addNewItem())}
                      data-testid="input-hill-item" />
                    <Button type="button" size="sm" onClick={addNewItem}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {newItems.map((it, i) => (
                      <span key={i} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full text-white" style={{ backgroundColor: it.color }}>
                        {it.label}
                        <button onClick={() => setNewItems(prev => prev.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={!newTitle.trim() || newItems.length === 0 || createMutation.isPending} data-testid="button-create-hill-chart">Create</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {chart && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10" data-testid="button-delete-hill-chart">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Delete "{chart.title}"?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteMutation.mutate(chart.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {!chart ? (
        <div className="text-center py-16 text-muted-foreground border rounded-lg">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hill charts yet</p>
          <p className="text-sm mt-1">Create one to track project progress visually</p>
        </div>
      ) : (
        <>
          {/* SVG chart */}
          <div className="border rounded-lg p-4 bg-muted/20">
            <div className="mb-2">
              <p className="font-semibold">{chart.title}</p>
              {chart.description && <p className="text-sm text-muted-foreground">{chart.description}</p>}
            </div>
            <HillChartSvg items={items} />
          </div>

          {/* Item list */}
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3 border rounded-lg p-3" data-testid={`hill-item-${item.id}`}>
                <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-medium truncate">{item.label}</span>
                    <Badge variant="secondary" className={cn("text-xs shrink-0", item.position < 50 ? "text-orange-600" : "text-green-600")}>
                      {item.position < 50 ? <><TrendingUp className="h-3 w-3 mr-0.5 inline" />Uphill</> : <><TrendingDown className="h-3 w-3 mr-0.5 inline" />Downhill</>}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">{item.position}%</span>
                  </div>
                  <Slider
                    min={0} max={100} step={1}
                    value={[item.position]}
                    onValueChange={([v]) => {
                      // Update local items array optimistically without a patch yet
                    }}
                    onValueCommit={([v]) => handleSliderChange(item.id, v)}
                    className="w-full"
                    data-testid={`slider-item-${item.id}`}
                  />
                  <Input
                    placeholder="Add a note..."
                    className="h-7 text-xs mt-1.5"
                    value={item.note}
                    onChange={e => handleNoteChange(item.id, e.target.value)}
                    data-testid={`input-note-${item.id}`}
                  />
                </div>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleRemoveItem(item.id)} data-testid={`button-remove-item-${item.id}`}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {/* Add item inline */}
            <div className="flex gap-2">
              <Input placeholder="Add a work item..." value={newItemText} onChange={e => setNewItemText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addItemToChart())}
                className="h-8 text-sm" data-testid="input-add-chart-item" />
              <Button size="sm" className="h-8" onClick={addItemToChart} disabled={!newItemText.trim()}>Add</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
