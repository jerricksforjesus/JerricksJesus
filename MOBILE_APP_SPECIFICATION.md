# Jerricks for Jesus - Complete Application Specification
## For Mobile App Development

---

## 1. APPLICATION OVERVIEW

### Purpose
A modern church mobile application for "Jerricks for Jesus" that enables congregation members to:
- Watch live streaming services (via Zoom → YouTube integration)
- Browse and watch sermon video replays with AI-generated closed captions
- Read daily scripture verses
- Access ministry information and church details

### Target Users
- Church congregation members (primary)
- Online visitors seeking spiritual content
- Church administrators managing content

---

## 2. FEATURES & FUNCTIONALITY

### 2.1 Live Streaming
**User Flow:**
1. User opens app and sees "LIVE NOW" indicator when church is streaming
2. Taps to enter live stream view
3. Watches embedded YouTube live stream
4. Can view YouTube live chat alongside video

**Technical Details:**
- Stream source: Zoom meeting → YouTube Live (unlisted)
- Detection: YouTube Data API v3 checks channel for active live streams
- Channel ID: Stored as environment variable
- Polling interval: Every 30 seconds
- Fallback: Shows "We're Currently Offline" with next service times

**Offline State Display:**
- Sunday Service: 10:00 AM EST
- Wednesday Bible Study: 7:00 PM EST

### 2.2 Sermon Video Replays
**Features:**
- Grid gallery of past sermon videos with thumbnails
- Video player with custom controls:
  - Play/pause
  - Timeline scrubbing with seek preview
  - Volume control with mute toggle
  - Playback speed (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)
  - Fullscreen mode
  - 10-second skip forward/back
  - Closed captions toggle (when available)
- View count tracking
- Mobile-optimized autoplay (muted with "tap to unmute")

**Video Data Model:**
```
Video {
  id: number (auto-increment)
  title: string
  objectPath: string (cloud storage path)
  thumbnailPath: string | null
  captionsPath: string | null (VTT file path)
  captionStatus: "none" | "generating" | "ready" | "error"
  recordedDate: string (ISO date)
  duration: string | null
  views: number (default 0)
  createdAt: timestamp
}
```

### 2.3 AI-Generated Closed Captions
**Process:**
1. Admin uploads video
2. Admin clicks "Generate Captions"
3. Backend extracts audio, chunks into segments
4. Gemini AI transcribes each chunk
5. System generates WebVTT file
6. Captions stored and linked to video

**Caption Format:** WebVTT (.vtt)
```
WEBVTT

00:00:00.000 --> 00:00:05.000
Welcome to today's service...

00:00:05.000 --> 00:00:10.000
Let us begin with a word of prayer.
```

### 2.4 Daily Scripture Verse
**Features:**
- Prominent display on home screen
- Animated verse text with reference
- Admin can set active verse from dashboard
- Only one verse active at a time

**Verse Data Model:**
```
Verse {
  id: number (auto-increment)
  verseText: string
  reference: string (e.g., "John 3:16")
  isActive: integer (0 or 1)
  createdAt: timestamp
}
```

### 2.5 Admin Dashboard
**Capabilities:**
- Upload new sermon videos (with thumbnail)
- Edit video titles and thumbnails
- Delete videos
- Generate AI captions for videos
- Manage scripture verses (create, edit, set active)
- View upload progress with multi-part upload support

---

## 3. DESIGN SYSTEM

### 3.1 Visual Identity: "Stone & Paper" / "Sanctuary of Light"

**Philosophy:**
Sophisticated, minimalist aesthetic inspired by architecture and sacred spaces. Warm, organic, and reverent.

### 3.2 Color Palette

| Color Name | Hex | HSL | Usage |
|------------|-----|-----|-------|
| Warm Alabaster | #F2F0E9 | hsl(44, 20%, 93%) | Background |
| Deep Graphite | #2A2A2A | hsl(0, 0%, 16%) | Text/Foreground |
| Burnt Clay | #B07D62 | hsl(19, 36%, 54%) | Primary/Accent |
| Olive Drab | #6B705C | hsl(75, 10%, 40%) | Secondary |
| Soft Grey | #D1D1D1 | hsl(0, 0%, 82%) | Borders/Muted |

