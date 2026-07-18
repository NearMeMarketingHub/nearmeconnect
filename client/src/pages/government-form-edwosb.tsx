import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, CheckCircle2, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/near-me-connect-logo-nobg.png";

const STEPS = [
  "Business Information",
  "Ownership",
  "Financial Statement",
  "Control",
  "Certification",
];

interface WomanOwner {
  fullName: string;
  title: string;
  percentOwned: string;
  usCitizen: string;
  greenCard: string;
  dob: string;
  ssn: string;
  homeAddress: string;
  homeCity: string;
  homeState: string;
  homeZip: string;
  spouseName: string;
  spouseBusinessInterests: string;
  personalNetWorth: string;
  cashChecking: string;
  savings: string;
  retirement: string;
  stocks: string;
  realEstate: string;
  lifeInsurance: string;
  otherAssets: string;
  notesPayable: string;
  installmentLoans: string;
  otherLiabilities: string;
  grossIncomeYear1: string;
  grossIncomeYear2: string;
  grossIncomeYear3: string;
  grossIncomeYear1Label: string;
  grossIncomeYear2Label: string;
  grossIncomeYear3Label: string;
  primaryResidenceEquity: string;
  businessOwnershipValue: string;
}

const emptyWomanOwner = (): WomanOwner => ({
  fullName: "",
  title: "",
  percentOwned: "",
  usCitizen: "yes",
  greenCard: "no",
  dob: "",
  ssn: "",
  homeAddress: "",
  homeCity: "",
  homeState: "",
  homeZip: "",
  spouseName: "",
  spouseBusinessInterests: "",
  personalNetWorth: "",
  cashChecking: "",
  savings: "",
  retirement: "",
  stocks: "",
  realEstate: "",
  lifeInsurance: "",
  otherAssets: "",
  notesPayable: "",
  installmentLoans: "",
  otherLiabilities: "",
  grossIncomeYear1: "",
  grossIncomeYear2: "",
  grossIncomeYear3: "",
  grossIncomeYear1Label: new Date().getFullYear().toString(),
  grossIncomeYear2Label: (new Date().getFullYear() - 1).toString(),
  grossIncomeYear3Label: (new Date().getFullYear() - 2).toString(),
  primaryResidenceEquity: "",
  businessOwnershipValue: "",
});

