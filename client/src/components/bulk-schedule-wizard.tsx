import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Company, ContentPillar } from "@shared/schema";
import { contentPlatformEnum } from "@shared/schema";
import { PLATFORM_CONFIG } from "./content-item-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronRight, ChevronLeft, CalendarRange } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface FrequencyConfig {
  postsPerWeek: number;
  days: number[];
}

interface Slot {
  date: string;
  platform: string;
  day: string;
  pillarId?: string;
  pillarName?: string;
}

interface BulkScheduleWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  companies: Company[];
  defaultMonth: number;
  defaultYear: number;
  onCreated: () => void;
}

export function BulkScheduleWizard({ open, onOpenChange, companyId: initialCompanyId, companies, defaultMonth, defaultYear, onCreated }: BulkScheduleWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const TOTAL = 6;

  const [selectedCompanyId, setSelectedCompanyId] = useState(initialCompanyId || "");
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["google_business"]);
  const [frequencies, setFrequencies] = useState<Record<string, FrequencyConfig>>(
    Object.fromEntries(contentPlatformEnum.map(p => [p, { postsPerWeek: 3, days: [1, 3, 5] }]))
  );
  const [slots, setSlots] = useState<Slot[]>([]);

  const { data: pillars = [] } = useQuery<ContentPillar[]>({
    queryKey: [`/api/companies/${selectedCompanyId}/content-pillars`],
    enabled: !!selectedCompanyId && step >= 4,
  });

  const bulkMutation = useMutation({
    mutationFn: async () => {
      const items = slots.map(slot => ({
        companyId: selectedCompanyId,
        platform: slot.platform,
        contentType: "post",
        title: `${PLATFORM_CONFIG[slot.platform]?.label || slot.platform} Post – ${slot.date}`,
        scheduledDate: slot.date,
        status: "draft",
        pillarId: slot.pillarId || undefined,
      }));
      const res = await apiRequest("POST", "/api/content-calendar/bulk", { items });
      return res.json();
    },
    onSuccess: (data: any[]) => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-calendar"] });
      toast({ title: `✓ Created ${data.length} draft items!` });
      onCreated();
      handleClose();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const generateSlots = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const activePillars = pillars.filter(p => p.isActive);
    const newSlots: Slot[] = [];

    for (const platform of selectedPlatforms) {
      const freq = frequencies[platform];
      if (!freq) continue;
      let pillarIdx = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(selectedYear, selectedMonth - 1, d);
        const dow = date.getDay();
        if (!freq.days.includes(dow)) continue;
        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const pillar = activePillars.length > 0 ? activePillars[pillarIdx % activePillars.length] : undefined;
        newSlots.push({ date: dateStr, platform, day: DAYS_OF_WEEK[dow], pillarId: pillar?.id, pillarName: pillar?.name });
        if (activePillars.length > 0) pillarIdx++;
      }
    }
    newSlots.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    setSlots(newSlots);
    setStep(5);
  };

  const handleClose = () => { setStep(1); setSlots([]); onOpenChange(false); };
  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5" />
            Build Schedule — Step {step} of {TOTAL}
          </DialogTitle>
          <div className="w-full h-1.5 bg-muted rounded-full mt-2">
            <div className="h-1.5 bg-primary rounded-full transition-all duration-300" style={{ width: `${(step / TOTAL) * 100}%` }} />
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          {/* Step 1: Company + Month */}
          {step === 1 && (
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-semibold">Select Company & Month</h3>
              <div>
                <Label>Company *</Label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger className="mt-1" data-testid="wizard-select-company">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Month</Label>
                  <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(parseInt(v))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {new Date(2000, i).toLocaleDateString("en-US", { month: "long" })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Year</Label>
                  <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(parseInt(v))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2025, 2026, 2027, 2028].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Platform selection */}
          {step === 2 && (
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-semibold">Select Platforms for {monthName}</h3>
              <div className="grid grid-cols-2 gap-3">
                {contentPlatformEnum.map(platform => {
                  const cfg = PLATFORM_CONFIG[platform];
                  const isSelected = selectedPlatforms.includes(platform);
                  return (
                    <div
                      key={platform}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/30"}`}
                      onClick={() => setSelectedPlatforms(prev => isSelected ? prev.filter(p => p !== platform) : [...prev, platform])}
                      data-testid={`wizard-platform-${platform}`}
                    >
                      <Checkbox checked={isSelected} />
                      <cfg.Icon className="h-4 w-4" style={{ color: cfg.color }} />
                      <span className="text-sm font-medium">{cfg.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Frequency */}
          {step === 3 && (
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-semibold">Set Posting Frequency</h3>
              <div className="space-y-4">
                {selectedPlatforms.map(platform => {
                  const cfg = PLATFORM_CONFIG[platform];
                  const freq = frequencies[platform];
                  return (
                    <div key={platform} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <cfg.Icon className="h-4 w-4" style={{ color: cfg.color }} />
                        <span className="font-medium text-sm">{cfg.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Label className="text-xs w-28 flex-shrink-0">Posts per week</Label>
                        <Input
                          type="number" min={1} max={7}
                          value={freq.postsPerWeek}
                          onChange={e => setFrequencies(f => ({ ...f, [platform]: { ...f[platform], postsPerWeek: Math.max(1, Math.min(7, parseInt(e.target.value) || 1)) } }))}
                          className="w-20"
                          data-testid={`wizard-freq-${platform}`}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Publishing days</Label>
                        <div className="flex gap-1.5 mt-1.5">
                          {DAYS_OF_WEEK.map((day, i) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => setFrequencies(f => {
                                const days = f[platform].days.includes(i) ? f[platform].days.filter(d => d !== i) : [...f[platform].days, i];
                                return { ...f, [platform]: { ...f[platform], days } };
                              })}
                              className={`w-9 h-9 rounded-full text-xs font-medium border transition-colors ${freq.days.includes(i) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                              data-testid={`wizard-day-${platform}-${i}`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Pillar rotation */}
          {step === 4 && (
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-semibold">Content Pillar Rotation</h3>
              {pillars.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <p className="text-sm">No content pillars configured for this company.</p>
                  <p className="text-xs mt-1">Posts will be created without pillar assignment.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">Posts are distributed evenly across active pillars in rotation order.</p>
                  <div className="space-y-2">
                    {pillars.filter(p => p.isActive).map(pillar => {
                      const activePct = Math.round(100 / pillars.filter(p => p.isActive).length);
                      return (
                        <div key={pillar.id} className="flex items-center gap-3 p-3 rounded-lg border">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: pillar.color }} />
                          <span className="text-sm font-medium flex-1">{pillar.name}</span>
                          <Badge variant="secondary" className="text-[10px]">~{activePct}%</Badge>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 5: Preview */}
          {step === 5 && (
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Preview — {slots.length} slots</h3>
                <Badge variant="outline">{monthName}</Badge>
              </div>
              {slots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No slots generated. Go back and select at least one platform and publishing day.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Pillar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slots.map((slot, i) => {
                      const cfg = PLATFORM_CONFIG[slot.platform];
                      return (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{new Date(slot.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{slot.day}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: cfg?.color }}>
                              <cfg.Icon className="h-3 w-3" />
                              {cfg?.label}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{slot.pillarName || "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {/* Step 6: Confirm */}
          {step === 6 && (
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-semibold">Confirm & Generate</h3>
              <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                <p className="text-sm"><strong>Company:</strong> {companies.find(c => c.id === selectedCompanyId)?.name}</p>
                <p className="text-sm"><strong>Month:</strong> {monthName}</p>
                <p className="text-sm"><strong>Platforms:</strong> {selectedPlatforms.map(p => PLATFORM_CONFIG[p]?.label).join(", ")}</p>
                <p className="text-sm"><strong>Items to create:</strong> {slots.length} draft placeholders</p>
              </div>
              <p className="text-xs text-muted-foreground">
                This creates {slots.length} draft items as placeholders. Fill in copy and media for each item after generation.
              </p>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="px-6 py-3 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => step > 1 ? setStep(s => s - 1) : handleClose()} data-testid="wizard-back">
            {step === 1 ? "Cancel" : <><ChevronLeft className="h-4 w-4 mr-1" />Back</>}
          </Button>
          <Button
            onClick={() => { if (step === 4) generateSlots(); else if (step === 6) bulkMutation.mutate(); else setStep(s => s + 1); }}
            disabled={(step === 1 && !selectedCompanyId) || (step === 2 && selectedPlatforms.length === 0) || (step === 6 && bulkMutation.isPending)}
            data-testid="wizard-next"
          >
            {bulkMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {step === 6 ? "Generate Schedule" : step === 4 ? <>Generate Preview <ChevronRight className="h-4 w-4 ml-1" /></> : <>Next <ChevronRight className="h-4 w-4 ml-1" /></>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
