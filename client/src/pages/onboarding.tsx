import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { InsertClient, Client } from "@shared/schema";

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createClientMutation = useMutation<Client, Error, Partial<InsertClient>>({
    mutationFn: async (data) => {
      const response = await apiRequest("POST", "/api/clients", data);
      return response.json();
    },
    onSuccess: (client) => {
      queryClient.setQueryData(["currentClient"], client);
      toast({
        title: "Welcome aboard!",
        description: "Your account has been created successfully.",
      });
      navigate("/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleComplete = (data: Partial<InsertClient>) => {
    createClientMutation.mutate({
      ...data,
      onboardingComplete: true,
    });
  };

  return (
    <OnboardingWizard
      onComplete={handleComplete}
      isSubmitting={createClientMutation.isPending}
    />
  );
}