function computeNetWorth(o: WomanOwner): number {
  const sum = (...vals: string[]) => vals.reduce((a, v) => a + (parseFloat(v.replace(/,/g, "")) || 0), 0);
  const totalAssets = sum(o.cashChecking, o.savings, o.retirement, o.stocks, o.realEstate, o.lifeInsurance, o.otherAssets);
  const totalLiabilities = sum(o.notesPayable, o.installmentLoans, o.otherLiabilities);
  const excluded = sum(o.primaryResidenceEquity, o.businessOwnershipValue);
  return totalAssets - totalLiabilities - excluded;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

interface Props {
  token: string;
  companyName: string;
  onSubmit: (payload: object) => void;
  isPending: boolean;
}

export default function EdwosbForm({ token, companyName, onSubmit, isPending }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);

  // ── Step 1: Business Information ─────────────────────────────────────────
  const [legalName, setLegalName] = useState("");
  const [dba, setDba] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [bizState, setBizState] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [samUei, setSamUei] = useState("");
  const [ein, setEin] = useState("");
  const [naicsCodes, setNaicsCodes] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessStructure, setBusinessStructure] = useState("");
  const [stateOfOrg, setStateOfOrg] = useState("");
  const [dateEstablished, setDateEstablished] = useState("");
  const [numEmployees, setNumEmployees] = useState("");

  // ── Step 2: Woman Owners (those qualifying for EDWOSB) ────────────────────
  const [womanOwners, setWomanOwners] = useState<WomanOwner[]>([emptyWomanOwner()]);

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

  // ── Step 5: Certification ─────────────────────────────────────────────────
  const [certName, setCertName] = useState("");
  const [certTitle, setCertTitle] = useState("");
  const [certDate, setCertDate] = useState(new Date().toISOString().split("T")[0]);
  const [certAccuracy, setCertAccuracy] = useState(false);

  const addOwner = () => setWomanOwners([...womanOwners, emptyWomanOwner()]);
  const removeOwner = (i: number) => setWomanOwners(womanOwners.filter((_, idx) => idx !== i));
  const updateOwner = (i: number, field: keyof WomanOwner, value: string) => {
    const updated = [...womanOwners];
    updated[i] = { ...updated[i], [field]: value };
    setWomanOwners(updated);
  };

  const canProceed = (): boolean => {
    if (step === 0) return !!(legalName && streetAddress && city && bizState && zip && phone && email && ein && businessStructure);
    if (step === 1) return womanOwners.length > 0 && womanOwners.every(o => o.fullName && o.percentOwned && o.title);
    if (step === 2) return true;
    if (step === 3) return !!(womenMajority51 && highestOfficerName && highestOfficerTitle && highestOfficerIsWoman && dayToDayIsWoman && nonWomanControl);
    if (step === 4) return !!(certName && certTitle && certDate && certAccuracy);
    return true;
  };

  const handleNext = () => {
    if (!canProceed()) { toast({ title: "Please fill in all required fields", variant: "destructive" }); return; }
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else handleSubmit();
  };

  const handleSubmit = () => {
    const payload = {
      businessInfo: { legalName, dba, streetAddress, city, state: bizState, zip, phone, email, website, samUei, ein, naicsCodes, businessDescription, businessStructure, stateOfOrg, dateEstablished, numEmployees },
      womanOwners,
      control: { womenMajority51, corpWomenMajorityStock, llcWomenManagingMembers, partnershipWomenGeneralPartners, highestOfficerName, highestOfficerTitle, highestOfficerIsWoman, dayToDayManager, dayToDayManagerTitle, dayToDayIsWoman, nonWomanControl, nonWomanControlExplanation },
      certification: { certName, certTitle, certDate },
    };
    onSubmit(payload);
  };

  return (
    <>
      {/* Header */}
      <div className="bg-white dark:bg-gray-950 border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <img src={logoImage} alt="Near Me Connect" className="h-8 w-auto dark:brightness-0 dark:invert" />
          <div>
            <p className="text-xs text-muted-foreground">{companyName}</p>
            <h1 className="text-sm font-semibold leading-tight">Economically Disadvantaged Women-Owned Small Business (EDWOSB) Certification</h1>
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
                    <Input value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="As registered with the state" data-testid="input-edwosb-legal-name" />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label>DBA / Trade Name (if different)</Label>
                    <Input value={dba} onChange={e => setDba(e.target.value)} placeholder="Optional" data-testid="input-edwosb-dba" />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label>Street Address <span className="text-destructive">*</span></Label>
                    <Input value={streetAddress} onChange={e => setStreetAddress(e.target.value)} data-testid="input-edwosb-street" />
                  </div>
                  <div className="space-y-1">
                    <Label>City <span className="text-destructive">*</span></Label>
                    <Input value={city} onChange={e => setCity(e.target.value)} data-testid="input-edwosb-city" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label>State <span className="text-destructive">*</span></Label>
                      <Input value={bizState} onChange={e => setBizState(e.target.value)} maxLength={2} placeholder="TX" data-testid="input-edwosb-state" />
                    </div>
                    <div className="space-y-1">
                      <Label>ZIP <span className="text-destructive">*</span></Label>
                      <Input value={zip} onChange={e => setZip(e.target.value)} data-testid="input-edwosb-zip" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Phone <span className="text-destructive">*</span></Label>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} type="tel" data-testid="input-edwosb-phone" />
                  </div>
                  <div className="space-y-1">
                    <Label>Email <span className="text-destructive">*</span></Label>
                    <Input value={email} onChange={e => setEmail(e.target.value)} type="email" data-testid="input-edwosb-email" />
                  </div>
                  <div className="space-y-1">
                    <Label>Website</Label>
                    <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://" data-testid="input-edwosb-website" />
                  </div>
                  <div className="space-y-1">
                    <Label>EIN / Tax ID <span className="text-destructive">*</span></Label>
                    <Input value={ein} onChange={e => setEin(e.target.value)} placeholder="XX-XXXXXXX" data-testid="input-edwosb-ein" />
                  </div>
                  <div className="space-y-1">
                    <Label>SAM.gov UEI</Label>
                    <Input value={samUei} onChange={e => setSamUei(e.target.value)} data-testid="input-edwosb-uei" />
                  </div>
                  <div className="space-y-1">
                    <Label>Primary NAICS Code(s)</Label>
                    <Input value={naicsCodes} onChange={e => setNaicsCodes(e.target.value)} placeholder="e.g. 541512" data-testid="input-edwosb-naics" />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label>Business Structure <span className="text-destructive">*</span></Label>
                    <Select value={businessStructure} onValueChange={setBusinessStructure}>
                      <SelectTrigger data-testid="select-edwosb-structure"><SelectValue placeholder="Select structure" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                        <SelectItem value="llc">LLC</SelectItem>
                        <SelectItem value="s_corp">S Corporation</SelectItem>
                        <SelectItem value="c_corp">C Corporation</SelectItem>
                        <SelectItem value="partnership">Partnership</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>State of Incorporation/Organization</Label>
                    <Input value={stateOfOrg} onChange={e => setStateOfOrg(e.target.value)} maxLength={2} placeholder="TX" data-testid="input-edwosb-state-org" />
                  </div>
                  <div className="space-y-1">
                    <Label>Date Established</Label>
                    <Input value={dateEstablished} onChange={e => setDateEstablished(e.target.value)} type="date" data-testid="input-edwosb-date-est" />
                  </div>
                  <div className="space-y-1">
                    <Label>Number of Employees</Label>
                    <Input value={numEmployees} onChange={e => setNumEmployees(e.target.value)} type="number" min="0" data-testid="input-edwosb-employees" />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label>Brief Business Description</Label>
                    <Textarea value={businessDescription} onChange={e => setBusinessDescription(e.target.value)} rows={2} placeholder="What products or services does the business provide?" data-testid="input-edwosb-description" />
                  </div>
                </div>
              </>
            )}

            {/* ── STEP 2: Woman Owners ──────────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  List each woman owner who qualifies as economically disadvantaged (U.S. citizen or permanent resident, owns 51%+ collectively).
                </p>
                {womanOwners.map((owner, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-4 relative">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">Owner {i + 1}</p>
                      {womanOwners.length > 1 && (
                        <Button size="sm" variant="ghost" onClick={() => removeOwner(i)} data-testid={`button-edwosb-remove-owner-${i}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Full Legal Name <span className="text-destructive">*</span></Label>
                        <Input value={owner.fullName} onChange={e => updateOwner(i, "fullName", e.target.value)} data-testid={`input-edwosb-owner-name-${i}`} />
                      </div>
                      <div className="space-y-1">
                        <Label>Title / Position <span className="text-destructive">*</span></Label>
                        <Input value={owner.title} onChange={e => updateOwner(i, "title", e.target.value)} placeholder="CEO, President, etc." data-testid={`input-edwosb-owner-title-${i}`} />
                      </div>
                      <div className="space-y-1">
                        <Label>% Ownership <span className="text-destructive">*</span></Label>
                        <Input value={owner.percentOwned} onChange={e => updateOwner(i, "percentOwned", e.target.value)} type="number" min="0" max="100" placeholder="51" data-testid={`input-edwosb-owner-pct-${i}`} />
                      </div>
                      <div className="space-y-1">
                        <Label>Date of Birth</Label>
                        <Input value={owner.dob} onChange={e => updateOwner(i, "dob", e.target.value)} type="date" data-testid={`input-edwosb-owner-dob-${i}`} />
                      </div>
                      <div className="space-y-1">
                        <Label>U.S. Citizen?</Label>
                        <Select value={owner.usCitizen} onValueChange={v => updateOwner(i, "usCitizen", v)}>
                          <SelectTrigger data-testid={`select-edwosb-owner-citizen-${i}`}><SelectValue /></SelectTrigger>
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
                            <SelectTrigger data-testid={`select-edwosb-owner-greencard-${i}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="sm:col-span-2 space-y-1">
                        <Label>Home Address</Label>
                        <Input value={owner.homeAddress} onChange={e => updateOwner(i, "homeAddress", e.target.value)} placeholder="Street address" data-testid={`input-edwosb-owner-home-${i}`} />
                      </div>
                      <div className="space-y-1">
                        <Label>City</Label>
                        <Input value={owner.homeCity} onChange={e => updateOwner(i, "homeCity", e.target.value)} data-testid={`input-edwosb-owner-home-city-${i}`} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label>State</Label>
                          <Input value={owner.homeState} onChange={e => updateOwner(i, "homeState", e.target.value)} maxLength={2} data-testid={`input-edwosb-owner-home-state-${i}`} />
                        </div>
                        <div className="space-y-1">
                          <Label>ZIP</Label>
                          <Input value={owner.homeZip} onChange={e => updateOwner(i, "homeZip", e.target.value)} data-testid={`input-edwosb-owner-home-zip-${i}`} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label>Spouse's Name (if applicable)</Label>
                        <Input value={owner.spouseName} onChange={e => updateOwner(i, "spouseName", e.target.value)} data-testid={`input-edwosb-owner-spouse-${i}`} />
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <Label>Spouse's Business Interests (if any)</Label>
                        <Textarea value={owner.spouseBusinessInterests} onChange={e => updateOwner(i, "spouseBusinessInterests", e.target.value)} rows={2} placeholder="Describe any businesses the spouse owns or has interest in" data-testid={`input-edwosb-owner-spouse-biz-${i}`} />
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={addOwner} data-testid="button-edwosb-add-owner">
                  <Plus className="w-4 h-4 mr-1" /> Add Another Owner
                </Button>
              </div>
            )}

            {/* ── STEP 3: Personal Financial Statement ─────────────────────── */}
            {step === 2 && (
              <div className="space-y-8">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    To qualify as economically disadvantaged, each woman owner's <strong>adjusted personal net worth must be less than $850,000</strong>, excluding equity in their primary residence and ownership interest in this business.
                  </p>
                </div>

                {womanOwners.map((owner, i) => {
                  const netWorth = computeNetWorth(owner);
                  const qualifies = netWorth < 850000;
                  const totalAssets = (parseFloat(owner.cashChecking.replace(/,/g, "")) || 0)
                    + (parseFloat(owner.savings.replace(/,/g, "")) || 0)
                    + (parseFloat(owner.retirement.replace(/,/g, "")) || 0)
                    + (parseFloat(owner.stocks.replace(/,/g, "")) || 0)
                    + (parseFloat(owner.realEstate.replace(/,/g, "")) || 0)
                    + (parseFloat(owner.lifeInsurance.replace(/,/g, "")) || 0)
                    + (parseFloat(owner.otherAssets.replace(/,/g, "")) || 0);
                  const totalLiabilities = (parseFloat(owner.notesPayable.replace(/,/g, "")) || 0)
                    + (parseFloat(owner.installmentLoans.replace(/,/g, "")) || 0)
                    + (parseFloat(owner.otherLiabilities.replace(/,/g, "")) || 0);

                  return (
                    <div key={i} className="border rounded-lg p-5 space-y-5">
                      <p className="font-semibold text-sm">{owner.fullName || `Owner ${i + 1}`} — Personal Financial Statement</p>

                      {/* Assets */}
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Assets</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            ["Cash / Checking Accounts", "cashChecking", `input-edwosb-cash-${i}`],
                            ["Savings / Money Market", "savings", `input-edwosb-savings-${i}`],
                            ["IRA / Retirement Accounts", "retirement", `input-edwosb-retirement-${i}`],
                            ["Stocks / Bonds / Investments", "stocks", `input-edwosb-stocks-${i}`],
                            ["Real Estate (excl. primary residence)", "realEstate", `input-edwosb-realestate-${i}`],
                            ["Life Insurance Cash Value", "lifeInsurance", `input-edwosb-lifeins-${i}`],
                            ["Other Assets", "otherAssets", `input-edwosb-otherassets-${i}`],
                          ].map(([label, field, testId]) => (
                            <div key={field as string} className="space-y-1">
                              <Label className="text-xs">{label as string}</Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                <Input className="pl-6" value={(owner as any)[field as string]} onChange={e => updateOwner(i, field as keyof WomanOwner, e.target.value)} placeholder="0" data-testid={testId as string} />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="text-sm text-right text-muted-foreground">Total Assets: <span className="font-semibold text-foreground">{fmt(totalAssets)}</span></div>
                      </div>

                      {/* Liabilities */}
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Liabilities</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            ["Notes Payable to Banks / Others", "notesPayable", `input-edwosb-notespay-${i}`],
                            ["Installment Loans / Auto Loans", "installmentLoans", `input-edwosb-installment-${i}`],
                            ["Other Liabilities", "otherLiabilities", `input-edwosb-otherliab-${i}`],
                          ].map(([label, field, testId]) => (
                            <div key={field as string} className="space-y-1">
                              <Label className="text-xs">{label as string}</Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                <Input className="pl-6" value={(owner as any)[field as string]} onChange={e => updateOwner(i, field as keyof WomanOwner, e.target.value)} placeholder="0" data-testid={testId as string} />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="text-sm text-right text-muted-foreground">Total Liabilities: <span className="font-semibold text-foreground">{fmt(totalLiabilities)}</span></div>
                      </div>

                      {/* Exclusions */}
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">SBA Exclusions (deducted from net worth)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Equity in Primary Residence</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                              <Input className="pl-6" value={owner.primaryResidenceEquity} onChange={e => updateOwner(i, "primaryResidenceEquity", e.target.value)} placeholder="0" data-testid={`input-edwosb-primary-equity-${i}`} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Ownership Interest in This Business</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                              <Input className="pl-6" value={owner.businessOwnershipValue} onChange={e => updateOwner(i, "businessOwnershipValue", e.target.value)} placeholder="0" data-testid={`input-edwosb-biz-ownership-${i}`} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Net Worth Result */}
                      <div className={`p-4 rounded-lg border-2 ${qualifies ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20" : "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20"}`}>
                        <p className="text-sm font-semibold">
                          Adjusted Personal Net Worth: <span className={qualifies ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>{fmt(netWorth)}</span>
                        </p>
                        <p className={`text-xs mt-1 ${qualifies ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
                          {qualifies ? "✓ Below $850,000 threshold — qualifies as economically disadvantaged" : "⚠ Exceeds $850,000 threshold — may not qualify for EDWOSB"}
                        </p>
                      </div>

                      {/* Income */}
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Annual Gross Income (Last 3 Years)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {([
                            [owner.grossIncomeYear1Label, "grossIncomeYear1", `input-edwosb-income1-${i}`],
                            [owner.grossIncomeYear2Label, "grossIncomeYear2", `input-edwosb-income2-${i}`],
                            [owner.grossIncomeYear3Label, "grossIncomeYear3", `input-edwosb-income3-${i}`],
                          ] as [string, keyof WomanOwner, string][]).map(([label, field, testId]) => (
                            <div key={field} className="space-y-1">
                              <Label className="text-xs">{label}</Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                <Input className="pl-6" value={owner[field] as string} onChange={e => updateOwner(i, field, e.target.value)} placeholder="0" data-testid={testId} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── STEP 4: Control ──────────────────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">Confirm that women unconditionally and directly control the business's management and daily operations.</p>

                <div className="space-y-1">
                  <Label>Do women own 51% or more of the business? <span className="text-destructive">*</span></Label>
                  <Select value={womenMajority51} onValueChange={setWomenMajority51}>
                    <SelectTrigger data-testid="select-edwosb-majority"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {businessStructure === "c_corp" || businessStructure === "s_corp" ? (
                  <div className="space-y-1">
                    <Label>Do women own the majority of voting stock?</Label>
                    <Select value={corpWomenMajorityStock} onValueChange={setCorpWomenMajorityStock}>
                      <SelectTrigger data-testid="select-edwosb-stock"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : businessStructure === "llc" ? (
                  <div className="space-y-1">
                    <Label>Are the managing members of the LLC women?</Label>
                    <Select value={llcWomenManagingMembers} onValueChange={setLlcWomenManagingMembers}>
                      <SelectTrigger data-testid="select-edwosb-llc"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : businessStructure === "partnership" ? (
                  <div className="space-y-1">
                    <Label>Are the general partners of the partnership women?</Label>
                    <Select value={partnershipWomenGeneralPartners} onValueChange={setPartnershipWomenGeneralPartners}>
                      <SelectTrigger data-testid="select-edwosb-partnership"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Highest Officer Name <span className="text-destructive">*</span></Label>
                    <Input value={highestOfficerName} onChange={e => setHighestOfficerName(e.target.value)} placeholder="Full name" data-testid="input-edwosb-hro-name" />
                  </div>
                  <div className="space-y-1">
                    <Label>Highest Officer Title <span className="text-destructive">*</span></Label>
                    <Input value={highestOfficerTitle} onChange={e => setHighestOfficerTitle(e.target.value)} placeholder="CEO, President, etc." data-testid="input-edwosb-hro-title" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Is the highest ranking officer a woman? <span className="text-destructive">*</span></Label>
                  <Select value={highestOfficerIsWoman} onValueChange={setHighestOfficerIsWoman}>
                    <SelectTrigger data-testid="select-edwosb-hro-woman"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Day-to-Day Manager (if different from above)</Label>
                    <Input value={dayToDayManager} onChange={e => setDayToDayManager(e.target.value)} placeholder="Full name" data-testid="input-edwosb-dtd-name" />
                  </div>
                  <div className="space-y-1">
                    <Label>Day-to-Day Manager Title</Label>
                    <Input value={dayToDayManagerTitle} onChange={e => setDayToDayManagerTitle(e.target.value)} data-testid="input-edwosb-dtd-title" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Is the day-to-day manager a woman? <span className="text-destructive">*</span></Label>
                  <Select value={dayToDayIsWoman} onValueChange={setDayToDayIsWoman}>
                    <SelectTrigger data-testid="select-edwosb-dtd-woman"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No — explain below</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Does any non-woman exercise control over business decisions? <span className="text-destructive">*</span></Label>
                  <Select value={nonWomanControl} onValueChange={setNonWomanControl}>
                    <SelectTrigger data-testid="select-edwosb-nonwoman"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes — explain below</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(dayToDayIsWoman === "no" || nonWomanControl === "yes") && (
                  <div className="space-y-1">
                    <Label>Explanation</Label>
                    <Textarea value={nonWomanControlExplanation} onChange={e => setNonWomanControlExplanation(e.target.value)} rows={3} placeholder="Explain the circumstances..." data-testid="input-edwosb-nonwoman-explain" />
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 5: Certification ─────────────────────────────────────── */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="p-4 bg-muted/40 rounded-lg text-sm leading-relaxed text-muted-foreground space-y-2">
                  <p>I certify that the information provided in this application is accurate, complete, and current to the best of my knowledge. I understand that:</p>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li>Knowingly making false statements to obtain federal contracts is illegal and may result in criminal penalties.</li>
                    <li>This business qualifies as an Economically Disadvantaged Women-Owned Small Business (EDWOSB) under 13 CFR Part 127.</li>
                    <li>The business is unconditionally owned and controlled by one or more economically disadvantaged women who are U.S. citizens.</li>
                    <li>Each qualifying woman owner's adjusted personal net worth does not exceed $850,000.</li>
                    <li>I will notify the SBA if any material change affects the eligibility of this business.</li>
                  </ul>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Printed Name <span className="text-destructive">*</span></Label>
                    <Input value={certName} onChange={e => setCertName(e.target.value)} data-testid="input-edwosb-cert-name" />
                  </div>
                  <div className="space-y-1">
                    <Label>Title <span className="text-destructive">*</span></Label>
                    <Input value={certTitle} onChange={e => setCertTitle(e.target.value)} data-testid="input-edwosb-cert-title" />
                  </div>
                  <div className="space-y-1">
                    <Label>Date <span className="text-destructive">*</span></Label>
                    <Input value={certDate} onChange={e => setCertDate(e.target.value)} type="date" data-testid="input-edwosb-cert-date" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox id="edwosb-cert-accuracy" checked={certAccuracy} onCheckedChange={v => setCertAccuracy(!!v)} data-testid="checkbox-edwosb-cert" />
                  <label htmlFor="edwosb-cert-accuracy" className="text-sm cursor-pointer leading-snug">
                    I certify under penalty of perjury that all information provided is true, correct, and complete to the best of my knowledge and belief.
                  </label>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0} data-testid="button-edwosb-back">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button onClick={handleNext} disabled={isPending} data-testid="button-edwosb-next">
            {isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            {step === STEPS.length - 1 ? "Submit Application" : <>Next <ChevronRight className="w-4 h-4 ml-1" /></>}
          </Button>
        </div>
      </div>
    </>
  );
}
