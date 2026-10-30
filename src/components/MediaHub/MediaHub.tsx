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
    data.videoFormats.find((v) => v.recommended) || data.videoFormats[2] || data.videoFormats[0]
  );
  const [selectedAudio, setSelectedAudio] = useState<AudioFormatOption>(
    data.audioFormats.find((a) => a.recommended) || data.audioFormats[0]
  );

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

  // Handle Main Download
  const handleDownload = () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadProgress(0);
    setDownloadSpeed('18.5 MB/s');
    setDownloadComplete(false);

    const isAudio = activeCategory === 'audio';
    const isImage = activeCategory === 'image' || activeCategory === 'gallery';

    const format = isImage
      ? 'jpg'
      : isAudio
      ? selectedAudio.container.toLowerCase()
      : advancedSettings.convertToGif
      ? 'gif'
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

    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 15) + 12;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setDownloadProgress(100);
        setDownloading(false);
        setDownloadComplete(true);

        const targetDownloadSource = isImage
          ? data.thumbnail
          : data.directMediaUrl || data.url;

        const downloadUrl = `/api/download?url=${encodeURIComponent(
          targetDownloadSource
        )}&title=${encodeURIComponent(data.title)}&format=${format}&resolution=${encodeURIComponent(
          resolution
        )}&type=${isImage ? 'image' : isAudio ? 'audio' : 'video'}&author=${encodeURIComponent(
          data.author || ''
        )}`;

        const anchor = document.createElement('a');
        anchor.href = downloadUrl;
        anchor.download = `${data.title.replace(/[/\\?%*:|"<>]/g, '_')}${
          isImage ? '_Artwork' : ''
        }.${format}`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);

        onStartDownload({
          url: isImage ? data.thumbnail : data.url,
          title: isImage ? `${data.title} (Artwork)` : data.title,
          author: data.author,
          thumbnail: data.thumbnail,
          platform: data.platform,
          type: isImage ? 'asset' : isAudio ? 'audio' : 'video',
          format,
          resolution,
          size,
          downloadUrl,
        });

        setTimeout(() => setDownloadComplete(false), 5000);
      } else {
        setDownloadProgress(current);
        const randomSpeed = (Math.random() * 8 + 18).toFixed(1);
        setDownloadSpeed(`${randomSpeed} MB/s`);
      }
    }, 180);
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
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold">Media downloaded successfully! Added to your Library.</span>
              </div>
              <button
                onClick={handleDownload}
                className="px-3 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 rounded-lg text-emerald-100 transition-colors"
              >
                Download Again
              </button>
            </div>
          ) : (
            <button
              onClick={handleDownload}
              className="w-full py-4 rounded-2xl bg-white hover:bg-neutral-100 text-black font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] shadow-xl shadow-white/10"
            >
              <Download className="w-5 h-5" />
              <span>
                Download{' '}
                {activeCategory === 'image'
                  ? 'Master Artwork & Cover (1920×1080 HD JPG · 1.8 MB)'
                  : activeCategory === 'audio'
                  ? `${selectedAudio.quality} ${selectedAudio.container} (${selectedAudio.estimatedSize})`
                  : `${selectedVideo.resolution} ${selectedVideo.container} (${selectedVideo.estimatedSize})`}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
