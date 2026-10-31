import React, { useState, useRef } from 'react';
import {
  MediaAnalysisResult,
  MediaHubCategory,
  VideoFormatOption,
  AudioFormatOption,
  AdvancedDownloadSettings,
  DownloadTask,
  ScrapedSiteAsset,
} from '../../types';
import { CategoryFilterBar } from './CategoryFilterBar';
import { VideoSubView } from './VideoSubView';
import { AudioSubView } from './AudioSubView';
import { ImageSubView } from './ImageSubView';
import { GallerySubView } from './GallerySubView';
import { DocumentsSubView } from './DocumentsSubView';
import { AdvancedOptionsBar } from './AdvancedOptionsBar';
import { BatchQueueView } from '../BatchQueueView';
import { RealtimeProgressBar, RealtimeProgressState } from '../RealtimeProgressBar';
import { FormatComparisonTable } from './FormatComparisonTable';
import {
  Play,
  Download,
  CheckCircle2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Plus,
  ExternalLink,
  Layers,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';

// Smart Format Picker: Evaluates stream metadata to select the highest available bitrate / resolution
function getOptimalVideoFormat(formats: VideoFormatOption[]): VideoFormatOption | null {
  if (!formats || formats.length === 0) return null;
  return [...formats].sort((a, b) => {
    const parseHeight = (res: string) => {
      const match = res.match(/(\d{3,4})/);
      return match ? parseInt(match[1], 10) : 0;
    };
    const parseBitrate = (bitrate: string) => {
      const match = bitrate.match(/([\d.]+)/);
      const val = match ? parseFloat(match[1]) : 0;
      if (bitrate.toLowerCase().includes('mbps')) return val * 1000;
      return val;
    };

    const hA = parseHeight(a.resolution);
    const hB = parseHeight(b.resolution);
    if (hA !== hB) return hB - hA;

    const bA = parseBitrate(a.bitrate);
    const bB = parseBitrate(b.bitrate);
    if (bA !== bB) return bB - bA;

    const fpsA = a.fps || 30;
    const fpsB = b.fps || 30;
    if (fpsA !== fpsB) return fpsB - fpsA;

    if (a.hdr && !b.hdr) return -1;
    if (!a.hdr && b.hdr) return 1;

    return 0;
  })[0];
}

function getOptimalAudioFormat(formats: AudioFormatOption[]): AudioFormatOption | null {
  if (!formats || formats.length === 0) return null;
  return [...formats].sort((a, b) => {
    const parseQuality = (q: string) => {
      if (q.toLowerCase().includes('lossless') || q.toLowerCase().includes('flac')) return 2000;
      if (q.toLowerCase().includes('pcm') || q.toLowerCase().includes('wav')) return 1411;
      const match = q.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    };
    const qA = parseQuality(a.quality);
    const qB = parseQuality(b.quality);
    return qB - qA;
  })[0];
}

interface MediaHubProps {
  data: MediaAnalysisResult;
  onStartDownload: (task: Omit<DownloadTask, 'id' | 'progress' | 'status' | 'speed' | 'timestamp'>) => void;
  onPreviewMedia: (data: MediaAnalysisResult) => void;
  onAddToQueue: (task: Omit<DownloadTask, 'id' | 'progress' | 'status' | 'speed' | 'timestamp'>) => void;
  queue: DownloadTask[];
  onUpdateQueue: (queue: DownloadTask[]) => void;
  onStartAllQueue: () => void;
  onClearQueue: () => void;
  onAddBulkUrls: (urls: string[]) => void;
}

export const MediaHub: React.FC<MediaHubProps> = ({
  data,
  onStartDownload,
  onPreviewMedia,
  onAddToQueue,
  queue,
  onUpdateQueue,
  onStartAllQueue,
  onClearQueue,
  onAddBulkUrls,
}) => {
  const [activeCategory, setActiveCategory] = useState<MediaHubCategory>('video');

  // Smart Format Picker: Determine the optimal highest available bitrate & resolution
  const optimalVideo = React.useMemo(() => getOptimalVideoFormat(data.videoFormats), [data.videoFormats]);
  const optimalAudio = React.useMemo(() => getOptimalAudioFormat(data.audioFormats), [data.audioFormats]);

  const [selectedVideo, setSelectedVideo] = useState<VideoFormatOption>(
    optimalVideo || data.videoFormats?.[0] || {
      id: 'v-1080p',
      label: 'Full HD 1080p',
      resolution: '1080p',
      fps: 60,
      container: 'MP4',
      codec: 'H.264',
      estimatedSize: '45 MB',
      bitrate: '8 Mbps',
    }
  );
  const [selectedAudio, setSelectedAudio] = useState<AudioFormatOption>(
    optimalAudio || data.audioFormats?.[0] || {
      id: 'a-320k',
      label: 'Master Studio MP3',
      quality: '320 kbps',
      sampleRate: '48.0 kHz',
      container: 'MP3',
      estimatedSize: '8.5 MB',
      description: 'Maximum MP3 fidelity with full ID3v2 tags',
    }
  );

  // Synchronize formats with Smart Format Picker whenever data changes
  React.useEffect(() => {
    if (optimalVideo) {
      setSelectedVideo(optimalVideo);
    }
    if (optimalAudio) {
      setSelectedAudio(optimalAudio);
    }
  }, [data, optimalVideo, optimalAudio]);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedDownloadSettings>({
    trimEnabled: false,
    startTime: '00:00',
    endTime: data.durationFormatted,
    volumeBoost: 100,
    bassBoost: false,
    autoTagId3: true,
    muteVideo: false,
    playbackSpeed: 1.0,
    convertToGif: false,
    subtitleFormat: 'srt',
    includeThumbnail: true,
  });

  const [downloadState, setDownloadState] = useState<RealtimeProgressState>({
    status: 'idle',
    progress: 0,
    receivedBytes: 0,
    totalBytes: 0,
    speed: '',
    eta: '',
    filename: '',
    resolution: '',
    format: '',
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Group assets
  const allAssets: ScrapedSiteAsset[] = data.allAssets || [];
  const galleryAssets = allAssets.filter(
    (a) => a.category === 'image' || a.category === 'video' || a.category === 'audio'
  );
  const imageAssets = allAssets.filter((a) => a.category === 'image');
  const docAssets = allAssets.filter((a) => a.category === 'document');

  // Total image count including master artwork thumbnail
  const totalImageCount = Math.max(1, imageAssets.length + (data.thumbnail ? 1 : 0));

  // Determine current download target parameters
  const isAudio = activeCategory === 'audio';
  const isImage = activeCategory === 'image' || activeCategory === 'gallery';

  const currentFormat = isImage
    ? 'jpg'
    : isAudio
    ? selectedAudio?.container?.toLowerCase() || 'mp3'
    : advancedSettings.convertToGif
    ? 'gif'
    : selectedVideo?.container?.toLowerCase() || 'mp4';

  const currentResolution = isImage
    ? '1920x1080'
    : isAudio
    ? selectedAudio?.quality || '320 kbps'
    : selectedVideo?.resolution || '1080p';

  const currentSize = isImage
    ? '1.8 MB'
    : isAudio
    ? selectedAudio?.estimatedSize || '8.5 MB'
    : selectedVideo?.estimatedSize || '45 MB';

  const currentFormatId = isImage
    ? 'img-master'
    : isAudio
    ? selectedAudio?.id || 'a-320k'
    : selectedVideo?.id || 'v-1080p';

  const currentStreamUrl = isImage
    ? data.thumbnail
    : isAudio
    ? selectedAudio?.streamUrl || ''
    : selectedVideo?.streamUrl || '';

  const targetDownloadSource = isImage
    ? data.thumbnail
    : data.directMediaUrl || data.url;

  const currentDownloadUrl = `/api/download?url=${encodeURIComponent(
    targetDownloadSource
  )}&title=${encodeURIComponent(data.title)}&format=${currentFormat}&resolution=${encodeURIComponent(
    currentResolution
  )}&type=${isImage ? 'image' : isAudio ? 'audio' : 'video'}&author=${encodeURIComponent(
    data.author || ''
  )}&thumbnail=${encodeURIComponent(data.thumbnail || '')}&duration=${data.durationSec || 0}&size=${encodeURIComponent(
    currentSize
  )}&formatId=${encodeURIComponent(currentFormatId)}&streamUrl=${encodeURIComponent(currentStreamUrl)}`;

  const currentFilename = `${data.title.replace(/[/\\?%*:|"<>]/g, '_')}${
    isImage ? '_Artwork' : ''
  }.${currentFormat}`;

  const parseSizeToBytes = (sizeStr: string): number => {
    if (!sizeStr) return 45 * 1024 * 1024;
    const match = sizeStr.match(/([\d.]+)\s*(GB|MB|KB|B)/i);
    if (!match) return 45 * 1024 * 1024;
    const num = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit === 'GB') return Math.round(num * 1024 * 1024 * 1024);
    if (unit === 'MB') return Math.round(num * 1024 * 1024);
    if (unit === 'KB') return Math.round(num * 1024);
    return Math.round(num);
  };

  const formatByteSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const clampedI = Math.min(units.length - 1, Math.max(0, i));
    return `${(bytes / Math.pow(1024, clampedI)).toFixed(1)} ${units[clampedI]}`;
  };

  // Handle Main Download with live stream byte tracking and real-time progress bar
  const handleDownload = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let expectedTotalBytes = isImage
      ? 1800000
      : isAudio
      ? selectedAudio?.filesizeBytes || parseSizeToBytes(currentSize)
      : selectedVideo?.filesizeBytes || parseSizeToBytes(currentSize);

    setDownloadState({
      status: 'downloading',
      progress: 0,
      receivedBytes: 0,
      totalBytes: expectedTotalBytes,
      speed: 'Connecting...',
      eta: '--:--',
      filename: currentFilename,
      resolution: currentResolution,
      format: currentFormat,
    });

    const startTime = performance.now();
    let lastTime = startTime;
    let lastBytes = 0;
    const chunks: BlobPart[] = [];

    try {
      const response = await fetch(currentDownloadUrl, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Download failed with server status ${response.status}`);
      }

      const cl = response.headers.get('content-length');
      if (cl) {
        const parsedCl = parseInt(cl, 10);
        if (!isNaN(parsedCl) && parsedCl > 0) {
          expectedTotalBytes = parsedCl;
        }
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Readable stream not supported by browser.');
      }

      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedBytes += value.length;

        const now = performance.now();
        const elapsedSinceLast = (now - lastTime) / 1000;

        let currentSpeed = '';
        let currentEta = '';
        if (elapsedSinceLast >= 0.15) {
          const deltaBytes = receivedBytes - lastBytes;
          const bytesPerSec = deltaBytes / elapsedSinceLast;
          const speedMb = (bytesPerSec / (1024 * 1024)).toFixed(1);
          currentSpeed = `${speedMb} MB/s`;

          if (bytesPerSec > 0 && expectedTotalBytes > receivedBytes) {
            const secondsRemaining = Math.max(1, Math.round((expectedTotalBytes - receivedBytes) / bytesPerSec));
            const mins = Math.floor(secondsRemaining / 60);
            const secs = secondsRemaining % 60;
            currentEta = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
          }

          lastTime = now;
          lastBytes = receivedBytes;
        }

        const calcProgress = Math.min(
          99,
          Math.max(1, Math.round((receivedBytes / Math.max(expectedTotalBytes, receivedBytes)) * 100))
        );

        setDownloadState((prev) => ({
          ...prev,
          progress: calcProgress,
          receivedBytes,
          totalBytes: expectedTotalBytes,
          speed: currentSpeed || prev.speed,
          eta: currentEta || prev.eta,
        }));
      }

      // Assemble final verified file Blob and trigger automatic browser file download
      const blob = new Blob(chunks, { type: contentType });
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = currentFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDownloadState({
        status: 'completed',
        progress: 100,
        receivedBytes,
        totalBytes: receivedBytes,
        speed: 'Finished',
        eta: '00:00',
        filename: currentFilename,
        resolution: currentResolution,
        format: currentFormat,
        blobUrl,
      });

      // Dispatch completed task to Library and Queue
      onStartDownload({
        url: isImage ? data.thumbnail : data.url,
        title: isImage ? `${data.title} (Artwork)` : data.title,
        author: data.author,
        thumbnail: data.thumbnail,
        platform: data.platform,
        type: isImage ? 'asset' : isAudio ? 'audio' : 'video',
        format: currentFormat,
        resolution: currentResolution,
        size: formatByteSize(receivedBytes),
        downloadUrl: blobUrl,
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setDownloadState({
          status: 'idle',
          progress: 0,
          receivedBytes: 0,
          totalBytes: 0,
          speed: '',
          eta: '',
          filename: '',
          resolution: '',
          format: '',
        });
      } else {
        console.error('Download stream error:', err);
        setDownloadState((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: err.message || 'Stream connection interrupted',
        }));
      }
    }
  };

  const handleCancelDownload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setDownloadState({
      status: 'idle',
      progress: 0,
      receivedBytes: 0,
      totalBytes: 0,
      speed: '',
      eta: '',
      filename: '',
      resolution: '',
      format: '',
    });
  };

  const handleQueueCurrent = () => {
    const isAudio = activeCategory === 'audio';
    const isImage = activeCategory === 'image' || activeCategory === 'gallery';

    const format = isImage
      ? 'jpg'
      : isAudio
      ? selectedAudio.container.toLowerCase()
      : selectedVideo.container.toLowerCase();

    const size = isImage
      ? '1.8 MB'
      : isAudio
      ? selectedAudio.estimatedSize
      : selectedVideo.estimatedSize;

    const resolution = isImage
      ? '1920x1080'
      : isAudio
      ? selectedAudio.quality
      : selectedVideo.resolution;

    onAddToQueue({
      url: isImage ? data.thumbnail : data.url,
      title: isImage ? `${data.title} (Artwork)` : data.title,
      author: data.author,
      thumbnail: data.thumbnail,
      platform: data.platform,
      type: isImage ? 'asset' : isAudio ? 'audio' : 'video',
      format,
      resolution,
      size,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl bg-neutral-900/60 border border-white/[0.08] shadow-2xl backdrop-blur-3xl overflow-hidden p-6 sm:p-8 space-y-6">
      {/* 1. Master Media Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Thumbnail Showcase */}
        <div className="md:col-span-5 relative group rounded-2xl overflow-hidden bg-black aspect-video border border-white/10 shadow-lg">
          <img
            src={data.thumbnail}
            alt={data.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center">
            <button
              onClick={() => onPreviewMedia(data)}
              className="w-13 h-13 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl"
              title="Preview stream playback"
            >
              <Play className="w-6 h-6 ml-0.5 fill-white text-white" />
            </button>
          </div>

          <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[11px] font-mono font-medium text-white border border-white/10">
            {data.durationFormatted}
          </div>
        </div>

        {/* Info Column */}
        <div className="md:col-span-7 flex flex-col justify-between h-full space-y-3">
          <div className="space-y-2">
            {/* Clean unboxed metadata */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
              <span className="font-semibold text-white">{data.platform.name}</span>
              <span aria-hidden="true">·</span>
              <span>{data.author}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{data.durationFormatted}</span>
              {optimalVideo && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-[11px] font-medium text-blue-300 shadow-sm animate-pulse">
                    <Sparkles className="w-3 h-3 text-blue-400" />
                    <span>Smart Pick: {optimalVideo.resolution} ({optimalVideo.bitrate})</span>
                  </span>
                </>
              )}
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug line-clamp-2">
              {data.title}
            </h3>

            {data.description && (
              <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                {data.description}
              </p>
            )}
          </div>

          {/* Quick Actions Row */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              onClick={() => onPreviewMedia(data)}
              className="px-3.5 py-1.5 text-xs font-medium text-neutral-200 hover:text-white bg-neutral-800/80 hover:bg-neutral-700/80 rounded-xl border border-white/5 flex items-center gap-1.5 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Preview Stream</span>
            </button>

            <button
              onClick={handleQueueCurrent}
              className="px-3.5 py-1.5 text-xs font-medium text-neutral-200 hover:text-white bg-neutral-800/80 hover:bg-neutral-700/80 rounded-xl border border-white/5 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to Queue</span>
            </button>

            <a
              href={data.url}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-neutral-400 hover:text-white transition-colors ml-auto"
              title="Open source URL"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* 2. Category-Based Filter Bar (Toggle between Video, Audio, Image content types) */}
      <CategoryFilterBar
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        counts={{
          video: data.videoFormats.length,
          audio: data.audioFormats.length,
          image: totalImageCount,
          gallery: galleryAssets.length,
          documents: docAssets.length,
          batch: queue.length,
        }}
      />

      {/* 3. Category Sub-Viewports */}
      <div className="pt-1">
        {activeCategory === 'video' && (
          <VideoSubView
            formats={data.videoFormats}
            selectedFormat={selectedVideo}
            onSelectFormat={setSelectedVideo}
            subtitles={data.subtitles}
            mediaTitle={data.title}
            optimalFormatId={optimalVideo?.id}
          />
        )}

        {activeCategory === 'audio' && (
          <AudioSubView
            formats={data.audioFormats}
            selectedFormat={selectedAudio}
            onSelectFormat={setSelectedAudio}
            onPreviewAudio={() => onPreviewMedia(data)}
            optimalFormatId={optimalAudio?.id}
          />
        )}

        {(activeCategory === 'image' || activeCategory === 'gallery') && (
          <ImageSubView
            thumbnail={data.thumbnail}
            mediaTitle={data.title}
            assets={galleryAssets}
            onAddToQueue={onAddToQueue}
          />
        )}

        {activeCategory === 'documents' && (
          <DocumentsSubView documents={docAssets} mediaTitle={data.title} />
        )}

        {activeCategory === 'batch' && (
          <BatchQueueView
            queue={queue}
            onUpdateQueue={onUpdateQueue}
            onStartAll={onStartAllQueue}
            onClearQueue={onClearQueue}
            onAddBulkUrls={onAddBulkUrls}
          />
        )}
      </div>

      {/* Format Matrix & Deep Comparison Table */}
      {(activeCategory === 'video' || activeCategory === 'audio') && (
        <FormatComparisonTable
          videoFormats={data.videoFormats}
          audioFormats={data.audioFormats}
          selectedVideo={selectedVideo}
          selectedAudio={selectedAudio}
          optimalVideoId={optimalVideo?.id}
          optimalAudioId={optimalAudio?.id}
          mediaTitle={data.title}
          onSelectVideo={setSelectedVideo}
          onSelectAudio={setSelectedAudio}
        />
      )}

      {/* 4. Subcategory Advanced Options Drawer */}
      {(activeCategory === 'video' || activeCategory === 'audio') && (
        <div className="pt-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-neutral-950/60 hover:bg-neutral-950/90 border border-white/[0.06] text-xs font-semibold text-neutral-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>Subcategory Options & Audio/Video DSP Trimmer</span>
              {advancedSettings.trimEnabled && (
                <span className="text-[10px] text-blue-400 font-mono">(Trimmer Active)</span>
              )}
              {advancedSettings.volumeBoost > 100 && (
                <span className="text-[10px] text-emerald-400 font-mono">
                  ({advancedSettings.volumeBoost}% Boost)
                </span>
              )}
            </div>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <div className="mt-3">
              <AdvancedOptionsBar
                settings={advancedSettings}
                onChange={setAdvancedSettings}
                durationSec={data.durationSec}
              />
            </div>
          )}
        </div>
      )}

      {/* 5. Master Download Execution Zone */}
      {(activeCategory === 'video' || activeCategory === 'audio' || activeCategory === 'image') && (
        <div className="pt-4 border-t border-white/[0.08] space-y-3">
          {downloadState.status !== 'idle' ? (
            <RealtimeProgressBar
              state={downloadState}
              onCancel={handleCancelDownload}
              onRetry={handleDownload}
              onPreview={() => onPreviewMedia(data)}
            />
          ) : (
            <button
              onClick={handleDownload}
              className="w-full py-4 rounded-2xl bg-white hover:bg-neutral-100 text-black font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] shadow-xl shadow-white/10 cursor-pointer"
            >
              <Download className="w-5 h-5" />
              <span>
                Download{' '}
                {activeCategory === 'image'
                  ? 'Master Artwork & Cover (1920×1080 HD JPG · 1.8 MB)'
                  : activeCategory === 'audio'
                  ? `${selectedAudio?.quality || '320 kbps'} ${selectedAudio?.container || 'MP3'} (${currentSize})`
                  : `${selectedVideo?.resolution || '1080p'} ${selectedVideo?.container || 'MP4'} (${currentSize})`}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
