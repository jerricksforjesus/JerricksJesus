import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { BibleQuizSection } from "@/components/BibleQuizSection";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { BookOpen, Camera, ClipboardList, LogOut, Loader2, Trash2, Clock, CheckCircle, XCircle, Upload, Key, Settings, Save, User as UserIcon, Music, Plus, ExternalLink, Cake } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import type { UploadResult } from "@uppy/core";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface MemberPhoto {
  id: number;
  userId: string;
  imagePath: string;
  caption: string | null;
  status: string;
  createdAt: string;
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
}

export function MemberDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoSignedUrls, setPhotoSignedUrls] = useState<Record<number, string>>({});
  
  // Force password change state
  const [forceNewPassword, setForceNewPassword] = useState("");
  const [forceConfirmPassword, setForceConfirmPassword] = useState("");

  // Profile settings state
  const [profileUsername, setProfileUsername] = useState(user?.username || "");
  const [profileCurrentPassword, setProfileCurrentPassword] = useState("");
  const [profileNewPassword, setProfileNewPassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [profileDateOfBirth, setProfileDateOfBirth] = useState("");

  // Fetch date of birth
  const { data: dobData } = useQuery<{ dateOfBirth: string | null }>({
    queryKey: ["profile-date-of-birth"],
    queryFn: async () => {
      const response = await fetch("/api/profile/date-of-birth", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch date of birth");
      return response.json();
    },
  });

  useEffect(() => {
    if (dobData?.dateOfBirth) {
      setProfileDateOfBirth(dobData.dateOfBirth);
    }
  }, [dobData]);

  const updateDateOfBirthMutation = useMutation({
    mutationFn: async (dateOfBirth: string) => {
      const response = await fetch("/api/profile/date-of-birth", {
        method: "PUT",
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
      queryClient.invalidateQueries({ queryKey: ["profile-date-of-birth"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

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

  // Profile mutations
  const updateUsernameMutation = useMutation({
    mutationFn: async (newUsername: string) => {
      const response = await fetch("/api/profile/username", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: newUsername }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update username");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Username Updated", description: "Your username has been updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to change password");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Password Changed", description: "Your password has been updated successfully." });
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
      toast({ title: "Error", description: "New password must be at least 6 characters", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: profileCurrentPassword,
      newPassword: profileNewPassword,
    });
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

  const { data: myPhotos = [], isLoading: loadingPhotos } = useQuery<MemberPhoto[]>({
    queryKey: ["my-member-photos"],
    queryFn: async () => {
      const response = await fetch("/api/member-photos/my", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch photos");
      return response.json();
    },
  });

  const { data: myMusicRequests = [], isLoading: loadingMusicRequests } = useQuery<WorshipRequest[]>({
    queryKey: ["worship-requests-my"],
    queryFn: async () => {
      const response = await fetch("/api/worship-requests/my", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch music requests");
      return response.json();
    },
  });

  const [musicYoutubeUrl, setMusicYoutubeUrl] = useState("");
  const [musicVideoInfo, setMusicVideoInfo] = useState<{ youtubeVideoId: string; title: string; thumbnailUrl: string | null } | null>(null);
  const [fetchingMusicInfo, setFetchingMusicInfo] = useState(false);

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

  const fetchVideoInfo = async (videoId: string) => {
    try {
      const response = await fetch(`/api/youtube/video/${videoId}`);
      if (response.ok) {
        const data = await response.json();
        return { youtubeVideoId: videoId, title: data.title, thumbnailUrl: data.thumbnailUrl };
      }
    } catch (e) {
      console.error("Failed to fetch video info:", e);
    }
    return { youtubeVideoId: videoId, title: `YouTube Video ${videoId}`, thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` };
  };

  const handleMusicUrlChange = async (url: string) => {
    setMusicYoutubeUrl(url);
    setMusicVideoInfo(null);
    const videoId = extractVideoId(url);
    if (videoId) {
      setFetchingMusicInfo(true);
      const info = await fetchVideoInfo(videoId);
      setMusicVideoInfo(info);
      setFetchingMusicInfo(false);
    }
  };

  const submitMusicRequestMutation = useMutation({
    mutationFn: async () => {
      if (!musicVideoInfo) throw new Error("No video info");
      const response = await fetch("/api/worship-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          youtubeUrl: musicYoutubeUrl,
          youtubeVideoId: musicVideoInfo.youtubeVideoId,
          title: musicVideoInfo.title,
          thumbnailUrl: musicVideoInfo.thumbnailUrl,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit request");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Request Submitted", description: "Your music request will be reviewed by an admin." });
      setMusicYoutubeUrl("");
      setMusicVideoInfo(null);
      queryClient.invalidateQueries({ queryKey: ["worship-requests-my"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const cancelMusicRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await fetch(`/api/worship-requests/${requestId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel request");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Request Cancelled", description: "Your music request has been cancelled." });
      queryClient.invalidateQueries({ queryKey: ["worship-requests-my"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    const fetchSignedUrls = async () => {
      for (const photo of myPhotos) {
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
    if (myPhotos.length > 0) {
      fetchSignedUrls();
    }
  }, [myPhotos]);

  const submitPhotoMutation = useMutation({
    mutationFn: async (data: { imagePath: string; caption: string }) => {
      const response = await fetch("/api/member-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to submit photo");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Photo Submitted", description: "Your photo has been submitted for approval." });
      queryClient.invalidateQueries({ queryKey: ["my-member-photos"] });
      setPhotoCaption("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit photo.", variant: "destructive" });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/member-photos/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete photo");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Photo Deleted", description: "Your photo has been removed." });
      queryClient.invalidateQueries({ queryKey: ["my-member-photos"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete photo.", variant: "destructive" });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", { method: "POST", credentials: "include" });
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handlePhotoUpload = async (result: UploadResult<any, any>) => {
    try {
      const uploadedFile = result.successful?.[0];
      if (!uploadedFile?.response?.body?.path) {
        throw new Error("Upload response missing path");
      }

      let objectPath = uploadedFile.response.body.path;
      if (!objectPath.startsWith("/objects/")) {
        objectPath = `/objects/${objectPath.replace(/^\/+/, "")}`;
      }

      submitPhotoMutation.mutate({
        imagePath: objectPath,
        caption: photoCaption,
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "The photo was uploaded but failed to save.",
        variant: "destructive",
      });
    }
  };

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

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending Approval";
      case "approved":
        return "Approved";
      case "rejected":
        return "Not Approved";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <Navigation />
      
      <div className="pt-32 pb-12 px-6 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold">My Account</h1>
          <p className="text-muted-foreground">
            Welcome, <span className="font-medium">{user?.username}</span>
          </p>
        </div>

        <Tabs defaultValue="quiz" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="quiz" data-testid="tab-quiz" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Bible Quiz</span>
              <span className="sm:hidden">Quiz</span>
            </TabsTrigger>
            <TabsTrigger value="photos" data-testid="tab-photos" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Family Photos</span>
              <span className="sm:hidden">Photos</span>
            </TabsTrigger>
            <TabsTrigger value="music" data-testid="tab-music" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              <span className="hidden sm:inline">Request Music</span>
              <span className="sm:hidden">Music</span>
            </TabsTrigger>
            <TabsTrigger value="questionnaire" data-testid="tab-questionnaire" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Questionnaire</span>
              <span className="sm:hidden">Survey</span>
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Settings</span>
            </TabsTrigger>
            <button
              onClick={handleLogout}
              data-testid="tab-logout"
              className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-muted rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log Out</span>
              <span className="sm:hidden">Exit</span>
            </button>
          </TabsList>

          <TabsContent value="quiz" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Bible Quiz</CardTitle>
                <CardDescription>
                  Test your knowledge of the Scriptures with our interactive quizzes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BibleQuizSection />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="photos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Upload Family Photos</CardTitle>
                <CardDescription>
                  Share your family moments with the congregation. Photos will be reviewed before appearing on the site.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="photo-caption">Photo Caption (optional)</Label>
                    <Input
                      id="photo-caption"
                      placeholder="Add a caption for your photo..."
                      value={photoCaption}
                      onChange={(e) => setPhotoCaption(e.target.value)}
                      data-testid="input-photo-caption"
                    />
                  </div>
                  
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={10 * 1024 * 1024}
                    allowedFileTypes={['image/*', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.avif']}
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handlePhotoUpload}
                    buttonClassName="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Add Photos to Family Album
                  </ObjectUploader>
                </div>

                {loadingPhotos ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--burnt-clay)" }} />
                  </div>
                ) : myPhotos.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">Your Submitted Photos</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {myPhotos.map((photo) => (
                        <Card key={photo.id} className="overflow-hidden">
                          <div className="aspect-square relative bg-muted">
                            {photoSignedUrls[photo.id] ? (
                              <img
                                src={photoSignedUrls[photo.id]}
                                alt={photo.caption || "Family photo"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(photo.status)}
                                <span className="text-sm text-muted-foreground">
                                  {getStatusText(photo.status)}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deletePhotoMutation.mutate(photo.id)}
                                data-testid={`button-delete-photo-${photo.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                            {photo.caption && (
                              <p className="text-sm mt-2 text-muted-foreground">{photo.caption}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>You haven't uploaded any photos yet.</p>
                    <p className="text-sm">Upload a photo above to share with the congregation!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="music" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Request Worship Music</CardTitle>
                <CardDescription>
                  Suggest new songs to add to our worship playlist. Your requests will be reviewed by church admins.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="music-youtube-url">YouTube Video URL</Label>
                    <Input
                      id="music-youtube-url"
                      placeholder="https://youtube.com/watch?v=..."
                      value={musicYoutubeUrl}
                      onChange={(e) => handleMusicUrlChange(e.target.value)}
                      data-testid="input-music-youtube-url"
                    />
                  </div>

                  {fetchingMusicInfo && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Fetching video info...
                    </div>
                  )}

                  {musicVideoInfo && (
                    <div className="border rounded-lg p-3 bg-muted/30">
                      <div className="flex gap-3">
                        {musicVideoInfo.thumbnailUrl && (
                          <img
                            src={musicVideoInfo.thumbnailUrl}
                            alt={musicVideoInfo.title}
                            className="w-24 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-2">{musicVideoInfo.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Video ID: {musicVideoInfo.youtubeVideoId}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => submitMusicRequestMutation.mutate()}
                    disabled={!musicVideoInfo || submitMusicRequestMutation.isPending}
                    style={{ backgroundColor: "#b47a5f", color: "#ffffff" }}
                    data-testid="button-submit-music-request"
                  >
                    {submitMusicRequestMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Submit Request
                  </Button>
                </div>

                {loadingMusicRequests ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--burnt-clay)" }} />
                  </div>
                ) : myMusicRequests.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">Your Music Requests</h3>
                    <div className="space-y-2">
                      {myMusicRequests.map((request) => (
                        <Card key={request.id} className="overflow-hidden">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-20 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                                {request.thumbnailUrl ? (
                                  <img
                                    src={request.thumbnailUrl}
                                    alt={request.title || "Video thumbnail"}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Music className="w-5 h-5 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm line-clamp-1">
                                  {request.title && !request.title.startsWith("YouTube Video ") 
                                    ? request.title 
                                    : "Untitled Video"}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {request.youtubeUrl}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(request.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {request.status === "pending" && (
                                  <>
                                    <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                                      <Clock className="w-3 h-3" />
                                      Pending
                                    </span>
                                    <button
                                      onClick={() => cancelMusicRequestMutation.mutate(request.id)}
                                      disabled={cancelMusicRequestMutation.isPending}
                                      className="text-xs text-red-600 hover:text-red-700 hover:underline disabled:opacity-50"
                                      data-testid={`button-cancel-request-${request.id}`}
                                    >
                                      Cancel Request
                                    </button>
                                  </>
                                )}
                                {request.status === "approved" && (
                                  <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                    <CheckCircle className="w-3 h-3" />
                                    Approved
                                  </span>
                                )}
                                {request.status === "rejected" && (
                                  <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                                    <XCircle className="w-3 h-3" />
                                    Rejected
                                  </span>
                                )}
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
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>You haven't submitted any music requests yet.</p>
                    <p className="text-sm">Paste a YouTube URL above to request a song!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questionnaire" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Family Questionnaire</CardTitle>
                <CardDescription>
                  Help us get to know your family better
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-30" style={{ color: "var(--burnt-clay)" }} />
                  <h3 className="text-xl font-serif mb-2" style={{ color: "var(--burnt-clay)" }}>
                    Coming Soon
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    We're preparing a family questionnaire to help us better serve our congregation. 
                    Check back soon!
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Settings className="w-6 h-6" style={{ color: "#b47a5f" }} />
                  <div>
                    <CardTitle className="font-serif">Profile Settings</CardTitle>
                    <CardDescription>Manage your account settings and password.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Account Info Section */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <h3 className="font-medium text-lg flex items-center gap-2">
                    <UserIcon className="w-5 h-5" style={{ color: "#b47a5f" }} />
                    Account Information
                  </h3>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Username:</span>
                      <span className="font-medium" data-testid="text-profile-username">{user?.username || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium" data-testid="text-profile-email">{user?.email || "Not set"}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6 space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <UserIcon className="w-5 h-5" style={{ color: "#b47a5f" }} />
                    <h3 className="font-medium text-lg">Update Username</h3>
                  </div>
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
                  <div className="flex items-center gap-3 mb-4">
                    <Cake className="w-5 h-5" style={{ color: "#b47a5f" }} />
                    <h3 className="font-medium text-lg">Date of Birth</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add your birthday to automatically create a birthday event for you each year.
                  </p>
                  <div className="flex gap-3 items-center max-w-md">
                    <DatePicker
                      value={profileDateOfBirth}
                      onChange={(value) => setProfileDateOfBirth(value)}
                      placeholder="Select your birthday"
                      data-testid="input-date-of-birth"
                      disableFuture={true}
                    />
                    <Button
                      onClick={() => updateDateOfBirthMutation.mutate(profileDateOfBirth)}
                      disabled={updateDateOfBirthMutation.isPending || !profileDateOfBirth || profileDateOfBirth === dobData?.dateOfBirth}
                      style={{ backgroundColor: "#b47a5f", color: "#ffffff" }}
                      data-testid="button-save-birthday"
                    >
                      {updateDateOfBirthMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-6 space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Key className="w-5 h-5" style={{ color: "#b47a5f" }} />
                    <h3 className="font-medium text-lg">Change Password</h3>
                  </div>
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
                        <Input
                          id="current-password"
                          data-testid="input-current-password"
                          type="password"
                          value={profileCurrentPassword}
                          onChange={(e) => setProfileCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          data-testid="input-new-password"
                          type="password"
                          value={profileNewPassword}
                          onChange={(e) => setProfileNewPassword(e.target.value)}
                          placeholder="Enter new password (min 6 characters)"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input
                          id="confirm-password"
                          data-testid="input-confirm-password"
                          type="password"
                          value={profileConfirmPassword}
                          onChange={(e) => setProfileConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                        />
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

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
    </div>
  );
}
