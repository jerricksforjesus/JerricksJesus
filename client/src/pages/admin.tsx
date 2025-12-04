import { Navigation } from "@/components/Navigation";
import { MemberDashboard } from "@/components/MemberDashboard";
import { BibleQuizSection } from "@/components/BibleQuizSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Upload, Pencil, Play, Image, BookOpen, Check, RefreshCw, Loader2, LogOut, UserPlus, Users, Shield, UserCheck, Camera, CheckCircle, XCircle, Clock, Settings, Key, User as UserIcon, Eye, EyeOff, Music, Youtube, Link2, ExternalLink, Menu, X, ChevronRight } from "lucide-react";
import { useState, useEffect, useLayoutEffect } from "react";
import { useLocation } from "wouter";
import { ObjectUploader } from "@/components/ObjectUploader";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
import { VideoEditModal } from "@/components/VideoEditModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import type { Video, Verse, InsertVideo, Photo, InsertPhoto, QuizQuestion, MemberPhoto } from "@shared/schema";
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

const fallbackImages = [thumb1, thumb2, thumb3];

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
  channelName?: string;
  channelId?: string;
  connectedAt?: string;
}

function WorshipPlaylistManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isAddingVideo, setIsAddingVideo] = useState(false);

  const { data: connectionStatus } = useQuery<YouTubeConnectionStatus>({
    queryKey: ["youtube-connection-status"],
    queryFn: async () => {
      const response = await fetch("/api/youtube/connection-status", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to check connection");
      return response.json();
    },
  });

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
              <p className="text-xs text-muted-foreground">
                Videos added will automatically sync to your YouTube playlist.
              </p>
              <Button variant="outline" size="sm" onClick={disconnectYouTube} data-testid="button-disconnect-youtube">
                Disconnect YouTube
              </Button>
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

      <div className="space-y-4">
        <h3 className="font-medium">Add Video to Playlist</h3>
        <form onSubmit={handleAddVideo} className="flex gap-3">
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
                className="flex items-center gap-4 p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
                data-testid={`worship-video-item-${video.id}`}
              >
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, logout, isAdmin, isFoundational, canEdit } = useAuth();
  
  const [verse, setVerse] = useState("");
  const [reference, setReference] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDate, setVideoDate] = useState("");
  const [videoDuration, setVideoDuration] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [photoCaption, setPhotoCaption] = useState("");
  const [selectedQuizBook, setSelectedQuizBook] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [addMoreCount, setAddMoreCount] = useState<string>("1");
  
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<string>(USER_ROLES.MEMBER);
  const [zoomLinkInput, setZoomLinkInput] = useState("");
  const [activeSection, setActiveSection] = useState("verse");
  const [isNavOpen, setIsNavOpen] = useState(false);

  const { data: zoomData, isLoading: zoomLoading } = useQuery<{ zoomLink: string }>({
    queryKey: ["zoom-link"],
    queryFn: async () => {
      const response = await fetch("/api/settings/zoom-link");
      if (!response.ok) throw new Error("Failed to fetch zoom link");
      return response.json();
    },
    enabled: canEdit,
  });

  useEffect(() => {
    if (zoomData?.zoomLink && !zoomLinkInput) {
      setZoomLinkInput(zoomData.zoomLink);
    }
  }, [zoomData]);

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
      toast({ title: "Zoom Link Updated", description: "The Zoom meeting link has been saved." });
      queryClient.invalidateQueries({ queryKey: ["zoom-link"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update Zoom link.", variant: "destructive" });
    },
  });

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

  type AdminUser = { id: string; username: string; role: string; googleId: string | null };

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

  // Initialize profile username when user loads
  useEffect(() => {
    if (user && !profileUsername) {
      setProfileUsername(user.username);
    }
  }, [user]);

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

  interface BookStatus {
    name: string;
    questionCount: number;
    approvedCount: number;
    hasQuiz: boolean;
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

    const photoData: InsertPhoto = {
      imagePath: imagePath,
      caption: photoCaption || undefined,
    };

    try {
      const response = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(photoData),
      });

      if (!response.ok) throw new Error("Failed to save photo");

      queryClient.invalidateQueries({ queryKey: ["photos"] });
      setPhotoCaption("");

      toast({
        title: "Photo Added",
        description: "The photo has been added to the family gallery.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "The photo was uploaded but failed to save.",
        variant: "destructive",
      });
    }
  };

  const getPhotoUrl = (photo: Photo) => {
    return photoSignedUrls[photo.id] || "";
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

  const navItems = [
    { id: "verse", label: "Daily Verse", icon: BookOpen },
    { id: "replays", label: "Sermon Replays", icon: Play },
    { id: "photos", label: "Family Photos", icon: Image },
    { id: "approve-photos", label: "Approve Photos", icon: CheckCircle },
    ...(isAdmin ? [{ id: "quiz", label: "Manage Quiz", icon: BookOpen }] : []),
    ...(isFoundational && !isAdmin ? [{ id: "take-quiz", label: "Take Quiz", icon: BookOpen }] : []),
    { id: "worship", label: "Worship Playlist", icon: Music },
    { id: "users", label: "Users", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
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
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    data-testid={`tab-${item.id}`}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                      activeSection === item.id
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
          
          <div className="p-3 border-t space-y-2">
            {isAdmin && (
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
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </div>
        </aside>

        {/* Mobile Navigation */}
        <div className="lg:hidden fixed top-20 left-0 right-0 z-30 bg-card border-b shadow-sm">
          <div className="p-3 flex items-center justify-between gap-3">
            <Select value={activeSection} onValueChange={setActiveSection}>
              <SelectTrigger className="flex-1" data-testid="mobile-section-select">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {navItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              {isAdmin && (
                <Button 
                  size="sm"
                  onClick={() => setIsCreateUserOpen(true)}
                  data-testid="button-create-user-mobile"
                  style={{ backgroundColor: "#b47a5f", color: "#ffffff" }}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout-mobile"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

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
                      <Input 
                        id="video-date" 
                        type="date"
                        value={videoDate}
                        onChange={(e) => setVideoDate(e.target.value)}
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
                    <CardDescription>Add photos to display on the homepage carousel.</CardDescription>
                  </div>
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {photos.length === 0 ? (
                    <p className="col-span-full text-center text-muted-foreground py-8">No photos uploaded yet.</p>
                  ) : (
                    photos.map((photo) => (
                      <div key={photo.id} className="relative group rounded-lg overflow-hidden border bg-card" data-testid={`photo-item-${photo.id}`}>
                        <div className="aspect-square bg-muted">
                          {getPhotoUrl(photo) ? (
                            <img 
                              src={getPhotoUrl(photo)} 
                              alt={photo.caption || "Family photo"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
                            </div>
                          )}
                        </div>
                        {photo.caption && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 truncate">
                            {photo.caption}
                          </div>
                        )}
                        {isAdmin && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deletePhotoMutation.mutate(photo.id)}
                            data-testid={`button-delete-photo-${photo.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
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
                        <div className="grid grid-cols-3 gap-1">
                          {quizBooks.filter(b => (BIBLE_BOOKS.oldTestament as readonly string[]).includes(b.name)).map((book) => (
                            <button
                              key={book.name}
                              onClick={() => setSelectedQuizBook(book.name)}
                              className={`text-xs p-2 rounded border transition-all ${
                                selectedQuizBook === book.name
                                  ? "border-primary bg-primary/10 text-primary"
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
                        <div className="grid grid-cols-3 gap-1">
                          {quizBooks.filter(b => (BIBLE_BOOKS.newTestament as readonly string[]).includes(b.name)).map((book) => (
                            <button
                              key={book.name}
                              onClick={() => setSelectedQuizBook(book.name)}
                              className={`text-xs p-2 rounded border transition-all ${
                                selectedQuizBook === book.name
                                  ? "border-primary bg-primary/10 text-primary"
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
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold">{selectedQuizBook}</h3>
                            {bookQuestions.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {bookQuestions.length} questions total
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 items-center">
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
                                Generate 10 Questions
                              </Button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Select value={addMoreCount} onValueChange={setAddMoreCount}>
                                  <SelectTrigger className="w-[70px] h-8" data-testid="select-add-more-count">
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
                                  Add More Questions
                                </Button>
                              </div>
                            )}
                            {bookQuestions.some(q => q.isApproved === 0) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => approveAllMutation.mutate(selectedQuizBook)}
                                data-testid="button-approve-all"
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Approve All
                              </Button>
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
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        data-testid={`user-row-${u.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#b47a5f" }}>
                            <span className="text-white font-medium text-sm">
                              {u.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{u.username}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              {u.role === "admin" && <Shield className="w-3 h-3" />}
                              {u.role === "foundational" && <UserCheck className="w-3 h-3" />}
                              {u.role}
                            </p>
                          </div>
                        </div>
                        
                        {/* Show controls only if not viewing yourself AND (you're admin OR the target user is not an admin) */}
                        {user?.id !== u.id && (isAdmin || u.role !== "admin") && (
                          <div className="flex items-center gap-2">
                            <Select
                              value={u.role}
                              onValueChange={(newRole) => {
                                updateUserRoleMutation.mutate({ userId: u.id, role: newRole });
                              }}
                              disabled={updateUserRoleMutation.isPending}
                            >
                              <SelectTrigger className="w-[150px]" data-testid={`select-role-${u.id}`}>
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
                            {u.googleId ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                data-testid={`button-google-sso-${u.id}`}
                                className="opacity-60 cursor-not-allowed"
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
                              >
                                <Key className="w-4 h-4 mr-1" />
                                Password Reset
                              </Button>
                            )}
                            {u.role !== "admin" && isAdmin && (
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
                        <div className="flex gap-3">
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
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">Update Username</h4>
                      <div className="flex gap-3">
                        <Input
                          id="profile-username"
                          data-testid="input-profile-username"
                          value={profileUsername}
                          onChange={(e) => setProfileUsername(e.target.value)}
                          placeholder="Enter new username"
                          className="flex-1 max-w-md"
                        />
                        <Button
                          onClick={() => updateUsernameMutation.mutate(profileUsername)}
                          disabled={updateUsernameMutation.isPending || !profileUsername || profileUsername === user?.username}
                          style={{ backgroundColor: "#b47a5f", color: "#ffffff" }}
                          data-testid="button-update-username"
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

                    <div className="border-t pt-6 space-y-4">
                      <h4 className="font-medium">Change Password</h4>
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
