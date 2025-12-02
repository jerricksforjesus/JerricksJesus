// Referenced from blueprint: javascript_object_storage (public file uploading pattern)
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError, getSignedDownloadURL } from "./objectStorage";
import { insertVideoSchema, insertVerseSchema, insertPhotoSchema, insertQuizQuestionSchema, insertQuizAttemptSchema, ALL_BIBLE_BOOKS, USER_ROLES, type User } from "@shared/schema";
import { transcribeVideo, uploadCaptions } from "./transcription";
import { generateQuestionsForBook } from "./quizGenerator";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.sessionToken;
  if (!token) {
    return next();
  }
  
  try {
    const session = await storage.getSessionByToken(token);
    if (session) {
      const user = await storage.getUser(session.userId);
      if (user) {
        req.user = user;
      }
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
  }
  
  next();
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Apply auth middleware to all routes
  app.use(authMiddleware);
  
  const objectStorageService = new ObjectStorageService();
  
  // ==================== AUTH ROUTES ====================
  
  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      
      // Create session
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      await storage.createSession({
        userId: user.id,
        token,
        expiresAt,
      });
      
      // Set cookie
      res.cookie("sessionToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      
      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          role: user.role 
        } 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
  
  // Logout
  app.post("/api/auth/logout", async (req, res) => {
    try {
      const token = req.cookies?.sessionToken;
      if (token) {
        await storage.deleteSession(token);
      }
      res.clearCookie("sessionToken");
      res.json({ success: true });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });
  
  // Get current user
  app.get("/api/auth/me", (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json({ 
      user: { 
        id: req.user.id, 
        username: req.user.username, 
        role: req.user.role 
      } 
    });
  });
  
  // Register new user (admin can create foundational members, anyone can register as member)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, role } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }
      
      // Determine role
      let userRole = USER_ROLES.MEMBER;
      
      // Only admins can create foundational members or other admins
      if (role === USER_ROLES.FOUNDATIONAL || role === USER_ROLES.ADMIN) {
        if (!req.user || req.user.role !== USER_ROLES.ADMIN) {
          return res.status(403).json({ error: "Only admins can create elevated accounts" });
        }
        userRole = role;
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        role: userRole,
      });
      
      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          role: user.role 
        } 
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Google OAuth - Initiate login
  app.get("/api/auth/google", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: "Google OAuth not configured" });
    }
    
    // Generate state parameter for CSRF protection
    const state = crypto.randomBytes(32).toString("hex");
    res.cookie("oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60 * 1000, // 10 minutes
    });
    
    // Determine the redirect URI based on the request origin
    const host = req.get("host") || "";
    const protocol = req.protocol === "https" || host.includes("replit") ? "https" : "http";
    const redirectUri = `${protocol}://${host}/api/auth/google/callback`;
    
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "select_account");
    authUrl.searchParams.set("state", state);
    
    res.redirect(authUrl.toString());
  });

  // Google OAuth - Callback
  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      // Validate state parameter to prevent CSRF
      const savedState = req.cookies?.oauth_state;
      res.clearCookie("oauth_state");
      
      if (!state || state !== savedState) {
        return res.redirect("/login?error=invalid_state");
      }
      
      if (!code || typeof code !== "string") {
        return res.redirect("/login?error=no_code");
      }
      
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        return res.redirect("/login?error=config");
      }
      
      // Determine the redirect URI based on the request origin
      const host = req.get("host") || "";
      const protocol = req.protocol === "https" || host.includes("replit") ? "https" : "http";
      const redirectUri = `${protocol}://${host}/api/auth/google/callback`;
      
      // Exchange code for tokens
      const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      
      // Verify ID token and get user info
      const ticket = await oauth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: clientId,
      });
      
      const payload = ticket.getPayload();
      if (!payload || !payload.sub) {
        return res.redirect("/login?error=invalid_token");
      }
      
      const googleId = payload.sub;
      const email = payload.email;
      const name = payload.name || email?.split("@")[0] || `user_${googleId.slice(-8)}`;
      
      // Check if user exists with this Google ID
      let user = await storage.getUserByGoogleId(googleId);
      
      if (!user) {
        // Check if user exists with same email (link accounts)
        if (email) {
          user = await storage.getUserByEmail(email);
          if (user) {
            // Update existing user with Google ID - for now create new to avoid conflicts
          }
        }
        
        // Create new user
        // Generate a unique username from the name
        let username = name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 20);
        let existingUser = await storage.getUserByUsername(username);
        let counter = 1;
        while (existingUser) {
          username = `${name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 15)}_${counter}`;
          existingUser = await storage.getUserByUsername(username);
          counter++;
        }
        
        user = await storage.createUser({
          username,
          googleId,
          email: email || undefined,
          role: USER_ROLES.MEMBER,
        });
      }
      
      // Create session
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      await storage.createSession({
        userId: user.id,
        token,
        expiresAt,
      });
      
      // Set cookie
      res.cookie("sessionToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production" || host.includes("replit"),
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      
      // Redirect to home page
      res.redirect("/");
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      res.redirect("/login?error=auth_failed");
    }
  });
  
  // Admin/Foundational: Get all users
  app.get("/api/admin/users", requireAuth, async (req, res) => {
    try {
      // Only admin and foundational members can view users
      if (req.user!.role !== USER_ROLES.ADMIN && req.user!.role !== USER_ROLES.FOUNDATIONAL) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const allUsers = await storage.getAllUsers();
      // Return users without passwords
      const users = allUsers.map(u => ({
        id: u.id,
        username: u.username,
        role: u.role,
      }));
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  
  // Admin/Foundational: Update user role
  app.patch("/api/admin/users/:id/role", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const currentUser = req.user!;
      
      // Validate role
      if (!Object.values(USER_ROLES).includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      
      // Get target user
      const targetUser = await storage.getUser(id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Prevent users from changing their own role
      if (currentUser.id === id) {
        return res.status(403).json({ error: "Cannot change your own role" });
      }
      
      // Admin can set any role
      if (currentUser.role === USER_ROLES.ADMIN) {
        const updated = await storage.updateUserRole(id, role);
        return res.json({ 
          id: updated!.id, 
          username: updated!.username, 
          role: updated!.role 
        });
      }
      
      // Foundational members can only promote to foundational (not admin)
      if (currentUser.role === USER_ROLES.FOUNDATIONAL) {
        if (role === USER_ROLES.ADMIN) {
          return res.status(403).json({ error: "Only admins can create admin accounts" });
        }
        // Foundational can't demote other foundational members or admins
        if (targetUser.role === USER_ROLES.ADMIN || targetUser.role === USER_ROLES.FOUNDATIONAL) {
          return res.status(403).json({ error: "Cannot modify this user's role" });
        }
        const updated = await storage.updateUserRole(id, role);
        return res.json({ 
          id: updated!.id, 
          username: updated!.username, 
          role: updated!.role 
        });
      }
      
      return res.status(403).json({ error: "Access denied" });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ error: "Failed to update user role" });
    }
  });

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

  // ============= QUIZ ROUTES =============
  
  // Get list of all Bible books
  app.get("/api/quiz/books", async (req, res) => {
    try {
      const questionCounts = await storage.getQuestionCountByBook();
      const countsMap = new Map(questionCounts.map(q => [q.book, q]));
      
      const books = ALL_BIBLE_BOOKS.map(book => ({
        name: book,
        questionCount: countsMap.get(book)?.count || 0,
        approvedCount: countsMap.get(book)?.approvedCount || 0,
        hasQuiz: (countsMap.get(book)?.approvedCount || 0) >= 1,
      }));
      
      res.json(books);
    } catch (error) {
      console.error("Error fetching quiz books:", error);
      res.status(500).json({ error: "Failed to fetch books" });
    }
  });

  // Get questions for a specific book (for taking the quiz)
  app.get("/api/quiz/questions/:book", async (req, res) => {
    try {
      const { book } = req.params;
      const questions = await storage.getQuestionsByBook(book, true);
      
      // Shuffle and return only 10 questions (hide correct answers for quiz taking)
      const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, 10);
      
      const quizQuestions = shuffled.map(q => ({
        id: q.id,
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        scriptureReference: q.scriptureReference,
      }));
      
      res.json(quizQuestions);
    } catch (error) {
      console.error("Error fetching quiz questions:", error);
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  // Check a single answer for immediate feedback
  app.post("/api/quiz/check-answer", async (req, res) => {
    try {
      const { questionId, selectedAnswer } = req.body;
      
      if (!questionId || !selectedAnswer) {
        return res.status(400).json({ error: "Missing questionId or selectedAnswer" });
      }
      
      const question = await storage.getQuestionById(questionId);
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }
      
      const isCorrect = question.correctAnswer === selectedAnswer;
      
      res.json({ 
        correct: isCorrect, 
        correctAnswer: question.correctAnswer 
      });
    } catch (error) {
      console.error("Error checking answer:", error);
      res.status(500).json({ error: "Failed to check answer" });
    }
  });

  // Submit quiz answers and get score
  app.post("/api/quiz/submit", async (req, res) => {
    try {
      const { book, answers } = req.body;
      
      if (!book || !answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      
      const questions = await storage.getQuestionsByBook(book, true);
      const questionMap = new Map(questions.map(q => [q.id, q]));
      
      let score = 0;
      const results = answers.map((answer: { questionId: number; selectedAnswer: string }) => {
        const question = questionMap.get(answer.questionId);
        if (!question) return { questionId: answer.questionId, correct: false, correctAnswer: null };
        
        const isCorrect = question.correctAnswer === answer.selectedAnswer;
        if (isCorrect) score++;
        
        return {
          questionId: answer.questionId,
          correct: isCorrect,
          correctAnswer: question.correctAnswer,
          scriptureReference: question.scriptureReference,
        };
      });
      
      // Save the attempt - include userId if user is logged in
      await storage.createQuizAttempt({
        book,
        score,
        totalQuestions: answers.length,
        userId: req.user?.id || null,
      });
      
      res.json({ score, totalQuestions: answers.length, results });
    } catch (error) {
      console.error("Error submitting quiz:", error);
      res.status(500).json({ error: "Failed to submit quiz" });
    }
  });
  
  // Get user's quiz history
  app.get("/api/quiz/my-history", requireAuth, async (req, res) => {
    try {
      const attempts = await storage.getQuizAttemptsByUser(req.user!.id);
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching quiz history:", error);
      res.status(500).json({ error: "Failed to fetch quiz history" });
    }
  });

  // Get quiz statistics
  app.get("/api/quiz/stats", async (req, res) => {
    try {
      const attempts = await storage.getAllQuizAttempts();
      const questionCounts = await storage.getQuestionCountByBook();
      
      const totalQuestions = questionCounts.reduce((sum, q) => sum + q.count, 0);
      const approvedQuestions = questionCounts.reduce((sum, q) => sum + q.approvedCount, 0);
      const booksWithQuiz = questionCounts.filter(q => q.approvedCount >= 1).length;
      
      res.json({
        totalQuestions,
        approvedQuestions,
        booksWithQuiz,
        totalBooks: 66,
        totalAttempts: attempts.length,
      });
    } catch (error) {
      console.error("Error fetching quiz stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Admin: Get all questions for a book (including unapproved)
  app.get("/api/admin/quiz/questions/:book", async (req, res) => {
    try {
      const { book } = req.params;
      const questions = await storage.getQuestionsByBook(book, false);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching admin questions:", error);
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  // Admin: Generate questions for a book
  app.post("/api/admin/quiz/generate/:book", async (req, res) => {
    try {
      const { book } = req.params;
      const { count = 10 } = req.body;
      
      if (!ALL_BIBLE_BOOKS.includes(book as any)) {
        return res.status(400).json({ error: "Invalid book name" });
      }
      
      console.log(`Starting question generation for ${book}...`);
      
      const questions = await generateQuestionsForBook(book, count);
      const savedQuestions = await storage.createQuestions(questions);
      
      res.json({ 
        message: `Generated ${savedQuestions.length} questions for ${book}`,
        questions: savedQuestions,
      });
    } catch (error) {
      console.error("Error generating questions:", error);
      res.status(500).json({ error: "Failed to generate questions" });
    }
  });

  // Admin: Bulk generate questions for all books
  app.post("/api/admin/quiz/generate-all", async (req, res) => {
    try {
      const { skipExisting = true } = req.body;
      
      console.log("Starting bulk question generation for all 66 books...");
      
      // Get current question counts to skip books that already have questions
      const existingCounts = await storage.getQuestionCountByBook();
      const existingBooks = new Set(
        existingCounts
          .filter((b: { book: string; count: number }) => b.count >= 10)
          .map((b: { book: string; count: number }) => b.book)
      );
      
      const booksToGenerate = skipExisting 
        ? ALL_BIBLE_BOOKS.filter(book => !existingBooks.has(book))
        : ALL_BIBLE_BOOKS;
      
      console.log(`Will generate for ${booksToGenerate.length} books (skipping ${existingBooks.size} with existing questions)`);
      
      const results: { book: string; success: boolean; count?: number; error?: string }[] = [];
      let successCount = 0;
      let failCount = 0;
      
      // Process books sequentially with small delay to avoid rate limiting
      for (const book of booksToGenerate) {
        try {
          console.log(`Generating questions for ${book} (${results.length + 1}/${booksToGenerate.length})...`);
          
          const questions = await generateQuestionsForBook(book, 10);
          const savedQuestions = await storage.createQuestions(questions);
          
          results.push({ book, success: true, count: savedQuestions.length });
          successCount++;
          
          console.log(`✓ ${book}: Generated ${savedQuestions.length} questions`);
          
          // Small delay between books to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          console.error(`✗ ${book}: Failed - ${errorMessage}`);
          results.push({ book, success: false, error: errorMessage });
          failCount++;
        }
      }
      
      console.log(`Bulk generation complete: ${successCount} success, ${failCount} failed`);
      
      res.json({
        message: `Generated questions for ${successCount} books (${failCount} failed)`,
        totalBooks: booksToGenerate.length,
        successCount,
        failCount,
        skippedCount: existingBooks.size,
        results,
      });
    } catch (error) {
      console.error("Error in bulk generation:", error);
      res.status(500).json({ error: "Failed to generate questions" });
    }
  });

  // Admin: Approve a single question
  app.post("/api/admin/quiz/approve/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.approveQuestion(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error approving question:", error);
      res.status(500).json({ error: "Failed to approve question" });
    }
  });

  // Admin: Approve all questions for a book
  app.post("/api/admin/quiz/approve-book/:book", async (req, res) => {
    try {
      const { book } = req.params;
      await storage.approveQuestionsByBook(book);
      res.json({ success: true });
    } catch (error) {
      console.error("Error approving questions:", error);
      res.status(500).json({ error: "Failed to approve questions" });
    }
  });

  // Admin: Update a question
  app.put("/api/admin/quiz/questions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parsed = insertQuizQuestionSchema.partial().safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      
      const updated = await storage.updateQuestion(id, parsed.data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating question:", error);
      res.status(500).json({ error: "Failed to update question" });
    }
  });

  // Admin: Delete a question
  app.delete("/api/admin/quiz/questions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteQuestion(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({ error: "Failed to delete question" });
    }
  });

  // Admin: Delete all questions for a book
  app.delete("/api/admin/quiz/questions-book/:book", async (req, res) => {
    try {
      const { book } = req.params;
      await storage.deleteQuestionsByBook(book);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting questions:", error);
      res.status(500).json({ error: "Failed to delete questions" });
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
