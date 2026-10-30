import React, { useState } from 'react';
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

  const [selectedVideo, setSelectedVideo] = useState<VideoFormatOption>(
    data.videoFormats?.find((v) => v.recommended) || data.videoFormats?.[0] || {
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
    data.audioFormats?.find((a) => a.recommended) || data.audioFormats?.[0] || {
      id: 'a-320k',
      label: 'Master Studio MP3',
      quality: '320 kbps',
      sampleRate: '48.0 kHz',
      container: 'MP3',
      estimatedSize: '8.5 MB',
      description: 'Maximum MP3 fidelity with full ID3v2 tags',
    }
  );

  // Synchronize formats whenever data changes (e.g. after a new analysis)
  React.useEffect(() => {
    if (data.videoFormats && data.videoFormats.length > 0) {
      setSelectedVideo(data.videoFormats.find((v) => v.recommended) || data.videoFormats[0]);
    }
    if (data.audioFormats && data.audioFormats.length > 0) {
      setSelectedAudio(data.audioFormats.find((a) => a.recommended) || data.audioFormats[0]);
    }
  }, [data]);

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

  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState('');
  const [downloadComplete, setDownloadComplete] = useState(false);

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

  const targetDownloadSource = isImage
    ? data.thumbnail
    : data.directMediaUrl || data.url;

  const currentDownloadUrl = `/api/download?url=${encodeURIComponent(
    targetDownloadSource
  )}&title=${encodeURIComponent(data.title)}&format=${currentFormat}&resolution=${encodeURIComponent(
    currentResolution
  )}&type=${isImage ? 'image' : isAudio ? 'audio' : 'video'}&author=${encodeURIComponent(
    data.author || ''
  )}`;

  const currentFilename = `${data.title.replace(/[/\\?%*:|"<>]/g, '_')}${
    isImage ? '_Artwork' : ''
  }.${currentFormat}`;

  // Handle Main Download with immediate browser file transfer
  const handleDownload = () => {
    // 1. Immediately trigger the browser download within user gesture to bypass browser popup blockers
    const anchor = document.createElement('a');
    anchor.href = currentDownloadUrl;
    anchor.download = currentFilename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      if (document.body.contains(anchor)) {
        document.body.removeChild(anchor);
      }
    }, 1500);

    // 2. Dispatch task to Library and Queue
    onStartDownload({
      url: isImage ? data.thumbnail : data.url,
      title: isImage ? `${data.title} (Artwork)` : data.title,
      author: data.author,
      thumbnail: data.thumbnail,
      platform: data.platform,
      type: isImage ? 'asset' : isAudio ? 'audio' : 'video',
      format: currentFormat,
      resolution: currentResolution,
      size: currentSize,
      downloadUrl: currentDownloadUrl,
    });

    // 3. Show smooth encoding and transfer progress feedback
    setDownloading(true);
    setDownloadProgress(25);
    setDownloadSpeed('24.2 MB/s');
    setDownloadComplete(false);

    let progress = 25;
    const interval = setInterval(() => {
      progress += 25;
      if (progress >= 100) {
        clearInterval(interval);
        setDownloadProgress(100);
        setDownloading(false);
        setDownloadComplete(true);
      } else {
        setDownloadProgress(progress);
        const randomSpeed = (Math.random() * 8 + 20).toFixed(1);
        setDownloadSpeed(`${randomSpeed} MB/s`);
      }
    }, 150);
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
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span className="font-semibold text-white">{data.platform.name}</span>
              <span aria-hidden="true">·</span>
              <span>{data.author}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{data.durationFormatted}</span>
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
          />
        )}

        {activeCategory === 'audio' && (
          <AudioSubView
            formats={data.audioFormats}
            selectedFormat={selectedAudio}
            onSelectFormat={setSelectedAudio}
            onPreviewAudio={() => onPreviewMedia(data)}
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
          {downloading ? (
            <div className="p-4 rounded-2xl bg-neutral-950/80 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-300">
                <span className="font-semibold text-white">
                  Downloading{' '}
                  {activeCategory === 'audio'
                    ? selectedAudio.label
                    : activeCategory === 'image'
                    ? 'Master Artwork (1920×1080 HD)'
                    : selectedVideo.resolution}...
                </span>
                <span className="font-mono tabular-nums">{downloadSpeed} · {downloadProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 transition-all duration-200 rounded-full"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-neutral-500 font-mono">
                <span>
                  {activeCategory === 'image'
                    ? 'Packaging high-resolution image asset'
                    : 'Encoding stream container'}
                </span>
                <span>ETA: ~00:03</span>
              </div>
            </div>
          ) : downloadComplete ? (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">Media file download started! Saved to your Library.</span>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={currentDownloadUrl}
                  download={currentFilename}
                  className="underline text-emerald-300 hover:text-white font-medium"
                >
                  Direct Link
                </a>
                <button
                  onClick={handleDownload}
                  className="px-3 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 rounded-lg text-emerald-100 transition-colors"
                >
                  Download Again
                </button>
              </div>
            </div>
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
