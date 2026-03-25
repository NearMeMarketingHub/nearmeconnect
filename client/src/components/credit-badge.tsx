import { CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CreditBadgeProps {
  credits: number;
  showIcon?: boolean;
  size?: "sm" | "default";
}

export function CreditBadge({ credits, showIcon = true, size = "default" }: CreditBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={`font-mono ${size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1"}`}
      data-testid="credit-badge"
    >
      {showIcon && <CreditCard className={`${size === "sm" ? "w-3 h-3" : "w-4 h-4"} mr-1.5`} />}
      {credits} credits
    </Badge>
  );
}
