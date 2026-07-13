import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ClientOnboarding, CompanyCredential, CompanyKnowledgeItem, CompanyProfile } from "@shared/schema";
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
  AlertCircle,
  Palette,
  Image,
  Users,
  Target,
  Hash,
  Upload,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Twitter,
  Building2,
  MapPin,
  FileText,
  Calendar,
  Star,
  FileArchive,
  Minus,
} from "lucide-react";

interface CompanyInfoHubProps {
  companyId: string;
}

interface SocialPlatform {
  platform: string;
  exists: boolean;
  handle?: string;
  accountEmail?: string;
  notes?: string;
}

interface LoginCredentialEntry {
  platform: string;
  username?: string;
  password?: string;
  twoFactorMethod?: string;
  recoveryNotes?: string;
}

interface BrandColor {
  name: string;
  hex: string;
}

interface SocialLinks {
  website?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  tiktok?: string;
  pinterest?: string;
  googleBusiness?: string;
}

function parseSocialPlatforms(json: string | null | undefined): SocialPlatform[] {
  if (!json) return [];
  try { return JSON.parse(json) as SocialPlatform[]; } catch { return []; }
}

function parseLoginCredentials(json: string | null | undefined): LoginCredentialEntry[] {
  if (!json) return [];
  try { return JSON.parse(json) as LoginCredentialEntry[]; } catch { return []; }
}

function parseStringArray(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((s: unknown) => typeof s === "string") : [];
  } catch { return []; }
}

interface BrandAssetFile {
  name: string;
  objectPath: string;
  uploadedAt?: string;
}

function parseBrandAssetFiles(json: string | null | undefined): BrandAssetFile[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function parseBrandColors(json: string | null | undefined): BrandColor[] {
  if (!json) return [];
  try { return JSON.parse(json) as BrandColor[]; } catch { return []; }
}

function parseSocialLinks(json: string | null | undefined): SocialLinks {
  if (!json) return {};
  try { return JSON.parse(json) as SocialLinks; } catch { return {}; }
}

const KNOWLEDGE_SECTIONS = [
  { key: "links" as const, label: "Links", icon: Link2, description: "Important URLs, social profiles, tools" },
  { key: "profile" as const, label: "Profile Info", icon: User, description: "Company background, target audience, tone" },
  { key: "ideas" as const, label: "Ideas & Strategies", icon: Lightbulb, description: "Campaign ideas, strategic notes" },
  { key: "resources" as const, label: "Resources", icon: BookOpen, description: "Reference materials, templates, guides" },
] as const;

const MARKETING_INTEL_SECTIONS = [
  { key: "icp" as const, label: "Ideal Customer Profiles (ICP)", icon: Target, description: "Define ideal customers by industry, company size, pain points, etc." },
  { key: "persona" as const, label: "Buyer Personas", icon: Users, description: "Detailed profiles of target buyers including goals, challenges, and behaviors" },
  { key: "keywords" as const, label: "Keyword Lists", icon: Hash, description: "Target keywords, negative keywords, and SEO/SEM terms" },
] as const;

const SOCIAL_PLATFORMS = [
  { key: "website", label: "Website", icon: Globe, placeholder: "https://yoursite.com" },
  { key: "facebook", label: "Facebook", icon: Facebook, placeholder: "https://facebook.com/page" },
  { key: "instagram", label: "Instagram", icon: Instagram, placeholder: "https://instagram.com/handle" },
  { key: "twitter", label: "X / Twitter", icon: Twitter, placeholder: "https://x.com/handle" },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin, placeholder: "https://linkedin.com/company/name" },
  { key: "youtube", label: "YouTube", icon: Youtube, placeholder: "https://youtube.com/@channel" },
  { key: "tiktok", label: "TikTok", icon: Hash, placeholder: "https://tiktok.com/@handle" },
  { key: "pinterest", label: "Pinterest", icon: MapPin, placeholder: "https://pinterest.com/profile" },
  { key: "googleBusiness", label: "Google Business", icon: Building2, placeholder: "https://business.google.com/..." },
] as const;

