import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, ListTodo, User } from "lucide-react";
import { useLocation } from "wouter";
import type { Company, Task, TaskCategory, CampaignRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { CampaignDetailPanel } from "@/components/campaign-detail-panel";
import { useAuth } from "@/hooks/use-auth";
import { ProjectBoard } from "@/components/project-board";

type AssignmentFilter = "all_tasks" | "assigned_to_me";

export default function AdminTasks() {
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all_tasks");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignRequest | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: allTasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: campaignRequests } = useQuery<CampaignRequest[]>({
    queryKey: ["/api/admin/campaign-requests"],
  });

  // Fetch categories for the selected company (or all companies when "all" is selected)
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

  const handleCompanyChange = (company: string) => {
    setSelectedCompany(company);
  };

  const handleAssignmentFilterChange = (filter: AssignmentFilter) => {
    setAssignmentFilter(filter);
  };

  // Filter tasks by company + assignment before passing to board
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
            <p className="text-muted-foreground">
              Manage and track all tasks across companies
            </p>
          </div>
          <div className="flex items-center gap-3">
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
