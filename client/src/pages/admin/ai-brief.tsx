import { useState, useCallback } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import {
  Wand2, Copy, Check, Loader2, MapPin, Image, Video, Mail, FileText,
  Megaphone, Newspaper, Mic2, Briefcase, Building2, ChevronRight, CalendarPlus,
  ClipboardCopy, ArrowLeft, Sparkles, Hash,
} from "lucide-react";
import type { Company, ContentPillar, BrandProfile } from "@shared/schema";

// ── Constants ─────────────────────────────────────────────────────────────────

const CONTENT_GOALS = [
  { id: "google_business_post", label: "Google Business Profile Post", icon: MapPin, platform: "google_business" },
  { id: "social_image", label: "Social Media Image", icon: Image, platform: "instagram" },
  { id: "social_video", label: "Social Media Video", icon: Video, platform: "instagram" },
  { id: "email_banner", label: "Email Campaign Banner", icon: Mail, platform: "email" },
  { id: "blog_feature", label: "Blog Feature Image", icon: FileText, platform: "blog" },
  { id: "ad_creative", label: "Ad Creative", icon: Megaphone, platform: "facebook" },
  { id: "newsletter_header", label: "Newsletter Header", icon: Newspaper, platform: "email" },
  { id: "podcast_thumbnail", label: "Podcast Thumbnail", icon: Mic2, platform: "other" },
  { id: "case_study_visual", label: "Case Study Visual", icon: Briefcase, platform: "linkedin" },
] as const;

const PLATFORMS = [
  { id: "google_business", label: "Google Business Profile" },
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "email", label: "Email" },
  { id: "blog", label: "Blog" },
  { id: "other", label: "Other" },
];

const VISUAL_STYLES = [
  "Photorealistic", "Illustrated", "Bold/Graphic", "Minimalist",
  "Before & After Split", "Behind the Scenes", "Professional Headshot Style",
  "Luxury/High-End", "Construction Site", "Residential Exterior",
];

const OUTPUT_OPTIONS = [
  { id: "image_prompt", label: "Image generation prompt (for Galaxy AI)", defaultOn: true },
  { id: "caption", label: "Caption / body copy prompt", defaultOn: true },
  { id: "hashtags", label: "Hashtag suggestions", defaultOn: true },
  { id: "cta", label: "Call-to-action options (3 variants)", defaultOn: true },
  { id: "gbp_post", label: "Google Business post (ready to paste)", defaultOn: true },
  { id: "email_subject", label: "Email subject line variants (3 options)", defaultOn: false },
  { id: "linkedin_outline", label: "LinkedIn article outline", defaultOn: false },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface BriefData { company: Company; brandProfile: BrandProfile | null; pillars: ContentPillar[] }

interface GeneratedSections {
  imagePrompt: string | null;
  captionPrompt: string | null;
  hashtagPrompt: string | null;
  ctaPrompt: string | null;
  gbpPostPrompt: string | null;
  emailSubjectPrompt: string | null;
  linkedinOutlinePrompt: string | null;
}

interface GenerateResult { sections: GeneratedSections; templateUsed: string }

// ── Copy Button ───────────────────────────────────────────────────────────────

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs shrink-0" onClick={copy} data-testid="btn-copy">
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : label}
    </Button>
  );
}

// ── Output Section ────────────────────────────────────────────────────────────

