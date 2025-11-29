// Referenced from blueprint: javascript_object_storage (public file uploading pattern)
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { insertVideoSchema, insertVerseSchema } from "@shared/schema";

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

  // Object Storage Serving Route (public access)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  return httpServer;
}
