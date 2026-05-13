import { useState, useEffect, useRef, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Circle, CheckCircle2, Plus, Trash2, User, Calendar, CreditCard, MessageCircle, Send, Loader2, UserPlus, Users, Repeat, StopCircle, Edit2, Check, X, Paperclip, Download, Upload, FileText, Timer, Play, Pause, RotateCcw, ImageUp, Tag, Layers, Link2, ExternalLink, Building2, Target } from "lucide-react";
import { ChatMemberSelector } from "@/components/chat-member-selector";
import { MentionInput, renderMessageWithMentions } from "@/components/mention-input";
import { DeliverableTypePicker } from "@/components/deliverable-type-picker";
import { useAuth } from "@/hooks/use-auth";
import type { Task, TaskChecklistItem, TaskComment, TaskAttachment, TaskLink, DeliverableType } from "@shared/schema";

interface ChatThread {
  id: string;
  companyId: string;
  name: string | null;
  type: "general" | "group" | "task";
  taskId: string | null;
}

interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  createdAt: string;
  isEdited: boolean;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

interface TaskDetailPanelProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  companyId: string;
  onNavigateToChat?: (threadId: string, companyId: string) => void;
  onNavigateToMediaUploads?: () => void;
  onViewCampaign?: (campaignRequestId: string) => void;
}

