import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileTabMenu } from "@/components/mobile-tab-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Plus, Video, Coins, Calendar, Clock, AlertTriangle, CheckCircle2, Check,
  ExternalLink, ChevronDown, ChevronRight, Users, XCircle, Loader2,
  CalendarPlus, FileText
} from "lucide-react";
import type { MeetingType, MeetingRequest } from "@shared/schema";

interface ClientMeetingsProps {
  companyId: string;
  embedded?: boolean;
}

interface ChatUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  isAdmin: boolean;
}

export default function ClientMeetings({ companyId, embedded = false }: ClientMeetingsProps) {
  const { toast } = useToast();
  const [requestOpen, setRequestOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("requested");
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  
  const [selectedMeetingType, setSelectedMeetingType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [proposedDate, setProposedDate] = useState("");
  const [proposedTime, setProposedTime] = useState("");
  const [timeHour, setTimeHour] = useState("");
  const [timeMinute, setTimeMinute] = useState("");
  const [timePeriod, setTimePeriod] = useState("");
  const [duration, setDuration] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [externalEmails, setExternalEmails] = useState<string[]>([]);
  const [newExternalEmail, setNewExternalEmail] = useState("");

  const { data: meetingTypes, isLoading: typesLoading } = useQuery<MeetingType[]>({
    queryKey: ["/api/meeting-types/active"],
  });

  const { data: meetingRequests, isLoading: requestsLoading } = useQuery<MeetingRequest[]>({
    queryKey: ["/api/companies", companyId, "meeting-requests"],
  });

  const { data: chatUsers = [] } = useQuery<ChatUser[]>({
    queryKey: ["/api/companies", companyId, "chat-users"],
  });

  const getSelectedType = (): MeetingType | undefined => {
    return meetingTypes?.find(t => t.id === selectedMeetingType);
  };

  const createRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/companies/${companyId}/meeting-requests`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "meeting-requests"] });
      setRequestOpen(false);
      setSuccessOpen(true);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to submit meeting request", variant: "destructive" });
    },
  });

  const computeProposedTime = (h: string, m: string, p: string) => {
    if (!h || !m || !p) return "";
    let hour24 = parseInt(h);
    if (p === "AM" && hour24 === 12) hour24 = 0;
    if (p === "PM" && hour24 !== 12) hour24 += 12;
    return `${String(hour24).padStart(2, "0")}:${m}`;
  };

  const resetForm = () => {
    setSelectedMeetingType("");
    setTitle("");
    setDescription("");
    setProposedDate("");
    setProposedTime("");
    setTimeHour("");
    setTimeMinute("");
    setTimePeriod("");
    setDuration("");
    setSelectedAttendees([]);
    setExternalEmails([]);
    setNewExternalEmail("");
  };

  const handleMeetingTypeChange = (typeId: string) => {
    setSelectedMeetingType(typeId);
    const type = meetingTypes?.find(t => t.id === typeId);
    if (type) {
      setDuration(String(type.defaultDuration));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMeetingType) {
      toast({ title: "Please select a meeting type", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Please enter a meeting title", variant: "destructive" });
      return;
    }
    const computedTime = computeProposedTime(timeHour, timeMinute, timePeriod);
    if (!proposedDate || !computedTime) {
      toast({ title: "Please select a date and time", variant: "destructive" });
      return;
    }

    createRequestMutation.mutate({
      meetingTypeId: selectedMeetingType,
      title,
      description,
      proposedDate,
      proposedTime: computedTime,
      duration: parseInt(duration) || 30,
      attendeeIds: selectedAttendees,
      externalAttendeeEmails: externalEmails,
    });
  };

  const addExternalEmail = () => {
    const email = newExternalEmail.trim().toLowerCase();
    if (!email) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    
    if (externalEmails.includes(email)) {
      toast({ title: "This email has already been added", variant: "destructive" });
      return;
    }
    
    setExternalEmails([...externalEmails, email]);
    setNewExternalEmail("");
  };

  const removeExternalEmail = (email: string) => {
    setExternalEmails(externalEmails.filter(e => e !== email));
  };

  const toggleAttendee = (userId: string) => {
    setSelectedAttendees(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending Approval</Badge>;
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

  const getMeetingTypeName = (typeId: string): string => {
    const type = meetingTypes?.find(t => t.id === typeId);
    return type?.name || "Unknown Type";
  };

  const getAttendeeName = (userId: string): string => {
    const user = chatUsers.find(u => u.id === userId);
    if (user) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
    }
    return userId;
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
    
    const params = new URLSearchParams({
      subject: request.title,
      body: request.description || "",
      startdt: formatForOutlook(startDate),
      enddt: formatForOutlook(endDate),
    });

    if (request.teamsLink) {
      params.set("body", `${request.description || ""}\n\nTeams Meeting Link: ${request.teamsLink}`);
    }

    return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
  };

  const companyMembers = chatUsers.filter(u => !u.isAdmin);
  const adminUsers = chatUsers.filter(u => u.isAdmin);

  const pendingRequests = (meetingRequests || []).filter(r => r.status === "pending");
  const approvedMeetings = (meetingRequests || []).filter(r => r.status === "approved");
  const completedMeetings = (meetingRequests || []).filter(r => r.status === "completed");
  const rejectedMeetings = (meetingRequests || []).filter(r => r.status === "rejected");

  const renderMeetingCard = (request: MeetingRequest) => (
    <Collapsible
      key={request.id}
      open={expandedRequests.has(request.id)}
      onOpenChange={() => toggleExpanded(request.id)}
    >
      <Card>
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
                  <CardDescription className="truncate">
                    {getMeetingTypeName(request.meetingTypeId)} - {formatDateTime(request.proposedDate, request.proposedTime)}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
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
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">Date & Time</Label>
                <p className="text-sm">{formatDateTime(request.proposedDate, request.proposedTime)}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Duration</Label>
                <p className="text-sm">{request.duration} minutes</p>
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
                  {request.attendeeIds.map((userId) => (
                    <Badge key={userId} variant="secondary">
                      {getAttendeeName(userId)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {request.externalAttendeeEmails && request.externalAttendeeEmails.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">External Guests</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {request.externalAttendeeEmails.map((email) => (
                    <Badge key={email} variant="outline">
                      {email}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {request.adminNotes && (
              <div className="bg-muted/50 p-3 rounded-md">
                <Label className="text-xs text-muted-foreground">Agency Notes</Label>
                <p className="text-sm whitespace-pre-wrap">{request.adminNotes}</p>
              </div>
            )}

            {request.notes && (
              <div className="bg-muted/50 p-3 rounded-md">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Meeting Notes
                </Label>
                <p className="text-sm whitespace-pre-wrap mt-1" data-testid={`text-meeting-notes-${request.id}`}>{request.notes}</p>
              </div>
            )}

            {request.rejectionReason && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                <Label className="text-xs text-destructive font-medium">Rejection Reason</Label>
                <p className="text-sm mt-1">{request.rejectionReason}</p>
              </div>
            )}

            {(request.status === "approved" || request.status === "completed") && (
              <div className="flex items-center gap-3 pt-2 border-t">
                {request.teamsLink && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={request.teamsLink} target="_blank" rel="noopener noreferrer">
                      <Video className="h-4 w-4 mr-2" />
                      Join Teams Meeting
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                )}
                {request.status === "approved" && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={request.outlookMeetingLink || generateOutlookLink(request)} target="_blank" rel="noopener noreferrer">
                      <CalendarPlus className="h-4 w-4 mr-2" />
                      {request.outlookMeetingLink ? "Open Meeting Invite" : "Add to Outlook"}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );

  const content = (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Meetings</h1>
          <p className="text-muted-foreground">
            Request and manage meetings with the agency team
          </p>
        </div>
        <Button onClick={() => setRequestOpen(true)} data-testid="button-request-meeting">
          <Plus className="mr-2 h-4 w-4" />
          Request Meeting
        </Button>
      </div>

        {requestsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : meetingRequests?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Video className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Meeting Requests</h3>
              <p className="text-muted-foreground text-center mb-4">
                Request a meeting to connect with the agency team
              </p>
              <Button onClick={() => setRequestOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Request First Meeting
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <MobileTabMenu
              tabs={[
                { value: "requested", label: "Requested", count: pendingRequests.length || undefined },
                { value: "approved", label: "Approved", count: approvedMeetings.length || undefined },
                { value: "completed", label: "Completed" },
                { value: "rejected", label: "Rejected" },
              ]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              title="Meetings"
            />
            <TabsList className="hidden md:inline-flex">
              <TabsTrigger value="requested" data-testid="tab-client-requested">
                Requested
                {pendingRequests.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5">{pendingRequests.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved" data-testid="tab-client-approved">
                Approved
                {approvedMeetings.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5">{approvedMeetings.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" data-testid="tab-client-completed">
                Completed
              </TabsTrigger>
              <TabsTrigger value="rejected" data-testid="tab-client-rejected">
                Rejected
              </TabsTrigger>
            </TabsList>

            <TabsContent value="requested" className="space-y-4 mt-4">
              {pendingRequests.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No pending meeting requests</p>
                  </CardContent>
                </Card>
              ) : (
                pendingRequests.map(renderMeetingCard)
              )}
            </TabsContent>

            <TabsContent value="approved" className="space-y-4 mt-4">
              {approvedMeetings.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No approved meetings</p>
                  </CardContent>
                </Card>
              ) : (
                approvedMeetings.map(renderMeetingCard)
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4 mt-4">
              {completedMeetings.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No completed meetings yet</p>
                  </CardContent>
                </Card>
              ) : (
                completedMeetings.map(renderMeetingCard)
              )}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-4 mt-4">
              {rejectedMeetings.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No rejected meetings</p>
                  </CardContent>
                </Card>
              ) : (
                rejectedMeetings.map(renderMeetingCard)
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Request Meeting Dialog */}
        <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Request a Meeting</DialogTitle>
              <DialogDescription>
                Schedule a meeting with the agency team. Meetings require approval.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meetingType">Meeting Type</Label>
                <Select value={selectedMeetingType} onValueChange={handleMeetingTypeChange}>
                  <SelectTrigger data-testid="select-meeting-type">
                    <SelectValue placeholder="Select meeting type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {meetingTypes?.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          <span>{type.name}</span>
                          <Badge variant="secondary" className="ml-2">
                            {type.creditCost} credits
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getSelectedType() && (
                  <p className="text-xs text-muted-foreground">
                    {getSelectedType()?.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Meeting Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Q1 Strategy Discussion"
                  data-testid="input-meeting-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What would you like to discuss?"
                  data-testid="input-meeting-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Proposed Date</Label>
                  <DatePicker
                    value={proposedDate}
                    onChange={setProposedDate}
                    data-testid="input-meeting-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Proposed Time</Label>
                  <div className="flex items-center gap-1">
                    <Select
                      value={timeHour}
                      onValueChange={(h) => {
                        setTimeHour(h);
                        const m = timeMinute || "00";
                        const p = timePeriod || "AM";
                        if (!timeMinute) setTimeMinute("00");
                        if (!timePeriod) setTimePeriod("AM");
                        setProposedTime(computeProposedTime(h, m, p));
                      }}
                    >
                      <SelectTrigger className="w-[70px]" data-testid="select-meeting-hour">
                        <SelectValue placeholder="HH" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                          <SelectItem key={h} value={String(h).padStart(2, "0")}>
                            {String(h).padStart(2, "0")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-lg font-medium">:</span>
                    <Select
                      value={timeMinute}
                      onValueChange={(m) => {
                        setTimeMinute(m);
                        const h = timeHour || "12";
                        const p = timePeriod || "AM";
                        if (!timeHour) setTimeHour("12");
                        if (!timePeriod) setTimePeriod("AM");
                        setProposedTime(computeProposedTime(h, m, p));
                      }}
                    >
                      <SelectTrigger className="w-[70px]" data-testid="select-meeting-minute">
                        <SelectValue placeholder="MM" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="00">00</SelectItem>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="45">45</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={timePeriod}
                      onValueChange={(p) => {
                        setTimePeriod(p);
                        const h = timeHour || "12";
                        const m = timeMinute || "00";
                        if (!timeHour) setTimeHour("12");
                        if (!timeMinute) setTimeMinute("00");
                        setProposedTime(computeProposedTime(h, m, p));
                      }}
                    >
                      <SelectTrigger className="w-[70px]" data-testid="select-meeting-period">
                        <SelectValue placeholder="AM" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger data-testid="select-meeting-duration">
                    <SelectValue placeholder="Select duration..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Attendees (optional)</Label>
                <p className="text-xs text-muted-foreground" data-testid="text-admin-auto-included">Agency admins are automatically included</p>
                <ScrollArea className="h-40 border rounded-md p-2">
                  {companyMembers.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Team Members</p>
                      {companyMembers.map((user) => {
                        const isSelected = selectedAttendees.includes(user.id);
                        return (
                          <div
                            key={user.id}
                            className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                            role="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleAttendee(user.id);
                            }}
                          >
                            <div className={`h-4 w-4 shrink-0 rounded-sm border ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-primary'} flex items-center justify-center`}>
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {user.firstName?.[0]}{user.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
                {selectedAttendees.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedAttendees.length} attendee{selectedAttendees.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Invite External Guests (optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Add email addresses for people outside your organization
                </p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={newExternalEmail}
                    onChange={(e) => setNewExternalEmail(e.target.value)}
                    placeholder="guest@example.com"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addExternalEmail();
                      }
                    }}
                    data-testid="input-external-email"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={addExternalEmail}
                    data-testid="button-add-external-email"
                  >
                    Add
                  </Button>
                </div>
                {externalEmails.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {externalEmails.map((email) => (
                      <Badge 
                        key={email} 
                        variant="secondary" 
                        className="flex items-center gap-1"
                      >
                        {email}
                        <button
                          type="button"
                          onClick={() => removeExternalEmail(email)}
                          className="ml-1 hover:text-destructive"
                          data-testid={`button-remove-email-${email}`}
                        >
                          <XCircle className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {getSelectedType() && (
                <div className="bg-muted/50 p-3 rounded-md flex items-center justify-between">
                  <span className="text-sm">Credit Cost:</span>
                  <span className="font-medium flex items-center gap-1">
                    <Coins className="h-4 w-4 text-amber-500" />
                    {getSelectedType()?.creditCost} credits
                  </span>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={createRequestMutation.isPending}
                  data-testid="button-submit-meeting-request"
                >
                  {createRequestMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Request"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Success Dialog */}
        <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Meeting Request Submitted
              </DialogTitle>
              <DialogDescription>
                Your meeting request has been submitted and is pending approval.
                You'll be notified once it's approved.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setSuccessOpen(false)}>
                Got it
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </>
  );

  if (embedded) {
    return <div className="space-y-6">{content}</div>;
  }

  return (
    <ClientLayout companyId={companyId}>
      <div className="p-6 space-y-6">
        {content}
      </div>
    </ClientLayout>
  );
}
