import { useQuery } from "@tanstack/react-query";
import { ClientLayout } from "@/components/client-layout";
import { GovernmentHub } from "@/components/government-hub";

interface UserInfo {
  userId: string;
  companyId: string;
}

export default function ClientGovernmentHub() {
  const { data: userInfo } = useQuery<UserInfo>({ queryKey: ["/api/auth/user"] });
  const companyId = userInfo?.companyId || "";

  return (
    <ClientLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold" data-testid="heading-government-hub">Government Hub</h1>
          <p className="text-muted-foreground text-sm mt-1">Your government business identifiers, portal logins, and compliance data</p>
        </div>
        {companyId && <GovernmentHub companyId={companyId} isAdmin={false} />}
      </div>
    </ClientLayout>
  );
}
