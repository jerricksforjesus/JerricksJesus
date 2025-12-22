import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { BibleQuizSection } from "@/components/BibleQuizSection";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { BookOpen, Camera, ClipboardList, LogOut, Loader2, Trash2, Clock, CheckCircle, XCircle, Upload, Key, Settings, Save, User as UserIcon, Music, Plus, ExternalLink, Cake, Menu, ChevronRight, X, Home } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import type { UploadResult } from "@uppy/core";
import { motion, AnimatePresence } from "framer-motion";
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
  
  // Navigation state
  const [activeSection, setActiveSection] = useState("quiz");
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
  
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

  // Navigation items for regular members
  const navItems: Array<{ id: string; label: string; icon: typeof BookOpen; action?: () => void | Promise<void> }> = [
    { id: "quiz", label: "Bible Quiz", icon: BookOpen },
    { id: "photos", label: "Family Photos", icon: Camera },
    { id: "music", label: "Request Music", icon: Music },
    { id: "questionnaire", label: "Questionnaire", icon: ClipboardList },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "logout", label: "Log Out", icon: LogOut, action: handleLogout },
  ];

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
      
      <div className="pt-20 lg:pt-24 flex min-h-[calc(100vh-5rem)]">
        {/* Desktop Sidebar - Always visible on large screens */}
        <aside className="hidden lg:flex w-64 flex-col bg-card border-r">
          <div className="p-6 border-b" style={{ backgroundColor: "#b47a5f" }}>
            <h1 className="text-xl font-serif font-bold text-white">Welcome</h1>
            <p className="text-sm text-white/80 mt-1">
              {user?.username}
            </p>
          </div>
          
          <nav className="flex-1 p-3 overflow-y-auto">
            <div className="space-y-1">
              {/* Return to Site */}
              <Link href="/">
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
                  data-testid="button-return-to-site"
                >
                  <Home className="w-4 h-4 flex-shrink-0" />
                  Return to Site
                </button>
              </Link>
              
              <div className="my-2 border-t" />
              
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
                    <h2 className="text-lg font-serif font-bold text-white">Welcome</h2>
                    <p className="text-sm text-white/80">{user?.username}</p>
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
                    
                    <div className="my-2 border-t" />
                    
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isLogout = item.id === "logout";
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.action) {
                              item.action();
                            } else {
                              setActiveSection(item.id);
                              setIsMobileSettingsOpen(false);
                            }
                          }}
                          data-testid={`tab-${item.id}-mobile`}
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
                  </div>
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
          <div className="p-6 max-w-4xl">
            {/* Quiz Section */}
            {activeSection === "quiz" && (
              <div className="space-y-6">
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
              </div>
            )}

            {/* Photos Section */}
            {activeSection === "photos" && (
              <div className="space-y-6">
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
              </div>
            )}

            {/* Music Section */}
            {activeSection === "music" && (
              <div className="space-y-6">
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
              </div>
            )}

            {/* Questionnaire Section */}
            {activeSection === "questionnaire" && (
              <div className="space-y-6">
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
              </div>
            )}

            {/* Settings Section */}
            {activeSection === "settings" && (
              <div className="space-y-6">
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

                <div className="border-t pt-6 space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <UserIcon className="w-5 h-5" style={{ color: "#b47a5f" }} />
                    <h3 className="font-medium text-lg">Update Username</h3>
                  </div>
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

                <div className="border-t pt-6 space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Cake className="w-5 h-5" style={{ color: "#b47a5f" }} />
                    <h3 className="font-medium text-lg">Date of Birth</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add your birthday to automatically create a birthday event for you each year.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center max-w-md">
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
                      className="w-full sm:w-auto"
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
              </div>
            )}
          </div>
        </main>
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
