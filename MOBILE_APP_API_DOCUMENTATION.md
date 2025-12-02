# Jerricks for Jesus - Mobile App API Documentation

**Last Updated:** December 2, 2025  
**Document Purpose:** Comprehensive documentation of all API endpoints, data models, and features for mobile app integration.

---

## Table of Contents

1. [Overview](#overview)
2. [Base Configuration](#base-configuration)
3. [Authentication System](#authentication-system)
4. [API Endpoints](#api-endpoints)
   - [Authentication Routes](#authentication-routes)
   - [User Management Routes](#user-management-routes)
   - [Profile Routes](#profile-routes)
   - [Video Routes](#video-routes)
   - [Verse Routes](#verse-routes)
   - [Photo Routes](#photo-routes)
   - [Member Photo Routes](#member-photo-routes)
   - [Quiz Routes](#quiz-routes)
   - [YouTube Integration Routes](#youtube-integration-routes)
   - [Settings Routes](#settings-routes)
   - [Object Storage Routes](#object-storage-routes)
5. [Data Models](#data-models)
6. [Role-Based Access Control](#role-based-access-control)
7. [UI/UX Specifications](#uiux-specifications)
8. [Error Handling](#error-handling)
9. [Mobile-Specific Considerations](#mobile-specific-considerations)

---

## Overview

The Jerricks for Jesus mobile app shares the same backend API and PostgreSQL database as the web application, ensuring synchronized data across all platforms. The API is RESTful, uses JSON for request/response bodies, and implements session-based authentication with HTTP-only cookies.

### Key Features

- **Live Streaming:** YouTube Live integration with automatic stream detection
- **Sermon Replay Gallery:** Video hosting with AI-generated captions
- **Daily Scripture:** Verse of the day display
- **Bible Quiz System:** 66 books with 10+ questions each, progress tracking
- **Family Photo Gallery:** Admin-curated photos with member submission workflow
- **User Accounts:** Three-tier role system (Admin, Foundational, Member)
- **Google SSO:** Single Sign-On integration
- **Zoom Integration:** Meeting link for services

---

## Base Configuration

### Production Base URL
```
https://jerricksforjesus.com
```

### Development Base URL
```
https://[repl-name].replit.dev
```

### Service Times
- **Friday Morning Service:** 6:00 AM EST
- **Friday Evening Service:** 6:00 PM EST

### Design System

| Property | Value |
|----------|-------|
| Primary Color | `#b47a5f` (Burnt Clay) |
| Serif Font | Cormorant Garamond |
| Sans Font | Manrope |
| Background | Alabaster/Off-white |

---

## Authentication System

### Session Management

The API uses HTTP-only cookies for session management:

| Cookie Name | Purpose | Duration |
|-------------|---------|----------|
| `sessionToken` | Session authentication | 7 days |
| `oauth_state` | CSRF protection for Google OAuth | 10 minutes |

**Cookie Configuration:**
```javascript
{
  httpOnly: true,
  secure: true, // In production
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
}
```

### Password Hashing
- Algorithm: bcrypt
- Salt Rounds: 10
- Default Reset Password: `Jerrick#1`

### Session Token
- 32-byte random hex string
- Stored in PostgreSQL `sessions` table

---

## API Endpoints

### Authentication Routes

#### POST `/api/auth/login`
Authenticate user with username/email and password.

**Request Body:**
```json
{
  "username": "string", // Can be username OR email
  "password": "string"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid-string",
    "username": "string",
    "role": "admin" | "foundational" | "member"
  }
}
```

**Errors:**
- `400` - Missing username or password
- `401` - Invalid credentials

---

#### POST `/api/auth/logout`
End current session.

**Response (200):**
```json
{
  "success": true
}
```

---

#### GET `/api/auth/me`
Get current authenticated user.

**Response (200):**
```json
{
  "user": {
    "id": "uuid-string",
    "username": "string",
    "role": "admin" | "foundational" | "member",
    "googleId": "string" | null,
    "mustChangePassword": 0 | 1
  }
}
```

**Errors:**
- `401` - Not authenticated

---

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "username": "string",
  "email": "string", // Required for member registration
  "password": "string",
  "role": "member" | "foundational" | "admin" // Optional, defaults to "member"
}
```

**Notes:**
- Regular registration creates `member` accounts only
- Only `admin` users can create `foundational` or `admin` accounts
- Email must be unique and valid format

**Response (200):**
```json
{
  "user": {
    "id": "uuid-string",
    "username": "string",
    "role": "string"
  }
}
```

**Errors:**
- `400` - Missing fields, invalid email, username taken, email already registered
- `403` - Only admins can create elevated accounts

---

#### GET `/api/auth/google`
Initiate Google OAuth flow. Redirects to Google's authentication page.

**Query Parameters:** None

**Response:** Redirect to Google OAuth

---

#### GET `/api/auth/google/callback`
Google OAuth callback handler.

**Query Parameters:**
- `code` - Authorization code from Google
- `state` - CSRF protection token

**Response:** 
- Success: Redirect to `/`
- Failure: Redirect to `/login?error=[error_type]`

**Error Types:**
- `invalid_state` - CSRF validation failed
- `no_code` - Missing authorization code
- `config` - OAuth not configured
- `not_registered` - User must register first
- `auth_failed` - General authentication failure

---

#### GET `/api/auth/google/debug`
Debug endpoint to verify OAuth redirect URI configuration.

**Purpose:** Diagnostic tool for validating that the OAuth redirect URI matches what's configured in Google Console.

**Response (200):**
```json
{
  "publicAppUrl": "https://jerricksforjesus.com" | "(not set - using dynamic detection)",
  "host": "jerricksforjesus.com",
  "redirectUri": "https://jerricksforjesus.com/api/auth/google/callback",
  "message": "This is the redirect URI that will be sent to Google. Make sure it matches EXACTLY what's in your Google Console."
}
```

**Note:** This endpoint is for debugging OAuth configuration issues. The `redirectUri` in the response should exactly match the authorized redirect URI in your Google Cloud Console OAuth credentials.

---

### User Management Routes

#### GET `/api/admin/users`
Get all users (Admin/Foundational only).

**Authentication:** Required (Admin or Foundational role)

**Response (200):**
```json
[
  {
    "id": "uuid-string",
    "username": "string",
    "role": "admin" | "foundational" | "member",
    "googleId": "string" | null
  }
]
```

---

#### PATCH `/api/admin/users/:id/role`
Update a user's role.

**Authentication:** Required (Admin or Foundational role)

**URL Parameters:**
- `id` - User ID (UUID)

**Request Body:**
```json
{
  "role": "admin" | "foundational" | "member"
}
```

**Permissions:**
- Admin can set any role
- Foundational can only promote to foundational (not admin)
- Cannot change your own role
- Foundational cannot demote other foundational or admin users

**Response (200):**
```json
{
  "id": "uuid-string",
  "username": "string",
  "role": "string"
}
```

---

#### POST `/api/admin/users/:id/reset-password`
Reset a user's password to default (`Jerrick#1`).

**Authentication:** Required (Admin or Foundational role)

**URL Parameters:**
- `id` - User ID (UUID)

**Constraints:**
- Cannot reset password for Google SSO users
- Only admin can reset admin passwords
- Sets `mustChangePassword` flag to 1

**Response (200):**
```json
{
  "success": true,
  "message": "Password has been reset. User must change password on next login."
}
```

---

#### DELETE `/api/admin/users/:id`
Delete a user account.

**Authentication:** Required (Admin role only)

**URL Parameters:**
- `id` - User ID (UUID)

**Constraints:**
- Cannot delete yourself
- Cannot delete admin users

**Response (200):**
```json
{
  "success": true,
  "message": "User has been deleted."
}
```

---

### Profile Routes

#### PATCH `/api/profile/username`
Update current user's username.

**Authentication:** Required

**Request Body:**
```json
{
  "username": "string" // Min 3 characters
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid-string",
    "username": "string",
    "role": "string",
    "googleId": "string" | null,
    "mustChangePassword": 0 | 1
  }
}
```

---

#### PATCH `/api/profile/password`
Change current user's password.

**Authentication:** Required (not available for Google SSO users)

**Request Body:**
```json
{
  "currentPassword": "string",
  "newPassword": "string" // Min 6 characters
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

#### POST `/api/profile/force-change-password`
Force password change after admin reset.

**Authentication:** Required (only when `mustChangePassword` = 1)

**Request Body:**
```json
{
  "newPassword": "string" // Min 6 characters
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password updated successfully",
  "user": {
    "id": "uuid-string",
    "username": "string",
    "role": "string",
    "googleId": "string" | null,
    "mustChangePassword": 0
  }
}
```

---

### Video Routes

#### GET `/api/videos`
Get all sermon videos.

**Response (200):**
```json
[
  {
    "id": 1,
    "title": "string",
    "objectPath": "/objects/...",
    "thumbnailPath": "/objects/..." | null,
    "captionsPath": "/objects/..." | null,
    "captionStatus": "none" | "generating" | "ready" | "failed",
    "recordedDate": "YYYY-MM-DD",
    "duration": "string" | null,
    "views": 0,
    "createdAt": "ISO-date-string"
  }
]
```

---

#### GET `/api/videos/:id`
Get a specific video.

**URL Parameters:**
- `id` - Video ID (integer)

**Response (200):** Single video object (same schema as above)

---

#### POST `/api/videos`
Create a new video entry.

**Request Body:**
```json
{
  "title": "string",
  "objectPath": "string",
  "thumbnailPath": "string" | null,
  "recordedDate": "YYYY-MM-DD",
  "duration": "string" | null
}
```

---

#### PUT `/api/videos/:id`
Update a video.

**URL Parameters:**
- `id` - Video ID (integer)

**Request Body:**
```json
{
  "title": "string",
  "thumbnailPath": "string" | null
}
```

---

#### DELETE `/api/videos/:id`
Delete a video.

**Authentication:** Required (Admin role only)

**URL Parameters:**
- `id` - Video ID (integer)

---

#### POST `/api/videos/:id/view`
Increment video view count.

**URL Parameters:**
- `id` - Video ID (integer)

---

#### POST `/api/videos/:id/generate-captions`
Start AI caption generation for a video.

**URL Parameters:**
- `id` - Video ID (integer)

**Response (200):**
```json
{
  "message": "Caption generation started",
  "status": "generating"
}
```

---

#### GET `/api/videos/:id/caption-status`
Get caption generation status.

**URL Parameters:**
- `id` - Video ID (integer)

**Response (200):**
```json
{
  "status": "none" | "generating" | "ready" | "failed",
  "captionsPath": "string" | null
}
```

---

### Verse Routes

#### GET `/api/verses/active`
Get the current verse of the day.

**Response (200):**
```json
{
  "id": 1,
  "verseText": "string",
  "reference": "Book Chapter:Verse",
  "isActive": 1,
  "createdAt": "ISO-date-string"
}
```

---

#### GET `/api/verses`
Get all verses.

**Response (200):** Array of verse objects

---

#### POST `/api/verses`
Create a new verse.

**Request Body:**
```json
{
  "verseText": "string",
  "reference": "string",
  "isActive": 0 | 1
}
```

---

#### PUT `/api/verses/:id`
Update a verse.

**URL Parameters:**
- `id` - Verse ID (integer)

---

#### POST `/api/verses/:id/activate`
Set a verse as the active verse of the day.

**URL Parameters:**
- `id` - Verse ID (integer)

---

### Photo Routes (Admin Gallery)

#### GET `/api/photos`
Get all family photos.

**Response (200):**
```json
[
  {
    "id": 1,
    "imagePath": "/objects/...",
    "caption": "string" | null,
    "displayOrder": 0,
    "createdAt": "ISO-date-string"
  }
]
```

---

#### POST `/api/photos`
Create a new photo entry.

**Request Body:**
```json
{
  "imagePath": "string",
  "caption": "string" | null,
  "displayOrder": 0
}
```

---

#### PUT `/api/photos/:id`
Update a photo.

---

#### DELETE `/api/photos/:id`
Delete a photo.

**Authentication:** Required (Admin role only)

---

### Member Photo Routes (Submission Workflow)

#### GET `/api/member-photos/my`
Get current user's submitted photos.

**Authentication:** Required

**Response (200):**
```json
[
  {
    "id": 1,
    "userId": "uuid-string",
    "imagePath": "/objects/...",
    "caption": "string" | null,
    "status": "pending" | "approved" | "rejected",
    "reviewedBy": "uuid-string" | null,
    "reviewedAt": "ISO-date-string" | null,
    "createdAt": "ISO-date-string"
  }
]
```

---

#### POST `/api/member-photos`
Submit a new photo for approval.

**Authentication:** Required

**Request Body:**
```json
{
  "imagePath": "string",
  "caption": "string" | null
}
```

---

#### GET `/api/member-photos/pending`
Get all pending photos (Admin/Foundational only).

**Authentication:** Required (Admin or Foundational role)

---

#### GET `/api/member-photos/all`
Get all member photos (Admin/Foundational only).

**Authentication:** Required (Admin or Foundational role)

---

#### GET `/api/member-photos/approved`
Get approved member photos (public).

---

#### PATCH `/api/member-photos/:id/status`
Approve or reject a photo.

**Authentication:** Required (Admin or Foundational role)

**Request Body:**
```json
{
  "status": "approved" | "rejected"
}
```

---

#### DELETE `/api/member-photos/:id`
Delete a member photo.

**Authentication:** Required (owner or Admin/Foundational)

---

### Quiz Routes

#### GET `/api/quiz/books`
Get all 66 Bible books with question counts.

**Response (200):**
```json
[
  {
    "name": "Genesis",
    "questionCount": 10,
    "approvedCount": 10,
    "hasQuiz": true
  },
  ...
]
```

---

#### GET `/api/quiz/questions/:book`
Get quiz questions for a specific book (10 random, shuffled).

**URL Parameters:**
- `book` - Bible book name (e.g., "Genesis")

**Response (200):**
```json
[
  {
    "id": 1,
    "questionText": "string",
    "optionA": "string",
    "optionB": "string",
    "optionC": "string",
    "optionD": "string",
    "scriptureReference": "Book Chapter:Verse" | null
  }
]
```

**Note:** Correct answers are NOT included in this response.

---

#### POST `/api/quiz/check-answer`
Check a single answer for immediate feedback.

**Request Body:**
```json
{
  "questionId": 1,
  "selectedAnswer": "A" | "B" | "C" | "D"
}
```

**Response (200):**
```json
{
  "correct": true | false,
  "correctAnswer": "A" | "B" | "C" | "D"
}
```

---

#### POST `/api/quiz/submit`
Submit all quiz answers and get final score.

**Request Body:**
```json
{
  "book": "Genesis",
  "answers": [
    { "questionId": 1, "selectedAnswer": "A" },
    { "questionId": 2, "selectedAnswer": "C" },
    ...
  ]
}
```

**Response (200):**
```json
{
  "score": 8,
  "totalQuestions": 10,
  "results": [
    {
      "questionId": 1,
      "correct": true,
      "correctAnswer": "A",
      "scriptureReference": "Genesis 1:1"
    },
    ...
  ]
}
```

---

#### GET `/api/quiz/my-history`
Get current user's quiz attempt history.

**Authentication:** Required

**Response (200):**
```json
[
  {
    "id": 1,
    "userId": "uuid-string",
    "book": "Genesis",
    "score": 8,
    "totalQuestions": 10,
    "completedAt": "ISO-date-string"
  }
]
```

---

#### POST `/api/quiz/migrate`
Migrate local (guest) quiz progress to user account.

**Authentication:** Required

**Request Body:**
```json
{
  "books": ["Genesis", "Exodus", ...]
}
```

**Response (200):**
```json
{
  "success": true,
  "migratedCount": 5
}
```

---

#### GET `/api/quiz/stats`
Get overall quiz statistics.

**Response (200):**
```json
{
  "totalQuestions": 660,
  "approvedQuestions": 660,
  "booksWithQuiz": 66,
  "totalBooks": 66,
  "totalAttempts": 150
}
```

---

### Admin Quiz Routes

> **Note:** All admin quiz routes are accessible by Admin and Foundational members.

#### GET `/api/admin/quiz/questions/:book`
Get all questions for a book, including unapproved questions.

**Authentication:** Not required (but typically used by admins)

**URL Parameters:**
- `book` - Bible book name (e.g., "Genesis", "Revelation")

**Response (200):**
```json
[
  {
    "id": 1,
    "book": "Genesis",
    "questionText": "Who was the first man created by God?",
    "optionA": "Abraham",
    "optionB": "Adam",
    "optionC": "Noah",
    "optionD": "Moses",
    "correctAnswer": "B",
    "scriptureReference": "Genesis 2:7",
    "isApproved": 1,
    "createdAt": "ISO-date-string"
  }
]
```

**Note:** Unlike the public quiz endpoint, this includes the `correctAnswer` and `isApproved` fields.

---

#### POST `/api/admin/quiz/generate/:book`
Generate AI questions for a specific book using Gemini AI.

**URL Parameters:**
- `book` - Bible book name

**Request Body:**
```json
{
  "count": 10 // Optional, defaults to 10
}
```

**Response (200):**
```json
{
  "message": "Generated 10 questions for Genesis",
  "questions": [
    {
      "id": 1,
      "book": "Genesis",
      "questionText": "string",
      "optionA": "string",
      "optionB": "string",
      "optionC": "string",
      "optionD": "string",
      "correctAnswer": "A" | "B" | "C" | "D",
      "scriptureReference": "string",
      "isApproved": 0,
      "createdAt": "ISO-date-string"
    }
  ]
}
```

**Note:** Generated questions are created with `isApproved: 0` and require manual approval.

---

#### POST `/api/admin/quiz/generate-all`
Bulk generate questions for all 66 books.

**Request Body:**
```json
{
  "skipExisting": true // Optional, defaults to true
}
```

**Response (200):**
```json
{
  "message": "Generated questions for 66 books (0 failed)",
  "totalBooks": 66,
  "successCount": 66,
  "failCount": 0,
  "skippedCount": 0,
  "results": [
    { "book": "Genesis", "success": true, "count": 10 },
    { "book": "Exodus", "success": true, "count": 10 }
  ]
}
```

**Note:** This is a long-running operation. Books with 10+ existing questions are skipped when `skipExisting: true`.

---

#### POST `/api/admin/quiz/approve/:id`
Approve a single question, making it available for quizzes.

**URL Parameters:**
- `id` - Question ID (integer)

**Response (200):**
```json
{
  "success": true
}
```

---

#### POST `/api/admin/quiz/approve-book/:book`
Approve all unapproved questions for a specific book.

**URL Parameters:**
- `book` - Bible book name

**Response (200):**
```json
{
  "success": true
}
```

---

#### PUT `/api/admin/quiz/questions/:id`
Update a question's content.

**URL Parameters:**
- `id` - Question ID (integer)

**Request Body (all fields optional):**
```json
{
  "questionText": "string",
  "optionA": "string",
  "optionB": "string",
  "optionC": "string",
  "optionD": "string",
  "correctAnswer": "A" | "B" | "C" | "D",
  "scriptureReference": "string",
  "isApproved": 0 | 1
}
```

**Response (200):**
```json
{
  "id": 1,
  "book": "Genesis",
  "questionText": "Updated question text",
  "optionA": "string",
  "optionB": "string",
  "optionC": "string",
  "optionD": "string",
  "correctAnswer": "B",
  "scriptureReference": "Genesis 1:1",
  "isApproved": 1,
  "createdAt": "ISO-date-string"
}
```

---

#### DELETE `/api/admin/quiz/questions/:id`
Delete a single question.

**URL Parameters:**
- `id` - Question ID (integer)

**Response (200):**
```json
{
  "success": true
}
```

---

#### DELETE `/api/admin/quiz/questions-book/:book`
Delete ALL questions for a specific book.

**URL Parameters:**
- `book` - Bible book name

**Response (200):**
```json
{
  "success": true
}
```

**Warning:** This is a destructive operation that removes all questions for the specified book.

---

### YouTube Integration Routes

#### GET `/api/youtube/live-status`
Check if the church YouTube channel is currently live streaming.

**Response (200):**
```json
{
  "isLive": true | false,
  "videoId": "youtube-video-id" | null,
  "title": "Live Service Title" | null
}
```

**Note:** Polls every 30 seconds on client side.

---

#### GET `/api/youtube/playlist/:playlistId`
Get videos from a YouTube playlist.

**URL Parameters:**
- `playlistId` - YouTube playlist ID

**Response (200):**
```json
{
  "videos": [
    {
      "videoId": "string",
      "title": "string",
      "description": "string",
      "thumbnail": "url",
      "publishedAt": "ISO-date-string",
      "position": 0
    }
  ]
}
```

**Note:** Results are cached for 5 minutes.

**Worship & Music Playlist ID:** `PLkDsdLHKY8laSsy8xYfILnVzFMedR0Rgy`

---

### Settings Routes

#### GET `/api/settings/zoom-link`
Get the configured Zoom meeting link.

**Response (200):**
```json
{
  "zoomLink": "https://zoom.us/j/..." | ""
}
```

---

#### PUT `/api/settings/zoom-link`
Update the Zoom meeting link.

**Authentication:** Required (Admin or Foundational role)

**Request Body:**
```json
{
  "zoomLink": "https://zoom.us/j/..."
}
```

---

### Object Storage Routes

#### POST `/api/objects/upload`
Get a signed URL for file upload.

**Response (200):**
```json
{
  "uploadURL": "signed-url-for-upload"
}
```

---

#### GET `/api/objects/signed-url`
Get a signed URL for downloading/streaming a file.

**Query Parameters:**
- `path` - Object path (must start with `/objects/`)

**Response (200):**
```json
{
  "url": "signed-download-url"
}
```

---

#### GET `/objects/:objectPath`
Serve object files directly (videos, images).

**Features:**
- Supports HTTP Range requests for video seeking
- CORS enabled for all origins

---

## Data Models

### User
```typescript
{
  id: string;           // UUID
  username: string;
  password: string | null; // Hashed, null for Google SSO
  googleId: string | null;
  email: string | null;
  role: "admin" | "foundational" | "member";
  mustChangePassword: 0 | 1;
  createdAt: Date;
}
```

### Video
```typescript
{
  id: number;
  title: string;
  objectPath: string;
  thumbnailPath: string | null;
  captionsPath: string | null;
  captionStatus: "none" | "generating" | "ready" | "failed";
  recordedDate: string; // YYYY-MM-DD
  duration: string | null;
  views: number;
  createdAt: Date;
}
```

### Verse
```typescript
{
  id: number;
  verseText: string;
  reference: string;
  isActive: 0 | 1;
  createdAt: Date;
}
```

### Photo
```typescript
{
  id: number;
  imagePath: string;
  caption: string | null;
  displayOrder: number;
  createdAt: Date;
}
```

### MemberPhoto
```typescript
{
  id: number;
  userId: string;
  imagePath: string;
  caption: string | null;
  status: "pending" | "approved" | "rejected";
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}
```

### QuizQuestion
```typescript
{
  id: number;
  book: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  scriptureReference: string | null;
  isApproved: 0 | 1;
  createdAt: Date;
}
```

### QuizAttempt
```typescript
{
  id: number;
  userId: string | null; // null for guest attempts
  book: string;
  score: number;
  totalQuestions: number;
  completedAt: Date;
}
```

### SiteSetting
```typescript
{
  id: number;
  key: string;
  value: string;
  updatedAt: Date;
}
```

---

## Role-Based Access Control

### Role Hierarchy

| Role | Description | Access Level |
|------|-------------|--------------|
| `admin` | Full administrative access | Highest |
| `foundational` | Content management access | Medium |
| `member` | Basic user access | Lowest |

### Permission Matrix

| Feature | Admin | Foundational | Member | Guest |
|---------|-------|--------------|--------|-------|
| View content | Yes | Yes | Yes | Yes |
| Take quizzes | Yes | Yes | Yes | Yes |
| Quiz history | Yes | Yes | Yes | No (local only) |
| Submit photos | Yes | Yes | Yes | No |
| Approve photos | Yes | Yes | No | No |
| Manage videos | Yes | Yes | No | No |
| Manage verses | Yes | Yes | No | No |
| Manage quiz questions | Yes | Yes | No | No |
| Create users | Yes | Limited | No | No |
| Change roles | Yes | Limited | No | No |
| Delete users | Yes | No | No | No |
| Reset passwords | Yes | Yes (non-admin) | No | No |

---

## UI/UX Specifications

### Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| Primary (Burnt Clay) | `#b47a5f` | Buttons, accents, icons |
| Background | Alabaster/Off-white | Page backgrounds |
| Zoom Blue | `#2563eb` | Zoom button |
| Live Red | `#dc2626` | Live stream indicator |

### Typography

- **Headings:** Cormorant Garamond (serif)
- **Body:** Manrope (sans-serif)

### Mobile-Specific UI

1. **Live Stream:** Portrait aspect ratio (9:16) on mobile to show all service time information
2. **Bible Quiz Books:** Accordion UI for book selection on screens < 1024px
3. **Navigation:** Mobile-responsive hamburger menu

---

## Error Handling

### Standard Error Response
```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (invalid input) |
| 401 | Unauthorized (authentication required) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (e.g., caption generation in progress) |
| 500 | Internal Server Error |

---

## Mobile-Specific Considerations

### Guest Quiz Progress

Guest users (not logged in) can take quizzes with progress stored locally. When they create an account or log in, call `POST /api/quiz/migrate` with the list of completed books to sync their progress:

```javascript
// After login, check for local progress
const localProgress = localStorage.getItem('completedQuizBooks');
if (localProgress) {
  const books = JSON.parse(localProgress);
  await fetch('/api/quiz/migrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ books }),
    credentials: 'include'
  });
  localStorage.removeItem('completedQuizBooks');
}
```

### Video Streaming

Videos are served from Google Cloud Storage. For optimal mobile playback:

1. Use the signed URL endpoint for direct streaming
2. Videos support HTTP Range requests for seeking
3. Consider implementing adaptive bitrate if adding multiple qualities

### Offline Support Recommendations

1. Cache verse of the day for offline display
2. Store quiz questions locally for offline quiz taking
3. Queue photo submissions for upload when online

### Push Notifications (Future)

Consider implementing push notifications for:
- Live stream starting
- New verse of the day
- Photo approval status updates

---

## Bible Books Reference

### Old Testament (39 books)
Genesis, Exodus, Leviticus, Numbers, Deuteronomy, Joshua, Judges, Ruth, 1 Samuel, 2 Samuel, 1 Kings, 2 Kings, 1 Chronicles, 2 Chronicles, Ezra, Nehemiah, Esther, Job, Psalms, Proverbs, Ecclesiastes, Song of Solomon, Isaiah, Jeremiah, Lamentations, Ezekiel, Daniel, Hosea, Joel, Amos, Obadiah, Jonah, Micah, Nahum, Habakkuk, Zephaniah, Haggai, Zechariah, Malachi

### New Testament (27 books)
Matthew, Mark, Luke, John, Acts, Romans, 1 Corinthians, 2 Corinthians, Galatians, Ephesians, Philippians, Colossians, 1 Thessalonians, 2 Thessalonians, 1 Timothy, 2 Timothy, Titus, Philemon, Hebrews, James, 1 Peter, 2 Peter, 1 John, 2 John, 3 John, Jude, Revelation

---

## Default Credentials

**Admin Account:**
- Username: `admin`
- Password: `Jfoundation@1`

**Password Reset Default:**
- `Jerrick#1`

---

## Environment Variables Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `PUBLIC_APP_URL` | Production URL for OAuth redirects |
| `PRIVATE_OBJECT_DIR` | Object storage private directory |

---

## Changelog (Post November 30, 2025)

### December 2, 2025
- Created comprehensive mobile app API documentation
- Documented all API endpoints with request/response schemas
- Included role-based access control matrix
- Added mobile-specific UI considerations (portrait aspect ratio, accordion UI)
- Documented guest quiz progress migration workflow

---

*For questions or updates, refer to the web application codebase or contact the development team.*
