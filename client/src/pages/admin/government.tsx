import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Landmark, Building2, ChevronLeft, FileSignature } from "lucide-react";
import AdminSigningPackets from "@/components/admin-signing-packets";
import type { Company } from "@shared/schema";

export default function AdminGovernment() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  if (isLoadingCompanies) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!selectedCompanyId) {
    return (
      <AdminLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Landmark className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold" data-testid="heading-e-signatures">E-Signatures</h1>
              <p className="text-muted-foreground">
                Send documents for electronic signatures
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-medium mb-4">Select a Company</h2>
            {companies.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="font-medium">No companies yet</p>
                  <p className="text-sm text-muted-foreground">Create a company first to manage e-signatures.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {companies.map(company => (
                  <Card
                    key={company.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setSelectedCompanyId(company.id)}
                    data-testid={`card-company-${company.id}`}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        {company.name}
                      </CardTitle>
                      <CardDescription>
                        {company.industry || "No industry specified"}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedCompanyId(null)} data-testid="button-back">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="heading-company-signatures">
              <FileSignature className="w-6 h-6 text-primary" />
              {selectedCompany?.name} - E-Signatures
            </h1>
            <p className="text-muted-foreground">
              Upload documents, add signature fields, and send for signing
            </p>
          </div>
        </div>

        <AdminSigningPackets companyId={selectedCompanyId} companyName={selectedCompany?.name || ""} />
      </div>
    </AdminLayout>
  );
}