// ─── Credential row ───────────────────────────────────────────────────────────
function CredentialRow({ cred, companyId }: { cred: CompanyCredential; companyId: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ label: cred.label, username: cred.username || "", password: cred.password || "", url: cred.url || "", notes: cred.notes || "", category: cred.category || "" });
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async () => apiRequest("PATCH", `/api/companies/${companyId}/credentials/${cred.id}`, form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "credentials"] }); setEditOpen(false); toast({ title: "Credential updated" }); },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => apiRequest("DELETE", `/api/companies/${companyId}/credentials/${cred.id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "credentials"] }); toast({ title: "Credential deleted" }); },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  return (
    <>
      <div className="flex items-start gap-3 p-3 border rounded-lg bg-card" data-testid={`credential-row-${cred.id}`}>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm" data-testid={`text-cred-label-${cred.id}`}>{cred.label}</span>
            {cred.category && <Badge variant="secondary" className="text-xs">{cred.category}</Badge>}
          </div>
          {cred.username && <p className="text-xs text-muted-foreground"><span className="font-medium">User:</span> {cred.username}</p>}
          {cred.password && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">Pass:</span>
              <span className="text-xs font-mono" data-testid={`text-cred-password-${cred.id}`}>{revealed ? cred.password : "••••••••"}</span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setRevealed(v => !v)} data-testid={`button-toggle-password-${cred.id}`}>
                {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
              {revealed && (
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(cred.password!)} data-testid={`button-copy-password-${cred.id}`}>
                  {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              )}
            </div>
          )}
          {cred.url && (
            <a href={cred.url.startsWith("http") ? cred.url : `https://${cred.url}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline w-fit" data-testid={`link-cred-url-${cred.id}`}>
              <Globe className="h-3 w-3" />{cred.url.replace(/^https?:\/\//, "").slice(0, 40)}
            </a>
          )}
          {cred.notes && <p className="text-xs text-muted-foreground">{cred.notes}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setForm({ label: cred.label, username: cred.username || "", password: cred.password || "", url: cred.url || "", notes: cred.notes || "", category: cred.category || "" }); setEditOpen(true); }} data-testid={`button-edit-cred-${cred.id}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" data-testid={`button-delete-cred-${cred.id}`}><Trash2 className="h-3.5 w-3.5" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Delete Credential</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete "{cred.label}"? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Credential</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Label *</Label><Input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} data-testid="input-edit-cred-label" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Username / Email</Label><Input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} data-testid="input-edit-cred-username" /></div>
              <div><Label>Password</Label><Input type="text" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} data-testid="input-edit-cred-password" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>URL</Label><Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://" data-testid="input-edit-cred-url" /></div>
              <div><Label>Category</Label><Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Social, CMS" data-testid="input-edit-cred-category" /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} data-testid="input-edit-cred-notes" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !form.label.trim()} data-testid="button-save-cred-edit">{updateMutation.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Knowledge item row ───────────────────────────────────────────────────────
function KnowledgeItemRow({ item, companyId }: { item: CompanyKnowledgeItem; companyId: string }) {
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ title: item.title, content: item.content || "", url: item.url || "" });
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async () => apiRequest("PATCH", `/api/companies/${companyId}/knowledge/${item.id}`, { title: form.title, content: form.content || null, url: form.url || null }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "knowledge"] }); setEditOpen(false); toast({ title: "Item updated" }); },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => apiRequest("DELETE", `/api/companies/${companyId}/knowledge/${item.id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "knowledge"] }); toast({ title: "Item deleted" }); },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  return (
    <>
      <div className="flex items-start gap-3 p-3 border rounded-lg bg-card" data-testid={`knowledge-item-${item.id}`}>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-medium">{item.title}</p>
          {item.content && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{item.content}</p>}
          {item.url && (
            <a href={item.url.startsWith("http") ? item.url : `https://${item.url}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline w-fit">
              <ExternalLink className="h-3 w-3" />{item.url.replace(/^https?:\/\//, "").slice(0, 50)}
            </a>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setForm({ title: item.title, content: item.content || "", url: item.url || "" }); setEditOpen(true); }} data-testid={`button-edit-knowledge-${item.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" data-testid={`button-delete-knowledge-${item.id}`}><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Delete Item</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete "{item.title}"?</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} data-testid="input-edit-knowledge-title" /></div>
            <div><Label>URL</Label><Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://" data-testid="input-edit-knowledge-url" /></div>
            <div><Label>Notes / Content</Label><Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={3} data-testid="input-edit-knowledge-content" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !form.title.trim()} data-testid="button-save-knowledge-edit">{updateMutation.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Add credential dialog ────────────────────────────────────────────────────
function AddCredentialDialog({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  const [form, setForm] = useState({ label: "", username: "", password: "", url: "", notes: "", category: "" });
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/companies/${companyId}/credentials`, { ...form, username: form.username || null, password: form.password || null, url: form.url || null, notes: form.notes || null, category: form.category || null }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "credentials"] }); onClose(); toast({ title: "Credential added" }); },
    onError: () => toast({ title: "Failed to add credential", variant: "destructive" }),
  });

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Add Credential</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Label *</Label><Input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Google Ads Account" data-testid="input-new-cred-label" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Username / Email</Label><Input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} data-testid="input-new-cred-username" /></div>
          <div><Label>Password</Label><Input type="text" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} data-testid="input-new-cred-password" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>URL</Label><Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://" data-testid="input-new-cred-url" /></div>
          <div><Label>Category</Label><Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Social, CMS" data-testid="input-new-cred-category" /></div>
        </div>
        <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} data-testid="input-new-cred-notes" /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.label.trim()} data-testid="button-submit-new-cred">{createMutation.isPending ? "Adding…" : "Add Credential"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ─── Add knowledge item inline form ──────────────────────────────────────────
function AddKnowledgeItemForm({ companyId, section, onDone }: { companyId: string; section: string; onDone: () => void }) {
  const [form, setForm] = useState({ title: "", url: "", content: "" });
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/companies/${companyId}/knowledge`, { section, title: form.title.trim(), content: form.content || null, url: form.url || null, sortOrder: 0 }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "knowledge"] }); setForm({ title: "", url: "", content: "" }); onDone(); toast({ title: "Item added" }); },
    onError: () => toast({ title: "Failed to add item", variant: "destructive" }),
  });

  return (
    <div className="border border-dashed rounded-lg p-3 space-y-2 bg-muted/30">
      <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Title *" className="text-sm" data-testid={`input-new-knowledge-title-${section}`} />
      <Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="URL (optional)" className="text-sm" data-testid={`input-new-knowledge-url-${section}`} />
      <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Notes (optional)" rows={2} className="text-sm" data-testid={`input-new-knowledge-content-${section}`} />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.title.trim()} data-testid={`button-submit-new-knowledge-${section}`}>{createMutation.isPending ? "Adding…" : "Add"}</Button>
        <Button size="sm" variant="ghost" onClick={onDone} data-testid={`button-cancel-new-knowledge-${section}`}>Cancel</Button>
      </div>
    </div>
  );
}

