# Jerricks for Jesus - Church Website

## Overview

A modern church website featuring live streaming integration, sermon video management, daily scripture verses, and ministry information. The platform combines a content management system with media hosting capabilities, designed to serve both congregation members and administrative staff.

The application presents a sophisticated, minimalist aesthetic inspired by architecture and design ("Stone & Paper" palette), featuring parallax scrolling, smooth animations, and a warm, organic color scheme centered around alabaster backgrounds and burnt clay accents.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing (not React Router)
- The client lives in `client/` directory with entry point at `client/src/main.tsx`

**UI Component System**
- shadcn/ui component library (New York style variant) with Radix UI primitives
- Custom component configuration in `components.json` with path aliases
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin) for styling with custom design tokens
- Design system based on "Stone & Paper" aesthetic with custom color palette defined in `client/src/index.css`
- Typography uses Cormorant Garamond (serif) and Manrope (sans-serif) from Google Fonts

**State Management & Data Fetching**
- TanStack Query (React Query) for server state management
- Custom query client configured in `client/src/lib/queryClient.ts`
- Form handling via React Hook Form with Zod validation resolvers
- No global state management library (Redux/Zustand) - relies on React Query cache

**Animation & Visual Effects**
- Framer Motion for parallax effects, scroll animations, and page transitions
- GSAP-inspired design brief but implemented with Framer Motion
- Custom scrolling behaviors and viewport-based animations throughout

**Key Pages**
1. Home (`/`) - Hero section, verse display, sermon gallery, ministry accordion
2. Live Stream (`/live`) - Zoom integration placeholder for live services
3. Admin Dashboard (`/admin`) - Content management for videos and verses

### Backend Architecture

**Server Framework**
- Express.js running on Node.js with TypeScript
- Entry point: `server/index.ts`
- Production build creates bundled CJS output in `dist/`
- Custom logging middleware for request tracking

**API Design**
- RESTful API endpoints under `/api` prefix
- Routes defined in `server/routes.ts`
- Key endpoints:
  - `POST /api/objects/upload` - Get signed upload URL for videos
  - `POST /api/videos` - Create video metadata entry
  - `GET /api/videos` - List all sermon videos
  - `GET /api/verses/active` - Get current verse of the day
  - `POST /api/verses` - Create new verse entry

**Database Layer**
- PostgreSQL database accessed via Neon serverless driver
- Drizzle ORM for type-safe database queries
- Schema defined in `shared/schema.ts` (shared between client/server)
- Tables:
  - `users` - Admin authentication (UUID primary key)
  - `videos` - Sermon video metadata with view tracking
  - `verses` - Scripture verses with active flag for daily display
- Migrations stored in `migrations/` directory
- Database abstraction through `IStorage` interface implemented by `DbStorage` class

**Object Storage Integration**
- Google Cloud Storage for video file hosting
- Replit Object Storage sidecar integration
- Custom ACL (Access Control List) system for object permissions
- Public/private visibility controls with owner-based access
- Upload flow: Client requests signed URL → uploads directly to GCS → saves metadata to database
- Uppy.js on frontend for multi-part upload handling

### External Dependencies

**Cloud Services**
- **Neon Database** - Serverless PostgreSQL hosting
  - Connection via `@neondatabase/serverless` driver
  - Connection string from `DATABASE_URL` environment variable

- **Google Cloud Storage** - Video file storage
  - Accessed through Replit Object Storage sidecar (port 1106)
  - External account authentication with subject tokens
  - Files organized by path with metadata stored separately

- **Replit Infrastructure**
  - Development plugins: Cartographer, Dev Banner, Runtime Error Modal
  - Custom Vite plugin (`vite-plugin-meta-images.ts`) for OpenGraph image URLs
  - Deployment URL detection from Replit environment variables

**Key Third-Party Libraries**
- **UI/UX**: Radix UI primitives, Lucide icons, Framer Motion, Uppy file uploader
- **Forms**: React Hook Form, Zod for validation, `@hookform/resolvers`
- **Data Fetching**: TanStack Query v5
- **Database**: Drizzle ORM with Zod schema generation
- **Styling**: Tailwind CSS v4, class-variance-authority, clsx/tailwind-merge

**Development Environment**
- TypeScript with strict mode enabled
- ESModule-based project (`"type": "module"` in package.json)
- Path aliases: `@/` for client code, `@shared/` for shared types, `@assets/` for attached files
- Development server runs Vite on port 5000 with HMR over custom path
- Production uses esbuild for server bundling with selective dependency bundling

**Authentication & Authorization**
- Basic user table exists but no active authentication flow implemented
- Placeholder for future Zoom OAuth integration on live stream page
- Object storage has ACL system ready for user-based permissions (currently unused)