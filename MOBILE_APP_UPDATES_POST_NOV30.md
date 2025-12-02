# Mobile App Updates - Post November 30, 2025

**Document Created:** December 2, 2025  
**Purpose:** This document lists all changes, new features, and design updates made to the web application AFTER November 30, 2025. Use this to update the mobile app to match the current web application.

---

## Summary of Changes

The following updates were made to the web application after the original mobile app specification was created. Each section includes the change description, affected screens, and implementation details for the mobile app.

---

## 1. SEO & Branding Updates

### 1.1 Favicon Change
- **Change:** Replaced default Replit favicon with church charity logo
- **File Location:** `client/public/favicon.png`
- **Mobile App Impact:** Update app icon to match the new favicon design

### 1.2 Social Sharing Preview Image
- **Change:** Added stained glass church image for social media previews
- **File Location:** `client/public/opengraph.png`
- **Mobile App Impact:** Use same image for app store listings and share functionality

### 1.3 Meta Information
- **Title:** "Jerricks for Jesus | Sanctuary of Light"
- **Description:** "Join our faith community for live services, Bible quizzes, and spiritual growth. Friday services at 6 AM & 6 PM EST."
- **Mobile App Impact:** Update app store description and in-app About section

---

## 2. Mobile-Responsive UI Changes

### 2.1 Live Stream Aspect Ratio
- **Change:** Portrait aspect ratio (9:16) on mobile devices
- **Breakpoint:** Applied on screens < 768px (md breakpoint)
- **Previous:** 16:9 aspect ratio on all devices
- **Reason:** Displays all service time information without content being cut off
- **Implementation:**
  ```css
  /* Mobile */
  aspect-ratio: 9/16;
  
  /* Desktop (md and above) */
  aspect-ratio: 16/9;
  ```
- **Affected Screens:** 
  - Home page Live Stream section
  - `/live` dedicated Live Stream page

### 2.2 Bible Quiz Book Selection - Accordion UI
- **Change:** Accordion-style book selection on mobile/tablet
- **Breakpoint:** Applied on screens < 1024px (lg breakpoint)
- **Previous:** Grid layout showing all 66 books
- **Current Behavior:**
  - Old Testament expands/collapses as a group (39 books)
  - New Testament expands/collapses as a group (27 books)
  - Reduces scroll length on mobile devices
- **Desktop Behavior:** Traditional grid layout (unchanged)
- **Affected Screens:** Bible Quiz section (Home page and Admin dashboard)
- **See Section 8 for complete Bible Quiz implementation details**

### 2.3 Zoom Button in Hero Section
- **Change:** Brown/burnt clay colored Zoom button added to hero
- **Color:** `#b47a5f` (primary brand color)
- **Location:** Hero section, links to configured Zoom meeting
- **Visibility:** Only shown when Zoom link is configured in settings

---

## 3. User Authentication Updates

### 3.1 Login with Email Support
- **Change:** Users can now log in with username OR email
- **API Endpoint:** `POST /api/auth/login`
- **Request Body:**
  ```json
  {
    "username": "string", // Can be username OR email address
    "password": "string"
  }
  ```
- **Mobile App Impact:** Update login form to accept email as username

### 3.2 Password Visibility Toggle
- **Change:** Eye icon to show/hide password on login and registration forms
- **Affected Screens:**
  - Login page
  - Registration page
  - Profile settings (change password)
  - Admin forced password change dialog
- **Mobile App Impact:** Add password visibility toggle to all password fields

### 3.3 Force Password Change Flow
- **Change:** Users with reset passwords must change password on next login
- **Trigger:** When admin resets a user's password
- **Default Reset Password:** `Jerrick#1`
- **API Flag:** `mustChangePassword: 1` in user object
- **New Endpoint:** `POST /api/profile/force-change-password`
- **Mobile App Impact:** 
  - Check `mustChangePassword` flag after login
  - Show mandatory password change modal if flag is 1
  - Block access to other screens until password is changed

---

## 4. User Profile Settings (New Feature)

### 4.1 Update Username
- **Endpoint:** `PATCH /api/profile/username`
- **Request:** `{ "username": "new_username" }`
- **Validation:** Minimum 3 characters, must be unique
- **Mobile App Impact:** Add username update field in profile/settings screen

### 4.2 Change Password
- **Endpoint:** `PATCH /api/profile/password`
- **Request:** 
  ```json
  {
    "currentPassword": "string",
    "newPassword": "string"
  }
  ```
- **Validation:** 
  - Current password must match
  - New password minimum 6 characters
