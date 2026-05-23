import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Plus, Pin, Megaphone, ChevronLeft, MessageSquare, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { MessageBoardPost, MessageBoardReply } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const POST_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "announcement", label: "Announcement" },
  { value: "update", label: "Update" },
  { value: "question", label: "Question" },
  { value: "feedback", label: "Feedback" },
];

function timeAgo(ts?: string | null) {
  if (!ts) return "";
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true }); } catch { return ""; }
}

function Avatar({ name, size = 7 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={cn("rounded-full bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 font-semibold flex items-center justify-center shrink-0 text-xs", `h-${size} w-${size}`)}>
      {initials}
    </div>
  );
}

interface Props { companyId: string; currentUserId: string; currentUserName: string; isAdmin?: boolean; initialPostId?: string | null; }

export function MessageBoardPanel({ companyId, currentUserId, currentUserName, isAdmin, initialPostId }: Props) {
  const { toast } = useToast();
  const [viewingPostId, setViewingPostId] = useState<string | null>(initialPostId ?? null);
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostBody, setNewPostBody] = useState("");
  const [newPostCategory, setNewPostCategory] = useState("general");
  const [replyBody, setReplyBody] = useState("");

  const { data: posts = [] } = useQuery<MessageBoardPost[]>({
    queryKey: ["/api/companies", companyId, "message-board"],
    queryFn: async () => { const r = await fetch(`/api/companies/${companyId}/message-board`); return r.json(); },
  });

  const { data: replies = [] } = useQuery<MessageBoardReply[]>({
    queryKey: ["/api/companies", companyId, "message-board", viewingPostId, "replies"],
    queryFn: async () => {
      if (!viewingPostId) return [];
      const r = await fetch(`/api/companies/${companyId}/message-board/${viewingPostId}/replies`);
      return r.json();
    },
    enabled: !!viewingPostId,
  });

  const createPostMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/companies/${companyId}/message-board`, data),
    onSuccess: async (r) => {
      const post = await r.json();
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "message-board"] });
      setNewPostOpen(false);
      setNewPostTitle(""); setNewPostBody(""); setNewPostCategory("general");
      setViewingPostId(post.id);
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/companies/${companyId}/message-board/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "message-board"] });
      setViewingPostId(null);
    },
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, isPinned, isAnnouncement }: any) => apiRequest("PATCH", `/api/companies/${companyId}/message-board/${id}`, { isPinned, isAnnouncement }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "message-board"] }),
  });

  const createReplyMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/companies/${companyId}/message-board/${viewingPostId}/replies`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "message-board", viewingPostId, "replies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "message-board"] });
      setReplyBody("");
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/companies/${companyId}/message-board/replies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "message-board", viewingPostId, "replies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "message-board"] });
    },
  });

  const viewingPost = posts.find(p => p.id === viewingPostId) ?? null;
  const pinned = posts.filter(p => p.isPinned || p.isAnnouncement);
  const regular = posts.filter(p => !p.isPinned && !p.isAnnouncement);
  const sortedPosts = [...pinned, ...regular];

  if (viewingPost) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => setViewingPostId(null)} data-testid="button-back-board">
          <ChevronLeft className="h-4 w-4" /> Back to Board
        </Button>

        {/* Post */}
        <div className="border rounded-lg p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">{viewingPost.category ?? "general"}</Badge>
                {viewingPost.isPinned && <Badge className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"><Pin className="h-3 w-3 mr-1" />Pinned</Badge>}
                {viewingPost.isAnnouncement && <Badge className="text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"><Megaphone className="h-3 w-3 mr-1" />Announcement</Badge>}
              </div>
              <h2 className="text-xl font-bold">{viewingPost.title}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Avatar name={viewingPost.postedByName} size={6} />
                <span>{viewingPost.postedByName}</span>
                <span>·</span>
                <span>{timeAgo(viewingPost.createdAt)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isAdmin && (
                <>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => pinMutation.mutate({ id: viewingPost.id, isPinned: !viewingPost.isPinned, isAnnouncement: viewingPost.isAnnouncement })} data-testid="button-pin-post">
                    <Pin className="h-3.5 w-3.5" /> {viewingPost.isPinned ? "Unpin" : "Pin"}
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => pinMutation.mutate({ id: viewingPost.id, isPinned: viewingPost.isPinned, isAnnouncement: !viewingPost.isAnnouncement })} data-testid="button-announcement-post">
                    <Megaphone className="h-3.5 w-3.5" /> {viewingPost.isAnnouncement ? "Unmark" : "Announce"}
                  </Button>
                </>
              )}
              {(isAdmin || viewingPost.postedBy === currentUserId) && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive" data-testid="button-delete-post">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete post?</AlertDialogTitle><AlertDialogDescription>All replies will also be deleted.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deletePostMutation.mutate(viewingPost.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: viewingPost.body }} />
        </div>

        {/* Replies */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">{replies.length} {replies.length === 1 ? "Reply" : "Replies"}</h3>
          {replies.map(reply => (
            <div key={reply.id} className="flex gap-3 border rounded-lg p-4" data-testid={`reply-${reply.id}`}>
              <Avatar name={reply.postedByName} />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{reply.postedByName}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(reply.createdAt)}</span>
                </div>
                <div className="text-sm prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: reply.body }} />
              </div>
              {(isAdmin || reply.postedBy === currentUserId) && (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive self-start" onClick={() => deleteReplyMutation.mutate(reply.id)} data-testid={`button-delete-reply-${reply.id}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}

          {/* Reply box */}
          <div className="border rounded-lg p-4 space-y-2 bg-muted/20">
            <p className="text-sm font-medium">Write a reply...</p>
            <Textarea
              placeholder="Share your thoughts..."
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              className="resize-none"
              rows={3}
              data-testid="textarea-reply"
            />
            <Button size="sm" onClick={() => createReplyMutation.mutate({ body: replyBody, postedBy: currentUserId, postedByName: currentUserName, companyId })}
              disabled={!replyBody.trim() || createReplyMutation.isPending} data-testid="button-post-reply">
              Post Reply
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Message Board</h3>
        <Dialog open={newPostOpen} onOpenChange={setNewPostOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" data-testid="button-new-post"><Plus className="h-4 w-4" />New Post</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New Post</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title" value={newPostTitle} onChange={e => setNewPostTitle(e.target.value)} data-testid="input-post-title" />
              <Select value={newPostCategory} onValueChange={setNewPostCategory}>
                <SelectTrigger data-testid="select-post-category"><SelectValue /></SelectTrigger>
                <SelectContent>{POST_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
              <RichTextEditor value={newPostBody} onChange={setNewPostBody} placeholder="What's on your mind?" minHeight={150} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setNewPostOpen(false)}>Cancel</Button>
                <Button onClick={() => createPostMutation.mutate({ title: newPostTitle, body: newPostBody, category: newPostCategory, postedBy: currentUserId, postedByName: currentUserName, companyId })}
                  disabled={!newPostTitle.trim() || !newPostBody.trim() || createPostMutation.isPending} data-testid="button-submit-post">
                  Post
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Post list */}
      {sortedPosts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No posts yet. Be the first to post!</p>
        </div>
      )}
      <div className="space-y-3">
        {sortedPosts.map(post => (
          <button
            key={post.id}
            onClick={() => setViewingPostId(post.id)}
            data-testid={`post-card-${post.id}`}
            className={cn(
              "w-full text-left border rounded-lg p-4 hover:bg-muted/40 transition-colors space-y-2",
              post.isAnnouncement && "border-l-4 border-l-orange-500"
            )}>
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">{post.category ?? "general"}</Badge>
                  {post.isPinned && <span className="text-xs text-orange-500 flex items-center gap-0.5"><Pin className="h-3 w-3" />Pinned</span>}
                  {post.isAnnouncement && <span className="text-xs text-red-500 flex items-center gap-0.5"><Megaphone className="h-3 w-3" />Announcement</span>}
                </div>
                <p className="font-semibold text-sm">{post.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2" dangerouslySetInnerHTML={{ __html: post.body.replace(/<[^>]+>/g, " ").slice(0, 150) }} />
              </div>
              <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 mt-1">
                <MessageSquare className="h-3.5 w-3.5" />{post.replyCount}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar name={post.postedByName} size={5} />
              <span>{post.postedByName}</span>
              <span>·</span>
              <span>{timeAgo(post.createdAt)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
