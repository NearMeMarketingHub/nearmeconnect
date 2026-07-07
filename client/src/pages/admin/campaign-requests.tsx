import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { parseLocalDate } from "@/lib/utils";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Megaphone, Coins, Calendar, Clock, CheckCircle2, Building2, User, ChevronDown, ChevronRight, Target, MessageSquare, Link2, DollarSign, FileText, Users, Save, Edit2, Check, X, Plus } from "lucide-react";
import { Link } from "wouter";
import type { DeliverableType, CampaignType, Company } from "@shared/schema";

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
  deliverableQuantities: string | null;
  requestDeliverableIds: string[] | null;
  requestDeliverableQuantities: string | null;
  creditOverride: string | null;
  status: string;
  meetingScheduled: boolean;
  meetingUrl: string | null;
  adminNotes: string | null;
  createdAt: string;
  companyName?: string;
  campaignTypeName?: string;
  requestedByName?: string;
}

export default function AdminCampaignRequests() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [adminNotesEditing, setAdminNotesEditing] = useState<Record<string, string>>({});
  const [creditOverrideEditing, setCreditOverrideEditing] = useState<Record<string, string>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [createCompanyId, setCreateCompanyId] = useState("");
  const [createCampaignTypeId, setCreateCampaignTypeId] = useState("");
  const [createDueDate, setCreateDueDate] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [createTargetAudience, setCreateTargetAudience] = useState("");
  const [createGoals, setCreateGoals] = useState("");

  const { data: campaignRequests, isLoading } = useQuery<EnrichedCampaignRequest[]>({
    queryKey: ["/api/admin/campaign-requests"],
  });

  const { data: campaignTypes } = useQuery<CampaignType[]>({
    queryKey: ["/api/campaign-types"],
  });

  const { data: deliverableTypes } = useQuery<DeliverableType[]>({
    queryKey: ["/api/deliverable-types"],
  });

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes, creditOverride }: { id: string; status?: string; adminNotes?: string; creditOverride?: string | null }) => {
      const data: any = {};
      if (status !== undefined) data.status = status;
      if (adminNotes !== undefined) data.adminNotes = adminNotes;
      if (creditOverride !== undefined) data.creditOverride = creditOverride;
      return apiRequest("PATCH", `/api/campaign-requests/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaign-requests"] });
      toast({ title: "Updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/admin/campaign-requests", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaign-requests"] });
      toast({ title: "Campaign created successfully" });
      setCreateOpen(false);
      setCreateCompanyId("");
      setCreateCampaignTypeId("");
      setCreateDueDate("");
      setCreateNotes("");
      setCreateTargetAudience("");
      setCreateGoals("");
    },
    onError: () => {
      toast({ title: "Failed to create campaign", variant: "destructive" });
    },
  });

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

  const getCampaignType = (typeId: string): CampaignType | undefined => {
    return campaignTypes?.find(t => t.id === typeId);
  };

  const getDeliverableName = (id: string): string => {
    const deliverable = deliverableTypes?.find(d => d.id === id);
    return deliverable?.name || id;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
      case "approved":
        return <Badge className="bg-blue-500 text-white flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</Badge>;
      case "in_progress":
        return <Badge className="bg-amber-500 text-white">In Progress</Badge>;
      case "completed":
        return <Badge className="bg-green-500 text-white">Completed</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredRequests = campaignRequests?.filter(request => {
    if (statusFilter !== "all" && request.status !== statusFilter) return false;
    if (companyFilter !== "all" && request.companyId !== companyFilter) return false;
    return true;
  }) || [];

  // Get unique companies from campaign requests for the filter
  const uniqueCompanies = Array.from(new Set(campaignRequests?.map(r => r.companyId) || [])).map(id => {
    const request = campaignRequests?.find(r => r.companyId === id);
    return { id, name: request?.companyName || id };
  });

  const handleSaveAdminNotes = (id: string) => {
    const notes = adminNotesEditing[id];
    if (notes !== undefined) {
      updateStatusMutation.mutate({ id, adminNotes: notes });
      setAdminNotesEditing(prev => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const pendingCount = campaignRequests?.filter(r => r.status === "pending").length || 0;

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
              Campaign Requests
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review and manage campaign requests from clients
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-campaign">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </DialogTrigger>
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
            {pendingCount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                {pendingCount} Pending Review
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Label>Status:</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label>Company:</Label>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-48" data-testid="select-company-filter">
                <SelectValue placeholder="Filter by company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {uniqueCompanies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Megaphone className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                {statusFilter === "all" 
                  ? "No campaign requests yet." 
                  : `No ${statusFilter} campaign requests.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredRequests.map((request) => {
              const isExpanded = expandedRequests.has(request.id);
              const campaignType = getCampaignType(request.campaignTypeId);
              const isEditingNotes = request.id in adminNotesEditing;
              const currentNotes = isEditingNotes ? adminNotesEditing[request.id] : (request.adminNotes || "");
              
              return (
                <Card key={request.id} data-testid={`card-request-${request.id}`}>
                  <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(request.id)}>
                    <CollapsibleTrigger asChild>
                      <CardContent className="p-4 cursor-pointer hover-elevate">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              )}
                              <Megaphone className="w-5 h-5 text-primary" />
                              <h3 className="font-medium">{request.campaignTypeName || "Campaign"}</h3>
                              {getStatusBadge(request.status)}
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2 flex-wrap ml-6">
                              <Link href={`/admin/companies/${request.companyId}`}>
                                <span className="flex items-center gap-1 hover:text-primary cursor-pointer">
                                  <Building2 className="w-4 h-4" />
                                  {request.companyName || "Company"}
                                </span>
                              </Link>
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {request.requestedByName || "Unknown"}
                              </span>
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
                          
                          <div className="flex flex-col items-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-xs text-muted-foreground">
                              Requested {new Date(request.createdAt).toLocaleDateString()}
                            </span>
                            <Select
                              value={request.status}
                              onValueChange={(status) => updateStatusMutation.mutate({ id: request.id, status })}
                            >
                              <SelectTrigger className="w-36" data-testid={`select-status-${request.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 border-t pt-4 space-y-4">
                        {/* Campaign Type Info */}
                        {campaignType && (() => {
                          const baseQuantities: Record<string, number> = request.deliverableQuantities ? JSON.parse(request.deliverableQuantities) : {};
                          const effectiveQuantities: Record<string, number> = request.requestDeliverableQuantities ? JSON.parse(request.requestDeliverableQuantities) : baseQuantities;
                          const effectiveDeliverableIds = request.requestDeliverableIds || campaignType.includedDeliverableIds || [];
                          const isEditingCredit = request.id in creditOverrideEditing;
                          const effectiveCredits = request.creditOverride != null ? request.creditOverride : request.estimatedCredits;
                          return (
                          <div className="bg-muted/50 rounded-lg p-4">
                            <h4 className="font-medium text-sm mb-2">Campaign Type: {campaignType.name}</h4>
                            <div className="space-y-1 mb-2">
                              {effectiveDeliverableIds.map((id) => {
                                const qty = effectiveQuantities[id] || 1;
                                return (
                                  <div key={id} className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {getDeliverableName(id)}
                                    </Badge>
                                    {qty > 1 && (
                                      <span className="text-xs text-muted-foreground">x{qty}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            {campaignType.description && (
                              <p className="text-sm text-muted-foreground mb-2">{campaignType.description}</p>
                            )}
                            <div className="flex items-center gap-2 border-t pt-2">
                              <span className="text-sm font-medium">Credits:</span>
                              {!isEditingCredit ? (
                                <div className="flex items-center gap-1">
                                  <Badge className="flex items-center gap-1">
                                    <Coins className="w-3 h-3" />
                                    {effectiveCredits}
                                  </Badge>
                                  {request.creditOverride != null && (
                                    <span className="text-xs text-muted-foreground line-through">{request.estimatedCredits}</span>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => { e.stopPropagation(); setCreditOverrideEditing(prev => ({ ...prev, [request.id]: effectiveCredits })); }}
                                    data-testid={`button-edit-credit-override-${request.id}`}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={creditOverrideEditing[request.id]}
                                    onChange={(e) => setCreditOverrideEditing(prev => ({ ...prev, [request.id]: e.target.value }))}
                                    className="w-24 h-7 text-sm"
                                    data-testid={`input-credit-override-${request.id}`}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      const val = creditOverrideEditing[request.id];
                                      if (val === "" || isNaN(parseFloat(val))) {
                                        toast({ title: "Please enter a valid number", variant: "destructive" });
                                        return;
                                      }
                                      updateStatusMutation.mutate({ id: request.id, creditOverride: val });
                                      setCreditOverrideEditing(prev => { const n = { ...prev }; delete n[request.id]; return n; });
                                    }}
                                    data-testid={`button-save-credit-override-${request.id}`}
                                  >
                                    <Check className="w-3 h-3" />
                                  </Button>
                                  {request.creditOverride != null && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs"
                                      onClick={() => {
                                        updateStatusMutation.mutate({ id: request.id, creditOverride: null });
                                        setCreditOverrideEditing(prev => { const n = { ...prev }; delete n[request.id]; return n; });
                                      }}
                                    >
                                      Reset
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setCreditOverrideEditing(prev => { const n = { ...prev }; delete n[request.id]; return n; })}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                          );
                        })()}

                        {/* Client Details */}
                        <div className="grid gap-4 md:grid-cols-2">
                          {request.targetAudience && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                Target Audience
                              </div>
                              <p className="text-sm text-muted-foreground pl-6">{request.targetAudience}</p>
                            </div>
                          )}
                          
                          {request.goals && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <Target className="w-4 h-4 text-muted-foreground" />
                                Goals & Objectives
                              </div>
                              <p className="text-sm text-muted-foreground pl-6">{request.goals}</p>
                            </div>
                          )}
                          
                          {request.preferredTone && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                                Preferred Tone
                              </div>
                              <p className="text-sm text-muted-foreground pl-6">{request.preferredTone}</p>
                            </div>
                          )}
                          
                          {request.keyMessages && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                Key Messages
                              </div>
                              <p className="text-sm text-muted-foreground pl-6">{request.keyMessages}</p>
                            </div>
                          )}
                          
                          {request.referenceLinks && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <Link2 className="w-4 h-4 text-muted-foreground" />
                                Reference Links
                              </div>
                              <p className="text-sm text-muted-foreground pl-6 break-all">{request.referenceLinks}</p>
                            </div>
                          )}
                          
                          {request.budgetNotes && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <DollarSign className="w-4 h-4 text-muted-foreground" />
                                Budget Considerations
                              </div>
                              <p className="text-sm text-muted-foreground pl-6">{request.budgetNotes}</p>
                            </div>
                          )}
                        </div>
                        
                        {request.notes && (
                          <div className="space-y-1">
                            <div className="text-sm font-medium">Notes</div>
                            <p className="text-sm text-muted-foreground">{request.notes}</p>
                          </div>
                        )}
                        
                        {request.additionalDetails && (
                          <div className="space-y-1">
                            <div className="text-sm font-medium">Additional Details</div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.additionalDetails}</p>
                          </div>
                        )}

                        {/* Admin Notes Section */}
                        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 space-y-2">
                          <Label htmlFor={`admin-notes-${request.id}`} className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            Admin Notes (visible to client)
                          </Label>
                          <Textarea
                            id={`admin-notes-${request.id}`}
                            value={isEditingNotes ? adminNotesEditing[request.id] : (request.adminNotes || "")}
                            onChange={(e) => setAdminNotesEditing(prev => ({ ...prev, [request.id]: e.target.value }))}
                            placeholder="Add notes for the client about this request..."
                            rows={3}
                            className="bg-white dark:bg-blue-950/50"
                            data-testid={`input-admin-notes-${request.id}`}
                          />
                          {isEditingNotes && (
                            <Button 
                              size="sm" 
                              onClick={() => handleSaveAdminNotes(request.id)}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-save-notes-${request.id}`}
                            >
                              <Save className="w-4 h-4 mr-2" />
                              Save Notes
                            </Button>
                          )}
                        </div>
                        {request.status !== "pending" && request.status !== "cancelled" && (
                          <CampaignTasksList campaignRequestId={request.id} />
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function CampaignTasksList({ campaignRequestId }: { campaignRequestId: string }) {
  const { data: tasks } = useQuery<any[]>({
    queryKey: ["/api/tasks/campaign", campaignRequestId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/campaign/${campaignRequestId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  if (!tasks || tasks.length === 0) return null;

  return (
    <div className="border-t pt-4 mt-4">
      <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Campaign Tasks ({tasks.length})
      </h4>
      <div className="space-y-2">
        {tasks.map((task: any) => (
          <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Badge variant={task.status === "completed" ? "default" : "outline"} className="text-xs">
                {task.status.replace("_", " ")}
              </Badge>
              <span className="truncate">{task.title}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {task.creditCost && <Badge variant="outline" className="font-mono text-xs">{task.creditCost} cr</Badge>}
              {task.dueDate && <span className="text-xs text-muted-foreground">{parseLocalDate(task.dueDate).toLocaleDateString()}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
