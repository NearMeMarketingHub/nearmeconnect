import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClientLayout } from "@/components/client-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Upload, FileVideo, FileImage, FileText, Cloud, Check, X, Loader2, AlertTriangle, Files, ArrowLeft, FolderOpen, Calendar, Info } from "lucide-react";
import type { MediaProfile, MediaProfileField, MediaSubmission } from "@shared/schema";

interface MediaUploadsProps {
  companyId: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024; // 50GB

interface FileUploadState {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
}

export default function MediaUploads({ companyId }: MediaUploadsProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<FileUploadState[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [formData, setFormData] = useState<Record<string, string | boolean>>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploading || isSubmitting) {
        e.preventDefault();
        e.returnValue = "Upload in progress. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isUploading, isSubmitting]);

  const { data: profiles, isLoading: profilesLoading } = useQuery<(MediaProfile & { fields: MediaProfileField[] })[]>({
    queryKey: ["/api/companies", companyId, "media-profiles"],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}/media-profiles`);
      if (!response.ok) throw new Error("Failed to fetch profiles");
      return response.json();
    },
    enabled: !!companyId,
  });

  const { data: submissions, isLoading: submissionsLoading } = useQuery<(MediaSubmission & { profile?: MediaProfile })[]>({
    queryKey: ["/api/companies", companyId, "media-submissions"],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}/media-submissions`);
      if (!response.ok) throw new Error("Failed to fetch submissions");
      return response.json();
    },
    enabled: !!companyId,
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasProcessing = data?.some(s => s.status === "processing" || s.status === "pending");
      return hasProcessing ? 3000 : false;
    },
  });

  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);
  const profileFields = selectedProfile?.fields;
  const fieldsLoading = profilesLoading;

  const handleSelectProfile = (profileId: string) => {
    setSelectedProfileId(profileId);
    setTitle("");
    setFormData({});
    setSelectedFiles([]);
    setFormErrors({});
  };

  const handleBackToProfiles = () => {
    setSelectedProfileId(null);
    setTitle("");
    setFormData({});
    setSelectedFiles([]);
    setFormErrors({});
  };

  const handleFieldChange = (fieldId: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    if (formErrors[fieldId]) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = "Title is required";
    }

    if (profileFields) {
      for (const field of profileFields) {
        if (field.fieldType === "info_text") continue;
        if (field.isRequired) {
          const value = formData[field.id];
          if (field.fieldType === "checkbox") {
            if (value !== true) {
              errors[field.id] = `${field.label} is required`;
            }
          } else if (!value || (typeof value === "string" && !value.trim())) {
            errors[field.id] = `${field.label} is required`;
          }
        }
      }
    }

    if (selectedFiles.length === 0) {
      errors.files = "Please select at least one file to upload";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

  const uploadFileInChunks = async (file: File, fileIndex: number): Promise<{ uploadId: string; fileName: string; fileType: string; fileSize: number }> => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    const initRes = await fetch("/api/media-uploads/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size }),
    });
    if (!initRes.ok) {
      const err = await initRes.json().catch(() => ({ error: "Failed to initialize upload" }));
      throw new Error(err.error || "Failed to initialize upload");
    }
    const { uploadId } = await initRes.json();

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const chunkForm = new FormData();
      chunkForm.append("chunk", chunk);
      chunkForm.append("chunkIndex", String(i));
      chunkForm.append("totalChunks", String(totalChunks));
      chunkForm.append("fileName", file.name);

      const chunkRes = await fetch(`/api/media-uploads/${uploadId}/chunk`, {
        method: "POST",
        credentials: "include",
        body: chunkForm,
      });
      if (!chunkRes.ok) {
        const err = await chunkRes.json().catch(() => ({ error: "Chunk upload failed" }));
        throw new Error(err.error || `Chunk ${i + 1}/${totalChunks} failed`);
      }

      const progress = Math.round(((i + 1) / totalChunks) * 100);
      setUploadQueue(prev => prev.map((item, idx) =>
        idx === fileIndex ? { ...item, progress, status: 'uploading' as const } : item
      ));
    }

    const completeRes = await fetch(`/api/media-uploads/${uploadId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size }),
    });
    if (!completeRes.ok) {
      const err = await completeRes.json().catch(() => ({ error: "Failed to complete upload" }));
      throw new Error(err.error || "Failed to complete upload");
    }
    const result = await completeRes.json();
    return result;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !selectedProfileId) return;

    setIsSubmitting(true);
    setIsUploading(true);

    try {
      const uploadStates: FileUploadState[] = selectedFiles.map(file => ({
        file,
        progress: 0,
        status: 'pending' as const,
      }));
      setUploadQueue(uploadStates);

      const uploadedFiles: { uploadId: string; fileName: string; fileType: string; fileSize: number }[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        setUploadQueue(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'uploading' as const } : item
        ));

        try {
          const result = await uploadFileInChunks(selectedFiles[i], i);
          uploadedFiles.push(result);

          setUploadQueue(prev => prev.map((item, idx) =>
            idx === i ? { ...item, status: 'completed' as const, progress: 100 } : item
          ));
        } catch (err: any) {
          setUploadQueue(prev => prev.map((item, idx) =>
            idx === i ? { ...item, status: 'failed' as const, error: err.message } : item
          ));
          throw err;
        }
      }

      const submissionRes = await fetch(`/api/companies/${companyId}/media-submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          profileId: selectedProfileId,
          title: title.trim(),
          formData: JSON.stringify(formData),
          files: uploadedFiles.map(f => ({
            uploadId: f.uploadId,
            fileName: f.fileName,
            fileType: f.fileType,
            fileSize: f.fileSize,
          })),
        }),
      });

      if (!submissionRes.ok) {
        const err = await submissionRes.json().catch(() => ({ error: "Submission failed" }));
        throw new Error(err.error || "Submission failed");
      }

      toast({
        title: "Submission received",
        description: `"${title}" with ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} received. Files are being uploaded to SharePoint in the background.`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "media-submissions"] });

      setTimeout(() => {
        handleBackToProfiles();
        setUploadQueue([]);
      }, 2000);

    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error.message || "Failed to submit the form",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const addFilesToQueue = useCallback((files: File[]) => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (max 50GB)`);
        continue;
      }
      validFiles.push(file);
    }

    if (errors.length > 0) {
      toast({
        title: "Some files skipped",
        description: errors.slice(0, 3).join(", ") + (errors.length > 3 ? `... and ${errors.length - 3} more` : ""),
        variant: "destructive",
      });
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      if (formErrors.files) {
        setFormErrors(prev => {
          const next = { ...prev };
          delete next.files;
          return next;
        });
      }
    }
  }, [toast, formErrors.files]);

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (isUploading) {
      toast({
        title: "Upload in progress",
        description: "Please wait for the current upload to complete",
        variant: "destructive",
      });
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    addFilesToQueue(files);
  }, [addFilesToQueue, isUploading, toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isUploading) {
      toast({
        title: "Upload in progress",
        description: "Please wait for the current upload to complete",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      addFilesToQueue(files);
    }
    e.target.value = "";
  }, [addFilesToQueue, isUploading, toast]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const totalProgress = uploadQueue.length > 0
    ? Math.round(uploadQueue.reduce((sum, item) => sum + item.progress, 0) / uploadQueue.length)
    : 0;

  const renderField = (field: MediaProfileField) => {
    const value = formData[field.id];
    const error = formErrors[field.id];

    switch (field.fieldType) {
      case "text":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={`field-${field.id}`}>
              {field.label}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={`field-${field.id}`}
              placeholder={field.placeholder || ""}
              value={(value as string) || ""}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              data-testid={`input-field-${field.id}`}
            />
            {field.helpText && (
              <p className="text-sm text-muted-foreground">{field.helpText}</p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case "textarea":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={`field-${field.id}`}>
              {field.label}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={`field-${field.id}`}
              placeholder={field.placeholder || ""}
              value={(value as string) || ""}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              rows={4}
              data-testid={`textarea-field-${field.id}`}
            />
            {field.helpText && (
              <p className="text-sm text-muted-foreground">{field.helpText}</p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case "select": {
        let options: string[] = [];
        try {
          options = field.options ? JSON.parse(field.options) : [];
        } catch {}

        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={`field-${field.id}`}>
              {field.label}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={(value as string) || ""}
              onValueChange={(val) => handleFieldChange(field.id, val)}
            >
              <SelectTrigger data-testid={`select-field-${field.id}`}>
                <SelectValue placeholder={field.placeholder || "Select an option"} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option, idx) => (
                  <SelectItem key={idx} value={option} data-testid={`select-option-${field.id}-${idx}`}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.helpText && (
              <p className="text-sm text-muted-foreground">{field.helpText}</p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );
      }

      case "checkbox":
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`field-${field.id}`}
                checked={(value as boolean) || false}
                onCheckedChange={(checked) => handleFieldChange(field.id, checked as boolean)}
                data-testid={`checkbox-field-${field.id}`}
              />
              <Label htmlFor={`field-${field.id}`} className="cursor-pointer">
                {field.label}
                {field.isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
            </div>
            {field.helpText && (
              <p className="text-sm text-muted-foreground ml-6">{field.helpText}</p>
            )}
            {error && <p className="text-sm text-red-500 ml-6">{error}</p>}
          </div>
        );

      case "date":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={`field-${field.id}`}>
              {field.label}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <DatePicker
              value={(value as string) || ""}
              onChange={(val) => handleFieldChange(field.id, val)}
              data-testid={`date-field-${field.id}`}
            />
            {field.helpText && (
              <p className="text-sm text-muted-foreground">{field.helpText}</p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case "info_text":
        return (
          <div
            key={field.id}
            className="flex gap-3 p-4 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
            data-testid={`info-text-field-${field.id}`}
          >
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-wrap">{field.label}</p>
          </div>
        );

      default:
        return null;
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("video/")) {
      return <FileVideo className="h-5 w-5 text-blue-500" />;
    } else if (file.type.startsWith("image/")) {
      return <FileImage className="h-5 w-5 text-green-500" />;
    }
    return <FileText className="h-5 w-5 text-orange-500" />;
  };

  return (
    <ClientLayout companyId={companyId}>
      <div className="p-6 space-y-6" data-testid="media-uploads-page">
        <div>
          <h1 className="text-2xl font-semibold">Media Uploads</h1>
          <p className="text-muted-foreground">
            Submit files with structured information to your SharePoint folder.
          </p>
        </div>

        {!selectedProfileId ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Select Upload Type
              </CardTitle>
              <CardDescription>
                Choose a submission type to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profilesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </div>
              ) : profiles && profiles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {profiles.map((profile) => (
                    <button
                      key={profile.id}
                      className="flex items-center gap-3 p-3 rounded-lg border text-left cursor-pointer hover-elevate transition-all bg-card"
                      onClick={() => handleSelectProfile(profile.id)}
                      data-testid={`profile-card-${profile.id}`}
                    >
                      <div className="p-1.5 bg-primary/10 rounded-md shrink-0">
                        <Cloud className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium truncate">{profile.name}</h3>
                        {profile.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {profile.description}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No upload types available</p>
                  <p className="text-sm">Contact your administrator to set up media profiles</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackToProfiles}
                  disabled={isSubmitting}
                  data-testid="button-back-to-profiles"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5" />
                    {selectedProfile?.name || "Upload Form"}
                  </CardTitle>
                  {selectedProfile?.description && (
                    <CardDescription>{selectedProfile.description}</CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {isSubmitting ? (
                <div className="space-y-4 py-8">
                  <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
                  <div className="space-y-2 text-center">
                    <p className="text-sm font-medium">Uploading submission...</p>
                    <div className="max-w-md mx-auto">
                      <Progress value={totalProgress} className="h-3" data-testid="upload-progress-bar" />
                      <p className="text-sm text-muted-foreground mt-1" data-testid="upload-progress-text">
                        {totalProgress}% complete
                      </p>
                    </div>
                  </div>

                  <div className="max-w-lg mx-auto space-y-2 mt-4">
                    {uploadQueue.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 text-left">
                        <div className="flex-shrink-0 w-6">
                          {item.status === 'completed' ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : item.status === 'failed' ? (
                            <X className="h-4 w-4 text-red-500" />
                          ) : item.status === 'uploading' ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{item.file.name}</p>
                          {item.status === 'uploading' && (
                            <Progress value={item.progress} className="h-1 mt-1" />
                          )}
                          {item.status === 'failed' && item.error && (
                            <p className="text-xs text-red-500">{item.error}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatFileSize(item.file.size)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 max-w-md mx-auto mt-4">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <p className="text-sm font-medium">Please stay on this page until upload completes</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      placeholder="Enter a title for this submission"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (formErrors.title) {
                          setFormErrors(prev => {
                            const next = { ...prev };
                            delete next.title;
                            return next;
                          });
                        }
                      }}
                      data-testid="input-title"
                    />
                    <p className="text-sm text-muted-foreground">
                      This will be used as the SharePoint folder name
                    </p>
                    {formErrors.title && <p className="text-sm text-red-500">{formErrors.title}</p>}
                  </div>

                  {fieldsLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : profileFields && profileFields.length > 0 ? (
                    <div className="space-y-4">
                      {profileFields.map(renderField)}
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label>
                      Files <span className="text-red-500">*</span>
                    </Label>
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        isDragging
                          ? "border-primary bg-primary/5"
                          : "border-muted-foreground/25 hover:border-muted-foreground/50"
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      data-testid="upload-dropzone"
                    >
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="font-medium text-sm mb-1">Drag and drop files here</p>
                      <p className="text-sm text-muted-foreground mb-3">or click to browse (max 50GB per file)</p>
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        multiple
                        onChange={handleFileSelect}
                        data-testid="file-input"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById("file-upload")?.click()}
                        data-testid="button-browse-files"
                      >
                        <Files className="h-4 w-4 mr-2" />
                        Browse Files
                      </Button>
                    </div>
                    {formErrors.files && <p className="text-sm text-red-500">{formErrors.files}</p>}

                    {selectedFiles.length > 0 && (
                      <div className="space-y-2 mt-3">
                        <p className="text-sm font-medium">Selected files ({selectedFiles.length})</p>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {selectedFiles.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 border rounded-lg"
                              data-testid={`selected-file-${index}`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {getFileIcon(file)}
                                <span className="text-sm truncate">{file.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {formatFileSize(file.size)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => removeFile(index)}
                                  data-testid={`button-remove-file-${index}`}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={handleBackToProfiles}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      data-testid="button-submit"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Submit
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Submission History</CardTitle>
            <CardDescription>
              Previously submitted uploads
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submissionsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : submissions && submissions.length > 0 ? (
              <div className="space-y-3">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                    data-testid={`submission-item-${submission.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FolderOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{submission.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {submission.profile?.name || "Unknown profile"} • {formatDate(submission.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={submission.status === "uploaded" || submission.status === "completed" ? "default" : submission.status === "pending" || submission.status === "processing" ? "secondary" : "destructive"}>
                        {submission.status === "uploaded" || submission.status === "completed" ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : submission.status === "pending" || submission.status === "processing" ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <X className="h-3 w-3 mr-1" />
                        )}
                        {submission.status === "processing" ? "Processing" : submission.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileImage className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No submissions yet</p>
                <p className="text-sm">Select an upload type above to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
