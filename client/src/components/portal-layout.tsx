import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { CreditBadge } from "@/components/credit-badge";
import { TaskRequestForm } from "@/components/task-request-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Task } from "@shared/schema";

interface PortalLayoutProps {
  client: { id: string; credits: number; [key: string]: any };
  children: React.ReactNode;
}

export function PortalLayout({ client, children }: PortalLayoutProps) {
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleOpenTaskForm = () => setTaskFormOpen(true);
    window.addEventListener("openTaskForm", handleOpenTaskForm);
    return () => window.removeEventListener("openTaskForm", handleOpenTaskForm);
  }, []);

  const requestTaskMutation = useMutation<Task, Error, {
    title: string;
    description: string;
    priority: string;
    creditCost: number;
    isRush: boolean;
  }>({
    mutationFn: async (data) => {
      const { isRush, ...taskData } = data;
      const response = await apiRequest("POST", "/api/tasks", {
        ...taskData,
        clientId: client.id,
        type: "requested",
        status: "pending",
        notes: isRush ? "[RUSH REQUEST] Priority turnaround requested" : undefined,
        priority: isRush ? "urgent" : taskData.priority,
        createdAt: new Date().toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", client.id] });
      queryClient.invalidateQueries({ queryKey: ["currentClient"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-transactions", client.id] });
      setTaskFormOpen(false);
      toast({
        title: "Task requested",
        description: "Your task request has been submitted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit task request.",
        variant: "destructive",
      });
    },
  });

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar client={client} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border bg-background shrink-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
            </div>
            <div className="flex items-center gap-3">
              <CreditBadge credits={client.credits} size="sm" />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-muted/30">
            {typeof children === "function"
              ? (children as (props: { onRequestTask: () => void }) => React.ReactNode)({
                  onRequestTask: () => setTaskFormOpen(true),
                })
              : children}
          </main>
        </div>
      </div>

      <TaskRequestForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        onSubmit={(data) => requestTaskMutation.mutate(data)}
        isSubmitting={requestTaskMutation.isPending}
        availableCredits={client.credits}  
      />
    </SidebarProvider>
  );
}
