import { useQuery } from "@tanstack/react-query";
import type { Company } from "@shared/schema";
import { ContentCalendarView } from "@/components/content-calendar-view";
import { Loader2 } from "lucide-react";

export default function AdminContentCalendar() {
  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <ContentCalendarView companies={companies} />
    </div>
  );
}
