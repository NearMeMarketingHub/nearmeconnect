import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ArrowLeft, Building2, Mail, Link as LinkIcon, Copy, Check, Send, Upload, Loader2, Search, X, Users } from "lucide-react";
import { Link } from "wouter";

interface HubSpotCompany {
  id: string;
  name: string;
  industry: string;
  description: string;
  domain: string;
  phone: string;
}

interface HubSpotContact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export default function AddCompany() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { uploadFile, isUploading } = useUpload();
  
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [clientType, setClientType] = useState("marketing");
  const [tier, setTier] = useState("essentials");
  const [website, setWebsite] = useState("");
  const [primaryContactName, setPrimaryContactName] = useState("");
  const [primaryContactEmail, setPrimaryContactEmail] = useState("");
  const [primaryContactPhone, setPrimaryContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("company_owner");
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [sentInviteEmails, setSentInviteEmails] = useState<string[]>([]);
  
  // HubSpot search state
  const [hubspotSearch, setHubspotSearch] = useState("");
  const [hubspotSearchResults, setHubspotSearchResults] = useState<HubSpotCompany[]>([]);
  const [selectedHubspotCompany, setSelectedHubspotCompany] = useState<HubSpotCompany | null>(null);
  const [hubspotContacts, setHubspotContacts] = useState<HubSpotContact[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Check HubSpot connection status
  const { data: hubspotStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/hubspot/status"],
  });

  // Search HubSpot companies with debounce
  useEffect(() => {
    if (!hubspotSearch || hubspotSearch.length < 2) {
      setHubspotSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/hubspot/search?q=${encodeURIComponent(hubspotSearch)}`);
        const data = await response.json();
        if (data.success) {
          setHubspotSearchResults(data.companies);
          setShowSearchResults(true);
        } else {
          toast({ title: "Failed to search HubSpot", description: data.error || "Please try again", variant: "destructive" });
        }
      } catch (error) {
        console.error("HubSpot search error:", error);
        toast({ title: "HubSpot search failed", description: "Could not connect to HubSpot", variant: "destructive" });
      } finally {
        setIsSearching(false);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [hubspotSearch, toast]);
  
  // Fetch contacts when a HubSpot company is selected
  const handleSelectHubspotCompany = async (company: HubSpotCompany) => {
    setSelectedHubspotCompany(company);
    setHubspotSearch("");
    setShowSearchResults(false);
    setName(company.name);
    setIndustry(company.industry || "");
    setWebsite(company.domain ? `https://${company.domain}` : "");
    
    // Fetch contacts for this company
    try {
      const response = await fetch(`/api/hubspot/company/${company.id}/contacts`);
      const data = await response.json();
      if (data.success && data.contacts) {
        // Filter contacts that have valid emails
        const validContacts = data.contacts.filter((c: HubSpotContact) => c.email);
        setHubspotContacts(validContacts);
        // Auto-fill primary contact if there's one
        if (validContacts.length > 0) {
          const firstContact = validContacts[0];
          const firstName = firstContact.firstName || '';
          const lastName = firstContact.lastName || '';
          setPrimaryContactName(`${firstName} ${lastName}`.trim());
          setPrimaryContactEmail(firstContact.email);
        }
        if (validContacts.length === 0 && data.contacts.length > 0) {
          toast({ title: "Note", description: "HubSpot contacts found but none have email addresses" });
        }
      } else {
        toast({ title: "Could not fetch contacts", description: data.error || "Unknown error", variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to fetch HubSpot contacts:", error);
      toast({ title: "Failed to fetch contacts", description: "Could not connect to HubSpot", variant: "destructive" });
    }
  };
  
  const clearHubspotSelection = () => {
    setSelectedHubspotCompany(null);
    setHubspotContacts([]);
    setName("");
    setIndustry("");
    setWebsite("");
    setPrimaryContactName("");
    setPrimaryContactEmail("");
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large. Maximum size is 5MB.", variant: "destructive" });
      return;
    }
    
    const response = await uploadFile(file);
    if (response) {
      setLogoUrl(response.objectPath);
      toast({ title: "Logo uploaded successfully" });
    }
  };

  const createCompanyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/companies", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setCreatedCompanyId(data.id);
      toast({ title: "Company created successfully! Now invite team members." });
    },
    onError: () => {
      toast({ title: "Failed to create company", variant: "destructive" });
    },
  });

  const createInviteMutation = useMutation({
    mutationFn: async (data: { companyId: string; email?: string; role: string }) => {
      const response = await apiRequest("POST", "/api/invitations", data);
      return response.json();
    },
    onSuccess: (data) => {
      const link = `${window.location.origin}/signup?invite=${data.token}`;
      setInviteLink(link);
      toast({ title: "Invitation created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create invitation", variant: "destructive" });
    },
  });

  const sendInviteEmailMutation = useMutation({
    mutationFn: async (data: { companyId: string; email: string; role: string }) => {
      const response = await apiRequest("POST", "/api/invitations", data);
      return { ...await response.json(), email: data.email };
    },
    onSuccess: (result) => {
      setSentInviteEmails(prev => [...prev, result.email]);
      setInviteEmail("");
      toast({ title: "Invitation email sent successfully" });
    },
    onError: () => {
      toast({ title: "Failed to send invitation email", variant: "destructive" });
    },
  });

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    createCompanyMutation.mutate({
      name,
      industry,
      clientType,
      subscriptionTier: tier,
      website,
      primaryContactName,
      primaryContactEmail,
      primaryContactPhone,
      notes,
      logoUrl,
      hubspotCompanyId: selectedHubspotCompany?.id || null,
    });
  };

  const handleGenerateLink = () => {
    if (!createdCompanyId) return;
    createInviteMutation.mutate({
      companyId: createdCompanyId,
      role: inviteRole,
    });
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdCompanyId || !inviteEmail.trim()) return;
    sendInviteEmailMutation.mutate({
      companyId: createdCompanyId,
      email: inviteEmail,
      role: inviteRole,
    });
  };

  const copyToClipboard = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleFinish = () => {
    navigate(`/admin/companies/${createdCompanyId}`);
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/companies" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Add New Company</h1>
            <p className="text-muted-foreground">
              Set up a new client company and invite team members.
            </p>
          </div>
        </div>

        {!createdCompanyId ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Company Information
              </CardTitle>
              <CardDescription>
                Enter the basic details for this client company.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCompany} className="space-y-6">
                {hubspotStatus?.connected && (
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-orange-500" />
                        <span className="font-medium text-sm">Link to HubSpot Company</span>
                      </div>
                      {selectedHubspotCompany && (
                        <Badge variant="secondary" className="gap-1">
                          Linked to HubSpot
                        </Badge>
                      )}
                    </div>
                    
                    {selectedHubspotCompany ? (
                      <div className="flex items-center justify-between p-3 bg-background rounded border">
                        <div>
                          <p className="font-medium">{selectedHubspotCompany.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedHubspotCompany.industry || "No industry"} 
                            {selectedHubspotCompany.domain && ` • ${selectedHubspotCompany.domain}`}
                          </p>
                          {hubspotContacts.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <Users className="w-3 h-3" />
                              {hubspotContacts.length} contact{hubspotContacts.length !== 1 ? 's' : ''} found
                            </div>
                          )}
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          onClick={clearHubspotSelection}
                          data-testid="button-clear-hubspot"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Input
                          placeholder="Search for a company in HubSpot..."
                          value={hubspotSearch}
                          onChange={(e) => setHubspotSearch(e.target.value)}
                          className="pr-10"
                          data-testid="input-hubspot-search"
                        />
                        {isSearching && (
                          <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
                        )}
                        
                        {showSearchResults && hubspotSearchResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                            {hubspotSearchResults.map((company) => (
                              <button
                                key={company.id}
                                type="button"
                                className="w-full px-3 py-2 text-left hover-elevate flex flex-col"
                                onClick={() => handleSelectHubspotCompany(company)}
                                data-testid={`hubspot-company-${company.id}`}
                              >
                                <span className="font-medium">{company.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {company.industry || "No industry"}
                                  {company.domain && ` • ${company.domain}`}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {showSearchResults && hubspotSearch.length >= 2 && hubspotSearchResults.length === 0 && !isSearching && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 p-3 text-center text-sm text-muted-foreground">
                            No companies found matching "{hubspotSearch}"
                          </div>
                        )}
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      Search and link to an existing HubSpot company to auto-fill details and import contacts.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <Avatar className="h-16 w-16 border">
                      {logoUrl ? (
                        <AvatarImage src={logoUrl} alt="Company logo" />
                      ) : null}
                      <AvatarFallback className="bg-primary/10">
                        <Building2 className="h-8 w-8 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                    <label
                      htmlFor="logo-upload"
                      className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                    >
                      {isUploading ? (
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      ) : (
                        <Upload className="h-6 w-6 text-white" />
                      )}
                    </label>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={isUploading}
                      data-testid="input-logo-upload"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Company Logo</p>
                    <p className="text-xs text-muted-foreground">
                      Click the avatar to upload a logo (optional)
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Company Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Acme Inc."
                      required
                      data-testid="input-company-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.com"
                      data-testid="input-website"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry / Business Type</Label>
                    <Input
                      id="industry"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="Technology, Healthcare, etc."
                      data-testid="input-industry"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientType">Client Type *</Label>
                    <Select value={clientType} onValueChange={setClientType}>
                      <SelectTrigger data-testid="select-client-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="government">Government</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tier">Subscription Tier *</Label>
                    <Select value={tier} onValueChange={setTier}>
                      <SelectTrigger data-testid="select-tier">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="essentials">Essentials - 20 credits ($2,500/mo)</SelectItem>
                        <SelectItem value="growth">Growth - 40 credits ($5,000/mo)</SelectItem>
                        <SelectItem value="accelerator">Accelerator - 60 credits ($7,000/mo)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-4">Primary Contact</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="contactName">Contact Name</Label>
                      <Input
                        id="contactName"
                        value={primaryContactName}
                        onChange={(e) => setPrimaryContactName(e.target.value)}
                        placeholder="John Smith"
                        data-testid="input-contact-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">Contact Email</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={primaryContactEmail}
                        onChange={(e) => setPrimaryContactEmail(e.target.value)}
                        placeholder="john@example.com"
                        data-testid="input-contact-email"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="contactPhone">Contact Phone</Label>
                      <Input
                        id="contactPhone"
                        type="tel"
                        value={primaryContactPhone}
                        onChange={(e) => setPrimaryContactPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        data-testid="input-contact-phone"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes / Special Considerations</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional information about this client..."
                    className="min-h-[100px]"
                    data-testid="input-notes"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" type="button" asChild>
                    <Link href="/admin/companies">Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={createCompanyMutation.isPending} data-testid="button-create-company">
                    {createCompanyMutation.isPending ? "Creating..." : "Create Company"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Company "{name}" created successfully!</p>
                    <p className="text-sm text-muted-foreground">Now invite team members to join.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {hubspotContacts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-orange-500" />
                    HubSpot Contacts
                  </CardTitle>
                  <CardDescription>
                    These contacts were found in HubSpot. Click to auto-fill their email for invitation.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {hubspotContacts.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        className="w-full p-3 text-left rounded-lg border hover-elevate flex items-center justify-between"
                        onClick={() => {
                          if (!createdCompanyId || sentInviteEmails.includes(contact.email)) return;
                          sendInviteEmailMutation.mutate({
                            companyId: createdCompanyId,
                            email: contact.email,
                            role: inviteRole,
                          });
                        }}
                        disabled={!createdCompanyId || sentInviteEmails.includes(contact.email) || sendInviteEmailMutation.isPending}
                        title={!createdCompanyId ? "Create the company first before sending invites" : undefined}
                        data-testid={`hubspot-contact-${contact.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-orange-100 text-orange-700">
                              {(contact.firstName?.[0] || contact.email?.[0] || '?').toUpperCase()}
                              {(contact.lastName?.[0] || '').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {(contact.firstName || contact.lastName) 
                                ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
                                : contact.email}
                            </p>
                            <p className="text-xs text-muted-foreground">{contact.email}</p>
                          </div>
                        </div>
                        {sentInviteEmails.includes(contact.email) ? (
                          <Badge variant="outline" className="gap-1 text-green-600 border-green-300">
                            <Check className="w-3 h-3" />
                            Invited
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Click to invite</Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Invite Team Members</CardTitle>
                <CardDescription>
                  Send an invitation via email or generate a signup link.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  <div className="space-y-2">
                    <Label htmlFor="inviteRole">Member Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger data-testid="select-invite-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="company_owner">Company Owner - Full access to company</SelectItem>
                        <SelectItem value="company_admin">Company Admin - Can manage tasks and settings</SelectItem>
                        <SelectItem value="team_member">Team Member - Chats, requests, calendar, training</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Tabs defaultValue="email">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="email" data-testid="tab-email-invite">
                      <Mail className="w-4 h-4 mr-2" />
                      Send Email
                    </TabsTrigger>
                    <TabsTrigger value="link" data-testid="tab-link-invite">
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Generate Link
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="email" className="mt-4">
                    <form onSubmit={handleSendEmail} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="inviteEmail">Email Address</Label>
                        <Input
                          id="inviteEmail"
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="team@example.com"
                          required
                          data-testid="input-invite-email"
                        />
                      </div>
                      <Button type="submit" disabled={sendInviteEmailMutation.isPending} data-testid="button-send-invite">
                        <Send className="w-4 h-4 mr-2" />
                        {sendInviteEmailMutation.isPending ? "Sending..." : "Send Invitation"}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="link" className="mt-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Generate a unique signup link that you can share with team members. 
                      Anyone with this link can sign up and be automatically added to the company.
                    </p>
                    
                    {!inviteLink ? (
                      <Button onClick={handleGenerateLink} disabled={createInviteMutation.isPending} data-testid="button-generate-link">
                        <LinkIcon className="w-4 h-4 mr-2" />
                        {createInviteMutation.isPending ? "Generating..." : "Generate Signup Link"}
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input 
                            value={inviteLink} 
                            readOnly 
                            className="font-mono text-sm"
                            data-testid="input-invite-link"
                          />
                          <Button 
                            variant="outline" 
                            onClick={copyToClipboard}
                            data-testid="button-copy-link"
                          >
                            {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          This link expires in 7 days. Generate a new link if needed.
                        </p>
                        <Button variant="outline" onClick={handleGenerateLink} size="sm">
                          Generate New Link
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => navigate("/admin/companies")}>
                Add Another Company
              </Button>
              <Button onClick={handleFinish} data-testid="button-finish">
                Go to Company
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
