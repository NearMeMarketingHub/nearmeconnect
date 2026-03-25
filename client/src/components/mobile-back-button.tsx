import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileBackButtonProps {
  to: string;
  label?: string;
}

export function MobileBackButton({ to, label = "Back to Dashboard" }: MobileBackButtonProps) {
  const isMobile = useIsMobile();
  if (!isMobile) return null;

  return (
    <Link href={to}>
      <Button variant="ghost" size="sm" className="gap-1.5" data-testid="button-mobile-back">
        <ArrowLeft className="w-4 h-4" />
        {label}
      </Button>
    </Link>
  );
}
