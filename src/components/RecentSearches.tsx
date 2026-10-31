import React, { useState, useEffect } from 'react';
import {
  Clock,
  RotateCcw,
  Trash2,
  X,
  ExternalLink,
  PlaySquare,
  Music,
  Instagram,
  Globe,
  Sparkles,
  ArrowRight,
  Film,
} from 'lucide-react';

export interface RecentSearchItem {
  id: string;
  url: string;
  domain: string;
  title?: string;
  platformId?: string;
  timestamp: number;
}

interface RecentSearchesProps {
  onSelect: (url: string) => void;
  currentUrl?: string;
  onClearHistory?: () => void;
}

const SEARCH_HISTORY_KEY = 'media_downloader_search_history_v1';
const MAX_HISTORY_ITEMS = 5;

const SAMPLE_SHORTCUTS = [
  {
    label: 'YouTube 4K',
    url: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
    platform: 'youtube',
    badge: '4K · 60fps',
  },
  {
    label: 'Spotify Hi-Fi',
    url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
    platform: 'spotify',
    badge: '320k Audio',
  },
  {
    label: 'Instagram Reel',
    url: 'https://www.instagram.com/reel/C2i-Q2xrX8_/',
    platform: 'instagram',
    badge: '1080p MP4',
  },
  {
    label: 'Web Scraper',
    url: 'https://en.wikipedia.org/wiki/Aurora',
    platform: 'generic',
    badge: 'Deep Assets',
  },
];

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return 'Recent';
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const RecentSearches: React.FC<RecentSearchesProps> = ({
  onSelect,
  currentUrl,
  onClearHistory,
}) => {
  const [history, setHistory] = useState<RecentSearchItem[]>([]);
  const [clearedNotice, setClearedNotice] = useState(false);

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed.slice(0, MAX_HISTORY_ITEMS));
          return;
        }
      }
      setHistory([]);
    } catch (e) {
      console.warn('Failed to parse search history:', e);
      setHistory([]);
    }
  };

  useEffect(() => {
    loadHistory();

    const handleStorageUpdate = () => loadHistory();
    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('search-history-updated', handleStorageUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('search-history-updated', handleStorageUpdate);
    };
  }, []);

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
      setHistory([]);
      window.dispatchEvent(new Event('search-history-updated'));
      onClearHistory?.();
      setClearedNotice(true);
      setTimeout(() => setClearedNotice(false), 2200);
    } catch (err) {
      console.warn('Failed to clear search history:', err);
    }
  };

  const handleRemoveItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = history.filter((item) => item.id !== id);
      setHistory(updated);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('search-history-updated'));
    } catch (err) {
      console.warn('Failed to delete history item:', err);
    }
  };

  const renderPlatformIcon = (platformId?: string) => {
    switch (platformId?.toLowerCase()) {
      case 'youtube':
        return <PlaySquare className="w-3.5 h-3.5 text-red-500 shrink-0" />;
      case 'spotify':
        return <Music className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'instagram':
        return <Instagram className="w-3.5 h-3.5 text-pink-400 shrink-0" />;
      case 'tiktok':
        return <Film className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
      default:
        return <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    }
  };

  const getPlatformLabel = (item: RecentSearchItem): string => {
    if (item.title && item.title !== 'Extracted Media Asset') {
      return item.title;
    }
    const pid = item.platformId?.toLowerCase();
    if (pid === 'youtube') return 'YouTube Stream';
    if (pid === 'spotify') return 'Spotify Audio';
    if (pid === 'instagram') return 'Instagram Media';
    if (pid === 'tiktok') return 'TikTok Video';
    return item.domain || 'Web Media';
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-2xl bg-neutral-900/40 border border-white/[0.08] backdrop-blur-2xl p-3.5 sm:p-4 shadow-xl transition-all">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-white tracking-tight">Recent Searches</span>
          <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded-md border border-white/5">
            {history.length > 0 ? `${history.length} of ${MAX_HISTORY_ITEMS} URLs` : '0 saved'}
          </span>
          {clearedNotice && (
            <span className="text-[11px] font-medium text-emerald-400 animate-fade-in">
              History cleared!
            </span>
          )}
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-rose-400 transition-colors px-2.5 py-1 rounded-xl bg-neutral-800/60 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/30 cursor-pointer shadow-sm active:scale-95"
            title="Remove all stored search history entries from local storage"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Main Content: History Cards or Quick-start suggestions */}
      {history.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 pt-2.5">
          {history.map((item) => {
            const isCurrentlyActive = currentUrl?.trim().toLowerCase() === item.url.trim().toLowerCase();
            const displayTitle = getPlatformLabel(item);

            return (
              <div
                key={item.id}
                onClick={() => onSelect(item.url)}
                className={`group relative p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between select-none ${
                  isCurrentlyActive
                    ? 'bg-neutral-800/90 border-blue-500/50 shadow-md ring-1 ring-blue-500/20'
                    : 'bg-neutral-950/60 border-white/[0.06] hover:bg-neutral-900/90 hover:border-white/20 hover:shadow-lg'
                }`}
                title={`Click to re-analyze: ${item.url}`}
              >
                {/* Platform and Close Button */}
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {renderPlatformIcon(item.platformId)}
                    <span className="text-[10px] font-mono font-medium text-neutral-400 uppercase tracking-wider truncate">
                      {item.platformId || 'Web'}
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleRemoveItem(item.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 rounded transition-all ml-1"
                    title="Remove from history"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {/* Title / Domain */}
                <div className="my-1">
                  <p className="text-xs font-semibold text-neutral-200 group-hover:text-white transition-colors truncate">
                    {displayTitle}
                  </p>
                  <p className="text-[10px] text-neutral-500 font-mono truncate">
                    {item.domain}
                  </p>
                </div>

                {/* Footer: Relative Time and Quick Re-analyze Prompt */}
                <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1 mt-1 border-t border-white/[0.04]">
                  <span className="font-mono tabular-nums">{formatRelativeTime(item.timestamp)}</span>
                  <div className="flex items-center gap-1 text-blue-400 font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                    <span>Re-run</span>
                    <RotateCcw className="w-2.5 h-2.5 group-hover:rotate-180 transition-transform duration-300" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State with Quick-Start Shortcuts */
        <div className="pt-3 pb-1 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>No search history yet. Quick-start with popular media demos:</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {SAMPLE_SHORTCUTS.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => onSelect(sample.url)}
                className="p-2.5 rounded-xl bg-neutral-950/50 hover:bg-neutral-800/80 border border-white/[0.06] hover:border-white/15 transition-all text-left flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center gap-1.5">
                    {renderPlatformIcon(sample.platform)}
                    <span className="text-[10px] font-mono text-neutral-400 uppercase">
                      {sample.platform}
                    </span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </div>
                <span className="text-xs font-semibold text-neutral-200 group-hover:text-white truncate">
                  {sample.label}
                </span>
                <span className="text-[10px] text-blue-400 font-mono mt-0.5">
                  {sample.badge}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
