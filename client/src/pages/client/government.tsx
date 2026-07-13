import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ClientLayout } from "@/components/client-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileTabMenu } from "@/components/mobile-tab-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Clock, CheckCircle, PenLine, ExternalLink, Landmark, ClipboardList, CheckSquare } from "lucide-react";
import SignaturePad from "@/components/signature-pad";
import type { GovernmentDocument, Company } from "@shared/schema";

interface UserInfo {
  userId: string;
  companyId: string;
  firstName: string;
  lastName: string;
  companyRole: string | null;
}

export default function ClientGovernment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [documentTab, setDocumentTab] = useState<"pending" | "signed">("pending");
  const [selectedDocument, setSelectedDocument] = useState<GovernmentDocument | null>(null);
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);

  const { data: userInfo } = useQuery<UserInfo>({
    queryKey: ["/api/auth/user"],
  });

  const companyId = userInfo?.companyId;

  const { data: company } = useQuery<Company>({
    queryKey: ["/api/companies", companyId],
    enabled: !!companyId,
  });

  const { data: documents = [], isLoading: isLoadingDocs } = useQuery<GovernmentDocument[]>({
    queryKey: ["/api/companies", companyId, "government-documents"],
    enabled: !!companyId,
  });

  const { data: checklists = [] } = useQuery<any[]>({
    queryKey: ["/api/companies", companyId, "checklists"],
    queryFn: async () => {
      if (!companyId) return [];
      const res = await fetch(`/api/companies/${companyId}/checklists`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!companyId,
  });

  const pendingDocs = documents.filter(d => d.status === "pending");
  const signedDocs = documents.filter(d => d.status === "signed");

  const toggleItemMutation = useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: string; completed: boolean }) => {
      const res = await apiRequest("PATCH", `/api/company-checklist-items/${itemId}`, { completed });
      if (!res.ok) throw new Error("Failed to update item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "checklists"] });
    },
    onError: () => {
      toast({ title: "Failed to update item", variant: "destructive" });
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
      toast({ title: "Document Signed", description: "The document has been signed successfully." });
      setIsSignDialogOpen(false);
      setSelectedDocument(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to sign document.", variant: "destructive" });
    },
  });

  const handleSignDocument = (signatureData: string, signatureType: "drawn" | "typed") => {
    if (selectedDocument) {
      signDocMutation.mutate({ id: selectedDocument.id, signatureData, signatureType });
    }
  };

  if (!companyId) {
    return (
      <ClientLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout companyId={companyId}>
      <div className="p-6 space-y-8" data-testid="client-government-page">
        {/* Documents section */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="heading-government">
              <Landmark className="w-6 h-6" />
              Government Documents
            </h1>
            <p className="text-muted-foreground">
              View and sign documents that require your signature.
            </p>
          </div>

          <Tabs value={documentTab} onValueChange={(v) => setDocumentTab(v as "pending" | "signed")}>
            <MobileTabMenu
              tabs={[
                { value: "pending", label: "Pending Signature", count: pendingDocs.length },
                { value: "signed", label: "Signed", count: signedDocs.length },
              ]}
              activeTab={documentTab}
              onTabChange={(v) => setDocumentTab(v as "pending" | "signed")}
              title="Documents"
            />
            <TabsList className="hidden md:inline-flex">
              <TabsTrigger value="pending" className="gap-2" data-testid="tab-pending-docs">
                <Clock className="w-4 h-4" />
                Pending Signature ({pendingDocs.length})
              </TabsTrigger>
              <TabsTrigger value="signed" className="gap-2" data-testid="tab-signed-docs">
                <CheckCircle className="w-4 h-4" />
                Signed ({signedDocs.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              {isLoadingDocs ? (
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
                    <p className="font-medium">No documents awaiting signature</p>
                    <p className="text-sm text-muted-foreground">
                      When documents are ready for your signature, they will appear here.
                    </p>
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
                        <Button
                          onClick={() => { setSelectedDocument(doc); setIsSignDialogOpen(true); }}
                          data-testid={`button-sign-${doc.id}`}
                        >
                          <PenLine className="w-4 h-4 mr-2" />
                          Sign Document
                        </Button>
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
                    <p className="font-medium">No signed documents yet</p>
                    <p className="text-sm text-muted-foreground">
                      Documents you sign will be archived here for your records.
                    </p>
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
                              View Document
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Project Checklists section */}
        <div className="space-y-4" data-testid="section-checklists">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Project Checklists
            </h2>
            <p className="text-muted-foreground text-sm">
              Track your project milestones and tasks.
            </p>
          </div>

          {checklists.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <CheckSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="font-medium text-sm">No checklists yet</p>
                <p className="text-sm text-muted-foreground">Your agency will add project checklists here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {checklists.map(checklist => {
                const done = checklist.items.filter((i: any) => i.completed).length;
                const total = checklist.items.length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <Card key={checklist.id} data-testid={`card-checklist-${checklist.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base">{checklist.name}</CardTitle>
                        <Badge variant={pct === 100 ? "default" : "secondary"} className={pct === 100 ? "bg-green-600" : ""}>
                          {done}/{total}
                        </Badge>
                      </div>
                      {total > 0 && (
                        <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                          <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {checklist.items.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No items in this checklist.</p>
                      ) : (
                        checklist.items.map((item: any) => (
                          <div key={item.id} className={`flex items-start gap-3 py-1.5 border-b last:border-0 ${item.completed ? "opacity-60" : ""}`} data-testid={`item-checklist-${item.id}`}>
                            <Checkbox
                              checked={!!item.completed}
                              onCheckedChange={(v) => toggleItemMutation.mutate({ itemId: item.id, completed: !!v })}
                              className="mt-0.5 shrink-0"
                              data-testid={`checkbox-item-${item.id}`}
                            />
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm ${item.completed ? "line-through text-muted-foreground" : ""}`}>{item.text}</span>
                              {item.completed && item.completedBy && (
                                <p className="text-xs text-muted-foreground mt-0.5">✓ {item.completedBy}</p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <Dialog open={isSignDialogOpen} onOpenChange={(open) => { setIsSignDialogOpen(open); if (!open) setSelectedDocument(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Sign Document</DialogTitle>
              <DialogDescription>
                {selectedDocument?.title} - Please sign below to complete this document.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <SignaturePad onSignatureComplete={handleSignDocument} disabled={signDocMutation.isPending} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ClientLayout>
  );
}
