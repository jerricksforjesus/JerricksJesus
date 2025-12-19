import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Music, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { WorshipMusicPlayer } from "./WorshipMusicPlayer";

const WORSHIP_PLAYLIST_ID = "PLkDsdLHKY8laSsy8xYfILnVzFMedR0Rgy";

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
  const [selectedVideo, setSelectedVideo] = useState<WorshipVideo | null>(null);

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
        <Button
          variant="outline"
          asChild
          className="mt-4 gap-2"
          data-testid="button-view-youtube-playlist"
        >
          <a
            href={`https://youtube.com/playlist?list=${WORSHIP_PLAYLIST_ID}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on YouTube
            <ExternalLink className="w-4 h-4" />
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.slice(0, 6).map((video, index) => (
          <motion.div
            key={video.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group cursor-pointer"
            onClick={() => setSelectedVideo(video)}
            data-testid={`worship-video-${video.youtubeVideoId}`}
          >
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted shadow-md">
              {video.thumbnailUrl && (
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg">
                  <Play className="w-6 h-6 text-primary-foreground ml-1" />
                </div>
              </div>
            </div>
            <h4 className="mt-2 text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
              {video.title}
            </h4>
          </motion.div>
        ))}
      </div>

      {videos.length > 6 && (
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            asChild
            className="gap-2"
            data-testid="button-view-all-worship"
          >
            <a
              href={`https://youtube.com/playlist?list=${WORSHIP_PLAYLIST_ID}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View All {videos.length} Videos
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        </div>
      )}

      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black">
          <VisuallyHidden>
            <DialogTitle>{selectedVideo?.title || "Video Player"}</DialogTitle>
          </VisuallyHidden>
          <AnimatePresence>
            {selectedVideo && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${selectedVideo.youtubeVideoId}?autoplay=1&rel=0`}
                    title={selectedVideo.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="p-4 bg-card">
                  <h3 className="text-lg font-semibold line-clamp-2">{selectedVideo.title}</h3>
                  {selectedVideo.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                      {selectedVideo.description}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      <WorshipMusicPlayer />
    </div>
  );
}
