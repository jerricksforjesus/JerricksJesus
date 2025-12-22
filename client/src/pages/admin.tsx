import { Navigation, OPEN_SETTINGS_PANEL_EVENT } from "@/components/Navigation";
import { MemberDashboard } from "@/components/MemberDashboard";
import { BibleQuizSection } from "@/components/BibleQuizSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Upload, Pencil, Play, Image, BookOpen, Check, RefreshCw, Loader2, LogOut, UserPlus, Users, Shield, UserCheck, Camera, CheckCircle, XCircle, Clock, Settings, Key, User as UserIcon, Eye, EyeOff, Music, Youtube, Link2, ExternalLink, Menu, X, ChevronRight, Calendar, MapPin, Phone, Home, AlertTriangle, Crop } from "lucide-react";
import { ImageCropper, isPortraitImage, getImageDimensions, getImageDimensionsFromUrl } from "@/components/ui/image-cropper";
import { useState, useEffect, useLayoutEffect } from "react";
import { useLocation, Link } from "wouter";
import { ObjectUploader } from "@/components/ObjectUploader";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
import { VideoEditModal } from "@/components/VideoEditModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import type { Video, Verse, InsertVideo, Photo, InsertPhoto, QuizQuestion, MemberPhoto, Event, InsertEvent } from "@shared/schema";
import { ALL_BIBLE_BOOKS, BIBLE_BOOKS, USER_ROLES } from "@shared/schema";
import type { UploadResult } from "@uppy/core";
import thumb1 from "@assets/generated_images/preacher_at_podium.png";
import thumb2 from "@assets/generated_images/open_bible_on_table.png";
import thumb3 from "@assets/generated_images/warm_limestone_wall_texture.png";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Shuffle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const fallbackImages = [thumb1, thumb2, thumb3];

interface SortablePhotoItemProps {
  photo: Photo;
  photoUrl: string | undefined;
  canEdit: boolean;
  onCrop: (photo: Photo) => void;
  onDelete: (id: number) => void;
}

