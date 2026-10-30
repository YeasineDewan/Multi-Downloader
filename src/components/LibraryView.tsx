import React, { useState, useMemo, useEffect } from 'react';
import {
  History,
  Play,
  Pause,
  Trash2,
  FileCode,
  ArrowRight,
  Music,
  Film,
  FileText,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Sliders,
  CheckCircle2,
  Archive,
  CheckSquare,
  Square,
  X,
  Check,
  Package,
  RotateCcw,
  Activity,
  Cpu,
  Download,
} from 'lucide-react';
import { DownloadTask } from '../types';
import { exportLibraryToPdf } from '../utils/exportPdf';
import {
  SmartCleanupConfig,
  evaluateCleanupCandidates,
  formatMb,
  parseSizeToMb,
} from '../utils/smartCleanup';
import { bulkExportToZip, ZipExportProgress } from '../utils/bulkZipExport';

interface LibraryViewProps {
  library: DownloadTask[];
  onClearLibrary: () => void;
  onDeleteItem: (id: string) => void;
  onDeleteMultipleItems?: (ids: string[]) => void;
  onPlayItem: (task: DownloadTask) => void;
  onNavigateToAnalyzer: () => void;
  smartCleanupConfig?: SmartCleanupConfig;
  onOpenSettings?: () => void;
  onExecuteCleanup?: (ids: string[]) => { count: number; freedMb: number };
  onSeedSampleData?: () => void;
  onUpdateLibrary?: (updater: (prev: DownloadTask[]) => DownloadTask[]) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  library,
  onClearLibrary,
  onDeleteItem,
  onDeleteMultipleItems,
  onPlayItem,
  onNavigateToAnalyzer,
  smartCleanupConfig,
  onOpenSettings,
  onExecuteCleanup,
  onSeedSampleData,
  onUpdateLibrary,
}) => {
  // Standard export states
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'ongoing' | 'video' | 'audio' | 'other'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [cleanupToast, setCleanupToast] = useState<string | null>(null);
  const pageSize = 8;

  // Real-time animation ticker for ongoing background tasks in Library
  useEffect(() => {
    const hasDownloading = library.some((t) => t.status === 'downloading');
    if (!hasDownloading || !onUpdateLibrary) return;

    const interval = setInterval(() => {
      onUpdateLibrary((prev) => {
        const stillActive = prev.some((t) => t.status === 'downloading');
        if (!stillActive) {
          clearInterval(interval);
          return prev;
        }

        return prev.map((item) => {
          if (item.status !== 'downloading') return item;
          const increment = 3 + Math.floor(Math.random() * 4);
          const nextProg = Math.min(100, (item.progress || 0) + increment);

          if (nextProg >= 100) {
            return {
              ...item,
              progress: 100,
              status: 'completed',
              speed: 'Done',
              backgroundTaskLabel: undefined,
            };
          }

          const speeds = ['21.4 MB/s', '26.8 MB/s', '31.2 MB/s', '24.5 MB/s', '28.9 MB/s'];
          const randomSpeed = speeds[Math.floor(Math.random() * speeds.length)];

          return {
            ...item,
            progress: nextProg,
            speed: randomSpeed,
          };
        });
      });
    }, 1100);

    return () => clearInterval(interval);
  }, [library, onUpdateLibrary]);

  // Toggle pause/downloading on an ongoing background task
  const handleToggleBackgroundTask = (id: string) => {
    if (onUpdateLibrary) {
      onUpdateLibrary((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            const nextStatus = item.status === 'downloading' ? 'paused' : 'downloading';
            return {
              ...item,
              status: nextStatus,
              speed: nextStatus === 'paused' ? 'Paused' : '22.8 MB/s',
            };
          }
          return item;
        })
      );
    }
  };

  // Start background task (e.g. transcode, audio extraction, or offline caching)
  const handleStartBackgroundTask = (id: string, label: string) => {
    if (onUpdateLibrary) {
      onUpdateLibrary((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            return {
              ...item,
              status: 'downloading',
              progress: 12,
              speed: '27.4 MB/s',
              backgroundTaskLabel: label,
            };
          }
          return item;
        })
      );
    }
  };
  // Selection & Bulk Export States
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState<ZipExportProgress | null>(null);
  const [zipSuccessToast, setZipSuccessToast] = useState<string | null>(null);

  // Evaluate candidate cleanup items if config is provided
  const cleanupCandidates = useMemo(() => {
    if (!smartCleanupConfig) return null;
    return evaluateCleanupCandidates(library, smartCleanupConfig);
  }, [library, smartCleanupConfig]);

  // Filter library items
  const filteredLibrary = useMemo(() => {
    return library.filter((item) => {
      const matchesType =
        mediaTypeFilter === 'all'
          ? true
          : mediaTypeFilter === 'ongoing'
          ? item.status === 'downloading' || item.status === 'paused'
          : mediaTypeFilter === 'video'
          ? item.type === 'video'
          : mediaTypeFilter === 'audio'
          ? item.type === 'audio'
          : item.type !== 'video' && item.type !== 'audio';

      const matchesSearch =
        searchQuery.trim() === ''
          ? true
          : item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.format.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesType && matchesSearch;
    });
  }, [library, mediaTypeFilter, searchQuery]);

  // Selected items array
  const selectedItems = useMemo(() => {
    return library.filter((item) => selectedIds.has(item.id));
  }, [library, selectedIds]);

  // Total size estimate of selected items
  const selectedTotalMb = useMemo(() => {
    return selectedItems.reduce((acc, item) => acc + parseSizeToMb(item.size), 0);
  }, [selectedItems]);

  const totalPages = Math.max(1, Math.ceil(filteredLibrary.length / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedItems = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return filteredLibrary.slice(start, start + pageSize);
  }, [filteredLibrary, validPage, pageSize]);

  // Toggle selection for an individual item
  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    if (!isSelectionMode) {
      setIsSelectionMode(true);
    }
  };

  // Select all filtered items
  const handleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredLibrary.forEach((item) => next.add(item.id));
      return next;
    });
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Select only video
  const handleSelectType = (type: 'video' | 'audio') => {
    setSelectedIds(() => {
      const next = new Set<string>();
      library.filter((item) => item.type === type).forEach((item) => next.add(item.id));
      return next;
    });
    setIsSelectionMode(true);
  };

  // Handle Bulk ZIP Export
  const handleBulkExportZip = async () => {
    const targets = selectedItems.length > 0 ? selectedItems : filteredLibrary;
    if (targets.length === 0 || isExportingZip) return;

    setIsExportingZip(true);
    setZipProgress({
      step: 'preparing',
      percent: 5,
      message: `Preparing archive with ${targets.length} item(s)...`,
    });

    try {
      const result = await bulkExportToZip(targets, (progress) => {
        setZipProgress(progress);
      });

      setZipSuccessToast(
        `Successfully exported ${targets.length} asset(s) to ${result.filename} (${result.sizeMb})`
      );
      setTimeout(() => {
        setZipSuccessToast(null);
        setIsExportingZip(false);
        setZipProgress(null);
      }, 2000);
    } catch (err: any) {
      console.error('Bulk ZIP export failed:', err);
      setZipProgress({
        step: 'error',
        percent: 0,
        message: err.message || 'Failed to generate ZIP archive.',
      });
      setTimeout(() => {
        setIsExportingZip(false);
        setZipProgress(null);
      }, 3500);
    }
  };

  // Bulk Delete Selected Items
  const handleBulkDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to remove ${selectedIds.size} selected item(s) from your Library?`
    );
    if (!confirmDelete) return;

    const idsToDelete = Array.from(selectedIds);
    if (onDeleteMultipleItems) {
      onDeleteMultipleItems(idsToDelete);
    } else {
      idsToDelete.forEach((id) => onDeleteItem(id));
    }

    setCleanupToast(`Removed ${idsToDelete.length} item(s) from Library`);
    setSelectedIds(new Set());
    setTimeout(() => setCleanupToast(null), 3000);
  };

  const handleExportPdf = () => {
    if (library.length === 0 || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      exportLibraryToPdf(library);
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 2500);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const exportHistoryJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(library, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'downloader_history_manifest.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleQuickClean = () => {
    if (!cleanupCandidates || cleanupCandidates.matches.length === 0 || !onExecuteCleanup) return;
    const ids = cleanupCandidates.matches.map((item) => item.id);
    const { count, freedMb } = onExecuteCleanup(ids);
    setCleanupToast(`Smart Cleanup removed ${count} items · Freed ${formatMb(freedMb)}`);
    setTimeout(() => setCleanupToast(null), 3500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 relative pb-16">
      {/* Top Header Card */}
      <div className="rounded-3xl bg-neutral-900/60 border border-white/[0.08] p-6 backdrop-blur-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            <span>Download Library & History</span>
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            {library.length} items archived locally. Quick re-download, bulk export, or preview.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {library.length > 0 && (
            <>
              {/* Apple-style Select Mode Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (isSelectionMode) {
                    setIsSelectionMode(false);
                    setSelectedIds(new Set());
                  } else {
                    setIsSelectionMode(true);
                  }
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 shadow-sm ${
                  isSelectionMode
                    ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20'
                    : 'text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-700/80 border-white/5'
                }`}
                title="Toggle selection mode for bulk export and management"
              >
                {isSelectionMode ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Done Selecting</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                    <span>Select Items</span>
                  </>
                )}
              </button>

              {/* Bulk Export ZIP Button */}
              <button
                type="button"
                onClick={() => {
                  if (selectedIds.size > 0) {
                    handleBulkExportZip();
                  } else {
                    setIsSelectionMode(true);
                    handleSelectAllFiltered();
                  }
                }}
                disabled={isExportingZip}
                className="px-3.5 py-1.5 text-xs font-medium text-blue-300 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 rounded-xl border border-blue-500/30 flex items-center gap-1.5 transition-colors shadow-sm"
                title="Export selected assets or filtered items as a compressed .ZIP archive"
              >
                {isExportingZip ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                ) : (
                  <Archive className="w-3.5 h-3.5 text-blue-400" />
                )}
                <span>
                  {selectedIds.size > 0
                    ? `Export ZIP (${selectedIds.size})`
                    : 'Bulk Export (.zip)'}
                </span>
              </button>

              {/* PDF Export */}
              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="px-3.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-700/80 rounded-xl border border-white/5 flex items-center gap-1.5 transition-colors shadow-sm"
                title="Export formatted PDF summary"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : pdfSuccess ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-rose-400" />
                )}
                <span>{pdfSuccess ? 'PDF Saved' : 'PDF Report'}</span>
              </button>

              {/* JSON Manifest */}
              <button
                onClick={exportHistoryJson}
                className="px-3.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-700/80 rounded-xl border border-white/5 flex items-center gap-1.5 transition-colors"
                title="Export JSON manifest"
              >
                <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                <span>JSON</span>
              </button>
            </>
          )}

          {/* Smart Cleanup */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="px-3.5 py-1.5 text-xs font-medium text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition-colors shadow-sm"
              title="Configure Smart Cleanup retention rules in Settings"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Smart Cleanup</span>
              {cleanupCandidates && cleanupCandidates.matches.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] bg-amber-500/30 text-amber-200 rounded-full font-mono">
                  {cleanupCandidates.matches.length}
                </span>
              )}
            </button>
          )}

          {library.length > 0 && (
            <button
              onClick={onClearLibrary}
              className="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-xl transition-colors"
              title="Clear all history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Toast */}
      {cleanupToast && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/30 rounded-2xl text-xs text-emerald-200 flex items-center justify-between gap-2 shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{cleanupToast}</span>
          </div>
          <button
            onClick={() => setCleanupToast(null)}
            className="text-emerald-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* ZIP Export Success Toast */}
      {zipSuccessToast && (
        <div className="p-3.5 bg-blue-950/90 border border-blue-500/40 rounded-2xl text-xs text-blue-200 flex items-center justify-between gap-2 shadow-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="font-medium">{zipSuccessToast}</span>
          </div>
          <button
            onClick={() => setZipSuccessToast(null)}
            className="text-blue-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Smart Cleanup Banner if items match the criteria */}
      {cleanupCandidates && cleanupCandidates.matches.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 border border-amber-500/30 p-4 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Smart Storage Policy:</span>
                <span className="text-amber-300 font-mono">
                  {cleanupCandidates.matches.length} items ready to purge ({cleanupCandidates.formattedReclaimedSize})
                </span>
              </div>
              <div className="text-[11px] text-neutral-300 mt-0.5">
                Matches your policy (older than {smartCleanupConfig?.olderThanDays}d or larger than{' '}
                {smartCleanupConfig && formatMb(smartCleanupConfig.largerThanMb)}).
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onExecuteCleanup && (
              <button
                type="button"
                onClick={handleQuickClean}
                className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clean Now ({cleanupCandidates.matches.length})</span>
              </button>
            )}

            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="px-3 py-1.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 text-xs font-medium border border-white/10 transition-colors flex items-center gap-1"
              >
                <Sliders className="w-3 h-3 text-neutral-400" />
                <span>Settings</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      {library.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1 text-xs">
          <div className="flex items-center gap-1.5">
            {(['all', 'ongoing', 'video', 'audio', 'other'] as const).map((type) => {
              const count =
                type === 'all'
                  ? library.length
                  : type === 'ongoing'
                  ? library.filter((i) => i.status === 'downloading' || i.status === 'paused').length
                  : library.filter((i) => {
                      if (type === 'video') return i.type === 'video';
                      if (type === 'audio') return i.type === 'audio';
                      return i.type !== 'video' && i.type !== 'audio';
                    }).length;

              const isOngoingType = type === 'ongoing';

              return (
                <button
                  key={type}
                  onClick={() => {
                    setMediaTypeFilter(type);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all flex items-center gap-1.5 ${
                    mediaTypeFilter === type
                      ? isOngoingType
                        ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 shadow-sm ring-1 ring-cyan-500/30'
                        : 'bg-neutral-800 text-white shadow-sm border border-white/10 ring-1 ring-white/10'
                      : isOngoingType && count > 0
                      ? 'text-cyan-400 hover:text-cyan-300 bg-neutral-950/60 border border-cyan-500/20'
                      : 'text-neutral-400 hover:text-white bg-neutral-950/60'
                  }`}
                >
                  {isOngoingType && count > 0 && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400" />
                    </span>
                  )}
                  <span>{type === 'all' ? 'All' : type === 'ongoing' ? 'Ongoing Tasks' : type}</span>
                  <span className={`text-[10px] font-mono ${isOngoingType && count > 0 ? 'text-cyan-400' : 'text-neutral-500'}`}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-auto">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search library title or author..."
              className="w-full sm:w-64 pl-8 pr-3 py-1.5 bg-neutral-950/60 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Bulk Selection Bar (iOS-style toolbar when selection mode is active) */}
      {isSelectionMode && library.length > 0 && (
        <div className="rounded-2xl bg-neutral-900/80 border border-blue-500/30 p-3 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">
              {selectedIds.size} of {filteredLibrary.length} selected
            </span>
            {selectedTotalMb > 0 && (
              <span className="text-neutral-400 font-mono text-[11px]">
                (~{formatMb(selectedTotalMb)})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
            >
              Select All ({filteredLibrary.length})
            </button>

            <button
              type="button"
              onClick={() => handleSelectType('video')}
              className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors"
            >
              Select Videos
            </button>

            <button
              type="button"
              onClick={() => handleSelectType('audio')}
              className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors"
            >
              Select Audio
            </button>

            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white text-xs font-medium transition-colors"
              >
                Clear Selection
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedIds(new Set());
              }}
              className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors ml-1"
              title="Close selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main List View */}
      {filteredLibrary.length === 0 ? (
        <div className="rounded-3xl bg-neutral-900/40 border border-white/[0.06] p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-800/60 border border-white/10 mx-auto flex items-center justify-center text-neutral-400">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">No items in your download library</h4>
            <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
              Media tasks downloaded from the unified hub or batch queue will automatically be preserved here.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={onNavigateToAnalyzer}
              className="px-5 py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors inline-flex items-center gap-1.5 shadow-md"
            >
              <span>Analyze Media URL</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            {onSeedSampleData && (
              <button
                onClick={onSeedSampleData}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-white/10 transition-colors inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Load Sample Library</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2.5">
            {paginatedItems.map((item) => {
              const ageDays = Math.round((Date.now() - item.timestamp) / (1000 * 60 * 60 * 24));
              const isOlderThan30d =
                smartCleanupConfig?.deleteOlderThan &&
                ageDays >= (smartCleanupConfig?.olderThanDays || 30);
              const isLarger =
                smartCleanupConfig?.deleteLargerThan &&
                item.size &&
                item.size.includes('GB');
              const isSelected = selectedIds.has(item.id);

              const isOngoing = item.status === 'downloading' || item.status === 'paused';
              const isPaused = item.status === 'paused';
              const progressVal = typeof item.progress === 'number' ? Math.max(0, Math.min(100, item.progress)) : 0;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (isSelectionMode) {
                      handleToggleSelect(item.id);
                    }
                  }}
                  className={`group rounded-2xl border p-3.5 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-xl ${
                    isSelected
                      ? 'bg-blue-950/30 border-blue-500/50 ring-1 ring-blue-500/40'
                      : isOngoing
                      ? 'bg-neutral-900/60 hover:bg-neutral-900/80 border-cyan-500/30 shadow-[0_4px_24px_rgba(6,182,212,0.06)]'
                      : 'bg-neutral-900/40 hover:bg-neutral-900/70 border-white/[0.06] hover:border-white/[0.12]'
                  } ${isSelectionMode ? 'cursor-pointer select-none' : ''}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Multi-Select Checkbox Circle (Apple Style) */}
                    {isSelectionMode ? (
                      <button
                        type="button"
                        onClick={(e) => handleToggleSelect(item.id, e)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ${
                          isSelected
                            ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-400/40'
                            : 'border-2 border-neutral-600 hover:border-neutral-400 bg-neutral-900/80 text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    ) : (
                      /* Hover checkbox hint to quickly enter selection mode */
                      <button
                        type="button"
                        onClick={(e) => handleToggleSelect(item.id, e)}
                        className="w-5 h-5 rounded-full border border-neutral-700 hover:border-blue-400 hover:bg-blue-500/20 text-transparent hover:text-blue-400 items-center justify-center transition-all shrink-0 hidden group-hover:flex"
                        title="Select for bulk action"
                      >
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </button>
                    )}

                    {/* Media Thumbnail with Animated Progress Ring for ongoing tasks */}
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-800 shrink-0 border border-white/10 group-hover:border-white/20 transition-all">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className={`w-full h-full object-cover transition-opacity duration-300 ${
                            isOngoing ? 'opacity-35 scale-105' : ''
                          }`}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-500">
                          {item.type === 'video' ? (
                            <Film className="w-5 h-5" />
                          ) : (
                            <Music className="w-5 h-5" />
                          )}
                        </div>
                      )}

                      {!isOngoing && (
                        <div className="absolute bottom-1 right-1 px-1 py-0.2 bg-black/70 backdrop-blur-xs rounded text-[9px] font-mono text-white/90">
                          {item.type.toUpperCase()}
                        </div>
                      )}

                      {/* iOS 18 Frosted Glass Animated Circular Progress Ring for Background Tasks */}
                      {isOngoing && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-1">
                          <div className="relative w-10 h-10 flex items-center justify-center">
                            {/* Subtle Outer Glow Halo */}
                            <div
                              className={`absolute inset-0 rounded-full transition-all duration-500 ${
                                isPaused
                                  ? 'bg-amber-500/10'
                                  : 'bg-cyan-500/20 animate-pulse'
                              }`}
                            />

                            <svg className="w-10 h-10 -rotate-90 transform" viewBox="0 0 36 36">
                              <defs>
                                <linearGradient id={`ringGrad-${item.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#38BDF8" />
                                  <stop offset="60%" stopColor="#6366F1" />
                                  <stop offset="100%" stopColor="#A855F7" />
                                </linearGradient>
                                <linearGradient id={`ringGradPaused-${item.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#F59E0B" />
                                  <stop offset="100%" stopColor="#FBBF24" />
                                </linearGradient>
                              </defs>

                              {/* Frosted Background Ring Track */}
                              <circle
                                cx="18"
                                cy="18"
                                r="14"
                                className="text-white/10"
                                strokeWidth="3"
                                stroke="currentColor"
                                fill="none"
                              />

                              {/* Active Animated Progress Arc */}
                              <circle
                                cx="18"
                                cy="18"
                                r="14"
                                stroke={isPaused ? `url(#ringGradPaused-${item.id})` : `url(#ringGrad-${item.id})`}
                                strokeWidth="3"
                                strokeDasharray={2 * Math.PI * 14}
                                strokeDashoffset={2 * Math.PI * 14 * (1 - progressVal / 100)}
                                strokeLinecap="round"
                                fill="none"
                                className="transition-all duration-300 ease-out"
                                style={{
                                  filter: isPaused
                                    ? 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.5))'
                                    : 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.7))',
                                }}
                              />
                            </svg>

                            {/* Center Progress Percentage / Pause state */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              {isPaused ? (
                                <Pause className="w-3 h-3 text-amber-300 fill-amber-300/40" />
                              ) : (
                                <span className="text-[9px] font-mono font-bold text-white tracking-tighter">
                                  {Math.round(progressVal)}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                          {item.platform?.name || 'Media'}
                        </span>
                        <span className="text-neutral-600">·</span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {formatDate(item.timestamp)}
                        </span>
                        {isOngoing && (
                          <span
                            className={`px-2 py-0.5 text-[9px] font-semibold rounded-md border flex items-center gap-1 ${
                              isPaused
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shadow-[0_0_8px_rgba(34,211,238,0.2)]'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isPaused ? 'bg-amber-400' : 'bg-cyan-400 animate-ping'
                              }`}
                            />
                            <span>{isPaused ? 'Task Paused' : 'Background Task'}</span>
                          </span>
                        )}
                        {isOlderThan30d && (
                          <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">
                            &gt;30d old
                          </span>
                        )}
                        {isLarger && (
                          <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-rose-500/20 text-rose-300 rounded border border-rose-500/30">
                            Large
                          </span>
                        )}
                        {isSelected && (
                          <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">
                            Selected
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-semibold text-white truncate mt-0.5">
                        {item.title}
                      </h4>

                      {/* iOS-Style Subtle Transparent Status Bar for ongoing background tasks */}
                      {isOngoing && (
                        <div className="mt-1.5 mb-1 space-y-1.5 max-w-lg">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <div className="flex items-center gap-1.5 text-cyan-300 truncate mr-2">
                              <Activity className="w-3 h-3 text-cyan-400 shrink-0" />
                              <span className="font-semibold text-white/90 truncate font-sans text-[11px]">
                                {item.backgroundTaskLabel ||
                                  (isPaused
                                    ? 'Background processing paused'
                                    : 'Background stream download & muxing')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-neutral-400 shrink-0">
                              <span
                                className={`font-mono font-bold ${
                                  isPaused ? 'text-amber-300' : 'text-cyan-300'
                                }`}
                              >
                                {Math.round(progressVal)}%
                              </span>
                              <span>·</span>
                              <span className="text-neutral-300 font-mono text-[10px]">
                                {isPaused ? 'Paused' : item.speed || '24.8 MB/s'}
                              </span>
                            </div>
                          </div>

                          {/* Subtle Transparent Glass Status Bar Container */}
                          <div className="relative w-full h-2 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/[0.08] overflow-hidden p-[1px] shadow-inner">
                            <div
                              className={`h-full rounded-full transition-all duration-300 relative ${
                                isPaused
                                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                  : 'bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500 shadow-[0_0_8px_rgba(56,189,248,0.4)]'
                              }`}
                              style={{ width: `${Math.max(4, Math.min(100, progressVal))}%` }}
                            >
                              {/* Subtle translucent iOS shimmer sweep */}
                              {!isPaused && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-neutral-400 mt-1">
                        <span>{item.author}</span>
                        <span>·</span>
                        <span className="font-mono">{item.format}</span>
                        <span>·</span>
                        <span className="font-mono font-medium text-neutral-300">{item.size}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div
                    className="flex items-center gap-2 self-end sm:self-center shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isOngoing ? (
                      <div className="flex items-center gap-1.5 bg-neutral-950/60 border border-white/[0.08] rounded-xl p-1">
                        <button
                          onClick={() => handleToggleBackgroundTask(item.id)}
                          className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/[0.08] transition-colors"
                          title={isPaused ? 'Resume Background Task' : 'Pause Background Task'}
                        >
                          {isPaused ? (
                            <Play className="w-3.5 h-3.5 fill-white" />
                          ) : (
                            <Pause className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Cancel Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() =>
                            handleStartBackgroundTask(
                              item.id,
                              item.type === 'video'
                                ? 'Transcoding 4K to ProRes Audio'
                                : 'Extracting 320k Studio FLAC'
                            )
                          }
                          className="p-2 rounded-xl text-neutral-400 hover:text-cyan-300 hover:bg-cyan-500/15 transition-colors"
                          title="Run Background Transcode / Processing"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onPlayItem(item)}
                          className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-white transition-colors"
                          title="Preview Media"
                        >
                          <Play className="w-3.5 h-3.5 text-blue-400 fill-blue-400/20" />
                        </button>

                        <a
                          href={`/api/download?url=${encodeURIComponent(
                            item.downloadUrl || item.url
                          )}&title=${encodeURIComponent(item.title)}&format=${(item.format || 'mp4')
                            .toLowerCase()
                            .includes('mp3')
                            ? 'mp3'
                            : (item.format || '').toLowerCase().includes('wav')
                            ? 'wav'
                            : item.type === 'audio'
                            ? 'mp3'
                            : 'mp4'}&type=${item.type}&author=${encodeURIComponent(item.author || '')}`}
                          download={`${item.title.replace(/[/\\?%*:|"<>]/g, '_')}.${
                            item.type === 'audio' ? 'mp3' : 'mp4'
                          }`}
                          className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors border border-white/5"
                          title="Download file to computer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>

                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="p-2 rounded-xl text-neutral-500 hover:text-red-400 hover:bg-neutral-800/60 transition-colors"
                          title="Delete from Library"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 pt-2 text-xs text-neutral-400">
              <div>
                Showing {(validPage - 1) * pageSize + 1}–
                {Math.min(validPage * pageSize, filteredLibrary.length)} of {filteredLibrary.length} items
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validPage === 1}
                  className={`p-1.5 rounded-lg border border-white/5 ${
                    validPage === 1
                      ? 'text-neutral-600 bg-neutral-950/40 cursor-not-allowed'
                      : 'text-neutral-300 bg-neutral-900 hover:bg-neutral-800'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-mono text-white">
                  {validPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validPage === totalPages}
                  className={`p-1.5 rounded-lg border border-white/5 ${
                    validPage === totalPages
                      ? 'text-neutral-600 bg-neutral-950/40 cursor-not-allowed'
                      : 'text-neutral-300 bg-neutral-900 hover:bg-neutral-800'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating iOS 18 Action Bar when items are selected */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-neutral-900/90 backdrop-blur-2xl border border-white/15 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-fade-in max-w-xl w-[92vw] justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold">
              {selectedIds.size}
            </div>
            <div>
              <div className="text-xs font-bold text-white leading-tight">
                {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'} selected
              </div>
              <div className="text-[10px] text-neutral-400 font-mono">
                {selectedTotalMb > 0 ? `~${formatMb(selectedTotalMb)} total` : 'Ready to export'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkDeleteSelected}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-red-500/20 text-neutral-300 hover:text-red-400 text-xs font-medium border border-white/10 hover:border-red-500/30 transition-all flex items-center gap-1.5"
              title="Delete selected items"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>

            <button
              type="button"
              onClick={handleBulkExportZip}
              disabled={isExportingZip}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isExportingZip ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Archive className="w-3.5 h-3.5" />
              )}
              <span>Export .ZIP</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedIds(new Set());
                setIsSelectionMode(false);
              }}
              className="p-1.5 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              title="Cancel selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ZIP Archiving Progress Modal */}
      {isExportingZip && zipProgress && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-neutral-900/95 border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Archive className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Compressing Media Archive</h4>
                  <p className="text-xs text-neutral-400">Exporting selected assets as .ZIP</p>
                </div>
              </div>

              <span className="text-xs font-mono font-bold text-blue-400">
                {zipProgress.percent}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-neutral-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(5, zipProgress.percent)}%` }}
              />
            </div>

            {/* Current message */}
            <div className="text-xs text-neutral-300 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" />
              <span className="truncate">{zipProgress.message}</span>
            </div>

            {/* Archive details list */}
            <div className="p-3 bg-neutral-950/60 rounded-xl border border-white/5 space-y-1.5 text-[11px] text-neutral-400">
              <div className="flex justify-between">
                <span>Selected Items:</span>
                <span className="text-white font-medium">{selectedItems.length || filteredLibrary.length} assets</span>
              </div>
              <div className="flex justify-between">
                <span>Compression Engine:</span>
                <span className="text-white font-mono">JSZip DEFLATE (Level 6)</span>
              </div>
              <div className="flex justify-between">
                <span>Included Deliverables:</span>
                <span className="text-white">Assets, Playlist, HTML Catalog & Shortcuts</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