- **Note:** Not available for Google SSO users
- **Mobile App Impact:** Add password change section in profile/settings screen

---

## 5. Admin User Management Updates

### 5.1 Password Reset Button
- **Change:** Admins and Foundational members can reset user passwords
- **Endpoint:** `POST /api/admin/users/:id/reset-password`
- **Behavior:** 
  - Resets password to `Jerrick#1`
  - Sets `mustChangePassword` flag to 1
  - User forced to change password on next login
- **Restriction:** Only admins can reset admin passwords
- **Not Available:** For Google SSO users (disabled button with Google logo indicator)

### 5.2 User Deletion with Two-Step Confirmation
- **Change:** Admins can delete non-admin users
- **Endpoint:** `DELETE /api/admin/users/:id`
- **Confirmation Flow:**
  1. Click delete button
  2. Dialog appears asking to type username to confirm
  3. Must type exact username to enable delete button
  4. Click "Delete Forever" to confirm
- **Restrictions:**
  - Cannot delete yourself
  - Cannot delete admin users
- **Mobile App Impact:** Implement two-step deletion confirmation in admin panel

### 5.3 Google SSO User Indicator
- **Change:** User list shows Google SSO badge for SSO users
- **Display:** Google logo icon next to username
- **Behavior:** Password reset button is disabled for SSO users
- **Mobile App Impact:** Show Google SSO indicator in user management list

---

## 6. Member Photo Submission Workflow (New Feature)

### 6.1 Photo Submission for Members
- **Feature:** Any logged-in user can submit photos for the family gallery
- **Endpoint:** `POST /api/member-photos`
- **Flow:**
  1. Member uploads photo with optional caption
  2. Photo status is set to "pending"
  3. Admin/Foundational reviews and approves/rejects
  4. Approved photos appear in family gallery

### 6.2 My Photos Dashboard
- **Endpoint:** `GET /api/member-photos/my`
- **Display:** Shows user's submitted photos with status
- **Statuses:** pending, approved, rejected
- **Mobile App Impact:** Add "My Photos" section showing submission history

### 6.3 Admin Photo Approval
- **Endpoint:** `GET /api/member-photos/pending`
- **Endpoint:** `PATCH /api/member-photos/:id/status`
- **Request:** `{ "status": "approved" | "rejected" }`
- **Mobile App Impact:** Add pending photos review in admin panel

### 6.4 Approved Member Photos Display
- **Endpoint:** `GET /api/member-photos/approved`
- **Display:** Shows in family photo carousel alongside admin photos
- **Mobile App Impact:** Fetch both `/api/photos` and `/api/member-photos/approved` for family gallery

---

## 7. Bible Quiz System - Complete Implementation Guide

### 7.1 System Architecture Overview

The Bible Quiz system consists of:
- **66 Books** covering the complete Bible (39 Old Testament + 27 New Testament)
- **10 Questions per Quiz** randomly selected from approved questions for each book
- **AI-Generated Questions** using Gemini 2.5 Flash model from actual scripture content
- **Admin Approval Workflow** - questions require approval before use in quizzes
- **Guest Progress Tracking** with migration to account on login

### 7.2 Bible Books Structure

#### Old Testament (39 Books)
```
Genesis, Exodus, Leviticus, Numbers, Deuteronomy,
Joshua, Judges, Ruth, 1 Samuel, 2 Samuel,
1 Kings, 2 Kings, 1 Chronicles, 2 Chronicles, Ezra,
Nehemiah, Esther, Job, Psalms, Proverbs,
Ecclesiastes, Song of Solomon, Isaiah, Jeremiah, Lamentations,
Ezekiel, Daniel, Hosea, Joel, Amos,
Obadiah, Jonah, Micah, Nahum, Habakkuk,
Zephaniah, Haggai, Zechariah, Malachi
```

#### New Testament (27 Books)
```
Matthew, Mark, Luke, John, Acts,
Romans, 1 Corinthians, 2 Corinthians, Galatians, Ephesians,
Philippians, Colossians, 1 Thessalonians, 2 Thessalonians, 1 Timothy,
2 Timothy, Titus, Philemon, Hebrews, James,
1 Peter, 2 Peter, 1 John, 2 John, 3 John,
Jude, Revelation
```

### 7.3 Chapter Counts Per Book

Mobile app should use this data to display book information:

