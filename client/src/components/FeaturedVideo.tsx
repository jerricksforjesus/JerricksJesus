import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import type { Video } from "@shared/schema";
import { Play } from "lucide-react";
import thumb1 from "@assets/generated_images/preacher_at_podium.png";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";

export function FeaturedVideo() {
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

  const latestVideo = videos[0];

  if (!latestVideo) {
    return null;
  }

  const handlePlay = async () => {
    await fetch(`/api/videos/${latestVideo.id}/view`, { method: "POST" });
    setSelectedVideo(latestVideo);
    setIsPlayerOpen(true);
  };

  const getThumbnail = () => {
    if (latestVideo.thumbnailPath) {
      return latestVideo.thumbnailPath.startsWith('/objects/') 
        ? latestVideo.thumbnailPath 
        : `/objects/${latestVideo.thumbnailPath}`;
    }
    return thumb1;
  };

  return (
    <section className="py-24 bg-card">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-2">Latest Sermon</h2>
          <p className="text-muted-foreground">Watch the most recent service recording.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="group cursor-pointer"
          onClick={handlePlay}
        >
          <div className="overflow-hidden rounded-lg aspect-video mb-6 relative bg-black">
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors z-10 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all duration-300">
                <Play fill="currentColor" className="ml-2 w-10 h-10" />
              </div>
            </div>
            <img 
              src={getThumbnail()} 
              alt={latestVideo.title}
              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            {latestVideo.duration && (
              <span className="absolute bottom-6 right-6 bg-black/60 text-white text-sm px-3 py-2 rounded z-20 font-medium">
                {latestVideo.duration}
              </span>
            )}
          </div>

          <h3 className="text-2xl md:text-3xl font-serif font-bold mb-3 group-hover:text-primary transition-colors" data-testid="text-featured-title">
            {latestVideo.title}
          </h3>
          <div className="flex justify-between items-center text-muted-foreground">
            <p data-testid="text-featured-date">
              {new Date(latestVideo.recordedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <p data-testid="text-featured-views">{latestVideo.views} views</p>
          </div>
        </motion.div>
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
