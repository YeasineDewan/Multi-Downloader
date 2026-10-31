import React, { useMemo } from 'react';
import {
  ArrowDownToLine,
  Sliders,
  Clipboard,
  Loader2,
  ArrowRight,
  Pause,
  Zap,
  Clock,
} from 'lucide-react';
import { DownloadTask } from '../types';

interface HeaderProps {
  activeTab: 'hub' | 'batch' | 'library';
  setActiveTab: (tab: 'hub' | 'batch' | 'library') => void;
  onOpenSettings: () => void;
  onQuickPaste: () => void;
  batchCount?: number;
  libraryCount?: number;
  queue?: DownloadTask[];
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  onQuickPaste,
  batchCount = 0,
  libraryCount = 0,
  queue = [],
}) => {
  // Identify active and downloading tasks in the batch queue
  const activeTasks = useMemo(() => {
    return queue.filter((t) => t.status === 'downloading' || t.status === 'paused');
  }, [queue]);

  const downloadingTasks = useMemo(() => {
    return queue.filter((t) => t.status === 'downloading');
  }, [queue]);

  const isDownloading = downloadingTasks.length > 0;
  const hasActiveTasks = activeTasks.length > 0;

  // Calculate aggregated progress percentage across all active tasks
  const aggregatedProgress = useMemo(() => {
    if (activeTasks.length === 0) return 0;
    const total = activeTasks.reduce((acc, t) => acc + (t.progress || 0), 0);
    return Math.min(100, Math.max(0, Math.round(total / activeTasks.length)));
  }, [activeTasks]);

  // Calculate aggregated transfer speed and estimated time remaining across active tasks
  const { aggregateSpeed, estimatedTimeRemaining } = useMemo(() => {
    if (activeTasks.length === 0) {
      return { aggregateSpeed: '', estimatedTimeRemaining: '' };
    }

    let totalMbPerSec = 0;
    for (const t of downloadingTasks) {
      if (t.speed) {
        const match = t.speed.match(/([\d.]+)/);
        if (match) {
          totalMbPerSec += parseFloat(match[1]);
        }
      }
    }

    // Estimate remaining megabytes to transfer
    let remainingMbTotal = 0;
    for (const t of activeTasks) {
      let sizeMb = 45;
      if (t.size) {
        const match = t.size.match(/([\d.]+)\s*([KkMmGgTt]?[Bb])/);
        if (match) {
          const val = parseFloat(match[1]);
          const unit = match[2].toUpperCase();
          if (unit.startsWith('G')) sizeMb = val * 1024;
          else if (unit.startsWith('K')) sizeMb = val / 1024;
          else sizeMb = val;
        }
      }
      const prog = t.progress || 0;
      const leftRatio = Math.max(0, (100 - prog) / 100);
      remainingMbTotal += sizeMb * leftRatio;
    }

    let eta = '';
    if (totalMbPerSec > 0 && remainingMbTotal > 0) {
      const remainingSeconds = Math.max(1, Math.round(remainingMbTotal / totalMbPerSec));
      if (remainingSeconds >= 3600) {
        const hrs = Math.floor(remainingSeconds / 3600);
        const mins = Math.floor((remainingSeconds % 3600) / 60);
        eta = `${hrs}h ${mins}m`;
      } else {
        const mins = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;
        eta = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
    } else if (downloadingTasks.length > 0) {
      eta = '00:15';
    }

    const speedStr = totalMbPerSec > 0 ? `${totalMbPerSec.toFixed(1)} MB/s` : downloadingTasks[0]?.speed || '';

    return {
      aggregateSpeed: speedStr,
      estimatedTimeRemaining: eta,
    };
  }, [downloadingTasks, activeTasks]);

  // Determine whether to display the global aggregated progress UI
  const showGlobalProgress = hasActiveTasks && activeTab !== 'batch';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#0A0B0E]/85 backdrop-blur-3xl transition-all select-none relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Zone 1: Apple Display Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('hub')}
            className="flex items-center gap-2.5 sm:gap-3 text-left group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded-2xl p-1 transition-transform active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-neutral-800 via-neutral-900 to-black border border-white/15 flex items-center justify-center shadow-lg group-hover:border-white/30 transition-all group-hover:shadow-blue-500/10">
              <ArrowDownToLine className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-extrabold tracking-tight text-white whitespace-nowrap">
                Downloader
              </span>
              <span className="text-[10px] font-mono font-medium text-neutral-400 tracking-wider uppercase -mt-0.5">
                iOS 18 Pro
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Cupertino Segmented Navigation Control */}
        <nav className="flex items-center p-1 bg-neutral-950/70 border border-white/[0.08] rounded-2xl backdrop-blur-2xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('hub')}
            className={`px-3 py-1.5 sm:px-3.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'hub'
                ? 'bg-neutral-800 text-white shadow-md border border-white/10 ring-1 ring-white/10'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
            }`}
          >
            <span>Media Hub</span>
          </button>

          <button
            onClick={() => setActiveTab('batch')}
            className={`px-3 py-1.5 sm:px-3.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap relative ${
              activeTab === 'batch'
                ? 'bg-neutral-800 text-white shadow-md border border-white/10 ring-1 ring-white/10'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
            }`}
          >
            <span>Batch Queue</span>
            {batchCount > 0 && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full flex items-center gap-1 ${
                  activeTab === 'batch'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/20'
                    : hasActiveTasks
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {hasActiveTasks && activeTab !== 'batch' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                )}
                <span>
                  {hasActiveTasks && activeTab !== 'batch'
                    ? `${aggregatedProgress}%`
                    : batchCount}
                </span>
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`px-3 py-1.5 sm:px-3.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'library'
                ? 'bg-neutral-800 text-white shadow-md border border-white/10 ring-1 ring-white/10'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
            }`}
          >
            <span>Library</span>
            {libraryCount > 0 && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  activeTab === 'library'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/20'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {libraryCount}
              </span>
            )}
          </button>
        </nav>

        {/* Zone 3: Persistent Global Progress Indicator with Total Speed Summary & ETA */}
        {hasActiveTasks && (
          <button
            onClick={() => setActiveTab('batch')}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-850 border border-blue-500/30 hover:border-blue-500/50 backdrop-blur-xl shadow-lg shadow-blue-500/10 transition-all text-xs group cursor-pointer"
            title={`Active Downloads: ${activeTasks.length} task${
              activeTasks.length === 1 ? '' : 's'
            } · ${aggregatedProgress}% · Speed: ${aggregateSpeed || 'Calculating'} · ETA: ${estimatedTimeRemaining || 'Calculating'}. Click to view queue.`}
          >
            <div className="flex items-center justify-center shrink-0">
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
              ) : (
                <Pause className="w-3.5 h-3.5 text-amber-400" />
              )}
            </div>

            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-semibold text-white truncate hidden sm:inline">
                {activeTasks.length} {activeTasks.length === 1 ? 'Download' : 'Downloads'}
              </span>
              <span className="font-mono text-[11px] font-bold text-blue-400">
                {aggregatedProgress}%
              </span>

              {/* Total Speed Summary */}
              {aggregateSpeed && (
                <span className="hidden md:flex items-center gap-1 text-[11px] font-mono text-cyan-300">
                  <span className="text-neutral-500">·</span>
                  <Zap className="w-2.5 h-2.5 text-cyan-400" />
                  <span>{aggregateSpeed}</span>
                </span>
              )}

              {/* Estimated Completion Time */}
              {estimatedTimeRemaining && (
                <span className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-neutral-300">
                  <span className="text-neutral-500">·</span>
                  <Clock className="w-2.5 h-2.5 text-neutral-400" />
                  <span>ETA: {estimatedTimeRemaining}</span>
                </span>
              )}
            </div>

            {/* Micro progress gauge */}
            <div className="w-12 sm:w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden shrink-0">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 rounded-full transition-all duration-300"
                style={{ width: `${aggregatedProgress}%` }}
              />
            </div>

            <ArrowRight className="w-3 h-3 text-neutral-400 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0 hidden sm:block" />
          </button>
        )}

        {/* Zone 4: Apple Action Cluster */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onQuickPaste}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] border border-white/10 rounded-xl transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
            title="Paste link directly from clipboard"
          >
            <Clipboard className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden sm:inline">Paste Link</span>
            <span className="text-[10px] text-neutral-400 font-mono bg-white/10 px-1.5 py-0.5 rounded">⌘V</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-[0.98] border border-white/5 rounded-xl transition-all"
            title="Preferences & Audio Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Global Persistent Aggregated Progress Bar pinned to bottom edge of Header */}
      {hasActiveTasks && (
        <div
          className="absolute -bottom-[1px] left-0 right-0 h-[2.5px] bg-neutral-900/90 overflow-hidden z-50 cursor-pointer"
          onClick={() => setActiveTab('batch')}
          title={`Active Downloads: ${aggregatedProgress}% Complete (${activeTasks.length} active · ${aggregateSpeed} · ETA: ${estimatedTimeRemaining}). Click to open.`}
        >
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 transition-all duration-300 ease-out shadow-[0_0_12px_rgba(59,130,246,0.7)]"
            style={{ width: `${aggregatedProgress}%` }}
          />
        </div>
      )}
    </header>
  );
};
