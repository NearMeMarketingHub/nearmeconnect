import { useState, useEffect, useRef, useMemo } from "react";
import { getDateLabel, isDifferentDay, formatMessageTime } from "@/lib/chat-dates";
import { useQuery, useMutation } from "@tanstack/react-query";
import { parseLocalDate } from "@/lib/utils";
import { useRoute, Link, useSearch, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileTabMenu } from "@/components/mobile-tab-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useUpload } from "@/hooks/use-upload";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import {
  ArrowLeft,
  Plus,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon,
  Clock,
  Repeat,
  MessageCircle,
  Send,
  Users,
  CheckCheck,
  Check,
  Loader2,
  ClipboardList,
  CreditCard,
  Building2,
  UserPlus,
  UserMinus,
  Pause,
  Play,
  AlertTriangle,
  Settings,
  TrendingUp,
  TrendingDown,
  Crown,
  Shield,
  User,
  Tag,
  X,
  Video,
  FileText,
  Pencil,
  Save,
  ExternalLink,
  Calendar,
  CalendarPlus,
  XCircle,
  Coins,
  Upload,
  FileEdit,
  CheckCircle,
  Mail,
  Link2,
  Copy,
  Lock,
  Unlock,
  Zap,
  Trash2,
  ListTodo,
  GitMerge,
  RefreshCw,
  Target,
  BarChart3,
  Menu,
  FolderOpen,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChatMemberSelector } from "@/components/chat-member-selector";
import { DeliverableTypePicker } from "@/components/deliverable-type-picker";
import { MentionInput, renderMessageWithMentions } from "@/components/mention-input";
import { CampaignDetailPanel } from "@/components/campaign-detail-panel";
import { CompanyInfoHub } from "@/components/company-info-hub";
import type { Company, Task, DeliverableType, CreditTransaction, MeetingRequest, MeetingType, ClientOnboarding, CampaignRequest } from "@shared/schema";
import { getBillingPeriod, formatBillingPeriod, isDateInBillingPeriod, isTaskInBillingPeriod } from "@shared/billing";

interface ChatThread {
  id: string;
  companyId: string;
  name: string | null;
  type: "general" | "group" | "task";
  taskId: string | null;
  isCompanyWide: boolean;
  createdBy: string;
  createdAt: string;
  closedAt: string | null;
  autoCloseAt: string | null;
}

interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  createdAt: string;
  isEdited: boolean;
  editedAt: string | null;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  type: "client" | "admin";
}

interface UnreadCount {
  threadId: string;
  count: number;
}

interface Assignee {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  isCompanyMember: boolean;
  roleLabel: string | null;
}

interface CalendarDay {
  date: Date;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isBillingStart: boolean;
  isBillingEnd: boolean;
  tasks: Task[];
}

const CATEGORY_COLORS = [
  { label: "Blue", value: "#3b82f6" },
  { label: "Green", value: "#22c55e" },
  { label: "Orange", value: "#f97316" },
  { label: "Purple", value: "#a855f7" },
  { label: "Red", value: "#ef4444" },
  { label: "Yellow", value: "#eab308" },
  { label: "Pink", value: "#ec4899" },
  { label: "Teal", value: "#14b8a6" },
];