function OutputSection({ icon, title, subtitle, content, charLimit }: {
  icon: string; title: string; subtitle?: string; content: string; charLimit?: number;
}) {
  const chars = content.length;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <span>{icon}</span> {title}
          </p>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {charLimit && (
            <span className={`text-[10px] font-mono ${chars > charLimit ? "text-destructive" : "text-muted-foreground"}`}>
              {chars.toLocaleString()}/{charLimit.toLocaleString()}
            </span>
          )}
          <CopyBtn text={content} />
        </div>
      </div>
      <pre className="text-xs bg-muted/40 border rounded-md p-3 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto" data-testid={`output-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        {content}
      </pre>
    </div>
  );
}

function HashtagSection({ content }: { content: string }) {
  const tags = content.split("\n").map(t => t.trim()).filter(t => t.startsWith("#"));
  const raw = tags.length > 0 ? content : content;
  const displayTags = tags.length > 0 ? tags : content.split(/\s+/).filter(t => t.startsWith("#"));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">#️⃣ Hashtag Suggestions</p>
        <CopyBtn text={displayTags.join(" ")} label="Copy All" />
      </div>
      {displayTags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {displayTags.map((tag, i) => (
            <button key={i} className="group relative" onClick={() => navigator.clipboard.writeText(tag)} title="Click to copy">
              <Badge variant="secondary" className="text-xs cursor-pointer group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {tag}
              </Badge>
            </button>
          ))}
        </div>
      ) : (
        <pre className="text-xs bg-muted/40 border rounded-md p-3 whitespace-pre-wrap font-mono">{raw}</pre>
      )}
    </div>
  );
}

function CTASection({ content }: { content: string }) {
  const lines = content.split("\n").filter(l => l.trim());
  const variants = lines.filter(l => /^CTA\s*\d/i.test(l)).map(l => l.replace(/^CTA\s*\d+:\s*/i, "").trim());
  if (variants.length === 0) {
    return <OutputSection icon="📣" title="Call to Action Options" content={content} />;
  }
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">📣 Call to Action Options</p>
      <div className="space-y-2">
        {variants.map((v, i) => (
          <div key={i} className="flex items-center justify-between gap-2 bg-muted/40 border rounded-md px-3 py-2">
            <p className="text-sm">{v}</p>
            <CopyBtn text={v} />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmailSubjectSection({ content }: { content: string }) {
  const lines = content.split("\n").filter(l => l.trim());
  const variants = lines.filter(l => /^Option\s*\d/i.test(l)).map(l => l.replace(/^Option\s*\d+:\s*/i, "").trim());
  if (variants.length === 0) {
    return <OutputSection icon="📧" title="Email Subject Lines" content={content} />;
  }
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">📧 Email Subject Lines</p>
      <div className="space-y-2">
        {variants.map((v, i) => (
          <div key={i} className="flex items-center justify-between gap-2 bg-muted/40 border rounded-md px-3 py-2">
            <p className="text-sm font-mono">{v}</p>
            <CopyBtn text={v} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AiBriefPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Form state
  const [selectedGoal, setSelectedGoal] = useState<string>("google_business_post");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("google_business");
  const [selectedPillarId, setSelectedPillarId] = useState<string>("");
  const [campaignContext, setCampaignContext] = useState("");
  const [topic, setTopic] = useState("");
  const [visualStyle, setVisualStyle] = useState("Photorealistic");
  const [selectedOutputs, setSelectedOutputs] = useState<string[]>(
    OUTPUT_OPTIONS.filter(o => o.defaultOn).map(o => o.id)
  );

  // Generated output
  const [output, setOutput] = useState<GenerateResult | null>(null);

  // Save dialog state
  const [saveDate, setSaveDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });

  const { data: briefData, isLoading: dataLoading } = useQuery<BriefData>({
    queryKey: [`/api/admin/ai-brief/${companyId}/data`],
    queryFn: async () => {
      const r = await fetch(`/api/admin/ai-brief/${companyId}/data`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
    enabled: !!companyId,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", `/api/admin/ai-brief/${companyId}/generate`, {
        contentGoal: selectedGoal,
        platform: selectedPlatform,
        pillarId: selectedPillarId || null,
        campaignContext,
        topic,
        visualStyle,
        outputs: selectedOutputs,
      });
      return r.json() as Promise<GenerateResult>;
    },
    onSuccess: (data) => {
      setOutput(data);
      toast({ title: "Brief generated!", description: `Using: ${data.templateUsed}` });
    },
    onError: () => toast({ title: "Generation failed", variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", `/api/admin/ai-brief/${companyId}/save`, {
        platform: selectedPlatform,
        pillarId: selectedPillarId || null,
        title: topic.substring(0, 255) || "AI-Generated Draft",
        bodyContent: output?.sections.captionPrompt || null,
        hashtags: output?.sections.hashtagPrompt || null,
        aiPromptUsed: output?.sections.imagePrompt || null,
        scheduledDate: saveDate,
      });
      return r.json();
    },
    onSuccess: (item) => {
      toast({ title: "Saved as draft!", description: "Redirecting to content calendar…" });
      setTimeout(() => setLocation(`/admin/companies/${companyId}?tab=content-calendar`), 1200);
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const copyEverything = useCallback(() => {
    if (!output) return;
    const s = output.sections;
    const parts = [
      s.imagePrompt ? `🖼️ IMAGE GENERATION PROMPT\n${s.imagePrompt}` : null,
      s.captionPrompt ? `✍️ CAPTION BRIEF\n${s.captionPrompt}` : null,
      s.hashtagPrompt ? `#️⃣ HASHTAGS\n${s.hashtagPrompt}` : null,
      s.ctaPrompt ? `📣 CALL TO ACTION OPTIONS\n${s.ctaPrompt}` : null,
      s.gbpPostPrompt ? `📍 GOOGLE BUSINESS POST\n${s.gbpPostPrompt}` : null,
      s.emailSubjectPrompt ? `📧 EMAIL SUBJECT LINES\n${s.emailSubjectPrompt}` : null,
      s.linkedinOutlinePrompt ? `💼 LINKEDIN OUTLINE\n${s.linkedinOutlinePrompt}` : null,
    ].filter(Boolean);
    navigator.clipboard.writeText(parts.join("\n\n" + "─".repeat(60) + "\n\n"));
    toast({ title: "Copied everything to clipboard!" });
  }, [output, toast]);

  const handleGoalSelect = useCallback((goalId: string) => {
    setSelectedGoal(goalId);
    const goal = CONTENT_GOALS.find(g => g.id === goalId);
    if (goal) setSelectedPlatform(goal.platform);
  }, []);

  const toggleOutput = useCallback((id: string) => {
    setSelectedOutputs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  if (!companyId) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="max-w-md mx-auto text-center space-y-4 py-16">
            <Wand2 className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
            <h2 className="text-lg font-semibold">AI Brief Generator</h2>
            <p className="text-muted-foreground text-sm">Select a company to generate a content brief for.</p>
            <Button asChild><Link href="/admin/companies">Browse Companies</Link></Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const company = briefData?.company;
  const pillars = briefData?.pillars || [];
  const brandProfile = briefData?.brandProfile;
  const sections = output?.sections;

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="gap-1">
              <Link href={`/admin/companies/${companyId}?tab=content-calendar`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Brief Generator
              </h1>
              {dataLoading ? (
                <Skeleton className="h-4 w-32 mt-1" />
              ) : (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {company?.name}
                  {brandProfile ? (
                    <span className="text-green-500 text-[10px] ml-1">✓ Brand profile loaded</span>
                  ) : (
                    <span className="text-amber-500 text-[10px] ml-1">⚠ No brand profile — add one for better results</span>
                  )}
                </p>
              )}
            </div>
          </div>
          {output && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={copyEverything} data-testid="btn-copy-everything">
              <ClipboardCopy className="h-3.5 w-3.5" />
              Copy Everything
            </Button>
          )}
        </div>

        {/* Two-panel layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* ── LEFT PANEL: Brief Builder ── */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">1</span>
                  Content Goal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CONTENT_GOALS.map(goal => {
                    const Icon = goal.icon;
                    const active = selectedGoal === goal.id;
                    return (
                      <button
                        key={goal.id}
                        onClick={() => handleGoalSelect(goal.id)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left text-sm transition-colors ${active ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:bg-muted/50"}`}
                        data-testid={`goal-${goal.id}`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {goal.label}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">2</span>
                  Platform
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                  <SelectTrigger data-testid="select-platform"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1.5">Auto-selected based on goal — override if needed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">3</span>
                  Content Pillar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dataLoading ? <Skeleton className="h-10 w-full" /> : (
                  <Select value={selectedPillarId} onValueChange={setSelectedPillarId}>
                    <SelectTrigger data-testid="select-pillar"><SelectValue placeholder="None (no pillar)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {pillars.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {selectedPillarId && pillars.find(p => p.id === selectedPillarId)?.description && (
                  <p className="text-[11px] text-muted-foreground bg-muted/40 rounded p-2">
                    {pillars.find(p => p.id === selectedPillarId)?.description}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">4</span>
                  Month / Campaign Context
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder='e.g. "June 2025 promotions" or "Summer home improvement season"'
                  value={campaignContext}
                  onChange={e => setCampaignContext(e.target.value)}
                  data-testid="input-campaign-context"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">5</span>
                  Specific Topic or Subject <span className="text-destructive">*</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder='e.g. "Completed 4,200 sq ft luxury kitchen remodel in Naples FL for the Johnson family"'
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  rows={3}
                  data-testid="textarea-topic"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Be specific — the more detail, the better the output</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">6</span>
                  Visual Style
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={visualStyle} onValueChange={setVisualStyle}>
                  <SelectTrigger data-testid="select-visual-style"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VISUAL_STYLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">7</span>
                  Include in Output
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {OUTPUT_OPTIONS.map(opt => (
                  <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer text-sm">
                    <Checkbox
                      checked={selectedOutputs.includes(opt.id)}
                      onCheckedChange={() => toggleOutput(opt.id)}
                      data-testid={`check-output-${opt.id}`}
                    />
                    {opt.label}
                  </label>
                ))}
              </CardContent>
            </Card>

            <Button
              className="w-full gap-2"
              size="lg"
              onClick={() => generateMutation.mutate()}
              disabled={!topic.trim() || generateMutation.isPending}
              data-testid="btn-generate-brief"
            >
              {generateMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Generating Brief…</>
              ) : (
                <><Wand2 className="h-4 w-4" />Generate Brief</>
              )}
            </Button>
          </div>

          {/* ── RIGHT PANEL: Generated Output ── */}
          <div className="space-y-4">
            {!output && !generateMutation.isPending && (
              <Card>
                <CardContent className="py-16 text-center space-y-3">
                  <Sparkles className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
                  <p className="font-medium text-muted-foreground">Your generated brief will appear here</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Fill in the form on the left and click "Generate Brief" to assemble AI-ready prompts from this company's brand data.
                  </p>
                </CardContent>
              </Card>
            )}

            {generateMutation.isPending && (
              <Card>
                <CardContent className="py-8 space-y-3">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <p className="text-sm font-medium">Assembling brief from brand data…</p>
                  </div>
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                </CardContent>
              </Card>
            )}

            {output && sections && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Template: <span className="font-medium">{output.templateUsed}</span></p>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    data-testid="btn-save-draft"
                  >
                    {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarPlus className="h-3.5 w-3.5" />}
                    Save as Draft Calendar Item
                  </Button>
                </div>

                {/* Scheduled date for save */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Label className="text-xs">Scheduled date:</Label>
                  <Input type="date" className="h-7 text-xs w-40" value={saveDate} onChange={e => setSaveDate(e.target.value)} data-testid="input-save-date" />
                </div>

                <Card>
                  <CardContent className="p-4 space-y-6 divide-y divide-border">
                    {sections.imagePrompt && (
                      <div className="pt-0">
                        <OutputSection
                          icon="🖼️"
                          title="Image Generation Prompt"
                          subtitle="Paste directly into Galaxy AI"
                          content={sections.imagePrompt}
                          charLimit={4000}
                        />
                      </div>
                    )}
                    {sections.captionPrompt && (
                      <div className="pt-4">
                        <OutputSection icon="✍️" title="Caption Brief" content={sections.captionPrompt} />
                      </div>
                    )}
                    {sections.hashtagPrompt && (
                      <div className="pt-4">
                        <HashtagSection content={sections.hashtagPrompt} />
                      </div>
                    )}
                    {sections.ctaPrompt && (
                      <div className="pt-4">
                        <CTASection content={sections.ctaPrompt} />
                      </div>
                    )}
                    {sections.gbpPostPrompt && (
                      <div className="pt-4">
                        <OutputSection icon="📍" title="Google Business Post" subtitle="Ready to paste — max 1,500 chars" content={sections.gbpPostPrompt} charLimit={1500} />
                      </div>
                    )}
                    {sections.emailSubjectPrompt && (
                      <div className="pt-4">
                        <EmailSubjectSection content={sections.emailSubjectPrompt} />
                      </div>
                    )}
                    {sections.linkedinOutlinePrompt && (
                      <div className="pt-4">
                        <OutputSection icon="💼" title="LinkedIn Article Outline" content={sections.linkedinOutlinePrompt} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
