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
import { BookOpen, Camera, ClipboardList, LogOut, Loader2, Trash2, Clock, CheckCircle, XCircle } from "lucide-react";
import type { UploadResult } from "@uppy/core";

interface MemberPhoto {
  id: number;
  userId: string;
  imagePath: string;
  caption: string | null;
  status: string;
  createdAt: string;
}

export function MemberDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoSignedUrls, setPhotoSignedUrls] = useState<Record<number, string>>({});

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
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold">My Account</h1>
            <p className="text-muted-foreground">
              Welcome, <span className="font-medium">{user?.username}</span>
            </p>
          </div>
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

        <Tabs defaultValue="quiz" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
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
            <TabsTrigger value="questionnaire" data-testid="tab-questionnaire" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Questionnaire</span>
              <span className="sm:hidden">Survey</span>
            </TabsTrigger>
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
                    onUploadComplete={handlePhotoUpload}
                    acceptedFileTypes={["image/*"]}
                    maxFileSize={10 * 1024 * 1024}
                    uploadPath="member-photos"
                  />
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
        </Tabs>
      </div>
    </div>
  );
}
