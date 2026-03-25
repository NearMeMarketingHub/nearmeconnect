import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { parseLocalDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileUp, Send, Trash2, Eye, Clock, CheckCircle, Mail, XCircle, FileText, Plus, Users, CalendarDays } from "lucide-react";
import PdfFieldPlacer, { type SigningFieldPlacement } from "@/components/pdf-field-placer";
import type { SigningPacket, SigningParticipant, SigningField, CompanyMember } from "@shared/schema";

interface SigningPacketWithDetails extends SigningPacket {
  participants?: SigningParticipant[];
  fields?: SigningField[];
}

interface CompanyMemberWithUser extends CompanyMember {
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface AdminSigningPacketsProps {
  companyId: string;
  companyName: string;
}

const statusColors = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/10 text-blue-600",
  completed: "bg-green-500/10 text-green-600",
  cancelled: "bg-red-500/10 text-red-600",
  expired: "bg-orange-500/10 text-orange-600",
};

const statusIcons = {
  draft: Clock,
  sent: Mail,
  completed: CheckCircle,
  cancelled: XCircle,
  expired: Clock,
};

export default function AdminSigningPackets({ companyId, companyName }: AdminSigningPacketsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isFieldPlacerOpen, setIsFieldPlacerOpen] = useState(false);
  const [selectedPacket, setSelectedPacket] = useState<SigningPacketWithDetails | null>(null);

  const [newPacketName, setNewPacketName] = useState("");
  const [newPacketDescription, setNewPacketDescription] = useState("");
  const [newPacketDueDate, setNewPacketDueDate] = useState("");
  const [uploadedPdfUrl, setUploadedPdfUrl] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Array<{ name: string; email: string; role: string }>>([]);
  const [participantName, setParticipantName] = useState("");
  const [participantEmail, setParticipantEmail] = useState("");
  const [placedFields, setPlacedFields] = useState<SigningFieldPlacement[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { data: packets = [], isLoading } = useQuery<SigningPacketWithDetails[]>({
    queryKey: ["/api/companies", companyId, "signing-packets"],
  });

  const { data: companyMembers = [] } = useQuery<CompanyMemberWithUser[]>({
    queryKey: ["/api/companies", companyId, "members-with-users"],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/members-with-users`);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  const createPacketMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      documentUrl: string;
      dueDate?: string;
      participants: Array<{ name: string; email: string; role: string; order: number }>;
      fields: SigningFieldPlacement[];
    }) => {
      const res = await apiRequest("POST", `/api/companies/${companyId}/signing-packets`, data);
      if (!res.ok) throw new Error("Failed to create signing packet");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "signing-packets"] });
      toast({ title: "Signing Packet Created", description: "The document is ready to be sent for signatures." });
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create signing packet.", variant: "destructive" });
    },
  });

  const sendPacketMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/signing-packets/${id}/send`);
      if (!res.ok) throw new Error("Failed to send signing packet");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "signing-packets"] });
      toast({ title: "Packet Sent", description: "Recipients have been notified to sign the document." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send signing packet.", variant: "destructive" });
    },
  });

  const deletePacketMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/signing-packets/${id}`);
      if (!res.ok) throw new Error("Failed to delete signing packet");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "signing-packets"] });
      toast({ title: "Packet Deleted", description: "The signing packet has been deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete signing packet.", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setIsCreateDialogOpen(false);
    setIsFieldPlacerOpen(false);
    setNewPacketName("");
    setNewPacketDescription("");
    setNewPacketDueDate("");
    setUploadedPdfUrl(null);
    setParticipants([]);
    setParticipantName("");
    setParticipantEmail("");
    setPlacedFields([]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({ title: "Invalid File", description: "Please upload a PDF file.", variant: "destructive" });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/pdf", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();
      setUploadedPdfUrl(data.url);
      toast({ title: "PDF Uploaded", description: "You can now add signature fields to the document." });
    } catch {
      toast({ title: "Upload Failed", description: "Failed to upload PDF file.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const addParticipant = () => {
    if (!participantName.trim() || !participantEmail.trim()) {
      toast({ title: "Missing Info", description: "Please enter both name and email.", variant: "destructive" });
      return;
    }
    setParticipants([...participants, { name: participantName, email: participantEmail, role: "signer" }]);
    setParticipantName("");
    setParticipantEmail("");
  };

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const addMemberAsParticipant = (member: CompanyMemberWithUser) => {
    const fullName = `${member.firstName || ""} ${member.lastName || ""}`.trim();
    if (member.email && !participants.find(p => p.email === member.email)) {
      setParticipants([...participants, { name: fullName || member.email, email: member.email, role: "signer" }]);
    }
  };

  const handleOpenFieldPlacer = () => {
    if (!uploadedPdfUrl) {
      toast({ title: "No PDF", description: "Please upload a PDF first.", variant: "destructive" });
      return;
    }
    if (participants.length === 0) {
      toast({ title: "No Recipients", description: "Please add at least one recipient first.", variant: "destructive" });
      return;
    }
    setIsFieldPlacerOpen(true);
  };

  const handleCreatePacket = () => {
    if (!newPacketName.trim() || !uploadedPdfUrl) {
      toast({ title: "Missing Info", description: "Please enter a name and upload a PDF.", variant: "destructive" });
      return;
    }
    if (participants.length === 0) {
      toast({ title: "No Recipients", description: "Please add at least one recipient.", variant: "destructive" });
      return;
    }

    createPacketMutation.mutate({
      name: newPacketName,
      description: newPacketDescription,
      documentUrl: uploadedPdfUrl,
      dueDate: newPacketDueDate || undefined,
      participants: participants.map((p, i) => ({ ...p, order: i + 1 })),
      fields: placedFields,
    });
  };

  const viewPacketDetails = async (packet: SigningPacketWithDetails) => {
    try {
      const res = await fetch(`/api/signing-packets/${packet.id}`);
      if (!res.ok) throw new Error("Failed to fetch details");
      const data = await res.json();
      setSelectedPacket(data);
      setIsViewDialogOpen(true);
    } catch {
      toast({ title: "Error", description: "Failed to load packet details.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader><div className="h-6 bg-muted rounded w-3/4" /></CardHeader>
            <CardContent><div className="h-4 bg-muted rounded w-full" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const participantColors = [
    "hsl(210, 100%, 60%)",
    "hsl(140, 70%, 45%)",
    "hsl(280, 80%, 60%)",
    "hsl(30, 90%, 55%)",
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Signing Packets</h3>
          <p className="text-sm text-muted-foreground">Upload PDFs and collect signatures from recipients.</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-signing-packet">
          <Plus className="w-4 h-4 mr-2" />
          New Signing Packet
        </Button>
      </div>

      {packets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="font-medium">No Signing Packets</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create your first signing packet to collect signatures.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packets.map(packet => {
            const StatusIcon = statusIcons[packet.status as keyof typeof statusIcons] || Clock;
            return (
              <Card key={packet.id} className="hover-elevate" data-testid={`card-packet-${packet.id}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5" />
                    {packet.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {packet.message || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={statusColors[packet.status as keyof typeof statusColors] || statusColors.draft}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {packet.status.charAt(0).toUpperCase() + packet.status.slice(1)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(packet.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {packet.dueDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarDays className="w-4 h-4 text-muted-foreground" />
                        <span>Due: <strong>{parseLocalDate(packet.dueDate).toLocaleDateString()}</strong></span>
                        {parseLocalDate(packet.dueDate) < new Date() && packet.status !== "completed" && (
                          <Badge variant="destructive" className="text-xs">Overdue</Badge>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => viewPacketDetails(packet)} data-testid={`button-view-${packet.id}`}>
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      {packet.status === "draft" && (
                        <Button size="sm" onClick={() => sendPacketMutation.mutate(packet.id)} disabled={sendPacketMutation.isPending} data-testid={`button-send-${packet.id}`}>
                          <Send className="w-4 h-4 mr-1" />
                          Send
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => deletePacketMutation.mutate(packet.id)} disabled={deletePacketMutation.isPending} data-testid={`button-delete-${packet.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsCreateDialogOpen(true); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Signing Packet</DialogTitle>
            <DialogDescription>
              Upload a PDF document, add recipients, and place signature fields.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="packet-name">Packet Name</Label>
                <Input
                  id="packet-name"
                  value={newPacketName}
                  onChange={(e) => setNewPacketName(e.target.value)}
                  placeholder="e.g., Service Agreement 2026"
                  data-testid="input-packet-name"
                />
              </div>

              <div>
                <Label htmlFor="packet-description">Description (Optional)</Label>
                <Textarea
                  id="packet-description"
                  value={newPacketDescription}
                  onChange={(e) => setNewPacketDescription(e.target.value)}
                  placeholder="Brief description of this document..."
                  data-testid="input-packet-description"
                />
              </div>

              <div>
                <Label htmlFor="packet-due-date">Due Date (Optional)</Label>
                <DatePicker
                  value={newPacketDueDate}
                  onChange={setNewPacketDueDate}
                  data-testid="input-packet-due-date"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Upload PDF Document</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                className="hidden"
                data-testid="input-pdf-file"
              />
              {uploadedPdfUrl ? (
                <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-400">PDF Uploaded</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setUploadedPdfUrl(null);
                        setPlacedFields([]);
                      }}
                    >
                      Replace
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-24 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  data-testid="button-upload-pdf"
                >
                  <div className="flex flex-col items-center gap-2">
                    <FileUp className="w-6 h-6" />
                    <span>{isUploading ? "Uploading..." : "Click to upload PDF"}</span>
                  </div>
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <Label>Recipients</Label>
              {companyMembers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-xs text-muted-foreground">Quick add from company:</span>
                  {companyMembers.map(member => (
                    <Button
                      key={member.id}
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => addMemberAsParticipant(member)}
                      disabled={participants.some(p => p.email === member.email)}
                      data-testid={`button-add-member-${member.userId}`}
                    >
                      <Users className="w-3 h-3 mr-1" />
                      {member.firstName} {member.lastName}
                    </Button>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="Name"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  className="flex-1"
                  data-testid="input-participant-name"
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={participantEmail}
                  onChange={(e) => setParticipantEmail(e.target.value)}
                  className="flex-1"
                  data-testid="input-participant-email"
                />
                <Button onClick={addParticipant} data-testid="button-add-participant">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {participants.length > 0 && (
                <div className="space-y-2">
                  {participants.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 border rounded-md">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: participantColors[i % participantColors.length] }}
                      />
                      <span className="text-sm font-medium flex-1">{p.name}</span>
                      <span className="text-sm text-muted-foreground">{p.email}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeParticipant(i)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {uploadedPdfUrl && participants.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Signature Fields</Label>
                  <Button variant="outline" onClick={handleOpenFieldPlacer} data-testid="button-place-fields">
                    Place Fields on PDF
                  </Button>
                </div>
                {placedFields.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {placedFields.length} field(s) placed
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button
              onClick={handleCreatePacket}
              disabled={!newPacketName.trim() || !uploadedPdfUrl || participants.length === 0 || createPacketMutation.isPending}
              data-testid="button-submit-create-packet"
            >
              {createPacketMutation.isPending ? "Creating..." : "Create Packet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFieldPlacerOpen} onOpenChange={setIsFieldPlacerOpen}>
        <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Place Signature Fields</DialogTitle>
            <DialogDescription>
              Drag fields onto the document where recipients should sign.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {uploadedPdfUrl && (
              <PdfFieldPlacer
                pdfUrl={uploadedPdfUrl}
                fields={placedFields}
                participants={participants.map((p, i) => ({
                  id: `temp-${i}`,
                  name: p.name,
                  email: p.email,
                  color: participantColors[i % participantColors.length],
                }))}
                onFieldsChange={setPlacedFields}
              />
            )}
          </div>
          <DialogFooter className="p-4 border-t">
            <Button variant="outline" onClick={() => setIsFieldPlacerOpen(false)}>Cancel</Button>
            <Button onClick={() => setIsFieldPlacerOpen(false)} data-testid="button-done-placing-fields">
              Done ({placedFields.length} fields)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={(open) => { setIsViewDialogOpen(open); if (!open) setSelectedPacket(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedPacket?.title}</DialogTitle>
            <DialogDescription>{selectedPacket?.message || "No description"}</DialogDescription>
          </DialogHeader>

          {selectedPacket && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={statusColors[selectedPacket.status as keyof typeof statusColors] || statusColors.draft}>
                  {selectedPacket.status.charAt(0).toUpperCase() + selectedPacket.status.slice(1)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Created {new Date(selectedPacket.createdAt).toLocaleDateString()}
                </span>
              </div>

              {selectedPacket.participants && selectedPacket.participants.length > 0 && (
                <div>
                  <Label className="mb-2 block">Recipients</Label>
                  <div className="space-y-2">
                    {selectedPacket.participants.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-2 p-2 border rounded-md">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: participantColors[i % participantColors.length] }}
                        />
                        <span className="font-medium flex-1">{p.name}</span>
                        <span className="text-muted-foreground">{p.email}</span>
                        <Badge variant={p.status === "completed" ? "default" : "secondary"}>
                          {p.status === "completed" ? (
                            <><CheckCircle className="w-3 h-3 mr-1" />Signed</>
                          ) : (
                            <><Clock className="w-3 h-3 mr-1" />Pending</>
                          )}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedPacket.fields && selectedPacket.fields.length > 0 && (
                <div>
                  <Label className="mb-2 block">Signature Fields</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedPacket.fields.length} field(s) on this document
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
