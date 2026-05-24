import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Company } from "@shared/schema";

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else { field += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); lines.push(cur); cur = []; field = ""; }
      else if (c === "\r") { /* ignore */ }
      else { field += c; }
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); lines.push(cur); }
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].map(h => h.trim());
  const rows = lines.slice(1)
    .filter(r => r.some(v => v.trim() !== ""))
    .map(r => {
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => { obj[h] = (r[idx] ?? "").trim(); });
      return obj;
    });
  return { headers, rows };
}

interface BulkContentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Company[];
  defaultCompanyId?: string;
}

export function BulkContentUploadDialog({ open, onOpenChange, companies, defaultCompanyId }: BulkContentUploadDialogProps) {
  const { toast } = useToast();
  const [companyId, setCompanyId] = useState(defaultCompanyId || "");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [parseError, setParseError] = useState<string>("");
  const [result, setResult] = useState<{ created: number; failed: number; errors: { row: number; message: string }[] } | null>(null);

  const reset = () => {
    setRows([]); setHeaders([]); setFileName(""); setParseError(""); setResult(null);
  };

  const downloadTemplate = async () => {
    try {
      const res = await fetch("/api/content-calendar/template", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to download template");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "content-calendar-template.csv";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    }
  };

  const handleFile = async (file: File) => {
    setParseError(""); setResult(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      const { headers, rows } = parseCsv(text);
      if (rows.length === 0) { setParseError("No data rows found in CSV"); return; }
      if (!headers.includes("platform") || !headers.includes("title")) {
        setParseError("CSV must include at minimum 'platform' and 'title' columns");
        return;
      }
      setHeaders(headers);
      setRows(rows);
    } catch (e: any) {
      setParseError(e.message || "Failed to parse CSV");
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/content-calendar/bulk", { companyId, items: rows });
      return await res.json();
    },
    onSuccess: (data: any) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/content-calendar"] });
      if (data.failed === 0) {
        toast({ title: "Upload complete", description: `${data.created} items created.` });
      } else if (data.created > 0) {
        toast({ title: "Partial upload", description: `${data.created} created, ${data.failed} failed.` });
      } else {
        toast({ title: "Upload failed", description: `${data.failed} rows had errors.`, variant: "destructive" });
      }
    },
    onError: (e: any) => {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Content</DialogTitle>
          <DialogDescription>
            Upload many content items at once from a CSV file. Download the template to see required and optional columns (including Google Business Profile fields).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={downloadTemplate} data-testid="button-download-template">
              <Download className="w-4 h-4 mr-2" />
              Download CSV template
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-company">Company</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger id="bulk-company" data-testid="select-bulk-company">
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-file">CSV file</Label>
            <input
              id="bulk-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-input file:bg-background file:text-sm file:font-medium hover:file:bg-accent"
              data-testid="input-bulk-csv"
            />
            {fileName && <p className="text-xs text-muted-foreground" data-testid="text-filename">{fileName} — {rows.length} row(s)</p>}
          </div>

          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription data-testid="text-parse-error">{parseError}</AlertDescription>
            </Alert>
          )}

          {rows.length > 0 && !result && (
            <div className="border rounded-md overflow-x-auto max-h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    {headers.slice(0, 6).map(h => <TableHead key={h}>{h}</TableHead>)}
                    {headers.length > 6 && <TableHead>+{headers.length - 6} more</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 10).map((r, i) => (
                    <TableRow key={i} data-testid={`row-preview-${i}`}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      {headers.slice(0, 6).map(h => (
                        <TableCell key={h} className="text-xs max-w-[160px] truncate">{r[h]}</TableCell>
                      ))}
                      {headers.length > 6 && <TableCell className="text-xs text-muted-foreground">…</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > 10 && (
                <p className="text-xs text-muted-foreground p-2 text-center border-t">…and {rows.length - 10} more rows</p>
              )}
            </div>
          )}

          {result && (
            <div className="space-y-2">
              <Alert variant={result.failed === 0 ? "default" : "destructive"}>
                {result.failed === 0
                  ? <CheckCircle2 className="h-4 w-4" />
                  : <AlertCircle className="h-4 w-4" />}
                <AlertDescription>
                  <span data-testid="text-result-created">{result.created} created</span>
                  {result.failed > 0 && <>, <span data-testid="text-result-failed">{result.failed} failed</span></>}
                </AlertDescription>
              </Alert>
              {result.errors.length > 0 && (
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead className="w-16">Row</TableHead><TableHead>Error</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((er, i) => (
                        <TableRow key={i} data-testid={`row-error-${i}`}>
                          <TableCell><Badge variant="outline">{er.row}</Badge></TableCell>
                          <TableCell className="text-xs">{er.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-bulk">
            Close
          </Button>
          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={!companyId || rows.length === 0 || uploadMutation.isPending || (!!result && result.failed === 0)}
            data-testid="button-submit-bulk"
          >
            {uploadMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            {result ? "Re-upload" : `Upload ${rows.length || ""} item${rows.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
