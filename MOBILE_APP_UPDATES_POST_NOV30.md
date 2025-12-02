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
  - Old Testament expands/collapses as a group
  - New Testament expands/collapses as a group
  - Reduces scroll length on mobile devices
- **Desktop Behavior:** Traditional grid layout (unchanged)
- **Affected Screens:** Bible Quiz section (Home page and Admin dashboard)

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

## 7. Quiz System Enhancements

### 7.1 Immediate Answer Feedback
- **Change:** Users see correct/incorrect immediately after selecting an answer
- **Endpoint:** `POST /api/quiz/check-answer`
- **Request:** `{ "questionId": 1, "selectedAnswer": "A" }`
- **Response:** `{ "correct": true, "correctAnswer": "A" }`
- **UI Behavior:**
  - Green highlight for correct answer
  - Red highlight for incorrect + green highlight on correct answer
  - Shows scripture reference after answering
- **Mobile App Impact:** Update quiz flow to show immediate feedback

### 7.2 Guest Progress Migration
- **Feature:** Migrate local quiz progress to account after login/registration
- **Endpoint:** `POST /api/quiz/migrate`
- **Request:** `{ "books": ["Genesis", "Exodus", ...] }`
- **Flow:**
  1. Store completed books locally when guest takes quizzes
  2. After login, call migrate endpoint with local book list
  3. Books not already in user's history are added
  4. Clear local storage after migration
- **Mobile App Impact:** 
  - Store guest quiz progress in local storage
  - Call migrate endpoint after login/registration
  - Clear local progress after successful migration

### 7.3 Quiz History View
- **Endpoint:** `GET /api/quiz/my-history`
- **Response:** Array of quiz attempts with book, score, date
- **Display:** Shows all past quiz attempts for logged-in user
- **Mobile App Impact:** Add quiz history screen

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

### Modified Endpoints
| Endpoint | Change |
|----------|--------|
| `/api/auth/login` | Now accepts email in username field |
| `/api/auth/me` | Added `mustChangePassword` field in response |
| `/api/admin/users` | Added `googleId` field in response |
| `/api/videos` | Added `captionStatus`, `captionsPath` fields |

---

## 13. Screens to Update in Mobile App

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

## 14. Testing Checklist for Mobile App

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

## 15. Files for Reference

| File | Purpose |
|------|---------|
| `MOBILE_APP_API_DOCUMENTATION.md` | Complete API reference |
| `client/src/pages/login.tsx` | Login implementation |
| `client/src/pages/admin.tsx` | Admin panel with all management features |
| `client/src/components/BibleQuizSection.tsx` | Quiz UI with accordion |
| `client/src/components/LiveStreamSection.tsx` | Live stream with aspect ratio |
| `client/src/hooks/useQuizProgress.ts` | Guest progress tracking |
| `client/src/lib/auth.tsx` | Authentication context |
| `shared/schema.ts` | All data models |
| `server/routes.ts` | All API endpoints |

---

*This document should be used in conjunction with `MOBILE_APP_API_DOCUMENTATION.md` for complete mobile app development.*
