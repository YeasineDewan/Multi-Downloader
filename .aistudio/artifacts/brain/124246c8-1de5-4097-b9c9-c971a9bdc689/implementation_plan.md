# Downloader - Unified Media Hub & Resilient Fetching Architecture

Re-architect Downloader with a unified **Category & Subcategory Media Hub** to eliminate redundant components, implement a **multi-engine resilient fetching pipeline** with automated retries across all social platforms and web URLs, and upgrade the interface to an **iOS 18 frosted glass design**.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your preferences from Phase 1, the architecture is configured around three core pillars:
> 
> - **Unified Media Hub**: Consolidating duplicated scraper, gallery, and single-card views into one master `MediaHub` component with fluid Category tabs (`Video Streams`, `Studio Audio`, `Visual Gallery`, `Web Documents`, `Batch Queue`) and dynamic sub-forms.
> - **Multi-Engine Resilient Data Fetching**: Replacing single-attempt requests with a 4-tier fallback pipeline (oEmbed API → Microdata/OG parser → Deep DOM asset scraper → Heuristic stream resolver) with automatic retries, exponential backoff, and range-request proxying.
> - **iOS 18 Frosted Glass Interface**: Deep charcoal gradient background, ultra-thin hairline borders, Cupertino-style segmented controls, spring transitions, and unified top bar.

---

## 1. Overview & Core Concept

### What It Does
Downloader becomes a single, cohesive media workstation where users can paste any URL—from social networks (YouTube, Spotify, Instagram, TikTok, Facebook, X, SoundCloud) to arbitrary websites—and instantly browse, configure, and download assets organized by clear media categories and subcategories.

### The Problem Being Solved
1. **Component Duplication**: Previously, `MediaResultCard`, `WebExtractorView`, and `MediaGalleryView` contained overlapping asset parsers, format tables, and selection states.
2. **Fragile Data Fetching**: Complex websites or platforms with bot-mitigation, redirects, or rate limits caused extraction timeouts and incomplete asset parsing.
3. **Fragmented UI**: Separate tabs felt disjointed rather than functioning like a native iOS application.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Input & Smart Detection**: User pastes a link into the dynamic top bar. The system detects the platform and automatically routes to the appropriate primary category.
2. **Category Navigation**: 
   - **Video Streams**: 4K/2K/1080p/720p/480p resolution matrix, clip trimmer, bitrate selectors, and subtitle tracks.
   - **Studio Audio**: 320k MP3, Lossless FLAC, Apple AAC/M4A, uncompressed WAV, ID3v2 tag editor, volume booster, and bass enhancer.
   - **Visual Gallery**: Responsive thumbnail grid with multi-select checkboxes, zoom lightbox, and bulk ZIP exporter.
   - **Web Documents**: PDF, EPUB, and archive file discoverer with instant download links.
   - **Batch Queue**: Multi-URL concurrent queue manager with live speed indicators and pause/resume.
3. **Subcategory Forms**: Selecting a category dynamically slides in its specific options without reloading or duplicating common UI elements.
4. **Execution & Feedback**: Tactile progress bars with transfer speed (`MB/s`), time remaining (`ETA`), and native browser download triggers.

### Visual Identity & Theme (iOS 18 Cupertino)
- **Palette**: Deep charcoal canvas (`#0A0B0E`), dark titanium cards (`#121318` to `#181A22`), and subtle neutral slate accents (`#262933`).
- **Glassmorphism**: `backdrop-blur-3xl`, `bg-neutral-900/65`, and 1px hairline borders (`rgba(255, 255, 255, 0.08)`).
- **Typography**: Plus Jakarta Sans with tabular monospace figures (`JetBrains Mono`, `tabular-nums`) for bitrates, durations, and file sizes.
- **Micro-Interactions**: Smooth spring bezier curves (`cubic-bezier(0.16, 1, 0.3, 1)`), active-tap scales (`active:scale-[0.98]`), and fluid toggle switches.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Unified `MediaHub` Component vs. Separate Views
- **Chosen Approach**: Build a single master `MediaHub` container that houses shared state (active link, parsed media, selection set, download tasks) and renders Category sub-views dynamically.
- **Why**: Eliminates hundreds of lines of duplicated filter bars, checkboxes, and modal hooks across `WebExtractorView` and `MediaGalleryView`.
- **Trade-off**: Requires a unified data contract (`UnifiedMediaBundle`), but dramatically simplifies maintenance and ensures uniform UX.

