import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Music, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface VideoInfo {
  youtubeVideoId: string;
  title: string;
  thumbnailUrl: string | null;
}

export function WorshipRequestForm() {
  const [open, setOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [fetchingInfo, setFetchingInfo] = useState(false);
  const queryClient = useQueryClient();

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const fetchVideoInfo = async (videoId: string): Promise<VideoInfo | null> => {
    try {
      const response = await fetch(`/api/youtube/video/${videoId}`);
      if (response.ok) {
        const data = await response.json();
        return {
          youtubeVideoId: videoId,
          title: data.title,
          thumbnailUrl: data.thumbnailUrl,
        };
      }
    } catch (e) {
      console.error("Failed to fetch video info:", e);
    }
    return {
      youtubeVideoId: videoId,
      title: `YouTube Video ${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    };
  };

  const handleUrlChange = async (url: string) => {
    setYoutubeUrl(url);
    setVideoInfo(null);

    const videoId = extractVideoId(url);
    if (videoId) {
      setFetchingInfo(true);
      const info = await fetchVideoInfo(videoId);
      setVideoInfo(info);
      setFetchingInfo(false);
    }
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!videoInfo) throw new Error("No video info");
      const response = await fetch("/api/worship-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          youtubeUrl,
          youtubeVideoId: videoInfo.youtubeVideoId,
          title: videoInfo.title,
          thumbnailUrl: videoInfo.thumbnailUrl,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit request");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Music request submitted! It will be reviewed by an admin.");
      setOpen(false);
      setYoutubeUrl("");
      setVideoInfo(null);
      queryClient.invalidateQueries({ queryKey: ["worship-requests-my"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = () => {
    if (!videoInfo) {
      toast.error("Please enter a valid YouTube URL");
      return;
    }
    submitMutation.mutate();
  };

  const handleClose = () => {
    setOpen(false);
    setYoutubeUrl("");
    setVideoInfo(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          data-testid="button-request-worship-music"
        >
          <Plus className="w-4 h-4" />
          Request New Music
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Request Worship Music
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              YouTube Video URL
            </label>
            <Input
              placeholder="https://youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              data-testid="input-youtube-url"
            />
          </div>

          {fetchingInfo && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Fetching video info...
            </div>
          )}

          {videoInfo && (
            <div className="border rounded-lg p-3 bg-muted/30">
              <div className="flex gap-3">
                {videoInfo.thumbnailUrl && (
                  <img
                    src={videoInfo.thumbnailUrl}
                    alt={videoInfo.title}
                    className="w-24 h-16 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-2">{videoInfo.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Video ID: {videoInfo.youtubeVideoId}
                  </p>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Your request will be reviewed by the church admins before being added to the worship playlist.
          </p>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose} data-testid="button-cancel-request">
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!videoInfo || submitMutation.isPending}
              data-testid="button-submit-request"
            >
              {submitMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-1" />
              )}
              Submit Request
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
