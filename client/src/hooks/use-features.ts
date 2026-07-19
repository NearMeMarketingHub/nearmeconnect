import { useQuery } from "@tanstack/react-query";
import type { Company } from "@shared/schema";

export type SaasTier = "starter" | "growth" | "pro" | "internal";

export interface CompanyFeatures {
  hasCredits: boolean;
  hasCreditStore: boolean;
  hasReporting: boolean;
  isSaasCustomer: boolean;
  tier: SaasTier;
}

export function useFeatures(companyId?: string): CompanyFeatures {
  const { data: company } = useQuery<Company>({
    queryKey: ["/api/companies", companyId],
    enabled: !!companyId,
  });

  const tier = ((company as any)?.saasTier ?? "internal") as SaasTier;

  return {
    tier,
    isSaasCustomer: tier !== "internal",
    hasCredits: tier !== "starter",
    hasCreditStore: tier === "pro" || tier === "internal",
    hasReporting: tier === "pro" || tier === "internal",
  };
}
