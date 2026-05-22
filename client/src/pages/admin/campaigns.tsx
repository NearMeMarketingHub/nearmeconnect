import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { parseLocalDate } from "@/lib/utils";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileTabMenu } from "@/components/mobile-tab-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link, useSearch, useLocation } from "wouter";
import { 
  Megaphone, Coins, Calendar, Clock, CheckCircle2, Building2, User, ChevronDown, ChevronLeft, ChevronRight, 
  Target, MessageSquare, Link2, DollarSign, FileText, Users, Save, Plus, Pencil, Trash2, Package, XCircle, ThumbsUp, Minus, X, Search, Video 
} from "lucide-react";
import type { CampaignType, DeliverableType, Company, MeetingType } from "@shared/schema";
import { DatePicker } from "@/components/ui/date-picker";
import { CampaignDetailPanel } from "@/components/campaign-detail-panel";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import type { Task } from "@shared/schema";

type DeliverableQuantityMap = Record<string, number>;

interface EnrichedCampaignRequest {
  id: string;
  companyId: string;
  campaignTypeId: string;
  requestedBy: string;
  dueDate: string;
  notes: string | null;
  targetAudience: string | null;
  goals: string | null;
  preferredTone: string | null;
  keyMessages: string | null;
  referenceLinks: string | null;
  budgetNotes: string | null;
  additionalDetails: string | null;
  estimatedCredits: string;
  status: string;
  meetingScheduled: boolean;
  meetingUrl: string | null;
  adminNotes: string | null;
  isRush: boolean;
  deliverableQuantities: string | null;
  requestDeliverableIds: string[] | null;
  requestDeliverableQuantities: string | null;
  requestMeetingQuantities: string | null;
  creditOverride: string | null;
  rushDisabled: boolean;
  name: string;
  campaignMemberIds: string[];
  campaignMeetingTypeIds: string[];
  createdAt: string;
  companyName?: string;
  campaignTypeName?: string;
  requestedByName?: string;
}

