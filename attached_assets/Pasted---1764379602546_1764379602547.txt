═══════════════════════════════════════════════════════════════════════════════
                              "ARCHÉ" DESIGN BRIEF
                          The Holistic Design Studio
═══════════════════════════════════════════════════════════════════════════════

THE CONCEPT
-----------
A digital home for an architecture firm that blends nature with brutalism.

The Vibe: "Quiet Luxury," "Tactile," "Light & Shadow," "Fluid Structure"
The Goal: To feel like flipping through a heavy, expensive coffee table book


═══════════════════════════════════════════════════════════════════════════════
                        VISUAL LANGUAGE (Stone & Paper)
═══════════════════════════════════════════════════════════════════════════════

COLOR PALETTE (Warm & Organic)
-------------------------------
  • Background:  Warm Alabaster (#F2F0E9) or Limestone (#E6E4DC)
                 → Should feel like raw paper or stone
  • Typography:  Deep Graphite (#2A2A2A) – softer than black
  • Accents:     Burnt Clay (#B07D62) and Olive Drab (#6B705C)
  • Lines:       Ultra-thin (1px) in Soft Grey (#D1D1D1) for grid structures

TYPOGRAPHY (The Contrast)
--------------------------
  • Headings:    Large, elegant Serif Display
                 (GT Alpina, Ogg, or Heldane)
  • UI/Labels:   Tiny, all-caps Swiss Sans
                 (Neue Montreal or Suisse Int)

IMAGERY
-------
  • Images are NOT 100% opacity – subtle warmth filter applied
  • Parallax: Images move slightly slower than text when scrolling


═══════════════════════════════════════════════════════════════════════════════
                          THE USER JOURNEY (7 Sections)
═══════════════════════════════════════════════════════════════════════════════

SECTION 1: HERO (The Reveal)
-----------------------------
Layout:     Center aligned
Visual:     Screen initially covered by a "Curtain" of Alabaster background

Animation (GSAP):
  → The word "ARCHÉ" is cut out of the background (Mask)
  → Through the letters, you see a video of swaying trees/architecture
  → As you scroll, text mask scales up until it exceeds the viewport,
    revealing the full-screen video underneath


SECTION 2: THE PHILOSOPHY (Text Scrub)
---------------------------------------
Layout:     Massive Serif typography taking up 80% of screen
Content:    "We build spaces that breathe with the rhythm of nature."

Interaction (GSAP ScrollTrigger):
  → Text is initially Outlined (Stroke only)
  → As user scrolls, text fills with Deep Graphite color from left to right,
    synchronized perfectly with scroll position


SECTION 3: SELECTED PROJECTS (The Horizontal Gallery)
------------------------------------------------------
Behavior:   Page pins (Sticky). User scrolls horizontally.
Visual:     Sequence of 4 massive project images

Card Design:
  → Image on top
  → Title (Serif) and Year (Sans) below

Interaction (The Lens):
  → Framer Motion: When mouse hovers over image, circular "Glass Distortion"
    effect (using displacement map) follows cursor, warping the architecture
    slightly like looking through a thick window


SECTION 4: THE MATERIAL LIBRARY (Texture Zoom)
-----------------------------------------------
Layout:     Grid of 3 physical materials (Raw Oak, Travertine, Linen)
Visual:     High-res texture shots

Interaction:
  → Hover:   Cursor becomes a "+"
  → Click:   Texture expands to fill full screen (Layout ID transition)
  → Detail:  Floating text annotations appear explaining origin
             (e.g., "Sourced from Tuscany")


SECTION 5: SERVICES (The Accordion)
------------------------------------
Layout:     Clean horizontal lines separating services
            (Residential / Commercial / Landscape)

Interaction (Framer Motion):
  → Hover:   Text shifts right, preview image fades in behind text list,
             taking up center of screen
  → Cursor:  Turns into "View Details" arrow


SECTION 6: THE JOURNAL (Masonry Grid)
--------------------------------------
Layout:     Asymmetrical grid

Visual:
  → Some items are photos
  → Some are pull-quotes in Serif font

Scroll Speed:
  → Left column:  Normal speed
  → Right column: 1.2x speed (Parallax), creating shifting dynamic


SECTION 7: FOOTER (The Big Finish)
-----------------------------------
Background: Transitions to Deep Graphite (Dark Mode invert)

Visual:
  → Massive "Let's Talk" button spanning full width
  → Animation: Button has "Liquid Fill" effect on hover

Info:
  → Address and Socials arranged in strict grid at bottom
  → Live local time clock (e.g., "London: 14:02") ticks quietly


═══════════════════════════════════════════════════════════════════════════════
                   THE "PREMIUM" DETAILS (Micro-Interactions)
═══════════════════════════════════════════════════════════════════════════════

1. SMOOTH SCROLL (Non-negotiable)
   → Use Lenis with dampening of 1.2
   → Site needs to feel heavy and luxurious

2. IMAGE REVEAL
   → Images enter viewport using "Curtain Reveal"
   → Solid color block slides away to reveal image
   → NO simple fades

3. MAGNETIC BUTTONS
   → All circular buttons (e.g., "Menu", "Top") use Framer Motion
   → Physically pull towards cursor when it gets close


═══════════════════════════════════════════════════════════════════════════════
                    MAKE IT TIMELESS. MAKE IT TACTILE. MAKE IT FLOW.
═══════════════════════════════════════════════════════════════════════════════