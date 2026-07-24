import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Plus, Building2, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Company } from "@shared/schema";

export default function AdminCompanies() {
  const [clientTypeFilter, setClientTypeFilter] = useState<"all" | "marketing" | "government">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const { toast } = useToast();
  
  const { data: companies, isLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    let result = [...companies];
    if (clientTypeFilter !== "all") {
      result = result.filter((c) => c.clientType === clientTypeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.industry && c.industry.toLowerCase().includes(q))
      );
    }
    result.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    return result;
  }, [companies, clientTypeFilter, searchQuery]);

  const deleteMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/companies/${companyId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Company deleted", description: "The company and all associated data have been removed." });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete company", description: err.message, variant: "destructive" });
    },
  });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">Companies</h1>
            <p className="text-muted-foreground">
              Manage your client companies and their subscriptions.
            </p>
          </div>
          <Button asChild data-testid="button-add-company">
            <Link href="/admin/companies/new">
              <Plus className="w-4 h-4 mr-2" />
              Add Company
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-companies"
            />
          </div>
        </div>

        <div className="flex items-center gap-2" data-testid="client-type-filter">
          <Button
            variant={clientTypeFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setClientTypeFilter("all")}
            data-testid="filter-all"
          >
            All
          </Button>
          <Button
            variant={clientTypeFilter === "marketing" ? "default" : "outline"}
            size="sm"
            onClick={() => setClientTypeFilter("marketing")}
            data-testid="filter-marketing"
          >
            Marketing
          </Button>
          <Button
            variant={clientTypeFilter === "government" ? "default" : "outline"}
            size="sm"
            onClick={() => setClientTypeFilter("government")}
            data-testid="filter-government"
          >
            Government
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : filteredCompanies.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCompanies.map((company) => (
              <Card key={company.id} className="hover-elevate h-full relative" data-testid={`company-card-${company.id}`}>
                <Link href={`/admin/companies/${company.id}`} className="block cursor-pointer">
                  <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pr-12">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 shrink-0">
                        {company.logoUrl ? (
                          <AvatarImage src={company.logoUrl} alt={company.name} />
                        ) : null}
                        <AvatarFallback className="bg-primary/10">
                          <Building2 className="w-5 h-5 text-primary" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{company.name}</CardTitle>
                        <p className="text-sm text-muted-foreground truncate">{company.industry || "No industry"}</p>
                      </div>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs shrink-0 ${company.clientType === 'government' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' : ''}`}
                    >
                      {company.clientType === 'government' ? 'Government' : 'Marketing'}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="capitalize">
                        {company.subscriptionTier}
                      </Badge>
                      <span className="font-mono text-sm font-medium">
                        {company.credits} / {company.monthlyCredits} credits
                      </span>
                    </div>
                  </CardContent>
                </Link>
                <div className="absolute top-2 right-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteTarget(company);
                    }}
                    data-testid={`button-delete-company-${company.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No companies yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first client company.
              </p>
              <Button asChild>
                <Link href="/admin/companies/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Company
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{deleteTarget?.name}</strong>? This will remove all associated data including tasks, credits, campaigns, meetings, chat history, and all user memberships. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-company">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-company"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Company"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
