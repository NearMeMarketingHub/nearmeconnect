import { ClientLayout } from "@/components/client-layout";
import { OnboardingLayout } from "@/components/onboarding-layout";
import { ClientOnboardingForm } from "@/components/client-onboarding-form";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface ClientOnboardingProps {
  companyId: string;
  embedded?: boolean;
}

interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  onboardingComplete: boolean;
}

export default function ClientOnboarding({ companyId, embedded = false }: ClientOnboardingProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: ["/api/companies", companyId],
  });

  const handleComplete = () => {
    toast({ title: "Onboarding completed! Thank you." });
    navigate("/client/dashboard");
  };

  const loadingSkeleton = (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-64 bg-muted rounded" />
      </div>
    </div>
  );

  if (isLoading) {
    if (embedded) {
      return loadingSkeleton;
    }
    return (
      <OnboardingLayout companyName="Loading...">
        {loadingSkeleton}
      </OnboardingLayout>
    );
  }

  if (company?.onboardingComplete) {
    const completeContent = (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Onboarding Complete</h2>
            <p className="text-muted-foreground mb-6">
              Your onboarding has been completed. If you need to update any information,
              please contact your account manager.
            </p>
            <Button asChild>
              <Link href="/client/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );

    if (embedded) {
      return completeContent;
    }

    return (
      <ClientLayout companyId={companyId}>
        {completeContent}
      </ClientLayout>
    );
  }

  const formContent = (
    <div className="p-6 max-w-4xl mx-auto">
      <ClientOnboardingForm
        companyId={companyId}
        companyName={company?.name || "Your Company"}
        onComplete={handleComplete}
      />
    </div>
  );

  if (embedded) {
    return formContent;
  }

  return (
    <OnboardingLayout companyName={company?.name} companyLogoUrl={company?.logoUrl}>
      {formContent}
    </OnboardingLayout>
  );
}
