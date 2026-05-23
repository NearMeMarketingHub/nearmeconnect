import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Link2, Link2Off, RefreshCw, ExternalLink, Users, DollarSign,
  Mail, BarChart2, Loader2, AlertTriangle, CheckCircle2, Clock,
} from "lucide-react";

interface HubspotPanelProps {
  companyId: string;
}

export function HubspotPanel({ companyId }: HubspotPanelProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("crm");

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
    enabled: !!conn?.connected,
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
    enabled: !!conn?.connected,
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
    );
  }

  const contactList: any[] = contacts?.contacts ?? [];
  const dealList: any[] = deals?.deals ?? [];
  const campaignList: any[] = campaigns?.campaigns ?? [];

  const totalDealValue = dealList.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const openDeals = dealList.filter(d => !d.stage?.toLowerCase().includes("closed")).length;

  return (
    <div className="space-y-4">
      {/* Connection status card */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-500/10 p-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">HubSpot Connected</span>
                  <Badge variant="outline" className="text-green-600 border-green-600 text-xs">Active</Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5 mt-0.5">
                  {conn.portalId && <span className="mr-3">Portal: {conn.portalId}</span>}
                  {conn.hubDomain && <span className="mr-3">Hub: {conn.hubDomain}</span>}
                  {conn.lastSyncedAt && (
                    <span className="flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      Last synced: {new Date(conn.lastSyncedAt).toLocaleString()}
                    </span>
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
        </TabsList>

        {/* CRM Overview */}
        <TabsContent value="crm" className="space-y-4 mt-4">
          {/* Summary metrics */}
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
                  {dealsLoading ? "—" : totalDealValue > 0
                    ? `$${totalDealValue.toLocaleString()}`
                    : "$0"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Pipeline Value</div>
              </CardContent>
            </Card>
          </div>

          {/* Recent contacts */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Recent Contacts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {contactsLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : contactList.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No contacts found</div>
              ) : (
                <div className="divide-y">
                  {contactList.slice(0, 5).map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <div className="text-sm font-medium">
                          {[c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">{c.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.leadStatus && (
                          <Badge variant="secondary" className="text-xs">{c.leadStatus}</Badge>
                        )}
                        {conn.portalId && (
                          <a
                            href={`https://app.hubspot.com/contacts/${conn.portalId}/contact/${c.id}`}
                            target="_blank"
                            rel="noreferrer"
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

          {/* Recent deals */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Recent Deals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {dealsLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : dealList.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No deals found</div>
              ) : (
                <div className="divide-y">
                  {dealList.slice(0, 5).map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <div className="text-sm font-medium">{d.name || "Unnamed deal"}</div>
                        <div className="text-xs text-muted-foreground">
                          {d.stage && <span className="mr-2">{d.stage}</span>}
                          {d.closeDate && <span>Closes: {new Date(d.closeDate).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {d.amount && (
                          <span className="text-sm font-medium">
                            ${parseFloat(d.amount).toLocaleString()}
                          </span>
                        )}
                        {conn.portalId && (
                          <a
                            href={`https://app.hubspot.com/contacts/${conn.portalId}/deal/${d.id}`}
                            target="_blank"
                            rel="noreferrer"
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
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
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
                    <div key={c.id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate max-w-xs">{c.name}</span>
                        <Badge variant="outline" className="text-xs ml-2 shrink-0">{c.status}</Badge>
                      </div>
                      {c.stats && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {c.stats.sent != null && <span>Sent: {c.stats.sent.toLocaleString()}</span>}
                          {c.stats.openRate != null && (
                            <span>Open: {(c.stats.openRate * 100).toFixed(1)}%</span>
                          )}
                          {c.stats.clickRate != null && (
                            <span>Click: {(c.stats.clickRate * 100).toFixed(1)}%</span>
                          )}
                        </div>
                      )}
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
