import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Video } from "@shared/schema";

interface VideoPlayerModalProps {
  video: Video | null;
  open: boolean;
  onClose: () => void;
}

export function VideoPlayerModal({ video, open, onClose }: VideoPlayerModalProps) {
  const getVideoUrl = () => {
    if (!video) return '';
    return video.objectPath.startsWith('/objects/') 
      ? video.objectPath 
      : `/objects/${video.objectPath}`;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] p-0 overflow-hidden bg-black border-none">
        <DialogTitle className="sr-only">{video?.title || 'Video Player'}</DialogTitle>
        <DialogDescription className="sr-only">Video player for {video?.title || 'sermon'}</DialogDescription>
        {video && (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={onClose}
              data-testid="button-close-video"
            >
              <X className="w-5 h-5" />
            </Button>
            
            <div className="aspect-video bg-black">
              <video
                src={getVideoUrl()}
                controls
                autoPlay
                className="w-full h-full"
                data-testid="video-player"
              >
                Your browser does not support the video tag.
              </video>
            </div>

            <div className="p-6 bg-zinc-900 text-white">
              <h2 className="text-2xl font-serif font-bold mb-2" data-testid="text-player-title">
                {video.title}
              </h2>
              <div className="flex gap-4 text-sm text-zinc-400">
                <span data-testid="text-player-date">
                  {new Date(video.recordedDate).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </span>
                {video.duration && <span>Duration: {video.duration}</span>}
                <span>{video.views} views</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
