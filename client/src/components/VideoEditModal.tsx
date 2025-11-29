import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Image as ImageIcon } from "lucide-react";
import type { Video } from "@shared/schema";
import { ObjectUploader } from "./ObjectUploader";

interface VideoEditModalProps {
  video: Video | null;
  open: boolean;
  onClose: () => void;
}

export function VideoEditModal({ video, open, onClose }: VideoEditModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    if (video) {
      setTitle(video.title);
      if (video.thumbnailPath) {
        setThumbnailUrl(video.thumbnailPath.startsWith('/objects/') 
          ? video.thumbnailPath 
          : `/objects/${video.thumbnailPath}`);
      } else {
        setThumbnailUrl(null);
      }
    }
  }, [video]);

  const updateMutation = useMutation({
    mutationFn: async (data: { title?: string; thumbnailPath?: string }) => {
      const response = await fetch(`/api/videos/${video?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update video");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      toast({
        title: "Video Updated",
        description: "The video has been updated successfully.",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update the video. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!video) return;
    updateMutation.mutate({ title });
  };

  const handleGetUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", { method: "POST" });
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleThumbnailComplete = async (result: any) => {
    if (!result.successful || result.successful.length === 0 || !video) return;

    const uploadedFile = result.successful[0];
    const thumbnailPath = uploadedFile.uploadURL;

    updateMutation.mutate({ thumbnailPath });
    setThumbnailUrl(thumbnailPath);
  };

  if (!video) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Replay</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
              data-testid="input-edit-title"
            />
          </div>

          <div className="space-y-2">
            <Label>Thumbnail</Label>
            <div className="border rounded-lg p-4 bg-muted/30">
              {thumbnailUrl ? (
                <div className="relative aspect-video rounded overflow-hidden mb-3">
                  <img 
                    src={thumbnailUrl} 
                    alt="Thumbnail" 
                    className="w-full h-full object-cover"
                    data-testid="img-current-thumbnail"
                  />
                </div>
              ) : (
                <div className="aspect-video rounded bg-muted flex items-center justify-center mb-3">
                  <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
                </div>
              )}
              
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10485760}
                allowedFileTypes={['image/*']}
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handleThumbnailComplete}
                buttonClassName="w-full"
              >
                <Upload className="w-4 h-4 mr-2" /> 
                {thumbnailUrl ? "Change Thumbnail" : "Upload Thumbnail"}
              </ObjectUploader>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-edit">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updateMutation.isPending}
            data-testid="button-save-edit"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