function ManageCategoriesDialog({ companyId, categories }: { companyId: string; categories: any[] }) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/companies/${companyId}/task-categories`, {
        name: newName.trim(),
        color: newColor && newColor !== "none" ? newColor : null,
        sortOrder: categories.length,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "task-categories"] });
      setNewName("");
      setNewColor("");
      toast({ title: "Category created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      await apiRequest("PATCH", `/api/task-categories/${id}`, { name, color: color || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "task-categories"] });
      setEditingId(null);
      toast({ title: "Category updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/task-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "task-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", { companyId }] });
      toast({ title: "Category deleted" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, sortOrder }: { id: string; sortOrder: number }) => {
      await apiRequest("PATCH", `/api/task-categories/${id}`, { sortOrder });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "task-categories"] });
    },
  });

  const moveCategory = (index: number, direction: "up" | "down") => {
    const sorted = [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;
    const current = sorted[index];
    const swap = sorted[swapIndex];
    reorderMutation.mutate({ id: current.id, sortOrder: swap.sortOrder ?? swapIndex });
    reorderMutation.mutate({ id: swap.id, sortOrder: current.sortOrder ?? index });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-manage-categories">
          <FolderOpen className="h-4 w-4 mr-2" />
          Categories
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Task Categories</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            {[...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((cat, idx) => (
              <div key={cat.id} className="flex items-center gap-2 p-2 rounded-md border" data-testid={`category-item-${cat.id}`}>
                {editingId === cat.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 h-8"
                      data-testid="input-edit-category-name"
                    />
                    <Select value={editColor} onValueChange={setEditColor}>
                      <SelectTrigger className="w-24 h-8">
                        <SelectValue placeholder="Color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {CATEGORY_COLORS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.value }} />
                              {c.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => {
                        if (!editName.trim()) return;
                        updateMutation.mutate({ id: cat.id, name: editName.trim(), color: editColor === "none" ? "" : editColor });
                      }}
                      data-testid="button-save-category"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col">
                      <Button size="icon" variant="ghost" className="h-5 w-5" disabled={idx === 0} onClick={() => moveCategory(idx, "up")} data-testid={`button-move-up-${cat.id}`}>
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-5 w-5" disabled={idx === categories.length - 1} onClick={() => moveCategory(idx, "down")} data-testid={`button-move-down-${cat.id}`}>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="flex items-center gap-2 flex-1 text-sm font-medium">
                      {cat.color && <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />}
                      {cat.name}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => { setEditingId(cat.id); setEditName(cat.name); setEditColor(cat.color || "none"); }}
                      data-testid={`button-edit-category-${cat.id}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteMutation.mutate(cat.id)}
                      data-testid={`button-delete-category-${cat.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">No categories yet</p>
            )}
          </div>
          <Separator />
          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New category name"
              className="flex-1"
              data-testid="input-new-category-name"
            />
            <Select value={newColor} onValueChange={setNewColor}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Color" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {CATEGORY_COLORS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.value }} />
                      {c.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => {
                if (!newName.trim()) return;
                createMutation.mutate();
              }}
              disabled={createMutation.isPending || !newName.trim()}
              data-testid="button-add-category"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CompanyDashboard() {
  const [, params] = useRoute("/admin/companies/:id");
  const companyId = params?.id;
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Parse URL query params
  const urlParams = new URLSearchParams(searchString);
  const initialTab = urlParams.get("tab") || "details";
  const initialThread = urlParams.get("thread");
  
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [companyTaskFilter, setCompanyTaskFilter] = useState<"all" | "pending" | "in_progress" | "review" | "approved" | "completed" | "rejected">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [assignedToMeFilter, setAssignedToMeFilter] = useState(false);
  const [companyTaskPage, setCompanyTaskPage] = useState(1);
  const [taskMonthDate, setTaskMonthDate] = useState(() => new Date());
  const COMPANY_TASKS_PER_PAGE = 10;
  
  // Task form state
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [deliverableType, setDeliverableType] = useState("");
  const [taskCategoryId, setTaskCategoryId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [additionalAssignees, setAdditionalAssignees] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<"day_of_month" | "day_of_week" | "biweekly">("day_of_month");
  const [recurrenceDay, setRecurrenceDay] = useState("1");
  const [recurrenceWeekday, setRecurrenceWeekday] = useState("1"); // 0-6 (Sun-Sat), default Monday
  const [recurrenceWeekOrdinal, setRecurrenceWeekOrdinal] = useState("1"); // 1-4 or -1 for last
  const [noCredit, setNoCredit] = useState(false);
  const [taskDueDate, setTaskDueDate] = useState("");
  const [recurrenceCalendarDate, setRecurrenceCalendarDate] = useState(new Date());
  const [creditOverride, setCreditOverride] = useState("");
  const [bulkQuantity, setBulkQuantity] = useState("1");
  const [taskOwnership, setTaskOwnership] = useState<"agency" | "client">("agency");
  const [createCadenceOpen, setCreateCadenceOpen] = useState(false);
  const [cadenceTitle, setCadenceTitle] = useState("");
  const [cadenceDeliverableType, setCadenceDeliverableType] = useState("");
  const [cadenceFrequency, setCadenceFrequency] = useState("monthly");
  const [cadenceAssignedTo, setCadenceAssignedTo] = useState("");
  const [cadenceCreditCost, setCadenceCreditCost] = useState("");
  const [cadenceNoCredit, setCadenceNoCredit] = useState(false);
  const [cadenceTaskOwnership, setCadenceTaskOwnership] = useState("agency");
  const [cadenceScheduledDays, setCadenceScheduledDays] = useState<string[]>([]);
  const [cadenceMonthDays, setCadenceMonthDays] = useState<number[]>([15]);
  const [selectedCadence, setSelectedCadence] = useState<any | null>(null);
  const [cadenceDetailOpen, setCadenceDetailOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignRequest | null>(null);
  const [campaignDetailOpen, setCampaignDetailOpen] = useState(false);
  const [companyCampaignTab, setCompanyCampaignTab] = useState<string>("requests");
  const [companyCampaignPages, setCompanyCampaignPages] = useState<Record<string, number>>({});
  const [campaignMonthDate, setCampaignMonthDate] = useState(() => new Date());
  const COMPANY_CAMPAIGNS_PER_PAGE = 10;
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCalendarTask, setSelectedCalendarTask] = useState<Task | null>(null);
  const [calendarView, setCalendarView] = useState<"month" | "week">("month");
  
  // Chat state - initialize from URL params if provided
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(initialThread);
  const [messageInput, setMessageInput] = useState("");
  const [messageMentions, setMessageMentions] = useState<string[]>([]);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isCompanyWide, setIsCompanyWide] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showViewMembers, setShowViewMembers] = useState(false);
  const [showMergeChat, setShowMergeChat] = useState(false);
  const [mergeConfirmThread, setMergeConfirmThread] = useState<ChatThread | null>(null);
  const [chatMemberToRemove, setChatMemberToRemove] = useState<{ threadId: string; memberId: string; name: string } | null>(null);
  const [meetingToReject, setMeetingToReject] = useState<string | null>(null);
  const [deleteThreadConfirmOpen, setDeleteThreadConfirmOpen] = useState(false);
  const [editingThreadName, setEditingThreadName] = useState(false);
  const [editThreadNameValue, setEditThreadNameValue] = useState("");
  const [chatListOpen, setChatListOpen] = useState(!initialThread);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [, setTimeTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTimeTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Invite member state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("team_member");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Credit dialog state
  const [creditOpen, setCreditOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDescription, setCreditDescription] = useState("");
  const [creditMode, setCreditMode] = useState<"add" | "subtract">("add");
  const [editCompanyOpen, setEditCompanyOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editIndustry, setEditIndustry] = useState("");
  const [editClientType, setEditClientType] = useState("");
  const [editTier, setEditTier] = useState("");
  const [editMonthlyCredits, setEditMonthlyCredits] = useState("");

  // Company data
  const { data: company, isLoading: companyLoading } = useQuery<Company>({
    queryKey: ["/api/companies", companyId],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}`);
      if (!response.ok) throw new Error("Failed to fetch company");
      return response.json();
    },
    enabled: !!companyId,
  });

  // Tasks data
  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { companyId }],
    queryFn: async () => {
      const response = await fetch(`/api/tasks?companyId=${companyId}`);
      if (!response.ok) throw new Error("Failed to fetch tasks");
      return response.json();
    },
    enabled: !!companyId,
  });

  const { data: taskCategoriesData } = useQuery<any[]>({
    queryKey: ["/api/companies", companyId, "task-categories"],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}/task-categories`);
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
    enabled: !!companyId,
  });

  const { data: deliverableTypes } = useQuery<DeliverableType[]>({
    queryKey: ["/api/deliverable-types"],
  });

  const activeDeliverables = deliverableTypes?.filter(d => d.isActive) || [];

  const { data: assignees } = useQuery<Assignee[]>({
    queryKey: ["/api/companies", companyId, "assignees"],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}/assignees`);
      if (!response.ok) throw new Error("Failed to fetch assignees");
      return response.json();
    },
    enabled: !!companyId,
  });

  const { data: transactions = [] } = useQuery<CreditTransaction[]>({
    queryKey: ["/api/credit-transactions", { companyId }],
    queryFn: async () => {
      const response = await fetch(`/api/credit-transactions?companyId=${companyId}`);
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json();
    },
    enabled: !!companyId,
  });

  const { data: cadenceList, isLoading: cadencesLoading } = useQuery<any[]>({
    queryKey: ["/api/companies", companyId, "cadences"],
  });

  const { data: onboardingData } = useQuery<ClientOnboarding | null>({
    queryKey: ["/api/companies", companyId, "onboarding"],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}/onboarding`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!companyId,
  });

  // Chat threads
  const { data: threads = [] } = useQuery<ChatThread[]>({
    queryKey: ["/api/chat/threads", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const res = await fetch(`/api/chat/threads?companyId=${companyId}`);
      if (!res.ok) throw new Error("Failed to fetch threads");
      return res.json();
    },
    enabled: !!companyId,
  });

  const { data: unreadCounts = [] } = useQuery<UnreadCount[]>({
    queryKey: ["/api/chat/unread"],
  });

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/threads", selectedThreadId, "messages"],
    queryFn: async () => {
      if (!selectedThreadId) return [];
      const res = await fetch(`/api/chat/threads/${selectedThreadId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!selectedThreadId,
  });

  interface ThreadMember {
    id: string;
    threadId: string;
    userId: string;
    isAdmin: boolean;
    actualRole?: string;
    user?: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
  }

  const { data: threadMembers = [] } = useQuery<ThreadMember[]>({
    queryKey: ["/api/chat/threads", selectedThreadId, "members"],
    queryFn: async () => {
      if (!selectedThreadId) return [];
      const res = await fetch(`/api/chat/threads/${selectedThreadId}/members`);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: !!selectedThreadId,
  });

  interface ReadReceipt {
    userId: string;
    user: { id: string; firstName: string; lastName: string } | null;
    lastReadMessageId: string | null;
    lastReadAt: string | null;
  }

  const { data: readReceipts = [] } = useQuery<ReadReceipt[]>({
    queryKey: ["/api/chat/threads", selectedThreadId, "read-receipts"],
    queryFn: async () => {
      if (!selectedThreadId) return [];
      const res = await fetch(`/api/chat/threads/${selectedThreadId}/read-receipts`);
      if (!res.ok) throw new Error("Failed to fetch read receipts");
      return res.json();
    },
    enabled: !!selectedThreadId,
  });

  const { data: chatUsers = [] } = useQuery<ChatUser[]>({
    queryKey: ["/api/companies", companyId, "chat-users"],
    queryFn: async () => {
      if (!companyId) return [];
      const res = await fetch(`/api/companies/${companyId}/chat-users`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: !!companyId,
  });

  // Company users for Users tab
  interface CompanyUserWithTags {
    id: string;
    memberId: string;
    role: string;
    email: string;
    firstName: string;
    lastName: string;
    createdAt: string;
    tags?: { id: string; name: string; color: string; isPreset: boolean }[];
  }

  const { data: companyUsers = [] } = useQuery<CompanyUserWithTags[]>({
    queryKey: ["/api/admin/companies", companyId, "users"],
    queryFn: async () => {
      if (!companyId) return [];
      const response = await fetch(`/api/admin/companies/${companyId}/users`);
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
    enabled: !!companyId,
  });

  const { data: allUserTags = [] } = useQuery<{ id: string; name: string; color: string; isPreset: boolean }[]>({
    queryKey: ["/api/admin/user-tags"],
  });

  const { data: agencyAdmins = [] } = useQuery<{ id: string; email: string; firstName: string; lastName: string }[]>({
    queryKey: ["/api/admin/users/agency-admins"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) return [];
      const data = await res.json();
      return (data.admins || []).map((a: any) => ({
        id: a.userId,
        email: a.email,
        firstName: a.firstName,
        lastName: a.lastName,
      }));
    },
  });

  const { data: companyCustomRoles = [] } = useQuery<{ id: string; name: string; companyId: string }[]>({
    queryKey: ["/api/admin/custom-roles"],
    select: (data) => data.filter(r => r.companyId === companyId),
  });

  const companyOwners = companyUsers.filter(u => u.role === "company_owner");
  const companyAdmins = companyUsers.filter(u => u.role === "company_admin");
  const teamMembers = companyUsers.filter(u => u.role === "team_member" || u.role === "custom");

  // Collapsible state for user sections
  const [ownersExpanded, setOwnersExpanded] = useState(true);
  const [adminsExpanded, setAdminsExpanded] = useState(true);
  const [membersExpanded, setMembersExpanded] = useState(true);

  // Meetings state and queries
  interface MeetingRequestWithType extends MeetingRequest {
    meetingType?: MeetingType;
  }

  const { data: companyMeetingRequests = [] } = useQuery<MeetingRequest[]>({
    queryKey: ["/api/companies", companyId, "meeting-requests"],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/meeting-requests`);
      if (!res.ok) throw new Error("Failed to fetch meeting requests");
      return res.json();
    },
    enabled: !!companyId,
  });

  const { data: companyCampaignRequests = [] } = useQuery<CampaignRequest[]>({
    queryKey: ["/api/companies", companyId, "campaign-requests"],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/campaign-requests`);
      if (!res.ok) throw new Error("Failed to fetch campaign requests");
      return res.json();
    },
    enabled: !!companyId,
  });

  const { data: meetingTypes = [] } = useQuery<MeetingType[]>({
    queryKey: ["/api/meeting-types"],
  });

  const companyMeetings: MeetingRequestWithType[] = companyMeetingRequests.map(r => ({
    ...r,
    meetingType: meetingTypes.find(t => t.id === r.meetingTypeId),
  }));

  const [meetingStatusFilter, setMeetingStatusFilter] = useState<string>("pending");
  const [expandedCompanyMeetings, setExpandedCompanyMeetings] = useState<Set<string>>(new Set());
  const [createMeetingOpen, setCreateMeetingOpen] = useState(false);
  const [newMeetingTypeId, setNewMeetingTypeId] = useState("");
  const [newMeetingTitle, setNewMeetingTitle] = useState("");
  const [newMeetingDescription, setNewMeetingDescription] = useState("");
  const [newMeetingDuration, setNewMeetingDuration] = useState("");
  const [newMeetingDate, setNewMeetingDate] = useState("");
  const [newMeetingTimeHour, setNewMeetingTimeHour] = useState("");
  const [newMeetingTimeMinute, setNewMeetingTimeMinute] = useState("");
  const [newMeetingTimePeriod, setNewMeetingTimePeriod] = useState("");
  const [newMeetingAttendees, setNewMeetingAttendees] = useState<string[]>([]);
  const [editingMeetingNotesId, setEditingMeetingNotesId] = useState<string | null>(null);
  const [meetingNotesText, setMeetingNotesText] = useState("");
  const [companyApproveDialogOpen, setCompanyApproveDialogOpen] = useState(false);
  const [companyEditMeetingDialogOpen, setCompanyEditMeetingDialogOpen] = useState(false);
  const [selectedMeetingRequest, setSelectedMeetingRequest] = useState<MeetingRequestWithType | null>(null);
  const [meetingTeamsLink, setMeetingTeamsLink] = useState("");
  const [meetingAdminNotes, setMeetingAdminNotes] = useState("");
  const [editMeetingDate, setEditMeetingDate] = useState("");
  const [editMeetingTimeHour, setEditMeetingTimeHour] = useState("");
  const [editMeetingTimeMinute, setEditMeetingTimeMinute] = useState("");
  const [editMeetingTimePeriod, setEditMeetingTimePeriod] = useState("");
  const [editMeetingCredits, setEditMeetingCredits] = useState("");
  const [editMeetingDuration, setEditMeetingDuration] = useState("");

  const filteredCompanyMeetings = companyMeetings.filter(m => {
    return m.status === meetingStatusFilter;
  });

  const pendingMeetingsCount = companyMeetings.filter(m => m.status === "pending").length;
  const approvedMeetingsCount = companyMeetings.filter(m => m.status === "approved").length;
  const completedMeetingsCount = companyMeetings.filter(m => m.status === "completed").length;
  const rejectedMeetingsCount = companyMeetings.filter(m => m.status === "rejected").length;

  const toggleCompanyMeetingExpanded = (id: string) => {
    const newSet = new Set(expandedCompanyMeetings);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setExpandedCompanyMeetings(newSet);
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

  const openEditMeetingDialog = (meeting: MeetingRequestWithType) => {
    setSelectedMeetingRequest(meeting);
    setEditMeetingDate(meeting.proposedDate);
    const timeParts = parseTimeToComponents(meeting.proposedTime);
    setEditMeetingTimeHour(timeParts.hour);
    setEditMeetingTimeMinute(timeParts.minute);
    setEditMeetingTimePeriod(timeParts.period);
    setEditMeetingCredits(meeting.creditCost);
    setEditMeetingDuration(String(meeting.duration));
    setMeetingTeamsLink(meeting.teamsLink || "");
    setCompanyEditMeetingDialogOpen(true);
  };

  const companyApproveMutation = useMutation({
    mutationFn: async ({ id, teamsLink, adminNotes, proposedDate, proposedTime, creditCost, duration }: { id: string; teamsLink: string; adminNotes: string; proposedDate?: string; proposedTime?: string; creditCost?: string; duration?: number }) => {
      const body: Record<string, any> = { status: "approved", teamsLink, adminNotes };
      if (proposedDate) body.proposedDate = proposedDate;
      if (proposedTime) body.proposedTime = proposedTime;
      if (creditCost) body.creditCost = creditCost;
      if (duration) body.duration = duration;
      return apiRequest("PATCH", `/api/meeting-requests/${id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "meeting-requests"] });
      toast({ title: "Meeting request approved" });
      setCompanyApproveDialogOpen(false);
      setSelectedMeetingRequest(null);
      setMeetingTeamsLink("");
      setMeetingAdminNotes("");
    },
    onError: () => {
      toast({ title: "Failed to approve meeting request", variant: "destructive" });
    },
  });

  const companyEditMeetingMutation = useMutation({
    mutationFn: async ({ id, proposedDate, proposedTime, creditCost, duration, teamsLink }: { id: string; proposedDate: string; proposedTime: string; creditCost: string; duration: number; teamsLink: string }) => {
      return apiRequest("PATCH", `/api/meeting-requests/${id}`, { proposedDate, proposedTime, creditCost, duration, teamsLink });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "meeting-requests"] });
      toast({ title: "Meeting updated successfully" });
      setCompanyEditMeetingDialogOpen(false);
      setSelectedMeetingRequest(null);
    },
    onError: () => {
      toast({ title: "Failed to update meeting", variant: "destructive" });
    },
  });

  const companyRejectMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/meeting-requests/${id}`, { status: "rejected" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "meeting-requests"] });
      toast({ title: "Meeting request rejected" });
    },
    onError: () => {
      toast({ title: "Failed to reject meeting request", variant: "destructive" });
    },
  });

  const saveMeetingNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      return apiRequest("PATCH", `/api/meeting-requests/${id}`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "meeting-requests"] });
      toast({ title: "Meeting notes saved" });
      setEditingMeetingNotesId(null);
      setMeetingNotesText("");
    },
    onError: () => {
      toast({ title: "Failed to save notes", variant: "destructive" });
    },
  });

  const resetCreateMeetingForm = () => {
    setNewMeetingTypeId("");
    setNewMeetingTitle("");
    setNewMeetingDescription("");
    setNewMeetingDuration("");
    setNewMeetingDate("");
    setNewMeetingTimeHour("");
    setNewMeetingTimeMinute("");
    setNewMeetingTimePeriod("");
    setNewMeetingAttendees([]);
  };

  const handleNewMeetingTypeChange = (typeId: string) => {
    setNewMeetingTypeId(typeId);
    const type = meetingTypes.find(t => t.id === typeId);
    if (type) {
      setNewMeetingTitle(type.name);
      setNewMeetingDuration(String(type.defaultDuration));
    }
  };

  const createMeetingMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/companies/${companyId}/meeting-requests`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "meeting-requests"] });
      toast({ title: "Meeting created successfully" });
      setCreateMeetingOpen(false);
      resetCreateMeetingForm();
    },
    onError: () => {
      toast({ title: "Failed to create meeting", variant: "destructive" });
    },
  });

  const handleCreateMeetingSubmit = () => {
    if (!newMeetingTypeId) {
      toast({ title: "Please select a meeting type", variant: "destructive" });
      return;
    }
    if (!newMeetingTitle.trim()) {
      toast({ title: "Please enter a meeting title", variant: "destructive" });
      return;
    }
    const proposedTime = computeMeetingTime(newMeetingTimeHour, newMeetingTimeMinute, newMeetingTimePeriod);
    if (!newMeetingDate || !proposedTime) {
      toast({ title: "Please select a date and time", variant: "destructive" });
      return;
    }

    createMeetingMutation.mutate({
      meetingTypeId: newMeetingTypeId,
      title: newMeetingTitle,
      description: newMeetingDescription,
      proposedDate: newMeetingDate,
      proposedTime,
      duration: parseInt(newMeetingDuration) || 30,
      attendeeIds: newMeetingAttendees,
    });
  };

  const generateMeetingOutlookLink = (request: MeetingRequest): string => {
    const startDate = new Date(`${request.proposedDate}T${request.proposedTime}`);
    const endDate = new Date(startDate.getTime() + request.duration * 60000);
    const formatForOutlook = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    let body = request.description || "";
    if (request.teamsLink) body += `\n\nTeams Meeting Link: ${request.teamsLink}`;
    const urlParams2 = new URLSearchParams({
      subject: request.title,
      body,
      startdt: formatForOutlook(startDate),
      enddt: formatForOutlook(endDate),
    });
    return `https://outlook.office.com/calendar/0/deeplink/compose?${urlParams2.toString()}`;
  };

  const getMeetingStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved": return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected": return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case "completed": return <Badge className="bg-blue-500"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatMeetingDateTime = (request: MeetingRequest) => {
    const date = new Date(request.proposedDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    return `${date} ${request.proposedTime}`;
  };

  const companyPendingMeetings = companyMeetings.filter(m => m.status === "pending").length;

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/tasks", data);
      const task = await response.json();
      if (additionalAssignees.length > 0) {
        await Promise.all(
          additionalAssignees.map((userId) =>
            apiRequest("POST", `/api/tasks/${task.id}/assignees`, { userId })
          )
        );
      }
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", { companyId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
      setTaskOpen(false);
      resetTaskForm();
      toast({ title: "Task assigned successfully" });
    },
    onError: () => {
      toast({ title: "Failed to assign task", variant: "destructive" });
    },
  });

  const toggleTaskCompletionMutation = useMutation({
    mutationFn: async ({ taskId, isCompleted }: { taskId: string; isCompleted: boolean }) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}`, {
        status: isCompleted ? "completed" : "pending",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", { companyId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
    },
    onError: () => {
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, mentions }: { content: string; mentions: string[] }) => {
      if (!selectedThreadId) throw new Error("No thread selected");
      return apiRequest("POST", `/api/chat/threads/${selectedThreadId}/messages`, { content, mentions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads", selectedThreadId, "messages"] });
      setMessageInput("");
      setMessageMentions([]);
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const closeThreadMutation = useMutation({
    mutationFn: async ({ threadId, action }: { threadId: string; action: "close" | "reopen" }) => {
      return apiRequest("POST", `/api/chat/threads/${threadId}/${action}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads", companyId] });
      toast({ title: "Chat updated" });
    },
    onError: () => {
      toast({ title: "Failed to update chat", variant: "destructive" });
    },
  });

  const renameThreadMutation = useMutation({
    mutationFn: async ({ threadId, name }: { threadId: string; name: string }) => {
      return apiRequest("PATCH", `/api/chat/threads/${threadId}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads", companyId] });
      setEditingThreadName(false);
      toast({ title: "Chat renamed" });
    },
    onError: () => {
      toast({ title: "Failed to rename chat", variant: "destructive" });
    },
  });

  const deleteThreadMutation = useMutation({
    mutationFn: async (threadId: string) => {
      return apiRequest("DELETE", `/api/chat/threads/${threadId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads", companyId] });
      setSelectedThreadId(null);
      toast({ title: "Chat deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete chat", variant: "destructive" });
    },
  });

  const mergeChatMutation = useMutation({
    mutationFn: async ({ targetThreadId, sourceThreadId }: { targetThreadId: string; sourceThreadId: string }) => {
      return apiRequest("POST", "/api/admin/chat/merge", { targetThreadId, sourceThreadId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads", companyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads", selectedThreadId, "messages"] });
      setShowMergeChat(false);
      toast({ title: "Chats merged successfully" });
    },
    onError: () => {
      toast({ title: "Failed to merge chats", variant: "destructive" });
    },
  });

  const removeChatMemberMutation = useMutation({
    mutationFn: async ({ threadId, memberId }: { threadId: string; memberId: string }) => {
      return apiRequest("DELETE", `/api/chat/threads/${threadId}/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads", selectedThreadId, "members"] });
      toast({ title: "Member removed from chat" });
    },
    onError: () => {
      toast({ title: "Failed to remove member", variant: "destructive" });
    },
  });

  const createThreadMutation = useMutation({
    mutationFn: async (data: { name?: string; memberIds: string[]; isCompanyWide: boolean }): Promise<ChatThread> => {
      if (!companyId) throw new Error("No company selected");
      const res = await apiRequest("POST", "/api/chat/threads", {
        companyId,
        name: data.name || null,
        type: "general",
        memberIds: data.memberIds,
        isCompanyWide: data.isCompanyWide,
      });
      return res.json();
    },
    onSuccess: (newThread: ChatThread) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads", companyId] });
      setNewChatOpen(false);
      setNewChatName("");
      setSelectedMembers([]);
      setIsCompanyWide(false);
      setSelectedThreadId(newThread.id);
      setEditingThreadName(false);
      toast({ title: "Chat created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create chat", variant: "destructive" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      if (!selectedThreadId) throw new Error("No thread selected");
      return apiRequest("POST", `/api/chat/threads/${selectedThreadId}/read`, { messageId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/unread"] });
    },
  });

  const createCadenceMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/companies/${companyId}/cadences`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "cadences"] });
      toast({ title: "Cadence created successfully" });
      setCreateCadenceOpen(false);
      setCadenceTitle("");
      setCadenceDeliverableType("");
      setCadenceFrequency("monthly");
      setCadenceAssignedTo("");
      setCadenceCreditCost("");
      setCadenceNoCredit(false);
      setCadenceTaskOwnership("agency");
      setCadenceScheduledDays([]);
      setCadenceMonthDays([15]);
    },
    onError: () => {
      toast({ title: "Failed to create cadence", variant: "destructive" });
    },
  });

  const cancelCadenceMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/cadences/${id}`, { cancel: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "cadences"] });
      toast({ title: "Cadence removed" });
      setCadenceDetailOpen(false);
      setSelectedCadence(null);
    },
    onError: () => {
      toast({ title: "Failed to cancel cadence", variant: "destructive" });
    },
  });

  const updateCadenceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/cadences/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "cadences"] });
      toast({ title: "Cadence updated" });
    },
    onError: () => {
      toast({ title: "Failed to update cadence", variant: "destructive" });
    },
  });

  const startNowMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/cadences/${id}/start-now`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "cadences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", { companyId }] });
      toast({ title: `${data.tasksCreated} task(s) created for remaining month` });
    },
    onError: () => {
      toast({ title: "Failed to start cadence", variant: "destructive" });
    },
  });

  const startEntireMonthMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/cadences/${id}/start-entire-month`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "cadences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", { companyId }] });
      toast({ title: `${data.tasksCreated} task(s) created for entire month` });
    },
    onError: () => {
      toast({ title: "Failed to generate cadence tasks for entire month", variant: "destructive" });
    },
  });

  const pauseCompanyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/companies/${companyId}/pause`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Company paused", description: "Client access has been suspended." });
    },
    onError: () => {
      toast({ title: "Failed to pause company", variant: "destructive" });
    },
  });

  const resumeCompanyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/companies/${companyId}/resume`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Company resumed", description: "Client access has been restored with full credits." });
    },
    onError: () => {
      toast({ title: "Failed to resume company", variant: "destructive" });
    },
  });

  const editCompanyMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await apiRequest("PATCH", `/api/companies/${companyId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setEditCompanyOpen(false);
      toast({ title: "Company updated", description: "Company details have been saved." });
    },
    onError: () => {
      toast({ title: "Failed to update company", variant: "destructive" });
    },
  });

  const handleEditCompanyOpen = () => {
    if (company) {
      setEditName(company.name);
      setEditIndustry(company.industry || "");
      setEditClientType(company.clientType);
      setEditTier(company.subscriptionTier);
      setEditMonthlyCredits(String(company.monthlyCredits));
      setEditCompanyOpen(true);
    }
  };

  const handleEditCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    const tierCredits: Record<string, number> = { essentials: 20, growth: 40, accelerator: 60 };
    const monthlyCredits = parseInt(editMonthlyCredits) || tierCredits[editTier] || 20;
    editCompanyMutation.mutate({
      name: editName.trim(),
      industry: editIndustry.trim(),
      clientType: editClientType,
      subscriptionTier: editTier,
      monthlyCredits,
    });
  };

  const updateLogoMutation = useMutation({
    mutationFn: async (logoUrl: string) => {
      return apiRequest("PATCH", `/api/companies/${companyId}`, { logoUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
      toast({ title: "Company logo updated" });
    },
    onError: () => {
      toast({ title: "Failed to update logo", variant: "destructive" });
    },
  });

  const { uploadFile, isUploading: logoUploading } = useUpload({
    onSuccess: (response) => {
      updateLogoMutation.mutate(response.objectPath);
    },
    onError: (error) => {
      toast({ title: "Failed to upload logo", description: error.message, variant: "destructive" });
    },
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Please select an image file", variant: "destructive" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File size must be under 5MB", variant: "destructive" });
        return;
      }
      uploadFile(file);
    }
  };

  const createInviteMutation = useMutation({
    mutationFn: async (data: { companyId: string; email?: string; role: string }) => {
      const response = await apiRequest("POST", "/api/invitations", data);
      return response.json();
    },
    onSuccess: (data) => {
      const link = `${window.location.origin}/signup?invite=${data.token}`;
      setInviteLink(link);
      toast({ title: "Invitation created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create invitation", variant: "destructive" });
    },
  });

  const sendInviteEmailMutation = useMutation({
    mutationFn: async (data: { companyId: string; email: string; role: string }) => {
      const response = await apiRequest("POST", "/api/invitations", data);
      return response.json();
    },
    onSuccess: () => {
      setInviteEmail("");
      toast({ title: "Invitation sent successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies", companyId, "users"] });
    },
    onError: () => {
      toast({ title: "Failed to send invitation", variant: "destructive" });
    },
  });

  const handleSendInviteEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !inviteEmail.trim()) return;
    sendInviteEmailMutation.mutate({
      companyId,
      email: inviteEmail,
      role: inviteRole,
    });
  };

  const handleGenerateInviteLink = () => {
    if (!companyId) return;
    createInviteMutation.mutate({
      companyId,
      role: inviteRole,
    });
  };

  interface CompanyInvitationData {
    id: string;
    email: string | null;
    role: string;
    expiresAt: string;
    usedAt: string | null;
    createdAt: string;
  }

  const { data: companyInvitations = [] } = useQuery<CompanyInvitationData[]>({
    queryKey: ["/api/companies", companyId, "invitations"],
    enabled: !!companyId,
  });

  const pendingCompanyInvitations = companyInvitations.filter(
    inv => !inv.usedAt && new Date(inv.expiresAt) > new Date()
  );

  const cancelCompanyInvitationMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/invitations/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Invitation cancelled" });
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "invitations"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to cancel invitation", description: err.message, variant: "destructive" });
    },
  });

  const copyInviteLink = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      toast({ title: "Link copied to clipboard" });
    }
  };

  const addCreditsMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/credit-transactions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credit-transactions", { companyId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
      setCreditOpen(false);
      setCreditAmount("");
      setCreditDescription("");
      setCreditMode("add");
      toast({ title: creditMode === "add" ? "Credits added successfully" : "Credits subtracted successfully" });
    },
    onError: () => {
      toast({ title: creditMode === "add" ? "Failed to add credits" : "Failed to subtract credits", variant: "destructive" });
    },
  });

  const handleAddCredits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditAmount || !creditDescription.trim() || !companyId) return;
    addCreditsMutation.mutate({
      companyId,
      amount: creditAmount,
      type: creditMode === "add" ? "credit" : "debit",
      description: creditDescription,
    });
  };

  // Helper functions
  const resetTaskForm = () => {
    setTaskTitle("");
    setTaskDescription("");
    setTaskPriority("medium");
    setDeliverableType("");
    setAssignedTo("");
    setAdditionalAssignees([]);
    setIsRecurring(false);
    setRecurrenceDay("1");
    setNoCredit(false);
    setTaskDueDate("");
    setCreditOverride("");
    setBulkQuantity("1");
    setTaskOwnership("agency");
    setTaskCategoryId("");
  };

  const handleToggleComplete = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    const isCompleted = task.status !== "completed";
    toggleTaskCompletionMutation.mutate({ taskId: task.id, isCompleted });
  };

  const handleAssignTask = () => {
    if (!taskTitle || !deliverableType) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }
    const selectedDeliverable = activeDeliverables.find(d => d.key === deliverableType);
    const perUnitCredits = creditOverride !== "" ? creditOverride : (selectedDeliverable?.credits || "0");
    const finalCreditCost = taskOwnership === "client" ? "0" : (noCredit ? "0" : perUnitCredits);
    const qty = parseInt(bulkQuantity) || 1;
    createTaskMutation.mutate({
      companyId,
      title: taskTitle,
      description: taskDescription || null,
      priority: taskPriority,
      deliverableType: deliverableType,
      creditCost: finalCreditCost,
      status: "pending",
      type: "assigned",
      assignedTo: assignedTo || null,
      dueDate: taskDueDate || null,
      isRecurring,
      recurrencePattern: isRecurring ? recurrencePattern : null,
      recurrenceDay: isRecurring && recurrencePattern === "day_of_month" ? parseInt(recurrenceDay) : null,
      recurrenceWeekday: isRecurring && (recurrencePattern === "day_of_week" || recurrencePattern === "biweekly") ? parseInt(recurrenceWeekday) : null,
      recurrenceWeekOrdinal: isRecurring && recurrencePattern === "day_of_week" ? parseInt(recurrenceWeekOrdinal) : null,
      bulkQuantity: qty > 1 ? qty : null,
      taskOwnership,
      categoryId: taskCategoryId && taskCategoryId !== "none" ? taskCategoryId : null,
    });
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageInput.trim()) return;
    sendMessageMutation.mutate({ content: messageInput.trim(), mentions: messageMentions });
  };

  const handleCreateChat = () => {
    if (!newChatName.trim()) {
      toast({ title: "Please enter a name for the chat", variant: "destructive" });
      return;
    }
    if (selectedMembers.length === 0 && !isCompanyWide) {
      toast({ title: "Please select at least one member", variant: "destructive" });
      return;
    }
    createThreadMutation.mutate({
      name: newChatName.trim(),
      memberIds: selectedMembers,
      isCompanyWide,
    });
  };

  // Update state when URL params change
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const tabParam = params.get("tab");
    const threadParam = params.get("thread");
    
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
    if (threadParam && threadParam !== selectedThreadId) {
      setSelectedThreadId(threadParam);
    }
  }, [searchString]);

  // Auto-scroll messages
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      const lastMessage = messages[messages.length - 1];
      markReadMutation.mutate(lastMessage.id);
    }
  }, [messages]);

  // Billing period (needed for task/meeting/campaign calculations below)
  const billingStartDay = company?.billingStartDay || 1;
  const billingPeriod = getBillingPeriod(billingStartDay, currentDate);

  // Task calculations
  const activeTasks = (tasks || []).filter(t => t.status !== "completed" && t.approvalStatus !== "rejected");
  const completedTasks = (tasks || []).filter(t => t.status === "completed");
  const pendingApprovalTasks = (tasks || []).filter((t) => t.approvalStatus === "pending_approval");

  const currentBillingPeriodTasks = (tasks || []).filter(task => {
    if (!billingPeriod) return true;
    return isTaskInBillingPeriod(task, billingPeriod);
  });

  const projectedTaskCredits = currentBillingPeriodTasks
    .filter(t => {
      if (t.status === "cancelled" || t.status === "rejected" || t.approvalStatus === "rejected" || t.noCredit) return false;
      if (t.status === "completed" && !t.creditsDeducted) return false;
      if (t.status === "completed" && t.completedAt && billingPeriod) {
        return isDateInBillingPeriod(new Date(t.completedAt), billingPeriod);
      }
      return true;
    })
    .reduce((sum, task) => sum + parseFloat(task.creditCost), 0);

  const projectedMeetingCredits = (companyMeetingRequests || [])
    .filter(m => {
      if (m.status === "cancelled" || m.status === "rejected") return false;
      if (!billingPeriod) return true;
      const meetingDate = m.proposedDate ? parseLocalDate(m.proposedDate) : new Date(m.createdAt);
      return isDateInBillingPeriod(meetingDate, billingPeriod);
    })
    .reduce((sum, m) => sum + parseFloat(m.creditCost), 0);

  const projectedCampaignCredits = (companyCampaignRequests || [])
    .filter(c => {
      if (c.status !== "pending") return false;
      if (!billingPeriod) return true;
      const campaignDate = new Date(c.createdAt);
      return isDateInBillingPeriod(campaignDate, billingPeriod);
    })
    .reduce((sum, c) => sum + parseFloat(c.estimatedCredits), 0);

  const projectedCredits = projectedTaskCredits + projectedMeetingCredits + projectedCampaignCredits;

  const filteredCompanyTasks = useMemo(() => {
    if (!tasks) return [];
    let filtered = tasks.filter(t => t.status !== "cadence_parent");
    if (assignedToMeFilter && user?.id) {
      filtered = filtered.filter(t => t.assignedTo === user.id);
    }
    if (companyTaskFilter === "rejected") {
      filtered = filtered.filter(t => t.approvalStatus === "rejected");
    } else if (companyTaskFilter === "all") {
      filtered = filtered.filter(t => t.status !== "completed" && t.approvalStatus !== "rejected");
    } else if (companyTaskFilter === "completed") {
      filtered = filtered.filter(t => t.status === "completed" && t.approvalStatus !== "rejected");
    } else {
      filtered = filtered.filter(t => t.status === companyTaskFilter && t.approvalStatus !== "rejected");
    }
    {
      const year = taskMonthDate.getFullYear();
      const month = taskMonthDate.getMonth() + 1;
      const todayStr = new Date().toISOString().slice(0, 10);
      filtered = filtered.filter(t => {
        // Overdue + incomplete tasks are always visible regardless of selected month
        const isIncomplete = t.status !== "completed" && t.approvalStatus !== "rejected";
        if (isIncomplete && t.dueDate && t.dueDate.slice(0, 10) < todayStr) return true;
        if (!t.dueDate) {
          if (t.status === "completed" && t.completedAt) {
            const cd = new Date(t.completedAt);
            return cd.getFullYear() === year && cd.getMonth() + 1 === month;
          }
          return true;
        }
        const d = parseLocalDate(t.dueDate);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      });
    }
    if (categoryFilter !== "all") {
      if (categoryFilter === "uncategorized") {
        filtered = filtered.filter(t => !t.categoryId);
      } else {
        filtered = filtered.filter(t => t.categoryId === categoryFilter);
      }
    }
    filtered.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime();
    });
    return filtered;
  }, [tasks, companyTaskFilter, taskMonthDate, assignedToMeFilter, user?.id, categoryFilter]);

  const companyTaskCounts = useMemo(() => {
    if (!tasks) return { all: 0, pending: 0, in_progress: 0, completed: 0, review: 0, rejected: 0 };
    const selectedMonthStart = `${taskMonthDate.getFullYear()}-${String(taskMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
    const nextMonth = taskMonthDate.getMonth() === 11 ? 0 : taskMonthDate.getMonth() + 1;
    const nextMonthYear = taskMonthDate.getMonth() === 11 ? taskMonthDate.getFullYear() + 1 : taskMonthDate.getFullYear();
    const selectedMonthEnd = `${nextMonthYear}-${String(nextMonth + 1).padStart(2, '0')}-01`;

    const todayStr = new Date().toISOString().slice(0, 10);
    let normalTasks = tasks.filter(t => {
      if (t.status === "cadence_parent") return false;
      // Overdue + incomplete tasks always count regardless of selected month
      const isIncomplete = t.status !== "completed" && t.approvalStatus !== "rejected";
      if (isIncomplete && t.dueDate && t.dueDate.slice(0, 10) < todayStr) return true;
      const taskDate = t.billingPeriodStart || t.dueDate || t.createdAt;
      if (!taskDate) return true;
      const dateStr = taskDate.slice(0, 10);
      return dateStr >= selectedMonthStart && dateStr < selectedMonthEnd;
    });
    if (assignedToMeFilter && user?.id) {
      normalTasks = normalTasks.filter(t => t.assignedTo === user.id);
    }
    const nonRejected = normalTasks.filter(t => t.approvalStatus !== "rejected");
    return {
      all: nonRejected.filter(t => t.status !== "completed").length,
      pending: nonRejected.filter(t => t.status === "pending").length,
      in_progress: nonRejected.filter(t => t.status === "in_progress").length,
      completed: nonRejected.filter(t => t.status === "completed").length,
      review: nonRejected.filter(t => t.status === "review").length,
      approved: nonRejected.filter(t => t.status === "approved").length,
      rejected: normalTasks.filter(t => t.approvalStatus === "rejected").length,
    };
  }, [tasks, assignedToMeFilter, user?.id, taskMonthDate]);

  const companyTotalPages = Math.max(1, Math.ceil(filteredCompanyTasks.length / COMPANY_TASKS_PER_PAGE));
  const paginatedCompanyTasks = filteredCompanyTasks.slice((companyTaskPage - 1) * COMPANY_TASKS_PER_PAGE, companyTaskPage * COMPANY_TASKS_PER_PAGE);

  // Calendar calculations

  const getTaskDateStr = (dueDate: string | null) => {
    if (!dueDate) return null;
    return dueDate.split(' ')[0].split('T')[0];
  };

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDay = firstDayOfMonth.getDay();
    const totalDays = lastDayOfMonth.getDate();
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      date.setHours(0, 0, 0, 0);
      days.push({
        date,
        dayNum: date.getDate(),
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        isBillingStart: date.getDate() === billingStartDay,
        isBillingEnd: date.getDate() === billingStartDay - 1,
        tasks: [],
      });
    }

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      const dayTasks = (tasks || []).filter(t => getTaskDateStr(t.dueDate) === dateStr);
      days.push({
        date,
        dayNum: day,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        isBillingStart: day === billingStartDay,
        isBillingEnd: day === billingStartDay - 1 || (billingStartDay === 1 && day === totalDays),
        tasks: dayTasks,
      });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      date.setHours(0, 0, 0, 0);
      days.push({
        date,
        dayNum: i,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        isBillingStart: i === billingStartDay,
        isBillingEnd: i === billingStartDay - 1,
        tasks: [],
      });
    }

    return days;
  }, [currentDate, tasks, billingStartDay]);

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setCurrentDate(newDate);
  };

  const weekDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const days: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      const dayTasks = (tasks || []).filter(t => getTaskDateStr(t.dueDate) === dateStr);
      
      days.push({
        date,
        dayNum: date.getDate(),
        isCurrentMonth: date.getMonth() === currentDate.getMonth(),
        isToday: date.getTime() === today.getTime(),
        isBillingStart: date.getDate() === billingStartDay,
        isBillingEnd: date.getDate() === billingStartDay - 1,
        tasks: dayTasks,
      });
    }
    return days;
  }, [currentDate, tasks, billingStartDay]);

  const getWeekRangeText = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const startMonth = startOfWeek.toLocaleDateString("en-US", { month: "short" });
    const endMonth = endOfWeek.toLocaleDateString("en-US", { month: "short" });
    const year = endOfWeek.getFullYear();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startOfWeek.getDate()} - ${endOfWeek.getDate()}, ${year}`;
    }
    return `${startMonth} ${startOfWeek.getDate()} - ${endMonth} ${endOfWeek.getDate()}, ${year}`;
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 6; hour <= 20; hour++) {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      slots.push(`${displayHour}:00 ${ampm}`);
    }
    return slots;
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/50";
      case "in_progress": return "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/50";
      case "review": return "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/50";
      case "approved": return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/50";
      case "cancelled": return "bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/50";
      default: return "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/50";
    }
  };

  // Separate threads by type
  const generalThreads = threads.filter(t => t.type !== "task");
  const taskThreads = threads.filter(t => t.type === "task");

  const getUnreadCount = (threadId: string) => {
    return unreadCounts.find(u => u.threadId === threadId)?.count || 0;
  };

  const formatTime = (date: string) => {
    return formatMessageTime(date);
  };

  // Render priority badge
  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    };
    return <Badge className={variants[priority] || variants.medium}>{priority}</Badge>;
  };

  const formatDueDate = (dueDate: string | null, status?: string) => {
    if (!dueDate) return "No due date";
    const date = parseLocalDate(dueDate);
    if (status === "completed" || status === "rejected") {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
    if (diffDays === 0) return "Due today";
    if (diffDays === 1) return "Due tomorrow";
    if (diffDays <= 7) return `Due in ${diffDays} days`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getDueDateColor = (dueDate: string | null, status: string) => {
    if (status === "completed" || status === "rejected") return "text-muted-foreground";
    if (!dueDate) return "text-muted-foreground";
    const date = parseLocalDate(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "text-destructive font-medium";
    if (diffDays === 0) return "text-orange-600 dark:text-orange-400 font-medium";
    if (diffDays <= 3) return "text-yellow-600 dark:text-yellow-400";
    return "text-muted-foreground";
  };

  const getStatusIcon = (status: string, approvalStatus?: string | null) => {
    if (approvalStatus === "rejected") {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    if (status === "completed") {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    if (status === "in_progress") {
      return <Clock className="h-4 w-4 text-blue-600" />;
    }
    if (status === "review") {
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
    if (status === "approved") {
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    }
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  if (companyLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b">
          <div className="flex h-14 items-center px-4 gap-4">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-6 w-48" />
          </div>
        </div>
        <div className="p-6 space-y-4">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Company not found</p>
            <div className="mt-4 text-center">
              <Link href="/admin/dashboard">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="flex items-center px-4 py-2 gap-4">
          <Link href="/admin/companies">
            <Button variant="ghost" size="sm" data-testid="button-back-dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="relative group">
            <Avatar className="h-14 w-14 border-2 border-border">
              {company.logoUrl ? (
                <AvatarImage src={company.logoUrl} alt={company.name} />
              ) : null}
              <AvatarFallback className="bg-muted">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
              <Upload className="h-5 w-5 text-white" />
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleLogoUpload}
                disabled={logoUploading || updateLogoMutation.isPending}
                data-testid="input-logo-upload"
              />
            </label>
          </div>
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            <h1 className="text-lg font-semibold" data-testid="text-company-name">{company.name}</h1>
            <Badge variant="outline">{company.subscriptionTier}</Badge>
            {company.isPaused && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Paused
              </Badge>
            )}
            <Dialog open={editCompanyOpen} onOpenChange={setEditCompanyOpen}>
              <Button variant="ghost" size="icon" onClick={handleEditCompanyOpen} data-testid="button-edit-company">
                <Pencil className="h-4 w-4" />
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Company Details</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleEditCompanySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="editName">Company Name</Label>
                    <Input
                      id="editName"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Company name"
                      data-testid="input-edit-company-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editIndustry">Industry</Label>
                    <Input
                      id="editIndustry"
                      value={editIndustry}
                      onChange={(e) => setEditIndustry(e.target.value)}
                      placeholder="e.g., Technology, Healthcare"
                      data-testid="input-edit-company-industry"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Type</Label>
                    <Select value={editClientType} onValueChange={setEditClientType}>
                      <SelectTrigger data-testid="select-edit-client-type">
                        <SelectValue placeholder="Select client type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="government">Government</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subscription Tier</Label>
                    <Select value={editTier} onValueChange={(val) => {
                      setEditTier(val);
                      const tierCredits: Record<string, string> = { essentials: "20", growth: "40", accelerator: "60" };
                      setEditMonthlyCredits(tierCredits[val] || editMonthlyCredits);
                    }}>
                      <SelectTrigger data-testid="select-edit-tier">
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="essentials">Essentials - $2,500/mo</SelectItem>
                        <SelectItem value="growth">Growth - $5,000/mo</SelectItem>
                        <SelectItem value="accelerator">Accelerator - $7,000/mo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editMonthlyCredits">Monthly Credits</Label>
                    <Input
                      id="editMonthlyCredits"
                      type="number"
                      value={editMonthlyCredits}
                      onChange={(e) => setEditMonthlyCredits(e.target.value)}
                      placeholder="Credits per month"
                      data-testid="input-edit-monthly-credits"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={editCompanyMutation.isPending} data-testid="button-save-company">
                    {editCompanyMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <CreditCard className="h-3 w-3" />
              {company.credits} credits
            </Badge>
            <Dialog open={creditOpen} onOpenChange={setCreditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-add-credits">
                  <Coins className="w-4 h-4 mr-2" />
                  Add Credits
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Manage Credits — {company.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddCredits} className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={creditMode === "add" ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => setCreditMode("add")}
                      data-testid="button-credit-mode-add"
                    >
                      Add Credits
                    </Button>
                    <Button
                      type="button"
                      variant={creditMode === "subtract" ? "destructive" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => setCreditMode("subtract")}
                      data-testid="button-credit-mode-subtract"
                    >
                      Subtract Credits
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="creditAmount">Amount</Label>
                    <Input
                      id="creditAmount"
                      type="number"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      placeholder="Enter credit amount"
                      data-testid="input-credit-amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="creditDescription">Description</Label>
                    <Input
                      id="creditDescription"
                      value={creditDescription}
                      onChange={(e) => setCreditDescription(e.target.value)}
                      placeholder={creditMode === "add" ? "e.g., Monthly allocation, Bonus credits" : "e.g., Credit correction, Overcharge fix"}
                      data-testid="input-credit-description"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    variant={creditMode === "subtract" ? "destructive" : "default"}
                    disabled={addCreditsMutation.isPending}
                    data-testid="button-submit-credits"
                  >
                    {addCreditsMutation.isPending
                      ? (creditMode === "add" ? "Adding..." : "Subtracting...")
                      : (creditMode === "add" ? "Add Credits" : "Subtract Credits")}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            {company.isPaused ? (
              <Button
                variant="default"
                size="sm"
                onClick={() => resumeCompanyMutation.mutate()}
                disabled={resumeCompanyMutation.isPending}
                data-testid="button-resume-company"
              >
                <Play className="h-4 w-4 mr-1" />
                {resumeCompanyMutation.isPending ? "Resuming..." : "Resume"}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => pauseCompanyMutation.mutate()}
                disabled={pauseCompanyMutation.isPending}
                data-testid="button-pause-company"
              >
                <Pause className="h-4 w-4 mr-1" />
                {pauseCompanyMutation.isPending ? "Pausing..." : "Pause"}
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>
      {/* Main Content with Tabs */}
      <div className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <MobileTabMenu
            tabs={[
              { value: "details", label: "Details" },
              { value: "pending_approval", label: "Pending Approval", count: pendingApprovalTasks.length, hidden: pendingApprovalTasks.length === 0 },
              { value: "tasks", label: "Tasks", count: activeTasks.length },
              { value: "campaigns", label: "Campaigns", count: companyCampaignRequests.length },
              { value: "calendar", label: "Calendar" },
              { value: "chat", label: "Chat", count: threads.reduce((total, t) => total + getUnreadCount(t.id), 0) || undefined },
              { value: "meetings", label: "Meetings", count: companyPendingMeetings || undefined },
              { value: "credit-history", label: "Credit History" },
              { value: "onboarding", label: "Onboarding" },
              { value: "users", label: "Users", count: companyUsers.length },
              { value: "cadences", label: "Cadences" },
              { value: "reporting", label: "Reporting" },
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            title="Company Dashboard"
          />
          <TabsList className="hidden md:inline-flex h-auto flex-wrap gap-1" data-testid="tabs-company-dashboard">
            <TabsTrigger value="details" data-testid="tab-details">
              <Settings className="h-4 w-4 mr-2" />
              Details
            </TabsTrigger>
            {pendingApprovalTasks.length > 0 && (
              <TabsTrigger value="pending_approval" data-testid="tab-pending-approval" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
                Pending Approval ({pendingApprovalTasks.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="tasks" data-testid="tab-tasks">
              <ClipboardList className="h-4 w-4 mr-2" />
              Tasks ({activeTasks.length})
            </TabsTrigger>
            <TabsTrigger value="campaigns" data-testid="tab-campaigns">
              <Target className="h-4 w-4 mr-2" />
              Campaigns ({companyCampaignRequests.length})
            </TabsTrigger>
            <TabsTrigger value="calendar" data-testid="tab-calendar">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="chat" data-testid="tab-chat">
              <MessageCircle className="h-4 w-4 mr-2" />
              Chat
              {threads.reduce((total, t) => total + getUnreadCount(t.id), 0) > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {threads.reduce((total, t) => total + getUnreadCount(t.id), 0)}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="meetings" data-testid="tab-meetings">
              <Video className="h-4 w-4 mr-2" />
              Meetings
              {companyPendingMeetings > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">{companyPendingMeetings}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="credit-history" data-testid="tab-credit-history">
              Credit History
            </TabsTrigger>
            <TabsTrigger value="onboarding" data-testid="tab-onboarding">
              <FileEdit className="w-4 h-4 mr-1" />
              Onboarding
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="h-4 w-4 mr-2" />
              Users ({companyUsers.length})
            </TabsTrigger>
            <TabsTrigger value="cadences" data-testid="tab-cadences">
              <Repeat className="h-4 w-4 mr-2" />
              Cadences
            </TabsTrigger>
            <TabsTrigger value="reporting" data-testid="tab-reporting">
              <BarChart3 className="h-4 w-4 mr-2" />
              Reporting
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Credits</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{company.credits}</div>
                  <p className="text-xs text-muted-foreground">
                    of {company.monthlyCredits} monthly
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Projected Usage</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono" data-testid="text-projected-credits">{projectedCredits.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Tasks & Meetings this period</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Subscription</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">{company.subscriptionTier}</div>
                  <p className="text-xs text-muted-foreground">
                    {company.industry || "No industry set"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Status</CardTitle>
                  {company.isPaused ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {company.isPaused ? "Paused" : "Active"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {company.isPaused && company.pausedAt
                      ? `Since ${new Date(company.pausedAt).toLocaleDateString()}`
                      : company.onboardingComplete ? "Onboarding Complete" : "Onboarding pending"
                    }
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeTasks.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {completedTasks.length} completed
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Pause/Resume Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {company.isPaused ? "Account is Paused" : "Account is Active"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {company.isPaused
                        ? "Clients cannot access the portal. Click Resume to restore access with full credits."
                        : "Clients have full access to the portal. Click Pause to suspend access."
                      }
                    </p>
                  </div>
                  {company.isPaused ? (
                    <Button
                      onClick={() => resumeCompanyMutation.mutate()}
                      disabled={resumeCompanyMutation.isPending}
                      data-testid="button-resume-company-details"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {resumeCompanyMutation.isPending ? "Resuming..." : "Resume Account"}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => pauseCompanyMutation.mutate()}
                      disabled={pauseCompanyMutation.isPending}
                      data-testid="button-pause-company-details"
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      {pauseCompanyMutation.isPending ? "Pausing..." : "Pause Account"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Credit History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Credit Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No credit activity yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {transactions.slice(0, 10).map((t) => (
                      <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          {parseFloat(t.amount) > 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-orange-500" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{t.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(t.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant={parseFloat(t.amount) > 0 ? "default" : "secondary"}>
                          {parseFloat(t.amount) > 0 ? "+" : ""}{t.amount}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h2 className="text-xl font-semibold">Tasks</h2>
              <div className="flex items-center gap-2">
                <ManageCategoriesDialog companyId={companyId} categories={taskCategoriesData || []} />
                <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-assign-task">
                      <Plus className="h-4 w-4 mr-2" />
                      Assign Task
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Assign New Task</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Deliverable Type *</Label>
                      <DeliverableTypePicker
                        deliverableTypes={activeDeliverables}
                        value={deliverableType}
                        onValueChange={(val) => { setDeliverableType(val); setCreditOverride(""); }}
                        placeholder="Select deliverable type"
                        data-testid="select-deliverable"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="Task title"
                        data-testid="input-task-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={taskDescription}
                        onChange={(e) => setTaskDescription(e.target.value)}
                        placeholder="Task description"
                        data-testid="input-task-description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={taskPriority} onValueChange={setTaskPriority}>
                        <SelectTrigger data-testid="select-priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(taskCategoriesData || []).length > 0 && (
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={taskCategoryId} onValueChange={setTaskCategoryId}>
                          <SelectTrigger data-testid="select-task-category">
                            <SelectValue placeholder="No category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No category</SelectItem>
                            {(taskCategoriesData || []).map((cat: any) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                <span className="flex items-center gap-2">
                                  {cat.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />}
                                  {cat.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Assign To</Label>
                      <Select
                        value=""
                        onValueChange={(userId) => {
                          if (!assignedTo) {
                            setAssignedTo(userId);
                          } else if (userId !== assignedTo && !additionalAssignees.includes(userId)) {
                            setAdditionalAssignees((prev) => [...prev, userId]);
                          }
                        }}
                      >
                        <SelectTrigger data-testid="select-assignee">
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                        <SelectContent>
                          {assignees
                            ?.filter((a) => a.id !== assignedTo && !additionalAssignees.includes(a.id))
                            .map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                <span className="flex items-center gap-2">
                                  {a.name}
                                  {a.roleLabel && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{a.roleLabel}</Badge>}
                                </span>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {(assignedTo || additionalAssignees.length > 0) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {assignedTo && (() => {
                            const primary = assignees?.find((a) => a.id === assignedTo);
                            return (
                              <Badge
                                key={assignedTo}
                                variant="secondary"
                                className="flex items-center gap-1"
                                data-testid={`badge-assignee-primary-${assignedTo}`}
                              >
                                <Crown className="w-3 h-3" />
                                {primary?.name || "Unknown"}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (additionalAssignees.length > 0) {
                                      setAssignedTo(additionalAssignees[0]);
                                      setAdditionalAssignees((prev) => prev.slice(1));
                                    } else {
                                      setAssignedTo("");
                                    }
                                  }}
                                  className="ml-0.5 rounded-full hover-elevate"
                                  data-testid={`button-remove-assignee-${assignedTo}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            );
                          })()}
                          {additionalAssignees.map((userId) => {
                            const person = assignees?.find((a) => a.id === userId);
                            return (
                              <Badge
                                key={userId}
                                variant="outline"
                                className="flex items-center gap-1"
                                data-testid={`badge-assignee-${userId}`}
                              >
                                {person?.name || "Unknown"}
                                <button
                                  type="button"
                                  onClick={() => setAdditionalAssignees((prev) => prev.filter((id) => id !== userId))}
                                  className="ml-0.5 rounded-full hover-elevate"
                                  data-testid={`button-remove-assignee-${userId}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">First selected is the primary assignee</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        Due Date (Optional)
                      </Label>
                      <DatePicker
                        value={taskDueDate}
                        onChange={setTaskDueDate}
                        data-testid="input-task-due-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bulk Quantity</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={bulkQuantity}
                          onChange={(e) => setBulkQuantity(e.target.value)}
                          className="w-24"
                          data-testid="input-bulk-quantity"
                        />
                        <span className="text-sm text-muted-foreground">deliverables</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Set quantity greater than 1 for bulk tasks (e.g., 30 social posts)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="recurring"
                        checked={isRecurring}
                        onCheckedChange={(checked) => setIsRecurring(!!checked)}
                      />
                      <Label htmlFor="recurring" className="flex items-center gap-1">
                        <Repeat className="h-3 w-3" />
                        Recurring task
                      </Label>
                    </div>
                    {isRecurring && (
                      <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                        <div className="space-y-2">
                          <Label>Recurrence Pattern</Label>
                          <Select value={recurrencePattern} onValueChange={(val) => setRecurrencePattern(val as "day_of_month" | "day_of_week" | "biweekly")}>
                            <SelectTrigger data-testid="select-recurrence-pattern">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="day_of_month">Same day each month (e.g., the 15th)</SelectItem>
                              <SelectItem value="day_of_week">Same week & day each month (e.g., 2nd Tuesday)</SelectItem>
                              <SelectItem value="biweekly">Every other week</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {recurrencePattern === "day_of_month" && (
                          <div className="space-y-2">
                            <Label>Day of Month</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal"
                                  data-testid="button-recurrence-day"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  Day {recurrenceDay} of each month
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-4" align="start">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setRecurrenceCalendarDate(new Date(recurrenceCalendarDate.getFullYear(), recurrenceCalendarDate.getMonth() - 1, 1))}
                                      data-testid="button-recurrence-prev-month"
                                    >
                                      <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm font-medium">
                                      {recurrenceCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setRecurrenceCalendarDate(new Date(recurrenceCalendarDate.getFullYear(), recurrenceCalendarDate.getMonth() + 1, 1))}
                                      data-testid="button-recurrence-next-month"
                                    >
                                      <ChevronRight className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-7 gap-1 text-center">
                                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                                      <div key={day} className="text-xs font-medium text-muted-foreground py-1">
                                        {day}
                                      </div>
                                    ))}
                                    {(() => {
                                      const year = recurrenceCalendarDate.getFullYear();
                                      const month = recurrenceCalendarDate.getMonth();
                                      const firstDay = new Date(year, month, 1).getDay();
                                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                                      const cells = [];
                                      for (let i = 0; i < firstDay; i++) {
                                        cells.push(<div key={`empty-${i}`} className="min-h-8 min-w-8" />);
                                      }
                                      for (let day = 1; day <= daysInMonth; day++) {
                                        const isSelected = recurrenceDay === day.toString();
                                        cells.push(
                                          <Button
                                            key={day}
                                            variant={isSelected ? "default" : "ghost"}
                                            size="icon"
                                            onClick={() => setRecurrenceDay(day.toString())}
                                            data-testid={`recurrence-day-${day}`}
                                            aria-label={`Select day ${day}`}
                                          >
                                            {day}
                                          </Button>
                                        );
                                      }
                                      return cells;
                                    })()}
                                  </div>
                                  {parseInt(recurrenceDay) > 28 && (
                                    <p className="text-xs text-muted-foreground text-center">
                                      In shorter months, this task will fall on the last day of the month
                                    </p>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}

                        {recurrencePattern === "day_of_week" && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-2">
                                <Label>Which occurrence</Label>
                                <Select value={recurrenceWeekOrdinal} onValueChange={setRecurrenceWeekOrdinal}>
                                  <SelectTrigger data-testid="select-week-ordinal">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">1st</SelectItem>
                                    <SelectItem value="2">2nd</SelectItem>
                                    <SelectItem value="3">3rd</SelectItem>
                                    <SelectItem value="4">4th</SelectItem>
                                    <SelectItem value="-1">Last</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Day of week</Label>
                                <Select value={recurrenceWeekday} onValueChange={setRecurrenceWeekday}>
                                  <SelectTrigger data-testid="select-weekday">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0">Sunday</SelectItem>
                                    <SelectItem value="1">Monday</SelectItem>
                                    <SelectItem value="2">Tuesday</SelectItem>
                                    <SelectItem value="3">Wednesday</SelectItem>
                                    <SelectItem value="4">Thursday</SelectItem>
                                    <SelectItem value="5">Friday</SelectItem>
                                    <SelectItem value="6">Saturday</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              e.g., the {recurrenceWeekOrdinal === "-1" ? "last" : recurrenceWeekOrdinal === "1" ? "1st" : recurrenceWeekOrdinal === "2" ? "2nd" : recurrenceWeekOrdinal === "3" ? "3rd" : "4th"} {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][parseInt(recurrenceWeekday)]} of each month
                            </p>
                          </div>
                        )}

                        {recurrencePattern === "biweekly" && (
                          <div className="space-y-2">
                            <Label>Day of Week</Label>
                            <Select value={recurrenceWeekday} onValueChange={setRecurrenceWeekday}>
                              <SelectTrigger data-testid="select-biweekly-day">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">Sunday</SelectItem>
                                <SelectItem value="1">Monday</SelectItem>
                                <SelectItem value="2">Tuesday</SelectItem>
                                <SelectItem value="3">Wednesday</SelectItem>
                                <SelectItem value="4">Thursday</SelectItem>
                                <SelectItem value="5">Friday</SelectItem>
                                <SelectItem value="6">Saturday</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Every other {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][parseInt(recurrenceWeekday)]}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Task Ownership</Label>
                      <Select value={taskOwnership} onValueChange={(val) => setTaskOwnership(val as "agency" | "client")}>
                        <SelectTrigger data-testid="select-task-ownership">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agency">Agency Managed</SelectItem>
                          <SelectItem value="client">Client Managed</SelectItem>
                        </SelectContent>
                      </Select>
                      {taskOwnership === "client" && (
                        <p className="text-xs text-muted-foreground">Client managed tasks skip credit checks</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="noCredit"
                        checked={noCredit || taskOwnership === "client"}
                        onCheckedChange={(checked) => setNoCredit(!!checked)}
                        disabled={taskOwnership === "client"}
                      />
                      <Label htmlFor="noCredit">No credit cost (bonus task)</Label>
                    </div>
                    {deliverableType && !noCredit && taskOwnership !== "client" && (() => {
                      const sel = activeDeliverables.find(d => d.key === deliverableType);
                      const displayCredits = creditOverride !== "" ? creditOverride : (sel?.credits || "0");
                      return (
                        <div className="p-3 bg-muted rounded-md space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Credits: <span className="font-mono font-medium">{displayCredits}</span></span>
                            {creditOverride !== "" && (
                              <Badge variant="outline" className="text-xs">Overridden</Badge>
                            )}
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Credit Override (optional)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={creditOverride}
                              onChange={(e) => setCreditOverride(e.target.value)}
                              placeholder={sel?.credits || "0"}
                              data-testid="input-credit-override"
                            />
                          </div>
                        </div>
                      );
                    })()}
                    <Button
                      onClick={handleAssignTask}
                      className="w-full"
                      disabled={createTaskMutation.isPending}
                      data-testid="button-submit-task"
                    >
                      {createTaskMutation.isPending ? "Assigning..." : "Assign Task"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button variant={!assignedToMeFilter ? "default" : "outline"} size="sm"
                onClick={() => { setAssignedToMeFilter(false); setCompanyTaskPage(1); }}
                data-testid="company-filter-all-tasks">
                <ListTodo className="w-3 h-3 mr-1" />
                All Tasks
              </Button>
              <Button variant={assignedToMeFilter ? "default" : "outline"} size="sm"
                onClick={() => { setAssignedToMeFilter(true); setCompanyTaskPage(1); }}
                data-testid="company-filter-assigned-to-me">
                <User className="w-3 h-3 mr-1" />
                Assigned to Me
              </Button>
              <div className="w-px h-6 bg-border" />
              {(taskCategoriesData || []).length > 0 && (
                <Select value={categoryFilter} onValueChange={(val) => { setCategoryFilter(val); setCompanyTaskPage(1); }}>
                  <SelectTrigger className="h-8 w-[160px]" data-testid="select-category-filter">
                    <FolderOpen className="w-3 h-3 mr-1" />
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    <SelectItem value="uncategorized">Uncategorized</SelectItem>
                    {(taskCategoriesData || []).map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span className="flex items-center gap-1.5">
                          {cat.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />}
                          {cat.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button variant={companyTaskFilter === "all" ? "default" : "outline"} size="sm"
                onClick={() => { setCompanyTaskFilter("all"); setCompanyTaskPage(1); }}
                data-testid="company-filter-all">
                All ({companyTaskCounts.all})
              </Button>
              <Button variant={companyTaskFilter === "pending" ? "default" : "outline"} size="sm"
                onClick={() => { setCompanyTaskFilter("pending"); setCompanyTaskPage(1); }}
                data-testid="company-filter-pending">
                <Circle className="w-3 h-3 mr-1" />
                Pending ({companyTaskCounts.pending})
              </Button>
              <Button variant={companyTaskFilter === "in_progress" ? "default" : "outline"} size="sm"
                onClick={() => { setCompanyTaskFilter("in_progress"); setCompanyTaskPage(1); }}
                data-testid="company-filter-in-progress">
                <Clock className="w-3 h-3 mr-1" />
                In Progress ({companyTaskCounts.in_progress})
              </Button>
              <Button variant={companyTaskFilter === "review" ? "default" : "outline"} size="sm"
                onClick={() => { setCompanyTaskFilter("review"); setCompanyTaskPage(1); }}
                data-testid="company-filter-review">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Review ({companyTaskCounts.review})
              </Button>
              <Button variant={companyTaskFilter === "approved" ? "default" : "outline"} size="sm"
                onClick={() => { setCompanyTaskFilter("approved"); setCompanyTaskPage(1); }}
                data-testid="company-filter-approved">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Approved ({companyTaskCounts.approved})
              </Button>
              <Button variant={companyTaskFilter === "completed" ? "default" : "outline"} size="sm"
                onClick={() => { setCompanyTaskFilter("completed"); setCompanyTaskPage(1); }}
                data-testid="company-filter-completed">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Completed ({companyTaskCounts.completed})
              </Button>
              {companyTaskCounts.rejected > 0 && (
                <Button variant={companyTaskFilter === "rejected" ? "default" : "outline"} size="sm"
                  onClick={() => { setCompanyTaskFilter("rejected"); setCompanyTaskPage(1); }}
                  data-testid="company-filter-rejected">
                  Rejected ({companyTaskCounts.rejected})
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => { setTaskMonthDate(new Date(taskMonthDate.getFullYear(), taskMonthDate.getMonth() - 1, 1)); setCompanyTaskPage(1); }}
                data-testid="button-task-month-prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[140px] text-center" data-testid="text-task-month">
                {taskMonthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => { setTaskMonthDate(new Date(taskMonthDate.getFullYear(), taskMonthDate.getMonth() + 1, 1)); setCompanyTaskPage(1); }}
                data-testid="button-task-month-next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {tasksLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredCompanyTasks.length > 0 ? (
              <div className="space-y-2">
                {paginatedCompanyTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setSelectedTask(task)}
                    data-testid={`card-task-${task.id}`}
                  >
                    <CardContent className="py-3 flex items-center gap-4">
                      <button
                        onClick={(e) => handleToggleComplete(e, task)}
                        className="shrink-0"
                        data-testid={`button-toggle-task-${task.id}`}
                      >
                        {getStatusIcon(task.status, task.approvalStatus)}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={task.status === "completed" ? "line-through text-muted-foreground" : "font-medium"}>
                            {task.title}
                          </span>
                          {task.isRecurring && (
                            <Badge variant="outline" className="gap-1">
                              <Repeat className="h-3 w-3" />
                              {task.recurrencePattern === "biweekly" && task.recurrenceWeekday !== null && task.recurrenceWeekday !== undefined
                                ? `Every other ${["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][task.recurrenceWeekday]}`
                                : "Monthly"}
                            </Badge>
                          )}
                          {task.categoryId && (() => {
                            const cat = (taskCategoriesData || []).find((c: any) => c.id === task.categoryId);
                            if (!cat) return null;
                            return (
                              <Badge variant="outline" className="text-xs gap-1" data-testid={`badge-category-${task.id}`}>
                                {cat.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />}
                                {cat.name}
                              </Badge>
                            );
                          })()}
                          {task.campaignRequestId && (() => {
                            const campaign = companyCampaignRequests.find(c => c.id === task.campaignRequestId);
                            if (!campaign) return null;
                            return (
                              <Badge
                                variant="outline"
                                className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 text-xs cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCampaign(campaign);
                                }}
                                data-testid={`badge-campaign-${task.id}`}
                              >
                                <Target className="w-3 h-3 mr-1" />
                                {campaign.name || "Campaign"}
                              </Badge>
                            );
                          })()}
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {task.dueDate && (
                            <span className={`text-sm flex items-center gap-1 ${getDueDateColor(task.dueDate, task.status)}`}>
                              <Clock className="h-3 w-3" />
                              {formatDueDate(task.dueDate, task.status)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <TaskAssigneeAvatars taskId={task.id} />
                        {getPriorityBadge(task.priority)}
                        <Badge variant="secondary">{task.creditCost} credits</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {companyTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {(companyTaskPage - 1) * COMPANY_TASKS_PER_PAGE + 1}-{Math.min(companyTaskPage * COMPANY_TASKS_PER_PAGE, filteredCompanyTasks.length)} of {filteredCompanyTasks.length} tasks
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCompanyTaskPage(p => Math.max(1, p - 1))} disabled={companyTaskPage === 1} data-testid="button-company-prev-page">
                        <ChevronLeft className="w-4 h-4" /> Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">Page {companyTaskPage} of {companyTotalPages}</span>
                      <Button variant="outline" size="sm" onClick={() => setCompanyTaskPage(p => Math.min(companyTotalPages, p + 1))} disabled={companyTaskPage === companyTotalPages} data-testid="button-company-next-page">
                        Next <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No tasks found. Assign a task to get started.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => calendarView === "month" ? navigateMonth(-1) : navigateWeek(-1)}
                      data-testid="button-prev-period"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-lg font-semibold min-w-[200px] text-center" data-testid="text-current-period">
                      {calendarView === "month"
                        ? currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
                        : getWeekRangeText()
                      }
                    </h2>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => calendarView === "month" ? navigateMonth(1) : navigateWeek(1)}
                      data-testid="button-next-period"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={goToToday} data-testid="button-today">
                      Today
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-md">
                      <Button 
                        variant={calendarView === "month" ? "default" : "ghost"} 
                        size="sm"
                        onClick={() => setCalendarView("month")}
                        className="rounded-r-none"
                        data-testid="button-month-view"
                      >
                        Month
                      </Button>
                      <Button 
                        variant={calendarView === "week" ? "default" : "ghost"} 
                        size="sm"
                        onClick={() => setCalendarView("week")}
                        className="rounded-l-none"
                        data-testid="button-week-view"
                      >
                        Week
                      </Button>
                    </div>
                    <Badge variant="outline">{formatBillingPeriod(billingPeriod)}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {calendarView === "month" ? (
                  <>
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                        <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((day, idx) => (
                        <div
                          key={idx}
                          className={`min-h-[100px] p-1 border rounded-md cursor-pointer hover-elevate ${
                            !day.isCurrentMonth ? "bg-muted/30" : ""
                          } ${day.isToday ? "ring-2 ring-primary" : ""} ${
                            day.isBillingStart ? "border-l-4 border-l-green-500" : ""
                          } ${day.isBillingEnd ? "border-r-4 border-r-red-500" : ""}`}
                          data-testid={`calendar-day-${day.dayNum}`}
                        >
                          <div className={`text-sm font-medium ${!day.isCurrentMonth ? 'text-muted-foreground' : ''}`}>
                            {day.dayNum}
                            {day.isBillingStart && (
                              <span className="ml-1 text-xs text-green-600">Start</span>
                            )}
                          </div>
                          <div className="space-y-1 mt-1 overflow-y-auto max-h-[70px]">
                            {day.tasks.slice(0, 3).map((task) => (
                              <div
                                key={task.id}
                                className={`text-xs p-1 rounded truncate cursor-pointer hover-elevate ${getStatusColor(task.status)}`}
                                onClick={() => setSelectedCalendarTask(task)}
                                title={task.title}
                              >
                                <div className="flex items-center gap-1">
                                  {task.isRecurring && <Repeat className="w-3 h-3 flex-shrink-0" />}
                                  <span className="truncate">{task.title}</span>
                                </div>
                              </div>
                            ))}
                            {day.tasks.length > 3 && (
                              <div className="text-xs text-muted-foreground text-center">+{day.tasks.length - 3} more</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col">
                    <div className="grid grid-cols-8 gap-1 mb-1 border-b pb-2">
                      <div className="text-center text-sm font-medium text-muted-foreground py-2">
                        <Clock className="w-4 h-4 mx-auto" />
                      </div>
                      {weekDays.map((day, idx) => (
                        <div 
                          key={idx} 
                          className={`text-center py-2 rounded ${day.isToday ? 'ring-2 ring-primary' : ''}`}
                          data-testid={`calendar-week-day-${idx}`}
                        >
                          <div className="text-xs text-muted-foreground">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx]}
                          </div>
                          <div className={`text-lg font-semibold ${day.isToday ? 'text-primary' : ''}`}>
                            {day.dayNum}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="overflow-y-auto max-h-[500px]">
                      {timeSlots.map((slot, slotIdx) => (
                        <div key={slot} className="grid grid-cols-8 gap-1 border-b">
                          <div className="text-xs text-muted-foreground py-2 px-1 text-right">
                            {slot}
                          </div>
                          {weekDays.map((day, dayIdx) => (
                            <div 
                              key={dayIdx} 
                              className="min-h-[50px] p-1 border-l"
                            >
                              {slotIdx === 0 && day.tasks.map(task => (
                                <div 
                                  key={task.id}
                                  onClick={() => setSelectedCalendarTask(task)}
                                  className={`text-xs p-1 rounded mb-1 cursor-pointer hover-elevate border-l-2 ${getStatusColor(task.status)}`}
                                  title={task.title}
                                >
                                  <div className="flex items-center gap-1">
                                    {task.isRecurring && <Repeat className="w-3 h-3 flex-shrink-0" />}
                                    <span className="truncate">{task.title}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-green-500 rounded-sm" />
                <span>Billing period start</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-red-500 rounded-sm" />
                <span>Billing period end</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 ring-2 ring-primary rounded-sm" />
                <span>Today</span>
              </div>
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4" />
                <span>Recurring task</span>
              </div>
            </div>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-4">
            {(() => {
              const chatListContent = (
                <>
                  {generalThreads.length > 0 && (
                    <div className="p-2">
                      <p className="text-xs font-medium text-muted-foreground px-2 py-1">General Chats</p>
                      {generalThreads.map((thread) => (
                        <div
                          key={thread.id}
                          className={`p-2 rounded-md cursor-pointer hover-elevate ${
                            selectedThreadId === thread.id ? "bg-accent" : ""
                          }`}
                          onClick={() => { setSelectedThreadId(thread.id); setEditingThreadName(false); setChatListOpen(false); }}
                          data-testid={`thread-${thread.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MessageCircle className="h-4 w-4" />
                              <span className="text-sm font-medium">{thread.name || "Unnamed Chat"}</span>
                              {thread.isCompanyWide && (
                                <Badge variant="outline" className="text-xs">
                                  <Users className="h-3 w-3 mr-1" />
                                  All
                                </Badge>
                              )}
                            </div>
                            {getUnreadCount(thread.id) > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {getUnreadCount(thread.id)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {taskThreads.length > 0 && (
                    <div className="p-2">
                      <p className="text-xs font-medium text-muted-foreground px-2 py-1">Task Chats</p>
                      {taskThreads.map((thread) => (
                        <div
                          key={thread.id}
                          className={`p-2 rounded-md cursor-pointer hover-elevate ${
                            selectedThreadId === thread.id ? "bg-accent" : ""
                          }`}
                          onClick={() => { setSelectedThreadId(thread.id); setEditingThreadName(false); setChatListOpen(false); }}
                          data-testid={`thread-${thread.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ClipboardList className="h-4 w-4" />
                              <span className="text-sm font-medium">{thread.name || "Task Chat"}</span>
                            </div>
                            {getUnreadCount(thread.id) > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {getUnreadCount(thread.id)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {threads.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No chats yet. Start a new conversation.
                    </div>
                  )}
                </>
              );

              const newChatDialog = (
                <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-new-chat">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>New Chat</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Chat Name <span className="text-destructive">*</span></Label>
                        <Input
                          value={newChatName}
                          onChange={(e) => setNewChatName(e.target.value)}
                          placeholder="Enter chat name"
                          data-testid="input-chat-name"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="companyWide"
                          checked={isCompanyWide}
                          onCheckedChange={(checked) => setIsCompanyWide(!!checked)}
                        />
                        <Label htmlFor="companyWide">Company-wide chat</Label>
                      </div>
                      {!isCompanyWide && (
                        <div className="space-y-2">
                          <Label>Select Members</Label>
                          <ScrollArea className="h-40 border rounded-md p-2">
                            {chatUsers.map((user) => (
                              <div key={user.id} className="flex items-center gap-2 py-1">
                                <Checkbox
                                  checked={selectedMembers.includes(user.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedMembers([...selectedMembers, user.id]);
                                    } else {
                                      setSelectedMembers(selectedMembers.filter((id) => id !== user.id));
                                    }
                                  }}
                                />
                                <span>{user.firstName} {user.lastName}</span>
                                <Badge variant="outline" className="text-xs">{user.type}</Badge>
                              </div>
                            ))}
                          </ScrollArea>
                        </div>
                      )}
                      <Button
                        onClick={handleCreateChat}
                        className="w-full"
                        disabled={createThreadMutation.isPending}
                        data-testid="button-create-chat"
                      >
                        {createThreadMutation.isPending ? "Creating..." : "Create Chat"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              );

              return (
                <>
                  {isMobile && (
                    <Sheet open={chatListOpen} onOpenChange={setChatListOpen}>
                      <SheetContent side="left" className="w-72 p-0">
                        <SheetHeader className="p-4 pr-12 border-b">
                          <SheetTitle className="flex items-center justify-between">
                            Chats
                            {newChatDialog}
                          </SheetTitle>
                        </SheetHeader>
                        <ScrollArea className="h-[calc(100dvh-5rem)]">
                          {chatListContent}
                        </ScrollArea>
                      </SheetContent>
                    </Sheet>
                  )}
                  <div className="flex gap-4 h-[calc(100dvh-16rem)]">
                    {!isMobile && (
                      <Card className="w-72 shrink-0 flex flex-col">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Chats</CardTitle>
                            {newChatDialog}
                          </div>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-hidden">
                          <ScrollArea className="h-full">
                            {chatListContent}
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    )}

              {/* Messages */}
              <Card className="flex-1 flex flex-col min-w-0">
                {selectedThreadId ? (
                  <>
                    <CardHeader className="pb-2 border-b flex flex-row items-center justify-between gap-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {isMobile && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 md:hidden"
                            onClick={() => setChatListOpen(true)}
                            data-testid="button-open-chat-list"
                          >
                            <Menu className="h-4 w-4" />
                          </Button>
                        )}
                        {editingThreadName ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editThreadNameValue}
                              onChange={(e) => setEditThreadNameValue(e.target.value)}
                              className="h-7 text-sm w-48"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && editThreadNameValue.trim()) {
                                  renameThreadMutation.mutate({ threadId: selectedThreadId!, name: editThreadNameValue.trim() });
                                }
                                if (e.key === "Escape") setEditingThreadName(false);
                              }}
                              data-testid="input-edit-thread-name"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                if (editThreadNameValue.trim()) {
                                  renameThreadMutation.mutate({ threadId: selectedThreadId!, name: editThreadNameValue.trim() });
                                }
                              }}
                              disabled={renameThreadMutation.isPending}
                              data-testid="button-save-thread-name"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setEditingThreadName(false)}
                              data-testid="button-cancel-edit-name"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span
                            className="cursor-pointer hover:text-primary transition-colors"
                            onClick={() => {
                              setEditThreadNameValue(threads.find((t) => t.id === selectedThreadId)?.name || "");
                              setEditingThreadName(true);
                            }}
                            title="Click to rename"
                            data-testid="text-thread-name"
                          >
                            {threads.find((t) => t.id === selectedThreadId)?.name || "Chat"}
                          </span>
                        )}
                        {threads.find((t) => t.id === selectedThreadId)?.closedAt && (
                          <Badge variant="secondary" className="text-xs"><Lock className="h-3 w-3 mr-1" />Closed</Badge>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setShowViewMembers(true)}
                          title="View members"
                          data-testid="button-view-members"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        {threads.find((t) => t.id === selectedThreadId)?.closedAt ? (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => closeThreadMutation.mutate({ threadId: selectedThreadId!, action: "reopen" })}
                              disabled={closeThreadMutation.isPending}
                              data-testid="button-reopen-chat"
                            >
                              <Unlock className="h-4 w-4 mr-1" />
                              Reopen
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  disabled={deleteThreadMutation.isPending}
                                  title="Delete chat"
                                  data-testid="button-delete-chat"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Chat</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this closed chat? This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => deleteThreadMutation.mutate(selectedThreadId!)}
                                    data-testid="button-confirm-delete-chat"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        ) : (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setShowAddMembers(true)}
                              data-testid="button-add-members"
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Add People
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowMergeChat(true)}
                              data-testid="button-merge-chat"
                            >
                              <GitMerge className="h-4 w-4 mr-1" />
                              Merge
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => closeThreadMutation.mutate({ threadId: selectedThreadId!, action: "close" })}
                              disabled={closeThreadMutation.isPending}
                              data-testid="button-close-chat"
                            >
                              <Lock className="h-4 w-4 mr-1" />
                              Close
                            </Button>
                          </>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 flex flex-col overflow-hidden min-h-0">
                      <div className="flex-1 overflow-y-auto p-4 min-h-0">
                        <div className="space-y-3">
                          {messages.map((msg, idx) => {
                            const showDateSeparator = idx === 0 ||
                              isDifferentDay(messages[idx - 1].createdAt, msg.createdAt);
                            const msgReadBy = readReceipts.filter(
                              (r) => r.lastReadMessageId === msg.id && r.userId !== user?.id
                            );
                            return (
                              <div key={msg.id}>
                                {showDateSeparator && (
                                  <div className="flex items-center gap-3 my-3" data-testid={`date-separator-${msg.id}`}>
                                    <div className="flex-1 h-px bg-border" />
                                    <span className="text-xs font-medium text-muted-foreground px-2">
                                      {getDateLabel(msg.createdAt)}
                                    </span>
                                    <div className="flex-1 h-px bg-border" />
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarFallback className="text-xs">
                                      {msg.sender?.firstName?.[0]}
                                      {msg.sender?.lastName?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-medium">
                                        {msg.sender?.firstName} {msg.sender?.lastName}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {formatTime(msg.createdAt)}
                                      </span>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap break-words overflow-hidden">{renderMessageWithMentions(msg.content)}</p>
                                  </div>
                                </div>
                                {msgReadBy.length > 0 && (
                                  <div className="flex items-center gap-1 ml-10 mt-1" data-testid={`read-receipts-${msg.id}`}>
                                    <CheckCheck className="h-3 w-3 text-blue-500" />
                                    <span className="text-xs text-muted-foreground">
                                      Read by {msgReadBy.map((r) => r.user?.firstName || "Unknown").join(", ")}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          <div ref={messagesEndRef} />
                        </div>
                      </div>
                      {threads.find((t) => t.id === selectedThreadId)?.closedAt ? (
                        <div className="border-t p-3 text-center text-sm text-muted-foreground">
                          <Lock className="h-4 w-4 inline mr-1" />
                          This chat is closed. Reopen it to send messages.
                        </div>
                      ) : (
                        <form onSubmit={handleSendMessage} className="border-t p-3 flex gap-2">
                          <MentionInput
                            threadId={selectedThreadId || ""}
                            value={messageInput}
                            onChange={setMessageInput}
                            onMentionsChange={setMessageMentions}
                            placeholder="Type a message... Use @ to mention someone"
                            disabled={sendMessageMutation.isPending}
                            onSubmit={handleSendMessage}
                            data-testid="input-message"
                          />
                          <Button
                            type="submit"
                            disabled={!messageInput.trim() || sendMessageMutation.isPending}
                            data-testid="button-send-message"
                          >
                            {sendMessageMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </form>
                      )}
                    </CardContent>
                  </>
                ) : (
                  <CardContent className="flex-1 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Select a chat to start messaging</p>
                      {isMobile && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => setChatListOpen(true)}
                          data-testid="button-open-chat-list-empty"
                        >
                          <Menu className="h-4 w-4 mr-2" />
                          View Chats
                        </Button>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
              </>
              );
            })()}
          </TabsContent>

          {/* Meetings Tab */}
          <TabsContent value="meetings" className="space-y-4">
            <Tabs value={meetingStatusFilter} onValueChange={setMeetingStatusFilter}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <MobileTabMenu
                  tabs={[
                    { value: "pending", label: "Pending", count: pendingMeetingsCount },
                    { value: "approved", label: "Approved", count: approvedMeetingsCount },
                    { value: "completed", label: "Completed", count: completedMeetingsCount },
                    { value: "rejected", label: "Rejected", count: rejectedMeetingsCount },
                  ]}
                  activeTab={meetingStatusFilter}
                  onTabChange={setMeetingStatusFilter}
                  title="Meetings"
                />
                <TabsList className="hidden md:inline-flex">
                  <TabsTrigger value="pending" data-testid="tab-company-meeting-pending">
                    <Clock className="w-4 h-4 mr-2" />
                    Pending
                    {pendingMeetingsCount > 0 && (
                      <Badge variant="secondary" className="ml-2">{pendingMeetingsCount}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="approved" data-testid="tab-company-meeting-approved">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approved
                    {approvedMeetingsCount > 0 && (
                      <Badge variant="secondary" className="ml-2">{approvedMeetingsCount}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="completed" data-testid="tab-company-meeting-completed">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Completed
                    {completedMeetingsCount > 0 && (
                      <Badge variant="secondary" className="ml-2">{completedMeetingsCount}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="rejected" data-testid="tab-company-meeting-rejected">
                    <XCircle className="w-4 h-4 mr-2" />
                    Rejected
                    {rejectedMeetingsCount > 0 && (
                      <Badge variant="secondary" className="ml-2">{rejectedMeetingsCount}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
                <Button onClick={() => setCreateMeetingOpen(true)} data-testid="button-create-meeting">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Meeting
                </Button>
              </div>

              {filteredCompanyMeetings.length === 0 ? (
                <Card className="mt-4">
                  <CardContent className="py-8 text-center">
                    <Video className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No {meetingStatusFilter} meetings found</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3 mt-4">
                  {filteredCompanyMeetings.map(meeting => (
                  <Card key={meeting.id}>
                    <Collapsible open={expandedCompanyMeetings.has(meeting.id)} onOpenChange={() => toggleCompanyMeetingExpanded(meeting.id)}>
                      <CollapsibleTrigger asChild>
                        <CardContent className="py-4 cursor-pointer hover-elevate">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`p-2 rounded-lg flex-shrink-0 ${meeting.status === "approved" || meeting.status === "completed" ? "bg-green-500/10" : "bg-primary/10"}`}>
                                <Video className={`w-5 h-5 ${meeting.status === "approved" || meeting.status === "completed" ? "text-green-600 dark:text-green-400" : "text-primary"}`} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate">{meeting.title}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                                  <span className="truncate">{meeting.meetingType?.name}</span>
                                  <span>·</span>
                                  <Clock className="w-3 h-3 flex-shrink-0" />
                                  <span>{formatMeetingDateTime(meeting)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-sm text-muted-foreground">{meeting.duration} min</span>
                              {getMeetingStatusBadge(meeting.status)}
                              {expandedCompanyMeetings.has(meeting.id) ? (
                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 border-t">
                          <div className="space-y-4 pt-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <Label className="text-xs text-muted-foreground">Credit Cost</Label>
                                <p className="text-sm font-mono">{meeting.creditCost || meeting.meetingType?.creditCost || "0"} credits</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Duration</Label>
                                <p className="text-sm">{meeting.duration} minutes</p>
                              </div>
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

                            {(meeting.status === "approved" || meeting.status === "completed") && (
                              <div className="pt-3 border-t">
                                <div className="flex items-center justify-between mb-2">
                                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    Meeting Notes
                                  </Label>
                                  {editingMeetingNotesId !== meeting.id && (
                                    <Button variant="ghost" size="sm" onClick={() => { setEditingMeetingNotesId(meeting.id); setMeetingNotesText(meeting.notes || ""); }} data-testid={`button-edit-meeting-notes-${meeting.id}`}>
                                      <Pencil className="w-3 h-3 mr-1" />
                                      {meeting.notes ? "Edit Notes" : "Add Notes"}
                                    </Button>
                                  )}
                                </div>
                                {editingMeetingNotesId === meeting.id ? (
                                  <div className="space-y-2">
                                    <Textarea
                                      value={meetingNotesText}
                                      onChange={(e) => setMeetingNotesText(e.target.value)}
                                      placeholder="Add meeting notes, action items, key takeaways..."
                                      className="min-h-[120px]"
                                      data-testid={`textarea-meeting-notes-${meeting.id}`}
                                    />
                                    <div className="flex items-center justify-end gap-2">
                                      <Button variant="outline" size="sm" onClick={() => setEditingMeetingNotesId(null)}>Cancel</Button>
                                      <Button size="sm" onClick={() => saveMeetingNotesMutation.mutate({ id: meeting.id, notes: meetingNotesText })} disabled={saveMeetingNotesMutation.isPending} data-testid={`button-save-meeting-notes-${meeting.id}`}>
                                        {saveMeetingNotesMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                                        Save Notes
                                      </Button>
                                    </div>
                                  </div>
                                ) : meeting.notes ? (
                                  <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-md p-3">{meeting.notes}</p>
                                ) : (
                                  <p className="text-sm text-muted-foreground italic">No notes added yet</p>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-3 pt-3 border-t flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                {(meeting.status === "pending" || meeting.status === "approved") && (
                                  <Button variant="outline" size="sm" asChild>
                                    <a href={generateMeetingOutlookLink(meeting)} target="_blank" rel="noopener noreferrer">
                                      <CalendarPlus className="h-4 w-4 mr-2" />
                                      {meeting.status === "pending" ? "Step 1: Create in Outlook" : "Open in Outlook"}
                                      <ExternalLink className="h-3 w-3 ml-1" />
                                    </a>
                                  </Button>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {meeting.status === "pending" && (
                                  <>
                                    <Button variant="outline" size="sm" onClick={() => setMeetingToReject(meeting.id)} data-testid={`button-reject-meeting-${meeting.id}`}>
                                      <XCircle className="w-4 h-4 mr-1" />
                                      Reject
                                    </Button>
                                    <Button size="sm" onClick={() => {
                                      setSelectedMeetingRequest(meeting);
                                      setMeetingTeamsLink(meeting.teamsLink || "");
                                      setMeetingAdminNotes(meeting.adminNotes || "");
                                      setEditMeetingDate(meeting.proposedDate);
                                      const tp = parseTimeToComponents(meeting.proposedTime);
                                      setEditMeetingTimeHour(tp.hour);
                                      setEditMeetingTimeMinute(tp.minute);
                                      setEditMeetingTimePeriod(tp.period);
                                      setEditMeetingCredits(meeting.creditCost);
                                      setEditMeetingDuration(String(meeting.duration));
                                      setCompanyApproveDialogOpen(true);
                                    }} data-testid={`button-approve-meeting-${meeting.id}`}>
                                      <CheckCircle2 className="w-4 h-4 mr-1" />
                                      Approve
                                    </Button>
                                  </>
                                )}
                                {meeting.status === "approved" && (
                                  <>
                                    <Button variant="outline" size="sm" onClick={() => openEditMeetingDialog(meeting)} data-testid={`button-edit-meeting-${meeting.id}`}>
                                      <Pencil className="w-4 h-4 mr-1" />
                                      Edit
                                    </Button>
                                    <Button size="sm" onClick={() => {
                                      apiRequest("PATCH", `/api/meeting-requests/${meeting.id}`, { status: "completed" }).then(() => {
                                        queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "meeting-requests"] });
                                        queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
                                        queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
                                        queryClient.invalidateQueries({ queryKey: ["/api/credit-transactions"] });
                                        toast({ title: "Meeting marked as completed" });
                                      }).catch(() => {
                                        toast({ title: "Failed to mark as completed", variant: "destructive" });
                                      });
                                    }} data-testid={`button-complete-meeting-${meeting.id}`}>
                                      <CheckCircle2 className="w-4 h-4 mr-1" />
                                      Mark Completed
                                    </Button>
                                  </>
                                )}
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

            </Tabs>

            {/* Create Meeting Dialog */}
            <Dialog open={createMeetingOpen} onOpenChange={(open) => { setCreateMeetingOpen(open); if (!open) resetCreateMeetingForm(); }}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Meeting</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Meeting Type *</Label>
                    <Select value={newMeetingTypeId} onValueChange={handleNewMeetingTypeChange}>
                      <SelectTrigger data-testid="select-new-meeting-type">
                        <SelectValue placeholder="Select meeting type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {meetingTypes.filter(t => t.isActive).map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex items-center gap-2">
                              <span>{type.name}</span>
                              <Badge variant="secondary" className="ml-2">{type.creditCost} credits</Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      value={newMeetingTitle}
                      onChange={(e) => setNewMeetingTitle(e.target.value)}
                      placeholder="Meeting title"
                      data-testid="input-new-meeting-title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={newMeetingDescription}
                      onChange={(e) => setNewMeetingDescription(e.target.value)}
                      placeholder="What will be discussed?"
                      data-testid="input-new-meeting-description"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date *</Label>
                      <DatePicker
                        value={newMeetingDate}
                        onChange={setNewMeetingDate}
                        data-testid="input-new-meeting-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Time *</Label>
                      <div className="flex items-center gap-1">
                        <Select value={newMeetingTimeHour} onValueChange={setNewMeetingTimeHour}>
                          <SelectTrigger className="w-[70px]" data-testid="select-new-meeting-hour">
                            <SelectValue placeholder="HH" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map(h => (
                              <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span>:</span>
                        <Select value={newMeetingTimeMinute} onValueChange={setNewMeetingTimeMinute}>
                          <SelectTrigger className="w-[70px]" data-testid="select-new-meeting-minute">
                            <SelectValue placeholder="MM" />
                          </SelectTrigger>
                          <SelectContent>
                            {["00", "15", "30", "45"].map(m => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={newMeetingTimePeriod} onValueChange={setNewMeetingTimePeriod}>
                          <SelectTrigger className="w-[70px]" data-testid="select-new-meeting-period">
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
                    <Label>Duration</Label>
                    <Select value={newMeetingDuration} onValueChange={setNewMeetingDuration}>
                      <SelectTrigger data-testid="select-new-meeting-duration">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Attendees</Label>
                    <ScrollArea className="max-h-[300px] border rounded-md p-2">
                      {agencyAdmins.length > 0 && (
                        <>
                          <p className="text-xs font-medium text-muted-foreground mb-1 px-1">Agency</p>
                          <div className="space-y-2 mb-3">
                            {agencyAdmins.map((u) => (
                              <div key={u.id} className="flex items-center gap-2">
                                <Checkbox
                                  checked={newMeetingAttendees.includes(u.id)}
                                  onCheckedChange={(checked) => {
                                    setNewMeetingAttendees(prev =>
                                      checked ? [...prev, u.id] : prev.filter(id => id !== u.id)
                                    );
                                  }}
                                  data-testid={`checkbox-attendee-agency-${u.id}`}
                                />
                                <span className="text-sm">{u.firstName} {u.lastName}</span>
                                <span className="text-xs text-muted-foreground">({u.email})</span>
                                <Badge variant="secondary" className="text-xs">Agency</Badge>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      {companyUsers.length > 0 && (
                        <>
                          <p className="text-xs font-medium text-muted-foreground mb-1 px-1">Client</p>
                          <div className="space-y-2">
                            {companyUsers.filter(u => !agencyAdmins.some(a => a.id === u.id)).map((u) => (
                              <div key={u.id} className="flex items-center gap-2">
                                <Checkbox
                                  checked={newMeetingAttendees.includes(u.id)}
                                  onCheckedChange={(checked) => {
                                    setNewMeetingAttendees(prev =>
                                      checked ? [...prev, u.id] : prev.filter(id => id !== u.id)
                                    );
                                  }}
                                  data-testid={`checkbox-attendee-${u.id}`}
                                />
                                <span className="text-sm">{u.firstName} {u.lastName}</span>
                                <span className="text-xs text-muted-foreground">({u.email})</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      {companyUsers.length === 0 && agencyAdmins.length === 0 && (
                        <p className="text-sm text-muted-foreground p-2">No members found</p>
                      )}
                    </ScrollArea>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setCreateMeetingOpen(false); resetCreateMeetingForm(); }}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateMeetingSubmit} disabled={createMeetingMutation.isPending} data-testid="button-submit-create-meeting">
                      {createMeetingMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <CalendarPlus className="h-4 w-4 mr-2" />
                          Create Meeting
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Company Users ({companyUsers.length})
                  </CardTitle>
                  <Dialog open={inviteOpen} onOpenChange={(open) => {
                    setInviteOpen(open);
                    if (!open) {
                      setInviteLink(null);
                      setLinkCopied(false);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-invite-member">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite Team Member</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-2">
                        <div className="space-y-2">
                          <Label>Member Role</Label>
                          <Select value={inviteRole} onValueChange={setInviteRole}>
                            <SelectTrigger data-testid="select-invite-role">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="company_owner">Company Owner - Full access</SelectItem>
                              <SelectItem value="company_admin">Company Admin - Manage tasks & settings</SelectItem>
                              <SelectItem value="team_member">Team Member - Chats, requests, calendar</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Tabs defaultValue="email">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="email" data-testid="tab-email-invite">
                              <Mail className="w-4 h-4 mr-2" />
                              Send Email
                            </TabsTrigger>
                            <TabsTrigger value="link" data-testid="tab-link-invite">
                              <Link2 className="w-4 h-4 mr-2" />
                              Generate Link
                            </TabsTrigger>
                          </TabsList>
                          <TabsContent value="email" className="mt-4">
                            <form onSubmit={handleSendInviteEmail} className="space-y-4">
                              <div className="space-y-2">
                                <Label>Email Address</Label>
                                <Input
                                  type="email"
                                  value={inviteEmail}
                                  onChange={(e) => setInviteEmail(e.target.value)}
                                  placeholder="team@example.com"
                                  required
                                  data-testid="input-invite-email"
                                />
                              </div>
                              <Button type="submit" className="w-full" disabled={sendInviteEmailMutation.isPending} data-testid="button-send-invite">
                                <Send className="w-4 h-4 mr-2" />
                                {sendInviteEmailMutation.isPending ? "Sending..." : "Send Invitation"}
                              </Button>
                            </form>
                          </TabsContent>
                          <TabsContent value="link" className="mt-4 space-y-4">
                            <p className="text-sm text-muted-foreground">
                              Generate a unique signup link to share with team members. Anyone with the link can sign up and join the company.
                            </p>
                            {!inviteLink ? (
                              <Button onClick={handleGenerateInviteLink} disabled={createInviteMutation.isPending} className="w-full" data-testid="button-generate-link">
                                <Link2 className="w-4 h-4 mr-2" />
                                {createInviteMutation.isPending ? "Generating..." : "Generate Signup Link"}
                              </Button>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex gap-2">
                                  <Input value={inviteLink} readOnly className="font-mono text-sm" data-testid="input-invite-link" />
                                  <Button variant="outline" onClick={copyInviteLink} data-testid="button-copy-link">
                                    {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                  </Button>
                                </div>
                                <p className="text-sm text-muted-foreground">This link expires in 7 days.</p>
                                <Button variant="outline" onClick={handleGenerateInviteLink} size="sm">Generate New Link</Button>
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                    {/* Owners Section */}
                    <div className="border rounded-lg">
                      <button
                        onClick={() => setOwnersExpanded(!ownersExpanded)}
                        className="w-full flex items-center justify-between p-3 hover-elevate"
                        data-testid="section-owners"
                      >
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">Owners ({companyOwners.length})</span>
                        </div>
                        {ownersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      {ownersExpanded && (
                        <div className="border-t p-3 space-y-2">
                          {companyOwners.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No owners assigned.</p>
                          ) : (
                            companyOwners.map((user) => (
                              <UserTagCard key={user.id} user={user} allTags={allUserTags} companyId={companyId!} customRoles={companyCustomRoles} />
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Admins Section */}
                    <div className="border rounded-lg">
                      <button
                        onClick={() => setAdminsExpanded(!adminsExpanded)}
                        className="w-full flex items-center justify-between p-3 hover-elevate"
                        data-testid="section-admins"
                      >
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">Admins ({companyAdmins.length})</span>
                        </div>
                        {adminsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      {adminsExpanded && (
                        <div className="border-t p-3 space-y-2">
                          {companyAdmins.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No admins assigned.</p>
                          ) : (
                            companyAdmins.map((user) => (
                              <UserTagCard key={user.id} user={user} allTags={allUserTags} companyId={companyId!} customRoles={companyCustomRoles} />
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Team Members Section */}
                    <div className="border rounded-lg">
                      <button
                        onClick={() => setMembersExpanded(!membersExpanded)}
                        className="w-full flex items-center justify-between p-3 hover-elevate"
                        data-testid="section-members"
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">Team Members ({teamMembers.length})</span>
                        </div>
                        {membersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      {membersExpanded && (
                        <div className="border-t p-3 space-y-2">
                          {teamMembers.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No team members assigned.</p>
                          ) : (
                            teamMembers.map((user) => (
                              <UserTagCard key={user.id} user={user} allTags={allUserTags} companyId={companyId!} customRoles={companyCustomRoles} />
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {pendingCompanyInvitations.length > 0 && (
                      <div className="border rounded-lg">
                        <div className="p-3">
                          <div className="flex items-center gap-2 mb-3">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Pending Invitations ({pendingCompanyInvitations.length})</span>
                          </div>
                          <div className="space-y-2">
                            {pendingCompanyInvitations.map((inv) => (
                              <div
                                key={inv.id}
                                className="flex items-center justify-between gap-4 p-3 rounded-md border border-dashed"
                                data-testid={`company-invite-row-${inv.id}`}
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar>
                                    <AvatarFallback>
                                      <Mail className="h-4 w-4" />
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium" data-testid={`text-company-invite-email-${inv.id}`}>
                                      {inv.email || "Link invitation"}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {inv.role === "company_owner" ? "Company Owner" : inv.role === "company_admin" ? "Company Admin" : "Team Member"} · Expires {new Date(inv.expiresAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">Pending</Badge>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="icon" variant="ghost" data-testid={`button-cancel-company-invite-${inv.id}`}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will cancel the pending invitation{inv.email ? ` for ${inv.email}` : ""}. The invite link will no longer work.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Keep</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => cancelCompanyInvitationMutation.mutate(inv.id)}
                                          data-testid={`button-confirm-cancel-company-invite-${inv.id}`}
                                        >
                                          Cancel Invitation
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Approval Tab */}
          <TabsContent value="pending_approval" className="space-y-4">
            {pendingApprovalTasks.length > 0 ? (
              <div className="space-y-4">
                {pendingApprovalTasks.map((task) => (
                  <PendingApprovalCard
                    key={task.id}
                    task={task}
                    deliverableTypes={activeDeliverables}
                    companyId={companyId!}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No requests pending approval.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Credit History Tab */}
          <TabsContent value="credit-history" className="space-y-4">
            {transactions.length > 0 ? (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{tx.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-mono font-medium ${parseFloat(tx.amount) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {parseFloat(tx.amount) >= 0 ? "+" : ""}{tx.amount}
                      </p>
                      <p className="text-sm text-muted-foreground font-mono">
                        Balance: {tx.balanceAfter}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No transactions yet.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Company Info / Onboarding Tab */}
          <TabsContent value="onboarding" className="space-y-4">
            {companyId && <CompanyInfoHub companyId={companyId} />}
          </TabsContent>

          {/* Cadences Tab */}
          <TabsContent value="cadences" className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Recurring tasks that auto-generate each month</p>
              </div>
              <Button onClick={() => setCreateCadenceOpen(true)} data-testid="button-create-cadence">
                <Plus className="w-4 h-4 mr-2" />
                Create Cadence
              </Button>
            </div>

            {cadencesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : !cadenceList || cadenceList.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Repeat className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No cadences set up yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Create a cadence to auto-generate recurring tasks each month</p>
                  <Button className="mt-4" onClick={() => setCreateCadenceOpen(true)}>
                    Create your first cadence
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {cadenceList.map((cadence: any) => (
                  <Card
                    key={cadence.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => { setSelectedCadence(cadence); setCadenceDetailOpen(true); }}
                    data-testid={`cadence-card-${cadence.id}`}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="bg-primary/10 p-2 rounded-lg flex-shrink-0">
                            <Repeat className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{cadence.title}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                              <span className="capitalize">{cadence.frequency}</span>
                              {cadence.assignedToName && (
                                <>
                                  <span className="text-muted-foreground/50">&bull;</span>
                                  <span>{cadence.assignedToName}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {cadence.noCredit ? (
                            <Badge variant="outline" className="text-xs">No Credit</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs font-mono">{cadence.creditCost} cr</Badge>
                          )}
                          <Badge className="bg-green-500 text-xs">Active</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4">
            {(() => {
              const campaignYear = campaignMonthDate.getFullYear();
              const campaignMonth = campaignMonthDate.getMonth() + 1;
              const monthFilteredCampaigns = companyCampaignRequests.filter(c => {
                if (!c.dueDate) return true;
                const d = parseLocalDate(c.dueDate);
                return d.getFullYear() === campaignYear && d.getMonth() + 1 === campaignMonth;
              });

              const pendingCampaigns = monthFilteredCampaigns.filter(c => c.status === "pending");
              const approvedCampaigns = monthFilteredCampaigns.filter(c => c.status === "approved" || c.status === "in_progress");
              const completedCampaigns = monthFilteredCampaigns.filter(c => c.status === "completed");
              const cancelledCampaigns = monthFilteredCampaigns.filter(c => c.status === "cancelled");

              const campaignTabMap: Record<string, typeof companyCampaignRequests> = {
                requests: pendingCampaigns,
                approved: approvedCampaigns,
                completed: completedCampaigns,
                cancelled: cancelledCampaigns,
              };

              const getCampaignStatusBadge = (status: string) => {
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
                    return <Badge variant="destructive">Cancelled</Badge>;
                  default:
                    return <Badge variant="outline">{status}</Badge>;
                }
              };

              const renderCampaignCard = (campaign: CampaignRequest) => (
                <Card
                  key={campaign.id}
                  className="cursor-pointer hover-elevate"
                  onClick={() => {
                    setSelectedCampaign(campaign);
                    setCampaignDetailOpen(true);
                  }}
                  data-testid={`campaign-card-${campaign.id}`}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-primary/10 p-2 rounded-lg flex-shrink-0">
                          <Target className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate" data-testid={`text-campaign-name-${campaign.id}`}>
                            {campaign.name || "Campaign Request"}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Due {parseLocalDate(campaign.dueDate).toLocaleDateString()}
                            </span>
                            {campaign.isRush && (
                              <>
                                <span className="text-muted-foreground/50">&bull;</span>
                                <Badge className="bg-amber-500 text-white text-xs">
                                  <Zap className="w-3 h-3 mr-0.5" />
                                  Rush
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="secondary" className="text-xs font-mono" data-testid={`text-campaign-credits-${campaign.id}`}>
                          {parseFloat(campaign.estimatedCredits || "0").toFixed(1)} cr
                        </Badge>
                        {getCampaignStatusBadge(campaign.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );

              return (
                <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => { setCampaignMonthDate(new Date(campaignMonthDate.getFullYear(), campaignMonthDate.getMonth() - 1, 1)); setCompanyCampaignPages({}); }}
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
                    onClick={() => { setCampaignMonthDate(new Date(campaignMonthDate.getFullYear(), campaignMonthDate.getMonth() + 1, 1)); setCompanyCampaignPages({}); }}
                    data-testid="button-campaign-month-next"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Tabs value={companyCampaignTab} onValueChange={setCompanyCampaignTab}>
                  <MobileTabMenu
                    tabs={[
                      { value: "requests", label: `Requests (${pendingCampaigns.length})` },
                      { value: "approved", label: `Approved (${approvedCampaigns.length})` },
                      { value: "completed", label: `Completed (${completedCampaigns.length})` },
                      { value: "cancelled", label: `Cancelled (${cancelledCampaigns.length})` },
                    ]}
                    activeTab={companyCampaignTab}
                    onTabChange={setCompanyCampaignTab}
                  />
                  <TabsList className="hidden md:inline-flex h-auto flex-wrap gap-1">
                    <TabsTrigger value="requests" data-testid="tab-company-campaign-requests">
                      <Clock className="w-4 h-4 mr-2" />
                      Requests ({pendingCampaigns.length})
                    </TabsTrigger>
                    <TabsTrigger value="approved" data-testid="tab-company-campaign-approved">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approved ({approvedCampaigns.length})
                    </TabsTrigger>
                    <TabsTrigger value="completed" data-testid="tab-company-campaign-completed">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Completed ({completedCampaigns.length})
                    </TabsTrigger>
                    <TabsTrigger value="cancelled" data-testid="tab-company-campaign-cancelled">
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancelled ({cancelledCampaigns.length})
                    </TabsTrigger>
                  </TabsList>

                  {["requests", "approved", "completed", "cancelled"].map(tab => {
                    const allItems = campaignTabMap[tab] || [];
                    const currentPage = companyCampaignPages[tab] || 1;
                    const totalPages = Math.ceil(allItems.length / COMPANY_CAMPAIGNS_PER_PAGE);
                    const startIdx = (currentPage - 1) * COMPANY_CAMPAIGNS_PER_PAGE;
                    const paginatedItems = allItems.slice(startIdx, startIdx + COMPANY_CAMPAIGNS_PER_PAGE);

                    return (
                      <TabsContent key={tab} value={tab} className="space-y-3 mt-4">
                        {allItems.length === 0 ? (
                          <Card>
                            <CardContent className="py-8 text-center">
                              <Target className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                              <p className="text-muted-foreground">
                                {tab === "requests" && "No pending campaign requests"}
                                {tab === "approved" && "No approved campaigns"}
                                {tab === "completed" && "No completed campaigns yet"}
                                {tab === "cancelled" && "No cancelled campaigns"}
                              </p>
                            </CardContent>
                          </Card>
                        ) : (
                          <>
                            <div className="space-y-3">
                              {paginatedItems.map(renderCampaignCard)}
                            </div>
                            {totalPages > 1 && (
                              <div className="flex items-center justify-between pt-2">
                                <p className="text-sm text-muted-foreground">
                                  Showing {startIdx + 1}–{Math.min(startIdx + COMPANY_CAMPAIGNS_PER_PAGE, allItems.length)} of {allItems.length}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage <= 1}
                                    onClick={() => setCompanyCampaignPages(prev => ({ ...prev, [tab]: currentPage - 1 }))}
                                    data-testid={`button-company-campaign-prev-${tab}`}
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
                                    onClick={() => setCompanyCampaignPages(prev => ({ ...prev, [tab]: currentPage + 1 }))}
                                    data-testid={`button-company-campaign-next-${tab}`}
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
                </Tabs>
                </div>
              );
            })()}
          </TabsContent>

          <TabsContent value="reporting" className="space-y-6">
            <CompanyReportingTab companyId={companyId} companyName={company?.name || ""} tasks={tasks || []} />
          </TabsContent>
        </Tabs>
      </div>
      {/* Task Detail Panel */}
      <TaskDetailPanel
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        isAdmin={true}
        companyId={companyId || ""}
        onNavigateToChat={(threadId) => {
          setActiveTab("chat");
          setSelectedThreadId(threadId);
          setLocation(`/admin/companies/${companyId}?tab=chat&thread=${threadId}`);
        }}
      />
      {/* Campaign Detail Panel */}
      <CampaignDetailPanel
        campaign={selectedCampaign}
        open={campaignDetailOpen}
        onClose={() => {
          setCampaignDetailOpen(false);
          setSelectedCampaign(null);
        }}
        isAdmin={true}
        companyId={companyId}
        onTaskClick={(task) => {
          setCampaignDetailOpen(false);
          setSelectedCampaign(null);
          setSelectedTask(task);
        }}
      />
      {/* Calendar Task Dialog */}
      {selectedCalendarTask && (
        <Dialog open={!!selectedCalendarTask} onOpenChange={() => setSelectedCalendarTask(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedCalendarTask.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {getStatusIcon(selectedCalendarTask.status, selectedCalendarTask.approvalStatus)}
                <span className="capitalize">{selectedCalendarTask.status}</span>
              </div>
              {selectedCalendarTask.description && (
                <p className="text-sm text-muted-foreground">{selectedCalendarTask.description}</p>
              )}
              <div className="flex gap-2">
                {getPriorityBadge(selectedCalendarTask.priority)}
                <Badge variant="secondary">{selectedCalendarTask.creditCost} credits</Badge>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  setSelectedTask(selectedCalendarTask);
                  setSelectedCalendarTask(null);
                }}
                data-testid="button-view-task-details"
              >
                View Full Details
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {/* Add Members Dialog */}
      {companyId && selectedThreadId && (
        <ChatMemberSelector
          companyId={companyId}
          open={showAddMembers}
          onOpenChange={setShowAddMembers}
          mode="add"
          threadId={selectedThreadId}
          existingMemberIds={threadMembers.map(m => m.userId)}
          title="Add Members to Chat"
          description="Select people to add to this chat."
        />
      )}
      {/* View Members Dialog */}
      <Dialog open={showViewMembers} onOpenChange={setShowViewMembers}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chat Members</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="space-y-2">
              {threadMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-md"
                  data-testid={`chat-member-item-${member.userId}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {member.user?.firstName?.[0]}
                      {member.user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {member.user?.firstName} {member.user?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {member.user?.email}
                    </p>
                  </div>
                  {member.actualRole && (
                    <Badge variant="outline" className="text-xs">{member.actualRole}</Badge>
                  )}
                  {selectedThreadId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => setChatMemberToRemove({ threadId: selectedThreadId, memberId: member.userId, name: `${member.user?.firstName} ${member.user?.lastName}` })}
                      disabled={removeChatMemberMutation.isPending}
                      title="Remove from chat"
                      data-testid={`button-remove-member-${member.userId}`}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {threadMembers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No members found</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      {/* Merge Chat Dialog */}
      <Dialog open={showMergeChat} onOpenChange={(open) => { setShowMergeChat(open); if (!open) setMergeConfirmThread(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Chat Into This Thread</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Select another chat to merge into the current thread. All messages and members from the selected chat will be combined into this chat, and the selected chat will be removed.
          </p>
          <ScrollArea className="max-h-64">
            <div className="space-y-2">
              {threads
                .filter((t) => t.id !== selectedThreadId && !t.closedAt)
                .map((thread) => (
                  <div
                    key={thread.id}
                    className="flex items-center justify-between p-3 border rounded-md hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => setMergeConfirmThread(thread)}
                    data-testid={`merge-thread-${thread.id}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">
                        {thread.name || (thread.type === "task" ? "Task Chat" : thread.isCompanyWide ? "Team Chat" : "Group Chat")}
                      </span>
                    </div>
                    <GitMerge className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                ))}
              {threads.filter((t) => t.id !== selectedThreadId && !t.closedAt).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No other active chats available to merge</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!mergeConfirmThread} onOpenChange={(open) => { if (!open) setMergeConfirmThread(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Merge</AlertDialogTitle>
            <AlertDialogDescription>
              Merge "{mergeConfirmThread?.name || "Unnamed Chat"}" into the current chat? All messages and members will be combined, and the selected chat will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-merge">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-merge"
              onClick={() => {
                if (mergeConfirmThread && selectedThreadId) {
                  mergeChatMutation.mutate({
                    targetThreadId: selectedThreadId,
                    sourceThreadId: mergeConfirmThread.id,
                  });
                }
                setMergeConfirmThread(null);
                setShowMergeChat(false);
              }}
            >
              Merge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!chatMemberToRemove} onOpenChange={(open) => { if (!open) setChatMemberToRemove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {chatMemberToRemove?.name} from this chat?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (chatMemberToRemove) {
                  removeChatMemberMutation.mutate({ threadId: chatMemberToRemove.threadId, memberId: chatMemberToRemove.memberId });
                }
                setChatMemberToRemove(null);
              }}
              data-testid="button-confirm-remove-member"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!meetingToReject} onOpenChange={(open) => { if (!open) setMeetingToReject(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Meeting Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this meeting request?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (meetingToReject) {
                  companyRejectMutation.mutate(meetingToReject);
                }
                setMeetingToReject(null);
              }}
              data-testid="button-confirm-reject-meeting"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Meeting Approve Dialog */}
      <Dialog open={companyApproveDialogOpen} onOpenChange={setCompanyApproveDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Approve Meeting Request</DialogTitle>
          </DialogHeader>
          {selectedMeetingRequest && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium">{selectedMeetingRequest.title}</p>
                <p className="text-sm text-muted-foreground">
                  {formatMeetingDateTime(selectedMeetingRequest)} · {selectedMeetingRequest.duration} min
                </p>
              </div>
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
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded-md">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Create the calendar event
                </p>
                <Button variant="outline" size="sm" asChild className="w-full">
                  <a href={generateMeetingOutlookLink(selectedMeetingRequest)} target="_blank" rel="noopener noreferrer">
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    Open Outlook Calendar
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </a>
                </Button>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                  After creating the meeting, copy the Teams link and paste it below.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyMeetingTeamsLink">Paste Teams Meeting Link</Label>
                <Input id="companyMeetingTeamsLink" value={meetingTeamsLink} onChange={(e) => setMeetingTeamsLink(e.target.value)} placeholder="Paste your Teams meeting link here..." data-testid="input-company-meeting-teams-link" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyMeetingAdminNotes">Admin Notes (Optional)</Label>
                <Textarea id="companyMeetingAdminNotes" value={meetingAdminNotes} onChange={(e) => setMeetingAdminNotes(e.target.value)} placeholder="Any internal notes..." data-testid="input-company-meeting-admin-notes" />
              </div>
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCompanyApproveDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!selectedMeetingRequest) return;
                const proposedTime = computeMeetingTime(editMeetingTimeHour, editMeetingTimeMinute, editMeetingTimePeriod);
                companyApproveMutation.mutate({
                  id: selectedMeetingRequest.id,
                  teamsLink: meetingTeamsLink,
                  adminNotes: meetingAdminNotes,
                  proposedDate: editMeetingDate || undefined,
                  proposedTime: proposedTime || undefined,
                  creditCost: editMeetingCredits || undefined,
                  duration: editMeetingDuration ? parseInt(editMeetingDuration) : undefined,
                });
              }}
              disabled={companyApproveMutation.isPending}
              data-testid="button-confirm-company-approve"
            >
              {companyApproveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Approve
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Edit Meeting Dialog (for approved meetings before completion) */}
      <Dialog open={companyEditMeetingDialogOpen} onOpenChange={setCompanyEditMeetingDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Meeting</DialogTitle>
          </DialogHeader>
          {selectedMeetingRequest && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium">{selectedMeetingRequest.title}</p>
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
                <Input value={meetingTeamsLink} onChange={(e) => setMeetingTeamsLink(e.target.value)} placeholder="Teams meeting link..." data-testid="input-edit-meeting-teams-link" />
              </div>
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCompanyEditMeetingDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!selectedMeetingRequest) return;
                const proposedTime = computeMeetingTime(editMeetingTimeHour, editMeetingTimeMinute, editMeetingTimePeriod);
                companyEditMeetingMutation.mutate({
                  id: selectedMeetingRequest.id,
                  proposedDate: editMeetingDate,
                  proposedTime,
                  creditCost: editMeetingCredits,
                  duration: parseInt(editMeetingDuration) || 30,
                  teamsLink: meetingTeamsLink,
                });
              }}
              disabled={companyEditMeetingMutation.isPending}
              data-testid="button-save-edit-meeting"
            >
              {companyEditMeetingMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={createCadenceOpen} onOpenChange={setCreateCadenceOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Cadence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={cadenceTitle}
                onChange={(e) => setCadenceTitle(e.target.value)}
                placeholder="e.g., Monthly Blog Posts"
                data-testid="input-cadence-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Deliverable Type</Label>
              <DeliverableTypePicker
                deliverableTypes={activeDeliverables}
                value={cadenceDeliverableType}
                onValueChange={(val) => {
                  setCadenceDeliverableType(val);
                  if (!cadenceTitle) {
                    const del = activeDeliverables.find(d => d.key === val);
                    if (del) setCadenceTitle(del.name);
                  }
                  if (!cadenceCreditCost) {
                    const del = activeDeliverables.find(d => d.key === val);
                    if (del) setCadenceCreditCost(del.credits);
                  }
                }}
                placeholder="Select deliverable type"
                data-testid="select-cadence-deliverable"
              />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={cadenceFrequency} onValueChange={setCadenceFrequency}>
                <SelectTrigger data-testid="select-cadence-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(cadenceFrequency === "weekly" || cadenceFrequency === "biweekly") && (
              <div className="space-y-2">
                <Label>Scheduled Days</Label>
                <div className="flex flex-wrap gap-2">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                    <Button
                      key={day}
                      type="button"
                      size="sm"
                      variant={cadenceScheduledDays.includes(day) ? "default" : "outline"}
                      className="toggle-elevate"
                      onClick={() => {
                        setCadenceScheduledDays(prev =>
                          prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                        );
                      }}
                      data-testid={`button-cadence-day-${day.toLowerCase()}`}
                    >
                      {day.slice(0, 3)}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {cadenceFrequency === "weekly" 
                    ? "Tasks will be created for each selected day every week"
                    : "Tasks will be created for the first occurrence of a selected day in each half of the month"}
                </p>
              </div>
            )}
            {cadenceFrequency === "monthly" && (
              <div className="space-y-2">
                <Label>Day of Month</Label>
                <div className="grid grid-cols-7 gap-1" data-testid="calendar-cadence-month-day">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <Button
                      key={day}
                      type="button"
                      size="sm"
                      variant={cadenceMonthDays.includes(day) ? "default" : "outline"}
                      className="toggle-elevate h-8 w-full text-xs"
                      onClick={() => {
                        setCadenceMonthDays(prev =>
                          prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b)
                        );
                      }}
                      data-testid={`button-cadence-month-day-${day}`}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Select one or more days — tasks will be due on each selected day every month. In shorter months, days 29-31 will fall on the last day of the month.</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Assign To (Optional)</Label>
              <Select value={cadenceAssignedTo} onValueChange={setCadenceAssignedTo}>
                <SelectTrigger data-testid="select-cadence-assignee">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {assignees?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-2">
                        {a.name}
                        {a.roleLabel && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{a.roleLabel}</Badge>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Credit Cost</Label>
              <Input
                type="number"
                value={cadenceCreditCost}
                onChange={(e) => setCadenceCreditCost(e.target.value)}
                placeholder="Credits per task"
                data-testid="input-cadence-credits"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="cadenceNoCredit"
                checked={cadenceNoCredit}
                onCheckedChange={(checked) => setCadenceNoCredit(!!checked)}
              />
              <Label htmlFor="cadenceNoCredit">No credit deduction</Label>
            </div>
            <div className="space-y-2">
              <Label>Task Ownership</Label>
              <Select value={cadenceTaskOwnership} onValueChange={setCadenceTaskOwnership}>
                <SelectTrigger data-testid="select-cadence-ownership">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agency">Agency</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateCadenceOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!cadenceTitle.trim()) {
                  toast({ title: "Title is required", variant: "destructive" });
                  return;
                }
                const assignee = assignees?.find(a => a.id === cadenceAssignedTo);
                createCadenceMutation.mutate({
                  title: cadenceTitle.trim(),
                  deliverableTypeId: cadenceDeliverableType || null,
                  frequency: cadenceFrequency,
                  assignedTo: cadenceAssignedTo || null,
                  assignedToName: assignee?.name || null,
                  creditCost: cadenceCreditCost || "1",
                  noCredit: cadenceNoCredit,
                  taskOwnership: cadenceTaskOwnership,
                  scheduledDays: (cadenceFrequency === "weekly" || cadenceFrequency === "biweekly") ? cadenceScheduledDays : null,
                  monthDays: cadenceFrequency === "monthly" ? cadenceMonthDays : null,
                });
              }}
              disabled={createCadenceMutation.isPending}
              data-testid="button-submit-cadence"
            >
              Create Cadence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Sheet open={cadenceDetailOpen} onOpenChange={(open) => { if (!open) { setCadenceDetailOpen(false); setSelectedCadence(null); } }}>
        <SheetContent className="w-[400px] sm:w-[450px] overflow-y-auto" data-testid="cadence-detail-sheet">
          <SheetHeader>
            <SheetTitle>Cadence Details</SheetTitle>
          </SheetHeader>
          {selectedCadence && (
            <div className="space-y-5 mt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Title</Label>
                  <Input
                    value={selectedCadence.title}
                    onChange={(e) => setSelectedCadence({ ...selectedCadence, title: e.target.value })}
                    onBlur={() => updateCadenceMutation.mutate({ id: selectedCadence.id, data: { title: selectedCadence.title } })}
                    data-testid="input-cadence-detail-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Deliverable Type</Label>
                  <DeliverableTypePicker
                    deliverableTypes={activeDeliverables}
                    value={selectedCadence.deliverableTypeId || ""}
                    onValueChange={(val) => {
                      setSelectedCadence({ ...selectedCadence, deliverableTypeId: val });
                      updateCadenceMutation.mutate({ id: selectedCadence.id, data: { deliverableTypeId: val } });
                    }}
                    placeholder="Select deliverable type"
                    data-testid="select-cadence-detail-deliverable"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Frequency</Label>
                  <Select
                    value={selectedCadence.frequency}
                    onValueChange={(val) => {
                      setSelectedCadence({ ...selectedCadence, frequency: val });
                      updateCadenceMutation.mutate({ id: selectedCadence.id, data: { frequency: val } });
                    }}
                  >
                    <SelectTrigger data-testid="select-cadence-detail-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Biweekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(selectedCadence.frequency === "weekly" || selectedCadence.frequency === "biweekly") && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Scheduled Days</Label>
                    <div className="flex flex-wrap gap-2">
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                        <Button
                          key={day}
                          type="button"
                          size="sm"
                          variant={(selectedCadence.scheduledDays || []).includes(day) ? "default" : "outline"}
                          className="toggle-elevate"
                          onClick={() => {
                            const current = selectedCadence.scheduledDays || [];
                            const newDays = current.includes(day) ? current.filter((d: string) => d !== day) : [...current, day];
                            setSelectedCadence({ ...selectedCadence, scheduledDays: newDays });
                            updateCadenceMutation.mutate({ id: selectedCadence.id, data: { scheduledDays: newDays } });
                          }}
                          data-testid={`button-cadence-detail-day-${day.toLowerCase()}`}
                        >
                          {day.slice(0, 3)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {selectedCadence.frequency === "monthly" && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Days of Month</Label>
                    <div className="grid grid-cols-7 gap-1" data-testid="calendar-cadence-detail-month-day">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                        const selected = (selectedCadence.monthDays || [15]).includes(day);
                        return (
                          <Button
                            key={day}
                            type="button"
                            size="sm"
                            variant={selected ? "default" : "outline"}
                            className="toggle-elevate h-8 w-full text-xs"
                            onClick={() => {
                              const current: number[] = selectedCadence.monthDays || [15];
                              const updated = current.includes(day)
                                ? current.filter((d: number) => d !== day)
                                : [...current, day].sort((a: number, b: number) => a - b);
                              setSelectedCadence({ ...selectedCadence, monthDays: updated });
                              updateCadenceMutation.mutate({ id: selectedCadence.id, data: { monthDays: updated } });
                            }}
                            data-testid={`button-cadence-detail-month-day-${day}`}
                          >
                            {day}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Assigned To</Label>
                  <Select
                    value={selectedCadence.assignedTo || ""}
                    onValueChange={(val) => {
                      const assignee = assignees?.find(a => a.id === val);
                      setSelectedCadence({ ...selectedCadence, assignedTo: val, assignedToName: assignee?.name || null });
                      updateCadenceMutation.mutate({ id: selectedCadence.id, data: { assignedTo: val, assignedToName: assignee?.name || null } });
                    }}
                  >
                    <SelectTrigger data-testid="select-cadence-detail-assignee">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignees?.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          <span className="flex items-center gap-2">
                            {a.name}
                            {a.roleLabel && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{a.roleLabel}</Badge>}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Credit Cost</Label>
                  <Input
                    type="number"
                    value={selectedCadence.creditCost}
                    onChange={(e) => setSelectedCadence({ ...selectedCadence, creditCost: e.target.value })}
                    onBlur={() => updateCadenceMutation.mutate({ id: selectedCadence.id, data: { creditCost: selectedCadence.creditCost } })}
                    data-testid="input-cadence-detail-credits"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="cadenceDetailNoCredit"
                    checked={selectedCadence.noCredit}
                    onCheckedChange={(checked) => {
                      setSelectedCadence({ ...selectedCadence, noCredit: !!checked });
                      updateCadenceMutation.mutate({ id: selectedCadence.id, data: { noCredit: !!checked } });
                    }}
                  />
                  <Label htmlFor="cadenceDetailNoCredit">No credit deduction</Label>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Task Ownership</Label>
                  <Select
                    value={selectedCadence.taskOwnership}
                    onValueChange={(val) => {
                      setSelectedCadence({ ...selectedCadence, taskOwnership: val });
                      updateCadenceMutation.mutate({ id: selectedCadence.id, data: { taskOwnership: val } });
                    }}
                  >
                    <SelectTrigger data-testid="select-cadence-detail-ownership">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agency">Agency</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <Badge className="bg-green-500 text-xs">Active</Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Created</span>
                  <span className="text-sm">{new Date(selectedCadence.createdAt).toLocaleDateString()}</span>
                </div>
                {selectedCadence.lastGeneratedAt && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Last Generated</span>
                    <span className="text-sm">{new Date(selectedCadence.lastGeneratedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => startNowMutation.mutate(selectedCadence.id)}
                  disabled={startNowMutation.isPending}
                  data-testid="button-start-cadence-now"
                >
                  {startNowMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                  Start Now (Remaining Month)
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => startEntireMonthMutation.mutate(selectedCadence.id)}
                  disabled={startEntireMonthMutation.isPending}
                  data-testid="button-start-cadence-entire-month"
                >
                  {startEntireMonthMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calendar className="w-4 h-4 mr-2" />}
                  Include Entire Month
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" data-testid="button-cancel-cadence">
                      Remove Cadence
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Cadence</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the cadence and stop future tasks from being auto-generated. Existing tasks will not be affected.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Active</AlertDialogCancel>
                      <AlertDialogAction onClick={() => cancelCadenceMutation.mutate(selectedCadence.id)}>
                        Remove Cadence
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

interface UserTagCardProps {
  user: {
    id: string;
    memberId: string;
    role: string;
    customRoleId?: string | null;
    email: string;
    firstName: string;
    lastName: string;
    createdAt: string;
    tags?: { id: string; name: string; color: string; isPreset: boolean }[];
  };
  allTags: { id: string; name: string; color: string; isPreset: boolean }[];
  companyId: string;
  customRoles?: { id: string; name: string }[];
}

function UserTagCard({ user, allTags, companyId, customRoles = [] }: UserTagCardProps) {
  const { toast } = useToast();
  const [tagDialogOpen, setTagDialogOpen] = useState(false);

  const displayName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;

  const assignTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      return apiRequest("POST", `/api/admin/users/${user.id}/tags`, { tagId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies", companyId, "users"] });
      toast({ title: "Tag assigned" });
      setTagDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to assign tag", variant: "destructive" });
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      return apiRequest("DELETE", `/api/admin/users/${user.id}/tags/${tagId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies", companyId, "users"] });
      toast({ title: "Tag removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove tag", variant: "destructive" });
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ role, customRoleId }: { role: string; customRoleId?: string }) => {
      return apiRequest("PATCH", `/api/admin/members/${user.memberId}/role`, { role, customRoleId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies", companyId, "users"] });
      toast({ title: "Role updated" });
    },
    onError: () => {
      toast({ title: "Failed to update role", variant: "destructive" });
    },
  });

  const getRoleSelectValue = () => {
    if (user.role === "custom" && user.customRoleId) return `custom:${user.customRoleId}`;
    return user.role;
  };

  const handleRoleChange = (value: string) => {
    if (value.startsWith("custom:")) {
      const customRoleId = value.replace("custom:", "");
      changeRoleMutation.mutate({ role: "custom", customRoleId });
    } else {
      changeRoleMutation.mutate({ role: value });
    }
  };

  const userTagIds = (user.tags || []).map(t => t.id);
  const availableTags = allTags.filter(t => !userTagIds.includes(t.id));

  return (
    <div className="flex items-center justify-between p-2 border rounded" data-testid={`user-card-${user.id}`}>
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            {(user.firstName?.[0] || user.email[0]).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium">{displayName}</div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <Select value={getRoleSelectValue()} onValueChange={handleRoleChange} disabled={changeRoleMutation.isPending}>
          <SelectTrigger className="w-40 h-8 text-xs" data-testid={`select-role-${user.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="company_owner">Owner</SelectItem>
            <SelectItem value="company_admin">Admin</SelectItem>
            <SelectItem value="team_member">Team Member</SelectItem>
            {customRoles.map(cr => (
              <SelectItem key={cr.id} value={`custom:${cr.id}`}>{cr.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {user.tags?.map((tag) => (
          <Badge 
            key={tag.id} 
            style={{ backgroundColor: tag.color, color: "#fff" }}
            className="gap-1"
            data-testid={`tag-${tag.id}`}
          >
            <span data-testid={`text-tag-${tag.id}`}>{tag.name}</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-4 w-4 p-0 ml-0.5"
              onClick={() => removeTagMutation.mutate(tag.id)}
              disabled={removeTagMutation.isPending}
              data-testid={`button-remove-tag-${tag.id}`}
            >
              <X className="w-3 h-3" />
            </Button>
          </Badge>
        ))}
        
        <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" data-testid={`button-add-tag-${user.id}`}>
              <Tag className="w-3 h-3 mr-1" />
              Add Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Tag to {displayName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {availableTags.length > 0 ? (
                <div className="space-y-2">
                  <Label>Select Tag</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                      <Button
                        key={tag.id}
                        variant="outline"
                        size="sm"
                        style={{ backgroundColor: tag.color, color: "#fff", borderColor: tag.color }}
                        onClick={() => assignTagMutation.mutate(tag.id)}
                        disabled={assignTagMutation.isPending}
                        data-testid={`button-select-tag-${tag.id}`}
                      >
                        {tag.name}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No tags available. Create preset tags in Settings first.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function CompanyReportingTab({ companyId, companyName, tasks }: { companyId: string; companyName: string; tasks: Task[] }) {
  const { toast } = useToast();
  const [reportMonth, setReportMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  });
  const [notesText, setNotesText] = useState("");
  const [notesLoaded, setNotesLoaded] = useState(false);

  const month = reportMonth.getMonth() + 1;
  const year = reportMonth.getFullYear();

  const { data: reportNote, isLoading: noteLoading } = useQuery<{ id: string; notes: string } | null>({
    queryKey: ["/api/admin/companies", companyId, "report-notes", month, year],
    queryFn: async () => {
      const res = await fetch(`/api/admin/companies/${companyId}/report-notes?month=${month}&year=${year}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: creditTxns } = useQuery<CreditTransaction[]>({
    queryKey: ["/api/credit-transactions", companyId],
    queryFn: async () => {
      const res = await fetch(`/api/credit-transactions?companyId=${companyId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: companyMeetings = [] } = useQuery<MeetingRequest[]>({
    queryKey: ["/api/companies", companyId, "meeting-requests"],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/meeting-requests`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  useEffect(() => {
    if (!noteLoading) {
      setNotesText(reportNote?.notes || "");
      setNotesLoaded(true);
    }
  }, [reportNote, noteLoading]);

  const saveNotesMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", `/api/admin/companies/${companyId}/report-notes`, { month, year, notes: notesText });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies", companyId, "report-notes"] });
      toast({ title: "Notes saved" });
    },
    onError: () => {
      toast({ title: "Failed to save notes", variant: "destructive" });
    },
  });

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextM = month === 12 ? 1 : month + 1;
  const nextY = month === 12 ? year + 1 : year;
  const monthEnd = `${nextY}-${String(nextM).padStart(2, '0')}-01`;

  const completedTasks = tasks.filter(t => {
    if (t.status !== "completed") return false;
    if (t.approvalStatus === "rejected") return false;
    if (!t.completedAt) return false;
    const dateStr = t.completedAt.slice(0, 10);
    return dateStr >= monthStart && dateStr < monthEnd;
  });
  const agencyTasks = completedTasks.filter(t => t.creditsDeducted || t.noCredit);
  const clientTasks = completedTasks.filter(t => !t.creditsDeducted && !t.noCredit);

  const monthCreditTxns = (creditTxns || []).filter(ct => {
    const dateStr = ct.createdAt?.slice(0, 10);
    return dateStr && dateStr >= monthStart && dateStr < monthEnd;
  });

  let creditsUsed = 0;
  let creditsPurchased = 0;
  for (const ct of monthCreditTxns) {
    const amount = parseFloat(ct.amount);
    if (ct.type === 'deduction' || ct.type === 'task_deduction') {
      creditsUsed += Math.abs(amount);
    } else if (ct.type === 'revision_charge') {
      creditsUsed += Math.abs(amount);
    } else if (ct.type === 'purchase' || ct.type === 'stripe_purchase') {
      creditsPurchased += amount;
    }
  }

  const monthMeetings = companyMeetings.filter(m => {
    if (m.status !== 'approved' && m.status !== 'completed') return false;
    const dateStr = m.proposedDate?.slice(0, 10);
    return dateStr && dateStr >= monthStart && dateStr < monthEnd;
  });

  const deliverableCounts: Record<string, number> = {};
  for (const t of completedTasks) {
    if (t.deliverableType) {
      deliverableCounts[t.deliverableType] = (deliverableCounts[t.deliverableType] || 0) + 1;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold">Company Report</h3>
          <p className="text-sm text-muted-foreground">View monthly stats and add admin notes for the report email</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setReportMonth(new Date(reportMonth.getFullYear(), reportMonth.getMonth() - 1, 1))} data-testid="button-report-month-prev">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[140px] text-center" data-testid="text-report-month">
            {reportMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setReportMonth(new Date(reportMonth.getFullYear(), reportMonth.getMonth() + 1, 1))} data-testid="button-report-month-next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{completedTasks.length}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Tasks Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-amber-600">{Math.round(creditsUsed * 100) / 100}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Credits Used</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-600">{Math.round(creditsPurchased * 100) / 100}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Credits Purchased</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-purple-600" data-testid="text-report-meetings">{monthMeetings.length}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Meetings Held</div>
          </CardContent>
        </Card>
      </div>

      {Object.keys(deliverableCounts).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Deliverables Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(deliverableCounts).map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-sm" data-testid={`badge-deliverable-${type}`}>
                  {type.replace(/_/g, ' ')} <span className="ml-1 font-bold">{count}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Agency Completed ({agencyTasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {agencyTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No agency-completed tasks this month</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {agencyTasks.map(t => (
                  <div key={t.id} className="flex justify-between items-center text-sm p-2 rounded bg-muted/50" data-testid={`report-task-${t.id}`}>
                    <span className="truncate mr-2">{t.title}</span>
                    <Badge variant="outline">{t.creditCost} cr</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Client Self-Service ({clientTasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {clientTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No self-service tasks this month</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {clientTasks.map(t => (
                  <div key={t.id} className="flex justify-between items-center text-sm p-2 rounded bg-muted/50" data-testid={`report-client-task-${t.id}`}>
                    <span className="truncate mr-2">{t.title}</span>
                    <Badge variant="outline">0 cr</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {monthMeetings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Meetings Held ({monthMeetings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {monthMeetings.map(m => (
                <div key={m.id} className="flex justify-between items-center text-sm p-2 rounded bg-muted/50" data-testid={`report-meeting-${m.id}`}>
                  <span className="truncate mr-2">{m.title}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{m.proposedDate} at {m.proposedTime}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileEdit className="h-4 w-4" />
            Admin Notes for Monthly Report
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            These notes will appear in the &quot;Notes from Your Team&quot; section of the monthly report email sent to {companyName}.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {noteLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <>
              <Textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Add notes for this month's report..."
                rows={5}
                data-testid="input-report-notes"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {reportNote ? `Last updated: ${new Date(reportNote.id ? (reportNote as any).updatedAt || "" : "").toLocaleDateString() || "Recently"}` : "No notes yet for this month"}
                </span>
                <Button
                  onClick={() => saveNotesMutation.mutate()}
                  disabled={saveNotesMutation.isPending}
                  size="sm"
                  data-testid="button-save-report-notes"
                >
                  {saveNotesMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {saveNotesMutation.isPending ? "Saving..." : "Save Notes"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type EnrichedTask = Task & { assignedByName?: string | null };

interface PendingApprovalCardProps {
  task: EnrichedTask;
  deliverableTypes: DeliverableType[];
  companyId: string;
}

function PendingApprovalCard({ task, deliverableTypes, companyId }: PendingApprovalCardProps) {
  const { toast } = useToast();
  const [selectedDeliverable, setSelectedDeliverable] = useState(task.deliverableType || "");
  const [noCredit, setNoCredit] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRush, setIsRush] = useState(
    !!(task.notes?.includes("[RUSH]") || task.priority === "urgent")
  );
  const [taskOwnership, setTaskOwnership] = useState<"agency" | "client">("agency");
  const [assignedTo, setAssignedTo] = useState(task.assignedTo || "");

  const { data: approvalAssignees } = useQuery<Assignee[]>({
    queryKey: ["/api/companies", companyId, "assignees"],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}/assignees`);
      if (!response.ok) throw new Error("Failed to fetch assignees");
      return response.json();
    },
    enabled: !!companyId,
  });

  const selectedDeliverableData = deliverableTypes.find(d => d.key === selectedDeliverable);

  const baseCost = selectedDeliverableData
    ? parseFloat(selectedDeliverableData.credits)
    : (task.creditCost ? parseFloat(task.creditCost) / (isRush ? 2 : 1) : 0);

  const rushMultiplier = isRush ? 2 : 1;
  const bulkQty = (task as any).bulkQuantity && (task as any).bulkQuantity > 1 ? (task as any).bulkQuantity : 1;
  const effectiveNoCredit = noCredit || taskOwnership === "client";
  const creditCost = effectiveNoCredit ? 0 : baseCost * rushMultiplier * bulkQty;

  const approveMutation = useMutation({
    mutationFn: async (data: { approvalStatus: string; deliverableType?: string; creditCost?: number; noCredit?: boolean; taskOwnership?: string; assignedTo?: string; rejectionReason?: string }) => {
      return apiRequest("POST", `/api/tasks/${task.id}/approve`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", { companyId }] });
      toast({ title: "Task request updated" });
      setRejectDialogOpen(false);
      setRejectionReason("");
    },
    onError: () => {
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  const handleApprove = () => {
    approveMutation.mutate({
      approvalStatus: "approved",
      deliverableType: selectedDeliverable || undefined,
      creditCost,
      noCredit: effectiveNoCredit,
      taskOwnership,
      assignedTo: assignedTo || undefined,
    });
  };

  const handleReject = () => {
    approveMutation.mutate({
      approvalStatus: "rejected",
      rejectionReason: rejectionReason.trim() || undefined,
    });
  };

  return (
    <Card className="border-yellow-500/30" data-testid={`approval-card-${task.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-lg">{task.title}</CardTitle>
            {isRush && (
              <Badge variant="destructive" className="gap-1 flex-shrink-0" data-testid={`badge-rush-${task.id}`}>
                <Zap className="w-3 h-3" />
                RUSH 2x
              </Badge>
            )}
          </div>
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 flex-shrink-0">
            Awaiting Approval
          </Badge>
        </div>
        {task.description && (
          <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          <Badge variant={task.priority === "urgent" ? "destructive" : "secondary"}>
            {task.priority}
          </Badge>
          {bulkQty > 1 && (
            <Badge variant="secondary" data-testid={`badge-bulk-${task.id}`}>
              x{bulkQty} qty
            </Badge>
          )}
          <span>Requested {new Date(task.createdAt).toLocaleDateString()}</span>
          {task.assignedByName && (
            <span data-testid={`text-requester-${task.id}`}>
              by <span className="font-medium text-foreground">{task.assignedByName}</span>
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Assign Deliverable Type</Label>
            <DeliverableTypePicker
              deliverableTypes={deliverableTypes}
              value={selectedDeliverable}
              onValueChange={setSelectedDeliverable}
              disabled={noCredit}
              placeholder="Select deliverable type"
              data-testid={`select-deliverable-${task.id}`}
            />
          </div>

          <div className="space-y-2">
            <Label>Estimated Credit Cost</Label>
            <div className="h-9 flex items-center px-3 rounded-md border bg-muted/50">
              <span className="font-mono" data-testid={`text-credit-cost-${task.id}`}>
                {creditCost} credits
                {isRush && !effectiveNoCredit && " (2x rush)"}
                {bulkQty > 1 && !effectiveNoCredit && ` (x${bulkQty})`}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Task Ownership</Label>
            <Select value={taskOwnership} onValueChange={(val) => setTaskOwnership(val as "agency" | "client")}>
              <SelectTrigger data-testid={`select-ownership-${task.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agency">Agency Managed</SelectItem>
                <SelectItem value="client">Client Managed</SelectItem>
              </SelectContent>
            </Select>
            {taskOwnership === "client" && (
              <p className="text-xs text-muted-foreground">Client managed tasks skip credit checks</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Primary Assignee</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger data-testid={`select-assignee-${task.id}`}>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                {approvalAssignees?.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="flex items-center gap-2">
                      {a.name}
                      {a.roleLabel && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{a.roleLabel}</Badge>}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Switch
              id={`rush-${task.id}`}
              checked={isRush}
              onCheckedChange={setIsRush}
              disabled={effectiveNoCredit}
              data-testid={`switch-rush-${task.id}`}
            />
            <Label htmlFor={`rush-${task.id}`} className="text-sm font-normal cursor-pointer flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-orange-500" />
              Rush Order (2x credits)
            </Label>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox 
            id={`noCredit-${task.id}`}
            checked={noCredit}
            onCheckedChange={(checked) => setNoCredit(checked === true)}
            disabled={taskOwnership === "client"}
            data-testid={`checkbox-no-credit-${task.id}`}
          />
          <Label htmlFor={`noCredit-${task.id}`} className="text-sm font-normal cursor-pointer">
            No credit charge (e.g., review meeting, internal task)
          </Label>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={handleApprove}
            disabled={approveMutation.isPending || (!selectedDeliverable && !effectiveNoCredit)}
            className="gap-2"
            data-testid={`button-approve-${task.id}`}
          >
            <CheckCircle className="w-4 h-4" />
            {approveMutation.isPending ? "Approving..." : "Approve"}
          </Button>
          <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                disabled={approveMutation.isPending}
                className="gap-2 text-destructive"
                data-testid={`button-reject-${task.id}`}
              >
                <XCircle className="w-4 h-4" />
                Reject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Task Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Rejecting: <strong>{task.title}</strong>
                </p>
                <div className="space-y-2">
                  <Label htmlFor={`rejection-reason-${task.id}`}>Reason (optional)</Label>
                  <Textarea
                    id={`rejection-reason-${task.id}`}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide a reason for rejecting this request..."
                    className="resize-none"
                    rows={3}
                    data-testid={`textarea-rejection-reason-${task.id}`}
                  />
                  <p className="text-xs text-muted-foreground">
                    If provided, the reason will be sent as a notification and posted in the task chat.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={() => setRejectDialogOpen(false)} data-testid="button-cancel-reject">
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={approveMutation.isPending}
                    className="gap-2"
                    data-testid={`button-confirm-reject-${task.id}`}
                  >
                    <XCircle className="w-4 h-4" />
                    {approveMutation.isPending ? "Rejecting..." : "Reject Task"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskAssigneeAvatars({ taskId }: { taskId: string }) {
  const { data: assignees } = useQuery<any[]>({
    queryKey: ["/api/tasks", taskId, "assignees"],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/assignees`);
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 30000,
  });

  if (!assignees || assignees.length === 0) {
    return (
      <span className="text-xs text-muted-foreground" data-testid={`text-unassigned-${taskId}`}>Unassigned</span>
    );
  }

  const visible = assignees.slice(0, 3);
  const overflow = assignees.length - 3;

  return (
    <div className="flex items-center -space-x-1.5" data-testid={`assignee-avatars-${taskId}`}>
      {visible.map((a: any) => (
        <Tooltip key={a.userId}>
          <TooltipTrigger asChild>
            <Avatar className="h-6 w-6 border-2 border-background">
              <AvatarFallback className="text-[9px]">
                {(a.userName || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {a.userName || a.userEmail}
          </TooltipContent>
        </Tooltip>
      ))}
      {overflow > 0 && (
        <Avatar className="h-6 w-6 border-2 border-background">
          <AvatarFallback className="text-[9px]">+{overflow}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
