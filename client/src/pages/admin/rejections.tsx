import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { XCircle, Megaphone, ClipboardList, Building2, Calendar, Search } from "lucide-react";
import type { Task, Company } from "@shared/schema";

type EnrichedCampaignRequest = {
  id: string;
  name?: string | null;
  campaignTypeName?: string;
  companyId: string;
  companyName?: string;
  requestedByName?: string;
  status: string;
  rejectionReason?: string | null;
  adminNotes?: string | null;
  dueDate?: string | null;
  updatedAt?: string | null;
  createdAt?: string;
};

type TaskWithExtras = Task & {
  companyName?: string;
  rejectionReason?: string | null;
};

function formatDate(d?: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString(); } catch { return d; }
}

export default function AdminRejections() {
  const [search, setSearch] = useState("");

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<TaskWithExtras[]>({
    queryKey: ["/api/tasks"],
  });
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<EnrichedCampaignRequest[]>({
    queryKey: ["/api/campaign-requests"],
  });
  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const companyMap = useMemo(() => {
    const m = new Map<string, string>();
    companies.forEach(c => m.set(c.id, c.name));
    return m;
  }, [companies]);

  const rejectedTasks = useMemo(() => {
    const list = tasks.filter(t =>
      t.status === "rejected" || (t as any).approvalStatus === "rejected"
    );
    const q = search.trim().toLowerCase();
    return q
      ? list.filter(t =>
          (t.title || "").toLowerCase().includes(q) ||
          (companyMap.get(t.companyId) || "").toLowerCase().includes(q)
        )
      : list;
  }, [tasks, companyMap, search]);

  const rejectedCampaigns = useMemo(() => {
    const list = campaigns.filter(c => c.status === "rejected");
    const q = search.trim().toLowerCase();
    return q
      ? list.filter(c =>
          (c.name || c.campaignTypeName || "").toLowerCase().includes(q) ||
          (c.companyName || companyMap.get(c.companyId) || "").toLowerCase().includes(q)
        )
      : list;
  }, [campaigns, companyMap, search]);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <XCircle className="w-6 h-6 text-destructive" />
              Rejections
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Rejected campaign requests and tasks across all companies, with reasons.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search title or company…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-rejections"
            />
          </div>
        </div>

        <Tabs defaultValue="tasks">
          <TabsList>
            <TabsTrigger value="tasks" data-testid="tab-rejections-tasks">
              <ClipboardList className="w-4 h-4 mr-2" />
              Tasks ({rejectedTasks.length})
            </TabsTrigger>
            <TabsTrigger value="campaigns" data-testid="tab-rejections-campaigns">
              <Megaphone className="w-4 h-4 mr-2" />
              Campaigns ({rejectedCampaigns.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-4 space-y-3">
            {tasksLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
            ) : rejectedTasks.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No rejected tasks.</CardContent></Card>
            ) : rejectedTasks.map(t => {
              const reason = (t as any).rejectionReason || (t as any).adminNotes || t.description;
              const companyName = (t as any).companyName || companyMap.get(t.companyId) || "—";
              return (
                <Card key={t.id} data-testid={`card-rejected-task-${t.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <CardTitle className="text-base" data-testid={`text-task-title-${t.id}`}>{t.title}</CardTitle>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                          <Link href={`/admin/companies/${t.companyId}`} className="flex items-center gap-1 hover:underline">
                            <Building2 className="w-3 h-3" />{companyName}
                          </Link>
                          {t.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />{formatDate(t.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="destructive">Rejected</Badge>
                    </div>
                  </CardHeader>
                  {reason && (
                    <CardContent className="pt-0">
                      <p className="text-sm whitespace-pre-wrap" data-testid={`text-task-reason-${t.id}`}>
                        <span className="font-medium">Reason: </span>{reason}
                      </p>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="campaigns" className="mt-4 space-y-3">
            {campaignsLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
            ) : rejectedCampaigns.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No rejected campaigns.</CardContent></Card>
            ) : rejectedCampaigns.map(c => {
              const reason = c.rejectionReason || c.adminNotes;
              const companyName = c.companyName || companyMap.get(c.companyId) || "—";
              return (
                <Card key={c.id} data-testid={`card-rejected-campaign-${c.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <CardTitle className="text-base" data-testid={`text-campaign-title-${c.id}`}>
                          {c.name || c.campaignTypeName || "Campaign"}
                        </CardTitle>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                          <Link href={`/admin/companies/${c.companyId}`} className="flex items-center gap-1 hover:underline">
                            <Building2 className="w-3 h-3" />{companyName}
                          </Link>
                          {c.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />{formatDate(c.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="destructive">Rejected</Badge>
                    </div>
                  </CardHeader>
                  {reason && (
                    <CardContent className="pt-0">
                      <p className="text-sm whitespace-pre-wrap" data-testid={`text-campaign-reason-${c.id}`}>
                        <span className="font-medium">Reason: </span>{reason}
                      </p>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
