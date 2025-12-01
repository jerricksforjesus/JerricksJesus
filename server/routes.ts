// Referenced from blueprint: javascript_object_storage (public file uploading pattern)
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError, getSignedDownloadURL } from "./objectStorage";
import { insertVideoSchema, insertVerseSchema, insertPhotoSchema } from "@shared/schema";
import { transcribeVideo, uploadCaptions } from "./transcription";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  const objectStorageService = new ObjectStorageService();

  // Video Upload Routes
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.post("/api/videos", async (req, res) => {
    try {
      const parsed = insertVideoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const normalizedPath = objectStorageService.normalizeObjectEntityPath(parsed.data.objectPath);
      const video = await storage.createVideo({
        ...parsed.data,
        objectPath: normalizedPath,
      });

      res.json(video);
    } catch (error) {
      console.error("Error creating video:", error);
      res.status(500).json({ error: "Failed to create video" });
    }
  });

  app.get("/api/videos", async (req, res) => {
    try {
      const videos = await storage.getAllVideos();
      res.json(videos);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ error: "Failed to fetch videos" });
    }
  });

  app.get("/api/videos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const video = await storage.getVideo(id);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      res.json(video);
    } catch (error) {
      console.error("Error fetching video:", error);
      res.status(500).json({ error: "Failed to fetch video" });
    }
  });

  app.put("/api/videos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { title, thumbnailPath } = req.body;
      
      const updateData: { title?: string; thumbnailPath?: string } = {};
      if (title) updateData.title = title;
      if (thumbnailPath !== undefined) {
        updateData.thumbnailPath = thumbnailPath ? 
          objectStorageService.normalizeObjectEntityPath(thumbnailPath) : 
          thumbnailPath;
      }
      
      const video = await storage.updateVideo(id, updateData);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      res.json(video);
    } catch (error) {
      console.error("Error updating video:", error);
      res.status(500).json({ error: "Failed to update video" });
    }
  });

  app.delete("/api/videos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteVideo(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting video:", error);
      res.status(500).json({ error: "Failed to delete video" });
    }
  });

  app.post("/api/videos/:id/view", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.incrementVideoViews(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error incrementing views:", error);
      res.status(500).json({ error: "Failed to increment views" });
    }
  });

  app.post("/api/videos/:id/generate-captions", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const video = await storage.getVideo(id);
      
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      
      if (video.captionStatus === "generating") {
        return res.status(409).json({ error: "Caption generation already in progress" });
      }
      
      await storage.updateVideoCaptionStatus(id, "generating");
      res.json({ message: "Caption generation started", status: "generating" });
      
      (async () => {
        try {
          console.log(`Starting caption generation for video ${id}...`);
          const vttContent = await transcribeVideo(video.objectPath);
          const captionsPath = await uploadCaptions(vttContent, id);
          await storage.updateVideoCaptions(id, captionsPath, "ready");
          console.log(`Captions generated successfully for video ${id}`);
        } catch (error) {
          console.error(`Caption generation failed for video ${id}:`, error);
          await storage.updateVideoCaptionStatus(id, "failed");
        }
      })();
      
    } catch (error) {
      console.error("Error starting caption generation:", error);
      res.status(500).json({ error: "Failed to start caption generation" });
    }
  });

  app.get("/api/videos/:id/caption-status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const video = await storage.getVideo(id);
      
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      
      res.json({
        status: video.captionStatus,
        captionsPath: video.captionsPath
      });
    } catch (error) {
      console.error("Error fetching caption status:", error);
      res.status(500).json({ error: "Failed to fetch caption status" });
    }
  });

  // Verse Management Routes
  app.get("/api/verses/active", async (req, res) => {
    try {
      const verse = await storage.getActiveVerse();
      if (!verse) {
        return res.status(404).json({ error: "No active verse found" });
      }
      res.json(verse);
    } catch (error) {
      console.error("Error fetching active verse:", error);
      res.status(500).json({ error: "Failed to fetch active verse" });
    }
  });

  app.get("/api/verses", async (req, res) => {
    try {
      const verses = await storage.getAllVerses();
      res.json(verses);
    } catch (error) {
      console.error("Error fetching verses:", error);
      res.status(500).json({ error: "Failed to fetch verses" });
    }
  });

  app.post("/api/verses", async (req, res) => {
    try {
      const parsed = insertVerseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const verse = await storage.createVerse(parsed.data);
      res.json(verse);
    } catch (error) {
      console.error("Error creating verse:", error);
      res.status(500).json({ error: "Failed to create verse" });
    }
  });

  app.put("/api/verses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const verse = await storage.updateVerse(id, req.body);
      if (!verse) {
        return res.status(404).json({ error: "Verse not found" });
      }
      res.json(verse);
    } catch (error) {
      console.error("Error updating verse:", error);
      res.status(500).json({ error: "Failed to update verse" });
    }
  });

  app.post("/api/verses/:id/activate", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.setActiveVerse(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error activating verse:", error);
      res.status(500).json({ error: "Failed to activate verse" });
    }
  });

  // Photo Management Routes
  app.get("/api/photos", async (req, res) => {
    try {
      const photos = await storage.getAllPhotos();
      res.json(photos);
    } catch (error) {
      console.error("Error fetching photos:", error);
      res.status(500).json({ error: "Failed to fetch photos" });
    }
  });

  app.post("/api/photos", async (req, res) => {
    try {
      const parsed = insertPhotoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const normalizedPath = objectStorageService.normalizeObjectEntityPath(parsed.data.imagePath);
      const photo = await storage.createPhoto({
        ...parsed.data,
        imagePath: normalizedPath,
      });
      res.json(photo);
    } catch (error) {
      console.error("Error creating photo:", error);
      res.status(500).json({ error: "Failed to create photo" });
    }
  });

  app.put("/api/photos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { caption, displayOrder } = req.body;
      
      const updateData: { caption?: string; displayOrder?: number } = {};
      if (caption !== undefined) updateData.caption = caption;
      if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
      
      const photo = await storage.updatePhoto(id, updateData);
      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }
      res.json(photo);
    } catch (error) {
      console.error("Error updating photo:", error);
      res.status(500).json({ error: "Failed to update photo" });
    }
  });

  app.delete("/api/photos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePhoto(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting photo:", error);
      res.status(500).json({ error: "Failed to delete photo" });
    }
  });

  // Get signed URL for video streaming (works in production without sidecar)
  app.get("/api/objects/signed-url", async (req, res) => {
    try {
      const objectPath = req.query.path as string;
      if (!objectPath || !objectPath.startsWith("/objects/")) {
        return res.status(400).json({ error: "Invalid object path" });
      }
      
      // Generate a signed URL valid for 1 hour (videos can be long)
      const signedUrl = await getSignedDownloadURL(objectPath, 3600);
      res.json({ url: signedUrl });
    } catch (error: any) {
      console.error("Error generating signed URL:", error?.message || error);
      res.status(500).json({ error: "Failed to generate signed URL" });
    }
  });

  // YouTube Live Status Route
  app.get("/api/youtube/live-status", async (req, res) => {
    try {
      const channelId = process.env.YOUTUBE_CHANNEL_ID;
      const apiKey = process.env.YOUTUBE_API_KEY;
      
      if (!channelId) {
        return res.json({ isLive: false, videoId: null, title: null });
      }
      
      if (!apiKey) {
        console.log("YouTube API key not configured, returning offline status");
        return res.json({ isLive: false, videoId: null, title: null });
      }
      
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${apiKey}`;
      
      const response = await fetch(searchUrl);
      if (!response.ok) {
        console.error("YouTube API error:", await response.text());
        return res.json({ isLive: false, videoId: null, title: null });
      }
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const liveVideo = data.items[0];
        return res.json({
          isLive: true,
          videoId: liveVideo.id.videoId,
          title: liveVideo.snippet.title
        });
      }
      
      return res.json({ isLive: false, videoId: null, title: null });
    } catch (error) {
      console.error("Error checking live status:", error);
      return res.json({ isLive: false, videoId: null, title: null });
    }
  });

  // YouTube Playlist Videos Cache
  let playlistCache: { videos: any[]; timestamp: number } | null = null;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // YouTube Playlist Route - Fetch videos from a specific playlist
  app.get("/api/youtube/playlist/:playlistId", async (req, res) => {
    try {
      const { playlistId } = req.params;
      const apiKey = process.env.YOUTUBE_API_KEY;
      
      if (!apiKey) {
        console.log("YouTube API key not configured");
        return res.json({ videos: [], error: "YouTube API key not configured" });
      }

      // Check cache
      if (playlistCache && Date.now() - playlistCache.timestamp < CACHE_DURATION) {
        return res.json({ videos: playlistCache.videos });
      }

      // Fetch playlist items from YouTube API
      const videos: any[] = [];
      let nextPageToken: string | null = null;

      do {
        const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
        url.searchParams.set("part", "snippet,contentDetails");
        url.searchParams.set("playlistId", playlistId);
        url.searchParams.set("maxResults", "50");
        url.searchParams.set("key", apiKey);
        if (nextPageToken) {
          url.searchParams.set("pageToken", nextPageToken);
        }

        const response = await fetch(url.toString());
        if (!response.ok) {
          const errorText = await response.text();
          console.error("YouTube API error:", errorText);
          return res.status(500).json({ error: "Failed to fetch playlist" });
        }

        const data = await response.json();
        
        for (const item of data.items || []) {
          videos.push({
            videoId: item.contentDetails.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
            publishedAt: item.snippet.publishedAt,
            position: item.snippet.position,
          });
        }

        nextPageToken = data.nextPageToken || null;
      } while (nextPageToken);

      // Update cache
      playlistCache = { videos, timestamp: Date.now() };

      res.json({ videos });
    } catch (error) {
      console.error("Error fetching playlist:", error);
      res.status(500).json({ error: "Failed to fetch playlist" });
    }
  });

  // CORS preflight handler for object storage
  app.options("/objects/:objectPath(*)", (req, res) => {
    res.set({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
      "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
      "Access-Control-Max-Age": "86400",
    });
    res.sendStatus(204);
  });

  // Object Storage Serving Route (public access with range request support for video seeking)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const startTime = Date.now();
    console.log(`[Object Serve] Starting request for: ${req.path}`);
    
    try {
      // Check environment variables first
      const privateDir = process.env.PRIVATE_OBJECT_DIR;
      console.log(`[Object Serve] PRIVATE_OBJECT_DIR: ${privateDir ? 'set' : 'NOT SET'}`);
      
      if (!privateDir) {
        console.error("[Object Serve] PRIVATE_OBJECT_DIR environment variable is not set!");
        return res.status(500).json({ 
          error: "Server misconfigured",
          message: "Storage configuration missing"
        });
      }
      
      console.log(`[Object Serve] Getting object entity file...`);
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      console.log(`[Object Serve] Object file found, streaming... (${Date.now() - startTime}ms)`);
      
      await objectStorageService.downloadObject(objectFile, res, req);
      console.log(`[Object Serve] Stream started (${Date.now() - startTime}ms)`);
    } catch (error: any) {
      console.error(`[Object Serve] Error for ${req.path}:`, error?.message || error);
      console.error(`[Object Serve] Stack:`, error?.stack);
      
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found", path: req.path });
      }
      
      // More specific error messages
      let errorMessage = "Unknown error";
      if (error?.message?.includes("ECONNREFUSED")) {
        errorMessage = "Storage service unavailable";
      } else if (error?.message?.includes("token")) {
        errorMessage = "Storage authentication failed";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      if (!res.headersSent) {
        return res.status(500).json({ 
          error: "Failed to serve object",
          path: req.path,
          message: errorMessage,
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  return httpServer;
}
