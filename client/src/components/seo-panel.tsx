import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, ExternalLink, Pencil, Trash2, Download, Globe, CheckCircle2, Clock, AlertTriangle, Filter, BookTemplate, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { SeoDirectory } from "@shared/schema";

// ─── Types / constants ────────────────────────────────────────────────────────

const TYPES = [
  { value: "directory", label: "Directory" },
  { value: "citation", label: "Citation" },
  { value: "gbp", label: "GBP" },
  { value: "local_landing_page", label: "Local Landing Page" },
  { value: "public_blog", label: "Public Blog" },
  { value: "blog_post", label: "Blog Post" },
  { value: "backlink_resource", label: "Backlink/Resource" },
  { value: "other", label: "Other" },
] as const;

const STATUSES = [
  { value: "not_started", label: "Not Started", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  { value: "assigned", label: "Assigned", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  { value: "in_progress", label: "In Progress", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  { value: "submitted", label: "Submitted", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  { value: "pending_verification", label: "Pending Verification", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  { value: "live", label: "Live", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  { value: "needs_update", label: "Needs Update", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  { value: "archived", label: "Archived", color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
] as const;

function statusInfo(val: string) {
  return STATUSES.find(s => s.value === val) ?? STATUSES[0];
}
function typeLabel(val: string) {
  return TYPES.find(t => t.value === val)?.label ?? val;
}

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES: { id: string; name: string; description: string; items: Array<Partial<SeoDirectory>> }[] = [
  {
    id: "gbp-monthly",
    name: "GBP Monthly Update Checklist",
    description: "5 tasks for monthly Google Business Profile upkeep",
    items: [
      { name: "Update GBP Photos", type: "gbp", status: "not_started", targetKeyword: "Google Business Profile" },
      { name: "Post Monthly GBP Update", type: "gbp", status: "not_started" },
      { name: "Respond to GBP Reviews", type: "gbp", status: "not_started" },
      { name: "Update GBP Hours / Info", type: "gbp", status: "not_started" },
      { name: "Add GBP Product/Service Updates", type: "gbp", status: "not_started" },
    ],
  },
  {
    id: "local-citation",
    name: "Local Directory / Citation Checklist",
    description: "10 core local citation directories",
    items: [
      { name: "Yelp", type: "citation", status: "not_started" },
      { name: "Yellow Pages", type: "citation", status: "not_started" },
      { name: "Bing Places", type: "citation", status: "not_started" },
      { name: "Apple Maps", type: "citation", status: "not_started" },
      { name: "Foursquare", type: "citation", status: "not_started" },
      { name: "Manta", type: "citation", status: "not_started" },
      { name: "Better Business Bureau", type: "directory", status: "not_started" },
      { name: "Angi (Angie's List)", type: "directory", status: "not_started" },
      { name: "HomeAdvisor", type: "directory", status: "not_started" },
      { name: "Thumbtack", type: "directory", status: "not_started" },
    ],
  },
  {
    id: "blog-syndication",
    name: "Medium/Public Blog Syndication",
    description: "5 public blog & syndication channels",
    items: [
      { name: "Medium", type: "public_blog", status: "not_started" },
      { name: "LinkedIn Article", type: "public_blog", status: "not_started" },
      { name: "Tumblr", type: "public_blog", status: "not_started" },
      { name: "Blogger", type: "public_blog", status: "not_started" },
      { name: "Vocal Media", type: "public_blog", status: "not_started" },
    ],
  },
  {
    id: "city-landing",
    name: "City/Service Landing Page Checklist",
    description: "5 local landing page tasks",
    items: [
      { name: "Create City Landing Page", type: "local_landing_page", status: "not_started" },
      { name: "Optimize Title/Meta for City", type: "local_landing_page", status: "not_started" },
      { name: "Add Schema Markup (LocalBusiness)", type: "local_landing_page", status: "not_started" },
      { name: "Submit Page to Google Search Console", type: "local_landing_page", status: "not_started" },
      { name: "Build Internal Links to City Page", type: "local_landing_page", status: "not_started" },
    ],
  },
  {
    id: "blog-distribution",
    name: "Blog Post Distribution Checklist",
    description: "7 distribution channels for a blog post",
    items: [
      { name: "Publish Blog Post on Website", type: "blog_post", status: "not_started" },
      { name: "Share on Facebook", type: "blog_post", status: "not_started" },
      { name: "Share on Instagram", type: "blog_post", status: "not_started" },
      { name: "Share on LinkedIn", type: "blog_post", status: "not_started" },
      { name: "Email Newsletter Feature", type: "blog_post", status: "not_started" },
      { name: "Submit to Google Search Console", type: "blog_post", status: "not_started" },
      { name: "Add Internal Links from Blog", type: "blog_post", status: "not_started" },
    ],
  },
];

// ─── Form default ─────────────────────────────────────────────────────────────

const emptyForm = (): Partial<SeoDirectory> => ({
  name: "", type: "directory", status: "not_started", url: "", loginUrl: "",
  targetKeyword: "", targetCity: "", owner: "", dueDate: "", notes: "", evidenceUrl: "", publishedUrl: "",
});

// ─── Main component ───────────────────────────────────────────────────────────

interface Props { companyId: string; currentUserId: string; currentUserName: string; isAdmin?: boolean; }

export function SeoPanel({ companyId, currentUserId, currentUserName, isAdmin }: Props) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SeoDirectory | null>(null);
  const [form, setForm] = useState<Partial<SeoDirectory>>(emptyForm());
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  const { data: items = [], isLoading } = useQuery<SeoDirectory[]>({
    queryKey: ["/api/companies", companyId, "seo-directories"],
    queryFn: async () => {
      const r = await fetch(`/api/companies/${companyId}/seo-directories`);
      return r.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editingItem
      ? apiRequest("PATCH", `/api/companies/${companyId}/seo-directories/${editingItem.id}`, data)
      : apiRequest("POST", `/api/companies/${companyId}/seo-directories`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "seo-directories"] });
      setEditOpen(false); setEditingItem(null); setForm(emptyForm());
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/companies/${companyId}/seo-directories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "seo-directories"] }),
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (items: any[]) => Promise.all(items.map(item =>
      apiRequest("POST", `/api/companies/${companyId}/seo-directories`, {
        ...item, companyId, createdBy: currentUserId, createdByName: currentUserName,
      })
    )),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "seo-directories"] });
      setTemplateDialogOpen(false);
      toast({ title: "Template applied", description: "Items added to your SEO tracker." });
    },
    onError: () => toast({ title: "Failed to apply template", variant: "destructive" }),
  });

  const openNew = () => { setEditingItem(null); setForm(emptyForm()); setEditOpen(true); };
  const openEdit = (item: SeoDirectory) => { setEditingItem(item); setForm({ ...item }); setEditOpen(true); };

  const handleSave = () => {
    if (!form.name?.trim()) return;
    saveMutation.mutate({ ...form, companyId, createdBy: currentUserId, createdByName: currentUserName });
  };

  // Stats
  const liveCount = items.filter(i => i.status === "live").length;
  const inProgressCount = items.filter(i => ["in_progress", "assigned", "submitted", "pending_verification"].includes(i.status)).length;
  const overdueCount = items.filter(i => i.dueDate && new Date(i.dueDate) < new Date() && i.status !== "live" && i.status !== "archived").length;
  const completionPct = items.length > 0 ? Math.round((liveCount / items.length) * 100) : 0;

  // Filter
  const filtered = items.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.targetKeyword ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (item.targetCity ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || item.status === statusFilter;
    const matchType = typeFilter === "all" || item.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  // CSV export
  const handleExport = () => {
    const headers = ["Name", "Type", "Status", "URL", "Target Keyword", "Target City", "Owner", "Due Date", "Submitted Date", "Live Date", "Published URL", "Notes"];
    const rows = items.map(i => [
      i.name, i.type, i.status, i.url ?? "", i.targetKeyword ?? "", i.targetCity ?? "",
      i.owner ?? "", i.dueDate ?? "", i.submittedDate ?? "", i.liveDate ?? "",
      i.publishedUrl ?? "", (i.notes ?? "").replace(/\n/g, " "),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `seo-directories.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Total Tracked</p>
            <p className="text-2xl font-bold">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" />Live</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{liveCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Clock className="h-3 w-3 text-yellow-500" />In Progress</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{inProgressCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-red-500" />Overdue</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{overdueCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Completion bar */}
      {items.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Live completion</span>
            <span className="font-medium">{completionPct}% ({liveCount}/{items.length})</span>
          </div>
          <Progress value={completionPct} className="h-2" />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search directories..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-seo-search" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-40" data-testid="select-seo-status-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 w-36" data-testid="select-seo-type-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5 ml-auto">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setTemplateDialogOpen(true)} data-testid="button-seo-templates">
            <BookTemplate className="h-4 w-4" /> Templates
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport} data-testid="button-seo-export">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button size="sm" className="gap-1.5" onClick={openNew} data-testid="button-seo-new">
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Globe className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No items found</p>
          <p className="text-sm mt-1">Add your first directory listing or apply a template to get started.</p>
          <Button size="sm" className="mt-4 gap-1.5" onClick={openNew}><Plus className="h-4 w-4" />Add Item</Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Type</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Keyword / City</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Owner</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Due</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Links</th>
                <th className="w-16 px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => {
                const si = statusInfo(item.status);
                const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && item.status !== "live" && item.status !== "archived";
                return (
                  <tr key={item.id} className={cn("border-b last:border-0 hover:bg-muted/30 transition-colors", idx % 2 === 0 ? "" : "bg-muted/10")} data-testid={`row-seo-${item.id}`}>
                    <td className="px-3 py-2.5">
                      <p className="font-medium truncate max-w-[200px]">{item.name}</p>
                      {item.notes && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.notes}</p>}
                    </td>
                    <td className="px-3 py-2.5 hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground">{typeLabel(item.type)}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap", si.color)}>{si.label}</span>
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      {item.targetKeyword && <p className="text-xs text-muted-foreground truncate max-w-[140px]">{item.targetKeyword}</p>}
                      {item.targetCity && <p className="text-xs text-muted-foreground truncate max-w-[140px]">{item.targetCity}</p>}
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">{item.owner || "—"}</span>
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <span className={cn("text-xs", isOverdue && "text-red-500 font-medium")}>{item.dueDate || "—"}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700" title="Directory URL" data-testid={`link-seo-url-${item.id}`}><ExternalLink className="h-3.5 w-3.5" /></a>}
                        {item.publishedUrl && <a href={item.publishedUrl} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-700" title="Live URL" data-testid={`link-seo-live-${item.id}`}><Globe className="h-3.5 w-3.5" /></a>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-0.5 justify-end">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(item)} data-testid={`button-edit-seo-${item.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" data-testid={`button-delete-seo-${item.id}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete item?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(item.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={open => { setEditOpen(open); if (!open) { setEditingItem(null); setForm(emptyForm()); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingItem ? "Edit Item" : "Add SEO / Directory Item"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className="text-xs">Name *</Label>
              <Input value={form.name ?? ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Yelp Business Listing" className="mt-1" data-testid="input-seo-name" />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.type ?? "directory"} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                <SelectTrigger className="mt-1" data-testid="select-seo-type"><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status ?? "not_started"} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                <SelectTrigger className="mt-1" data-testid="select-seo-status"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Directory URL</Label>
              <Input value={form.url ?? ""} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://yelp.com/biz/..." className="mt-1" data-testid="input-seo-url" />
            </div>
            <div>
              <Label className="text-xs">Login/Resource Link</Label>
              <Input value={form.loginUrl ?? ""} onChange={e => setForm(f => ({ ...f, loginUrl: e.target.value }))} placeholder="Login URL..." className="mt-1" data-testid="input-seo-login-url" />
            </div>
            <div>
              <Label className="text-xs">Target Keyword / Service</Label>
              <Input value={form.targetKeyword ?? ""} onChange={e => setForm(f => ({ ...f, targetKeyword: e.target.value }))} placeholder="e.g. plumber los angeles" className="mt-1" data-testid="input-seo-keyword" />
            </div>
            <div>
              <Label className="text-xs">Target City / County</Label>
              <Input value={form.targetCity ?? ""} onChange={e => setForm(f => ({ ...f, targetCity: e.target.value }))} placeholder="e.g. Los Angeles, CA" className="mt-1" data-testid="input-seo-city" />
            </div>
            <div>
              <Label className="text-xs">Owner / Assignee</Label>
              <Input value={form.owner ?? ""} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="Team member name" className="mt-1" data-testid="input-seo-owner" />
            </div>
            <div>
              <Label className="text-xs">Due Date</Label>
              <Input type="date" value={form.dueDate ?? ""} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="mt-1" data-testid="input-seo-due-date" />
            </div>
            <div>
              <Label className="text-xs">Submitted Date</Label>
              <Input type="date" value={form.submittedDate ?? ""} onChange={e => setForm(f => ({ ...f, submittedDate: e.target.value }))} className="mt-1" data-testid="input-seo-submitted-date" />
            </div>
            <div>
              <Label className="text-xs">Live Date</Label>
              <Input type="date" value={form.liveDate ?? ""} onChange={e => setForm(f => ({ ...f, liveDate: e.target.value }))} className="mt-1" data-testid="input-seo-live-date" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Published / Live URL</Label>
              <Input value={form.publishedUrl ?? ""} onChange={e => setForm(f => ({ ...f, publishedUrl: e.target.value }))} placeholder="https://..." className="mt-1" data-testid="input-seo-published-url" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Evidence URL</Label>
              <Input value={form.evidenceUrl ?? ""} onChange={e => setForm(f => ({ ...f, evidenceUrl: e.target.value }))} placeholder="Screenshot link or evidence URL..." className="mt-1" data-testid="input-seo-evidence-url" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes ?? ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="mt-1 resize-none" placeholder="Any notes about this listing..." data-testid="textarea-seo-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name?.trim() || saveMutation.isPending} data-testid="button-save-seo">
              {saveMutation.isPending ? "Saving..." : editingItem ? "Save Changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Apply a Template</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Select a template to bulk-add items to this client's SEO tracker.</p>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto py-1">
            {TEMPLATES.map(t => (
              <div key={t.id} className="border rounded-lg p-4 space-y-2 hover:bg-muted/40 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.description} · {t.items.length} items</p>
                  </div>
                  <Button size="sm" onClick={() => bulkCreateMutation.mutate(t.items as any[])} disabled={bulkCreateMutation.isPending} data-testid={`button-apply-template-${t.id}`}>
                    Apply
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {t.items.slice(0, 5).map((item, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 bg-muted rounded">{item.name}</span>
                  ))}
                  {t.items.length > 5 && <span className="text-[10px] text-muted-foreground">+{t.items.length - 5} more</span>}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
