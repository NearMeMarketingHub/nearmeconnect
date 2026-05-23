import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { parseLocalDate } from "@/lib/utils";
import {
  FileText, Package, CircleDot, CalendarDays, FolderOpen, ShieldCheck, StickyNote, BarChart3,
  Save, Loader2, Plus, Minus, X, RotateCcw, Search, Pencil, Wand2,
  Video, Target, MessageSquare, Link2, DollarSign, Zap, Coins, Building2, Calendar,
  CheckCircle2, XCircle, Clock, AlertCircle, ClipboardList, Trash2, Globe,
  Users, Eye, EyeOff, ExternalLink, Check,
} from "lucide-react";
import type { CampaignRequest, CampaignType, DeliverableType, Task, MeetingType, ContentCalendarItem } from "@shared/schema";

interface CompanyMemberEnriched {
  id: string;
  companyId: string;
  userId: string;
  role: string;
  customRoleId: string | null;
  createdAt: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface CampaignDetailPanelProps {
  campaign: CampaignRequest | null;
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  companyId?: string;
  onTaskClick?: (task: Task) => void;
}

interface ApprovalStep {
  status: "pending" | "approved" | "revision" | "done";
  dueDate: string;
  note: string;
  completedAt: string;
}

interface ApprovalFlowData {
  internalReview: ApprovalStep;
  clientApproval: ApprovalStep;
  revision: ApprovalStep;
  finalApproval: { completedAt: string };
}

interface AssetLink {
  id: string;
  type: "sharepoint" | "source" | "brand_kit" | "creative" | "reference" | "link";
  label: string;
  url: string;
}

interface PublishedUrl {
  deliverableName: string;
  url: string;
}

const DEFAULT_APPROVAL_FLOW: ApprovalFlowData = {
  internalReview: { status: "pending", dueDate: "", note: "", completedAt: "" },
  clientApproval: { status: "pending", dueDate: "", note: "", completedAt: "" },
  revision: { status: "pending", dueDate: "", note: "", completedAt: "" },
  finalApproval: { completedAt: "" },
};

const ASSET_TYPE_OPTIONS: { value: AssetLink["type"]; label: string }[] = [
  { value: "sharepoint", label: "SharePoint" },
  { value: "source", label: "Source Files" },
  { value: "brand_kit", label: "Brand Kit" },
  { value: "creative", label: "Creative Assets" },
  { value: "reference", label: "Reference" },
  { value: "link", label: "Link" },
];

const CONTENT_PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn",
  twitter: "Twitter/X", tiktok: "TikTok", youtube: "YouTube",
  website: "Website", email: "Email", google_business: "Google Business", other: "Other",
};

function statusColor(status: string) {
  switch (status) {
    case "approved": case "in_progress": return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
    case "completed": return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300";
    case "rejected": return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
    case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300";
    default: return "bg-muted text-muted-foreground";
  }
}

function TaskStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
    in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    completed: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
    review: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  };
  const labels: Record<string, string> = { pending: "Pending", in_progress: "In Progress", completed: "Done", review: "Review", rejected: "Rejected" };
  return <Badge className={`${map[status] || "bg-muted text-muted-foreground"} text-xs border-0`}>{labels[status] || status}</Badge>;
}

function FieldRow({ label, value, icon: Icon, multiline }: { label: string; value: string | null | undefined; icon?: React.ComponentType<{ className?: string }>; multiline?: boolean }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </Label>
      <p className={`text-sm ${multiline ? "whitespace-pre-wrap" : ""}`}>{value}</p>
    </div>
  );
}

