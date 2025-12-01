import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Upload, Pencil, Play, Image, BookOpen, Check, RefreshCw, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
import { VideoEditModal } from "@/components/VideoEditModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Video, Verse, InsertVideo, Photo, InsertPhoto, QuizQuestion } from "@shared/schema";
import { ALL_BIBLE_BOOKS, BIBLE_BOOKS } from "@shared/schema";
import type { UploadResult } from "@uppy/core";
import thumb1 from "@assets/generated_images/preacher_at_podium.png";
import thumb2 from "@assets/generated_images/open_bible_on_table.png";
import thumb3 from "@assets/generated_images/warm_limestone_wall_texture.png";

const fallbackImages = [thumb1, thumb2, thumb3];

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
        description: "AI has generated quiz questions. Review and approve them.",
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

  return (
    <div className="min-h-screen bg-muted/20">
      <Navigation />
      
      <div className="pt-32 pb-12 px-6 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage website content and replays.</p>
        </div>

        <Tabs defaultValue="verse" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="verse" data-testid="tab-verse">Verse</TabsTrigger>
            <TabsTrigger value="replays" data-testid="tab-replays">Replays</TabsTrigger>
            <TabsTrigger value="photos" data-testid="tab-photos">Photos</TabsTrigger>
            <TabsTrigger value="quiz" data-testid="tab-quiz">Bible Quiz</TabsTrigger>
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
                {/* Bulk Actions */}
                <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <h3 className="font-semibold text-sm">Bulk Actions</h3>
                      <p className="text-xs text-muted-foreground">
                        Generate questions for all 66 books at once (one-time API cost)
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => generateAllMutation.mutate()}
                        disabled={bulkGenerating}
                        data-testid="button-generate-all-books"
                      >
                        {bulkGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Generate All Books
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => approveAllBooksMutation.mutate()}
                        disabled={quizBooks.every(b => b.approvedCount >= b.questionCount) || bulkGenerating}
                        data-testid="button-approve-all-books"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approve All Books
                      </Button>
                    </div>
                  </div>
                  {bulkProgress && (
                    <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-700">
                      {bulkProgress}
                    </div>
                  )}
                  <div className="mt-3 text-xs text-muted-foreground">
                    Status: {quizBooks.filter(b => b.questionCount > 0).length}/66 books have questions | 
                    {' '}{quizBooks.reduce((sum, b) => sum + b.approvedCount, 0)} approved questions total
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Book Selection */}
                  <div>
                    <h3 className="font-semibold mb-3">Select a Book</h3>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
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
                          <h3 className="font-semibold">{selectedQuizBook}</h3>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateQuestionsMutation.mutate(selectedQuizBook)}
                              disabled={isGenerating}
                              data-testid="button-generate-questions"
                            >
                              {isGenerating ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4 mr-1" />
                              )}
                              Generate
                            </Button>
                            {bookQuestions.some(q => q.isApproved === 0) && (
                              <Button
                                size="sm"
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
                            <p className="text-sm">Click "Generate" to create questions using AI.</p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[400px] overflow-y-auto">
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
    </div>
  );
}