export default function AdminCampaigns() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const urlTab = params.get("tab") || "requests";
  const [activeTab, setActiveTab] = useState(urlTab);
  const [campaignPages, setCampaignPages] = useState<Record<string, number>>({});
  const [campaignMonthDate, setCampaignMonthDate] = useState(() => new Date());
  const CAMPAIGNS_PER_PAGE = 10;

  // Sync activeTab with URL changes (back/forward navigation)
  useEffect(() => {
    setActiveTab(urlTab);
  }, [urlTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setLocation(`/admin/campaigns${value !== "requests" ? `?tab=${value}` : ""}`);
  };

  // Campaign Requests state
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [adminNotesEditing, setAdminNotesEditing] = useState<Record<string, string>>({});
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Create Campaign state
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [createCompanyId, setCreateCompanyId] = useState("");
  const [createCampaignTypeId, setCreateCampaignTypeId] = useState("");
  const [createDueDate, setCreateDueDate] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [createTargetAudience, setCreateTargetAudience] = useState("");
  const [createGoals, setCreateGoals] = useState("");
  const [createCampaignName, setCreateCampaignName] = useState("");

  // Campaign Types state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingType, setEditingType] = useState<CampaignType | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<DeliverableQuantityMap>({});
  const [meetingQuantities, setMeetingQuantities] = useState<DeliverableQuantityMap>({});
  const [creditsOverride, setCreditsOverride] = useState<string>("");
  const [createTypePickerOpen, setCreateTypePickerOpen] = useState(false);
  const [editTypePickerOpen, setEditTypePickerOpen] = useState(false);
  const [deliverablePickerSearch, setDeliverablePickerSearch] = useState("");
  const [meetingPickerSearch, setMeetingPickerSearch] = useState("");
  const [createMtgPickerOpen, setCreateMtgPickerOpen] = useState(false);
  const [editMtgPickerOpen, setEditMtgPickerOpen] = useState(false);

  // Queries
  const { data: campaignRequests, isLoading: requestsLoading } = useQuery<EnrichedCampaignRequest[]>({
    queryKey: ["/api/admin/campaign-requests"],
  });

  const selectedCampaign = selectedCampaignId ? campaignRequests?.find(r => r.id === selectedCampaignId) || null : null;
  const setSelectedCampaign = (campaign: EnrichedCampaignRequest | null) => setSelectedCampaignId(campaign?.id || null);

  const { data: campaignTypes, isLoading: typesLoading } = useQuery<CampaignType[]>({
    queryKey: ["/api/campaign-types"],
  });

  const { data: deliverableTypes } = useQuery<DeliverableType[]>({
    queryKey: ["/api/deliverable-types"],
  });

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: meetingTypesList } = useQuery<MeetingType[]>({
    queryKey: ["/api/meeting-types"],
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/admin/campaign-requests", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaign-requests"] });
      toast({ title: "Campaign created successfully" });
      setCreateCampaignOpen(false);
      setCreateCompanyId("");
      setCreateCampaignTypeId("");
      setCreateDueDate("");
      setCreateNotes("");
      setCreateTargetAudience("");
      setCreateGoals("");
      setCreateCampaignName("");
    },
    onError: () => {
      toast({ title: "Failed to create campaign", variant: "destructive" });
    },
  });

  const activeDeliverables = deliverableTypes?.filter(d => d.isActive) || [];

  // Campaign Requests functions
  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedRequests);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedRequests(newSet);
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/campaign-requests/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaign-requests"] });
      toast({ title: "Status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, adminNotes }: { id: string; adminNotes: string }) => {
      return apiRequest("PATCH", `/api/campaign-requests/${id}`, { adminNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaign-requests"] });
      toast({ title: "Notes saved" });
    },
    onError: () => {
      toast({ title: "Failed to save notes", variant: "destructive" });
    },
  });

  const monthFilteredRequests = useMemo(() => {
    if (!campaignRequests) return [];
    const year = campaignMonthDate.getFullYear();
    const month = campaignMonthDate.getMonth() + 1;
    return campaignRequests.filter(r => {
      if (!r.dueDate) return true;
      const d = parseLocalDate(r.dueDate);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  }, [campaignRequests, campaignMonthDate]);

  const pendingRequests = monthFilteredRequests.filter(r => r.status === "pending");
  const approvedRequests = monthFilteredRequests.filter(r => r.status === "approved" || r.status === "in_progress");
  const completedRequests = monthFilteredRequests.filter(r => r.status === "completed");
  const rejectedRequests = monthFilteredRequests.filter(r => r.status === "rejected");

  const tabRequestsMap: Record<string, EnrichedCampaignRequest[]> = {
    requests: pendingRequests,
    approved: approvedRequests,
    completed: completedRequests,
    rejected: rejectedRequests,
  };

  const renderRequestCard = (request: EnrichedCampaignRequest) => (
    <Card 
      key={request.id}
      className="cursor-pointer hover-elevate"
      onClick={() => setSelectedCampaign(request)}
      data-testid={`card-campaign-${request.id}`}
    >
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium" data-testid={`text-campaign-name-${request.id}`}>{request.name || request.campaignTypeName}</p>
              {request.name && (
                <p className="text-sm text-muted-foreground">{request.campaignTypeName}</p>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <Building2 className="w-3 h-3" />
                <span>{request.companyName}</span>
                <span className="text-muted-foreground/50">&bull;</span>
                <User className="w-3 h-3" />
                <span>{request.requestedByName}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <Coins className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono">{request.estimatedCredits}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{parseLocalDate(request.dueDate).toLocaleDateString()}</span>
            </div>
            {request.isRush && (
              <Badge className="bg-amber-500 text-white">Rush</Badge>
            )}
            {getStatusBadge(request.status)}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "approved":
        return <Badge className="bg-blue-500">Approved</Badge>;
      case "in_progress":
        return <Badge className="bg-purple-500">In Progress</Badge>;
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Campaign Types functions
  const calculateEstimatedCredits = (deliverableIds: string[], qtys: DeliverableQuantityMap, mtgQtys?: DeliverableQuantityMap): number => {
    let total = 0;
    if (deliverableTypes) {
      total += deliverableIds.reduce((sum, id) => {
        const deliverable = deliverableTypes.find(d => d.id === id);
        const qty = qtys[id] || 1;
        return sum + (deliverable ? parseFloat(deliverable.credits) * qty : 0);
      }, 0);
    }
    if (mtgQtys && meetingTypesList) {
      for (const [mtId, qty] of Object.entries(mtgQtys)) {
        if (qty > 0) {
          const mt = meetingTypesList.find(m => m.id === mtId);
          if (mt) {
            total += parseFloat(mt.creditCost) * qty;
          }
        }
      }
    }
    return total;
  };

  const createTypeMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; includedDeliverableIds: string[]; deliverableQuantities: string; estimatedCredits: string; meetingTypeQuantities: string | null }) => {
      return apiRequest("POST", "/api/campaign-types", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaign-types"] });
      toast({ title: "Campaign type created" });
      setCreateOpen(false);
      resetTypeForm();
    },
    onError: () => {
      toast({ title: "Failed to create campaign type", variant: "destructive" });
    },
  });

  const updateTypeMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; description: string; includedDeliverableIds: string[]; deliverableQuantities: string; estimatedCredits: string; meetingTypeQuantities: string | null }) => {
      return apiRequest("PATCH", `/api/campaign-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaign-types"] });
      toast({ title: "Campaign type updated" });
      setEditOpen(false);
      setEditingType(null);
      resetTypeForm();
    },
    onError: () => {
      toast({ title: "Failed to update campaign type", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/campaign-types/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaign-types"] });
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/campaign-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaign-types"] });
      toast({ title: "Campaign type deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete campaign type", variant: "destructive" });
    },
  });

  const resetTypeForm = () => {
    setName("");
    setDescription("");
    setSelectedDeliverables([]);
    setQuantities({});
    setMeetingQuantities({});
    setCreditsOverride("");
    setCreateTypePickerOpen(false);
    setEditTypePickerOpen(false);
    setMeetingPickerSearch("");
    setCreateMtgPickerOpen(false);
    setEditMtgPickerOpen(false);
  };

  const parseDeliverableIds = (ids: string | string[] | null | undefined): string[] => {
    if (!ids) return [];
    if (Array.isArray(ids)) return ids;
    try {
      return JSON.parse(ids);
    } catch {
      return [];
    }
  };

  const parseMeetingQuantities = (type: CampaignType): DeliverableQuantityMap => {
    if (!(type as any).meetingTypeQuantities) return {};
    try {
      return JSON.parse((type as any).meetingTypeQuantities);
    } catch {
      return {};
    }
  };

  const openEditDialog = (type: CampaignType) => {
    setEditingType(type);
    setName(type.name);
    setDescription(type.description || "");
    const ids = parseDeliverableIds(type.includedDeliverableIds);
    setSelectedDeliverables(ids);
    const parsed = parseQuantities(type);
    const normalized: DeliverableQuantityMap = {};
    for (const id of ids) {
      normalized[id] = parsed[id] || 1;
    }
    setQuantities(normalized);
    setMeetingQuantities(parseMeetingQuantities(type));
    setCreditsOverride(type.estimatedCredits || "");
    setEditOpen(true);
  };

  const getEffectiveCredits = (): string => {
    if (creditsOverride && creditsOverride.trim() !== "") {
      return creditsOverride.trim();
    }
    const filteredMtg: DeliverableQuantityMap = {};
    for (const [id, qty] of Object.entries(meetingQuantities)) {
      if (qty > 0) filteredMtg[id] = qty;
    }
    return calculateEstimatedCredits(selectedDeliverables, quantities, filteredMtg).toString();
  };

  const handleCreateType = () => {
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const filteredMeetingQtys: DeliverableQuantityMap = {};
    for (const [id, qty] of Object.entries(meetingQuantities)) {
      if (qty > 0) filteredMeetingQtys[id] = qty;
    }
    createTypeMutation.mutate({
      name: name.trim(),
      description: description.trim(),
      includedDeliverableIds: selectedDeliverables,
      deliverableQuantities: JSON.stringify(quantities),
      estimatedCredits: getEffectiveCredits(),
      meetingTypeQuantities: Object.keys(filteredMeetingQtys).length > 0 ? JSON.stringify(filteredMeetingQtys) : null,
    });
  };

  const handleUpdateType = () => {
    if (!editingType || !name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const filteredMeetingQtys: DeliverableQuantityMap = {};
    for (const [id, qty] of Object.entries(meetingQuantities)) {
      if (qty > 0) filteredMeetingQtys[id] = qty;
    }
    updateTypeMutation.mutate({
      id: editingType.id,
      name: name.trim(),
      description: description.trim(),
      includedDeliverableIds: selectedDeliverables,
      deliverableQuantities: JSON.stringify(quantities),
      estimatedCredits: getEffectiveCredits(),
      meetingTypeQuantities: Object.keys(filteredMeetingQtys).length > 0 ? JSON.stringify(filteredMeetingQtys) : null,
    });
  };

  const getDeliverableName = (id: string) => {
    return deliverableTypes?.find(d => d.id === id)?.name || id;
  };

  const getDeliverableCredits = (id: string): string => {
    return deliverableTypes?.find(d => d.id === id)?.credits || "0";
  };

  const addDeliverable = (id: string) => {
    if (!selectedDeliverables.includes(id)) {
      setSelectedDeliverables(prev => [...prev, id]);
      setQuantities(prev => ({ ...prev, [id]: 1 }));
    }
  };

  const removeDeliverable = (id: string) => {
    setSelectedDeliverables(prev => prev.filter(d => d !== id));
    setQuantities(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty < 1) qty = 1;
    if (qty > 999) qty = 999;
    setQuantities(prev => ({ ...prev, [id]: qty }));
  };

  const parseQuantities = (type: CampaignType): DeliverableQuantityMap => {
    if (!(type as any).deliverableQuantities) return {};
    try {
      return JSON.parse((type as any).deliverableQuantities);
    } catch {
      return {};
    }
  };

  const availableToAdd = activeDeliverables.filter(d => !selectedDeliverables.includes(d.id));

  const activeMeetingTypes = meetingTypesList?.filter(m => m.isActive) || [];
  const selectedMeetingIds = Object.entries(meetingQuantities).filter(([, qty]) => qty > 0).map(([id]) => id);
  const availableMeetingsToAdd = activeMeetingTypes.filter(mt => !meetingQuantities[mt.id] || meetingQuantities[mt.id] <= 0);

  const addMeeting = (id: string) => {
    if (!meetingQuantities[id] || meetingQuantities[id] <= 0) {
      setMeetingQuantities(prev => ({ ...prev, [id]: 1 }));
    }
  };

  const removeMeeting = (id: string) => {
    setMeetingQuantities(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateMeetingQuantity = (id: string, qty: number) => {
    if (qty < 1) qty = 1;
    if (qty > 99) qty = 99;
    setMeetingQuantities(prev => ({ ...prev, [id]: qty }));
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Campaigns</h1>
            <p className="text-muted-foreground">
              Manage campaign requests and campaign types
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => { setCampaignMonthDate(new Date(campaignMonthDate.getFullYear(), campaignMonthDate.getMonth() - 1, 1)); setCampaignPages({}); }}
                data-testid="button-campaign-month-prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[140px] text-center" data-testid="text-campaign-month">
                {campaignMonthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => { setCampaignMonthDate(new Date(campaignMonthDate.getFullYear(), campaignMonthDate.getMonth() + 1, 1)); setCampaignPages({}); }}
                data-testid="button-campaign-month-next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          <Dialog open={createCampaignOpen} onOpenChange={setCreateCampaignOpen}>
            <Button onClick={() => setCreateCampaignOpen(true)} data-testid="button-create-campaign">
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Campaign Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Company *</Label>
                  <Select value={createCompanyId} onValueChange={setCreateCompanyId}>
                    <SelectTrigger data-testid="select-campaign-company">
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Campaign Type *</Label>
                  <Select value={createCampaignTypeId} onValueChange={setCreateCampaignTypeId}>
                    <SelectTrigger data-testid="select-campaign-type">
                      <SelectValue placeholder="Select campaign type" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaignTypes?.filter(t => t.isActive).map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {createCampaignTypeId && (() => {
                  const selectedType = campaignTypes?.find(t => t.id === createCampaignTypeId);
                  if (!selectedType) return null;
                  const delIds = parseDeliverableIds(selectedType.includedDeliverableIds);
                  const delQtys = parseQuantities(selectedType);
                  const mtgQtys = parseMeetingQuantities(selectedType);
                  const mtgEntries = Object.entries(mtgQtys).filter(([, qty]) => qty > 0);
                  return (
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-2">Campaign Deliverables:</h4>
                        <div className="space-y-2 mb-3">
                          {delIds.map((id) => {
                            const deliverable = deliverableTypes?.find(d => d.id === id);
                            if (!deliverable) return null;
                            const qty = delQtys[id] || 1;
                            const lineCredits = parseFloat(deliverable.credits) * qty;
                            return (
                              <div key={id} className="flex items-center justify-between gap-2" data-testid={`create-deliverable-item-${id}`}>
                                <Badge variant="outline" className="text-xs">
                                  {qty > 1 ? `${qty}x ` : ""}{deliverable.name}
                                </Badge>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {lineCredits} credits
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {mtgEntries.length > 0 && (
                          <>
                            <h4 className="font-medium mb-2 mt-4">Campaign Meetings:</h4>
                            <div className="space-y-2 mb-3">
                              {mtgEntries.map(([mtId, qty]) => {
                                const mt = meetingTypesList?.find(m => m.id === mtId);
                                if (!mt) return null;
                                const lineCredits = parseFloat(mt.creditCost) * qty;
                                return (
                                  <div key={mtId} className="flex items-center justify-between gap-2" data-testid={`create-meeting-item-${mtId}`}>
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <Badge variant="outline" className="text-xs">
                                        <Video className="w-3 h-3 mr-1" />
                                        {qty > 1 ? `${qty}x ` : ""}{mt.name}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">{mt.defaultDuration} min</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground font-mono">
                                      {lineCredits.toFixed(1)} credits
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                        {selectedType.description && (
                          <p className="text-sm text-muted-foreground mb-3">{selectedType.description}</p>
                        )}
                        <div className="flex items-center justify-between border-t pt-3">
                          <span className="text-sm font-medium">Estimated Credits:</span>
                          <Badge className="flex items-center gap-1">
                            <Coins className="w-3 h-3" />
                            {selectedType.estimatedCredits} credits
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
                <div className="space-y-2">
                  <Label>Campaign Title</Label>
                  <Input
                    value={createCampaignName}
                    onChange={(e) => setCreateCampaignName(e.target.value)}
                    placeholder="Give your campaign a name"
                    data-testid="input-campaign-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target Launch Date *</Label>
                  <DatePicker
                    value={createDueDate}
                    onChange={setCreateDueDate}
                    data-testid="input-campaign-due-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Input
                    value={createTargetAudience}
                    onChange={(e) => setCreateTargetAudience(e.target.value)}
                    placeholder="Who is this campaign for?"
                    data-testid="input-campaign-audience"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Goals</Label>
                  <Input
                    value={createGoals}
                    onChange={(e) => setCreateGoals(e.target.value)}
                    placeholder="Campaign goals"
                    data-testid="input-campaign-goals"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={createNotes}
                    onChange={(e) => setCreateNotes(e.target.value)}
                    placeholder="Additional notes"
                    data-testid="input-campaign-notes"
                  />
                </div>
                <Button
                  onClick={() => {
                    if (!createCompanyId || !createCampaignTypeId || !createDueDate) {
                      toast({ title: "Please fill in required fields", variant: "destructive" });
                      return;
                    }
                    createCampaignMutation.mutate({
                      companyId: createCompanyId,
                      campaignTypeId: createCampaignTypeId,
                      dueDate: createDueDate,
                      name: createCampaignName || null,
                      notes: createNotes || null,
                      targetAudience: createTargetAudience || null,
                      goals: createGoals || null,
                    });
                  }}
                  className="w-full"
                  disabled={createCampaignMutation.isPending}
                  data-testid="button-submit-campaign"
                >
                  {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <MobileTabMenu
            tabs={[
              { value: "requests", label: "Requests", count: pendingRequests.length },
              { value: "approved", label: "Approved", count: approvedRequests.length },
              { value: "completed", label: "Completed", count: completedRequests.length },
              { value: "rejected", label: "Rejected", count: rejectedRequests.length },
              { value: "types", label: "Types" },
            ]}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            title="Campaigns"
          />
          <TabsList className="hidden md:inline-flex">
            <TabsTrigger value="requests" data-testid="tab-campaign-requests">
              <Megaphone className="w-4 h-4 mr-2" />
              Requests ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-campaign-approved">
              <ThumbsUp className="w-4 h-4 mr-2" />
              Approved ({approvedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-campaign-completed">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Completed ({completedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" data-testid="tab-campaign-rejected">
              <XCircle className="w-4 h-4 mr-2" />
              Rejected ({rejectedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="types" data-testid="tab-campaign-types">
              <Package className="w-4 h-4 mr-2" />
              Types
            </TabsTrigger>
          </TabsList>

          {["requests", "approved", "completed", "rejected"].map(tab => {
            const allItems = tabRequestsMap[tab] || [];
            const currentPage = campaignPages[tab] || 1;
            const totalPages = Math.ceil(allItems.length / CAMPAIGNS_PER_PAGE);
            const startIdx = (currentPage - 1) * CAMPAIGNS_PER_PAGE;
            const paginatedItems = allItems.slice(startIdx, startIdx + CAMPAIGNS_PER_PAGE);

            return (
              <TabsContent key={tab} value={tab} className="space-y-4 mt-4">
                {requestsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
                  </div>
                ) : allItems.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Megaphone className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">
                        {tab === "requests" && `No pending campaign requests for ${campaignMonthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`}
                        {tab === "approved" && `No approved campaigns for ${campaignMonthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`}
                        {tab === "completed" && `No completed campaigns for ${campaignMonthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`}
                        {tab === "rejected" && `No rejected campaigns for ${campaignMonthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="space-y-4">
                      {paginatedItems.map(renderRequestCard)}
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-sm text-muted-foreground">
                          Showing {startIdx + 1}–{Math.min(startIdx + CAMPAIGNS_PER_PAGE, allItems.length)} of {allItems.length}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage <= 1}
                            onClick={() => setCampaignPages(prev => ({ ...prev, [tab]: currentPage - 1 }))}
                            data-testid={`button-campaign-prev-${tab}`}
                          >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Previous
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage >= totalPages}
                            onClick={() => setCampaignPages(prev => ({ ...prev, [tab]: currentPage + 1 }))}
                            data-testid={`button-campaign-next-${tab}`}
                          >
                            Next
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            );
          })}

          <TabsContent value="types" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button onClick={() => setCreateOpen(true)} data-testid="button-create-campaign-type">
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign Type
              </Button>
            </div>

            {typesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
              </div>
            ) : !campaignTypes || campaignTypes.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Megaphone className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No campaign types yet</p>
                  <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                    Create your first campaign type
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {campaignTypes.map(type => {
                  const deliverableIds = parseDeliverableIds(type.includedDeliverableIds);
                  return (
                    <Card key={type.id} className={!type.isActive ? "opacity-60" : ""}>
                      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                        <div className="flex items-start gap-3">
                          <div className="bg-primary/10 p-2 rounded-lg">
                            <Megaphone className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{type.name}</CardTitle>
                            {type.description && (
                              <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={type.isActive}
                            onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: type.id, isActive: checked })}
                            data-testid={`switch-active-${type.id}`}
                          />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 mb-3">
                          <Coins className="w-4 h-4 text-muted-foreground" />
                          <span className="font-mono font-medium">{type.estimatedCredits} credits</span>
                        </div>
                        {deliverableIds.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Included Deliverables:</p>
                            <div className="flex flex-wrap gap-1">
                              {deliverableIds.map((id: string) => {
                              const qtys = parseQuantities(type);
                              const qty = qtys[id] || 1;
                              return (
                                <Badge key={id} variant="secondary" className="text-xs">
                                  {getDeliverableName(id)}{qty > 1 ? ` x${qty}` : ""}
                                </Badge>
                              );
                            })}
                            </div>
                          </div>
                        )}
                        {(() => {
                          const mtq = parseMeetingQuantities(type);
                          const entries = Object.entries(mtq).filter(([, qty]) => qty > 0);
                          if (entries.length === 0) return null;
                          return (
                            <div className="space-y-2 mt-3">
                              <p className="text-xs text-muted-foreground">Included Meetings:</p>
                              <div className="flex flex-wrap gap-1">
                                {entries.map(([id, qty]) => {
                                  const mt = meetingTypesList?.find(m => m.id === id);
                                  return (
                                    <Badge key={id} variant="secondary" className="text-xs">
                                      {mt?.name || id}{qty > 1 ? ` x${qty}` : ""}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(type)} data-testid={`button-edit-${type.id}`}>
                            <Pencil className="w-4 h-4 mr-1" /> Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" data-testid={`button-delete-${type.id}`}>
                                <Trash2 className="w-4 h-4 mr-1" /> Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Campaign Type</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{type.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteTypeMutation.mutate(type.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Campaign Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Social Media Launch" data-testid="input-type-name" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what this campaign includes..." data-testid="input-type-description" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label>Included Deliverables</Label>
                <Popover open={createTypePickerOpen} onOpenChange={(open) => { setCreateTypePickerOpen(open); if (!open) setDeliverablePickerSearch(""); }} modal={false}>
                  <PopoverTrigger asChild>
                    <Button type="button" size="sm" variant="outline" disabled={availableToAdd.length === 0} data-testid="button-type-create-add-deliverable">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Deliverable
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 px-3 py-2 border-b">
                      <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                      <input
                        type="text"
                        placeholder="Search deliverables..."
                        value={deliverablePickerSearch}
                        onChange={(e) => setDeliverablePickerSearch(e.target.value)}
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        data-testid="input-type-create-deliverable-search"
                      />
                    </div>
                    <div className="space-y-1 max-h-72 overflow-y-auto overscroll-contain p-2">
                      {availableToAdd.filter(d => d.name.toLowerCase().includes(deliverablePickerSearch.toLowerCase())).map((deliverable) => (
                        <button
                          key={deliverable.id}
                          type="button"
                          className="w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-left hover-elevate"
                          onClick={() => { addDeliverable(deliverable.id); setCreateTypePickerOpen(false); setDeliverablePickerSearch(""); }}
                          data-testid={`button-type-create-pick-${deliverable.id}`}
                        >
                          <span className="truncate">{deliverable.name}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{deliverable.credits} cr</span>
                        </button>
                      ))}
                      {availableToAdd.filter(d => d.name.toLowerCase().includes(deliverablePickerSearch.toLowerCase())).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">No matches found</p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {selectedDeliverables.length === 0 ? (
                <div className="border border-dashed rounded-md p-4 text-center">
                  <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No deliverables added yet</p>
                </div>
              ) : (
                <div className="border rounded-md divide-y">
                  {selectedDeliverables.map((id) => {
                    const qty = quantities[id] || 1;
                    const creditsPer = parseFloat(getDeliverableCredits(id));
                    const totalCredits = creditsPer * qty;
                    return (
                      <div key={id} className="flex items-center gap-3 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{getDeliverableName(id)}</p>
                          <p className="text-xs text-muted-foreground">{creditsPer} credits each</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button type="button" size="icon" variant="ghost" onClick={() => updateQuantity(id, qty - 1)} disabled={qty <= 1}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            type="number" min={1} max={999} value={qty}
                            onChange={(e) => updateQuantity(id, parseInt(e.target.value) || 1)}
                            className="w-14 text-center h-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <Button type="button" size="icon" variant="ghost" onClick={() => updateQuantity(id, qty + 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">{totalCredits.toFixed(1)} cr</Badge>
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeDeliverable(id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Auto-calculated: <span className="font-mono font-medium">{calculateEstimatedCredits(selectedDeliverables, quantities, meetingQuantities).toFixed(1)} credits</span>
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label>Included Meetings</Label>
                <Popover open={createMtgPickerOpen} onOpenChange={(open) => { setCreateMtgPickerOpen(open); if (!open) setMeetingPickerSearch(""); }} modal={false}>
                  <PopoverTrigger asChild>
                    <Button type="button" size="sm" variant="outline" disabled={availableMeetingsToAdd.length === 0} data-testid="button-type-create-add-meeting">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Meeting
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 px-3 py-2 border-b">
                      <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                      <input
                        type="text"
                        placeholder="Search meetings..."
                        value={meetingPickerSearch}
                        onChange={(e) => setMeetingPickerSearch(e.target.value)}
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        data-testid="input-type-create-meeting-search"
                      />
                    </div>
                    <div className="space-y-1 max-h-72 overflow-y-auto overscroll-contain p-2">
                      {availableMeetingsToAdd.filter(mt => mt.name.toLowerCase().includes(meetingPickerSearch.toLowerCase())).map((mt) => (
                        <button
                          key={mt.id}
                          type="button"
                          className="w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-left hover-elevate"
                          onClick={() => { addMeeting(mt.id); setCreateMtgPickerOpen(false); setMeetingPickerSearch(""); }}
                          data-testid={`button-type-create-pick-meeting-${mt.id}`}
                        >
                          <span className="truncate">{mt.name}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{mt.defaultDuration}min / {mt.creditCost} cr</span>
                        </button>
                      ))}
                      {availableMeetingsToAdd.filter(mt => mt.name.toLowerCase().includes(meetingPickerSearch.toLowerCase())).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">No matches found</p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {selectedMeetingIds.length === 0 ? (
                <div className="border border-dashed rounded-md p-4 text-center">
                  <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No meetings added yet</p>
                </div>
              ) : (
                <div className="border rounded-md divide-y">
                  {selectedMeetingIds.map((id) => {
                    const mt = meetingTypesList?.find(m => m.id === id);
                    if (!mt) return null;
                    const qty = meetingQuantities[id] || 1;
                    const creditsPer = parseFloat(mt.creditCost);
                    const totalCredits = creditsPer * qty;
                    return (
                      <div key={id} className="flex items-center gap-3 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{mt.name}</p>
                          <p className="text-xs text-muted-foreground">{mt.defaultDuration} min | {mt.creditCost} credits each</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button type="button" size="icon" variant="ghost" onClick={() => updateMeetingQuantity(id, qty - 1)} disabled={qty <= 1}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            type="number" min={1} max={99} value={qty}
                            onChange={(e) => updateMeetingQuantity(id, parseInt(e.target.value) || 1)}
                            className="w-14 text-center h-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            data-testid={`input-meeting-qty-create-${id}`}
                          />
                          <Button type="button" size="icon" variant="ghost" onClick={() => updateMeetingQuantity(id, qty + 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">{totalCredits.toFixed(1)} cr</Badge>
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeMeeting(id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Total Credits</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={creditsOverride}
                  onChange={(e) => setCreditsOverride(e.target.value)}
                  placeholder={calculateEstimatedCredits(selectedDeliverables, quantities, meetingQuantities).toFixed(2)}
                  className="w-40 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  data-testid="input-credits-override-create"
                />
                <span className="text-sm text-muted-foreground">credits</span>
                {creditsOverride && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCreditsOverride("")} data-testid="button-reset-credits-create">
                    Reset
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave blank to use auto-calculated value, or enter a custom price.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetTypeForm(); }}>Cancel</Button>
            <Button onClick={handleCreateType} disabled={createTypeMutation.isPending} data-testid="button-submit-create">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Campaign Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Social Media Launch" data-testid="input-edit-name" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what this campaign includes..." data-testid="input-edit-description" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label>Included Deliverables</Label>
                <Popover open={editTypePickerOpen} onOpenChange={(open) => { setEditTypePickerOpen(open); if (!open) setDeliverablePickerSearch(""); }} modal={false}>
                  <PopoverTrigger asChild>
                    <Button type="button" size="sm" variant="outline" disabled={availableToAdd.length === 0} data-testid="button-type-edit-add-deliverable">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Deliverable
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 px-3 py-2 border-b">
                      <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                      <input
                        type="text"
                        placeholder="Search deliverables..."
                        value={deliverablePickerSearch}
                        onChange={(e) => setDeliverablePickerSearch(e.target.value)}
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        data-testid="input-type-edit-deliverable-search"
                      />
                    </div>
                    <div className="space-y-1 max-h-72 overflow-y-auto overscroll-contain p-2">
                      {availableToAdd.filter(d => d.name.toLowerCase().includes(deliverablePickerSearch.toLowerCase())).map((deliverable) => (
                        <button
                          key={deliverable.id}
                          type="button"
                          className="w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-left hover-elevate"
                          onClick={() => { addDeliverable(deliverable.id); setEditTypePickerOpen(false); setDeliverablePickerSearch(""); }}
                          data-testid={`button-type-edit-pick-${deliverable.id}`}
                        >
                          <span className="truncate">{deliverable.name}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{deliverable.credits} cr</span>
                        </button>
                      ))}
                      {availableToAdd.filter(d => d.name.toLowerCase().includes(deliverablePickerSearch.toLowerCase())).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">No matches found</p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {selectedDeliverables.length === 0 ? (
                <div className="border border-dashed rounded-md p-4 text-center">
                  <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No deliverables added yet</p>
                </div>
              ) : (
                <div className="border rounded-md divide-y">
                  {selectedDeliverables.map((id) => {
                    const qty = quantities[id] || 1;
                    const creditsPer = parseFloat(getDeliverableCredits(id));
                    const totalCredits = creditsPer * qty;
                    return (
                      <div key={id} className="flex items-center gap-3 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{getDeliverableName(id)}</p>
                          <p className="text-xs text-muted-foreground">{creditsPer} credits each</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button type="button" size="icon" variant="ghost" onClick={() => updateQuantity(id, qty - 1)} disabled={qty <= 1}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            type="number" min={1} max={999} value={qty}
                            onChange={(e) => updateQuantity(id, parseInt(e.target.value) || 1)}
                            className="w-14 text-center h-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <Button type="button" size="icon" variant="ghost" onClick={() => updateQuantity(id, qty + 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">{totalCredits.toFixed(1)} cr</Badge>
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeDeliverable(id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Auto-calculated: <span className="font-mono font-medium">{calculateEstimatedCredits(selectedDeliverables, quantities, meetingQuantities).toFixed(1)} credits</span>
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label>Included Meetings</Label>
                <Popover open={editMtgPickerOpen} onOpenChange={(open) => { setEditMtgPickerOpen(open); if (!open) setMeetingPickerSearch(""); }} modal={false}>
                  <PopoverTrigger asChild>
                    <Button type="button" size="sm" variant="outline" disabled={availableMeetingsToAdd.length === 0} data-testid="button-type-edit-add-meeting">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Meeting
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 px-3 py-2 border-b">
                      <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                      <input
                        type="text"
                        placeholder="Search meetings..."
                        value={meetingPickerSearch}
                        onChange={(e) => setMeetingPickerSearch(e.target.value)}
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        data-testid="input-type-edit-meeting-search"
                      />
                    </div>
                    <div className="space-y-1 max-h-72 overflow-y-auto overscroll-contain p-2">
                      {availableMeetingsToAdd.filter(mt => mt.name.toLowerCase().includes(meetingPickerSearch.toLowerCase())).map((mt) => (
                        <button
                          key={mt.id}
                          type="button"
                          className="w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-left hover-elevate"
                          onClick={() => { addMeeting(mt.id); setEditMtgPickerOpen(false); setMeetingPickerSearch(""); }}
                          data-testid={`button-type-edit-pick-meeting-${mt.id}`}
                        >
                          <span className="truncate">{mt.name}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{mt.defaultDuration}min / {mt.creditCost} cr</span>
                        </button>
                      ))}
                      {availableMeetingsToAdd.filter(mt => mt.name.toLowerCase().includes(meetingPickerSearch.toLowerCase())).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">No matches found</p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {selectedMeetingIds.length === 0 ? (
                <div className="border border-dashed rounded-md p-4 text-center">
                  <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No meetings added yet</p>
                </div>
              ) : (
                <div className="border rounded-md divide-y">
                  {selectedMeetingIds.map((id) => {
                    const mt = meetingTypesList?.find(m => m.id === id);
                    if (!mt) return null;
                    const qty = meetingQuantities[id] || 1;
                    const creditsPer = parseFloat(mt.creditCost);
                    const totalCredits = creditsPer * qty;
                    return (
                      <div key={id} className="flex items-center gap-3 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{mt.name}</p>
                          <p className="text-xs text-muted-foreground">{mt.defaultDuration} min | {mt.creditCost} credits each</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button type="button" size="icon" variant="ghost" onClick={() => updateMeetingQuantity(id, qty - 1)} disabled={qty <= 1}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            type="number" min={1} max={99} value={qty}
                            onChange={(e) => updateMeetingQuantity(id, parseInt(e.target.value) || 1)}
                            className="w-14 text-center h-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            data-testid={`input-meeting-qty-edit-${id}`}
                          />
                          <Button type="button" size="icon" variant="ghost" onClick={() => updateMeetingQuantity(id, qty + 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">{totalCredits.toFixed(1)} cr</Badge>
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeMeeting(id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Total Credits</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={creditsOverride}
                  onChange={(e) => setCreditsOverride(e.target.value)}
                  placeholder={calculateEstimatedCredits(selectedDeliverables, quantities, meetingQuantities).toFixed(2)}
                  className="w-40 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  data-testid="input-credits-override-edit"
                />
                <span className="text-sm text-muted-foreground">credits</span>
                {creditsOverride && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCreditsOverride("")} data-testid="button-reset-credits-edit">
                    Reset
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave blank to use auto-calculated value, or enter a custom price.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditingType(null); resetTypeForm(); }}>Cancel</Button>
            <Button onClick={handleUpdateType} disabled={updateTypeMutation.isPending} data-testid="button-submit-edit">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CampaignDetailPanel
        campaign={selectedCampaign}
        open={!!selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
        isAdmin={true}
        onTaskClick={(task) => setSelectedTask(task)}
      />

      <TaskDetailPanel
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        isAdmin={true}
        companyId={selectedCampaign?.companyId || ""}
      />
    </AdminLayout>
  );
}
