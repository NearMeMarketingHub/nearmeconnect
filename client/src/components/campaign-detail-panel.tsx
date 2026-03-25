import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { parseLocalDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Search,
  Clock,
  CheckCircle2,
  Calendar,
  Coins,
  Building2,
  User,
  Target,
  MessageSquare,
  Link2,
  DollarSign,
  FileText,
  Package,
  Save,
  Zap,
  CircleDot,
  XCircle,
  Loader2,
  Users,
  Video,
  Pencil,
  Plus,
  Minus,
  X,
  RotateCcw,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { CampaignRequest, CampaignType, DeliverableType, Task, MeetingType, CompanyMember } from "@shared/schema";

interface CampaignDetailPanelProps {
  campaign: CampaignRequest | null;
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  companyId?: string;
  onTaskClick?: (task: Task) => void;
}

export function CampaignDetailPanel({
  campaign,
  open,
  onClose,
  isAdmin,
  companyId,
  onTaskClick,
}: CampaignDetailPanelProps) {
  const { toast } = useToast();
  const [adminNotes, setAdminNotes] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editDeliverableIds, setEditDeliverableIds] = useState<string[]>([]);
  const [editDelQuantities, setEditDelQuantities] = useState<Record<string, number>>({});
  const [editMtgQuantities, setEditMtgQuantities] = useState<Record<string, number>>({});
  const [editDelSearchOpen, setEditDelSearchOpen] = useState(false);
  const [editDelSearch, setEditDelSearch] = useState("");
  const [editMtgSearchOpen, setEditMtgSearchOpen] = useState(false);
  const [editMtgSearch, setEditMtgSearch] = useState("");
  const [rushDisabledLocal, setRushDisabledLocal] = useState(false);

  useEffect(() => {
    if (campaign) {
      setAdminNotes(campaign.adminNotes || "");
      setIsEditing(false);
      setRushDisabledLocal(campaign.rushDisabled ?? false);
    }
  }, [campaign]);

  const { data: campaignTypes } = useQuery<CampaignType[]>({
    queryKey: ["/api/campaign-types"],
    enabled: open && !!campaign,
  });

  const { data: deliverableTypes } = useQuery<DeliverableType[]>({
    queryKey: ["/api/deliverable-types"],
    enabled: open && !!campaign,
  });

  const { data: campaignTasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/campaign", campaign?.id],
    queryFn: async () => {
      if (!campaign) return [];
      const response = await fetch(`/api/tasks/campaign/${campaign.id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: open && !!campaign,
  });

  const campaignCompanyId = companyId || campaign?.companyId;
  const { data: companyMembers } = useQuery<(CompanyMember & { firstName?: string; lastName?: string; email?: string })[]>({
    queryKey: ["/api/companies", campaignCompanyId, "members"],
    enabled: open && !!campaignCompanyId && (campaign?.campaignMemberIds?.length ?? 0) > 0,
  });

  const campaignType = campaignTypes?.find(ct => ct.id === campaign?.campaignTypeId);
  const meetingTypeQuantitiesMap: Record<string, number> = (() => {
    if (!campaignType?.meetingTypeQuantities) return {};
    try { return JSON.parse(campaignType.meetingTypeQuantities); } catch { return {}; }
  })();
  const hasMeetingTypes = Object.entries(meetingTypeQuantitiesMap).some(([, qty]) => qty > 0);

  const { data: allMeetingTypes } = useQuery<MeetingType[]>({
    queryKey: ["/api/meeting-types"],
    enabled: open && (hasMeetingTypes || isAdmin),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return apiRequest("PATCH", `/api/campaign-requests/${campaign?.id}`, { status });
    },
    onSuccess: () => {
      const cid = companyId || campaign?.companyId;
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaign-requests"] });
      if (cid) queryClient.invalidateQueries({ queryKey: ["/api/companies", cid, "campaign-requests"] });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks/campaign", campaign?.id] });
      }, 1000);
      toast({ title: "Status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      return apiRequest("PATCH", `/api/campaign-requests/${campaign?.id}`, { adminNotes: notes });
    },
    onSuccess: () => {
      const cid = companyId || campaign?.companyId;
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaign-requests"] });
      if (cid) queryClient.invalidateQueries({ queryKey: ["/api/companies", cid, "campaign-requests"] });
      toast({ title: "Notes saved" });
    },
    onError: () => {
      toast({ title: "Failed to save notes", variant: "destructive" });
    },
  });

  const saveEditsMutation = useMutation({
    mutationFn: async (data: {
      requestDeliverableIds: string[];
      requestDeliverableQuantities: string;
      requestMeetingQuantities: string;
      estimatedCredits: string;
    }) => {
      return apiRequest("PATCH", `/api/campaign-requests/${campaign?.id}`, data);
    },
    onSuccess: () => {
      const cid = companyId || campaign?.companyId;
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaign-requests"] });
      if (cid) queryClient.invalidateQueries({ queryKey: ["/api/companies", cid, "campaign-requests"] });
      setIsEditing(false);
      toast({ title: "Campaign request updated" });
    },
    onError: () => {
      toast({ title: "Failed to save changes", variant: "destructive" });
    },
  });

  const toggleRushMutation = useMutation({
    mutationFn: async (newRushDisabled: boolean) => {
      setRushDisabledLocal(newRushDisabled);
      return apiRequest("PATCH", `/api/campaign-requests/${campaign?.id}`, { rushDisabled: newRushDisabled });
    },
    onSuccess: (_data, newRushDisabled) => {
      const cid = companyId || campaign?.companyId;
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaign-requests"] });
      if (cid) queryClient.invalidateQueries({ queryKey: ["/api/companies", cid, "campaign-requests"] });
      toast({ title: newRushDisabled ? "Rush disabled - credits at normal rate" : "Rush re-enabled - credits doubled" });
    },
    onError: (_err, newRushDisabled) => {
      setRushDisabledLocal(!newRushDisabled);
      toast({ title: "Failed to toggle rush", variant: "destructive" });
    },
  });

  const isRushEffective = campaign?.isRush && !rushDisabledLocal;

  if (!campaign) return null;

  const campaignTypeName = campaignType?.name || "Unknown Campaign";

  const displayedCredits = (() => {
    const storedCredits = parseFloat(campaign.estimatedCredits || "0");
    const storedRushDisabled = campaign.rushDisabled ?? false;
    if (!campaign.isRush || rushDisabledLocal === storedRushDisabled) return storedCredits.toFixed(2);
    if (rushDisabledLocal && !storedRushDisabled) return (storedCredits / 2).toFixed(2);
    if (!rushDisabledLocal && storedRushDisabled) return (storedCredits * 2).toFixed(2);
    return storedCredits.toFixed(2);
  })();

  const parseDeliverableQuantities = (): Record<string, number> => {
    if (!campaign.deliverableQuantities) return {};
    try {
      return JSON.parse(campaign.deliverableQuantities);
    } catch {
      return {};
    }
  };

  const getDeliverableName = (id: string): string => {
    return deliverableTypes?.find((d) => d.id === id)?.name || id;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="flex items-center gap-1" data-testid="badge-status-pending">
            <Clock className="w-3 h-3" /> Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-blue-500 text-white flex items-center gap-1" data-testid="badge-status-approved">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-amber-500 text-white" data-testid="badge-status-in-progress">
            In Progress
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-500 text-white" data-testid="badge-status-completed">
            Completed
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" data-testid="badge-status-rejected">
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTaskStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-xs">Not Started</Badge>;
      case "in_progress":
        return <Badge className="bg-amber-500 text-white text-xs">In Progress</Badge>;
      case "review":
        return <Badge className="bg-blue-500 text-white text-xs">In Review</Badge>;
      case "completed":
        return <Badge className="bg-green-500 text-white text-xs">Completed</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const quantities = parseDeliverableQuantities();
  const deliverableIds = campaign.requestDeliverableIds || campaignType?.includedDeliverableIds || [];

  const effectiveMeetingQuantities: Record<string, number> = (() => {
    if (campaign.requestMeetingQuantities) {
      try { return JSON.parse(campaign.requestMeetingQuantities); } catch { return meetingTypeQuantitiesMap; }
    }
    return meetingTypeQuantitiesMap;
  })();
  const hasEffectiveMeetings = Object.entries(effectiveMeetingQuantities).some(([, qty]) => qty > 0);

  const effectiveDelQuantities: Record<string, number> = (() => {
    if (campaign.requestDeliverableQuantities) {
      try { return JSON.parse(campaign.requestDeliverableQuantities); } catch { return quantities; }
    }
    return quantities;
  })();

  const startEditing = () => {
    setEditDeliverableIds([...deliverableIds]);
    setEditDelQuantities({ ...effectiveDelQuantities });
    setEditMtgQuantities({ ...effectiveMeetingQuantities });
    setIsEditing(true);
  };

  const calculateEditTotal = () => {
    let total = 0;
    for (const delId of editDeliverableIds) {
      const del = deliverableTypes?.find(d => d.id === delId || d.key === delId);
      const qty = editDelQuantities[delId] || 1;
      total += parseFloat(del?.credits || "0") * qty;
    }
    for (const [mtId, qty] of Object.entries(editMtgQuantities)) {
      if (qty <= 0) continue;
      const mt = allMeetingTypes?.find(t => t.id === mtId);
      total += parseFloat(mt?.creditCost || "0") * qty;
    }
    if (campaign.isRush && !rushDisabledLocal) total *= 2;
    return total;
  };

  const handleSaveEdits = () => {
    const total = calculateEditTotal();
    saveEditsMutation.mutate({
      requestDeliverableIds: editDeliverableIds,
      requestDeliverableQuantities: JSON.stringify(editDelQuantities),
      requestMeetingQuantities: JSON.stringify(editMtgQuantities),
      estimatedCredits: String(total),
    });
  };

  const availableDeliverablesForAdd = deliverableTypes?.filter(d => !editDeliverableIds.includes(d.id)) || [];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0" data-testid="campaign-detail-panel">
        <ScrollArea className="h-full w-full">
          <div className="p-6 space-y-6">
            <SheetHeader className="space-y-3 pr-6">
              <SheetTitle className="text-lg font-semibold" data-testid="text-campaign-type-name">
                {campaign.name || campaignTypeName}
              </SheetTitle>
              {campaign.name && (
                <p className="text-sm text-muted-foreground">{campaignTypeName}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(campaign.status)}
                {campaign.isRush && !rushDisabledLocal && (
                  <Badge className="bg-amber-500 text-white" data-testid="badge-rush">
                    <Zap className="w-3 h-3 mr-1" />
                    Rush
                  </Badge>
                )}
                {campaign.isRush && rushDisabledLocal && (
                  <Badge variant="outline" className="text-muted-foreground" data-testid="badge-rush-disabled">
                    <Zap className="w-3 h-3 mr-1" />
                    Rush Off
                  </Badge>
                )}
              </div>
            </SheetHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Due Date
                  </Label>
                  <p className="text-sm font-medium" data-testid="text-due-date">
                    {parseLocalDate(campaign.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Coins className="w-3 h-3" /> Estimated Credits
                  </Label>
                  <p className="text-sm font-medium" data-testid="text-estimated-credits">
                    {displayedCredits}
                  </p>
                </div>
              </div>

              {isAdmin && (campaign as any).companyName && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Company
                  </Label>
                  <p className="text-sm" data-testid="text-company-name">
                    {(campaign as any).companyName}
                  </p>
                </div>
              )}

              {(campaign as any).requestedByName && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" /> Requested By
                  </Label>
                  <p className="text-sm" data-testid="text-requested-by">
                    {(campaign as any).requestedByName}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Requested
                </Label>
                <p className="text-sm text-muted-foreground" data-testid="text-created-at">
                  {new Date(campaign.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {isAdmin && isEditing ? (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm font-medium flex items-center gap-1">
                      <Pencil className="w-3 h-3" /> Edit Campaign Scope
                    </Label>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setIsEditing(false); setEditDeliverableIds([...deliverableIds]); setEditDelQuantities({ ...effectiveDelQuantities }); setEditMtgQuantities({ ...effectiveMeetingQuantities }); }} data-testid="button-cancel-edit">
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveEdits} disabled={saveEditsMutation.isPending} data-testid="button-save-edits">
                        {saveEditsMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                        Save
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Deliverables</Label>
                    {editDeliverableIds.map((delId) => {
                      const del = deliverableTypes?.find(d => d.id === delId || d.key === delId);
                      const qty = editDelQuantities[delId] || 1;
                      return (
                        <div key={delId} className="flex items-center justify-between gap-2 p-2 rounded-md border" data-testid={`edit-deliverable-${delId}`}>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm">{del?.name || delId}</span>
                            <span className="text-xs text-muted-foreground ml-2">({del?.credits || 0} cr ea)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditDelQuantities(prev => ({ ...prev, [delId]: Math.max(1, (prev[delId] || 1) - 1) }))}
                              data-testid={`button-del-minus-${delId}`}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <Input
                              type="number"
                              min={1}
                              value={qty}
                              onChange={(e) => setEditDelQuantities(prev => ({ ...prev, [delId]: Math.max(1, parseInt(e.target.value) || 1) }))}
                              className="w-14 text-center text-sm"
                              data-testid={`input-del-qty-${delId}`}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditDelQuantities(prev => ({ ...prev, [delId]: (prev[delId] || 1) + 1 }))}
                              data-testid={`button-del-plus-${delId}`}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => {
                                setEditDeliverableIds(prev => prev.filter(id => id !== delId));
                                setEditDelQuantities(prev => { const next = { ...prev }; delete next[delId]; return next; });
                              }}
                              data-testid={`button-del-remove-${delId}`}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    <Popover open={editDelSearchOpen} onOpenChange={(open) => { setEditDelSearchOpen(open); if (!open) setEditDelSearch(""); }} modal={false}>
                      <PopoverTrigger asChild>
                        <Button type="button" size="sm" variant="outline" disabled={availableDeliverablesForAdd.length === 0} data-testid="button-edit-add-deliverable">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Deliverable
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0" align="start" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2 px-3 py-2 border-b">
                          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                          <input
                            type="text"
                            placeholder="Search deliverables..."
                            value={editDelSearch}
                            onChange={(e) => setEditDelSearch(e.target.value)}
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            data-testid="input-edit-deliverable-search"
                          />
                        </div>
                        <div className="space-y-1 max-h-60 overflow-y-auto overscroll-contain p-2">
                          {availableDeliverablesForAdd.filter(d => d.name.toLowerCase().includes(editDelSearch.toLowerCase())).map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              className="w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-left hover-elevate"
                              onClick={() => {
                                setEditDeliverableIds(prev => [...prev, d.id]);
                                setEditDelQuantities(prev => ({ ...prev, [d.id]: 1 }));
                                setEditDelSearchOpen(false);
                                setEditDelSearch("");
                              }}
                              data-testid={`button-edit-pick-del-${d.id}`}
                            >
                              <span className="truncate">{d.name}</span>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">{d.credits} cr</span>
                            </button>
                          ))}
                          {availableDeliverablesForAdd.filter(d => d.name.toLowerCase().includes(editDelSearch.toLowerCase())).length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-2">No matches found</p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs text-muted-foreground">Meeting Types</Label>
                      <Popover open={editMtgSearchOpen} onOpenChange={(open) => { setEditMtgSearchOpen(open); if (!open) setEditMtgSearch(""); }} modal={false}>
                        <PopoverTrigger asChild>
                          <Button type="button" size="sm" variant="outline" disabled={!allMeetingTypes || allMeetingTypes.filter(mt => mt.isActive !== false && !(editMtgQuantities[mt.id] > 0)).length === 0} data-testid="button-edit-add-meeting">
                            <Plus className="w-4 h-4 mr-1" />
                            Add Meeting
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-0" align="start" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2 px-3 py-2 border-b">
                            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                            <input
                              type="text"
                              placeholder="Search meeting types..."
                              value={editMtgSearch}
                              onChange={(e) => setEditMtgSearch(e.target.value)}
                              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                              data-testid="input-edit-meeting-search"
                            />
                          </div>
                          <div className="space-y-1 max-h-60 overflow-y-auto overscroll-contain p-2">
                            {allMeetingTypes?.filter(mt => mt.isActive !== false && !(editMtgQuantities[mt.id] > 0)).filter(mt => mt.name.toLowerCase().includes(editMtgSearch.toLowerCase())).map((mt) => (
                              <button
                                key={mt.id}
                                type="button"
                                className="w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-left hover-elevate"
                                onClick={() => {
                                  setEditMtgQuantities(prev => ({ ...prev, [mt.id]: 1 }));
                                  setEditMtgSearchOpen(false);
                                  setEditMtgSearch("");
                                }}
                                data-testid={`button-edit-pick-mtg-${mt.id}`}
                              >
                                <span className="truncate">{mt.name}</span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">{mt.creditCost} cr | {mt.defaultDuration} min</span>
                              </button>
                            ))}
                            {allMeetingTypes?.filter(mt => mt.isActive !== false && !(editMtgQuantities[mt.id] > 0)).filter(mt => mt.name.toLowerCase().includes(editMtgSearch.toLowerCase())).length === 0 && (
                              <p className="text-sm text-muted-foreground text-center py-2">No matches found</p>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    {Object.entries(editMtgQuantities).filter(([, qty]) => qty > 0).map(([mtId, qty]) => {
                      const mt = allMeetingTypes?.find(t => t.id === mtId);
                      if (!mt) return null;
                      const totalCredits = parseFloat(mt.creditCost || "0") * qty;
                      return (
                        <div key={mtId} className="flex items-center gap-3 px-3 py-2 rounded-md border" data-testid={`edit-meeting-${mtId}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{mt.name}</p>
                            <p className="text-xs text-muted-foreground">{mt.creditCost} cr | {mt.defaultDuration} min</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button type="button" size="icon" variant="ghost" onClick={() => setEditMtgQuantities(prev => ({ ...prev, [mtId]: Math.max(0, (prev[mtId] || 0) - 1) }))} disabled={qty <= 0} data-testid={`button-mtg-minus-${mtId}`}>
                              <Minus className="w-3 h-3" />
                            </Button>
                            <Input
                              type="number" min={0} max={99} value={qty}
                              onChange={(e) => setEditMtgQuantities(prev => ({ ...prev, [mtId]: Math.max(0, parseInt(e.target.value) || 0) }))}
                              className="w-14 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              data-testid={`input-mtg-qty-${mtId}`}
                            />
                            <Button type="button" size="icon" variant="ghost" onClick={() => setEditMtgQuantities(prev => ({ ...prev, [mtId]: (prev[mtId] || 0) + 1 }))} data-testid={`button-mtg-plus-${mtId}`}>
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <Badge variant="secondary" className="text-xs whitespace-nowrap">{totalCredits.toFixed(1)} cr</Badge>
                          <Button type="button" size="icon" variant="ghost" onClick={() => setEditMtgQuantities(prev => { const next = { ...prev }; delete next[mtId]; return next; })} data-testid={`button-mtg-remove-${mtId}`}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                    {Object.entries(editMtgQuantities).filter(([, qty]) => qty > 0).length === 0 && (
                      <p className="text-sm text-muted-foreground">No meetings added</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-sm font-medium">New Estimated Credits:</span>
                    <Badge className="flex items-center gap-1" data-testid="badge-edit-total">
                      <Coins className="w-3 h-3" />
                      {calculateEditTotal().toFixed(1)} credits
                      {isRushEffective && <span className="ml-1 text-amber-200">(2x rush)</span>}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const typeDelIds = campaignType?.includedDeliverableIds || [];
                      let typeDelQtys: Record<string, number> = {};
                      if (campaignType?.deliverableQuantities) {
                        try { typeDelQtys = JSON.parse(campaignType.deliverableQuantities); } catch {}
                      }
                      setEditDeliverableIds([...typeDelIds]);
                      setEditDelQuantities({ ...typeDelQtys });
                      setEditMtgQuantities({ ...meetingTypeQuantitiesMap });
                    }}
                    data-testid="button-reset-to-type"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" /> Reset to Campaign Type Defaults
                  </Button>
                </div>
              </>
            ) : (
              <>
                {deliverableIds.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Package className="w-3 h-3" /> Deliverables
                        </Label>
                        {isAdmin && campaign.status === "pending" && (
                          <Button variant="ghost" size="sm" onClick={startEditing} data-testid="button-edit-scope">
                            <Pencil className="w-3 h-3 mr-1" /> Edit
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2" data-testid="section-deliverables">
                        {deliverableIds.map((id) => {
                          const qty = effectiveDelQuantities[id] || quantities[id] || 1;
                          return (
                            <div key={id} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {getDeliverableName(id)}
                                </Badge>
                              </div>
                              {qty > 1 && (
                                <span className="text-xs text-muted-foreground font-mono">x{qty}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {campaign.campaignMemberIds && campaign.campaignMemberIds.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" /> Campaign Team
                      </Label>
                      <div className="space-y-2" data-testid="section-campaign-members">
                        {campaign.campaignMemberIds.map((memberId) => {
                          const member = companyMembers?.find(m => m.userId === memberId);
                          const name = member ? [member.firstName, member.lastName].filter(Boolean).join(" ") || member.email || "Unknown" : "Loading...";
                          const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                          return (
                            <div key={memberId} className="flex items-center gap-2" data-testid={`campaign-member-${memberId}`}>
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{name}</span>
                              {member && <Badge variant="outline" className="text-xs capitalize">{member.role}</Badge>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {hasEffectiveMeetings && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Video className="w-3 h-3" /> Campaign Meetings
                      </Label>
                      <div className="space-y-2" data-testid="section-campaign-meetings">
                        {Object.entries(effectiveMeetingQuantities).filter(([, qty]) => qty > 0).map(([mtId, qty]) => {
                          const mt = allMeetingTypes?.find(t => t.id === mtId);
                          const isRushActive = campaign.isRush && !rushDisabledLocal;
                          const baseCost = parseFloat(mt?.creditCost || "0");
                          const displayCost = isRushActive ? baseCost * 2 : baseCost;
                          const totalCost = displayCost * qty;
                          return (
                            <div key={mtId} className="flex items-center justify-between gap-2 p-2 rounded-md border" data-testid={`campaign-meeting-${mtId}`}>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{mt?.name || "Loading..."}{qty > 1 ? ` x${qty}` : ""}</p>
                                {mt?.description && <p className="text-xs text-muted-foreground">{mt.description}</p>}
                              </div>
                              <div className="flex flex-col items-end shrink-0">
                                <span className="text-xs text-muted-foreground">{mt?.defaultDuration || 30} min</span>
                                <span className="text-xs text-muted-foreground">{totalCost} cr{isRushActive ? " (2x)" : ""}</span>
                              </div>
                            </div>
                          );
                        })}
                        {campaign.status === "approved" && (
                          <p className="text-xs text-muted-foreground">Meeting requests have been created and are pending scheduling.</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {(campaign.targetAudience || campaign.goals || campaign.preferredTone || campaign.keyMessages || campaign.referenceLinks || campaign.budgetNotes || campaign.additionalDetails || campaign.notes) && (
              <>
                <Separator />
                <div className="space-y-4">
                  {campaign.targetAudience && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Target className="w-3 h-3" /> Target Audience
                      </Label>
                      <p className="text-sm" data-testid="text-target-audience">{campaign.targetAudience}</p>
                    </div>
                  )}

                  {campaign.goals && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Goals
                      </Label>
                      <p className="text-sm" data-testid="text-goals">{campaign.goals}</p>
                    </div>
                  )}

                  {campaign.preferredTone && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Preferred Tone
                      </Label>
                      <p className="text-sm" data-testid="text-preferred-tone">{campaign.preferredTone}</p>
                    </div>
                  )}

                  {campaign.keyMessages && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Key Messages
                      </Label>
                      <p className="text-sm whitespace-pre-wrap" data-testid="text-key-messages">{campaign.keyMessages}</p>
                    </div>
                  )}

                  {campaign.referenceLinks && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Link2 className="w-3 h-3" /> Reference Links
                      </Label>
                      <p className="text-sm whitespace-pre-wrap break-all" data-testid="text-reference-links">{campaign.referenceLinks}</p>
                    </div>
                  )}

                  {campaign.budgetNotes && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> Budget Notes
                      </Label>
                      <p className="text-sm" data-testid="text-budget-notes">{campaign.budgetNotes}</p>
                    </div>
                  )}

                  {campaign.additionalDetails && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Additional Details
                      </Label>
                      <p className="text-sm whitespace-pre-wrap" data-testid="text-additional-details">{campaign.additionalDetails}</p>
                    </div>
                  )}

                  {campaign.notes && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Notes
                      </Label>
                      <p className="text-sm whitespace-pre-wrap" data-testid="text-notes">{campaign.notes}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {isAdmin && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Status</Label>
                  <Select
                    value={campaign.status}
                    onValueChange={(value) => updateStatusMutation.mutate(value)}
                    disabled={updateStatusMutation.isPending}
                  >
                    <SelectTrigger data-testid="select-campaign-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {campaign.isRush && (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-md border">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-500" /> Rush Multiplier (2x)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {rushDisabledLocal ? "Rush is currently disabled - credits at normal rate" : "Rush is active - credits doubled"}
                      </p>
                    </div>
                    <Switch
                      checked={!rushDisabledLocal}
                      onCheckedChange={(checked) => toggleRushMutation.mutate(!checked)}
                      disabled={toggleRushMutation.isPending}
                      data-testid="switch-rush-toggle"
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Admin Notes</Label>
                  <div className="flex gap-2">
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add internal notes..."
                      className="min-h-20"
                      data-testid="textarea-admin-notes"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateNotesMutation.mutate(adminNotes)}
                      disabled={updateNotesMutation.isPending}
                      data-testid="button-save-admin-notes"
                    >
                      {updateNotesMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {!isAdmin && campaign.adminNotes && (
              <>
                <Separator />
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
                  <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Agency Response</div>
                  <p className="text-sm text-blue-700 dark:text-blue-300" data-testid="text-admin-notes">{campaign.adminNotes}</p>
                </div>
              </>
            )}

            <Separator />
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-1">
                <CircleDot className="w-4 h-4" /> Associated Tasks
              </Label>
              {tasksLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : campaignTasks && campaignTasks.length > 0 ? (
                <div className="space-y-2" data-testid="section-campaign-tasks">
                  {campaignTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-md border hover-elevate cursor-pointer"
                      data-testid={`task-item-${task.id}`}
                      onClick={() => {
                        if (onTaskClick) {
                          onClose();
                          setTimeout(() => onTaskClick(task), 300);
                        }
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" data-testid={`text-task-title-${task.id}`}>
                          {task.title}
                        </p>
                        {task.dueDate && (
                          <p className="text-xs text-muted-foreground">
                            Due: {parseLocalDate(task.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {getTaskStatusBadge(task.status)}
                        <span className="text-xs text-muted-foreground font-mono" data-testid={`text-task-credits-${task.id}`}>
                          {task.creditCost} cr
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground" data-testid="text-no-tasks">
                  No tasks associated with this campaign yet.
                </p>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