export function CampaignDetailPanel({ campaign, open, onClose, isAdmin, companyId, onTaskClick }: CampaignDetailPanelProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("brief");

  // ─── Brief state ──────────────────────────────────────────────────────────
  const [briefDraft, setBriefDraft] = useState({
    name: "", purpose: "", offer: "", objective: "", targetAudience: "", targetServices: "",
    keyMessages: "", preferredTone: "", referenceLinks: "", budgetNotes: "", additionalDetails: "",
    notes: "", ownerName: "", launchDate: "", clientVisible: false, dueDate: "", status: "pending", adminNotes: "",
  });
  const [briefEditing, setBriefEditing] = useState(false);

  // ─── Notes state ──────────────────────────────────────────────────────────
  const [notesDraft, setNotesDraft] = useState("");

  // ─── Assets state ─────────────────────────────────────────────────────────
  const [sharepointFolderUrl, setSharepointFolderUrl] = useState("");
  const [assetLinks, setAssetLinks] = useState<AssetLink[]>([]);
  const [newAsset, setNewAsset] = useState<{ type: AssetLink["type"]; label: string; url: string }>({ type: "link", label: "", url: "" });
  const [addingAsset, setAddingAsset] = useState(false);

  // ─── Approvals state ──────────────────────────────────────────────────────
  const [approvalFlow, setApprovalFlow] = useState<ApprovalFlowData>(DEFAULT_APPROVAL_FLOW);

  // ─── Reporting state ──────────────────────────────────────────────────────
  const [publishedUrls, setPublishedUrls] = useState<PublishedUrl[]>([]);
  const [reportingIncluded, setReportingIncluded] = useState(false);
  const [newPubUrl, setNewPubUrl] = useState({ deliverableName: "", url: "" });
  const [addingPubUrl, setAddingPubUrl] = useState(false);

  // ─── Deliverables edit state ───────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [editDeliverableIds, setEditDeliverableIds] = useState<string[]>([]);
  const [editDelQuantities, setEditDelQuantities] = useState<Record<string, number>>({});
  const [editMtgQuantities, setEditMtgQuantities] = useState<Record<string, number>>({});
  const [editMtgSearch, setEditMtgSearch] = useState("");
  const [editMtgSearchOpen, setEditMtgSearchOpen] = useState(false);
  const [editSearch, setEditSearch] = useState("");
  const [editSearchOpen, setEditSearchOpen] = useState(false);

  // Sync state when campaign changes
  useEffect(() => {
    if (!campaign) return;
    setBriefDraft({
      name: campaign.name || "",
      purpose: campaign.purpose || "",
      offer: campaign.offer || "",
      objective: campaign.objective || "",
      targetAudience: campaign.targetAudience || "",
      targetServices: campaign.targetServices || "",
      keyMessages: campaign.keyMessages || "",
      preferredTone: campaign.preferredTone || "",
      referenceLinks: campaign.referenceLinks || "",
      budgetNotes: campaign.budgetNotes || "",
      additionalDetails: campaign.additionalDetails || "",
      notes: campaign.notes || "",
      ownerName: campaign.ownerName || "",
      launchDate: campaign.launchDate || "",
      clientVisible: campaign.clientVisible ?? false,
      dueDate: campaign.dueDate || "",
      status: campaign.status || "pending",
      adminNotes: campaign.adminNotes || "",
    });
    setBriefEditing(false);
    setNotesDraft(campaign.campaignNotes || "");
    setSharepointFolderUrl(campaign.sharepointFolderUrl || "");
    try { setAssetLinks(campaign.assetLinks ? JSON.parse(campaign.assetLinks) : []); } catch { setAssetLinks([]); }
    try { setApprovalFlow(campaign.approvalFlow ? JSON.parse(campaign.approvalFlow) : DEFAULT_APPROVAL_FLOW); } catch { setApprovalFlow(DEFAULT_APPROVAL_FLOW); }
    try { setPublishedUrls(campaign.publishedUrls ? JSON.parse(campaign.publishedUrls) : []); } catch { setPublishedUrls([]); }
    setReportingIncluded(campaign.reportingIncluded ?? false);
    setEditing(false);
  }, [campaign?.id]);

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: campaignTypes } = useQuery<CampaignType[]>({ queryKey: ["/api/campaign-types"] });
  const { data: deliverableTypes } = useQuery<DeliverableType[]>({ queryKey: ["/api/deliverable-types"] });
  const { data: allMeetingTypes } = useQuery<MeetingType[]>({ queryKey: ["/api/meeting-types"] });
  const { data: companyMembers } = useQuery<CompanyMemberEnriched[]>({
    queryKey: ["/api/companies", companyId, "members"],
    enabled: !!companyId,
  });
  const { data: campaignTasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/campaign", campaign?.id],
    queryFn: () => apiRequest("GET", `/api/tasks/campaign/${campaign!.id}`).then(r => r.json()),
    enabled: !!campaign?.id,
  });
  const { data: contentItems = [], isLoading: contentLoading } = useQuery<ContentCalendarItem[]>({
    queryKey: ["/api/content-calendar", "campaign", campaign?.id],
    queryFn: () => apiRequest("GET", `/api/content-calendar?campaignRequestId=${campaign!.id}`).then(r => r.json()),
    enabled: !!campaign?.id,
  });

  // ─── Mutations ────────────────────────────────────────────────────────────
  const invalidateCampaigns = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/campaign-requests"] });
    if (companyId) queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "campaign-requests"] });
  };

  const patchMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("PATCH", `/api/campaign-requests/${campaign?.id}`, data).then(r => r.json()),
    onSuccess: () => { invalidateCampaigns(); toast({ title: "Saved" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const saveBriefMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/campaign-requests/${campaign?.id}`, {
      name: briefDraft.name || null,
      purpose: briefDraft.purpose || null,
      offer: briefDraft.offer || null,
      objective: briefDraft.objective || null,
      targetAudience: briefDraft.targetAudience || null,
      targetServices: briefDraft.targetServices || null,
      keyMessages: briefDraft.keyMessages || null,
      preferredTone: briefDraft.preferredTone || null,
      referenceLinks: briefDraft.referenceLinks || null,
      budgetNotes: briefDraft.budgetNotes || null,
      additionalDetails: briefDraft.additionalDetails || null,
      notes: briefDraft.notes || null,
      ownerName: briefDraft.ownerName || null,
      launchDate: briefDraft.launchDate || null,
      clientVisible: briefDraft.clientVisible,
      dueDate: briefDraft.dueDate,
      status: briefDraft.status,
      adminNotes: briefDraft.adminNotes || null,
    }).then(r => r.json()),
    onSuccess: () => { invalidateCampaigns(); setBriefEditing(false); toast({ title: "Brief saved" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const saveNotesMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/campaign-requests/${campaign?.id}`, { campaignNotes: notesDraft || null }).then(r => r.json()),
    onSuccess: () => { invalidateCampaigns(); toast({ title: "Notes saved" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const saveAssetsMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/campaign-requests/${campaign?.id}`, {
      sharepointFolderUrl: sharepointFolderUrl || null,
      assetLinks: JSON.stringify(assetLinks),
    }).then(r => r.json()),
    onSuccess: () => { invalidateCampaigns(); toast({ title: "Assets saved" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const saveApprovalMutation = useMutation({
    mutationFn: (flow: ApprovalFlowData) =>
      apiRequest("PATCH", `/api/campaign-requests/${campaign?.id}`, { approvalFlow: JSON.stringify(flow) }).then(r => r.json()),
    onSuccess: () => { invalidateCampaigns(); toast({ title: "Approval saved" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const saveReportingMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/campaign-requests/${campaign?.id}`, {
      reportingIncluded,
      publishedUrls: JSON.stringify(publishedUrls),
    }).then(r => r.json()),
    onSuccess: () => { invalidateCampaigns(); toast({ title: "Reporting saved" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const saveScopeMutation = useMutation({
    mutationFn: () => {
      const rushMult = isRushEffective ? 2 : 1;
      const totalCreds = editDeliverableIds.reduce((s, id) => {
        const d = deliverableTypes?.find(dt => dt.id === id || dt.key === id);
        return s + (parseFloat(d?.credits || "0") * (editDelQuantities[id] || 1) * rushMult);
      }, 0) + Object.entries(editMtgQuantities).filter(([, q]) => q > 0).reduce((s, [mtId, qty]) => {
        const mt = allMeetingTypes?.find(t => t.id === mtId);
        return s + (parseFloat(mt?.creditCost || "0") * qty * rushMult);
      }, 0);
      return apiRequest("PATCH", `/api/campaign-requests/${campaign?.id}`, {
        requestDeliverableIds: editDeliverableIds,
        requestDeliverableQuantities: JSON.stringify(editDelQuantities),
        requestMeetingQuantities: JSON.stringify(editMtgQuantities),
        estimatedCredits: String(totalCreds),
      }).then(r => r.json());
    },
    onSuccess: () => { invalidateCampaigns(); setEditing(false); toast({ title: "Scope saved" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const toggleRushMutation = useMutation({
    mutationFn: (disabled: boolean) =>
      apiRequest("PATCH", `/api/campaign-requests/${campaign!.id}`, { rushDisabled: disabled }).then(r => r.json()),
    onSuccess: () => invalidateCampaigns(),
  });

  const generateTasksMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/campaign-requests/${campaign?.id}/generate-tasks`, {}).then(r => r.json()),
    onSuccess: (data: { created: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/campaign", campaign?.id] });
      invalidateCampaigns();
      toast({ title: `Generated ${data.created} task${data.created !== 1 ? "s" : ""}` });
    },
    onError: () => toast({ title: "Failed to generate tasks", variant: "destructive" }),
  });

  const generateContentMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/campaign-requests/${campaign?.id}/generate-content`, {}).then(r => r.json()),
    onSuccess: (data: { created: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-calendar", "campaign", campaign?.id] });
      toast({ title: `Generated ${data.created} content item${data.created !== 1 ? "s" : ""}` });
    },
    onError: () => toast({ title: "Failed to generate content", variant: "destructive" }),
  });

  if (!campaign) return null;

  // ─── Derived values ────────────────────────────────────────────────────────
  const campaignType = campaignTypes?.find(t => t.id === campaign.campaignTypeId);
  const isRushEffective = campaign.isRush && !campaign.rushDisabled;
  const rushDisabledLocal = campaign.rushDisabled ?? false;

  let quantities: Record<string, number> = {};
  if (campaign.requestDeliverableQuantities) { try { quantities = JSON.parse(campaign.requestDeliverableQuantities); } catch {} }
  else if (campaign.deliverableQuantities) { try { quantities = JSON.parse(campaign.deliverableQuantities); } catch {} }
  else if (campaignType?.deliverableQuantities) { try { quantities = JSON.parse(campaignType.deliverableQuantities); } catch {} }

  const effectiveDeliverableIds: string[] = campaign.requestDeliverableIds || campaignType?.includedDeliverableIds || [];
  const effectiveDelQuantities: Record<string, number> = {};
  for (const id of effectiveDeliverableIds) effectiveDelQuantities[id] = quantities[id] || 1;

  const meetingTypeQuantitiesMap: Record<string, number> = {};
  if (campaign.requestMeetingQuantities) { try { Object.assign(meetingTypeQuantitiesMap, JSON.parse(campaign.requestMeetingQuantities)); } catch {} }

  const effectiveMeetingQuantities: Record<string, number> = {};
  if (campaign.requestMeetingQuantities) { try { Object.assign(effectiveMeetingQuantities, JSON.parse(campaign.requestMeetingQuantities)); } catch {} }
  else if (campaignType?.meetingTypeQuantities) { try { Object.assign(effectiveMeetingQuantities, JSON.parse(campaignType.meetingTypeQuantities)); } catch {} }
  const hasEffectiveMeetings = Object.values(effectiveMeetingQuantities).some(q => q > 0);

  const getDeliverableName = (id: string) => deliverableTypes?.find(d => d.id === id || d.key === id)?.name || id;

  const completedTasks = campaignTasks.filter(t => t.status === "completed").length;
  const totalTasks = campaignTasks.length;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const totalCreditsUsed = campaignTasks.filter(t => t.creditsDeducted).reduce((s, t) => s + parseFloat(t.creditCost || "0"), 0);

  const startEditing = () => {
    setEditDeliverableIds([...effectiveDeliverableIds]);
    setEditDelQuantities({ ...quantities });
    setEditMtgQuantities({ ...meetingTypeQuantitiesMap });
    setEditing(true);
  };

  const calculateEditTotal = () => {
    const rushMult = isRushEffective ? 2 : 1;
    return editDeliverableIds.reduce((s, id) => {
      const d = deliverableTypes?.find(dt => dt.id === id || dt.key === id);
      return s + parseFloat(d?.credits || "0") * (editDelQuantities[id] || 1) * rushMult;
    }, 0) + Object.entries(editMtgQuantities).filter(([, q]) => q > 0).reduce((s, [mtId, qty]) => {
      const mt = allMeetingTypes?.find(t => t.id === mtId);
      return s + parseFloat(mt?.creditCost || "0") * qty * rushMult;
    }, 0);
  };

  const saveApprovalStep = (updated: ApprovalFlowData) => {
    setApprovalFlow(updated);
    saveApprovalMutation.mutate(updated);
  };

  const addAssetLink = () => {
    if (!newAsset.url) return;
    const link: AssetLink = { id: crypto.randomUUID(), type: newAsset.type, label: newAsset.label || newAsset.url, url: newAsset.url };
    const updated = [...assetLinks, link];
    setAssetLinks(updated);
    setNewAsset({ type: "link", label: "", url: "" });
    setAddingAsset(false);
    saveAssetsMutation.mutate();
  };

  const removeAssetLink = (id: string) => {
    const updated = assetLinks.filter(a => a.id !== id);
    setAssetLinks(updated);
    // persist immediately
    apiRequest("PATCH", `/api/campaign-requests/${campaign.id}`, {
      sharepointFolderUrl: sharepointFolderUrl || null,
      assetLinks: JSON.stringify(updated),
    }).then(() => invalidateCampaigns()).catch(() => {});
  };

  const addPublishedUrl = () => {
    if (!newPubUrl.url) return;
    const updated = [...publishedUrls, { ...newPubUrl }];
    setPublishedUrls(updated);
    setNewPubUrl({ deliverableName: "", url: "" });
    setAddingPubUrl(false);
  };

  const removePublishedUrl = (idx: number) => {
    setPublishedUrls(prev => prev.filter((_, i) => i !== idx));
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <Sheet open={open} onOpenChange={o => { if (!o) { setEditing(false); setBriefEditing(false); onClose(); } }}>
      <SheetContent side="right" className="sm:max-w-[900px] p-0 flex flex-col gap-0">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b">
          <SheetHeader className="mb-3 space-y-1">
            <div className="flex items-start gap-2">
              <SheetTitle className="text-base font-semibold leading-tight flex-1">
                {campaign.name || campaignType?.name || "Campaign"}
              </SheetTitle>
              <Badge className={`${statusColor(campaign.status)} text-xs border-0 shrink-0`}>
                {campaign.status === "in_progress" ? "In Progress" : campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
              </Badge>
              {campaign.isRush && !campaign.rushDisabled && (
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-0 shrink-0">
                  <Zap className="w-3 h-3 mr-0.5" />Rush
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {campaignType && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{campaignType.name}</span>}
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Due {parseLocalDate(campaign.dueDate).toLocaleDateString()}</span>
              <span className="flex items-center gap-1"><Coins className="w-3 h-3" />{campaign.estimatedCredits} cr estimated</span>
              {campaign.ownerName && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{campaign.ownerName}</span>}
            </div>
          </SheetHeader>

          {totalTasks > 0 && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{completedTasks}/{totalTasks} tasks complete</span>
                <span>{progressPct}%</span>
              </div>
              <Progress value={progressPct} className="h-1.5" data-testid="campaign-progress-bar" />
            </div>
          )}

          {isAdmin && (
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => generateTasksMutation.mutate()} disabled={generateTasksMutation.isPending} data-testid="button-generate-tasks">
                {generateTasksMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Wand2 className="w-3 h-3 mr-1" />}Generate Tasks
              </Button>
              <Button size="sm" variant="outline" onClick={() => generateContentMutation.mutate()} disabled={generateContentMutation.isPending} data-testid="button-generate-content">
                {generateContentMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ClipboardList className="w-3 h-3 mr-1" />}Generate Content
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setActiveTab("assets"); setAddingAsset(true); }} data-testid="button-add-resource">
                <Plus className="w-3 h-3 mr-1" />Add Resource
              </Button>
              <Button size="sm" variant="outline" onClick={() => setActiveTab("approvals")} data-testid="button-goto-approvals">
                <ShieldCheck className="w-3 h-3 mr-1" />Approvals
              </Button>
            </div>
          )}
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="flex-shrink-0 border-b overflow-x-auto scrollbar-none">
            <TabsList className="h-9 bg-transparent p-0 rounded-none flex w-max min-w-full px-2 gap-0">
              {([
                { value: "brief", label: "Brief", icon: FileText },
                { value: "deliverables", label: "Deliverables", icon: Package },
                { value: "tasks", label: "Tasks", icon: CircleDot },
                { value: "content", label: "Content", icon: CalendarDays },
                { value: "assets", label: "Assets", icon: FolderOpen },
                { value: "approvals", label: "Approvals", icon: ShieldCheck },
                { value: "notes", label: "Notes", icon: StickyNote },
                { value: "reporting", label: "Reporting", icon: BarChart3 },
              ] as const).map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value} value={value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 h-9 text-xs font-medium gap-1 whitespace-nowrap"
                  data-testid={`tab-${value}`}
                >
                  <Icon className="w-3 h-3" />{label}
                  {value === "tasks" && totalTasks > 0 && (
                    <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0 text-[10px] font-mono">{totalTasks}</span>
                  )}
                  {value === "content" && contentItems.length > 0 && (
                    <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0 text-[10px] font-mono">{contentItems.length}</span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <ScrollArea className="flex-1">

            {/* ═══════════════════════════════════════════════════════════════
                BRIEF
            ═══════════════════════════════════════════════════════════════ */}
            <TabsContent value="brief" className="mt-0 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Campaign Brief</h3>
                {isAdmin && !briefEditing && (
                  <Button size="sm" variant="ghost" onClick={() => setBriefEditing(true)} data-testid="button-edit-brief">
                    <Pencil className="w-3 h-3 mr-1" />Edit
                  </Button>
                )}
                {isAdmin && briefEditing && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setBriefEditing(false)}>Cancel</Button>
                    <Button size="sm" onClick={() => saveBriefMutation.mutate()} disabled={saveBriefMutation.isPending} data-testid="button-save-brief">
                      {saveBriefMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}Save
                    </Button>
                  </div>
                )}
              </div>

              {briefEditing && isAdmin ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Campaign Name</Label>
                      <Input value={briefDraft.name} onChange={e => setBriefDraft(d => ({ ...d, name: e.target.value }))} placeholder="Campaign name" data-testid="input-brief-name" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Owner</Label>
                      <Input value={briefDraft.ownerName} onChange={e => setBriefDraft(d => ({ ...d, ownerName: e.target.value }))} placeholder="Campaign owner name" data-testid="input-brief-owner" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Due Date</Label>
                      <Input type="date" value={briefDraft.dueDate} onChange={e => setBriefDraft(d => ({ ...d, dueDate: e.target.value }))} data-testid="input-brief-due-date" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Launch Date</Label>
                      <Input type="date" value={briefDraft.launchDate} onChange={e => setBriefDraft(d => ({ ...d, launchDate: e.target.value }))} data-testid="input-brief-launch-date" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Status</Label>
                      <Select value={briefDraft.status} onValueChange={v => setBriefDraft(d => ({ ...d, status: v }))}>
                        <SelectTrigger data-testid="select-brief-status"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Purpose</Label>
                    <Textarea value={briefDraft.purpose} onChange={e => setBriefDraft(d => ({ ...d, purpose: e.target.value }))} placeholder="What is this campaign for?" className="min-h-16" data-testid="textarea-brief-purpose" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Offer</Label>
                    <Textarea value={briefDraft.offer} onChange={e => setBriefDraft(d => ({ ...d, offer: e.target.value }))} placeholder="The core offer or promotion" className="min-h-16" data-testid="textarea-brief-offer" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Objective</Label>
                    <Textarea value={briefDraft.objective} onChange={e => setBriefDraft(d => ({ ...d, objective: e.target.value }))} placeholder="Campaign objective (leads, awareness, sales...)" className="min-h-16" data-testid="textarea-brief-objective" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Target Audience</Label>
                    <Textarea value={briefDraft.targetAudience} onChange={e => setBriefDraft(d => ({ ...d, targetAudience: e.target.value }))} placeholder="Who is this campaign targeting?" className="min-h-16" data-testid="textarea-brief-audience" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Target Services / Products</Label>
                    <Textarea value={briefDraft.targetServices} onChange={e => setBriefDraft(d => ({ ...d, targetServices: e.target.value }))} placeholder="Which services or products to highlight?" className="min-h-16" data-testid="textarea-brief-services" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Key Messages</Label>
                    <Textarea value={briefDraft.keyMessages} onChange={e => setBriefDraft(d => ({ ...d, keyMessages: e.target.value }))} placeholder="Core messages to communicate" className="min-h-16" data-testid="textarea-brief-messages" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Preferred Tone</Label>
                      <Input value={briefDraft.preferredTone} onChange={e => setBriefDraft(d => ({ ...d, preferredTone: e.target.value }))} placeholder="Professional, casual, bold..." data-testid="input-brief-tone" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Goals / KPIs</Label>
                      <Input value={briefDraft.notes} onChange={e => setBriefDraft(d => ({ ...d, notes: e.target.value }))} placeholder="What does success look like?" data-testid="input-brief-goals" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Reference Links</Label>
                    <Textarea value={briefDraft.referenceLinks} onChange={e => setBriefDraft(d => ({ ...d, referenceLinks: e.target.value }))} placeholder="Inspiration, competitor examples..." className="min-h-16" data-testid="textarea-brief-refs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Budget Notes</Label>
                    <Input value={briefDraft.budgetNotes} onChange={e => setBriefDraft(d => ({ ...d, budgetNotes: e.target.value }))} placeholder="Budget constraints or notes" data-testid="input-brief-budget" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Additional Details</Label>
                    <Textarea value={briefDraft.additionalDetails} onChange={e => setBriefDraft(d => ({ ...d, additionalDetails: e.target.value }))} className="min-h-16" data-testid="textarea-brief-additional" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Admin Notes (internal)</Label>
                    <Textarea value={briefDraft.adminNotes} onChange={e => setBriefDraft(d => ({ ...d, adminNotes: e.target.value }))} placeholder="Internal notes for the team..." className="min-h-16" data-testid="textarea-brief-admin-notes" />
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium flex items-center gap-1">
                        {briefDraft.clientVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        Client Visibility
                      </p>
                      <p className="text-xs text-muted-foreground">{briefDraft.clientVisible ? "Visible to client" : "Hidden from client"}</p>
                    </div>
                    <Switch checked={briefDraft.clientVisible} onCheckedChange={v => setBriefDraft(d => ({ ...d, clientVisible: v }))} data-testid="switch-client-visible" />
                  </div>
                  {campaign.isRush && (
                    <div className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-500" />Rush Multiplier (2×)</p>
                        <p className="text-xs text-muted-foreground">{rushDisabledLocal ? "Rush disabled — normal rate" : "Rush active — credits doubled"}</p>
                      </div>
                      <Switch checked={!rushDisabledLocal} onCheckedChange={checked => toggleRushMutation.mutate(!checked)} disabled={toggleRushMutation.isPending} data-testid="switch-rush-toggle" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {campaign.ownerName && (
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Owner</p>
                        <p className="font-medium">{campaign.ownerName}</p>
                      </div>
                    )}
                    {campaign.launchDate && (
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Launch Date</p>
                        <p className="font-medium">{parseLocalDate(campaign.launchDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Client Visibility</p>
                      <p className="font-medium flex items-center gap-1">
                        {campaign.clientVisible ? <><Eye className="w-3.5 h-3.5 text-green-500" />Visible</> : <><EyeOff className="w-3.5 h-3.5 text-muted-foreground" />Hidden</>}
                      </p>
                    </div>
                  </div>
                  {(campaign.purpose || campaign.offer || campaign.objective || campaign.targetAudience || campaign.targetServices || campaign.goals || campaign.keyMessages || campaign.preferredTone || campaign.referenceLinks || campaign.budgetNotes || campaign.additionalDetails || campaign.notes) ? (
                    <div className="space-y-3">
                      <FieldRow label="Purpose" value={campaign.purpose} icon={Target} multiline />
                      <FieldRow label="Offer" value={campaign.offer} icon={DollarSign} multiline />
                      <FieldRow label="Objective" value={campaign.objective} icon={CheckCircle2} multiline />
                      <FieldRow label="Target Audience" value={campaign.targetAudience} icon={Users} multiline />
                      <FieldRow label="Target Services / Products" value={campaign.targetServices} icon={Package} multiline />
                      <FieldRow label="Goals" value={campaign.goals} icon={CheckCircle2} multiline />
                      <FieldRow label="Key Messages" value={campaign.keyMessages} icon={MessageSquare} multiline />
                      <FieldRow label="Preferred Tone" value={campaign.preferredTone} icon={MessageSquare} />
                      <FieldRow label="Reference Links" value={campaign.referenceLinks} icon={Link2} multiline />
                      <FieldRow label="Budget Notes" value={campaign.budgetNotes} icon={DollarSign} />
                      <FieldRow label="Additional Details" value={campaign.additionalDetails} icon={FileText} multiline />
                      <FieldRow label="Notes / Goals" value={campaign.notes} icon={StickyNote} multiline />
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No brief details yet.</p>
                      {isAdmin && <p className="text-xs mt-1">Click "Edit" to fill in the campaign brief.</p>}
                    </div>
                  )}
                  {isAdmin && campaign.adminNotes && (
                    <div className="rounded-lg border border-dashed px-4 py-3 bg-muted/30">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Admin Notes</p>
                      <p className="text-sm whitespace-pre-wrap">{campaign.adminNotes}</p>
                    </div>
                  )}
                  {!isAdmin && campaign.adminNotes && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Agency Response</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">{campaign.adminNotes}</p>
                    </div>
                  )}
                  {campaign.isRush && (
                    <div className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-500" />Rush Multiplier (2×)</p>
                        <p className="text-xs text-muted-foreground">{rushDisabledLocal ? "Rush disabled — normal rate" : "Rush active — credits doubled"}</p>
                      </div>
                      {isAdmin && (
                        <Switch checked={!rushDisabledLocal} onCheckedChange={checked => toggleRushMutation.mutate(!checked)} disabled={toggleRushMutation.isPending} data-testid="switch-rush-toggle" />
                      )}
                    </div>
                  )}
                  {campaign.campaignMemberIds && campaign.campaignMemberIds.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" />Campaign Team</Label>
                        <div className="space-y-2">
                          {campaign.campaignMemberIds.map(memberId => {
                            const member = companyMembers?.find(m => m.userId === memberId);
                            const name = member ? ([member.firstName, member.lastName].filter(Boolean).join(" ") || member.email || "Unknown") : "Loading...";
                            const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                            return (
                              <div key={memberId} className="flex items-center gap-2">
                                <Avatar className="h-6 w-6"><AvatarFallback className="text-xs">{initials}</AvatarFallback></Avatar>
                                <span className="text-sm">{name}</span>
                                {member && <Badge variant="outline" className="text-xs capitalize">{member.role}</Badge>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════
                DELIVERABLES
            ═══════════════════════════════════════════════════════════════ */}
            <TabsContent value="deliverables" className="mt-0 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Deliverable Scope</h3>
                {isAdmin && !editing && (
                  <Button size="sm" variant="ghost" onClick={startEditing} data-testid="button-edit-scope"><Pencil className="w-3 h-3 mr-1" />Edit</Button>
                )}
                {isAdmin && editing && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                    <Button size="sm" onClick={() => saveScopeMutation.mutate()} disabled={saveScopeMutation.isPending} data-testid="button-save-scope">
                      {saveScopeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}Save
                    </Button>
                  </div>
                )}
              </div>

              {editing && isAdmin ? (
                <div className="space-y-4">
                  {/* Deliverable picker */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs text-muted-foreground">Deliverables</Label>
                      <Popover open={editSearchOpen} onOpenChange={o => { setEditSearchOpen(o); if (!o) setEditSearch(""); }} modal={false}>
                        <PopoverTrigger asChild>
                          <Button type="button" size="sm" variant="outline"
                            disabled={!deliverableTypes || deliverableTypes.filter(d => !editDeliverableIds.includes(d.id) && !editDeliverableIds.includes(d.key)).length === 0}
                            data-testid="button-add-deliverable"
                          >
                            <Plus className="w-4 h-4 mr-1" />Add
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-0" align="end" onWheel={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2 px-3 py-2 border-b">
                            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                            <input type="text" placeholder="Search deliverables..." value={editSearch} onChange={e => setEditSearch(e.target.value)}
                              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" data-testid="input-edit-deliverable-search" />
                          </div>
                          <div className="space-y-1 max-h-60 overflow-y-auto overscroll-contain p-2">
                            {deliverableTypes?.filter(d => !editDeliverableIds.includes(d.id) && !editDeliverableIds.includes(d.key) && d.name.toLowerCase().includes(editSearch.toLowerCase())).map(d => (
                              <button key={d.id} type="button" className="w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-left hover:bg-muted"
                                onClick={() => { setEditDeliverableIds(prev => [...prev, d.id]); setEditDelQuantities(prev => ({ ...prev, [d.id]: 1 })); setEditSearchOpen(false); setEditSearch(""); }}
                                data-testid={`button-pick-deliverable-${d.id}`}>
                                <span className="truncate">{d.name}</span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">{d.credits} cr</span>
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    {editDeliverableIds.map(id => {
                      const d = deliverableTypes?.find(dt => dt.id === id || dt.key === id);
                      if (!d) return null;
                      const qty = editDelQuantities[id] || 1;
                      const totalCr = parseFloat(d.credits) * qty * (isRushEffective ? 2 : 1);
                      return (
                        <div key={id} className="flex items-center gap-3 px-3 py-2 rounded-md border" data-testid={`edit-deliverable-${id}`}>
                          <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{d.name}</p><p className="text-xs text-muted-foreground">{d.credits} cr each</p></div>
                          <div className="flex items-center gap-1">
                            <Button type="button" size="icon" variant="ghost" onClick={() => setEditDelQuantities(p => ({ ...p, [id]: Math.max(1, (p[id] || 1) - 1) }))} data-testid={`button-del-minus-${id}`}><Minus className="w-3 h-3" /></Button>
                            <Input type="number" min={1} max={99} value={qty} onChange={e => setEditDelQuantities(p => ({ ...p, [id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                              className="w-14 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" data-testid={`input-del-qty-${id}`} />
                            <Button type="button" size="icon" variant="ghost" onClick={() => setEditDelQuantities(p => ({ ...p, [id]: (p[id] || 1) + 1 }))} data-testid={`button-del-plus-${id}`}><Plus className="w-3 h-3" /></Button>
                          </div>
                          <Badge variant="secondary" className="text-xs whitespace-nowrap">{totalCr.toFixed(1)} cr</Badge>
                          <Button type="button" size="icon" variant="ghost" onClick={() => setEditDeliverableIds(p => p.filter(i => i !== id))} data-testid={`button-del-remove-${id}`}><X className="w-4 h-4" /></Button>
                        </div>
                      );
                    })}
                    {editDeliverableIds.length === 0 && <p className="text-sm text-muted-foreground">No deliverables added.</p>}
                  </div>

                  <Separator />

                  {/* Meeting picker */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs text-muted-foreground">Meetings</Label>
                      <Popover open={editMtgSearchOpen} onOpenChange={o => { setEditMtgSearchOpen(o); if (!o) setEditMtgSearch(""); }} modal={false}>
                        <PopoverTrigger asChild>
                          <Button type="button" size="sm" variant="outline"
                            disabled={!allMeetingTypes || allMeetingTypes.filter(mt => mt.isActive !== false && !(editMtgQuantities[mt.id] > 0)).length === 0}
                            data-testid="button-edit-add-meeting">
                            <Plus className="w-4 h-4 mr-1" />Add Meeting
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-0" align="end" onWheel={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2 px-3 py-2 border-b">
                            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                            <input type="text" placeholder="Search meeting types..." value={editMtgSearch} onChange={e => setEditMtgSearch(e.target.value)}
                              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" data-testid="input-edit-meeting-search" />
                          </div>
                          <div className="space-y-1 max-h-60 overflow-y-auto overscroll-contain p-2">
                            {allMeetingTypes?.filter(mt => mt.isActive !== false && !(editMtgQuantities[mt.id] > 0) && mt.name.toLowerCase().includes(editMtgSearch.toLowerCase())).map(mt => (
                              <button key={mt.id} type="button" className="w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-left hover:bg-muted"
                                onClick={() => { setEditMtgQuantities(p => ({ ...p, [mt.id]: 1 })); setEditMtgSearchOpen(false); setEditMtgSearch(""); }}
                                data-testid={`button-edit-pick-mtg-${mt.id}`}>
                                <span className="truncate">{mt.name}</span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">{mt.creditCost} cr | {mt.defaultDuration} min</span>
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    {Object.entries(editMtgQuantities).filter(([, q]) => q > 0).map(([mtId, qty]) => {
                      const mt = allMeetingTypes?.find(t => t.id === mtId);
                      if (!mt) return null;
                      const totalCr = parseFloat(mt.creditCost || "0") * qty * (isRushEffective ? 2 : 1);
                      return (
                        <div key={mtId} className="flex items-center gap-3 px-3 py-2 rounded-md border" data-testid={`edit-meeting-${mtId}`}>
                          <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{mt.name}</p><p className="text-xs text-muted-foreground">{mt.creditCost} cr | {mt.defaultDuration} min</p></div>
                          <div className="flex items-center gap-1">
                            <Button type="button" size="icon" variant="ghost" onClick={() => setEditMtgQuantities(p => ({ ...p, [mtId]: Math.max(0, (p[mtId] || 0) - 1) }))} data-testid={`button-mtg-minus-${mtId}`}><Minus className="w-3 h-3" /></Button>
                            <Input type="number" min={0} max={99} value={qty} onChange={e => setEditMtgQuantities(p => ({ ...p, [mtId]: Math.max(0, parseInt(e.target.value) || 0) }))}
                              className="w-14 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" data-testid={`input-mtg-qty-${mtId}`} />
                            <Button type="button" size="icon" variant="ghost" onClick={() => setEditMtgQuantities(p => ({ ...p, [mtId]: (p[mtId] || 0) + 1 }))} data-testid={`button-mtg-plus-${mtId}`}><Plus className="w-3 h-3" /></Button>
                          </div>
                          <Badge variant="secondary" className="text-xs whitespace-nowrap">{totalCr.toFixed(1)} cr</Badge>
                          <Button type="button" size="icon" variant="ghost" onClick={() => setEditMtgQuantities(p => { const n = { ...p }; delete n[mtId]; return n; })} data-testid={`button-mtg-remove-${mtId}`}><X className="w-4 h-4" /></Button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-sm font-medium">New Estimated Credits:</span>
                    <Badge className="flex items-center gap-1" data-testid="badge-edit-total">
                      <Coins className="w-3 h-3" />{calculateEditTotal().toFixed(1)} credits{isRushEffective && <span className="ml-1 text-amber-200">(2x rush)</span>}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => {
                    setEditDeliverableIds([...effectiveDeliverableIds]);
                    setEditDelQuantities({ ...quantities });
                    setEditMtgQuantities({ ...meetingTypeQuantitiesMap });
                  }} data-testid="button-reset-to-type">
                    <RotateCcw className="w-3 h-3 mr-1" />Reset to Campaign Type Defaults
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {effectiveDeliverableIds.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No deliverables defined yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2" data-testid="section-deliverables">
                      {effectiveDeliverableIds.map(id => {
                        const qty = effectiveDelQuantities[id] || 1;
                        const name = getDeliverableName(id);
                        const linkedTasks = campaignTasks.filter(t => t.deliverableType && (t.deliverableType === id || (deliverableTypes?.find(d => d.id === id)?.key === t.deliverableType)));
                        const anyDone = linkedTasks.some(t => t.status === "completed");
                        const anyInProgress = linkedTasks.some(t => t.status === "in_progress");
                        return (
                          <div key={id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2" data-testid={`deliverable-row-${id}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${anyDone ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" : anyInProgress ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" : "bg-muted text-muted-foreground"}`}>
                                {anyDone ? <Check className="w-3 h-3" /> : anyInProgress ? <Clock className="w-3 h-3" /> : <CircleDot className="w-3 h-3" />}
                              </div>
                              <span className="text-sm font-medium truncate">{name}</span>
                              {qty > 1 && <span className="text-xs text-muted-foreground font-mono">×{qty}</span>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {linkedTasks.length > 0 ? (
                                <span className="text-xs text-muted-foreground">{linkedTasks.filter(t => t.status === "completed").length}/{linkedTasks.length} done</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">No tasks</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {hasEffectiveMeetings && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1"><Video className="w-3 h-3" />Meetings</Label>
                        {Object.entries(effectiveMeetingQuantities).filter(([, q]) => q > 0).map(([mtId, qty]) => {
                          const mt = allMeetingTypes?.find(t => t.id === mtId);
                          const baseCost = parseFloat(mt?.creditCost || "0");
                          const displayCost = isRushEffective ? baseCost * 2 : baseCost;
                          return (
                            <div key={mtId} className="flex items-center justify-between gap-2 p-2 rounded-md border" data-testid={`campaign-meeting-${mtId}`}>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{mt?.name || "…"}{qty > 1 ? ` ×${qty}` : ""}</p>
                                {mt?.description && <p className="text-xs text-muted-foreground">{mt.description}</p>}
                              </div>
                              <div className="flex flex-col items-end shrink-0">
                                <span className="text-xs text-muted-foreground">{mt?.defaultDuration || 30} min</span>
                                <span className="text-xs text-muted-foreground">{(displayCost * qty).toFixed(1)} cr{isRushEffective ? " (2×)" : ""}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════
                TASKS
            ═══════════════════════════════════════════════════════════════ */}
            <TabsContent value="tasks" className="mt-0 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Linked Tasks</h3>
                {isAdmin && (
                  <Button size="sm" variant="outline" onClick={() => generateTasksMutation.mutate()} disabled={generateTasksMutation.isPending} data-testid="button-generate-tasks-inline">
                    {generateTasksMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Wand2 className="w-3 h-3 mr-1" />}Generate Tasks
                  </Button>
                )}
              </div>
              {tasksLoading ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : campaignTasks.length > 0 ? (
                <div className="space-y-2" data-testid="section-campaign-tasks">
                  {campaignTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between gap-3 p-3 rounded-md border hover:bg-muted/50 cursor-pointer transition-colors"
                      data-testid={`task-item-${task.id}`}
                      onClick={() => { if (onTaskClick) { onClose(); setTimeout(() => onTaskClick(task), 300); } }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" data-testid={`text-task-title-${task.id}`}>{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {task.dueDate && <span className="text-xs text-muted-foreground">Due {parseLocalDate(task.dueDate).toLocaleDateString()}</span>}
                          {task.priority && <span className="text-xs text-muted-foreground capitalize">• {task.priority}</span>}
                          {task.completedAt && <span className="text-xs text-green-600 dark:text-green-400">• Completed {new Date(task.completedAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <TaskStatusBadge status={task.status} />
                        <span className="text-xs text-muted-foreground font-mono" data-testid={`text-task-credits-${task.id}`}>{task.creditCost} cr</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <CircleDot className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No tasks yet.</p>
                  {isAdmin && <p className="text-xs mt-1">Click "Generate Tasks" to create tasks from deliverables.</p>}
                </div>
              )}
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════
                CONTENT
            ═══════════════════════════════════════════════════════════════ */}
            <TabsContent value="content" className="mt-0 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Content Calendar Items</h3>
                {isAdmin && (
                  <Button size="sm" variant="outline" onClick={() => generateContentMutation.mutate()} disabled={generateContentMutation.isPending} data-testid="button-generate-content-inline">
                    {generateContentMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ClipboardList className="w-3 h-3 mr-1" />}Generate Placeholders
                  </Button>
                )}
              </div>
              {contentLoading ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : contentItems.length > 0 ? (
                <div className="space-y-2" data-testid="section-content-items">
                  {contentItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-md border" data-testid={`content-item-${item.id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{CONTENT_PLATFORM_LABELS[item.platform] || item.platform}</span>
                          {item.scheduledDate && <span className="text-xs text-muted-foreground">• {parseLocalDate(item.scheduledDate).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={`text-xs border-0 ${
                          item.status === "published" ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" :
                          item.status === "scheduled" ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" :
                          item.status === "approved" ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300" :
                          item.status === "in_review" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300" :
                          "bg-muted text-muted-foreground"}`}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </Badge>
                        {item.ctaUrl && (
                          <a href={item.ctaUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" onClick={e => e.stopPropagation()}>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No content items linked to this campaign.</p>
                  {isAdmin && <p className="text-xs mt-1">Click "Generate Placeholders" to create draft content items.</p>}
                </div>
              )}
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════
                ASSETS
            ═══════════════════════════════════════════════════════════════ */}
            <TabsContent value="assets" className="mt-0 p-6 space-y-4">
              <h3 className="text-sm font-semibold">Assets & Resources</h3>

              {/* SharePoint folder */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><FolderOpen className="w-3 h-3" />SharePoint Folder</Label>
                {isAdmin ? (
                  <div className="flex gap-2">
                    <Input value={sharepointFolderUrl} onChange={e => setSharepointFolderUrl(e.target.value)} placeholder="https://sharepoint.com/..." className="flex-1" data-testid="input-sharepoint-folder" />
                    <Button size="icon" variant="outline" onClick={() => saveAssetsMutation.mutate()} disabled={saveAssetsMutation.isPending} data-testid="button-save-sharepoint">
                      {saveAssetsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </Button>
                    {sharepointFolderUrl && (
                      <a href={sharepointFolderUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="outline" type="button"><ExternalLink className="w-4 h-4" /></Button>
                      </a>
                    )}
                  </div>
                ) : campaign.sharepointFolderUrl ? (
                  <a href={campaign.sharepointFolderUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <FolderOpen className="w-4 h-4" />Open SharePoint Folder <ExternalLink className="w-3 h-3" />
                  </a>
                ) : <p className="text-sm text-muted-foreground">No SharePoint folder set.</p>}
              </div>

              <Separator />

              {/* Asset links */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Link2 className="w-3 h-3" />Resource Links</Label>
                  {isAdmin && !addingAsset && (
                    <Button size="sm" variant="ghost" onClick={() => setAddingAsset(true)} data-testid="button-add-asset"><Plus className="w-3 h-3 mr-1" />Add</Button>
                  )}
                </div>

                {addingAsset && isAdmin && (
                  <div className="rounded-md border p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={newAsset.type} onValueChange={v => setNewAsset(a => ({ ...a, type: v as AssetLink["type"] }))}>
                        <SelectTrigger className="h-8 text-xs" data-testid="select-asset-type"><SelectValue /></SelectTrigger>
                        <SelectContent>{ASSET_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input value={newAsset.label} onChange={e => setNewAsset(a => ({ ...a, label: e.target.value }))} placeholder="Label (optional)" className="h-8 text-xs" data-testid="input-asset-label" />
                    </div>
                    <Input value={newAsset.url} onChange={e => setNewAsset(a => ({ ...a, url: e.target.value }))} placeholder="https://..." className="h-8 text-xs" data-testid="input-asset-url" />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setAddingAsset(false)}>Cancel</Button>
                      <Button size="sm" onClick={addAssetLink} disabled={!newAsset.url} data-testid="button-save-asset">Add</Button>
                    </div>
                  </div>
                )}

                {assetLinks.length > 0 ? (
                  <div className="space-y-2" data-testid="section-asset-links">
                    {assetLinks.map(asset => (
                      <div key={asset.id} className="flex items-center gap-3 rounded-md border px-3 py-2" data-testid={`asset-link-${asset.id}`}>
                        <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{asset.label || asset.url}</p>
                          <p className="text-xs text-muted-foreground">{ASSET_TYPE_OPTIONS.find(o => o.value === asset.type)?.label || asset.type}</p>
                        </div>
                        <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground shrink-0"><ExternalLink className="w-3.5 h-3.5" /></a>
                        {isAdmin && (
                          <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => removeAssetLink(asset.id)} data-testid={`button-remove-asset-${asset.id}`}><X className="w-3 h-3" /></Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : !addingAsset && (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-assets">No resources added yet.</p>
                )}
              </div>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════
                APPROVALS
            ═══════════════════════════════════════════════════════════════ */}
            <TabsContent value="approvals" className="mt-0 p-6 space-y-4">
              <h3 className="text-sm font-semibold">Approval Flow</h3>
              <div className="space-y-3">
                {/* Step 1: Internal Review */}
                <ApprovalStepCard
                  label="Internal Review" stepKey="internalReview" icon={AlertCircle}
                  step={approvalFlow.internalReview}
                  isAdmin={isAdmin} isPending={saveApprovalMutation.isPending}
                  onUpdate={(updates) => {
                    const updated = { ...approvalFlow, internalReview: { ...approvalFlow.internalReview, ...updates } };
                    saveApprovalStep(updated);
                  }}
                />
                {/* Step 2: Client Approval */}
                <ApprovalStepCard
                  label="Client Approval" stepKey="clientApproval" icon={Users}
                  step={approvalFlow.clientApproval}
                  isAdmin={isAdmin} isPending={saveApprovalMutation.isPending}
                  onUpdate={(updates) => {
                    const updated = { ...approvalFlow, clientApproval: { ...approvalFlow.clientApproval, ...updates } };
                    saveApprovalStep(updated);
                  }}
                />
                {/* Step 3: Revision */}
                <div className="rounded-md border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${approvalFlow.revision?.status === "done" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                        {approvalFlow.revision?.status === "done" ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">Revision</p>
                        <p className="text-xs text-muted-foreground capitalize">{approvalFlow.revision?.status || "pending"}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button size="sm" variant={approvalFlow.revision?.status === "pending" ? "default" : "outline"} className="h-7 text-xs"
                          onClick={() => saveApprovalStep({ ...approvalFlow, revision: { ...approvalFlow.revision, status: "pending", completedAt: "" } })} data-testid="button-revision-pending">
                          Requested
                        </Button>
                        <Button size="sm" variant={approvalFlow.revision?.status === "done" ? "default" : "outline"} className="h-7 text-xs"
                          onClick={() => saveApprovalStep({ ...approvalFlow, revision: { ...approvalFlow.revision, status: "done", completedAt: new Date().toISOString() } })} data-testid="button-revision-done">
                          Done
                        </Button>
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <Textarea value={approvalFlow.revision?.note || ""} onChange={e => setApprovalFlow(f => ({ ...f, revision: { ...f.revision, note: e.target.value } }))}
                      onBlur={() => saveApprovalStep(approvalFlow)} placeholder="Revision notes..." className="min-h-14 text-xs" data-testid="textarea-revision-note" />
                  )}
                  {!isAdmin && approvalFlow.revision?.note && <p className="text-sm">{approvalFlow.revision.note}</p>}
                </div>
                {/* Step 4: Final Approved */}
                <div className={`rounded-md border p-4 flex items-center justify-between ${approvalFlow.finalApproval?.completedAt ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30" : ""}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${approvalFlow.finalApproval?.completedAt ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Final Approved</p>
                      {approvalFlow.finalApproval?.completedAt ? (
                        <p className="text-xs text-green-600 dark:text-green-400">Approved {new Date(approvalFlow.finalApproval.completedAt).toLocaleDateString()}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Pending</p>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    approvalFlow.finalApproval?.completedAt ? (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => saveApprovalStep({ ...approvalFlow, finalApproval: { completedAt: "" } })} data-testid="button-final-revoke">Revoke</Button>
                    ) : (
                      <Button size="sm" className="h-7 text-xs" onClick={() => saveApprovalStep({ ...approvalFlow, finalApproval: { completedAt: new Date().toISOString() } })} data-testid="button-final-approve">Mark Approved</Button>
                    )
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════
                NOTES
            ═══════════════════════════════════════════════════════════════ */}
            <TabsContent value="notes" className="mt-0 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Notes & Decisions</h3>
                <Button size="sm" variant="outline" onClick={() => saveNotesMutation.mutate()} disabled={saveNotesMutation.isPending} data-testid="button-save-notes">
                  {saveNotesMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}Save
                </Button>
              </div>
              <Textarea
                value={notesDraft}
                onChange={e => setNotesDraft(e.target.value)}
                placeholder={isAdmin ? "Add campaign notes, decisions, blockers, next steps..." : "Campaign notes from your agency team."}
                className="min-h-64 text-sm font-mono"
                readOnly={!isAdmin}
                data-testid="textarea-campaign-notes"
              />
              {!isAdmin && !notesDraft && (
                <div className="text-center py-6 text-muted-foreground">
                  <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No notes from the team yet.</p>
                </div>
              )}
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════
                REPORTING
            ═══════════════════════════════════════════════════════════════ */}
            <TabsContent value="reporting" className="mt-0 p-6 space-y-5">
              <h3 className="text-sm font-semibold">Reporting Summary</h3>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-md border p-3 text-center">
                  <p className="text-2xl font-bold">{completedTasks}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Tasks Done</p>
                </div>
                <div className="rounded-md border p-3 text-center">
                  <p className="text-2xl font-bold">{contentItems.filter(c => c.status === "published").length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Published</p>
                </div>
                <div className="rounded-md border p-3 text-center">
                  <p className="text-2xl font-bold">{totalCreditsUsed.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Credits Used</p>
                </div>
              </div>

              {/* Monthly report flag */}
              {isAdmin && (
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" />Include in Monthly Report</p>
                    <p className="text-xs text-muted-foreground">Surface this campaign in the next monthly report</p>
                  </div>
                  <Switch checked={reportingIncluded} onCheckedChange={v => { setReportingIncluded(v); }} data-testid="switch-reporting-included" />
                </div>
              )}

              <Separator />

              {/* Published URLs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="w-3 h-3" />Published URLs</Label>
                  {isAdmin && !addingPubUrl && (
                    <Button size="sm" variant="ghost" onClick={() => setAddingPubUrl(true)} data-testid="button-add-pub-url"><Plus className="w-3 h-3 mr-1" />Add</Button>
                  )}
                </div>
                {addingPubUrl && isAdmin && (
                  <div className="rounded-md border p-3 space-y-2">
                    <Input value={newPubUrl.deliverableName} onChange={e => setNewPubUrl(p => ({ ...p, deliverableName: e.target.value }))} placeholder="Deliverable (e.g. Blog Post)" className="h-8 text-xs" data-testid="input-pub-deliverable" />
                    <Input value={newPubUrl.url} onChange={e => setNewPubUrl(p => ({ ...p, url: e.target.value }))} placeholder="https://..." className="h-8 text-xs" data-testid="input-pub-url" />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setAddingPubUrl(false)}>Cancel</Button>
                      <Button size="sm" onClick={addPublishedUrl} disabled={!newPubUrl.url} data-testid="button-save-pub-url">Add</Button>
                    </div>
                  </div>
                )}
                {publishedUrls.length > 0 ? (
                  <div className="space-y-2" data-testid="section-published-urls">
                    {publishedUrls.map((pu, idx) => (
                      <div key={idx} className="flex items-center gap-3 rounded-md border px-3 py-2" data-testid={`published-url-${idx}`}>
                        <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          {pu.deliverableName && <p className="text-xs text-muted-foreground">{pu.deliverableName}</p>}
                          <a href={pu.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate block">{pu.url}</a>
                        </div>
                        {isAdmin && <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => removePublishedUrl(idx)} data-testid={`button-remove-pub-url-${idx}`}><X className="w-3 h-3" /></Button>}
                      </div>
                    ))}
                  </div>
                ) : !addingPubUrl && (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-pub-urls">No published URLs recorded yet.</p>
                )}
                {isAdmin && publishedUrls.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => saveReportingMutation.mutate()} disabled={saveReportingMutation.isPending} className="w-full" data-testid="button-save-reporting">
                    {saveReportingMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}Save Reporting
                  </Button>
                )}
              </div>
            </TabsContent>

          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// ─── ApprovalStepCard sub-component ───────────────────────────────────────────
interface ApprovalStepCardProps {
  label: string;
  stepKey: string;
  icon: React.ComponentType<{ className?: string }>;
  step: ApprovalStep;
  isAdmin: boolean;
  isPending: boolean;
  onUpdate: (updates: Partial<ApprovalStep>) => void;
}

function ApprovalStepCard({ label, stepKey, icon: Icon, step, isAdmin, isPending, onUpdate }: ApprovalStepCardProps) {
  const isApproved = step.status === "approved";
  const isRevision = step.status === "revision";
  return (
    <div className={`rounded-md border p-4 space-y-3 ${isApproved ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20" : isRevision ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isApproved ? "bg-green-500 text-white" : isRevision ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"}`}>
            {isApproved ? <Check className="w-3.5 h-3.5" /> : isRevision ? <AlertCircle className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
          </div>
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground capitalize">{step.status}</p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-1">
            <Button size="sm" variant={isApproved ? "default" : "outline"} className="h-7 text-xs"
              onClick={() => onUpdate({ status: "approved", completedAt: new Date().toISOString() })} disabled={isPending} data-testid={`button-${stepKey}-approve`}>
              <Check className="w-3 h-3 mr-0.5" />Approve
            </Button>
            <Button size="sm" variant={isRevision ? "default" : "outline"} className="h-7 text-xs"
              onClick={() => onUpdate({ status: "revision", completedAt: "" })} disabled={isPending} data-testid={`button-${stepKey}-revision`}>
              <Pencil className="w-3 h-3 mr-0.5" />Revision
            </Button>
            {(isApproved || isRevision) && (
              <Button size="sm" variant="ghost" className="h-7 text-xs"
                onClick={() => onUpdate({ status: "pending", completedAt: "" })} disabled={isPending} data-testid={`button-${stepKey}-reset`}>
                <XCircle className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}
      </div>
      {isAdmin && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Due Date</Label>
            <Input type="date" value={step.dueDate} onChange={e => onUpdate({ dueDate: e.target.value })} className="h-7 text-xs" data-testid={`input-${stepKey}-due`} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Note</Label>
            <Input value={step.note} onChange={e => onUpdate({ note: e.target.value })} placeholder="Optional note..." className="h-7 text-xs" data-testid={`input-${stepKey}-note`} />
          </div>
        </div>
      )}
      {step.completedAt && (
        <p className="text-xs text-muted-foreground">{isApproved ? "Approved" : "Updated"} {new Date(step.completedAt).toLocaleDateString()}</p>
      )}
    </div>
  );
}
