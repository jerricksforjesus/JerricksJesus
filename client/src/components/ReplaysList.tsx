import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import type { Video } from "@shared/schema";
import { Play } from "lucide-react";
import thumb1 from "@assets/generated_images/preacher_at_podium.png";
import thumb2 from "@assets/generated_images/open_bible_on_table.png";
import thumb3 from "@assets/generated_images/warm_limestone_wall_texture.png";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";

const fallbackImages = [thumb1, thumb2, thumb3];

export function ReplaysList() {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  const { data: videos = [] } = useQuery<Video[]>({
    queryKey: ["videos"],
    queryFn: async () => {
      const response = await fetch("/api/videos");
      if (!response.ok) throw new Error("Failed to fetch videos");
      return response.json();
    },
  });

  const handleVideoClick = async (video: Video) => {
    await fetch(`/api/videos/${video.id}/view`, { method: "POST" });
    setSelectedVideo(video);
    setIsPlayerOpen(true);
  };

  const getThumbnail = (video: Video, index: number) => {
    if (video.thumbnailPath) {
      return video.thumbnailPath.startsWith('/objects/') 
        ? video.thumbnailPath 
        : `/objects/${video.thumbnailPath}`;
    }
    return fallbackImages[index % fallbackImages.length];
  };

  if (videos.length === 0) {
    return null;
  }

  const displayVideos = videos.slice(1);

  if (displayVideos.length === 0) {
    return null;
  }

  return (
    <section className="py-24 bg-card">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-2">Past Sermons</h2>
            <p className="text-muted-foreground">Browse our archive of messages.</p>
          </div>
          <Link href="/replays">
            <Button variant="outline" className="hidden md:inline-flex">
              View All Replays →
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayVideos.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group cursor-pointer"
              onClick={() => handleVideoClick(video)}
              data-testid={`replay-card-${video.id}`}
            >
              <div className="overflow-hidden rounded-lg aspect-[16/9] mb-4 relative bg-zinc-200">
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors z-10 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all duration-300">
                    <Play fill="currentColor" className="ml-1 w-5 h-5" />
                  </div>
                </div>
                <img 
                  src={getThumbnail(video, index)} 
                  alt={video.title}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                {video.duration && (
                  <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded z-20">
                    {video.duration}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-serif font-medium group-hover:text-primary transition-colors" data-testid={`replay-title-${video.id}`}>
                {video.title}
              </h3>
              <div className="flex justify-between items-start mt-2 text-sm text-muted-foreground">
                <p data-testid={`replay-date-${video.id}`}>
                  {new Date(video.recordedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                <p data-testid={`replay-views-${video.id}`}>{video.views} views</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 md:hidden">
          <Link href="/replays">
            <Button variant="outline" className="w-full">
              View All Replays →
            </Button>
          </Link>
        </div>
      </div>

      <VideoPlayerModal 
        video={selectedVideo} 
        open={isPlayerOpen} 
        onClose={() => {
          setIsPlayerOpen(false);
          setSelectedVideo(null);
        }} 
      />
    </section>
  );
}
