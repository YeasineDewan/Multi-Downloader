import JSZip from 'jszip';
import { DownloadTask } from '../types';

export interface ZipExportProgress {
  step: 'preparing' | 'fetching_assets' | 'compressing' | 'complete' | 'error';
  currentFile?: string;
  itemIndex?: number;
  totalItems?: number;
  percent: number; // 0 - 100
  message: string;
}

/**
 * Sanitizes a string for use as a cross-platform safe filename
 */
export function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60) || 'media_asset'
  );
}

/**
 * Helper to fetch image / asset with a safe timeout
 */
async function fetchAssetBuffer(url: string, timeoutMs = 6000): Promise<ArrayBuffer | null> {
  try {
    if (url.startsWith('data:')) {
      // Decode base64 data url
      const commaIdx = url.indexOf(',');
      if (commaIdx !== -1) {
        const base64 = url.slice(commaIdx + 1);
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Route through backend proxy to avoid browser CORS failure on third-party assets
    const targetUrl =
      url.startsWith('http') && !url.includes(window.location.host)
        ? `/api/proxy-media?url=${encodeURIComponent(url)}`
        : url;

    const res = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    // If offline or error, gracefully return null
    return null;
  }
}

/**
 * Generates an offline-viewable HTML catalog of the exported assets
 */
function generateHtmlCatalog(items: DownloadTask[], exportDate: string): string {
  const itemsHtml = items
    .map(
      (item, idx) => `
    <div class="card">
      <div class="card-header">
        <span class="badge ${item.type}">${item.type.toUpperCase()}</span>
        <span class="badge platform">${item.platform?.name || 'Media'}</span>
        <span class="badge format">${item.format || 'MP4'}</span>
        ${item.size ? `<span class="size">${item.size}</span>` : ''}
      </div>
      <h3 class="title">${idx + 1}. ${escapeHtml(item.title)}</h3>
      <p class="author">By ${escapeHtml(item.author || 'Unknown')}</p>
      <div class="links">
        ${
          item.downloadUrl
            ? `<a href="${escapeHtml(item.downloadUrl)}" target="_blank" class="btn primary">Play / Download Stream</a>`
            : ''
        }
        <a href="${escapeHtml(item.url)}" target="_blank" class="btn secondary">Source URL</a>
      </div>
    </div>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exported Media Archive - ${exportDate}</title>
  <style>
    :root {
      --bg: #0b0c10;
      --card-bg: rgba(255, 255, 255, 0.04);
      --border: rgba(255, 255, 255, 0.08);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --accent: #3b82f6;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 40px 20px;
    }
    .container { max-width: 900px; margin: 0 auto; }
    header {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(168, 85, 247, 0.1));
      border: 1px solid var(--border);
      padding: 28px;
      border-radius: 20px;
      margin-bottom: 28px;
    }
    h1 { margin: 0 0 8px; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    p.meta { margin: 0; font-size: 13px; color: var(--text-muted); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: transform 0.2s;
    }
    .card:hover { transform: translateY(-2px); border-color: rgba(255, 255, 255, 0.15); }
    .card-header { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
    .badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.08);
    }
    .badge.video { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
    .badge.audio { background: rgba(168, 85, 247, 0.2); color: #c084fc; }
    .badge.platform { background: rgba(234, 179, 8, 0.2); color: #fde047; }
    .size { font-size: 11px; margin-left: auto; color: var(--text-muted); font-family: monospace; }
    .title { margin: 0; font-size: 14px; font-weight: 600; line-height: 1.4; color: #fff; }
    .author { margin: 0; font-size: 12px; color: var(--text-muted); }
    .links { display: flex; gap: 8px; margin-top: auto; padding-top: 10px; }
    .btn {
      font-size: 11px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 8px;
      text-decoration: none;
      display: inline-block;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.85; }
    .btn.primary { background: var(--accent); color: #fff; }
    .btn.secondary { background: rgba(255, 255, 255, 0.1); color: var(--text); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Exported Media Library Archive</h1>
      <p class="meta">Exported on ${exportDate} · ${items.length} selected asset(s)</p>
    </header>
    <div class="grid">
      ${itemsHtml}
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Creates and downloads a compressed .zip archive of the selected DownloadTask items
 */
export async function bulkExportToZip(
  items: DownloadTask[],
  onProgress?: (progress: ZipExportProgress) => void
): Promise<{ filename: string; blob: Blob; sizeMb: string }> {
  if (items.length === 0) {
    throw new Error('No items selected for export.');
  }

  const zip = new JSZip();
  const dateTag = new Date().toISOString().slice(0, 10);
  const timeTag = new Date().toTimeString().slice(0, 5).replace(':', '');
  const baseZipName = `MediaHub_Export_${dateTag}_${timeTag}.zip`;
  const exportDateStr = new Date().toLocaleString();

  onProgress?.({
    step: 'preparing',
    percent: 5,
    message: `Initializing archive with ${items.length} asset(s)...`,
  });

  // 1. Add README.txt
  const totalApproxSize = items.reduce((acc, item) => acc + (item.size || ''), ', ');
  const readmeContent = [
    '========================================',
    'Media Downloader - Bulk Archive Export',
    '========================================',
    `Export Date: ${exportDateStr}`,
    `Total Selected Items: ${items.length}`,
    '',
    'CONTENTS INCLUDED:',
    '1. library_catalog.html - Offline browsable interactive web catalog',
    '2. manifest.json        - Machine-readable JSON specifications',
    '3. playlist.m3u8        - Universal streaming/playback playlist',
    '4. assets/ folder       - Individual asset folders with thumbnails, metadata, and web shortcuts',
    '',
    'ITEM LIST:',
    ...items.map(
      (item, i) =>
        ` [${i + 1}] ${item.title} (${item.type.toUpperCase()}, ${item.format}, ${item.size || 'N/A'})\n     Creator: ${
          item.author
        }\n     Source: ${item.url}`
    ),
    '',
    'Enjoy your media assets!',
  ].join('\n');
  zip.file('README.txt', readmeContent);

  // 2. Add manifest.json
  const manifestData = {
    exportedAt: new Date().toISOString(),
    itemCount: items.length,
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      author: item.author,
      platform: item.platform,
      type: item.type,
      format: item.format,
      resolution: item.resolution,
      size: item.size,
      originalUrl: item.url,
      streamUrl: item.downloadUrl,
      savedTimestamp: item.timestamp,
    })),
  };
  zip.file('manifest.json', JSON.stringify(manifestData, null, 2));

  // 3. Add universal playlist (M3U8)
  const m3uEntries = [
    '#EXTM3U',
    '#PLAYLIST:Exported Media Library',
    ...items.map((item) => {
      const duration = 180; // approximate seconds
      const title = `${item.author} - ${item.title}`;
      const stream = item.downloadUrl || item.url;
      return `#EXTINF:${duration},${title}\n${stream}`;
    }),
  ].join('\n');
  zip.file('playlist.m3u8', m3uEntries);

  // 4. Add interactive HTML catalog
  const htmlCatalog = generateHtmlCatalog(items, exportDateStr);
  zip.file('library_catalog.html', htmlCatalog);

  // 5. Add individual asset folders
  const assetsFolder = zip.folder('assets');

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const safeTitle = sanitizeFilename(item.title);
    const folderName = `${String(i + 1).padStart(2, '0')}_${safeTitle}`;
    const itemFolder = assetsFolder?.folder(folderName);

    onProgress?.({
      step: 'fetching_assets',
      itemIndex: i + 1,
      totalItems: items.length,
      currentFile: item.title,
      percent: Math.round(10 + (i / items.length) * 45),
      message: `Packaging asset ${i + 1} of ${items.length}: "${item.title.slice(0, 28)}..."`,
    });

    if (itemFolder) {
      // Asset metadata JSON
      itemFolder.file(
        'metadata.json',
        JSON.stringify(
          {
            ...item,
            exportedDate: exportDateStr,
          },
          null,
          2
        )
      );

      // Asset info text
      const infoText = [
        `Title: ${item.title}`,
        `Creator: ${item.author}`,
        `Platform: ${item.platform?.name || 'Unknown'}`,
        `Type: ${item.type}`,
        `Format: ${item.format}`,
        `Quality: ${item.resolution || 'Standard'}`,
        `Size: ${item.size}`,
        `Original URL: ${item.url}`,
        `Direct Media/Stream URL: ${item.downloadUrl || item.url}`,
      ].join('\n');
      itemFolder.file('info.txt', infoText);

      // Windows Internet Shortcut (.url)
      const urlContent = `[InternetShortcut]\nURL=${item.downloadUrl || item.url}\n`;
      itemFolder.file(`${safeTitle}.url`, urlContent);

      // macOS Web Internet Shortcut (.webloc)
      const weblocContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>URL</key>
  <string>${escapeHtml(item.downloadUrl || item.url)}</string>
</dict>
</plist>`;
      itemFolder.file(`${safeTitle}.webloc`, weblocContent);

      // Single item stream playlist
      itemFolder.file(
        `${safeTitle}.m3u`,
        `#EXTM3U\n#EXTINF:-1,${item.title}\n${item.downloadUrl || item.url}`
      );

      // Attempt to include thumbnail if available
      if (item.thumbnail) {
        const thumbBuf = await fetchAssetBuffer(item.thumbnail);
        if (thumbBuf) {
          const ext = item.thumbnail.includes('.png') ? 'png' : 'jpg';
          itemFolder.file(`cover.${ext}`, thumbBuf);
        }
      }
    }
  }

  // 6. Generate compressed zip file
  onProgress?.({
    step: 'compressing',
    percent: 60,
    message: 'Compressing archive with DEFLATE engine...',
  });

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6,
      },
    },
    (metadata) => {
      const compPercent = Math.round(60 + (metadata.percent / 100) * 38);
      onProgress?.({
        step: 'compressing',
        percent: Math.min(98, compPercent),
        message: `Compressing files (${Math.round(metadata.percent)}%)...`,
      });
    }
  );

  const sizeMb = (zipBlob.size / (1024 * 1024)).toFixed(2) + ' MB';

  onProgress?.({
    step: 'complete',
    percent: 100,
    message: `Archive created successfully (${sizeMb})!`,
  });

  // Trigger automatic download
  const blobUrl = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = baseZipName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 30000);

  return {
    filename: baseZipName,
    blob: zipBlob,
    sizeMb,
  };
}