// ─── Company Profile Card ─────────────────────────────────────────────────────
function CompanyProfileCard({ companyId, profile, onProfileUpdated }: { companyId: string; profile: CompanyProfile | null; onProfileUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [summary, setSummary] = useState(profile?.summary || "");
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: async () => apiRequest("PATCH", `/api/companies/${companyId}/profile`, { summary }),
    onSuccess: () => { onProfileUpdated(); setEditing(false); toast({ title: "Profile saved" }); },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Company Summary
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => { setSummary(profile?.summary || ""); setEditing(v => !v); }} data-testid="button-toggle-edit-summary">
            {editing ? <><X className="h-3.5 w-3.5 mr-1.5" />Cancel</> : <><Pencil className="h-3.5 w-3.5 mr-1.5" />Edit</>}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <Textarea
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="Describe this company — their industry, mission, tone of voice, what makes them unique, target market overview, etc."
              rows={5}
              data-testid="input-company-summary"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-summary">
                <Save className="h-3.5 w-3.5 mr-1.5" />{saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : profile?.summary ? (
          <p className="text-sm whitespace-pre-wrap text-muted-foreground" data-testid="text-company-summary">{profile.summary}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No company summary yet. Click Edit to add one.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Branding Card (colors + logos) ──────────────────────────────────────────
function BrandingCard({ companyId, profile, onProfileUpdated }: { companyId: string; profile: CompanyProfile | null; onProfileUpdated: () => void }) {
  const [addColorOpen, setAddColorOpen] = useState(false);
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#000000");
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null);
  const fileInputRefs = { primary: useRef<HTMLInputElement>(null), secondary: useRef<HTMLInputElement>(null), favicon: useRef<HTMLInputElement>(null) };
  const { toast } = useToast();

  const colors = parseBrandColors(profile?.brandColors);

  const saveColorsMutation = useMutation({
    mutationFn: async (newColors: BrandColor[]) => apiRequest("PATCH", `/api/companies/${companyId}/profile`, { brandColors: JSON.stringify(newColors) }),
    onSuccess: () => { onProfileUpdated(); toast({ title: "Colors saved" }); },
    onError: () => toast({ title: "Failed to save colors", variant: "destructive" }),
  });

  const addColor = () => {
    if (!newColorName.trim()) return;
    const updated = [...colors, { name: newColorName.trim(), hex: newColorHex }];
    saveColorsMutation.mutate(updated);
    setNewColorName("");
    setNewColorHex("#000000");
    setAddColorOpen(false);
  };

  const removeColor = (idx: number) => {
    const updated = colors.filter((_, i) => i !== idx);
    saveColorsMutation.mutate(updated);
  };

  const handleLogoUpload = async (logoType: "primary" | "secondary" | "favicon", file: File) => {
    setUploadingLogo(logoType);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("logoType", logoType);
      const res = await fetch(`/api/companies/${companyId}/logo-upload`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      onProfileUpdated();
      toast({ title: "Logo uploaded" });
    } catch {
      toast({ title: "Failed to upload logo", variant: "destructive" });
    } finally {
      setUploadingLogo(null);
    }
  };

  const logoSlots: { key: "primary" | "secondary" | "favicon"; label: string; url?: string | null }[] = [
    { key: "primary", label: "Primary Logo", url: profile?.primaryLogoUrl },
    { key: "secondary", label: "Secondary / Alt Logo", url: profile?.secondaryLogoUrl },
    { key: "favicon", label: "Favicon / Icon", url: profile?.faviconUrl },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          Branding
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Brand Colors */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Brand Colors</h4>
            <Button variant="outline" size="sm" onClick={() => setAddColorOpen(true)} data-testid="button-add-color">
              <Plus className="h-3.5 w-3.5 mr-1" />Add Color
            </Button>
          </div>
          {colors.length === 0 ? (
            <p className="text-xs text-muted-foreground">No brand colors added yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {colors.map((c, i) => (
                <div key={i} className="flex items-center gap-2 border rounded-lg px-2.5 py-1.5 bg-card" data-testid={`color-swatch-${i}`}>
                  <div className="w-5 h-5 rounded-full border border-border/50 shrink-0" style={{ backgroundColor: c.hex }} />
                  <span className="text-xs font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{c.hex}</span>
                  <Button variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground hover:text-destructive" onClick={() => removeColor(i)} data-testid={`button-remove-color-${i}`}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Dialog open={addColorOpen} onOpenChange={setAddColorOpen}>
            <DialogContent className="max-w-xs">
              <DialogHeader><DialogTitle>Add Brand Color</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Color Name</Label><Input value={newColorName} onChange={e => setNewColorName(e.target.value)} placeholder="e.g. Primary Blue" data-testid="input-color-name" /></div>
                <div className="flex items-center gap-3">
                  <Label>Color</Label>
                  <input type="color" value={newColorHex} onChange={e => setNewColorHex(e.target.value)} className="h-9 w-16 rounded border cursor-pointer" data-testid="input-color-picker" />
                  <Input value={newColorHex} onChange={e => setNewColorHex(e.target.value)} className="font-mono text-sm" data-testid="input-color-hex" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddColorOpen(false)}>Cancel</Button>
                <Button onClick={addColor} disabled={!newColorName.trim()} data-testid="button-confirm-add-color">Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Separator />

        {/* Logo Upload */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2"><Image className="h-4 w-4 text-muted-foreground" />Logos</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {logoSlots.map(({ key, label, url }) => (
              <div key={key} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <div
                  className="border border-dashed rounded-lg p-3 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/30 transition-colors min-h-[80px]"
                  onClick={() => fileInputRefs[key].current?.click()}
                  data-testid={`logo-upload-zone-${key}`}
                >
                  {url ? (
                    <img src={url} alt={label} className="max-h-12 max-w-full object-contain" />
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground text-center">Click to upload</span>
                    </>
                  )}
                  {uploadingLogo === key && <span className="text-xs text-muted-foreground">Uploading…</span>}
                </div>
                <input
                  ref={fileInputRefs[key]}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(key, f); }}
                  data-testid={`input-logo-file-${key}`}
                />
                {url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground h-6"
                    onClick={() => fileInputRefs[key].current?.click()}
                    data-testid={`button-replace-logo-${key}`}
                  >Replace</Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Social Media Links Card ──────────────────────────────────────────────────
function SocialLinksCard({ companyId, profile, onProfileUpdated }: { companyId: string; profile: CompanyProfile | null; onProfileUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [links, setLinks] = useState<SocialLinks>(() => parseSocialLinks(profile?.socialLinks));
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: async () => apiRequest("PATCH", `/api/companies/${companyId}/profile`, { socialLinks: JSON.stringify(links) }),
    onSuccess: () => { onProfileUpdated(); setEditing(false); toast({ title: "Social links saved" }); },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const saved = parseSocialLinks(profile?.socialLinks);
  const hasAny = Object.values(saved).some(v => v);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            Social Media & Web Presence
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => { setLinks(parseSocialLinks(profile?.socialLinks)); setEditing(v => !v); }} data-testid="button-toggle-edit-social">
            {editing ? <><X className="h-3.5 w-3.5 mr-1.5" />Cancel</> : <><Pencil className="h-3.5 w-3.5 mr-1.5" />Edit</>}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SOCIAL_PLATFORMS.map(({ key, label, icon: Icon, placeholder }) => (
                <div key={key} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <Label className="text-xs sr-only">{label}</Label>
                    <Input
                      value={(links as any)[key] || ""}
                      onChange={e => setLinks(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="text-sm"
                      data-testid={`input-social-${key}`}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-social">
                <Save className="h-3.5 w-3.5 mr-1.5" />{saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : hasAny ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SOCIAL_PLATFORMS.filter(({ key }) => (saved as any)[key]).map(({ key, label, icon: Icon }) => (
              <a
                key={key}
                href={(saved as any)[key].startsWith("http") ? (saved as any)[key] : `https://${(saved as any)[key]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted/50 transition-colors text-sm"
                data-testid={`link-social-${key}`}
              >
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xs font-medium truncate">{(saved as any)[key].replace(/^https?:\/\//, "")}</p>
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No social links added yet. Click Edit to add them.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Onboarding full edit form ────────────────────────────────────────────────
type OnboardingEditForm = {
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  website: string;
  specialNotes: string;
  youtubeInviteDate: string;
  youtubeFeatureEligibilityDate: string;
  metaBusinessInviteDate: string;
  googleBusinessInviteDate: string;
  youtubeInviteNA: boolean;
  youtubeFeatureNA: boolean;
  metaBusinessNA: boolean;
  googleBusinessNA: boolean;
  needsGbpRecovery: boolean;
  gbpBusinessName: string;
  gbpBusinessAddress: string;
  gbpContactEmail: string;
  gbpContactPhone: string;
  gbpAdditionalContext: string;
  socialPlatformsJson: string;
  loginCredentialsJson: string;
  brandAssetLinks: string;
  brandAssetFilesJson: string;
  seasonalPreferencesJson: string;
  holidayPreferencesJson: string;
  seasonalNotes: string;
  otherHolidays: string;
  authorizationName: string;
  authorizationDate: string;
  authorizationSignature: string;
  socialProfilesListed: boolean;
  loginCredentialsProvided: boolean;
  brandAssetsProvided: boolean;
  seasonalPreferencesConfirmed: boolean;
};

function buildFormFromOnboarding(o: ClientOnboarding): OnboardingEditForm {
  return {
    primaryContactName: o.primaryContactName || "",
    primaryContactEmail: o.primaryContactEmail || "",
    primaryContactPhone: o.primaryContactPhone || "",
    website: o.website || "",
    specialNotes: o.specialNotes || "",
    youtubeInviteDate: o.youtubeInviteDate || "",
    youtubeFeatureEligibilityDate: o.youtubeFeatureEligibilityDate || "",
    metaBusinessInviteDate: o.metaBusinessInviteDate || "",
    googleBusinessInviteDate: o.googleBusinessInviteDate || "",
    youtubeInviteNA: o.youtubeInviteNA ?? false,
    youtubeFeatureNA: o.youtubeFeatureNA ?? false,
    metaBusinessNA: o.metaBusinessNA ?? false,
    googleBusinessNA: o.googleBusinessNA ?? false,
    needsGbpRecovery: o.needsGbpRecovery ?? false,
    gbpBusinessName: o.gbpBusinessName || "",
    gbpBusinessAddress: o.gbpBusinessAddress || "",
    gbpContactEmail: o.gbpContactEmail || "",
    gbpContactPhone: o.gbpContactPhone || "",
    gbpAdditionalContext: o.gbpAdditionalContext || "",
    socialPlatformsJson: o.socialPlatforms ? JSON.stringify(parseSocialPlatforms(o.socialPlatforms), null, 2) : "[]",
    loginCredentialsJson: o.loginCredentials ? JSON.stringify(parseLoginCredentials(o.loginCredentials), null, 2) : "[]",
    brandAssetLinks: o.brandAssetLinks || "",
    brandAssetFilesJson: "[]",
    seasonalPreferencesJson: "[]",
    holidayPreferencesJson: "[]",
    seasonalNotes: o.seasonalNotes || "",
    otherHolidays: o.otherHolidays || "",
    authorizationName: o.authorizationName || "",
    authorizationDate: o.authorizationDate || "",
    authorizationSignature: "",
    socialProfilesListed: o.socialProfilesListed ?? false,
    loginCredentialsProvided: o.loginCredentialsProvided ?? false,
    brandAssetsProvided: o.brandAssetsProvided ?? false,
    seasonalPreferencesConfirmed: o.seasonalPreferencesConfirmed ?? false,
  };
}

function OnboardingEditPanel({ onboarding, companyId, onClose }: { onboarding: ClientOnboarding; companyId: string; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState<OnboardingEditForm>(() => buildFormFromOnboarding(onboarding));
  const set = (field: keyof OnboardingEditForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));
  const setCheck = (field: keyof OnboardingEditForm) => (v: boolean | "indeterminate") =>
    setForm(p => ({ ...p, [field]: v === true }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Partial<ClientOnboarding> = {
        primaryContactName: form.primaryContactName || null,
        primaryContactEmail: form.primaryContactEmail || null,
        primaryContactPhone: form.primaryContactPhone || null,
        website: form.website || null,
        specialNotes: form.specialNotes || null,
        youtubeInviteDate: form.youtubeInviteDate || null,
        youtubeFeatureEligibilityDate: form.youtubeFeatureEligibilityDate || null,
        metaBusinessInviteDate: form.metaBusinessInviteDate || null,
        googleBusinessInviteDate: form.googleBusinessInviteDate || null,
        youtubeInviteNA: form.youtubeInviteNA,
        youtubeFeatureNA: form.youtubeFeatureNA,
        metaBusinessNA: form.metaBusinessNA,
        googleBusinessNA: form.googleBusinessNA,
        needsGbpRecovery: form.needsGbpRecovery,
        gbpBusinessName: form.gbpBusinessName || null,
        gbpBusinessAddress: form.gbpBusinessAddress || null,
        gbpContactEmail: form.gbpContactEmail || null,
        gbpContactPhone: form.gbpContactPhone || null,
        gbpAdditionalContext: form.gbpAdditionalContext || null,
        socialPlatforms: (() => { try { return JSON.stringify(JSON.parse(form.socialPlatformsJson)); } catch { return null; } })(),
        loginCredentials: (() => { try { return JSON.stringify(JSON.parse(form.loginCredentialsJson)); } catch { return null; } })(),
        brandAssetLinks: form.brandAssetLinks || null,
        seasonalNotes: form.seasonalNotes || null,
        otherHolidays: form.otherHolidays || null,
        socialProfilesListed: form.socialProfilesListed,
        loginCredentialsProvided: form.loginCredentialsProvided,
        brandAssetsProvided: form.brandAssetsProvided,
        seasonalPreferencesConfirmed: form.seasonalPreferencesConfirmed,
        authorizationName: form.authorizationName || null,
        authorizationDate: form.authorizationDate || null,
      };
      await apiRequest("PATCH", `/api/companies/${companyId}/onboarding`, payload);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "onboarding"] }); toast({ title: "Onboarding data saved" }); onClose(); },
    onError: () => toast({ title: "Failed to save onboarding data", variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">Edit Onboarding Data</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose} data-testid="button-cancel-onboarding-edit">
            <X className="h-3.5 w-3.5 mr-1.5" />Cancel
          </Button>
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-onboarding-edit">
            <Save className="h-3.5 w-3.5 mr-1.5" />{saveMutation.isPending ? "Saving…" : "Save All"}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Client Info</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><Label htmlFor="oe-name">Primary Contact Name</Label><Input id="oe-name" value={form.primaryContactName} onChange={set("primaryContactName")} data-testid="input-oe-name" /></div>
          <div><Label htmlFor="oe-email">Primary Contact Email</Label><Input id="oe-email" type="email" value={form.primaryContactEmail} onChange={set("primaryContactEmail")} data-testid="input-oe-email" /></div>
          <div><Label htmlFor="oe-phone">Primary Contact Phone</Label><Input id="oe-phone" value={form.primaryContactPhone} onChange={set("primaryContactPhone")} data-testid="input-oe-phone" /></div>
          <div><Label htmlFor="oe-website">Website</Label><Input id="oe-website" value={form.website} onChange={set("website")} data-testid="input-oe-website" /></div>
        </div>
        <div><Label htmlFor="oe-notes">Special Notes</Label><Textarea id="oe-notes" value={form.specialNotes} onChange={set("specialNotes")} rows={3} data-testid="input-oe-notes" /></div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Platform Access Invites</h4>
        {[
          { label: "YouTube Channel Invite", dateField: "youtubeInviteDate" as const, naField: "youtubeInviteNA" as const },
          { label: "YouTube Feature Eligibility", dateField: "youtubeFeatureEligibilityDate" as const, naField: "youtubeFeatureNA" as const },
          { label: "Meta Business Invite", dateField: "metaBusinessInviteDate" as const, naField: "metaBusinessNA" as const },
          { label: "Google Business Profile Invite", dateField: "googleBusinessInviteDate" as const, naField: "googleBusinessNA" as const },
        ].map(({ label, dateField, naField }) => (
          <div key={dateField} className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <Label className="text-xs">{label}</Label>
              <Input type="date" value={form[dateField] as string} onChange={set(dateField)} disabled={form[naField] as boolean} className="mt-1" data-testid={`input-oe-${dateField}`} />
            </div>
            <div className="flex items-center gap-1.5 mt-5">
              <Checkbox id={`na-${naField}`} checked={form[naField] as boolean} onCheckedChange={setCheck(naField)} data-testid={`checkbox-oe-${naField}`} />
              <Label htmlFor={`na-${naField}`} className="text-xs cursor-pointer">N/A</Label>
            </div>
          </div>
        ))}
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">GBP Recovery</h4>
          <Checkbox id="oe-gbp" checked={form.needsGbpRecovery} onCheckedChange={setCheck("needsGbpRecovery")} data-testid="checkbox-oe-gbp" />
        </div>
        {form.needsGbpRecovery && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><Label>Business Name</Label><Input value={form.gbpBusinessName} onChange={set("gbpBusinessName")} data-testid="input-oe-gbp-name" /></div>
            <div><Label>Business Address</Label><Input value={form.gbpBusinessAddress} onChange={set("gbpBusinessAddress")} data-testid="input-oe-gbp-address" /></div>
            <div><Label>Contact Email</Label><Input value={form.gbpContactEmail} onChange={set("gbpContactEmail")} data-testid="input-oe-gbp-email" /></div>
            <div><Label>Contact Phone</Label><Input value={form.gbpContactPhone} onChange={set("gbpContactPhone")} data-testid="input-oe-gbp-phone" /></div>
            <div className="col-span-2"><Label>Additional Context</Label><Textarea value={form.gbpAdditionalContext} onChange={set("gbpAdditionalContext")} rows={2} data-testid="input-oe-gbp-context" /></div>
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Checklist Flags</h4>
        {[
          { field: "socialProfilesListed" as const, label: "Social media profiles listed" },
          { field: "loginCredentialsProvided" as const, label: "Login credentials provided" },
          { field: "brandAssetsProvided" as const, label: "Brand assets provided" },
          { field: "seasonalPreferencesConfirmed" as const, label: "Seasonal preferences confirmed" },
        ].map(({ field, label }) => (
          <div key={field} className="flex items-center gap-2">
            <Checkbox id={field} checked={form[field] as boolean} onCheckedChange={setCheck(field)} data-testid={`checkbox-oe-${field}`} />
            <Label htmlFor={field} className="cursor-pointer text-sm">{label}</Label>
          </div>
        ))}
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Brand Assets</h4>
        <div><Label>Brand Asset Links</Label><Textarea value={form.brandAssetLinks} onChange={set("brandAssetLinks")} rows={2} placeholder="Drive links, Dropbox URLs, etc." data-testid="input-oe-brand-links" /></div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Seasonal Preferences</h4>
        <div><Label>Seasonal Notes</Label><Textarea value={form.seasonalNotes} onChange={set("seasonalNotes")} rows={2} data-testid="input-oe-seasonal-notes" /></div>
        <div><Label>Other Holidays</Label><Input value={form.otherHolidays} onChange={set("otherHolidays")} data-testid="input-oe-other-holidays" /></div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Authorization</h4>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Authorized By</Label><Input value={form.authorizationName} onChange={set("authorizationName")} data-testid="input-oe-auth-name" /></div>
          <div><Label>Date</Label><Input type="date" value={form.authorizationDate} onChange={set("authorizationDate")} data-testid="input-oe-auth-date" /></div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function CompanyInfoHub({ companyId }: CompanyInfoHubProps) {
  const { toast } = useToast();
  const [addCredOpen, setAddCredOpen] = useState(false);
  const [editingOnboarding, setEditingOnboarding] = useState(false);
  const [addingKnowledgeSection, setAddingKnowledgeSection] = useState<string | null>(null);
  const [openKnowledgeSections, setOpenKnowledgeSections] = useState<Record<string, boolean>>({
    links: true, profile: false, ideas: false, resources: false,
    icp: false, persona: false, keywords: false,
  });

  const { data: onboarding } = useQuery<ClientOnboarding | null>({
    queryKey: ["/api/companies", companyId, "onboarding"],
    queryFn: async () => { const r = await fetch(`/api/companies/${companyId}/onboarding`); if (!r.ok) return null; return r.json(); },
    enabled: !!companyId,
  });

  const { data: credentials = [] } = useQuery<CompanyCredential[]>({
    queryKey: ["/api/companies", companyId, "credentials"],
    queryFn: async () => { const r = await fetch(`/api/companies/${companyId}/credentials`); if (!r.ok) return []; return r.json(); },
    enabled: !!companyId,
  });

  const { data: knowledgeItems = [] } = useQuery<CompanyKnowledgeItem[]>({
    queryKey: ["/api/companies", companyId, "knowledge"],
    queryFn: async () => { const r = await fetch(`/api/companies/${companyId}/knowledge`); if (!r.ok) return []; return r.json(); },
    enabled: !!companyId,
  });

  const { data: profile, refetch: refetchProfile } = useQuery<CompanyProfile | null>({
    queryKey: ["/api/companies", companyId, "profile"],
    queryFn: async () => { const r = await fetch(`/api/companies/${companyId}/profile`); if (!r.ok) return null; return r.json(); },
    enabled: !!companyId,
  });

  const accessComplete = onboarding
    ? (onboarding.youtubeInviteDate || onboarding.youtubeInviteNA) &&
      (onboarding.youtubeFeatureEligibilityDate || onboarding.youtubeFeatureNA) &&
      (onboarding.metaBusinessInviteDate || onboarding.metaBusinessNA) &&
      (onboarding.googleBusinessInviteDate || onboarding.googleBusinessNA)
    : false;

  const handleProfileUpdated = () => {
    refetchProfile();
  };

  return (
    <div className="space-y-6">
      {/* ── Company Summary ───────────────────────────────── */}
      <CompanyProfileCard companyId={companyId} profile={profile ?? null} onProfileUpdated={handleProfileUpdated} />

      {/* ── Branding (colors + logos) ─────────────────────── */}
      <BrandingCard companyId={companyId} profile={profile ?? null} onProfileUpdated={handleProfileUpdated} />

      {/* ── Social Media & Web Presence ───────────────────── */}
      <SocialLinksCard companyId={companyId} profile={profile ?? null} onProfileUpdated={handleProfileUpdated} />

      <Separator />

      {/* ── Marketing Intelligence ────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">Marketing Intelligence</h3>
        </div>
        <div className="space-y-3">
          {MARKETING_INTEL_SECTIONS.map(({ key, label, icon: Icon, description }) => {
            const sectionItems = knowledgeItems.filter(item => item.section === key);
            const isOpen = openKnowledgeSections[key];
            return (
              <Card key={key}>
                <Collapsible open={isOpen} onOpenChange={() => setOpenKnowledgeSections(p => ({ ...p, [key]: !p[key] }))}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-0 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg py-3" data-testid={`button-toggle-intel-${key}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{label}</span>
                          {sectionItems.length > 0 && <Badge variant="secondary" className="text-xs">{sectionItems.length}</Badge>}
                        </div>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </div>
                      {!isOpen && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-3 space-y-3">
                      {sectionItems.length > 0 ? (
                        <div className="space-y-2">{sectionItems.map(item => <KnowledgeItemRow key={item.id} item={item} companyId={companyId} />)}</div>
                      ) : (
                        <p className="text-xs text-muted-foreground">{description} — nothing added yet.</p>
                      )}
                      {addingKnowledgeSection === key ? (
                        <AddKnowledgeItemForm companyId={companyId} section={key} onDone={() => setAddingKnowledgeSection(null)} />
                      ) : (
                        <Button variant="ghost" size="sm" className="text-muted-foreground h-7" onClick={() => setAddingKnowledgeSection(key)} data-testid={`button-add-intel-${key}`}>
                          <Plus className="h-3.5 w-3.5 mr-1" />Add entry
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

      <Separator />

      {/* ── Onboarding Status card ───────────────────────────── */}
      {onboarding ? (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Onboarding Status
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setEditingOnboarding(v => !v)} data-testid="button-toggle-edit-onboarding">
                  {editingOnboarding ? <><X className="h-3.5 w-3.5 mr-1.5" />Cancel</> : <><Pencil className="h-3.5 w-3.5 mr-1.5" />Edit All Fields</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {!editingOnboarding && (
                <>
                  {[
                    { label: "Social media profiles listed", done: !!onboarding.socialProfilesListed },
                    { label: "Access invitations sent", done: !!accessComplete },
                    { label: "Login credentials provided", done: !!onboarding.loginCredentialsProvided },
                    { label: "Brand assets shared", done: !!onboarding.brandAssetsProvided },
                    { label: "Seasonal preferences confirmed", done: !!onboarding.seasonalPreferencesConfirmed },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2.5">
                      {item.done ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> : <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />}
                      <span className="text-sm">{item.label}</span>
                    </div>
                  ))}
                  {onboarding.authorizationName && (
                    <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-sm">
                      <div><p className="text-xs text-muted-foreground">Authorized by</p><p className="font-medium">{onboarding.authorizationName}</p></div>
                      {onboarding.authorizationDate && <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium">{new Date(onboarding.authorizationDate).toLocaleDateString()}</p></div>}
                    </div>
                  )}
                </>
              )}
              {editingOnboarding && (
                <OnboardingEditPanel onboarding={onboarding} companyId={companyId} onClose={() => setEditingOnboarding(false)} />
              )}
            </CardContent>
          </Card>

          {!editingOnboarding && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Client Details</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                  <div><p className="text-xs text-muted-foreground">Primary Contact</p><p className="font-medium">{onboarding.primaryContactName || <span className="text-muted-foreground italic">Not set</span>}</p></div>
                  <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{onboarding.primaryContactEmail || <span className="text-muted-foreground italic">Not set</span>}</p></div>
                  <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium">{onboarding.primaryContactPhone || <span className="text-muted-foreground italic">Not set</span>}</p></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Website</p>
                    {onboarding.website ? (
                      <a href={onboarding.website.startsWith("http") ? onboarding.website : `https://${onboarding.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 font-medium">
                        {onboarding.website.replace(/^https?:\/\//, "")}<ExternalLink className="h-3 w-3" />
                      </a>
                    ) : <span className="text-muted-foreground italic">Not set</span>}
                  </div>
                  {onboarding.brandAssetLinks && <div className="col-span-2"><p className="text-xs text-muted-foreground">Brand Asset Links</p><p className="whitespace-pre-wrap">{onboarding.brandAssetLinks}</p></div>}
                  {onboarding.specialNotes && <div className="col-span-2"><p className="text-xs text-muted-foreground">Special Notes</p><p className="whitespace-pre-wrap">{onboarding.specialNotes}</p></div>}
                </div>
              </CardContent>
            </Card>
          )}

          {!editingOnboarding && (() => {
            const active = parseSocialPlatforms(onboarding.socialPlatforms).filter(p => p.exists);
            if (!active.length) return null;
            return (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Social Platforms (Onboarding)</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {active.map((p) => (
                      <div key={p.platform} className="flex items-center justify-between p-2.5 border rounded-lg text-sm">
                        <div><p className="font-medium capitalize">{p.platform.replace("_", " ")}</p>{p.handle && <p className="text-xs text-muted-foreground">{p.handle}</p>}</div>
                        {p.accountEmail && <p className="text-xs text-muted-foreground">{p.accountEmail}</p>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {!editingOnboarding && (() => {
            const creds = parseLoginCredentials(onboarding.loginCredentials);
            if (!creds.length) return null;
            return (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Login Credentials (client-submitted)</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {creds.map((c, i) => (
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
          })()}

          {!editingOnboarding && onboarding.needsGbpRecovery && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />GBP Recovery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
                  {onboarding.gbpBusinessName && <div><p className="text-xs text-muted-foreground">Business Name</p><p className="font-medium">{onboarding.gbpBusinessName}</p></div>}
                  {onboarding.gbpBusinessAddress && <div><p className="text-xs text-muted-foreground">Address</p><p className="font-medium">{onboarding.gbpBusinessAddress}</p></div>}
                  {onboarding.gbpContactEmail && <div><p className="text-xs text-muted-foreground">Contact Email</p><p className="font-medium">{onboarding.gbpContactEmail}</p></div>}
                  {onboarding.gbpContactPhone && <div><p className="text-xs text-muted-foreground">Contact Phone</p><p className="font-medium">{onboarding.gbpContactPhone}</p></div>}
                  {onboarding.gbpAdditionalContext && <div className="col-span-2"><p className="text-xs text-muted-foreground">Context</p><p className="whitespace-pre-wrap">{onboarding.gbpAdditionalContext}</p></div>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Platform Access Status ── */}
          {!editingOnboarding && (() => {
            const items = [
              { label: "YouTube Channel Invite", date: onboarding.youtubeInviteDate, na: onboarding.youtubeInviteNA },
              { label: "YouTube Feature Eligibility", date: onboarding.youtubeFeatureEligibilityDate, na: onboarding.youtubeFeatureNA },
              { label: "Meta Business Suite Invite", date: onboarding.metaBusinessInviteDate, na: onboarding.metaBusinessNA },
              { label: "Google Business Profile Invite", date: onboarding.googleBusinessInviteDate, na: onboarding.googleBusinessNA },
            ];
            const hasAny = items.some(i => i.date || i.na);
            if (!hasAny) return null;
            return (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />Platform Access Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {items.map(({ label, date, na }) => (
                      <div key={label} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                        <span className="text-muted-foreground">{label}</span>
                        {na ? (
                          <Badge variant="secondary" className="text-xs">N/A</Badge>
                        ) : date ? (
                          <span className="font-medium flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                            {new Date(date).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic flex items-center gap-1.5">
                            <Minus className="h-3.5 w-3.5" />Pending
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* ── Marketing Preferences ── */}
          {!editingOnboarding && (() => {
            const seasons = parseStringArray(onboarding.seasonalPreferences);
            const holidays = parseStringArray(onboarding.holidayPreferences);
            const hasData = seasons.length > 0 || holidays.length > 0 || onboarding.otherHolidays || onboarding.seasonalNotes;
            if (!hasData) return null;
            return (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="h-4 w-4 text-muted-foreground" />Marketing Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {seasons.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Seasonal Focus</p>
                      <div className="flex flex-wrap gap-1.5">
                        {seasons.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                      </div>
                    </div>
                  )}
                  {holidays.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Holiday Campaigns</p>
                      <div className="flex flex-wrap gap-1.5">
                        {holidays.map(h => <Badge key={h} variant="outline" className="text-xs">{h}</Badge>)}
                      </div>
                    </div>
                  )}
                  {onboarding.otherHolidays && (
                    <div>
                      <p className="text-xs text-muted-foreground">Other Holidays / Events</p>
                      <p className="text-sm mt-0.5">{onboarding.otherHolidays}</p>
                    </div>
                  )}
                  {onboarding.seasonalNotes && (
                    <div>
                      <p className="text-xs text-muted-foreground">Seasonal Notes</p>
                      <p className="text-sm mt-0.5 whitespace-pre-wrap">{onboarding.seasonalNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* ── Brand Asset Files ── */}
          {!editingOnboarding && (() => {
            const files = parseBrandAssetFiles(onboarding.brandAssetFiles);
            if (!files.length) return null;
            return (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileArchive className="h-4 w-4 text-muted-foreground" />Brand Asset Files
                    <Badge variant="secondary" className="text-xs">{files.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 border rounded-lg text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium truncate">{file.name}</span>
                        </div>
                        {file.uploadedAt && (
                          <span className="text-xs text-muted-foreground shrink-0 ml-2">
                            {new Date(file.uploadedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
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

      {/* ── Credentials Manager ──────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Credentials Manager</CardTitle>
              {credentials.length > 0 && <Badge variant="secondary" className="text-xs">{credentials.length}</Badge>}
            </div>
            <Button size="sm" variant="outline" onClick={() => setAddCredOpen(true)} data-testid="button-add-credential">
              <Plus className="h-3.5 w-3.5 mr-1.5" />Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {credentials.length > 0 ? (
            <div className="space-y-2">{credentials.map(cred => <CredentialRow key={cred.id} cred={cred} companyId={companyId} />)}</div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No credentials saved yet. Add logins, API keys, or access details here.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={addCredOpen} onOpenChange={setAddCredOpen}>
        <AddCredentialDialog companyId={companyId} onClose={() => setAddCredOpen(false)} />
      </Dialog>

      <Separator />

      {/* ── Knowledge Hub ───────────────────────────────────── */}
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
                <Collapsible open={isOpen} onOpenChange={() => setOpenKnowledgeSections(p => ({ ...p, [key]: !p[key] }))}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-0 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg py-3" data-testid={`button-toggle-knowledge-${key}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{label}</span>
                          {sectionItems.length > 0 && <Badge variant="secondary" className="text-xs">{sectionItems.length}</Badge>}
                        </div>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </div>
                      {!isOpen && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-3 space-y-3">
                      {sectionItems.length > 0 ? (
                        <div className="space-y-2">{sectionItems.map(item => <KnowledgeItemRow key={item.id} item={item} companyId={companyId} />)}</div>
                      ) : (
                        <p className="text-xs text-muted-foreground">{description} — nothing added yet.</p>
                      )}
                      {addingKnowledgeSection === key ? (
                        <AddKnowledgeItemForm companyId={companyId} section={key} onDone={() => setAddingKnowledgeSection(null)} />
                      ) : (
                        <Button variant="ghost" size="sm" className="text-muted-foreground h-7" onClick={() => setAddingKnowledgeSection(key)} data-testid={`button-add-knowledge-${key}`}>
                          <Plus className="h-3.5 w-3.5 mr-1" />Add entry
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
