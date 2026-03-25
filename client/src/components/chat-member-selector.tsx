import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { UserPlus, Shield, Users, Check } from "lucide-react";

interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isAdmin: boolean;
  isCompanyMember: boolean;
}

interface ChatMemberSelectorProps {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "add";
  threadId?: string;
  existingMemberIds?: string[];
  onMembersSelected?: (memberIds: string[]) => void;
  title?: string;
  description?: string;
}

export function ChatMemberSelector({
  companyId,
  open,
  onOpenChange,
  mode,
  threadId,
  existingMemberIds = [],
  onMembersSelected,
  title,
  description,
}: ChatMemberSelectorProps) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: availableUsers, isLoading } = useQuery<ChatUser[]>({
    queryKey: ["/api/companies", companyId, "chat-users"],
    enabled: open && !!companyId,
  });

  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!threadId) throw new Error("No thread ID");
      return apiRequest("POST", `/api/chat/threads/${threadId}/members`, { memberUserId: userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads", threadId, "members"] });
    },
  });

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
    }
  }, [open]);

  const filteredUsers = availableUsers?.filter(
    (user) => !existingMemberIds.includes(user.id)
  ) || [];

  const adminUsers = filteredUsers.filter(u => u.isAdmin);
  const companyUsers = filteredUsers.filter(u => u.isCompanyMember && !u.isAdmin);

  const toggleUser = (userId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleConfirm = async () => {
    const memberIds = Array.from(selectedIds);
    
    if (mode === "create" && onMembersSelected) {
      onMembersSelected(memberIds);
      onOpenChange(false);
    } else if (mode === "add" && threadId) {
      try {
        for (const userId of memberIds) {
          await addMemberMutation.mutateAsync(userId);
        }
        toast({ title: `Added ${memberIds.length} member(s) to the chat` });
        onOpenChange(false);
      } catch (error) {
        toast({ title: "Failed to add some members", variant: "destructive" });
      }
    }
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredUsers.map(u => u.id)));
  };

  const clearAll = () => {
    setSelectedIds(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            {title || (mode === "create" ? "Select Chat Members" : "Add Members to Chat")}
          </DialogTitle>
          <DialogDescription>
            {description || "Select people to include in this chat. You can add company members and agency admins."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2 py-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No additional users available to add</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {selectedIds.size} of {filteredUsers.length} selected
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll} data-testid="button-select-all">
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={clearAll} data-testid="button-clear-all">
                  Clear
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {adminUsers.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Agency Team</span>
                    </div>
                    <div className="space-y-1">
                      {adminUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                          onClick={() => toggleUser(user.id)}
                          data-testid={`user-option-${user.id}`}
                        >
                          <Checkbox
                            checked={selectedIds.has(user.id)}
                            onCheckedChange={() => toggleUser(user.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            <Shield className="w-3 h-3 mr-1" />
                            Agency Admin
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {companyUsers.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Company Members</span>
                    </div>
                    <div className="space-y-1">
                      {companyUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                          onClick={() => toggleUser(user.id)}
                          data-testid={`user-option-${user.id}`}
                        >
                          <Checkbox
                            checked={selectedIds.has(user.id)}
                            onCheckedChange={() => toggleUser(user.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedIds.size === 0 || addMemberMutation.isPending}
            data-testid="button-confirm-members"
          >
            {addMemberMutation.isPending ? "Adding..." : (
              <>
                <Check className="w-4 h-4 mr-2" />
                {mode === "create" ? "Create Chat" : `Add ${selectedIds.size} Member(s)`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
