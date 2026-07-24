import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, ClipboardList, GripVertical } from "lucide-react";
import type { OnboardingTemplate, OnboardingTaskTemplate } from "@shared/schema";

type TemplateWithTasks = OnboardingTemplate & { tasks: OnboardingTaskTemplate[] };

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active:   { label: "Active",   className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  draft:    { label: "Draft",    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  inactive: { label: "Inactive", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
};

const ROLE_LABELS: Record<string, string> = {
  account_manager: "Account Manager",
  strategist: "Strategist",
  designer: "Designer",
  developer: "Developer",
  content_lead: "Content Lead",
  hubspot_specialist: "HubSpot Specialist",
};

// ── Template Form ──────────────────────────────────────────────────────────────

interface TemplateFormProps {
  initial?: Partial<TemplateWithTasks>;
  onSubmit: (data: any) => void;
  isPending: boolean;
  submitLabel: string;
}

function TemplateForm({ initial, onSubmit, isPending, submitLabel }: TemplateFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [suggestedPrice, setSuggestedPrice] = useState(initial?.suggestedPrice ? String(initial.suggestedPrice) : "");
  const [status, setStatus] = useState<string>(initial?.status ?? "active");

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Template Name <span className="text-destructive">*</span></Label>
        <Input
          data-testid="input-template-name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Client Launch Setup"
        />
      </div>
      <div className="space-y-1">
        <Label>Description</Label>
        <Textarea
          data-testid="input-template-description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What does this onboarding package cover?"
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Suggested Price ($)</Label>
          <Input
            data-testid="input-template-price"
            type="number"
            min="0"
            step="0.01"
            value={suggestedPrice}
            onChange={e => setSuggestedPrice(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger data-testid="select-template-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button
        data-testid="button-submit-template"
        onClick={() => onSubmit({ name: name.trim(), description: description || null, suggestedPrice: suggestedPrice || null, status })}
        disabled={!name.trim() || isPending}
        className="w-full"
      >
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </div>
  );
}

// ── Task Form ──────────────────────────────────────────────────────────────────

interface TaskFormProps {
  initial?: Partial<OnboardingTaskTemplate>;
  onSubmit: (data: any) => void;
  isPending: boolean;
  submitLabel: string;
}

function TaskForm({ initial, onSubmit, isPending, submitLabel }: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [instructions, setInstructions] = useState(initial?.defaultInstructions ?? "");
  const [offsetDays, setOffsetDays] = useState(initial?.defaultDueOffsetDays != null ? String(initial.defaultDueOffsetDays) : "");
  const [roleOwner, setRoleOwner] = useState(initial?.defaultRoleOwner ?? "");
  const [requiresApproval, setRequiresApproval] = useState(initial?.requiresClientApproval ?? false);
  const [clientVisible, setClientVisible] = useState(initial?.createsClientVisibleTask ?? false);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Task Title <span className="text-destructive">*</span></Label>
        <Input
          data-testid="input-task-title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Client Intake Form"
        />
      </div>
      <div className="space-y-1">
        <Label>Description</Label>
        <Textarea
          data-testid="input-task-description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Brief summary of what this task involves"
          rows={2}
        />
      </div>
      <div className="space-y-1">
        <Label>Default Instructions</Label>
        <Textarea
          data-testid="input-task-instructions"
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          placeholder="Detailed instructions shown to the assignee"
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Due Offset (days from start)</Label>
          <Input
            data-testid="input-task-offset"
            type="number"
            min="0"
            value={offsetDays}
            onChange={e => setOffsetDays(e.target.value)}
            placeholder="e.g. 7"
          />
        </div>
        <div className="space-y-1">
          <Label>Default Role Owner</Label>
          <Select value={roleOwner || "__none"} onValueChange={v => setRoleOwner(v === "__none" ? "" : v)}>
            <SelectTrigger data-testid="select-task-role">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">Any</SelectItem>
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Requires Client Approval</p>
            <p className="text-xs text-muted-foreground">Task must be approved by the client before completion</p>
          </div>
          <Switch
            data-testid="switch-requires-approval"
            checked={requiresApproval}
            onCheckedChange={setRequiresApproval}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Creates Client-Visible Task</p>
            <p className="text-xs text-muted-foreground">Client can see this task in their portal</p>
          </div>
          <Switch
            data-testid="switch-client-visible"
            checked={clientVisible}
            onCheckedChange={setClientVisible}
          />
        </div>
      </div>
      <Button
        data-testid="button-submit-task"
        onClick={() => onSubmit({
          title: title.trim(),
          description: description || null,
          defaultInstructions: instructions || null,
          defaultCreditCost: "0",
          defaultDueOffsetDays: offsetDays ? parseInt(offsetDays) : null,
          defaultRoleOwner: roleOwner || null,
          requiresClientApproval: requiresApproval,
          createsClientVisibleTask: clientVisible,
          noCredit: true,
        })}
        disabled={!title.trim() || isPending}
        className="w-full"
      >
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </div>
  );
}

// ── Task List Row ──────────────────────────────────────────────────────────────

function TaskRow({ task, templateId }: { task: OnboardingTaskTemplate; templateId: string }) {
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/onboarding-task-templates/${task.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-templates"] });
      setEditOpen(false);
      toast({ title: "Task updated" });
    },
    onError: () => toast({ title: "Failed to update task", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/onboarding-task-templates/${task.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-templates"] });
      toast({ title: "Task removed" });
    },
    onError: () => toast({ title: "Failed to remove task", variant: "destructive" }),
  });

  return (
    <>
      <div className="flex items-start gap-3 py-2.5 px-3 hover:bg-muted/50 rounded-md group" data-testid={`row-task-${task.id}`}>
        <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground/40 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{task.title}</span>
            {task.defaultDueOffsetDays != null && (
              <Badge variant="outline" className="text-xs shrink-0">Day {task.defaultDueOffsetDays}</Badge>
            )}
            {task.defaultRoleOwner && (
              <Badge variant="secondary" className="text-xs shrink-0">{ROLE_LABELS[task.defaultRoleOwner] ?? task.defaultRoleOwner}</Badge>
            )}
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setEditOpen(true)}
            data-testid={`button-edit-task-${task.id}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" data-testid={`button-delete-task-${task.id}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove task?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently remove "{task.title}" from the template.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update this setup task's details.</DialogDescription>
          </DialogHeader>
          <TaskForm
            initial={task}
            onSubmit={data => updateMutation.mutate(data)}
            isPending={updateMutation.isPending}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Template Card ──────────────────────────────────────────────────────────────

function TemplateCard({ template }: { template: TemplateWithTasks }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/onboarding-templates/${template.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-templates"] });
      setEditOpen(false);
      toast({ title: "Template updated" });
    },
    onError: () => toast({ title: "Failed to update template", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/onboarding-templates/${template.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-templates"] });
      toast({ title: "Template deleted" });
    },
    onError: () => toast({ title: "Failed to delete template", variant: "destructive" }),
  });

  const addTaskMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/onboarding-templates/${template.id}/tasks`, { ...data, sortOrder: template.tasks.length }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-templates"] });
      setAddTaskOpen(false);
      toast({ title: "Task added" });
    },
    onError: () => toast({ title: "Failed to add task", variant: "destructive" }),
  });

  const sc = STATUS_CONFIG[template.status] ?? STATUS_CONFIG.active;

  return (
    <>
      <Card data-testid={`card-template-${template.id}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base">{template.name}</CardTitle>
                <Badge className={sc.className}>{sc.label}</Badge>
                {template.suggestedPrice && parseFloat(String(template.suggestedPrice)) > 0 && (
                  <Badge variant="outline">${parseFloat(String(template.suggestedPrice)).toLocaleString()}</Badge>
                )}
                <Badge variant="secondary">{template.tasks.length} task{template.tasks.length !== 1 ? "s" : ""}</Badge>
              </div>
              {template.description && (
                <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setEditOpen(true)}
                data-testid={`button-edit-template-${template.id}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" data-testid={`button-delete-template-${template.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete template?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{template.name}" and all {template.tasks.length} of its tasks. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setExpanded(e => !e)}
                data-testid={`button-expand-template-${template.id}`}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="pt-0">
            <Separator className="mb-3" />
            <div className="space-y-0.5">
              {template.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No tasks yet — add the first one below.</p>
              ) : (
                template.tasks.map(task => (
                  <TaskRow key={task.id} task={task} templateId={template.id} />
                ))
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={() => setAddTaskOpen(true)}
              data-testid={`button-add-task-${template.id}`}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Edit template dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>Update this onboarding template's details.</DialogDescription>
          </DialogHeader>
          <TemplateForm
            initial={template}
            onSubmit={data => updateMutation.mutate(data)}
            isPending={updateMutation.isPending}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>

      {/* Add task dialog */}
      <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Task to "{template.name}"</DialogTitle>
            <DialogDescription>Add a new setup task to this onboarding template.</DialogDescription>
          </DialogHeader>
          <TaskForm
            onSubmit={data => addTaskMutation.mutate(data)}
            isPending={addTaskMutation.isPending}
            submitLabel="Add Task"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminOnboardingTemplates() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: templates = [], isLoading } = useQuery<TemplateWithTasks[]>({
    queryKey: ["/api/onboarding-templates"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/onboarding-templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-templates"] });
      setCreateOpen(false);
      toast({ title: "Template created" });
    },
    onError: () => toast({ title: "Failed to create template", variant: "destructive" }),
  });

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-6 w-6 text-orange-500" />
            <div>
              <h1 className="text-2xl font-bold">Onboarding Templates</h1>
              <p className="text-sm text-muted-foreground">Setup task checklists applied to new clients — separate from monthly retainer credits.</p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-new-template">
            <Plus className="h-4 w-4 mr-1" />
            New Template
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No onboarding templates yet</p>
              <p className="text-sm text-muted-foreground mb-4">Create your first template to standardize client setup.</p>
              <Button onClick={() => setCreateOpen(true)} data-testid="button-create-first-template">
                <Plus className="h-4 w-4 mr-1" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map(tpl => (
              <TemplateCard key={tpl.id} template={tpl} />
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Onboarding Template</DialogTitle>
            <DialogDescription>Create a reusable setup checklist for onboarding new clients.</DialogDescription>
          </DialogHeader>
          <TemplateForm
            onSubmit={data => createMutation.mutate(data)}
            isPending={createMutation.isPending}
            submitLabel="Create Template"
          />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
