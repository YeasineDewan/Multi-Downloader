import { DownloadTask } from '../types';

export interface SmartCleanupConfig {
  enabled: boolean;          // Run automatically
  deleteOlderThan: boolean;  // Age-based deletion
  olderThanDays: number;     // e.g. 30 days
  deleteLargerThan: boolean; // File size-based deletion
  largerThanMb: number;      // e.g. 100 MB, 250 MB, 500 MB
  lastRunTimestamp?: number;
}

export const STORAGE_KEY_SMART_CLEANUP = 'downloader_smart_cleanup_config_v1';

export const DEFAULT_SMART_CLEANUP_CONFIG: SmartCleanupConfig = {
  enabled: true,
  deleteOlderThan: true,
  olderThanDays: 30,
  deleteLargerThan: false,
  largerThanMb: 250,
};

/**
 * Parses size strings like "145.2 MB", "1.2 GB", "850 KB" to numeric Megabytes (MB).
 */
export function parseSizeToMb(sizeStr?: string): number {
  if (!sizeStr) return 0;
  const clean = sizeStr.trim().toUpperCase();

  // Match number followed by optional unit
  const match = clean.match(/^([0-9.]+)\s*(GB|MB|KB|B)?$/i) || clean.match(/([0-9.]+)\s*(GB|MB|KB|B)/i);
  if (!match) {
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }

  const value = parseFloat(match[1]);
  if (isNaN(value)) return 0;

  const unit = (match[2] || 'MB').toUpperCase();
  if (unit === 'GB') return value * 1024;
  if (unit === 'MB') return value;
  if (unit === 'KB') return value / 1024;
  if (unit === 'B') return value / (1024 * 1024);

  return value;
}

/**
 * Formats numeric Megabytes to a friendly human-readable string (MB or GB).
 */
