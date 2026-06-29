import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { GovernmentProfile, GovernmentPortal } from "@shared/schema";
import {
  Landmark, Phone, MapPin, Building2, CreditCard, Globe,
  Key, Hash, FileText, Plus, Trash2, Save, Eye, EyeOff,
  Copy, Check, ExternalLink, Pencil, ChevronDown, ChevronUp,
  ShieldCheck,
} from "lucide-react";

export interface GovernmentHubProps {
  companyId: string;
  isAdmin?: boolean;
}

const NAV_SECTIONS = [
  { key: "identifiers" as const, label: "Business IDs",     icon: Landmark },
  { key: "contact"     as const, label: "Contact & Address", icon: MapPin },
  { key: "banking"     as const, label: "Banking Info",      icon: CreditCard },
  { key: "portals"     as const, label: "Portal Logins",     icon: Key },
  { key: "naics"       as const, label: "NAICS Codes",       icon: Hash },
  { key: "capabilities"as const, label: "Capabilities",      icon: FileText },
];
type SectionKey = typeof NAV_SECTIONS[number]["key"];

const PORTAL_CATEGORIES = [
  { value: "federal", label: "Federal" },
  { value: "state",   label: "State" },
  { value: "county",  label: "County" },
  { value: "national",label: "National" },
  { value: "other",   label: "Other" },
];

