import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Settings, Play, CheckCircle2, AlertTriangle, Plus, Eye, FileText,
  Calendar, DollarSign, Layers, ChevronRight, RefreshCw,
  Globe, Share2, Pencil, MonitorSmartphone, LayoutTemplate,
} from "lucide-react";

interface CompanyRetainerTabProps {
  companyId: string;
  companyName?: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500",
  draft: "bg-yellow-500",
  paused: "bg-orange-500",
  cancelled: "bg-red-500",
};

const CADENCE_LABEL: Record<string, string> = {
  monthly: "Monthly", quarterly: "Quarterly", annual: "Annual",
  once: "Once", weekly: "Weekly", custom: "Custom",
};

const ROLE_LABEL: Record<string, string> = {
  account_manager: "Account Manager", strategist: "Strategist",
  content_lead: "Content Lead", designer: "Designer",
  developer: "Developer", hubspot_specialist: "HubSpot Specialist",
  ads_manager: "Ads Manager",
};

function useRetainerAssignment(companyId: string) {
  return useQuery<any>({
    queryKey: [`/api/companies/${companyId}/retainer-assignment`],
  });
}

function useRetainerTemplates() {
  return useQuery<any[]>({ queryKey: ["/api/retainer-templates"] });
}

function useServiceTracks() {
  return useQuery<any[]>({ queryKey: ["/api/service-tracks"] });
}

function useServiceConfig(companyId: string) {
  return useQuery<any>({
    queryKey: [`/api/companies/${companyId}/service-config`],
  });
}

// ── Service Delivery constants ─────────────────────────────────────────────────
const HUBSPOT_HUBS = [
  { key: "marketing_starter", label: "Marketing Hub Starter", group: "Marketing" },
  { key: "marketing_pro", label: "Marketing Hub Professional", group: "Marketing" },
  { key: "marketing_enterprise", label: "Marketing Hub Enterprise", group: "Marketing" },
  { key: "sales_starter", label: "Sales Hub Starter", group: "Sales" },
  { key: "sales_pro", label: "Sales Hub Professional", group: "Sales" },
  { key: "sales_enterprise", label: "Sales Hub Enterprise", group: "Sales" },
  { key: "service_starter", label: "Service Hub Starter", group: "Service" },
  { key: "service_pro", label: "Service Hub Professional", group: "Service" },
  { key: "service_enterprise", label: "Service Hub Enterprise", group: "Service" },
  { key: "content_hub", label: "Content Hub", group: "Other" },
  { key: "ops_hub", label: "Operations Hub", group: "Other" },
];

const SOCIAL_TOOLS: Record<string, string> = {
  hubspot: "HubSpot",
  followr: "Followr",
  meta_suite: "Meta Business Suite",
  buffer: "Buffer / Hootsuite",
  other: "Other",
  not_managed: "Not managed by us",
};

const PLATFORM_LABELS: Record<string, string> = {
  hubspot: "HubSpot",
  wordpress: "WordPress",
  other: "Other platform",
  na: "Not in scope",
};

const WEBSITE_ACCESS_LABELS: Record<string, string> = {
  full_manage: "We fully manage",
  edit_access: "We have edit access",
  read_only: "Read-only access",
  no_access: "No access",
  na: "Not applicable",
};

