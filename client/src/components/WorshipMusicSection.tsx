import { useQuery } from "@tanstack/react-query";
import { Music, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorshipMusicPlayer } from "./WorshipMusicPlayer";
import { WorshipRequestForm } from "./WorshipRequestForm";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";

interface WorshipVideo {
  id: number;
  youtubeVideoId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  position: number;
}

export function WorshipMusicSection() {
  const { user, canEdit } = useAuth();
  
  const { data: videos = [], isLoading } = useQuery<WorshipVideo[]>({
    queryKey: ["worship-videos"],
    queryFn: async () => {
      const response = await fetch("/api/worship-videos");
      if (!response.ok) throw new Error("Failed to fetch worship videos");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
          <span>Loading worship music...</span>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="py-8 text-center">
        <Music className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">No worship videos available yet.</p>
        {canEdit && (
          <Button
            variant="outline"
            asChild
            className="mt-4 gap-2"
            data-testid="button-add-worship-playlist"
          >
            <Link href="/admin?section=worship">
              <Plus className="w-4 h-4" />
              Add to Worship Playlist
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="py-4">
      <WorshipMusicPlayer />
      
      <div className="mt-4 flex justify-center gap-4 flex-wrap">
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-2 text-muted-foreground hover:text-foreground"
            data-testid="button-add-worship-playlist"
          >
            <Link href="/admin?section=worship">
              <Plus className="w-4 h-4" />
              Add to Worship Playlist
            </Link>
          </Button>
        )}
        {user && !canEdit && (
          <WorshipRequestForm />
        )}
      </div>
    </div>
  );
}
