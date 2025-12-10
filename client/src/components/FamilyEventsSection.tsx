import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, MapPin, ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { Event } from "@shared/schema";

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

function formatLocation(event: Event): string {
  const locationType = (event.locationType as "physical" | "online" | "phone") || "physical";
  
  // Online meeting - only show "Online Meeting", ignore any address data
  if (locationType === "online") {
    return "Online Meeting";
  }
  
  // Phone call - only show "Phone Call", ignore any address data
  if (locationType === "phone") {
    return "Phone Call";
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
  return parts.join(", ") || "Location TBD";
}

export function FamilyEventsSection() {
  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["events"],
    queryFn: async () => {
      const response = await fetch("/api/events");
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
  });

  const upcomingEvents = events?.slice(0, 3) || [];

  if (isLoading) {
    return (
      <section className="py-24 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 px-6 bg-muted/30" data-testid="family-events-section">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-primary font-bold uppercase tracking-widest text-sm">
            Upcoming
          </span>
          <h2 className="font-serif text-4xl md:text-5xl mt-2 mb-4">Family Events</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Join us for worship, fellowship, and community gatherings
          </p>
        </div>

        {upcomingEvents.length > 0 ? (
          <div className="grid gap-6 md:gap-8 mb-8">
            {upcomingEvents.map((event) => (
              <div 
                key={event.id}
                className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                data-testid={`home-event-card-${event.id}`}
              >
                <div className="flex flex-col md:flex-row">
                  {/* Event Thumbnail */}
                  <div className="md:w-72 lg:w-80 h-48 md:h-auto relative overflow-hidden flex-shrink-0">
                    {event.thumbnailPath ? (
                      <img 
                        src={event.thumbnailPath.startsWith('/') ? event.thumbnailPath : `/objects/${event.thumbnailPath}`}
                        alt={event.title}
                        className="w-full h-full object-cover"
                        data-testid={`home-event-thumbnail-${event.id}`}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center min-h-[12rem]">
                        <Calendar className="w-12 h-12 text-primary/40" />
                      </div>
                    )}
                  </div>

                  {/* Event Details */}
                  <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
                    <div>
                      <h3 
                        className="font-serif text-2xl md:text-3xl mb-4"
                        data-testid={`home-event-title-${event.id}`}
                      >
                        {event.title}
                      </h3>
                      
                      <div className="space-y-3 text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                          <span>{formatEventDate(event.eventDate)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                          <span>{formatEventTime(event.eventTime)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                          <span>{formatLocation(event)}</span>
                        </div>
                      </div>

                      {event.description && (
                        <p className="mt-4 text-muted-foreground line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="flex flex-wrap gap-3 mt-6">
                      {event.contactType === "email" && event.contactEmail ? (
                        <a 
                          href={`mailto:${event.contactEmail}`}
                          data-testid={`home-event-contact-${event.id}`}
                        >
                          <Button variant="default" className="bg-primary hover:bg-primary/90">
                            <Phone className="w-4 h-4 mr-2" />
                            {event.contactName || "Contact"}
                          </Button>
                        </a>
                      ) : event.contactPhone ? (
                        <a 
                          href={`tel:${event.contactPhone.replace(/[^0-9+]/g, '')}`}
                          data-testid={`home-event-contact-${event.id}`}
                        >
                          <Button variant="default" className="bg-primary hover:bg-primary/90">
                            <Phone className="w-4 h-4 mr-2" />
                            {event.contactName || "Contact"}
                          </Button>
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <p className="text-muted-foreground text-lg">
              No upcoming events scheduled yet.
            </p>
            <p className="text-muted-foreground/70 text-sm mt-1">
              Check back soon for new gatherings and fellowship opportunities!
            </p>
          </div>
        )}

        <div className="text-center">
          <Link href="/events">
            <Button 
              variant="outline" 
              size="lg"
              className="group"
              data-testid="button-view-all-events"
            >
              View All Events
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
