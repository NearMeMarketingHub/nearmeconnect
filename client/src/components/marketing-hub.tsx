import { useState, useRef, useEffect, useMemo } from "react";
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
  Palette, Link2, KeyRound, Lightbulb, BarChart2, Building2,
  Plus, Trash2, Eye, EyeOff, Copy, Check, Save, X,
  ExternalLink, Globe, AlertTriangle, Clock, ArrowRight,
  ChevronDown, GripVertical, Pencil, RefreshCw, Phone, MapPin,
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
  { key: "profile" as const,     label: "Company Profile",    icon: Building2 },
  { key: "brand" as const,       label: "Brand Profile",      icon: Palette },
  { key: "links" as const,       label: "Links & Resources",  icon: Link2 },
  { key: "credentials" as const, label: "Login Credentials",  icon: KeyRound },
  { key: "ideas" as const,       label: "Strategies & Ideas", icon: Lightbulb },
  { key: "hubspot" as const,     label: "HubSpot Data",       icon: BarChart2 },
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

interface HubSpotBrandData {
  brandVoiceSummary: string;
  geographicFocus: string;
  website: string;
  phone: string;
  facebookPage: string;
  linkedinPage: string;
  linkedinBio: string;
}

const HS_FIELD_LABELS: Array<{ key: keyof HubSpotBrandData; label: string; mapsTo: string }> = [
  { key: "brandVoiceSummary", label: "About Us / Description", mapsTo: "Brand Voice Summary" },
  { key: "geographicFocus",   label: "City / State / Country",  mapsTo: "Geographic Focus" },
  { key: "website",           label: "Website Domain",           mapsTo: "Website (Links)" },
  { key: "facebookPage",      label: "Facebook Page",            mapsTo: "Facebook Link" },
  { key: "linkedinPage",      label: "LinkedIn Page",            mapsTo: "LinkedIn Link" },
];

// ─── Company Profile Section ─────────────────────────────────────────────────
interface CompanyProfileData {
  businessLegalName?: string | null;
  dbaName?: string | null;
  physicalAddress?: string | null;
  mailingAddress?: string | null;
  phones?: string | null;
  primaryEmail?: string | null;
  website?: string | null;
  stateOfIncorporation?: string | null;
  businessRegistrationUrl?: string | null;
  additionalContacts?: string | null;
  notes?: string | null;
  companySummary?: string | null;
}

