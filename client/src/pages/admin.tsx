import { Navigation } from "@/components/Navigation";
import { MemberDashboard } from "@/components/MemberDashboard";
import { BibleQuizSection } from "@/components/BibleQuizSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Upload, Pencil, Play, Image, BookOpen, Check, RefreshCw, Loader2, LogOut, UserPlus, Users, Shield, UserCheck, Camera, CheckCircle, XCircle, Clock, Settings, Key, User as UserIcon } from "lucide-react";
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

  type AdminUser = { id: string; username: string; role: string };

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

  // Profile settings state
  const [profileUsername, setProfileUsername] = useState("");
  const [profileCurrentPassword, setProfileCurrentPassword] = useState("");
  const [profileNewPassword, setProfileNewPassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");

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

  return (
    <div className="min-h-screen bg-muted/20">
      <Navigation />
      
      <div className="pt-32 pb-12 px-6 max-w-5xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Logged in as <span className="font-medium">{user.username}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button 
                size="sm"
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
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </div>
        </div>

        <Tabs defaultValue="verse" className="w-full">
          <TabsList className={`grid w-full mb-8 ${isFoundational && !isAdmin ? 'grid-cols-9' : 'grid-cols-8'}`}>
            <TabsTrigger value="verse" data-testid="tab-verse">Verse</TabsTrigger>
            <TabsTrigger value="replays" data-testid="tab-replays">Replays</TabsTrigger>
            <TabsTrigger value="photos" data-testid="tab-photos">Photos</TabsTrigger>
            <TabsTrigger value="approve-photos" data-testid="tab-approve-photos">Approve Photos</TabsTrigger>
            <TabsTrigger value="quiz" data-testid="tab-quiz">Manage Quiz</TabsTrigger>
            {isFoundational && !isAdmin && (
              <TabsTrigger value="take-quiz" data-testid="tab-take-quiz">Take Quiz</TabsTrigger>
            )}
            <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
            <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="verse">
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
          </TabsContent>

          <TabsContent value="replays">
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
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                            onClick={() => deleteVideoMutation.mutate(video.id)}
                            data-testid={`button-delete-${video.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="photos">
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
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deletePhotoMutation.mutate(photo.id)}
                          data-testid={`button-delete-photo-${photo.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approve-photos">
            <ApprovePhotosTab />
          </TabsContent>

          <TabsContent value="quiz">
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
          </TabsContent>

          {isFoundational && !isAdmin && (
            <TabsContent value="take-quiz" className="-mx-6">
              <BibleQuizSection />
            </TabsContent>
          )}

          <TabsContent value="users">
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
                        
                        {user?.id !== u.id && (
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resetPasswordMutation.mutate(u.id)}
                              disabled={resetPasswordMutation.isPending}
                              data-testid={`button-reset-password-${u.id}`}
                              title="Reset password to Jerrick#1"
                            >
                              <Key className="w-4 h-4 mr-1" />
                              Reset
                            </Button>
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
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <UserIcon className="w-6 h-6" style={{ color: "#b47a5f" }} />
                  <div>
                    <CardTitle>Profile Settings</CardTitle>
                    <CardDescription>Manage your account settings and password.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Update Username</h3>
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
                  <h3 className="font-medium text-lg">Change Password</h3>
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

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Settings className="w-6 h-6" style={{ color: "#b47a5f" }} />
                  <div>
                    <CardTitle>Site Settings</CardTitle>
                    <CardDescription>Configure site-wide settings including meeting links.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
    </div>
  );
}
