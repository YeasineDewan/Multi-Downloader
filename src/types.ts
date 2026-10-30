export interface PlatformInfo {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface VideoFormatOption {
  id: string;
  label: string;
  resolution: string;
  fps: number;
  container: string;
  codec: string;
  estimatedSize: string;
  bitrate: string;
  hdr?: boolean;
  recommended?: boolean;
  streamUrl?: string;
  formatId?: string;
  filesizeBytes?: number;
}

export interface AudioFormatOption {
  id: string;
  label: string;
  quality: string;
  sampleRate: string;
  container: string;
  estimatedSize: string;
  description: string;
  recommended?: boolean;
  streamUrl?: string;
  formatId?: string;
  filesizeBytes?: number;
}

export interface SubtitleOption {
  code: string;
  label: string;
  format: string;
}

export interface ExtractedAsset {
  type: 'video' | 'audio' | 'image' | 'document';
  url: string;
  label: string;
}

export type MediaHubCategory = 'video' | 'audio' | 'image' | 'gallery' | 'documents' | 'batch';

export interface MediaAnalysisResult {
  url: string;
  platform: PlatformInfo;
  title: string;
  author: string;
  description: string;
  thumbnail: string;
  durationSec: number;
  durationFormatted: string;
  directMediaUrl?: string;
  embedUrl?: string;
  mediaType?: 'video' | 'audio' | 'image' | 'document';
  videoFormats: VideoFormatOption[];
  audioFormats: AudioFormatOption[];
  subtitles: SubtitleOption[];
  extractedAssets?: ExtractedAsset[];
  allAssets?: ScrapedSiteAsset[];
  totalAssetsCount?: number;
}

export interface DownloadTask {
  id: string;
  url: string;
  title: string;
  author: string;
  thumbnail: string;
  platform: PlatformInfo;
  type: 'video' | 'audio' | 'subtitle' | 'asset';
  format: string;
  resolution?: string;
  size: string;
  progress: number;
  status: 'idle' | 'downloading' | 'completed' | 'failed' | 'paused';
  speed: string;
  timestamp: number;
  downloadUrl?: string;
  backgroundTaskLabel?: string;
}

export interface ScrapedSiteAsset {
  id: string;
  category: 'video' | 'audio' | 'image' | 'document';
  url: string;
  filename: string;
  sizeEst: string;
  extension: string;
  dimensions?: string;
  thumbnailUrl?: string;
  altText?: string;
  aspectRatio?: string;
}

export interface AdvancedDownloadSettings {
  trimEnabled: boolean;
  startTime: string; // "00:00"
  endTime: string;   // "03:45"
  volumeBoost: number; // 100 - 200%
  bassBoost: boolean;
  autoTagId3: boolean;
  muteVideo: boolean;
  playbackSpeed: number; // 0.5, 1, 1.25, 1.5, 2
  convertToGif: boolean;
  subtitleFormat: 'srt' | 'vtt';
  includeThumbnail: boolean;
}
