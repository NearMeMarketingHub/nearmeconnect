import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Loader2, Sparkles, Info } from "lucide-react";
import type { AiPromptTemplate } from "@shared/schema";

// ── Constants ─────────────────────────────────────────────────────────────────

const CONTENT_GOALS = [
  { id: "google_business_post", label: "Google Business Profile Post" },
  { id: "social_image", label: "Social Media Image" },
  { id: "social_video", label: "Social Media Video" },
  { id: "email_banner", label: "Email Campaign Banner" },
  { id: "blog_feature", label: "Blog Feature Image" },
  { id: "ad_creative", label: "Ad Creative" },
  { id: "newsletter_header", label: "Newsletter Header" },
  { id: "podcast_thumbnail", label: "Podcast Thumbnail" },
  { id: "case_study_visual", label: "Case Study Visual" },
];

const TEMPLATE_FIELDS: { key: keyof AiPromptTemplate; label: string; placeholder: string }[] = [
  { key: "imagePromptTemplate", label: "Image Generation Prompt Template", placeholder: "Create a {{visual_style}} image for {{company_name}}..." },
  { key: "captionTemplate", label: "Caption / Body Copy Template", placeholder: "Write a caption for {{company_name}} about {{topic}}..." },
  { key: "hashtagTemplate", label: "Hashtag Suggestions Template", placeholder: "Generate hashtags for {{company_name}} in {{geographic_focus}}..." },
  { key: "ctaTemplate", label: "Call-to-Action Options Template", placeholder: "Generate 3 CTAs for {{company_name}} about {{topic}}..." },
  { key: "gbpPostTemplate", label: "Google Business Post Template", placeholder: "Write a GBP post for {{company_name}} about {{topic}}..." },
  { key: "emailSubjectTemplate", label: "Email Subject Lines Template", placeholder: "Write 3 subject lines for {{company_name}} about {{topic}}..." },
  { key: "linkedinOutlineTemplate", label: "LinkedIn Article Outline Template", placeholder: "Create a LinkedIn article outline for {{company_name}} about {{topic}}..." },
];

const AVAILABLE_VARS = [
  "company_name", "industry", "geographic_focus", "brand_voice", "target_audience",
  "uvp", "tagline", "primary_color", "secondary_color", "do_not_use",
  "pillar_name", "pillar_description", "topic", "campaign_context",
  "visual_style", "platform", "platform_label", "content_goal_label",
];

// ── Template Dialog ───────────────────────────────────────────────────────────

