import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileTabMenu } from "@/components/mobile-tab-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Upload, Search, Building2, FileImage, User, Calendar, 
  ExternalLink, Eye, File, CheckCircle2, Clock, XCircle, FileText, Loader2, RotateCcw, AlertTriangle, Download, Trash2, HardDrive
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MediaSubmission, MediaSubmissionFile, MediaProfile, Company } from "@shared/schema";

interface EnrichedSubmission extends MediaSubmission {
  company?: Company;
  profile?: MediaProfile;
  submitterName?: string;
  files?: MediaSubmissionFile[];
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
    case "uploaded":
      return (
        <Badge variant="default" className="bg-green-600" data-testid={`status-badge-${status}`}>
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="secondary" data-testid={`status-badge-${status}`}>
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Processing
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="secondary" data-testid={`status-badge-${status}`}>
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" data-testid={`status-badge-${status}`}>
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function FileStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "uploaded":
      return (
        <Badge variant="default" className="bg-green-600 text-xs">
          Uploaded
        </Badge>
      );
    case "uploading":
      return (
        <Badge variant="secondary" className="text-xs">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Uploading
        </Badge>
      );
    case "pending":
      return <Badge variant="secondary" className="text-xs">Pending</Badge>;
    case "failed":
      return <Badge variant="destructive" className="text-xs">Failed</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

interface EnrichedMediaFile extends MediaSubmissionFile {
  submissionTitle: string;
  companyId: string;
  companyName: string;
  isObjectStorage: boolean;
}

export default function AdminMediaSubmissions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [profileFilter, setProfileFilter] = useState<string>("all");
  const [filesCompanyFilter, setFilesCompanyFilter] = useState<string>("all");
  const [filesSearchQuery, setFilesSearchQuery] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<EnrichedSubmission | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [mediaTab, setMediaTab] = useState("submissions");
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: submissions = [], isLoading } = useQuery<EnrichedSubmission[]>({
    queryKey: ["/api/admin/media-submissions"],
    refetchInterval: (query) => {
      const data = query.state.data as EnrichedSubmission[] | undefined;
      const hasProcessing = data?.some(s => s.status === "processing");
      return hasProcessing ? 5000 : false;
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const res = await apiRequest("POST", `/api/admin/media-submissions/${submissionId}/retry`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media-submissions"] });
      toast({ title: "Retry initiated", description: "Files are being re-uploaded to SharePoint in the background." });
    },
    onError: () => {
      toast({ title: "Retry failed", description: "Could not retry the upload. Please try again.", variant: "destructive" });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/media-files/${fileId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media-submissions"] });
      toast({ title: "File deleted", description: "The file has been removed from the server." });
    },
    onError: () => {
      toast({ title: "Delete failed", description: "Could not delete the file. Please try again.", variant: "destructive" });
    },
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: profiles = [] } = useQuery<MediaProfile[]>({
    queryKey: ["/api/admin/media-profiles"],
  });

  const { data: mediaFiles = [], isLoading: filesLoading } = useQuery<EnrichedMediaFile[]>({
    queryKey: ["/api/admin/media-files", filesCompanyFilter !== "all" ? filesCompanyFilter : undefined],
    queryFn: async () => {
      const params = filesCompanyFilter !== "all" ? `?companyId=${filesCompanyFilter}` : "";
      const res = await fetch(`/api/admin/media-files${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch media files");
      return res.json();
    },
  });

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      const matchesSearch = searchQuery === "" || 
        submission.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCompany = companyFilter === "all" || 
        submission.companyId === companyFilter;
      const matchesProfile = profileFilter === "all" || 
        submission.profileId === profileFilter;
      return matchesSearch && matchesCompany && matchesProfile;
    });
  }, [submissions, searchQuery, companyFilter, profileFilter]);

  const filteredFiles = useMemo(() => {
    return mediaFiles.filter(f => {
      const matchesSearch = filesSearchQuery === "" || 
        f.fileName.toLowerCase().includes(filesSearchQuery.toLowerCase()) ||
        f.submissionTitle.toLowerCase().includes(filesSearchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [mediaFiles, filesSearchQuery]);

  const toggleFileSelection = (fileId: string) => {
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedFileIds.size === filteredFiles.length) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(filteredFiles.map(f => f.id)));
    }
  };

  const downloadSelectedFiles = async () => {
    if (selectedFileIds.size === 0) return;
    setIsDownloading(true);
    let successCount = 0;
    let failCount = 0;

    for (const fileId of selectedFileIds) {
      try {
        const res = await fetch(`/api/admin/media-files/${fileId}/download`, { credentials: "include" });
        if (!res.ok) {
          failCount++;
          continue;
        }
        const blob = await res.blob();
        const file = filteredFiles.find(f => f.id === fileId);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file?.fileName || "download";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        successCount++;
        await new Promise(r => setTimeout(r, 300));
      } catch {
        failCount++;
      }
    }

    setIsDownloading(false);
    setSelectedFileIds(new Set());
    if (failCount === 0) {
      toast({ title: "Download complete", description: `${successCount} file${successCount !== 1 ? "s" : ""} downloaded successfully.` });
    } else {
      toast({ title: "Download partially complete", description: `${successCount} succeeded, ${failCount} failed.`, variant: "destructive" });
    }
  };

  const handleViewDetails = (submission: EnrichedSubmission) => {
    setSelectedSubmission(submission);
    setDetailsOpen(true);
  };

  const parseFormData = (formDataString: string): Record<string, any> => {
    try {
      return JSON.parse(formDataString);
    } catch {
      return {};
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="page-title">Media Submissions</h1>
            <p className="text-muted-foreground">View all media submissions across companies</p>
          </div>
          <Badge variant="outline" className="text-lg px-3 py-1" data-testid="submission-count">
            {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        <Tabs value={mediaTab} onValueChange={setMediaTab} className="w-full">
          <MobileTabMenu
            tabs={[
              { value: "submissions", label: "Submissions" },
              { value: "files", label: "Files" },
            ]}
            activeTab={mediaTab}
            onTabChange={setMediaTab}
            title="Media"
          />
          <TabsList className="hidden md:inline-flex mb-4">
            <TabsTrigger value="submissions" data-testid="tab-submissions">
              <Upload className="w-4 h-4 mr-2" />
              Submissions
            </TabsTrigger>
            <TabsTrigger value="files" data-testid="tab-files">
              <File className="w-4 h-4 mr-2" />
              Files
            </TabsTrigger>
          </TabsList>

          <TabsContent value="submissions">
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
              </div>
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-[200px]" data-testid="select-company-filter">
                  <Building2 className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={profileFilter} onValueChange={setProfileFilter}>
                <SelectTrigger className="w-[200px]" data-testid="select-profile-filter">
                  <FileImage className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Profiles</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No submissions found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((submission) => (
                    <TableRow key={submission.id} data-testid={`row-submission-${submission.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          {submission.title}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          {submission.company?.name || "Unknown"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileImage className="w-4 h-4 text-muted-foreground" />
                          {submission.profile?.name || "Unknown"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {submission.submitterName || "Unknown"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Calendar className="w-4 h-4" />
                          {formatDate(submission.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={submission.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {submission.status === "failed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => retryMutation.mutate(submission.id)}
                              disabled={retryMutation.isPending}
                              data-testid={`button-retry-${submission.id}`}
                            >
                              {retryMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <RotateCcw className="w-4 h-4 mr-1" />
                              )}
                              Retry
                            </Button>
                          )}
                          {submission.sharepointFolderUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(submission.sharepointFolderUrl!, "_blank")}
                              data-testid={`button-view-folder-${submission.id}`}
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              View Folder
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(submission)}
                            data-testid={`button-view-details-${submission.id}`}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="files">
            <Card className="mb-6">
              <CardContent className="pt-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search files..."
                        value={filesSearchQuery}
                        onChange={(e) => setFilesSearchQuery(e.target.value)}
                        className="pl-10"
                        data-testid="input-files-search"
                      />
                    </div>
                  </div>
                  <Select value={filesCompanyFilter} onValueChange={setFilesCompanyFilter}>
                    <SelectTrigger className="w-[200px]" data-testid="select-files-company-filter">
                      <Building2 className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {filteredFiles.length} file{filteredFiles.length !== 1 ? "s" : ""}
                  </Badge>
                  {selectedFileIds.size > 0 && (
                    <Button
                      onClick={downloadSelectedFiles}
                      disabled={isDownloading}
                      data-testid="button-download-selected"
                    >
                      {isDownloading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      {isDownloading ? "Downloading..." : `Download ${selectedFileIds.size} file${selectedFileIds.size !== 1 ? "s" : ""}`}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <File className="w-5 h-5" />
                  All Files
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <File className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No files found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={filteredFiles.length > 0 && selectedFileIds.size === filteredFiles.length}
                            onCheckedChange={toggleSelectAll}
                            aria-label="Select all files"
                            data-testid="checkbox-select-all-files"
                          />
                        </TableHead>
                        <TableHead>File Name</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Submission</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Storage</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFiles.map((file) => (
                        <TableRow key={file.id} data-testid={`row-file-${file.id}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedFileIds.has(file.id)}
                              onCheckedChange={() => toggleFileSelection(file.id)}
                              aria-label={`Select ${file.fileName}`}
                              data-testid={`checkbox-file-${file.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate max-w-[200px]">{file.fileName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                              {file.companyName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground truncate max-w-[150px] block">{file.submissionTitle}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{file.fileType.split('/').pop()}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{formatFileSize(file.fileSize)}</span>
                          </TableCell>
                          <TableCell>
                            <FileStatusBadge status={file.status} />
                          </TableCell>
                          <TableCell>
                            {file.isObjectStorage ? (
                              <Badge variant="secondary" className="text-xs">
                                <HardDrive className="w-3 h-3 mr-1" />
                                Local
                              </Badge>
                            ) : file.sharepointUrl ? (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                                <ExternalLink className="w-3 h-3 mr-1" />
                                SharePoint
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">—</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(file.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {file.sharepointUrl && !file.isObjectStorage && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => window.open(file.sharepointUrl!, "_blank")}
                                  data-testid={`button-view-sp-file-${file.id}`}
                                  title="View in SharePoint"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/admin/media-files/${file.id}/download`, { credentials: "include" });
                                    if (!res.ok) throw new Error("Download failed");
                                    const blob = await res.blob();
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = file.fileName;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                  } catch {
                                    toast({ title: "Download failed", description: "Could not download this file.", variant: "destructive" });
                                  }
                                }}
                                data-testid={`button-download-mf-${file.id}`}
                                title="Download file"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {selectedSubmission?.title}
              </DialogTitle>
              <DialogDescription>
                Submitted on {selectedSubmission?.createdAt && formatDate(selectedSubmission.createdAt)}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh]">
              {selectedSubmission && (
                <div className="space-y-6 pr-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Company</p>
                      <p className="font-medium">{selectedSubmission.company?.name || "Unknown"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Profile</p>
                      <p className="font-medium">{selectedSubmission.profile?.name || "Unknown"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Submitted By</p>
                      <p className="font-medium">{selectedSubmission.submitterName || "Unknown"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <StatusBadge status={selectedSubmission.status} />
                    </div>
                  </div>

                  {selectedSubmission.sharepointFolderUrl && (
                    <div>
                      <Button
                        variant="outline"
                        onClick={() => window.open(selectedSubmission.sharepointFolderUrl!, "_blank")}
                        data-testid="button-dialog-view-folder"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open SharePoint Folder
                      </Button>
                    </div>
                  )}

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Form Data
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(parseFormData(selectedSubmission.formData)).map(([key, value]) => (
                        <div key={key} className="bg-muted/50 rounded-md p-3" data-testid={`form-field-${key}`}>
                          <p className="text-sm text-muted-foreground mb-1">{key}</p>
                          <p className="font-medium">
                            {typeof value === "boolean" 
                              ? (value ? "Yes" : "No")
                              : Array.isArray(value)
                              ? value.join(", ")
                              : String(value) || "—"}
                          </p>
                        </div>
                      ))}
                      {Object.keys(parseFormData(selectedSubmission.formData)).length === 0 && (
                        <p className="text-muted-foreground">No form data available</p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <File className="w-4 h-4" />
                        Uploaded Files ({selectedSubmission.files?.length || 0})
                      </h3>
                      {(selectedSubmission.status === "failed" || selectedSubmission.status === "processing") && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={retryMutation.isPending || selectedSubmission.status === "processing"}
                          onClick={() => {
                            retryMutation.mutate(selectedSubmission.id);
                            setDetailsOpen(false);
                          }}
                          data-testid="button-dialog-retry"
                        >
                          {retryMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : selectedSubmission.status === "processing" ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <RotateCcw className="w-4 h-4 mr-1" />
                          )}
                          {selectedSubmission.status === "processing" ? "Processing..." : "Retry Upload"}
                        </Button>
                      )}
                    </div>
                    {selectedSubmission.files && selectedSubmission.files.length > 0 ? (
                      <div className="space-y-2">
                        {selectedSubmission.files.map((file) => (
                          <div
                            key={file.id}
                            className="bg-muted/50 rounded-md p-3"
                            data-testid={`file-item-${file.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <File className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-sm">{file.fileName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(file.fileSize)} · {file.fileType}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <FileStatusBadge status={file.status} />
                                {file.sharepointPath?.startsWith("object-storage:") && (
                                  <Badge variant="secondary" className="text-xs">
                                    <HardDrive className="w-3 h-3 mr-1" />
                                    Local
                                  </Badge>
                                )}
                                {file.sharepointUrl && !file.sharepointPath?.startsWith("object-storage:") && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => window.open(file.sharepointUrl!, "_blank")}
                                    data-testid={`button-view-file-${file.id}`}
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </Button>
                                )}
                                {(file.status === "failed" || file.status === "pending") && file.tempFilePath && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => {
                                        window.open(`/api/admin/media-files/${file.id}/download`, "_blank");
                                      }}
                                      data-testid={`button-download-file-${file.id}`}
                                      title="Download file"
                                    >
                                      <Download className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled={deleteFileMutation.isPending}
                                      onClick={() => setFileToDelete(file.id)}
                                      data-testid={`button-delete-file-${file.id}`}
                                      title="Delete file from server"
                                      className="text-destructive"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                            {file.status === "failed" && file.lastError && (
                              <div className="mt-2 flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-md p-2">
                                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                <span>{file.lastError}</span>
                              </div>
                            )}
                            {file.retryCount > 0 && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Attempts: {file.retryCount}{file.lastRetryAt ? ` · Last try: ${formatDate(file.lastRetryAt)}` : ""}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No files uploaded</p>
                    )}
                  </div>
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => { if (!open) setFileToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this file from the server? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (fileToDelete) {
                  deleteFileMutation.mutate(fileToDelete);
                }
                setFileToDelete(null);
              }}
              data-testid="button-confirm-delete-file"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