function CompanyProfileSection({ companyId }: { companyId: string }) {
  const { toast } = useToast();
  const { data: profile, isLoading } = useQuery<CompanyProfileData | null>({
    queryKey: ["/api/companies", companyId, "company-profile"],
    queryFn: async () => {
      const r = await fetch(`/api/companies/${companyId}/company-profile`, { credentials: "include" });
      if (!r.ok) return null;
      return r.json();
    },
    enabled: !!companyId,
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CompanyProfileData>({});
  const [phones, setPhones] = useState<{ label: string; number: string }[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (profile !== undefined && !initialized.current) {
      initialized.current = true;
      setForm({
        businessLegalName: profile?.businessLegalName || "",
        dbaName: profile?.dbaName || "",
        physicalAddress: profile?.physicalAddress || "",
        mailingAddress: profile?.mailingAddress || "",
        primaryEmail: profile?.primaryEmail || "",
        website: profile?.website || "",
        stateOfIncorporation: profile?.stateOfIncorporation || "",
        businessRegistrationUrl: profile?.businessRegistrationUrl || "",
        notes: profile?.notes || "",
        companySummary: profile?.companySummary || "",
      });
      try { setPhones(JSON.parse(profile?.phones || "[]")); } catch { setPhones([]); }
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/companies/${companyId}/company-profile`, { ...form, phones: JSON.stringify(phones) }),
    onSuccess: () => {
      initialized.current = false;
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "company-profile"] });
      toast({ title: "Company profile saved" });
      setEditing(false);
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const set = (k: keyof CompanyProfileData, v: string) => setForm(p => ({ ...p, [k]: v }));

  const parsedPhones: { label: string; number: string }[] = (() => {
    try { return JSON.parse(profile?.phones || "[]"); } catch { return []; }
  })();

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold">Company Profile</h3>
          <p className="text-sm text-muted-foreground">Business information, addresses, and contacts</p>
        </div>
        <div className="flex items-center gap-2">
          {editing && <Button size="sm" variant="ghost" onClick={() => { setEditing(false); initialized.current = false; }}>Cancel</Button>}
          <Button size="sm" variant={editing ? "default" : "outline"} onClick={() => editing ? save.mutate() : setEditing(true)} disabled={save.isPending} data-testid="button-edit-company-profile">
            {editing ? <><Save className="w-3.5 h-3.5 mr-1.5" />{save.isPending ? "Saving…" : "Save Profile"}</> : <><Pencil className="w-3.5 h-3.5 mr-1.5" />Edit Profile</>}
          </Button>
        </div>
      </div>

      {/* Business Names */}
      <div className="rounded-lg border p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Business Names</p>
        {editing ? (
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Legal Business Name</label>
              <input className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" value={form.businessLegalName || ""} onChange={e => set("businessLegalName", e.target.value)} placeholder="Full legal name" data-testid="input-businessLegalName" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">DBA / Trade Name</label>
              <input className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" value={form.dbaName || ""} onChange={e => set("dbaName", e.target.value)} placeholder="Doing business as…" data-testid="input-dbaName" />
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {profile?.businessLegalName && <div><p className="text-xs text-muted-foreground">Legal Name</p><p className="text-sm font-medium">{profile.businessLegalName}</p></div>}
            {profile?.dbaName && <div><p className="text-xs text-muted-foreground">DBA</p><p className="text-sm">{profile.dbaName}</p></div>}
            {!profile?.businessLegalName && !profile?.dbaName && <p className="text-sm text-muted-foreground">No business names added yet.</p>}
          </div>
        )}
      </div>

      {/* Contact */}
      <div className="rounded-lg border p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact Information</p>
        {editing ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Phone Numbers</p>
              {phones.map((ph, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input className="w-24 border rounded-md px-2 py-1.5 text-sm bg-background flex-shrink-0" placeholder="Label" value={ph.label} onChange={e => setPhones(ps => ps.map((p, j) => j === i ? { ...p, label: e.target.value } : p))} data-testid={`input-profile-phone-label-${i}`} />
                  <input className="flex-1 border rounded-md px-2 py-1.5 text-sm bg-background" placeholder="Phone number" value={ph.number} onChange={e => setPhones(ps => ps.map((p, j) => j === i ? { ...p, number: e.target.value } : p))} data-testid={`input-profile-phone-number-${i}`} />
                  <button onClick={() => setPhones(ps => ps.filter((_, j) => j !== i))} className="p-1 text-destructive hover:bg-destructive/10 rounded" data-testid={`button-remove-profile-phone-${i}`}><X className="w-4 h-4" /></button>
                </div>
              ))}
              <button onClick={() => setPhones(ps => [...ps, { label: "", number: "" }])} className="flex items-center gap-1 text-xs text-primary hover:underline" data-testid="button-add-profile-phone">
                <Plus className="w-3.5 h-3.5" /> Add phone
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Primary Email</label>
                <input className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" value={form.primaryEmail || ""} onChange={e => set("primaryEmail", e.target.value)} placeholder="email@company.com" data-testid="input-primaryEmail" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Website</label>
                <input className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" value={form.website || ""} onChange={e => set("website", e.target.value)} placeholder="https://…" data-testid="input-profile-website" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {parsedPhones.length > 0 && (
              <div className="space-y-1">
                {parsedPhones.map((ph, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    {ph.label && <span className="text-muted-foreground text-xs">{ph.label}:</span>}
                    <span className="font-mono">{ph.number}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-2">
              {profile?.primaryEmail && <div className="flex items-center gap-1.5 text-sm"><Globe className="w-3.5 h-3.5 text-muted-foreground" />{profile.primaryEmail}</div>}
              {profile?.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline"><ExternalLink className="w-3.5 h-3.5" />{profile.website}</a>}
            </div>
            {!parsedPhones.length && !profile?.primaryEmail && !profile?.website && <p className="text-sm text-muted-foreground">No contact info added yet.</p>}
          </div>
        )}
      </div>

      {/* Addresses */}
      <div className="rounded-lg border p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Addresses</p>
        {editing ? (
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Physical / Business Address</label>
              <textarea className="w-full border rounded-md px-3 py-1.5 text-sm bg-background resize-none" rows={2} value={form.physicalAddress || ""} onChange={e => set("physicalAddress", e.target.value)} placeholder="Street, City, State ZIP" data-testid="input-profile-physicalAddress" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Mailing Address</label>
              <textarea className="w-full border rounded-md px-3 py-1.5 text-sm bg-background resize-none" rows={2} value={form.mailingAddress || ""} onChange={e => set("mailingAddress", e.target.value)} placeholder="P.O. Box or mailing address" data-testid="input-profile-mailingAddress" />
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {profile?.physicalAddress && <div><p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />Physical</p><p className="text-sm whitespace-pre-line">{profile.physicalAddress}</p></div>}
            {profile?.mailingAddress && <div><p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />Mailing</p><p className="text-sm whitespace-pre-line">{profile.mailingAddress}</p></div>}
            {!profile?.physicalAddress && !profile?.mailingAddress && <p className="text-sm text-muted-foreground">No addresses added yet.</p>}
          </div>
        )}
      </div>

      {/* Registration */}
      <div className="rounded-lg border p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Registration</p>
        {editing ? (
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">State of Incorporation</label>
              <input className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" value={form.stateOfIncorporation || ""} onChange={e => set("stateOfIncorporation", e.target.value)} placeholder="e.g. Florida" data-testid="input-stateOfIncorporation" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">State Registration URL</label>
              <input className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" value={form.businessRegistrationUrl || ""} onChange={e => set("businessRegistrationUrl", e.target.value)} placeholder="https://search.sunbiz.org/…" data-testid="input-businessRegistrationUrl" />
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {profile?.stateOfIncorporation && <div><p className="text-xs text-muted-foreground">State of Incorporation</p><p className="text-sm">{profile.stateOfIncorporation}</p></div>}
            {profile?.businessRegistrationUrl && <div><p className="text-xs text-muted-foreground">State Registration</p><a href={profile.businessRegistrationUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" />View Registration</a></div>}
            {!profile?.stateOfIncorporation && !profile?.businessRegistrationUrl && <p className="text-sm text-muted-foreground">No registration info added yet.</p>}
          </div>
        )}
      </div>

      {/* Company Summary */}
      <div className="rounded-lg border p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company Summary</p>
        <p className="text-xs text-muted-foreground">A paragraph about this business used for marketing content and meta descriptions.</p>
        {editing ? (
          <textarea className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" rows={4} value={form.companySummary || ""} onChange={e => set("companySummary", e.target.value)} placeholder="Describe the business in a few sentences — what they do, who they serve, what makes them unique…" data-testid="input-companySummary" />
        ) : (
          profile?.companySummary
            ? <p className="text-sm whitespace-pre-wrap">{profile.companySummary}</p>
            : <p className="text-sm text-muted-foreground">No company summary added yet.</p>
        )}
      </div>

      {/* Notes */}
      {(editing || profile?.notes) && (
        <div className="rounded-lg border p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
          {editing ? (
            <textarea className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" rows={3} value={form.notes || ""} onChange={e => set("notes", e.target.value)} placeholder="Any additional business notes…" data-testid="input-profile-notes" />
          ) : (
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{profile?.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [hsImported, setHsImported] = useState(false);

  // Lazy-fetch HubSpot brand data only when user requests it
  const {
    data: hsData,
    isFetching: hsFetching,
    error: hsError,
    refetch: fetchHs,
  } = useQuery<HubSpotBrandData>({
    queryKey: ["/api/companies", companyId, "hubspot-brand"],
    queryFn: async () => {
      const r = await fetch(`/api/companies/${companyId}/hubspot-brand`);
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || "Failed to fetch HubSpot data");
      }
      return r.json();
    },
    enabled: false,
    retry: false,
  });

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

  const applyHubSpotData = () => {
    if (!hsData) return;
    setForm(prev => ({
      ...prev,
      brandVoiceSummary: hsData.brandVoiceSummary || prev.brandVoiceSummary,
      geographicFocus: hsData.geographicFocus || prev.geographicFocus,
    }));
    setHsImported(true);
    toast({ title: "HubSpot data applied", description: "Review the filled fields and save when ready." });
  };

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

  const hasHsContent = hsData && HS_FIELD_LABELS.some(f => !!hsData[f.key]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold">Brand Profile</h3>
          <p className="text-sm text-muted-foreground">Visual identity, voice, and positioning</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchHs()}
            disabled={hsFetching}
            data-testid="button-fetch-hubspot-brand"
            className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-950/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${hsFetching ? "animate-spin" : ""}`} />
            {hsFetching ? "Loading HubSpot…" : "Pull from HubSpot"}
          </Button>
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending} data-testid="button-save-brand-profile">
            <Save className="w-3.5 h-3.5 mr-1.5" />{save.isPending ? "Saving..." : "Save Brand Profile"}
          </Button>
        </div>
      </div>

      {/* HubSpot import panel */}
      {(hsError || hasHsContent !== undefined) && (
        <>
          {hsError && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 text-sm" data-testid="hubspot-brand-error">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">Couldn't load HubSpot data</p>
                <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">{(hsError as Error).message}</p>
                <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">Make sure a HubSpot Company ID is linked on the HubSpot tab.</p>
              </div>
            </div>
          )}
          {hsData && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 overflow-hidden" data-testid="hubspot-brand-panel">
              <div className="flex items-center justify-between px-4 py-3 border-b border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">HubSpot Data</span>
                  {hsImported && <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border-green-300">Applied</Badge>}
                </div>
                {hasHsContent && !hsImported && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300"
                    onClick={applyHubSpotData}
                    data-testid="button-apply-hubspot-brand"
                  >
                    Apply to form
                  </Button>
                )}
              </div>
              <div className="px-4 py-3 space-y-2">
                {HS_FIELD_LABELS.map(({ key, label, mapsTo }) => {
                  const val = hsData[key];
                  return (
                    <div key={key} className="flex items-start gap-3 text-sm">
                      <span className="text-blue-600 dark:text-blue-400 w-44 shrink-0 text-xs pt-0.5">{label} → <span className="font-medium">{mapsTo}</span></span>
                      <span className={`flex-1 text-xs ${val ? "text-foreground" : "text-muted-foreground italic"}`}>
                        {val || "Not set in HubSpot"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

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

// ─── Idea Board ───────────────────────────────────────────────────────────────

function IdeaItem({ item, companyId, onUpdate, onDelete }: {
  item: CompanyKnowledgeItem;
  companyId: string;
  onUpdate: (id: string, data: { title?: string; content?: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingContent, setEditingContent] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content || "");
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (editingTitle) titleRef.current?.focus(); }, [editingTitle]);
  useEffect(() => { if (editingContent) contentRef.current?.focus(); }, [editingContent]);

  const saveTitle = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== item.title) onUpdate(item.id, { title: trimmed });
    else setTitle(item.title);
    setEditingTitle(false);
  };

  const saveContent = () => {
    if (content !== (item.content || "")) onUpdate(item.id, { content });
    setEditingContent(false);
  };

  return (
    <div className="group flex items-start gap-2 px-3 py-2.5 rounded-lg border bg-card hover:bg-muted/20 transition-colors">
      <GripVertical className="w-3.5 h-3.5 mt-0.5 text-muted-foreground/30 shrink-0 cursor-grab" />
      <div className="flex-1 min-w-0 space-y-1">
        {editingTitle ? (
          <Input
            ref={titleRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault(); saveTitle(); }
              if (e.key === "Escape") { setTitle(item.title); setEditingTitle(false); }
            }}
            className="h-7 text-sm font-medium px-1 -mx-1 border-0 border-b rounded-none shadow-none focus-visible:ring-0"
            data-testid={`idea-title-input-${item.id}`}
          />
        ) : (
          <p
            className="text-sm font-medium cursor-text hover:text-primary transition-colors leading-snug"
            onClick={() => setEditingTitle(true)}
            data-testid={`idea-title-${item.id}`}
          >
            {item.title}
          </p>
        )}
        {editingContent ? (
          <Textarea
            ref={contentRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            onBlur={saveContent}
            onKeyDown={e => {
              if (e.key === "Escape") { setContent(item.content || ""); setEditingContent(false); }
            }}
            className="text-xs text-muted-foreground min-h-[56px] resize-none border-0 border-b rounded-none shadow-none focus-visible:ring-0 px-0 py-0.5"
            placeholder="Add notes, details, links…"
            data-testid={`idea-content-input-${item.id}`}
          />
        ) : (
          <p
            className="text-xs text-muted-foreground whitespace-pre-wrap cursor-text hover:text-foreground/80 transition-colors leading-relaxed"
            onClick={() => setEditingContent(true)}
            data-testid={`idea-content-${item.id}`}
          >
            {item.content || <span className="italic opacity-40">+ Add notes…</span>}
          </p>
        )}
      </div>
      <button
        onClick={() => onDelete(item.id)}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0 mt-0.5"
        data-testid={`button-delete-idea-${item.id}`}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function IdeaBoard({ name, items, onAdd, onUpdate, onDelete, onRename, companyId }: {
  name: string;
  items: CompanyKnowledgeItem[];
  companyId: string;
  onAdd: (item: { title: string; content: string }) => void;
  onUpdate: (id: string, data: { title?: string; content?: string }) => void;
  onDelete: (id: string) => void;
  onRename: (oldName: string, newName: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [boardName, setBoardName] = useState(name);
  const newTitleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (addingItem) newTitleRef.current?.focus(); }, [addingItem]);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onAdd({ title: newTitle.trim(), content: newContent });
    setNewTitle("");
    setNewContent("");
    setAddingItem(false);
  };

  const saveBoardName = () => {
    const trimmed = boardName.trim();
    if (trimmed && trimmed !== name) onRename(name, trimmed);
    else setBoardName(name);
    setEditingName(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid={`board-collapse-${name}`}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`} />
          </button>
          {editingName ? (
            <Input
              autoFocus
              value={boardName}
              onChange={e => setBoardName(e.target.value)}
              onBlur={saveBoardName}
              onKeyDown={e => {
                if (e.key === "Enter") saveBoardName();
                if (e.key === "Escape") { setBoardName(name); setEditingName(false); }
              }}
              className="h-6 text-sm font-semibold px-1 border-0 border-b rounded-none shadow-none focus-visible:ring-0 flex-1"
            />
          ) : (
            <button
              className="flex items-center gap-2 flex-1 text-left group/name"
              onClick={() => setEditingName(true)}
              data-testid={`board-name-${name}`}
            >
              <span className="font-semibold text-sm">{name}</span>
              <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover/name:opacity-100 transition-opacity" />
            </button>
          )}
          <Badge variant="secondary" className="text-xs font-mono shrink-0">{items.length}</Badge>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 shrink-0"
            onClick={() => { setCollapsed(false); setAddingItem(true); }}
            data-testid={`button-add-idea-${name}`}
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </Button>
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="px-4 pb-3 space-y-1.5">
          {items.map(item => (
            <IdeaItem
              key={item.id}
              item={item}
              companyId={companyId}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
          {items.length === 0 && !addingItem && (
            <p className="text-xs text-muted-foreground italic text-center py-3 opacity-60">
              No items yet — click Add to start
            </p>
          )}
          {addingItem && (
            <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
              <Input
                ref={newTitleRef}
                placeholder="Title…"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="h-7 text-sm"
                onKeyDown={e => {
                  if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
                  if (e.key === "Escape") { setAddingItem(false); setNewTitle(""); setNewContent(""); }
                }}
                data-testid="input-new-idea-title"
              />
              <Textarea
                placeholder="Notes, details, links… (optional)"
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                className="text-sm min-h-[52px] resize-none"
                data-testid="input-new-idea-content"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd} disabled={!newTitle.trim()} data-testid="button-save-new-idea">
                  Add Item
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setAddingItem(false); setNewTitle(""); setNewContent(""); }}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function IdeasSection({ companyId }: { companyId: string }) {
  const { toast } = useToast();
  const [addingBoard, setAddingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");

  const { data: allItems = [], isLoading } = useQuery<CompanyKnowledgeItem[]>({
    queryKey: ["/api/companies", companyId, "knowledge"],
    queryFn: async () => {
      const r = await fetch(`/api/companies/${companyId}/knowledge`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!companyId,
  });

  const items = useMemo(() => allItems.filter(i => i.section === "ideas"), [allItems]);

  const boards = useMemo(() => {
    const map: Record<string, CompanyKnowledgeItem[]> = {};
    for (const item of items) {
      const key = item.url || "General";
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return map;
  }, [items]);

  const boardNames = Object.keys(boards);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "knowledge"] });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; content: string; url: string }) =>
      apiRequest("POST", `/api/companies/${companyId}/knowledge`, { section: "ideas", ...data, sortOrder: 0 }),
    onSuccess: invalidate,
    onError: () => toast({ title: "Failed to add item", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; content?: string }) =>
      apiRequest("PATCH", `/api/companies/${companyId}/knowledge/${id}`, data),
    onSuccess: invalidate,
    onError: () => toast({ title: "Failed to update item", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/companies/${companyId}/knowledge/${id}`),
    onSuccess: invalidate,
    onError: () => toast({ title: "Failed to delete item", variant: "destructive" }),
  });

  const renameBoardMutation = useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      const boardItems = boards[oldName] || [];
      await Promise.all(
        boardItems.map(item =>
          apiRequest("PATCH", `/api/companies/${companyId}/knowledge/${item.id}`, { url: newName })
        )
      );
    },
    onSuccess: invalidate,
    onError: () => toast({ title: "Failed to rename board", variant: "destructive" }),
  });

  const addBoard = () => {
    if (!newBoardName.trim()) return;
    createMutation.mutate({ title: "New idea", content: "", url: newBoardName.trim() });
    setNewBoardName("");
    setAddingBoard(false);
  };

  if (isLoading) return (
    <div className="space-y-4">
      {[1, 2].map(i => <Skeleton key={i} className="h-32" />)}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold">Idea Board</h3>
          <p className="text-sm text-muted-foreground">Strategy notes, campaign ideas, and opportunities — click any item to edit</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setAddingBoard(true)} data-testid="button-add-board">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Board
        </Button>
      </div>

      {addingBoard && (
        <div className="flex gap-2 p-3 border rounded-lg bg-muted/20">
          <Input
            autoFocus
            placeholder="Board name (e.g. Q4 Campaign Ideas, Website Refresh…)"
            value={newBoardName}
            onChange={e => setNewBoardName(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") addBoard();
              if (e.key === "Escape") { setAddingBoard(false); setNewBoardName(""); }
            }}
            className="h-8 text-sm"
            data-testid="input-new-board-name"
          />
          <Button size="sm" onClick={addBoard} disabled={!newBoardName.trim()} data-testid="button-create-board">
            Create
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setAddingBoard(false); setNewBoardName(""); }}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {boardNames.length === 0 && !addingBoard ? (
        <Card>
          <CardContent className="pt-10 pb-10 text-center">
            <Lightbulb className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No boards yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Create boards to organize campaign ideas, strategy notes, and client opportunities.
            </p>
            <Button size="sm" variant="outline" className="mt-4" onClick={() => setAddingBoard(true)} data-testid="button-create-first-board">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Create First Board
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {boardNames.map(boardName => (
            <IdeaBoard
              key={boardName}
              name={boardName}
              items={boards[boardName]}
              companyId={companyId}
              onAdd={({ title, content }) =>
                createMutation.mutate({ title, content, url: boardName })
              }
              onUpdate={(id, data) => updateMutation.mutate({ id, ...data })}
              onDelete={id => deleteMutation.mutate(id)}
              onRename={(oldName, newName) => renameBoardMutation.mutate({ oldName, newName })}
            />
          ))}
        </div>
      )}
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
        {activeSection === "profile"     && <CompanyProfileSection companyId={companyId} />}
        {activeSection === "brand"       && <BrandProfileSection companyId={companyId} />}
        {activeSection === "links"       && <LinksSection companyId={companyId} />}
        {activeSection === "credentials" && <CredentialsSection companyId={companyId} />}
        {activeSection === "ideas"       && <IdeasSection companyId={companyId} />}
        {activeSection === "hubspot"     && <HubSpotPlaceholder onNavigate={onNavigateToTab ? () => onNavigateToTab("hubspot") : undefined} />}
      </div>
    </div>
  );
}
