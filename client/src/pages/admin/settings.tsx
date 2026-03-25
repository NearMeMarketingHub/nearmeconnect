import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileTabMenu } from "@/components/mobile-tab-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Trash2, Tag, Settings as SettingsIcon, RefreshCw, Loader2, Coins, Cloud, CloudOff, HardDrive, Upload, Building2, Link2, Users, Search, ArrowRight } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Link } from "wouter";
import type { Company } from "@shared/schema";

interface UserTag {
  id: string;
  name: string;
  color: string;
  isPreset: boolean;
  createdAt: string;
}

const TAG_COLORS = [
  { name: "Blue", value: "blue" },
  { name: "Green", value: "green" },
  { name: "Red", value: "red" },
  { name: "Yellow", value: "yellow" },
  { name: "Purple", value: "purple" },
  { name: "Pink", value: "pink" },
  { name: "Orange", value: "orange" },
  { name: "Teal", value: "teal" },
];

const getTagColorClasses = (color: string) => {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    green: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    red: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    purple: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    pink: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
    orange: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    teal: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  };
  return colorMap[color] || colorMap.blue;
};

const getTagDotColor = (color: string) => {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    red: "bg-red-500",
    yellow: "bg-yellow-500",
    purple: "bg-purple-500",
    pink: "bg-pink-500",
    orange: "bg-orange-500",
    teal: "bg-teal-500",
  };
  return colorMap[color] || colorMap.blue;
};

