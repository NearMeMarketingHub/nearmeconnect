import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { parseLocalDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileTabMenu } from "@/components/mobile-tab-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AdminLayout } from "@/components/admin-layout";
import { Plus, Video, FileText, Link2, HelpCircle, Pencil, Trash2, Users, Building2, User, Upload, Loader2, Download } from "lucide-react";
import type { TrainingModule, TrainingAssignment, Company, UserTag } from "@shared/schema";

interface TrainingModuleWithStats extends TrainingModule {
  assignmentCount?: number;
  completionCount?: number;
}

export default function AdminTraining() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("assignments");
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<TrainingModule | null>(null);
  
  // Module form state
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [moduleContentType, setModuleContentType] = useState("video");
  const [moduleContentUrl, setModuleContentUrl] = useState("");
  const [moduleDuration, setModuleDuration] = useState("");
  const [moduleIsRequired, setModuleIsRequired] = useState(false);
  
  // Document upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  
  // Assignment form state
  const [assignModuleId, setAssignModuleId] = useState("");
  const [assignType, setAssignType] = useState<"company" | "individual" | "role_group" | "tag">("company");
  const [assignCompanyId, setAssignCompanyId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedRoleGroup, setSelectedRoleGroup] = useState<string>("");
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [assignDueDate, setAssignDueDate] = useState("");
  const [assignIsRequired, setAssignIsRequired] = useState(true);

  const { data: modules = [], isLoading: modulesLoading } = useQuery<TrainingModuleWithStats[]>({
    queryKey: ["/api/admin/training-modules"],
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<TrainingAssignment[]>({
    queryKey: ["/api/training-assignments"],
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  interface CompanyUser {
    id: string;
    memberId: string;
    role: string;
    email: string;
    firstName: string;
    lastName: string;
    createdAt: string;
    tags?: UserTag[];
  }

  const { data: companyUsers = [] } = useQuery<CompanyUser[]>({
    queryKey: ["/api/admin/companies", assignCompanyId, "users"],
    queryFn: async () => {
      if (!assignCompanyId) return [];
      const response = await fetch(`/api/admin/companies/${assignCompanyId}/users`);
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
    enabled: !!assignCompanyId,
  });

  const { data: allTags = [] } = useQuery<UserTag[]>({
    queryKey: ["/api/admin/user-tags"],
  });

  const companyOwners = companyUsers.filter(u => u.role === "company_owner");
  const companyAdmins = companyUsers.filter(u => u.role === "company_admin");
  const teamMembers = companyUsers.filter(u => u.role === "team_member");

  const usersWithSelectedTag = selectedTagId
    ? companyUsers.filter(u => u.tags?.some(t => t.id === selectedTagId))
    : [];

  const createModuleMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/admin/training-modules", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/training-modules"] });
      resetModuleForm();
      setModuleDialogOpen(false);
      toast({ title: "Training module created" });
    },
    onError: () => {
      toast({ title: "Failed to create module", variant: "destructive" });
    },
  });

  const updateModuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/admin/training-modules/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/training-modules"] });
      resetModuleForm();
      setModuleDialogOpen(false);
      setEditingModule(null);
      toast({ title: "Training module updated" });
    },
    onError: () => {
      toast({ title: "Failed to update module", variant: "destructive" });
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/training-modules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/training-modules"] });
      toast({ title: "Training module deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete module", variant: "destructive" });
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/admin/training-assignments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-assignments"] });
      resetAssignmentForm();
      setAssignDialogOpen(false);
      toast({ title: "Training assigned" });
    },
    onError: () => {
      toast({ title: "Failed to assign training", variant: "destructive" });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/training-assignments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-assignments"] });
      toast({ title: "Assignment removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove assignment", variant: "destructive" });
    },
  });

  const resetModuleForm = () => {
    setModuleTitle("");
    setModuleDescription("");
    setModuleContentType("video");
    setModuleContentUrl("");
    setModuleDuration("");
    setModuleIsRequired(false);
    setUploadedFileName(null);
  };

  const resetAssignmentForm = () => {
    setAssignModuleId("");
    setAssignType("company");
    setAssignCompanyId("");
    setSelectedUserIds([]);
    setSelectedRoleGroup("");
    setSelectedTagId("");
    setAssignDueDate("");
    setAssignIsRequired(true);
  };

  const openEditModule = (module: TrainingModule) => {
    setEditingModule(module);
    setModuleTitle(module.title);
    setModuleDescription(module.description || "");
    setModuleContentType(module.contentType);
    setModuleContentUrl(module.contentUrl || "");
    setModuleDuration(module.duration?.toString() || "");
    setModuleIsRequired(module.isRequired);
    setUploadedFileName(module.documentFileName || null);
    setModuleDialogOpen(true);
  };

  const handleDocumentUpload = async (file: File, moduleId: string) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch(`/api/admin/training-modules/${moduleId}/document`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }
      
      const result = await response.json();
      setUploadedFileName(result.fileName);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/training-modules"] });
      toast({ title: "Document uploaded successfully" });
    } catch (error: any) {
      toast({ title: error.message || "Failed to upload document", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleSaveModule = () => {
    const data = {
      title: moduleTitle,
      description: moduleDescription || null,
      contentType: moduleContentType,
      contentUrl: moduleContentUrl || null,
      duration: moduleDuration ? parseInt(moduleDuration) : null,
      isRequired: moduleIsRequired,
      isActive: true,
    };

    if (editingModule) {
      updateModuleMutation.mutate({ id: editingModule.id, data });
    } else {
      createModuleMutation.mutate(data);
    }
  };

  const handleCreateAssignment = async () => {
    if (assignType === "company") {
      const data = {
        trainingModuleId: assignModuleId,
        assignmentType: "company",
        companyId: assignCompanyId,
        userId: null,
        dueDate: assignDueDate || null,
        isRequired: assignIsRequired,
      };
      createAssignmentMutation.mutate(data);
    } else if (assignType === "individual" && selectedUserIds.length > 0) {
      for (const userId of selectedUserIds) {
        const data = {
          trainingModuleId: assignModuleId,
          assignmentType: "individual",
          companyId: null,
          userId,
          dueDate: assignDueDate || null,
          isRequired: assignIsRequired,
        };
        await apiRequest("POST", "/api/admin/training-assignments", data);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/training-assignments"] });
      resetAssignmentForm();
      setAssignDialogOpen(false);
      toast({ title: `Training assigned to ${selectedUserIds.length} user(s)` });
    } else if (assignType === "role_group" && selectedRoleGroup) {
      let usersToAssign: CompanyUser[] = [];
      if (selectedRoleGroup === "company_owner") {
        usersToAssign = companyOwners;
      } else if (selectedRoleGroup === "company_admin") {
        usersToAssign = companyAdmins;
      } else if (selectedRoleGroup === "team_member") {
        usersToAssign = teamMembers;
      }
      
      for (const user of usersToAssign) {
        const data = {
          trainingModuleId: assignModuleId,
          assignmentType: "individual",
          companyId: null,
          userId: user.id,
          groupName: selectedRoleGroup,
          dueDate: assignDueDate || null,
          isRequired: assignIsRequired,
        };
        await apiRequest("POST", "/api/admin/training-assignments", data);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/training-assignments"] });
      resetAssignmentForm();
      setAssignDialogOpen(false);
      toast({ title: `Training assigned to ${usersToAssign.length} ${selectedRoleGroup.replace("_", " ")}(s)` });
    } else if (assignType === "tag" && selectedTagId) {
      const tagName = allTags.find(t => t.id === selectedTagId)?.name || "tag";
      if (usersWithSelectedTag.length === 0) {
        toast({ title: "No users found", description: `No users in this company have the "${tagName}" tag.`, variant: "destructive" });
        return;
      }

      for (const user of usersWithSelectedTag) {
        const data = {
          trainingModuleId: assignModuleId,
          assignmentType: "individual",
          companyId: null,
          userId: user.id,
          groupName: `tag:${tagName}`,
          dueDate: assignDueDate || null,
          isRequired: assignIsRequired,
        };
        await apiRequest("POST", "/api/admin/training-assignments", data);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/training-assignments"] });
      resetAssignmentForm();
      setAssignDialogOpen(false);
      toast({ title: `Training assigned to ${usersWithSelectedTag.length} user(s) with "${tagName}" tag` });
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="h-4 w-4" />;
      case "document": return <FileText className="h-4 w-4" />;
      case "link": return <Link2 className="h-4 w-4" />;
      case "quiz": return <HelpCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return "N/A";
    const company = companies.find(c => c.id === companyId);
    return company?.name || "Unknown";
  };

  const getModuleName = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    return module?.title || "Unknown";
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Training Management</h1>
            <p className="text-muted-foreground">Create and assign training modules to clients</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <div>
              <MobileTabMenu
                tabs={[
                  { value: "assignments", label: "Assignments" },
                  { value: "modules", label: "Modules" },
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                title="Training"
              />
              <TabsList className="hidden md:inline-flex">
                <TabsTrigger value="assignments" data-testid="tab-training-assignments">Assignments</TabsTrigger>
                <TabsTrigger value="modules" data-testid="tab-training-modules">Modules</TabsTrigger>
              </TabsList>
            </div>
            
            {activeTab === "modules" && (
              <Dialog open={moduleDialogOpen} onOpenChange={(open) => {
                setModuleDialogOpen(open);
                if (!open) {
                  setEditingModule(null);
                  resetModuleForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-module">
                    <Plus className="h-4 w-4 mr-2" />
                    New Module
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingModule ? "Edit Module" : "Create Training Module"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={moduleTitle}
                        onChange={(e) => setModuleTitle(e.target.value)}
                        placeholder="Enter module title"
                        data-testid="input-module-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={moduleDescription}
                        onChange={(e) => setModuleDescription(e.target.value)}
                        placeholder="Enter module description"
                        data-testid="input-module-description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Content Type</Label>
                      <Select value={moduleContentType} onValueChange={setModuleContentType}>
                        <SelectTrigger data-testid="select-content-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="document">Document</SelectItem>
                          <SelectItem value="link">External Link</SelectItem>
                          <SelectItem value="quiz">Quiz</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {moduleContentType === "document" ? (
                      <div className="space-y-2">
                        <Label>Upload Document</Label>
                        {editingModule && (uploadedFileName || editingModule.documentFileName) ? (
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{uploadedFileName || editingModule.documentFileName}</p>
                                {editingModule.documentFileSize && (
                                  <p className="text-xs text-muted-foreground">{formatFileSize(editingModule.documentFileSize)}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                data-testid="button-replace-document"
                              >
                                {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Replace"}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`/api/training-modules/${editingModule.id}/document/download`)}
                                data-testid="button-download-document"
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed rounded-lg p-6 text-center">
                            {editingModule ? (
                              <>
                                <input
                                  type="file"
                                  ref={fileInputRef}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file && editingModule) {
                                      handleDocumentUpload(file, editingModule.id);
                                    }
                                  }}
                                  className="hidden"
                                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                                  data-testid="input-document-file"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => fileInputRef.current?.click()}
                                  disabled={isUploading}
                                  data-testid="button-upload-document"
                                >
                                  {isUploading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Upload className="w-4 h-4 mr-2" />
                                  )}
                                  Upload Document
                                </Button>
                                <p className="text-xs text-muted-foreground mt-2">PDF, Word, Excel, PowerPoint (max 100MB)</p>
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground">Save the module first, then upload a document</p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Content URL</Label>
                        <Input
                          value={moduleContentUrl}
                          onChange={(e) => setModuleContentUrl(e.target.value)}
                          placeholder="YouTube URL, document link, etc."
                          data-testid="input-content-url"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Duration (minutes)</Label>
                      <Input
                        type="number"
                        value={moduleDuration}
                        onChange={(e) => setModuleDuration(e.target.value)}
                        placeholder="Estimated duration"
                        data-testid="input-duration"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="isRequired"
                        checked={moduleIsRequired}
                        onCheckedChange={(checked) => setModuleIsRequired(!!checked)}
                      />
                      <Label htmlFor="isRequired">Required training</Label>
                    </div>
                    <Button
                      onClick={handleSaveModule}
                      disabled={!moduleTitle || createModuleMutation.isPending || updateModuleMutation.isPending}
                      className="w-full"
                      data-testid="button-save-module"
                    >
                      {editingModule ? "Update Module" : "Create Module"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {activeTab === "assignments" && (
              <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-assignment">
                    <Plus className="h-4 w-4 mr-2" />
                    Assign Training
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Assign Training</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Training Module</Label>
                      <Select value={assignModuleId} onValueChange={setAssignModuleId}>
                        <SelectTrigger data-testid="select-assign-module">
                          <SelectValue placeholder="Select a module" />
                        </SelectTrigger>
                        <SelectContent>
                          {modules.filter(m => m.isActive).map((module) => (
                            <SelectItem key={module.id} value={module.id}>
                              {module.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Company</Label>
                      <Select value={assignCompanyId} onValueChange={(v) => {
                        setAssignCompanyId(v);
                        setSelectedUserIds([]);
                        setSelectedRoleGroup("");
                      }}>
                        <SelectTrigger data-testid="select-assign-company">
                          <SelectValue placeholder="Select a company first" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {assignCompanyId && (
                      <div className="space-y-2">
                        <Label>Assign To</Label>
                        <Select value={assignType} onValueChange={(v) => {
                          setAssignType(v as "company" | "individual" | "role_group" | "tag");
                          setSelectedUserIds([]);
                          setSelectedRoleGroup("");
                          setSelectedTagId("");
                        }}>
                          <SelectTrigger data-testid="select-assign-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="company">Entire Company</SelectItem>
                            <SelectItem value="individual">Select Individual Users</SelectItem>
                            <SelectItem value="role_group">Role Group</SelectItem>
                            <SelectItem value="tag">By Tag</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {assignCompanyId && assignType === "individual" && (
                      <div className="space-y-3">
                        <Label>Select Users ({selectedUserIds.length} selected)</Label>
                        <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                          {companyUsers.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No users in this company.</p>
                          ) : (
                            companyUsers.map((user) => {
                              const displayName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
                              const roleLabel = user.role === "company_owner" ? "Owner" : 
                                              user.role === "company_admin" ? "Admin" : "Member";
                              return (
                                <div key={user.id} className="flex items-center gap-3 p-2 border rounded hover-elevate">
                                  <Checkbox
                                    id={`user-${user.id}`}
                                    checked={selectedUserIds.includes(user.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedUserIds([...selectedUserIds, user.id]);
                                      } else {
                                        setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                                      }
                                    }}
                                    data-testid={`checkbox-user-${user.id}`}
                                  />
                                  <label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer">
                                    <div className="font-medium">{displayName}</div>
                                    <div className="text-xs text-muted-foreground">{user.email}</div>
                                  </label>
                                  <Badge variant="secondary" className="text-xs">{roleLabel}</Badge>
                                </div>
                              );
                            })
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedUserIds(companyUsers.map(u => u.id))}
                          >
                            Select All
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedUserIds([])}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    )}

                    {assignCompanyId && assignType === "role_group" && (
                      <div className="space-y-2">
                        <Label>Select Role Group</Label>
                        <Select value={selectedRoleGroup} onValueChange={setSelectedRoleGroup}>
                          <SelectTrigger data-testid="select-role-group">
                            <SelectValue placeholder="Choose a role group" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="company_owner">
                              Company Owners ({companyOwners.length})
                            </SelectItem>
                            <SelectItem value="company_admin">
                              Company Admins ({companyAdmins.length})
                            </SelectItem>
                            <SelectItem value="team_member">
                              Team Members ({teamMembers.length})
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {selectedRoleGroup && (
                          <p className="text-sm text-muted-foreground">
                            This will assign training to{" "}
                            {selectedRoleGroup === "company_owner" && `${companyOwners.length} company owner(s)`}
                            {selectedRoleGroup === "company_admin" && `${companyAdmins.length} company admin(s)`}
                            {selectedRoleGroup === "team_member" && `${teamMembers.length} team member(s)`}
                          </p>
                        )}
                      </div>
                    )}

                    {assignCompanyId && assignType === "tag" && (
                      <div className="space-y-2">
                        <Label>Select Tag</Label>
                        <Select value={selectedTagId} onValueChange={setSelectedTagId}>
                          <SelectTrigger data-testid="select-assign-tag">
                            <SelectValue placeholder="Choose a tag" />
                          </SelectTrigger>
                          <SelectContent>
                            {allTags.map((tag) => {
                              const count = companyUsers.filter(u => u.tags?.some(t => t.id === tag.id)).length;
                              return (
                                <SelectItem key={tag.id} value={tag.id}>
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                                    {tag.name} ({count})
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        {selectedTagId && (
                          <p className="text-sm text-muted-foreground">
                            This will assign training to {usersWithSelectedTag.length} user(s) with the "{allTags.find(t => t.id === selectedTagId)?.name}" tag in this company.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Due Date (optional)</Label>
                      <DatePicker
                        value={assignDueDate}
                        onChange={setAssignDueDate}
                        data-testid="input-assign-due-date"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="assignRequired"
                        checked={assignIsRequired}
                        onCheckedChange={(checked) => setAssignIsRequired(!!checked)}
                      />
                      <Label htmlFor="assignRequired">Required for completion</Label>
                    </div>
                    <Button
                      onClick={handleCreateAssignment}
                      disabled={
                        !assignModuleId || 
                        !assignCompanyId ||
                        (assignType === "individual" && selectedUserIds.length === 0) || 
                        (assignType === "role_group" && !selectedRoleGroup) ||
                        (assignType === "tag" && !selectedTagId) ||
                        createAssignmentMutation.isPending
                      }
                      className="w-full"
                      data-testid="button-create-assignment"
                    >
                      {createAssignmentMutation.isPending ? "Assigning..." : "Assign Training"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <TabsContent value="assignments" className="mt-4">
            {assignmentsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : assignments.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No training assignments yet. Assign training modules to companies or individuals.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <Card key={assignment.id} data-testid={`card-assignment-${assignment.id}`}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {assignment.assignmentType === "company" ? (
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          ) : assignment.assignmentType === "individual" ? (
                            <User className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Users className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">{getModuleName(assignment.trainingModuleId)}</span>
                        </div>
                        <span className="text-muted-foreground">&rarr;</span>
                        <span className="text-sm">
                          {assignment.assignmentType === "company"
                            ? getCompanyName(assignment.companyId)
                            : (assignment as any).userName || assignment.userId || "Individual"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {assignment.dueDate && (
                          <Badge variant="outline">Due: {parseLocalDate(assignment.dueDate).toLocaleDateString()}</Badge>
                        )}
                        {assignment.isRequired && (
                          <Badge variant="secondary">Required</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteAssignmentMutation.mutate(assignment.id)}
                          data-testid={`button-delete-assignment-${assignment.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="modules" className="mt-4">
            {modulesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-40" />
                ))}
              </div>
            ) : modules.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No training modules yet. Create your first module to get started.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.map((module) => (
                  <Card key={module.id} className="hover-elevate" data-testid={`card-module-${module.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getContentTypeIcon(module.contentType)}
                          <CardTitle className="text-lg">{module.title}</CardTitle>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModule(module)}
                            data-testid={`button-edit-module-${module.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteModuleMutation.mutate(module.id)}
                            data-testid={`button-delete-module-${module.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {module.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {module.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{module.contentType}</Badge>
                        {module.duration && (
                          <Badge variant="secondary">{module.duration} min</Badge>
                        )}
                        {module.isRequired && (
                          <Badge>Required</Badge>
                        )}
                        {!module.isActive && (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
