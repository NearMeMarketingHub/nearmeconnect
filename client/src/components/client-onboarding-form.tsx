import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useUpload } from "@/hooks/use-upload";
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  ExternalLink,
  Youtube,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Globe,
  Save,
  AlertCircle,
  Upload,
  X,
  FileImage,
  Play
} from "lucide-react";
import { SiTiktok, SiPinterest } from "react-icons/si";

interface OnboardingFormProps {
  companyId: string;
  companyName: string;
  onComplete?: () => void;
}

interface SocialPlatformData {
  platform: string;
  exists: boolean;
  handle: string;
  accountEmail: string;
  notes: string;
  accountCreator: "agency" | "client" | "";
}

interface LoginCredential {
  platform: string;
  username: string;
  password: string;
  twoFactorMethod: string;
  recoveryNotes: string;
}

const PLATFORMS = [
  { id: "facebook", name: "Facebook", icon: Facebook },
  { id: "instagram", name: "Instagram", icon: Instagram },
  { id: "youtube", name: "YouTube", icon: Youtube },
  { id: "tiktok", name: "TikTok", icon: SiTiktok },
  { id: "x_twitter", name: "X (Twitter)", icon: Twitter },
  { id: "linkedin", name: "LinkedIn", icon: Linkedin },
  { id: "pinterest", name: "Pinterest", icon: SiPinterest },
];

const SEASONS = [
  "Spring",
  "Summer", 
  "Fall/Autumn",
  "Winter",
  "Back to School",
  "End of Year",
];

const HOLIDAYS = [
  "New Year's Day",
  "Valentine's Day",
  "Easter",
  "Mother's Day",
  "Memorial Day",
  "Father's Day",
  "Independence Day (July 4th)",
  "Labor Day",
  "Halloween",
  "Thanksgiving",
  "Black Friday/Cyber Monday",
  "Christmas/Holiday Season",
  "Small Business Saturday",
];

const LOGIN_PLATFORMS = [
  "TikTok",
  "Pinterest",
  "Hootsuite",
  "Buffer",
  "Later",
  "Sprout Social",
  "HubSpot",
  "Mailchimp",
  "Constant Contact",
  "Canva",
  "Adobe Creative Cloud",
  "Google Analytics",
  "Google Ads",
  "Meta Ads Manager",
  "Shopify",
  "WordPress",
  "Squarespace",
  "Wix",
  "GoDaddy",
  "Other",
];

interface BrandAssetFile {
  name: string;
  objectPath?: string;
  sharepointPath?: string;
  sharepointUrl?: string;
  uploadedAt: string;
}

interface ValidationError {
  section: string;
  step: number;
  items: string[];
}

