import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Link2, Link2Off, RefreshCw, ExternalLink, Users, DollarSign,
  Mail, BarChart2, Loader2, AlertTriangle, CheckCircle2, Clock,
  Zap, ScrollText, CalendarPlus, Play, Pause, FileText, X,
} from "lucide-react";

interface HubspotPanelProps {
  companyId: string;
}

const ACTION_LABELS: Record<string, string> = {
  sync_company: "Company Sync",
  sync_tasks: "Task Sync",
  pull_contacts: "Pull Contacts",
  pull_deals: "Pull Deals",
  pull_campaigns: "Pull Campaigns",
  pull_workflows: "Pull Workflows",
  pull_social: "Pull Social",
  push_social: "Push Social",
  oauth_connect: "OAuth Connected",
  oauth_disconnect: "Disconnected",
  webhook_deal_closed_won: "Webhook: Deal Closed",
  webhook_contact_created: "Webhook: New Contact",
  webhook_lead_qualified: "Webhook: Lead Qualified",
  webhook_ticket_created: "Webhook: Support Ticket",
};

export function HubspotPanel({ companyId }: HubspotPanelProps) {
  const { toast } = useToast();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const hubspotParam = urlParams.get("hubspot");
  const hubspotMsg = urlParams.get("msg");
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [activeTab, setActiveTab] = useState("crm");
  const [pushingCalendar, setPushingCalendar] = useState<string | null>(null);

  useEffect(() => {
    if (hubspotParam === "connected") {
      toast({ title: "HubSpot connected successfully!", description: "Your HubSpot account has been linked to this company." });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: conn, isLoading: connLoading } = useQuery<any>({
    queryKey: ["/api/hubspot/connection", companyId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/hubspot/connection/${companyId}`, { credentials: "include" });
        if (!res.ok) return { connected: false };
        return res.json();
      } catch { return { connected: false }; }
    },
    staleTime: 30000,
  });

  const { data: contacts, isLoading: contactsLoading } = useQuery<any>({
    queryKey: ["/api/hubspot/crm", companyId, "contacts"],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/hubspot/crm/${companyId}/contacts`, { credentials: "include" });
        if (!res.ok) return { contacts: [] };
        return res.json();
      } catch { return { contacts: [] }; }
    },
    enabled: !!conn?.connected && activeTab === "crm",
    staleTime: 60000,
  });

  const { data: deals, isLoading: dealsLoading } = useQuery<any>({
    queryKey: ["/api/hubspot/crm", companyId, "deals"],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/hubspot/crm/${companyId}/deals`, { credentials: "include" });
        if (!res.ok) return { deals: [] };
        return res.json();
      } catch { return { deals: [] }; }
    },
    enabled: !!conn?.connected && activeTab === "crm",
    staleTime: 60000,
  });

  const { data: campaigns, isLoading: campaignsLoading } = useQuery<any>({
    queryKey: ["/api/hubspot/crm", companyId, "campaigns"],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/hubspot/crm/${companyId}/campaigns`, { credentials: "include" });
        if (!res.ok) return { campaigns: [] };
        return res.json();
      } catch { return { campaigns: [] }; }
    },
    enabled: !!conn?.connected && activeTab === "campaigns",
    staleTime: 60000,
  });

  const { data: workflows, isLoading: workflowsLoading } = useQuery<any>({
    queryKey: ["/api/hubspot/crm", companyId, "workflows"],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/hubspot/crm/${companyId}/workflows`, { credentials: "include" });
        if (!res.ok) return { workflows: [] };
        return res.json();
      } catch { return { workflows: [] }; }
    },
    enabled: !!conn?.connected && activeTab === "workflows",
    staleTime: 120000,
  });

  const { data: syncLogs, isLoading: logsLoading } = useQuery<any[]>({
    queryKey: ["/api/hubspot/crm", companyId, "sync-log"],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/hubspot/crm/${companyId}/sync-log?limit=50`, { credentials: "include" });
        if (!res.ok) return [];
        return res.json();
      } catch { return []; }
    },
    enabled: !!conn?.connected && activeTab === "synclog",
    staleTime: 30000,
  });

  const syncMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/hubspot/sync-now/${companyId}`),
    onSuccess: () => {
      toast({ title: "HubSpot sync complete" });
      queryClient.invalidateQueries({ queryKey: ["/api/hubspot/connection", companyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/hubspot/crm", companyId] });
    },
    onError: (e: any) => toast({ title: "Sync failed", description: e.message, variant: "destructive" }),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/hubspot/disconnect/${companyId}`),
    onSuccess: () => {
      toast({ title: "HubSpot disconnected" });
      queryClient.invalidateQueries({ queryKey: ["/api/hubspot/connection", companyId] });
    },
    onError: (e: any) => toast({ title: "Disconnect failed", description: e.message, variant: "destructive" }),
  });

  const pushToCalendar = async (campaign: any) => {
    setPushingCalendar(campaign.id);
    try {
      await apiRequest("POST", "/api/content-calendar", {
        companyId,
        title: campaign.name,
        platform: "email",
        contentType: "newsletter",
        status: "draft",
        hubspotCampaignId: campaign.id,
        bodyContent: `Imported from HubSpot campaign: ${campaign.name}`,
      });
      toast({ title: "Added to Content Calendar", description: campaign.name });
      queryClient.invalidateQueries({ queryKey: ["/api/content-calendar"] });
    } catch (e: any) {
      toast({ title: "Failed to push to calendar", description: e.message, variant: "destructive" });
    } finally {
      setPushingCalendar(null);
    }
  };

  if (connLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!conn?.connected) {
    return (
      <div className="space-y-3">
        {hubspotParam === "error" && !errorDismissed && (
          <Alert variant="destructive" data-testid="alert-hubspot-error">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">HubSpot connection failed</p>
                  {hubspotMsg && (
                    <p className="text-xs opacity-90 font-mono">{decodeURIComponent(hubspotMsg)}</p>
                  )}
                  <p className="text-xs opacity-80">
                    If you see "Unable to load app information", verify the HubSpot Developer App redirect URL
                    matches exactly:{" "}
                    <span className="font-mono font-medium">
                      https://portal.nearmemarketinghub.com/api/hubspot/callback
                    </span>
                    {" "}(no trailing slash, HTTPS, exact path).
                  </p>
                </div>
                <button
                  onClick={() => setErrorDismissed(true)}
                  className="shrink-0 opacity-70 hover:opacity-100"
                  data-testid="button-dismiss-hubspot-error"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => { window.location.href = `/api/hubspot/connect/${companyId}`; }}
                data-testid="button-hubspot-retry"
              >
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="rounded-full bg-muted p-4">
              <Link2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-semibold text-lg">Connect HubSpot</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Link this client's HubSpot account to sync contacts, deals, tasks, and campaign data.
              </p>
            </div>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => { window.location.href = `/api/hubspot/connect/${companyId}`; }}
              data-testid="button-hubspot-connect"
            >
              <Link2 className="h-4 w-4 mr-2" />
              Connect HubSpot
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const contactList: any[] = contacts?.contacts ?? [];
  const dealList: any[] = deals?.deals ?? [];
  const campaignList: any[] = campaigns?.campaigns ?? [];
  const workflowList: any[] = workflows?.workflows ?? [];
  const logList: any[] = syncLogs ?? [];

  const totalDealValue = dealList.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const openDeals = dealList.filter(d => !d.stage?.toLowerCase().includes("closed")).length;

  return (
    <div className="space-y-4">
      {/* Connection status card */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-green-500/10 p-2 mt-0.5">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">HubSpot Connected</span>
                  <Badge variant="outline" className="text-green-600 border-green-600 text-xs">Active</Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {conn.portalId && <div><span className="font-medium">Portal ID:</span> {conn.portalId}</div>}
                  {conn.hubDomain && <div><span className="font-medium">Hub:</span> {conn.hubDomain}</div>}
                  {conn.connectedBy && <div><span className="font-medium">Connected by:</span> {conn.connectedBy}</div>}
                  {conn.connectedAt && <div><span className="font-medium">Connected:</span> {new Date(conn.connectedAt).toLocaleDateString()}</div>}
                  {conn.lastSyncedAt && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last synced: {new Date(conn.lastSyncedAt).toLocaleString()}
                    </div>
                  )}
                  {conn.scopesGranted && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs font-medium hover:text-foreground">Scopes granted ({conn.scopesGranted.split(" ").length})</summary>
                      <div className="mt-1 flex flex-wrap gap-1 max-w-md">
                        {conn.scopesGranted.split(" ").map((s: string) => (
                          <Badge key={s} variant="secondary" className="text-xs font-mono">{s}</Badge>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                data-testid="button-hubspot-sync"
              >
                {syncMutation.isPending
                  ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                Sync Now
              </Button>
              {conn.portalId && (
                <Button size="sm" variant="outline" asChild>
                  <a
                    href={`https://app.hubspot.com/contacts/${conn.portalId}`}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="link-hubspot-open"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Open HubSpot
                  </a>
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                data-testid="button-hubspot-disconnect"
              >
                <Link2Off className="h-3.5 w-3.5 mr-1" />
                Disconnect
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto flex-wrap gap-1">
          <TabsTrigger value="crm" data-testid="tab-hubspot-crm">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            CRM Overview
          </TabsTrigger>
          <TabsTrigger value="campaigns" data-testid="tab-hubspot-campaigns">
            <Mail className="h-3.5 w-3.5 mr-1.5" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="workflows" data-testid="tab-hubspot-workflows">
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="synclog" data-testid="tab-hubspot-synclog">
            <ScrollText className="h-3.5 w-3.5 mr-1.5" />
            Sync Log
          </TabsTrigger>
        </TabsList>

        {/* CRM Overview */}
        <TabsContent value="crm" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-2xl font-bold">{contactsLoading ? "—" : contactList.length}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Contacts</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-2xl font-bold">{dealsLoading ? "—" : openDeals}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Open Deals</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-2xl font-bold">
                  {dealsLoading ? "—" : totalDealValue > 0 ? `$${totalDealValue.toLocaleString()}` : "$0"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Pipeline Value</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Recent Contacts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {contactsLoading ? (
                <div className="p-4 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : contactList.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No contacts found</div>
              ) : (
                <div className="divide-y">
                  {contactList.slice(0, 5).map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between px-4 py-2.5" data-testid={`contact-${c.id}`}>
                      <div>
                        <div className="text-sm font-medium">
                          {[c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">{c.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.leadStatus && <Badge variant="secondary" className="text-xs">{c.leadStatus}</Badge>}
                        {conn.portalId && (
                          <a
                            href={`https://app.hubspot.com/contacts/${conn.portalId}/contact/${c.id}`}
                            target="_blank" rel="noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                            data-testid={`link-contact-${c.id}`}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Recent Deals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {dealsLoading ? (
                <div className="p-4 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : dealList.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No deals found</div>
              ) : (
                <div className="divide-y">
                  {dealList.slice(0, 5).map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between px-4 py-2.5" data-testid={`deal-${d.id}`}>
                      <div>
                        <div className="text-sm font-medium">{d.name || "Unnamed deal"}</div>
                        <div className="text-xs text-muted-foreground">
                          {d.stage && <span className="mr-2">{d.stage}</span>}
                          {d.closeDate && <span>Closes: {new Date(d.closeDate).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {d.amount && (
                          <span className="text-sm font-medium">${parseFloat(d.amount).toLocaleString()}</span>
                        )}
                        {conn.portalId && (
                          <a
                            href={`https://app.hubspot.com/contacts/${conn.portalId}/deal/${d.id}`}
                            target="_blank" rel="noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                            data-testid={`link-deal-${d.id}`}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaigns */}
        <TabsContent value="campaigns" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart2 className="h-4 w-4" />
                Email Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {campaignsLoading ? (
                <div className="p-4 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : !campaigns?.success ? (
                <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
                  <AlertTriangle className="h-5 w-5" />
                  <span>{campaigns?.error || "Could not load campaigns"}</span>
                  <span className="text-xs">The "content" scope is required for campaign access.</span>
                </div>
              ) : campaignList.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No campaigns found</div>
              ) : (
                <div className="divide-y">
                  {campaignList.map((c: any) => (
                    <div key={c.id} className="px-4 py-3" data-testid={`campaign-${c.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium truncate">{c.name}</span>
                            <Badge variant="outline" className="text-xs shrink-0">{c.status}</Badge>
                          </div>
                          {c.stats && (
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {c.stats.sent != null && <span>Sent: {c.stats.sent.toLocaleString()}</span>}
                              {c.stats.openRate != null && <span>Open: {(c.stats.openRate * 100).toFixed(1)}%</span>}
                              {c.stats.clickRate != null && <span>Click: {(c.stats.clickRate * 100).toFixed(1)}%</span>}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs shrink-0"
                          onClick={() => pushToCalendar(c)}
                          disabled={pushingCalendar === c.id}
                          data-testid={`button-push-calendar-${c.id}`}
                        >
                          {pushingCalendar === c.id
                            ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            : <CalendarPlus className="h-3 w-3 mr-1" />}
                          Push to Calendar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflows Active */}
        <TabsContent value="workflows" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Active Workflows
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {workflowsLoading ? (
                <div className="p-4 space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : !workflows?.success ? (
                <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
                  <AlertTriangle className="h-5 w-5" />
                  <span>{workflows?.error || "Could not load workflows"}</span>
                  <span className="text-xs">The "automation" scope is required.</span>
                </div>
              ) : workflowList.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No workflows found</div>
              ) : (
                <div className="divide-y">
                  {workflowList.map((w: any) => (
                    <div key={w.id} className="flex items-center justify-between px-4 py-3" data-testid={`workflow-${w.id}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`rounded-full p-1.5 ${w.enabled ? "bg-green-500/10" : "bg-muted"}`}>
                          {w.enabled
                            ? <Play className="h-3 w-3 text-green-600" />
                            : <Pause className="h-3 w-3 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{w.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {w.type && <span className="mr-2">{w.type}</span>}
                            {w.enrolledCount > 0 && <span>{w.enrolledCount} enrolled</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge variant={w.enabled ? "default" : "secondary"} className="text-xs">
                          {w.enabled ? "Active" : "Paused"}
                        </Badge>
                        {conn.portalId && (
                          <a
                            href={`https://app.hubspot.com/workflows/${conn.portalId}/platform/flow/${w.id}/edit`}
                            target="_blank" rel="noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                            data-testid={`link-workflow-${w.id}`}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Log */}
        <TabsContent value="synclog" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ScrollText className="h-4 w-4" />
                  Sync Activity Log
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/hubspot/crm", companyId, "sync-log"] })}
                  data-testid="button-refresh-synclog"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {logsLoading ? (
                <div className="p-4 space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : logList.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
                  <FileText className="h-6 w-6" />
                  <span>No sync activity yet</span>
                  <span className="text-xs">Activity will appear here after syncing</span>
                </div>
              ) : (
                <div className="divide-y max-h-96 overflow-y-auto">
                  {logList.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 px-4 py-2.5" data-testid={`synclog-${log.id}`}>
                      <div className="mt-0.5 shrink-0">
                        {log.status === "success"
                          ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                          : <AlertTriangle className="h-4 w-4 text-destructive" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {log.details && (
                          <p className={`text-xs mt-0.5 ${log.status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                            {log.details}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