function TemplateDialog({ open, onClose, template }: {
  open: boolean; onClose: () => void; template?: AiPromptTemplate | null;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEdit = !!template;

  const [form, setForm] = useState<Partial<AiPromptTemplate>>(() => template || {
    contentGoal: "google_business_post" as any,
    name: "",
    isDefault: false,
    isActive: true,
    imagePromptTemplate: "",
    captionTemplate: "",
    hashtagTemplate: "",
    ctaTemplate: "",
    gbpPostTemplate: "",
    emailSubjectTemplate: "",
    linkedinOutlineTemplate: "",
  });

  const set = (key: keyof typeof form, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        const r = await apiRequest("PATCH", `/api/admin/ai-templates/${template!.id}`, form);
        return r.json();
      } else {
        const r = await apiRequest("POST", "/api/admin/ai-templates", form);
        return r.json();
      }
    },
    onSuccess: () => {
      toast({ title: isEdit ? "Template updated" : "Template created" });
      qc.invalidateQueries({ queryKey: ["/api/admin/ai-templates"] });
      onClose();
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Template" : "Create Template"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-sm">Content Goal <span className="text-destructive">*</span></Label>
              <Select value={form.contentGoal as string} onValueChange={v => set("contentGoal", v)}>
                <SelectTrigger data-testid="select-goal"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTENT_GOALS.map(g => <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Template Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Default GBP Post Template"
                value={form.name || ""}
                onChange={e => set("name", e.target.value)}
                data-testid="input-template-name"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Switch checked={!!form.isDefault} onCheckedChange={v => set("isDefault", v)} data-testid="switch-is-default" />
              Default template for this goal
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Switch checked={form.isActive !== false} onCheckedChange={v => set("isActive", v)} data-testid="switch-is-active" />
              Active
            </label>
          </div>

          {/* Variable reference */}
          <div className="bg-muted/40 rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-semibold flex items-center gap-1"><Info className="h-3.5 w-3.5" />Available Variables</p>
            <div className="flex flex-wrap gap-1">
              {AVAILABLE_VARS.map(v => (
                <code key={v} className="text-[10px] bg-background border rounded px-1 py-0.5 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => navigator.clipboard.writeText(`{{${v}}}`)}>
                  {`{{${v}}}`}
                </code>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">Click a variable to copy it. Leave a template field empty to skip that output section.</p>
          </div>

          {/* Template fields */}
          {TEMPLATE_FIELDS.map(field => (
            <div key={field.key} className="space-y-1">
              <Label className="text-sm">{field.label}</Label>
              <Textarea
                placeholder={field.placeholder}
                value={(form[field.key] as string) || ""}
                onChange={e => set(field.key, e.target.value)}
                rows={4}
                className="font-mono text-xs"
                data-testid={`textarea-${field.key}`}
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.name?.trim() || !form.contentGoal || mutation.isPending} data-testid="btn-save-template">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {isEdit ? "Save Changes" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminAiTemplates() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AiPromptTemplate | null>(null);

  const { data: templates = [], isLoading } = useQuery<AiPromptTemplate[]>({
    queryKey: ["/api/admin/ai-templates"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/admin/ai-templates/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/ai-templates"] }); toast({ title: "Template deleted" }); },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  // Group by content goal
  const grouped = CONTENT_GOALS.map(g => ({
    ...g,
    templates: templates.filter(t => t.contentGoal === g.id),
  })).filter(g => g.templates.length > 0);

  const openCreate = () => { setEditTarget(null); setDialogOpen(true); };
  const openEdit = (t: AiPromptTemplate) => { setEditTarget(t); setDialogOpen(true); };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              AI Prompt Templates
            </h1>
            <p className="text-muted-foreground text-sm">
              Customize the brief generation prompts using <code className="text-xs bg-muted px-1 rounded">{"{{variable}}"}</code> substitution.
              Templates are matched by content goal; if none exists, a built-in default is used.
            </p>
          </div>
          <Button className="gap-1.5" onClick={openCreate} data-testid="btn-create-template">
            <Plus className="h-4 w-4" /> New Template
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <Sparkles className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
              <p className="font-medium text-muted-foreground">No custom templates yet</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                The brief generator uses built-in defaults until you create custom templates here.
                Create templates to fully customize output per content goal.
              </p>
              <Button className="gap-1.5" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Create First Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {grouped.map(group => (
              <Card key={group.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{group.label}</CardTitle>
                  <CardDescription className="text-xs">{group.templates.length} template{group.templates.length !== 1 ? "s" : ""}</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-t bg-muted/30">
                        <th className="text-left p-3 font-medium text-muted-foreground text-xs">Name</th>
                        <th className="text-center p-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Sections</th>
                        <th className="text-center p-3 font-medium text-muted-foreground text-xs">Default</th>
                        <th className="text-center p-3 font-medium text-muted-foreground text-xs">Status</th>
                        <th className="p-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {group.templates.map(t => {
                        const filledSections = TEMPLATE_FIELDS.filter(f => (t[f.key] as string)?.trim()).length;
                        return (
                          <tr key={t.id} className="border-t hover:bg-muted/20" data-testid={`template-row-${t.id}`}>
                            <td className="p-3 font-medium">{t.name}</td>
                            <td className="p-3 text-center hidden sm:table-cell">
                              <span className="text-xs text-muted-foreground">{filledSections}/{TEMPLATE_FIELDS.length} filled</span>
                            </td>
                            <td className="p-3 text-center">
                              {t.isDefault && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-muted text-muted-foreground"}`}>
                                {t.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(t)} data-testid={`btn-edit-template-${t.id}`}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(t.id)} data-testid={`btn-delete-template-${t.id}`}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))}

            {/* Goals with no templates */}
            {CONTENT_GOALS.filter(g => !templates.some(t => t.contentGoal === g.id)).map(g => (
              <div key={g.id} className="flex items-center justify-between p-3 rounded-lg border border-dashed text-sm text-muted-foreground">
                <span>{g.label} — using built-in default</span>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { setEditTarget(null); setDialogOpen(true); }} data-testid={`btn-add-template-${g.id}`}>
                  <Plus className="h-3 w-3" /> Add template
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <TemplateDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        template={editTarget}
      />
    </AdminLayout>
  );
}