const WEBSITE_ACCESS_COLORS: Record<string, string> = {
  full_manage: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  edit_access: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  read_only: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  no_access: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  na: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function parseHubs(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

// ── Service Delivery Edit Dialog ───────────────────────────────────────────────
function ServiceDeliveryEditDialog({
  open, onOpenChange, companyId, config,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  config: any;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [hubs, setHubs] = useState<string[]>(() => parseHubs(config?.hubspotHubs));
  const [portalId, setPortalId] = useState(config?.hubspotPortalId || "");
  const [socialTool, setSocialTool] = useState(config?.socialTool || "");
  const [socialNotes, setSocialNotes] = useState(config?.socialToolNotes || "");
  const [landingPlatform, setLandingPlatform] = useState(config?.landingPagePlatform || "");
  const [landingNotes, setLandingNotes] = useState(config?.landingPageNotes || "");
  const [blogPlatform, setBlogPlatform] = useState(config?.blogPlatform || "");
  const [blogNotes, setBlogNotes] = useState(config?.blogNotes || "");
  const [websiteAccess, setWebsiteAccess] = useState(config?.websiteAccess || "");
  const [websiteUrl, setWebsiteUrl] = useState(config?.websiteUrl || "");
  const [websiteNotes, setWebsiteNotes] = useState(config?.websiteNotes || "");

  // Sync when config changes (dialog re-opens)
  const [lastConfig, setLastConfig] = useState(config);
  if (config !== lastConfig) {
    setLastConfig(config);
    setHubs(parseHubs(config?.hubspotHubs));
    setPortalId(config?.hubspotPortalId || "");
    setSocialTool(config?.socialTool || "");
    setSocialNotes(config?.socialToolNotes || "");
    setLandingPlatform(config?.landingPagePlatform || "");
    setLandingNotes(config?.landingPageNotes || "");
    setBlogPlatform(config?.blogPlatform || "");
    setBlogNotes(config?.blogNotes || "");
    setWebsiteAccess(config?.websiteAccess || "");
    setWebsiteUrl(config?.websiteUrl || "");
    setWebsiteNotes(config?.websiteNotes || "");
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("PUT", `/api/companies/${companyId}/service-config`, {
        hubspotHubs: JSON.stringify(hubs),
        hubspotPortalId: portalId || null,
        socialTool: socialTool || null,
        socialToolNotes: socialNotes || null,
        landingPagePlatform: landingPlatform || null,
        landingPageNotes: landingNotes || null,
        blogPlatform: blogPlatform || null,
        blogNotes: blogNotes || null,
        websiteAccess: websiteAccess || null,
        websiteUrl: websiteUrl || null,
        websiteNotes: websiteNotes || null,
      });
      if (!r.ok) throw new Error("Failed to save");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/companies/${companyId}/service-config`] });
      toast({ title: "Service delivery details saved" });
      onOpenChange(false);
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  function toggleHub(key: string) {
    setHubs(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  const hubGroups = ["Marketing", "Sales", "Service", "Other"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Service Delivery Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-2">

          {/* HubSpot Portals */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">HubSpot Portals / Hubs</Label>
            <div className="space-y-3">
              {hubGroups.map(group => (
                <div key={group}>
                  <p className="text-xs text-muted-foreground font-medium mb-1.5 uppercase tracking-wide">{group}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    {HUBSPOT_HUBS.filter(h => h.group === group).map(hub => (
                      <div key={hub.key} className="flex items-center gap-2">
                        <Checkbox
                          id={`hub-${hub.key}`}
                          checked={hubs.includes(hub.key)}
                          onCheckedChange={() => toggleHub(hub.key)}
                          data-testid={`checkbox-hub-${hub.key}`}
                        />
                        <label htmlFor={`hub-${hub.key}`} className="text-sm cursor-pointer leading-tight">
                          {hub.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <Label htmlFor="portal-id" className="text-xs text-muted-foreground">HubSpot Portal ID (optional)</Label>
              <Input
                id="portal-id"
                value={portalId}
                onChange={e => setPortalId(e.target.value)}
                placeholder="e.g. 12345678"
                className="mt-1 h-8 text-sm"
                data-testid="input-hubspot-portal-id"
              />
            </div>
          </div>

          <Separator />

          {/* Social Media */}
          <div>
            <Label className="text-sm font-semibold mb-3 block flex items-center gap-2">
              <Share2 className="h-4 w-4" /> Social Media Management
            </Label>
            <Select value={socialTool} onValueChange={setSocialTool}>
              <SelectTrigger className="h-8 text-sm" data-testid="select-social-tool">
                <SelectValue placeholder="Select tool…" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SOCIAL_TOOLS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={socialNotes}
              onChange={e => setSocialNotes(e.target.value)}
              placeholder="Notes about social media setup…"
              className="mt-2 text-sm min-h-[56px]"
              data-testid="textarea-social-notes"
            />
          </div>

          <Separator />

          {/* Landing Pages & Blog */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                <LayoutTemplate className="h-4 w-4" /> Landing Pages
              </Label>
              <Select value={landingPlatform} onValueChange={setLandingPlatform}>
                <SelectTrigger className="h-8 text-sm" data-testid="select-landing-platform">
                  <SelectValue placeholder="Select platform…" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={landingNotes}
                onChange={e => setLandingNotes(e.target.value)}
                placeholder="Notes…"
                className="mt-2 text-sm min-h-[56px]"
                data-testid="textarea-landing-notes"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                <FileText className="h-4 w-4" /> Blog
              </Label>
              <Select value={blogPlatform} onValueChange={setBlogPlatform}>
                <SelectTrigger className="h-8 text-sm" data-testid="select-blog-platform">
                  <SelectValue placeholder="Select platform…" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={blogNotes}
                onChange={e => setBlogNotes(e.target.value)}
                placeholder="Notes…"
                className="mt-2 text-sm min-h-[56px]"
                data-testid="textarea-blog-notes"
              />
            </div>
          </div>

          <Separator />

          {/* Website Access */}
          <div>
            <Label className="text-sm font-semibold mb-3 block flex items-center gap-2">
              <Globe className="h-4 w-4" /> Website Access
            </Label>
            <Select value={websiteAccess} onValueChange={setWebsiteAccess}>
              <SelectTrigger className="h-8 text-sm" data-testid="select-website-access">
                <SelectValue placeholder="Select access level…" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(WEBSITE_ACCESS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              placeholder="Website URL (optional)"
              className="mt-2 h-8 text-sm"
              data-testid="input-website-url"
            />
            <Textarea
              value={websiteNotes}
              onChange={e => setWebsiteNotes(e.target.value)}
              placeholder="Notes about website access / login info location…"
              className="mt-2 text-sm min-h-[56px]"
              data-testid="textarea-website-notes"
            />
          </div>

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-service-delivery-cancel">
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-orange-500 hover:bg-orange-600 text-white"
            data-testid="button-service-delivery-save"
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Save Details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Service Delivery Card (admin, editable) ────────────────────────────────────
function ServiceDeliveryCard({ companyId }: { companyId: string }) {
  const [editOpen, setEditOpen] = useState(false);
  const { data: config, isLoading } = useServiceConfig(companyId);

  const hubs = parseHubs(config?.hubspotHubs);
  const hasAnyData = hubs.length > 0 || config?.socialTool || config?.landingPagePlatform
    || config?.blogPlatform || config?.websiteAccess;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
            Service Delivery Details
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setEditOpen(true)}
            data-testid="button-edit-service-delivery"
          >
            <Pencil className="h-3 w-3 mr-1" />
            {hasAnyData ? "Edit" : "Add Details"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : !hasAnyData ? (
          <p className="text-sm text-muted-foreground">
            No service delivery details added yet. Click <strong>Add Details</strong> to document HubSpot portals, social media tools, CMS platforms, and website access.
          </p>
        ) : (
          <div className="space-y-4 text-sm">

            {/* HubSpot Hubs */}
            {hubs.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1.5 uppercase tracking-wide">HubSpot Portals</p>
                <div className="flex flex-wrap gap-1.5">
                  {hubs.map(key => {
                    const hub = HUBSPOT_HUBS.find(h => h.key === key);
                    return (
                      <Badge key={key} variant="outline" className="text-xs bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-400">
                        {hub?.label || key}
                      </Badge>
                    );
                  })}
                  {config?.hubspotPortalId && (
                    <span className="text-xs text-muted-foreground ml-1 flex items-center">
                      Portal ID: <code className="ml-1 font-mono">{config.hubspotPortalId}</code>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Social, Landing Pages, Blog */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {config?.socialTool && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1">
                    <Share2 className="h-3 w-3" /> Social Media
                  </p>
                  <p className="font-medium">{SOCIAL_TOOLS[config.socialTool] || config.socialTool}</p>
                  {config.socialToolNotes && <p className="text-xs text-muted-foreground mt-0.5">{config.socialToolNotes}</p>}
                </div>
              )}
              {config?.landingPagePlatform && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1">
                    <LayoutTemplate className="h-3 w-3" /> Landing Pages
                  </p>
                  <p className="font-medium">{PLATFORM_LABELS[config.landingPagePlatform] || config.landingPagePlatform}</p>
                  {config.landingPageNotes && <p className="text-xs text-muted-foreground mt-0.5">{config.landingPageNotes}</p>}
                </div>
              )}
              {config?.blogPlatform && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Blog
                  </p>
                  <p className="font-medium">{PLATFORM_LABELS[config.blogPlatform] || config.blogPlatform}</p>
                  {config.blogNotes && <p className="text-xs text-muted-foreground mt-0.5">{config.blogNotes}</p>}
                </div>
              )}
            </div>

            {/* Website Access */}
            {config?.websiteAccess && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Website Access
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${WEBSITE_ACCESS_COLORS[config.websiteAccess] || ""}`}>
                    {WEBSITE_ACCESS_LABELS[config.websiteAccess] || config.websiteAccess}
                  </span>
                  {config.websiteUrl && (
                    <a
                      href={config.websiteUrl.startsWith("http") ? config.websiteUrl : `https://${config.websiteUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                      data-testid="link-website-url"
                    >
                      {config.websiteUrl}
                    </a>
                  )}
                </div>
                {config.websiteNotes && <p className="text-xs text-muted-foreground mt-1">{config.websiteNotes}</p>}
              </div>
            )}

          </div>
        )}
      </CardContent>

      <ServiceDeliveryEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        companyId={companyId}
        config={config}
      />
    </Card>
  );
}

// ── Assignment Edit Dialog ────────────────────────────────────────────────────
function AssignmentEditDialog({
  open, onOpenChange, companyId, assignment, retainerTemplates, serviceTracks,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  assignment: any | null;
  retainerTemplates: any[];
  serviceTracks: any[];
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEdit = !!assignment;

  const [templateId, setTemplateId] = useState(assignment?.retainerTemplateId || "");
  const [status, setStatus] = useState(assignment?.status || "draft");
  const [startDate, setStartDate] = useState(assignment?.startDate || new Date().toISOString().split("T")[0]);
  const [billingDay, setBillingDay] = useState(String(assignment?.billingDayOfMonth || 1));
  const [creditOverride, setCreditOverride] = useState(assignment?.monthlyCreditAllocationOverride != null ? String(assignment.monthlyCreditAllocationOverride) : "");
  const [priceOverride, setPriceOverride] = useState(assignment?.monthlyPriceOverride != null ? String(assignment.monthlyPriceOverride) : "");
  const [genWindowOverride, setGenWindowOverride] = useState(assignment?.generationWindowDaysOverride != null ? String(assignment.generationWindowDaysOverride) : "");
  const [notes, setNotes] = useState(assignment?.notes || "");

  // Service track selections (from assignment or default to template defaults)
  const selectedTemplate = retainerTemplates.find(t => t.id === templateId);
  const existingTrackIds = new Set((assignment?.serviceTracks || []).map((st: any) => st.serviceTrackId));
  const [activeTrackIds, setActiveTrackIds] = useState<Set<string>>(
    existingTrackIds.size > 0
      ? existingTrackIds
      : new Set(serviceTracks.map(t => t.id))
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        retainerTemplateId: templateId,
        status,
        startDate,
        billingDayOfMonth: parseInt(billingDay) || 1,
        monthlyCreditAllocationOverride: creditOverride !== "" ? parseFloat(creditOverride) : null,
        monthlyPriceOverride: priceOverride !== "" ? parseFloat(priceOverride) : null,
        generationWindowDaysOverride: genWindowOverride !== "" ? parseInt(genWindowOverride) : null,
        notes: notes || null,
      };
      const r = await apiRequest("PUT", `/api/companies/${companyId}/retainer-assignment`, body);
      const saved = await r.json();

      // Save service tracks
      const tracks = serviceTracks.map(t => ({
        serviceTrackId: t.id,
        isActive: activeTrackIds.has(t.id),
        notes: null,
      }));
      await apiRequest("PUT", `/api/companies/${companyId}/retainer-assignment/service-tracks`, { tracks });
      return saved;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/companies/${companyId}/retainer-assignment`] });
      toast({ title: isEdit ? "Retainer updated" : "Retainer assigned" });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleTrack = (id: string) => {
    const next = new Set(activeTrackIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setActiveTrackIds(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Retainer Assignment" : "Assign Retainer Template"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Retainer Template *</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger data-testid="select-retainer-template">
                <SelectValue placeholder="Select a template…" />
              </SelectTrigger>
              <SelectContent>
                {retainerTemplates.filter(t => t.status === "active").map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate && (
              <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger data-testid="select-retainer-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} data-testid="input-retainer-start-date" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Billing Day</Label>
              <Input type="number" min={1} max={28} value={billingDay} onChange={e => setBillingDay(e.target.value)} data-testid="input-billing-day" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Credits Override</Label>
              <Input type="number" placeholder={selectedTemplate?.monthlyCreditAllocation || "—"} value={creditOverride} onChange={e => setCreditOverride(e.target.value)} data-testid="input-credit-override" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Gen. Window (days)</Label>
              <Input type="number" placeholder={selectedTemplate?.generationWindowDays || "60"} value={genWindowOverride} onChange={e => setGenWindowOverride(e.target.value)} data-testid="input-gen-window" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Monthly Price Override ($)</Label>
            <Input type="number" placeholder={selectedTemplate?.suggestedMonthlyPrice ? `Template default: $${selectedTemplate.suggestedMonthlyPrice}` : "—"} value={priceOverride} onChange={e => setPriceOverride(e.target.value)} data-testid="input-price-override" />
          </div>

          {serviceTracks.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Active Service Tracks</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {serviceTracks.map(t => (
                  <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-muted/50">
                    <Checkbox
                      checked={activeTrackIds.has(t.id)}
                      onCheckedChange={() => toggleTrack(t.id)}
                      data-testid={`checkbox-track-${t.id}`}
                    />
                    <span>{t.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes about this retainer arrangement…" rows={2} data-testid="textarea-retainer-notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!templateId || !startDate || saveMutation.isPending}
            className="bg-orange-500 hover:bg-orange-600 text-white"
            data-testid="button-save-retainer"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            {isEdit ? "Save Changes" : "Assign Retainer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Preview Dialog ────────────────────────────────────────────────────────────
function PreviewTasksDialog({
  open, onOpenChange, companyId, assignment, serviceTracks, monthlyAllowance,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  assignment: any;
  serviceTracks: any[];
  monthlyAllowance: number;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [periodStart, setPeriodStart] = useState(assignment?.startDate || new Date().toISOString().split("T")[0]);
  const [periodDays, setPeriodDays] = useState<30 | 60 | 90>(30);
  const [includeMonthly, setIncludeMonthly] = useState(true);
  const [includeQuarterly, setIncludeQuarterly] = useState(false);
  const [includeAnnual, setIncludeAnnual] = useState(false);
  const activeServiceTrackIds = (assignment?.serviceTracks || []).filter((t: any) => t.isActive).map((t: any) => t.serviceTrackId);
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>(activeServiceTrackIds);
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const previewMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", `/api/companies/${companyId}/retainer-assignment/preview-tasks`, {
        retainerTemplateId: assignment.retainerTemplateId,
        serviceTrackIds: selectedTrackIds,
        periodStart,
        periodDays,
        includeMonthly,
        includeQuarterly,
        includeAnnual,
      });
      return r.json();
    },
    onSuccess: (data) => setPreviewResult(data),
    onError: (e: any) => toast({ title: "Preview failed", description: e.message, variant: "destructive" }),
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const periodEnd = new Date(new Date(periodStart).getTime() + periodDays * 86400000).toISOString().split("T")[0];
      const r = await apiRequest("POST", `/api/companies/${companyId}/retainer-assignment/confirm-tasks`, {
        tasks: previewResult?.tasks || [],
        periodStart,
        periodEnd,
        retainerTemplateId: assignment?.retainerTemplateId ?? "",
        clientRetainerAssignmentId: assignment?.id ?? "",
      });
      return r.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [`/api/tasks`] });
      qc.invalidateQueries({ queryKey: [`/api/companies/${companyId}`] });
      qc.invalidateQueries({ queryKey: [`/api/companies/${companyId}/credit-projection`] });
      const skippedMsg = data.skipped > 0 ? ` (${data.skipped} skipped — already generated)` : "";
      toast({ title: `Created ${data.created} task${data.created !== 1 ? "s" : ""}${skippedMsg}` });
      setConfirmOpen(false);
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Error creating tasks", description: e.message, variant: "destructive" }),
  });

  const toggleTrack = (id: string) => {
    setSelectedTrackIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const duplicateCount = previewResult?.tasks.filter((t: any) => t.isDuplicate).length || 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Preview Retainer Tasks
            </DialogTitle>
          </DialogHeader>

          {/* Options row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-2 border-y">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Period Start</Label>
              <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} data-testid="input-preview-period-start" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Period Length</Label>
              <Select value={String(periodDays)} onValueChange={v => setPeriodDays(parseInt(v) as 30 | 60 | 90)}>
                <SelectTrigger data-testid="select-period-days">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cadences</Label>
              <div className="flex flex-col gap-1 pt-0.5">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox checked={includeMonthly} onCheckedChange={v => setIncludeMonthly(!!v)} data-testid="checkbox-include-monthly" />
                  Monthly
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox checked={includeQuarterly} onCheckedChange={v => setIncludeQuarterly(!!v)} data-testid="checkbox-include-quarterly" />
                  Quarterly
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox checked={includeAnnual} onCheckedChange={v => setIncludeAnnual(!!v)} data-testid="checkbox-include-annual" />
                  Annual
                </label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Service Tracks</Label>
              <div className="flex flex-col gap-1 pt-0.5 max-h-20 overflow-y-auto">
                {serviceTracks.map(t => (
                  <label key={t.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox checked={selectedTrackIds.includes(t.id)} onCheckedChange={() => toggleTrack(t.id)} data-testid={`checkbox-preview-track-${t.id}`} />
                    {t.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <p className="text-sm text-muted-foreground">Configure options above, then generate a preview.</p>
            <Button
              onClick={() => previewMutation.mutate()}
              disabled={previewMutation.isPending}
              variant="outline"
              className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-950/20"
              data-testid="button-generate-preview"
            >
              {previewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
              Generate Preview
            </Button>
          </div>

          {/* Preview results */}
          {previewResult && (
            <div className="flex-1 min-h-0 flex flex-col gap-3">
              {/* Totals bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border-0 bg-muted/40">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Projected Credits</p>
                    <p className="text-lg font-bold">{previewResult.totals.totalCredits.toFixed(1)}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-muted/40">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Monthly Allowance</p>
                    <p className="text-lg font-bold">{previewResult.totals.monthlyAllowance}</p>
                  </CardContent>
                </Card>
                <Card className={`border-0 ${previewResult.totals.projectedOverage > 0 ? "bg-red-50 dark:bg-red-950/20" : "bg-green-50 dark:bg-green-950/20"}`}>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">
                      {previewResult.totals.projectedOverage > 0 ? "Projected Overage" : "Remaining Credits"}
                    </p>
                    <p className={`text-lg font-bold ${previewResult.totals.projectedOverage > 0 ? "text-red-600" : "text-green-600"}`}>
                      {previewResult.totals.projectedOverage > 0
                        ? `+${previewResult.totals.projectedOverage.toFixed(1)}`
                        : previewResult.totals.remainingCredits.toFixed(1)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-muted/40">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Tasks</p>
                    <p className="text-lg font-bold">{previewResult.tasks.length}</p>
                    {duplicateCount > 0 && (
                      <p className="text-xs text-yellow-600">{duplicateCount} likely duplicate{duplicateCount > 1 ? "s" : ""}</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* By service track */}
              {Object.keys(previewResult.totals.byServiceTrack).length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(previewResult.totals.byServiceTrack).map(([track, credits]: any) => (
                    <Badge key={track} variant="secondary" className="text-xs">
                      {track}: {credits.toFixed(1)} cr
                    </Badge>
                  ))}
                </div>
              )}

              {/* Task table */}
              <ScrollArea className="flex-1 min-h-0 border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/60 backdrop-blur z-10">
                    <tr>
                      <th className="text-left p-2 font-medium text-muted-foreground">Task</th>
                      <th className="text-left p-2 font-medium text-muted-foreground hidden md:table-cell">Track</th>
                      <th className="text-left p-2 font-medium text-muted-foreground hidden md:table-cell">Cadence</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Due Date</th>
                      <th className="text-left p-2 font-medium text-muted-foreground hidden lg:table-cell">Owner Role</th>
                      <th className="text-right p-2 font-medium text-muted-foreground">Credits</th>
                      <th className="text-center p-2 font-medium text-muted-foreground hidden lg:table-cell">Client</th>
                      <th className="text-center p-2 font-medium text-muted-foreground hidden lg:table-cell">Approval</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewResult.tasks.map((t: any, i: number) => (
                      <tr key={i} className={`border-t ${t.isDuplicate ? "bg-yellow-50/60 dark:bg-yellow-950/20" : "hover:bg-muted/30"}`}>
                        <td className="p-2">
                          <div className="flex items-start gap-1.5">
                            {t.isDuplicate && (
                              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />
                            )}
                            <span className="font-medium">{t.title}{t.instanceIndex > 1 ? ` #${t.instanceIndex}` : ""}</span>
                          </div>
                        </td>
                        <td className="p-2 text-muted-foreground hidden md:table-cell">{t.serviceTrackName}</td>
                        <td className="p-2 hidden md:table-cell">
                          <Badge variant="outline" className="text-xs">{CADENCE_LABEL[t.cadence] || t.cadence}</Badge>
                        </td>
                        <td className="p-2 font-mono">{t.dueDate}</td>
                        <td className="p-2 text-muted-foreground hidden lg:table-cell">{ROLE_LABEL[t.roleOwner] || t.roleOwner}</td>
                        <td className="p-2 text-right font-mono">{t.creditCost}</td>
                        <td className="p-2 text-center hidden lg:table-cell">
                          {t.clientVisible ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 inline" /> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="p-2 text-center hidden lg:table-cell">
                          {t.requiresApproval ? <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 inline" /> : <span className="text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          )}

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            {previewResult && previewResult.tasks.length > 0 && (
              <Button
                onClick={() => setConfirmOpen(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white"
                data-testid="button-confirm-create-tasks"
              >
                <Play className="h-4 w-4 mr-1.5" />
                Confirm & Create {previewResult.tasks.length} Task{previewResult.tasks.length !== 1 ? "s" : ""}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create {previewResult?.tasks.length} tasks?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create {previewResult?.tasks.length} tasks for this company, consuming approximately{" "}
              <strong>{previewResult?.totals.totalCredits.toFixed(1)} credits</strong>.
              {duplicateCount > 0 && (
                <span className="block mt-1 text-yellow-600">⚠ {duplicateCount} task{duplicateCount > 1 ? "s" : ""} may already exist in this period.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
              data-testid="button-confirm-create-tasks-final"
            >
              {confirmMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Create Tasks
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Main Tab Component ────────────────────────────────────────────────────────
export function CompanyRetainerTab({ companyId, companyName }: CompanyRetainerTabProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: assignment, isLoading: assignmentLoading } = useRetainerAssignment(companyId);
  const { data: retainerTemplates = [] } = useRetainerTemplates();
  const { data: serviceTracks = [] } = useServiceTracks();

  const monthlyAllowance = assignment?.monthlyCreditAllocationOverride
    ?? assignment?.template?.monthlyCreditAllocation
    ?? 0;

  if (assignmentLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  const activeServiceTracks = (assignment?.serviceTracks || []).filter((t: any) => t.isActive);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold">Retainer Assignment</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Connect this company to a retainer template and configure its service tracks.</p>
        </div>
        <div className="flex items-center gap-2">
          {assignment && (
            <Button
              variant="outline"
              className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-950/20"
              onClick={() => setPreviewOpen(true)}
              data-testid="button-preview-retainer-tasks"
            >
              <Eye className="h-4 w-4 mr-1.5" />
              Preview Retainer Tasks
            </Button>
          )}
          <Button
            onClick={() => setEditOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white"
            data-testid="button-assign-retainer"
          >
            {assignment ? <Settings className="h-4 w-4 mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
            {assignment ? "Edit Assignment" : "Assign Retainer"}
          </Button>
        </div>
      </div>

      {!assignment ? (
        <Card>
          <CardContent className="pt-10 pb-10 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">No retainer assigned</p>
            <p className="text-sm text-muted-foreground mt-1">Assign a retainer template to start generating tasks for this client.</p>
            <Button className="mt-4 bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setEditOpen(true)} data-testid="button-assign-retainer-empty">
              <Plus className="h-4 w-4 mr-1.5" />
              Assign Retainer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Overview card */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  {assignment.template?.name || "Retainer Template"}
                </CardTitle>
                <Badge className={`${STATUS_COLORS[assignment.status]} text-white text-xs capitalize`}>
                  {assignment.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Start Date</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {assignment.startDate}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Monthly Credits</p>
                  <p className="font-medium">
                    {assignment.monthlyCreditAllocationOverride != null
                      ? `${assignment.monthlyCreditAllocationOverride} (override)`
                      : (assignment.template?.monthlyCreditAllocation || "—")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Monthly Price</p>
                  <p className="font-medium flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                    {assignment.monthlyPriceOverride != null
                      ? `$${parseFloat(assignment.monthlyPriceOverride).toFixed(0)} (override)`
                      : assignment.template?.suggestedMonthlyPrice
                        ? `$${parseFloat(assignment.template.suggestedMonthlyPrice).toFixed(0)}`
                        : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Gen. Window</p>
                  <p className="font-medium">
                    {assignment.generationWindowDaysOverride != null
                      ? `${assignment.generationWindowDaysOverride}d (override)`
                      : `${assignment.template?.generationWindowDays || 60}d`}
                  </p>
                </div>
              </div>

              {/* Scope summary */}
              {(assignment.template?.includedScopeSummary || assignment.template?.excludedScopeSummary || assignment.template?.overageRules) && (
                <>
                  <Separator className="my-3" />
                  <div className="grid md:grid-cols-3 gap-3 text-xs">
                    {assignment.template.includedScopeSummary && (
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Included Scope</p>
                        <p className="text-foreground/80 whitespace-pre-line">{assignment.template.includedScopeSummary}</p>
                      </div>
                    )}
                    {assignment.template.excludedScopeSummary && (
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Exclusions</p>
                        <p className="text-foreground/80 whitespace-pre-line">{assignment.template.excludedScopeSummary}</p>
                      </div>
                    )}
                    {assignment.template.overageRules && (
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Overage Rules</p>
                        <p className="text-foreground/80 whitespace-pre-line">{assignment.template.overageRules}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Cadences */}
              {(assignment.template?.reportingCadence || assignment.template?.meetingCadence) && (
                <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                  {assignment.template.reportingCadence && (
                    <span>Reporting: <strong className="text-foreground">{assignment.template.reportingCadence}</strong></span>
                  )}
                  {assignment.template.meetingCadence && (
                    <span>Meetings: <strong className="text-foreground">{assignment.template.meetingCadence}</strong></span>
                  )}
                </div>
              )}

              {assignment.notes && (
                <p className="mt-3 text-xs text-muted-foreground border-t pt-2">{assignment.notes}</p>
              )}
            </CardContent>
          </Card>

          {/* Service Tracks card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Active Service Tracks</CardTitle>
            </CardHeader>
            <CardContent>
              {assignment.serviceTracks?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No service tracks configured — click Edit Assignment to add them.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(assignment.serviceTracks || []).map((st: any) => (
                    <Badge
                      key={st.id}
                      variant={st.isActive ? "default" : "outline"}
                      className={st.isActive ? "bg-primary/10 text-primary border-primary/20" : "opacity-50"}
                      data-testid={`badge-track-${st.serviceTrackId}`}
                    >
                      {st.track?.name || st.serviceTrackId}
                      {!st.isActive && " (inactive)"}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Service Delivery Details — always visible, company-level */}
      <ServiceDeliveryCard companyId={companyId} />

      {/* Dialogs */}
      <AssignmentEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        companyId={companyId}
        assignment={assignment || null}
        retainerTemplates={retainerTemplates}
        serviceTracks={serviceTracks}
      />

      {assignment && (
        <PreviewTasksDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          companyId={companyId}
          assignment={assignment}
          serviceTracks={serviceTracks}
          monthlyAllowance={monthlyAllowance}
        />
      )}
    </div>
  );
}