```javascript
const BOOK_CHAPTERS = {
  // Old Testament
  "Genesis": 50, "Exodus": 40, "Leviticus": 27, "Numbers": 36, "Deuteronomy": 34,
  "Joshua": 24, "Judges": 21, "Ruth": 4, "1 Samuel": 31, "2 Samuel": 24,
  "1 Kings": 22, "2 Kings": 25, "1 Chronicles": 29, "2 Chronicles": 36, "Ezra": 10,
  "Nehemiah": 13, "Esther": 10, "Job": 42, "Psalms": 150, "Proverbs": 31,
  "Ecclesiastes": 12, "Song of Solomon": 8, "Isaiah": 66, "Jeremiah": 52, "Lamentations": 5,
  "Ezekiel": 48, "Daniel": 12, "Hosea": 14, "Joel": 3, "Amos": 9,
  "Obadiah": 1, "Jonah": 4, "Micah": 7, "Nahum": 3, "Habakkuk": 3,
  "Zephaniah": 3, "Haggai": 2, "Zechariah": 14, "Malachi": 4,
  // New Testament
  "Matthew": 28, "Mark": 16, "Luke": 24, "John": 21, "Acts": 28,
  "Romans": 16, "1 Corinthians": 16, "2 Corinthians": 13, "Galatians": 6, "Ephesians": 6,
  "Philippians": 4, "Colossians": 4, "1 Thessalonians": 5, "2 Thessalonians": 3, "1 Timothy": 6,
  "2 Timothy": 4, "Titus": 3, "Philemon": 1, "Hebrews": 13, "James": 5,
  "1 Peter": 5, "2 Peter": 3, "1 John": 5, "2 John": 1, "3 John": 1,
  "Jude": 1, "Revelation": 22
};
```

### 7.4 Question Schema

Each question in the database has this structure:

```typescript
interface QuizQuestion {
  id: number;                    // Auto-generated primary key
  book: string;                  // Book name (e.g., "Genesis")
  questionText: string;          // The question text
  optionA: string;               // Answer option A
  optionB: string;               // Answer option B
  optionC: string;               // Answer option C
  optionD: string;               // Answer option D
  correctAnswer: "A"|"B"|"C"|"D"; // Which option is correct
  scriptureReference: string;    // e.g., "Genesis 1:3-5"
  isApproved: 0 | 1;            // 0 = pending, 1 = approved
  createdAt: Date;              // When question was created
}
```

### 7.5 Quiz Generation Flow (How Questions Are Created)

1. **Admin triggers generation** for a book via admin panel
2. **API fetches scripture content** from bible-api.com (KJV translation)
   - For short books (≤10 chapters): Fetches all chapters
   - For medium books (10-30 chapters): Fetches first 3, middle, and last 2 chapters
   - For long books (>30 chapters): Samples evenly distributed chapters
3. **AI generates 10 questions** using Gemini 2.5 Flash model
4. **Questions are saved** to database with `isApproved: 0`
5. **Admin reviews and approves** each question or bulk approves all for a book
6. **Only approved questions** appear in user quizzes

### 7.6 Quiz Taking Flow

#### Step 1: Fetch Available Books
```
GET /api/quiz/books
```
**Response:**
```json
[
  {
    "name": "Genesis",
    "questionCount": 10,      // Total questions in database
    "approvedCount": 10,      // How many are approved
    "hasQuiz": true           // true if approvedCount >= 1
  }
]
```

#### Step 2: User Selects Book (UI Implementation)

**Mobile/Tablet (< 1024px):**
- Display as Accordion with two sections:
  - "Old Testament" header (tap to expand/collapse)
  - "New Testament" header (tap to expand/collapse)
- Inside each accordion: 3-column grid of book buttons
- Book button shows:
  - Book name (center aligned)
  - Checkmark icon if completed, Book icon if available
  - Disabled/grayed out if `hasQuiz: false`

**Desktop (≥ 1024px):**
- Two side-by-side panels: "Old Testament" and "New Testament"
- 4-column grid of book buttons in each panel
- Same button styling as mobile

#### Step 3: Fetch Questions for Selected Book
```
GET /api/quiz/questions/:book
```
**Example:** `GET /api/quiz/questions/Genesis`

**Response:** Array of 10 shuffled questions (correct answer hidden):
```json
[
  {
    "id": 123,
    "questionText": "What did God create on the first day?",
    "optionA": "Light",
    "optionB": "Animals",
    "optionC": "Man",
    "optionD": "Water",
    "scriptureReference": "Genesis 1:3-5"
  }
]
```

**Important:** The API returns exactly 10 random approved questions. Server-side:
- Fetches all approved questions for the book
- Shuffles them randomly
- Returns first 10 (or fewer if less available)
- Excludes `correctAnswer` from response

