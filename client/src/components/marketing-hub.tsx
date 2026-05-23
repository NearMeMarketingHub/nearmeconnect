import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { CompanyCredential, CompanyKnowledgeItem } from "@shared/schema";
import {
  Palette, Link2, KeyRound, Lightbulb, BarChart2,
  Plus, Trash2, Eye, EyeOff, Copy, Check, Save, X,
  ExternalLink, Globe, AlertTriangle, Clock, ArrowRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface BrandProfile {
  id?: string;
  companyId: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  primaryFont?: string | null;
  secondaryFont?: string | null;
  tagline?: string | null;
  brandVoiceSummary?: string | null;
  targetAudienceDescription?: string | null;
  geographicFocus?: string | null;
  uniqueValueProposition?: string | null;
  doNotUsePhrases?: string | null;
  logoPrimaryUrl?: string | null;
  logoSecondaryUrl?: string | null;
  logoWhiteUrl?: string | null;
  brandGuidelinesUrl?: string | null;
  competitorNotes?: string | null;
}

export interface MarketingHubProps {
  companyId: string;
  onNavigateToTab?: (tab: string) => void;
}

type CredWithMeta = CompanyCredential & { hasPassword?: boolean };

// ─── Constants ────────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { key: "brand" as const, label: "Brand Profile", icon: Palette },
  { key: "links" as const, label: "Links & Resources", icon: Link2 },
  { key: "credentials" as const, label: "Login Credentials", icon: KeyRound },
  { key: "ideas" as const, label: "Strategies & Ideas", icon: Lightbulb },
  { key: "hubspot" as const, label: "HubSpot Data", icon: BarChart2 },
];
type SectionKey = typeof NAV_SECTIONS[number]["key"];

const LINK_CATEGORIES = [
  { key: "website", label: "Website & Web Properties", emoji: "🌐" },
  { key: "analytics", label: "Analytics & Reporting", emoji: "📊" },
  { key: "social", label: "Social Media Profiles", emoji: "📱" },
  { key: "design", label: "Design & Brand Assets", emoji: "📁" },
  { key: "ads", label: "Ad Accounts", emoji: "📣" },
  { key: "email", label: "Email & Automation", emoji: "📧" },
  { key: "tools", label: "Tools & Software", emoji: "🔧" },
  { key: "docs", label: "Docs & Contracts", emoji: "📋" },
  { key: "directory", label: "Directory Listings", emoji: "📍" },
  { key: "other", label: "Other", emoji: "🔑" },
] as const;

const CRED_GROUPS = [
  { key: "google", label: "Google", abbr: "G", test: (s: string) => /(google|gbp|youtube|gmail|analytics|search.?console)/i.test(s) },
  { key: "meta", label: "Meta / Facebook", abbr: "f", test: (s: string) => /(facebook|instagram|\bmeta\b|fb\.)/i.test(s) },
  { key: "linkedin", label: "LinkedIn", abbr: "in", test: (s: string) => /linkedin/i.test(s) },
  { key: "email_auto", label: "Email & Automation", abbr: "✉", test: (s: string) => /(mailchimp|hubspot|klaviyo|sendgrid|constant.?contact|activecampaign)/i.test(s) },
  { key: "cms", label: "CMS & Website", abbr: "CMS", test: (s: string) => /(wordpress|squarespace|wix|webflow|shopify|drupal)/i.test(s) },
  { key: "design", label: "Design Tools", abbr: "✏", test: (s: string) => /(canva|adobe|figma)/i.test(s) },
  { key: "other", label: "Other", abbr: "…", test: () => true },
];

function getCredGroup(cred: CredWithMeta): string {
  const s = `${cred.label || ""} ${cred.url || ""} ${cred.category || ""}`;
  for (const g of CRED_GROUPS) {
    if (g.key !== "other" && g.test(s)) return g.key;
  }
  return "other";
}

function verificationInfo(lastVerifiedAt: string | null | undefined) {
  if (!lastVerifiedAt) return { label: "Not verified", colorClass: "text-muted-foreground", warn: false, warnLevel: "" };
  const days = Math.floor((Date.now() - new Date(lastVerifiedAt).getTime()) / 86400000);
  if (days >= 90) return { label: `${days}d ago`, colorClass: "text-red-500", warn: true, warnLevel: "red" };
  if (days >= 60) return { label: `${days}d ago`, colorClass: "text-yellow-500", warn: true, warnLevel: "yellow" };
  return { label: `${days}d ago`, colorClass: "text-green-600 dark:text-green-400", warn: false, warnLevel: "" };
}

