import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Clipboard,
  X,
  ArrowRight,
  Loader2,
  PlaySquare,
  Music,
  Instagram,
  Film,
  Globe,
  Clock,
  Trash2,
  ExternalLink,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { PlatformInfo } from '../types';

export interface SearchHistoryItem {
  id: string;
  url: string;
  domain: string;
  platformId?: string;
  timestamp: number;
}

interface DynamicUrlBarProps {
  url: string;
  setUrl: (url: string) => void;
  onAnalyze: (urlToAnalyze?: string) => void;
  isLoading: boolean;
  detectedPlatform?: PlatformInfo;
}

const SEARCH_HISTORY_KEY = 'media_downloader_search_history_v1';
const MAX_HISTORY_ITEMS = 5;

const SAMPLE_LINKS = [
  {
    label: 'YouTube 4K Demo',
    url: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
    platform: 'youtube',
    badge: '4K · 60fps',
  },
  {
    label: 'Spotify Studio Track',
    url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
    platform: 'spotify',
    badge: '320k · Hi-Fi',
  },
  {
    label: 'Instagram Reel',
    url: 'https://www.instagram.com/reel/C2i-Q2xrX8_/',
    platform: 'instagram',
    badge: '1080p MP4',
  },
  {
    label: 'Universal Web Site',
    url: 'https://en.wikipedia.org/wiki/Aurora',
    platform: 'generic',
    badge: 'Deep Scraper',
  },
];

