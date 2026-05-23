import { useQuery } from "@tanstack/react-query";
import type { Company } from "@shared/schema";
import { AdminLayout } from "@/components/admin-layout";
import { ContentCalendarView } from "@/components/content-calendar-view";
import { Loader2 } from "lucide-react";

export default function AdminContentCalendar() {
  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  return (
    <AdminLayout>
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="h-full flex flex-col">
          <ContentCalendarView companies={companies} />
        </div>
      )}
    </AdminLayout>
  );
}