export function formatMb(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

export interface CleanupMatchResult {
  matches: DownloadTask[];
  matchesOlder: DownloadTask[];
  matchesLarger: DownloadTask[];
  totalReclaimableMb: number;
  formattedReclaimedSize: string;
}

/**
 * Evaluates which library items match the configured Smart Cleanup rules.
 */
export function evaluateCleanupCandidates(
  library: DownloadTask[],
  config: SmartCleanupConfig,
  referenceNow = Date.now()
): CleanupMatchResult {
  const matchesOlder: DownloadTask[] = [];
  const matchesLarger: DownloadTask[] = [];
  const matchedSet = new Set<string>();
  const matches: DownloadTask[] = [];

  const msPerDay = 1000 * 60 * 60 * 24;

  library.forEach((task) => {
    let matchedThisItem = false;

    // Check age criterion
    if (config.deleteOlderThan && config.olderThanDays > 0) {
      const ageDays = (referenceNow - task.timestamp) / msPerDay;
      if (ageDays >= config.olderThanDays) {
        matchesOlder.push(task);
        matchedThisItem = true;
      }
    }

    // Check size criterion
    if (config.deleteLargerThan && config.largerThanMb > 0) {
      const itemMb = parseSizeToMb(task.size);
      if (itemMb >= config.largerThanMb) {
        matchesLarger.push(task);
        matchedThisItem = true;
      }
    }

    if (matchedThisItem && !matchedSet.has(task.id)) {
      matchedSet.add(task.id);
      matches.push(task);
    }
  });

  const totalReclaimableMb = matches.reduce((sum, item) => sum + parseSizeToMb(item.size), 0);

  return {
    matches,
    matchesOlder,
    matchesLarger,
    totalReclaimableMb,
    formattedReclaimedSize: formatMb(totalReclaimableMb),
  };
}

/**
 * Realistic default sample items spanning various dates and file sizes
 * to give immediate realistic testing for the 30-day and file-size rules.
 */
export function getSampleLibraryItems(): DownloadTask[] {
  const now = Date.now();
  const day = 1000 * 60 * 60 * 24;

  return [
    {
      id: 'sample-1',
      url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Neon Odyssey - 4K Cinematic Documentary',
      author: 'CyberVisuals Studio',
      thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
      platform: { id: 'youtube', name: 'YouTube', color: '#EF4444', icon: 'youtube' },
      type: 'video',
      format: 'MP4 2160p (4K UHD 60fps)',
      resolution: '3840x2160',
      size: '840.5 MB',
      progress: 100,
      status: 'completed',
      speed: 'Done',
      timestamp: now - 38 * day, // 38 days old (> 30 days)
      downloadUrl: '#',
    },
    {
      id: 'sample-2',
      url: 'https://spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
      title: 'Midnight Resonance (Lossless Master FLAC)',
      author: 'Aura Soundscapes',
      thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
      platform: { id: 'spotify', name: 'Spotify', color: '#10B981', icon: 'music' },
      type: 'audio',
      format: 'FLAC 24-bit Lossless Studio',
      size: '42.8 MB',
      progress: 100,
      status: 'completed',
      speed: 'Done',
      timestamp: now - 34 * day, // 34 days old (> 30 days)
      downloadUrl: '#',
    },
    {
      id: 'sample-3',
      url: 'https://vimeo.com/76979871',
      title: 'Highlands Aerial 8K Drone Footage',
      author: 'Nordic Horizon Films',
      thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
      platform: { id: 'vimeo', name: 'Vimeo', color: '#0EA5E9', icon: 'film' },
      type: 'video',
      format: 'MP4 1440p QHD',
      resolution: '2560x1440',
      size: '1.2 GB', // Large size (> 250 MB)
      progress: 100,
      status: 'completed',
      speed: 'Done',
      timestamp: now - 12 * day, // 12 days old (not > 30 days, but > 250 MB)
      downloadUrl: '#',
    },
    {
      id: 'sample-4',
      url: 'https://soundcloud.com/electronic-dreams/lofi-sunset',
      title: 'Warm Echoes & Vinyl Sessions (320 kbps)',
      author: 'Lofi Pulse Collective',
      thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
      platform: { id: 'soundcloud', name: 'SoundCloud', color: '#F97316', icon: 'music' },
      type: 'audio',
      format: 'MP3 320 kbps Studio Tagged',
      size: '14.2 MB',
      progress: 100,
      status: 'completed',
      speed: 'Done',
      timestamp: now - 3 * day, // 3 days old (Recent)
      downloadUrl: '#',
    },
    {
      id: 'sample-5',
      url: 'https://instagram.com/p/reel-showcase',
      title: 'Tokyo Street Lights - Vertical Reel 60fps',
      author: 'Shibuya Visuals',
      thumbnail: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600&auto=format&fit=crop&q=80',
      platform: { id: 'instagram', name: 'Instagram', color: '#EC4899', icon: 'instagram' },
      type: 'video',
      format: 'MP4 1080x1920 HD',
      resolution: '1080x1920',
      size: '28.6 MB',
      progress: 100,
      status: 'completed',
      speed: 'Done',
      timestamp: now - 2 * day, // 2 days old (Recent)
      downloadUrl: '#',
    },
    {
      id: 'sample-6',
      url: 'https://youtube.com/watch?v=live-synthwave-stream',
      title: 'Synthwave Odyssey Live 4K Master',
      author: 'Neon Pulse Visuals',
      thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
      platform: { id: 'youtube', name: 'YouTube', color: '#EF4444', icon: 'youtube' },
      type: 'video',
      format: 'MP4 2160p 60fps (ProRes Audio)',
      resolution: '3840x2160',
      size: '640.2 MB',
      progress: 64,
      status: 'downloading',
      speed: '24.8 MB/s',
      timestamp: now - 1000 * 60 * 12, // 12 minutes ago
      downloadUrl: '#',
      backgroundTaskLabel: 'Background 4K Stream Download & Remux',
    },
  ];
}