export default function AdminSettings() {
  const { toast } = useToast();
  const [settingsTab, setSettingsTab] = useState("tags");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("blue");
  const [createTagDialogOpen, setCreateTagDialogOpen] = useState(false);

  const { data: presetTags = [], isLoading: tagsLoading } = useQuery<UserTag[]>({
    queryKey: ["/api/admin/user-tags"],
  });

  const createTagMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      const res = await apiRequest("POST", "/api/admin/user-tags", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user-tags"] });
      toast({ title: "Tag created successfully" });
      setNewTagName("");
      setNewTagColor("blue");
      setCreateTagDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create tag", description: error.message, variant: "destructive" });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      await apiRequest("DELETE", `/api/admin/user-tags/${tagId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user-tags"] });
      toast({ title: "Tag deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete tag", description: error.message, variant: "destructive" });
    },
  });

  const refreshAllCreditsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/recalculate-all-credits");
      return res.json();
    },
    onSuccess: (data: { companiesProcessed: number; totalDiscrepancies: number; companyResults: Array<{ companyName: string; discrepancies: Array<{ taskTitle: string; expectedCost: number; recordedAmount: number; difference: number }> }>; message: string }) => {
      if (data.totalDiscrepancies > 0) {
        const details = data.companyResults.map(cr =>
          `${cr.companyName}: ${cr.discrepancies.map(d => `"${d.taskTitle}" (expected ${d.expectedCost}, recorded ${d.recordedAmount})`).join(", ")}`
        ).join("\n");
        toast({ title: "Credit Audit Complete", description: `${data.message}\n\n${details}`, duration: 15000 });
      } else {
        toast({ title: "Credit Audit Complete", description: data.message });
      }
    },
    onError: () => {
      toast({ title: "Failed to run credit audit", variant: "destructive" });
    },
  });

  const { data: hubspotStatus, isLoading: hubspotStatusLoading } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/hubspot/status"],
  });

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const isHubSpotConnected = hubspotStatus?.connected;
  const linkedCompanies = companies?.filter(c => c.hubspotCompanyId) || [];
  const unlinkedCompanies = companies?.filter(c => !c.hubspotCompanyId) || [];

  const syncAllHubSpotMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/hubspot/sync-all");
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "HubSpot Sync Complete", description: `Synced ${data.companies?.length || 0} companies and ${data.contacts?.length || 0} contacts.` });
    },
    onError: () => {
      toast({ title: "Failed to sync with HubSpot", variant: "destructive" });
    },
  });

  const { data: pendingSyncData, isLoading: pendingSyncLoading } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/pending-sharepoint-sync"],
  });

  const syncToSharePointMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/sync-to-sharepoint");
      return res.json();
    },
    onSuccess: (data: { total: number; synced: number; failed: number; errors: string[] }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-sharepoint-sync"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media-files"] });
      const desc = data.failed > 0
        ? `Synced ${data.synced} of ${data.total} files. ${data.failed} failed.`
        : `Successfully synced ${data.synced} file${data.synced !== 1 ? "s" : ""} to SharePoint.`;
      toast({ title: "SharePoint Sync Complete", description: desc });
    },
    onError: () => {
      toast({ title: "Failed to sync to SharePoint", variant: "destructive" });
    },
  });

  const handleCreateTag = () => {
    if (!newTagName.trim()) {
      toast({ title: "Tag name is required", variant: "destructive" });
      return;
    }
    createTagMutation.mutate({ name: newTagName.trim(), color: newTagColor });
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <SettingsIcon className="h-6 w-6" />
              Settings
            </h1>
            <p className="text-muted-foreground">Manage agency-wide settings and configurations</p>
          </div>
        </div>

        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="w-full">
          <MobileTabMenu
            tabs={[
              { value: "tags", label: "User Tags" },
              { value: "maintenance", label: "Maintenance" },
              { value: "hubspot", label: "HubSpot" },
            ]}
            activeTab={settingsTab}
            onTabChange={setSettingsTab}
            title="Settings"
          />
          <TabsList className="hidden md:inline-flex">
            <TabsTrigger value="tags" data-testid="tab-tags">
              <Tag className="h-4 w-4 mr-2" />
              User Tags
            </TabsTrigger>
            <TabsTrigger value="maintenance" data-testid="tab-maintenance">
              <RefreshCw className="h-4 w-4 mr-2" />
              Maintenance
            </TabsTrigger>
            <TabsTrigger value="hubspot" data-testid="tab-hubspot">
              <Cloud className="h-4 w-4 mr-2" />
              HubSpot
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tags" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    User Tags
                  </CardTitle>
                  <CardDescription>
                    Create and manage tags to categorize users across all companies. 
                    Tags can be assigned to users from the Company Users tab.
                  </CardDescription>
                </div>
                <Dialog open={createTagDialogOpen} onOpenChange={setCreateTagDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-tag">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Tag
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Tag</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="tagName">Tag Name</Label>
                        <Input
                          id="tagName"
                          placeholder="e.g., VIP, Priority, New Client"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          data-testid="input-tag-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tagColor">Color</Label>
                        <Select value={newTagColor} onValueChange={setNewTagColor}>
                          <SelectTrigger data-testid="select-tag-color">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TAG_COLORS.map((color) => (
                              <SelectItem key={color.value} value={color.value}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${getTagDotColor(color.value)}`} />
                                  {color.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Preview</Label>
                        <div>
                          <Badge className={getTagColorClasses(newTagColor)}>
                            {newTagName || "Tag Preview"}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        onClick={handleCreateTag}
                        disabled={createTagMutation.isPending}
                        className="w-full"
                        data-testid="button-submit-tag"
                      >
                        {createTagMutation.isPending ? "Creating..." : "Create Tag"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {tagsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading tags...</div>
                ) : presetTags.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No tags created yet</p>
                    <p className="text-sm mt-1">Create your first tag to start categorizing users</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {presetTags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                        data-testid={`tag-item-${tag.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Badge className={getTagColorClasses(tag.color)}>
                            {tag.name}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Created {new Date(tag.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTagMutation.mutate(tag.id)}
                          disabled={deleteTagMutation.isPending}
                          data-testid={`button-delete-tag-${tag.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Credit Maintenance
                </CardTitle>
                <CardDescription>
                  Run an audit to check for discrepancies between task credit costs and recorded transactions. 
                  This is read-only — it reports issues without making any changes. Use the Add/Subtract credits tool on the company dashboard to fix any discrepancies found.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Credit Audit</p>
                    <p className="text-sm text-muted-foreground">
                      Checks all companies for credit discrepancies without modifying any data.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => refreshAllCreditsMutation.mutate()}
                    disabled={refreshAllCreditsMutation.isPending}
                    data-testid="button-refresh-all-credits"
                  >
                    {refreshAllCreditsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    {refreshAllCreditsMutation.isPending ? "Auditing..." : "Run Credit Audit"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  HubSpot Sync
                </CardTitle>
                <CardDescription>
                  Company and contact data is automatically synced to HubSpot when created or updated.
                  Use the button below to manually sync all data to HubSpot.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Sync All to HubSpot</p>
                    <p className="text-sm text-muted-foreground">
                      Pushes all company and contact data to HubSpot CRM.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => syncAllHubSpotMutation.mutate()}
                    disabled={syncAllHubSpotMutation.isPending || !hubspotStatus?.connected}
                    data-testid="button-sync-all-hubspot"
                  >
                    {syncAllHubSpotMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Cloud className="w-4 h-4 mr-2" />}
                    {syncAllHubSpotMutation.isPending ? "Syncing..." : !hubspotStatus?.connected ? "Not Connected" : "Sync All"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  SharePoint Sync
                </CardTitle>
                <CardDescription>
                  Media files stored locally in Object Storage can be synced to SharePoint when it becomes available.
                  {!pendingSyncLoading && pendingSyncData && pendingSyncData.count > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {pendingSyncData.count} file{pendingSyncData.count !== 1 ? "s" : ""} pending
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Sync Files to SharePoint</p>
                    <p className="text-sm text-muted-foreground">
                      {pendingSyncLoading
                        ? "Checking..."
                        : pendingSyncData && pendingSyncData.count > 0
                        ? `${pendingSyncData.count} file${pendingSyncData.count !== 1 ? "s" : ""} stored locally, ready to sync to SharePoint.`
                        : "All media files are synced to SharePoint."}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => syncToSharePointMutation.mutate()}
                    disabled={syncToSharePointMutation.isPending || !pendingSyncData || pendingSyncData.count === 0}
                    data-testid="button-sync-to-sharepoint"
                  >
                    {syncToSharePointMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    {syncToSharePointMutation.isPending ? "Syncing..." : "Sync to SharePoint"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hubspot" className="mt-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-semibold" data-testid="text-hubspot-title">HubSpot Integration</h2>
                <p className="text-sm text-muted-foreground">Connect your portal companies with HubSpot CRM</p>
              </div>
              {hubspotStatusLoading ? (
                <Badge variant="secondary">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Checking...
                </Badge>
              ) : isHubSpotConnected ? (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  <Cloud className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <CloudOff className="w-3 h-3 mr-1" />
                  Not Connected
                </Badge>
              )}
            </div>

            {!isHubSpotConnected && !hubspotStatusLoading && (
              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <CloudOff className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-700 dark:text-yellow-400">HubSpot Not Connected</p>
                      <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
                        To enable HubSpot integration, add your <code className="px-1 py-0.5 bg-yellow-100 dark:bg-yellow-900/50 rounded">HUBSPOT_ACCESS_TOKEN</code> in your Replit secrets. 
                        You can generate a Private App token from your HubSpot account settings.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isHubSpotConnected && (
              <>
                <div className="grid gap-6 md:grid-cols-3">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{companies?.length || 0}</p>
                          <p className="text-sm text-muted-foreground">Total Companies</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <Link2 className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{linkedCompanies.length}</p>
                          <p className="text-sm text-muted-foreground">Linked to HubSpot</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{unlinkedCompanies.length}</p>
                          <p className="text-sm text-muted-foreground">Not Linked</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Search className="w-5 h-5 text-orange-500" />
                          How It Works
                        </CardTitle>
                        <CardDescription>
                          HubSpot is the source of truth for client data
                        </CardDescription>
                      </div>
                      <Button asChild>
                        <Link href="/admin/companies/new">
                          <Plus className="w-4 h-4 mr-2" />
                          Add New Company
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 font-bold mb-3">
                          1
                        </div>
                        <h3 className="font-medium mb-1">Create in HubSpot</h3>
                        <p className="text-sm text-muted-foreground">
                          Add new client companies directly in HubSpot CRM with all their details and contacts.
                        </p>
                      </div>
                      
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 font-bold mb-3">
                          2
                        </div>
                        <h3 className="font-medium mb-1">Search & Link</h3>
                        <p className="text-sm text-muted-foreground">
                          When adding a company to the portal, search for it in HubSpot to auto-fill details and contacts.
                        </p>
                      </div>
                      
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 font-bold mb-3">
                          3
                        </div>
                        <h3 className="font-medium mb-1">Invite Contacts</h3>
                        <p className="text-sm text-muted-foreground">
                          HubSpot contacts are displayed for easy invitation to the portal with pre-filled information.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Link2 className="w-5 h-5" />
                      Linked Companies
                    </CardTitle>
                    <CardDescription>
                      Companies connected to HubSpot records
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {linkedCompanies.length > 0 ? (
                      <div className="space-y-2">
                        {linkedCompanies.map((company) => (
                          <div
                            key={company.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                            data-testid={`hubspot-company-row-${company.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-orange-600" />
                              </div>
                              <div>
                                <p className="font-medium">{company.name}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{company.subscriptionTier}</span>
                                  <span>•</span>
                                  <span>HubSpot ID: {company.hubspotCompanyId}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-green-600 border-green-300">
                                <Link2 className="w-3 h-3 mr-1" />
                                Linked
                              </Badge>
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/admin/companies/${company.id}`}>
                                  <ArrowRight className="w-4 h-4" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No linked companies yet</p>
                        <p className="text-sm">Link companies to HubSpot when creating them in the portal</p>
                        <Button className="mt-4" asChild>
                          <Link href="/admin/companies/new">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Company
                          </Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {unlinkedCompanies.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Unlinked Companies
                      </CardTitle>
                      <CardDescription>
                        Companies not connected to HubSpot
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {unlinkedCompanies.map((company) => (
                          <div
                            key={company.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                            data-testid={`unlinked-company-row-${company.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium">{company.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {company.subscriptionTier} • {company.credits}/{company.monthlyCredits} credits
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary">Not Linked</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
