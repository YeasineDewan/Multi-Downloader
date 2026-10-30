# Implementation Plan: Dynamic Stream Extraction & Genuine File Downloader

Deliver a complete extraction and download engine that extracts **every actual resolution and file size dynamically** from analyzed media URLs and delivers the **exact requested file** when downloading.

---

## 1. User Review & Critical Decisions

> [!IMPORTANT]
> Based on your request to "add all the features for every kind of possibility" and resolve the sample file issue:
> 
> - **Exact File Downloads (No Placeholders)**: When you click Download, the server will fetch, transcode, and stream the **exact media item** from the target URL (using an integrated `yt-dlp` + `ffmpeg` stream pipeline for platforms, and direct range-request streaming for web assets), completely replacing default sample fallbacks.
> - **Truly Dynamic Resolutions & File Sizes**: Rather than static tables, `server.ts` will inspect the target URL's stream manifest (`yt-dlp -J` / HTTP `Content-Length` headers / OpenGraph video variants) to extract all actual video resolutions (e.g. 4K, 1440p, 1080p, 720p, 480p, 360p, 240p) and audio bitrates (320k, 256k, 192k, 128k) along with their true byte sizes.
> - **Unified Download Execution**: The primary download action triggers instantaneous browser file transfer with accurate filename and container (`.mp4`, `.webm`, `.mp3`, `.wav`, `.jpg`, `.png`), while synchronously tracking download status in both the active view and the Batch Queue.

---

## 2. Architecture & Flow Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Dynamic URL Extractor Bar                       │
│    User inputs URL (YouTube, TikTok, Instagram, Web Page, or Stream)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                  Backend Dynamic Analyzer (`/api/analyze`)              │
│  1. Check Direct Media (HEAD request -> Content-Length & MimeType)    │
│  2. Run yt-dlp Format Extraction (-J) -> Parse all native streams      │
│  3. Parse Video & Audio manifests (Resolution, FPS, True File Size)    │
│  4. DOM Scraper for images, audio tags, video tags, web documents      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    MediaHub Dynamic Viewport                           │
│  • Video Quality Matrix: Displays all real extracted resolutions       │
│  • Audio Quality Matrix: Displays all actual audio streams & bitrates  │
│  • Gallery & Assets Grid: Displays discovered images & web assets      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                Genuine Media Delivery (`/api/download`)                │
│  • Direct URL: Proxied with Range request byte-streaming               │
│  • Platform Video: yt-dlp stream piped directly to stdout -> client   │
│  • Transcoded Audio: ffmpeg extracts exact audio stream as MP3/WAV/AAC │
│  • Web Asset: Exact image, PDF, or document streamed directly         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Key Technical Decisions & Dynamic Resolution Strategy

### Decision 1: Dual-Engine Real Media Streaming in `/api/download`
- **Approach**:
  1. For direct binary files (`.mp4`, `.webm`, `.mov`, `.mp3`, `.wav`, `.jpg`, `.png`, `.pdf`): Server proxies the exact remote URL with HTTP Range support (`Accept-Ranges: bytes`, `206 Partial Content`).
  2. For platforms (YouTube, TikTok, Twitter/X, Instagram, SoundCloud, Vimeo): Server invokes the pre-configured local binary (`yt-dlp` + `ffmpeg`) to extract the exact requested format (e.g., `-f bestvideo[height<={res}]+bestaudio/best` or `-x --audio-format mp3`) and pipes `stdout` directly to the Express `res` stream.
  3. For client-side scraping: Discovered asset URLs are directly downloadable via `/api/proxy-media` with content-disposition attachments.
- **Why**: Eliminates mock or sample placeholders entirely, ensuring users download the exact video or audio track requested.