**Extended Palette:**
- Card Background: hsl(44, 20%, 96%)
- Muted Text: hsl(0, 0%, 40%)
- Destructive/Error: hsl(0, 60%, 50%)
- Live Indicator: Red (#DC2626)

### 3.3 Typography

**Primary Font (Headings):** Cormorant Garamond
- Style: Elegant serif with biblical/traditional feel
- Weights: 400 (regular), 600 (semi-bold), 700 (bold)
- Usage: Headlines, titles, verse text, decorative elements

**Secondary Font (Body):** Manrope
- Style: Modern, clean sans-serif
- Weights: 300 (light), 400 (regular), 500 (medium), 600 (semi-bold), 700 (bold)
- Usage: Body text, buttons, navigation, UI elements

**Typography Scale:**
- Hero Title: 5rem-8rem (80-128px), serif, bold
- Section Heading: 2.25rem-3rem (36-48px), serif, bold
- Card Title: 1.5rem (24px), serif, bold
- Body Large: 1.125rem (18px), sans-serif
- Body: 1rem (16px), sans-serif
- Caption: 0.875rem (14px), sans-serif
- Small: 0.75rem (12px), sans-serif

### 3.4 Spacing & Layout

**Border Radius:**
- Small: 0.25rem (4px)
- Medium: 0.5rem (8px)
- Large: 0.75rem (12px)
- XL: 1rem (16px)
- Full/Pill: 9999px

**Shadows:**
- Subtle: 0 1px 2px rgba(0,0,0,0.05)
- Medium: 0 4px 6px rgba(0,0,0,0.1)
- Large: 0 10px 15px rgba(0,0,0,0.1)
- Video Player: 0 25px 50px rgba(0,0,0,0.25)

### 3.5 Animation Guidelines

**Principles:**
- Smooth, elegant transitions (0.3-0.8s duration)
- Ease-out curves for natural feel
- Parallax scrolling on hero sections
- Subtle fade-in animations on scroll

**Key Animations:**
- Page transitions: Fade + slight Y translation
- Button hover: Scale 1.02-1.05
- Card hover: Subtle lift with shadow increase
- Live indicator: Pulsing red dot
- Loading states: Spinning border animation

---

## 4. SCREEN-BY-SCREEN SPECIFICATION

### 4.1 Home Screen

**Layout (top to bottom):**
1. **Navigation Bar**
   - Logo/Church name (left)
   - Menu items: Home, Live, Replays, Admin
   - Transparent on hero, solid on scroll

2. **Hero Section**
   - Full-screen height
   - Background: Church interior image with parallax effect
   - Dark overlay (30% opacity)
   - "LIVE NOW" banner (when streaming) - red, pulsing
   - Centered content:
     - Subtitle: "Welcome to the Sanctuary" (uppercase, tracking wide)
     - Title: "Jerricks for Jesus" (large serif)
     - Tagline: "A digital home for faith, fellowship, and the living word"
   - Scroll indicator at bottom

3. **Verse Display Section**
   - Centered layout
   - Large quotation marks or decorative element
   - Verse text in serif font
   - Reference below (e.g., "— John 3:16")
   - Subtle background pattern/texture

4. **Featured Video Section**
   - Section title: "Latest Sermon"
   - Large video card with thumbnail
   - Play button overlay
   - Video title and date

5. **Live Stream Promo Section**
   - Shows "LIVE" badge when streaming
   - Click to go to live page
   - When offline: Shows next service times

6. **Replays Gallery Section**
   - Section title: "Recent Sermons"
   - Horizontal scroll or grid of video cards
   - "View All" link to replays page

7. **Ministry Accordion Section**
   - Expandable sections for different ministries
   - Icons for each ministry
   - Description when expanded

8. **Footer**
   - Church name and tagline
   - Address
   - Contact info (email, phone)
   - Copyright

### 4.2 Live Stream Screen

**Layout:**
1. **Video Player (main area)**
   - 16:9 aspect ratio
   - YouTube embed when live
   - Offline state with schedule when not live
   - "LIVE" indicator badge

2. **Stream Info**
   - Stream title
   - "Currently streaming live" status
   - "Give Offering" button

3. **Chat Sidebar (tablet/desktop) or Tab (mobile)**
   - YouTube live chat embed
   - "Chat Unavailable" message when offline

### 4.3 Replays Screen

**Layout:**
1. **Page Header**
   - Title: "Sermon Replays"
   - Subtitle: "Revisit past messages"

2. **Video Grid**
   - Responsive: 1 col (mobile), 2 col (tablet), 3 col (desktop)
   - Video cards with:
     - Thumbnail image
     - Play button overlay
     - Title
     - Date
     - Duration badge
     - View count

3. **Video Player Modal**
   - Opens when video selected
   - Full custom controls
   - Video info below player
   - Close button

### 4.4 Admin Dashboard

**Layout:**
1. **Tab Navigation**
   - Videos tab
   - Verses tab

2. **Videos Management**
   - Upload area (drag & drop or click)
   - Video list with:
     - Thumbnail
     - Title (editable)
     - Date
     - Caption status
     - Actions: Edit, Generate Captions, Delete

3. **Verses Management**
   - Add new verse form
   - Verse list with:
     - Text preview
     - Reference
     - Active status toggle
     - Actions: Set Active, Delete

---

## 5. API ENDPOINTS

### Videos
```
GET    /api/videos              - List all videos
GET    /api/videos/:id          - Get single video
POST   /api/videos              - Create video
PUT    /api/videos/:id          - Update video (title, thumbnail)
DELETE /api/videos/:id          - Delete video
POST   /api/videos/:id/view     - Increment view count
POST   /api/videos/:id/generate-captions - Start AI caption generation
GET    /api/videos/:id/captions/status   - Check caption generation status
```

### Verses
```
GET    /api/verses              - List all verses
GET    /api/verses/active       - Get currently active verse
POST   /api/verses              - Create verse
PUT    /api/verses/:id          - Update verse
POST   /api/verses/:id/activate - Set verse as active
```

### Live Stream
```
GET    /api/youtube/live-status - Check if channel is live
Response: { isLive: boolean, videoId: string | null, title: string | null }
```

### File Upload
```
POST   /api/objects/upload      - Get signed upload URL
Response: { uploadURL: string }
```

---

## 6. DATA MODELS

### Video
```typescript
{
  id: number;
  title: string;
  objectPath: string;          // Cloud storage path
  thumbnailPath: string | null;
  captionsPath: string | null; // VTT file path
  captionStatus: "none" | "generating" | "ready" | "error";
  recordedDate: string;        // ISO date string
  duration: string | null;     // e.g., "45:30"
  views: number;
  createdAt: Date;
}
```

### Verse
```typescript
{
  id: number;
  verseText: string;
  reference: string;           // e.g., "Psalm 23:1"
  isActive: number;            // 0 or 1
  createdAt: Date;
}
```

### User (for future auth)
```typescript
{
  id: string;                  // UUID
  username: string;
  password: string;            // Hashed
}
```

---

## 7. MOBILE-SPECIFIC CONSIDERATIONS

### Video Playback
- Use `playsInline` attribute for iOS
- Handle autoplay restrictions:
  - Try playing with sound first
  - Fall back to muted autoplay
  - Show "Tap to unmute" indicator
  - First tap unmutes without pausing

### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Touch Interactions
- Swipe gestures for video timeline
- Pull-to-refresh on lists
- Tap anywhere on video to play/pause
- Double-tap to like/favorite (optional)

### Offline Support (recommended)
- Cache verse of the day
- Cache video thumbnails
- Show offline indicator
- Queue video downloads for offline viewing

### Push Notifications (recommended)
- "We're Live Now" when stream starts
- New sermon uploaded
- Daily verse reminder

---

## 8. ENVIRONMENT VARIABLES

```
DATABASE_URL          - PostgreSQL connection string
YOUTUBE_CHANNEL_ID    - YouTube channel ID for live detection
YOUTUBE_API_KEY       - YouTube Data API v3 key
```

---

## 9. THIRD-PARTY SERVICES

### Required
- **PostgreSQL Database** - Data storage
- **Cloud Storage** (AWS S3, Google Cloud, etc.) - Video/image hosting
- **YouTube Data API** - Live stream detection

### For AI Captions
- **Google Gemini API** - Audio transcription
- **FFmpeg** - Audio extraction and processing

---

## 10. SAMPLE CONTENT

### Sample Verse
```
"For God so loved the world, that he gave his only begotten Son, 
that whosoever believeth in him should not perish, but have everlasting life."
— John 3:16
```

### Sample Video Titles
- "Sunday Morning Service - Finding Peace in Troubled Times"
- "Wednesday Bible Study - The Book of Psalms"
- "Easter Sunday Celebration 2024"
- "Christmas Eve Service - The Gift of Hope"

### Ministry Examples
- Youth Ministry
- Women's Fellowship
- Men's Bible Study
- Community Outreach
- Music & Worship

---

## 11. BRAND VOICE & COPY GUIDELINES

### Tone
- Warm and welcoming
- Reverent but approachable
- Encouraging and uplifting
- Clear and simple language

### Key Phrases
- "Welcome to the Sanctuary"
- "A digital home for faith, fellowship, and the living word"
- "Join us in spirit and truth"
- "We're Live Now" (for streaming)
- "Revisit past messages" (for replays)

### Avoid
- Overly formal religious jargon
- Exclusionary language
- Technical terms without explanation

---

## 12. ICON SET

Use Lucide Icons (recommended) for consistency:
- Video/Play: `Video`, `Play`, `Pause`
- Navigation: `Home`, `Radio`, `Film`, `Settings`
- Actions: `Heart`, `Share`, `Download`
- Media Controls: `Volume2`, `VolumeX`, `Maximize`, `SkipBack`, `SkipForward`
- Status: `Calendar`, `Clock`, `Eye` (views)
- UI: `X` (close), `ChevronDown`, `Menu`

---

This specification provides everything needed to recreate the Jerricks for Jesus application as a mobile app while maintaining the same design language, functionality, and user experience.
