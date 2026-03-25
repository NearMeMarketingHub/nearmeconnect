import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RefreshCw, FlaskConical, LayoutDashboard, ListTodo, CreditCard, MessageCircle, Megaphone, Video, GraduationCap, ClipboardCheck, AlertTriangle, SkipForward, Landmark, Building2, FileText, Clock, CheckCircle, PenLine, Trash2, ExternalLink } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SignaturePad from "@/components/signature-pad";
import type { GovernmentDocument } from "@shared/schema";

import ClientDashboard from "@/pages/client/dashboard";
import ClientTasks from "@/pages/client/tasks";
import ClientCredits from "@/pages/client/credits";
import ClientChat from "@/pages/client/chat";
import ClientCampaigns from "@/pages/client/campaigns";
import ClientMeetings from "@/pages/client/meetings";
import ClientTraining from "@/pages/client/training";
import ClientOnboarding from "@/pages/client/onboarding";

const SANDBOX_COMPANY_ID = "sandbox-company-001";

interface Company {
  id: string;
  name: string;
  onboardingComplete: boolean;
  credits: number;
  subscriptionTier: string;
  clientType: "marketing" | "government";
}

interface SandboxStatus {
  exists: boolean;
  company?: Company;
  userCount: number;
  taskCount: number;
  chatThreadCount: number;
}