#### Step 4: Display Question (One at a Time)

**UI Elements:**
- Progress indicator: "Question 3 of 10"
- Progress bar: Visual percentage complete
- Question text: Large, readable font
- Four answer buttons (A, B, C, D) stacked vertically
- Buttons show: "A. [Option text]", "B. [Option text]", etc.

#### Step 5: User Selects Answer - Immediate Feedback

When user taps an answer:
```
POST /api/quiz/check-answer
```
**Request:**
```json
{
  "questionId": 123,
  "selectedAnswer": "A"
}
```
**Response:**
```json
{
  "correct": true,
  "correctAnswer": "A"
}
```

**UI Feedback (1.5 second delay before next question):**
- If correct: Selected button turns green, shows checkmark
- If wrong: Selected button turns red, correct button turns green
- Display scripture reference below options
- Disable all answer buttons during feedback

#### Step 6: Store Answer and Move to Next

```typescript
// Store each answer locally
answers.push({
  questionId: 123,
  selectedAnswer: "A"
});

// After 1.5 seconds, move to next question
currentQuestionIndex++;
```

#### Step 7: Submit All Answers When Complete
```
POST /api/quiz/submit
```
**Request:**
```json
{
  "book": "Genesis",
  "answers": [
    { "questionId": 123, "selectedAnswer": "A" },
    { "questionId": 124, "selectedAnswer": "B" },
    // ... all 10 answers
  ]
}
```
**Response:**
```json
{
  "score": 8,
  "totalQuestions": 10,
  "results": [
    {
      "questionId": 123,
      "correct": true,
      "correctAnswer": "A",
      "scriptureReference": "Genesis 1:3-5"
    }
  ]
}
```

#### Step 8: Display Results Screen

**UI Elements:**
- Score display: "8/10" or "80%"
- Encouraging message based on score:
  - 100%: "Perfect Score!"
  - 80-99%: "Excellent!"
  - 60-79%: "Good Job!"
  - <60%: "Keep Learning!"
- "Try Another Book" button → Return to book selection
- "Retry" button → Restart same book with new questions

### 7.7 Guest Progress Tracking

**For Non-Logged-In Users:**
1. Store completed books in local storage:
   ```javascript
   const key = "quiz_completed_books";
   const completed = JSON.parse(localStorage.getItem(key) || "[]");
   completed.push("Genesis");
   localStorage.setItem(key, JSON.stringify(completed));
   ```
2. Show completed books with checkmark in book selection
3. Progress persists in local storage until login

**After User Logs In:**
1. Call migrate endpoint immediately:
   ```
   POST /api/quiz/migrate
   ```
   **Request:**
   ```json
   { "books": ["Genesis", "Exodus", "Matthew"] }
   ```
2. Server records these as completed quiz attempts
3. Clear local storage after successful migration
4. Completed books now tracked on server

### 7.8 Quiz History View
```
GET /api/quiz/my-history
```
**Response:**
```json
[
  {
    "id": 456,
    "book": "Genesis",
    "score": 8,
    "totalQuestions": 10,
    "completedAt": "2025-12-01T15:30:00Z"
  }
]
```

**UI:** Display as list showing:
- Book name
- Score (e.g., "8/10")
- Date completed
- Sorted by most recent first

### 7.9 Admin Quiz Management

**Get All Questions for Book (including unapproved):**
```
GET /api/admin/quiz/questions/:book
```

**Generate New Questions:**
```
POST /api/admin/quiz/generate/:book
Body: { "count": 10 }  // Optional, defaults to 10
```

**Approve Single Question:**
```
POST /api/admin/quiz/approve/:id
```

**Approve All Questions for Book:**
```
POST /api/admin/quiz/approve-book/:book
```

**Update Question:**
```
PUT /api/admin/quiz/questions/:id
Body: { "questionText": "...", "optionA": "...", ... }
```

**Delete Single Question:**
```
DELETE /api/admin/quiz/questions/:id
```

**Delete All Questions for Book:**
```
DELETE /api/admin/quiz/questions-book/:book
```

**Generate Questions for All Books (Bulk):**
```
POST /api/admin/quiz/generate-all
Body: { "skipExisting": true }  // Skip books that already have questions
```

---

## 8. Design System Updates