### Decision 2: Manifest-Driven Dynamic Resolution & Size Extractor
- **Approach**:
  - `server.ts` calls `yt-dlp --dump-single-json --skip-download` for streamable URLs to collect every format entry (`format_id`, `height`, `width`, `fps`, `filesize`, `filesize_approx`, `vcodec`, `acodec`, `tbr`).
  - Formats are deduplicated and mapped to standard resolutions (`2160p (4K)`, `1440p (2K)`, `1080p (Full HD)`, `720p (HD)`, `480p`, `360p`) with the exact `filesize` or `filesize_approx` formatted into readable `MB`/`GB`.
  - For standard web pages without video manifests, exact file sizes are determined via parallel `HEAD` requests for discovered `<video>` and `<audio>` files.

### Decision 3: Client-Side Selection & Seamless Execution in `MediaHub`
- **Approach**:
  - `MediaHub` dynamically adapts its resolution grid to display every extracted resolution provided by the backend response.
  - Clicking "Download" passes both the format ID, target resolution, and source URL to `/api/download`.
  - A hidden dynamic anchor click immediately triggers native browser file save with accurate file extensions and sanitized titles.

---

## 4. Proposed Implementation Steps

### Step 1: Install & Set Up Local `yt-dlp` Binary in Server
- Place the standalone `yt-dlp` executable in `/app/applet/bin/yt-dlp` with execution permissions (`chmod +x`).
- Verify execution compatibility with system Python 3.10 and `/usr/bin/ffmpeg`.

### Step 2: Implement Real Stream Extraction in `/api/analyze`
- In `server.ts`, create a helper `extractLiveStreamMetadata(url)` that calls `yt-dlp -J --no-playlist` with a 10-second timeout.
- Map the parsed stream entries into dynamic `videoFormats` and `audioFormats` arrays containing actual resolutions and real file sizes.
- Fall back gracefully to fast HEAD/oEmbed crawlers for non-stream websites.

### Step 3: Implement Genuine Media Stream Delivery in `/api/download`
- Handle video downloads via child-process spawn of `yt-dlp`:
  ```bash
  yt-dlp -f "bestvideo[height<={height}]+bestaudio/best[height<={height}]/best" --ffmpeg-location /usr/bin/ffmpeg -o - "{url}"
  ```
- Pipe the process `stdout` directly into `res` with headers:
  `Content-Type: video/mp4`, `Content-Disposition: attachment; filename="{safeTitle}_{resolution}.mp4"`.
- Handle audio downloads via:
  ```bash
  yt-dlp -x --audio-format mp3 --audio-quality 0 --ffmpeg-location /usr/bin/ffmpeg -o - "{url}"
  ```
- Pipe audio directly to `res` with `Content-Type: audio/mpeg`.
- For direct URLs, pipe the remote stream directly with Range header forwarding.

### Step 4: Upgrade `MediaHub` UI for Dynamic Formats
- In `MediaHub.tsx`, ensure the resolution grid renders all formats returned from the API dynamically without hardcoded limits.
- Display genuine file sizes and bitrates directly on each quality card.
- Ensure the primary Download button passes `formatId`, `resolution`, `type`, and `url` to `/api/download`.

### Step 5: Verification & Dev Server Testing
- Compile applet with `compile_applet`.
- Validate with `lint_applet`.
- Test real extraction and download requests using `curl` on YouTube, direct MP4, and web pages to confirm the returned byte stream matches the real file.

---

## 5. Verification & Testing Plan

1. **Format Extraction Test**:
   - Analyze a YouTube link and verify that `videoFormats` contains real resolutions (1080p, 720p, 480p, etc.) with dynamic file sizes.
   - Analyze a direct MP4 link and verify the exact native resolution and byte size.
2. **Download Streaming Test**:
   - Call `/api/download` with a YouTube URL and verify that the response streams the actual video bytes with `Content-Disposition: attachment; filename="..."`.
   - Call `/api/download` with format `mp3` and verify that the real audio stream is returned.
3. **UI Verification**:
   - Confirm in the browser that clicking any resolution button updates the selected format and file size.
   - Confirm that clicking "Download" immediately downloads the chosen resolution file to disk.
