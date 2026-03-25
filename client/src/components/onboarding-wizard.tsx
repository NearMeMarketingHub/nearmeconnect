import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Check, ArrowRight, ArrowLeft, Briefcase, Building2, Mail, Sparkles } from "lucide-react";
import { subscriptionTiers, tierCredits, type SubscriptionTier } from "@shared/schema";

const onboardingSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  contactName: z.string().min(2, "Contact name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  industry: z.string().min(1, "Please select an industry"),
  subscriptionTier: z.enum(subscriptionTiers),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

interface OnboardingWizardProps {
  onComplete: (data: OnboardingFormData) => void;
  isSubmitting?: boolean;
}

const steps = [
  { id: 1, title: "Welcome", description: "Let's get you set up" },
  { id: 2, title: "Company Info", description: "Tell us about your business" },
  { id: 3, title: "Subscription", description: "Choose your plan" },
  { id: 4, title: "Complete", description: "You're all set!" },
];

const industries = [
  "E-commerce",
  "Technology",
  "Healthcare",
  "Finance",
  "Real Estate",
  "Education",
  "Manufacturing",
  "Hospitality",
  "Professional Services",
  "Other",
];

export function OnboardingWizard({ onComplete, isSubmitting }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      industry: "",
      subscriptionTier: "starter",
    },
  });

  const progress = (currentStep / steps.length) * 100;

  const handleNext = async () => {
    if (currentStep === 2) {
      const isValid = await form.trigger(["companyName", "contactName", "email", "phone", "industry"]);
      if (!isValid) return;
    }
    if (currentStep === 3) {
      const isValid = await form.trigger(["subscriptionTier"]);
      if (!isValid) return;
    }
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = (data: OnboardingFormData) => {
    onComplete(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary">
              <Briefcase className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">Agency Portal</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-4">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex flex-col items-center ${
                  step.id <= currentStep ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium mb-1 ${
                    step.id < currentStep
                      ? "bg-primary border-primary text-primary-foreground"
                      : step.id === currentStep
                      ? "border-primary text-primary"
                      : "border-muted"
                  }`}
                >
                  {step.id < currentStep ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    step.id
                  )}
                </div>
                <span className="text-xs hidden sm:block">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <Card>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl">
                  {steps[currentStep - 1].title}
                </CardTitle>
                <CardDescription>
                  {steps[currentStep - 1].description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6">
                {currentStep === 1 && (
                  <div className="text-center space-y-6">
                    <div className="flex justify-center">
                      <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="w-16 h-16 text-primary" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">
                        Welcome to Your Client Portal
                      </h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        We're excited to have you on board! This portal will help you
                        manage tasks, track credits, and collaborate with our team
                        seamlessly.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                      <div className="p-4 rounded-lg bg-muted/50">
                        <Building2 className="w-8 h-8 text-primary mx-auto mb-2" />
                        <p className="text-sm font-medium">Task Management</p>
                        <p className="text-xs text-muted-foreground">
                          Track and request work
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <Mail className="w-8 h-8 text-primary mx-auto mb-2" />
                        <p className="text-sm font-medium">Credit System</p>
                        <p className="text-xs text-muted-foreground">
                          Monitor your usage
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <Briefcase className="w-8 h-8 text-primary mx-auto mb-2" />
                        <p className="text-sm font-medium">Collaboration</p>
                        <p className="text-xs text-muted-foreground">
                          Work with our team
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Acme Inc."
                                {...field}
                                data-testid="input-company-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="John Smith"
                                {...field}
                                data-testid="input-contact-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="john@acme.com"
                                {...field}
                                data-testid="input-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                placeholder="+1 (555) 123-4567"
                                {...field}
                                data-testid="input-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-industry">
                                <SelectValue placeholder="Select your industry" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {industries.map((industry) => (
                                <SelectItem key={industry} value={industry}>
                                  {industry}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="subscriptionTier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Your Plan</FormLabel>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                            {subscriptionTiers.map((tier) => (
                              <div
                                key={tier}
                                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all hover-elevate ${
                                  field.value === tier
                                    ? "border-primary bg-primary/5"
                                    : "border-border"
                                }`}
                                onClick={() => field.onChange(tier)}
                                data-testid={`tier-${tier}`}
                              >
                                {field.value === tier && (
                                  <div className="absolute top-2 right-2">
                                    <Check className="w-5 h-5 text-primary" />
                                  </div>
                                )}
                                <h4 className="font-semibold capitalize mb-1">
                                  {tier}
                                </h4>
                                <p className="text-2xl font-bold font-mono text-primary">
                                  {tierCredits[tier as SubscriptionTier]}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  credits/month
                                </p>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <p className="text-sm text-muted-foreground text-center">
                      Your subscription is managed through HubSpot. Contact us to
                      upgrade your plan.
                    </p>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="text-center space-y-6">
                    <div className="flex justify-center">
                      <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Check className="w-12 h-12 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">You're All Set!</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        Your account has been configured. Click the button below to
                        access your dashboard and start managing your marketing
                        tasks.
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 inline-block">
                      <p className="text-sm text-muted-foreground mb-1">
                        Starting with
                      </p>
                      <p className="text-3xl font-bold font-mono text-primary">
                        {tierCredits[form.getValues("subscriptionTier") as SubscriptionTier]} credits
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex justify-between gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                {currentStep < steps.length ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    data-testid="button-next"
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    data-testid="button-complete"
                  >
                    {isSubmitting ? "Setting up..." : "Go to Dashboard"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          </form>
        </Form>
      </div>
    </div>
  );
}