### 8.1 Color Palette (Confirmed)
| Name | Hex | Usage |
|------|-----|-------|
| Primary (Burnt Clay) | `#b47a5f` | Buttons, accents, icons, highlights |
| Background | Alabaster/Off-white | Page backgrounds |
| Zoom Blue | `#2563eb` | Zoom meeting buttons |
| Live Red | `#dc2626` | Live stream indicator with pulse animation |
| Success Green | `#16a34a` | Correct answer, approval status |
| Error Red | `#dc2626` | Incorrect answer, rejection status |

### 8.2 Typography (Confirmed)
- **Headings:** Cormorant Garamond (serif)
- **Body Text:** Manrope (sans-serif)

### 8.3 Animation Standards
- Live stream "LIVE" badge has pulsing dot animation
- Quiz answer feedback uses fade-in animations
- Accordion sections use smooth expand/collapse transitions

---

## 9. Video Caption System

### 9.1 AI Caption Generation
- **Feature:** Generate AI-powered captions for sermon videos
- **Endpoint:** `POST /api/videos/:id/generate-captions`
- **Response:** `{ "message": "Caption generation started", "status": "generating" }`
- **Caption Statuses:**
  - `none` - No captions generated
  - `generating` - Caption generation in progress
  - `ready` - Captions available
  - `failed` - Generation failed

### 9.2 Caption Status Check
- **Endpoint:** `GET /api/videos/:id/caption-status`
- **Response:** 
  ```json
  {
    "status": "none" | "generating" | "ready" | "failed",
    "captionsPath": "/objects/..." | null
  }
  ```
- **Mobile App Impact:** 
  - Show caption status badge on video cards
  - Display "Generating..." indicator during processing
  - Show CC button when captions are ready

### 9.3 Caption UI States
| Status | Display |
|--------|---------|
| `none` | "Generate Captions" button |
| `generating` | Spinning loader with "Generating..." text |
| `ready` | "CC" badge on video, toggle for captions |
| `failed` | "Retry" button with error indicator |

---

## 10. Admin Quiz Management Updates

### 10.1 Bulk Book Approval
- **Feature:** Approve all questions for a book at once
- **Endpoint:** `POST /api/admin/quiz/approve-book/:book`
- **Response:** `{ "success": true }`
- **Mobile App Impact:** Add "Approve All" button per book in admin quiz panel

### 10.2 Single Question Approval
- **Endpoint:** `POST /api/admin/quiz/approve/:id`
- **Response:** `{ "success": true }`

### 10.3 Question Management
- **Update:** `PUT /api/admin/quiz/questions/:id`
- **Delete Single:** `DELETE /api/admin/quiz/questions/:id`
- **Delete All for Book:** `DELETE /api/admin/quiz/questions-book/:book`

---

## 11. Verse Management Updates

### 11.1 Verse Activation Flow
- **Feature:** Set active verse of the day
- **Endpoint:** `POST /api/verses/:id/activate`
- **Behavior:** Deactivates all other verses, activates selected verse
- **Mobile App Impact:** Show active indicator on verse list, activation button

---

## 12. API Endpoint Changes Summary

### New Endpoints Added
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/profile/username` | PATCH | Update current user's username |
| `/api/profile/password` | PATCH | Change current user's password |
| `/api/profile/force-change-password` | POST | Forced password change after reset |
| `/api/admin/users/:id/reset-password` | POST | Reset user password to default |
| `/api/admin/users/:id` | DELETE | Delete a user account |
| `/api/member-photos/my` | GET | Get current user's submitted photos |
| `/api/member-photos` | POST | Submit a photo for approval |
| `/api/member-photos/pending` | GET | Get pending photos (admin) |
| `/api/member-photos/all` | GET | Get all member photos (admin) |
| `/api/member-photos/approved` | GET | Get approved member photos |
| `/api/member-photos/:id/status` | PATCH | Approve/reject photo |
| `/api/member-photos/:id` | DELETE | Delete member photo |
| `/api/quiz/check-answer` | POST | Check single answer immediately |
| `/api/quiz/migrate` | POST | Migrate guest progress to account |
| `/api/quiz/my-history` | GET | Get user's quiz attempt history |
| `/api/auth/google/debug` | GET | Debug OAuth redirect URI |
| `/api/videos/:id/generate-captions` | POST | Start AI caption generation |
| `/api/videos/:id/caption-status` | GET | Check caption generation status |
| `/api/admin/quiz/approve/:id` | POST | Approve single question |
| `/api/admin/quiz/approve-book/:book` | POST | Approve all questions for book |
| `/api/verses/:id/activate` | POST | Set verse as active |
| `/api/auth/google` | GET | Initiate Google OAuth flow |
| `/api/auth/google/callback` | GET | Handle Google OAuth callback |
| `/api/auth/google/debug` | GET | Debug OAuth redirect URI |
| `/api/youtube/playlist` | GET | Get worship music playlist videos |

### Modified Endpoints
| Endpoint | Change |
|----------|--------|
| `/api/auth/login` | Now accepts email in username field |
| `/api/auth/me` | Added `mustChangePassword` field in response |
| `/api/admin/users` | Added `googleId` field in response |
| `/api/videos` | Added `captionStatus`, `captionsPath` fields |

---

## 13. Google Single Sign-On (SSO) - Complete Implementation Guide

### 13.1 Overview

Google SSO allows users to sign in with their Google account instead of creating a separate username/password. The system uses OAuth 2.0 with the following flow:
1. User clicks "Sign in with Google" button
2. Browser redirects to Google's authentication page
3. User grants permission
4. Google redirects back with authorization code
5. Server exchanges code for tokens
6. Server creates/links user account and session

### 13.2 Required Configuration (Already Set Up on Web)

**Environment Variables:**
- `GOOGLE_CLIENT_ID` - OAuth 2.0 Client ID from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - OAuth 2.0 Client Secret from Google Cloud Console
- `PUBLIC_APP_URL` (optional) - Production URL for redirect URI (e.g., `https://jerricksforjesus.com`)

