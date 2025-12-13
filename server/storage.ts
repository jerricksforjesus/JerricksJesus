import { type User, type InsertUser, type Video, type InsertVideo, type Verse, type InsertVerse, type Photo, type InsertPhoto, type QuizQuestion, type InsertQuizQuestion, type QuizAttempt, type InsertQuizAttempt, type Session, type InsertSession, type MemberPhoto, type InsertMemberPhoto, type SiteSetting, type YoutubeAuth, type InsertYoutubeAuth, type WorshipVideo, type InsertWorshipVideo, type Event, type InsertEvent, videos, verses, users, photos, quizQuestions, quizAttempts, sessions, memberPhotos, siteSettings, youtubeAuth, worshipVideos, events } from "@shared/schema";
import { db } from "./db";
import { eq, asc, desc, and, sql, gt, gte } from "drizzle-orm";
import * as schema from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  updateUsername(id: string, username: string): Promise<User | undefined>;
  updateUserPassword(id: string, hashedPassword: string): Promise<User | undefined>;
  resetUserPassword(id: string, hashedPassword: string): Promise<User | undefined>;
  clearMustChangePassword(id: string): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  linkGoogleAccount(id: string, googleId: string): Promise<User | undefined>;
  
  // Session methods
  createSession(session: InsertSession): Promise<Session>;
  getSessionByToken(token: string): Promise<Session | undefined>;
  deleteSession(token: string): Promise<void>;
  deleteExpiredSessions(): Promise<void>;
  
  getAllVideos(): Promise<Video[]>;
  getVideo(id: number): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: number, data: Partial<InsertVideo>): Promise<Video | undefined>;
  deleteVideo(id: number): Promise<void>;
  incrementVideoViews(id: number): Promise<void>;
  updateVideoCaptions(id: number, captionsPath: string, status: string): Promise<Video | undefined>;
  updateVideoCaptionStatus(id: number, status: string): Promise<void>;
  
  getActiveVerse(): Promise<Verse | undefined>;
  getAllVerses(): Promise<Verse[]>;
  createVerse(verse: InsertVerse): Promise<Verse>;
  updateVerse(id: number, verse: Partial<InsertVerse>): Promise<Verse | undefined>;
  setActiveVerse(id: number): Promise<void>;
  
  getAllPhotos(): Promise<Photo[]>;
  getPhoto(id: number): Promise<Photo | undefined>;
  createPhoto(photo: InsertPhoto): Promise<Photo>;
  updatePhoto(id: number, data: Partial<InsertPhoto>): Promise<Photo | undefined>;
  deletePhoto(id: number): Promise<void>;
  
  // Quiz methods
  getQuestionById(id: number): Promise<QuizQuestion | undefined>;
  getQuestionsByBook(book: string, approvedOnly?: boolean): Promise<QuizQuestion[]>;
  getAllQuestions(): Promise<QuizQuestion[]>;
  getQuestionCountByBook(): Promise<{ book: string; count: number; approvedCount: number }[]>;
  createQuestion(question: InsertQuizQuestion): Promise<QuizQuestion>;
  createQuestions(questions: InsertQuizQuestion[]): Promise<QuizQuestion[]>;
  updateQuestion(id: number, data: Partial<InsertQuizQuestion>): Promise<QuizQuestion | undefined>;
  deleteQuestion(id: number): Promise<void>;
  deleteQuestionsByBook(book: string): Promise<void>;
  approveQuestion(id: number): Promise<void>;
  approveQuestionsByBook(book: string): Promise<void>;
  
  createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;
  getQuizAttemptsByBook(book: string): Promise<QuizAttempt[]>;
  getQuizAttemptsByUser(userId: string): Promise<QuizAttempt[]>;
  getAllQuizAttempts(): Promise<QuizAttempt[]>;
  resetAllQuizAttempts(): Promise<number>;
  resetQuizAttemptsByBook(book: string): Promise<number>;
  getLeaderboard(limit?: number): Promise<{ userId: string; username: string; role: string; totalPoints: number; quizzesTaken: number }[]>;
  getUserQuizStats(userId: string): Promise<{ totalPoints: number; quizzesTaken: number; averageScore: number } | null>;
  
  // Member photo methods
  createMemberPhoto(photo: InsertMemberPhoto): Promise<MemberPhoto>;
  getMemberPhotosByUser(userId: string): Promise<MemberPhoto[]>;
  getMemberPhotosByStatus(status: string): Promise<MemberPhoto[]>;
  getAllMemberPhotos(): Promise<MemberPhoto[]>;
  getApprovedMemberPhotos(): Promise<MemberPhoto[]>;
  updateMemberPhotoStatus(id: number, status: string, reviewedBy: string): Promise<MemberPhoto | undefined>;
  deleteMemberPhoto(id: number): Promise<void>;
  
  // Site settings methods
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<SiteSetting>;
  
  // YouTube auth methods
  getYoutubeAuth(): Promise<YoutubeAuth | undefined>;
  saveYoutubeAuth(auth: InsertYoutubeAuth): Promise<YoutubeAuth>;
  updateYoutubeAuthTokens(accessToken: string, expiresAt: Date): Promise<YoutubeAuth | undefined>;
  deleteYoutubeAuth(): Promise<void>;
  
  // Worship video methods
  getAllWorshipVideos(): Promise<WorshipVideo[]>;
  getWorshipVideo(id: number): Promise<WorshipVideo | undefined>;
  getWorshipVideoByYoutubeId(youtubeVideoId: string): Promise<WorshipVideo | undefined>;
  createWorshipVideo(video: InsertWorshipVideo): Promise<WorshipVideo>;
  deleteWorshipVideo(id: number): Promise<void>;
  updateWorshipVideoPosition(id: number, position: number): Promise<WorshipVideo | undefined>;
  syncWorshipVideosFromPlaylist(videos: InsertWorshipVideo[]): Promise<{ created: number; updated: number; deleted: number }>;
  
  // Events methods
  getAllEvents(): Promise<Event[]>;
  getUpcomingEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, data: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<void>;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, id),
    });
    return result;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, username),
    });
    return result;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const result = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.googleId, googleId),
    });
    return result;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    });
    return result;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(schema.users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.query.users.findMany({
      orderBy: (users, { asc }) => [asc(users.username)],
    });
  }

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const [user] = await db.update(schema.users)
      .set({ role })
      .where(eq(schema.users.id, id))
      .returning();
    return user;
  }

  async updateUsername(id: string, username: string): Promise<User | undefined> {
    const [user] = await db.update(schema.users)
      .set({ username })
      .where(eq(schema.users.id, id))
      .returning();
    return user;
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<User | undefined> {
    const [user] = await db.update(schema.users)
      .set({ password: hashedPassword, mustChangePassword: 0 })
      .where(eq(schema.users.id, id))
      .returning();
    return user;
  }

  async resetUserPassword(id: string, hashedPassword: string): Promise<User | undefined> {
    const [user] = await db.update(schema.users)
      .set({ password: hashedPassword, mustChangePassword: 1 })
      .where(eq(schema.users.id, id))
      .returning();
    return user;
  }

  async clearMustChangePassword(id: string): Promise<User | undefined> {
    const [user] = await db.update(schema.users)
      .set({ mustChangePassword: 0 })
      .where(eq(schema.users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    // Delete user's sessions first
    await db.delete(sessions).where(eq(sessions.userId, id));
    // Delete the user
    await db.delete(schema.users).where(eq(schema.users.id, id));
  }

  async linkGoogleAccount(id: string, googleId: string): Promise<User | undefined> {
    const [user] = await db.update(schema.users)
      .set({ googleId })
      .where(eq(schema.users.id, id))
      .returning();
    return user;
  }

  async createSession(session: InsertSession): Promise<Session> {
    const [newSession] = await db.insert(sessions).values(session).returning();
    return newSession;
  }

  async getSessionByToken(token: string): Promise<Session | undefined> {
    return await db.query.sessions.findFirst({
      where: (s, { eq, and, gt }) => and(
        eq(s.token, token),
        gt(s.expiresAt, new Date())
      ),
    });
  }

  async deleteSession(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.token, token));
  }

  async deleteExpiredSessions(): Promise<void> {
    await db.delete(sessions).where(sql`${sessions.expiresAt} < NOW()`);
  }

  async getAllVideos(): Promise<Video[]> {
    return await db.query.videos.findMany({
      orderBy: (videos, { desc }) => [desc(videos.createdAt)],
    });
  }

  async getVideo(id: number): Promise<Video | undefined> {
    return await db.query.videos.findFirst({
      where: (videos, { eq }) => eq(videos.id, id),
    });
  }

  async createVideo(video: InsertVideo): Promise<Video> {
    const [newVideo] = await db.insert(videos).values(video).returning();
    return newVideo;
  }

  async updateVideo(id: number, data: Partial<InsertVideo>): Promise<Video | undefined> {
    const [updated] = await db.update(videos)
      .set(data)
      .where(eq(videos.id, id))
      .returning();
    return updated;
  }

  async deleteVideo(id: number): Promise<void> {
    await db.delete(videos).where(eq(videos.id, id));
  }

  async incrementVideoViews(id: number): Promise<void> {
    const video = await this.getVideo(id);
    if (video) {
      await db.update(videos)
        .set({ views: video.views + 1 })
        .where(eq(videos.id, id));
    }
  }

  async updateVideoCaptions(id: number, captionsPath: string, status: string): Promise<Video | undefined> {
    const [updated] = await db.update(videos)
      .set({ captionsPath, captionStatus: status })
      .where(eq(videos.id, id))
      .returning();
    return updated;
  }

  async updateVideoCaptionStatus(id: number, status: string): Promise<void> {
    await db.update(videos)
      .set({ captionStatus: status })
      .where(eq(videos.id, id));
  }

  async getActiveVerse(): Promise<Verse | undefined> {
    return await db.query.verses.findFirst({
      where: (verses, { eq }) => eq(verses.isActive, 1),
      orderBy: (verses, { desc }) => [desc(verses.createdAt)],
    });
  }

  async getAllVerses(): Promise<Verse[]> {
    return await db.query.verses.findMany({
      orderBy: (verses, { desc }) => [desc(verses.createdAt)],
    });
  }

  async createVerse(verse: InsertVerse): Promise<Verse> {
    const [newVerse] = await db.insert(verses).values(verse).returning();
    return newVerse;
  }

  async updateVerse(id: number, verse: Partial<InsertVerse>): Promise<Verse | undefined> {
    const [updated] = await db.update(verses)
      .set(verse)
      .where(eq(verses.id, id))
      .returning();
    return updated;
  }

  async setActiveVerse(id: number): Promise<void> {
    await db.update(verses).set({ isActive: 0 });
    await db.update(verses).set({ isActive: 1 }).where(eq(verses.id, id));
  }

  async getAllPhotos(): Promise<Photo[]> {
    return await db.query.photos.findMany({
      orderBy: (photos, { asc }) => [asc(photos.displayOrder), asc(photos.createdAt)],
    });
  }

  async getPhoto(id: number): Promise<Photo | undefined> {
    return await db.query.photos.findFirst({
      where: (photos, { eq }) => eq(photos.id, id),
    });
  }

  async createPhoto(photo: InsertPhoto): Promise<Photo> {
    const allPhotos = await this.getAllPhotos();
    const maxOrder = allPhotos.length > 0 ? Math.max(...allPhotos.map(p => p.displayOrder)) : -1;
    const [newPhoto] = await db.insert(photos).values({
      ...photo,
      displayOrder: maxOrder + 1,
    }).returning();
    return newPhoto;
  }

  async updatePhoto(id: number, data: Partial<InsertPhoto>): Promise<Photo | undefined> {
    const [updated] = await db.update(photos)
      .set(data)
      .where(eq(photos.id, id))
      .returning();
    return updated;
  }

  async deletePhoto(id: number): Promise<void> {
    await db.delete(photos).where(eq(photos.id, id));
  }

  // Quiz methods
  async getQuestionById(id: number): Promise<QuizQuestion | undefined> {
    return await db.query.quizQuestions.findFirst({
      where: (q, { eq }) => eq(q.id, id),
    });
  }

  async getQuestionsByBook(book: string, approvedOnly: boolean = true): Promise<QuizQuestion[]> {
    if (approvedOnly) {
      return await db.query.quizQuestions.findMany({
        where: (q, { eq, and }) => and(eq(q.book, book), eq(q.isApproved, 1)),
        orderBy: (q, { asc }) => [asc(q.id)],
      });
    }
    return await db.query.quizQuestions.findMany({
      where: (q, { eq }) => eq(q.book, book),
      orderBy: (q, { asc }) => [asc(q.id)],
    });
  }

  async getAllQuestions(): Promise<QuizQuestion[]> {
    return await db.query.quizQuestions.findMany({
      orderBy: (q, { asc }) => [asc(q.book), asc(q.id)],
    });
  }

  async getQuestionCountByBook(): Promise<{ book: string; count: number; approvedCount: number }[]> {
    const questions = await this.getAllQuestions();
    const bookCounts = new Map<string, { count: number; approvedCount: number }>();
    
    for (const q of questions) {
      const existing = bookCounts.get(q.book) || { count: 0, approvedCount: 0 };
      existing.count++;
      if (q.isApproved === 1) existing.approvedCount++;
      bookCounts.set(q.book, existing);
    }
    
    return Array.from(bookCounts.entries()).map(([book, counts]) => ({
      book,
      ...counts,
    }));
  }

  async createQuestion(question: InsertQuizQuestion): Promise<QuizQuestion> {
    const [newQuestion] = await db.insert(quizQuestions).values(question).returning();
    return newQuestion;
  }

  async createQuestions(questions: InsertQuizQuestion[]): Promise<QuizQuestion[]> {
    if (questions.length === 0) return [];
    const newQuestions = await db.insert(quizQuestions).values(questions).returning();
    return newQuestions;
  }

  async updateQuestion(id: number, data: Partial<InsertQuizQuestion>): Promise<QuizQuestion | undefined> {
    const [updated] = await db.update(quizQuestions)
      .set(data)
      .where(eq(quizQuestions.id, id))
      .returning();
    return updated;
  }

  async deleteQuestion(id: number): Promise<void> {
    await db.delete(quizQuestions).where(eq(quizQuestions.id, id));
  }

  async deleteQuestionsByBook(book: string): Promise<void> {
    await db.delete(quizQuestions).where(eq(quizQuestions.book, book));
  }

  async approveQuestion(id: number): Promise<void> {
    await db.update(quizQuestions)
      .set({ isApproved: 1 })
      .where(eq(quizQuestions.id, id));
  }

  async approveQuestionsByBook(book: string): Promise<void> {
    await db.update(quizQuestions)
      .set({ isApproved: 1 })
      .where(eq(quizQuestions.book, book));
  }

  async createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt> {
    const [newAttempt] = await db.insert(quizAttempts).values(attempt).returning();
    return newAttempt;
  }

  async getQuizAttemptsByBook(book: string): Promise<QuizAttempt[]> {
    return await db.query.quizAttempts.findMany({
      where: (a, { eq }) => eq(a.book, book),
      orderBy: (a, { desc }) => [desc(a.completedAt)],
    });
  }

  async getQuizAttemptsByUser(userId: string): Promise<QuizAttempt[]> {
    return await db.query.quizAttempts.findMany({
      where: (a, { eq }) => eq(a.userId, userId),
      orderBy: (a, { desc }) => [desc(a.completedAt)],
    });
  }

  async getAllQuizAttempts(): Promise<QuizAttempt[]> {
    return await db.query.quizAttempts.findMany({
      orderBy: (a, { desc }) => [desc(a.completedAt)],
    });
  }

  async resetAllQuizAttempts(): Promise<number> {
    const result = await db.delete(quizAttempts).returning();
    return result.length;
  }

  async resetQuizAttemptsByBook(book: string): Promise<number> {
    const result = await db.delete(quizAttempts).where(eq(quizAttempts.book, book)).returning();
    return result.length;
  }

  async getLeaderboard(limit: number = 10): Promise<{ userId: string; username: string; role: string; totalPoints: number; quizzesTaken: number }[]> {
    const result = await db
      .select({
        userId: quizAttempts.userId,
        username: users.username,
        role: users.role,
        totalPoints: sql<number>`SUM(${quizAttempts.score} * 10)`.as("total_points"),
        quizzesTaken: sql<number>`COUNT(*)`.as("quizzes_taken"),
      })
      .from(quizAttempts)
      .innerJoin(users, eq(quizAttempts.userId, users.id))
      .where(gt(quizAttempts.totalQuestions, 0))
      .groupBy(quizAttempts.userId, users.username, users.role)
      .orderBy(desc(sql`SUM(${quizAttempts.score} * 10)`))
      .limit(limit);
    
    return result.map(r => ({
      userId: r.userId || "",
      username: r.username,
      role: r.role,
      totalPoints: Number(r.totalPoints) || 0,
      quizzesTaken: Number(r.quizzesTaken) || 0,
    }));
  }

  async getUserQuizStats(userId: string): Promise<{ totalPoints: number; quizzesTaken: number; averageScore: number } | null> {
    const result = await db
      .select({
        totalPoints: sql<number>`SUM(${quizAttempts.score} * 10)`.as("total_points"),
        quizzesTaken: sql<number>`COUNT(*)`.as("quizzes_taken"),
        averageScore: sql<number>`AVG(CAST(${quizAttempts.score} AS FLOAT) / CAST(${quizAttempts.totalQuestions} AS FLOAT) * 100)`.as("average_score"),
      })
      .from(quizAttempts)
      .where(and(eq(quizAttempts.userId, userId), gt(quizAttempts.totalQuestions, 0)));
    
    if (!result[0] || Number(result[0].quizzesTaken) === 0) {
      return null;
    }
    
    return {
      totalPoints: Number(result[0].totalPoints) || 0,
      quizzesTaken: Number(result[0].quizzesTaken) || 0,
      averageScore: Math.round(Number(result[0].averageScore) || 0),
    };
  }

  // Member photo methods
  async createMemberPhoto(photo: InsertMemberPhoto): Promise<MemberPhoto> {
    const [newPhoto] = await db.insert(memberPhotos).values(photo).returning();
    return newPhoto;
  }

  async getMemberPhotosByUser(userId: string): Promise<MemberPhoto[]> {
    return await db.query.memberPhotos.findMany({
      where: (p, { eq }) => eq(p.userId, userId),
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    });
  }

  async getMemberPhotosByStatus(status: string): Promise<MemberPhoto[]> {
    return await db.query.memberPhotos.findMany({
      where: (p, { eq }) => eq(p.status, status),
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    });
  }

  async getAllMemberPhotos(): Promise<MemberPhoto[]> {
    return await db.query.memberPhotos.findMany({
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    });
  }

  async getApprovedMemberPhotos(): Promise<MemberPhoto[]> {
    return await db.query.memberPhotos.findMany({
      where: (p, { eq }) => eq(p.status, "approved"),
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    });
  }

  async updateMemberPhotoStatus(id: number, status: string, reviewedBy: string): Promise<MemberPhoto | undefined> {
    const [updated] = await db.update(memberPhotos)
      .set({ status, reviewedBy, reviewedAt: new Date() })
      .where(eq(memberPhotos.id, id))
      .returning();
    return updated;
  }

  async deleteMemberPhoto(id: number): Promise<void> {
    await db.delete(memberPhotos).where(eq(memberPhotos.id, id));
  }

  async getSetting(key: string): Promise<string | undefined> {
    const result = await db.query.siteSettings.findFirst({
      where: (s, { eq }) => eq(s.key, key),
    });
    return result?.value;
  }

  async setSetting(key: string, value: string): Promise<SiteSetting> {
    const existing = await db.query.siteSettings.findFirst({
      where: (s, { eq }) => eq(s.key, key),
    });
    
    if (existing) {
      const [updated] = await db.update(siteSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(siteSettings.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(siteSettings).values({ key, value }).returning();
      return created;
    }
  }

  // YouTube auth methods
  async getYoutubeAuth(): Promise<YoutubeAuth | undefined> {
    const result = await db.query.youtubeAuth.findFirst({
      orderBy: (a, { desc }) => [desc(a.createdAt)],
    });
    return result;
  }

  async saveYoutubeAuth(auth: InsertYoutubeAuth): Promise<YoutubeAuth> {
    await db.delete(youtubeAuth);
    const [created] = await db.insert(youtubeAuth).values(auth).returning();
    return created;
  }

  async updateYoutubeAuthTokens(accessToken: string, expiresAt: Date): Promise<YoutubeAuth | undefined> {
    const existing = await this.getYoutubeAuth();
    if (!existing) return undefined;
    
    const [updated] = await db.update(youtubeAuth)
      .set({ accessToken, expiresAt, updatedAt: new Date() })
      .where(eq(youtubeAuth.id, existing.id))
      .returning();
    return updated;
  }

  async deleteYoutubeAuth(): Promise<void> {
    await db.delete(youtubeAuth);
  }

  // Worship video methods
  async getAllWorshipVideos(): Promise<WorshipVideo[]> {
    return await db.query.worshipVideos.findMany({
      orderBy: (v, { asc }) => [asc(v.position)],
    });
  }

  async getWorshipVideo(id: number): Promise<WorshipVideo | undefined> {
    const result = await db.query.worshipVideos.findFirst({
      where: (v, { eq }) => eq(v.id, id),
    });
    return result;
  }

  async getWorshipVideoByYoutubeId(youtubeVideoId: string): Promise<WorshipVideo | undefined> {
    const result = await db.query.worshipVideos.findFirst({
      where: (v, { eq }) => eq(v.youtubeVideoId, youtubeVideoId),
    });
    return result;
  }

  async createWorshipVideo(video: InsertWorshipVideo): Promise<WorshipVideo> {
    const maxPosition = await db.query.worshipVideos.findFirst({
      orderBy: (v, { desc }) => [desc(v.position)],
    });
    const position = (maxPosition?.position ?? -1) + 1;
    
    const [created] = await db.insert(worshipVideos)
      .values({ ...video, position })
      .returning();
    return created;
  }

  async deleteWorshipVideo(id: number): Promise<void> {
    await db.delete(worshipVideos).where(eq(worshipVideos.id, id));
  }

  async updateWorshipVideoPosition(id: number, position: number): Promise<WorshipVideo | undefined> {
    const [updated] = await db.update(worshipVideos)
      .set({ position })
      .where(eq(worshipVideos.id, id))
      .returning();
    return updated;
  }

  async syncWorshipVideosFromPlaylist(videos: InsertWorshipVideo[]): Promise<{ created: number; updated: number; deleted: number }> {
    let created = 0;
    let updated = 0;
    let deleted = 0;

    // Get all existing videos
    const existingVideos = await this.getAllWorshipVideos();
    const existingVideoIds = new Set(existingVideos.map(v => v.youtubeVideoId));
    const incomingVideoIds = new Set(videos.map(v => v.youtubeVideoId));

    // Upsert incoming videos
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const existing = await this.getWorshipVideoByYoutubeId(video.youtubeVideoId);
      
      if (existing) {
        // Update existing video
        await db.update(worshipVideos)
          .set({
            title: video.title,
            description: video.description,
            thumbnailUrl: video.thumbnailUrl,
            position: i,
          })
          .where(eq(worshipVideos.id, existing.id));
        updated++;
      } else {
        // Create new video
        await db.insert(worshipVideos)
          .values({ ...video, position: i });
        created++;
      }
    }

    // Delete videos that are no longer in the playlist
    for (const existing of existingVideos) {
      if (!incomingVideoIds.has(existing.youtubeVideoId)) {
        await db.delete(worshipVideos).where(eq(worshipVideos.id, existing.id));
        deleted++;
      }
    }

    return { created, updated, deleted };
  }

  // Events methods
  async getAllEvents(): Promise<Event[]> {
    return await db.query.events.findMany({
      orderBy: (e, { asc }) => [asc(e.eventDate), asc(e.eventTime)],
    });
  }

  async getUpcomingEvents(): Promise<Event[]> {
    const today = new Date().toISOString().split('T')[0];
    return await db.query.events.findMany({
      where: (e, { gte }) => gte(e.eventDate, today),
      orderBy: (e, { asc }) => [asc(e.eventDate), asc(e.eventTime)],
    });
  }

  async getEvent(id: number): Promise<Event | undefined> {
    return await db.query.events.findFirst({
      where: (e, { eq }) => eq(e.id, id),
    });
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [created] = await db.insert(events).values(event).returning();
    return created;
  }

  async updateEvent(id: number, data: Partial<InsertEvent>): Promise<Event | undefined> {
    const [updated] = await db.update(events)
      .set(data)
      .where(eq(events.id, id))
      .returning();
    return updated;
  }

  async deleteEvent(id: number): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }
}

export const storage = new DbStorage();
