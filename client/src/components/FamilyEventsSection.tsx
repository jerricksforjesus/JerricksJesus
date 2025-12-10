import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { Event } from "@shared/schema";

function formatEventDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
  });
}

function formatEventTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {upcomingEvents.map((event) => (
              <div 
                key={event.id}
                className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
                data-testid={`home-event-card-${event.id}`}
              >
                {event.thumbnailPath ? (
                  <div className="h-40 overflow-hidden">
                    <img 
                      src={event.thumbnailPath.startsWith('/') ? event.thumbnailPath : `/objects/${event.thumbnailPath}`}
                      alt={event.title}
                      className="w-full h-full object-cover"
                      data-testid={`home-event-thumbnail-${event.id}`}
                    />
                  </div>
                ) : (
                  <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Calendar className="w-10 h-10 text-primary/40" />
                  </div>
                )}
                
                <div className="p-5">
                  <h3 
                    className="font-serif text-xl mb-3 line-clamp-1"
                    data-testid={`home-event-title-${event.id}`}
                  >
                    {event.title}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{formatEventDate(event.eventDate)}</span>
                      <span className="text-muted-foreground/50">|</span>
                      <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{formatEventTime(event.eventTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="line-clamp-1">{event.location}</span>
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
