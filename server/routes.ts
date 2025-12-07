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
        return res.status(400).json({ error: "Username/email and password are required" });
      }
      
      // Try to find user by username first, then by email
      let user = await storage.getUserByUsername(username);
      if (!user) {
        user = await storage.getUserByEmail(username);
      }
      if (!user || !user.password) {
        return res.status(401).json({ error: "Invalid username/email or password" });
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
        role: req.user.role,
        googleId: req.user.googleId,
        mustChangePassword: req.user.mustChangePassword,
      } 
    });
  });
  
  // Register new user (admin can create foundational members, anyone can register as member)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password, role } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      
      // Email validation for regular user registration (not admin-created accounts)
      if (!role || role === USER_ROLES.MEMBER) {
        if (!email) {
          return res.status(400).json({ error: "Email is required" });
        }
        
        // Simple email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ error: "Invalid email format" });
        }
        
        // Check if email already exists
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ error: "Email already registered" });
        }
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
        email: email || null,
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

  // Helper function to get the OAuth redirect URI
  // Uses PUBLIC_APP_URL env var for production, falls back to request host for development
  function getOAuthRedirectUri(req: Request): string {
    const publicAppUrl = process.env.PUBLIC_APP_URL;
    if (publicAppUrl) {
      // Use configured production URL
      return `${publicAppUrl}/api/auth/google/callback`;
    }
    
    // Fallback: derive from request (for development)
    const host = req.get("host") || "";
    const forwardedProto = req.get("x-forwarded-proto");
    const isSecure = forwardedProto === "https" || req.protocol === "https" || host.includes("replit") || host.includes("jerricksforjesus");
    const protocol = isSecure ? "https" : "http";
    return `${protocol}://${host}/api/auth/google/callback`;
  }

  // Debug endpoint to check OAuth redirect URI (temporary)
  app.get("/api/auth/google/debug", (req, res) => {
    const redirectUri = getOAuthRedirectUri(req);
    const publicAppUrl = process.env.PUBLIC_APP_URL;
    const host = req.get("host") || "";
    
    res.json({
      publicAppUrl: publicAppUrl || "(not set - using dynamic detection)",
      host,
      redirectUri,
      message: "This is the redirect URI that will be sent to Google. Make sure it matches EXACTLY what's in your Google Console."
    });
  });

  // Google OAuth - Initiate login
  app.get("/api/auth/google", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: "Google OAuth not configured" });
    }
    
    const redirectUri = getOAuthRedirectUri(req);
    
    // Determine if we should use secure cookies
    const host = req.get("host") || "";
    const isSecure = process.env.PUBLIC_APP_URL?.startsWith("https") || 
                     req.get("x-forwarded-proto") === "https" || 
                     host.includes("replit") || 
                     host.includes("jerricksforjesus");
    
    // Log for debugging
    console.log("Google OAuth Debug:", { redirectUri, isSecure });
    
    // Generate state parameter for CSRF protection
    const state = crypto.randomBytes(32).toString("hex");
    res.cookie("oauth_state", state, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 10 * 60 * 1000, // 10 minutes
    });
    
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
      
      // Get the redirect URI (must match what was sent to Google)
      const redirectUri = getOAuthRedirectUri(req);
      
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
      
      // Check if user exists with this Google ID
      let user = await storage.getUserByGoogleId(googleId);
      
      if (!user) {
        // Check if user exists with same email (link accounts)
        if (email) {
          user = await storage.getUserByEmail(email);
          
          // Link Google ID to existing account
          if (user && !user.googleId) {
            await storage.linkGoogleAccount(user.id, googleId);
          }
        }
      }
      
      // If user doesn't exist, auto-create account with Google Sign-In
      if (!user) {
        // Generate username from email or Google profile name
        const name = payload.name || payload.given_name || "";
        let baseUsername = name.toLowerCase().replace(/[^a-z0-9]/g, "_") || email?.split("@")[0] || "user";
        
        // Ensure username is unique
        let username = baseUsername;
        let counter = 1;
        while (await storage.getUserByUsername(username)) {
          username = `${baseUsername}_${counter}`;
          counter++;
        }
        
        // Create new user with Google account
        user = await storage.createUser({
          username,
          email: email || null,
          password: null, // No password for Google-only accounts
          role: USER_ROLES.MEMBER,
          googleId,
        });
        
        console.log(`Created new user via Google Sign-In: ${username} (${email})`);
      }
      
      // Create session
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      await storage.createSession({
        userId: user.id,
        token,
        expiresAt,
      });
      
      // Determine if we should use secure cookies
      const reqHost = req.get("host") || "";
      const isSecure = process.env.NODE_ENV === "production" || reqHost.includes("replit");
      
      // Set cookie
      res.cookie("sessionToken", token, {
        httpOnly: true,
        secure: isSecure,
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

  // ============= YOUTUBE PLAYLIST OAUTH (Admin Only) =============
  
  const YOUTUBE_PLAYLIST_ID = "PLkDsdLHKY8laSsy8xYfILnVzFMedR0Rgy";
  
  // Check YouTube connection status
  app.get("/api/youtube/connection-status", requireAuth, requireRole(USER_ROLES.ADMIN, USER_ROLES.FOUNDATIONAL), async (req, res) => {
    try {
      const auth = await storage.getYoutubeAuth();
      if (!auth) {
        return res.json({ connected: false });
      }
      res.json({ 
        connected: true, 
        channelName: auth.channelName,
        channelId: auth.channelId,
        connectedAt: auth.createdAt,
      });
    } catch (error) {
      console.error("Error checking YouTube connection:", error);
      res.status(500).json({ error: "Failed to check connection status" });
    }
  });

  // Initiate YouTube OAuth (Admin only)
  app.get("/api/youtube/connect", requireAuth, requireRole(USER_ROLES.ADMIN), async (req, res) => {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        return res.status(500).json({ error: "Google OAuth not configured" });
      }

      const redirectUri = getOAuthRedirectUri(req).replace("/api/auth/google/callback", "/api/youtube/callback");
      const state = crypto.randomBytes(32).toString("hex");
      
      res.cookie("youtube_oauth_state", state, {
        httpOnly: true,
        secure: req.secure || req.headers["x-forwarded-proto"] === "https",
        sameSite: "lax",
        maxAge: 10 * 60 * 1000,
      });

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/youtube");
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("state", state);

      res.json({ authUrl: authUrl.toString() });
    } catch (error) {
      console.error("YouTube OAuth initiation error:", error);
      res.status(500).json({ error: "Failed to initiate YouTube connection" });
    }
  });

  // YouTube OAuth callback
  app.get("/api/youtube/callback", authMiddleware, async (req, res) => {
    try {
      const { code, state } = req.query;
      const savedState = req.cookies?.youtube_oauth_state;
      res.clearCookie("youtube_oauth_state");

      if (!code || !state || state !== savedState) {
        return res.redirect("/admin?youtube_error=invalid_state");
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return res.redirect("/admin?youtube_error=not_configured");
      }

      const redirectUri = getOAuthRedirectUri(req).replace("/api/auth/google/callback", "/api/youtube/callback");
      const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
      
      const { tokens } = await oauth2Client.getToken(code as string);
      oauth2Client.setCredentials(tokens);

      // Fetch channel info
      const channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true`,
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      );
      const channelData = await channelResponse.json();
      const channel = channelData.items?.[0];

      // Save the auth tokens
      await storage.saveYoutubeAuth({
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiresAt: new Date(tokens.expiry_date!),
        channelId: channel?.id || null,
        channelName: channel?.snippet?.title || null,
        connectedBy: req.user?.id || null,
      });

      console.log(`YouTube connected by admin: ${req.user?.username}, channel: ${channel?.snippet?.title}`);
      
      // Trigger initial playlist sync in the background (fire-and-forget)
      // This runs after we redirect, so the user sees the connected state immediately
      setTimeout(async () => {
        try {
          console.log("Starting initial YouTube playlist sync...");
          // Perform sync directly using stored tokens
          const auth = await storage.getYoutubeAuth();
          if (!auth) return;
          
          const videos: Array<{
            youtubeVideoId: string;
            title: string;
            description: string | null;
            thumbnailUrl: string | null;
            publishedAt: Date | null;
          }> = [];

          let nextPageToken: string | undefined;
          
          do {
            const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
            url.searchParams.set("part", "snippet,contentDetails");
            url.searchParams.set("playlistId", YOUTUBE_PLAYLIST_ID);
            url.searchParams.set("maxResults", "50");
            if (nextPageToken) {
              url.searchParams.set("pageToken", nextPageToken);
            }

            const response = await fetch(url.toString(), {
              headers: { "Authorization": `Bearer ${auth.accessToken}` },
            });

            if (!response.ok) {
              console.error("YouTube playlist fetch error during initial sync");
              return;
            }

            const data = await response.json();
            
            for (const item of data.items || []) {
              const snippet = item.snippet;
              const videoId = snippet.resourceId?.videoId || item.contentDetails?.videoId;
              
              // Skip placeholder items (deleted/private videos have no videoId)
              if (!videoId) {
                console.log(`Initial sync: Skipping item without videoId: ${snippet.title || 'unknown'}`);
                continue;
              }
              
              videos.push({
                youtubeVideoId: videoId,
                title: snippet.title || "Untitled Video",
                description: snippet.description || null,
                thumbnailUrl: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || null,
                publishedAt: snippet.publishedAt ? new Date(snippet.publishedAt) : null,
              });
            }

            nextPageToken = data.nextPageToken;
          } while (nextPageToken);

          const result = await storage.syncWorshipVideosFromPlaylist(videos);
          await storage.setSetting("youtube_last_sync", new Date().toISOString());
          console.log(`Initial YouTube playlist sync complete: ${result.created} created, ${result.updated} updated, ${result.deleted} deleted`);
        } catch (syncError) {
          console.error("Initial playlist sync failed:", syncError);
        }
      }, 1000);
      
      res.redirect("/admin?youtube_connected=true&sync_started=true");
    } catch (error) {
      console.error("YouTube OAuth callback error:", error);
      res.redirect("/admin?youtube_error=auth_failed");
    }
  });

  // Disconnect YouTube (Admin only)
  app.post("/api/youtube/disconnect", requireAuth, requireRole(USER_ROLES.ADMIN), async (req, res) => {
    try {
      await storage.deleteYoutubeAuth();
      res.json({ success: true });
    } catch (error) {
      console.error("Error disconnecting YouTube:", error);
      res.status(500).json({ error: "Failed to disconnect YouTube" });
    }
  });

  // Helper to get valid YouTube access token (refreshes if needed)
  async function getValidYoutubeToken(): Promise<string | null> {
    const auth = await storage.getYoutubeAuth();
    if (!auth) return null;

    // Check if token is expired or will expire in next 5 minutes
    const now = new Date();
    const expiresAt = new Date(auth.expiresAt);
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt > fiveMinutesFromNow) {
      return auth.accessToken;
    }

    // Refresh the token
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;

    try {
      const oauth2Client = new OAuth2Client(clientId, clientSecret);
      oauth2Client.setCredentials({ refresh_token: auth.refreshToken });
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      if (credentials.access_token && credentials.expiry_date) {
        await storage.updateYoutubeAuthTokens(
          credentials.access_token,
          new Date(credentials.expiry_date)
        );
        return credentials.access_token;
      }
    } catch (error) {
      console.error("Error refreshing YouTube token:", error);
    }

    return null;
  }

  // Get worship videos from database
  app.get("/api/worship-videos", async (req, res) => {
    try {
      const videos = await storage.getAllWorshipVideos();
      res.json(videos);
    } catch (error) {
      console.error("Error fetching worship videos:", error);
      res.status(500).json({ error: "Failed to fetch worship videos" });
    }
  });

  // Add video to worship playlist (Foundational/Admin only)
  app.post("/api/worship-videos", requireAuth, requireRole(USER_ROLES.ADMIN, USER_ROLES.FOUNDATIONAL), async (req, res) => {
    try {
      const { youtubeUrl } = req.body;
      
      if (!youtubeUrl) {
        return res.status(400).json({ error: "YouTube URL is required" });
      }

      // Extract video ID from URL
      const videoIdMatch = youtubeUrl.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
      if (!videoIdMatch) {
        return res.status(400).json({ error: "Invalid YouTube URL" });
      }
      const videoId = videoIdMatch[1];

      // Check if video already exists
      const existing = await storage.getWorshipVideoByYoutubeId(videoId);
      if (existing) {
        return res.status(400).json({ error: "This video is already in the playlist" });
      }

      // Get OAuth token for all YouTube operations (avoids API key referrer restrictions)
      const accessToken = await getValidYoutubeToken();
      if (!accessToken) {
        return res.status(400).json({ error: "YouTube channel not connected. Please connect YouTube first." });
      }

      // Fetch video info using OAuth token (no referrer restrictions)
      const videoResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}`,
        { headers: { "Authorization": `Bearer ${accessToken}` } }
      );
      
      if (!videoResponse.ok) {
        const errorData = await videoResponse.json();
        console.error("YouTube video fetch error:", errorData);
        return res.status(500).json({ error: "Failed to fetch video info from YouTube" });
      }
      
      const videoData = await videoResponse.json();
      const videoInfo = videoData.items?.[0];

      if (!videoInfo) {
        return res.status(404).json({ error: "Video not found on YouTube" });
      }

      // Add to YouTube playlist (using the same token)
      try {
        const playlistResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              snippet: {
                playlistId: YOUTUBE_PLAYLIST_ID,
                resourceId: {
                  kind: "youtube#video",
                  videoId: videoId,
                },
              },
            }),
          }
        );

        if (!playlistResponse.ok) {
          const errorData = await playlistResponse.json();
          console.error("YouTube playlist add error:", errorData);
          // Continue to save locally even if YouTube add fails
        } else {
          console.log(`Video ${videoId} added to YouTube playlist by ${req.user?.username}`);
        }
      } catch (error) {
        console.error("Error adding to YouTube playlist:", error);
        // Continue to save locally
      }

      // Save to our database
      const video = await storage.createWorshipVideo({
        youtubeVideoId: videoId,
        title: videoInfo.snippet.title,
        description: videoInfo.snippet.description,
        thumbnailUrl: videoInfo.snippet.thumbnails?.medium?.url || videoInfo.snippet.thumbnails?.default?.url,
        publishedAt: new Date(videoInfo.snippet.publishedAt),
        addedBy: req.user!.id,
      });

      res.json(video);
    } catch (error) {
      console.error("Error adding worship video:", error);
      res.status(500).json({ error: "Failed to add video" });
    }
  });

  // Remove video from worship playlist (Foundational/Admin only)
  app.delete("/api/worship-videos/:id", requireAuth, requireRole(USER_ROLES.ADMIN, USER_ROLES.FOUNDATIONAL), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const video = await storage.getWorshipVideo(id);
      
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      // Remove from YouTube playlist if connected
      const accessToken = await getValidYoutubeToken();
      if (accessToken) {
        try {
          // First, find the playlist item ID
          const listResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=id&playlistId=${YOUTUBE_PLAYLIST_ID}&videoId=${video.youtubeVideoId}`,
            { headers: { "Authorization": `Bearer ${accessToken}` } }
          );
          const listData = await listResponse.json();
          const playlistItemId = listData.items?.[0]?.id;

          if (playlistItemId) {
            await fetch(
              `https://www.googleapis.com/youtube/v3/playlistItems?id=${playlistItemId}`,
              {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${accessToken}` },
              }
            );
            console.log(`Video ${video.youtubeVideoId} removed from YouTube playlist by ${req.user?.username}`);
          }
        } catch (error) {
          console.error("Error removing from YouTube playlist:", error);
          // Continue to delete locally
        }
      }

      // Delete from our database
      await storage.deleteWorshipVideo(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting worship video:", error);
      res.status(500).json({ error: "Failed to delete video" });
    }
  });

  // Helper function to sync videos from YouTube playlist
  async function syncPlaylistFromYoutube(): Promise<{ created: number; updated: number; deleted: number } | null> {
    const accessToken = await getValidYoutubeToken();
    if (!accessToken) {
      console.log("No valid YouTube token for sync");
      return null;
    }

    try {
      const videos: Array<{
        youtubeVideoId: string;
        title: string;
        description: string | null;
        thumbnailUrl: string | null;
        publishedAt: Date | null;
      }> = [];

      let nextPageToken: string | undefined;
      
      // Fetch all playlist items (paginated)
      do {
        const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
        url.searchParams.set("part", "snippet,contentDetails");
        url.searchParams.set("playlistId", YOUTUBE_PLAYLIST_ID);
        url.searchParams.set("maxResults", "50");
        if (nextPageToken) {
          url.searchParams.set("pageToken", nextPageToken);
        }

        const response = await fetch(url.toString(), {
          headers: { "Authorization": `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("YouTube playlist fetch error:", errorData);
          throw new Error("Failed to fetch playlist from YouTube");
        }

        const data = await response.json();
        
        for (const item of data.items || []) {
          const snippet = item.snippet;
          const videoId = snippet.resourceId?.videoId || item.contentDetails?.videoId;
          
          // Skip placeholder items (deleted/private videos have no videoId)
          if (!videoId) {
            console.log(`Skipping playlist item without videoId: ${snippet.title || 'unknown'}`);
            continue;
          }
          
          videos.push({
            youtubeVideoId: videoId,
            title: snippet.title || "Untitled Video",
            description: snippet.description || null,
            thumbnailUrl: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || null,
            publishedAt: snippet.publishedAt ? new Date(snippet.publishedAt) : null,
          });
        }

        nextPageToken = data.nextPageToken;
      } while (nextPageToken);

      // Sync to database
      const result = await storage.syncWorshipVideosFromPlaylist(videos);
      console.log(`YouTube playlist sync complete: ${result.created} created, ${result.updated} updated, ${result.deleted} deleted`);
      
      // Update last sync timestamp
      await storage.setSetting("youtube_last_sync", new Date().toISOString());
      
      return result;
    } catch (error) {
      console.error("Error syncing YouTube playlist:", error);
      throw error;
    }
  }

  // Sync worship videos from YouTube playlist (Admin/Foundational only)
  app.post("/api/worship-videos/sync", requireAuth, requireRole(USER_ROLES.ADMIN, USER_ROLES.FOUNDATIONAL), async (req, res) => {
    try {
      // Check rate limit - only allow sync once per 5 minutes
      const lastSync = await storage.getSetting("youtube_last_sync");
      if (lastSync) {
        const lastSyncTime = new Date(lastSync);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (lastSyncTime > fiveMinutesAgo) {
          const waitSeconds = Math.ceil((lastSyncTime.getTime() + 5 * 60 * 1000 - Date.now()) / 1000);
          return res.status(429).json({ 
            error: `Please wait ${Math.ceil(waitSeconds / 60)} minute(s) before syncing again`,
            nextSyncAvailable: new Date(lastSyncTime.getTime() + 5 * 60 * 1000).toISOString(),
          });
        }
      }

      const result = await syncPlaylistFromYoutube();
      
      if (!result) {
        return res.status(400).json({ error: "YouTube channel not connected" });
      }

      res.json({
        success: true,
        ...result,
        message: `Synced ${result.created + result.updated} videos from YouTube playlist`,
      });
    } catch (error) {
      console.error("Error syncing worship videos:", error);
      res.status(500).json({ error: "Failed to sync playlist from YouTube" });
    }
  });

  // Get sync status
  app.get("/api/worship-videos/sync-status", requireAuth, requireRole(USER_ROLES.ADMIN, USER_ROLES.FOUNDATIONAL), async (req, res) => {
    try {
      const lastSync = await storage.getSetting("youtube_last_sync");
      const auth = await storage.getYoutubeAuth();
      
      res.json({
        connected: !!auth,
        channelName: auth?.channelName || null,
        lastSync: lastSync || null,
      });
    } catch (error) {
      console.error("Error getting sync status:", error);
      res.status(500).json({ error: "Failed to get sync status" });
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
        googleId: u.googleId || null,
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

  // Admin: Reset user password
  app.post("/api/admin/users/:id/reset-password", requireAuth, requireRole("admin", "foundational"), async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = req.user!;
      
      // Get target user
      const targetUser = await storage.getUser(id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Can't reset password for Google SSO users
      if (targetUser.googleId) {
        return res.status(400).json({ error: "Cannot reset password for Google SSO users" });
      }
      
      // Only admin can reset admin passwords
      if (targetUser.role === USER_ROLES.ADMIN && currentUser.role !== USER_ROLES.ADMIN) {
        return res.status(403).json({ error: "Only admins can reset admin passwords" });
      }
      
      // Hash the default password "Jerrick#1"
      const hashedPassword = await bcrypt.hash("Jerrick#1", 10);
      
      // Reset password with mustChangePassword flag set
      const updated = await storage.resetUserPassword(id, hashedPassword);
      
      res.json({ 
        success: true,
        message: "Password has been reset. User must change password on next login."
      });
    } catch (error) {
      console.error("Error resetting user password:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Admin: Delete user
  app.delete("/api/admin/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = req.user!;
      
      // Can't delete yourself
      if (id === currentUser.id) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }
      
      // Get target user
      const targetUser = await storage.getUser(id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Can't delete admin users
      if (targetUser.role === USER_ROLES.ADMIN) {
        return res.status(403).json({ error: "Cannot delete admin users" });
      }
      
      // Delete the user
      await storage.deleteUser(id);
      
      res.json({ 
        success: true,
        message: "User has been deleted."
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Profile: Update username
  app.patch("/api/profile/username", requireAuth, async (req, res) => {
    try {
      const { username } = req.body;
      const userId = req.user!.id;
      
      if (!username || typeof username !== "string" || username.length < 3) {
        return res.status(400).json({ error: "Username must be at least 3 characters" });
      }
      
      // Check if username is already taken
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: "Username is already taken" });
      }
      
      const updated = await storage.updateUsername(userId, username);
      if (!updated) {
        return res.status(500).json({ error: "Failed to update username" });
      }
      
      res.json({ 
        success: true,
        user: {
          id: updated.id,
          username: updated.username,
          role: updated.role,
          googleId: updated.googleId,
          mustChangePassword: updated.mustChangePassword,
        }
      });
    } catch (error) {
      console.error("Error updating username:", error);
      res.status(500).json({ error: "Failed to update username" });
    }
  });

  // Profile: Change password
  app.patch("/api/profile/password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = req.user!;
      
      // Can't change password for Google SSO users
      if (user.googleId) {
        return res.status(400).json({ error: "Password changes not available for Google SSO users" });
      }
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters" });
      }
      
      // Verify current password
      const fullUser = await storage.getUser(user.id);
      if (!fullUser || !fullUser.password) {
        return res.status(400).json({ error: "Cannot verify current password" });
      }
      
      const passwordMatch = await bcrypt.compare(currentPassword, fullUser.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      
      // Hash and update new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updated = await storage.updateUserPassword(user.id, hashedPassword);
      
      if (!updated) {
        return res.status(500).json({ error: "Failed to update password" });
      }
      
      res.json({ 
        success: true,
        message: "Password updated successfully"
      });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  // Force password change on login
  app.post("/api/profile/force-change-password", requireAuth, async (req, res) => {
    try {
      const { newPassword } = req.body;
      const user = req.user!;
      
      // Only allow this if mustChangePassword is set
      if (user.mustChangePassword !== 1) {
        return res.status(400).json({ error: "Password change not required" });
      }
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters" });
      }
      
      // Hash and update new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updated = await storage.updateUserPassword(user.id, hashedPassword);
      
      if (!updated) {
        return res.status(500).json({ error: "Failed to update password" });
      }
      
      res.json({ 
        success: true,
        message: "Password updated successfully",
        user: {
          id: updated.id,
          username: updated.username,
          role: updated.role,
          googleId: updated.googleId,
          mustChangePassword: updated.mustChangePassword,
        }
      });
    } catch (error) {
      console.error("Error force changing password:", error);
      res.status(500).json({ error: "Failed to change password" });
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

  app.delete("/api/videos/:id", requireAuth, requireRole("admin"), async (req, res) => {
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

  // Site Settings Routes (Zoom Link, etc.)
  app.get("/api/settings/zoom-link", async (req, res) => {
    try {
      const zoomLink = await storage.getSetting("zoom_link");
      res.json({ zoomLink: zoomLink || "" });
    } catch (error) {
      console.error("Error fetching zoom link:", error);
      res.status(500).json({ error: "Failed to fetch zoom link" });
    }
  });

  app.put("/api/settings/zoom-link", requireAuth, requireRole("admin", "foundational"), async (req, res) => {
    try {
      const { zoomLink } = req.body;
      if (typeof zoomLink !== "string") {
        return res.status(400).json({ error: "Invalid zoom link" });
      }
      await storage.setSetting("zoom_link", zoomLink);
      res.json({ success: true, zoomLink });
    } catch (error) {
      console.error("Error updating zoom link:", error);
      res.status(500).json({ error: "Failed to update zoom link" });
    }
  });

  // Service Times - GET
  app.get("/api/settings/service-times", async (req, res) => {
    try {
      const serviceTimesJson = await storage.getSetting("service_times");
      if (serviceTimesJson) {
        res.json(JSON.parse(serviceTimesJson));
      } else {
        // Default service times
        res.json([
          { day: "Friday", time: "6:00 AM", timezone: "EST" },
          { day: "Friday", time: "6:00 PM", timezone: "EST" }
        ]);
      }
    } catch (error) {
      console.error("Error fetching service times:", error);
      res.status(500).json({ error: "Failed to fetch service times" });
    }
  });

  // Service Times - PUT (Admin/Foundational only)
  app.put("/api/settings/service-times", requireAuth, requireRole("admin", "foundational"), async (req, res) => {
    try {
      const { serviceTimes } = req.body;
      if (!Array.isArray(serviceTimes)) {
        return res.status(400).json({ error: "Service times must be an array" });
      }
      await storage.setSetting("service_times", JSON.stringify(serviceTimes));
      res.json({ success: true, serviceTimes });
    } catch (error) {
      console.error("Error updating service times:", error);
      res.status(500).json({ error: "Failed to update service times" });
    }
  });

  // Footer Info - GET (Returns all footer data in one call for mobile app)
  app.get("/api/settings/footer", async (req, res) => {
    try {
      // Default footer structure
      const defaultFooter = {
        churchName: "JERRICKS FOR JESUS",
        tagline: "A sanctuary for the digital age. Bringing the word of God to wherever you are.",
        address: {
          line1: "99 Hillside Avenue Suite F",
          line2: "Williston Park NY 11596"
        },
        contact: {
          email: "family@jerricksforjesus.com",
          phone: "516-240-5503"
        },
        copyright: "© 2024 Jerricks for Jesus. All rights reserved."
      };

      const footerJson = await storage.getSetting("footer_info");
      if (footerJson) {
        const stored = JSON.parse(footerJson);
        // Merge with defaults to ensure proper structure
        res.json({
          churchName: stored.churchName || defaultFooter.churchName,
          tagline: stored.tagline || defaultFooter.tagline,
          address: {
            line1: stored.address?.line1 || defaultFooter.address.line1,
            line2: stored.address?.line2 || defaultFooter.address.line2
          },
          contact: {
            email: stored.contact?.email || defaultFooter.contact.email,
            phone: stored.contact?.phone || defaultFooter.contact.phone
          },
          copyright: stored.copyright || defaultFooter.copyright
        });
      } else {
        res.json(defaultFooter);
      }
    } catch (error) {
      console.error("Error fetching footer info:", error);
      res.status(500).json({ error: "Failed to fetch footer info" });
    }
  });

  // Footer Info - PUT (Admin/Foundational only)
  app.put("/api/settings/footer", requireAuth, requireRole("admin", "foundational"), async (req, res) => {
    try {
      const { footer } = req.body;
      if (!footer || typeof footer !== "object") {
        return res.status(400).json({ error: "Footer info must be an object" });
      }
      await storage.setSetting("footer_info", JSON.stringify(footer));
      res.json({ success: true, footer });
    } catch (error) {
      console.error("Error updating footer info:", error);
      res.status(500).json({ error: "Failed to update footer info" });
    }
  });

  // Church Info - GET
  app.get("/api/settings/church-info", async (req, res) => {
    try {
      const churchInfoJson = await storage.getSetting("church_info");
      if (churchInfoJson) {
        res.json(JSON.parse(churchInfoJson));
      } else {
        // Default church info
        res.json({
          name: "Jerricks for Jesus",
          address: "",
          email: "jerricksforjesus@gmail.com",
          phone: ""
        });
      }
    } catch (error) {
      console.error("Error fetching church info:", error);
      res.status(500).json({ error: "Failed to fetch church info" });
    }
  });

  // Church Info - PUT (Admin/Foundational only)
  app.put("/api/settings/church-info", requireAuth, requireRole("admin", "foundational"), async (req, res) => {
    try {
      const { churchInfo } = req.body;
      if (!churchInfo || typeof churchInfo !== "object") {
        return res.status(400).json({ error: "Church info must be an object" });
      }
      await storage.setSetting("church_info", JSON.stringify(churchInfo));
      res.json({ success: true, churchInfo });
    } catch (error) {
      console.error("Error updating church info:", error);
      res.status(500).json({ error: "Failed to update church info" });
    }
  });

  // Ministries - GET
  app.get("/api/settings/ministries", async (req, res) => {
    try {
      // Default ministries with full structure including image URLs and custom content
      const defaultMinistries = [
        {
          id: "worship",
          title: "Worship & Music",
          description: "Join our choir or band. We believe in praising through song and spirit, blending traditional hymns with contemporary worship.",
          icon: "music",
          imageUrl: null,
          customContent: {
            type: "youtube_playlist",
            playlistId: "PLkDsdLHKY8laSsy8xYfILnVzFMedR0Rgy"
          }
        },
        {
          id: "youth",
          title: "Youth & Family",
          description: "Programs for all ages, from Sunday school for the little ones to teen youth groups focused on navigating faith in the modern world.",
          icon: "users",
          imageUrl: null,
          customContent: {
            type: "family_photos"
          }
        },
        {
          id: "community",
          title: "Community Outreach",
          description: "We serve our local community through food drives, shelter support, and neighborhood cleanup events. Faith in action.",
          icon: "heart",
          imageUrl: "/api/settings/ministry-image/community",
          customContent: {
            type: "charity_coming_soon",
            message: "Jerricks for Jesus Charity – Coming Soon"
          }
        }
      ];

      const ministriesJson = await storage.getSetting("ministries");
      if (ministriesJson) {
        const stored = JSON.parse(ministriesJson);
        // Merge stored values with defaults to ensure proper structure
        const merged = defaultMinistries.map(defaultMinistry => {
          const storedMinistry = stored.find((s: any) => s.id === defaultMinistry.id);
          if (storedMinistry) {
            return {
              ...defaultMinistry,
              ...storedMinistry,
              customContent: storedMinistry.customContent || defaultMinistry.customContent
            };
          }
          return defaultMinistry;
        });
        res.json(merged);
      } else {
        res.json(defaultMinistries);
      }
    } catch (error) {
      console.error("Error fetching ministries:", error);
      res.status(500).json({ error: "Failed to fetch ministries" });
    }
  });

  // Ministry Image - GET (Returns the charity logo image for community outreach)
  app.get("/api/settings/ministry-image/:ministryId", async (req, res) => {
    try {
      const { ministryId } = req.params;
      
      // Build base URL for absolute image URLs (for mobile app)
      const publicUrl = process.env.PUBLIC_APP_URL || `${req.protocol}://${req.get('host')}`;
      
      // Get ministry image URL from settings
      const imageSettingKey = `ministry_image_${ministryId}`;
      const storedImageUrl = await storage.getSetting(imageSettingKey);
      
      if (storedImageUrl) {
        // If stored URL is relative, make it absolute
        const absoluteUrl = storedImageUrl.startsWith('http') 
          ? storedImageUrl 
          : `${publicUrl}${storedImageUrl}`;
        res.json({ imageUrl: absoluteUrl, altText: "Ministry Image" });
      } else {
        // Default images for known ministries
        if (ministryId === "community") {
          // Return absolute URL for the charity logo - URL-friendly filename
          const imagePath = "/attached_assets/charity-logo.jpeg";
          res.json({ 
            imageUrl: `${publicUrl}${imagePath}`,
            altText: "Jerricks for Jesus Charity Logo"
          });
        } else {
          res.json({ imageUrl: null, altText: null });
        }
      }
    } catch (error) {
      console.error("Error fetching ministry image:", error);
      res.status(500).json({ error: "Failed to fetch ministry image" });
    }
  });

  // Ministries - PUT (Admin/Foundational only)
  app.put("/api/settings/ministries", requireAuth, requireRole("admin", "foundational"), async (req, res) => {
    try {
      const { ministries } = req.body;
      if (!Array.isArray(ministries)) {
        return res.status(400).json({ error: "Ministries must be an array" });
      }
      await storage.setSetting("ministries", JSON.stringify(ministries));
      res.json({ success: true, ministries });
    } catch (error) {
      console.error("Error updating ministries:", error);
      res.status(500).json({ error: "Failed to update ministries" });
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

  app.delete("/api/photos/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePhoto(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting photo:", error);
      res.status(500).json({ error: "Failed to delete photo" });
    }
  });

  // Member Photo Submission Routes
  
  // Get current user's submitted photos
  app.get("/api/member-photos/my", requireAuth, async (req, res) => {
    try {
      const photos = await storage.getMemberPhotosByUser(req.user!.id);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching member photos:", error);
      res.status(500).json({ error: "Failed to fetch photos" });
    }
  });

  // Submit a new photo (any authenticated user)
  app.post("/api/member-photos", requireAuth, async (req, res) => {
    try {
      const { imagePath, caption } = req.body;
      
      if (!imagePath) {
        return res.status(400).json({ error: "Image path is required" });
      }
      
      let normalizedPath = imagePath;
      if (!normalizedPath.startsWith("/objects/")) {
        normalizedPath = `/objects/${normalizedPath.replace(/^\/+/, "")}`;
      }
      
      const photo = await storage.createMemberPhoto({
        userId: req.user!.id,
        imagePath: normalizedPath,
        caption: caption || null,
        status: "pending",
      });
      
      res.json(photo);
    } catch (error) {
      console.error("Error submitting member photo:", error);
      res.status(500).json({ error: "Failed to submit photo" });
    }
  });

  // Get all pending photos (admin/foundational only)
  app.get("/api/member-photos/pending", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== USER_ROLES.ADMIN && req.user!.role !== USER_ROLES.FOUNDATIONAL) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const photos = await storage.getMemberPhotosByStatus("pending");
      res.json(photos);
    } catch (error) {
      console.error("Error fetching pending photos:", error);
      res.status(500).json({ error: "Failed to fetch pending photos" });
    }
  });

  // Get all member photos (admin/foundational only)
  app.get("/api/member-photos/all", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== USER_ROLES.ADMIN && req.user!.role !== USER_ROLES.FOUNDATIONAL) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const photos = await storage.getAllMemberPhotos();
      res.json(photos);
    } catch (error) {
      console.error("Error fetching all member photos:", error);
      res.status(500).json({ error: "Failed to fetch photos" });
    }
  });

  // Get approved member photos (public)
  app.get("/api/member-photos/approved", async (req, res) => {
    try {
      const photos = await storage.getApprovedMemberPhotos();
      res.json(photos);
    } catch (error) {
      console.error("Error fetching approved photos:", error);
      res.status(500).json({ error: "Failed to fetch approved photos" });
    }
  });

  // Approve or reject a photo (admin/foundational only)
  app.patch("/api/member-photos/:id/status", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== USER_ROLES.ADMIN && req.user!.role !== USER_ROLES.FOUNDATIONAL) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
      }
      
      const photo = await storage.updateMemberPhotoStatus(id, status, req.user!.id);
      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }
      
      res.json(photo);
    } catch (error) {
      console.error("Error updating photo status:", error);
      res.status(500).json({ error: "Failed to update photo status" });
    }
  });

  // Delete a member photo (owner or admin/foundational)
  app.delete("/api/member-photos/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const photos = await storage.getMemberPhotosByUser(req.user!.id);
      const isOwner = photos.some(p => p.id === id);
      const isAdmin = req.user!.role === USER_ROLES.ADMIN || req.user!.role === USER_ROLES.FOUNDATIONAL;
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.deleteMemberPhoto(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting member photo:", error);
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

  // YouTube Live Status Route - Uses OAuth token and liveBroadcasts API to detect unlisted streams
  app.get("/api/youtube/live-status", async (req, res) => {
    try {
      // Get OAuth token
      const accessToken = await getValidYoutubeToken();
      
      if (!accessToken) {
        console.log("YouTube not connected via OAuth, returning offline status. Connect YouTube in admin panel to enable live detection.");
        return res.json({ isLive: false, videoId: null, title: null });
      }
      
      // Use liveBroadcasts API - this detects unlisted/private streams too (unlike search API)
      // Note: Can't combine broadcastStatus with mine=true, so we fetch all and filter
      const broadcastUrl = "https://www.googleapis.com/youtube/v3/liveBroadcasts?part=id,snippet,status&mine=true&maxResults=10";
      const broadcastResponse = await fetch(broadcastUrl, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      
      if (broadcastResponse.ok) {
        const broadcastData = await broadcastResponse.json();
        console.log("Live broadcasts API response:", JSON.stringify(broadcastData));
        
        if (broadcastData.items && broadcastData.items.length > 0) {
          // Find an active/live broadcast (lifeCycleStatus = "live")
          const liveBroadcast = broadcastData.items.find(
            (item: any) => item.status?.lifeCycleStatus === "live"
          );
          
          if (liveBroadcast) {
            // The broadcast ID is the video ID for YouTube embeds
            const videoId = liveBroadcast.id;
            const title = liveBroadcast.snippet?.title || "Live Service";
            console.log("Live stream detected via liveBroadcasts API:", title, "videoId:", videoId, "status:", liveBroadcast.status?.lifeCycleStatus);
            return res.json({
              isLive: true,
              videoId: videoId,
              title: title
            });
          } else {
            console.log("Broadcasts found but none are live. Statuses:", broadcastData.items.map((i: any) => i.status?.lifeCycleStatus));
          }
        }
        console.log("No active broadcasts found");
      } else {
        const errorText = await broadcastResponse.text();
        console.error("YouTube liveBroadcasts API error:", errorText);
        
        // Fallback to search API for public streams
        const youtubeAuth = await storage.getYoutubeAuth();
        const channelId = youtubeAuth?.channelId;
        
        if (channelId) {
          const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video`;
          const searchResponse = await fetch(searchUrl, {
            headers: { "Authorization": `Bearer ${accessToken}` }
          });
          
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.items && searchData.items.length > 0) {
              const liveVideo = searchData.items[0];
              console.log("Live stream detected via search API fallback:", liveVideo.snippet.title);
              return res.json({
                isLive: true,
                videoId: liveVideo.id.videoId,
                title: liveVideo.snippet.title
              });
            }
          }
        }
      }
      
      // No live stream found
      return res.json({ isLive: false, videoId: null, title: null });
    } catch (error) {
      console.error("Error checking live status:", error);
      return res.json({ isLive: false, videoId: null, title: null });
    }
  });

  // YouTube Playlist Videos Cache
  let playlistCache: { videos: any[]; timestamp: number } | null = null;
  const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  // Helper function to fetch playlist from YouTube API
  async function fetchPlaylistFromYouTube(playlistId: string, apiKey: string): Promise<any[]> {
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
        throw new Error("Failed to fetch playlist");
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

    return videos;
  }

  // Manual Refresh Playlist Cache (Foundational/Admin only)
  app.post("/api/youtube/playlist/:playlistId/refresh", requireAuth, requireRole("admin", "foundational"), async (req, res) => {
    try {
      const { playlistId } = req.params;
      const apiKey = process.env.YOUTUBE_API_KEY;
      
      if (!apiKey) {
        return res.status(400).json({ error: "YouTube API key not configured" });
      }

      const videos = await fetchPlaylistFromYouTube(playlistId, apiKey);
      
      // Update cache
      playlistCache = { videos, timestamp: Date.now() };
      
      console.log(`Playlist cache manually refreshed by ${req.user?.username}`);
      res.json({ success: true, videoCount: videos.length, message: "Playlist refreshed successfully" });
    } catch (error) {
      console.error("Error refreshing playlist:", error);
      res.status(500).json({ error: "Failed to refresh playlist" });
    }
  });

  // YouTube Playlist Route - Fetch videos from a specific playlist
  app.get("/api/youtube/playlist/:playlistId", async (req, res) => {
    try {
      const { playlistId } = req.params;
      const apiKey = process.env.YOUTUBE_API_KEY;
      
      if (!apiKey) {
        console.log("YouTube API key not configured");
        return res.json({ videos: [], error: "YouTube API key not configured" });
      }

      // Check cache - return cached data if still valid
      if (playlistCache && Date.now() - playlistCache.timestamp < CACHE_DURATION) {
        return res.json({ videos: playlistCache.videos });
      }

      // Fetch fresh data using helper function
      const videos = await fetchPlaylistFromYouTube(playlistId, apiKey);
      
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

  // Migrate local quiz progress to user account
  app.post("/api/quiz/migrate", requireAuth, async (req, res) => {
    try {
      const { books } = req.body;
      
      if (!books || !Array.isArray(books)) {
        return res.status(400).json({ error: "Invalid request body" });
      }

      const existingAttempts = await storage.getQuizAttemptsByUser(req.user!.id);
      const existingBooks = new Set(existingAttempts.map(a => a.book));

      let migratedCount = 0;
      for (const book of books) {
        if (!existingBooks.has(book)) {
          await storage.createQuizAttempt({
            book,
            score: 0,
            totalQuestions: 0,
            userId: req.user!.id,
          });
          migratedCount++;
        }
      }

      res.json({ success: true, migratedCount });
    } catch (error) {
      console.error("Error migrating quiz progress:", error);
      res.status(500).json({ error: "Failed to migrate progress" });
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