export const DynamicUrlBar: React.FC<DynamicUrlBarProps> = ({
  url,
  setUrl,
  onAnalyze,
  isLoading,
  detectedPlatform,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load persistent search history from localStorage on mount and sync across windows/tabs
  useEffect(() => {
    const loadHistory = () => {
      try {
        const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setSearchHistory(parsed.slice(0, MAX_HISTORY_ITEMS));
          }
        } else {
          setSearchHistory([]);
        }
      } catch (err) {
        console.warn('Failed to load search history from localStorage:', err);
      }
    };

    loadHistory();
    window.addEventListener('storage', loadHistory);
    window.addEventListener('search-history-updated', loadHistory);
    return () => {
      window.removeEventListener('storage', loadHistory);
      window.removeEventListener('search-history-updated', loadHistory);
    };
  }, []);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowHistoryDropdown(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowHistoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Helper to extract clean domain/host
  const getDomainFromUrl = (rawUrl: string): string => {
    try {
      const parsed = new URL(rawUrl);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return rawUrl.slice(0, 25);
    }
  };

  // Helper to detect platform ID from URL string
  const getPlatformIdFromUrl = (rawUrl: string): string => {
    const lower = rawUrl.toLowerCase();
    if (lower.includes('youtu')) return 'youtube';
    if (lower.includes('spotify')) return 'spotify';
    if (lower.includes('instagram')) return 'instagram';
    if (lower.includes('tiktok')) return 'tiktok';
    return 'generic';
  };

  // Save URL to persistent search history (up to last 5)
  const saveUrlToHistory = (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed || trimmed.length < 4) return;

    try {
      const domain = getDomainFromUrl(trimmed);
      const platformId = getPlatformIdFromUrl(trimmed);

      setSearchHistory((prev) => {
        // Remove duplicate if it already exists
        const filtered = prev.filter(
          (item) => item.url.toLowerCase() !== trimmed.toLowerCase()
        );

        const newItem: SearchHistoryItem = {
          id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          url: trimmed,
          domain,
          platformId,
          timestamp: Date.now(),
        };

        const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event('search-history-updated'));
        return updated;
      });
    } catch (err) {
      console.warn('Failed to save search history to localStorage:', err);
    }
  };

  const clearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
      setSearchHistory([]);
      setShowHistoryDropdown(false);
      window.dispatchEvent(new Event('search-history-updated'));
    } catch (err) {
      console.warn('Failed to clear search history:', err);
    }
  };

  const removeHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setSearchHistory((prev) => {
        const updated = prev.filter((item) => item.id !== id);
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event('search-history-updated'));
        return updated;
      });
    } catch (err) {
      console.warn('Failed to remove item from search history:', err);
    }
  };

  const handleSelectHistoryItem = (itemUrl: string) => {
    setUrl(itemUrl);
    setShowHistoryDropdown(false);
    saveUrlToHistory(itemUrl);
    onAnalyze(itemUrl);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        saveUrlToHistory(text);
        onAnalyze(text);
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && url.trim() && !isLoading) {
      saveUrlToHistory(url);
      onAnalyze(url);
    }
  };

  const handleManualAnalyze = () => {
    if (!url.trim() || isLoading) return;
    saveUrlToHistory(url);
    onAnalyze(url);
  };

  const getPlatformIcon = (platformId?: string) => {
    const id = platformId || detectedPlatform?.id;
    switch (id) {
      case 'youtube':
        return <PlaySquare className="w-3.5 h-3.5 text-red-500 shrink-0" />;
      case 'spotify':
        return <Music className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'instagram':
        return <Instagram className="w-3.5 h-3.5 text-pink-500 shrink-0" />;
      case 'tiktok':
        return <Film className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
      default:
        return <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    }
  };

  const formatTimeAgo = (ts: number): string => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div ref={containerRef} className="w-full max-w-4xl mx-auto flex flex-col gap-3 relative">
      {/* iOS Style Floating Glass Search Island */}
      <div
        className={`relative rounded-2xl p-1.5 transition-all duration-300 z-30 ${
          isFocused || showHistoryDropdown
            ? 'bg-neutral-900/90 shadow-[0_0_35px_rgba(255,255,255,0.08)] border border-white/20'
            : 'bg-neutral-900/60 shadow-lg border border-white/[0.08]'
        } backdrop-blur-2xl`}
      >
        <div className="flex items-center gap-2 px-3 py-1.5">
          {/* Detected Platform Tag */}
          <div className="flex items-center gap-2 pl-1 pr-2 py-1 text-xs font-medium rounded-lg bg-neutral-800/80 border border-white/5 text-neutral-300 shrink-0 select-none">
            {getPlatformIcon()}
            <span className="hidden sm:inline">
              {detectedPlatform ? detectedPlatform.name : 'Auto-Detect'}
            </span>
          </div>

          {/* Main Input */}
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              if (searchHistory.length > 0) setShowHistoryDropdown(true);
            }}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Paste link from YouTube, Spotify, Instagram, TikTok, or any webpage..."
            className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder-neutral-500 focus:outline-none px-2 py-2 min-w-0"
          />

          {/* History Button Toggle (Always accessible) */}
          <button
            type="button"
            onClick={() => setShowHistoryDropdown((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all shrink-0 ${
              showHistoryDropdown
                ? 'bg-neutral-800 text-white border-blue-500/40 shadow-sm'
                : 'bg-neutral-900/70 text-neutral-400 hover:text-neutral-200 border-white/[0.06] hover:bg-neutral-800/80'
            }`}
            title="Search History (Last 5 Analyzed URLs)"
            aria-expanded={showHistoryDropdown}
            aria-label="Toggle Search History"
          >
            <Clock className={`w-3.5 h-3.5 ${searchHistory.length > 0 ? 'text-blue-400' : 'text-neutral-500'}`} />
            <span className="hidden sm:inline">History</span>
            {searchHistory.length > 0 && (
              <span className="px-1.5 py-0.2 font-mono text-[10px] font-semibold rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {searchHistory.length}
              </span>
            )}
            <ChevronDown
              className={`w-3 h-3 text-neutral-400 transition-transform duration-200 ${
                showHistoryDropdown ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Clear Button */}
          {url && (
            <button
              onClick={() => setUrl('')}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors shrink-0"
              title="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Paste from Clipboard Button */}
          <button
            onClick={handlePaste}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-700/80 border border-white/5 rounded-xl transition-colors shrink-0"
            title="Paste from clipboard"
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>Paste</span>
          </button>

          {/* Analyze / Fetch Button */}
          <button
            onClick={handleManualAnalyze}
            disabled={!url.trim() || isLoading}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shrink-0 transition-all ${
              !url.trim() || isLoading
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-white/5'
                : 'bg-white text-black hover:bg-neutral-100 active:scale-[0.98] shadow-md shadow-white/10'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Extracting...</span>
              </>
            ) : (
              <>
                <span>Extract</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Persistent Search History Floating Dropdown Panel */}
        {showHistoryDropdown && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-[#121318]/95 border border-white/15 rounded-2xl p-3 shadow-2xl backdrop-blur-3xl z-50 space-y-2 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-2 py-1 border-b border-white/[0.08] pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-white tracking-wide">
                    Search History
                  </span>
                  <span className="ml-2 text-[10px] font-mono text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-800/80 border border-white/5">
                    Last 5 URLs
                  </span>
                </div>
              </div>

              {searchHistory.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="flex items-center gap-1 text-[11px] font-medium text-neutral-400 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
                  title="Clear all search history"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {/* List or Empty State */}
            {searchHistory.length === 0 ? (
              <div className="py-6 px-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-neutral-800/80 border border-white/5 flex items-center justify-center mx-auto text-neutral-500">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-300">No search history yet</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Previously analyzed links will appear here for fast 1-click re-runs.
                  </p>
                </div>
                <div className="pt-2">
                  <p className="text-[10px] text-neutral-400 uppercase font-semibold tracking-wider mb-1.5">
                    Or try a sample link:
                  </p>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {SAMPLE_LINKS.slice(0, 3).map((sample) => (
                      <button
                        key={sample.label}
                        onClick={() => {
                          setUrl(sample.url);
                          saveUrlToHistory(sample.url);
                          setShowHistoryDropdown(false);
                          onAnalyze(sample.url);
                        }}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-neutral-800/90 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-white/5 transition-colors"
                      >
                        {sample.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {searchHistory.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectHistoryItem(item.url)}
                    className="group flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-neutral-900/60 hover:bg-neutral-800/90 border border-transparent hover:border-white/10 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="text-[10px] font-mono text-neutral-500 w-3 text-right group-hover:text-neutral-400">
                        {idx + 1}
                      </span>
                      <div className="p-1.5 rounded-lg bg-neutral-800 border border-white/5 group-hover:border-white/15 transition-colors">
                        {getPlatformIcon(item.platformId)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                            {item.domain}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400">
                            {formatTimeAgo(item.timestamp)}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 truncate font-mono">
                          {item.url}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 group-hover:inline-flex items-center gap-1 hidden transition-all">
                        <span>Re-analyze</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                      <button
                        onClick={(e) => removeHistoryItem(item.id, e)}
                        className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-neutral-700/60 transition-colors"
                        title="Remove from history"
                        aria-label="Remove item"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer with hint */}
            <div className="flex items-center justify-between px-2 pt-1 border-t border-white/[0.05] text-[10px] text-neutral-400 font-mono">
              <span>Click any link to re-run analysis immediately</span>
              <span>Saved in LocalStorage</span>
            </div>
          </div>
        )}
      </div>

      {/* Persistent History Quick-Chips (Always visible quick access to the last 5 links) */}
      {searchHistory.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs px-2 animate-in fade-in duration-300">
          <div className="flex items-center gap-1.5 text-neutral-400 shrink-0 font-medium text-[11px]">
            <Clock className="w-3 h-3 text-blue-400" />
            <span>Recent ({searchHistory.length}):</span>
          </div>

          {searchHistory.map((item, index) => (
            <button
              key={item.id}
              onClick={() => handleSelectHistoryItem(item.url)}
              title={item.url}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-white/[0.08] hover:border-blue-500/30 transition-all text-xs group"
            >
              {getPlatformIcon(item.platformId)}
              <span className="font-mono text-[11px] max-w-[130px] truncate">
                {item.domain}
              </span>
              <span className="text-[9px] text-neutral-400 font-mono group-hover:text-blue-400">
                #{index + 1}
              </span>
            </button>
          ))}

          <button
            onClick={clearHistory}
            className="text-[10px] text-neutral-400 hover:text-red-400 font-mono transition-colors ml-1 px-1.5 py-0.5"
            title="Clear persistent history"
          >
            Clear
          </button>
        </div>
      )}

      {/* Preset Test Links for Immediate Verification */}
      <div className="flex items-center gap-2 flex-wrap text-xs text-neutral-400 px-2">
        <span className="text-neutral-400 shrink-0 text-[11px]">Sample Links:</span>
        {SAMPLE_LINKS.map((sample) => (
          <button
            key={sample.label}
            onClick={() => {
              setUrl(sample.url);
              saveUrlToHistory(sample.url);
              onAnalyze(sample.url);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900/50 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-white/[0.05] transition-colors"
          >
            <span>{sample.label}</span>
            <span className="text-[10px] text-neutral-400 font-mono">({sample.badge})</span>
          </button>
        ))}
      </div>
    </div>
  );
};
