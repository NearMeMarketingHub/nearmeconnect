import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, CheckCircle2, Plus, Trash2, Loader2, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/LogoNewMedium_1768860762303.png";

interface Owner {
  fullName: string;
  title: string;
  percentOwned: string;
  usCitizen: string;
  greenCard: string;
  gender: string;
  veteran: string;
}

const emptyOwner = (): Owner => ({
  fullName: "",
  title: "",
  percentOwned: "",
  usCitizen: "yes",
  greenCard: "no",
  gender: "",
  veteran: "no",
});

const STEPS = [
  "Business Information",
  "Structure & Size",
  "Ownership",
  "Control",
  "EDWOSB (Optional)",
  "Certification",
];

export default function GovernmentFormPage() {
  const [, params] = useRoute("/form/:token");
  const token = params?.token || "";
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  // ── Step 1: Business Information ─────────────────────────────────────────
  const [legalName, setLegalName] = useState("");
  const [dba, setDba] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [samUei, setSamUei] = useState("");
  const [ein, setEin] = useState("");
  const [naicsCodes, setNaicsCodes] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");

  // ── Step 2: Structure & Size ──────────────────────────────────────────────
  const [businessStructure, setBusinessStructure] = useState("");
  const [stateOfOrg, setStateOfOrg] = useState("");
  const [dateEstablished, setDateEstablished] = useState("");
  const [fiscalYearEnd, setFiscalYearEnd] = useState("");
  const [numEmployees, setNumEmployees] = useState("");
  const [receiptsYear1, setReceiptsYear1] = useState("");
  const [receiptsYear2, setReceiptsYear2] = useState("");
  const [receiptsYear3, setReceiptsYear3] = useState("");
  const [receiptsYear1Label, setReceiptsYear1Label] = useState(new Date().getFullYear().toString());
  const [receiptsYear2Label, setReceiptsYear2Label] = useState((new Date().getFullYear() - 1).toString());
  const [receiptsYear3Label, setReceiptsYear3Label] = useState((new Date().getFullYear() - 2).toString());

  // ── Step 3: Ownership ─────────────────────────────────────────────────────
  const [owners, setOwners] = useState<Owner[]>([emptyOwner()]);

  // ── Step 4: Control ───────────────────────────────────────────────────────
  const [womenMajority51, setWomenMajority51] = useState("");
  const [corpWomenMajorityStock, setCorpWomenMajorityStock] = useState("");
  const [llcWomenManagingMembers, setLlcWomenManagingMembers] = useState("");
  const [partnershipWomenGeneralPartners, setPartnershipWomenGeneralPartners] = useState("");
  const [highestOfficerName, setHighestOfficerName] = useState("");
  const [highestOfficerTitle, setHighestOfficerTitle] = useState("");
  const [highestOfficerIsWoman, setHighestOfficerIsWoman] = useState("");
  const [dayToDayManager, setDayToDayManager] = useState("");
  const [dayToDayManagerTitle, setDayToDayManagerTitle] = useState("");
  const [dayToDayIsWoman, setDayToDayIsWoman] = useState("");
  const [nonWomanControl, setNonWomanControl] = useState("");
  const [nonWomanControlExplanation, setNonWomanControlExplanation] = useState("");

  // ── Step 5: EDWOSB ────────────────────────────────────────────────────────
  const [applyingEdwosb, setApplyingEdwosb] = useState("");
  const [personalNetWorth, setPersonalNetWorth] = useState("");
  const [adjustedGrossIncome, setAdjustedGrossIncome] = useState("");
  const [totalAssetValue, setTotalAssetValue] = useState("");

  // ── Step 6: Certification ─────────────────────────────────────────────────
  const [certName, setCertName] = useState("");
  const [certTitle, setCertTitle] = useState("");
  const [certDate, setCertDate] = useState(new Date().toISOString().split("T")[0]);
  const [certAccuracy, setCertAccuracy] = useState(false);

  const { data, isLoading, error } = useQuery<{ form: any; companyName: string }>({
    queryKey: ["/api/government-forms/token", token],
    queryFn: async () => {
      const res = await fetch(`/api/government-forms/token/${token}`);
      if (!res.ok) throw new Error("Form not found");
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: async (formData: object) => {
      const res = await fetch(`/api/government-forms/token/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Submit failed");
      return res.json();
    },
    onSuccess: () => setSubmitted(true),
    onError: () => toast({ title: "Error", description: "Failed to submit form. Please try again.", variant: "destructive" }),
  });

  const handleSubmit = () => {
    const payload = {
      businessInfo: { legalName, dba, streetAddress, city, state, zip, phone, email, website, samUei, ein, naicsCodes, businessDescription },
      structureSize: { businessStructure, stateOfOrg, dateEstablished, fiscalYearEnd, numEmployees, receiptsYear1, receiptsYear1Label, receiptsYear2, receiptsYear2Label, receiptsYear3, receiptsYear3Label },
      ownership: { owners },
      control: { womenMajority51, corpWomenMajorityStock, llcWomenManagingMembers, partnershipWomenGeneralPartners, highestOfficerName, highestOfficerTitle, highestOfficerIsWoman, dayToDayManager, dayToDayManagerTitle, dayToDayIsWoman, nonWomanControl, nonWomanControlExplanation },
      edwosb: { applyingEdwosb, personalNetWorth, adjustedGrossIncome, totalAssetValue },
      certification: { certName, certTitle, certDate },
    };
    submitMutation.mutate(payload);
  };

  const addOwner = () => setOwners([...owners, emptyOwner()]);
  const removeOwner = (i: number) => setOwners(owners.filter((_, idx) => idx !== i));
  const updateOwner = (i: number, field: keyof Owner, value: string) => {
    const updated = [...owners];
    updated[i] = { ...updated[i], [field]: value };
    setOwners(updated);
  };

  const canProceed = (): boolean => {
    if (step === 0) return !!(legalName && streetAddress && city && state && zip && phone && email && ein);
    if (step === 1) return !!(businessStructure && stateOfOrg && dateEstablished && numEmployees);
    if (step === 2) return owners.length > 0 && owners.every(o => o.fullName && o.percentOwned && o.gender);
    if (step === 3) return !!(womenMajority51 && highestOfficerName && highestOfficerTitle && highestOfficerIsWoman && dayToDayIsWoman && nonWomanControl);
    if (step === 4) return true;
    if (step === 5) return !!(certName && certTitle && certDate && certAccuracy);
    return true;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Form Not Found</h2>
            <p className="text-muted-foreground">This form link may have expired or is invalid. Please contact your agency representative.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data.form.status === "completed" && !submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2">Form Already Submitted</h2>
            <p className="text-muted-foreground">This form has already been completed. Thank you!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2">Form Submitted!</h2>
            <p className="text-muted-foreground">Thank you for completing the WOSB certification form. Your agency will be in touch.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-white dark:bg-gray-950 border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <img src={logoImage} alt="Near Me Connect" className="h-8 w-auto" />
          <div>
            <p className="text-xs text-muted-foreground">{data.companyName}</p>
            <h1 className="text-sm font-semibold leading-tight">Women-Owned Small Business (WOSB) Certification</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center gap-1 flex-wrap">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold border-2 transition-colors ${
                  i < step ? "bg-orange-500 border-orange-500 text-white" :
                  i === step ? "border-orange-500 text-orange-600" :
                  "border-muted-foreground/30 text-muted-foreground"
                }`}>
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:inline ${i === step ? "font-medium text-foreground" : "text-muted-foreground"}`}>{s}</span>
                {i < STEPS.length - 1 && <div className="w-4 h-px bg-border mx-1" />}
              </div>
            ))}
          </div>
          <p className="mt-3 text-lg font-semibold">{STEPS[step]}</p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-5">

            {/* ── STEP 1: Business Information ─────────────────────────────── */}
            {step === 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1">
                    <Label>Legal Business Name <span className="text-destructive">*</span></Label>
                    <Input value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="As registered with the state" data-testid="input-legal-name" />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label>DBA / Trade Name (if different)</Label>
                    <Input value={dba} onChange={e => setDba(e.target.value)} placeholder="Optional" data-testid="input-dba" />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label>Street Address <span className="text-destructive">*</span></Label>
                    <Input value={streetAddress} onChange={e => setStreetAddress(e.target.value)} data-testid="input-street" />
                  </div>
                  <div className="space-y-1">
                    <Label>City <span className="text-destructive">*</span></Label>
                    <Input value={city} onChange={e => setCity(e.target.value)} data-testid="input-city" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label>State <span className="text-destructive">*</span></Label>
                      <Input value={state} onChange={e => setState(e.target.value)} maxLength={2} placeholder="TX" data-testid="input-state" />
                    </div>
                    <div className="space-y-1">
                      <Label>ZIP <span className="text-destructive">*</span></Label>
                      <Input value={zip} onChange={e => setZip(e.target.value)} data-testid="input-zip" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Business Phone <span className="text-destructive">*</span></Label>
                    <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} data-testid="input-phone" />
                  </div>
                  <div className="space-y-1">
                    <Label>Business Email <span className="text-destructive">*</span></Label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} data-testid="input-email" />
                  </div>
                  <div className="space-y-1">
                    <Label>Business Website</Label>
                    <Input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." data-testid="input-website" />
                  </div>
                  <div className="space-y-1">
                    <Label>SAM Unique Entity ID (UEI)</Label>
                    <Input value={samUei} onChange={e => setSamUei(e.target.value)} placeholder="12-character UEI" data-testid="input-uei" />
                  </div>
                  <div className="space-y-1">
                    <Label>Employer Identification Number (EIN) <span className="text-destructive">*</span></Label>
                    <Input value={ein} onChange={e => setEin(e.target.value)} placeholder="XX-XXXXXXX" data-testid="input-ein" />
                  </div>
                  <div className="space-y-1">
                    <Label>Primary NAICS Code(s)</Label>
                    <Input value={naicsCodes} onChange={e => setNaicsCodes(e.target.value)} placeholder="e.g. 541611, 541810" data-testid="input-naics" />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label>Description of Primary Business Activity</Label>
                    <Textarea rows={3} value={businessDescription} onChange={e => setBusinessDescription(e.target.value)} placeholder="Briefly describe the goods or services your business provides" data-testid="input-biz-description" />
                  </div>
                </div>
              </>
            )}

            {/* ── STEP 2: Structure & Size ──────────────────────────────────── */}
            {step === 1 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1">
                    <Label>Business Structure <span className="text-destructive">*</span></Label>
                    <Select value={businessStructure} onValueChange={setBusinessStructure}>
                      <SelectTrigger data-testid="select-structure">
                        <SelectValue placeholder="Select structure" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                        <SelectItem value="general_partnership">General Partnership</SelectItem>
                        <SelectItem value="limited_partnership">Limited Partnership</SelectItem>
                        <SelectItem value="llc">Limited Liability Company (LLC)</SelectItem>
                        <SelectItem value="s_corp">S Corporation</SelectItem>
                        <SelectItem value="c_corp">C Corporation</SelectItem>
                        <SelectItem value="cooperative">Cooperative</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>State of Organization/Incorporation <span className="text-destructive">*</span></Label>
                    <Input value={stateOfOrg} onChange={e => setStateOfOrg(e.target.value)} maxLength={2} placeholder="TX" data-testid="input-state-org" />
                  </div>
                  <div className="space-y-1">
                    <Label>Date Business Established <span className="text-destructive">*</span></Label>
                    <Input type="date" value={dateEstablished} onChange={e => setDateEstablished(e.target.value)} data-testid="input-date-established" />
                  </div>
                  <div className="space-y-1">
                    <Label>Fiscal Year End (Month/Day)</Label>
                    <Input value={fiscalYearEnd} onChange={e => setFiscalYearEnd(e.target.value)} placeholder="e.g. 12/31" data-testid="input-fiscal-year" />
                  </div>
                  <div className="space-y-1">
                    <Label>Average Number of Employees (past 12 months) <span className="text-destructive">*</span></Label>
                    <Input type="number" min="0" value={numEmployees} onChange={e => setNumEmployees(e.target.value)} data-testid="input-employees" />
                  </div>
                </div>

                <Separator />
                <div>
                  <h3 className="font-medium mb-3">Annual Receipts</h3>
                  <p className="text-sm text-muted-foreground mb-4">Enter gross receipts or sales for the past three fiscal years.</p>
                  <div className="space-y-3">
                    {[
                      { label: receiptsYear1Label, value: receiptsYear1, set: setReceiptsYear1 },
                      { label: receiptsYear2Label, value: receiptsYear2, set: setReceiptsYear2 },
                      { label: receiptsYear3Label, value: receiptsYear3, set: setReceiptsYear3 },
                    ].map(({ label, value, set }, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Label className="w-16 shrink-0">{label}</Label>
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input className="pl-6" type="number" min="0" value={value} onChange={e => set(e.target.value)} placeholder="0.00" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── STEP 3: Ownership ─────────────────────────────────────────── */}
            {step === 2 && (
              <>
                <p className="text-sm text-muted-foreground">List all individuals who own 20% or more of the business.</p>
                <div className="space-y-6">
                  {owners.map((owner, i) => (
                    <div key={i} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Owner {i + 1}</h4>
                        {owners.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => removeOwner(i)} data-testid={`button-remove-owner-${i}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Full Legal Name <span className="text-destructive">*</span></Label>
                          <Input value={owner.fullName} onChange={e => updateOwner(i, "fullName", e.target.value)} data-testid={`input-owner-name-${i}`} />
                        </div>
                        <div className="space-y-1">
                          <Label>Title/Position <span className="text-destructive">*</span></Label>
                          <Input value={owner.title} onChange={e => updateOwner(i, "title", e.target.value)} data-testid={`input-owner-title-${i}`} />
                        </div>
                        <div className="space-y-1">
                          <Label>Percentage Owned (%) <span className="text-destructive">*</span></Label>
                          <Input type="number" min="0" max="100" value={owner.percentOwned} onChange={e => updateOwner(i, "percentOwned", e.target.value)} data-testid={`input-owner-percent-${i}`} />
                        </div>
                        <div className="space-y-1">
                          <Label>Gender <span className="text-destructive">*</span></Label>
                          <Select value={owner.gender} onValueChange={v => updateOwner(i, "gender", v)}>
                            <SelectTrigger data-testid={`select-owner-gender-${i}`}>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="woman">Woman</SelectItem>
                              <SelectItem value="man">Man</SelectItem>
                              <SelectItem value="nonbinary">Non-binary</SelectItem>
                              <SelectItem value="prefer_not">Prefer not to say</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>U.S. Citizen?</Label>
                          <Select value={owner.usCitizen} onValueChange={v => updateOwner(i, "usCitizen", v)}>
                            <SelectTrigger data-testid={`select-owner-citizen-${i}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {owner.usCitizen === "no" && (
                          <div className="space-y-1">
                            <Label>Permanent Resident (Green Card)?</Label>
                            <Select value={owner.greenCard} onValueChange={v => updateOwner(i, "greenCard", v)}>
                              <SelectTrigger data-testid={`select-owner-greencard-${i}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div className="space-y-1">
                          <Label>Veteran Status</Label>
                          <Select value={owner.veteran} onValueChange={v => updateOwner(i, "veteran", v)}>
                            <SelectTrigger data-testid={`select-owner-veteran-${i}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="no">Not a veteran</SelectItem>
                              <SelectItem value="veteran">Veteran</SelectItem>
                              <SelectItem value="service_disabled">Service-Disabled Veteran</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addOwner} data-testid="button-add-owner">
                    <Plus className="w-4 h-4 mr-2" /> Add Another Owner
                  </Button>
                </div>
              </>
            )}

            {/* ── STEP 4: Control ───────────────────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <Label>Does a woman (or women collectively) unconditionally own 51% or more of this business? <span className="text-destructive">*</span></Label>
                  <Select value={womenMajority51} onValueChange={setWomenMajority51}>
                    <SelectTrigger data-testid="select-women-majority"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Conditional: Corporation */}
                {(businessStructure === "c_corp" || businessStructure === "s_corp") && (
                  <div className="space-y-1 p-3 bg-muted/40 rounded-lg">
                    <Label className="text-sm">Corporation: Do women hold the majority of voting stock?</Label>
                    <Select value={corpWomenMajorityStock} onValueChange={setCorpWomenMajorityStock}>
                      <SelectTrigger data-testid="select-corp-stock"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Conditional: LLC */}
                {businessStructure === "llc" && (
                  <div className="space-y-1 p-3 bg-muted/40 rounded-lg">
                    <Label className="text-sm">LLC: Are women the majority managing members?</Label>
                    <Select value={llcWomenManagingMembers} onValueChange={setLlcWomenManagingMembers}>
                      <SelectTrigger data-testid="select-llc-members"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Conditional: Partnership */}
                {(businessStructure === "general_partnership" || businessStructure === "limited_partnership") && (
                  <div className="space-y-1 p-3 bg-muted/40 rounded-lg">
                    <Label className="text-sm">Partnership: Are women the majority general partners?</Label>
                    <Select value={partnershipWomenGeneralPartners} onValueChange={setPartnershipWomenGeneralPartners}>
                      <SelectTrigger data-testid="select-partnership-gp"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Separator />
                <h3 className="font-medium">Management & Control</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Highest-Ranking Officer Name <span className="text-destructive">*</span></Label>
                    <Input value={highestOfficerName} onChange={e => setHighestOfficerName(e.target.value)} data-testid="input-hro-name" />
                  </div>
                  <div className="space-y-1">
                    <Label>Title <span className="text-destructive">*</span></Label>
                    <Input value={highestOfficerTitle} onChange={e => setHighestOfficerTitle(e.target.value)} placeholder="e.g. CEO, President" data-testid="input-hro-title" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Is the highest-ranking officer a woman? <span className="text-destructive">*</span></Label>
                  <Select value={highestOfficerIsWoman} onValueChange={setHighestOfficerIsWoman}>
                    <SelectTrigger data-testid="select-hro-woman"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Day-to-Day Manager Name</Label>
                    <Input value={dayToDayManager} onChange={e => setDayToDayManager(e.target.value)} data-testid="input-dtd-name" />
                  </div>
                  <div className="space-y-1">
                    <Label>Title</Label>
                    <Input value={dayToDayManagerTitle} onChange={e => setDayToDayManagerTitle(e.target.value)} data-testid="input-dtd-title" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Is day-to-day management controlled by a woman? <span className="text-destructive">*</span></Label>
                  <Select value={dayToDayIsWoman} onValueChange={setDayToDayIsWoman}>
                    <SelectTrigger data-testid="select-dtd-woman"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Does any non-woman owner have power of control equal to or greater than the women owners? <span className="text-destructive">*</span></Label>
                  <Select value={nonWomanControl} onValueChange={setNonWomanControl}>
                    <SelectTrigger data-testid="select-nonwoman-control"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {nonWomanControl === "yes" && (
                  <div className="space-y-1">
                    <Label>Please explain <span className="text-destructive">*</span></Label>
                    <Textarea rows={3} value={nonWomanControlExplanation} onChange={e => setNonWomanControlExplanation(e.target.value)} data-testid="input-nonwoman-explain" />
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 5: EDWOSB ────────────────────────────────────────────── */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">Economically Disadvantaged WOSB (EDWOSB)</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">EDWOSB certification is required for certain federal contracts. It requires the women owners to meet specific economic disadvantage thresholds. This section is optional if you are only applying for standard WOSB certification.</p>
                </div>
                <div className="space-y-1">
                  <Label>Are you applying for EDWOSB certification?</Label>
                  <Select value={applyingEdwosb} onValueChange={setApplyingEdwosb}>
                    <SelectTrigger data-testid="select-edwosb"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes — I want EDWOSB designation</SelectItem>
                      <SelectItem value="no">No — standard WOSB only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {applyingEdwosb === "yes" && (
                  <>
                    <p className="text-sm text-muted-foreground">For each woman who unconditionally owns 51%+ of the business, provide the following personal financial information:</p>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <Label>Personal Net Worth (excluding primary residence equity and business value)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input className="pl-6" type="number" min="0" value={personalNetWorth} onChange={e => setPersonalNetWorth(e.target.value)} data-testid="input-net-worth" />
                        </div>
                        <p className="text-xs text-muted-foreground">Must be below $850,000 to qualify</p>
                      </div>
                      <div className="space-y-1">
                        <Label>Adjusted Gross Income (3-year average)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input className="pl-6" type="number" min="0" value={adjustedGrossIncome} onChange={e => setAdjustedGrossIncome(e.target.value)} data-testid="input-agi" />
                        </div>
                        <p className="text-xs text-muted-foreground">Must be $400,000 or less to qualify</p>
                      </div>
                      <div className="space-y-1">
                        <Label>Total Fair Market Value of All Assets</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input className="pl-6" type="number" min="0" value={totalAssetValue} onChange={e => setTotalAssetValue(e.target.value)} data-testid="input-total-assets" />
                        </div>
                        <p className="text-xs text-muted-foreground">Must be $6.5 million or less to qualify</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── STEP 6: Certification ─────────────────────────────────────── */}
            {step === 5 && (
              <div className="space-y-5">
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Certification Statement</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">By submitting this form, you certify that the information provided is true, correct, and complete to the best of your knowledge. You acknowledge that knowingly providing false information may subject you to penalties under federal law, including 18 U.S.C. § 1001.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Printed Name <span className="text-destructive">*</span></Label>
                    <Input value={certName} onChange={e => setCertName(e.target.value)} data-testid="input-cert-name" />
                  </div>
                  <div className="space-y-1">
                    <Label>Title <span className="text-destructive">*</span></Label>
                    <Input value={certTitle} onChange={e => setCertTitle(e.target.value)} data-testid="input-cert-title" />
                  </div>
                  <div className="space-y-1">
                    <Label>Date <span className="text-destructive">*</span></Label>
                    <Input type="date" value={certDate} onChange={e => setCertDate(e.target.value)} data-testid="input-cert-date" />
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <Checkbox
                    id="cert-accuracy"
                    checked={certAccuracy}
                    onCheckedChange={v => setCertAccuracy(!!v)}
                    data-testid="checkbox-accuracy"
                  />
                  <label htmlFor="cert-accuracy" className="text-sm leading-relaxed cursor-pointer">
                    I certify that all information provided in this form is true, accurate, and complete. I understand that any false statement may constitute fraud and could result in penalties or debarment from federal contracting.
                  </label>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0} data-testid="button-prev-step">
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">Step {step + 1} of {STEPS.length}</span>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} data-testid="button-next-step">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || submitMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
              data-testid="button-submit-form"
            >
              {submitMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Submit Form
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
