import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ClientOnboarding, CompanyCredential, CompanyKnowledgeItem } from "@shared/schema";
import {
  CheckCircle,
  XCircle,
  Pencil,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronDown,
  Save,
  X,
  Link2,
  User,
  Lightbulb,
  BookOpen,
  KeyRound,
  Globe,
  FileEdit,
  Copy,
  Check,
} from "lucide-react";

interface CompanyInfoHubProps {
  companyId: string;
}

const KNOWLEDGE_SECTIONS = [
  { key: "links", label: "Links", icon: Link2, description: "Important URLs, social profiles, tools" },
  { key: "profile", label: "Profile Info", icon: User, description: "Company background, target audience, tone" },
  { key: "ideas", label: "Ideas & Strategies", icon: Lightbulb, description: "Campaign ideas, strategic notes" },
  { key: "resources", label: "Resources", icon: BookOpen, description: "Reference materials, templates, guides" },
] as const;

type KnowledgeSection = typeof KNOWLEDGE_SECTIONS[number]["key"];

function CredentialRow({ cred, companyId }: { cred: CompanyCredential; companyId: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    label: cred.label,
    username: cred.username || "",
    password: cred.password || "",
    url: cred.url || "",
    notes: cred.notes || "",
    category: cred.category || "",
  });
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/companies/${companyId}/credentials/${cred.id}`, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "credentials"] });
      setEditOpen(false);
      toast({ title: "Credential updated" });
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/companies/${companyId}/credentials/${cred.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "credentials"] });
      toast({ title: "Credential deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <>
      <div className="flex items-start gap-3 p-3 border rounded-lg bg-card" data-testid={`credential-row-${cred.id}`}>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm" data-testid={`text-cred-label-${cred.id}`}>{cred.label}</span>
            {cred.category && (
              <Badge variant="secondary" className="text-xs">{cred.category}</Badge>
            )}
          </div>
          {cred.username && (
            <p className="text-xs text-muted-foreground" data-testid={`text-cred-username-${cred.id}`}>
              <span className="font-medium">User:</span> {cred.username}
            </p>
          )}
          {cred.password && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">Pass:</span>
              <span className="text-xs font-mono" data-testid={`text-cred-password-${cred.id}`}>
                {revealed ? cred.password : "••••••••"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => setRevealed(v => !v)}
                data-testid={`button-toggle-password-${cred.id}`}
              >
                {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
              {revealed && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => copyToClipboard(cred.password!)}
                  data-testid={`button-copy-password-${cred.id}`}
                >
                  {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              )}
            </div>
          )}
          {cred.url && (
            <a
              href={cred.url.startsWith("http") ? cred.url : `https://${cred.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary flex items-center gap-1 hover:underline w-fit"
              data-testid={`link-cred-url-${cred.id}`}
            >
              <Globe className="h-3 w-3" />
              {cred.url.replace(/^https?:\/\//, "").slice(0, 40)}
            </a>
          )}
          {cred.notes && (
            <p className="text-xs text-muted-foreground" data-testid={`text-cred-notes-${cred.id}`}>{cred.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => { setForm({ label: cred.label, username: cred.username || "", password: cred.password || "", url: cred.url || "", notes: cred.notes || "", category: cred.category || "" }); setEditOpen(true); }}
            data-testid={`button-edit-cred-${cred.id}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" data-testid={`button-delete-cred-${cred.id}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Credential</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{cred.label}"? This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Credential</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="edit-cred-label">Label *</Label>
              <Input id="edit-cred-label" value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} data-testid="input-edit-cred-label" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-cred-username">Username / Email</Label>
                <Input id="edit-cred-username" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} data-testid="input-edit-cred-username" />
              </div>
              <div>
                <Label htmlFor="edit-cred-password">Password</Label>
                <Input id="edit-cred-password" type="text" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} data-testid="input-edit-cred-password" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-cred-url">URL</Label>
                <Input id="edit-cred-url" value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://" data-testid="input-edit-cred-url" />
              </div>
              <div>
                <Label htmlFor="edit-cred-category">Category</Label>
                <Input id="edit-cred-category" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Social, CMS" data-testid="input-edit-cred-category" />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-cred-notes">Notes</Label>
              <Textarea id="edit-cred-notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} data-testid="input-edit-cred-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !form.label.trim()} data-testid="button-save-cred-edit">
              {updateMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function KnowledgeItemRow({ item, companyId }: { item: CompanyKnowledgeItem; companyId: string }) {
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ title: item.title, content: item.content || "", url: item.url || "" });
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/companies/${companyId}/knowledge/${item.id}`, {
        title: form.title,
        content: form.content || null,
        url: form.url || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "knowledge"] });
      setEditOpen(false);
      toast({ title: "Item updated" });
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/companies/${companyId}/knowledge/${item.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "knowledge"] });
      toast({ title: "Item deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  return (
    <>
      <div className="flex items-start gap-3 p-3 border rounded-lg bg-card" data-testid={`knowledge-item-${item.id}`}>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-medium" data-testid={`text-knowledge-title-${item.id}`}>{item.title}</p>
          {item.content && (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap" data-testid={`text-knowledge-content-${item.id}`}>{item.content}</p>
          )}
          {item.url && (
            <a
              href={item.url.startsWith("http") ? item.url : `https://${item.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary flex items-center gap-1 hover:underline w-fit"
              data-testid={`link-knowledge-url-${item.id}`}
            >
              <ExternalLink className="h-3 w-3" />
              {item.url.replace(/^https?:\/\//, "").slice(0, 50)}
            </a>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => { setForm({ title: item.title, content: item.content || "", url: item.url || "" }); setEditOpen(true); }}
            data-testid={`button-edit-knowledge-${item.id}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" data-testid={`button-delete-knowledge-${item.id}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Item</AlertDialogTitle>
                <AlertDialogDescription>Are you sure you want to delete "{item.title}"?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} data-testid="input-edit-knowledge-title" />
            </div>
            <div>
              <Label>URL</Label>
              <Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://" data-testid="input-edit-knowledge-url" />
            </div>
            <div>
              <Label>Notes / Content</Label>
              <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={3} data-testid="input-edit-knowledge-content" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !form.title.trim()} data-testid="button-save-knowledge-edit">
              {updateMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddCredentialDialog({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  const [form, setForm] = useState({ label: "", username: "", password: "", url: "", notes: "", category: "" });
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/companies/${companyId}/credentials`, {
        ...form,
        username: form.username || null,
        password: form.password || null,
        url: form.url || null,
        notes: form.notes || null,
        category: form.category || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "credentials"] });
      onClose();
      toast({ title: "Credential added" });
    },
    onError: () => toast({ title: "Failed to add credential", variant: "destructive" }),
  });

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Add Credential</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label htmlFor="new-cred-label">Label *</Label>
          <Input id="new-cred-label" value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Google Ads Account" data-testid="input-new-cred-label" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="new-cred-username">Username / Email</Label>
            <Input id="new-cred-username" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} data-testid="input-new-cred-username" />
          </div>
          <div>
            <Label htmlFor="new-cred-password">Password</Label>
            <Input id="new-cred-password" type="text" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} data-testid="input-new-cred-password" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="new-cred-url">URL</Label>
            <Input id="new-cred-url" value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://" data-testid="input-new-cred-url" />
          </div>
          <div>
            <Label htmlFor="new-cred-category">Category</Label>
            <Input id="new-cred-category" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Social, CMS" data-testid="input-new-cred-category" />
          </div>
        </div>
        <div>
          <Label htmlFor="new-cred-notes">Notes</Label>
          <Textarea id="new-cred-notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} data-testid="input-new-cred-notes" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.label.trim()} data-testid="button-submit-new-cred">
          {createMutation.isPending ? "Adding…" : "Add Credential"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function AddKnowledgeItemForm({ companyId, section, onDone }: { companyId: string; section: KnowledgeSection; onDone: () => void }) {
  const [form, setForm] = useState({ title: "", url: "", content: "" });
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/companies/${companyId}/knowledge`, {
        section,
        title: form.title.trim(),
        content: form.content || null,
        url: form.url || null,
        sortOrder: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "knowledge"] });
      setForm({ title: "", url: "", content: "" });
      onDone();
      toast({ title: "Item added" });
    },
    onError: () => toast({ title: "Failed to add item", variant: "destructive" }),
  });

  return (
    <div className="border border-dashed rounded-lg p-3 space-y-2 bg-muted/30">
      <div>
        <Input
          value={form.title}
          onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          placeholder="Title *"
          className="text-sm"
          data-testid={`input-new-knowledge-title-${section}`}
        />
      </div>
      <div>
        <Input
          value={form.url}
          onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
          placeholder="URL (optional)"
          className="text-sm"
          data-testid={`input-new-knowledge-url-${section}`}
        />
      </div>
      <div>
        <Textarea
          value={form.content}
          onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
          placeholder="Notes (optional)"
          rows={2}
          className="text-sm"
          data-testid={`input-new-knowledge-content-${section}`}
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !form.title.trim()}
          data-testid={`button-submit-new-knowledge-${section}`}
        >
          {createMutation.isPending ? "Adding…" : "Add"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone} data-testid={`button-cancel-new-knowledge-${section}`}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function CompanyInfoHub({ companyId }: CompanyInfoHubProps) {
  const { toast } = useToast();
  const [addCredOpen, setAddCredOpen] = useState(false);
  const [addingKnowledgeSection, setAddingKnowledgeSection] = useState<KnowledgeSection | null>(null);
  const [openKnowledgeSections, setOpenKnowledgeSections] = useState<Record<string, boolean>>({
    links: true, profile: false, ideas: false, resources: false,
  });

  // Editable onboarding state
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState({
    primaryContactName: "",
    primaryContactEmail: "",
    primaryContactPhone: "",
    website: "",
    specialNotes: "",
    brandAssetLinks: "",
  });

  const { data: onboarding } = useQuery<ClientOnboarding | null>({
    queryKey: ["/api/companies", companyId, "onboarding"],
    queryFn: async () => {
      const r = await fetch(`/api/companies/${companyId}/onboarding`);
      if (!r.ok) return null;
      return r.json();
    },
    enabled: !!companyId,
  });

  const { data: credentials = [] } = useQuery<CompanyCredential[]>({
    queryKey: ["/api/companies", companyId, "credentials"],
    queryFn: async () => {
      const r = await fetch(`/api/companies/${companyId}/credentials`);
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!companyId,
  });

  const { data: knowledgeItems = [] } = useQuery<CompanyKnowledgeItem[]>({
    queryKey: ["/api/companies", companyId, "knowledge"],
    queryFn: async () => {
      const r = await fetch(`/api/companies/${companyId}/knowledge`);
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!companyId,
  });

  const updateOnboardingMutation = useMutation({
    mutationFn: async (data: Partial<ClientOnboarding>) => {
      await apiRequest("PATCH", `/api/companies/${companyId}/onboarding`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "onboarding"] });
      setEditingDetails(false);
      toast({ title: "Details saved" });
    },
    onError: () => toast({ title: "Failed to save details", variant: "destructive" }),
  });

  const startEditingDetails = () => {
    setDetailsForm({
      primaryContactName: onboarding?.primaryContactName || "",
      primaryContactEmail: onboarding?.primaryContactEmail || "",
      primaryContactPhone: onboarding?.primaryContactPhone || "",
      website: onboarding?.website || "",
      specialNotes: onboarding?.specialNotes || "",
      brandAssetLinks: onboarding?.brandAssetLinks || "",
    });
    setEditingDetails(true);
  };

  const toggleKnowledgeSection = (key: string) => {
    setOpenKnowledgeSections(p => ({ ...p, [key]: !p[key] }));
  };

  const accessComplete = onboarding
    ? (onboarding.youtubeInviteDate || onboarding.youtubeInviteNA) &&
      (onboarding.youtubeFeatureEligibilityDate || onboarding.youtubeFeatureNA) &&
      (onboarding.metaBusinessInviteDate || onboarding.metaBusinessNA) &&
      (onboarding.googleBusinessInviteDate || onboarding.googleBusinessNA)
    : false;

  return (
    <div className="space-y-6">
      {/* ── Onboarding Status ── */}
      {onboarding ? (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Onboarding Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Social media profiles listed", done: !!onboarding.socialProfilesListed },
                { label: "Access invitations sent", done: !!accessComplete },
                { label: "Login credentials provided", done: !!onboarding.loginCredentialsProvided },
                { label: "Brand assets shared", done: !!onboarding.brandAssetsProvided },
                { label: "Seasonal preferences confirmed", done: !!onboarding.seasonalPreferencesConfirmed },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2.5">
                  {item.done
                    ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    : <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className="text-sm">{item.label}</span>
                </div>
              ))}
              {onboarding.authorizationName && (
                <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Authorized by</p>
                    <p className="font-medium">{onboarding.authorizationName}</p>
                  </div>
                  {onboarding.authorizationDate && (
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-medium">{new Date(onboarding.authorizationDate).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Client Details (editable) ── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Client Details</CardTitle>
                {!editingDetails && (
                  <Button variant="outline" size="sm" onClick={startEditingDetails} data-testid="button-edit-client-details">
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingDetails ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="edit-contact-name">Primary Contact Name</Label>
                      <Input
                        id="edit-contact-name"
                        value={detailsForm.primaryContactName}
                        onChange={e => setDetailsForm(p => ({ ...p, primaryContactName: e.target.value }))}
                        data-testid="input-edit-contact-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-contact-email">Primary Contact Email</Label>
                      <Input
                        id="edit-contact-email"
                        type="email"
                        value={detailsForm.primaryContactEmail}
                        onChange={e => setDetailsForm(p => ({ ...p, primaryContactEmail: e.target.value }))}
                        data-testid="input-edit-contact-email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-contact-phone">Primary Contact Phone</Label>
                      <Input
                        id="edit-contact-phone"
                        value={detailsForm.primaryContactPhone}
                        onChange={e => setDetailsForm(p => ({ ...p, primaryContactPhone: e.target.value }))}
                        data-testid="input-edit-contact-phone"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-website">Website</Label>
                      <Input
                        id="edit-website"
                        value={detailsForm.website}
                        onChange={e => setDetailsForm(p => ({ ...p, website: e.target.value }))}
                        data-testid="input-edit-website"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="edit-brand-asset-links">Brand Asset Links</Label>
                    <Textarea
                      id="edit-brand-asset-links"
                      value={detailsForm.brandAssetLinks}
                      onChange={e => setDetailsForm(p => ({ ...p, brandAssetLinks: e.target.value }))}
                      rows={2}
                      placeholder="Google Drive link, Dropbox, etc."
                      data-testid="input-edit-brand-asset-links"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-special-notes">Special Notes</Label>
                    <Textarea
                      id="edit-special-notes"
                      value={detailsForm.specialNotes}
                      onChange={e => setDetailsForm(p => ({ ...p, specialNotes: e.target.value }))}
                      rows={3}
                      data-testid="input-edit-special-notes"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateOnboardingMutation.mutate(detailsForm)}
                      disabled={updateOnboardingMutation.isPending}
                      data-testid="button-save-client-details"
                    >
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      {updateOnboardingMutation.isPending ? "Saving…" : "Save Changes"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingDetails(false)} data-testid="button-cancel-edit-details">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Primary Contact</p>
                    <p className="font-medium">{onboarding.primaryContactName || <span className="text-muted-foreground italic">Not set</span>}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{onboarding.primaryContactEmail || <span className="text-muted-foreground italic">Not set</span>}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{onboarding.primaryContactPhone || <span className="text-muted-foreground italic">Not set</span>}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Website</p>
                    {onboarding.website ? (
                      <a href={onboarding.website.startsWith("http") ? onboarding.website : `https://${onboarding.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 font-medium">
                        {onboarding.website.replace(/^https?:\/\//, "")}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : <span className="text-muted-foreground italic">Not set</span>}
                  </div>
                  {onboarding.brandAssetLinks && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Brand Asset Links</p>
                      <p className="whitespace-pre-wrap">{onboarding.brandAssetLinks}</p>
                    </div>
                  )}
                  {onboarding.specialNotes && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Special Notes</p>
                      <p className="whitespace-pre-wrap">{onboarding.specialNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Social Platforms ── */}
          {onboarding.socialPlatforms && (() => {
            try {
              const platforms = JSON.parse(onboarding.socialPlatforms);
              const active = platforms.filter((p: any) => p.exists);
              if (active.length === 0) return null;
              return (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Social Platforms</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {active.map((p: any) => (
                        <div key={p.platform} className="flex items-center justify-between p-2.5 border rounded-lg text-sm">
                          <div>
                            <p className="font-medium capitalize">{p.platform.replace("_", " ")}</p>
                            {p.handle && <p className="text-xs text-muted-foreground">{p.handle}</p>}
                          </div>
                          {p.accountEmail && <p className="text-xs text-muted-foreground">{p.accountEmail}</p>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            } catch { return null; }
          })()}

          {/* ── Onboarding Login Credentials (from client submission) ── */}
          {onboarding.loginCredentials && (() => {
            try {
              const creds = JSON.parse(onboarding.loginCredentials);
              if (!creds.length) return null;
              return (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Login Credentials (from onboarding)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {creds.map((c: any, i: number) => (
                        <div key={i} className="p-2.5 border rounded-lg text-sm space-y-1">
                          <p className="font-medium">{c.platform}</p>
                          {c.username && <p className="text-xs text-muted-foreground">User: {c.username}</p>}
                          {c.twoFactorMethod && <p className="text-xs text-muted-foreground">2FA: {c.twoFactorMethod}</p>}
                          {c.recoveryNotes && <p className="text-xs text-muted-foreground">{c.recoveryNotes}</p>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            } catch { return null; }
          })()}
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <FileEdit className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">Client has not started onboarding yet.</p>
            <p className="text-sm text-muted-foreground">The client can complete their onboarding form from their portal.</p>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* ── Credentials Manager ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Credentials Manager</CardTitle>
              {credentials.length > 0 && (
                <Badge variant="secondary" className="text-xs">{credentials.length}</Badge>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={() => setAddCredOpen(true)} data-testid="button-add-credential">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {credentials.length > 0 ? (
            <div className="space-y-2">
              {credentials.map(cred => (
                <CredentialRow key={cred.id} cred={cred} companyId={companyId} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No credentials saved yet. Add logins, API keys, or access details here.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={addCredOpen} onOpenChange={setAddCredOpen}>
        <AddCredentialDialog companyId={companyId} onClose={() => setAddCredOpen(false)} />
      </Dialog>

      <Separator />

      {/* ── Knowledge Hub ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">Knowledge Hub</h3>
        </div>
        <div className="space-y-3">
          {KNOWLEDGE_SECTIONS.map(({ key, label, icon: Icon, description }) => {
            const sectionItems = knowledgeItems.filter(item => item.section === key);
            const isOpen = openKnowledgeSections[key];
            return (
              <Card key={key}>
                <Collapsible open={isOpen} onOpenChange={() => toggleKnowledgeSection(key)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-0 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg py-3" data-testid={`button-toggle-knowledge-${key}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{label}</span>
                          {sectionItems.length > 0 && (
                            <Badge variant="secondary" className="text-xs">{sectionItems.length}</Badge>
                          )}
                        </div>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </div>
                      {!isOpen && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-3 space-y-3">
                      {sectionItems.length > 0 ? (
                        <div className="space-y-2">
                          {sectionItems.map(item => (
                            <KnowledgeItemRow key={item.id} item={item} companyId={companyId} />
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">{description} — nothing added yet.</p>
                      )}
                      {addingKnowledgeSection === key ? (
                        <AddKnowledgeItemForm
                          companyId={companyId}
                          section={key}
                          onDone={() => setAddingKnowledgeSection(null)}
                        />
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground h-7"
                          onClick={() => setAddingKnowledgeSection(key)}
                          data-testid={`button-add-knowledge-${key}`}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add entry
                        </Button>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
