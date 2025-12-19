"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  id?: string
  "data-testid"?: string
  fromYear?: number
  toYear?: number
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select a date",
  className,
  disabled,
  id,
  "data-testid": testId,
  fromYear = 1920,
  toYear = 2050,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  
  const date = value ? new Date(value + 'T00:00:00') : undefined

  const handleSelect = (selectedDate: Date | undefined) => {
    if (onChange) {
      if (selectedDate) {
        const year = selectedDate.getFullYear()
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
        const day = String(selectedDate.getDate()).padStart(2, '0')
        onChange(`${year}-${month}-${day}`)
      } else {
        onChange("")
      }
    }
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onChange) {
      onChange("")
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          data-testid={testId}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-10",
            "bg-background border-input hover:bg-accent/50",
            "focus:ring-2 focus:ring-ring focus:ring-offset-2",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
          {date ? (
            <span className="font-sans flex-1 truncate">
              {format(date, "MMM d, yyyy")}
            </span>
          ) : (
            <span className="flex-1">{placeholder}</span>
          )}
          {value && (
            <span
              onClick={handleClear}
              className="ml-2 h-5 w-5 rounded-full hover:bg-muted flex items-center justify-center cursor-pointer"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 border-border shadow-lg" 
        align="start"
        sideOffset={4}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          defaultMonth={date}
          captionLayout="dropdown"
          startMonth={new Date(fromYear, 0)}
          endMonth={new Date(toYear, 11)}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
