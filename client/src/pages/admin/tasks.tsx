import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Building2, ListTodo, User, Plus, Repeat, CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import type { Company, Task, TaskCategory, CampaignRequest, DeliverableType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { CampaignDetailPanel } from "@/components/campaign-detail-panel";
import { useAuth } from "@/hooks/use-auth";
import { ProjectBoard } from "@/components/project-board";
import { apiRequest, queryClient } from "@/lib/queryClient";

type AssignmentFilter = "all_tasks" | "assigned_to_me";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function AdminTasks() {
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all_tasks");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignRequest | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // Bulk create dialog state
  const [bulkCreateOpen, setBulkCreateOpen] = useState(false);
  const [bulkTitle, setBulkTitle] = useState("");
  const [bulkDescription, setBulkDescription] = useState("");
  const [bulkTopic, setBulkTopic] = useState("");
  const [bulkPriority, setBulkPriority] = useState("medium");
  const [bulkDeliverableType, setBulkDeliverableType] = useState("");
  const [bulkCategoryId, setBulkCategoryId] = useState("none");
  const [bulkDueDate, setBulkDueDate] = useState("");
  const [bulkTaskOwnership, setBulkTaskOwnership] = useState<"agency" | "client">("agency");
  const [bulkNoCredit, setBulkNoCredit] = useState(false);
  const [bulkIsRecurring, setBulkIsRecurring] = useState(false);
  const [bulkRecurrencePattern, setBulkRecurrencePattern] = useState("monthly");
  const [bulkRecurrenceDay, setBulkRecurrenceDay] = useState("1");
  const [bulkRecurrenceWeekday, setBulkRecurrenceWeekday] = useState("1");
  const [bulkRecurrenceWeekOrdinal, setBulkRecurrenceWeekOrdinal] = useState("1");
  const [bulkCalendarDate, setBulkCalendarDate] = useState(new Date());
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [bulkQuantity, setBulkQuantity] = useState("1");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: allTasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: campaignRequests } = useQuery<CampaignRequest[]>({
    queryKey: ["/api/admin/campaign-requests"],
  });

  const { data: deliverableTypes = [] } = useQuery<DeliverableType[]>({
    queryKey: ["/api/deliverable-types"],
  });

  const { data: globalCategories = [] } = useQuery<TaskCategory[]>({
    queryKey: ["/api/task-categories/global"],
    queryFn: async () => {
      const r = await fetch("/api/task-categories/global");
      if (!r.ok) return [];
      return r.json();
    },
    enabled: bulkCreateOpen,
  });

  const { data: companyCategories = [] } = useQuery<TaskCategory[]>({
    queryKey: ["/api/companies", selectedCompany, "task-categories"],
    queryFn: async () => {
      if (selectedCompany === "all") return [];
      const r = await fetch(`/api/companies/${selectedCompany}/task-categories`);
      if (!r.ok) return [];
      return r.json();
    },
    enabled: selectedCompany !== "all",
  });

  const { data: allCategories = [] } = useQuery<TaskCategory[]>({
    queryKey: ["/api/task-categories/all"],
    queryFn: async () => {
      const r = await fetch("/api/task-categories/all");
      if (!r.ok) return [];
      return r.json();
    },
    enabled: selectedCompany === "all",
  });

  const handleCompanyChange = (company: string) => setSelectedCompany(company);
  const handleAssignmentFilterChange = (filter: AssignmentFilter) => setAssignmentFilter(filter);

  const boardTasks = useMemo(() => {
    if (!allTasks) return [];
    let tasks = allTasks.filter((t) => t.status !== "cadence_parent");
    if (selectedCompany !== "all") {
      tasks = tasks.filter((t) => t.companyId === selectedCompany);
    }
    if (assignmentFilter === "assigned_to_me" && user) {
      tasks = tasks.filter((t) => t.assignedTo === user.id);
    }
    return tasks;
  }, [allTasks, selectedCompany, assignmentFilter, user]);

  const isLoading = companiesLoading || tasksLoading;

  const activeDeliverables = deliverableTypes.filter((d: DeliverableType) => d.isActive !== false);

  const allCompanyIds = companies?.map((c) => c.id) ?? [];
  const allSelected = allCompanyIds.length > 0 && allCompanyIds.every((id) => selectedCompanyIds.includes(id));

  const toggleAllCompanies = () => {
    if (allSelected) {
      setSelectedCompanyIds([]);
    } else {
      setSelectedCompanyIds(allCompanyIds);
    }
  };

  const toggleCompany = (id: string) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const resetBulkForm = () => {
    setBulkTitle("");
    setBulkDescription("");
    setBulkTopic("");
    setBulkPriority("medium");
    setBulkDeliverableType("");
    setBulkCategoryId("none");
    setBulkDueDate("");
    setBulkTaskOwnership("agency");
    setBulkNoCredit(false);
    setBulkIsRecurring(false);
    setBulkRecurrencePattern("monthly");
    setBulkRecurrenceDay("1");
    setBulkRecurrenceWeekday("1");
    setBulkRecurrenceWeekOrdinal("1");
    setBulkQuantity("1");
    setSelectedCompanyIds([]);
  };

  const handleBulkCreate = async () => {
    if (!bulkTitle.trim()) {
      toast({ title: "Please enter a task title", variant: "destructive" });
      return;
    }
    if (!bulkDeliverableType) {
      toast({ title: "Please select a deliverable type", variant: "destructive" });
      return;
    }
    if (selectedCompanyIds.length === 0) {
      toast({ title: "Please select at least one company", variant: "destructive" });
      return;
    }

    const selectedDel = activeDeliverables.find((d: DeliverableType) => d.key === bulkDeliverableType);
    const creditCost = bulkNoCredit || bulkTaskOwnership === "client" ? "0" : (selectedDel?.credits ?? "1");

    const recurringFields = bulkIsRecurring ? {
      recurrenceDay: ["monthly", "day_of_month", "quarterly", "semi_annually", "annually"].includes(bulkRecurrencePattern) ? parseInt(bulkRecurrenceDay) : null,
      recurrenceWeekday: ["day_of_week", "biweekly", "weekly", "annually"].includes(bulkRecurrencePattern) ? parseInt(bulkRecurrenceWeekday) : null,
      recurrenceWeekOrdinal: bulkRecurrencePattern === "day_of_week" ? parseInt(bulkRecurrenceWeekOrdinal) : null,
    } : { recurrenceDay: null, recurrenceWeekday: null, recurrenceWeekOrdinal: null };

    const qty = parseInt(bulkQuantity) || 1;
    const payload = {
      title: bulkTitle.trim(),
      description: bulkDescription.trim() || null,
      topic: bulkTopic.trim() || null,
      priority: bulkPriority,
      deliverableType: bulkDeliverableType,
      creditCost,
      status: "pending",
      type: "assigned",
      dueDate: bulkDueDate || null,
      taskOwnership: bulkTaskOwnership,
      isRecurring: bulkIsRecurring,
      recurrencePattern: bulkIsRecurring ? bulkRecurrencePattern : null,
      categoryId: bulkCategoryId && bulkCategoryId !== "none" ? bulkCategoryId : null,
      bulkQuantity: qty > 1 ? qty : null,
      ...recurringFields,
    };

    setBulkSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const companyId of selectedCompanyIds) {
      try {
        await apiRequest("POST", "/api/tasks", { ...payload, companyId });
        successCount++;
      } catch {
        errorCount++;
      }
    }

    await queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    setBulkSubmitting(false);

    if (successCount > 0) {
      toast({
        title: `Created ${successCount} task${successCount !== 1 ? "s" : ""} successfully${errorCount > 0 ? ` (${errorCount} failed)` : ""}`,
      });
      setBulkCreateOpen(false);
      resetBulkForm();
    } else {
      toast({ title: "Failed to create tasks", variant: "destructive" });
    }
  };

  const getCampaignForTask = (campaignRequestId: string | null) => {
    if (!campaignRequestId || !campaignRequests) return null;
    return campaignRequests.find((c) => c.id === campaignRequestId) || null;
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold">All Tasks</h1>
            <p className="text-muted-foreground">Manage and track all tasks across companies</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              size="sm"
              onClick={() => setBulkCreateOpen(true)}
              data-testid="button-create-task"
            >
              <Plus className="w-4 h-4 mr-1" />
              Create Task
            </Button>
            <div className="flex gap-1">
              <Button
                variant={assignmentFilter === "all_tasks" ? "default" : "outline"}
                size="sm"
                onClick={() => handleAssignmentFilterChange("all_tasks")}
                data-testid="filter-all-tasks"
              >
                <ListTodo className="w-3 h-3 mr-1" />
                All Tasks
              </Button>
              <Button
                variant={assignmentFilter === "assigned_to_me" ? "default" : "outline"}
                size="sm"
                onClick={() => handleAssignmentFilterChange("assigned_to_me")}
                data-testid="filter-assigned-to-me"
              >
                <User className="w-3 h-3 mr-1" />
                Assigned to Me
              </Button>
            </div>
            <Select value={selectedCompany} onValueChange={handleCompanyChange}>
              <SelectTrigger className="w-[200px]" data-testid="select-company-filter">
                <Building2 className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies?.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Project Board */}
        <ProjectBoard
          companyId={selectedCompany}
          tasks={boardTasks}
          categories={selectedCompany === "all" ? allCategories : companyCategories}
          tasksLoading={isLoading}
          onTaskClick={setSelectedTask}
          showCompanyLabel={selectedCompany === "all"}
          companies={companies?.map((c) => ({ id: c.id, name: c.name }))}
          disableDnD={selectedCompany === "all"}
        />
      </div>

      {/* Bulk Create Task Dialog */}
      <Dialog open={bulkCreateOpen} onOpenChange={(open) => { setBulkCreateOpen(open); if (!open) resetBulkForm(); }}>
        <DialogContent className="max-w-2xl flex flex-col" style={{ maxHeight: "90vh" }} data-testid="dialog-bulk-create-task">
          <DialogHeader className="shrink-0">
            <DialogTitle>Create Task</DialogTitle>
            <p className="text-sm text-muted-foreground">Create a task for one or more companies at once.</p>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <div className="space-y-5 py-1">

              {/* Company Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Companies <span className="text-destructive">*</span></Label>
                <div className="border rounded-md p-3 space-y-2 max-h-44 overflow-y-auto">
                  <div className="flex items-center gap-2 pb-1 border-b">
                    <Checkbox
                      id="bulk-select-all"
                      checked={allSelected}
                      onCheckedChange={toggleAllCompanies}
                      data-testid="checkbox-select-all-companies"
                    />
                    <Label htmlFor="bulk-select-all" className="text-sm font-medium cursor-pointer">
                      Select All Companies
                    </Label>
                    {selectedCompanyIds.length > 0 && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {selectedCompanyIds.length} selected
                      </Badge>
                    )}
                  </div>
                  {companies?.map((company) => (
                    <div key={company.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`company-${company.id}`}
                        checked={selectedCompanyIds.includes(company.id)}
                        onCheckedChange={() => toggleCompany(company.id)}
                        data-testid={`checkbox-company-${company.id}`}
                      />
                      <Label htmlFor={`company-${company.id}`} className="text-sm cursor-pointer">
                        {company.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task Title */}
              <div className="space-y-1">
                <Label htmlFor="bulk-title">Title <span className="text-destructive">*</span></Label>
                <Input
                  id="bulk-title"
                  value={bulkTitle}
                  onChange={(e) => setBulkTitle(e.target.value)}
                  placeholder="Task title"
                  data-testid="input-bulk-title"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <Label htmlFor="bulk-description">Description</Label>
                <Textarea
                  id="bulk-description"
                  value={bulkDescription}
                  onChange={(e) => setBulkDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={2}
                  data-testid="input-bulk-description"
                />
              </div>

              {/* Topic */}
              <div className="space-y-1">
                <Label htmlFor="bulk-topic">Topic <span className="text-muted-foreground font-normal">(per-instance, not copied to next recurrence)</span></Label>
                <Input
                  id="bulk-topic"
                  value={bulkTopic}
                  onChange={(e) => setBulkTopic(e.target.value)}
                  placeholder="e.g. Q3 blog, July social content"
                  data-testid="input-bulk-topic"
                />
              </div>

              {/* Deliverable Type + Priority row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Deliverable Type <span className="text-destructive">*</span></Label>
                  <Select value={bulkDeliverableType} onValueChange={setBulkDeliverableType}>
                    <SelectTrigger data-testid="select-bulk-deliverable">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeDeliverables.map((d: DeliverableType) => (
                        <SelectItem key={d.key} value={d.key}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Priority</Label>
                  <Select value={bulkPriority} onValueChange={setBulkPriority}>
                    <SelectTrigger data-testid="select-bulk-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bulk Quantity + Due Date row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="bulk-quantity">Quantity</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="bulk-quantity"
                      type="number"
                      min="1"
                      value={bulkQuantity}
                      onChange={(e) => setBulkQuantity(e.target.value)}
                      className="w-24"
                      data-testid="input-bulk-quantity"
                    />
                    <span className="text-sm text-muted-foreground">deliverables</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Set &gt; 1 for bulk (e.g. 30 posts)</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bulk-due-date">Due Date</Label>
                  <Input
                    id="bulk-due-date"
                    type="date"
                    value={bulkDueDate}
                    onChange={(e) => setBulkDueDate(e.target.value)}
                    data-testid="input-bulk-due-date"
                  />
                </div>
              </div>

              {/* Category row */}
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
                  <SelectTrigger data-testid="select-bulk-category">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {globalCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Global categories only</p>
              </div>

              {/* Recurring toggle */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="bulk-recurring"
                    checked={bulkIsRecurring}
                    onCheckedChange={(c) => setBulkIsRecurring(!!c)}
                    data-testid="checkbox-bulk-recurring"
                  />
                  <Label htmlFor="bulk-recurring" className="flex items-center gap-1 cursor-pointer">
                    <Repeat className="h-3 w-3" />
                    Recurring task
                  </Label>
                </div>

                {bulkIsRecurring && (
                  <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                    <div className="space-y-1">
                      <Label>Frequency</Label>
                      <Select value={bulkRecurrencePattern} onValueChange={setBulkRecurrencePattern}>
                        <SelectTrigger data-testid="select-bulk-recurrence-pattern">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly (every other week)</SelectItem>
                          <SelectItem value="monthly">Monthly (same date each month)</SelectItem>
                          <SelectItem value="day_of_week">Monthly (specific weekday, e.g. 2nd Tuesday)</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="semi_annually">Semi-annually</SelectItem>
                          <SelectItem value="annually">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {bulkRecurrencePattern === "daily" && (
                      <p className="text-xs text-muted-foreground">Task repeats every day. Set the first due date above.</p>
                    )}

                    {(bulkRecurrencePattern === "weekly" || bulkRecurrencePattern === "biweekly") && (
                      <div className="space-y-1">
                        <Label>Day of Week</Label>
                        <Select value={bulkRecurrenceWeekday} onValueChange={setBulkRecurrenceWeekday}>
                          <SelectTrigger data-testid="select-bulk-recurrence-weekday">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WEEKDAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {bulkRecurrencePattern === "weekly" ? "Every" : "Every other"} {WEEKDAYS[parseInt(bulkRecurrenceWeekday)]}
                        </p>
                      </div>
                    )}

                    {(bulkRecurrencePattern === "monthly" || bulkRecurrencePattern === "day_of_month" || bulkRecurrencePattern === "quarterly" || bulkRecurrencePattern === "semi_annually") && (
                      <div className="space-y-1">
                        <Label>Day of Month</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-bulk-recurrence-day">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              Day {bulkRecurrenceDay} of each {bulkRecurrencePattern === "quarterly" ? "quarter" : bulkRecurrencePattern === "semi_annually" ? "half-year" : "month"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-4" align="start">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Button variant="ghost" size="icon" onClick={() => setBulkCalendarDate(new Date(bulkCalendarDate.getFullYear(), bulkCalendarDate.getMonth() - 1, 1))}>
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm font-medium">
                                  {bulkCalendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                                </span>
                                <Button variant="ghost" size="icon" onClick={() => setBulkCalendarDate(new Date(bulkCalendarDate.getFullYear(), bulkCalendarDate.getMonth() + 1, 1))}>
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-7 gap-1 text-center">
                                {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
                                  <div key={d} className="text-xs font-medium text-muted-foreground py-1">{d}</div>
                                ))}
                                {(() => {
                                  const year = bulkCalendarDate.getFullYear();
                                  const month = bulkCalendarDate.getMonth();
                                  const firstDay = new Date(year, month, 1).getDay();
                                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                                  const cells = [];
                                  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} className="min-h-8 min-w-8" />);
                                  for (let day = 1; day <= daysInMonth; day++) {
                                    const isSelected = bulkRecurrenceDay === String(day);
                                    cells.push(
                                      <Button key={day} variant={isSelected ? "default" : "ghost"} size="icon" onClick={() => setBulkRecurrenceDay(String(day))}>
                                        {day}
                                      </Button>
                                    );
                                  }
                                  return cells;
                                })()}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

                    {bulkRecurrencePattern === "day_of_week" && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label>Which occurrence</Label>
                            <Select value={bulkRecurrenceWeekOrdinal} onValueChange={setBulkRecurrenceWeekOrdinal}>
                              <SelectTrigger data-testid="select-bulk-week-ordinal">
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
                            <Label>Day of week</Label>
                            <Select value={bulkRecurrenceWeekday} onValueChange={setBulkRecurrenceWeekday}>
                              <SelectTrigger data-testid="select-bulk-weekday">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {WEEKDAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          e.g., the {bulkRecurrenceWeekOrdinal === "-1" ? "last" : bulkRecurrenceWeekOrdinal === "1" ? "1st" : bulkRecurrenceWeekOrdinal === "2" ? "2nd" : bulkRecurrenceWeekOrdinal === "3" ? "3rd" : "4th"} {WEEKDAYS[parseInt(bulkRecurrenceWeekday)]} of each month
                        </p>
                      </div>
                    )}

                    {bulkRecurrencePattern === "annually" && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label>Month</Label>
                          <Select value={bulkRecurrenceWeekday} onValueChange={setBulkRecurrenceWeekday}>
                            <SelectTrigger data-testid="select-bulk-annual-month">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>Day</Label>
                          <Select value={bulkRecurrenceDay} onValueChange={setBulkRecurrenceDay}>
                            <SelectTrigger data-testid="select-bulk-annual-day">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                                <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Task Ownership */}
              <div className="space-y-1">
                <Label>Task Ownership</Label>
                <Select value={bulkTaskOwnership} onValueChange={(v) => setBulkTaskOwnership(v as "agency" | "client")}>
                  <SelectTrigger data-testid="select-bulk-task-ownership">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agency">Agency Managed</SelectItem>
                    <SelectItem value="client">Client Managed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* No Credit */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="bulk-no-credit"
                  checked={bulkNoCredit || bulkTaskOwnership === "client"}
                  onCheckedChange={(c) => setBulkNoCredit(!!c)}
                  disabled={bulkTaskOwnership === "client"}
                  data-testid="checkbox-bulk-no-credit"
                />
                <Label htmlFor="bulk-no-credit" className="cursor-pointer">No credit cost (bonus task)</Label>
              </div>

              {bulkDeliverableType && !bulkNoCredit && bulkTaskOwnership !== "client" && (() => {
                const sel = activeDeliverables.find((d: DeliverableType) => d.key === bulkDeliverableType);
                return sel ? (
                  <p className="text-sm text-muted-foreground">
                    Credit cost: <span className="font-mono font-medium text-foreground">{sel.credits}</span> per company
                  </p>
                ) : null;
              })()}

            </div>
          </div>

          <DialogFooter className="shrink-0 pt-3 border-t">
            <Button variant="outline" onClick={() => { setBulkCreateOpen(false); resetBulkForm(); }} disabled={bulkSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkCreate}
              disabled={bulkSubmitting || !bulkTitle.trim() || !bulkDeliverableType || selectedCompanyIds.length === 0}
              data-testid="button-bulk-create-submit"
            >
              {bulkSubmitting
                ? `Creating (${selectedCompanyIds.length})...`
                : `Create for ${selectedCompanyIds.length} ${selectedCompanyIds.length === 1 ? "Company" : "Companies"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskDetailPanel
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        isAdmin={true}
        companyId={selectedTask?.companyId || ""}
        onNavigateToChat={(threadId, companyId) => {
          setLocation(`/admin/companies/${companyId}?tab=chat&thread=${threadId}`);
        }}
        onViewCampaign={(campaignRequestId) => {
          const campaign = getCampaignForTask(campaignRequestId);
          if (campaign) {
            setSelectedTask(null);
            setSelectedCampaign(campaign);
          }
        }}
      />

      <CampaignDetailPanel
        campaign={selectedCampaign}
        open={!!selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
        isAdmin={true}
        onTaskClick={(task) => {
          setSelectedCampaign(null);
          setSelectedTask(task);
        }}
      />
    </AdminLayout>
  );
}