const CATEGORY_COLORS: Record<string, string> = {
  federal:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  state:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  county:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  national: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  other:    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const DEFAULT_PORTALS = [
  { name: "SAM.gov",                    url: "https://sam.gov/",                                            category: "federal",  notes: "Federal Opportunities" },
  { name: "My Florida Marketplace",     url: "https://vendor.myfloridamarketplace.com/",                    category: "state",    notes: "Florida State Opportunities" },
  { name: "Instant Markets",            url: "https://instantmarkets.com/",                                  category: "national", notes: "National – local, state, and federal opportunities" },
  { name: "OpenGov",                    url: "https://procurement.opengov.com/login",                        category: "county",   notes: "Pinellas, Hernando, & Citrus Counties" },
  { name: "Bonfire",                    url: "https://vendor.bonfirehub.com/",                               category: "county",   notes: "Hillsborough, Broward, Pasco Counties" },
  { name: "VendorLink",                 url: "https://www.myvendorlink.com/external/home",                   category: "county",   notes: "Multiple Counties, Utilities, Sports Authority & More" },
];

// ── Field helpers ──────────────────────────────────────────────────────────────
function Field({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(value).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-mono select-all break-all">{secret && !show ? "••••••••••••" : value}</p>
        {secret && (
          <button onClick={() => setShow(s => !s)} className="text-muted-foreground hover:text-foreground p-0.5" data-testid={`toggle-${label.replace(/\s/g,"-").toLowerCase()}`}>
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
        {value && (
          <button onClick={copy} className="text-muted-foreground hover:text-foreground p-0.5" data-testid={`copy-${label.replace(/\s/g,"-").toLowerCase()}`}>
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Identifiers Section ───────────────────────────────────────────────────────
function IdentifiersSection({ companyId, isAdmin }: { companyId: string; isAdmin?: boolean }) {
  const { toast } = useToast();
  const { data: profile, isLoading } = useQuery<GovernmentProfile | null>({
    queryKey: ["/api/companies", companyId, "government-profile"],
    queryFn: async () => {
      const r = await fetch(`/api/companies/${companyId}/government-profile`, { credentials: "include" });
      if (r.status === 404 || r.status === 403) return null;
      if (!r.ok) return null;
      return r.json();
    },
    enabled: !!companyId,
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fein: "", dunsNumber: "", ueiNumber: "", cageCode: "", cageCodeNotes: "", stateRegistrationUrl: "" });

  useEffect(() => {
    if (profile !== undefined) {
      setForm({
        fein: profile?.fein || "",
        dunsNumber: profile?.dunsNumber || "",
        ueiNumber: profile?.ueiNumber || "",
        cageCode: profile?.cageCode || "",
        cageCodeNotes: profile?.cageCodeNotes || "",
        stateRegistrationUrl: profile?.stateRegistrationUrl || "",
      });
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/companies/${companyId}/government-profile`, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "government-profile"] });
      toast({ title: "Business IDs saved" });
      setEditing(false);
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  if (isLoading) return <Skeleton className="h-48" />;

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold">Business Identifiers</h3>
          <p className="text-sm text-muted-foreground">Federal registration numbers and codes</p>
        </div>
        {isAdmin && (
          <Button size="sm" variant={editing ? "default" : "outline"} onClick={() => editing ? save.mutate() : setEditing(true)} disabled={save.isPending} data-testid="button-edit-business-ids">
            {editing ? <><Save className="w-3.5 h-3.5 mr-1.5" />{save.isPending ? "Saving…" : "Save"}</> : <><Pencil className="w-3.5 h-3.5 mr-1.5" />Edit</>}
          </Button>
        )}
        {editing && <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
      </div>

      <Card>
        <CardContent className="pt-5">
          {editing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: "fein" as const, label: "FEIN (Federal EIN)" },
                { key: "dunsNumber" as const, label: "DUNS Number (D&B)" },
                { key: "ueiNumber" as const, label: "UEI Number" },
                { key: "cageCode" as const, label: "CAGE Code" },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-xs">{f.label}</Label>
                  <Input value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={`Enter ${f.label}`} data-testid={`input-${f.key}`} />
                </div>
              ))}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">CAGE Code Notes</Label>
                <Input value={form.cageCodeNotes} onChange={e => set("cageCodeNotes", e.target.value)} placeholder="e.g. Waiting on it (11/26/2025)" data-testid="input-cageCodeNotes" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">State Registration URL (Sunbiz, SOS, etc.)</Label>
                <Input value={form.stateRegistrationUrl} onChange={e => set("stateRegistrationUrl", e.target.value)} placeholder="https://search.sunbiz.org/..." data-testid="input-stateRegistrationUrl" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              <Field label="FEIN" value={profile?.fein || ""} />
              <Field label="DUNS Number" value={profile?.dunsNumber || ""} />
              <Field label="UEI Number" value={profile?.ueiNumber || ""} />
              <Field label="CAGE Code" value={profile?.cageCode || ""} />
              {profile?.cageCodeNotes && <Field label="CAGE Notes" value={profile.cageCodeNotes} />}
              {profile?.stateRegistrationUrl && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">State Registration</p>
                  <a href={profile.stateRegistrationUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> View Registration
                  </a>
                </div>
              )}
              {!profile?.fein && !profile?.dunsNumber && !profile?.ueiNumber && !profile?.cageCode && (
                <p className="col-span-3 text-sm text-muted-foreground py-2">{isAdmin ? "No business IDs added yet. Click Edit to add." : "Business IDs not yet configured."}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Contact & Address Section ─────────────────────────────────────────────────
function ContactSection({ companyId, isAdmin }: { companyId: string; isAdmin?: boolean }) {
  const { toast } = useToast();
  const { data: profile, isLoading } = useQuery<GovernmentProfile | null>({
    queryKey: ["/api/companies", companyId, "government-profile"],
    queryFn: async () => {
      const r = await fetch(`/api/companies/${companyId}/government-profile`, { credentials: "include" });
      if (r.status === 404 || r.status === 403) return null;
      if (!r.ok) return null;
      return r.json();
    },
    enabled: !!companyId,
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ physicalAddress: "", mailingAddress: "", businessEmail: "", phones: "[]" });
  const [phones, setPhones] = useState<{ label: string; number: string }[]>([]);

  useEffect(() => {
    if (profile !== undefined) {
      setForm({
        physicalAddress: profile?.physicalAddress || "",
        mailingAddress: profile?.mailingAddress || "",
        businessEmail: profile?.businessEmail || "",
        phones: profile?.phones || "[]",
      });
      try { setPhones(JSON.parse(profile?.phones || "[]")); } catch { setPhones([]); }
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/companies/${companyId}/government-profile`, { ...form, phones: JSON.stringify(phones) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "government-profile"] });
      toast({ title: "Contact info saved" });
      setEditing(false);
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  if (isLoading) return <Skeleton className="h-48" />;

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));
  const parsedPhones = (() => { try { return JSON.parse(profile?.phones || "[]"); } catch { return []; } })();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold">Contact & Address</h3>
          <p className="text-sm text-muted-foreground">Phone numbers, email, and physical locations</p>
        </div>
        {isAdmin && (
          <Button size="sm" variant={editing ? "default" : "outline"} onClick={() => editing ? save.mutate() : setEditing(true)} disabled={save.isPending} data-testid="button-edit-contact">
            {editing ? <><Save className="w-3.5 h-3.5 mr-1.5" />{save.isPending ? "Saving…" : "Save"}</> : <><Pencil className="w-3.5 h-3.5 mr-1.5" />Edit</>}
          </Button>
        )}
        {editing && <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
      </div>

      <Card>
        <CardContent className="pt-5 space-y-4">
          {editing ? (
            <>
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone Numbers</Label>
                {phones.map((ph, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input className="w-28 flex-shrink-0" placeholder="Label" value={ph.label} onChange={e => setPhones(ps => ps.map((p, j) => j === i ? { ...p, label: e.target.value } : p))} data-testid={`input-phone-label-${i}`} />
                    <Input className="flex-1" placeholder="Phone number" value={ph.number} onChange={e => setPhones(ps => ps.map((p, j) => j === i ? { ...p, number: e.target.value } : p))} data-testid={`input-phone-number-${i}`} />
                    <Button size="icon" variant="ghost" onClick={() => setPhones(ps => ps.filter((_, j) => j !== i))} data-testid={`button-remove-phone-${i}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setPhones(ps => [...ps, { label: "", number: "" }])} data-testid="button-add-phone">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />Add Phone
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Business Email</Label>
                <Input value={form.businessEmail} onChange={e => set("businessEmail", e.target.value)} placeholder="email@company.com" data-testid="input-businessEmail" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Physical Address</Label>
                  <Textarea value={form.physicalAddress} onChange={e => set("physicalAddress", e.target.value)} placeholder="Street, City, State ZIP" rows={2} data-testid="input-physicalAddress" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Mailing Address</Label>
                  <Textarea value={form.mailingAddress} onChange={e => set("mailingAddress", e.target.value)} placeholder="P.O. Box or mailing address" rows={2} data-testid="input-mailingAddress" />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {parsedPhones.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Phone Numbers</p>
                  {parsedPhones.map((ph: { label: string; number: string }, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      {ph.label && <span className="text-muted-foreground">{ph.label}:</span>}
                      <span className="font-mono">{ph.number}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Business Email" value={profile?.businessEmail || ""} />
                <Field label="Physical Address" value={profile?.physicalAddress || ""} />
                <Field label="Mailing Address" value={profile?.mailingAddress || ""} />
              </div>
              {!parsedPhones.length && !profile?.businessEmail && !profile?.physicalAddress && (
                <p className="text-sm text-muted-foreground">{isAdmin ? "No contact info added yet. Click Edit to add." : "Contact info not yet configured."}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Banking Section ────────────────────────────────────────────────────────────
function BankingSection({ companyId, isAdmin }: { companyId: string; isAdmin?: boolean }) {
  const { toast } = useToast();
  const { data: profile, isLoading } = useQuery<GovernmentProfile | null>({
    queryKey: ["/api/companies", companyId, "government-profile"],
    queryFn: async () => {
      const r = await fetch(`/api/companies/${companyId}/government-profile`, { credentials: "include" });
      if (r.status === 404 || r.status === 403) return null;
      if (!r.ok) return null;
      return r.json();
    },
    enabled: !!companyId,
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ bankingRoutingNumber: "", bankingAccountNumber: "", bankingInstitution: "" });

  useEffect(() => {
    if (profile !== undefined) {
      setForm({
        bankingRoutingNumber: profile?.bankingRoutingNumber || "",
        bankingAccountNumber: profile?.bankingAccountNumber || "",
        bankingInstitution: profile?.bankingInstitution || "",
      });
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/companies/${companyId}/government-profile`, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "government-profile"] });
      toast({ title: "Banking info saved" });
      setEditing(false);
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  if (isLoading) return <Skeleton className="h-32" />;

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold">Banking Information</h3>
          <p className="text-sm text-muted-foreground">Routing and account numbers for payments and ACH</p>
        </div>
        {isAdmin && (
          <Button size="sm" variant={editing ? "default" : "outline"} onClick={() => editing ? save.mutate() : setEditing(true)} disabled={save.isPending} data-testid="button-edit-banking">
            {editing ? <><Save className="w-3.5 h-3.5 mr-1.5" />{save.isPending ? "Saving…" : "Save"}</> : <><Pencil className="w-3.5 h-3.5 mr-1.5" />Edit</>}
          </Button>
        )}
        {editing && <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
      </div>

      <Card>
        <CardContent className="pt-5">
          {editing ? (
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Financial Institution</Label>
                <Input value={form.bankingInstitution} onChange={e => set("bankingInstitution", e.target.value)} placeholder="Bank name" data-testid="input-bankingInstitution" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Routing Number</Label>
                <Input value={form.bankingRoutingNumber} onChange={e => set("bankingRoutingNumber", e.target.value)} placeholder="9-digit routing number" data-testid="input-bankingRoutingNumber" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Account Number</Label>
                <Input value={form.bankingAccountNumber} onChange={e => set("bankingAccountNumber", e.target.value)} placeholder="Checking account number" data-testid="input-bankingAccountNumber" />
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-5">
              <Field label="Financial Institution" value={profile?.bankingInstitution || ""} />
              <Field label="Routing Number" value={profile?.bankingRoutingNumber || ""} secret />
              <Field label="Account Number" value={profile?.bankingAccountNumber || ""} secret />
              {!profile?.bankingRoutingNumber && !profile?.bankingAccountNumber && (
                <p className="col-span-3 text-sm text-muted-foreground">{isAdmin ? "No banking info added yet. Click Edit to add." : "Banking info not yet configured."}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Portal Card ────────────────────────────────────────────────────────────────
function PortalCard({ portal, isAdmin, onEdit, onDelete }: { portal: GovernmentPortal; isAdmin?: boolean; onEdit: () => void; onDelete: () => void }) {
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (val: string, key: string) => {
    navigator.clipboard.writeText(val).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <Card className="group" data-testid={`portal-card-${portal.id}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{portal.name}</p>
              {portal.url && (
                <a href={portal.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5 truncate">
                  <ExternalLink className="w-3 h-3 shrink-0" />{portal.url}
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Badge className={`text-xs px-2 py-0.5 ${CATEGORY_COLORS[portal.category] || CATEGORY_COLORS.other}`}>
              {PORTAL_CATEGORIES.find(c => c.value === portal.category)?.label || portal.category}
            </Badge>
            {isAdmin && (
              <>
                <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={onEdit} data-testid={`button-edit-portal-${portal.id}`}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive" onClick={onDelete} data-testid={`button-delete-portal-${portal.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {portal.username && (
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Username</p>
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs truncate">{portal.username}</span>
                <button onClick={() => copy(portal.username!, "user-" + portal.id)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                  {copied === "user-" + portal.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          )}
          {portal.password && (
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Password</p>
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs">{showPw ? portal.password : "••••••••"}</span>
                <button onClick={() => setShowPw(s => !s)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                  {showPw ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
                <button onClick={() => copy(portal.password!, "pw-" + portal.id)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                  {copied === "pw-" + portal.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {portal.notes && <p className="text-xs text-muted-foreground mt-2 border-t pt-2">{portal.notes}</p>}
        {portal.registeredDate && <p className="text-xs text-muted-foreground mt-1">Registered: {portal.registeredDate}</p>}
      </CardContent>
    </Card>
  );
}

// ── Portal Edit Dialog ─────────────────────────────────────────────────────────
function PortalDialog({ portal, companyId, onClose }: { portal: Partial<GovernmentPortal> | null; companyId: string; onClose: () => void }) {
  const { toast } = useToast();
  const isNew = !portal?.id;
  const [form, setForm] = useState({
    name: portal?.name || "",
    url: portal?.url || "",
    username: portal?.username || "",
    password: portal?.password || "",
    notes: portal?.notes || "",
    category: portal?.category || "federal",
    registeredDate: portal?.registeredDate || "",
    registrationNotes: portal?.registrationNotes || "",
  });

  const save = useMutation({
    mutationFn: () => isNew
      ? apiRequest("POST", `/api/companies/${companyId}/government-portals`, form)
      : apiRequest("PUT", `/api/government-portals/${portal!.id}`, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "government-portals"] });
      toast({ title: isNew ? "Portal added" : "Portal updated" });
      onClose();
    },
    onError: () => toast({ title: "Failed to save portal", variant: "destructive" }),
  });

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-portal-edit">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add Portal" : "Edit Portal"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Portal Name *</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. SAM.gov" data-testid="input-portal-name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger data-testid="select-portal-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PORTAL_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">URL</Label>
            <Input value={form.url} onChange={e => set("url", e.target.value)} placeholder="https://..." data-testid="input-portal-url" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Username / Email</Label>
              <Input value={form.username} onChange={e => set("username", e.target.value)} placeholder="Login email" data-testid="input-portal-username" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Password</Label>
              <Input type="text" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Password" data-testid="input-portal-password" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Registered Date</Label>
              <Input value={form.registeredDate} onChange={e => set("registeredDate", e.target.value)} placeholder="e.g. 11/26/2025" data-testid="input-portal-registeredDate" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Registration Notes</Label>
              <Input value={form.registrationNotes} onChange={e => set("registrationNotes", e.target.value)} placeholder="e.g. Active" data-testid="input-portal-registrationNotes" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes (scope/description)</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="e.g. Federal Opportunities, Pinellas County, etc." rows={2} data-testid="input-portal-notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name} data-testid="button-save-portal">
            <Save className="w-3.5 h-3.5 mr-1.5" />{save.isPending ? "Saving…" : "Save Portal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Portals Section ────────────────────────────────────────────────────────────
function PortalsSection({ companyId, isAdmin }: { companyId: string; isAdmin?: boolean }) {
  const { toast } = useToast();
  const [editingPortal, setEditingPortal] = useState<Partial<GovernmentPortal> | null | false>(false);
  const [filterCat, setFilterCat] = useState<string>("all");

  const { data: portals = [], isLoading } = useQuery<GovernmentPortal[]>({
    queryKey: ["/api/companies", companyId, "government-portals"],
    queryFn: async () => {
      const r = await fetch(`/api/companies/${companyId}/government-portals`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!companyId,
  });

  const deletePortal = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/government-portals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "government-portals"] });
      toast({ title: "Portal removed" });
    },
    onError: () => toast({ title: "Failed to delete portal", variant: "destructive" }),
  });

  const seedDefaults = useMutation({
    mutationFn: async () => {
      for (const p of DEFAULT_PORTALS) {
        await apiRequest("POST", `/api/companies/${companyId}/government-portals`, p);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "government-portals"] });
      toast({ title: "Default portals added", description: "Fill in credentials for each portal." });
    },
    onError: () => toast({ title: "Failed to seed portals", variant: "destructive" }),
  });

  const filtered = filterCat === "all" ? portals : portals.filter(p => p.category === filterCat);

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold">Portal Logins</h3>
          <p className="text-sm text-muted-foreground">Login credentials for government procurement portals</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            {portals.length === 0 && (
              <Button size="sm" variant="outline" onClick={() => seedDefaults.mutate()} disabled={seedDefaults.isPending} data-testid="button-seed-portals">
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />{seedDefaults.isPending ? "Adding…" : "Add Default Portals"}
              </Button>
            )}
            <Button size="sm" onClick={() => setEditingPortal({})} data-testid="button-add-portal">
              <Plus className="w-3.5 h-3.5 mr-1.5" />Add Portal
            </Button>
          </div>
        )}
      </div>

      {portals.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {["all", ...PORTAL_CATEGORIES.map(c => c.value)].map(cat => {
            const count = cat === "all" ? portals.length : portals.filter(p => p.category === cat).length;
            if (count === 0 && cat !== "all") return null;
            return (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`px-2.5 py-1 rounded-full text-xs transition-colors ${filterCat === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                data-testid={`filter-portal-${cat}`}
              >
                {cat === "all" ? "All" : PORTAL_CATEGORIES.find(c => c.value === cat)?.label} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Key className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">
              {portals.length === 0
                ? isAdmin ? "No portals yet. Use \"Add Default Portals\" to add common ones, or add manually." : "No portal logins configured yet."
                : "No portals match this filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map(p => (
            <PortalCard
              key={p.id}
              portal={p}
              isAdmin={isAdmin}
              onEdit={() => setEditingPortal(p)}
              onDelete={() => deletePortal.mutate(p.id)}
            />
          ))}
        </div>
      )}

      {editingPortal !== false && (
        <PortalDialog portal={editingPortal} companyId={companyId} onClose={() => setEditingPortal(false)} />
      )}
    </div>
  );
}

// ── NAICS Codes Section ───────────────────────────────────────────────────────
function NaicsSection({ companyId, isAdmin }: { companyId: string; isAdmin?: boolean }) {
  const { toast } = useToast();
  const { data: profile, isLoading } = useQuery<GovernmentProfile | null>({
    queryKey: ["/api/companies", companyId, "government-profile"],
    queryFn: async () => {
      const r = await fetch(`/api/companies/${companyId}/government-profile`, { credentials: "include" });
      if (r.status === 404 || r.status === 403) return null;
      if (!r.ok) return null;
      return r.json();
    },
    enabled: !!companyId,
  });

  const [editing, setEditing] = useState(false);
  const [naics, setNaics] = useState<{ code: string; description: string }[]>([]);
  const [commodityText, setCommodityText] = useState("");

  useEffect(() => {
    if (profile !== undefined) {
      try { setNaics(JSON.parse(profile?.naicsCodes || "[]")); } catch { setNaics([]); }
      setCommodityText(profile?.commodityCodes || "");
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/companies/${companyId}/government-profile`, {
      naicsCodes: JSON.stringify(naics),
      commodityCodes: commodityText,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "government-profile"] });
      toast({ title: "Codes saved" });
      setEditing(false);
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const parsedNaics = (() => { try { return JSON.parse(profile?.naicsCodes || "[]"); } catch { return []; } })();

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold">NAICS & Commodity Codes</h3>
          <p className="text-sm text-muted-foreground">Industry classification and commodity codes for procurement</p>
        </div>
        {isAdmin && (
          <Button size="sm" variant={editing ? "default" : "outline"} onClick={() => editing ? save.mutate() : setEditing(true)} disabled={save.isPending} data-testid="button-edit-naics">
            {editing ? <><Save className="w-3.5 h-3.5 mr-1.5" />{save.isPending ? "Saving…" : "Save"}</> : <><Pencil className="w-3.5 h-3.5 mr-1.5" />Edit</>}
          </Button>
        )}
        {editing && <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
      </div>

      <Card>
        <CardContent className="pt-5 space-y-5">
          <div className="space-y-3">
            <p className="text-sm font-medium">NAICS Codes</p>
            {editing ? (
              <>
                {naics.map((n, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input className="w-28 flex-shrink-0 font-mono text-sm" placeholder="Code" value={n.code} onChange={e => setNaics(ps => ps.map((p, j) => j === i ? { ...p, code: e.target.value } : p))} data-testid={`input-naics-code-${i}`} />
                    <Input className="flex-1 text-sm" placeholder="Description" value={n.description} onChange={e => setNaics(ps => ps.map((p, j) => j === i ? { ...p, description: e.target.value } : p))} data-testid={`input-naics-desc-${i}`} />
                    <Button size="icon" variant="ghost" onClick={() => setNaics(ps => ps.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setNaics(ps => [...ps, { code: "", description: "" }])} data-testid="button-add-naics">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />Add NAICS Code
                </Button>
              </>
            ) : parsedNaics.length > 0 ? (
              <div className="space-y-1.5">
                {parsedNaics.map((n: { code: string; description: string }, i: number) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <Badge variant="outline" className="font-mono text-xs flex-shrink-0">{n.code}</Badge>
                    <span className="text-muted-foreground">{n.description}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{isAdmin ? "No NAICS codes yet." : "Not yet configured."}</p>
            )}
          </div>

          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">Commodity Codes</p>
            {editing ? (
              <Textarea value={commodityText} onChange={e => setCommodityText(e.target.value)} placeholder="Enter commodity codes, one per line or comma-separated..." rows={4} data-testid="input-commodity-codes" />
            ) : (
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{profile?.commodityCodes || (isAdmin ? "No commodity codes yet." : "Not yet configured.")}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Capabilities Section ──────────────────────────────────────────────────────
function CapabilitiesSection({ companyId, isAdmin }: { companyId: string; isAdmin?: boolean }) {
  const { toast } = useToast();
  const { data: profile, isLoading } = useQuery<GovernmentProfile | null>({
    queryKey: ["/api/companies", companyId, "government-profile"],
    queryFn: async () => {
      const r = await fetch(`/api/companies/${companyId}/government-profile`, { credentials: "include" });
      if (r.status === 404 || r.status === 403) return null;
      if (!r.ok) return null;
      return r.json();
    },
    enabled: !!companyId,
  });

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (profile !== undefined) setText(profile?.capabilitiesStatement || "");
  }, [profile]);

  const save = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/companies/${companyId}/government-profile`, { capabilitiesStatement: text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "government-profile"] });
      toast({ title: "Capabilities statement saved" });
      setEditing(false);
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold">Capabilities Statement</h3>
          <p className="text-sm text-muted-foreground">Company capabilities for government contract solicitations</p>
        </div>
        {isAdmin && (
          <Button size="sm" variant={editing ? "default" : "outline"} onClick={() => editing ? save.mutate() : setEditing(true)} disabled={save.isPending} data-testid="button-edit-capabilities">
            {editing ? <><Save className="w-3.5 h-3.5 mr-1.5" />{save.isPending ? "Saving…" : "Save"}</> : <><Pencil className="w-3.5 h-3.5 mr-1.5" />Edit</>}
          </Button>
        )}
        {editing && <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
      </div>

      <Card>
        <CardContent className="pt-5">
          {editing ? (
            <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Describe the company's core competencies, past performance, differentiators, and contract history..." rows={12} className="text-sm leading-relaxed" data-testid="textarea-capabilities" />
          ) : (
            <div>
              {profile?.capabilitiesStatement ? (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{profile.capabilitiesStatement}</p>
              ) : (
                <p className="text-sm text-muted-foreground">{isAdmin ? "No capabilities statement yet. Click Edit to add one." : "Capabilities statement not yet configured."}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Government Hub ─────────────────────────────────────────────────────────────
export function GovernmentHub({ companyId, isAdmin = false }: GovernmentHubProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>("identifiers");

  return (
    <div className="flex gap-6">
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
            data-testid={`gov-hub-nav-${s.key}`}
          >
            <s.icon className="w-4 h-4 shrink-0" />
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-w-0">
        {activeSection === "identifiers"  && <IdentifiersSection  companyId={companyId} isAdmin={isAdmin} />}
        {activeSection === "contact"      && <ContactSection      companyId={companyId} isAdmin={isAdmin} />}
        {activeSection === "banking"      && <BankingSection      companyId={companyId} isAdmin={isAdmin} />}
        {activeSection === "portals"      && <PortalsSection      companyId={companyId} isAdmin={isAdmin} />}
        {activeSection === "naics"        && <NaicsSection        companyId={companyId} isAdmin={isAdmin} />}
        {activeSection === "capabilities" && <CapabilitiesSection companyId={companyId} isAdmin={isAdmin} />}
      </div>
    </div>
  );
}
