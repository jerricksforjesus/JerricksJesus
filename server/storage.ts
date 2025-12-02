import { type User, type InsertUser, type Video, type InsertVideo, type Verse, type InsertVerse, type Photo, type InsertPhoto, type QuizQuestion, type InsertQuizQuestion, type QuizAttempt, type InsertQuizAttempt, videos, verses, users, photos, quizQuestions, quizAttempts } from "@shared/schema";
import { db } from "./db";
import { eq, asc, and, sql } from "drizzle-orm";
import * as schema from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
  getAllQuizAttempts(): Promise<QuizAttempt[]>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(schema.users).values(insertUser).returning();
    return user;
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

  async getAllQuizAttempts(): Promise<QuizAttempt[]> {
    return await db.query.quizAttempts.findMany({
      orderBy: (a, { desc }) => [desc(a.completedAt)],
    });
  }
}

export const storage = new DbStorage();