**Google Cloud Console Setup (for mobile app):**
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 credentials for mobile app (iOS and/or Android)
3. Configure authorized redirect URIs for mobile deep links

### 13.3 OAuth URLs Used

**Google Authorization URL:**
```
https://accounts.google.com/o/oauth2/v2/auth
```

**Required Query Parameters:**
| Parameter | Value |
|-----------|-------|
| `client_id` | `{GOOGLE_CLIENT_ID}` |
| `redirect_uri` | `{APP_URL}/api/auth/google/callback` |
| `response_type` | `code` |
| `scope` | `openid email profile` |
| `access_type` | `offline` |
| `prompt` | `select_account` |
| `state` | `{random 32-byte hex string}` |

**Token Exchange URL:**
```
https://oauth2.googleapis.com/token
```

### 13.4 Web Implementation Flow

#### Step 1: Initiate Google Sign-In
```javascript
// On mobile, open this URL in browser or WebView
const googleSignInUrl = `${API_BASE_URL}/api/auth/google`;
window.location.href = googleSignInUrl;
```

#### Step 2: Server Builds Authorization URL
```
GET /api/auth/google
```
Server constructs and redirects to:
```
https://accounts.google.com/o/oauth2/v2/auth
  ?client_id=xxx.apps.googleusercontent.com
  &redirect_uri=https://jerricksforjesus.com/api/auth/google/callback
  &response_type=code
  &scope=openid%20email%20profile
  &access_type=offline
  &prompt=select_account
  &state=abc123...
```

#### Step 3: Google Callback Processing
```
GET /api/auth/google/callback?code=xxx&state=abc123
```
Server:
1. Validates `state` matches stored cookie (CSRF protection)
2. Exchanges `code` for tokens at Google's token endpoint
3. Verifies ID token to get user info:
   - `sub` - Google user ID (unique per user)
   - `email` - User's email address
   - `name` - User's display name
4. Looks up user by Google ID or email
5. Creates session if user exists
6. Sets session cookie and redirects to home page

#### Step 4: Handle Errors
If user not found, redirects to:
```
/login?error=not_registered
```

**Error Codes:**
| Error | Meaning |
|-------|---------|
| `not_registered` | No account exists with this Google ID or email |
| `invalid_state` | CSRF validation failed |
| `no_code` | No authorization code received |
| `config` | Server OAuth configuration missing |
| `invalid_token` | Token verification failed |
| `auth_failed` | General authentication failure |

### 13.5 Mobile App Implementation

#### Option A: Use System Browser (Recommended)
```javascript
// Open in system browser
const googleLoginUrl = `${API_BASE_URL}/api/auth/google`;
Linking.openURL(googleLoginUrl);

// Handle deep link callback
Linking.addEventListener('url', (event) => {
  if (event.url.includes('/api/auth/google/callback')) {
    // Parse session token from URL or cookies
    // Navigate to home screen
  }
});
```

#### Option B: Use WebView with Cookie Handling
```javascript
// Load Google login in WebView
const webview = (
  <WebView
    source={{ uri: `${API_BASE_URL}/api/auth/google` }}
    onNavigationStateChange={(navState) => {
      // Check if redirected to home page (success)
      if (navState.url === `${API_BASE_URL}/`) {
        // Extract session cookie
        // Close WebView and update auth state
      }
      // Check for error
      if (navState.url.includes('/login?error=')) {
        // Parse error and show to user
      }
    }}
    sharedCookiesEnabled={true}
  />
);
```

