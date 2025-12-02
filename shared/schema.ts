import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Bible books reference data
export const BIBLE_BOOKS = {
  oldTestament: [
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
    "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
    "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
    "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
    "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations",
    "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
    "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
    "Zephaniah", "Haggai", "Zechariah", "Malachi"
  ],
  newTestament: [
    "Matthew", "Mark", "Luke", "John", "Acts",
    "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
    "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy",
    "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
    "1 Peter", "2 Peter", "1 John", "2 John", "3 John",
    "Jude", "Revelation"
  ]
} as const;

export const ALL_BIBLE_BOOKS = [...BIBLE_BOOKS.oldTestament, ...BIBLE_BOOKS.newTestament];

export const USER_ROLES = {
  ADMIN: "admin",
  FOUNDATIONAL: "foundational",
  MEMBER: "member",
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  objectPath: text("object_path").notNull(),
  thumbnailPath: text("thumbnail_path"),
  captionsPath: text("captions_path"),
  captionStatus: text("caption_status").default("none").notNull(),
  recordedDate: text("recorded_date").notNull(),
  duration: text("duration"),
  views: integer("views").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const verses = pgTable("verses", {
  id: serial("id").primaryKey(),
  verseText: text("verse_text").notNull(),
  reference: text("reference").notNull(),
  isActive: integer("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  imagePath: text("image_path").notNull(),
  caption: text("caption"),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Bible Quiz tables
export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  book: text("book").notNull(),
  questionText: text("question_text").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  scriptureReference: text("scripture_reference"),
  isApproved: integer("is_approved").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  book: text("book").notNull(),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
  views: true,
  createdAt: true,
});

export const insertVerseSchema = createInsertSchema(verses).omit({
  id: true,
  createdAt: true,
});

export const insertPhotoSchema = createInsertSchema(photos).omit({
  id: true,
  createdAt: true,
});

export const insertQuizQuestionSchema = createInsertSchema(quizQuestions).omit({
  id: true,
  createdAt: true,
});

export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({
  id: true,
  completedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

export type InsertVerse = z.infer<typeof insertVerseSchema>;
export type Verse = typeof verses.$inferSelect;

export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type Photo = typeof photos.$inferSelect;

export type InsertQuizQuestion = z.infer<typeof insertQuizQuestionSchema>;
export type QuizQuestion = typeof quizQuestions.$inferSelect;

export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