### Decision 2: Multi-Engine Fetching Pipeline in `server.ts`
- **Chosen Approach**: Sequential 4-stage extraction pipeline with retry logic:
  1. *Stage 1 (Platform Dedicated)*: Official oEmbed and structured data endpoints.
  2. *Stage 2 (Semantic Scraper)*: OpenGraph, Twitter Cards, Schema.org JSON-LD with realistic desktop browser headers.
  3. *Stage 3 (Deep DOM Crawler)*: Cheerio-based scanning of `<video>`, `<audio>`, `<picture>`, `<source>`, `srcset`, and download links.
  4. *Stage 4 (Direct Stream / Proxy Verification)*: Range-request verification (`HEAD / GET`) to confirm valid stream headers.
- **Why**: Prevents "Unable to fetch" errors across diverse sites while handling anti-scraping redirects smoothly.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Apple iOS Top App Bar                           │
│     [Downloader Wordmark]   ──   [Category Pills]   ──   [Paste Link]  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                  Dynamic Island URL Extractor Bar                      │
│      [Platform Badge]  [URL Input Field]  [Paste]  [Extract CTA]       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                 Unified MediaHub Master Component                      │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Category Switcher: [Video] [Audio] [Gallery] [Docs] [Batch]       │  │
│  └─────────────────────────────────┬────────────────────────────────┘  │
│                                    │                                   │
│            ┌───────────────────────┴───────────────────────┐           │
│            ▼                                               ▼           │
│  ┌───────────────────────────┐           ┌───────────────────────────┐ │
│  │   Category Viewport       │           │   Sub-Forms / Options     │ │
│  │ • Resolution Matrix       │           │ • Range Scrubber / Trim   │ │
│  │ • Thumbnail Gallery Grid  │           │ • Audio DSP & Volume      │ │
│  │ • Document Asset Table    │           │ • ID3 Metadata Editor     │ │
│  └───────────────────────────┘           └───────────────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│               Backend Express Resilient Pipeline (`server.ts`)         │
│  /api/analyze ────► Stage 1: oEmbed / Platform Extractor              │
│               ────► Stage 2: OpenGraph & Schema.org Resolver          │
│               ────► Stage 3: Deep Cheerio DOM Scanner                 │
│               ────► Stage 4: Range-Request Stream Verifier            │
│                                                                        │
│  /api/download ───► Resilient Stream Proxy with Attachment Headers    │
│  /api/batch-zip ──► High-Performance In-Memory ZIP Bundler             │
└────────────────────────────────────────────────────────────────────────┘
```

### Component Refactoring Plan
1. **`src/components/Header.tsx`**: Streamline into a sleek iOS 18 glass navigation bar with brand mark, clean category navigation indicators, and quick action.
2. **`src/components/MediaHub/`**: Create the unified hub structure:
   - `MediaHub.tsx`: Main parent managing selected media and category tabs.
   - `CategoryNav.tsx`: Segmented iOS 18 category control.
   - `VideoSubView.tsx`: Resolution table, bitrate cards, and subtitle tracks.
   - `AudioSubView.tsx`: Studio audio bitrates, waveform visualizer, and DSP tuning.
   - `GallerySubView.tsx`: Responsive thumbnail grid with individual selection and lightbox.
   - `DocumentsSubView.tsx`: File asset table with direct downloads.
   - `AdvancedOptionsBar.tsx`: Shared slide-up sheet for trimmer, volume booster, and ID3 editor.
3. **`server.ts`**: Upgrade `/api/analyze` and `/api/scrape-assets` with the multi-engine fallback, exponential backoff retries, and comprehensive error recovery.
