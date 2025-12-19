import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Gift, MapPin, Video, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import type { Event } from "@shared/schema";

interface EventsCalendarProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getEventIcon(locationType: string) {
  switch (locationType) {
    case "birthday":
      return <Gift className="w-3 h-3" />;
    case "online":
      return <Video className="w-3 h-3" />;
    case "phone":
      return <Phone className="w-3 h-3" />;
    default:
      return <MapPin className="w-3 h-3" />;
  }
}

function getEventColor(locationType: string) {
  switch (locationType) {
    case "birthday":
      return "bg-pink-500/90 text-white";
    case "online":
      return "bg-blue-500/90 text-white";
    case "phone":
      return "bg-emerald-500/90 text-white";
    default:
      return "bg-primary/90 text-primary-foreground";
  }
}

export function EventsCalendar({ events, onEventClick }: EventsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [direction, setDirection] = useState(0);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    events.forEach(event => {
      const dateKey = event.eventDate;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(event);
    });
    return map;
  }, [events]);

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    const remainingCells = 42 - days.length;
    for (let i = 0; i < remainingCells; i++) {
      days.push(null);
    }
    
    return days;
  }, [startingDayOfWeek, daysInMonth]);

  const goToPreviousMonth = () => {
    setDirection(-1);
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setDirection(1);
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setDirection(today > currentDate ? 1 : -1);
    setCurrentDate(today);
  };

  const today = new Date();
  const isToday = (day: number) => {
    return day === today.getDate() && 
           currentMonth === today.getMonth() && 
           currentYear === today.getFullYear();
  };

  const formatDateKey = (day: number) => {
    const month = (currentMonth + 1).toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    return `${currentYear}-${month}-${dayStr}`;
  };

  return (
    <div className="bg-card rounded-2xl shadow-lg border border-border/30 overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 via-accent/50 to-primary/10 px-4 md:px-8 py-5 md:py-6 border-b border-border/30">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousMonth}
            className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-background/80 hover:bg-background shadow-sm"
            data-testid="calendar-prev-month"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <div className="text-center">
            <AnimatePresence mode="wait">
              <motion.h2
                key={`${currentMonth}-${currentYear}`}
                initial={{ opacity: 0, y: direction * 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -direction * 20 }}
                transition={{ duration: 0.2 }}
                className="font-serif text-2xl md:text-3xl lg:text-4xl text-foreground"
                data-testid="calendar-month-year"
              >
                {MONTHS[currentMonth]} {currentYear}
              </motion.h2>
            </AnimatePresence>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              className="mt-1 text-xs text-muted-foreground hover:text-foreground"
              data-testid="calendar-today-btn"
            >
              <CalendarIcon className="w-3 h-3 mr-1" />
              Today
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextMonth}
            className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-background/80 hover:bg-background shadow-sm"
            data-testid="calendar-next-month"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-3 md:p-6">
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map(day => (
            <div
              key={day}
              className="text-center py-2 md:py-3 text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentMonth}-${currentYear}`}
            initial={{ opacity: 0, x: direction * 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 50 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-7 gap-1 md:gap-2"
          >
            {calendarDays.map((day, index) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="aspect-square md:aspect-[4/3] p-1"
                  />
                );
              }

              const dateKey = formatDateKey(day);
              const dayEvents = eventsByDate.get(dateKey) || [];
              const hasEvents = dayEvents.length > 0;
              const isTodayDate = isToday(day);

              return (
                <motion.div
                  key={`day-${day}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.01 }}
                  className={`
                    relative aspect-square md:aspect-[4/3] p-1 rounded-lg md:rounded-xl transition-all duration-200
                    ${isTodayDate ? 'bg-primary/10 ring-2 ring-primary/40' : 'hover:bg-accent/50'}
                    ${hasEvents ? 'cursor-pointer' : ''}
                  `}
                  onClick={() => {
                    if (dayEvents.length === 1 && onEventClick) {
                      onEventClick(dayEvents[0]);
                    }
                  }}
                  data-testid={`calendar-day-${day}`}
                >
                  <div className={`
                    text-center text-sm md:text-base font-medium mb-0.5 md:mb-1
                    ${isTodayDate ? 'text-primary font-bold' : 'text-foreground'}
                  `}>
                    {day}
                  </div>

                  {hasEvents && (
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      {dayEvents.slice(0, 2).map((event, eventIndex) => (
                        <button
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick?.(event);
                          }}
                          className={`
                            w-full px-1 py-0.5 rounded text-[9px] md:text-[10px] leading-tight truncate
                            flex items-center gap-0.5 transition-transform hover:scale-105
                            ${getEventColor(event.locationType || 'physical')}
                          `}
                          data-testid={`calendar-event-${event.id}`}
                        >
                          <span className="hidden md:inline-flex flex-shrink-0">
                            {getEventIcon(event.locationType || 'physical')}
                          </span>
                          <span className="truncate">{event.title}</span>
                        </button>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[9px] md:text-[10px] text-muted-foreground text-center">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  )}

                  {hasEvents && (
                    <div className="absolute -top-0.5 -right-0.5 md:hidden">
                      <div className="w-2 h-2 rounded-full bg-primary shadow-sm" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-4 md:px-6 pb-4 md:pb-6">
        <div className="flex flex-wrap gap-3 justify-center text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-primary/90" />
            <span>In Person</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-500/90" />
            <span>Online</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-pink-500/90" />
            <span>Birthday</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-500/90" />
            <span>Phone</span>
          </div>
        </div>
      </div>
    </div>
  );
}