#### Option C: Native SDK (iOS/Android)
For native mobile SDK implementation:
1. Use Google Sign-In SDK for iOS/Android
2. Get ID token from Google SDK
3. Send to custom backend endpoint for verification
4. Receive session token in response

### 13.6 Linking Google to Existing Account

When a user signs in with Google:
1. Server checks if user exists by Google ID (`googleId` field)
2. If not found, checks if email matches existing user
3. If email matches, links Google ID to that account
4. If no match, returns `not_registered` error

**Important:** Users must first create an account (username/password or through registration), then can link Google account by signing in with matching email.

### 13.7 Session Cookie Details

**Cookie Name:** `sessionToken`

**Cookie Settings:**
```javascript
{
  httpOnly: true,         // Not accessible via JavaScript
  secure: true,           // Only sent over HTTPS (production)
  sameSite: "lax",        // CSRF protection
  maxAge: 604800000       // 7 days in milliseconds
}
```

**Mobile Handling:**
- For WebView: Enable `sharedCookiesEnabled` 
- For native: Store token in secure storage and send in Cookie header

### 13.8 Check Current User (With Google SSO)
```
GET /api/auth/me
```
**Response (Google user):**
```json
{
  "id": "uuid-123",
  "username": "john.doe",
  "email": "john@gmail.com",
  "googleId": "google-sub-id-12345",
  "role": "member",
  "mustChangePassword": 0
}
```

**Google SSO Users:**
- Have `googleId` set
- Have `password` set to null (cannot login with password)
- Cannot change password in profile settings
- Cannot have password reset by admin

### 13.9 Debug Endpoint
```
GET /api/auth/google/debug
```
**Response:**
```json
{
  "redirectUri": "https://jerricksforjesus.com/api/auth/google/callback",
  "publicAppUrl": "https://jerricksforjesus.com"
}
```

---

## 14. Our Ministries Section - Complete Implementation

### 14.1 Section Overview

**Location:** Bottom of home page, directly above footer
**Component:** `MinistryAccordion.tsx`
**Design:** Accordion with three ministry sections that expand/collapse

### 14.2 Ministry Items Structure

```javascript
const ministries = [
  {
    id: "item-1",
    title: "Worship & Music",
    description: "Join our choir or band. We believe in praising through song and spirit, blending traditional hymns with contemporary worship.",
    customContent: "WorshipMusicSection"  // YouTube playlist component
  },
  {
    id: "item-2",
    title: "Youth & Family",
    description: "Programs for all ages, from Sunday school for the little ones to teen youth groups focused on navigating faith in the modern world.",
    customContent: "FamilyPhotoGallery"   // Photo gallery component
  },
  {
    id: "item-3",
    title: "Community Outreach",
    description: "We serve our local community through food drives, shelter support, and neighborhood cleanup events. Faith in action.",
    customContent: "CharityComingSoon"    // Coming soon placeholder
  }
];
```

### 14.3 UI Layout

**Section Container:**
- Background: Site background color (alabaster/off-white)
- Padding: `py-24 px-6` (96px top/bottom, 24px sides)
- Max width: `max-w-4xl` centered

**Section Header:**
- Title: "Our Ministries" - large serif font
- Subtitle: "Ways to connect, serve, and grow." - muted text
- Centered alignment with margin below

**Accordion Behavior:**
- Single expand mode (only one section open at a time)
- Collapsible (all can be closed)
- Smooth expand/collapse animation
- Border between items

**Accordion Item:**
- Title: Serif font, 1.25rem-1.5rem (xl to 2xl on desktop)
- Hover effect: Primary color text
- Expand chevron icon on right

### 14.4 Custom Content Components

#### Worship & Music Section
- **Component:** `WorshipMusicSection.tsx`
- **Content:** YouTube playlist videos
- **Playlist ID:** `PLkDsdLHKY8laSsy8xYfILnVzFMedR0Rgy`
- **API:** Uses YouTube Data API v3
- **Endpoint:** `GET /api/youtube/playlist`
- **Features:**
  - Grid of video thumbnails
  - Click to open video in modal player
  - Video title and duration shown
  - 5-minute cache to minimize API calls

