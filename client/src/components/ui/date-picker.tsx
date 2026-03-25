import { useState } from "react"
import { format, parse } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  fromDate?: Date
  disabled?: boolean
  "data-testid"?: string
}

export function DatePicker({ value, onChange, placeholder = "Pick a date", className, fromDate, disabled, "data-testid": dataTestId }: DatePickerProps) {
  const [open, setOpen] = useState(false)

  const selectedDate = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined

  return (
    <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          data-testid={dataTestId}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(selectedDate!, "MMM d, yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (date) {
              const year = date.getFullYear()
              const month = String(date.getMonth() + 1).padStart(2, '0')
              const day = String(date.getDate()).padStart(2, '0')
              onChange(`${year}-${month}-${day}`)
            } else {
              onChange("")
            }
            setOpen(false)
          }}
          initialFocus
          disabled={fromDate ? { before: fromDate } : undefined}
          classNames={{
            day_selected: "bg-orange-500 text-white hover:bg-orange-600 hover:text-white focus:bg-orange-600 focus:text-white",
            day_today: "bg-orange-100 text-orange-900 dark:bg-orange-900/30 dark:text-orange-200",
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
