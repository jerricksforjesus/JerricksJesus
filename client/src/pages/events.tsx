import { Navigation } from "@/components/Navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Calendar, Clock, MapPin, Phone, ChevronDown, ExternalLink, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavTheme } from "@/lib/navThemeContext";
import type { Event, Photo } from "@shared/schema";

function formatEventDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
}

function formatEventTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatLocation(event: Event): { text: string; type: "physical" | "online" | "phone"; link?: string } {
  const locationType = (event.locationType as "physical" | "online" | "phone") || "physical";
  
  // Online meeting - only show "Online Meeting", ignore any address data
  if (locationType === "online") {
    return { text: "Online Meeting", type: "online", link: event.meetingLink || undefined };
  }
  
  // Phone call - only show "Phone Call", ignore any address data
  if (locationType === "phone") {
    return { text: "Phone Call", type: "phone" };
  }
  
  // Physical address - only for physical location type
  const parts = [];
  if (event.streetAddress) parts.push(event.streetAddress);
  if (event.city) parts.push(event.city);
  if (event.state) {
    if (event.zipCode) {
      parts.push(`${event.state} ${event.zipCode}`);
    } else {
      parts.push(event.state);
    }
  } else if (event.zipCode) {
    parts.push(event.zipCode);
  }
  return { text: parts.join(", ") || "Location TBD", type: "physical" };
}

function formatFullAddress(event: Event): string {
  return formatLocation(event).text;
}

function generateGoogleCalendarUrl(event: Event): string {
  const startDate = event.eventDate.replace(/-/g, '');
  const [startHour, startMin] = event.eventTime.split(':').map(Number);
  const startTime = startHour.toString().padStart(2, '0') + startMin.toString().padStart(2, '0') + '00';
  
  let endHour = startHour + 2;
  let endDate = startDate;
  if (endHour >= 24) {
    endHour = endHour - 24;
    const date = new Date(event.eventDate + 'T00:00:00');
    date.setDate(date.getDate() + 1);
    endDate = date.toISOString().split('T')[0].replace(/-/g, '');
  }
  const endTime = endHour.toString().padStart(2, '0') + startMin.toString().padStart(2, '0') + '00';
  
  const fullAddress = formatFullAddress(event);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startDate}T${startTime}/${endDate}T${endTime}`,
    location: fullAddress,
    details: event.description || `Join us for ${event.title} at Jerricks for Jesus.`,
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function generateICalData(event: Event): string {
  const startDate = event.eventDate.replace(/-/g, '');
  const [startHour, startMin] = event.eventTime.split(':').map(Number);
  const startTime = startHour.toString().padStart(2, '0') + startMin.toString().padStart(2, '0') + '00';
  
  let endHour = startHour + 2;
  let endDate = startDate;
  if (endHour >= 24) {
    endHour = endHour - 24;
    const date = new Date(event.eventDate + 'T00:00:00');
    date.setDate(date.getDate() + 1);
    endDate = date.toISOString().split('T')[0].replace(/-/g, '');
  }
  const endTime = endHour.toString().padStart(2, '0') + startMin.toString().padStart(2, '0') + '00';
  
  const fullAddress = formatFullAddress(event);
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Jerricks for Jesus//Events//EN
BEGIN:VEVENT
DTSTART:${startDate}T${startTime}
DTEND:${endDate}T${endTime}
SUMMARY:${event.title}
LOCATION:${fullAddress}
DESCRIPTION:${event.description || `Join us for ${event.title} at Jerricks for Jesus.`}
END:VEVENT
END:VCALENDAR`;
  
  return icsContent;
}