#### Youth & Family Section
- **Component:** `FamilyPhotoGallery.tsx`
- **Content:** Family photos from admin + approved member photos
- **API Endpoints:**
  - `GET /api/photos` - Admin-uploaded photos
  - `GET /api/member-photos/approved` - Member-submitted photos
- **Features:**
  - 2-4 column responsive grid
  - Click to open lightbox view
  - Navigation arrows in lightbox
  - Photo captions displayed

#### Community Outreach Section
- **Component:** `CharityComingSoon.tsx`
- **Content:** Placeholder for future charity program
- **Features:**
  - Charity logo image centered
  - "Jerricks for Jesus Charity – Coming Soon" text
  - Primary color text styling

### 14.5 API Endpoints for Ministries

**YouTube Playlist:**
```
GET /api/youtube/playlist
```
Response:
```json
[
  {
    "id": "video-id",
    "title": "Sunday Worship - December 1",
    "thumbnail": "https://img.youtube.com/...",
    "videoId": "abc123"
  }
]
```

**Family Photos:**
```
GET /api/photos
```
```
GET /api/member-photos/approved
```

### 14.6 Mobile Implementation Notes

- **Accordion:** Use native collapsible/expandable component
- **Worship Videos:** Open YouTube videos in YouTube app or WebView
- **Photo Gallery:** Native image viewer with swipe navigation
- **Coming Soon:** Static display matching web styling

---

## 15. Screens to Update in Mobile App

### Priority 1 (Critical)
1. **Login Screen** - Add email login support, password visibility toggle
2. **Force Password Change Modal** - New mandatory modal
3. **Live Stream Screen** - Portrait aspect ratio on mobile
4. **Bible Quiz** - Accordion UI for book selection, immediate answer feedback

### Priority 2 (Important)
5. **Profile/Settings Screen** - Username update, password change
6. **Quiz History Screen** - New screen for attempt history
7. **My Photos Screen** - New screen for photo submissions
8. **Family Gallery** - Include approved member photos

### Priority 3 (Admin Only)
9. **User Management** - Password reset, deletion, Google SSO indicator
10. **Photo Approval** - Review and approve/reject member photos

---

## 16. Testing Checklist for Mobile App

### Authentication
- [ ] Login with username works
- [ ] Login with email works
- [ ] Password visibility toggle works
- [ ] Force password change modal appears when `mustChangePassword: 1`
- [ ] Cannot access other screens until password is changed

### Profile
- [ ] Can update username
- [ ] Can change password
- [ ] Password change disabled for Google SSO users

### Quiz
- [ ] Accordion UI works on mobile/tablet
- [ ] Grid UI works on desktop
- [ ] Immediate feedback shows correct/incorrect
- [ ] Scripture reference displays after answering
- [ ] Guest progress stored locally
- [ ] Progress migrates after login
- [ ] Quiz history displays past attempts

### Photos
- [ ] Can submit photo with caption
- [ ] My Photos shows submission status
- [ ] Approved photos appear in gallery
- [ ] Can delete own submitted photos

### Admin
- [ ] Can reset user password
- [ ] Google SSO users show badge
- [ ] Password reset disabled for SSO users
- [ ] Two-step deletion confirmation works
- [ ] Can approve/reject member photos

---

## 17. Files for Reference

| File | Purpose |
|------|---------|
| `MOBILE_APP_API_DOCUMENTATION.md` | Complete API reference |
| `client/src/pages/login.tsx` | Login implementation with Google SSO button |
| `client/src/pages/admin.tsx` | Admin panel with all management features |
| `client/src/components/BibleQuizSection.tsx` | Quiz UI with accordion layout |
| `client/src/components/LiveStreamSection.tsx` | Live stream with aspect ratio |
| `client/src/components/MinistryAccordion.tsx` | Our Ministries section |
| `client/src/components/WorshipMusicSection.tsx` | YouTube playlist integration |
| `client/src/components/FamilyPhotoGallery.tsx` | Family photo gallery |
| `client/src/components/CharityComingSoon.tsx` | Charity coming soon placeholder |
| `client/src/hooks/useQuizProgress.ts` | Guest progress tracking |
| `client/src/lib/auth.tsx` | Authentication context |
| `shared/schema.ts` | All data models (66 Bible books, user roles) |
| `server/routes.ts` | All API endpoints (Google OAuth, Quiz, Photos) |
| `server/quizGenerator.ts` | AI question generation |
| `server/bibleApi.ts` | Bible content fetching (chapter counts) |

---

*This document should be used in conjunction with `MOBILE_APP_API_DOCUMENTATION.md` for complete mobile app development.*
