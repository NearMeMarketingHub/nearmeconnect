import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileTabMenu } from "@/components/mobile-tab-menu";
import { useLocation } from "wouter";
import {
  MessageCircle,
  Users,
  Building2,
  ClipboardList,
  ChevronRight,
  ChevronLeft,
  Archive,
  Clock,
  Zap,
  Lock,
  MessageSquare,
} from "lucide-react";

interface ThreadWithInfo {
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
  companyName: string;
  taskInfo: {
    isRush?: boolean;
    rushDisabled?: boolean;
    taskTitle?: string;
  } | null;
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
}

interface UnreadCount {
  threadId: string;
  count: number;
}

const ITEMS_PER_PAGE = 10;

export default function AdminChat() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("general");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const { data: threads = [], isLoading } = useQuery<ThreadWithInfo[]>({
    queryKey: ["/api/admin/chat/threads"],
  });

  const { data: unreadCounts = [] } = useQuery<UnreadCount[]>({
    queryKey: ["/api/chat/unread"],
  });

  const activeThreads = threads.filter((t) => !t.closedAt);
  const generalChats = activeThreads.filter((t) => t.type !== "task");
  const taskChats = activeThreads.filter((t) => t.type === "task");
  const closedThreads = threads.filter((t) => !!t.closedAt);

  const getTabThreads = () => {
    switch (activeTab) {
      case "general": return { threads: generalChats, isClosed: false };
      case "task": return { threads: taskChats, isClosed: false };
      case "closed": return { threads: closedThreads, isClosed: true };
      default: return { threads: generalChats, isClosed: false };
    }
  };

  const { threads: tabThreads, isClosed } = getTabThreads();
  const totalPages = Math.max(1, Math.ceil(tabThreads.length / ITEMS_PER_PAGE));
  const paginatedThreads = tabThreads.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getUnreadCount = (threadId: string) => {
    const count = unreadCounts.find((c) => c.threadId === threadId);
    return count?.count || 0;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const handleThreadClick = (thread: ThreadWithInfo) => {
    navigate(`/admin/companies/${thread.companyId}?tab=chat&thread=${thread.id}`);
  };

  const getThreadIcon = (thread: ThreadWithInfo) => {
    if (thread.type === "task") {
      return <ClipboardList className="h-5 w-5 text-orange-500" />;
    }
    if (thread.isCompanyWide) {
      return <Users className="h-5 w-5 text-primary" />;
    }
    return <MessageCircle className="h-5 w-5 text-muted-foreground" />;
  };

  const getThreadName = (thread: ThreadWithInfo) => {
    if (thread.name) return thread.name;
    if (thread.type === "task") return thread.taskInfo?.taskTitle ? `Task: ${thread.taskInfo.taskTitle}` : "Task Chat";
    if (thread.isCompanyWide) return "Team Chat";
    return "Group Chat";
  };

  const formatAutoCloseDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  const renderThreadCard = (thread: ThreadWithInfo, closed: boolean) => {
    const unread = getUnreadCount(thread.id);
    return (
      <Card
        key={thread.id}
        className="cursor-pointer transition-colors hover-elevate"
        onClick={() => handleThreadClick(thread)}
        data-testid={`thread-item-${thread.id}`}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0">
              {closed ? <Lock className="h-5 w-5 text-muted-foreground" /> : getThreadIcon(thread)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-medium truncate" data-testid={`thread-name-${thread.id}`}>
                  {getThreadName(thread)}
                </span>
                {thread.type === "task" && thread.taskInfo?.isRush && !thread.taskInfo?.rushDisabled && (
                  <Badge variant="destructive" className="text-xs shrink-0 gap-1">
                    <Zap className="h-3 w-3" />
                    Rush
                  </Badge>
                )}
                {thread.type === "task" && thread.taskInfo?.isRush && thread.taskInfo?.rushDisabled && (
                  <Badge variant="secondary" className="text-xs shrink-0 gap-1">
                    <Zap className="h-3 w-3" />
                    Rush Off
                  </Badge>
                )}
                {unread > 0 && (
                  <Badge variant="destructive" className="text-xs shrink-0">
                    {unread}
                  </Badge>
                )}
                {thread.autoCloseAt && !thread.closedAt && (
                  <Badge variant="secondary" className="text-xs shrink-0 gap-1">
                    <Clock className="h-3 w-3" />
                    Closing {formatAutoCloseDate(thread.autoCloseAt)}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate" data-testid={`thread-company-${thread.id}`}>
                  {thread.companyName}
                </span>
              </div>

              {thread.lastMessage && (
                <p className="text-sm text-muted-foreground truncate mt-1" data-testid={`thread-preview-${thread.id}`}>
                  {thread.lastMessage.content}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {thread.lastMessage && (
                <span className="text-xs text-muted-foreground" data-testid={`thread-time-${thread.id}`}>
                  {formatTime(thread.lastMessage.createdAt)}
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const generalUnread = generalChats.reduce((acc, t) => acc + getUnreadCount(t.id), 0);
  const taskUnread = taskChats.reduce((acc, t) => acc + getUnreadCount(t.id), 0);

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">All Chats</h1>
          <p className="text-muted-foreground">
            Recent conversations across all companies
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <MobileTabMenu
              tabs={[
                { value: "general", label: "General", count: generalUnread || undefined },
                { value: "task", label: "Task", count: taskUnread || undefined },
                { value: "closed", label: "Closed" },
              ]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              title="Chat"
            />
            <TabsList className="hidden md:inline-flex mb-4" data-testid="chat-tabs">
              <TabsTrigger value="general" className="gap-2" data-testid="tab-general">
                <MessageSquare className="h-4 w-4" />
                General
                {generalChats.length > 0 && (
                  <Badge variant="secondary" className="text-xs ml-1">{generalChats.length}</Badge>
                )}
                {generalUnread > 0 && (
                  <Badge variant="destructive" className="text-xs ml-1">{generalUnread}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="task" className="gap-2" data-testid="tab-task">
                <ClipboardList className="h-4 w-4" />
                Task
                {taskChats.length > 0 && (
                  <Badge variant="secondary" className="text-xs ml-1">{taskChats.length}</Badge>
                )}
                {taskUnread > 0 && (
                  <Badge variant="destructive" className="text-xs ml-1">{taskUnread}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="closed" className="gap-2" data-testid="tab-closed">
                <Archive className="h-4 w-4" />
                Closed
                {closedThreads.length > 0 && (
                  <Badge variant="secondary" className="text-xs ml-1">{closedThreads.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {paginatedThreads.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground text-sm">
                      {activeTab === "general" ? "No general chats yet" :
                        activeTab === "task" ? "No task chats yet" : "No closed chats"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {paginatedThreads.map((thread) => renderThreadCard(thread, isClosed))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, tabThreads.length)} of {tabThreads.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      data-testid="button-next-page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
}