// ─── Color Swatch ─────────────────────────────────────────────────────────────
function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="w-8 h-8 rounded-md border-2 border-border cursor-pointer hover:scale-110 transition-transform shrink-0 shadow-sm"
          style={{ backgroundColor: value || "#cccccc" }}
          onClick={() => ref.current?.click()}
          data-testid={`swatch-${label.toLowerCase().replace(/\s+/g, "-")}`}
        />
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#000000"
          className="w-28 font-mono text-sm h-8"
        />
        <input ref={ref} type="color" className="sr-only" value={value || "#000000"} onChange={e => onChange(e.target.value)} />
      </div>
    </div>
  );
}

// ─── Tag Input ────────────────────────────────────────────────────────────────
function TagInput({ tags, onChange, placeholder = "Add and press Enter..." }: { tags: string[]; onChange: (t: string[]) => void; placeholder?: string }) {
  const [val, setVal] = useState("");
  const add = () => {
    const t = val.trim();
    if (t && !tags.includes(t)) { onChange([...tags, t]); setVal(""); }
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 min-h-[28px]">
        {tags.length === 0 && <span className="text-xs text-muted-foreground italic">None added yet</span>}
        {tags.map(tag => (
          <Badge key={tag} variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 gap-1">
            {tag}
            <button type="button" onClick={() => onChange(tags.filter(t => t !== tag))} data-testid={`button-remove-tag-${tag}`}><X className="w-3 h-3" /></button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="h-8 text-sm"
          data-testid="input-tag-phrase"
        />
        <Button type="button" variant="outline" size="sm" onClick={add} data-testid="button-add-tag">Add</Button>
      </div>
    </div>
  );
}

// ─── Brand Profile Section ─────────────────────────────────────────────────────
const BRAND_BLANK = {
  primaryColor: "", secondaryColor: "", accentColor: "",
  primaryFont: "", secondaryFont: "",
  tagline: "", brandVoiceSummary: "", targetAudienceDescription: "",
  geographicFocus: "", uniqueValueProposition: "",
  logoPrimaryUrl: "", logoSecondaryUrl: "", logoWhiteUrl: "",
  brandGuidelinesUrl: "", competitorNotes: "",
};

function BrandProfileSection({ companyId }: { companyId: string }) {
  const { toast } = useToast();
  const { data: profile, isLoading } = useQuery<BrandProfile | null>({
    queryKey: ["/api/companies", companyId, "brand-profile"],
    queryFn: async () => {
      const r = await fetch(`/api/companies/${companyId}/brand-profile`);
      if (r.status === 404) return null;
      if (!r.ok) return null;
      return r.json();
    },
    enabled: !!companyId,
  });

  const [form, setForm] = useState(BRAND_BLANK);
  const [phrases, setPhrases] = useState<string[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (profile !== undefined && !initialized.current) {
      initialized.current = true;
      if (profile) {
        setForm({
          primaryColor: profile.primaryColor || "",
          secondaryColor: profile.secondaryColor || "",
          accentColor: profile.accentColor || "",
          primaryFont: profile.primaryFont || "",
          secondaryFont: profile.secondaryFont || "",
          tagline: profile.tagline || "",
          brandVoiceSummary: profile.brandVoiceSummary || "",
          targetAudienceDescription: profile.targetAudienceDescription || "",
          geographicFocus: profile.geographicFocus || "",
          uniqueValueProposition: profile.uniqueValueProposition || "",
          logoPrimaryUrl: profile.logoPrimaryUrl || "",
          logoSecondaryUrl: profile.logoSecondaryUrl || "",
          logoWhiteUrl: profile.logoWhiteUrl || "",
          brandGuidelinesUrl: profile.brandGuidelinesUrl || "",
          competitorNotes: profile.competitorNotes || "",
        });
        try { setPhrases(JSON.parse(profile.doNotUsePhrases || "[]")); } catch { setPhrases([]); }
      }
    }
  }, [profile]);

  const set = (k: keyof typeof BRAND_BLANK, v: string) => setForm(p => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/companies/${companyId}/brand-profile`, { ...form, doNotUsePhrases: JSON.stringify(phrases) }),
    onSuccess: () => {
      initialized.current = false;
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "brand-profile"] });
      toast({ title: "Brand profile saved" });
    },
    onError: () => toast({ title: "Failed to save brand profile", variant: "destructive" }),
  });

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold">Brand Profile</h3>
          <p className="text-sm text-muted-foreground">Visual identity, voice, and positioning</p>
        </div>
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending} data-testid="button-save-brand-profile">
          <Save className="w-3.5 h-3.5 mr-1.5" />{save.isPending ? "Saving..." : "Save Brand Profile"}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Brand Colors</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ColorSwatch label="Primary Color" value={form.primaryColor} onChange={v => set("primaryColor", v)} />
            <ColorSwatch label="Secondary Color" value={form.secondaryColor} onChange={v => set("secondaryColor", v)} />
            <ColorSwatch label="Accent Color" value={form.accentColor} onChange={v => set("accentColor", v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Typography</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Primary Font</Label>
              <Input value={form.primaryFont} onChange={e => set("primaryFont", e.target.value)} placeholder="e.g. Inter, Montserrat" data-testid="input-primary-font" />
              {form.primaryFont && <p className="text-sm text-muted-foreground" style={{ fontFamily: form.primaryFont }}>Preview: The quick brown fox</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Secondary Font</Label>
              <Input value={form.secondaryFont} onChange={e => set("secondaryFont", e.target.value)} placeholder="e.g. Georgia, Playfair Display" data-testid="input-secondary-font" />
              {form.secondaryFont && <p className="text-sm text-muted-foreground" style={{ fontFamily: form.secondaryFont }}>Preview: The quick brown fox</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Voice & Positioning</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tagline</Label>
            <Input value={form.tagline} onChange={e => set("tagline", e.target.value)} placeholder="Brand tagline..." data-testid="input-tagline" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Brand Voice Summary</Label>
            <Textarea value={form.brandVoiceSummary} onChange={e => set("brandVoiceSummary", e.target.value)} placeholder="Professional, warm, bold..." rows={3} data-testid="textarea-brand-voice" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Target Audience</Label>
            <Textarea value={form.targetAudienceDescription} onChange={e => set("targetAudienceDescription", e.target.value)} placeholder="Who is this brand trying to reach?" rows={3} data-testid="textarea-target-audience" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Geographic Focus</Label>
            <Input value={form.geographicFocus} onChange={e => set("geographicFocus", e.target.value)} placeholder="e.g. Greater Chicago Area, Nationwide" data-testid="input-geo-focus" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Unique Value Proposition</Label>
            <Textarea value={form.uniqueValueProposition} onChange={e => set("uniqueValueProposition", e.target.value)} placeholder="What makes this brand stand out?" rows={3} data-testid="textarea-uvp" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Do Not Use Phrases</CardTitle></CardHeader>
        <CardContent>
          <TagInput tags={phrases} onChange={setPhrases} placeholder="Type a banned phrase and press Enter" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Competitor Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={form.competitorNotes} onChange={e => set("competitorNotes", e.target.value)} placeholder="Key competitors, differentiators, things to avoid..." rows={4} data-testid="textarea-competitor-notes" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Logos & Brand Assets</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {([
            { key: "logoPrimaryUrl" as const, label: "Primary Logo URL" },
            { key: "logoSecondaryUrl" as const, label: "Secondary Logo URL" },
            { key: "logoWhiteUrl" as const, label: "White Version Logo URL" },
            { key: "brandGuidelinesUrl" as const, label: "Brand Guidelines URL" },
          ]).map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <div className="flex gap-2">
                <Input value={form[key]} onChange={e => set(key, e.target.value)} placeholder="https://..." data-testid={`input-${key}`} />
                {form[key] && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={form[key]} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5" /></a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Add Link Form ─────────────────────────────────────────────────────────────
function AddLinkForm({ companyId, section, onDone }: { companyId: string; section: string; onDone: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");

  const create = useMutation({
    mutationFn: () => apiRequest("POST", `/api/companies/${companyId}/knowledge`, { section, title, url: url || null, content: content || null, sortOrder: 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "knowledge"] });
      toast({ title: "Link added" });
      onDone();
    },
    onError: () => toast({ title: "Failed to add link", variant: "destructive" }),
  });

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Title *</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Main Website" className="h-8 text-sm" data-testid="input-link-title" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">URL</Label>
          <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="h-8 text-sm" data-testid="input-link-url" />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Notes (optional)</Label>
        <Input value={content} onChange={e => setContent(e.target.value)} placeholder="Short note..." className="h-8 text-sm" data-testid="input-link-notes" />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => create.mutate()} disabled={!title.trim() || create.isPending} data-testid="button-add-link-submit">
          {create.isPending ? "Adding..." : "Add Link"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}

// ─── Links & Resources Section ─────────────────────────────────────────────────
function LinksSection({ companyId }: { companyId: string }) {
  const { toast } = useToast();
  const [addingSection, setAddingSection] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery<CompanyKnowledgeItem[]>({
    queryKey: ["/api/companies", companyId, "knowledge"],
    queryFn: async () => { const r = await fetch(`/api/companies/${companyId}/knowledge`); if (!r.ok) return []; return r.json(); },
    enabled: !!companyId,
  });

  const linkCatKeys = LINK_CATEGORIES.map(c => c.key);
  const linkItems = items.filter(i => linkCatKeys.includes(i.section as any));

  const del = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/companies/${companyId}/knowledge/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "knowledge"] }); toast({ title: "Removed" }); },
    onError: () => toast({ title: "Failed to remove", variant: "destructive" }),
  });

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold">Links & Resources</h3>
        <p className="text-sm text-muted-foreground">Organize all client-related links and resources by category</p>
      </div>
      {LINK_CATEGORIES.map(cat => {
        const catItems = linkItems.filter(i => i.section === cat.key);
        return (
          <Card key={cat.key}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span>{cat.emoji}</span>
                  {cat.label}
                  {catItems.length > 0 && <Badge variant="secondary" className="text-xs">{catItems.length}</Badge>}
                </CardTitle>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => setAddingSection(addingSection === cat.key ? null : cat.key)}
                  data-testid={`button-add-link-${cat.key}`}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {addingSection === cat.key && (
                <AddLinkForm companyId={companyId} section={cat.key} onDone={() => setAddingSection(null)} />
              )}
              {catItems.length === 0 && addingSection !== cat.key && (
                <p className="text-xs text-muted-foreground italic">No links added yet</p>
              )}
              {catItems.map(item => (
                <div key={item.id} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 group" data-testid={`link-item-${item.id}`}>
                  <Globe className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block">
                        {item.url}
                      </a>
                    )}
                    {item.content && <p className="text-xs text-muted-foreground mt-0.5">{item.content}</p>}
                  </div>
                  <button
                    onClick={() => del.mutate(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    data-testid={`button-delete-link-${item.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Credential Card ──────────────────────────────────────────────────────────
function CredentialCard({ cred, companyId }: { cred: CredWithMeta; companyId: string }) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (countdown <= 0) { setRevealed(null); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const revealMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/companies/${companyId}/credentials/${cred.id}/reveal`);
      return res.json() as Promise<{ password: string | null }>;
    },
    onSuccess: (data) => { setRevealed(data.password || ""); setCountdown(30); },
    onError: () => toast({ title: "Failed to reveal credential", variant: "destructive" }),
  });

  const verifyMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/companies/${companyId}/credentials/${cred.id}`, { lastVerifiedAt: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "credentials"] });
      toast({ title: "Marked as verified" });
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const copyPassword = async () => {
    if (!revealed) return;
    await navigator.clipboard.writeText(revealed);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const vi = verificationInfo((cred as any).lastVerifiedAt);

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors" data-testid={`cred-card-${cred.id}`}>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">{cred.label}</p>
          {cred.category && <Badge variant="outline" className="text-xs">{cred.category}</Badge>}
        </div>
        {cred.username && <p className="text-xs text-muted-foreground font-mono">{cred.username}</p>}
        {cred.url && (
          <a href={cred.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block">
            {cred.url}
          </a>
        )}
        {cred.notes && <p className="text-xs text-muted-foreground italic">{cred.notes}</p>}
        <div className="flex items-center gap-2 pt-0.5 flex-wrap">
          {vi.warn && (
            <AlertTriangle className={`w-3 h-3 shrink-0 ${vi.warnLevel === "red" ? "text-red-500" : "text-yellow-500"}`} />
          )}
          <span className={`text-xs flex items-center gap-1 ${vi.colorClass}`}>
            <Clock className="w-3 h-3" />
            {vi.label}
          </span>
          <button
            onClick={() => verifyMutation.mutate()}
            disabled={verifyMutation.isPending}
            className="text-xs text-primary hover:underline disabled:opacity-50"
            data-testid={`button-verify-cred-${cred.id}`}
          >
            {verifyMutation.isPending ? "..." : "Mark Verified"}
          </button>
        </div>
      </div>
      {cred.hasPassword && (
        <div className="flex items-center gap-1 shrink-0">
          {revealed ? (
            <>
              <span className="font-mono text-xs bg-muted px-2 py-1 rounded max-w-[120px] truncate">{revealed}</span>
              {countdown > 0 && <span className="text-xs text-muted-foreground w-5 text-right">{countdown}</span>}
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copyPassword} data-testid={`button-copy-cred-${cred.id}`}>
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setRevealed(null); setCountdown(0); }}>
                <EyeOff className="w-3 h-3" />
              </Button>
            </>
          ) : (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => revealMutation.mutate()} disabled={revealMutation.isPending} data-testid={`button-reveal-cred-${cred.id}`}>
              <Eye className="w-3 h-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Credentials Section ──────────────────────────────────────────────────────
function CredentialsSection({ companyId }: { companyId: string }) {
  const { data: credentials = [], isLoading } = useQuery<CredWithMeta[]>({
    queryKey: ["/api/companies", companyId, "credentials"],
    queryFn: async () => { const r = await fetch(`/api/companies/${companyId}/credentials`); if (!r.ok) return []; return r.json(); },
    enabled: !!companyId,
  });

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>;

  const grouped = CRED_GROUPS.map(g => ({
    ...g,
    creds: credentials.filter(c => getCredGroup(c) === g.key),
  })).filter(g => g.creds.length > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold">Login Credentials</h3>
          <p className="text-sm text-muted-foreground">Platform credentials organized by category</p>
        </div>
        <p className="text-xs text-muted-foreground">Add / edit in the Info Hub tab</p>
      </div>
      {credentials.length === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <KeyRound className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No credentials stored yet</p>
            <p className="text-xs text-muted-foreground mt-1">Go to the Info Hub tab to add credentials</p>
          </CardContent>
        </Card>
      ) : grouped.length > 0 ? (
        grouped.map(g => (
          <Card key={g.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="text-xs font-bold bg-muted rounded px-1.5 py-0.5 font-mono">{g.abbr}</span>
                {g.label}
                <Badge variant="secondary" className="text-xs">{g.creds.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {g.creds.map(cred => <CredentialCard key={cred.id} cred={cred} companyId={companyId} />)}
            </CardContent>
          </Card>
        ))
      ) : (
        <div className="space-y-2">
          {credentials.map(cred => <CredentialCard key={cred.id} cred={cred} companyId={companyId} />)}
        </div>
      )}
    </div>
  );
}

// ─── Placeholder Sections ─────────────────────────────────────────────────────
function IdeasPlaceholder() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Strategies & Ideas</h3>
        <p className="text-sm text-muted-foreground">Campaign ideas, strategy notes, and opportunities</p>
      </div>
      <Card>
        <CardContent className="pt-10 pb-10 text-center">
          <Lightbulb className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Coming Soon</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            Strategic ideas and campaign planning tools will be available here in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function HubSpotPlaceholder({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">HubSpot Data</h3>
        <p className="text-sm text-muted-foreground">Sync and view HubSpot contact and deal data</p>
      </div>
      <Card>
        <CardContent className="pt-10 pb-10 text-center">
          <BarChart2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">HubSpot integration is on the HubSpot tab</p>
          <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">
            Connect and manage HubSpot data from the dedicated HubSpot tab.
          </p>
          {onNavigate && (
            <Button variant="outline" size="sm" className="mt-4" onClick={onNavigate} data-testid="button-go-to-hubspot">
              Go to HubSpot Tab <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Marketing Hub ─────────────────────────────────────────────────────────────
export function MarketingHub({ companyId, onNavigateToTab }: MarketingHubProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>("brand");

  return (
    <div className="flex gap-6">
      {/* Vertical Nav */}
      <div className="w-44 shrink-0 space-y-0.5">
        {NAV_SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left ${
              activeSection === s.key
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            data-testid={`marketing-nav-${s.key}`}
          >
            <s.icon className="w-4 h-4 shrink-0" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {activeSection === "brand" && <BrandProfileSection companyId={companyId} />}
        {activeSection === "links" && <LinksSection companyId={companyId} />}
        {activeSection === "credentials" && <CredentialsSection companyId={companyId} />}
        {activeSection === "ideas" && <IdeasPlaceholder />}
        {activeSection === "hubspot" && <HubSpotPlaceholder onNavigate={onNavigateToTab ? () => onNavigateToTab("hubspot") : undefined} />}
      </div>
    </div>
  );
}