export function ClientOnboardingForm({ companyId, companyName, onComplete }: OnboardingFormProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 7;
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const { data: existingData, isLoading } = useQuery({
    queryKey: ["/api/companies", companyId, "onboarding", "flow"],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}/onboarding/flow`);
      if (!response.ok) return null;
      return response.json();
    },
  });

  // Restore currentStep from saved data
  useEffect(() => {
    if (existingData?.currentStep && existingData.currentStep >= 1 && existingData.currentStep <= totalSteps) {
      setCurrentStep(existingData.currentStep);
    }
  }, [existingData]);

  const [formData, setFormData] = useState<Record<string, any>>(() => ({
    website: "",
    primaryContactName: "",
    primaryContactEmail: "",
    primaryContactPhone: "",
    specialNotes: "",
    socialPlatforms: PLATFORMS.map(p => ({
      platform: p.id,
      exists: false,
      handle: "",
      accountEmail: "",
      notes: "",
      accountCreator: "" as "agency" | "client" | "",
    })),
    loginCredentials: [] as LoginCredential[],
    youtubeInviteDate: "",
    metaBusinessInviteDate: "",
    googleBusinessInviteDate: "",
    youtubeFeatureEligibilityDate: "",
    youtubeInviteNA: false,
    youtubeFeatureNA: false,
    metaBusinessNA: false,
    googleBusinessNA: false,
    needsGbpRecovery: false,
    gbpBusinessName: "",
    gbpBusinessAddress: "",
    gbpContactEmail: "",
    gbpContactPhone: "",
    gbpAdditionalContext: "",
    brandAssetLinks: "",
    brandAssetFiles: [] as BrandAssetFile[],
    seasonalPreferences: [] as string[],
    holidayPreferences: [] as string[],
    otherHolidays: "",
    seasonalNotes: "",
    socialProfilesListed: false,
    accessInvitesSent: false,
    loginCredentialsProvided: false,
    brandAssetsProvided: false,
    seasonalPreferencesConfirmed: false,
    authorizationName: "",
    authorizationDate: "",
    authorizationSignature: "",
  }));

  useEffect(() => {
    if (existingData) {
      setFormData(prev => ({
        ...prev,
        ...existingData,
        socialPlatforms: existingData.socialPlatforms 
          ? JSON.parse(existingData.socialPlatforms) 
          : prev.socialPlatforms,
        loginCredentials: existingData.loginCredentials
          ? JSON.parse(existingData.loginCredentials)
          : prev.loginCredentials,
        seasonalPreferences: existingData.seasonalPreferences
          ? JSON.parse(existingData.seasonalPreferences)
          : prev.seasonalPreferences,
        holidayPreferences: existingData.holidayPreferences
          ? JSON.parse(existingData.holidayPreferences)
          : prev.holidayPreferences,
        brandAssetFiles: existingData.brandAssetFiles
          ? JSON.parse(existingData.brandAssetFiles)
          : prev.brandAssetFiles,
      }));
    }
  }, [existingData]);

  const { uploadFile, isUploading } = useUpload({
    onError: (error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const payload = {
        ...data,
        socialPlatforms: JSON.stringify(data.socialPlatforms),
        loginCredentials: JSON.stringify(data.loginCredentials),
        seasonalPreferences: JSON.stringify(data.seasonalPreferences),
        holidayPreferences: JSON.stringify(data.holidayPreferences),
        brandAssetFiles: JSON.stringify(data.brandAssetFiles),
      };
      const response = await apiRequest("POST", `/api/companies/${companyId}/onboarding`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "onboarding", "flow"] });
      toast({ title: "Progress saved" });
    },
    onError: () => {
      toast({ title: "Failed to save progress", variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/companies/${companyId}/onboarding/complete`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
      toast({ title: "Onboarding completed!" });
      onComplete?.();
    },
    onError: () => {
      toast({ title: "Failed to complete onboarding", variant: "destructive" });
    },
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateSocialPlatform = (platformId: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      socialPlatforms: prev.socialPlatforms.map((p: SocialPlatformData) =>
        p.platform === platformId ? { ...p, [field]: value } : p
      ),
    }));
  };

  const addLoginCredential = () => {
    setFormData(prev => ({
      ...prev,
      loginCredentials: [
        ...prev.loginCredentials,
        { platform: "", username: "", password: "", twoFactorMethod: "", recoveryNotes: "" },
      ],
    }));
  };

  const updateLoginCredential = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      loginCredentials: prev.loginCredentials.map((c: LoginCredential, i: number) =>
        i === index ? { ...c, [field]: value } : c
      ),
    }));
  };

  const removeLoginCredential = (index: number) => {
    setFormData(prev => ({
      ...prev,
      loginCredentials: prev.loginCredentials.filter((_: any, i: number) => i !== index),
    }));
  };

  const [isBrandAssetUploading, setIsBrandAssetUploading] = useState(false);

  const handleBrandAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsBrandAssetUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`/api/companies/${companyId}/brand-assets/upload`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        
        if (response.ok) {
          const result = await response.json();
          const newFile: BrandAssetFile = {
            name: result.fileName,
            sharepointPath: result.sharepointPath,
            sharepointUrl: result.sharepointUrl,
            uploadedAt: new Date().toISOString(),
          };
          setFormData(prev => ({
            ...prev,
            brandAssetFiles: [...prev.brandAssetFiles, newFile],
          }));
          toast({
            title: "Uploaded to SharePoint",
            description: `${file.name} uploaded successfully`,
          });
        } else {
          const error = await response.json();
          toast({
            title: "Upload failed",
            description: error.error || "Failed to upload file",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Upload error",
        description: error.message || "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setIsBrandAssetUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeBrandAssetFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      brandAssetFiles: prev.brandAssetFiles.filter((_: BrandAssetFile, i: number) => i !== index),
    }));
  };

  const toggleArrayValue = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v: string) => v !== value)
        : [...prev[field], value],
    }));
  };

  const handleSave = (stepOverride?: number) => {
    saveMutation.mutate({ ...formData, currentStep: stepOverride ?? currentStep });
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      const nextStep = currentStep + 1;
      saveMutation.mutate({ ...formData, currentStep: nextStep });
      setCurrentStep(nextStep);
    } else {
      handleSave();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      saveMutation.mutate({ ...formData, currentStep: prevStep });
      setCurrentStep(prevStep);
    }
  };

  const isAccessItemComplete = (dateField: string, naField: string) => {
    return !!(formData[dateField] || formData[naField]);
  };

  const isAccountAccessComplete = () => {
    return (
      isAccessItemComplete("youtubeInviteDate", "youtubeInviteNA") &&
      isAccessItemComplete("youtubeFeatureEligibilityDate", "youtubeFeatureNA") &&
      isAccessItemComplete("metaBusinessInviteDate", "metaBusinessNA") &&
      isAccessItemComplete("googleBusinessInviteDate", "googleBusinessNA")
    );
  };

  const getMissingAccountAccessItems = () => {
    const missing = [];
    if (!isAccessItemComplete("youtubeInviteDate", "youtubeInviteNA")) missing.push("YouTube Channel Invite");
    if (!isAccessItemComplete("youtubeFeatureEligibilityDate", "youtubeFeatureNA")) missing.push("YouTube Feature Eligibility");
    if (!isAccessItemComplete("metaBusinessInviteDate", "metaBusinessNA")) missing.push("Meta Business Suite Invite");
    if (!isAccessItemComplete("googleBusinessInviteDate", "googleBusinessNA")) missing.push("Google Business Profile Invite");
    return missing;
  };

  // Comprehensive validation function
  const validateAllSections = (): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Step 1: Social Media Profiles (each platform must have a choice)
    const socialMediaMissing: string[] = [];
    formData.socialPlatforms.forEach((platform: SocialPlatformData) => {
      const platformInfo = PLATFORMS.find(p => p.id === platform.platform);
      const platformName = platformInfo?.name || platform.platform;
      
      // Must either have an account OR specify who will create it
      if (!platform.exists && !platform.accountCreator) {
        socialMediaMissing.push(platformName);
      }
    });
    if (socialMediaMissing.length > 0) {
      errors.push({
        section: "Social Media Profiles",
        step: 1,
        items: socialMediaMissing.map(name => `${name}: Please indicate if you have an account or who will create one`)
      });
    }

    // Step 2: Account Access (required)
    const accountAccessMissing = getMissingAccountAccessItems();
    if (accountAccessMissing.length > 0) {
      errors.push({
        section: "Account Access",
        step: 2,
        items: accountAccessMissing
      });
    }

    // Step 5: Brand Assets (required - must have at least uploads OR links)
    const hasBrandAssetFiles = formData.brandAssetFiles && formData.brandAssetFiles.length > 0;
    const hasBrandAssetLinks = formData.brandAssetLinks && formData.brandAssetLinks.trim().length > 0;
    if (!hasBrandAssetFiles && !hasBrandAssetLinks) {
      errors.push({
        section: "Brand Assets",
        step: 5,
        items: ["Please upload brand assets or provide links to your brand files"]
      });
    }

    // Step 7: Authorization (required)
    const authorizationMissing = [];
    if (!formData.authorizationName || formData.authorizationName.trim() === "") {
      authorizationMissing.push("Full Name");
    }
    if (!formData.authorizationDate) {
      authorizationMissing.push("Date");
    }
    if (!formData.authorizationSignature || formData.authorizationSignature.trim() === "") {
      authorizationMissing.push("Electronic Signature");
    }
    if (authorizationMissing.length > 0) {
      errors.push({
        section: "Authorization",
        step: 7,
        items: authorizationMissing
      });
    }

    return errors;
  };

  const handleComplete = async () => {
    // Run comprehensive validation
    const errors = validateAllSections();
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      setValidationDialogOpen(true);
      return;
    }

    const payload = {
      ...formData,
      currentStep: totalSteps,
      socialPlatforms: JSON.stringify(formData.socialPlatforms),
      loginCredentials: JSON.stringify(formData.loginCredentials),
      seasonalPreferences: JSON.stringify(formData.seasonalPreferences),
      holidayPreferences: JSON.stringify(formData.holidayPreferences),
      brandAssetFiles: JSON.stringify(formData.brandAssetFiles),
    };
    try {
      await apiRequest("POST", `/api/companies/${companyId}/onboarding`, payload);
      await completeMutation.mutateAsync();
    } catch (error) {
      toast({ title: "Failed to complete onboarding", variant: "destructive" });
    }
  };

  const progress = (currentStep / totalSteps) * 100;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading onboarding data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Client Onboarding: {companyName}</h2>
          <p className="text-muted-foreground">Step {currentStep} of {totalSteps}</p>
        </div>
        <Button variant="outline" onClick={() => handleSave()} disabled={saveMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          Save Progress
        </Button>
      </div>

      <Progress value={progress} className="h-2" />

      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Social Media Profiles</CardTitle>
            <CardDescription>
              Tell us about your social media accounts. For each platform, let us know if you already have an account or if one needs to be created.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {PLATFORMS.map((platform) => {
              const platformData = formData.socialPlatforms.find(
                (p: SocialPlatformData) => p.platform === platform.id
              );
              const Icon = platform.icon;
              const hasAccount = platformData?.exists || false;
              const needsCreation = !hasAccount && platformData?.accountCreator;
              
              return (
                <div key={platform.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{platform.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 pl-8">
                    <Checkbox
                      id={`platform-${platform.id}`}
                      checked={hasAccount}
                      onCheckedChange={(checked) => {
                        updateSocialPlatform(platform.id, "exists", checked);
                        if (checked) {
                          updateSocialPlatform(platform.id, "accountCreator", "");
                        }
                      }}
                      data-testid={`checkbox-platform-${platform.id}`}
                    />
                    <Label 
                      htmlFor={`platform-${platform.id}`}
                      className="cursor-pointer"
                    >
                      I have an account on this platform
                    </Label>
                  </div>

                  {!hasAccount && (
                    <div className="pl-8 space-y-2">
                      <Label>Who will create this account?</Label>
                      <Select
                        value={platformData?.accountCreator || ""}
                        onValueChange={(value) => updateSocialPlatform(platform.id, "accountCreator", value)}
                      >
                        <SelectTrigger data-testid={`select-${platform.id}-creator`}>
                          <SelectValue placeholder="Select an option..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agency">Near Me Marketing will create it for me</SelectItem>
                          <SelectItem value="client">I'll create it myself</SelectItem>
                        </SelectContent>
                      </Select>
                      {platformData?.accountCreator === "client" && (
                        <p className="text-sm text-muted-foreground">
                          A reminder task will be created for you to set up this account within a week of completing onboarding.
                        </p>
                      )}
                    </div>
                  )}

                  <div className={`grid gap-4 md:grid-cols-2 pl-8 ${!hasAccount ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="space-y-2">
                      <Label>Handle / Username</Label>
                      <Input
                        value={platformData?.handle || ""}
                        onChange={(e) => updateSocialPlatform(platform.id, "handle", e.target.value)}
                        placeholder="@username"
                        disabled={!hasAccount}
                        data-testid={`input-${platform.id}-handle`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Email</Label>
                      <Input
                        type="email"
                        value={platformData?.accountEmail || ""}
                        onChange={(e) => updateSocialPlatform(platform.id, "accountEmail", e.target.value)}
                        placeholder="account@email.com"
                        disabled={!hasAccount}
                        data-testid={`input-${platform.id}-email`}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Notes</Label>
                      <Input
                        value={platformData?.notes || ""}
                        onChange={(e) => updateSocialPlatform(platform.id, "notes", e.target.value)}
                        placeholder="Any additional notes..."
                        disabled={!hasAccount}
                        data-testid={`input-${platform.id}-notes`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Account Access Invitations</CardTitle>
            <CardDescription>
              Send invitations to grant us access to your business accounts. Use the tutorial links for guidance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={`bg-muted p-4 rounded-lg space-y-4 ${formData.youtubeInviteNA ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-4">
                <div className="bg-red-100 dark:bg-red-900 p-2 rounded-lg">
                  <Youtube className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">YouTube Channel Access</h3>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="youtube-invite-na"
                        checked={formData.youtubeInviteNA}
                        onCheckedChange={(checked) => {
                          updateField("youtubeInviteNA", !!checked);
                          if (checked) updateField("youtubeInviteDate", "");
                        }}
                        data-testid="checkbox-youtube-invite-na"
                      />
                      <Label htmlFor="youtube-invite-na" className="text-sm cursor-pointer">Not Applicable</Label>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Add hello@nearmemarketinghub.com as a manager to your YouTube channel.
                  </p>
                  <div className={`flex flex-wrap gap-2 ${formData.youtubeInviteNA ? "pointer-events-none" : ""}`}>
                    <Button variant="outline" size="sm" asChild disabled={formData.youtubeInviteNA}>
                      <a href="https://support.google.com/youtube/answer/4628007" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Tutorial
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild disabled={formData.youtubeInviteNA}>
                      <a href="https://youtu.be/O1tHysq7084" target="_blank" rel="noopener noreferrer">
                        <Play className="w-4 h-4 mr-2" />
                        Video Guide
                      </a>
                    </Button>
                    <div className="flex-1 flex items-center gap-2 min-w-48">
                      <Label className="text-sm whitespace-nowrap">Date Sent:</Label>
                      <DatePicker
                        value={formData.youtubeInviteDate}
                        onChange={(val) => updateField("youtubeInviteDate", val)}
                        className="max-w-40"
                        disabled={formData.youtubeInviteNA}
                        data-testid="input-youtube-invite-date"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`bg-muted p-4 rounded-lg space-y-4 ${formData.youtubeFeatureNA ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-4">
                <div className="bg-red-100 dark:bg-red-900 p-2 rounded-lg">
                  <Youtube className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">YouTube Feature Eligibility</h3>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="youtube-feature-na"
                        checked={formData.youtubeFeatureNA}
                        onCheckedChange={(checked) => {
                          updateField("youtubeFeatureNA", !!checked);
                          if (checked) updateField("youtubeFeatureEligibilityDate", "");
                        }}
                        data-testid="checkbox-youtube-feature-na"
                      />
                      <Label htmlFor="youtube-feature-na" className="text-sm cursor-pointer">Not Applicable</Label>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enable advanced features for your YouTube channel.
                  </p>
                  <div className={`flex flex-wrap gap-2 ${formData.youtubeFeatureNA ? "pointer-events-none" : ""}`}>
                    <Button variant="outline" size="sm" asChild disabled={formData.youtubeFeatureNA}>
                      <a href="https://support.google.com/youtube/answer/72851" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Tutorial
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild disabled={formData.youtubeFeatureNA}>
                      <a href="https://youtu.be/_JOruh1wfCg" target="_blank" rel="noopener noreferrer">
                        <Play className="w-4 h-4 mr-2" />
                        Video Guide
                      </a>
                    </Button>
                    <div className="flex-1 flex items-center gap-2 min-w-48">
                      <Label className="text-sm whitespace-nowrap">Date Completed:</Label>
                      <DatePicker
                        value={formData.youtubeFeatureEligibilityDate}
                        onChange={(val) => updateField("youtubeFeatureEligibilityDate", val)}
                        className="max-w-40"
                        disabled={formData.youtubeFeatureNA}
                        data-testid="input-youtube-feature-date"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`bg-muted p-4 rounded-lg space-y-4 ${formData.metaBusinessNA ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                  <Facebook className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Meta Business Suite Access</h3>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="meta-business-na"
                        checked={formData.metaBusinessNA}
                        onCheckedChange={(checked) => {
                          updateField("metaBusinessNA", !!checked);
                          if (checked) updateField("metaBusinessInviteDate", "");
                        }}
                        data-testid="checkbox-meta-business-na"
                      />
                      <Label htmlFor="meta-business-na" className="text-sm cursor-pointer">Not Applicable</Label>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Add our team to your Meta Business Suite for Facebook and Instagram management.
                  </p>
                  <div className={`flex flex-wrap gap-2 ${formData.metaBusinessNA ? "pointer-events-none" : ""}`}>
                    <Button variant="outline" size="sm" asChild disabled={formData.metaBusinessNA}>
                      <a href="https://www.facebook.com/business/help/2169003770027706" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Tutorial
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild disabled={formData.metaBusinessNA}>
                      <a href="https://youtu.be/e8D_G9dtOtg" target="_blank" rel="noopener noreferrer">
                        <Play className="w-4 h-4 mr-2" />
                        Video Guide
                      </a>
                    </Button>
                    <div className="flex-1 flex items-center gap-2 min-w-48">
                      <Label className="text-sm whitespace-nowrap">Date Sent:</Label>
                      <DatePicker
                        value={formData.metaBusinessInviteDate}
                        onChange={(val) => updateField("metaBusinessInviteDate", val)}
                        className="max-w-40"
                        disabled={formData.metaBusinessNA}
                        data-testid="input-meta-invite-date"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`bg-muted p-4 rounded-lg space-y-4 ${formData.googleBusinessNA ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-4">
                <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
                  <Globe className="w-6 h-6 text-green-500" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Google Business Profile Access</h3>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="google-business-na"
                        checked={formData.googleBusinessNA}
                        onCheckedChange={(checked) => {
                          updateField("googleBusinessNA", !!checked);
                          if (checked) updateField("googleBusinessInviteDate", "");
                        }}
                        data-testid="checkbox-google-business-na"
                      />
                      <Label htmlFor="google-business-na" className="text-sm cursor-pointer">Not Applicable</Label>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Add hello@nearmemarketinghub.com as a manager to your Google Business Profile.
                  </p>
                  <div className={`flex flex-wrap gap-2 ${formData.googleBusinessNA ? "pointer-events-none" : ""}`}>
                    <Button variant="outline" size="sm" asChild disabled={formData.googleBusinessNA}>
                      <a href="https://support.google.com/business/answer/3403100" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Tutorial
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild disabled={formData.googleBusinessNA}>
                      <a href="https://youtu.be/l6tAovBgsko" target="_blank" rel="noopener noreferrer">
                        <Play className="w-4 h-4 mr-2" />
                        Video Guide
                      </a>
                    </Button>
                    <div className="flex-1 flex items-center gap-2 min-w-48">
                      <Label className="text-sm whitespace-nowrap">Date Sent:</Label>
                      <DatePicker
                        value={formData.googleBusinessInviteDate}
                        onChange={(val) => updateField("googleBusinessInviteDate", val)}
                        className="max-w-40"
                        disabled={formData.googleBusinessNA}
                        data-testid="input-google-invite-date"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Login Credentials</CardTitle>
            <CardDescription>
              Provide login credentials for any platforms that require direct access.
              This information is securely stored and only used when necessary.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Security Notice</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Only provide credentials for platforms where manager access isn't available.
                  Consider using unique passwords for shared accounts.
                </p>
              </div>
            </div>

            {formData.loginCredentials.map((credential: LoginCredential, index: number) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Credential {index + 1}</h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeLoginCredential(index)}
                    data-testid={`button-remove-credential-${index}`}
                  >
                    Remove
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Platform / Service</Label>
                    <Select
                      value={credential.platform}
                      onValueChange={(value) => updateLoginCredential(index, "platform", value)}
                    >
                      <SelectTrigger data-testid={`select-credential-platform-${index}`}>
                        <SelectValue placeholder="Select a platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {LOGIN_PLATFORMS.map((platform) => (
                          <SelectItem key={platform} value={platform}>
                            {platform}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Username / Email</Label>
                    <Input
                      value={credential.username}
                      onChange={(e) => updateLoginCredential(index, "username", e.target.value)}
                      placeholder="username@email.com"
                      data-testid={`input-credential-username-${index}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={credential.password}
                      onChange={(e) => updateLoginCredential(index, "password", e.target.value)}
                      placeholder="Enter password"
                      data-testid={`input-credential-password-${index}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>2FA Method</Label>
                    <Input
                      value={credential.twoFactorMethod}
                      onChange={(e) => updateLoginCredential(index, "twoFactorMethod", e.target.value)}
                      placeholder="e.g., SMS, Authenticator app"
                      data-testid={`input-credential-2fa-${index}`}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Recovery Notes</Label>
                    <Textarea
                      value={credential.recoveryNotes}
                      onChange={(e) => updateLoginCredential(index, "recoveryNotes", e.target.value)}
                      placeholder="Backup codes, recovery email, etc."
                      data-testid={`input-credential-recovery-${index}`}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addLoginCredential} data-testid="button-add-credential">
              Add Login Credential
            </Button>
          </CardContent>
        </Card>
      )}

      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Google Business Profile Recovery</CardTitle>
            <CardDescription>
              If you need help recovering access to your Google Business Profile, provide the details below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3">
              <Checkbox
                id="needs-gbp-recovery"
                checked={formData.needsGbpRecovery}
                onCheckedChange={(checked) => updateField("needsGbpRecovery", checked)}
                data-testid="checkbox-needs-gbp-recovery"
              />
              <Label htmlFor="needs-gbp-recovery">
                I need help recovering my Google Business Profile
              </Label>
            </div>

            {formData.needsGbpRecovery && (
              <div className="space-y-4 pl-8">
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
                      <Globe className="w-6 h-6 text-green-500" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <h3 className="font-medium">GBP Recovery Guide</h3>
                      <p className="text-sm text-muted-foreground">
                        Watch this video to learn how to recover your Google Business Profile.
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <a href="https://youtu.be/a57o9yKLXfs" target="_blank" rel="noopener noreferrer">
                          <Play className="w-4 h-4 mr-2" />
                          Watch Video Guide
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Business Name (as listed on GBP)</Label>
                  <Input
                    value={formData.gbpBusinessName}
                    onChange={(e) => updateField("gbpBusinessName", e.target.value)}
                    placeholder="Your Business Name"
                    data-testid="input-gbp-business-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Business Address</Label>
                  <Input
                    value={formData.gbpBusinessAddress}
                    onChange={(e) => updateField("gbpBusinessAddress", e.target.value)}
                    placeholder="123 Main St, City, State ZIP"
                    data-testid="input-gbp-address"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      value={formData.gbpContactEmail}
                      onChange={(e) => updateField("gbpContactEmail", e.target.value)}
                      placeholder="contact@business.com"
                      data-testid="input-gbp-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Phone</Label>
                    <Input
                      type="tel"
                      value={formData.gbpContactPhone}
                      onChange={(e) => updateField("gbpContactPhone", e.target.value)}
                      placeholder="(555) 123-4567"
                      data-testid="input-gbp-phone"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Additional Context</Label>
                  <Textarea
                    value={formData.gbpAdditionalContext}
                    onChange={(e) => updateField("gbpAdditionalContext", e.target.value)}
                    placeholder="Any additional information that might help with recovery..."
                    data-testid="input-gbp-context"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Brand Assets</CardTitle>
            <CardDescription>
              Upload your brand assets directly so we can get started on your campaigns right away.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex gap-3">
              <Upload className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Uploading is the fastest way to get started</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  When you upload files directly, we can access them immediately without needing to request access to external folders. 
                  This helps us start creating your content faster!
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-base font-medium">Upload Brand Assets (Recommended)</Label>
              <div className="border-2 border-dashed border-primary/50 bg-primary/5 rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.ai,.eps,.svg,.psd,.zip"
                  onChange={handleBrandAssetUpload}
                  className="hidden"
                  id="brand-asset-upload"
                  data-testid="input-brand-asset-upload"
                />
                <FileImage className="w-14 h-14 mx-auto text-primary/60 mb-4" />
                <p className="text-base font-medium mb-2">Drop your files here</p>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to browse your computer
                </p>
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBrandAssetUploading}
                  data-testid="button-upload-brand-assets"
                >
                  {isBrandAssetUploading ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-spin" />
                      Uploading to SharePoint...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Select Files to Upload
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  Supports: Images, PDF, AI, EPS, SVG, PSD, ZIP (up to 50MB each)
                </p>
              </div>

              {formData.brandAssetFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <Label className="text-green-700 dark:text-green-400">Uploaded Files ({formData.brandAssetFiles.length})</Label>
                  </div>
                  <div className="space-y-2">
                    {formData.brandAssetFiles.map((file: BrandAssetFile, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileImage className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium">{file.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBrandAssetFile(index)}
                          data-testid={`button-remove-asset-${index}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <details className="group">
                <summary className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
                  Have files stored elsewhere? Add links instead (not recommended)
                </summary>
                <div className="mt-3 pl-6 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Please note: Links to external folders may delay your onboarding as we'll need to request access. 
                    Uploading directly above is much faster.
                  </p>
                  <Textarea
                    value={formData.brandAssetLinks}
                    onChange={(e) => updateField("brandAssetLinks", e.target.value)}
                    placeholder="If you cannot upload files, paste links to your brand assets folders here..."
                    className="min-h-[80px]"
                    data-testid="input-brand-assets"
                  />
                </div>
              </details>
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">What to Include:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Logo files in various formats (PNG, SVG, vector)</li>
                <li>Brand style guide (colors, fonts, etc.)</li>
                <li>High-resolution product photos</li>
                <li>Previous marketing materials for reference</li>
                <li>Any brand templates you use</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 6 && (
        <Card>
          <CardHeader>
            <CardTitle>Seasonal & Holiday Preferences</CardTitle>
            <CardDescription>
              Tell us which seasons and holidays are important for your marketing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base">Seasons</Label>
              <div className="grid gap-2 md:grid-cols-3">
                {SEASONS.map((season) => (
                  <div key={season} className="flex items-center gap-2">
                    <Checkbox
                      id={`season-${season}`}
                      checked={formData.seasonalPreferences.includes(season)}
                      onCheckedChange={() => toggleArrayValue("seasonalPreferences", season)}
                      data-testid={`checkbox-season-${season.toLowerCase().replace(/\s+/g, "-")}`}
                    />
                    <Label htmlFor={`season-${season}`} className="cursor-pointer">
                      {season}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-base">Holidays</Label>
              <div className="grid gap-2 md:grid-cols-2">
                {HOLIDAYS.map((holiday) => (
                  <div key={holiday} className="flex items-center gap-2">
                    <Checkbox
                      id={`holiday-${holiday}`}
                      checked={formData.holidayPreferences.includes(holiday)}
                      onCheckedChange={() => toggleArrayValue("holidayPreferences", holiday)}
                      data-testid={`checkbox-holiday-${holiday.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                    />
                    <Label htmlFor={`holiday-${holiday}`} className="cursor-pointer text-sm">
                      {holiday}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Other Holidays / Special Days</Label>
              <Input
                value={formData.otherHolidays}
                onChange={(e) => updateField("otherHolidays", e.target.value)}
                placeholder="Industry-specific holidays, local events, etc."
                data-testid="input-other-holidays"
              />
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={formData.seasonalNotes}
                onChange={(e) => updateField("seasonalNotes", e.target.value)}
                placeholder="Any specific campaigns or themes you'd like for certain seasons/holidays..."
                data-testid="input-seasonal-notes"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 7 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Authorization</CardTitle>
            <CardDescription>
              Confirm that you've completed all sections and authorize us to manage your accounts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isAccountAccessComplete() && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">Account Access Required</p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    You must complete all account access invitations before submitting. Missing: {getMissingAccountAccessItems().join(", ")}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => setCurrentStep(2)}
                    data-testid="button-go-to-access"
                  >
                    Go to Account Access
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-medium">Onboarding Checklist</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="checklist-social"
                    checked={formData.socialProfilesListed}
                    onCheckedChange={(checked) => updateField("socialProfilesListed", checked)}
                    data-testid="checkbox-social-listed"
                  />
                  <Label htmlFor="checklist-social" className="cursor-pointer">
                    Social media profiles listed
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    isAccountAccessComplete() 
                      ? "bg-primary border-primary" 
                      : "border-muted-foreground/50"
                  }`}>
                    {isAccountAccessComplete() && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <Label className={`${!isAccountAccessComplete() ? "text-muted-foreground" : ""}`}>
                    Account access invitations completed (YouTube, Meta, Google) 
                    {!isAccountAccessComplete() && <span className="text-red-500 ml-1">*Required</span>}
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="checklist-logins"
                    checked={formData.loginCredentialsProvided}
                    onCheckedChange={(checked) => updateField("loginCredentialsProvided", checked)}
                    data-testid="checkbox-logins-provided"
                  />
                  <Label htmlFor="checklist-logins" className="cursor-pointer">
                    Login credentials provided (if applicable)
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="checklist-assets"
                    checked={formData.brandAssetsProvided}
                    onCheckedChange={(checked) => updateField("brandAssetsProvided", checked)}
                    data-testid="checkbox-assets-provided"
                  />
                  <Label htmlFor="checklist-assets" className="cursor-pointer">
                    Brand assets shared
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="checklist-seasonal"
                    checked={formData.seasonalPreferencesConfirmed}
                    onCheckedChange={(checked) => updateField("seasonalPreferencesConfirmed", checked)}
                    data-testid="checkbox-seasonal-confirmed"
                  />
                  <Label htmlFor="checklist-seasonal" className="cursor-pointer">
                    Seasonal preferences confirmed
                  </Label>
                </div>
              </div>
            </div>

            <div className="border-t pt-6 space-y-4">
              <h3 className="font-medium">Authorization</h3>
              <p className="text-sm text-muted-foreground">
                By signing below, I authorize Near Me Connect to access and manage the social media
                accounts and platforms listed in this onboarding form on behalf of my business.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={formData.authorizationName}
                    onChange={(e) => updateField("authorizationName", e.target.value)}
                    placeholder="Your full name"
                    data-testid="input-auth-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <DatePicker
                    value={formData.authorizationDate}
                    onChange={(val) => updateField("authorizationDate", val)}
                    data-testid="input-auth-date"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Electronic Signature</Label>
                <Input
                  value={formData.authorizationSignature}
                  onChange={(e) => updateField("authorizationSignature", e.target.value)}
                  placeholder="Type your full name as signature"
                  className="font-script italic"
                  data-testid="input-auth-signature"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
          data-testid="button-back"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {currentStep < totalSteps ? (
          <Button onClick={handleNext} data-testid="button-next">
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button 
            onClick={handleComplete} 
            data-testid="button-complete"
          >
            <Check className="w-4 h-4 mr-2" />
            Complete Onboarding
          </Button>
        )}
      </div>

      <Dialog open={validationDialogOpen} onOpenChange={setValidationDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-validation-errors">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Missing Required Information
            </DialogTitle>
            <DialogDescription>
              Please complete the following items before submitting your onboarding:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {validationErrors.map((error, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{error.section}</h4>
                  <span className="text-xs text-muted-foreground">Step {error.step}</span>
                </div>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {error.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setCurrentStep(error.step);
                    setValidationDialogOpen(false);
                  }}
                  data-testid={`button-go-to-step-${error.step}`}
                >
                  Go to {error.section}
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValidationDialogOpen(false)} data-testid="button-close-validation">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
