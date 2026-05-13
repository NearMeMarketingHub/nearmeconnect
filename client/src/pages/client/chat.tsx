import { useState, useEffect, useRef } from "react";
import { getDateLabel, isDifferentDay, formatMessageTime } from "@/lib/chat-dates";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { ClientLayout } from "@/components/client-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  MessageCircle,
  Send,
  Plus,
  Users,
  Loader2,
  MessageSquare,
  ClipboardList,
  UserPlus,
  UserMinus,
  Archive,
  Clock,
  Lock,
  Edit2,
  Trash2,
  Check,
  CheckCheck,
  X,
  Menu,
} from "lucide-react";
import { ChatMemberSelector } from "@/components/chat-member-selector";
import { MentionInput, renderMessageWithMentions } from "@/components/mention-input";

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

interface ThreadMember {
  id: string;
  threadId: string;
  userId: string;
  isAdmin: boolean;
  actualRole?: string;
  joinedAt: string;
  user: {
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

interface ReadReceipt {
  userId: string;
  user: { id: string; firstName: string; lastName: string } | null;
  lastReadMessageId: string | null;
  lastReadAt: string | null;
}

interface UserInfo {
  userId: string;
  firstName: string;
  lastName: string;
  companyId: string;
  companyRole?: string;
}

interface ClientChatProps {
  companyId?: string;
  embedded?: boolean;
}

export default function ClientChat({ companyId: propCompanyId, embedded = false }: ClientChatProps = {}) {
  const { toast } = useToast();
  const searchString = useSearch();
  const isMobile = useIsMobile();
  
  // Parse URL query params for thread selection
  const urlParams = new URLSearchParams(searchString);
  const initialThreadId = urlParams.get("thread");
  
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(initialThreadId);
  const [chatListOpen, setChatListOpen] = useState(!initialThreadId);
  const [messageInput, setMessageInput] = useState("");
  const [messageMentions, setMessageMentions] = useState<string[]>([]);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [editingThreadName, setEditingThreadName] = useState(false);
  const [editThreadNameValue, setEditThreadNameValue] = useState("");
  const [memberToRemove, setMemberToRemove] = useState<{ threadId: string; memberId: string; name: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [, setTimeTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTimeTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Update selected thread when URL changes
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const threadParam = params.get("thread");
    if (threadParam && threadParam !== selectedThreadId) {
      setSelectedThreadId(threadParam);
    }
  }, [searchString]);

  // Fetch user info to get companyId
  const { data: userInfo } = useQuery<UserInfo>({
    queryKey: ["/api/auth/user"],
  });

  const companyId = propCompanyId || userInfo?.companyId;

  // Fetch threads
  const { data: threads = [], isLoading: threadsLoading } = useQuery<ChatThread[]>({
    queryKey: ["/api/chat/threads"],
    enabled: !!companyId,
  });

  // Fetch unread counts
  const { data: unreadCounts = [] } = useQuery<UnreadCount[]>({
    queryKey: ["/api/chat/unread"],
  });

  // Fetch messages for selected thread
  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/threads", selectedThreadId, "messages"],
    queryFn: async () => {
      if (!selectedThreadId) return [];
      const res = await fetch(`/api/chat/threads/${selectedThreadId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!selectedThreadId,
  });

  // Fetch thread members
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

  // Fetch available chat users
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

  // Send message mutation
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
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Create thread mutation
  const createThreadMutation = useMutation({
    mutationFn: async (data: { name?: string; memberIds: string[] }): Promise<ChatThread> => {
      const res = await apiRequest("POST", "/api/chat/threads", {
        companyId,
        name: data.name || null,
        type: "group",
        memberIds: data.memberIds,
        isCompanyWide: false,
      });
      return res.json();
    },
    onSuccess: (thread: ChatThread) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads"] });
      setSelectedThreadId(thread.id);
      setNewChatOpen(false);
      setNewChatName("");
      setSelectedMembers([]);
      toast({
        title: "Chat Created",
        description: "New chat has been created",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create chat",
        variant: "destructive",
      });
    },
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return apiRequest("POST", `/api/chat/threads/${selectedThreadId}/read`, { messageId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/unread"] });
    },
  });

  // Rename thread mutation
  const renameThreadMutation = useMutation({
    mutationFn: async ({ threadId, name }: { threadId: string; name: string }) => {
      return apiRequest("PATCH", `/api/chat/threads/${threadId}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads"] });
      setEditingThreadName(false);
      toast({ title: "Chat renamed" });
    },
    onError: () => {
      toast({ title: "Failed to rename chat", variant: "destructive" });
    },
  });

  // Delete thread mutation
  const deleteThreadMutation = useMutation({
    mutationFn: async (threadId: string) => {
      return apiRequest("DELETE", `/api/chat/threads/${threadId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads"] });
      if (selectedThreadId) setSelectedThreadId(null);
      toast({ title: "Chat deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete chat", variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
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

  const canRemoveMembers = userInfo?.companyRole === "company_owner" || userInfo?.companyRole === "company_admin";

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (messages.length > 0 && selectedThreadId) {
      const lastMessage = messages[messages.length - 1];
      markReadMutation.mutate(lastMessage.id);
    }
  }, [messages, selectedThreadId]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (messageInput.trim()) {
      sendMessageMutation.mutate({ content: messageInput.trim(), mentions: messageMentions });
    }
  };

  const handleCreateChat = () => {
    if (!newChatName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for the chat",
        variant: "destructive",
      });
      return;
    }
    if (selectedMembers.length === 0) {
      toast({
        title: "Select Members",
        description: "Please select at least one member",
        variant: "destructive",
      });
      return;
    }
    createThreadMutation.mutate({
      name: newChatName.trim(),
      memberIds: selectedMembers,
    });
  };

  const getUnreadCount = (threadId: string) => {
    const count = unreadCounts.find((c) => c.threadId === threadId);
    return count?.count || 0;
  };

  const activeThreads = threads.filter((t) => !t.closedAt);
  const closedThreads = threads.filter((t) => !!t.closedAt);

  const generalChats = activeThreads.filter((t) => t.type !== "task");
  const taskChats = activeThreads.filter((t) => t.type === "task");

  const selectedThread = threads.find((t) => t.id === selectedThreadId);

  const formatTime = (dateStr: string) => {
    return formatMessageTime(dateStr);
  };

  const chatThreadList = (
    <div className="p-2">
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full mb-3 justify-start gap-2"
            data-testid="button-new-chat"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Chat</DialogTitle>
            <DialogDescription>
              Start a new conversation with team members
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="chat-name">Chat Name <span className="text-destructive">*</span></Label>
              <Input
                id="chat-name"
                value={newChatName}
                onChange={(e) => setNewChatName(e.target.value)}
                placeholder="Enter chat name..."
                data-testid="input-chat-name"
              />
            </div>

            <div>
              <Label className="mb-2 block">Select Members</Label>
              <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
                {chatUsers
                  .filter((u) => u.id !== userInfo?.userId)
                  .map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2"
                    >
                      <Checkbox
                        id={`user-${user.id}`}
                        checked={selectedMembers.includes(user.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedMembers([...selectedMembers, user.id]);
                          } else {
                            setSelectedMembers(
                              selectedMembers.filter((id) => id !== user.id)
                            );
                          }
                        }}
                        data-testid={`checkbox-user-${user.id}`}
                      />
                      <Label
                        htmlFor={`user-${user.id}`}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <span>
                          {user.firstName} {user.lastName}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {user.type === "admin" ? "Agency Admin" : user.role === "company_owner" ? "Company Owner" : user.role === "company_admin" ? "Company Admin" : "Team Member"}
                        </Badge>
                      </Label>
                    </div>
                  ))}
              </div>
            </div>

            <Button
              onClick={handleCreateChat}
              className="w-full"
              disabled={createThreadMutation.isPending}
              data-testid="button-create-chat"
            >
              {createThreadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create Chat
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mb-4">
        <div className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-muted-foreground">
          <MessageSquare className="h-4 w-4" />
          General Chats
        </div>
        {generalChats.length === 0 ? (
          <p className="text-sm text-muted-foreground px-2 py-2">
            No chats yet
          </p>
        ) : (
          generalChats.map((thread) => {
            const unread = getUnreadCount(thread.id);
            return (
              <button
                key={thread.id}
                onClick={() => { setSelectedThreadId(thread.id); setChatListOpen(false); }}
                className={`w-full text-left p-2 rounded-md mb-1 transition-colors hover-elevate ${
                  selectedThreadId === thread.id ? "bg-accent" : ""
                }`}
                data-testid={`thread-${thread.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {thread.isCompanyWide ? (
                      <Users className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate text-sm font-medium">
                      {thread.name || (thread.isCompanyWide ? "Team Chat" : "Group Chat")}
                    </span>
                  </div>
                  {unread > 0 && (
                    <Badge variant="destructive" className="text-xs shrink-0">
                      {unread}
                    </Badge>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-muted-foreground">
          <ClipboardList className="h-4 w-4" />
          Task Messages
        </div>
        {taskChats.length === 0 ? (
          <p className="text-sm text-muted-foreground px-2 py-2">
            No task messages yet
          </p>
        ) : (
          taskChats.map((thread) => {
            const unread = getUnreadCount(thread.id);
            return (
              <button
                key={thread.id}
                onClick={() => { setSelectedThreadId(thread.id); setChatListOpen(false); }}
                className={`w-full text-left p-2 rounded-md mb-1 transition-colors hover-elevate ${
                  selectedThreadId === thread.id ? "bg-accent" : ""
                }`}
                data-testid={`task-thread-${thread.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <ClipboardList className="h-4 w-4 text-orange-500 shrink-0" />
                    <span className="truncate text-sm">
                      {thread.name || "Task Chat"}
                    </span>
                  </div>
                  {unread > 0 && (
                    <Badge variant="destructive" className="text-xs shrink-0">
                      {unread}
                    </Badge>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {closedThreads.length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-muted-foreground">
            <Archive className="h-4 w-4" />
            Closed
            <Badge variant="secondary" className="text-xs">{closedThreads.length}</Badge>
          </div>
          {closedThreads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => { setSelectedThreadId(thread.id); setChatListOpen(false); }}
              className={`w-full text-left p-2 rounded-md mb-1 transition-colors hover-elevate opacity-60 ${
                selectedThreadId === thread.id ? "bg-accent opacity-100" : ""
              }`}
              data-testid={`closed-thread-${thread.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate text-sm">
                    {thread.name || (thread.type === "task" ? "Task Chat" : thread.isCompanyWide ? "Team Chat" : "Group Chat")}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const content = (
    <>
      <div className="flex h-[calc(100dvh-4rem)]">
        {isMobile && (
          <Sheet open={chatListOpen} onOpenChange={setChatListOpen}>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="p-4 pr-12 border-b">
                <SheetTitle>Messages</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100dvh-5rem)]">
                {chatThreadList}
              </ScrollArea>
            </SheetContent>
          </Sheet>
        )}

        {!isMobile && (
          <div className="w-72 border-r bg-muted/30 flex flex-col">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-lg">Messages</h2>
            </div>
            <ScrollArea className="flex-1">
              {chatThreadList}
            </ScrollArea>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {selectedThread ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center justify-between bg-background">
                <div className="flex items-center gap-3">
                  {isMobile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      onClick={() => setChatListOpen(true)}
                      data-testid="button-open-chat-list"
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  )}
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {selectedThread.isCompanyWide ? (
                      <Users className="h-5 w-5 text-primary" />
                    ) : selectedThread.type === "task" ? (
                      <ClipboardList className="h-5 w-5 text-orange-500" />
                    ) : (
                      <MessageCircle className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    {editingThreadName ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editThreadNameValue}
                          onChange={(e) => setEditThreadNameValue(e.target.value)}
                          className="h-7 text-sm w-48"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && editThreadNameValue.trim()) {
                              renameThreadMutation.mutate({ threadId: selectedThread.id, name: editThreadNameValue.trim() });
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
                              renameThreadMutation.mutate({ threadId: selectedThread.id, name: editThreadNameValue.trim() });
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
                      <h2
                        className="font-semibold cursor-pointer hover:text-primary transition-colors"
                        onClick={() => {
                          setEditThreadNameValue(selectedThread.name || "");
                          setEditingThreadName(true);
                        }}
                        title="Click to rename"
                        data-testid="text-thread-name"
                      >
                        {selectedThread.name || 
                          (selectedThread.isCompanyWide ? "Team Chat" : 
                            selectedThread.type === "task" ? "Task Chat" : "Group Chat")}
                      </h2>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {threadMembers.length} member{threadMembers.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                {selectedThread.autoCloseAt && !selectedThread.closedAt && (
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    Closing {new Date(selectedThread.autoCloseAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </Badge>
                )}
                {selectedThread.closedAt && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      Closed
                    </Badge>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          disabled={deleteThreadMutation.isPending}
                          data-testid="button-delete-thread"
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
                            onClick={() => deleteThreadMutation.mutate(selectedThread.id)}
                            data-testid="button-confirm-delete-thread"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {!selectedThread.closedAt && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowAddMembers(true)}
                      data-testid="button-add-members"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add People
                    </Button>
                  )}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid="button-view-members">
                        <Users className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
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
                              {canRemoveMembers && member.userId !== userInfo?.userId && selectedThreadId && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                                  onClick={() => setMemberToRemove({ threadId: selectedThreadId, memberId: member.userId, name: `${member.user?.firstName} ${member.user?.lastName}` })}
                                  disabled={removeMemberMutation.isPending}
                                  title="Remove from chat"
                                  data-testid={`button-remove-member-${member.userId}`}
                                >
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 min-h-0">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mb-4 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-sm">Send the first message to start the conversation</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message, idx) => {
                      const showDateSeparator = idx === 0 ||
                        isDifferentDay(messages[idx - 1].createdAt, message.createdAt);
                      const showAvatar = idx === 0 || 
                        messages[idx - 1].senderId !== message.senderId || showDateSeparator;
                      const readBy = readReceipts.filter(
                        (r) => r.lastReadMessageId === message.id && r.userId !== userInfo?.userId
                      );
                      
                      return (
                        <div key={message.id}>
                          {showDateSeparator && (
                            <div className="flex items-center gap-3 my-4" data-testid={`date-separator-${message.id}`}>
                              <div className="flex-1 h-px bg-border" />
                              <span className="text-xs font-medium text-muted-foreground px-2">
                                {getDateLabel(message.createdAt)}
                              </span>
                              <div className="flex-1 h-px bg-border" />
                            </div>
                          )}
                          <div
                            className={`flex gap-3 ${showAvatar ? "mt-4" : "mt-1"}`}
                            data-testid={`message-${message.id}`}
                          >
                            {showAvatar ? (
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="text-xs">
                                  {message.sender?.firstName?.[0]}
                                  {message.sender?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="w-8 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              {showAvatar && (
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium">
                                    {message.sender?.firstName} {message.sender?.lastName}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatTime(message.createdAt)}
                                  </span>
                                  {message.isEdited && (
                                    <span className="text-xs text-muted-foreground">(edited)</span>
                                  )}
                                </div>
                              )}
                              <p className="text-sm whitespace-pre-wrap break-words overflow-hidden">
                                {renderMessageWithMentions(message.content)}
                              </p>
                            </div>
                          </div>
                          {readBy.length > 0 && (
                            <div className="flex items-center gap-1 ml-11 mt-1" data-testid={`read-receipts-${message.id}`}>
                              <CheckCheck className="h-3 w-3 text-blue-500" />
                              <span className="text-xs text-muted-foreground">
                                Read by {readBy.map((r) => r.user ? `${r.user.firstName}` : "Unknown").join(", ")}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input */}
              {selectedThread.closedAt ? (
                <div className="p-4 border-t bg-muted/50 text-center">
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <Lock className="h-4 w-4" />
                    This chat is closed. Messages cannot be sent.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSendMessage}
                  className="p-4 border-t bg-background"
                >
                  <div className="flex gap-2">
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
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageCircle className="h-16 w-16 mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">Select a Chat</h3>
              <p className="text-sm">
                Choose a conversation from the sidebar to start messaging
              </p>
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
          )}
        </div>
      </div>

      {/* Add Members Dialog */}
      {companyId && selectedThread && (
        <ChatMemberSelector
          companyId={companyId}
          open={showAddMembers}
          onOpenChange={setShowAddMembers}
          mode="add"
          threadId={selectedThread.id}
          existingMemberIds={threadMembers.map(m => m.userId)}
          title="Add Members to Chat"
          description="Select people to add to this chat."
        />
      )}
      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => { if (!open) setMemberToRemove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {memberToRemove?.name} from this chat?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (memberToRemove) {
                  removeMemberMutation.mutate({ threadId: memberToRemove.threadId, memberId: memberToRemove.memberId });
                }
                setMemberToRemove(null);
              }}
              data-testid="button-confirm-remove-member"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <ClientLayout>
      {content}
    </ClientLayout>
  );
}