function SortablePhotoItem({ photo, photoUrl, canEdit, onCrop, onDelete }: SortablePhotoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group rounded-lg overflow-hidden border bg-card ${isDragging ? 'ring-2 ring-primary shadow-lg' : ''}`}
      data-testid={`photo-item-${photo.id}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute bottom-1 left-1 z-30 h-8 w-8 flex items-center justify-center bg-black/70 hover:bg-black/90 text-white rounded cursor-grab active:cursor-grabbing touch-none"
        data-testid={`drag-handle-${photo.id}`}
      >
        <GripVertical className="w-4 h-4" />
      </div>
      
      {/* Status Banner */}
      {photo.needsCropping === 1 ? (
        <div className="absolute top-0 left-0 right-0 bg-amber-500/90 text-white text-xs px-2 py-1 flex items-center justify-center gap-1 z-10">
          <AlertTriangle className="w-3 h-3" />
          <span>Needs Cropping</span>
        </div>
      ) : photo.wasCropped === 1 ? (
        <div className="absolute top-0 left-0 right-0 text-white text-xs px-2 py-1 flex items-center justify-center gap-1 z-10" style={{ backgroundColor: "rgba(180, 122, 95, 0.9)" }}>
          <Check className="w-3 h-3" />
          <span>Cropped</span>
        </div>
      ) : null}
      
      <div className="aspect-square bg-muted">
        {photoUrl ? (
          <img 
            src={photoUrl} 
            alt={photo.caption || "Family photo"}
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
          </div>
        )}
      </div>
      
      {photo.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 pr-20 truncate z-10">
          {photo.caption}
        </div>
      )}
      
      <div className="absolute bottom-1 right-1 flex gap-1 z-20">
        <Button 
          variant="ghost" 
          size="icon" 
          className={`h-8 w-8 ${photo.needsCropping === 1 ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-black/70 hover:bg-black/90 text-white"}`}
          onClick={() => onCrop(photo)}
          data-testid={`button-crop-photo-${photo.id}`}
        >
          <Crop className="w-4 h-4" />
        </Button>
        {canEdit && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 bg-black/70 hover:bg-black/90 text-white"
            onClick={() => onDelete(photo.id)}
            data-testid={`button-delete-photo-${photo.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function ApprovePhotosTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [photoSignedUrls, setPhotoSignedUrls] = useState<Record<number, string>>({});

  const { data: pendingPhotos = [], isLoading } = useQuery<MemberPhoto[]>({
    queryKey: ["pending-member-photos"],
    queryFn: async () => {
      const response = await fetch("/api/member-photos/pending", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch photos");
      return response.json();
    },
  });

  const { data: allMemberPhotos = [] } = useQuery<MemberPhoto[]>({
    queryKey: ["all-member-photos"],
    queryFn: async () => {
      const response = await fetch("/api/member-photos/all", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch photos");
      return response.json();
    },
  });

  useEffect(() => {
    const fetchSignedUrls = async () => {
      const allPhotos = [...pendingPhotos, ...allMemberPhotos];
      for (const photo of allPhotos) {
        if (!photoSignedUrls[photo.id]) {
          try {
            const response = await fetch(`/api/objects/signed-url?path=${encodeURIComponent(photo.imagePath)}`);
            if (response.ok) {
              const { url } = await response.json();
              setPhotoSignedUrls(prev => ({ ...prev, [photo.id]: url }));
            }
          } catch (error) {
            console.error("Error fetching signed URL:", error);
          }
        }
      }
    };
    if (pendingPhotos.length > 0 || allMemberPhotos.length > 0) {
      fetchSignedUrls();
    }
  }, [pendingPhotos, allMemberPhotos]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await fetch(`/api/member-photos/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: (_, { status }) => {
      toast({
        title: status === "approved" ? "Photo Approved" : "Photo Rejected",
        description: `The photo has been ${status}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["pending-member-photos"] });
      queryClient.invalidateQueries({ queryKey: ["all-member-photos"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update photo status.", variant: "destructive" });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Approve Family Photos
        </CardTitle>
        <CardDescription>
          Review and approve photos submitted by congregation members.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Pending Photos Section */}
        <div>
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            Pending Approval ({pendingPhotos.length})
          </h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--burnt-clay)" }} />
            </div>
          ) : pendingPhotos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No photos pending approval!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingPhotos.map((photo) => (
                <Card key={photo.id} className="overflow-hidden">
                  <div className="aspect-square relative bg-muted">
                    {photoSignedUrls[photo.id] ? (
                      <img
                        src={photoSignedUrls[photo.id]}
                        alt={photo.caption || "Member photo"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4 space-y-3">
                    {photo.caption && (
                      <p className="text-sm text-muted-foreground">{photo.caption}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Submitted: {new Date(photo.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => updateStatusMutation.mutate({ id: photo.id, status: "approved" })}
                        style={{ backgroundColor: "#22c55e", color: "white" }}
                        data-testid={`button-approve-${photo.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => updateStatusMutation.mutate({ id: photo.id, status: "rejected" })}
                        data-testid={`button-reject-${photo.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* All Photos History */}
        <div>
          <h3 className="font-semibold text-lg mb-4">All Submitted Photos</h3>
          {allMemberPhotos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
              <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No photos have been submitted yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {allMemberPhotos.map((photo) => (
                <Card key={photo.id} className="overflow-hidden">
                  <div className="aspect-square relative bg-muted">
                    {photoSignedUrls[photo.id] ? (
                      <img
                        src={photoSignedUrls[photo.id]}
                        alt={photo.caption || "Member photo"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      {getStatusIcon(photo.status)}
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="capitalize">{photo.status}</span>
                      <span>{new Date(photo.createdAt).toLocaleDateString()}</span>
                    </div>
                    {photo.caption && (
                      <p className="text-sm mt-1 truncate">{photo.caption}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface WorshipVideo {
  id: number;
  youtubeVideoId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  position: number;
  addedBy: string | null;
}

interface YouTubeConnectionStatus {
  connected: boolean;
  needsReconnect?: boolean;
  channelName?: string;
  channelId?: string;
  connectedAt?: string;
}

interface SyncStatus {
  connected: boolean;
  channelName: string | null;
  lastSync: string | null;
}

function WorshipPlaylistManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: connectionStatus } = useQuery<YouTubeConnectionStatus>({
    queryKey: ["youtube-connection-status"],
    queryFn: async () => {
      const response = await fetch("/api/youtube/connection-status", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to check connection");
      return response.json();
    },
  });

  const { data: syncStatus, refetch: refetchSyncStatus } = useQuery<SyncStatus>({
    queryKey: ["worship-videos-sync-status"],
    queryFn: async () => {
      const response = await fetch("/api/worship-videos/sync-status", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to get sync status");
      return response.json();
    },
  });

  const syncFromYouTube = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/worship-videos/sync", {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to sync");
      }
      
      toast({ 
        title: "Sync Complete", 
        description: `${data.created} added, ${data.updated} updated, ${data.deleted} removed.` 
      });
      queryClient.invalidateQueries({ queryKey: ["worship-videos-admin"] });
      queryClient.invalidateQueries({ queryKey: ["worship-videos"] });
      refetchSyncStatus();
    } catch (error: any) {
      toast({ 
        title: "Sync Failed", 
        description: error.message || "Could not sync from YouTube.", 
        variant: "destructive" 
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const { data: videos = [], isLoading } = useQuery<WorshipVideo[]>({
    queryKey: ["worship-videos-admin"],
    queryFn: async () => {
      const response = await fetch("/api/worship-videos");
      if (!response.ok) throw new Error("Failed to fetch videos");
      return response.json();
    },
  });

  const addVideoMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await fetch("/api/worship-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ youtubeUrl: url }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add video");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Video Added", description: "The video has been added to the worship playlist." });
      setYoutubeUrl("");
      queryClient.invalidateQueries({ queryKey: ["worship-videos-admin"] });
      queryClient.invalidateQueries({ queryKey: ["worship-videos"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/worship-videos/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete video");
    },
    onSuccess: () => {
      toast({ title: "Video Removed", description: "The video has been removed from the playlist." });
      queryClient.invalidateQueries({ queryKey: ["worship-videos-admin"] });
      queryClient.invalidateQueries({ queryKey: ["worship-videos"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove video.", variant: "destructive" });
    },
  });

  const connectYouTube = async () => {
    try {
      const response = await fetch("/api/youtube/connect", { credentials: "include" });
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to initiate YouTube connection.", variant: "destructive" });
    }
  };

  const disconnectYouTube = async () => {
    try {
      const response = await fetch("/api/youtube/disconnect", {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        toast({ title: "Disconnected", description: "YouTube channel has been disconnected." });
        queryClient.invalidateQueries({ queryKey: ["youtube-connection-status"] });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to disconnect YouTube.", variant: "destructive" });
    }
  };

  const handleAddVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;
    addVideoMutation.mutate(youtubeUrl);
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center gap-3 mb-3">
            <Youtube className="w-5 h-5" style={{ color: "#FF0000" }} />
            <h3 className="font-medium">YouTube Channel Connection</h3>
          </div>
          {connectionStatus?.connected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>Connected to: <strong>{connectionStatus.channelName}</strong></span>
              </div>
              {syncStatus?.lastSync && (
                <p className="text-xs text-muted-foreground">
                  Last synced: {new Date(syncStatus.lastSync).toLocaleString()}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Videos will be synced from your YouTube playlist. Use the sync button to fetch the latest videos.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={syncFromYouTube}
                  disabled={isSyncing}
                  data-testid="button-sync-youtube"
                >
                  {isSyncing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  {isSyncing ? "Syncing..." : "Sync from YouTube"}
                </Button>
                <Button variant="outline" size="sm" onClick={disconnectYouTube} data-testid="button-disconnect-youtube">
                  Disconnect YouTube
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connect your YouTube channel to automatically add videos to your playlist when foundational members add them here.
              </p>
              <Button onClick={connectYouTube} style={{ backgroundColor: "#FF0000", color: "#ffffff" }} data-testid="button-connect-youtube">
                <Youtube className="w-4 h-4 mr-2" />
                Connect YouTube Channel
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Warning when YouTube token needs refresh */}
      {connectionStatus?.needsReconnect && (
        <div className="border border-yellow-300 rounded-lg p-4 bg-yellow-50">
          <div className="flex items-center gap-3">
            <Youtube className="w-5 h-5 text-yellow-600" />
            <div>
              <h3 className="font-medium text-yellow-800">YouTube Playlist Requires Reconnection</h3>
              <p className="text-sm text-yellow-700 mt-1">
                {isAdmin 
                  ? "The YouTube connection has expired. Please reconnect YouTube in the Settings section to continue adding videos."
                  : "The YouTube connection has expired. Please ask an admin to reconnect YouTube in the Settings section to add new videos."
                }
              </p>
            </div>
          </div>
        </div>
      )}

      <WorshipMusicRequests />

      <div className="space-y-4">
        <h3 className="font-medium">Add Video to Playlist</h3>
        <form onSubmit={handleAddVideo} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="Paste YouTube video URL (e.g., https://youtube.com/watch?v=...)"
              data-testid="input-youtube-url"
            />
          </div>
          <Button
            type="submit"
            disabled={addVideoMutation.isPending || !youtubeUrl.trim()}
            style={{ backgroundColor: "#b47a5f", color: "#ffffff" }}
            data-testid="button-add-video"
          >
            {addVideoMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Add Video
          </Button>
        </form>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Current Playlist ({videos.length} videos)</h3>
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://youtube.com/playlist?list=PLkDsdLHKY8laSsy8xYfILnVzFMedR0Rgy"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View on YouTube
            </a>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
            <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No videos in the playlist yet.</p>
            <p className="text-sm mt-1">Add a YouTube URL above to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {videos.map((video) => (
              <div
                key={video.id}
                className="p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
                data-testid={`worship-video-item-${video.id}`}
              >
                {/* Mobile Layout: Stacked */}
                <div className="sm:hidden space-y-2">
                  <div className="w-full aspect-video rounded overflow-hidden bg-muted">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <h4 className="font-medium text-sm">{video.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    ID: {video.youtubeVideoId}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex-1"
                    >
                      <a
                        href={`https://youtube.com/watch?v=${video.youtubeVideoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteVideoMutation.mutate(video.id)}
                      disabled={deleteVideoMutation.isPending}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      data-testid={`button-delete-video-${video.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {/* Desktop Layout: Horizontal */}
                <div className="hidden sm:flex items-center gap-4">
                  <div className="w-24 h-14 rounded overflow-hidden bg-muted flex-shrink-0">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-1">{video.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ID: {video.youtubeVideoId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <a
                        href={`https://youtube.com/watch?v=${video.youtubeVideoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteVideoMutation.mutate(video.id)}
                      disabled={deleteVideoMutation.isPending}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      data-testid={`button-delete-video-${video.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface WorshipRequest {
  id: number;
  userId: string;
  youtubeUrl: string;
  youtubeVideoId: string | null;
  title: string | null;
  thumbnailUrl: string | null;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  username?: string;
}

function WorshipMusicRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingRequests = [], isLoading } = useQuery<WorshipRequest[]>({
    queryKey: ["worship-requests-pending"],
    queryFn: async () => {
      const response = await fetch("/api/worship-requests/pending", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch pending requests");
      return response.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await fetch(`/api/worship-requests/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update status");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.status === "approved" ? "Request Approved" : "Request Rejected",
        description: variables.status === "approved" 
          ? "The video has been added to the worship playlist." 
          : "The request has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["worship-requests-pending"] });
      queryClient.invalidateQueries({ queryKey: ["worship-videos-admin"] });
      queryClient.invalidateQueries({ queryKey: ["worship-videos"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="font-medium">Pending Music Requests</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Pending Music Requests ({pendingRequests.length})</h3>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
          <Music className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No pending music requests.</p>
          <p className="text-xs mt-1">Member requests will appear here for review.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pendingRequests.map((request) => (
            <div
              key={request.id}
              className="p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
              data-testid={`worship-request-item-${request.id}`}
            >
              {/* Mobile Layout: Stacked */}
              <div className="sm:hidden space-y-2">
                <div className="w-full aspect-video rounded overflow-hidden bg-muted">
                  {request.thumbnailUrl ? (
                    <img
                      src={request.thumbnailUrl}
                      alt={request.title || "Video thumbnail"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <h4 className="font-medium text-sm">
                  {request.title && !request.title.startsWith("YouTube Video ") 
                    ? request.title 
                    : "Untitled Video"}
                </h4>
                <p className="text-xs text-muted-foreground">
                  Requested by: {request.username || "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(request.createdAt).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="flex-1"
                  >
                    <a
                      href={request.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatusMutation.mutate({ id: request.id, status: "approved" })}
                    disabled={updateStatusMutation.isPending}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    data-testid={`button-approve-request-${request.id}`}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatusMutation.mutate({ id: request.id, status: "rejected" })}
                    disabled={updateStatusMutation.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    data-testid={`button-reject-request-${request.id}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {/* Desktop Layout: Horizontal */}
              <div className="hidden sm:flex items-center gap-4">
                <div className="w-24 h-14 rounded overflow-hidden bg-muted flex-shrink-0">
                  {request.thumbnailUrl ? (
                    <img
                      src={request.thumbnailUrl}
                      alt={request.title || "Video thumbnail"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm line-clamp-1">
                    {request.title && !request.title.startsWith("YouTube Video ") 
                      ? request.title 
                      : "Untitled Video"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Requested by: {request.username || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <a
                      href={request.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatusMutation.mutate({ id: request.id, status: "approved" })}
                    disabled={updateStatusMutation.isPending}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    data-testid={`button-approve-request-${request.id}`}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatusMutation.mutate({ id: request.id, status: "rejected" })}
                    disabled={updateStatusMutation.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    data-testid={`button-reject-request-${request.id}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EventsManagementTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  // Location type: "physical", "online", or "phone"
  const [locationType, setLocationType] = useState<"physical" | "online" | "phone">("physical");
  // Structured address fields (for physical locations)
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  // Online meeting fields
  const [meetingLink, setMeetingLink] = useState("");
  // Phone meeting fields
  const [meetingPhone, setMeetingPhone] = useState("");
  // Structured contact fields
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactType, setContactType] = useState<"phone" | "email" | "link">("phone");
  const [contactUrl, setContactUrl] = useState("");
  const [buttonLabel, setButtonLabel] = useState("Contact Us");
  // Time picker state (12-hour format display)
  const [timeHour, setTimeHour] = useState("12");
  const [timeMinute, setTimeMinute] = useState("00");
  const [timeAmPm, setTimeAmPm] = useState<"AM" | "PM">("AM");
  const [eventDescription, setEventDescription] = useState("");
  const [eventThumbnailPath, setEventThumbnailPath] = useState("");
  const [heroImagePath, setHeroImagePath] = useState("");
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const response = await fetch("/api/events/all", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
  });

  const { data: heroData } = useQuery<{ heroImage: string | null }>({
    queryKey: ["events-hero"],
    queryFn: async () => {
      const response = await fetch("/api/settings/events-hero");
      if (!response.ok) throw new Error("Failed to fetch hero image");
      return response.json();
    },
  });

  useEffect(() => {
    if (heroData?.heroImage) {
      setHeroImagePath(heroData.heroImage);
    }
  }, [heroData]);

  const createEventMutation = useMutation({
    mutationFn: async (event: Omit<InsertEvent, "createdBy">) => {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(event),
      });
      if (!response.ok) throw new Error("Failed to create event");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Event Created", description: "The event has been added successfully." });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create event.", variant: "destructive" });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertEvent> }) => {
      const response = await fetch(`/api/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update event");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Event Updated", description: "The event has been updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update event.", variant: "destructive" });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/events/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete event");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Event Deleted", description: "The event has been removed." });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete event.", variant: "destructive" });
    },
  });

  const updateHeroMutation = useMutation({
    mutationFn: async (heroImage: string) => {
      const response = await fetch("/api/settings/events-hero", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ heroImage }),
      });
      if (!response.ok) throw new Error("Failed to update hero image");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Hero Image Updated", description: "The events page hero image has been updated." });
      queryClient.invalidateQueries({ queryKey: ["events-hero"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update hero image.", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setEventTitle("");
    setEventDate("");
    setTimeHour("12");
    setTimeMinute("00");
    setTimeAmPm("AM");
    setLocationType("physical");
    setStreetAddress("");
    setCity("");
    setState("");
    setZipCode("");
    setMeetingLink("");
    setMeetingPhone("");
    setContactName("");
    setContactPhone("");
    setContactEmail("");
    setContactType("phone");
    setContactUrl("");
    setButtonLabel("Contact Us");
    setEventDescription("");
    setEventThumbnailPath("");
    setEditingEvent(null);
  };

  // Convert 24-hour time string to 12-hour picker values
  const parse24HourTime = (time24: string) => {
    if (!time24) return { hour: "12", minute: "00", ampm: "AM" as const };
    const [hours, minutes] = time24.split(':').map(s => parseInt(s, 10));
    const ampm = hours >= 12 ? "PM" as const : "AM" as const;
    let hour12 = hours % 12;
    if (hour12 === 0) hour12 = 12;
    return { hour: hour12.toString(), minute: minutes.toString().padStart(2, '0'), ampm };
  };

  // Convert 12-hour picker values to 24-hour time string
  const build24HourTime = (hour: string, minute: string, ampm: "AM" | "PM") => {
    let hour24 = parseInt(hour, 10);
    if (ampm === "PM" && hour24 !== 12) hour24 += 12;
    if (ampm === "AM" && hour24 === 12) hour24 = 0;
    return `${hour24.toString().padStart(2, '0')}:${minute}`;
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setEventTitle(event.title);
    setEventDate(event.eventDate);
    const { hour, minute, ampm } = parse24HourTime(event.eventTime);
    setTimeHour(hour);
    setTimeMinute(minute);
    setTimeAmPm(ampm);
    setLocationType((event.locationType as "physical" | "online" | "phone") || "physical");
    setStreetAddress(event.streetAddress || "");
    setCity(event.city || "");
    setState(event.state || "");
    setZipCode(event.zipCode || "");
    setMeetingLink(event.meetingLink || "");
    setMeetingPhone(event.meetingPhone || "");
    setContactName(event.contactName || "");
    setContactPhone(event.contactPhone || "");
    setContactEmail(event.contactEmail || "");
    setContactType((event.contactType as "phone" | "email" | "link") || "phone");
    setContactUrl(event.contactUrl || "");
    setButtonLabel(event.buttonLabel || "Contact Us");
    setEventDescription(event.description || "");
    setEventThumbnailPath(event.thumbnailPath || "");
  };

  const handleSubmit = () => {
    // Basic required fields (title, date, and contact name always required)
    if (!eventTitle || !eventDate || !contactName) {
      toast({ title: "Missing Fields", description: "Please fill in title, date, and contact name.", variant: "destructive" });
      return;
    }

    // Validate location based on type
    if (locationType === "physical" && (!streetAddress || !city || !state)) {
      toast({ title: "Missing Address", description: "Please fill in street address, city, and state.", variant: "destructive" });
      return;
    }
    if (locationType === "online" && !meetingLink) {
      toast({ title: "Missing Meeting Link", description: "Please provide a Zoom or meeting link.", variant: "destructive" });
      return;
    }
    if (locationType === "phone" && !meetingPhone) {
      toast({ title: "Missing Phone Number", description: "Please provide a phone number for the call.", variant: "destructive" });
      return;
    }

    // Validate contact info based on contact type
    if (contactType === "phone" && !contactPhone) {
      toast({ title: "Missing Phone", description: "Please provide a phone number for phone contact type.", variant: "destructive" });
      return;
    }
    if (contactType === "email" && !contactEmail) {
      toast({ title: "Missing Email", description: "Please provide an email address for email contact type.", variant: "destructive" });
      return;
    }
    if (contactType === "link" && !contactUrl) {
      toast({ title: "Missing URL", description: "Please provide a URL for the online link contact type.", variant: "destructive" });
      return;
    }

    const eventTime = build24HourTime(timeHour, timeMinute, timeAmPm);

    const eventData = {
      title: eventTitle,
      eventDate,
      eventTime,
      locationType,
      streetAddress: locationType === "physical" ? streetAddress : "",
      city: locationType === "physical" ? city : "",
      state: locationType === "physical" ? state : "",
      zipCode: locationType === "physical" ? (zipCode || "") : "",
      meetingLink: locationType === "online" ? meetingLink : null,
      meetingPhone: locationType === "phone" ? meetingPhone : null,
      contactName,
      contactPhone: contactType === "phone" ? contactPhone : "",
      contactEmail: contactType === "email" ? (contactEmail || null) : null,
      contactType,
      contactUrl: contactType === "link" ? (contactUrl || null) : null,
      buttonLabel,
      description: eventDescription || null,
      thumbnailPath: eventThumbnailPath || null,
    };

    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, data: eventData });
    } else {
      createEventMutation.mutate(eventData);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6" style={{ color: "#b47a5f" }} />
            <div>
              <CardTitle>Events Page Hero Image</CardTitle>
              <CardDescription>Set the hero banner image for the Events page. If not set, a family photo will be used.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Hero Image Path</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={heroImagePath}
                onChange={(e) => setHeroImagePath(e.target.value)}
                placeholder="Enter image path or upload below"
                data-testid="input-events-hero-path"
                className="flex-1"
              />
              <Button
                onClick={() => updateHeroMutation.mutate(heroImagePath)}
                disabled={updateHeroMutation.isPending || !heroImagePath}
                data-testid="button-save-events-hero"
                className="w-full sm:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Upload New Hero Image</Label>
            <ObjectUploader
              onGetUploadParameters={async () => {
                const response = await fetch("/api/objects/upload", { method: "POST" });
                const data = await response.json();
                return { method: "PUT" as const, url: data.uploadURL };
              }}
              onComplete={(result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
                if (result.successful && result.successful.length > 0) {
                  const uploadedFile = result.successful[0];
                  const path = uploadedFile.uploadURL || "";
                  if (path) {
                    setHeroImagePath(path);
                    updateHeroMutation.mutate(path);
                  }
                }
              }}
              allowedFileTypes={["image/*"]}
              maxFileSize={10 * 1024 * 1024}
              maxNumberOfFiles={1}
              buttonClassName="w-full sm:w-auto"
            >
              <Upload className="w-4 h-4 mr-2" /> Upload Hero Image
            </ObjectUploader>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6" style={{ color: "#b47a5f" }} />
            <div>
              <CardTitle>{editingEvent ? "Edit Event" : "Add New Event"}</CardTitle>
              <CardDescription>
                {editingEvent ? "Update the event details below." : "Fill in the details to create a new event."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title row with action button */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">Event Title *</Label>
              <Input
                id="event-title"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="e.g. Family Fellowship Picnic"
                data-testid="input-event-title"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleSubmit}
                disabled={createEventMutation.isPending || updateEventMutation.isPending}
                data-testid="button-save-event"
                className="w-full sm:w-auto"
              >
                {(createEventMutation.isPending || updateEventMutation.isPending) ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {editingEvent ? "Update Event" : "Add Event"}
              </Button>
              {editingEvent && (
                <Button variant="outline" onClick={resetForm} data-testid="button-cancel-edit-event" className="w-full sm:w-auto">
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-date">Date *</Label>
              <DatePicker
                id="event-date"
                value={eventDate}
                onChange={(value) => setEventDate(value)}
                placeholder="Select event date"
                data-testid="input-event-date"
                disablePast
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-time">Time *</Label>
              <div className="flex gap-2">
                <select
                  value={timeHour}
                  onChange={(e) => setTimeHour(e.target.value)}
                  className="flex h-10 w-20 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  data-testid="select-event-hour"
                >
                  {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hour) => (
                    <option key={hour} value={hour.toString()}>{hour}</option>
                  ))}
                </select>
                <span className="flex items-center">:</span>
                <select
                  value={timeMinute}
                  onChange={(e) => setTimeMinute(e.target.value)}
                  className="flex h-10 w-20 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  data-testid="select-event-minute"
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                  ))}
                </select>
                <select
                  value={timeAmPm}
                  onChange={(e) => setTimeAmPm(e.target.value as "AM" | "PM")}
                  className="flex h-10 w-16 rounded-md border border-input bg-background px-2 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  data-testid="select-event-ampm"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>

          {/* Location Type Selector */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Location Type *</Label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="locationType"
                  value="physical"
                  checked={locationType === "physical"}
                  onChange={() => setLocationType("physical")}
                  className="w-4 h-4 text-primary"
                  data-testid="radio-location-physical"
                />
                <span className="text-sm">Physical Address</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="locationType"
                  value="online"
                  checked={locationType === "online"}
                  onChange={() => setLocationType("online")}
                  className="w-4 h-4 text-primary"
                  data-testid="radio-location-online"
                />
                <span className="text-sm">Online Meeting (Zoom)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="locationType"
                  value="phone"
                  checked={locationType === "phone"}
                  onChange={() => setLocationType("phone")}
                  className="w-4 h-4 text-primary"
                  data-testid="radio-location-phone"
                />
                <span className="text-sm">Phone Call</span>
              </label>
            </div>

            {/* Physical Address Fields */}
            {locationType === "physical" && (
              <div className="grid grid-cols-1 gap-3 pl-6 border-l-2 border-primary/20">
                <div className="space-y-1">
                  <Label htmlFor="street-address" className="text-sm text-muted-foreground">Street Address *</Label>
                  <Input
                    id="street-address"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="e.g. 99 Hillside Avenue, Suite F"
                    data-testid="input-street-address"
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="col-span-2 md:col-span-2 space-y-1">
                    <Label htmlFor="city" className="text-sm text-muted-foreground">City *</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Williston Park"
                      data-testid="input-city"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="state" className="text-sm text-muted-foreground">State *</Label>
                    <Input
                      id="state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. NY"
                      data-testid="input-state"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="zip-code" className="text-sm text-muted-foreground">Zip Code</Label>
                    <Input
                      id="zip-code"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="e.g. 11596"
                      data-testid="input-zip-code"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Online Meeting Fields */}
            {locationType === "online" && (
              <div className="pl-6 border-l-2 border-primary/20">
                <div className="space-y-1">
                  <Label htmlFor="meeting-link" className="text-sm text-muted-foreground">Meeting Link (Zoom, Google Meet, etc.) *</Label>
                  <Input
                    id="meeting-link"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    placeholder="e.g. https://zoom.us/j/123456789"
                    data-testid="input-meeting-link"
                  />
                </div>
              </div>
            )}

            {/* Phone Call Fields */}
            {locationType === "phone" && (
              <div className="pl-6 border-l-2 border-primary/20">
                <div className="space-y-1">
                  <Label htmlFor="meeting-phone" className="text-sm text-muted-foreground">Phone Number for Call *</Label>
                  <Input
                    id="meeting-phone"
                    value={meetingPhone}
                    onChange={(e) => setMeetingPhone(e.target.value)}
                    placeholder="e.g. 516-240-5503"
                    data-testid="input-meeting-phone"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Contact Fields */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Contact Information *</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="contact-name" className="text-sm text-muted-foreground">Contact Name</Label>
                <Input
                  id="contact-name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. John Smith"
                  data-testid="input-contact-name"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact-phone" className="text-sm text-muted-foreground">Phone Number</Label>
                <Input
                  id="contact-phone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. 516-240-5503"
                  data-testid="input-contact-phone"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="contact-type" className="text-sm text-muted-foreground">Button Action</Label>
                <select
                  id="contact-type"
                  value={contactType}
                  onChange={(e) => setContactType(e.target.value as "phone" | "email" | "link")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  data-testid="select-contact-type"
                >
                  <option value="phone">Call Phone Number</option>
                  <option value="email">Send Email</option>
                  <option value="link">Open Online Link</option>
                </select>
              </div>
              {contactType === "email" && (
                <div className="space-y-1">
                  <Label htmlFor="contact-email" className="text-sm text-muted-foreground">Email Address</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="e.g. contact@church.com"
                    data-testid="input-contact-email"
                  />
                </div>
              )}
              {contactType === "link" && (
                <div className="space-y-1">
                  <Label htmlFor="contact-url" className="text-sm text-muted-foreground">Online Link URL</Label>
                  <Input
                    id="contact-url"
                    type="url"
                    value={contactUrl}
                    onChange={(e) => setContactUrl(e.target.value)}
                    placeholder="e.g. https://zoom.us/j/123456"
                    data-testid="input-contact-url"
                  />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="button-label" className="text-sm text-muted-foreground">Button Label</Label>
              <Input
                id="button-label"
                value={buttonLabel}
                onChange={(e) => setButtonLabel(e.target.value)}
                placeholder="e.g. Call to Register, Email Us"
                data-testid="input-button-label"
              />
              <p className="text-xs text-muted-foreground">Text shown on the contact button (e.g. "Call to Register", "Email Us")</p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="event-description">Description (optional)</Label>
            <Textarea
              id="event-description"
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              placeholder="Add any additional details about the event..."
              className="min-h-[80px]"
              data-testid="input-event-description"
            />
          </div>

          {/* Thumbnail */}
          <div className="space-y-2">
            <Label>Event Thumbnail (optional)</Label>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Input
                value={eventThumbnailPath}
                onChange={(e) => setEventThumbnailPath(e.target.value)}
                placeholder="Image path will appear here after upload"
                className="flex-1"
                data-testid="input-event-thumbnail-path"
              />
              <ObjectUploader
                onGetUploadParameters={async () => {
                  const response = await fetch("/api/objects/upload", { method: "POST" });
                  const data = await response.json();
                  return { method: "PUT" as const, url: data.uploadURL };
                }}
                onComplete={(result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
                  if (result.successful && result.successful.length > 0) {
                    const uploadedFile = result.successful[0];
                    const path = uploadedFile.uploadURL || "";
                    if (path) {
                      setEventThumbnailPath(path);
                    }
                  }
                }}
                allowedFileTypes={["image/*"]}
                maxFileSize={10 * 1024 * 1024}
                maxNumberOfFiles={1}
                buttonClassName="w-full sm:w-auto"
              >
                <Image className="w-4 h-4 mr-2" /> Upload
              </ObjectUploader>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Events</CardTitle>
          <CardDescription>Manage your scheduled events. Past events are also shown.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#b47a5f" }} />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No events yet. Add your first event above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  data-testid={`event-row-${event.id}`}
                >
                  {/* Mobile Layout: Stacked */}
                  <div className="sm:hidden space-y-3">
                    {event.thumbnailPath ? (
                      <img
                        src={event.thumbnailPath.startsWith('/') ? event.thumbnailPath : `/objects/${event.thumbnailPath}`}
                        alt={event.title}
                        className="w-full aspect-video rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-video rounded-lg bg-muted flex items-center justify-center">
                        <Calendar className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      {formatDate(event.eventDate)} at {formatTime(event.eventTime)}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="break-words">
                        {event.locationType === "online" 
                          ? "Online Meeting" 
                          : event.locationType === "phone" 
                            ? "Phone Call" 
                            : [event.streetAddress, event.city, event.state, event.zipCode].filter(Boolean).join(", ") || "Location TBD"}
                      </span>
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(event)}
                        data-testid={`button-edit-event-${event.id}`}
                        className="flex-1"
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteEventMutation.mutate(event.id)}
                        disabled={deleteEventMutation.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        data-testid={`button-delete-event-${event.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {/* Desktop Layout: Horizontal */}
                  <div className="hidden sm:flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {event.thumbnailPath ? (
                        <img
                          src={event.thumbnailPath.startsWith('/') ? event.thumbnailPath : `/objects/${event.thumbnailPath}`}
                          alt={event.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {formatDate(event.eventDate)} at {formatTime(event.eventTime)}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          {event.locationType === "online" 
                            ? "Online Meeting" 
                            : event.locationType === "phone" 
                              ? "Phone Call" 
                              : [event.streetAddress, event.city, event.state, event.zipCode].filter(Boolean).join(", ") || "Location TBD"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(event)}
                        data-testid={`button-edit-event-${event.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteEventMutation.mutate(event.id)}
                        disabled={deleteEventMutation.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        data-testid={`button-delete-event-${event.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, logout, isSuperAdmin, isAdmin, isFoundational, canEdit } = useAuth();
  
  const [verse, setVerse] = useState("");
  const [reference, setReference] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDate, setVideoDate] = useState("");
  const [videoDuration, setVideoDuration] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [photoCaption, setPhotoCaption] = useState("");
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [photoCropId, setPhotoCropId] = useState<number | null>(null);
  const [photoCropWasCropped, setPhotoCropWasCropped] = useState(false);
  const [selectedQuizBook, setSelectedQuizBook] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [addMoreCount, setAddMoreCount] = useState<string>("1");
  
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<string>(USER_ROLES.MEMBER);
  const [zoomLinkInput, setZoomLinkInput] = useState("");
  const [alternativeZoomLink, setAlternativeZoomLink] = useState("");
  const [alternativeZoomSchedule, setAlternativeZoomSchedule] = useState<{ day: string; slots: string[] }[]>([]);
  const [activeSection, setActiveSection] = useState(() => {
    // Check URL params for initial section
    const params = new URLSearchParams(window.location.search);
    return params.get("section") || "verse";
  });
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);

  // Clean up URL params after reading section
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("section")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Listen for custom event to open settings panel from Navigation
  // This only opens the panel - it does NOT change the current section
  useEffect(() => {
    const handleOpenPanel = () => {
      setIsMobileSettingsOpen(true);
    };
    window.addEventListener(OPEN_SETTINGS_PANEL_EVENT, handleOpenPanel);
    return () => window.removeEventListener(OPEN_SETTINGS_PANEL_EVENT, handleOpenPanel);
  }, []);

  const { data: zoomData, isLoading: zoomLoading } = useQuery<{ zoomLink: string }>({
    queryKey: ["zoom-link"],
    queryFn: async () => {
      const response = await fetch("/api/settings/zoom-link");
      if (!response.ok) throw new Error("Failed to fetch zoom link");
      return response.json();
    },
    enabled: canEdit,
  });

  const { data: alternativeZoomData } = useQuery<{ alternativeLink: string; schedule: { day: string; slots: string[] }[] }>({
    queryKey: ["alternative-zoom"],
    queryFn: async () => {
      const response = await fetch("/api/settings/alternative-zoom");
      if (!response.ok) throw new Error("Failed to fetch alternative zoom settings");
      return response.json();
    },
    enabled: canEdit,
  });

  useEffect(() => {
    if (zoomData?.zoomLink && !zoomLinkInput) {
      setZoomLinkInput(zoomData.zoomLink);
    }
  }, [zoomData]);

  useEffect(() => {
    if (alternativeZoomData) {
      if (alternativeZoomData.alternativeLink && !alternativeZoomLink) {
        setAlternativeZoomLink(alternativeZoomData.alternativeLink);
      }
      if (alternativeZoomData.schedule?.length > 0 && alternativeZoomSchedule.length === 0) {
        setAlternativeZoomSchedule(alternativeZoomData.schedule);
      }
    }
  }, [alternativeZoomData]);

  const updateZoomLinkMutation = useMutation({
    mutationFn: async (zoomLink: string) => {
      const response = await fetch("/api/settings/zoom-link", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ zoomLink }),
      });
      if (!response.ok) throw new Error("Failed to update zoom link");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Zoom Link Updated", description: "The main Zoom meeting link has been saved." });
      queryClient.invalidateQueries({ queryKey: ["zoom-link"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update Zoom link.", variant: "destructive" });
    },
  });

  const updateAlternativeZoomMutation = useMutation({
    mutationFn: async (data: { alternativeLink: string; schedule: { day: string; slots: string[] }[] }) => {
      const response = await fetch("/api/settings/alternative-zoom", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update alternative zoom settings");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Alternative Zoom Updated", description: "Alternative link and schedule have been saved." });
      queryClient.invalidateQueries({ queryKey: ["alternative-zoom"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update alternative zoom settings.", variant: "destructive" });
    },
  });

  const dayOrder = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  const toggleDayInSchedule = (day: string) => {
    setAlternativeZoomSchedule(prev => {
      const exists = prev.find(s => s.day === day);
      if (exists) {
        return prev.filter(s => s.day !== day);
      } else {
        const newSchedule = [...prev, { day, slots: [] }];
        return newSchedule.sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));
      }
    });
  };

  const toggleSlotForDay = (day: string, slot: string) => {
    setAlternativeZoomSchedule(prev => {
      const entry = prev.find(s => s.day === day);
      if (!entry) return prev;
      const newSlots = entry.slots.includes(slot)
        ? entry.slots.filter(s => s !== slot)
        : [...entry.slots, slot];
      return prev.map(s => s.day === day ? { ...s, slots: newSlots } : s);
    });
  };

  const isDaySelected = (day: string) => alternativeZoomSchedule.some(s => s.day === day);
  const isSlotSelectedForDay = (day: string, slot: string) => {
    const entry = alternativeZoomSchedule.find(s => s.day === day);
    return entry ? entry.slots.includes(slot) : false;
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: "Logged out", description: "You have been signed out." });
      setLocation("/");
    } catch (error) {
      toast({ title: "Error", description: "Failed to log out.", variant: "destructive" });
    }
  };

  const createUserMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; role: string }) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create user");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "User Created", description: "New user account has been created." });
      setIsCreateUserOpen(false);
      setNewUsername("");
      setNewPassword("");
      setNewUserRole(USER_ROLES.MEMBER);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  type AdminUser = { id: string; username: string; email: string | null; role: string; googleId: string | null };

  const { data: allUsers = [], isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
    enabled: canEdit,
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update role");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Role Updated", description: "User role has been updated." });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reset password");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Password Reset", 
        description: "Password has been reset. User must change it on next login." 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete user");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ 
        title: "User Deleted", 
        description: "The user has been removed from the system." 
      });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Profile settings state
  const [profileUsername, setProfileUsername] = useState("");
  const [profileCurrentPassword, setProfileCurrentPassword] = useState("");
  const [profileNewPassword, setProfileNewPassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [profileDateOfBirth, setProfileDateOfBirth] = useState("");

  // Fetch date of birth
  const { data: dobData } = useQuery<{ dateOfBirth: string | null }>({
    queryKey: ["profile-dob"],
    queryFn: async () => {
      const response = await fetch("/api/profile/date-of-birth", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch date of birth");
      return response.json();
    },
    enabled: !!user,
  });

  // Initialize profile data when user loads
  useEffect(() => {
    if (user && !profileUsername) {
      setProfileUsername(user.username);
    }
  }, [user]);

  useEffect(() => {
    if (dobData?.dateOfBirth) {
      setProfileDateOfBirth(dobData.dateOfBirth);
    }
  }, [dobData]);

  const updateUsernameMutation = useMutation({
    mutationFn: async (username: string) => {
      const response = await fetch("/api/profile/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update username");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Username Updated", description: "Your username has been changed." });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateDateOfBirthMutation = useMutation({
    mutationFn: async (dateOfBirth: string) => {
      const response = await fetch("/api/profile/date-of-birth", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dateOfBirth }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update date of birth");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Birthday Saved", description: "Your date of birth has been saved and a birthday event will be created." });
      queryClient.invalidateQueries({ queryKey: ["profile-dob"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      const response = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to change password");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Password Changed", description: "Your password has been updated." });
      setProfileCurrentPassword("");
      setProfileNewPassword("");
      setProfileConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleChangePassword = () => {
    if (profileNewPassword !== profileConfirmPassword) {
      toast({ title: "Error", description: "New passwords do not match", variant: "destructive" });
      return;
    }
    if (profileNewPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({ currentPassword: profileCurrentPassword, newPassword: profileNewPassword });
  };

  // Force password change state
  const [forceNewPassword, setForceNewPassword] = useState("");
  const [forceConfirmPassword, setForceConfirmPassword] = useState("");

  // Delete user confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; username: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const forcePasswordChangeMutation = useMutation({
    mutationFn: async (newPassword: string) => {
      const response = await fetch("/api/profile/force-change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newPassword }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to change password");
      }
      return response.json();
    },
    onSuccess: async (data) => {
      toast({ title: "Password Changed", description: "Your password has been updated successfully." });
      queryClient.setQueryData(["/api/auth/me"], { user: data.user });
      setForceNewPassword("");
      setForceConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleForcePasswordChange = () => {
    if (forceNewPassword !== forceConfirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (forceNewPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    forcePasswordChangeMutation.mutate(forceNewPassword);
  };

  const { data: activeVerse } = useQuery<Verse>({
    queryKey: ["active-verse"],
    queryFn: async () => {
      const response = await fetch("/api/verses/active");
      if (!response.ok) throw new Error("Failed to fetch verse");
      return response.json();
    },
  });

  if (activeVerse && !verse && !reference) {
    setVerse(activeVerse.verseText);
    setReference(activeVerse.reference);
  }

  const { data: videos = [] } = useQuery<Video[]>({
    queryKey: ["videos"],
    queryFn: async () => {
      const response = await fetch("/api/videos");
      if (!response.ok) throw new Error("Failed to fetch videos");
      return response.json();
    },
  });

  const { data: photos = [] } = useQuery<Photo[]>({
    queryKey: ["photos"],
    queryFn: async () => {
      const response = await fetch("/api/photos");
      if (!response.ok) throw new Error("Failed to fetch photos");
      return response.json();
    },
  });

  const [photoSignedUrls, setPhotoSignedUrls] = useState<Record<number, string>>({});
  const [localPhotos, setLocalPhotos] = useState<Photo[]>([]);
  
  useEffect(() => {
    setLocalPhotos(photos);
  }, [photos]);

  const { data: carouselRandomize = false } = useQuery<boolean>({
    queryKey: ["carousel-randomize"],
    queryFn: async () => {
      const response = await fetch("/api/settings/carousel-randomize");
      if (!response.ok) throw new Error("Failed to fetch setting");
      const data = await response.json();
      return data.randomize;
    },
    refetchOnWindowFocus: true,
  });

  const reorderPhotosMutation = useMutation({
    mutationFn: async (orderedIds: number[]) => {
      const response = await fetch("/api/photos/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderedIds }),
      });
      if (!response.ok) throw new Error("Failed to reorder photos");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photos"] });
      toast({ title: "Photos Reordered", description: "The photo order has been saved." });
    },
    onError: () => {
      setLocalPhotos(photos);
      toast({ title: "Error", description: "Failed to reorder photos.", variant: "destructive" });
    },
  });

  const updateRandomizeMutation = useMutation({
    mutationFn: async (randomize: boolean) => {
      const response = await fetch("/api/settings/carousel-randomize", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ randomize }),
      });
      if (!response.ok) throw new Error("Failed to update setting");
      return response.json();
    },
    onSuccess: (_, randomize) => {
      queryClient.invalidateQueries({ queryKey: ["carousel-randomize"] });
      toast({ 
        title: randomize ? "Randomize Enabled" : "Randomize Disabled", 
        description: randomize 
          ? "Photos will appear in random order on the carousel." 
          : "Photos will appear in the order you arranged them."
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update setting.", variant: "destructive" });
    },
  });

  const photoSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handlePhotoDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = localPhotos.findIndex((p) => p.id === active.id);
      const newIndex = localPhotos.findIndex((p) => p.id === over.id);
      const newOrder = arrayMove(localPhotos, oldIndex, newIndex);
      setLocalPhotos(newOrder);
      reorderPhotosMutation.mutate(newOrder.map((p) => p.id));
    }
  };

  const getPhotoUrl = (photo: Photo) => photoSignedUrls[photo.id];

  interface BookStatus {
    name: string;
    questionCount: number;
    approvedCount: number;
    hasQuiz: boolean;
    attemptCount?: number;
  }

  const { data: quizBooks = [] } = useQuery<BookStatus[]>({
    queryKey: ["quiz-books"],
    queryFn: async () => {
      const response = await fetch("/api/quiz/books");
      if (!response.ok) throw new Error("Failed to fetch books");
      return response.json();
    },
  });

  const { data: bookQuestions = [], refetch: refetchQuestions } = useQuery<QuizQuestion[]>({
    queryKey: ["admin-quiz-questions", selectedQuizBook],
    queryFn: async () => {
      const response = await fetch(`/api/admin/quiz/questions/${encodeURIComponent(selectedQuizBook!)}`);
      if (!response.ok) throw new Error("Failed to fetch questions");
      return response.json();
    },
    enabled: !!selectedQuizBook,
  });

  const generateQuestionsMutation = useMutation({
    mutationFn: async (book: string) => {
      setIsGenerating(true);
      const response = await fetch(`/api/admin/quiz/generate/${encodeURIComponent(book)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 10 }),
      });
      if (!response.ok) throw new Error("Failed to generate questions");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-books"] });
      refetchQuestions();
      toast({
        title: "Questions Generated",
        description: "AI has generated 10 quiz questions. Review and approve them.",
      });
      setIsGenerating(false);
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate questions. Please try again.",
        variant: "destructive",
      });
      setIsGenerating(false);
    },
  });

  const addMoreQuestionsMutation = useMutation({
    mutationFn: async ({ book, count }: { book: string; count: number }) => {
      setIsGenerating(true);
      const response = await fetch(`/api/admin/quiz/generate/${encodeURIComponent(book)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      if (!response.ok) throw new Error("Failed to generate questions");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quiz-books"] });
      refetchQuestions();
      toast({
        title: "Questions Added",
        description: `Added ${data.questions?.length || addMoreCount} new questions to the existing list.`,
      });
      setIsGenerating(false);
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Failed to add more questions. Please try again.",
        variant: "destructive",
      });
      setIsGenerating(false);
    },
  });

  const approveQuestionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/quiz/approve/${id}`, { method: "POST" });
      if (!response.ok) throw new Error("Failed to approve");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-books"] });
      refetchQuestions();
    },
  });

  const approveAllMutation = useMutation({
    mutationFn: async (book: string) => {
      const response = await fetch(`/api/admin/quiz/approve-book/${encodeURIComponent(book)}`, { method: "POST" });
      if (!response.ok) throw new Error("Failed to approve");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-books"] });
      refetchQuestions();
      toast({
        title: "All Questions Approved",
        description: "All questions for this book are now live.",
      });
    },
  });

  const resetResultsMutation = useMutation({
    mutationFn: async (book: string) => {
      const response = await fetch(`/api/admin/quiz/results/${encodeURIComponent(book)}`, { 
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to reset results");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["user-quiz-stats"] });
      queryClient.invalidateQueries({ queryKey: ["quiz-books"] });
      toast({
        title: "Quiz Results Reset",
        description: `${data.deletedCount} quiz attempt(s) have been cleared for this book.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reset quiz results.",
        variant: "destructive",
      });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/quiz/questions/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-books"] });
      refetchQuestions();
    },
  });

  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<string | null>(null);

  const generateAllMutation = useMutation({
    mutationFn: async () => {
      setBulkGenerating(true);
      setBulkProgress("Starting bulk generation for all 66 books...");
      
      const response = await fetch("/api/admin/quiz/generate-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipExisting: true }),
      });
      
      if (!response.ok) throw new Error("Failed to generate all questions");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quiz-books"] });
      toast({
        title: "Bulk Generation Complete",
        description: `Generated questions for ${data.successCount} books. ${data.failCount} failed, ${data.skippedCount} skipped.`,
      });
      setBulkGenerating(false);
      setBulkProgress(null);
    },
    onError: () => {
      toast({
        title: "Bulk Generation Failed",
        description: "Failed to generate questions. Please try again.",
        variant: "destructive",
      });
      setBulkGenerating(false);
      setBulkProgress(null);
    },
  });

  const approveAllBooksMutation = useMutation({
    mutationFn: async () => {
      // Approve all questions for all books
      const unapprovedBooks = quizBooks.filter(b => b.questionCount > 0 && b.approvedCount < b.questionCount);
      for (const book of unapprovedBooks) {
        await fetch(`/api/admin/quiz/approve-book/${encodeURIComponent(book.name)}`, { method: "POST" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-books"] });
      toast({
        title: "All Questions Approved",
        description: "All questions across all books are now live.",
      });
    },
  });

  useEffect(() => {
    const fetchSignedUrls = async () => {
      const urls: Record<number, string> = {};
      for (const photo of photos) {
        const imagePath = photo.imagePath.startsWith('/objects/') 
          ? photo.imagePath 
          : `/objects/${photo.imagePath}`;
        
        try {
          const response = await fetch(`/api/objects/signed-url?path=${encodeURIComponent(imagePath)}`);
          if (response.ok) {
            const data = await response.json();
            urls[photo.id] = data.url;
          }
        } catch (error) {
          console.error('Error fetching signed URL for photo:', photo.id);
        }
      }
      setPhotoSignedUrls(urls);
    };

    if (photos.length > 0) {
      fetchSignedUrls();
    }
  }, [photos]);

  const createVerseMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/verses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verseText: verse,
          reference: reference,
          isActive: 1,
        }),
      });
      if (!response.ok) throw new Error("Failed to create verse");
      return response.json();
    },
    onSuccess: async (newVerse) => {
      await fetch(`/api/verses/${newVerse.id}/activate`, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["active-verse"] });
      toast({
        title: "Verse Updated",
        description: "The verse of the day has been updated successfully.",
      });
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/videos/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete video");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      toast({
        title: "Video Deleted",
        description: "The video has been removed from the gallery.",
      });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/photos/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete photo");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photos"] });
      toast({
        title: "Photo Deleted",
        description: "The photo has been removed from the gallery.",
      });
    },
  });

  const handleSaveVerse = () => {
    createVerseMutation.mutate();
  };

  const handleGetUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", { method: "POST" });
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (!result.successful || result.successful.length === 0) {
      toast({
        title: "Upload Failed",
        description: "The video upload was not successful.",
        variant: "destructive",
      });
      return;
    }

    const uploadedFile = result.successful[0];
    const objectPath = uploadedFile.uploadURL || "";

    const videoData: InsertVideo = {
      title: videoTitle || uploadedFile.name || "Untitled Sermon",
      objectPath: objectPath,
      recordedDate: videoDate || new Date().toISOString().split('T')[0],
      duration: videoDuration || undefined,
    };

    try {
      const response = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(videoData),
      });

      if (!response.ok) throw new Error("Failed to save video");

      queryClient.invalidateQueries({ queryKey: ["videos"] });
      
      setVideoTitle("");
      setVideoDate("");
      setVideoDuration("");

      toast({
        title: "Upload Complete",
        description: "The video has been added to the replay gallery.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "The video was uploaded but failed to save metadata.",
        variant: "destructive",
      });
    }
  };

  const handlePlayVideo = async (video: Video) => {
    await fetch(`/api/videos/${video.id}/view`, { method: "POST" });
    setSelectedVideo(video);
    setIsPlayerOpen(true);
  };

  const handleEditVideo = (video: Video) => {
    setSelectedVideo(video);
    setIsEditOpen(true);
  };

  const getThumbnail = (video: Video, index: number) => {
    if (video.thumbnailPath) {
      return video.thumbnailPath.startsWith('/objects/') 
        ? video.thumbnailPath 
        : `/objects/${video.thumbnailPath}`;
    }
    return fallbackImages[index % fallbackImages.length];
  };

  // State for portrait photo crop dialog
  const [showCropPrompt, setShowCropPrompt] = useState(false);
  const [pendingCropPhoto, setPendingCropPhoto] = useState<{ id: number; url: string } | null>(null);

  const handlePhotoUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (!result.successful || result.successful.length === 0) {
      toast({
        title: "Upload Failed",
        description: "The photo upload was not successful.",
        variant: "destructive",
      });
      return;
    }

    const uploadedFile = result.successful[0];
    const imagePath = uploadedFile.uploadURL || "";

    // Get the original file to check dimensions - try multiple ways to access it
    const originalFile = (uploadedFile as any).data as File | Blob | undefined;
    let imageWidth: number | undefined;
    let imageHeight: number | undefined;
    let needsCropping = 0;

    if (originalFile && originalFile instanceof Blob) {
      try {
        // Create a file from blob if needed
        const file = originalFile instanceof File ? originalFile : new File([originalFile], 'photo.jpg', { type: originalFile.type });
        const dims = await getImageDimensions(file);
        imageWidth = dims.width;
        imageHeight = dims.height;
        needsCropping = isPortraitImage(dims.width, dims.height) ? 1 : 0;
        console.log("Photo dimensions detected:", dims.width, "x", dims.height, "needsCropping:", needsCropping);
      } catch (e) {
        console.error("Failed to get image dimensions:", e);
      }
    } else {
      console.log("No file data available for dimension check, will detect from URL after upload");
    }

    const photoData: InsertPhoto = {
      imagePath: imagePath,
      caption: photoCaption || undefined,
      imageWidth,
      imageHeight,
      needsCropping,
    };

    try {
      const response = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(photoData),
      });

      if (!response.ok) throw new Error("Failed to save photo");

      const savedPhoto = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ["photos"] });
      setPhotoCaption("");

      // If portrait detected from file, prompt to crop
      if (needsCropping && savedPhoto.id) {
        // Get signed URL for the image
        const signedUrlResponse = await fetch(`/api/objects/signed-url?path=${encodeURIComponent(imagePath)}`);
        if (signedUrlResponse.ok) {
          const { url } = await signedUrlResponse.json();
          setPendingCropPhoto({ id: savedPhoto.id, url });
          setShowCropPrompt(true);
        }
        return;
      }
      
      // If we couldn't detect dimensions from file, try to detect from URL after a short delay
      if (!imageWidth && !imageHeight && savedPhoto.id) {
        setTimeout(async () => {
          try {
            const signedUrlResponse = await fetch(`/api/objects/signed-url?path=${encodeURIComponent(imagePath)}`);
            if (signedUrlResponse.ok) {
              const { url } = await signedUrlResponse.json();
              const dims = await getImageDimensionsFromUrl(url);
              const needsCrop = isPortraitImage(dims.width, dims.height) ? 1 : 0;
              
              if (needsCrop) {
                await fetch(`/api/photos/${savedPhoto.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    imageWidth: dims.width,
                    imageHeight: dims.height,
                    needsCropping: needsCrop,
                  }),
                });
                queryClient.invalidateQueries({ queryKey: ["photos"] });
                // Show crop prompt for delayed detection too
                setPendingCropPhoto({ id: savedPhoto.id, url });
                setShowCropPrompt(true);
              }
            }
          } catch (e) {
            console.error("Failed to detect dimensions from URL:", e);
          }
        }, 1000);
      } else {
        toast({
          title: "Photo Added",
          description: "The photo has been added to the family gallery.",
        });
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "The photo was uploaded but failed to save.",
        variant: "destructive",
      });
    }
  };

  const handleCropNow = () => {
    if (pendingCropPhoto) {
      setPhotoCropId(pendingCropPhoto.id);
      setCropImageSrc(pendingCropPhoto.url);
      setIsCropperOpen(true);
    }
    setShowCropPrompt(false);
    setPendingCropPhoto(null);
  };

  const handleSkipCrop = () => {
    toast({
      title: "Photo Added",
      description: "You can crop this photo later from the gallery.",
    });
    setShowCropPrompt(false);
    setPendingCropPhoto(null);
  };

  // Auto-scan photos for portrait orientation on first load
  const [hasScanned, setHasScanned] = useState(false);
  
  useEffect(() => {
    if (hasScanned || photos.length === 0) return;
    
    // Check if any photos need scanning (no dimensions set and not already cropped)
    const photosToScan = photos.filter(p => 
      !p.imageWidth && !p.imageHeight && p.wasCropped !== 1 && p.needsCropping !== 1
    );
    
    if (photosToScan.length === 0) {
      setHasScanned(true);
      return;
    }
    
    const scanPhotos = async () => {
      let detectedCount = 0;
      
      for (const photo of photosToScan) {
        const url = getPhotoUrl(photo);
        if (!url) continue;
        
        try {
          const dims = await getImageDimensionsFromUrl(url);
          const needsCrop = isPortraitImage(dims.width, dims.height) ? 1 : 0;
          
          if (needsCrop) {
            await fetch(`/api/photos/${photo.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                imageWidth: dims.width,
                imageHeight: dims.height,
                needsCropping: needsCrop,
              }),
            });
            detectedCount++;
          }
        } catch (e) {
          console.error("Failed to check photo:", photo.id, e);
        }
      }
      
      if (detectedCount > 0) {
        queryClient.invalidateQueries({ queryKey: ["photos"] });
        toast({
          title: "Portrait Photos Detected",
          description: `${detectedCount} photo(s) may need cropping for the carousel.`,
        });
      }
      
      setHasScanned(true);
    };
    
    scanPhotos();
  }, [photos, hasScanned]);

  const handleCropExistingPhoto = async (photo: Photo) => {
    const url = getPhotoUrl(photo);
    if (url) {
      setPhotoCropId(photo.id);
      setPhotoCropWasCropped(photo.wasCropped === 1);
      setCropImageSrc(url);
      setIsCropperOpen(true);
    }
  };

  const handleRemoveCrop = async () => {
    if (!photoCropId) return;

    try {
      const updateResponse = await fetch(`/api/photos/${photoCropId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          wasCropped: 0,
          needsCropping: 0,
        }),
      });

      if (!updateResponse.ok) throw new Error("Failed to update photo");

      queryClient.invalidateQueries({ queryKey: ["photos"] });
      toast({
        title: "Crop Removed",
        description: "The crop status has been reset.",
      });
      setPhotoCropId(null);
      setPhotoCropWasCropped(false);
      setCropImageSrc("");
    } catch (error) {
      console.error("Remove crop error:", error);
      toast({
        title: "Error",
        description: "Failed to remove crop status.",
        variant: "destructive",
      });
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!photoCropId) return;

    try {
      // Get upload URL (same flow as ObjectUploader)
      const uploadParamsResponse = await fetch("/api/objects/upload", {
        method: "POST",
      });

      if (!uploadParamsResponse.ok) throw new Error("Failed to get upload URL");
      const { uploadURL } = await uploadParamsResponse.json();

      if (!uploadURL) throw new Error("No upload URL returned");

      // Upload the cropped image to the signed URL
      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: croppedBlob,
        headers: { "Content-Type": "image/jpeg" },
      });

      if (!uploadResponse.ok) throw new Error("Failed to upload cropped image");

      // The uploadURL becomes the object path (server will normalize it)
      const updateResponse = await fetch(`/api/photos/${photoCropId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          imagePath: uploadURL,
          needsCropping: 0,
          wasCropped: 1,
          imageWidth: null,
          imageHeight: null,
        }),
      });

      if (!updateResponse.ok) throw new Error("Failed to update photo");

      // Clear the signed URL cache for this photo so it reloads with the new image
      setPhotoSignedUrls(prev => {
        const updated = { ...prev };
        delete updated[photoCropId];
        return updated;
      });

      queryClient.invalidateQueries({ queryKey: ["photos"] });
      setPhotoCropId(null);
      setCropImageSrc("");
    } catch (error) {
      console.error("Crop error:", error);
      toast({
        title: "Crop Failed",
        description: "Failed to save the cropped image.",
        variant: "destructive",
      });
    }
  };

  useLayoutEffect(() => {
    if (!authLoading && !user) {
      setLocation("/login");
    }
  }, [authLoading, user, setLocation]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--alabaster)" }}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: "var(--burnt-clay)" }} />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--alabaster)" }}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: "var(--burnt-clay)" }} />
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return <MemberDashboard />;
  }

  const navItems: Array<{ id: string; label: string; icon: typeof BookOpen; action?: () => void | Promise<void> }> = [
    { id: "verse", label: "Daily Verse", icon: BookOpen },
    { id: "replays", label: "Sermon Replays", icon: Play },
    { id: "photos", label: "Family Photos", icon: Image },
    { id: "approve-photos", label: "Approve Photos", icon: CheckCircle },
    { id: "events", label: "Family Events", icon: Calendar },
    ...(isAdmin ? [{ id: "quiz", label: "Manage Quiz", icon: BookOpen }] : []),
    ...(isFoundational && !isAdmin ? [{ id: "take-quiz", label: "Take Quiz", icon: BookOpen }] : []),
    { id: "worship", label: "Worship Playlist", icon: Music },
    { id: "users", label: "Users", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "logout", label: "Log Out", icon: LogOut, action: handleLogout },
  ];

  return (
    <div className="min-h-screen bg-muted/20">
      <Navigation />
      
      <div className="pt-20 lg:pt-24 flex min-h-[calc(100vh-5rem)]">
        {/* Desktop Sidebar - Always visible on large screens */}
        <aside className="hidden lg:flex w-64 flex-col bg-card border-r">
          <div className="p-6 border-b" style={{ backgroundColor: "#b47a5f" }}>
            <h1 className="text-xl font-serif font-bold text-white">Admin Dashboard</h1>
            <p className="text-sm text-white/80 mt-1">
              {user.username}
            </p>
          </div>
          
          <nav className="flex-1 p-3 overflow-y-auto">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isLogout = item.id === "logout";
                return (
                  <button
                    key={item.id}
                    onClick={() => item.action ? item.action() : setActiveSection(item.id)}
                    data-testid={`tab-${item.id}`}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                      isLogout
                        ? "text-red-600 hover:bg-muted"
                        : activeSection === item.id
                        ? "bg-[#b47a5f] text-white font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>
          
          {isAdmin && (
            <div className="p-3 border-t">
              <Button 
                size="sm"
                className="w-full"
                onClick={() => setIsCreateUserOpen(true)}
                data-testid="button-create-user"
                style={{ backgroundColor: "#b47a5f", color: "#ffffff" }}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
          )}
        </aside>

        {/* Mobile Navigation Bar */}
        <div className="lg:hidden fixed top-14 left-0 right-0 z-30" style={{ backgroundColor: "#EDEBE5" }}>
          <div className="p-3">
            <Button 
              variant="outline" 
              className="w-full justify-between"
              onClick={() => setIsMobileSettingsOpen(true)}
              data-testid="button-open-mobile-settings"
            >
              <span className="flex items-center gap-2">
                <Menu className="h-4 w-4" />
                {navItems.find(item => item.id === activeSection)?.label || "Select Section"}
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Full-Page Settings Panel */}
        <AnimatePresence>
          {isMobileSettingsOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="lg:hidden fixed inset-0 bg-black/50 z-40"
                onClick={() => setIsMobileSettingsOpen(false)}
              />
              
              {/* Slide-in Panel */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="lg:hidden fixed inset-y-0 left-0 w-full max-w-sm bg-card z-50 shadow-xl flex flex-col"
              >
                {/* Panel Header */}
                <div className="flex items-center justify-between p-4 border-b" style={{ backgroundColor: "#b47a5f" }}>
                  <div>
                    <h2 className="text-lg font-serif font-bold text-white">My Account</h2>
                    <p className="text-sm text-white/80">{user.username}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMobileSettingsOpen(false)}
                    className="text-white hover:bg-white/20"
                    data-testid="button-close-mobile-settings"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-1">
                    {/* Return to Site */}
                    <Link href="/" onClick={() => setIsMobileSettingsOpen(false)}>
                      <button
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left text-sm transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
                        data-testid="button-return-to-site-mobile"
                      >
                        <Home className="w-4 h-4 flex-shrink-0" />
                        Return to Site
                      </button>
                    </Link>

                    <div className="border-t my-3" />

                    {/* Section Navigation */}
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isLogout = item.id === "logout";
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.action) {
                              setIsMobileSettingsOpen(false);
                              item.action();
                            } else {
                              setActiveSection(item.id);
                              setIsMobileSettingsOpen(false);
                            }
                          }}
                          data-testid={`mobile-nav-${item.id}`}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left text-sm transition-colors ${
                            isLogout
                              ? "text-red-600 hover:bg-muted"
                              : activeSection === item.id
                              ? "bg-[#b47a5f] text-white font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          {item.label}
                        </button>
                      );
                    })}

                    {/* Admin: Add User */}
                    {isAdmin && (
                      <>
                        <div className="border-t my-3" />
                        <button
                          onClick={() => {
                            setIsCreateUserOpen(true);
                            setIsMobileSettingsOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left text-sm transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
                          data-testid="button-create-user-mobile"
                        >
                          <UserPlus className="w-4 h-4 flex-shrink-0" />
                          Add User
                        </button>
                      </>
                    )}
                  </div>
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8 pt-20 lg:pt-8 pb-12 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {activeSection === "verse" && (
            <Card>
              <CardHeader>
                <CardTitle>Edit Verse</CardTitle>
                <CardDescription>Update the featured verse displayed on the homepage.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="verse-text">Verse Text</Label>
                  <Textarea 
                    id="verse-text" 
                    value={verse}
                    onChange={(e) => setVerse(e.target.value)}
                    className="min-h-[120px] text-lg font-serif"
                    data-testid="input-verse-text"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference">Reference</Label>
                  <Input 
                    id="reference" 
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="font-medium"
                    data-testid="input-reference"
                  />
                </div>
                <Button onClick={handleSaveVerse} className="w-full sm:w-auto" data-testid="button-save-verse">
                  <Save className="w-4 h-4 mr-2" /> Update Verse
                </Button>
              </CardContent>
            </Card>
          )}

          {activeSection === "replays" && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Sermon Replays</CardTitle>
                    <CardDescription>Add, edit, or remove past sermon videos.</CardDescription>
                  </div>
                </div>
                
                <div className="mt-6 space-y-4 border-t pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="video-title">Title</Label>
                      <Input 
                        id="video-title" 
                        placeholder="e.g. Walking in Faith"
                        value={videoTitle}
                        onChange={(e) => setVideoTitle(e.target.value)}
                        data-testid="input-video-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="video-date">Date</Label>
                      <DatePicker
                        id="video-date"
                        value={videoDate}
                        onChange={(value) => setVideoDate(value)}
                        placeholder="Select video date"
                        data-testid="input-video-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="video-duration">Duration (optional)</Label>
                      <Input 
                        id="video-duration" 
                        placeholder="e.g. 45:20"
                        value={videoDuration}
                        onChange={(e) => setVideoDuration(e.target.value)}
                        data-testid="input-video-duration"
                      />
                    </div>
                  </div>
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={2147483648}
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handleUploadComplete}
                    buttonClassName="w-full md:w-auto"
                  >
                    <Upload className="w-4 h-4 mr-2" /> Upload Video
                  </ObjectUploader>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {videos.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No videos uploaded yet.</p>
                  ) : (
                    videos.map((video, index) => (
                      <div key={video.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:shadow-sm transition-shadow" data-testid={`video-item-${video.id}`}>
                        <div className="flex gap-4 items-center flex-1 min-w-0">
                          <div 
                            className="w-20 h-12 bg-muted rounded overflow-hidden flex-shrink-0 cursor-pointer group relative"
                            onClick={() => handlePlayVideo(video)}
                          >
                            <img 
                              src={getThumbnail(video, index)} 
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Play className="w-5 h-5 text-white" fill="white" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium truncate" data-testid={`text-video-title-${video.id}`}>{video.title}</h4>
                            <p className="text-xs text-muted-foreground">
                              {new Date(video.recordedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              {video.duration && ` • ${video.duration}`}
                              {` • ${video.views} views`}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEditVideo(video)}
                            data-testid={`button-edit-${video.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {isAdmin && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                              onClick={() => deleteVideoMutation.mutate(video.id)}
                              data-testid={`button-delete-${video.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "photos" && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Family Photo Gallery</CardTitle>
                    <CardDescription>Add photos and drag to rearrange their order. On mobile, tap and hold to drag.</CardDescription>
                  </div>
                </div>
                
                {/* Randomize Toggle */}
                <div className="flex items-center justify-between mt-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shuffle className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Randomize Carousel</p>
                      <p className="text-xs text-muted-foreground">Show photos in random order on homepage</p>
                    </div>
                  </div>
                  <Switch
                    checked={carouselRandomize}
                    onCheckedChange={(checked) => updateRandomizeMutation.mutate(checked)}
                    data-testid="switch-randomize-carousel"
                  />
                </div>
                
                <div className="mt-6 space-y-4 border-t pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="photo-caption">Caption (optional)</Label>
                    <Input 
                      id="photo-caption" 
                      placeholder="e.g. Easter Sunday Service 2024"
                      value={photoCaption}
                      onChange={(e) => setPhotoCaption(e.target.value)}
                      data-testid="input-photo-caption"
                    />
                  </div>
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={52428800}
                    allowedFileTypes={['image/*', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.avif']}
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handlePhotoUploadComplete}
                    buttonClassName="w-full md:w-auto"
                  >
                    <Image className="w-4 h-4 mr-2" /> Upload Photo
                  </ObjectUploader>
                </div>
              </CardHeader>
              <CardContent>
                {localPhotos.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No photos uploaded yet.</p>
                ) : (
                  <DndContext
                    sensors={photoSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handlePhotoDragEnd}
                  >
                    <SortableContext items={localPhotos.map(p => p.id)} strategy={rectSortingStrategy}>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {localPhotos.map((photo) => (
                          <SortablePhotoItem
                            key={photo.id}
                            photo={photo}
                            photoUrl={getPhotoUrl(photo)}
                            canEdit={canEdit}
                            onCrop={handleCropExistingPhoto}
                            onDelete={(id) => deletePhotoMutation.mutate(id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </CardContent>
            </Card>
          )}

          {activeSection === "approve-photos" && (
            <ApprovePhotosTab />
          )}

          {activeSection === "quiz" && isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Bible Quiz Management
                </CardTitle>
                <CardDescription>
                  Generate and manage quiz questions for each book of the Bible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Book Selection */}
                  <div>
                    <h3 className="font-semibold mb-3">Select a Book</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Old Testament</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                          {quizBooks.filter(b => (BIBLE_BOOKS.oldTestament as readonly string[]).includes(b.name)).map((book) => (
                            <button
                              key={book.name}
                              onClick={() => setSelectedQuizBook(book.name)}
                              className={`text-xs p-2 rounded border transition-all ${
                                selectedQuizBook === book.name
                                  ? "border-primary bg-primary/10 text-primary"
                                  : (book.attemptCount || 0) > 0
                                  ? "border-blue-500/50 bg-blue-50"
                                  : book.questionCount > 0
                                  ? "border-green-500/50 bg-green-50"
                                  : "border-border hover:border-primary/50"
                              }`}
                              data-testid={`admin-quiz-book-${book.name}`}
                            >
                              <span className="line-clamp-1">{book.name}</span>
                              {book.questionCount > 0 && (
                                <span className="text-[10px] text-muted-foreground block">
                                  {book.approvedCount}/{book.questionCount}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">New Testament</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                          {quizBooks.filter(b => (BIBLE_BOOKS.newTestament as readonly string[]).includes(b.name)).map((book) => (
                            <button
                              key={book.name}
                              onClick={() => setSelectedQuizBook(book.name)}
                              className={`text-xs p-2 rounded border transition-all ${
                                selectedQuizBook === book.name
                                  ? "border-primary bg-primary/10 text-primary"
                                  : (book.attemptCount || 0) > 0
                                  ? "border-blue-500/50 bg-blue-50"
                                  : book.questionCount > 0
                                  ? "border-green-500/50 bg-green-50"
                                  : "border-border hover:border-primary/50"
                              }`}
                              data-testid={`admin-quiz-book-${book.name}`}
                            >
                              <span className="line-clamp-1">{book.name}</span>
                              {book.questionCount > 0 && (
                                <span className="text-[10px] text-muted-foreground block">
                                  {book.approvedCount}/{book.questionCount}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Question Management */}
                  <div>
                    {selectedQuizBook ? (
                      <div>
                        <div className="flex items-center justify-between mb-4 gap-3">
                          <div className="flex-shrink-0">
                            <h3 className="font-semibold">{selectedQuizBook}</h3>
                            {bookQuestions.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {bookQuestions.length} questions
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 items-center">
                            {bookQuestions.length === 0 ? (
                              <Button
                                size="sm"
                                onClick={() => generateQuestionsMutation.mutate(selectedQuizBook)}
                                disabled={isGenerating}
                                data-testid="button-generate-questions"
                                style={{ backgroundColor: "#b47a5f", color: "#ffffff" }}
                              >
                                {isGenerating ? (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                  <Plus className="w-4 h-4 mr-1" />
                                )}
                                Generate
                              </Button>
                            ) : (
                              <>
                                <Select value={addMoreCount} onValueChange={setAddMoreCount}>
                                  <SelectTrigger className="w-[60px] h-8" data-testid="select-add-more-count">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">1</SelectItem>
                                    <SelectItem value="2">2</SelectItem>
                                    <SelectItem value="3">3</SelectItem>
                                    <SelectItem value="4">4</SelectItem>
                                    <SelectItem value="5">5</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  onClick={() => addMoreQuestionsMutation.mutate({ 
                                    book: selectedQuizBook, 
                                    count: parseInt(addMoreCount) 
                                  })}
                                  disabled={isGenerating}
                                  data-testid="button-add-more-questions"
                                  style={{ backgroundColor: "#b47a5f", color: "#ffffff" }}
                                >
                                  {isGenerating ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <Plus className="w-4 h-4 mr-1" />
                                  )}
                                  Add
                                </Button>
                                {bookQuestions.some(q => q.isApproved === 0) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => approveAllMutation.mutate(selectedQuizBook)}
                                    data-testid="button-approve-all"
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (confirm(`Reset all quiz results for ${selectedQuizBook}? This will clear all scores for this book.`)) {
                                      resetResultsMutation.mutate(selectedQuizBook);
                                    }
                                  }}
                                  disabled={resetResultsMutation.isPending}
                                  data-testid="button-reset-results"
                                  className="text-destructive hover:text-destructive"
                                >
                                  {resetResultsMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-4 h-4" />
                                  )}
                                </Button>
                              </>
                            )}
                          </div>
                        </div>

                        {bookQuestions.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No questions yet.</p>
                            <p className="text-sm">Click "Generate 10 Questions" to create questions using AI.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {bookQuestions.map((question, index) => (
                              <div
                                key={question.id}
                                className={`p-3 rounded-lg border ${
                                  question.isApproved === 1
                                    ? "border-green-500/50 bg-green-50/50"
                                    : "border-yellow-500/50 bg-yellow-50/50"
                                }`}
                                data-testid={`question-item-${question.id}`}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium mb-1">
                                      {index + 1}. {question.questionText}
                                    </p>
                                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                                      <span className={question.correctAnswer === "A" ? "text-green-600 font-medium" : ""}>
                                        A: {question.optionA}
                                      </span>
                                      <span className={question.correctAnswer === "B" ? "text-green-600 font-medium" : ""}>
                                        B: {question.optionB}
                                      </span>
                                      <span className={question.correctAnswer === "C" ? "text-green-600 font-medium" : ""}>
                                        C: {question.optionC}
                                      </span>
                                      <span className={question.correctAnswer === "D" ? "text-green-600 font-medium" : ""}>
                                        D: {question.optionD}
                                      </span>
                                    </div>
                                    {question.scriptureReference && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Ref: {question.scriptureReference}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex gap-1">
                                    {question.isApproved === 0 && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onClick={() => approveQuestionMutation.mutate(question.id)}
                                        data-testid={`approve-question-${question.id}`}
                                      >
                                        <Check className="w-4 h-4 text-green-600" />
                                      </Button>
                                    )}
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      onClick={() => deleteQuestionMutation.mutate(question.id)}
                                      data-testid={`delete-question-${question.id}`}
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>Select a book from the left to manage its quiz questions.</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "take-quiz" && isFoundational && !isAdmin && (
            <div className="-mx-6">
              <BibleQuizSection />
            </div>
          )}

          {activeSection === "worship" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Music className="w-6 h-6" style={{ color: "#b47a5f" }} />
                  <div>
                    <CardTitle>Manage Worship Playlist</CardTitle>
                    <CardDescription>
                      Add YouTube videos to the worship music section. Videos will also be synced to the church's YouTube playlist if connected.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <WorshipPlaylistManager />
              </CardContent>
            </Card>
          )}

          {activeSection === "users" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6" style={{ color: "#b47a5f" }} />
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>View and manage user accounts and their roles.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#b47a5f" }} />
                  </div>
                ) : allUsers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No users found.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allUsers.map((u) => (
                      <div 
                        key={u.id} 
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        data-testid={`user-row-${u.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#b47a5f" }}>
                            <span className="text-white font-medium text-sm">
                              {u.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{u.username}</p>
                            {u.email && (
                              <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                            )}
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              {u.role === "superadmin" && <Shield className="w-3 h-3 text-amber-600" />}
                              {u.role === "admin" && <Shield className="w-3 h-3" />}
                              {u.role === "foundational" && <UserCheck className="w-3 h-3" />}
                              {u.role === "superadmin" ? "super admin" : u.role}
                            </p>
                          </div>
                        </div>
                        
                        {/* Show controls only if not viewing yourself AND target is not superadmin AND (you're admin OR the target user is not an admin) */}
                        {user?.id !== u.id && u.role !== "superadmin" && (isAdmin || u.role !== "admin") && (
                          <div className="flex flex-col sm:flex-row sm:flex-nowrap gap-2 w-full sm:w-auto">
                            <Select
                              value={u.role}
                              onValueChange={(newRole) => {
                                updateUserRoleMutation.mutate({ userId: u.id, role: newRole });
                              }}
                              disabled={updateUserRoleMutation.isPending}
                            >
                              <SelectTrigger className="w-full sm:w-[130px]" data-testid={`select-role-${u.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={USER_ROLES.MEMBER}>Member</SelectItem>
                                <SelectItem value={USER_ROLES.FOUNDATIONAL}>Foundational</SelectItem>
                                {isAdmin && (
                                  <SelectItem value={USER_ROLES.ADMIN}>Admin</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                              {u.googleId ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled
                                  data-testid={`button-google-sso-${u.id}`}
                                  className="opacity-60 cursor-not-allowed w-full sm:w-[130px] justify-center"
                                >
                                  <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
                                    <path
                                      fill="#4285F4"
                                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                      fill="#34A853"
                                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                      fill="#FBBC05"
                                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                      fill="#EA4335"
                                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                  </svg>
                                  Google SSO
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => resetPasswordMutation.mutate(u.id)}
                                  disabled={resetPasswordMutation.isPending}
                                  data-testid={`button-reset-password-${u.id}`}
                                  title="Reset password to Jerrick#1"
                                  className="w-full sm:w-[130px] justify-center"
                                >
                                  <Key className="w-4 h-4 mr-1" />
                                  Password Reset
                                </Button>
                              )}
                              {u.role !== "superadmin" && (isSuperAdmin || (isAdmin && u.role !== "admin")) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setUserToDelete({ id: u.id, username: u.username });
                                    setDeleteConfirmText("");
                                    setDeleteDialogOpen(true);
                                  }}
                                  disabled={deleteUserMutation.isPending}
                                  data-testid={`button-delete-user-${u.id}`}
                                  title="Delete user"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {user?.id === u.id && (
                          <span className="text-sm text-muted-foreground px-3 py-1 rounded-full bg-muted">
                            You
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeSection === "events" && <EventsManagementTab />}

          {activeSection === "settings" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Settings className="w-6 h-6" style={{ color: "#b47a5f" }} />
                  <div>
                    <CardTitle>{isAdmin ? "Site Settings" : "Profile Settings"}</CardTitle>
                    <CardDescription>
                      {isAdmin 
                        ? "Configure site-wide settings, meeting links, and your profile."
                        : "Manage your account settings and profile."
                      }
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                {(isAdmin || isFoundational) && (
                  <div className="space-y-6">
                    {isAdmin && (
                      <div>
                        <h3 className="font-medium mb-2">Zoom Meeting Link</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          This link will be displayed on the Live Stream page for members to join the Zoom meeting.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Input
                            id="zoom-link"
                            data-testid="input-zoom-link"
                            value={zoomLinkInput}
                            onChange={(e) => setZoomLinkInput(e.target.value)}
                            placeholder="https://zoom.us/j/..."
                            className="flex-1"
                          />
                          <Button
                            onClick={() => updateZoomLinkMutation.mutate(zoomLinkInput)}
                            disabled={updateZoomLinkMutation.isPending || !zoomLinkInput}
                            style={{ backgroundColor: "#b47a5f", color: "#ffffff" }}
                            data-testid="button-save-zoom-link"
                            className="w-full sm:w-auto"
                          >
                            {updateZoomLinkMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <Save className="w-4 h-4 mr-2" />
                            )}
                            Save
                          </Button>
                        </div>
                        {zoomData?.zoomLink && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Current link: <a href={zoomData.zoomLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{zoomData.zoomLink}</a>
                          </p>
                        )}
                      </div>
                    )}

                    {isAdmin && (
                      <div className="border-t pt-6">
                        <h3 className="font-medium mb-2">Alternative Zoom Meeting Link</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Set an alternative meeting link for specific days. On selected days, visitors will see this link instead of the main one.
                        </p>
                        <div className="space-y-4">
                          <div className="flex gap-3">
                            <Input
                              id="alternative-zoom-link"
                              data-testid="input-alternative-zoom-link"
                              value={alternativeZoomLink}
                              onChange={(e) => setAlternativeZoomLink(e.target.value)}
                              placeholder="https://zoom.us/j/... (alternative link)"
                              className="flex-1"
                            />
                          </div>
                          <div className="border rounded-lg p-4 bg-muted/30">
                            <p className="text-sm font-medium mb-2">Configure alternative link schedule:</p>
                            <p className="text-xs text-muted-foreground mb-4">
                              Click a day to enable it, then select Day (6 AM - 5:59 PM) or Night (6 PM - 5:59 AM) for that day.
                            </p>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2 mb-4">
                              {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => toggleDayInSchedule(day)}
                                  data-testid={`button-toggle-day-${day.toLowerCase()}`}
                                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors border ${
                                    isDaySelected(day)
                                      ? "text-white border-[#b47a5f]"
                                      : "bg-white text-gray-700 border-gray-300 hover:border-[#b47a5f]"
                                  }`}
                                  style={isDaySelected(day) ? { backgroundColor: "#b47a5f" } : {}}
                                >
                                  {day.slice(0, 3)}
                                </button>
                              ))}
                            </div>
                            {alternativeZoomSchedule.length > 0 && (
                              <div className="space-y-3">
                                <p className="text-sm font-medium">Time slots for selected days:</p>
                                {alternativeZoomSchedule.map(({ day }) => (
                                  <div key={day} className="p-3 bg-white rounded-lg border">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium">{day}</span>
                                      {!isSlotSelectedForDay(day, "day") && !isSlotSelectedForDay(day, "night") && (
                                        <span className="text-xs text-muted-foreground">(all day)</span>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <button
                                        type="button"
                                        onClick={() => toggleSlotForDay(day, "day")}
                                        data-testid={`button-toggle-${day.toLowerCase()}-day`}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
                                          isSlotSelectedForDay(day, "day")
                                            ? "text-white border-[#b47a5f]"
                                            : "bg-white text-gray-700 border-gray-300 hover:border-[#b47a5f]"
                                        }`}
                                        style={isSlotSelectedForDay(day, "day") ? { backgroundColor: "#b47a5f" } : {}}
                                      >
                                        Day
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => toggleSlotForDay(day, "night")}
                                        data-testid={`button-toggle-${day.toLowerCase()}-night`}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
                                          isSlotSelectedForDay(day, "night")
                                            ? "text-white border-[#8b5a47]"
                                            : "bg-white text-gray-700 border-gray-300 hover:border-[#b47a5f]"
                                        }`}
                                        style={isSlotSelectedForDay(day, "night") ? { backgroundColor: "#8b5a47" } : {}}
                                      >
                                        Night
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            onClick={() => updateAlternativeZoomMutation.mutate({ 
                              alternativeLink: alternativeZoomLink, 
                              schedule: alternativeZoomSchedule
                            })}
                            disabled={updateAlternativeZoomMutation.isPending}
                            style={{ backgroundColor: "#b47a5f", color: "#ffffff" }}
                            data-testid="button-save-alternative-zoom"
                            className="w-full sm:w-auto"
                          >
                            {updateAlternativeZoomMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <Save className="w-4 h-4 mr-2" />
                            )}
                            Save Alternative Settings
                          </Button>
                          {alternativeZoomData?.alternativeLink && (
                            <p className="text-sm text-muted-foreground">
                              Current alternative: <a href={alternativeZoomData.alternativeLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{alternativeZoomData.alternativeLink}</a>
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className={isAdmin ? "border-t pt-6" : ""}>
                      <h3 className="font-medium mb-2">Refresh YouTube Playlist</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        The YouTube playlist is cached for 1 hour to reduce API calls. Click below to manually refresh the worship music section if new videos were added.
                      </p>
                      <Button
                        onClick={async () => {
                          try {
                            const response = await fetch("/api/youtube/playlist/PLkDsdLHKY8laSsy8xYfILnVzFMedR0Rgy/refresh", {
                              method: "POST",
                              credentials: "include",
                            });
                            if (response.ok) {
                              const data = await response.json();
                              toast({
                                title: "Playlist Refreshed",
                                description: `Successfully loaded ${data.videoCount} videos from YouTube.`,
                              });
                            } else {
                              const error = await response.json();
                              toast({
                                title: "Refresh Failed",
                                description: error.error || "Failed to refresh playlist. YouTube quota may be exceeded.",
                                variant: "destructive",
                              });
                            }
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to refresh playlist.",
                              variant: "destructive",
                            });
                          }
                        }}
                        variant="outline"
                        data-testid="button-refresh-playlist"
                        className="w-full sm:w-auto"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh Playlist
                      </Button>
                    </div>
                  </div>
                )}

                <div className={isAdmin ? "border-t pt-6" : ""}>
                  <div className="flex items-center gap-3 mb-4">
                    <UserIcon className="w-5 h-5" style={{ color: "#b47a5f" }} />
                    <h3 className="font-medium text-lg">Profile Settings</h3>
                  </div>
                  
                  {/* Account Info Section */}
                  <div className="bg-muted/30 rounded-lg p-4 space-y-3 mb-6">
                    <h4 className="font-medium flex items-center gap-2">
                      <UserIcon className="w-4 h-4" style={{ color: "#b47a5f" }} />
                      Account Information
                    </h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-border/50 gap-1">
                        <span className="text-muted-foreground">Username:</span>
                        <span className="font-medium break-all" data-testid="text-profile-username">{user?.username || "N/A"}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 gap-1">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium break-all" data-testid="text-profile-email">{user?.email || "Not set"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-4">Update Username</h4>
                      <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                        <Input
                          id="profile-username"
                          data-testid="input-profile-username"
                          value={profileUsername}
                          onChange={(e) => setProfileUsername(e.target.value)}
                          placeholder="Enter new username"
                          className="flex-1"
                        />
                        <Button
                          onClick={() => updateUsernameMutation.mutate(profileUsername)}
                          disabled={updateUsernameMutation.isPending || !profileUsername || profileUsername === user?.username}
                          style={{ backgroundColor: "#b47a5f", color: "#ffffff" }}
                          data-testid="button-update-username"
                          className="w-full sm:w-auto"
                        >
                          {updateUsernameMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          Update
                        </Button>
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <h4 className="font-medium mb-3">Date of Birth</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Add your birthday and we'll create an event in the Family Events section to celebrate with you!
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <DatePicker
                          id="profile-dob"
                          data-testid="input-profile-dob"
                          value={profileDateOfBirth}
                          onChange={(value) => setProfileDateOfBirth(value)}
                          placeholder="Select your birthday"
                          className="flex-1 max-w-md"
                          disableFuture
                        />
                        <Button
                          onClick={() => updateDateOfBirthMutation.mutate(profileDateOfBirth)}
                          disabled={updateDateOfBirthMutation.isPending || !profileDateOfBirth || profileDateOfBirth === dobData?.dateOfBirth}
                          style={{ backgroundColor: "#b47a5f", color: "#ffffff" }}
                          data-testid="button-save-dob"
                        >
                          {updateDateOfBirthMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          Save Birthday
                        </Button>
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <h4 className="font-medium mb-4">Change Password</h4>
                      {user?.googleId ? (
                        <div className="bg-muted/50 rounded-lg p-4 text-muted-foreground">
                          <p className="flex items-center gap-2">
                            <Key className="w-4 h-4" />
                            Password changes are not available for Google Sign-In accounts.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-w-md">
                          <div className="space-y-2">
                            <Label htmlFor="current-password">Current Password</Label>
                            <div className="relative">
                              <Input
                                id="current-password"
                                data-testid="input-current-password"
                                type={showCurrentPassword ? "text" : "password"}
                                value={profileCurrentPassword}
                                onChange={(e) => setProfileCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                data-testid="button-toggle-current-password"
                              >
                                {showCurrentPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <div className="relative">
                              <Input
                                id="new-password"
                                data-testid="input-new-password"
                                type={showNewPassword ? "text" : "password"}
                                value={profileNewPassword}
                                onChange={(e) => setProfileNewPassword(e.target.value)}
                                placeholder="Enter new password (min 6 characters)"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                data-testid="button-toggle-new-password"
                              >
                                {showNewPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                            <div className="relative">
                              <Input
                                id="confirm-password"
                                data-testid="input-confirm-password"
                                type={showConfirmNewPassword ? "text" : "password"}
                                value={profileConfirmPassword}
                                onChange={(e) => setProfileConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                                data-testid="button-toggle-confirm-new-password"
                              >
                                {showConfirmNewPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <Button
                            onClick={handleChangePassword}
                            disabled={changePasswordMutation.isPending || !profileCurrentPassword || !profileNewPassword || !profileConfirmPassword}
                            style={{ backgroundColor: "#b47a5f", color: "#ffffff" }}
                            data-testid="button-change-password"
                            className="w-full sm:w-auto"
                          >
                            {changePasswordMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <Key className="w-4 h-4 mr-2" />
                            )}
                            Change Password
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          </div>
        </main>
      </div>

      <VideoPlayerModal 
        video={selectedVideo} 
        open={isPlayerOpen} 
        onClose={() => {
          setIsPlayerOpen(false);
          setSelectedVideo(null);
        }} 
      />

      <VideoEditModal 
        video={selectedVideo} 
        open={isEditOpen} 
        onClose={() => {
          setIsEditOpen(false);
          setSelectedVideo(null);
        }} 
      />

      <ImageCropper
        open={isCropperOpen}
        onOpenChange={setIsCropperOpen}
        imageSrc={cropImageSrc}
        onCropComplete={handleCropComplete}
        onRemoveCrop={handleRemoveCrop}
        showRemoveCrop={photoCropWasCropped}
        aspectRatio={16 / 9}
        title="Adjust Photo for Carousel"
        description="Portrait photos may get cropped in the carousel. Adjust the crop area to select which part of the image to display."
      />

      {/* Portrait Photo Crop Prompt Dialog */}
      <Dialog open={showCropPrompt} onOpenChange={setShowCropPrompt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Portrait Photo Detected
            </DialogTitle>
            <DialogDescription>
              This photo is in portrait orientation (taller than wide). It will need to be cropped to fit properly in the carousel which uses a 16:9 landscape format.
            </DialogDescription>
          </DialogHeader>
          {pendingCropPhoto?.url && (
            <div className="my-4 flex justify-center">
              <div className="relative w-32 h-48 rounded-lg overflow-hidden border-2 border-amber-500/50">
                <img 
                  src={pendingCropPhoto.url} 
                  alt="Uploaded photo preview" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleSkipCrop}>
              Crop Later
            </Button>
            <Button 
              onClick={handleCropNow}
              style={{ backgroundColor: "#b47a5f", color: "#ffffff" }}
            >
              <Crop className="w-4 h-4 mr-2" />
              Crop Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user with a specific role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-username">Username</Label>
              <Input
                id="new-username"
                data-testid="input-new-username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Password</Label>
              <Input
                id="new-password"
                data-testid="input-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role">Role</Label>
              <Select value={newUserRole} onValueChange={setNewUserRole}>
                <SelectTrigger data-testid="select-new-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={USER_ROLES.MEMBER}>Member (Quiz results only)</SelectItem>
                  <SelectItem value={USER_ROLES.FOUNDATIONAL}>Foundational (Add/edit content)</SelectItem>
                  <SelectItem value={USER_ROLES.ADMIN}>Admin (Full access)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateUserOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => createUserMutation.mutate({ 
                username: newUsername, 
                password: newPassword, 
                role: newUserRole 
              })}
              disabled={!newUsername || !newPassword || createUserMutation.isPending}
              style={{ backgroundColor: "#b47a5f", color: "#ffffff" }}
              data-testid="button-confirm-create-user"
            >
              {createUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={user?.mustChangePassword === 1}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" style={{ color: "#b47a5f" }} />
              Password Change Required
            </DialogTitle>
            <DialogDescription>
              Your password has been reset by an administrator. Please create a new password to continue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="force-new-password">New Password</Label>
              <Input
                id="force-new-password"
                data-testid="input-force-new-password"
                type="password"
                value={forceNewPassword}
                onChange={(e) => setForceNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="force-confirm-password">Confirm Password</Label>
              <Input
                id="force-confirm-password"
                data-testid="input-force-confirm-password"
                type="password"
                value={forceConfirmPassword}
                onChange={(e) => setForceConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleForcePasswordChange}
              disabled={!forceNewPassword || !forceConfirmPassword || forcePasswordChangeMutation.isPending}
              style={{ backgroundColor: "#b47a5f", color: "#ffffff" }}
              data-testid="button-force-change-password"
            >
              {forcePasswordChangeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Change Password
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) {
          setUserToDelete(null);
          setDeleteConfirmText("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete user "{userToDelete?.username}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">Type "confirm" to proceed</Label>
              <Input
                id="delete-confirm"
                data-testid="input-delete-confirm"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type confirm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setUserToDelete(null);
                setDeleteConfirmText("");
              }}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (userToDelete && deleteConfirmText.toLowerCase() === "confirm") {
                  deleteUserMutation.mutate(userToDelete.id);
                  setDeleteDialogOpen(false);
                  setUserToDelete(null);
                  setDeleteConfirmText("");
                }
              }}
              disabled={deleteConfirmText.toLowerCase() !== "confirm" || deleteUserMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-confirm-delete"
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
