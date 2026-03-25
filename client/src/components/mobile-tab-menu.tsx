import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface TabItem {
  value: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  hidden?: boolean;
}

interface MobileTabMenuProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
  title?: string;
}

export function MobileTabMenu({ tabs, activeTab, onTabChange, title = "Sections" }: MobileTabMenuProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (!isMobile) return null;

  const visibleTabs = tabs.filter(t => !t.hidden);
  const activeLabel = visibleTabs.find(t => t.value === activeTab)?.label || activeTab;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 mb-3"
        onClick={() => setOpen(true)}
        data-testid="button-mobile-tab-menu"
      >
        <Menu className="w-4 h-4" />
        {activeLabel}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetHeader className="p-4 pb-2">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col py-2">
            {visibleTabs.map((tab) => (
              <button
                key={tab.value}
                className={`flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                  tab.value === activeTab
                    ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                    : "text-foreground hover:bg-muted"
                }`}
                onClick={() => {
                  onTabChange(tab.value);
                  setOpen(false);
                }}
                data-testid={`mobile-tab-${tab.value}`}
              >
                {tab.icon && <span className="shrink-0">{tab.icon}</span>}
                <span className="flex-1">{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
