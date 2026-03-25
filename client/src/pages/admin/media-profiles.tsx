import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, FileImage, GripVertical, ChevronUp, ChevronDown, Settings2, Building2, X, Check, Info } from "lucide-react";
import type { MediaProfile, MediaProfileField } from "@shared/schema";

interface MediaProfileWithStats extends MediaProfile {
  fieldCount?: number;
  companyCount?: number;
}

interface FieldFormData {
  fieldType: string;
  label: string;
  placeholder: string;
  helpText: string;
  isRequired: boolean;
  options: string[];
}

const fieldTypeLabels: Record<string, string> = {
  text: "Text",
  textarea: "Text Area",
  select: "Dropdown",
  checkbox: "Checkbox",
  date: "Date",
  info_text: "Info Text",
};

const fieldTypeIcons: Record<string, string> = {
  text: "Aa",
  textarea: "¶",
  select: "▼",
  checkbox: "☑",
  date: "📅",
  info_text: "ℹ",
};

export default function AdminMediaProfiles() {
  const { toast } = useToast();
  
  const [createProfileOpen, setCreateProfileOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [fieldBuilderOpen, setFieldBuilderOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<MediaProfile | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  
  const [profileName, setProfileName] = useState("");
  const [profileDescription, setProfileDescription] = useState("");
  
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [editingField, setEditingField] = useState<MediaProfileField | null>(null);
  const [companyAssignmentOpen, setCompanyAssignmentOpen] = useState(false);
  const [fieldForm, setFieldForm] = useState<FieldFormData>({
    fieldType: "text",
    label: "",
    placeholder: "",
    helpText: "",
    isRequired: false,
    options: [],
  });
  const [newOption, setNewOption] = useState("");

  const { data: profiles = [], isLoading } = useQuery<MediaProfileWithStats[]>({
    queryKey: ["/api/admin/media-profiles"],
  });

  const { data: selectedProfile } = useQuery<MediaProfile>({
    queryKey: ["/api/admin/media-profiles", selectedProfileId],
    enabled: !!selectedProfileId,
  });

  const { data: profileFields = [], isLoading: fieldsLoading } = useQuery<MediaProfileField[]>({
    queryKey: ["/api/admin/media-profiles", selectedProfileId, "fields"],
    enabled: !!selectedProfileId,
  });

  const { data: allCompanies = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/companies"],
    enabled: companyAssignmentOpen,
  });

  const { data: profileCompanies = [], isLoading: companiesLoading } = useQuery<{ companyId: string; company: { id: string; name: string } | null }[]>({
    queryKey: ["/api/admin/media-profiles", selectedProfileId, "companies"],
    enabled: !!selectedProfileId && companyAssignmentOpen,
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      return apiRequest("POST", "/api/admin/media-profiles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media-profiles"] });
      setCreateProfileOpen(false);
      resetProfileForm();
      toast({ title: "Media profile created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create media profile", variant: "destructive" });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; description?: string; isActive?: boolean } }) => {
      return apiRequest("PATCH", `/api/admin/media-profiles/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media-profiles"] });
      setEditProfileOpen(false);
      setEditingProfile(null);
      resetProfileForm();
      toast({ title: "Media profile updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update media profile", variant: "destructive" });
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/media-profiles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media-profiles"] });
      toast({ title: "Media profile deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete media profile", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/admin/media-profiles/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media-profiles"] });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const createFieldMutation = useMutation({
    mutationFn: async ({ profileId, data }: { profileId: string; data: any }) => {
      return apiRequest("POST", `/api/admin/media-profiles/${profileId}/fields`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media-profiles", selectedProfileId, "fields"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media-profiles"] });
      setAddFieldOpen(false);
      resetFieldForm();
      toast({ title: "Field added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add field", variant: "destructive" });
    },
  });

  const updateFieldMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/admin/media-profile-fields/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media-profiles", selectedProfileId, "fields"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media-profiles"] });
      setEditingField(null);
      resetFieldForm();
      toast({ title: "Field updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update field", variant: "destructive" });
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/media-profile-fields/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media-profiles", selectedProfileId, "fields"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media-profiles"] });
      toast({ title: "Field deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete field", variant: "destructive" });
    },
  });

  const reorderFieldsMutation = useMutation({
    mutationFn: async ({ profileId, fieldIds }: { profileId: string; fieldIds: string[] }) => {
      return apiRequest("POST", `/api/admin/media-profiles/${profileId}/fields/reorder`, { fieldIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media-profiles", selectedProfileId, "fields"] });
    },
    onError: () => {
      toast({ title: "Failed to reorder fields", variant: "destructive" });
    },
  });

  const assignCompanyMutation = useMutation({
    mutationFn: async ({ profileId, companyId }: { profileId: string; companyId: string }) => {
      return apiRequest("POST", `/api/admin/media-profiles/${profileId}/companies`, { companyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media-profiles", selectedProfileId, "companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media-profiles"] });
      toast({ title: "Company assigned successfully" });
    },
    onError: () => {
      toast({ title: "Failed to assign company", variant: "destructive" });
    },
  });

  const unassignCompanyMutation = useMutation({
    mutationFn: async ({ profileId, companyId }: { profileId: string; companyId: string }) => {
      return apiRequest("DELETE", `/api/admin/media-profiles/${profileId}/companies/${companyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media-profiles", selectedProfileId, "companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media-profiles"] });
      toast({ title: "Company removed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to remove company", variant: "destructive" });
    },
  });

  const resetProfileForm = () => {
    setProfileName("");
    setProfileDescription("");
  };

  const resetFieldForm = () => {
    setFieldForm({
      fieldType: "text",
      label: "",
      placeholder: "",
      helpText: "",
      isRequired: false,
      options: [],
    });
    setNewOption("");
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;
    createProfileMutation.mutate({
      name: profileName.trim(),
      description: profileDescription.trim(),
    });
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !profileName.trim()) return;
    updateProfileMutation.mutate({
      id: editingProfile.id,
      data: {
        name: profileName.trim(),
        description: profileDescription.trim(),
      },
    });
  };

  const openEditProfileDialog = (profile: MediaProfile) => {
    setEditingProfile(profile);
    setProfileName(profile.name);
    setProfileDescription(profile.description || "");
    setEditProfileOpen(true);
  };

  const openFieldBuilder = (profileId: string) => {
    setSelectedProfileId(profileId);
    setFieldBuilderOpen(true);
  };

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileId || !fieldForm.label.trim()) return;
    
    const fieldData: any = {
      fieldType: fieldForm.fieldType,
      label: fieldForm.label.trim(),
      placeholder: fieldForm.fieldType === "info_text" ? null : (fieldForm.placeholder.trim() || null),
      helpText: fieldForm.fieldType === "info_text" ? null : (fieldForm.helpText.trim() || null),
      isRequired: fieldForm.fieldType === "info_text" ? false : fieldForm.isRequired,
      sortOrder: profileFields.length,
    };
    
    if (fieldForm.fieldType === "select" && fieldForm.options.length > 0) {
      fieldData.options = JSON.stringify(fieldForm.options);
    }
    
    createFieldMutation.mutate({ profileId: selectedProfileId, data: fieldData });
  };

  const handleUpdateField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingField || !fieldForm.label.trim()) return;
    
    const fieldData: any = {
      fieldType: fieldForm.fieldType,
      label: fieldForm.label.trim(),
      placeholder: fieldForm.fieldType === "info_text" ? null : (fieldForm.placeholder.trim() || null),
      helpText: fieldForm.fieldType === "info_text" ? null : (fieldForm.helpText.trim() || null),
      isRequired: fieldForm.fieldType === "info_text" ? false : fieldForm.isRequired,
    };
    
    if (fieldForm.fieldType === "select") {
      fieldData.options = JSON.stringify(fieldForm.options);
    } else {
      fieldData.options = null;
    }
    
    updateFieldMutation.mutate({ id: editingField.id, data: fieldData });
  };

  const openEditField = (field: MediaProfileField) => {
    setEditingField(field);
    let parsedOptions: string[] = [];
    if (field.options) {
      try {
        parsedOptions = JSON.parse(field.options);
      } catch {
        parsedOptions = [];
      }
    }
    setFieldForm({
      fieldType: field.fieldType,
      label: field.label,
      placeholder: field.placeholder || "",
      helpText: field.helpText || "",
      isRequired: field.isRequired,
      options: parsedOptions,
    });
  };

  const addOption = () => {
    if (newOption.trim() && !fieldForm.options.includes(newOption.trim())) {
      setFieldForm(prev => ({
        ...prev,
        options: [...prev.options, newOption.trim()],
      }));
      setNewOption("");
    }
  };

  const removeOption = (index: number) => {
    setFieldForm(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const moveField = (fieldId: string, direction: "up" | "down") => {
    const sortedFields = [...profileFields].sort((a, b) => a.sortOrder - b.sortOrder);
    const currentIndex = sortedFields.findIndex(f => f.id === fieldId);
    
    if (direction === "up" && currentIndex > 0) {
      const newOrder = sortedFields.map(f => f.id);
      [newOrder[currentIndex], newOrder[currentIndex - 1]] = [newOrder[currentIndex - 1], newOrder[currentIndex]];
      reorderFieldsMutation.mutate({ profileId: selectedProfileId!, fieldIds: newOrder });
    } else if (direction === "down" && currentIndex < sortedFields.length - 1) {
      const newOrder = sortedFields.map(f => f.id);
      [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
      reorderFieldsMutation.mutate({ profileId: selectedProfileId!, fieldIds: newOrder });
    }
  };

  const openCompanyAssignment = (profileId: string) => {
    setSelectedProfileId(profileId);
    setCompanyAssignmentOpen(true);
  };

  const assignedCompanyIds = profileCompanies.map(pc => pc.companyId);
  
  const toggleCompanyAssignment = (companyId: string) => {
    if (!selectedProfileId) return;
    
    if (assignedCompanyIds.includes(companyId)) {
      unassignCompanyMutation.mutate({ profileId: selectedProfileId, companyId });
    } else {
      assignCompanyMutation.mutate({ profileId: selectedProfileId, companyId });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const activeProfiles = profiles.filter(p => p.isActive);
  const inactiveProfiles = profiles.filter(p => !p.isActive);

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
              Media Profiles
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create and manage reusable form templates for media uploads
            </p>
          </div>
          
          <Button onClick={() => setCreateProfileOpen(true)} data-testid="button-create-profile">
            <Plus className="h-4 w-4 mr-2" />
            Create Profile
          </Button>
        </div>

        {profiles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileImage className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Media Profiles</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first media profile to define custom form fields for uploads.
              </p>
              <Button onClick={() => setCreateProfileOpen(true)} data-testid="button-create-first-profile">
                <Plus className="h-4 w-4 mr-2" />
                Create Profile
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {activeProfiles.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-medium flex items-center gap-2">
                  <FileImage className="h-5 w-5" />
                  Active Profiles
                  <Badge variant="secondary">{activeProfiles.length}</Badge>
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activeProfiles.map((profile) => (
                    <ProfileCard
                      key={profile.id}
                      profile={profile}
                      onEdit={() => openEditProfileDialog(profile)}
                      onDelete={() => deleteProfileMutation.mutate(profile.id)}
                      onToggleActive={(isActive) => toggleActiveMutation.mutate({ id: profile.id, isActive })}
                      onManageFields={() => openFieldBuilder(profile.id)}
                      onManageCompanies={() => openCompanyAssignment(profile.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {inactiveProfiles.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-medium flex items-center gap-2 text-muted-foreground">
                  <FileImage className="h-5 w-5" />
                  Inactive Profiles
                  <Badge variant="secondary">{inactiveProfiles.length}</Badge>
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {inactiveProfiles.map((profile) => (
                    <ProfileCard
                      key={profile.id}
                      profile={profile}
                      onEdit={() => openEditProfileDialog(profile)}
                      onDelete={() => deleteProfileMutation.mutate(profile.id)}
                      onToggleActive={(isActive) => toggleActiveMutation.mutate({ id: profile.id, isActive })}
                      onManageFields={() => openFieldBuilder(profile.id)}
                      onManageCompanies={() => openCompanyAssignment(profile.id)}
                      inactive
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Dialog open={createProfileOpen} onOpenChange={setCreateProfileOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Media Profile</DialogTitle>
              <DialogDescription>
                Create a new profile with custom form fields for media uploads.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Name</Label>
                <Input
                  id="profile-name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g., Restaurant Media Kit"
                  data-testid="input-profile-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-description">Description</Label>
                <Textarea
                  id="profile-description"
                  value={profileDescription}
                  onChange={(e) => setProfileDescription(e.target.value)}
                  placeholder="Describe what this profile is used for..."
                  rows={3}
                  data-testid="input-profile-description"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateProfileOpen(false)} data-testid="button-cancel-create">
                  Cancel
                </Button>
                <Button type="submit" disabled={createProfileMutation.isPending || !profileName.trim()} data-testid="button-submit-profile">
                  {createProfileMutation.isPending ? "Creating..." : "Create Profile"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Media Profile</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-profile-name">Name</Label>
                <Input
                  id="edit-profile-name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g., Restaurant Media Kit"
                  data-testid="input-edit-profile-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-profile-description">Description</Label>
                <Textarea
                  id="edit-profile-description"
                  value={profileDescription}
                  onChange={(e) => setProfileDescription(e.target.value)}
                  placeholder="Describe what this profile is used for..."
                  rows={3}
                  data-testid="input-edit-profile-description"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditProfileOpen(false)} data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateProfileMutation.isPending || !profileName.trim()} data-testid="button-update-profile">
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={fieldBuilderOpen} onOpenChange={(open) => {
          setFieldBuilderOpen(open);
          if (!open) {
            setSelectedProfileId(null);
            setEditingField(null);
            resetFieldForm();
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Form Field Builder
                {selectedProfile && (
                  <span className="font-normal text-muted-foreground">— {selectedProfile.name}</span>
                )}
              </DialogTitle>
              <DialogDescription>
                Define the form fields that will be shown when clients upload media.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  Fields ({profileFields.length})
                </h3>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingField(null);
                    resetFieldForm();
                    setAddFieldOpen(true);
                  }}
                  data-testid="button-add-field"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </div>

              {fieldsLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : profileFields.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground mb-4">
                      No fields defined yet. Add fields to create your form.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingField(null);
                        resetFieldForm();
                        setAddFieldOpen(true);
                      }}
                      data-testid="button-add-first-field"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Field
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {[...profileFields]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((field, index) => (
                      <Card key={field.id} data-testid={`field-card-${field.id}`}>
                        <CardContent className="flex items-center gap-3 py-3">
                          <div className="flex flex-col gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              disabled={index === 0}
                              onClick={() => moveField(field.id, "up")}
                              data-testid={`button-move-up-${field.id}`}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              disabled={index === profileFields.length - 1}
                              onClick={() => moveField(field.id, "down")}
                              data-testid={`button-move-down-${field.id}`}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-sm font-mono">
                            {fieldTypeIcons[field.fieldType] || "?"}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate" data-testid={`text-field-label-${field.id}`}>
                                {field.label}
                              </span>
                              {field.isRequired && (
                                <Badge variant="secondary" className="text-xs">Required</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{fieldTypeLabels[field.fieldType]}</span>
                              {field.placeholder && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{field.placeholder}</span>
                                </>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditField(field)}
                              data-testid={`button-edit-field-${field.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" data-testid={`button-delete-field-${field.id}`}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Field?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the "{field.label}" field. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteFieldMutation.mutate(field.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    data-testid={`button-confirm-delete-field-${field.id}`}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={addFieldOpen || !!editingField} onOpenChange={(open) => {
          if (!open) {
            setAddFieldOpen(false);
            setEditingField(null);
            resetFieldForm();
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingField ? "Edit Field" : "Add Field"}</DialogTitle>
              <DialogDescription>
                {editingField ? "Update the field settings." : "Configure the new form field."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={editingField ? handleUpdateField : handleAddField} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="field-type">Field Type</Label>
                <Select
                  value={fieldForm.fieldType}
                  onValueChange={(value) => setFieldForm(prev => ({ ...prev, fieldType: value }))}
                >
                  <SelectTrigger data-testid="select-field-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="textarea">Text Area</SelectItem>
                    <SelectItem value="select">Dropdown</SelectItem>
                    <SelectItem value="checkbox">Checkbox</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="info_text">Info Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {fieldForm.fieldType === "info_text" ? (
                <div className="space-y-2">
                  <Label htmlFor="field-label">Display Text *</Label>
                  <Textarea
                    id="field-label"
                    value={fieldForm.label}
                    onChange={(e) => setFieldForm(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="Enter informational text to display to clients (e.g., instructions or notes)"
                    rows={4}
                    data-testid="input-field-label"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="field-label">Label *</Label>
                  <Input
                    id="field-label"
                    value={fieldForm.label}
                    onChange={(e) => setFieldForm(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="e.g., Location Name"
                    data-testid="input-field-label"
                  />
                </div>
              )}

              {fieldForm.fieldType !== "checkbox" && fieldForm.fieldType !== "info_text" && (
                <div className="space-y-2">
                  <Label htmlFor="field-placeholder">Placeholder</Label>
                  <Input
                    id="field-placeholder"
                    value={fieldForm.placeholder}
                    onChange={(e) => setFieldForm(prev => ({ ...prev, placeholder: e.target.value }))}
                    placeholder="e.g., Enter the location name"
                    data-testid="input-field-placeholder"
                  />
                </div>
              )}

              {fieldForm.fieldType !== "info_text" && (
                <div className="space-y-2">
                  <Label htmlFor="field-help">Help Text</Label>
                  <Input
                    id="field-help"
                    value={fieldForm.helpText}
                    onChange={(e) => setFieldForm(prev => ({ ...prev, helpText: e.target.value }))}
                    placeholder="e.g., The name of the location in the photo"
                    data-testid="input-field-help"
                  />
                </div>
              )}

              {fieldForm.fieldType === "select" && (
                <div className="space-y-2">
                  <Label>Dropdown Options</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      placeholder="Add an option"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addOption();
                        }
                      }}
                      data-testid="input-new-option"
                    />
                    <Button type="button" size="icon" onClick={addOption} data-testid="button-add-option">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {fieldForm.options.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {fieldForm.options.map((option, index) => (
                        <Badge key={index} variant="secondary" className="gap-1">
                          {option}
                          <button
                            type="button"
                            onClick={() => removeOption(index)}
                            className="ml-1 hover:text-destructive"
                            data-testid={`button-remove-option-${index}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {fieldForm.fieldType !== "info_text" && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="field-required"
                    checked={fieldForm.isRequired}
                    onCheckedChange={(checked) => setFieldForm(prev => ({ ...prev, isRequired: !!checked }))}
                    data-testid="checkbox-field-required"
                  />
                  <Label htmlFor="field-required" className="text-sm font-normal">
                    This field is required
                  </Label>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddFieldOpen(false);
                    setEditingField(null);
                    resetFieldForm();
                  }}
                  data-testid="button-cancel-field"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    (editingField ? updateFieldMutation.isPending : createFieldMutation.isPending) ||
                    !fieldForm.label.trim() ||
                    (fieldForm.fieldType === "select" && fieldForm.options.length === 0)
                  }
                  data-testid={editingField ? "button-update-field" : "button-submit-field"}
                >
                  {editingField
                    ? updateFieldMutation.isPending ? "Saving..." : "Save Changes"
                    : createFieldMutation.isPending ? "Adding..." : "Add Field"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={companyAssignmentOpen} onOpenChange={setCompanyAssignmentOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Assign Companies</DialogTitle>
              <DialogDescription>
                Select which companies should have access to this media profile.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[400px] overflow-y-auto">
              {companiesLoading ? (
                <div className="space-y-2 py-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : allCompanies.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No companies available</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {allCompanies.map((company) => {
                    const isAssigned = assignedCompanyIds.includes(company.id);
                    const isPending = assignCompanyMutation.isPending || unassignCompanyMutation.isPending;
                    
                    return (
                      <div
                        key={company.id}
                        className={`flex items-center justify-between p-3 rounded-md hover-elevate cursor-pointer ${
                          isAssigned ? "bg-primary/10" : ""
                        }`}
                        onClick={() => !isPending && toggleCompanyAssignment(company.id)}
                        data-testid={`company-row-${company.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{company.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAssigned ? (
                            <Badge variant="secondary" className="gap-1">
                              <Check className="h-3 w-3" />
                              Assigned
                            </Badge>
                          ) : (
                            <Badge variant="outline">Not Assigned</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCompanyAssignmentOpen(false)}
                data-testid="button-close-companies"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

interface ProfileCardProps {
  profile: MediaProfileWithStats;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (isActive: boolean) => void;
  onManageFields: () => void;
  onManageCompanies: () => void;
  inactive?: boolean;
}

function ProfileCard({ profile, onEdit, onDelete, onToggleActive, onManageFields, onManageCompanies, inactive }: ProfileCardProps) {
  return (
    <Card className={inactive ? "opacity-60" : ""} data-testid={`profile-card-${profile.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate" data-testid={`text-profile-name-${profile.id}`}>
              {profile.name}
            </CardTitle>
            {profile.description && (
              <CardDescription className="line-clamp-2 mt-1">
                {profile.description}
              </CardDescription>
            )}
          </div>
          <Switch
            checked={profile.isActive}
            onCheckedChange={(checked) => onToggleActive(checked)}
            data-testid={`switch-active-${profile.id}`}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Settings2 className="h-4 w-4" />
            <span data-testid={`text-field-count-${profile.id}`}>
              {profile.fieldCount ?? 0} fields
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            <span data-testid={`text-company-count-${profile.id}`}>
              {profile.companyCount ?? 0} companies
            </span>
          </div>
        </div>
        
        <Separator className="mb-3" />
        
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onManageFields}
              className="flex-1"
              data-testid={`button-manage-fields-${profile.id}`}
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Fields
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onManageCompanies}
              className="flex-1"
              data-testid={`button-manage-companies-${profile.id}`}
            >
              <Building2 className="h-4 w-4 mr-2" />
              Companies
            </Button>
          </div>
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              data-testid={`button-edit-profile-${profile.id}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" data-testid={`button-delete-profile-${profile.id}`}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Media Profile?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{profile.name}" and all its fields. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid={`button-confirm-delete-${profile.id}`}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
