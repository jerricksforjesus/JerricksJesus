"use client"

import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-card rounded-xl p-4 md:p-6 shadow-sm border border-border/50",
        className
      )}
      captionLayout={captionLayout}
      classNames={{
        root: cn("w-full", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-6",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between",
          defaultClassNames.nav
        ),
        button_previous: cn(
          "h-10 w-10 rounded-full bg-accent/50 hover:bg-accent text-foreground transition-colors flex items-center justify-center",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          "h-10 w-10 rounded-full bg-accent/50 hover:bg-accent text-foreground transition-colors flex items-center justify-center",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-10 w-full items-center justify-center",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex items-center justify-center gap-2",
          defaultClassNames.dropdowns
        ),
        caption_label: cn(
          "font-serif text-xl md:text-2xl text-foreground tracking-wide select-none",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse mt-2",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground flex-1 py-3 text-xs font-medium uppercase tracking-wider text-center select-none",
          defaultClassNames.weekday
        ),
        week: cn("flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-10 select-none",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-muted-foreground/50 text-xs",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative p-0.5 text-center flex-1",
          defaultClassNames.day
        ),
        range_start: cn(
          "bg-primary/20 rounded-l-lg",
          defaultClassNames.range_start
        ),
        range_middle: cn("bg-primary/10 rounded-none", defaultClassNames.range_middle),
        range_end: cn("bg-primary/20 rounded-r-lg", defaultClassNames.range_end),
        today: cn(
          "",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground/40",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground/30 cursor-not-allowed",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-5", className)} {...props} />
            )
          }
          return (
            <ChevronRightIcon className={cn("size-5", className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-10 items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  const isSelected = modifiers.selected && !modifiers.range_middle
  const isToday = modifiers.today
  const isOutside = modifiers.outside

  return (
    <Button
      ref={ref}
      variant="ghost"
      data-day={day.date.toLocaleDateString()}
      data-selected={modifiers.selected}
      data-today={isToday}
      className={cn(
        "h-10 w-full md:h-12 rounded-lg font-sans text-sm md:text-base transition-all duration-200",
        "hover:bg-accent hover:text-accent-foreground",
        isToday && !isSelected && "ring-2 ring-primary/30 ring-inset bg-accent/50 font-semibold",
        isSelected && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md",
        isOutside && "opacity-40 hover:opacity-60",
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