export default function AdminSandbox() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("onboarding");

  const { data: sandboxStatus, isLoading } = useQuery<SandboxStatus>({
    queryKey: ["/api/sandbox/status"],
  });

  // Sync activeTab with clientType from query data
  useEffect(() => {
    if (sandboxStatus?.company?.clientType === "government") {
      setActiveTab("government");
    } else if (sandboxStatus?.company?.clientType === "marketing" && activeTab === "government") {
      // If switching back to marketing and on government tab, stay there (it's still visible)
    }
  }, [sandboxStatus?.company?.clientType]);

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sandbox/reset");
      if (!res.ok) throw new Error("Failed to reset sandbox");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sandbox/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies", SANDBOX_COMPANY_ID] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/threads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Sandbox Reset",
        description: "The sandbox has been reset to its initial state with onboarding incomplete.",
      });
      setActiveTab("onboarding");
    },
    onError: () => {
      toast({
        title: "Reset Failed",
        description: "Failed to reset the sandbox. Please try again.",
        variant: "destructive",
      });
    },
  });

  const initMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sandbox/init");
      if (!res.ok) throw new Error("Failed to initialize sandbox");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sandbox/status"] });
      toast({
        title: "Sandbox Initialized",
        description: "The sandbox company has been created.",
      });
    },
    onError: () => {
      toast({
        title: "Initialization Failed",
        description: "Failed to initialize the sandbox. Please try again.",
        variant: "destructive",
      });
    },
  });

  const clientTypeMutation = useMutation({
    mutationFn: async (clientType: "marketing" | "government") => {
      const res = await apiRequest("POST", "/api/sandbox/client-type", { clientType });
      if (!res.ok) throw new Error("Failed to update client type");
      return res.json();
    },
    onSuccess: (_, clientType) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sandbox/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies", SANDBOX_COMPANY_ID] });
      toast({
        title: "Client Type Updated",
        description: `Sandbox is now set to ${clientType === "government" ? "Government" : "Marketing"} client.`,
      });
      // If switching to government, switch to government tab
      if (clientType === "government") {
        setActiveTab("government");
      } else if (activeTab === "government") {
        setActiveTab("dashboard");
      }
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update client type. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!sandboxStatus?.exists) {
    return (
      <AdminLayout>
        <div className="p-6 max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5" />
                Development Sandbox
              </CardTitle>
              <CardDescription>
                The sandbox environment has not been initialized yet. Click the button below to create a sandbox company for testing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => initMutation.mutate()} 
                disabled={initMutation.isPending}
                data-testid="button-init-sandbox"
              >
                {initMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <FlaskConical className="w-4 h-4 mr-2" />
                    Initialize Sandbox
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b bg-amber-50 dark:bg-amber-950/30">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <FlaskConical className="w-5 h-5 text-amber-600" />
              <div>
                <h1 className="font-semibold text-lg">Client Portal Sandbox</h1>
                <p className="text-sm text-muted-foreground">
                  Test the client experience without creating new accounts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">{sandboxStatus.company?.subscriptionTier}</Badge>
                <Badge variant="secondary">{sandboxStatus.company?.credits} credits</Badge>
                {sandboxStatus.company?.onboardingComplete ? (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    Onboarding Complete
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                    Onboarding Pending
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-background">
                <Building2 className={`w-4 h-4 ${sandboxStatus.company?.clientType === "marketing" ? "text-blue-600" : "text-muted-foreground"}`} />
                <Label htmlFor="client-type-switch" className="text-xs font-medium cursor-pointer">Marketing</Label>
                <Switch
                  id="client-type-switch"
                  checked={sandboxStatus.company?.clientType === "government"}
                  onCheckedChange={(checked) => {
                    clientTypeMutation.mutate(checked ? "government" : "marketing");
                  }}
                  disabled={clientTypeMutation.isPending}
                  data-testid="switch-client-type"
                />
                <Label htmlFor="client-type-switch" className="text-xs font-medium cursor-pointer">Government</Label>
                <Landmark className={`w-4 h-4 ${sandboxStatus.company?.clientType === "government" ? "text-green-600" : "text-muted-foreground"}`} />
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-reset-sandbox">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset Sandbox
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      Reset Sandbox Environment
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete all sandbox data and reset the company to its initial state:
                      <ul className="list-disc ml-6 mt-2 space-y-1">
                        <li>All tasks will be deleted</li>
                        <li>All chat messages will be cleared</li>
                        <li>Credits will be reset to default</li>
                        <li>Onboarding will be marked as incomplete</li>
                        <li>Sample data will be recreated</li>
                      </ul>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => resetMutation.mutate()}
                      disabled={resetMutation.isPending}
                      data-testid="button-confirm-reset"
                    >
                      {resetMutation.isPending ? "Resetting..." : "Reset Sandbox"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="border-b px-4">
            <TabsList className="h-12">
              {sandboxStatus.company?.clientType === "government" ? (
                // Government clients only see Government tab
                <TabsTrigger value="government" className="gap-2" data-testid="tab-government">
                  <Landmark className="w-4 h-4" />
                  Government
                </TabsTrigger>
              ) : (
                // Marketing clients see all tabs
                <>
                  <TabsTrigger value="onboarding" className="gap-2" data-testid="tab-onboarding">
                    <ClipboardCheck className="w-4 h-4" />
                    Onboarding
                  </TabsTrigger>
                  <TabsTrigger value="dashboard" className="gap-2" data-testid="tab-dashboard">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="gap-2" data-testid="tab-tasks">
                    <ListTodo className="w-4 h-4" />
                    Tasks
                  </TabsTrigger>
                  <TabsTrigger value="credits" className="gap-2" data-testid="tab-credits">
                    <CreditCard className="w-4 h-4" />
                    Credits
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="gap-2" data-testid="tab-chat">
                    <MessageCircle className="w-4 h-4" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="campaigns" className="gap-2" data-testid="tab-campaigns">
                    <Megaphone className="w-4 h-4" />
                    Campaigns
                  </TabsTrigger>
                  <TabsTrigger value="meetings" className="gap-2" data-testid="tab-meetings">
                    <Video className="w-4 h-4" />
                    Meetings
                  </TabsTrigger>
                  <TabsTrigger value="training" className="gap-2" data-testid="tab-training">
                    <GraduationCap className="w-4 h-4" />
                    Training
                  </TabsTrigger>
                  <TabsTrigger value="government" className="gap-2" data-testid="tab-government">
                    <Landmark className="w-4 h-4" />
                    Government
                  </TabsTrigger>
                </>
              )}
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto">
            {sandboxStatus.company?.clientType !== "government" && (
              <>
                <TabsContent value="onboarding" className="m-0 h-full">
                  <SandboxOnboarding companyId={SANDBOX_COMPANY_ID} />
                </TabsContent>
                <TabsContent value="dashboard" className="m-0 h-full">
                  <div className="p-6">
                    <ClientDashboard companyId={SANDBOX_COMPANY_ID} embedded />
                  </div>
                </TabsContent>
                <TabsContent value="tasks" className="m-0 h-full">
                  <div className="p-6">
                    <ClientTasks companyId={SANDBOX_COMPANY_ID} embedded />
                  </div>
                </TabsContent>
                <TabsContent value="credits" className="m-0 h-full">
                  <div className="p-6">
                    <ClientCredits companyId={SANDBOX_COMPANY_ID} embedded sandboxMode />
                  </div>
                </TabsContent>
                <TabsContent value="chat" className="m-0 h-full">
                  <SandboxChat companyId={SANDBOX_COMPANY_ID} />
                </TabsContent>
                <TabsContent value="campaigns" className="m-0 h-full">
                  <div className="p-6">
                    <ClientCampaigns companyId={SANDBOX_COMPANY_ID} embedded />
                  </div>
                </TabsContent>
                <TabsContent value="meetings" className="m-0 h-full">
                  <div className="p-6">
                    <ClientMeetings companyId={SANDBOX_COMPANY_ID} embedded />
                  </div>
                </TabsContent>
                <TabsContent value="training" className="m-0 h-full">
                  <div className="p-6">
                    <ClientTraining companyId={SANDBOX_COMPANY_ID} embedded />
                  </div>
                </TabsContent>
              </>
            )}
            <TabsContent value="government" className="m-0 h-full">
              <div className="p-6">
                <SandboxGovernment companyId={SANDBOX_COMPANY_ID} />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function SandboxOnboarding({ companyId }: { companyId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: company } = useQuery<Company>({
    queryKey: ["/api/companies", companyId],
  });

  const skipOnboardingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sandbox/skip-onboarding");
      if (!res.ok) throw new Error("Failed to skip onboarding");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/sandbox/status"] });
      toast({
        title: "Onboarding Skipped",
        description: "You can now test other features of the client portal.",
      });
    },
    onError: () => {
      toast({
        title: "Skip Failed",
        description: "Failed to skip onboarding. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (company?.onboardingComplete) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Onboarding Complete</h2>
            <p className="text-muted-foreground mb-4">
              The sandbox company has completed onboarding. Use the "Reset Sandbox" button to start fresh and test onboarding again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-end mb-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => skipOnboardingMutation.mutate()}
          disabled={skipOnboardingMutation.isPending}
          data-testid="button-skip-onboarding"
        >
          {skipOnboardingMutation.isPending ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Skipping...
            </>
          ) : (
            <>
              <SkipForward className="w-4 h-4 mr-2" />
              Skip Onboarding
            </>
          )}
        </Button>
      </div>
      <ClientOnboarding companyId={companyId} embedded />
    </div>
  );
}

function SandboxChat({ companyId }: { companyId: string }) {
  return (
    <div className="h-full">
      <ClientChat companyId={companyId} embedded={true} />
    </div>
  );
}

function SandboxGovernment({ companyId }: { companyId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [documentTab, setDocumentTab] = useState<"pending" | "signed">("pending");
  const [selectedDocument, setSelectedDocument] = useState<GovernmentDocument | null>(null);
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocDescription, setNewDocDescription] = useState("");
  const [newDocType, setNewDocType] = useState("contract");

  const { data: documents = [], isLoading } = useQuery<GovernmentDocument[]>({
    queryKey: ["/api/companies", companyId, "government-documents"],
  });

  const pendingDocs = documents.filter(d => d.status === "pending");
  const signedDocs = documents.filter(d => d.status === "signed");

  const createDocMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; documentType: string }) => {
      const res = await apiRequest("POST", `/api/companies/${companyId}/government-documents`, data);
      if (!res.ok) throw new Error("Failed to create document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "government-documents"] });
      toast({ title: "Document Created", description: "The document has been created successfully." });
      setIsCreateDialogOpen(false);
      setNewDocTitle("");
      setNewDocDescription("");
      setNewDocType("contract");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create document.", variant: "destructive" });
    },
  });

  const signDocMutation = useMutation({
    mutationFn: async ({ id, signatureData, signatureType }: { id: string; signatureData: string; signatureType: string }) => {
      const res = await apiRequest("POST", `/api/government-documents/${id}/sign`, { signatureData, signatureType });
      if (!res.ok) throw new Error("Failed to sign document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "government-documents"] });
      toast({ title: "Document Signed", description: "The document has been signed and uploaded to SharePoint." });
      setIsSignDialogOpen(false);
      setSelectedDocument(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to sign document.", variant: "destructive" });
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/government-documents/${id}`);
      if (!res.ok) throw new Error("Failed to delete document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "government-documents"] });
      toast({ title: "Document Deleted", description: "The document has been deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete document.", variant: "destructive" });
    },
  });

  const handleSignDocument = (signatureData: string, signatureType: "drawn" | "typed") => {
    if (selectedDocument) {
      signDocMutation.mutate({ id: selectedDocument.id, signatureData, signatureType });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="heading-government-services">Government Documents</h1>
          <p className="text-muted-foreground">
            Manage and sign government documents with e-signatures.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-document">
          <FileText className="w-4 h-4 mr-2" />
          New Document
        </Button>
      </div>

      <Tabs value={documentTab} onValueChange={(v) => setDocumentTab(v as "pending" | "signed")}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2" data-testid="tab-pending-docs">
            <Clock className="w-4 h-4" />
            Pending ({pendingDocs.length})
          </TabsTrigger>
          <TabsTrigger value="signed" className="gap-2" data-testid="tab-signed-docs">
            <CheckCircle className="w-4 h-4" />
            Signed ({signedDocs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader><div className="h-6 bg-muted rounded w-3/4" /></CardHeader>
                  <CardContent><div className="h-4 bg-muted rounded w-full" /></CardContent>
                </Card>
              ))}
            </div>
          ) : pendingDocs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="font-medium">No pending documents</p>
                <p className="text-sm text-muted-foreground">Create a new document to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingDocs.map(doc => (
                <Card key={doc.id} className="hover-elevate" data-testid={`card-document-${doc.id}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="w-5 h-5" />
                      {doc.title}
                    </CardTitle>
                    <CardDescription>{doc.description || "No description"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Badge variant="secondary">{doc.documentType}</Badge>
                      <span>Created {new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => { setSelectedDocument(doc); setIsSignDialogOpen(true); }}
                        data-testid={`button-sign-${doc.id}`}
                      >
                        <PenLine className="w-4 h-4 mr-1" />
                        Sign
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" data-testid={`button-delete-${doc.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. The document will be permanently deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteDocMutation.mutate(doc.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="signed" className="mt-4">
          {signedDocs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="font-medium">No signed documents</p>
                <p className="text-sm text-muted-foreground">Signed documents will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {signedDocs.map(doc => (
                <Card key={doc.id} data-testid={`card-signed-document-${doc.id}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      {doc.title}
                    </CardTitle>
                    <CardDescription>{doc.description || "No description"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-600">Signed</Badge>
                        <span className="text-muted-foreground">by {doc.signedByName}</span>
                      </div>
                      {doc.signedAt && (
                        <p className="text-muted-foreground">Signed on {new Date(doc.signedAt).toLocaleDateString()}</p>
                      )}
                      {doc.sharepointUrl && (
                        <a 
                          href={doc.sharepointUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                          data-testid={`link-sharepoint-${doc.id}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                          View in SharePoint
                        </a>
                      )}
                      {doc.expiresAt && (
                        <p className="text-muted-foreground text-xs">
                          Local copy expires: {new Date(doc.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Document Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Document</DialogTitle>
            <DialogDescription>Create a new document for e-signature.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="doc-title">Title</Label>
              <Input 
                id="doc-title" 
                value={newDocTitle} 
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder="Document title"
                data-testid="input-doc-title"
              />
            </div>
            <div>
              <Label htmlFor="doc-description">Description</Label>
              <Textarea 
                id="doc-description" 
                value={newDocDescription} 
                onChange={(e) => setNewDocDescription(e.target.value)}
                placeholder="Optional description"
                data-testid="input-doc-description"
              />
            </div>
            <div>
              <Label htmlFor="doc-type">Document Type</Label>
              <Select value={newDocType} onValueChange={setNewDocType}>
                <SelectTrigger data-testid="select-doc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="agreement">Agreement</SelectItem>
                  <SelectItem value="form">Form</SelectItem>
                  <SelectItem value="permit">Permit</SelectItem>
                  <SelectItem value="license">License</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => createDocMutation.mutate({ title: newDocTitle, description: newDocDescription, documentType: newDocType })}
              disabled={!newDocTitle || createDocMutation.isPending}
              data-testid="button-submit-create-doc"
            >
              {createDocMutation.isPending ? "Creating..." : "Create Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign Document Dialog */}
      <Dialog open={isSignDialogOpen} onOpenChange={(open) => { setIsSignDialogOpen(open); if (!open) setSelectedDocument(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sign Document</DialogTitle>
            <DialogDescription>
              {selectedDocument?.title} - Please sign below using the signature pad.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <SignaturePad onSignatureComplete={handleSignDocument} disabled={signDocMutation.isPending} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
