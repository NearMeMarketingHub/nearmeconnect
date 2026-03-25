import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Video, Coins, Clock, CheckCircle2, XCircle, ChevronDown, ChevronRight, 
  Users, Building2, CalendarPlus, ExternalLink, Loader2, AlertTriangle
} from "lucide-react";
import type { MeetingType, MeetingRequest, Company } from "@shared/schema";

interface MeetingRequestWithCompany extends MeetingRequest {
  company?: Company;
  meetingType?: MeetingType;
}

export default function AdminMeetingRequests() {
  const { toast } = useToast();
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MeetingRequestWithCompany | null>(null);
  const [teamsLink, setTeamsLink] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");

  const { data: meetingRequests = [], isLoading } = useQuery<MeetingRequest[]>({
    queryKey: ["/api/meeting-requests"],
  });

  const { data: meetingTypes = [] } = useQuery<MeetingType[]>({
    queryKey: ["/api/meeting-types"],
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/meeting-requests/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-requests"] });
      setApproveDialogOpen(false);
      setSelectedRequest(null);
      setTeamsLink("");
      setAdminNotes("");
      toast({ title: "Meeting request updated" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to update meeting request", variant: "destructive" });
    },
  });

  const enrichedRequests: MeetingRequestWithCompany[] = meetingRequests.map(request => ({
    ...request,
    company: companies.find(c => c.id === request.companyId),
    meetingType: meetingTypes.find(t => t.id === request.meetingTypeId),
  }));

  const filteredRequests = enrichedRequests.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (companyFilter !== "all" && r.companyId !== companyFilter) return false;
    return true;
  });

  const toggleExpanded = (requestId: string) => {
    setExpandedRequests(prev => {
      const next = new Set(prev);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
  };

  const openApproveDialog = (request: MeetingRequestWithCompany) => {
    setSelectedRequest(request);
    setTeamsLink(request.teamsLink || "");
    setAdminNotes(request.adminNotes || "");
    setApproveDialogOpen(true);
  };

  const handleApprove = () => {
    if (!selectedRequest) return;
    
    updateMutation.mutate({
      id: selectedRequest.id,
      data: {
        status: "approved",
        teamsLink: teamsLink || null,
        adminNotes: adminNotes || null,
      },
    });
  };

  const handleReject = (request: MeetingRequestWithCompany, notes?: string) => {
    updateMutation.mutate({
      id: request.id,
      data: {
        status: "rejected",
        adminNotes: notes || null,
      },
    });
  };

  const handleComplete = (request: MeetingRequestWithCompany) => {
    updateMutation.mutate({
      id: request.id,
      data: { status: "completed" },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
      case "completed":
        return <Badge variant="outline" className="text-blue-600 border-blue-600"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="text-gray-500 border-gray-500"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      case "rejected":
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDateTime = (date: string, time: string): string => {
    try {
      const dateObj = new Date(`${date}T${time}`);
      return dateObj.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return `${date} ${time}`;
    }
  };

  const generateOutlookLink = (request: MeetingRequest): string => {
    const startDate = new Date(`${request.proposedDate}T${request.proposedTime}`);
    const endDate = new Date(startDate.getTime() + request.duration * 60000);
    
    const formatForOutlook = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    
    let body = request.description || "";
    if (request.teamsLink) {
      body += `\n\nTeams Meeting Link: ${request.teamsLink}`;
    }

    const params = new URLSearchParams({
      subject: request.title,
      body,
      startdt: formatForOutlook(startDate),
      enddt: formatForOutlook(endDate),
    });

    return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
  };

  const pendingCount = enrichedRequests.filter(r => r.status === "pending").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Meeting Requests</h1>
            <p className="text-muted-foreground">
              Review and approve client meeting requests
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="text-lg px-3 py-1">
              <AlertTriangle className="w-4 h-4 mr-2" />
              {pendingCount} Pending
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label>Status:</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label>Company:</Label>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-48" data-testid="select-company-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Video className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Meeting Requests</h3>
              <p className="text-muted-foreground text-center">
                {statusFilter === "all" 
                  ? "No meeting requests have been submitted yet."
                  : `No ${statusFilter} meeting requests.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <Collapsible
                key={request.id}
                open={expandedRequests.has(request.id)}
                onOpenChange={() => toggleExpanded(request.id)}
              >
                <Card className={request.status === "pending" ? "border-yellow-300" : ""}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover-elevate">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {expandedRequests.has(request.id) ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <Video className="h-5 w-5 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate">{request.title}</CardTitle>
                            <CardDescription className="truncate flex items-center gap-2">
                              <Building2 className="h-3 w-3" />
                              {request.company?.name || "Unknown Company"}
                              <span className="mx-1">-</span>
                              {request.meetingType?.name || "Unknown Type"}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(request.proposedDate, request.proposedTime)}
                          </span>
                          <div className="flex items-center gap-1 text-sm">
                            <Coins className="h-4 w-4 text-amber-500" />
                            <span>{request.creditCost}</span>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Date & Time</Label>
                          <p className="text-sm">{formatDateTime(request.proposedDate, request.proposedTime)}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Duration</Label>
                          <p className="text-sm">{request.duration} minutes</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Credit Cost</Label>
                          <p className="text-sm flex items-center gap-1">
                            <Coins className="h-4 w-4 text-amber-500" />
                            {request.creditCost} credits
                            {request.creditsDeducted && (
                              <Badge variant="secondary" className="ml-2 text-xs">Deducted</Badge>
                            )}
                          </p>
                        </div>
                      </div>

                      {request.description && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Description</Label>
                          <p className="text-sm whitespace-pre-wrap">{request.description}</p>
                        </div>
                      )}

                      {request.attendeeIds && request.attendeeIds.length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Attendees</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {request.attendeeIds.map((userId, idx) => (
                              <Badge key={idx} variant="secondary">
                                <Users className="h-3 w-3 mr-1" />
                                {userId}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {request.externalAttendeeEmails && request.externalAttendeeEmails.length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground">External Guests</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {request.externalAttendeeEmails.map((email, idx) => (
                              <Badge key={idx} variant="outline">
                                {email}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {request.teamsLink && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Teams Meeting Link</Label>
                          <a 
                            href={request.teamsLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            {request.teamsLink}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}

                      {request.adminNotes && (
                        <div className="bg-muted/50 p-3 rounded-md">
                          <Label className="text-xs text-muted-foreground">Admin Notes</Label>
                          <p className="text-sm whitespace-pre-wrap">{request.adminNotes}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-3 pt-3 border-t">
                        <div className="flex items-center gap-2">
                          {(request.status === "pending" || request.status === "approved") && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={generateOutlookLink(request)} target="_blank" rel="noopener noreferrer">
                                <CalendarPlus className="h-4 w-4 mr-2" />
                                {request.status === "pending" ? "Step 1: Create in Outlook" : "Create in Outlook"}
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            </Button>
                          )}
                          {request.status === "approved" && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openApproveDialog(request)}
                            >
                              Edit Details
                            </Button>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {request.status === "pending" && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleReject(request)}
                                data-testid={`button-reject-${request.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => openApproveDialog(request)}
                                data-testid={`button-approve-${request.id}`}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Step 2: Approve
                              </Button>
                            </>
                          )}
                          {request.status === "approved" && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleComplete(request)}
                              data-testid={`button-complete-${request.id}`}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Mark Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}

        {/* Approve Dialog */}
        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedRequest?.status === "pending" ? "Approve Meeting Request" : "Update Meeting Details"}
              </DialogTitle>
              <DialogDescription>
                {selectedRequest?.status === "pending" 
                  ? "Approving will deduct credits from the company. Add a Teams link for the meeting."
                  : "Update the meeting details and Teams link."}
              </DialogDescription>
            </DialogHeader>
            
            {selectedRequest && (
              <div className="space-y-4">
                <div className="bg-muted/50 p-3 rounded-md space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{selectedRequest.title}</span>
                    <Badge variant="secondary">
                      <Coins className="h-3 w-3 mr-1" />
                      {selectedRequest.creditCost} credits
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(selectedRequest.proposedDate, selectedRequest.proposedTime)} - {selectedRequest.duration} min
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Company: {selectedRequest.company?.name}
                  </p>
                </div>

                {selectedRequest.status === "pending" && (
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded-md">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Step 1: Create the calendar event first
                    </p>
                    <Button variant="outline" size="sm" asChild className="w-full">
                      <a href={generateOutlookLink(selectedRequest)} target="_blank" rel="noopener noreferrer">
                        <CalendarPlus className="h-4 w-4 mr-2" />
                        Open Outlook Calendar
                        <ExternalLink className="h-3 w-3 ml-2" />
                      </a>
                    </Button>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                      After creating the meeting, copy the Teams link and paste it below.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="teamsLink">
                    {selectedRequest.status === "pending" ? "Step 2: Paste Teams Meeting Link" : "Microsoft Teams Meeting Link"}
                  </Label>
                  <Input
                    id="teamsLink"
                    value={teamsLink}
                    onChange={(e) => setTeamsLink(e.target.value)}
                    placeholder="Paste your Teams meeting link here..."
                    data-testid="input-teams-link"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminNotes">Notes for Client (optional)</Label>
                  <Textarea
                    id="adminNotes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Any notes or instructions for the client..."
                    data-testid="input-admin-notes"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleApprove}
                disabled={updateMutation.isPending}
                data-testid="button-confirm-approve"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : selectedRequest?.status === "pending" ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve & Deduct Credits
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