function downloadICalFile(event: Event) {
  const icsContent = generateICalData(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function Events() {
  const { setTheme } = useNavTheme();

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["events"],
    queryFn: async () => {
      const response = await fetch("/api/events");
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
  });

  const { data: heroData } = useQuery<{ heroImage: string | null }>({
    queryKey: ["events-hero"],
    queryFn: async () => {
      const response = await fetch("/api/settings/events-hero");
      if (!response.ok) throw new Error("Failed to fetch hero image");
      return response.json();
    },
  });

  const { data: photos } = useQuery<Photo[]>({
    queryKey: ["photos"],
    queryFn: async () => {
      const response = await fetch("/api/photos");
      if (!response.ok) throw new Error("Failed to fetch photos");
      return response.json();
    },
  });

  const heroImage = heroData?.heroImage || (photos && photos.length > 0 ? photos[0].imagePath : null);

  useEffect(() => {
    // Events page always has a dark overlay (bg-black/50) on the hero,
    // so navigation should always use light (white) text for legibility
    setTheme("light");
    
    return () => {
      setTheme("auto");
    };
  }, [setTheme]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      {/* Hero Section */}
      <section 
        className="relative h-[50vh] min-h-[400px] flex items-center justify-center"
        style={{
          backgroundImage: heroImage ? `url(${heroImage.startsWith('/') ? heroImage : `/objects/${heroImage}`})` : 'linear-gradient(to bottom right, #2c3e50, #1a252f)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        data-testid="events-hero-section"
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 text-center text-white px-4">
          <h1 
            className="font-serif text-5xl md:text-6xl lg:text-7xl font-light mb-4"
            data-testid="events-hero-title"
          >
            Family Events
          </h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto font-sans">
            Join us for worship, fellowship, and community gatherings
          </p>
        </div>
      </section>

      {/* Events Lineup Section */}
      <section className="py-16 md:py-24 px-4 md:px-8 max-w-7xl mx-auto w-full">
        <h2 
          className="font-serif text-3xl md:text-4xl text-center mb-4"
          data-testid="events-lineup-title"
        >
          Our Events Lineup
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Discover upcoming events and activities at Jerricks for Jesus
        </p>

        {eventsLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !events || events.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-2xl">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-serif text-2xl mb-2">No Upcoming Events</h3>
            <p className="text-muted-foreground">Check back soon for new events and activities.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:gap-8">
            {events.map((event) => (
              <div 
                key={event.id}
                className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                data-testid={`event-card-${event.id}`}
              >
                <div className="flex flex-col md:flex-row">
                  {/* Event Thumbnail */}
                  <div className="md:w-72 lg:w-80 h-48 md:h-auto relative overflow-hidden flex-shrink-0">
                    {event.thumbnailPath ? (
                      <img 
                        src={event.thumbnailPath.startsWith('/') ? event.thumbnailPath : `/objects/${event.thumbnailPath}`}
                        alt={event.title}
                        className="w-full h-full object-cover"
                        data-testid={`event-thumbnail-${event.id}`}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Calendar className="w-12 h-12 text-primary/40" />
                      </div>
                    )}
                  </div>

                  {/* Event Details */}
                  <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
                    <div>
                      <h3 
                        className="font-serif text-2xl md:text-3xl mb-4"
                        data-testid={`event-title-${event.id}`}
                      >
                        {event.title}
                      </h3>
                      
                      <div className="space-y-3 text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                          <span data-testid={`event-date-${event.id}`}>
                            {formatEventDate(event.eventDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                          <span data-testid={`event-time-${event.id}`}>
                            {formatEventTime(event.eventTime)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                          <span data-testid={`event-location-${event.id}`}>
                            {formatFullAddress(event)}
                          </span>
                        </div>
                      </div>

                      {event.description && (
                        <p className="mt-4 text-muted-foreground line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 mt-6">
                      {event.contactType === "link" && event.contactUrl ? (
                        <a 
                          href={event.contactUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid={`event-contact-${event.id}`}
                        >
                          <Button variant="default" className="bg-primary hover:bg-primary/90">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            {event.buttonLabel || "Join Online"}
                          </Button>
                        </a>
                      ) : event.contactType === "email" && event.contactEmail ? (
                        <a 
                          href={`mailto:${event.contactEmail}`}
                          data-testid={`event-contact-${event.id}`}
                        >
                          <Button variant="default" className="bg-primary hover:bg-primary/90">
                            <Mail className="w-4 h-4 mr-2" />
                            {event.buttonLabel || "Email Us"}
                          </Button>
                        </a>
                      ) : (
                        <a 
                          href={`tel:${event.contactPhone.replace(/[^0-9+]/g, '')}`}
                          data-testid={`event-contact-${event.id}`}
                        >
                          <Button variant="default" className="bg-primary hover:bg-primary/90">
                            <Phone className="w-4 h-4 mr-2" />
                            {event.buttonLabel || "Contact Us"}
                          </Button>
                        </a>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" data-testid={`event-calendar-dropdown-${event.id}`}>
                            <Calendar className="w-4 h-4 mr-2" />
                            Add to Calendar
                            <ChevronDown className="w-4 h-4 ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem asChild>
                            <a 
                              href={generateGoogleCalendarUrl(event)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              data-testid={`event-add-google-${event.id}`}
                            >
                              Google Calendar
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => downloadICalFile(event)}
                            data-testid={`event-add-apple-${event.id}`}
                          >
                            Apple Calendar / iCal
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} Jerricks for Jesus. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
