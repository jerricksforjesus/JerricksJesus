import { type User, type InsertUser, type Video, type InsertVideo, type Verse, type InsertVerse, videos, verses, users } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
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
}

export const storage = new DbStorage();
