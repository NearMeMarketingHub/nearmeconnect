import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ContentCalendarItem, ContentPillar, ContentPlatform, Company } from "@shared/schema";
import { insertContentCalendarItemSchema, contentPlatformEnum, contentTypeEnum, contentStatusEnum, gbpPostTypeEnum } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Globe, Mail, Briefcase, Camera, BookOpen, FileText, Loader2, CheckCircle2, ExternalLink, ImageIcon, History, Hash, UploadCloud, X, Video, Link, MapPin, ClipboardCopy } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type FormValues = z.infer<typeof insertContentCalendarItemSchema>;

export const PLATFORM_CONFIG: Record<string, { label: string; color: string; darkBg: string; Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  google_business: { label: "Google Business", color: "#4285F4", darkBg: "#DBEAFE", Icon: Globe },
  facebook: { label: "Facebook", color: "#1877F2", darkBg: "#E0E7FF", Icon: Briefcase },
  instagram: { label: "Instagram", color: "#E1306C", darkBg: "#FCE7F3", Icon: Camera },
  linkedin: { label: "LinkedIn", color: "#0A66C2", darkBg: "#DBEAFE", Icon: Briefcase },
  email: { label: "Email", color: "#F59E0B", darkBg: "#FEF3C7", Icon: Mail },
  blog: { label: "Blog", color: "#10B981", darkBg: "#D1FAE5", Icon: BookOpen },
  website_landing_page: { label: "Website / Landing Page", color: "#8B5CF6", darkBg: "#EDE9FE", Icon: Globe },
  youtube_video: { label: "YouTube / Video", color: "#EF4444", darkBg: "#FEE2E2", Icon: Video },
  medium_blog_site: { label: "Medium / Public Blog", color: "#059669", darkBg: "#D1FAE5", Icon: Link },
  directory_citation: { label: "Directory / Citation", color: "#D97706", darkBg: "#FEF3C7", Icon: MapPin },
  other: { label: "Other", color: "#6B7280", darkBg: "#F3F4F6", Icon: FileText },
};

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  placeholder: { label: "Placeholder", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
  drafting: { label: "Drafting", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  internal_review: { label: "Internal Review", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  client_review: { label: "Client Review", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  in_review: { label: "In Review", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  approved: { label: "Approved", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  published: { label: "Published", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  manually_published: { label: "Manually Published", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  api_published: { label: "API Published", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" },
  failed: { label: "Failed", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  repurpose_syndicate: { label: "Repurpose / Syndicate", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" },
  cancelled: { label: "Cancelled", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
  archived: { label: "Archived", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
};

const CHAR_LIMITS: Record<string, number> = {
  google_business: 1500,
  facebook: 63206,
  instagram: 2200,
  linkedin: 3000,
  email: Infinity,
  blog: Infinity,
  website_landing_page: Infinity,
  youtube_video: Infinity,
  medium_blog_site: Infinity,
  directory_citation: 750,
  other: Infinity,
};

interface ContentItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: string;
  initialCompanyId?: string;
  item?: ContentCalendarItem | null;
  companies: Company[];
  onSaved: () => void;
}

export function ContentItemModal({
  open,
  onOpenChange,
  initialDate,
  initialCompanyId,
  item,
  companies,
  onSaved,
}: ContentItemModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("content");

  const defaultVals = (): FormValues => ({
    companyId: item?.companyId || initialCompanyId || "",
    platform: (item?.platform as ContentPlatform) || "google_business",
    contentType: item?.contentType || "post",
    status: item?.status || "draft",
    title: item?.title || "",
    bodyContent: item?.bodyContent || "",
    hashtags: item?.hashtags || "",
    ctaText: item?.ctaText || "",
    ctaUrl: item?.ctaUrl || "",
    scheduledDate: item?.scheduledDate || initialDate || "",
    scheduledTime: item?.scheduledTime || "",
    pillarId: item?.pillarId || undefined,
    assignedTo: item?.assignedTo || undefined,
    assignedToName: item?.assignedToName || undefined,
    gbpPostType: (item?.gbpPostType as any) || undefined,
    gbpEventTitle: item?.gbpEventTitle || "",
    gbpEventStart: item?.gbpEventStart || "",
    gbpEventEnd: item?.gbpEventEnd || "",
    gbpOfferTitle: item?.gbpOfferTitle || "",
    gbpOfferStart: item?.gbpOfferStart || "",
    gbpOfferEnd: item?.gbpOfferEnd || "",
    gbpOfferCoupon: item?.gbpOfferCoupon || "",
    gbpOfferTerms: item?.gbpOfferTerms || "",
    gbpRedeemUrl: item?.gbpRedeemUrl || "",
    gbpProductName: item?.gbpProductName || "",
    gbpProductPrice: item?.gbpProductPrice || "",
    gbpProductDescription: item?.gbpProductDescription || "",
    gbpCtaType: (item?.gbpCtaType as any) || undefined,
    gbpPublishedUrl: item?.gbpPublishedUrl || "",
    gbpPublishedPostId: item?.gbpPublishedPostId || "",
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(insertContentCalendarItemSchema),
    defaultValues: defaultVals(),
  });

  const companyId = form.watch("companyId");
  const platform = form.watch("platform");

  // Media upload state
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [mediaFiles, setMediaFiles] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const bodyContent = form.watch("bodyContent") || "";
  const gbpPostType = form.watch("gbpPostType");
  const title = form.watch("title") || "";
  const status = form.watch("status");
  const gbpPublishedUrl = form.watch("gbpPublishedUrl") || "";
  const gbpPublishedPostId = form.watch("gbpPublishedPostId") || "";

  const charLimit = CHAR_LIMITS[platform] ?? Infinity;
  const charCount = bodyContent.length;
  const charPct = charLimit === Infinity ? 0 : charCount / charLimit;

  useEffect(() => {
    if (open) {
      form.reset(defaultVals());
      setActiveTab("content");
      try {
        setMediaFiles(item?.mediaUrls ? JSON.parse(item.mediaUrls) : []);
      } catch {
        setMediaFiles([]);
      }
    }
  }, [open, item?.id, initialDate, initialCompanyId]);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (e.target) e.target.value = "";
    if (files.length === 0) return;
    if (!companyId) {
      toast({ title: "Select a company before uploading media", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    const newUrls: string[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch(`/api/companies/${companyId}/media-uploads`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          const url = data.sharepointUrl || data.fileUrl || data.url;
          if (url) newUrls.push(url);
        } else {
          toast({ title: "Upload failed", variant: "destructive" });
        }
      } catch {
        toast({ title: "Upload error", variant: "destructive" });
      }
    }
    if (newUrls.length > 0) {
      setMediaFiles(prev => [...prev, ...newUrls]);
      toast({ title: `${newUrls.length} file(s) uploaded` });
    }
    setIsUploading(false);
  };

  const removeMediaFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const { data: pillars = [] } = useQuery<ContentPillar[]>({
    queryKey: ["/api/content-pillars", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const res = await fetch(`/api/content-pillars?companyId=${companyId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!companyId,
  });

  const { data: members = [] } = useQuery<any[]>({
    queryKey: [`/api/companies/${companyId}/members`],
    enabled: !!companyId,
  });

  const { data: activity = [] } = useQuery<any[]>({
    queryKey: [`/api/content-calendar/${item?.id}/activity`],
    enabled: !!item?.id && activeTab === "activity",
  });

  const saveMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const url = item ? `/api/content-calendar/${item.id}` : "/api/content-calendar";
      const method = item ? "PATCH" : "POST";
      const payload = { ...data, mediaUrls: mediaFiles.length > 0 ? JSON.stringify(mediaFiles) : null };
      const res = await apiRequest(method, url, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-calendar"] });
      toast({ title: item ? "Item updated" : "Item created" });
      onSaved();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    },
  });

  const requestApprovalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/content-calendar/${item!.id}`, { status: "in_review" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-calendar"] });
      toast({ title: "Approval requested" });
      onSaved();
    },
  });

  const onSubmit = form.handleSubmit((data) => saveMutation.mutate(data));

  const platformCfg = PLATFORM_CONFIG[platform];
  const PlatformIcon = platformCfg?.Icon || Globe;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-4 pb-2 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: platformCfg?.color || "#6B7280" }} />
            {item ? "Edit Content Item" : "New Content Item"}
            {item && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[item.status]?.color || ""}`}>
                {STATUS_CONFIG[item.status]?.label || item.status}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Form */}
          <div className="flex-1 overflow-hidden flex flex-col min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <TabsList className="mx-4 mt-2 justify-start rounded-none border-b bg-transparent h-auto gap-0 px-0 flex-shrink-0">
                {["content", "schedule", "media", "hubspot", "activity"].map(tab => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 pb-2 capitalize"
                    data-testid={`tab-modal-${tab}`}
                  >
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>

              <ScrollArea className="flex-1">
                <Form {...form}>
                  <form onSubmit={onSubmit}>

                    {/* ── CONTENT TAB ── */}
                    <TabsContent value="content" className="mt-0 p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="companyId" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company *</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger data-testid="select-company">
                                  <SelectValue placeholder="Select company" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="platform" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Platform *</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger data-testid="select-platform">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {contentPlatformEnum.map(p => {
                                  const cfg = PLATFORM_CONFIG[p];
                                  return (
                                    <SelectItem key={p} value={p}>
                                      <div className="flex items-center gap-2">
                                        <cfg.Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                                        {cfg.label}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="contentType" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Content Type</FormLabel>
                            <Select value={field.value || "post"} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger data-testid="select-content-type">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {contentTypeEnum.map(t => (
                                  <SelectItem key={t} value={t}>{t.replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="pillarId" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Content Pillar</FormLabel>
                            <Select value={field.value || "_none"} onValueChange={v => field.onChange(v === "_none" ? undefined : v)}>
                              <FormControl>
                                <SelectTrigger data-testid="select-pillar">
                                  <SelectValue placeholder="No pillar" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="_none">No pillar</SelectItem>
                                {pillars.map((p: ContentPillar) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                      {p.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <FormField control={form.control} name="assignedTo" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assigned To</FormLabel>
                          <Select
                            disabled={!companyId}
                            value={field.value || "_none"}
                            onValueChange={v => {
                              if (v === "_none") {
                                field.onChange(undefined);
                                form.setValue("assignedToName", undefined);
                              } else {
                                field.onChange(v);
                                const member = members.find((m: any) => m.userId === v);
                                if (member) {
                                  const name = [member.firstName, member.lastName].filter(Boolean).join(" ") || member.email || "";
                                  form.setValue("assignedToName", name);
                                }
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-assigned-to">
                                <SelectValue placeholder={companyId ? "Unassigned" : "Select a company first"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="_none">Unassigned</SelectItem>
                              {members.map((m: any) => (
                                <SelectItem key={m.userId} value={m.userId}>
                                  {[m.firstName, m.lastName].filter(Boolean).join(" ") || m.email || m.userId}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title (internal reference) *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. May GBP Post — Spring Promo" data-testid="input-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="bodyContent" render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Body Copy / Caption</FormLabel>
                            {charLimit !== Infinity && (
                              <span className={`text-xs font-mono ${charPct >= 1 ? "text-red-500" : charPct >= 0.9 ? "text-orange-500" : "text-muted-foreground"}`}>
                                {charCount.toLocaleString()} / {charLimit.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <FormControl>
                            <Textarea {...field} value={field.value ?? ""} placeholder="Write your post copy..." className="min-h-[120px] resize-y" data-testid="textarea-body-content" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="hashtags" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            <Hash className="h-3.5 w-3.5" /> Hashtags
                          </FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} placeholder="#marketing #localbusiness" data-testid="input-hashtags" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="ctaText" render={({ field }) => (
                          <FormItem>
                            <FormLabel>CTA Text</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ""} placeholder="Learn More" data-testid="input-cta-text" />
                            </FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="ctaUrl" render={({ field }) => (
                          <FormItem>
                            <FormLabel>CTA URL</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ""} placeholder="https://" data-testid="input-cta-url" />
                            </FormControl>
                          </FormItem>
                        )} />
                      </div>

                      {/* GBP Extended Fields */}
                      {platform === "google_business" && (
                        <div className="border rounded-lg p-4 space-y-4 bg-blue-50/50 dark:bg-blue-950/20">
                          <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                            <Globe className="h-4 w-4" /> Google Business Post Options
                          </h4>
                          <FormField control={form.control} name="gbpPostType" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Post Type</FormLabel>
                              <Select value={field.value || "_none"} onValueChange={v => field.onChange(v === "_none" ? undefined : v)}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-gbp-post-type">
                                    <SelectValue placeholder="What's New (default)" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="_none">What's New (default)</SelectItem>
                                  <SelectItem value="event">Event</SelectItem>
                                  <SelectItem value="offer">Offer</SelectItem>
                                  <SelectItem value="product">Product</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )} />

                          {gbpPostType === "event" && (
                            <div className="grid grid-cols-2 gap-4">
                              <FormField control={form.control} name="gbpEventTitle" render={({ field }) => (
                                <FormItem><FormLabel>Event Title</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                              )} />
                              <FormField control={form.control} name="gbpEventStart" render={({ field }) => (
                                <FormItem><FormLabel>Start</FormLabel><FormControl><Input type="datetime-local" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                              )} />
                              <FormField control={form.control} name="gbpEventEnd" render={({ field }) => (
                                <FormItem><FormLabel>End</FormLabel><FormControl><Input type="datetime-local" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                              )} />
                            </div>
                          )}
                          {gbpPostType === "offer" && (
                            <div className="grid grid-cols-2 gap-4">
                              <FormField control={form.control} name="gbpOfferTitle" render={({ field }) => (
                                <FormItem><FormLabel>Offer Title</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                              )} />
                              <FormField control={form.control} name="gbpOfferStart" render={({ field }) => (
                                <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                              )} />
                              <FormField control={form.control} name="gbpOfferEnd" render={({ field }) => (
                                <FormItem><FormLabel>End Date</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                              )} />
                              <FormField control={form.control} name="gbpOfferCoupon" render={({ field }) => (
                                <FormItem><FormLabel>Coupon Code</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                              )} />
                              <FormField control={form.control} name="gbpRedeemUrl" render={({ field }) => (
                                <FormItem className="col-span-2"><FormLabel>Redeem URL</FormLabel><FormControl><Input {...field} value={field.value ?? ""} placeholder="https://" /></FormControl></FormItem>
                              )} />
                              <FormField control={form.control} name="gbpOfferTerms" render={({ field }) => (
                                <FormItem className="col-span-2"><FormLabel>Terms & Conditions</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} className="min-h-[60px]" /></FormControl></FormItem>
                              )} />
                            </div>
                          )}
                          {gbpPostType === "product" && (
                            <div className="grid grid-cols-2 gap-4">
                              <FormField control={form.control} name="gbpProductName" render={({ field }) => (
                                <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                              )} />
                              <FormField control={form.control} name="gbpProductPrice" render={({ field }) => (
                                <FormItem><FormLabel>Price / Range</FormLabel><FormControl><Input {...field} value={field.value ?? ""} placeholder="$99" /></FormControl></FormItem>
                              )} />
                              <FormField control={form.control} name="gbpProductDescription" render={({ field }) => (
                                <FormItem className="col-span-2"><FormLabel>Description</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} className="min-h-[60px]" /></FormControl></FormItem>
                              )} />
                            </div>
                          )}

                          {/* CTA type (all GBP posts) */}
                          <FormField control={form.control} name="gbpCtaType" render={({ field }) => (
                            <FormItem>
                              <FormLabel>CTA Button Type</FormLabel>
                              <Select value={field.value || "_none"} onValueChange={v => field.onChange(v === "_none" ? undefined : v)}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-gbp-cta-type">
                                    <SelectValue placeholder="None" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="_none">None</SelectItem>
                                  <SelectItem value="book">Book</SelectItem>
                                  <SelectItem value="order">Order Online</SelectItem>
                                  <SelectItem value="shop">Shop</SelectItem>
                                  <SelectItem value="learn_more">Learn More</SelectItem>
                                  <SelectItem value="sign_up">Sign Up</SelectItem>
                                  <SelectItem value="call">Call Now</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )} />

                          {/* Publishing fields for manually/api published */}
                          {(status === "manually_published" || status === "api_published") && (
                            <div className="grid grid-cols-2 gap-4">
                              <FormField control={form.control} name="gbpPublishedUrl" render={({ field }) => (
                                <FormItem className="col-span-2">
                                  <FormLabel>Published URL</FormLabel>
                                  <FormControl><Input {...field} value={field.value ?? ""} placeholder="https://maps.google.com/..." data-testid="input-gbp-published-url" /></FormControl>
                                </FormItem>
                              )} />
                              <FormField control={form.control} name="gbpPublishedPostId" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>External Post ID</FormLabel>
                                  <FormControl><Input {...field} value={field.value ?? ""} placeholder="GBP post ID" data-testid="input-gbp-published-post-id" /></FormControl>
                                </FormItem>
                              )} />
                            </div>
                          )}

                          {/* Export for manual publishing */}
                          {item && (status === "approved" || status === "scheduled" || status === "manually_published") && (
                            <div className="border rounded-lg p-3 bg-muted/40 space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">Manual Publishing</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full gap-2 text-xs"
                                data-testid="button-gbp-copy-post"
                                onClick={() => {
                                  const postType = gbpPostType || "whats_new";
                                  const ctaLabel: Record<string, string> = { book: "Book", order: "Order Online", shop: "Shop", learn_more: "Learn More", sign_up: "Sign Up", call: "Call Now" };
                                  const ctaLine = item.gbpCtaType ? `\nCTA: ${ctaLabel[item.gbpCtaType] || item.gbpCtaType}` : "";
                                  const ctaUrlLine = item.ctaUrl ? `\nCTA URL: ${item.ctaUrl}` : "";
                                  const mediaLine = item.mediaUrls && JSON.parse(item.mediaUrls || "[]").length > 0 ? `\nMedia: ${JSON.parse(item.mediaUrls).join(", ")}` : "";
                                  let extraLines = "";
                                  if (postType === "event") extraLines = `\nEvent: ${item.gbpEventTitle || ""}\nStart: ${item.gbpEventStart || ""}\nEnd: ${item.gbpEventEnd || ""}`;
                                  else if (postType === "offer") extraLines = `\nOffer: ${item.gbpOfferTitle || ""}\nCoupon: ${item.gbpOfferCoupon || ""}\nRedeem: ${item.gbpRedeemUrl || ""}`;
                                  else if (postType === "product") extraLines = `\nProduct: ${item.gbpProductName || ""}\nPrice: ${item.gbpProductPrice || ""}`;
                                  const text = `${item.title}\n\n${item.bodyContent || ""}${ctaLine}${ctaUrlLine}${extraLines}${mediaLine}`.trim();
                                  navigator.clipboard.writeText(text).then(() => {
                                    toast({ title: "Copied to clipboard", description: "Paste into Google Business Profile to publish manually." });
                                  }).catch(() => {
                                    toast({ title: "Copy failed", description: "Please select the text manually.", variant: "destructive" });
                                  });
                                }}
                              >
                                <ClipboardCopy className="h-3.5 w-3.5" />
                                Copy Post Content
                              </Button>
                              <p className="text-xs text-muted-foreground">Copy content and paste directly into GBP dashboard to publish manually. Then update status to "Manually Published" and record the post URL above.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </TabsContent>

                    {/* ── SCHEDULE TAB ── */}
                    <TabsContent value="schedule" className="mt-0 p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="scheduledDate" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Scheduled Date</FormLabel>
                            <FormControl><Input type="date" {...field} value={field.value ?? ""} data-testid="input-scheduled-date" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="scheduledTime" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time (optional)</FormLabel>
                            <FormControl><Input type="time" {...field} value={field.value ?? ""} data-testid="input-scheduled-time" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select value={field.value || "draft"} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger data-testid="select-status">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {contentStatusEnum.map(s => (
                                <SelectItem key={s} value={s}>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[s]?.color || ""}`}>
                                    {STATUS_CONFIG[s]?.label || s}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="rounded-lg border p-3 bg-muted/50">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Approval Flow</p>
                        <div className="flex flex-wrap items-center gap-1 text-xs">
                          {["draft", "in_review", "approved", "scheduled", "published"].map((s, i, arr) => (
                            <span key={s} className="flex items-center gap-1">
                              <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[s]?.color || ""}`}>
                                {STATUS_CONFIG[s]?.label}
                              </span>
                              {i < arr.length - 1 && <span className="text-muted-foreground">→</span>}
                            </span>
                          ))}
                        </div>
                      </div>

                      {item && item.status === "draft" && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => requestApprovalMutation.mutate()}
                          disabled={requestApprovalMutation.isPending}
                          data-testid="button-request-approval"
                        >
                          {requestApprovalMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Request Approval
                        </Button>
                      )}
                      {item?.approvedAt && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          Approved {new Date(item.approvedAt).toLocaleDateString()}
                        </p>
                      )}
                    </TabsContent>

                    {/* ── MEDIA TAB ── */}
                    <TabsContent value="media" className="mt-0 p-4 space-y-4">
                      {/* Hidden file input — must be directly hidden, not inside a hidden parent */}
                      <input
                        ref={mediaInputRef}
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,.pdf,.docx"
                        multiple
                        onChange={handleMediaUpload}
                        data-testid="input-media-file"
                      />

                      {/* Dropzone / upload area */}
                      <button
                        type="button"
                        className="w-full py-8 border-2 border-dashed rounded-lg text-center text-muted-foreground hover:border-primary/50 hover:bg-muted/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => mediaInputRef.current?.click()}
                        disabled={isUploading || !companyId}
                        data-testid="button-upload-media"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin opacity-60" />
                            <p className="text-sm font-medium">Uploading…</p>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm font-medium">
                              {companyId ? "Click to upload photos, videos or documents" : "Select a company first"}
                            </p>
                            <p className="text-xs mt-1 opacity-70">JPG, PNG, GIF, MP4, PDF, DOCX — multiple files OK</p>
                          </>
                        )}
                      </button>

                      {/* Uploaded files grid */}
                      {mediaFiles.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {mediaFiles.map((url, i) => {
                            const isImage = /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);
                            return (
                              <div key={i} className="relative aspect-square rounded-md border bg-muted overflow-hidden group">
                                {isImage ? (
                                  <img src={url} alt={`Media ${i + 1}`} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="h-8 w-8 opacity-40" />
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeMediaFile(i)}
                                  className="absolute top-1 right-1 rounded-full bg-black/60 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                  data-testid={`button-remove-media-${i}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    {/* ── HUBSPOT TAB ── */}
                    <TabsContent value="hubspot" className="mt-0 p-4 space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="text-sm font-medium">Sync to HubSpot Social</p>
                          <p className="text-xs text-muted-foreground">Push this post to HubSpot Social Publisher</p>
                        </div>
                        <Switch disabled data-testid="switch-hubspot-sync" />
                      </div>
                      {item?.hubspotPostId ? (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-muted-foreground">HubSpot Post ID: {item.hubspotPostId}</span>
                          <Button variant="ghost" size="sm" asChild>
                            <a href="https://app.hubspot.com/social" target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5 mr-1" /> View in HubSpot
                            </a>
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" type="button" size="sm" disabled data-testid="button-push-hubspot">
                          Push to HubSpot Now
                        </Button>
                      )}
                    </TabsContent>

                    {/* ── ACTIVITY TAB ── */}
                    <TabsContent value="activity" className="mt-0 p-4 space-y-3">
                      {item ? (
                        <>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <History className="h-3.5 w-3.5" />
                            <span>Created {new Date(item.createdAt).toLocaleString()}</span>
                          </div>
                          {activity.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No activity yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {activity.map((act: any) => (
                                <div key={act.id} className="flex items-start gap-2 text-xs">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                  <div>
                                    <span className="font-medium">{act.action.replace(/_/g, " ")}</span>
                                    {act.fromValue && act.toValue && (
                                      <span className="text-muted-foreground"> from <em>{act.fromValue}</em> to <em>{act.toValue}</em></span>
                                    )}
                                    <span className="text-muted-foreground ml-1">· {new Date(act.createdAt).toLocaleString()}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Save this item first to see activity.</p>
                      )}
                    </TabsContent>

                  </form>
                </Form>
              </ScrollArea>
            </Tabs>
          </div>

          {/* Right: Platform Preview */}
          <div className="w-64 border-l flex flex-col bg-muted/10 flex-shrink-0 hidden lg:flex">
            <div className="px-4 pt-3 pb-2 border-b">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Live Preview</p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3">
                <PlatformPreview platform={platform} title={title} bodyContent={bodyContent} />
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="px-6 py-3 border-t flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={saveMutation.isPending} data-testid="button-save-content-item">
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {item ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlatformPreview({ platform, title, bodyContent }: { platform: string; title: string; bodyContent: string }) {
  const cfg = PLATFORM_CONFIG[platform];

  if (platform === "email") {
    return (
      <div className="border rounded-lg overflow-hidden text-xs shadow-sm">
        <div className="bg-gray-100 dark:bg-gray-800 px-3 py-2 border-b">
          <p className="text-muted-foreground text-[10px]">Subject:</p>
          <p className="font-medium">{title || "Email Subject"}</p>
        </div>
        <div className="p-3 bg-white dark:bg-gray-900 min-h-[100px]">
          <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{bodyContent || "Email body appears here…"}</p>
        </div>
      </div>
    );
  }

  if (platform === "blog") {
    return (
      <div className="border rounded-lg p-3 text-xs space-y-2 shadow-sm">
        <p className="font-bold text-sm leading-tight">{title || "Blog Title"}</p>
        <div className="w-full aspect-video bg-muted rounded flex items-center justify-center">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{bodyContent || "Article content…"}</p>
      </div>
    );
  }

  if (platform === "instagram") {
    return (
      <div className="border rounded-lg overflow-hidden text-xs shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-background">
          <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ background: "linear-gradient(135deg,#405DE6,#C13584,#FD1D1D)" }} />
          <span className="font-semibold text-[11px]">Your Company</span>
        </div>
        <div className="w-full aspect-square bg-muted flex items-center justify-center">
          <ImageIcon className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="p-2">
          <p className="text-muted-foreground whitespace-pre-wrap text-[11px] leading-relaxed">{bodyContent || "Caption…"}</p>
        </div>
      </div>
    );
  }

  if (platform === "google_business") {
    return (
      <div className="border rounded-lg overflow-hidden text-xs shadow-sm">
        <div className="px-3 py-2 border-b flex items-center gap-2" style={{ backgroundColor: "#E8F0FE" }}>
          <Globe className="h-3.5 w-3.5" style={{ color: "#4285F4" }} />
          <span className="font-semibold text-[11px]" style={{ color: "#1a56c4" }}>Google Business</span>
        </div>
        <div className="p-3 space-y-2 bg-white dark:bg-gray-900">
          <div className="w-full aspect-video bg-muted rounded flex items-center justify-center">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-[11px]">{bodyContent || "Post content…"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden text-xs shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-background">
        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          {cfg && <cfg.Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />}
        </div>
        <div>
          <p className="font-semibold text-[11px]">Your Company</p>
          <p className="text-muted-foreground text-[10px]">Just now</p>
        </div>
      </div>
      <div className="p-3 space-y-2 bg-white dark:bg-gray-900">
        <p className="text-muted-foreground whitespace-pre-wrap text-[11px] leading-relaxed">{bodyContent || "Post content…"}</p>
        <div className="w-full aspect-video bg-muted rounded flex items-center justify-center">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
