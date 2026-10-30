import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DynamicUrlBar } from './components/DynamicUrlBar';
import { MediaHub } from './components/MediaHub/MediaHub';
import { BatchQueueView } from './components/BatchQueueView';
import { LibraryView } from './components/LibraryView';
import { MediaPlayerModal } from './components/MediaPlayerModal';
import { SettingsModal } from './components/SettingsModal';
import {
  MediaAnalysisResult,
  DownloadTask,
  PlatformInfo,
} from './types';
import {
  Film,
  Music,
  Grid,
  FileText,
  Layers,
  Sparkles,
  ArrowDownToLine,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import {
  SmartCleanupConfig,
  DEFAULT_SMART_CLEANUP_CONFIG,
  STORAGE_KEY_SMART_CLEANUP,
  evaluateCleanupCandidates,
  getSampleLibraryItems,
  parseSizeToMb,
  formatMb,
} from './utils/smartCleanup';

const STORAGE_KEY_LIBRARY = 'downloader_library_v1';
const STORAGE_KEY_SETTINGS = 'downloader_settings_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<'hub' | 'batch' | 'library'>('hub');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analyzedMedia, setAnalyzedMedia] = useState<MediaAnalysisResult | null>(null);

  // Batch queue & Library state
  const [queue, setQueue] = useState<DownloadTask[]>([]);
  const [library, setLibrary] = useState<DownloadTask[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LIBRARY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return getSampleLibraryItems();
    } catch {
      return getSampleLibraryItems();
    }
  });

  // Settings & Preferences
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [preferredQuality, setPreferredQuality] = useState('1080p');
  const [preferredAudio, setPreferredAudio] = useState('mp3-320');
  const [autoTagId3, setAutoTagId3] = useState(true);
  const [accentTone, setAccentTone] = useState('charcoal');

  // Smart Cleanup Configuration
  const [smartCleanupConfig, setSmartCleanupConfig] = useState<SmartCleanupConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SMART_CLEANUP);
      return stored ? JSON.parse(stored) : DEFAULT_SMART_CLEANUP_CONFIG;
    } catch {
      return DEFAULT_SMART_CLEANUP_CONFIG;
    }
  });
  const [autoCleanupNotice, setAutoCleanupNotice] = useState<string | null>(null);

  // In-app Media Player Modal
  const [previewMedia, setPreviewMedia] = useState<MediaAnalysisResult | DownloadTask | null>(null);

  // Sync Library to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LIBRARY, JSON.stringify(library));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [library]);

  // Sync Smart Cleanup Configuration
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SMART_CLEANUP, JSON.stringify(smartCleanupConfig));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [smartCleanupConfig]);

  // Handle URL Analysis with multi-engine fallback
  const handleAnalyze = async (urlToAnalyze = url) => {
    const target = urlToAnalyze.trim();
    if (!target) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${res.status}`);
      }

      const data: MediaAnalysisResult = await res.json();
      setAnalyzedMedia(data);
      setActiveTab('hub');

      // Sync persistent search history
      try {
        const stored = localStorage.getItem('media_downloader_search_history_v1');
        const list = stored ? JSON.parse(stored) : [];
        let domain = target.slice(0, 25);
        try {
          domain = new URL(target).hostname.replace(/^www\./, '');
        } catch {}
        const filtered = list.filter((item: any) => item.url?.toLowerCase() !== target.toLowerCase());
        const updated = [
          {
            id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            url: target,
            domain,
            platformId: data.platform?.id || 'generic',
            timestamp: Date.now(),
          },
          ...filtered,
        ].slice(0, 5);
        localStorage.setItem('media_downloader_search_history_v1', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not sync history:', e);
      }
    } catch (err: any) {
      console.error('Analyze failed:', err);
      setErrorMessage(
        err.message || 'Unable to analyze media from this link. Please verify the URL and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        handleAnalyze(text);
      }
    } catch {
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (input) input.focus();
    }
  };

  // Add completed download to Library and auto-prune if Smart Cleanup enabled
  const handleAddDownloadToLibrary = (
    item: Omit<DownloadTask, 'id' | 'progress' | 'status' | 'speed' | 'timestamp'>
  ) => {
    const newTask: DownloadTask = {
      ...item,
      id: `lib-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      progress: 100,
      status: 'completed',
      speed: 'Done',
      timestamp: Date.now(),
    };
    setLibrary((prev) => {
      const updated = [newTask, ...prev];
      if (smartCleanupConfig.enabled) {
        const { matches } = evaluateCleanupCandidates(updated, smartCleanupConfig);
        if (matches.length > 0) {
          const matchIds = new Set(matches.map((m) => m.id));
          return updated.filter((task) => !matchIds.has(task.id));
        }
      }
      return updated;
    });
  };

  // Execute Smart Cleanup for specified item IDs
  const handleExecuteCleanup = (itemIdsToRemove: string[]) => {
    const idSet = new Set(itemIdsToRemove);
    const toRemove = library.filter((item) => idSet.has(item.id));
    const freedMb = toRemove.reduce((sum, item) => sum + parseSizeToMb(item.size), 0);
    setLibrary((prev) => prev.filter((item) => !idSet.has(item.id)));
    return { count: toRemove.length, freedMb };
  };

  // Seed sample library items for immediate testing and verification
  const handleSeedSampleData = () => {
    const samples = getSampleLibraryItems();
    setLibrary(samples);
  };

  // Add item to Batch Queue
  const handleAddToQueue = (
    item: Omit<DownloadTask, 'id' | 'progress' | 'status' | 'speed' | 'timestamp'>
  ) => {
    const newTask: DownloadTask = {
      ...item,
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      progress: 0,
      status: 'idle',
      speed: '',
      timestamp: Date.now(),
    };
    setQueue((prev) => [...prev, newTask]);
    setActiveTab('batch');
  };

  // Add multiple bulk URLs to Batch Queue
  const handleAddBulkUrls = async (urls: string[]) => {
    const newItems: DownloadTask[] = urls.map((raw, idx) => {
      const isYoutube = raw.includes('youtu');
      const isSpotify = raw.includes('spotify');
      return {
        id: `bulk-${Date.now()}-${idx}`,
        url: raw,
        title: `Queued Media #${idx + 1}`,
        author: isYoutube ? 'YouTube' : isSpotify ? 'Spotify' : 'Web Stream',
        thumbnail: '/src/assets/images/hero_waveform_glass_1791840709272.jpg',
        platform: {
          id: isYoutube ? 'youtube' : isSpotify ? 'spotify' : 'generic',
          name: isYoutube ? 'YouTube' : isSpotify ? 'Spotify' : 'Web Asset',
          color: '#3B82F6',
          icon: 'globe',
        },
        type: isSpotify ? 'audio' : 'video',
        format: isSpotify ? 'mp3' : 'mp4',
        resolution: isSpotify ? '320 kbps' : '1080p',
        size: isSpotify ? '11.8 MB' : '280 MB',
        progress: 0,
        status: 'idle',
        speed: '',
        timestamp: Date.now(),
      };
    });
    setQueue((prev) => [...prev, ...newItems]);
  };

  // Run all queued downloads with live speed variations and progress
  const handleStartAllQueue = () => {
    setQueue((prev) =>
      prev.map((t) => (t.status === 'idle' || t.status === 'paused' ? { ...t, status: 'downloading', progress: 5, speed: '18.4 MB/s' } : t))
    );

    let step = 0;
    const speedOptions = ['18.4 MB/s', '24.2 MB/s', '29.8 MB/s', '26.1 MB/s', '31.5 MB/s', '22.0 MB/s'];
    const interval = setInterval(() => {
      step += 1;
      const progressIncrement = 12 + Math.floor(Math.random() * 8);
      
      setQueue((prev) => {
        const stillDownloading = prev.some((t) => t.status === 'downloading');
        if (!stillDownloading && step > 1) {
          clearInterval(interval);
          return prev;
        }

        return prev.map((t) => {
          if (t.status !== 'downloading') return t;
          const nextProg = Math.min(100, (t.progress || 0) + progressIncrement);
          if (nextProg >= 100) {
            return {
              ...t,
              status: 'completed',
              progress: 100,
              speed: 'Done',
            };
          }
          const randomSpeed = speedOptions[Math.floor(Math.random() * speedOptions.length)];
          return {
            ...t,
            progress: nextProg,
            speed: randomSpeed,
          };
        });
      });

      if (step >= 12) {
        clearInterval(interval);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-[#EDEDF0] flex flex-col font-sans selection:bg-neutral-700 selection:text-white">
      {/* iOS 18 Streamlined Header with Global Queue Progress */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onQuickPaste={handleQuickPaste}
        batchCount={queue.length}
        libraryCount={library.length}
        queue={queue}
      />

      {/* Hero Header & Dynamic URL Island */}
      <section className="relative pt-8 pb-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center opacity-25">
          <img
            src="/src/assets/images/hero_waveform_glass_1791840709272.jpg"
            alt="Audio wave ribbons"
            className="w-full max-w-6xl object-cover h-80 rounded-3xl blur-2xl transform scale-110"
          />
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-4">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Universal Media Downloader
          </h1>

          <p className="text-sm sm:text-base text-neutral-400 max-w-2xl mx-auto font-normal leading-relaxed">
            Download 4K HDR videos, extract studio-grade 320k MP3 audio, and browse full web galleries from any link in an Apple iOS dark interface.
          </p>

          <div className="pt-2">
            <DynamicUrlBar
              url={url}
              setUrl={setUrl}
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              detectedPlatform={analyzedMedia?.platform}
            />
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-500/20 text-xs text-red-200 rounded-xl max-w-xl mx-auto">
              {errorMessage}
            </div>
          )}
        </div>
      </section>

      {/* Main Unified Viewports */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-8">
        {activeTab === 'hub' && (
          <div className="space-y-8 animate-fade-in">
            {analyzedMedia ? (
              <MediaHub
                data={analyzedMedia}
                onStartDownload={handleAddDownloadToLibrary}
                onPreviewMedia={(m) => setPreviewMedia(m)}
                onAddToQueue={handleAddToQueue}
                queue={queue}
                onUpdateQueue={setQueue}
                onStartAllQueue={handleStartAllQueue}
                onClearQueue={() => setQueue([])}
                onAddBulkUrls={handleAddBulkUrls}
              />
            ) : (
              /* Pre-Analysis Bento Feature Showcase */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div className="p-6 rounded-3xl bg-neutral-900/40 border border-white/[0.06] backdrop-blur-xl flex flex-col justify-between space-y-4">
                  <div className="w-10 h-10 rounded-2xl bg-neutral-800/80 border border-white/10 flex items-center justify-center text-white">
                    <Film className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">4K Ultra HD & 60 FPS</h3>
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                      Download crisp, high-framerate videos in 2160p, 1440p, 1080p, or optimized mobile resolutions with HDR support.
                    </p>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-neutral-900/40 border border-white/[0.06] backdrop-blur-xl flex flex-col justify-between space-y-4">
                  <div className="w-10 h-10 rounded-2xl bg-neutral-800/80 border border-white/10 flex items-center justify-center text-white">
                    <Music className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">Studio Audio & FLAC</h3>
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                      Extract audio tracks at 320 kbps MP3, uncompressed WAV, or Lossless FLAC with automatic ID3v2 metadata and cover artwork.
                    </p>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-neutral-900/40 border border-white/[0.06] backdrop-blur-xl flex flex-col justify-between space-y-4">
                  <div className="w-10 h-10 rounded-2xl bg-neutral-800/80 border border-white/10 flex items-center justify-center text-white">
                    <Grid className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">Visual Gallery & Scraper</h3>
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                      Paste any website link to discover and bulk-download embedded media, audio streams, photo galleries, and documents.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'batch' && (
          <div className="animate-fade-in">
            <BatchQueueView
              queue={queue}
              onUpdateQueue={setQueue}
              onStartAll={handleStartAllQueue}
              onClearQueue={() => setQueue([])}
              onAddBulkUrls={handleAddBulkUrls}
            />
          </div>
        )}

        {activeTab === 'library' && (
          <div className="animate-fade-in">
            <LibraryView
              library={library}
              onClearLibrary={() => setLibrary([])}
              onDeleteItem={(id) => setLibrary((prev) => prev.filter((item) => item.id !== id))}
              onDeleteMultipleItems={(ids) =>
                setLibrary((prev) => prev.filter((item) => !ids.includes(item.id)))
              }
              onPlayItem={(task) => setPreviewMedia(task)}
              onNavigateToAnalyzer={() => setActiveTab('hub')}
              smartCleanupConfig={smartCleanupConfig}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onExecuteCleanup={handleExecuteCleanup}
              onSeedSampleData={handleSeedSampleData}
              onUpdateLibrary={setLibrary}
            />
          </div>
        )}
      </main>

      {/* Footer adhering strictly to anti-slop rules */}
      <footer className="w-full border-t border-white/[0.06] bg-[#0A0B0E] py-8 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-300">Downloader</span>
            <span aria-hidden="true">·</span>
            <span>Apple iOS Unified Media Engine</span>
          </div>

          <div className="flex items-center gap-6 text-neutral-400">
            <button
              onClick={() => setActiveTab('hub')}
              className="hover:text-white transition-colors"
            >
              Media Hub
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              className="hover:text-white transition-colors"
            >
              Batch Queue
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className="hover:text-white transition-colors"
            >
              Library
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hover:text-white transition-colors"
            >
              Preferences
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <MediaPlayerModal media={previewMedia} onClose={() => setPreviewMedia(null)} />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        preferredQuality={preferredQuality}
        setPreferredQuality={setPreferredQuality}
        preferredAudio={preferredAudio}
        setPreferredAudio={setPreferredAudio}
        autoTagId3={autoTagId3}
        setAutoTagId3={setAutoTagId3}
        accentTone={accentTone}
        setAccentTone={setAccentTone}
        smartCleanupConfig={smartCleanupConfig}
        setSmartCleanupConfig={setSmartCleanupConfig}
        library={library}
        onExecuteCleanup={handleExecuteCleanup}
        onSeedSampleData={handleSeedSampleData}
      />
    </div>
  );
}
