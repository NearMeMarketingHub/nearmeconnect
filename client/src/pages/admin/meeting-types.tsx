import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Calendar, Coins, Clock, Search } from "lucide-react";
import type { MeetingType } from "@shared/schema";

export default function AdminMeetingTypes() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingType, setEditingType] = useState<MeetingType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creditCost, setCreditCost] = useState("1");
  const [defaultDuration, setDefaultDuration] = useState("30");

  const { data: meetingTypes, isLoading } = useQuery<MeetingType[]>({
    queryKey: ["/api/meeting-types"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; creditCost: string; defaultDuration: number }) => {
      return apiRequest("POST", "/api/meeting-types", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-types"] });
      setCreateOpen(false);
      resetForm();
      toast({ title: "Meeting type created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create meeting type", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MeetingType> }) => {
      return apiRequest("PATCH", `/api/meeting-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-types"] });
      setEditOpen(false);
      setEditingType(null);
      resetForm();
      toast({ title: "Meeting type updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update meeting type", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/meeting-types/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-types"] });
      toast({ title: "Meeting type deleted successfully" });
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
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setCreditCost("1");
    setDefaultDuration("30");
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Please provide a name", variant: "destructive" });
      return;
    }
    const credits = parseFloat(creditCost) || 1;
    const duration = parseInt(defaultDuration) || 30;
    createMutation.mutate({
      name,
      description,
      creditCost: String(credits),
      defaultDuration: duration,
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType || !name.trim()) {
      toast({ title: "Please provide a name", variant: "destructive" });
      return;
    }
    const credits = parseFloat(creditCost) || 1;
    const duration = parseInt(defaultDuration) || 30;
    updateMutation.mutate({
      id: editingType.id,
      data: {
        name,
        description,
        creditCost: String(credits),
        defaultDuration: duration,
      },
    });
  };

  const openEditDialog = (type: MeetingType) => {
    setEditingType(type);
    setName(type.name);
    setDescription(type.description || "");
    setCreditCost(type.creditCost);
    setDefaultDuration(String(type.defaultDuration));
    setEditOpen(true);
  };

  const MeetingTypeForm = ({ onSubmit, isEdit = false }: { onSubmit: (e: React.FormEvent) => void; isEdit?: boolean }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Strategy Call"
          data-testid="input-meeting-type-name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what this meeting type is for..."
          data-testid="input-meeting-type-description"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="creditCost">Credit Cost</Label>
          <Input
            id="creditCost"
            type="number"
            step="0.25"
            min="0"
            value={creditCost}
            onChange={(e) => setCreditCost(e.target.value)}
            data-testid="input-meeting-type-credits"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Default Duration</Label>
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
      <DialogFooter>
        <Button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
          data-testid={isEdit ? "button-update-meeting-type" : "button-create-meeting-type"}
        >
          {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : isEdit ? "Update" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Meeting Types</h1>
            <p className="text-muted-foreground">
              Configure meeting types with credit costs for scheduling
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-add-meeting-type">
            <Plus className="mr-2 h-4 w-4" />
            Add Meeting Type
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search meeting types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-meeting-types"
          />
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : meetingTypes?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Meeting Types</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create meeting types to allow clients to request meetings
              </p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Meeting Type
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {meetingTypes?.filter(type => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              return type.name.toLowerCase().includes(q) || (type.description || "").toLowerCase().includes(q);
            }).map((type) => (
              <Card key={type.id} className={!type.isActive ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Calendar className="h-5 w-5 text-primary shrink-0" />
                      <CardTitle className="text-base truncate">{type.name}</CardTitle>
                    </div>
                    <Switch
                      checked={type.isActive}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: type.id, isActive: checked })
                      }
                      data-testid={`switch-meeting-type-${type.id}`}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {type.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {type.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Coins className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium">{type.creditCost} credits</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{type.defaultDuration} min</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(type)}
                      data-testid={`button-edit-meeting-type-${type.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`button-delete-meeting-type-${type.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(type.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
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

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Meeting Type</DialogTitle>
            </DialogHeader>
            <MeetingTypeForm onSubmit={handleCreate} />
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Meeting Type</DialogTitle>
            </DialogHeader>
            <MeetingTypeForm onSubmit={handleEdit} isEdit />
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
