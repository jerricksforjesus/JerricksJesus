import { motion } from "framer-motion";
import { Music, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const WORSHIP_PLAYLIST_ID = "PLkDsdLHKY8laSsy8xYfILnVzFMedR0Rgy";

export function WorshipMusicSection() {
  return (
    <div className="py-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div 
          className="relative w-full overflow-hidden rounded-xl shadow-lg bg-black"
          style={{ paddingBottom: "56.25%" }}
        >
          <iframe
            src={`https://www.youtube.com/embed/videoseries?list=${WORSHIP_PLAYLIST_ID}&rel=0&modestbranding=1`}
            title="Worship & Music Playlist"
            className="absolute top-0 left-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            data-testid="worship-playlist-embed"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            <Music className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
            Browse through our collection of worship videos
          </p>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-2"
            data-testid="button-view-full-playlist"
          >
            <a
              href={`https://youtube.com/playlist?list=${WORSHIP_PLAYLIST_ID}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Full Playlist
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
