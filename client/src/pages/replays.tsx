import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
import { useQuery } from "@tanstack/react-query";
import type { Video } from "@shared/schema";
import thumb1 from "@assets/generated_images/preacher_at_podium.png";
import thumb2 from "@assets/generated_images/open_bible_on_table.png";
import thumb3 from "@assets/generated_images/warm_limestone_wall_texture.png";
import { Play } from "lucide-react";

const fallbackImages = [thumb1, thumb2, thumb3];

export default function Replays() {
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      
      <div className="pt-32 pb-16 px-6 max-w-6xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Sermon Replays</h1>
          <p className="text-lg text-muted-foreground">Watch past services and messages on demand.</p>
        </div>

        {videos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No videos uploaded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video, index) => (
              <div 
                key={video.id} 
                className="group cursor-pointer"
                onClick={() => handleVideoClick(video)}
                data-testid={`video-card-${video.id}`}
              >
                <div className="overflow-hidden rounded-lg aspect-[16/9] mb-4 relative bg-zinc-200">
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors z-10 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all duration-300">
                      <Play fill="currentColor" className="ml-1 w-7 h-7" />
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
                <h3 className="text-xl font-serif font-medium group-hover:text-primary transition-colors" data-testid={`text-title-${video.id}`}>
                  {video.title}
                </h3>
                <div className="flex justify-between items-start mt-2">
                  <p className="text-sm text-muted-foreground" data-testid={`text-date-${video.id}`}>
                    {new Date(video.recordedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-muted-foreground">{video.views} views</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <VideoPlayerModal 
        video={selectedVideo} 
        open={isPlayerOpen} 
        onClose={() => {
          setIsPlayerOpen(false);
          setSelectedVideo(null);
        }} 
      />
    </div>
  );
}
