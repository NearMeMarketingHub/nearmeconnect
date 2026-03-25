import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { parseLocalDate } from "@/lib/utils";
import { ClientLayout } from "@/components/client-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileTabMenu } from "@/components/mobile-tab-menu";

import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Megaphone, Coins, Calendar, Clock, AlertTriangle, CheckCircle2, ExternalLink, ChevronDown, ChevronRight, ChevronLeft, Target, MessageSquare, Link2, DollarSign, FileText, Users, Video, XCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { CampaignDetailPanel } from "@/components/campaign-detail-panel";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CampaignType, CampaignRequest, DeliverableType, Task, CompanyMember, MeetingType } from "@shared/schema";

interface ClientCampaignsProps {
  companyId: string;
  embedded?: boolean;
}

export default function ClientCampaigns({ companyId, embedded = false }: ClientCampaignsProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [requestOpen, setRequestOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignRequest | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const [selectedCampaignType, setSelectedCampaignType] = useState("");
  const [campaignTitle, setCampaignTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [goals, setGoals] = useState("");
  const [preferredTone, setPreferredTone] = useState("");
  const [keyMessages, setKeyMessages] = useState("");
  const [referenceLinks, setReferenceLinks] = useState("");
  const [budgetNotes, setBudgetNotes] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [deliverableQuantities, setDeliverableQuantities] = useState<Record<string, number>>({});
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [campaignMonthDate, setCampaignMonthDate] = useState(() => new Date());
  const [campaignTab, setCampaignTab] = useState("requests");

  const { data: campaignTypes, isLoading: typesLoading } = useQuery<CampaignType[]>({
    queryKey: ["/api/campaign-types"],
  });

  const { data: campaignRequests, isLoading: requestsLoading } = useQuery<CampaignRequest[]>({
    queryKey: ["/api/companies", companyId, "campaign-requests"],
  });

  const { data: deliverableTypes } = useQuery<DeliverableType[]>({
    queryKey: ["/api/deliverable-types"],
  });

  const { data: meetingTypesList } = useQuery<MeetingType[]>({
    queryKey: ["/api/meeting-types"],
  });

  const { data: companyMembers } = useQuery<(CompanyMember & { firstName?: string; lastName?: string; email?: string })[]>({
    queryKey: ["/api/companies", companyId, "members"],
  });


  const nonAdminMembers = companyMembers?.filter(m => m.role !== "admin") || [];

  const activeCampaignTypes = campaignTypes?.filter(t => t.isActive) || [];

  const getDaysUntilDue = (dateStr: string): number => {
    if (!dateStr) return Infinity;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr + "T00:00:00");
    const diffMs = due.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const isRushRequest = dueDate ? getDaysUntilDue(dueDate) >= 7 && getDaysUntilDue(dueDate) <= 30 : false;
  const isBlockedRequest = dueDate ? getDaysUntilDue(dueDate) < 7 : false;

  const getSelectedType = (): CampaignType | undefined => {
    return activeCampaignTypes.find(t => t.id === selectedCampaignType);
  };

  const getDeliverableName = (id: string): string => {
    const deliverable = deliverableTypes?.find(d => d.id === id);
    return deliverable?.name || id;
  };

  const getDeliverableCredits = (id: string): number => {
    const deliverable = deliverableTypes?.find(d => d.id === id);
    return parseFloat(deliverable?.credits || "0");
  };

  const getMeetingTypeCredits = (mtId: string): number => {
    const mt = meetingTypesList?.find(m => m.id === mtId);
    return parseFloat(mt?.creditCost || "0");
  };

  const getMeetingTypeName = (mtId: string): string => {
    const mt = meetingTypesList?.find(m => m.id === mtId);
    return mt?.name || mtId;
  };

  const getMeetingTypeDuration = (mtId: string): number => {
    const mt = meetingTypesList?.find(m => m.id === mtId);
    return mt?.defaultDuration || 30;
  };

  const getTypeMeetingQuantities = (): Record<string, number> => {
    const selectedType = getSelectedType();
    if (!selectedType || !(selectedType as any).meetingTypeQuantities) return {};
    try {
      return JSON.parse((selectedType as any).meetingTypeQuantities);
    } catch { return {}; }
  };

  const calculateBaseCredits = (): number => {
    const selectedType = getSelectedType();
    if (!selectedType) return 0;
    let total = 0;
    for (const id of (selectedType.includedDeliverableIds || [])) {
      const perUnit = getDeliverableCredits(id);
      const qty = deliverableQuantities[id] || 1;
      total += perUnit * qty;
    }
    const mtgQtys = getTypeMeetingQuantities();
    for (const [mtId, qty] of Object.entries(mtgQtys)) {
      if (qty > 0) {
        total += getMeetingTypeCredits(mtId) * qty;
      }
    }
    return total || parseFloat(String(selectedType.estimatedCredits));
  };

  const calculateTotalCredits = (): number => {
    const base = calculateBaseCredits();
    return isRushRequest ? base * 2 : base;
  };

  const createRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/companies/${companyId}/campaign-requests`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "campaign-requests"] });
      setRequestOpen(false);
      setSuccessOpen(true);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to submit campaign request", variant: "destructive" });
    },
  });

  const rushChatMutation = useMutation({
    mutationFn: async () => {
      const typeName = getSelectedType()?.name || "Campaign";
      const res = await apiRequest("POST", "/api/chat/threads", {
        companyId,
        name: `${typeName} - Extra Rush Details`,
        type: "general",
        addAdmins: true,
      });
      return res.json();
    },
    onSuccess: (thread: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads"] });
      setRequestOpen(false);
      setTimeout(() => {
        window.location.href = `/client/chat?thread=${thread.id}`;
      }, 100);
    },
    onError: () => {
      toast({ title: "Failed to create chat. Please go to the Chat tab manually.", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setSelectedCampaignType("");
    setCampaignTitle("");
    setDueDate("");
    setNotes("");
    setTargetAudience("");
    setGoals("");
    setPreferredTone("");
    setKeyMessages("");
    setReferenceLinks("");
    setBudgetNotes("");
    setAdditionalDetails("");
    setDeliverableQuantities({});
    setSelectedMemberIds([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCampaignType || !dueDate) {
      toast({ title: "Please select a campaign type and due date", variant: "destructive" });
      return;
    }

    if (isBlockedRequest) {
      toast({ title: "Requests within 7 days are not allowed. Please reach out via Chat.", variant: "destructive" });
      return;
    }

    const selectedType = getSelectedType();
    if (!selectedType) return;

    const totalCredits = calculateTotalCredits();
    const mtgQtys = getTypeMeetingQuantities();
    createRequestMutation.mutate({
      campaignTypeId: selectedCampaignType,
      name: campaignTitle || null,
      dueDate,
      notes: notes || null,
      targetAudience: targetAudience || null,
      goals: goals || null,
      preferredTone: preferredTone || null,
      keyMessages: keyMessages || null,
      referenceLinks: referenceLinks || null,
      budgetNotes: budgetNotes || null,
      additionalDetails: additionalDetails || null,
      estimatedCredits: String(totalCredits),
      isRush: isRushRequest,
      deliverableQuantities: Object.keys(deliverableQuantities).length > 0 
        ? JSON.stringify(deliverableQuantities) 
        : null,
      campaignMemberIds: selectedMemberIds,
      requestDeliverableIds: selectedType.includedDeliverableIds || [],
      requestDeliverableQuantities: Object.keys(deliverableQuantities).length > 0 
        ? JSON.stringify(deliverableQuantities) 
        : (selectedType.deliverableQuantities || null),
      requestMeetingQuantities: Object.keys(mtgQtys).length > 0 
        ? JSON.stringify(mtgQtys) 
        : null,
    });
  };

  const toggleExpanded = (id: string) => {
    setExpandedRequests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pending Review</Badge>;
      case "approved":
        return <Badge className="bg-blue-500 text-white flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</Badge>;
      case "in_progress":
        return <Badge className="bg-amber-500 text-white">In Progress</Badge>;
      case "completed":
        return <Badge className="bg-green-500 text-white">Completed</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCampaignTypeName = (typeId: string): string => {
    const type = campaignTypes?.find(t => t.id === typeId);
    return type?.name || "Unknown Campaign";
  };

  const getCampaignType = (typeId: string): CampaignType | undefined => {
    return campaignTypes?.find(t => t.id === typeId);
  };

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
  const rejectedRequests = monthFilteredRequests.filter(r => r.status === "rejected" || r.status === "cancelled");

  if (typesLoading || requestsLoading) {
    const loadingContent = (
      <>
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </>
    );

    if (embedded) {
      return <div>{loadingContent}</div>;
    }

    return (
      <ClientLayout companyId={companyId}>
        <div className="p-6">
          {loadingContent}
        </div>
      </ClientLayout>
    );
  }

  const renderRequestCard = (request: CampaignRequest) => {
    return (
      <Card 
        key={request.id} 
        data-testid={`card-campaign-request-${request.id}`}
        className="cursor-pointer hover-elevate"
        onClick={() => setSelectedCampaign(request)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Megaphone className="w-5 h-5 text-primary" />
                <h3 className="font-medium">{request.name || getCampaignTypeName(request.campaignTypeId)}</h3>
                {(request as any).isRush && (
                  <Badge className="bg-amber-500 text-white">Rush</Badge>
                )}
                {getStatusBadge(request.status)}
              </div>
              {request.name && (
                <p className="text-sm text-muted-foreground mb-1 ml-7" data-testid={`text-campaign-type-${request.id}`}>
                  {getCampaignTypeName(request.campaignTypeId)}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2 ml-6 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Due: {parseLocalDate(request.dueDate).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Coins className="w-4 h-4" />
                  {request.estimatedCredits} credits
                </span>
              </div>
              {request.meetingScheduled && (
                <div className="ml-6">
                  <Badge variant="outline" className="flex items-center gap-1 w-fit">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    Meeting Scheduled
                  </Badge>
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Requested {new Date(request.createdAt).toLocaleDateString()}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderEmptyState = (message: string) => (
    <Card>
      <CardContent className="py-12 text-center">
        <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );

  const content = (
    <>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
            Campaigns
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Request marketing campaigns for your business
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCampaignMonthDate(new Date(campaignMonthDate.getFullYear(), campaignMonthDate.getMonth() - 1, 1))}
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
              onClick={() => setCampaignMonthDate(new Date(campaignMonthDate.getFullYear(), campaignMonthDate.getMonth() + 1, 1))}
              data-testid="button-campaign-month-next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setRequestOpen(true)} data-testid="button-request-campaign">
            <Plus className="w-4 h-4 mr-2" />
            Request Campaign
          </Button>
        </div>
      </div>

      <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">30-Day Advance Notice Required</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Campaign requests must be scheduled at least 30 days in advance to allow for proper planning and execution.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={campaignTab} onValueChange={setCampaignTab}>
        <MobileTabMenu
          tabs={[
            { value: "requests", label: "Requests", count: pendingRequests.length },
            { value: "approved", label: "Approved", count: approvedRequests.length },
            { value: "completed", label: "Completed", count: completedRequests.length },
            { value: "rejected", label: "Rejected", count: rejectedRequests.length, hidden: rejectedRequests.length === 0 },
          ]}
          activeTab={campaignTab}
          onTabChange={setCampaignTab}
          title="Campaigns"
        />
        <TabsList className="hidden md:inline-flex h-auto flex-wrap gap-1">
          <TabsTrigger value="requests" data-testid="tab-requests">
            Requests ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">
            Approved ({approvedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            Completed ({completedRequests.length})
          </TabsTrigger>
          {rejectedRequests.length > 0 && (
            <TabsTrigger value="rejected" data-testid="tab-rejected">
              Rejected ({rejectedRequests.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="requests" className="mt-4">
          {pendingRequests.length > 0 ? (
            <div className="space-y-4">
              {pendingRequests.map(renderRequestCard)}
            </div>
          ) : renderEmptyState("No pending campaign requests.")}
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          {approvedRequests.length > 0 ? (
            <div className="space-y-4">
              {approvedRequests.map(renderRequestCard)}
            </div>
          ) : renderEmptyState("No approved campaigns yet.")}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedRequests.length > 0 ? (
            <div className="space-y-4">
              {completedRequests.map(renderRequestCard)}
            </div>
          ) : renderEmptyState("No completed campaigns yet.")}
        </TabsContent>

        {rejectedRequests.length > 0 && (
          <TabsContent value="rejected" className="mt-4">
            <div className="space-y-4">
              {rejectedRequests.map(renderRequestCard)}
            </div>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request a Campaign</DialogTitle>
            <DialogDescription>
              Provide as much detail as possible to help us create the perfect campaign for you.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="campaignType">Campaign Type *</Label>
              <Select value={selectedCampaignType} onValueChange={(val) => {
                  setSelectedCampaignType(val);
                  const type = activeCampaignTypes.find(t => t.id === val);
                  if (type?.deliverableQuantities) {
                    try {
                      setDeliverableQuantities(JSON.parse(type.deliverableQuantities));
                    } catch { setDeliverableQuantities({}); }
                  } else {
                    setDeliverableQuantities({});
                  }
                }}>
                <SelectTrigger data-testid="select-campaign-type">
                  <SelectValue placeholder="Select a campaign type" />
                </SelectTrigger>
                <SelectContent>
                  {activeCampaignTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} ({type.estimatedCredits} credits)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCampaignType && getSelectedType() && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Campaign Deliverables:</h4>
                  <div className="space-y-2 mb-3">
                    {getSelectedType()?.includedDeliverableIds?.map((id) => {
                      const perUnitCredits = getDeliverableCredits(id);
                      const qty = deliverableQuantities[id] || 1;
                      const lineCredits = perUnitCredits * qty;
                      const displayCredits = isRushRequest ? lineCredits * 2 : lineCredits;
                      return (
                        <div key={id} className="flex items-center justify-between gap-2" data-testid={`deliverable-item-${id}`}>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Badge variant="outline" className="text-xs">
                              {qty > 1 ? `${qty}x ` : ""}{getDeliverableName(id)}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">
                            {displayCredits} credits{isRushRequest ? " (2x)" : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {Object.keys(getTypeMeetingQuantities()).length > 0 && (
                    <>
                      <h4 className="font-medium mb-2 mt-4">Campaign Meetings:</h4>
                      <div className="space-y-2 mb-3">
                        {Object.entries(getTypeMeetingQuantities()).map(([mtId, qty]) => {
                          if (qty <= 0) return null;
                          const perUnitCredits = getMeetingTypeCredits(mtId);
                          const lineCredits = perUnitCredits * qty;
                          const displayCredits = isRushRequest ? lineCredits * 2 : lineCredits;
                          return (
                            <div key={mtId} className="flex items-center justify-between gap-2" data-testid={`meeting-item-${mtId}`}>
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Badge variant="outline" className="text-xs">
                                  <Video className="w-3 h-3 mr-1" />
                                  {qty > 1 ? `${qty}x ` : ""}{getMeetingTypeName(mtId)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{getMeetingTypeDuration(mtId)} min</span>
                              </div>
                              <span className="text-xs text-muted-foreground font-mono">
                                {displayCredits.toFixed(1)} credits{isRushRequest ? " (2x)" : ""}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                  {getSelectedType()?.description && (
                    <p className="text-sm text-muted-foreground mb-3">{getSelectedType()?.description}</p>
                  )}
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-sm font-medium">Estimated Credits:</span>
                    <Badge className="flex items-center gap-1">
                      <Coins className="w-3 h-3" />
                      {calculateTotalCredits()} credits
                      {isRushRequest && (
                        <span className="ml-1 text-amber-200">(2x rush)</span>
                      )}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label htmlFor="campaignTitle">Campaign Title</Label>
              <Input
                id="campaignTitle"
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                placeholder="Give your campaign a name (optional)"
                data-testid="input-campaign-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Target Launch Date *</Label>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                data-testid="input-due-date"
              />
              {!dueDate && (
                <p className="text-xs text-muted-foreground">
                  Standard turnaround: 30+ days. Rush requests (7-30 days) incur 2x credit cost.
                </p>
              )}
              {isBlockedRequest && (
                <Card className="border-destructive bg-destructive/10">
                  <CardContent className="p-3 flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-destructive">
                        Requests within 7 days cannot be submitted online.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Please reach out to your account manager via Chat to discuss urgent needs.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => rushChatMutation.mutate()}
                        disabled={rushChatMutation.isPending}
                        data-testid="button-rush-chat"
                      >
                        <MessageSquare className="w-3 h-3 mr-1" />
                        {rushChatMutation.isPending ? "Creating..." : "Open Rush Chat"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              {isRushRequest && (
                <Card className="border-amber-500 bg-amber-500/10">
                  <CardContent className="p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                        Rush Request ({getDaysUntilDue(dueDate)} days)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Campaigns requested within 30 days incur a <strong>2x credit cost</strong> rush fee.
                        {selectedCampaignType && (
                          <span> Base: {calculateBaseCredits()} credits, Rush total: <strong>{calculateTotalCredits()} credits</strong>.</span>
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAudience">Target Audience</Label>
              <Textarea
                id="targetAudience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Describe your ideal audience (age, interests, demographics, location, etc.)"
                rows={2}
                data-testid="input-target-audience"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goals">Goals & Objectives</Label>
              <Textarea
                id="goals"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="What do you want to achieve with this campaign? (e.g., increase brand awareness, generate leads, drive sales)"
                rows={2}
                data-testid="input-goals"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredTone">Preferred Tone & Style</Label>
              <Input
                id="preferredTone"
                value={preferredTone}
                onChange={(e) => setPreferredTone(e.target.value)}
                placeholder="e.g., Professional, Casual, Fun, Authoritative, Friendly"
                data-testid="input-preferred-tone"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keyMessages">Key Messages</Label>
              <Textarea
                id="keyMessages"
                value={keyMessages}
                onChange={(e) => setKeyMessages(e.target.value)}
                placeholder="What are the main points or messages you want to communicate?"
                rows={2}
                data-testid="input-key-messages"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referenceLinks">Reference Links</Label>
              <Textarea
                id="referenceLinks"
                value={referenceLinks}
                onChange={(e) => setReferenceLinks(e.target.value)}
                placeholder="Any links to examples, competitor campaigns, or inspiration"
                rows={2}
                data-testid="input-reference-links"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budgetNotes">Budget Considerations</Label>
              <Input
                id="budgetNotes"
                value={budgetNotes}
                onChange={(e) => setBudgetNotes(e.target.value)}
                placeholder="Any budget constraints or notes"
                data-testid="input-budget-notes"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalDetails">Additional Details</Label>
              <Textarea
                id="additionalDetails"
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                placeholder="Any other information that would help us create the best campaign for you"
                rows={3}
                data-testid="input-additional-details"
              />
            </div>

            {nonAdminMembers.length > 0 && (
              <div className="space-y-2">
                <Label>Campaign Team Members</Label>
                <p className="text-xs text-muted-foreground">Select people from your company to be part of this campaign. Agency admins are included by default.</p>
                <Card className="bg-muted/50">
                  <CardContent className="p-3">
                    <ScrollArea className={nonAdminMembers.length > 4 ? "h-40" : ""}>
                      <div className="space-y-2">
                        {nonAdminMembers.map((member) => {
                          const name = [member.firstName, member.lastName].filter(Boolean).join(" ") || member.email || "Unknown";
                          const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                          const isSelected = selectedMemberIds.includes(member.userId);
                          return (
                            <label
                              key={member.userId}
                              className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover-elevate"
                              data-testid={`member-checkbox-${member.userId}`}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  setSelectedMemberIds(prev =>
                                    checked
                                      ? [...prev, member.userId]
                                      : prev.filter(id => id !== member.userId)
                                  );
                                }}
                              />
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium truncate">{name}</span>
                                {member.email && name !== member.email && (
                                  <span className="text-xs text-muted-foreground ml-2">{member.email}</span>
                                )}
                              </div>
                              <Badge variant="outline" className="text-xs capitalize">{member.role}</Badge>
                            </label>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
                {selectedMemberIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">{selectedMemberIds.length} member{selectedMemberIds.length !== 1 ? "s" : ""} selected</p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRequestOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRequestMutation.isPending || isBlockedRequest} data-testid="button-submit-campaign">
                {createRequestMutation.isPending ? "Submitting..." : isRushRequest ? "Submit Rush Request" : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Campaign Request Submitted
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Your campaign request has been submitted successfully. Our team will review it and get back to you shortly.
          </p>
          <DialogFooter>
            <Button onClick={() => setSuccessOpen(false)} data-testid="button-close-success">
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CampaignDetailPanel
        campaign={selectedCampaign}
        open={!!selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
        isAdmin={false}
        companyId={companyId}
        onTaskClick={(task) => setSelectedTask(task)}
      />

      <TaskDetailPanel
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        isAdmin={false}
        companyId={companyId}
      />
    </>
  );

  if (embedded) {
    return <div className="space-y-6" data-testid="campaigns-page">{content}</div>;
  }

  return (
    <ClientLayout companyId={companyId}>
      <div className="p-6 space-y-6" data-testid="campaigns-page">
        {content}
      </div>
    </ClientLayout>
  );
}
