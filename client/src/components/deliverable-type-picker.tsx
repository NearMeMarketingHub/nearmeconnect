import { useState, useMemo, useRef, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, X, Coins } from "lucide-react";
import type { DeliverableType } from "@shared/schema";

interface DeliverableTypePickerProps {
  deliverableTypes: DeliverableType[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showCredits?: boolean;
  includeOther?: boolean;
  "data-testid"?: string;
}

export function DeliverableTypePicker({
  deliverableTypes,
  value,
  onValueChange,
  placeholder = "Select deliverable type",
  disabled = false,
  showCredits = true,
  includeOther = false,
  "data-testid": testId = "picker-deliverable",
}: DeliverableTypePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return deliverableTypes;
    return deliverableTypes.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.key.toLowerCase().includes(q) ||
      String(d.credits).includes(q)
    );
  }, [deliverableTypes, search]);

  const selectedType = deliverableTypes.find(d => d.key === value);
  const displayLabel = value === "other"
    ? "Other / Not Sure"
    : selectedType
      ? `${selectedType.name}${showCredits ? ` (${selectedType.credits} credits)` : ""}`
      : null;

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
          data-testid={testId}
        >
          <span className={`truncate ${!displayLabel ? "text-muted-foreground" : ""}`}>
            {displayLabel || placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search deliverables..."
              className="pl-8 h-9"
              data-testid={`${testId}-search`}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
                data-testid={`${testId}-search-clear`}
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
        <div className="max-h-[240px] overflow-y-auto overscroll-contain p-1">
          {value && (
            <button
              type="button"
              className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left text-muted-foreground hover-elevate"
              onClick={() => {
                onValueChange("");
                setOpen(false);
              }}
              data-testid={`${testId}-clear`}
            >
              <X className="h-3.5 w-3.5" />
              Clear selection
            </button>
          )}
          {includeOther && (
            <button
              type="button"
              className={`w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-left hover-elevate ${value === "other" ? "bg-accent" : ""}`}
              onClick={() => {
                onValueChange("other");
                setOpen(false);
              }}
              data-testid={`${testId}-other`}
            >
              <span>Other / Not Sure</span>
            </button>
          )}
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {search ? "No matching deliverables" : "No deliverable types available"}
            </p>
          ) : (
            filtered.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-left hover-elevate ${value === d.key ? "bg-accent" : ""}`}
                onClick={() => {
                  onValueChange(d.key);
                  setOpen(false);
                }}
                data-testid={`${testId}-item-${d.key}`}
              >
                <span className="truncate">{d.name}</span>
                {showCredits && (
                  <Badge variant="outline" className="flex items-center gap-1 shrink-0">
                    <Coins className="h-3 w-3" />
                    {d.credits}
                  </Badge>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