export function TaskDetailPanel({ task: initialTask, open, onClose, isAdmin, companyId, onNavigateToChat, onNavigateToMediaUploads, onViewCampaign }: TaskDetailPanelProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [messageMentions, setMessageMentions] = useState<string[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [editingCredits, setEditingCredits] = useState(false);
  const [editCreditValue, setEditCreditValue] = useState("");
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [editDueDateValue, setEditDueDateValue] = useState("");
  const [editingBulkQuantity, setEditingBulkQuantity] = useState<number | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectDialogMode, setRejectDialogMode] = useState<"request_changes" | "reject">("reject");
  const [rejectionReason, setRejectionReason] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [editingRecurrence, setEditingRecurrence] = useState(false);
  const [recurrenceIsRecurring, setRecurrenceIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<"day_of_month" | "day_of_week" | "biweekly">("day_of_month");
  const [recurrenceDay, setRecurrenceDay] = useState("1");
  const [recurrenceWeekday, setRecurrenceWeekday] = useState("1");
  const [recurrenceWeekOrdinal, setRecurrenceWeekOrdinal] = useState("1");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch fresh task data to stay in sync
  const { data: task } = useQuery<Task>({
    queryKey: ["/api/tasks", initialTask?.id],
    queryFn: async () => {
      if (!initialTask) return null;
      const response = await fetch(`/api/tasks/${initialTask.id}`);
      if (!response.ok) throw new Error("Failed to fetch task");
      return response.json();
    },
    enabled: !!initialTask && open,
    initialData: initialTask || undefined,
  });

  const { data: checklistItems, isLoading: checklistLoading } = useQuery<TaskChecklistItem[]>({
    queryKey: ["/api/tasks", task?.id, "checklist"],
    queryFn: async () => {
      if (!task) return [];
      const response = await fetch(`/api/tasks/${task.id}/checklist`);
      if (!response.ok) throw new Error("Failed to fetch checklist");
      return response.json();
    },
    enabled: !!task,
  });

  const { data: membershipData } = useQuery<any>({
    queryKey: ["/api/companies", companyId, "membership"],
    queryFn: async () => {
      if (!companyId || !currentUserId || isAdmin) return null;
      const res = await fetch(`/api/companies/${companyId}/members`);
      if (!res.ok) return null;
      const members = await res.json();
      return members.find((m: any) => m.userId === currentUserId) || null;
    },
    enabled: !isAdmin && !!companyId && !!currentUserId && open,
  });
  const isCompanyApprover = !isAdmin && (membershipData?.role === "company_owner" || membershipData?.role === "company_admin");

  const { data: taskCategoriesData } = useQuery<any[]>({
    queryKey: ["/api/companies", companyId, "task-categories"],
    queryFn: async () => {
      if (!companyId) return [];
      const response = await fetch(`/api/companies/${companyId}/task-categories`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!companyId && open,
  });

  const { data: adminUsersData } = useQuery<any>({
    queryKey: ["/api/admin/users"],
    enabled: isAdmin && open,
  });
  const adminUsers = Array.isArray(adminUsersData) ? adminUsersData : (adminUsersData?.admins || []);

  const { data: companyUsers } = useQuery<any[]>({
    queryKey: ["/api/admin/companies", companyId, "users"],
    enabled: isAdmin && !!companyId && open,
  });

  const { data: deliverableTypes } = useQuery<DeliverableType[]>({
    queryKey: ["/api/deliverable-types"],
    enabled: (isAdmin || isCompanyApprover) && open,
  });

  const { data: taskAssignees } = useQuery<any[]>({
    queryKey: ["/api/tasks", initialTask?.id, "assignees"],
    queryFn: async () => {
      if (!initialTask) return [];
      const response = await fetch(`/api/tasks/${initialTask.id}/assignees`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!initialTask && open,
  });

  const addAssigneeMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/tasks/${task?.id}/assignees`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id, "assignees"] });
      toast({ title: "Assignee added" });
    },
    onError: () => {
      toast({ title: "Failed to add assignee", variant: "destructive" });
    },
  });

  const removeAssigneeMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/tasks/${task?.id}/assignees/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id, "assignees"] });
      toast({ title: "Assignee removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove assignee", variant: "destructive" });
    },
  });

  const assignableUsers = useMemo(() => {
    const users: { id: string; name: string; type: string; roleLabel: string | null }[] = [];
    const seen = new Set<string>();
    
    (adminUsers || []).forEach((u: any) => {
      const uid = u.userId || u.id;
      if (!seen.has(uid)) {
        seen.add(uid);
        users.push({ id: uid, name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email, type: "Admin", roleLabel: "Agency Admin" });
      }
    });
    
    (companyUsers || []).forEach((u: any) => {
      if (!seen.has(u.id)) {
        seen.add(u.id);
        users.push({ id: u.id, name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email, type: "Client", roleLabel: u.roleLabel || null });
      }
    });
    
    return users;
  }, [adminUsers, companyUsers]);

  const updateTaskMutation = useMutation({
    mutationFn: async (data: Partial<Task>) => {
      const res = await apiRequest("PATCH", `/api/tasks/${task?.id}`, data);
      return res.json() as Promise<Task>;
    },
    onMutate: async (data) => {
      if (data.status === undefined) return;
      await queryClient.cancelQueries({ queryKey: ["/api/tasks"] });
      if (companyId) await queryClient.cancelQueries({ queryKey: ["/api/tasks", { companyId }] });
      if (task?.id) await queryClient.cancelQueries({ queryKey: ["/api/tasks", task.id] });
      const previousTasks = queryClient.getQueryData<Task[]>(["/api/tasks"]);
      const previousCompanyTasks = companyId
        ? queryClient.getQueryData<Task[]>(["/api/tasks", { companyId }])
        : undefined;
      const previousTask = task?.id
        ? queryClient.getQueryData<Task>(["/api/tasks", task.id])
        : undefined;
      if (previousTasks) {
        queryClient.setQueryData<Task[]>(["/api/tasks"], previousTasks.map(t =>
          t.id === task?.id ? { ...t, ...data } : t
        ));
      }
      if (previousCompanyTasks) {
        queryClient.setQueryData<Task[]>(["/api/tasks", { companyId }], previousCompanyTasks.map(t =>
          t.id === task?.id ? { ...t, ...data } : t
        ));
      }
      if (previousTask && task?.id) {
        queryClient.setQueryData<Task>(["/api/tasks", task.id], { ...previousTask, ...data });
      }
      return { previousTasks, previousCompanyTasks, previousTask };
    },
    onSuccess: (updatedTask: Task) => {
      queryClient.setQueryData<Task[]>(["/api/tasks"], (old) =>
        old ? old.map(t => t.id === updatedTask.id ? updatedTask : t) : old
      );
      if (companyId) {
        queryClient.setQueryData<Task[]>(["/api/tasks", { companyId }], (old) =>
          old ? old.map(t => t.id === updatedTask.id ? updatedTask : t) : old
        );
      }
      queryClient.setQueryData(["/api/tasks", updatedTask.id], updatedTask);
      const creditStatuses = new Set(["in_progress", "completed", "pending", "rejected"]);
      if (updatedTask.status && creditStatuses.has(updatedTask.status)) {
        queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
        queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "credits"] });
        queryClient.invalidateQueries({ queryKey: ["/api/credit-transactions"] });
      }
      if (updatedTask.campaignRequestId) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/campaign-requests"] });
        queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "campaign-requests"] });
      }
    },
    onError: (error: any, _data: any, context: any) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["/api/tasks"], context.previousTasks);
      }
      if (context?.previousCompanyTasks && companyId) {
        queryClient.setQueryData(["/api/tasks", { companyId }], context.previousCompanyTasks);
      }
      if (context?.previousTask && task?.id) {
        queryClient.setQueryData(["/api/tasks", task.id], context.previousTask);
      }
      const msg = error.message || "Failed to update task";
      if (msg.toLowerCase().includes("insufficient credits")) {
        toast({
          title: "Insufficient Credits",
          description: isAdmin
            ? "This company does not have enough credits to start this task. Please add credits or adjust the task."
            : "Your account doesn't have enough credits to start this task. Please purchase more credits or contact your agency.",
          variant: "destructive",
        });
      } else {
        toast({ title: msg, variant: "destructive" });
      }
    },
  });

  const endRecurrenceMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/tasks/${task?.id}`, { 
        isRecurring: false 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id] });
      toast({ title: "Recurrence ended" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to end recurrence", variant: "destructive" });
    },
  });

  const updateRecurrenceMutation = useMutation({
    mutationFn: async (data: {
      isRecurring: boolean;
      recurrencePattern?: string | null;
      recurrenceDay?: number | null;
      recurrenceWeekday?: number | null;
      recurrenceWeekOrdinal?: number | null;
    }) => {
      return apiRequest("PATCH", `/api/tasks/${task?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id] });
      toast({ title: "Recurrence settings updated" });
      setEditingRecurrence(false);
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to update recurrence", variant: "destructive" });
    },
  });

  const approveReviewMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/tasks/${task?.id}/approve`, {
        approvalStatus: "approved",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
      toast({ title: "Task approved and completed" });
    },
    onError: () => {
      toast({ title: "Failed to approve task", variant: "destructive" });
    },
  });

  const changeCompletedByMutation = useMutation({
    mutationFn: async (completedByUserId: string) => {
      return apiRequest("PATCH", `/api/tasks/${task?.id}/completed-by`, { completedByUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-transactions"] });
      toast({ title: "Completed by updated", description: "Credits have been recalculated." });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to update", variant: "destructive" });
    },
  });

  const internalApproveMutation = useMutation({
    mutationFn: async (data: { action: "approve" | "reject"; rejectionReason?: string }) => {
      return apiRequest("POST", `/api/tasks/${task?.id}/internal-approve`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id] });
      toast({
        title: variables.action === "approve" ? "Task forwarded to agency for review" : "Task request rejected",
      });
    },
    onError: () => {
      toast({ title: "Failed to process approval", variant: "destructive" });
    },
  });

  const rejectTaskMutation = useMutation({
    mutationFn: async (data: { rejectionReason?: string }) => {
      return apiRequest("POST", `/api/tasks/${task?.id}/approve`, {
        approvalStatus: "rejected",
        rejectionReason: data.rejectionReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
      toast({ title: "Task rejected" });
      setRejectDialogOpen(false);
      setRejectionReason("");
    },
    onError: () => {
      toast({ title: "Failed to reject task", variant: "destructive" });
    },
  });

  const createChecklistItemMutation = useMutation({
    mutationFn: async (title: string) => {
      return apiRequest("POST", `/api/tasks/${task?.id}/checklist`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id, "checklist"] });
      setNewChecklistItem("");
    },
    onError: () => {
      toast({ title: "Failed to add checklist item", variant: "destructive" });
    },
  });

  const updateChecklistItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TaskChecklistItem> }) => {
      return apiRequest("PATCH", `/api/checklist-items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id, "checklist"] });
    },
    onError: () => {
      toast({ title: "Failed to update item", variant: "destructive" });
    },
  });

  const deleteChecklistItemMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/checklist-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id, "checklist"] });
    },
    onError: () => {
      toast({ title: "Failed to delete item", variant: "destructive" });
    },
  });

  // Timer mutations (admin-only)
  const startTimerMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/tasks/${task?.id}/timer/start`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id] });
      toast({ title: "Timer started" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to start timer", variant: "destructive" });
    },
  });

  const stopTimerMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/tasks/${task?.id}/timer/stop`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id] });
      toast({ title: "Timer stopped" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to stop timer", variant: "destructive" });
    },
  });

  const resetTimerMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/tasks/${task?.id}/timer/reset`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id] });
      toast({ title: "Timer reset" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to reset timer", variant: "destructive" });
    },
  });

  // Format seconds as HH:MM:SS for timer display
  const formatTimerSeconds = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate current elapsed time for running timer
  const [currentElapsed, setCurrentElapsed] = useState(0);
  useEffect(() => {
    if (task?.timerStartedAt) {
      const updateElapsed = () => {
        const startTime = new Date(task.timerStartedAt!).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setCurrentElapsed(elapsed);
      };
      updateElapsed();
      const interval = setInterval(updateElapsed, 1000);
      return () => clearInterval(interval);
    } else {
      setCurrentElapsed(0);
    }
  }, [task?.timerStartedAt]);

  const totalDisplayTime = (task?.totalTimeTracked || 0) + (task?.timerStartedAt ? currentElapsed : 0);
  const isTimerRunning = !!task?.timerStartedAt;

  // Task comments functionality
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");

  const { data: comments = [], isLoading: commentsLoading } = useQuery<TaskComment[]>({
    queryKey: ["/api/tasks", task?.id, "comments"],
    queryFn: async () => {
      if (!task) return [];
      const response = await fetch(`/api/tasks/${task.id}/comments`);
      if (!response.ok) throw new Error("Failed to fetch comments");
      return response.json();
    },
    enabled: !!task,
  });

  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/tasks/${task?.id}/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id, "comments"] });
      setNewComment("");
    },
    onError: () => {
      toast({ title: "Failed to add comment", variant: "destructive" });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      return apiRequest("PATCH", `/api/comments/${id}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id, "comments"] });
      setEditingCommentId(null);
      setEditingCommentContent("");
    },
    onError: () => {
      toast({ title: "Failed to update comment", variant: "destructive" });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/comments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id, "comments"] });
    },
    onError: () => {
      toast({ title: "Failed to delete comment", variant: "destructive" });
    },
  });

  // Task attachments functionality
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: attachments = [], isLoading: attachmentsLoading } = useQuery<TaskAttachment[]>({
    queryKey: ["/api/tasks", task?.id, "attachments"],
    queryFn: async () => {
      if (!task) return [];
      const response = await fetch(`/api/tasks/${task.id}/attachments`);
      if (!response.ok) throw new Error("Failed to fetch attachments");
      return response.json();
    },
    enabled: !!task,
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/tasks/${task?.id}/attachments`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id, "attachments"] });
      toast({ title: "File uploaded successfully" });
      setIsUploading(false);
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to upload file", variant: "destructive" });
      setIsUploading(false);
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/attachments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id, "attachments"] });
      toast({ title: "Attachment deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete attachment", variant: "destructive" });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      uploadAttachmentMutation.mutate(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const { data: taskLinksData = [], isLoading: linksLoading } = useQuery<TaskLink[]>({
    queryKey: ["/api/tasks", task?.id, "links"],
    queryFn: async () => {
      if (!task) return [];
      const response = await fetch(`/api/tasks/${task.id}/links`);
      if (!response.ok) throw new Error("Failed to fetch links");
      return response.json();
    },
    enabled: !!task,
  });

  const createLinkMutation = useMutation({
    mutationFn: async (data: { url: string; label: string }) => {
      return apiRequest("POST", `/api/tasks/${task?.id}/links`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id, "links"] });
      setNewLinkUrl("");
      setNewLinkLabel("");
    },
    onError: () => {
      toast({ title: "Failed to add link", variant: "destructive" });
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/task-links/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id, "links"] });
    },
    onError: () => {
      toast({ title: "Failed to delete link", variant: "destructive" });
    },
  });

  const handleAddLink = () => {
    const url = newLinkUrl.trim();
    if (!url) return;
    let finalUrl = url;
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`;
    }
    createLinkMutation.mutate({ url: finalUrl, label: newLinkLabel.trim() });
  };

  const handleDownloadAttachment = async (attachment: TaskAttachment) => {
    try {
      const response = await fetch(`/api/attachments/${attachment.id}/download`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Download failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({ title: "Failed to download file", variant: "destructive" });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Chat functionality
  const { data: taskChat } = useQuery<ChatThread | null>({
    queryKey: ["/api/tasks", task?.id, "chat"],
    queryFn: async () => {
      if (!task) return null;
      const response = await fetch(`/api/tasks/${task.id}/chat`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!task && open,
  });

  const { data: chatMessages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/threads", taskChat?.id, "messages"],
    queryFn: async () => {
      if (!taskChat) return [];
      const response = await fetch(`/api/chat/threads/${taskChat.id}/messages`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!taskChat && showChat,
  });

  // Get thread members for existing chat
  const { data: threadMembers = [] } = useQuery<{ userId: string }[]>({
    queryKey: ["/api/chat/threads", taskChat?.id, "members"],
    enabled: !!taskChat,
  });

  const createTaskChatMutation = useMutation({
    mutationFn: async (memberIds: string[]): Promise<ChatThread> => {
      const res = await apiRequest("POST", "/api/chat/threads", {
        companyId,
        name: `Task: ${task?.title}`,
        type: "task",
        taskId: task?.id,
        memberIds,
      });
      return res.json();
    },
    onSuccess: (newThread) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id, "chat"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads", companyId] });
      // Navigate to chat section if callback provided
      if (onNavigateToChat && newThread?.id) {
        onClose();
        onNavigateToChat(newThread.id, companyId);
      } else {
        setShowChat(true);
      }
    },
    onError: () => {
      toast({ title: "Failed to create chat", variant: "destructive" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, mentions }: { content: string; mentions: string[] }) => {
      if (!taskChat) throw new Error("No chat thread");
      return apiRequest("POST", `/api/chat/threads/${taskChat.id}/messages`, { content, mentions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads", taskChat?.id, "messages"] });
      setMessageInput("");
      setMessageMentions([]);
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  // Mark task chat messages as read
  const markReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      if (!taskChat) throw new Error("No chat thread");
      return apiRequest("POST", `/api/chat/threads/${taskChat.id}/read`, { messageId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/unread"] });
    },
  });

  // Auto-scroll to bottom and mark as read when new messages arrive
  useEffect(() => {
    if (showChat && chatMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      // Mark last message as read
      const lastMessage = chatMessages[chatMessages.length - 1];
      markReadMutation.mutate(lastMessage.id);
    }
  }, [chatMessages, showChat]);

  const handleStartChat = () => {
    if (taskChat) {
      // Navigate to chat section if callback provided, otherwise show inline
      if (onNavigateToChat) {
        onClose();
        onNavigateToChat(taskChat.id, companyId);
      } else {
        setShowChat(true);
      }
    } else {
      // Show member selector to pick who to add
      setShowMemberSelector(true);
    }
  };

  const handleCreateChatWithMembers = (memberIds: string[]) => {
    createTaskChatMutation.mutate(memberIds);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (messageInput.trim()) {
      sendMessageMutation.mutate({ content: messageInput.trim(), mentions: messageMentions });
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const handleStatusChange = (newStatus: string) => {
    updateTaskMutation.mutate({ status: newStatus });
  };


  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChecklistItem.trim()) {
      createChecklistItemMutation.mutate(newChecklistItem.trim());
    }
  };

  const handleToggleChecklistItem = (item: TaskChecklistItem) => {
    updateChecklistItemMutation.mutate({
      id: item.id,
      data: { isCompleted: !item.isCompleted },
    });
  };

  if (!task) return null;

  const completedCount = checklistItems?.filter((i) => i.isCompleted).length || 0;
  const totalCount = checklistItems?.length || 0;

  const statusOptions = [
    { value: "pending", label: "Not started", icon: Circle },
    { value: "in_progress", label: "In progress", icon: Circle },
    { value: "review", label: "In review", icon: Circle },
    { value: "approved", label: "Approved", icon: CheckCircle2 },
    { value: "completed", label: "Completed", icon: CheckCircle2 },
  ];

  const priorityColors: Record<string, string> = {
    low: "bg-gray-500",
    medium: "bg-blue-500",
    high: "bg-orange-500",
    urgent: "bg-red-500",
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="task-detail-panel">
        <SheetHeader className="space-y-1">
          <div className="flex items-start gap-3">
            <button
              onClick={() => {
                if (task.status !== "completed") {
                  handleStatusChange("completed");
                }
              }}
              className="mt-1 shrink-0"
              data-testid="button-complete-task"
              disabled={!isAdmin && task.taskOwnership !== "client"}
            >
              {task.status === "completed" ? (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              ) : (
                <Circle className="w-6 h-6 text-muted-foreground hover:text-green-600 transition-colors" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-left text-lg" data-testid="text-task-title">
                {task.title}
              </SheetTitle>
              {isAdmin && editingDescription ? (
                <div className="mt-1 space-y-2">
                  <Textarea
                    value={descriptionDraft}
                    onChange={(e) => setDescriptionDraft(e.target.value)}
                    className="text-sm min-h-[80px] resize-y"
                    placeholder="Add a description..."
                    data-testid="textarea-edit-description"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 px-2"
                      onClick={() => {
                        updateTaskMutation.mutate({ description: descriptionDraft.trim() });
                        setEditingDescription(false);
                      }}
                      data-testid="button-save-description"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => setEditingDescription(false)}
                      data-testid="button-cancel-description"
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-1 mt-1 group/desc">
                  {task.description ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words overflow-hidden" data-testid="text-task-description">{task.description}</p>
                  ) : isAdmin ? (
                    <p className="text-sm text-muted-foreground italic">No description</p>
                  ) : null}
                  {isAdmin && (
                    <button
                      className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
                      onClick={() => {
                        setDescriptionDraft(task.description || "");
                        setEditingDescription(true);
                      }}
                      data-testid="button-edit-description"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Status</Label>
              <Select
                value={task.status}
                onValueChange={handleStatusChange}
                disabled={!isAdmin && task.taskOwnership !== "client"}
              >
                <SelectTrigger data-testid="select-task-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon className="w-4 h-4" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Priority</Label>
              <div className="flex items-center gap-2 h-9 px-3 border rounded-md">
                <span className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
                <span className="capitalize">{task.priority}</span>
              </div>
            </div>
          </div>

          {(taskCategoriesData || []).length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Category</Label>
              {isAdmin ? (
                <Select
                  value={task.categoryId || "none"}
                  onValueChange={(val) => {
                    updateTaskMutation.mutate({ categoryId: val === "none" ? null : val });
                  }}
                >
                  <SelectTrigger className="h-9" data-testid="select-task-category">
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
              ) : (
                <div className="flex items-center gap-2 h-9 px-3 border rounded-md">
                  {(() => {
                    const cat = (taskCategoriesData || []).find((c: any) => c.id === task.categoryId);
                    if (!cat) return <span className="text-muted-foreground">Uncategorized</span>;
                    return (
                      <span className="flex items-center gap-2">
                        {cat.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />}
                        {cat.name}
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="w-4 h-4" />
              {isAdmin && !editingCredits ? (
                <>
                  <span className="font-mono">{task.creditCost} credits</span>
                  {task.creditsDeducted && (
                    <Badge variant="outline" className="text-xs">Deducted</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => { setEditingCredits(true); setEditCreditValue(task.creditCost?.toString() || "0"); }}
                    data-testid="button-edit-credits"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                </>
              ) : isAdmin && editingCredits ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.25"
                    value={editCreditValue}
                    onChange={(e) => setEditCreditValue(e.target.value)}
                    className="w-24 h-7 text-sm"
                    data-testid="input-edit-credits"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      updateTaskMutation.mutate({ creditCost: editCreditValue } as any);
                      setEditingCredits(false);
                    }}
                    data-testid="button-save-credits"
                  >
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setEditingCredits(false)}
                    data-testid="button-cancel-credits"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="font-mono">{task.creditCost} credits</span>
                  {task.creditsDeducted && (
                    <Badge variant="outline" className="text-xs">Deducted</Badge>
                  )}
                </>
              )}
            </div>
            {task.creditCostAtDeduction && task.creditCostAtDeduction !== task.creditCost && (
              <div className="flex items-center gap-2 text-muted-foreground" data-testid="text-credit-adjustment">
                <span className="text-xs">Originally {task.creditCostAtDeduction} cr</span>
                <Badge variant="outline" className="text-xs">Adjusted</Badge>
              </div>
            )}
            {isAdmin ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {!editingDueDate ? (
                  <>
                    {task.dueDate
                      ? <span data-testid="text-due-date">{task.dueDate}</span>
                      : <span className="italic text-muted-foreground/60" data-testid="text-due-date">No due date</span>
                    }
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => { setEditingDueDate(true); setEditDueDateValue(task.dueDate || ""); }}
                      data-testid="button-edit-due-date"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-1">
                    <Input
                      type="date"
                      value={editDueDateValue}
                      onChange={(e) => setEditDueDateValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          updateTaskMutation.mutate({ dueDate: editDueDateValue || null });
                          setEditingDueDate(false);
                        } else if (e.key === "Escape") {
                          setEditingDueDate(false);
                        }
                      }}
                      className="w-36 h-7 text-sm"
                      data-testid="input-edit-due-date"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={updateTaskMutation.isPending}
                      onClick={() => {
                        updateTaskMutation.mutate({ dueDate: editDueDateValue || null });
                        setEditingDueDate(false);
                      }}
                      data-testid="button-save-due-date"
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={updateTaskMutation.isPending}
                      onClick={() => setEditingDueDate(false)}
                      data-testid="button-cancel-due-date"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            ) : task.dueDate ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span data-testid="text-due-date">{task.dueDate}</span>
              </div>
            ) : null}
            {task.revisionCount > 0 && (
              <div className="flex items-center gap-2" data-testid="text-revision-count">
                <RotateCcw className="w-4 h-4 text-muted-foreground" />
                <span className={`text-sm ${task.revisionCount > 3 ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground"}`}>
                  {task.revisionCount > 3
                    ? `Revision ${task.revisionCount}/3 — extra charges applied`
                    : `Revision ${task.revisionCount}/3 free`}
                </span>
                {task.revisionCount > 3 && (
                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                    +{((task.revisionCount - 3) * 0.25).toFixed(2)} cr added
                  </Badge>
                )}
              </div>
            )}
            {task.isRecurring && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Repeat className="w-4 h-4" />
                <span>Recurring</span>
              </div>
            )}
            {task.bulkQuantity && task.bulkQuantity > 1 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Layers className="w-4 h-4" />
                {isAdmin && editingBulkQuantity !== null ? (
                  <div className="flex items-center gap-1">
                    <span className="text-sm">Bulk:</span>
                    <Input
                      type="number"
                      min={1}
                      value={editingBulkQuantity}
                      onChange={(e) => setEditingBulkQuantity(parseInt(e.target.value) || 1)}
                      className="w-20 h-7 text-sm"
                      data-testid="input-bulk-quantity-edit"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        updateTaskMutation.mutate({ bulkQuantity: editingBulkQuantity });
                        setEditingBulkQuantity(null);
                      }}
                      data-testid="button-save-bulk-quantity"
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditingBulkQuantity(null)}
                      data-testid="button-cancel-bulk-quantity"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span>Bulk: {task.bulkQuantity} deliverables</span>
                    {isAdmin && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => setEditingBulkQuantity(task.bulkQuantity || 1)}
                        data-testid="button-edit-bulk-quantity"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
            {task.cadenceFrequency && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Cadence: {task.cadenceFrequency}{task.cadenceDays?.length ? ` (${task.cadenceDays.join(", ")})` : ""}</span>
              </div>
            )}
            {task.bulkParentId && (
              <Badge variant="outline" className="text-xs">Part of bulk task</Badge>
            )}
            {task.campaignRequestId && onViewCampaign && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onViewCampaign(task.campaignRequestId!);
                }}
                data-testid="button-view-campaign"
              >
                <Target className="w-4 h-4 mr-1" />
                View Campaign
              </Button>
            )}
          </div>

          {(task as any).assignedByName && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs flex items-center gap-2">
                <User className="w-4 h-4" />
                Requested By
              </Label>
              <div className="flex items-center gap-2 h-9 px-3 border rounded-md text-sm">
                <span data-testid="text-requested-by">{(task as any).assignedByName}</span>
              </div>
            </div>
          )}

          {task.status === "completed" && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs flex items-center gap-2">
                <User className="w-4 h-4" />
                Completed By
              </Label>
              {isAdmin ? (
                <Select
                  value={task.completedBy || ""}
                  onValueChange={(val) => {
                    if (val && val !== task.completedBy) {
                      changeCompletedByMutation.mutate(val);
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-completed-by" className="h-9">
                    <SelectValue placeholder={task.completedByName || "Unknown"} />
                  </SelectTrigger>
                  <SelectContent>
                    {task.completedBy && !assignableUsers.some(u => u.id === task.completedBy) && (
                      <SelectItem key={task.completedBy} value={task.completedBy} disabled>
                        {task.completedByName || "Unknown"} (removed)
                      </SelectItem>
                    )}
                    {assignableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id} data-testid={`option-completed-by-${u.id}`}>
                        {u.name} ({u.roleLabel || (u.type === "Admin" ? "Agency Admin" : "Team Member")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 h-9 px-3 border rounded-md text-sm">
                  <span data-testid="text-completed-by">{task.completedByName || "Unknown"}</span>
                  {task.creditsDeducted ? (
                    <Badge variant="outline" className="text-xs">Agency</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Self-Service</Badge>
                  )}
                </div>
              )}
              {!task.creditsDeducted && !task.noCredit && task.status === "completed" && (
                <p className="text-xs text-muted-foreground">No credits charged (self-service)</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Deliverable Type
            </Label>
            {isAdmin || (isCompanyApprover && (task.approvalStatus === "pending_internal_approval" || task.approvalStatus === "pending_approval")) ? (
              <DeliverableTypePicker
                deliverableTypes={(deliverableTypes || []).filter(d => d.isActive)}
                value={task.deliverableType || ""}
                onValueChange={(val) => {
                  const dt = (deliverableTypes || []).find(d => d.key === val);
                  const updates: any = { deliverableType: val || null };
                  if (dt && parseFloat(task.creditCost) === 0) {
                    updates.creditCost = dt.credits;
                  }
                  updateTaskMutation.mutate(updates);
                }}
                placeholder="Select deliverable type"
                data-testid="select-task-deliverable"
              />
            ) : (
              task.deliverableType ? (
                <div className="flex items-center gap-2 h-9 px-3 border rounded-md text-sm">
                  <span className="capitalize">{task.deliverableType.replace(/_/g, " ")}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 h-9 px-3 border rounded-md text-sm text-muted-foreground">
                  No deliverable assigned
                </div>
              )
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs flex items-center gap-2">
              <User className="w-4 h-4" />
              Assigned To
            </Label>
            {isAdmin ? (
              <Select
                value={task.assignedTo || "unassigned"}
                onValueChange={(val) => {
                  updateTaskMutation.mutate({ assignedTo: val === "unassigned" ? null : val } as any);
                }}
              >
                <SelectTrigger data-testid="select-task-assignee">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {assignableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      <span className="flex items-center gap-2">
                        {u.name}
                        {u.roleLabel && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{u.roleLabel}</Badge>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 h-9 px-3 border rounded-md text-sm">
                {task.assignedTo ? (
                  <span>{assignableUsers.find(u => u.id === task.assignedTo)?.name || "Assigned"}</span>
                ) : (
                  <span className="text-muted-foreground">Unassigned</span>
                )}
              </div>
            )}

            {taskAssignees && taskAssignees.length > 0 && (
              <div className="space-y-1.5 mt-1" data-testid="task-assignees-list">
                {taskAssignees
                  .filter((a: any) => a.userId !== task.assignedTo)
                  .map((a: any) => (
                  <div key={a.userId} className="flex items-center gap-2 text-sm" data-testid={`assignee-row-${a.userId}`}>
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">
                        {(a.userName || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">{a.userName || a.userEmail}</span>
                    {isAdmin && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={() => removeAssigneeMutation.mutate(a.userId)}
                        data-testid={`button-remove-assignee-${a.userId}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {isAdmin && (
              <div className="mt-1">
                <Select
                  value=""
                  onValueChange={(val) => {
                    if (val) addAssigneeMutation.mutate(val);
                  }}
                >
                  <SelectTrigger data-testid="select-add-assignee" className="h-8 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <UserPlus className="w-3 h-3" />
                      <span>Add Assignee</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {assignableUsers
                      .filter(u => !taskAssignees?.some((a: any) => a.userId === u.id))
                      .map((u) => (
                      <SelectItem key={u.id} value={u.id} data-testid={`option-add-assignee-${u.id}`}>
                        <span className="flex items-center gap-2">
                          {u.name}
                          {u.roleLabel && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{u.roleLabel}</Badge>}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Task Ownership
            </Label>
            {isAdmin ? (
              <Select
                value={task.taskOwnership || "agency"}
                onValueChange={(val) => {
                  updateTaskMutation.mutate({ taskOwnership: val } as any);
                }}
              >
                <SelectTrigger data-testid="select-task-ownership">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agency">Agency-Managed</SelectItem>
                  <SelectItem value="client">Client-Managed</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 h-9 px-3 border rounded-md text-sm">
                <span data-testid="text-task-ownership">
                  {task.taskOwnership === "client" ? "Client-Managed" : "Agency-Managed"}
                </span>
                {!isAdmin && (task.status === "in_progress" || task.status === "review" || task.status === "completed") && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">Locked</Badge>
                )}
              </div>
            )}
          </div>

          {task.deliverableType === "media_upload_request" && !isAdmin && onNavigateToMediaUploads && task.status !== "completed" && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2" data-testid="media-upload-cta">
              <div className="flex items-center gap-2">
                <ImageUp className="w-5 h-5 text-primary" />
                <span className="font-medium text-sm">Media Upload Requested</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your agency has requested media files for this task. Click below to upload.
              </p>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  onClose();
                  onNavigateToMediaUploads();
                }}
                data-testid="button-go-to-media-uploads"
              >
                <ImageUp className="w-4 h-4 mr-2" />
                Go to Media Uploads
              </Button>
            </div>
          )}

          {/* Recurrence settings for admin on non-completed, non-cadence tasks */}
          {isAdmin && task.status !== "completed" && !task.cadenceId && (
            <div className="space-y-2">
              {!editingRecurrence ? (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Repeat className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 text-sm text-muted-foreground">
                    {task.isRecurring ? (
                      <>
                        Recurring:{" "}
                        {task.recurrencePattern === "day_of_month" && task.recurrenceDay !== null && `Day ${task.recurrenceDay} each month`}
                        {task.recurrencePattern === "day_of_week" && task.recurrenceWeekday !== null && task.recurrenceWeekOrdinal !== null && `${task.recurrenceWeekOrdinal === -1 ? "Last" : ["1st", "2nd", "3rd", "4th"][task.recurrenceWeekOrdinal - 1]} ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][task.recurrenceWeekday]} each month`}
                        {task.recurrencePattern === "biweekly" && task.recurrenceWeekday !== null && `Every other ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][task.recurrenceWeekday]}`}
                      </>
                    ) : "Not recurring"}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRecurrenceIsRecurring(task.isRecurring);
                        setRecurrencePattern((task.recurrencePattern as "day_of_month" | "day_of_week" | "biweekly") || "day_of_month");
                        setRecurrenceDay(String(task.recurrenceDay ?? 1));
                        setRecurrenceWeekday(String(task.recurrenceWeekday ?? 1));
                        setRecurrenceWeekOrdinal(String(task.recurrenceWeekOrdinal ?? 1));
                        setEditingRecurrence(true);
                      }}
                      data-testid="button-edit-recurrence"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    {task.isRecurring && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => endRecurrenceMutation.mutate()}
                        disabled={endRecurrenceMutation.isPending}
                        data-testid="button-end-recurrence"
                      >
                        {endRecurrenceMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <StopCircle className="h-3 w-3 mr-1" />
                            End
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Repeat className="h-4 w-4" />
                      Edit Recurrence
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingRecurrence(false)}
                      data-testid="button-cancel-recurrence-edit"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="edit-recurring"
                      checked={recurrenceIsRecurring}
                      onCheckedChange={(checked) => setRecurrenceIsRecurring(!!checked)}
                      data-testid="checkbox-edit-recurring"
                    />
                    <Label htmlFor="edit-recurring" className="text-sm">Recurring task</Label>
                  </div>
                  {recurrenceIsRecurring && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Pattern</Label>
                        <Select value={recurrencePattern} onValueChange={(val) => setRecurrencePattern(val as "day_of_month" | "day_of_week" | "biweekly")}>
                          <SelectTrigger data-testid="select-edit-recurrence-pattern" className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="day_of_month">Same day each month</SelectItem>
                            <SelectItem value="day_of_week">Same week & day each month</SelectItem>
                            <SelectItem value="biweekly">Every other week</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {recurrencePattern === "day_of_month" && (
                        <div className="space-y-1">
                          <Label className="text-xs">Day of Month</Label>
                          <Select value={recurrenceDay} onValueChange={setRecurrenceDay}>
                            <SelectTrigger data-testid="select-edit-recurrence-day" className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                                <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {parseInt(recurrenceDay) > 28 && (
                            <p className="text-xs text-muted-foreground">
                              In shorter months, this task will fall on the last day of the month
                            </p>
                          )}
                        </div>
                      )}
                      {recurrencePattern === "day_of_week" && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Occurrence</Label>
                            <Select value={recurrenceWeekOrdinal} onValueChange={setRecurrenceWeekOrdinal}>
                              <SelectTrigger data-testid="select-edit-week-ordinal" className="h-8 text-xs">
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
                          <div className="space-y-1">
                            <Label className="text-xs">Day</Label>
                            <Select value={recurrenceWeekday} onValueChange={setRecurrenceWeekday}>
                              <SelectTrigger data-testid="select-edit-weekday" className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => (
                                  <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                      {recurrencePattern === "biweekly" && (
                        <div className="space-y-1">
                          <Label className="text-xs">Day of Week</Label>
                          <Select value={recurrenceWeekday} onValueChange={setRecurrenceWeekday}>
                            <SelectTrigger data-testid="select-edit-biweekly-day" className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => (
                                <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const data: {
                        isRecurring: boolean;
                        recurrencePattern?: string | null;
                        recurrenceDay?: number | null;
                        recurrenceWeekday?: number | null;
                        recurrenceWeekOrdinal?: number | null;
                      } = { isRecurring: recurrenceIsRecurring };
                      if (recurrenceIsRecurring) {
                        data.recurrencePattern = recurrencePattern;
                        if (recurrencePattern === "day_of_month") {
                          data.recurrenceDay = parseInt(recurrenceDay);
                          data.recurrenceWeekday = null;
                          data.recurrenceWeekOrdinal = null;
                        } else if (recurrencePattern === "day_of_week") {
                          data.recurrenceDay = null;
                          data.recurrenceWeekday = parseInt(recurrenceWeekday);
                          data.recurrenceWeekOrdinal = parseInt(recurrenceWeekOrdinal);
                        } else if (recurrencePattern === "biweekly") {
                          data.recurrenceDay = null;
                          data.recurrenceWeekday = parseInt(recurrenceWeekday);
                          data.recurrenceWeekOrdinal = null;
                        }
                      }
                      updateRecurrenceMutation.mutate(data);
                    }}
                    disabled={updateRecurrenceMutation.isPending}
                    data-testid="button-save-recurrence"
                  >
                    {updateRecurrenceMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Save Recurrence
                  </Button>
                </div>
              )}
            </div>
          )}

          {isCompanyApprover && task.approvalStatus === "pending_internal_approval" && (
            <div className="space-y-2 p-3 border rounded-lg bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Internal Approval Required</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">A team member requested this task. Approve to send to the agency or reject it.</p>
              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2"
                  onClick={() => internalApproveMutation.mutate({ action: "approve" })}
                  disabled={internalApproveMutation.isPending}
                  data-testid="button-internal-approve"
                >
                  <Check className="w-4 h-4" />
                  {internalApproveMutation.isPending ? "Approving..." : "Approve & Send to Agency"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2 text-destructive"
                  onClick={() => internalApproveMutation.mutate({ action: "reject" })}
                  disabled={internalApproveMutation.isPending}
                  data-testid="button-internal-reject"
                >
                  <X className="w-4 h-4" />
                  Reject
                </Button>
              </div>
            </div>
          )}

          {!isAdmin && !isCompanyApprover && task.approvalStatus === "pending_internal_approval" && (
            <div className="p-3 border rounded-lg bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">Awaiting internal approval from your company admin.</p>
            </div>
          )}

          {(isAdmin || isCompanyApprover) && task.status === "review" && (
            <div className="space-y-2 p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Task In Review</p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {isAdmin ? "Review this task and approve or request changes." : "This task is ready for your review. Approve to complete or request changes."}
              </p>
              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2"
                  onClick={() => approveReviewMutation.mutate()}
                  disabled={approveReviewMutation.isPending}
                  data-testid="button-approve-review"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {approveReviewMutation.isPending ? "Approving..." : "Approve"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2 text-destructive"
                  onClick={() => { setRejectDialogMode("request_changes"); setRejectDialogOpen(true); }}
                  data-testid="button-request-changes"
                >
                  <X className="w-4 h-4" />
                  Request Changes
                </Button>
              </div>
            </div>
          )}

          {isAdmin && task.approvalStatus !== "rejected" && task.status !== "completed" && task.status !== "review" && (
            <Button
              variant="outline"
              className="gap-2 text-destructive w-full"
              onClick={() => { setRejectDialogMode("reject"); setRejectDialogOpen(true); }}
              data-testid="button-reject-task"
            >
              <X className="w-4 h-4" />
              Reject Task
            </Button>
          )}

          <Separator />

          <div className="space-y-3">
            <Label className="text-muted-foreground text-xs flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Links {taskLinksData.length > 0 && `(${taskLinksData.length})`}
            </Label>

            {linksLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-2">
                {taskLinksData.map((link) => (
                  <div key={link.id} className="flex items-center gap-2" data-testid={`task-link-${link.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 justify-start text-left truncate"
                      onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
                      data-testid={`button-open-link-${link.id}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-2 shrink-0" />
                      <span className="truncate">{link.label || link.url}</span>
                    </Button>
                    {(isAdmin || link.createdBy === currentUserId) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0"
                        onClick={() => deleteLinkMutation.mutate(link.id)}
                        data-testid={`button-delete-link-${link.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}

                <div className="space-y-2">
                  <Input
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-8 text-sm"
                    data-testid="input-link-url"
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddLink(); }}
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      value={newLinkLabel}
                      onChange={(e) => setNewLinkLabel(e.target.value)}
                      placeholder="Label (optional)"
                      className="h-8 text-sm flex-1"
                      data-testid="input-link-label"
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddLink(); }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAddLink}
                      disabled={!newLinkUrl.trim() || createLinkMutation.isPending}
                      className="h-8"
                      data-testid="button-add-link"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground text-xs">
                Checklist {totalCount > 0 && `${completedCount} / ${totalCount}`}
              </Label>
            </div>

            {checklistLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-2">
                {checklistItems?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 group"
                    data-testid={`checklist-item-${item.id}`}
                  >
                    <Checkbox
                      checked={item.isCompleted}
                      onCheckedChange={() => handleToggleChecklistItem(item)}
                      data-testid={`checkbox-checklist-${item.id}`}
                    />
                    <span
                      className={`flex-1 text-sm ${
                        item.isCompleted ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {item.title}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteChecklistItemMutation.mutate(item.id)}
                      data-testid={`button-delete-checklist-${item.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}

                <form onSubmit={handleAddChecklistItem} className="flex items-center gap-2">
                  <Circle className="w-4 h-4 text-muted-foreground" />
                  <Input
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    placeholder="Add an item"
                    className="h-8 text-sm border-0 shadow-none focus-visible:ring-0 px-0"
                    data-testid="input-new-checklist-item"
                  />
                  {newChecklistItem && (
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      disabled={createChecklistItemMutation.isPending}
                      data-testid="button-add-checklist-item"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </form>
              </div>
            )}
          </div>

          {/* Timer Section - Admin Only */}
          {isAdmin && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  Time Tracking (Internal)
                </Label>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`font-mono text-2xl font-medium ${isTimerRunning ? 'text-green-600 dark:text-green-400' : ''}`} data-testid="timer-display">
                      {formatTimerSeconds(totalDisplayTime)}
                    </div>
                    {isTimerRunning && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 animate-pulse">
                        Running
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {isTimerRunning ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => stopTimerMutation.mutate()}
                        disabled={stopTimerMutation.isPending}
                        data-testid="button-stop-timer"
                      >
                        {stopTimerMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Pause className="w-4 h-4" />
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startTimerMutation.mutate()}
                        disabled={startTimerMutation.isPending}
                        data-testid="button-start-timer"
                      >
                        {startTimerMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resetTimerMutation.mutate()}
                      disabled={resetTimerMutation.isPending || (totalDisplayTime === 0 && !isTimerRunning)}
                      data-testid="button-reset-timer"
                    >
                      {resetTimerMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Track time spent on this task for internal cost analysis. Not visible to clients.
                </p>
              </div>
            </>
          )}

          <Separator />

          {/* Attachments Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground text-xs flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Attachments {attachments.length > 0 && `(${attachments.length})`}
              </Label>
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  data-testid="input-attachment-file"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  data-testid="button-upload-attachment"
                >
                  {isUploading ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Upload className="w-3 h-3 mr-1" />
                  )}
                  Upload
                </Button>
              </>
            </div>

            {attachmentsLoading ? (
              <div className="text-sm text-muted-foreground">Loading attachments...</div>
            ) : attachments.length === 0 ? (
              <div className="text-sm text-muted-foreground">No attachments yet</div>
            ) : (
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg group"
                    data-testid={`attachment-${attachment.id}`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.fileSize)} • {attachment.uploadedByName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadAttachment(attachment)}
                        data-testid={`button-download-attachment-${attachment.id}`}
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAttachmentMutation.mutate(attachment.id)}
                          data-testid={`button-delete-attachment-${attachment.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Comments/Notes Section */}
          <div className="space-y-3">
            <Label className="text-muted-foreground text-xs flex items-center gap-2">
              <Edit2 className="w-4 h-4" />
              Comments {comments.length > 0 && `(${comments.length})`}
            </Label>

            {commentsLoading ? (
              <div className="text-sm text-muted-foreground">Loading comments...</div>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 bg-muted/50 rounded-lg space-y-2"
                    data-testid={`comment-${comment.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {comment.userName?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{comment.userName}</span>
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {comment.userType}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                        {(isAdmin || comment.userId === currentUserId) && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingCommentContent(comment.content);
                              }}
                              data-testid={`button-edit-comment-${comment.id}`}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCommentMutation.mutate(comment.id)}
                              data-testid={`button-delete-comment-${comment.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {editingCommentId === comment.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingCommentContent}
                          onChange={(e) => setEditingCommentContent(e.target.value)}
                          className="text-sm min-h-[60px]"
                          data-testid="textarea-edit-comment"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateCommentMutation.mutate({
                              id: comment.id,
                              content: editingCommentContent,
                            })}
                            disabled={updateCommentMutation.isPending}
                            data-testid="button-save-comment"
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditingCommentContent("");
                            }}
                            data-testid="button-cancel-edit-comment"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    )}

                    {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                      <span className="text-xs text-muted-foreground">(edited)</span>
                    )}
                  </div>
                ))}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newComment.trim()) {
                      createCommentMutation.mutate(newComment.trim());
                    }
                  }}
                  className="space-y-2"
                >
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment or note..."
                    className="text-sm min-h-[60px]"
                    data-testid="textarea-new-comment"
                  />
                  {newComment.trim() && (
                    <Button
                      type="submit"
                      size="sm"
                      disabled={createCommentMutation.isPending}
                      data-testid="button-add-comment"
                    >
                      {createCommentMutation.isPending ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Plus className="w-3 h-3 mr-1" />
                      )}
                      Add Comment
                    </Button>
                  )}
                </form>
              </div>
            )}
          </div>

          <Separator />

          {/* Chat Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground text-xs flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Task Messages
              </Label>
              <div className="flex items-center gap-2">
                {showChat && taskChat && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddMembers(true)}
                    data-testid="button-add-chat-members"
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Add People
                  </Button>
                )}
                {!showChat && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartChat}
                    disabled={createTaskChatMutation.isPending}
                    data-testid="button-start-chat"
                  >
                    {createTaskChatMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : taskChat ? (
                      "View Messages"
                    ) : (
                      "Start Chat"
                    )}
                  </Button>
                )}
              </div>
            </div>

            {showChat && (
              <div className="border rounded-lg overflow-hidden">
                <ScrollArea className="h-48 p-3">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                      <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
                      <p>No messages yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {chatMessages.map((message, idx) => {
                        const showAvatar = idx === 0 || chatMessages[idx - 1].senderId !== message.senderId;
                        return (
                          <div
                            key={message.id}
                            className={`flex gap-2 ${showAvatar ? "mt-3" : "mt-1"}`}
                            data-testid={`task-message-${message.id}`}
                          >
                            {showAvatar ? (
                              <Avatar className="h-6 w-6 shrink-0">
                                <AvatarFallback className="text-[10px]">
                                  {message.sender?.firstName?.[0]}
                                  {message.sender?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="w-6 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              {showAvatar && (
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-medium">
                                    {message.sender?.firstName} {message.sender?.lastName}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatDateTime(message.createdAt)}
                                  </span>
                                </div>
                              )}
                              <p className="text-xs whitespace-pre-wrap break-words">
                                {renderMessageWithMentions(message.content)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
                <form onSubmit={handleSendMessage} className="border-t p-2 flex gap-2">
                  <MentionInput
                    threadId={taskChat?.id || ""}
                    value={messageInput}
                    onChange={setMessageInput}
                    onMentionsChange={setMessageMentions}
                    placeholder="Type a message... Use @ to mention"
                    disabled={sendMessageMutation.isPending}
                    onSubmit={handleSendMessage}
                    data-testid="input-task-message"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!messageInput.trim() || sendMessageMutation.isPending}
                    data-testid="button-send-task-message"
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                  </Button>
                </form>
              </div>
            )}
          </div>

          {task.status === "completed" && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">Task completed</span>
              </div>
            </>
          )}
        </div>
      </SheetContent>

      {/* Member selector for creating new task chat */}
      <ChatMemberSelector
        companyId={companyId}
        open={showMemberSelector}
        onOpenChange={setShowMemberSelector}
        mode="create"
        onMembersSelected={handleCreateChatWithMembers}
        title="Start Task Chat"
        description="Select who should be included in this task's chat. You can add more people later."
      />

      {/* Member selector for adding to existing chat */}
      <ChatMemberSelector
        companyId={companyId}
        open={showAddMembers}
        onOpenChange={setShowAddMembers}
        mode="add"
        threadId={taskChat?.id}
        existingMemberIds={threadMembers.map(m => m.userId)}
        title="Add Members"
        description="Select people to add to this chat."
      />

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{rejectDialogMode === "request_changes" ? "Request Changes" : "Reject Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {rejectDialogMode === "request_changes" ? "Requesting changes for" : "Rejecting"}: <strong>{task?.title}</strong>
            </p>
            {rejectDialogMode === "request_changes" && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground" data-testid="text-revision-usage">
                  You have used {task?.revisionCount || 0} of 3 free revision requests
                </p>
                {(task?.revisionCount || 0) >= 3 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium" data-testid="text-revision-warning">
                    Additional revision requests will incur a charge of 0.25 credits each
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="reject-reason">{rejectDialogMode === "request_changes" ? "Reason" : "Reason (optional)"}</Label>
              <Textarea
                id="reject-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={rejectDialogMode === "request_changes" ? "Describe the changes needed..." : "Provide a reason for rejection..."}
                className="resize-none"
                rows={3}
                data-testid="textarea-reject-reason"
              />
              <p className="text-xs text-muted-foreground">
                {rejectDialogMode === "request_changes" ? "The reason will be posted in the task comments and sent as a notification." : "If provided, the reason will be sent as a notification and posted in the task chat."}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)} data-testid="button-cancel-reject">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => rejectTaskMutation.mutate({ rejectionReason: rejectionReason.trim() || undefined })}
                disabled={rejectTaskMutation.isPending || (rejectDialogMode === "request_changes" && !rejectionReason.trim())}
                className="gap-2"
                data-testid="button-confirm-reject"
              >
                <X className="w-4 h-4" />
                {rejectTaskMutation.isPending
                  ? (rejectDialogMode === "request_changes" ? "Requesting..." : "Rejecting...")
                  : (rejectDialogMode === "request_changes" ? "Request Changes" : "Reject Task")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
