import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileTabMenu } from "@/components/mobile-tab-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useSearch, useLocation } from "wouter";
import { 
  Video, Coins, Clock, CheckCircle2, XCircle, ChevronDown, ChevronRight, 
  Users, Building2, CalendarPlus, ExternalLink, Loader2, AlertTriangle, Plus, Pencil, Trash2, Calendar, FileText, Save, Search
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import type { MeetingType, MeetingRequest, Company } from "@shared/schema";

interface MeetingRequestWithCompany extends MeetingRequest {
  company?: Company;
  meetingType?: MeetingType;
}

interface UserInfo {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  isAdmin?: boolean;
}

export default function AdminMeetings() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const urlTab = params.get("tab") || "requested";
  const [activeTab, setActiveTab] = useState(urlTab);

  useEffect(() => {
    setActiveTab(urlTab);
  }, [urlTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setLocation(`/admin/meetings${value !== "requested" ? `?tab=${value}` : ""}`);
  };

  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [selectedRequest, setSelectedRequest] = useState<MeetingRequestWithCompany | null>(null);
  const [teamsLink, setTeamsLink] = useState("");
  const [outlookMeetingLink, setOutlookMeetingLink] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [editMeetingDialogOpen, setEditMeetingDialogOpen] = useState(false);
  const [editMeetingDate, setEditMeetingDate] = useState("");
  const [editMeetingTimeHour, setEditMeetingTimeHour] = useState("");
  const [editMeetingTimeMinute, setEditMeetingTimeMinute] = useState("");
  const [editMeetingTimePeriod, setEditMeetingTimePeriod] = useState("");
  const [editMeetingCredits, setEditMeetingCredits] = useState("");
  const [editMeetingDuration, setEditMeetingDuration] = useState("");

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState<MeetingRequestWithCompany | null>(null);
  const [meetingRejectionReason, setMeetingRejectionReason] = useState("");

  const [companyFilter, setCompanyFilter] = useState<string>("all");

  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingType, setEditingType] = useState<MeetingType | null>(null);
  const [typeSearch, setTypeSearch] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creditCost, setCreditCost] = useState("1");
  const [defaultDuration, setDefaultDuration] = useState("30");

  const [expandedMeetings, setExpandedMeetings] = useState<Set<string>>(new Set());

  const [requestMeetingOpen, setRequestMeetingOpen] = useState(false);
  const [requestMeetingCompanyId, setRequestMeetingCompanyId] = useState("");
  const [requestMeetingTypeId, setRequestMeetingTypeId] = useState("");
  const [requestMeetingTitle, setRequestMeetingTitle] = useState("");
  const [requestMeetingDescription, setRequestMeetingDescription] = useState("");
  const [requestMeetingDate, setRequestMeetingDate] = useState("");
  const [requestMeetingTimeHour, setRequestMeetingTimeHour] = useState("");
  const [requestMeetingTimeMinute, setRequestMeetingTimeMinute] = useState("");
  const [requestMeetingTimePeriod, setRequestMeetingTimePeriod] = useState("");
  const [requestMeetingDuration, setRequestMeetingDuration] = useState("30");
  const [requestMeetingAttendees, setRequestMeetingAttendees] = useState<string[]>([]);

  const { data: meetingRequests, isLoading: requestsLoading } = useQuery<MeetingRequest[]>({
    queryKey: ["/api/meeting-requests"],
  });

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: meetingTypes, isLoading: typesLoading } = useQuery<MeetingType[]>({
    queryKey: ["/api/meeting-types"],
  });

  const { data: adminUsers } = useQuery<UserInfo[]>({
    queryKey: ["/api/admin/users/list"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) return [];
      const data = await res.json();
      const admins = (data.admins || []).map((a: any) => ({
        id: a.userId,
        email: a.email,
        firstName: a.firstName,
        lastName: a.lastName,
        isAdmin: true,
      }));
      const members: UserInfo[] = [];
      for (const company of (data.companies || [])) {
        for (const m of (company.members || [])) {
          if (!members.find(u => u.id === m.userId) && !admins.find((a: UserInfo) => a.id === m.userId)) {
            members.push({
              id: m.userId,
              email: m.email,
              firstName: m.firstName,
              lastName: m.lastName,
              isAdmin: false,
            });
          }
        }
      }
      return [...admins, ...members];
    },
  });

  const getAttendeeInfo = (attendeeIds: string[]): UserInfo[] => {
    if (!adminUsers) return [];
    return attendeeIds.map(id => adminUsers.find(u => u.id === id)).filter(Boolean) as UserInfo[];
  };

  const enrichedRequests: MeetingRequestWithCompany[] = (meetingRequests || []).map(request => ({
    ...request,
    company: companies?.find(c => c.id === request.companyId),
    meetingType: meetingTypes?.find(t => t.id === request.meetingTypeId),
  }));

  const toggleExpanded = useCallback((id: string) => {
    setExpandedRequests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const toggleMeetingExpanded = (id: string) => {
    const newSet = new Set(expandedMeetings);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedMeetings(newSet);
  };

  const computeMeetingTime = (h: string, m: string, p: string) => {
    if (!h || !m || !p) return "";
    let hour24 = parseInt(h);
    if (p === "AM" && hour24 === 12) hour24 = 0;
    if (p === "PM" && hour24 !== 12) hour24 += 12;
    return `${String(hour24).padStart(2, "0")}:${m}`;
  };

  const parseTimeToComponents = (time24: string) => {
    if (!time24) return { hour: "", minute: "", period: "" };
    const [hStr, mStr] = time24.split(":");
    let h = parseInt(hStr);
    const period = h >= 12 ? "PM" : "AM";
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return { hour: String(h).padStart(2, "0"), minute: mStr || "00", period };
  };

  const openEditMeetingDialog = (meeting: MeetingRequestWithCompany) => {
    setSelectedRequest(meeting);
    setEditMeetingDate(meeting.proposedDate);
    const tp = parseTimeToComponents(meeting.proposedTime);
    setEditMeetingTimeHour(tp.hour);
    setEditMeetingTimeMinute(tp.minute);
    setEditMeetingTimePeriod(tp.period);
    setEditMeetingCredits(meeting.creditCost);
    setEditMeetingDuration(String(meeting.duration));
    setTeamsLink(meeting.teamsLink || "");
    setOutlookMeetingLink(meeting.outlookMeetingLink || "");
    setEditMeetingDialogOpen(true);
  };

  const approveMutation = useMutation({
    mutationFn: async ({ id, teamsLink, outlookMeetingLink, adminNotes, proposedDate, proposedTime, creditCost, duration }: { id: string; teamsLink: string; outlookMeetingLink: string; adminNotes: string; proposedDate?: string; proposedTime?: string; creditCost?: string; duration?: number }) => {
      const body: Record<string, any> = { status: "approved", teamsLink, outlookMeetingLink, adminNotes };
      if (proposedDate) body.proposedDate = proposedDate;
      if (proposedTime) body.proposedTime = proposedTime;
      if (creditCost) body.creditCost = creditCost;
      if (duration) body.duration = duration;
      return apiRequest("PATCH", `/api/meeting-requests/${id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-requests"] });
      toast({ title: "Meeting request approved" });
      setApproveDialogOpen(false);
      setSelectedRequest(null);
      setTeamsLink("");
      setOutlookMeetingLink("");
      setAdminNotes("");
      handleTabChange("approved");
    },
    onError: () => {
      toast({ title: "Failed to approve meeting request", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, rejectionReason }: { id: string; rejectionReason?: string }) => {
      return apiRequest("PATCH", `/api/meeting-requests/${id}`, { status: "rejected", rejectionReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-requests"] });
      toast({ title: "Meeting request rejected" });
      setRejectDialogOpen(false);
      setRejectingRequest(null);
      setMeetingRejectionReason("");
    },
    onError: () => {
      toast({ title: "Failed to reject meeting request", variant: "destructive" });
    },
  });

  const updateMeetingMutation = useMutation({
    mutationFn: async ({ id, proposedDate, proposedTime, creditCost, duration, teamsLink, outlookMeetingLink }: { id: string; proposedDate: string; proposedTime: string; creditCost: string; duration: number; teamsLink: string; outlookMeetingLink: string }) => {
      return apiRequest("PATCH", `/api/meeting-requests/${id}`, { proposedDate, proposedTime, creditCost, duration, teamsLink, outlookMeetingLink });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-requests"] });
      toast({ title: "Meeting updated" });
      setEditMeetingDialogOpen(false);
      setSelectedRequest(null);
    },
    onError: () => {
      toast({ title: "Failed to update meeting", variant: "destructive" });
    },
  });

  const saveNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      return apiRequest("PATCH", `/api/meeting-requests/${id}`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-requests"] });
      toast({ title: "Meeting notes saved" });
      setEditingNotesId(null);
      setNotesText("");
    },
    onError: () => {
      toast({ title: "Failed to save notes", variant: "destructive" });
    },
  });

  const startEditingNotes = (request: MeetingRequestWithCompany) => {
    setEditingNotesId(request.id);
    setNotesText(request.notes || "");
  };

  const handleSaveNotes = (id: string) => {
    saveNotesMutation.mutate({ id, notes: notesText });
  };

  const pendingRequests = enrichedRequests.filter(r => r.status === "pending");
  const approvedMeetings = enrichedRequests.filter(r => {
    if (r.status !== "approved") return false;
    if (companyFilter !== "all" && r.companyId !== companyFilter) return false;
    return true;
  });
  const completedMeetings = enrichedRequests.filter(r => {
    if (r.status !== "completed") return false;
    if (companyFilter !== "all" && r.companyId !== companyFilter) return false;
    return true;
  });
  const rejectedMeetings = enrichedRequests.filter(r => {
    if (r.status !== "rejected") return false;
    if (companyFilter !== "all" && r.companyId !== companyFilter) return false;
    return true;
  });

  const filterCompanies = Array.from(new Map(
    enrichedRequests
      .filter(r => r.company)
      .map(r => [r.companyId, r.company!.name] as [string, string])
  )).sort((a, b) => a[1].localeCompare(b[1]));

  const openApproveDialog = (request: MeetingRequestWithCompany) => {
    setSelectedRequest(request);
    setTeamsLink(request.teamsLink || "");
    setOutlookMeetingLink(request.outlookMeetingLink || "");
    setAdminNotes(request.adminNotes || "");
    setEditMeetingDate(request.proposedDate);
    const tp = parseTimeToComponents(request.proposedTime);
    setEditMeetingTimeHour(tp.hour);
    setEditMeetingTimeMinute(tp.minute);
    setEditMeetingTimePeriod(tp.period);
    setEditMeetingCredits(request.creditCost);
    setEditMeetingDuration(String(request.duration));
    setApproveDialogOpen(true);
  };

  const handleApprove = () => {
    if (!selectedRequest) return;
    const proposedTime = computeMeetingTime(editMeetingTimeHour, editMeetingTimeMinute, editMeetingTimePeriod);
    approveMutation.mutate({
      id: selectedRequest.id,
      teamsLink,
      outlookMeetingLink,
      adminNotes,
      proposedDate: editMeetingDate || undefined,
      proposedTime: proposedTime || undefined,
      creditCost: editMeetingCredits || undefined,
      duration: editMeetingDuration ? parseInt(editMeetingDuration) : undefined,
    });
  };

  const handleReject = (request: MeetingRequestWithCompany) => {
    setRejectingRequest(request);
    setMeetingRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = () => {
    if (!rejectingRequest) return;
    rejectMutation.mutate({
      id: rejectingRequest.id,
      rejectionReason: meetingRejectionReason || undefined,
    });
  };

  const generateOutlookLink = (request: MeetingRequest, useDialogValues = false): string => {
    const dateToUse = (useDialogValues && editMeetingDate) ? editMeetingDate : request.proposedDate;
    const computedTime = useDialogValues ? computeMeetingTime(editMeetingTimeHour, editMeetingTimeMinute, editMeetingTimePeriod) : "";
    const timeToUse = computedTime || request.proposedTime;
    const durationToUse = (useDialogValues && editMeetingDuration) ? parseInt(editMeetingDuration) : request.duration;

    const [year, month, day] = dateToUse.split("-").map(Number);
    const [hours, mins] = timeToUse.split(":").map(Number);

    const startDt = new Date(year, month - 1, day, hours, mins);
    const endDt = new Date(startDt.getTime() + durationToUse * 60000);

    const formatLocal = (d: Date) => {
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const da = String(d.getDate()).padStart(2, "0");
      const h = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      return `${y}-${mo}-${da}T${h}:${mi}:00`;
    };

    const body = request.description || "";

    const attendeeEmails: string[] = [];
    if (adminUsers) {
      adminUsers.filter(u => u.isAdmin).forEach(a => {
        if (a.email && !attendeeEmails.includes(a.email)) attendeeEmails.push(a.email);
      });
    }
    if (request.attendeeIds && request.attendeeIds.length > 0) {
      const attendees = getAttendeeInfo(request.attendeeIds);
      attendees.forEach(a => { if (a.email && !attendeeEmails.includes(a.email)) attendeeEmails.push(a.email); });
    }
    if (request.externalAttendeeEmails && request.externalAttendeeEmails.length > 0) {
      request.externalAttendeeEmails.forEach(e => { if (!attendeeEmails.includes(e)) attendeeEmails.push(e); });
    }

    const params = new URLSearchParams({
      subject: request.title,
      body,
      startdt: formatLocal(startDt),
      enddt: formatLocal(endDt),
    });
    if (attendeeEmails.length > 0) {
      params.set("to", attendeeEmails.join(";"));
    }
    return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case "completed":
        return <Badge className="bg-blue-500"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDateTime = (request: MeetingRequest) => {
    const date = new Date(request.proposedDate).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const time = request.proposedTime;
    return `${date} ${time}`;
  };

  const createTypeMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; creditCost: string; defaultDuration: number }) => {
      return apiRequest("POST", "/api/meeting-types", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-types"] });
      setCreateOpen(false);
      resetTypeForm();
      toast({ title: "Meeting type created" });
    },
    onError: () => {
      toast({ title: "Failed to create meeting type", variant: "destructive" });
    },
  });

  const updateTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MeetingType> }) => {
      return apiRequest("PATCH", `/api/meeting-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-types"] });
      setEditOpen(false);
      setEditingType(null);
      resetTypeForm();
      toast({ title: "Meeting type updated" });
    },
    onError: () => {
      toast({ title: "Failed to update meeting type", variant: "destructive" });
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/meeting-types/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-types"] });
      toast({ title: "Meeting type deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete meeting type", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/meeting-types/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-types"] });
    },
  });

  const resetTypeForm = () => {
    setName("");
    setDescription("");
    setCreditCost("1");
    setDefaultDuration("30");
  };

  const resetRequestMeetingForm = () => {
    setRequestMeetingCompanyId("");
    setRequestMeetingTypeId("");
    setRequestMeetingTitle("");
    setRequestMeetingDescription("");
    setRequestMeetingDate("");
    setRequestMeetingTimeHour("");
    setRequestMeetingTimeMinute("");
    setRequestMeetingTimePeriod("");
    setRequestMeetingDuration("30");
    setRequestMeetingAttendees([]);
  };

  const handleRequestMeetingTypeChange = (typeId: string) => {
    setRequestMeetingTypeId(typeId);
    const mt = meetingTypes?.find(t => t.id === typeId);
    if (mt) {
      setRequestMeetingTitle(mt.name);
      setRequestMeetingDuration(String(mt.defaultDuration));
    }
  };

  const requestMeetingMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/companies/${data.companyId}/meeting-requests`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-requests"] });
      toast({ title: "Meeting created successfully" });
      setRequestMeetingOpen(false);
      resetRequestMeetingForm();
    },
    onError: (error: any) => {
      toast({ title: "Failed to create meeting", description: error.message, variant: "destructive" });
    },
  });

  const handleRequestMeetingSubmit = () => {
    if (!requestMeetingCompanyId || !requestMeetingTypeId || !requestMeetingTitle) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    const proposedTime = computeMeetingTime(requestMeetingTimeHour, requestMeetingTimeMinute, requestMeetingTimePeriod);
    requestMeetingMutation.mutate({
      companyId: requestMeetingCompanyId,
      meetingTypeId: requestMeetingTypeId,
      title: requestMeetingTitle,
      description: requestMeetingDescription,
      proposedDate: requestMeetingDate || undefined,
      proposedTime: proposedTime || undefined,
      duration: parseInt(requestMeetingDuration),
      attendeeIds: requestMeetingAttendees,
    });
  };

  const { data: requestMeetingCompanyMembers = [] } = useQuery<{ id: string; email: string; firstName: string; lastName: string; role: string }[]>({
    queryKey: ["/api/admin/companies", requestMeetingCompanyId, "users"],
    queryFn: async () => {
      if (!requestMeetingCompanyId) return [];
      const res = await fetch(`/api/admin/companies/${requestMeetingCompanyId}/users`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((u: any) => ({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, role: u.role }));
    },
    enabled: !!requestMeetingCompanyId,
  });

  const agencyAdminUsers = adminUsers?.filter(u => u.isAdmin) || [];

  const requestMeetingCompanyUsers: UserInfo[] = [
    ...agencyAdminUsers,
    ...requestMeetingCompanyMembers
      .filter(m => !agencyAdminUsers.some(a => a.id === m.id))
      .map(m => ({ id: m.id, email: m.email, firstName: m.firstName, lastName: m.lastName, isAdmin: false })),
  ];

  const openEditTypeDialog = (type: MeetingType) => {
    setEditingType(type);
    setName(type.name);
    setDescription(type.description || "");
    setCreditCost(type.creditCost);
    setDefaultDuration(type.defaultDuration.toString());
    setEditOpen(true);
  };

  const handleCreateType = () => {
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    createTypeMutation.mutate({
      name: name.trim(),
      description: description.trim(),
      creditCost,
      defaultDuration: parseInt(defaultDuration) || 30,
    });
  };

  const handleUpdateType = () => {
    if (!editingType || !name.trim()) return;
    updateTypeMutation.mutate({
      id: editingType.id,
      data: {
        name: name.trim(),
        description: description.trim(),
        creditCost,
        defaultDuration: parseInt(defaultDuration) || 30,
      },
    });
  };

  const pendingCount = enrichedRequests.filter(r => r.status === "pending").length;
  const approvedCount = enrichedRequests.filter(r => r.status === "approved").length;

  const renderCompanyFilter = () => (
    <div className="flex items-center gap-3 flex-wrap">
      <Select value={companyFilter} onValueChange={setCompanyFilter}>
        <SelectTrigger className="w-56" data-testid="select-company-filter">
          <Building2 className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
          <SelectValue placeholder="Filter by company" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Companies</SelectItem>
          {filterCompanies.map(([id, name]) => (
            <SelectItem key={id} value={id}>{name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {companyFilter !== "all" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCompanyFilter("all")}
          data-testid="button-clear-company-filter"
        >
          Clear filter
        </Button>
      )}
    </div>
  );

  const renderNotesSection = (request: MeetingRequestWithCompany) => (
    <div className="pt-3 border-t">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          <FileText className="w-3 h-3" />
          Meeting Notes
        </Label>
        {editingNotesId !== request.id && (
          <Button variant="ghost" size="sm" onClick={() => startEditingNotes(request)} data-testid={`button-edit-notes-${request.id}`}>
            <Pencil className="w-3 h-3 mr-1" />
            {request.notes ? "Edit Notes" : "Add Notes"}
          </Button>
        )}
      </div>
      {editingNotesId === request.id ? (
        <div className="space-y-2">
          <Textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            placeholder="Add meeting notes, action items, key takeaways..."
            className="min-h-[120px]"
            data-testid={`textarea-notes-${request.id}`}
          />
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditingNotesId(null)} data-testid={`button-cancel-notes-${request.id}`}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => handleSaveNotes(request.id)} disabled={saveNotesMutation.isPending} data-testid={`button-save-notes-${request.id}`}>
              {saveNotesMutation.isPending ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Save className="w-3 h-3 mr-1" />
              )}
              Save Notes
            </Button>
          </div>
        </div>
      ) : request.notes ? (
        <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-md p-3">{request.notes}</p>
      ) : (
        <p className="text-sm text-muted-foreground italic">No notes added yet</p>
      )}
    </div>
  );

  const renderMeetingCardHeader = (request: MeetingRequestWithCompany, iconColorClass: string, isExpanded: boolean) => (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`${iconColorClass} p-2 rounded-lg flex-shrink-0`}>
          <Video className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate">{request.title}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <Building2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{request.company?.name}</span>
            <span>·</span>
            <span className="truncate">{request.meetingType?.name}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap justify-end flex-shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <Coins className="w-4 h-4 text-muted-foreground" />
          <span className="font-mono">{request.creditCost || request.meetingType?.creditCost || 0}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>{formatDateTime(request)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{request.duration} min</span>
        </div>
        {getStatusBadge(request.status)}
        {request.notes && (
          <Badge variant="outline">
            <FileText className="w-3 h-3 mr-1" />
            Notes
          </Badge>
        )}
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">Meetings</h1>
            <p className="text-muted-foreground">
              Manage meeting requests, approved meetings, and meeting types
            </p>
          </div>
          <Button onClick={() => setRequestMeetingOpen(true)} data-testid="button-request-meeting">
            <CalendarPlus className="w-4 h-4 mr-2" />
            Request Meeting
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <MobileTabMenu
            tabs={[
              { value: "requested", label: "Requested", count: pendingCount || undefined },
              { value: "approved", label: "Approved", count: approvedCount || undefined },
              { value: "completed", label: "Completed" },
              { value: "rejected", label: "Rejected" },
              { value: "types", label: "Types" },
            ]}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            title="Meetings"
          />
          <TabsList className="hidden md:inline-flex">
            <TabsTrigger value="requested" data-testid="tab-meeting-requested">
              <Clock className="w-4 h-4 mr-2" />
              Requested
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-2">{pendingCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-meeting-approved">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approved
              {approvedCount > 0 && (
                <Badge variant="secondary" className="ml-2">{approvedCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-meeting-completed">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Completed
            </TabsTrigger>
            <TabsTrigger value="rejected" data-testid="tab-meeting-rejected">
              <XCircle className="w-4 h-4 mr-2" />
              Rejected
            </TabsTrigger>
            <TabsTrigger value="types" data-testid="tab-meeting-types">
              <Calendar className="w-4 h-4 mr-2" />
              Types
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requested" className="space-y-4 mt-4">
            {renderCompanyFilter()}
            {requestsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
              </div>
            ) : pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Video className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No pending meeting requests</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map(request => (
                  <Card key={request.id}>
                    <Collapsible open={expandedRequests.has(request.id)} onOpenChange={() => toggleExpanded(request.id)}>
                      <CollapsibleTrigger asChild>
                        <CardContent className="py-4 cursor-pointer hover-elevate">
                          {renderMeetingCardHeader(request, "bg-primary/10 text-primary", expandedRequests.has(request.id))}
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 border-t">
                          <div className="space-y-4 pt-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <Label className="text-xs text-muted-foreground">Duration</Label>
                                <p className="text-sm">{request.duration} minutes</p>
                              </div>
                              {request.description && (
                                <div className="md:col-span-2">
                                  <Label className="text-xs text-muted-foreground">Description</Label>
                                  <p className="text-sm whitespace-pre-wrap">{request.description}</p>
                                </div>
                              )}
                              {request.teamsLink && (
                                <div className="md:col-span-2">
                                  <Label className="text-xs text-muted-foreground">Teams Link</Label>
                                  <a href={request.teamsLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                                    {request.teamsLink}
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-3 pt-3 border-t">
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" asChild>
                                  <a href={generateOutlookLink(request)} target="_blank" rel="noopener noreferrer">
                                    <CalendarPlus className="h-4 w-4 mr-2" />
                                    Step 1: Create in Outlook
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                  </a>
                                </Button>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleReject(request)} data-testid={`button-reject-${request.id}`}>
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                                <Button size="sm" onClick={() => openApproveDialog(request)} data-testid={`button-approve-${request.id}`}>
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Step 2: Approve
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4 mt-4">
            {renderCompanyFilter()}
            <div className="text-sm text-muted-foreground">
              {approvedMeetings.length} meeting{approvedMeetings.length !== 1 ? "s" : ""}
            </div>

            {requestsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
              </div>
            ) : approvedMeetings.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No approved meetings</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Approved meeting requests will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {approvedMeetings.map(meeting => (
                  <Card key={meeting.id}>
                    <Collapsible open={expandedMeetings.has(meeting.id)} onOpenChange={() => toggleMeetingExpanded(meeting.id)}>
                      <CollapsibleTrigger asChild>
                        <CardContent className="py-4 cursor-pointer hover-elevate">
                          {renderMeetingCardHeader(meeting, "bg-green-500/10 text-green-600 dark:text-green-400", expandedMeetings.has(meeting.id))}
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 border-t">
                          <div className="space-y-4 pt-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              {meeting.description && (
                                <div className="md:col-span-2">
                                  <Label className="text-xs text-muted-foreground">Description</Label>
                                  <p className="text-sm whitespace-pre-wrap">{meeting.description}</p>
                                </div>
                              )}
                              {meeting.teamsLink && (
                                <div className="md:col-span-2">
                                  <Label className="text-xs text-muted-foreground">Teams Link</Label>
                                  <a href={meeting.teamsLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                                    {meeting.teamsLink}
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              )}
                              {meeting.adminNotes && (
                                <div className="md:col-span-2">
                                  <Label className="text-xs text-muted-foreground">Admin Notes</Label>
                                  <p className="text-sm whitespace-pre-wrap">{meeting.adminNotes}</p>
                                </div>
                              )}
                            </div>

                            {renderNotesSection(meeting)}

                            <div className="flex items-center justify-between gap-3 pt-3 border-t">
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" asChild>
                                  <a href={generateOutlookLink(meeting)} target="_blank" rel="noopener noreferrer">
                                    <CalendarPlus className="h-4 w-4 mr-2" />
                                    Open in Outlook
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                  </a>
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => openApproveDialog(meeting)}>
                                  Edit Details
                                </Button>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => openEditMeetingDialog(meeting)} data-testid={`button-edit-meeting-${meeting.id}`}>
                                  <Pencil className="w-4 h-4 mr-1" />
                                  Edit
                                </Button>
                                <Button size="sm" onClick={() => {
                                  apiRequest("PATCH", `/api/meeting-requests/${meeting.id}`, { status: "completed" }).then(() => {
                                    queryClient.invalidateQueries({ queryKey: ["/api/meeting-requests"] });
                                    queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
                                    queryClient.invalidateQueries({ queryKey: ["/api/credit-transactions"] });
                                    toast({ title: "Meeting marked as completed" });
                                  }).catch(() => {
                                    toast({ title: "Failed to mark meeting as completed", variant: "destructive" });
                                  });
                                }} data-testid={`button-complete-${meeting.id}`}>
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Mark Completed
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-4">
            {renderCompanyFilter()}
            <div className="text-sm text-muted-foreground">
              {completedMeetings.length} meeting{completedMeetings.length !== 1 ? "s" : ""}
            </div>

            {requestsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
              </div>
            ) : completedMeetings.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No completed meetings</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {completedMeetings.map(meeting => (
                  <Card key={meeting.id}>
                    <Collapsible open={expandedMeetings.has(meeting.id)} onOpenChange={() => toggleMeetingExpanded(meeting.id)}>
                      <CollapsibleTrigger asChild>
                        <CardContent className="py-4 cursor-pointer hover-elevate">
                          {renderMeetingCardHeader(meeting, "bg-blue-500/10 text-blue-600 dark:text-blue-400", expandedMeetings.has(meeting.id))}
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 border-t">
                          <div className="space-y-4 pt-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              {meeting.description && (
                                <div className="md:col-span-2">
                                  <Label className="text-xs text-muted-foreground">Description</Label>
                                  <p className="text-sm whitespace-pre-wrap">{meeting.description}</p>
                                </div>
                              )}
                              {meeting.teamsLink && (
                                <div className="md:col-span-2">
                                  <Label className="text-xs text-muted-foreground">Teams Link</Label>
                                  <a href={meeting.teamsLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                                    {meeting.teamsLink}
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              )}
                              {meeting.adminNotes && (
                                <div className="md:col-span-2">
                                  <Label className="text-xs text-muted-foreground">Admin Notes</Label>
                                  <p className="text-sm whitespace-pre-wrap">{meeting.adminNotes}</p>
                                </div>
                              )}
                            </div>

                            {renderNotesSection(meeting)}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4 mt-4">
            {renderCompanyFilter()}
            <div className="text-sm text-muted-foreground">
              {rejectedMeetings.length} meeting{rejectedMeetings.length !== 1 ? "s" : ""}
            </div>

            {requestsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
              </div>
            ) : rejectedMeetings.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <XCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No rejected meetings</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {rejectedMeetings.map(request => (
                  <Card key={request.id}>
                    <Collapsible open={expandedMeetings.has(request.id)} onOpenChange={() => toggleMeetingExpanded(request.id)}>
                      <CollapsibleTrigger asChild>
                        <CardContent className="py-4 cursor-pointer hover-elevate">
                          {renderMeetingCardHeader(request, "bg-destructive/10 text-destructive", expandedMeetings.has(request.id))}
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 border-t">
                          <div className="space-y-4 pt-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <Label className="text-xs text-muted-foreground">Duration</Label>
                                <p className="text-sm">{request.duration} minutes</p>
                              </div>
                              {request.description && (
                                <div className="md:col-span-2">
                                  <Label className="text-xs text-muted-foreground">Description</Label>
                                  <p className="text-sm whitespace-pre-wrap">{request.description}</p>
                                </div>
                              )}
                            </div>
                            {request.rejectionReason && (
                              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                                <Label className="text-xs text-destructive font-medium">Rejection Reason</Label>
                                <p className="text-sm mt-1">{request.rejectionReason}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="types" className="space-y-4 mt-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search meeting types..."
                  value={typeSearch}
                  onChange={(e) => setTypeSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-meeting-types"
                />
              </div>
              <div className="ml-auto">
                <Button onClick={() => setCreateOpen(true)} data-testid="button-create-meeting-type">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Meeting Type
                </Button>
              </div>
            </div>

            {typesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
              </div>
            ) : !meetingTypes || meetingTypes.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No meeting types yet</p>
                  <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                    Create your first meeting type
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {[...meetingTypes]
                  .filter(type => !typeSearch || type.name.toLowerCase().includes(typeSearch.toLowerCase()) || (type.description || "").toLowerCase().includes(typeSearch.toLowerCase()))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(type => (
                  <Card key={type.id} className={!type.isActive ? "opacity-60" : ""}>
                    <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                      <div className="flex items-start gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <Video className="w-5 h-5 text-primary" />
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
                          data-testid={`switch-meeting-active-${type.id}`}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-muted-foreground" />
                          <span className="font-mono font-medium">{type.creditCost} credits</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{type.defaultDuration} min</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm" onClick={() => openEditTypeDialog(type)} data-testid={`button-edit-meeting-${type.id}`}>
                          <Pencil className="w-4 h-4 mr-1" /> Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" data-testid={`button-delete-meeting-${type.id}`}>
                              <Trash2 className="w-4 h-4 mr-1" /> Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Meeting Type</AlertDialogTitle>
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
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRequest?.status === "pending" ? "Approve Meeting Request" : "Edit Meeting"}</DialogTitle>
            <DialogDescription>
              {selectedRequest?.status === "pending" 
                ? "Review the details, create the Outlook event, then paste the links below."
                : "Update the meeting details."}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium">{selectedRequest.title}</p>
                <p className="text-sm text-muted-foreground">
                  Company: {selectedRequest.company?.name}
                </p>
                {selectedRequest.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedRequest.description}</p>
                )}
              </div>

              {(selectedRequest.attendeeIds?.length > 0 || selectedRequest.externalAttendeeEmails?.length > 0) && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Invitees
                  </Label>
                  <div className="bg-muted/50 p-3 rounded-md space-y-1">
                    {getAttendeeInfo(selectedRequest.attendeeIds || []).map(user => (
                      <div key={user.id} className="flex items-center justify-between text-sm">
                        <span>{user.firstName} {user.lastName}</span>
                        <span className="text-muted-foreground text-xs">{user.email}</span>
                      </div>
                    ))}
                    {(selectedRequest.externalAttendeeEmails || []).map(email => (
                      <div key={email} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">External</span>
                        <span className="text-muted-foreground text-xs">{email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Meeting Date</Label>
                  <Input type="date" value={editMeetingDate} onChange={(e) => setEditMeetingDate(e.target.value)} data-testid="input-approve-meeting-date" />
                </div>
                <div className="space-y-2">
                  <Label>Meeting Time</Label>
                  <div className="flex items-center gap-1">
                    <Select value={editMeetingTimeHour} onValueChange={(h) => { setEditMeetingTimeHour(h); if (!editMeetingTimeMinute) setEditMeetingTimeMinute("00"); if (!editMeetingTimePeriod) setEditMeetingTimePeriod("AM"); }}>
                      <SelectTrigger className="w-[65px]" data-testid="select-approve-meeting-hour"><SelectValue placeholder="HH" /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (<SelectItem key={h} value={String(h).padStart(2, "0")}>{String(h).padStart(2, "0")}</SelectItem>))}</SelectContent>
                    </Select>
                    <span className="text-lg font-medium">:</span>
                    <Select value={editMeetingTimeMinute} onValueChange={(m) => { setEditMeetingTimeMinute(m); if (!editMeetingTimeHour) setEditMeetingTimeHour("12"); if (!editMeetingTimePeriod) setEditMeetingTimePeriod("AM"); }}>
                      <SelectTrigger className="w-[65px]" data-testid="select-approve-meeting-minute"><SelectValue placeholder="MM" /></SelectTrigger>
                      <SelectContent><SelectItem value="00">00</SelectItem><SelectItem value="15">15</SelectItem><SelectItem value="30">30</SelectItem><SelectItem value="45">45</SelectItem></SelectContent>
                    </Select>
                    <Select value={editMeetingTimePeriod} onValueChange={(p) => { setEditMeetingTimePeriod(p); if (!editMeetingTimeHour) setEditMeetingTimeHour("12"); if (!editMeetingTimeMinute) setEditMeetingTimeMinute("00"); }}>
                      <SelectTrigger className="w-[65px]" data-testid="select-approve-meeting-period"><SelectValue placeholder="AM" /></SelectTrigger>
                      <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Credits</Label>
                  <Input type="number" step="0.5" min="0" value={editMeetingCredits} onChange={(e) => setEditMeetingCredits(e.target.value)} data-testid="input-approve-meeting-credits" />
                </div>
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input type="number" min="15" step="15" value={editMeetingDuration} onChange={(e) => setEditMeetingDuration(e.target.value)} data-testid="input-approve-meeting-duration" />
                </div>
              </div>

              {selectedRequest.status === "pending" && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded-md space-y-2">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Step 1: Create the calendar event
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    This will open Outlook with the meeting name, date, time, and invitees pre-filled. Create the event and get the Teams link.
                  </p>
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <a href={generateOutlookLink(selectedRequest, true)} target="_blank" rel="noopener noreferrer">
                      <CalendarPlus className="h-4 w-4 mr-2" />
                      Open Outlook Calendar
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </a>
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="teamsLink">
                  {selectedRequest.status === "pending" ? "Step 2: Paste Teams Meeting Link" : "Microsoft Teams Link"}
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
                <Label htmlFor="outlookMeetingLink">
                  {selectedRequest.status === "pending" ? "Step 3: Paste Outlook Meeting Link (Optional)" : "Outlook Meeting Link"}
                </Label>
                <Input
                  id="outlookMeetingLink"
                  value={outlookMeetingLink}
                  onChange={(e) => setOutlookMeetingLink(e.target.value)}
                  placeholder="Paste the Outlook calendar event link for invitees..."
                  data-testid="input-outlook-meeting-link"
                />
                <p className="text-xs text-muted-foreground">
                  Clients will use this link to add the meeting to their calendar.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminNotes">
                  {selectedRequest.status === "pending" ? "Step 4: Admin Notes (Optional)" : "Admin Notes (Optional)"}
                </Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Any internal notes..."
                  data-testid="input-admin-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
            {selectedRequest?.status === "pending" ? (
              <Button 
                onClick={handleApprove} 
                disabled={approveMutation.isPending}
                data-testid="button-confirm-approve"
              >
                {approveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Approve
              </Button>
            ) : (
              <Button 
                onClick={() => {
                  if (!selectedRequest) return;
                  const proposedTime = computeMeetingTime(editMeetingTimeHour, editMeetingTimeMinute, editMeetingTimePeriod);
                  updateMeetingMutation.mutate({
                    id: selectedRequest.id,
                    proposedDate: editMeetingDate,
                    proposedTime,
                    creditCost: editMeetingCredits,
                    duration: parseInt(editMeetingDuration) || 30,
                    teamsLink,
                    outlookMeetingLink,
                  });
                }} 
                disabled={updateMeetingMutation.isPending}
                data-testid="button-save-meeting"
              >
                {updateMeetingMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reject Meeting Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this meeting request.
            </DialogDescription>
          </DialogHeader>
          {rejectingRequest && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium">{rejectingRequest.title}</p>
                <p className="text-sm text-muted-foreground">
                  Company: {rejectingRequest.company?.name}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Rejection Reason (Optional)</Label>
                <Textarea
                  id="rejectionReason"
                  value={meetingRejectionReason}
                  onChange={(e) => setMeetingRejectionReason(e.target.value)}
                  placeholder="Explain why this meeting request is being rejected..."
                  className="min-h-[100px]"
                  data-testid="textarea-rejection-reason"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectingRequest(null); setMeetingRejectionReason(""); }} data-testid="button-cancel-reject">
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Meeting Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Strategy Call" data-testid="input-meeting-type-name" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this meeting type..." data-testid="input-meeting-type-description" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Credit Cost</Label>
                <Input type="number" min="0" step="0.25" value={creditCost} onChange={(e) => setCreditCost(e.target.value)} data-testid="input-meeting-type-credits" />
              </div>
              <div className="space-y-2">
                <Label>Default Duration</Label>
                <Select value={defaultDuration} onValueChange={setDefaultDuration}>
                  <SelectTrigger data-testid="select-meeting-type-duration">
                    <SelectValue placeholder="Select duration..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetTypeForm(); }}>Cancel</Button>
            <Button onClick={handleCreateType} disabled={createTypeMutation.isPending} data-testid="button-submit-create-meeting">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Meeting Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Strategy Call" data-testid="input-edit-meeting-name" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this meeting type..." data-testid="input-edit-meeting-description" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Credit Cost</Label>
                <Input type="number" min="0" step="0.25" value={creditCost} onChange={(e) => setCreditCost(e.target.value)} data-testid="input-edit-meeting-credits" />
              </div>
              <div className="space-y-2">
                <Label>Default Duration</Label>
                <Select value={defaultDuration} onValueChange={setDefaultDuration}>
                  <SelectTrigger data-testid="select-edit-meeting-type-duration">
                    <SelectValue placeholder="Select duration..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditingType(null); resetTypeForm(); }}>Cancel</Button>
            <Button onClick={handleUpdateType} disabled={updateTypeMutation.isPending} data-testid="button-submit-edit-meeting">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editMeetingDialogOpen} onOpenChange={setEditMeetingDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Meeting</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium">{selectedRequest.title}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Meeting Date</Label>
                  <Input type="date" value={editMeetingDate} onChange={(e) => setEditMeetingDate(e.target.value)} data-testid="input-edit-meeting-date" />
                </div>
                <div className="space-y-2">
                  <Label>Meeting Time</Label>
                  <div className="flex items-center gap-1">
                    <Select value={editMeetingTimeHour} onValueChange={(h) => { setEditMeetingTimeHour(h); if (!editMeetingTimeMinute) setEditMeetingTimeMinute("00"); if (!editMeetingTimePeriod) setEditMeetingTimePeriod("AM"); }}>
                      <SelectTrigger className="w-[65px]" data-testid="select-edit-meeting-hour"><SelectValue placeholder="HH" /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (<SelectItem key={h} value={String(h).padStart(2, "0")}>{String(h).padStart(2, "0")}</SelectItem>))}</SelectContent>
                    </Select>
                    <span className="text-lg font-medium">:</span>
                    <Select value={editMeetingTimeMinute} onValueChange={(m) => { setEditMeetingTimeMinute(m); if (!editMeetingTimeHour) setEditMeetingTimeHour("12"); if (!editMeetingTimePeriod) setEditMeetingTimePeriod("AM"); }}>
                      <SelectTrigger className="w-[65px]" data-testid="select-edit-meeting-minute"><SelectValue placeholder="MM" /></SelectTrigger>
                      <SelectContent><SelectItem value="00">00</SelectItem><SelectItem value="15">15</SelectItem><SelectItem value="30">30</SelectItem><SelectItem value="45">45</SelectItem></SelectContent>
                    </Select>
                    <Select value={editMeetingTimePeriod} onValueChange={(p) => { setEditMeetingTimePeriod(p); if (!editMeetingTimeHour) setEditMeetingTimeHour("12"); if (!editMeetingTimeMinute) setEditMeetingTimeMinute("00"); }}>
                      <SelectTrigger className="w-[65px]" data-testid="select-edit-meeting-period"><SelectValue placeholder="AM" /></SelectTrigger>
                      <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Credits</Label>
                  <Input type="number" step="0.5" min="0" value={editMeetingCredits} onChange={(e) => setEditMeetingCredits(e.target.value)} data-testid="input-edit-meeting-credits" />
                </div>
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input type="number" min="15" step="15" value={editMeetingDuration} onChange={(e) => setEditMeetingDuration(e.target.value)} data-testid="input-edit-meeting-duration" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Teams Meeting Link</Label>
                <Input value={teamsLink} onChange={(e) => setTeamsLink(e.target.value)} placeholder="Teams meeting link..." data-testid="input-edit-meeting-teams-link" />
              </div>
              <div className="space-y-2">
                <Label>Outlook Meeting Link</Label>
                <Input value={outlookMeetingLink} onChange={(e) => setOutlookMeetingLink(e.target.value)} placeholder="Outlook calendar invite link for clients..." data-testid="input-edit-meeting-outlook-link" />
              </div>
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditMeetingDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!selectedRequest) return;
                const proposedTime = computeMeetingTime(editMeetingTimeHour, editMeetingTimeMinute, editMeetingTimePeriod);
                updateMeetingMutation.mutate({
                  id: selectedRequest.id,
                  proposedDate: editMeetingDate,
                  proposedTime,
                  creditCost: editMeetingCredits,
                  duration: parseInt(editMeetingDuration) || 30,
                  teamsLink,
                  outlookMeetingLink,
                });
              }}
              disabled={updateMeetingMutation.isPending}
              data-testid="button-save-edit-meeting"
            >
              {updateMeetingMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={requestMeetingOpen} onOpenChange={setRequestMeetingOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Meeting</DialogTitle>
            <DialogDescription>
              Create a new meeting request on behalf of a company.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Company *</Label>
              <Select value={requestMeetingCompanyId} onValueChange={(val) => { setRequestMeetingCompanyId(val); setRequestMeetingAttendees([]); }}>
                <SelectTrigger data-testid="select-request-meeting-company">
                  <SelectValue placeholder="Select a company..." />
                </SelectTrigger>
                <SelectContent>
                  {(companies || []).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Meeting Type *</Label>
              <Select value={requestMeetingTypeId} onValueChange={handleRequestMeetingTypeChange}>
                <SelectTrigger data-testid="select-request-meeting-type">
                  <SelectValue placeholder="Select meeting type..." />
                </SelectTrigger>
                <SelectContent>
                  {(meetingTypes || []).filter(t => t.isActive).map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.creditCost} credits)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={requestMeetingTitle}
                onChange={(e) => setRequestMeetingTitle(e.target.value)}
                placeholder="Meeting title..."
                data-testid="input-request-meeting-title"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={requestMeetingDescription}
                onChange={(e) => setRequestMeetingDescription(e.target.value)}
                placeholder="Meeting description..."
                data-testid="textarea-request-meeting-description"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Date</Label>
                <DatePicker
                  value={requestMeetingDate}
                  onChange={setRequestMeetingDate}
                  placeholder="Select date..."
                  data-testid="input-request-meeting-date"
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <div className="flex items-center gap-1">
                  <Select value={requestMeetingTimeHour} onValueChange={(h) => { setRequestMeetingTimeHour(h); if (!requestMeetingTimeMinute) setRequestMeetingTimeMinute("00"); if (!requestMeetingTimePeriod) setRequestMeetingTimePeriod("AM"); }}>
                    <SelectTrigger className="w-[65px]" data-testid="select-request-meeting-hour"><SelectValue placeholder="HH" /></SelectTrigger>
                    <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (<SelectItem key={h} value={String(h).padStart(2, "0")}>{String(h).padStart(2, "0")}</SelectItem>))}</SelectContent>
                  </Select>
                  <span className="text-lg font-medium">:</span>
                  <Select value={requestMeetingTimeMinute} onValueChange={(m) => { setRequestMeetingTimeMinute(m); if (!requestMeetingTimeHour) setRequestMeetingTimeHour("12"); if (!requestMeetingTimePeriod) setRequestMeetingTimePeriod("AM"); }}>
                    <SelectTrigger className="w-[65px]" data-testid="select-request-meeting-minute"><SelectValue placeholder="MM" /></SelectTrigger>
                    <SelectContent><SelectItem value="00">00</SelectItem><SelectItem value="15">15</SelectItem><SelectItem value="30">30</SelectItem><SelectItem value="45">45</SelectItem></SelectContent>
                  </Select>
                  <Select value={requestMeetingTimePeriod} onValueChange={(p) => { setRequestMeetingTimePeriod(p); if (!requestMeetingTimeHour) setRequestMeetingTimeHour("12"); if (!requestMeetingTimeMinute) setRequestMeetingTimeMinute("00"); }}>
                    <SelectTrigger className="w-[65px]" data-testid="select-request-meeting-period"><SelectValue placeholder="AM" /></SelectTrigger>
                    <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={requestMeetingDuration} onValueChange={setRequestMeetingDuration}>
                <SelectTrigger data-testid="select-request-meeting-duration">
                  <SelectValue placeholder="Select duration..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {requestMeetingCompanyId && requestMeetingCompanyUsers.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Attendees
                </Label>
                <div className="border rounded-md p-3 max-h-[300px] overflow-y-auto">
                  <div className="space-y-2">
                    {agencyAdminUsers.length > 0 && (
                      <>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Agency</p>
                        {agencyAdminUsers.map(user => (
                          <div key={user.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`attendee-${user.id}`}
                              checked={requestMeetingAttendees.includes(user.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setRequestMeetingAttendees(prev => [...prev, user.id]);
                                } else {
                                  setRequestMeetingAttendees(prev => prev.filter(id => id !== user.id));
                                }
                              }}
                              data-testid={`checkbox-attendee-${user.id}`}
                            />
                            <label htmlFor={`attendee-${user.id}`} className="text-sm cursor-pointer flex-1">
                              {user.firstName} {user.lastName}
                              <span className="text-muted-foreground ml-1 text-xs">({user.email})</span>
                              <Badge variant="secondary" className="ml-1">Agency</Badge>
                            </label>
                          </div>
                        ))}
                      </>
                    )}
                    {requestMeetingCompanyMembers.filter(m => !agencyAdminUsers.some(a => a.id === m.id)).length > 0 && (
                      <>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2">Client</p>
                        {requestMeetingCompanyMembers
                          .filter(m => !agencyAdminUsers.some(a => a.id === m.id))
                          .map(user => (
                          <div key={user.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`attendee-${user.id}`}
                              checked={requestMeetingAttendees.includes(user.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setRequestMeetingAttendees(prev => [...prev, user.id]);
                                } else {
                                  setRequestMeetingAttendees(prev => prev.filter(id => id !== user.id));
                                }
                              }}
                              data-testid={`checkbox-attendee-${user.id}`}
                            />
                            <label htmlFor={`attendee-${user.id}`} className="text-sm cursor-pointer flex-1">
                              {user.firstName} {user.lastName}
                              <span className="text-muted-foreground ml-1 text-xs">({user.email})</span>
                            </label>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRequestMeetingOpen(false); resetRequestMeetingForm(); }} data-testid="button-cancel-request-meeting">
              Cancel
            </Button>
            <Button
              onClick={handleRequestMeetingSubmit}
              disabled={requestMeetingMutation.isPending}
              data-testid="button-submit-request-meeting"
            >
              {requestMeetingMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
