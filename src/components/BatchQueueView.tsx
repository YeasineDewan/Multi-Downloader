import React, { useState, useMemo, useEffect } from 'react';
import {
  ListPlus,
  Play,
  Pause,
  Trash2,
  Archive,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowDownToLine,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Activity,
  Gauge,
  Clock,
  HardDrive,
  TrendingUp,
  BarChart3,
  Zap,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  Check,
  RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { DownloadTask } from '../types';

interface BatchQueueViewProps {
  queue: DownloadTask[];
  onUpdateQueue: (queue: DownloadTask[]) => void;
  onStartAll: () => void;
  onClearQueue: () => void;
  onAddBulkUrls: (urls: string[]) => void;
}

interface TelemetrySample {
  time: string;
  speed: number; // in MB/s
  eta: number; // in seconds
  transferred: number; // in MB
}

// Helper to parse file size string into megabytes
const parseSizeInMB = (sizeStr?: string): number => {
  if (!sizeStr) return 45;
  const match = sizeStr.match(/([\d.]+)\s*([KkMmGgTt]?[Bb])/);
  if (!match) return 45;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit.startsWith('G')) return Math.round(val * 1024 * 10) / 10;
  if (unit.startsWith('K')) return Math.round((val / 1024) * 10) / 10;
  return Math.round(val * 10) / 10;
};

// Helper to format seconds into MM:SS or human string
const formatEtaSeconds = (seconds: number): string => {
  if (seconds <= 0) return '00:00';
  if (seconds >= 3600) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
};

export const BatchQueueView: React.FC<BatchQueueViewProps> = ({
  queue,
  onUpdateQueue,
  onStartAll,
  onClearQueue,
  onAddBulkUrls,
}) => {
  const [bulkInput, setBulkInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dashboardTab, setDashboardTab] = useState<'speed' | 'eta' | 'tasks'>('speed');
  const [statusFilter, setStatusFilter] = useState<'all' | 'idle' | 'downloading' | 'completed' | 'paused' | 'failed'>('all');
  const pageSize = 8;

  // Drag-and-drop reordering state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ id: string; position: 'above' | 'below' } | null>(null);
  const [reorderToast, setReorderToast] = useState<string | null>(null);

  // Auto-clear reorder toast
  useEffect(() => {
    if (reorderToast) {
      const timer = setTimeout(() => setReorderToast(null), 2800);
      return () => clearTimeout(timer);
    }
  }, [reorderToast]);

  // Real-time telemetry sliding history
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetrySample[]>(() => {
    return [
      { time: '10s ago', speed: 0, eta: 0, transferred: 0 },
      { time: '8s ago', speed: 0, eta: 0, transferred: 0 },
      { time: '6s ago', speed: 0, eta: 0, transferred: 0 },
      { time: '4s ago', speed: 0, eta: 0, transferred: 0 },
      { time: '2s ago', speed: 0, eta: 0, transferred: 0 },
      { time: 'Now', speed: 0, eta: 0, transferred: 0 },
    ];
  });

  const completedCount = queue.filter((t) => t.status === 'completed').length;
  const activeCount = queue.filter((t) => t.status === 'downloading').length;

  // Compute aggregate queue statistics
  const queueStats = useMemo(() => {
    let totalMB = 0;
    let transferredMB = 0;
    let parsedActiveSpeedMB = 0;

    queue.forEach((task) => {
      const taskMB = parseSizeInMB(task.size);
      totalMB += taskMB;
      transferredMB += (taskMB * (task.progress || 0)) / 100;

      if (task.status === 'downloading') {
        const speedMatch = task.speed?.match(/([\d.]+)/);
        const parsedSpeed = speedMatch ? parseFloat(speedMatch[1]) : 16.4;
        parsedActiveSpeedMB += parsedSpeed;
      }
    });

    const remainingMB = Math.max(0, totalMB - transferredMB);

    // If active downloads exist, calculate real ETA based on parsed speed
    // If not downloading but items remain, compute projected ETA assuming standard 25 MB/s connection
    const currentSpeed = activeCount > 0 ? Math.round(parsedActiveSpeedMB * 10) / 10 : 0;
    const effectiveSpeedForEta = currentSpeed > 0 ? currentSpeed : 22.5;

    const remainingEtaSec =
      remainingMB > 0 && queue.length > 0
        ? Math.round(remainingMB / effectiveSpeedForEta)
        : 0;

    const overallProgressPercent =
      totalMB > 0 ? Math.min(100, Math.round((transferredMB / totalMB) * 100)) : 0;

    return {
      totalMB: Math.round(totalMB * 10) / 10,
      transferredMB: Math.round(transferredMB * 10) / 10,
      remainingMB: Math.round(remainingMB * 10) / 10,
      currentSpeed,
      remainingEtaSec,
      overallProgressPercent,
    };
  }, [queue, activeCount]);

  // Periodic Telemetry sampler for Recharts
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetryHistory((prev) => {
        const now = new Date();
        const timeLabel = `${now.getSeconds()}s`;

        // Add slight organic fluctuation if active, otherwise decay
        let liveSpeed = queueStats.currentSpeed;
        if (activeCount > 0 && liveSpeed > 0) {
          const jitter = (Math.random() - 0.5) * 2.2;
          liveSpeed = Math.max(1, Math.round((liveSpeed + jitter) * 10) / 10);
        }

        const newPoint: TelemetrySample = {
          time: timeLabel,
          speed: liveSpeed,
          eta: queueStats.remainingEtaSec,
          transferred: queueStats.transferredMB,
        };

        const updated = [...prev.slice(1), newPoint];
        return updated;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [queueStats.currentSpeed, queueStats.remainingEtaSec, queueStats.transferredMB, activeCount]);

  // Data breakdown per individual queued task for Recharts bar chart
  const taskChartData = useMemo(() => {
    return queue.slice(0, 8).map((task, idx) => {
      const taskMB = parseSizeInMB(task.size);
      const remainingMB = Math.round(taskMB * (1 - task.progress / 100) * 10) / 10;
      const speedNum = queueStats.currentSpeed > 0 ? queueStats.currentSpeed / Math.max(1, activeCount) : 18;
      const taskEta = task.status === 'completed' ? 0 : Math.round(remainingMB / speedNum);

      return {
        name: task.title.length > 14 ? task.title.slice(0, 14) + '...' : task.title,
        progress: task.progress,
        remainingMB,
        taskEta,
        status: task.status,
      };
    });
  }, [queue, queueStats.currentSpeed, activeCount]);

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const urls = bulkInput
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (urls.length > 0) {
      setIsAdding(true);
      onAddBulkUrls(urls);
      setBulkInput('');
      setIsAdding(false);
    }
  };

  const handleToggleTaskStatus = (id: string) => {
    onUpdateQueue(
      queue.map((task) => {
        if (task.id === id) {
          if (task.status === 'failed') {
            return { ...task, status: 'downloading', progress: 15, speed: '21.4 MB/s' };
          }
          const nextStatus = task.status === 'downloading' ? 'paused' : 'downloading';
          return {
            ...task,
            status: nextStatus,
            speed: nextStatus === 'downloading' ? (task.speed || '24.2 MB/s') : '',
          };
        }
        return task;
      })
    );
  };

  const handleDeleteTask = (id: string) => {
    onUpdateQueue(queue.filter((t) => t.id !== id));
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!draggedTaskId || draggedTaskId === targetTaskId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const position: 'above' | 'below' = offsetY < rect.height / 2 ? 'above' : 'below';

    if (!dragOverTarget || dragOverTarget.id !== targetTaskId || dragOverTarget.position !== position) {
      setDragOverTarget({ id: targetTaskId, position });
    }
  };

  const handleDragLeave = (e: React.DragEvent, targetTaskId: string) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      if (dragOverTarget?.id === targetTaskId) {
        setDragOverTarget(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetTaskId) {
      setDraggedTaskId(null);
      setDragOverTarget(null);
      return;
    }

    const fromIndex = queue.findIndex((t) => t.id === draggedTaskId);
    const toIndex = queue.findIndex((t) => t.id === targetTaskId);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedTaskId(null);
      setDragOverTarget(null);
      return;
    }

    const nextQueue = [...queue];
    const [movedTask] = nextQueue.splice(fromIndex, 1);

    let insertIndex = nextQueue.findIndex((t) => t.id === targetTaskId);
    if (dragOverTarget?.position === 'below') {
      insertIndex += 1;
    }

    nextQueue.splice(insertIndex, 0, movedTask);
    onUpdateQueue(nextQueue);

    const newPriority = insertIndex + 1;
    setReorderToast(
      newPriority === 1
        ? `⚡ Prioritized to #1: "${movedTask.title}"`
        : `Reordered "${movedTask.title}" to position #${newPriority}`
    );

    setDraggedTaskId(null);
    setDragOverTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverTarget(null);
  };

  // Keyboard / Click Priority Controls
  const handleMoveUp = (taskId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const index = queue.findIndex((t) => t.id === taskId);
    if (index <= 0) return;

    const nextQueue = [...queue];
    const [item] = nextQueue.splice(index, 1);
    nextQueue.splice(index - 1, 0, item);
    onUpdateQueue(nextQueue);

    const newPriority = index;
    setReorderToast(
      newPriority === 1
        ? `⚡ Prioritized to #1: "${item.title}"`
        : `Moved up to #${newPriority}: "${item.title}"`
    );
  };

  const handleMoveDown = (taskId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const index = queue.findIndex((t) => t.id === taskId);
    if (index === -1 || index >= queue.length - 1) return;

    const nextQueue = [...queue];
    const [item] = nextQueue.splice(index, 1);
    nextQueue.splice(index + 1, 0, item);
    onUpdateQueue(nextQueue);

    setReorderToast(`Moved down to #${index + 2}: "${item.title}"`);
  };

  const handleMoveToTop = (taskId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const index = queue.findIndex((t) => t.id === taskId);
    if (index <= 0) return;

    const nextQueue = [...queue];
    const [item] = nextQueue.splice(index, 1);
    nextQueue.unshift(item);
    onUpdateQueue(nextQueue);

    setReorderToast(`⚡ Prioritized to #1 (Next in Queue): "${item.title}"`);
  };

  // Sample tasks seeder for immediate testing of queue reordering & visual status states
  const handleSeedSampleQueue = () => {
    const samples: DownloadTask[] = [
      {
        id: `sample-q-1-${Date.now()}`,
        url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'Neon Odyssey - 4K Cinematic Documentary',
        author: 'CyberVisuals Studio',
        thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
        platform: { id: 'youtube', name: 'YouTube', color: '#EF4444', icon: 'youtube' },
        type: 'video',
        format: 'MP4 2160p (4K UHD 60fps)',
        resolution: '3840x2160',
        size: '840.5 MB',
        progress: 68,
        status: 'downloading',
        speed: '24.8 MB/s',
        timestamp: Date.now(),
      },
      {
        id: `sample-q-2-${Date.now()}`,
        url: 'https://spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
        title: 'Midnight Resonance (Lossless Master FLAC)',
        author: 'Aura Soundscapes',
        thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
        platform: { id: 'spotify', name: 'Spotify', color: '#10B981', icon: 'music' },
        type: 'audio',
        format: 'FLAC 24-bit Lossless Studio',
        resolution: '96kHz/24-bit',
        size: '42.8 MB',
        progress: 100,
        status: 'completed',
        speed: 'Done',
        timestamp: Date.now() - 1000,
      },
      {
        id: `sample-q-3-${Date.now()}`,
        url: 'https://vimeo.com/76979871',
        title: 'Highlands Aerial 8K Drone Footage',
        author: 'Nordic Horizon Films',
        thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
        platform: { id: 'vimeo', name: 'Vimeo', color: '#0EA5E9', icon: 'film' },
        type: 'video',
        format: 'MP4 1440p QHD',
        resolution: '2560x1440',
        size: '1.2 GB',
        progress: 0,
        status: 'idle',
        speed: '',
        timestamp: Date.now() - 2000,
      },
      {
        id: `sample-q-4-${Date.now()}`,
        url: 'https://soundcloud.com/electronic-dreams/lofi-sunset',
        title: 'Warm Echoes & Vinyl Sessions (320 kbps)',
        author: 'Lofi Pulse Collective',
        thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
        platform: { id: 'soundcloud', name: 'SoundCloud', color: '#F97316', icon: 'music' },
        type: 'audio',
        format: 'MP3 320 kbps Studio',
        resolution: '320 kbps',
        size: '14.2 MB',
        progress: 28,
        status: 'failed',
        speed: 'Connection dropped',
        timestamp: Date.now() - 3000,
      },
    ];
    onUpdateQueue(samples);
  };

  const handleDownloadAllZip = async () => {
    if (queue.length === 0 || isZipping) return;
    setIsZipping(true);
    try {
      const res = await fetch('/api/batch-download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleName: `Downloader_Batch_${Date.now()}`,
          items: queue.map((q) => ({
            title: q.title,
            format: q.format,
            url: q.url,
          })),
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Downloader_Batch_Archive.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('ZIP generation error:', err);
    } finally {
      setIsZipping(false);
    }
  };

  const statusCounts = useMemo(() => {
    const counts = { all: queue.length, idle: 0, downloading: 0, completed: 0, paused: 0, failed: 0 };
    queue.forEach((t) => {
      if ((counts as any)[t.status] !== undefined) {
        (counts as any)[t.status] += 1;
      }
    });
    return counts;
  }, [queue]);

  const filteredQueue = useMemo(() => {
    if (statusFilter === 'all') return queue;
    return queue.filter((t) => t.status === statusFilter);
  }, [queue, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredQueue.length / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedQueue = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return filteredQueue.slice(start, start + pageSize);
  }, [filteredQueue, validPage, pageSize]);

  // Helper function to render prominent visual status badges with scan-friendly icons
  const renderTaskStatusBadge = (status: DownloadTask['status'], speed?: string) => {
    switch (status) {
      case 'downloading':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30 shadow-[0_0_8px_rgba(59,130,246,0.2)] animate-pulse">
            <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
            <span>Downloading</span>
            {speed && speed !== 'Done' && (
              <span className="font-mono text-blue-200 hidden xs:inline">· {speed}</span>
            )}
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Completed</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.2)]">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Failed</span>
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Pause className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Paused</span>
          </span>
        );
      case 'idle':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-neutral-800/80 text-neutral-300 border border-white/10">
            <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span>Waiting in Queue</span>
          </span>
        );
    }
  };

  // Helper function to render thumbnail icon overlay
  const renderThumbnailStatusIcon = (status: DownloadTask['status']) => {
    switch (status) {
      case 'downloading':
        return (
          <div className="p-1 rounded-md bg-blue-950/90 border border-blue-400/40 text-blue-400 shadow-md">
            <Loader2 className="w-3 h-3 animate-spin" />
          </div>
        );
      case 'completed':
        return (
          <div className="p-1 rounded-md bg-emerald-950/90 border border-emerald-400/40 text-emerald-400 shadow-md">
            <CheckCircle2 className="w-3 h-3" />
          </div>
        );
      case 'failed':
        return (
          <div className="p-1 rounded-md bg-rose-950/90 border border-rose-400/40 text-rose-400 shadow-md">
            <AlertCircle className="w-3 h-3" />
          </div>
        );
      case 'paused':
        return (
          <div className="p-1 rounded-md bg-amber-950/90 border border-amber-400/40 text-amber-400 shadow-md">
            <Pause className="w-3 h-3" />
          </div>
        );
      case 'idle':
      default:
        return (
          <div className="p-1 rounded-md bg-black/80 border border-white/10 text-neutral-400 shadow-md">
            <Clock className="w-3 h-3" />
          </div>
        );
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Banner / Actions Card */}
      <div className="rounded-3xl bg-neutral-900/60 border border-white/[0.08] p-6 backdrop-blur-2xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              <span>Batch Download Queue</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Paste multi-link lists from YouTube, Spotify, TikTok, or web galleries to download simultaneously.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onStartAll}
              disabled={queue.length === 0}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                queue.length === 0
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  : 'bg-white text-black hover:bg-neutral-200 shadow-md'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Start All</span>
            </button>

            <button
              onClick={handleDownloadAllZip}
              disabled={queue.length === 0 || isZipping}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/10 ${
                queue.length === 0 || isZipping
                  ? 'bg-neutral-800/40 text-neutral-600 cursor-not-allowed'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-white'
              }`}
            >
              {isZipping ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Archive className="w-3.5 h-3.5" />
              )}
              <span>Export as ZIP</span>
            </button>

            {queue.length > 0 && (
              <button
                onClick={onClearQueue}
                className="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-xl transition-colors"
                title="Clear all tasks"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUMMARY STATUS DASHBOARD WITH RECHARTS TELEMETRY VISUALIZATION */}
        {/* ========================================================================= */}
        <div className="pt-2 border-t border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                Live Transfer Telemetry & Status Dashboard
              </span>
            </div>

            {/* Visualizer Mode Tabs */}
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-neutral-950/80 border border-white/5 text-[11px]">
              <button
                onClick={() => setDashboardTab('speed')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  dashboardTab === 'speed'
                    ? 'bg-neutral-800 text-cyan-300 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Gauge className="w-3 h-3" />
                <span>Speed ({queueStats.currentSpeed} MB/s)</span>
              </button>

              <button
                onClick={() => setDashboardTab('eta')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  dashboardTab === 'eta'
                    ? 'bg-neutral-800 text-purple-300 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>ETA ({formatEtaSeconds(queueStats.remainingEtaSec)})</span>
              </button>

              {queue.length > 0 && (
                <button
                  onClick={() => setDashboardTab('tasks')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                    dashboardTab === 'tasks'
                      ? 'bg-neutral-800 text-emerald-300 shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-3 h-3" />
                  <span>Tasks</span>
                </button>
              )}
            </div>
          </div>

          {/* 4 Core iOS Telemetry Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            {/* Speed Card */}
            <div className="p-3.5 bg-neutral-950/70 rounded-2xl border border-white/[0.06] relative overflow-hidden">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-[11px] font-medium flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  Transfer Speed
                </span>
                {activeCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                )}
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-extrabold text-white font-mono tracking-tight">
                  {queueStats.currentSpeed > 0 ? queueStats.currentSpeed : '0.0'}
                </span>
                <span className="text-[10px] text-cyan-400 font-mono font-medium">MB/s</span>
              </div>
              <div className="text-[10px] text-neutral-400 font-mono mt-1 flex items-center justify-between">
                <span>{activeCount} stream{activeCount === 1 ? '' : 's'} active</span>
                <span>Peak ~32 MB/s</span>
              </div>
            </div>

            {/* Estimated Time Remaining (ETA) Card */}
            <div className="p-3.5 bg-neutral-950/70 rounded-2xl border border-white/[0.06] relative overflow-hidden">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-[11px] font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  Estimated Time (ETA)
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-extrabold text-white font-mono tracking-tight">
                  {queue.length === 0
                    ? '--:--'
                    : queueStats.remainingMB === 0
                    ? 'Done'
                    : formatEtaSeconds(queueStats.remainingEtaSec)}
                </span>
              </div>
              <div className="text-[10px] text-neutral-400 font-mono mt-1 flex items-center justify-between">
                <span>{queueStats.remainingMB === 0 ? 'Queue finished' : 'Remaining queue'}</span>
                <span>{queueStats.remainingMB} MB left</span>
              </div>
            </div>

            {/* Total Data Remaining Card */}
            <div className="p-3.5 bg-neutral-950/70 rounded-2xl border border-white/[0.06] relative overflow-hidden">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-[11px] font-medium flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                  Transferred / Total
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-extrabold text-white font-mono tracking-tight">
                  {queueStats.transferredMB}
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  / {queueStats.totalMB} MB
                </span>
              </div>
              <div className="text-[10px] text-neutral-400 font-mono mt-1 flex items-center justify-between">
                <span>{queueStats.overallProgressPercent}% complete</span>
                <span className="text-blue-400">{completedCount}/{queue.length} done</span>
              </div>
            </div>

            {/* Queue State Card */}
            <div className="p-3.5 bg-neutral-950/70 rounded-2xl border border-white/[0.06] relative overflow-hidden">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-[11px] font-medium flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Queue Status
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-extrabold text-white font-mono tracking-tight capitalize">
                  {activeCount > 0 ? 'Downloading' : queue.length > 0 && completedCount === queue.length ? 'Completed' : 'Idle'}
                </span>
              </div>
              <div className="text-[10px] text-neutral-400 font-mono mt-1 flex items-center justify-between">
                <span>{queue.length - completedCount - activeCount} pending</span>
                <span className="text-emerald-400">{completedCount} saved</span>
              </div>
            </div>
          </div>

          {/* Recharts Graphical Telemetry Viewport */}
          <div className="rounded-2xl bg-neutral-950/80 border border-white/[0.06] p-4 relative">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  {dashboardTab === 'speed'
                    ? 'Transfer Speed Trend Line (MB/s)'
                    : dashboardTab === 'eta'
                    ? 'Estimated Remaining Time Curve (Seconds)'
                    : 'Active Task Progress & Remaining Size'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">
                {activeCount > 0 ? '● Real-time Polling 1.5s' : '○ Standby'}
              </span>
            </div>

            {/* Graph Renderer */}
            <div className="w-full h-[155px]">
              {dashboardTab === 'speed' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={telemetryHistory} margin={{ top: 8, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#ffffff0a" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="time"
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: '#ffffff10' }}
                    />
                    <YAxis
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      unit="MB/s"
                      domain={[0, 'auto']}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as TelemetrySample;
                          return (
                            <div className="rounded-xl bg-[#14151B] border border-white/15 p-2.5 shadow-2xl backdrop-blur-xl text-xs space-y-1">
                              <p className="font-mono text-[10px] text-neutral-400">Timeline: {data.time}</p>
                              <p className="font-semibold text-cyan-300 font-mono">
                                Speed: {data.speed} MB/s
                              </p>
                              <p className="font-mono text-purple-300 text-[11px]">
                                ETA: {formatEtaSeconds(data.eta)}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="speed"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      fill="url(#speedGradient)"
                      isAnimationActive={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : dashboardTab === 'eta' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={telemetryHistory} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="etaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c084fc" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#c084fc" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#ffffff0a" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="time"
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: '#ffffff10' }}
                    />
                    <YAxis
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      unit="s"
                      domain={[0, 'auto']}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as TelemetrySample;
                          return (
                            <div className="rounded-xl bg-[#14151B] border border-white/15 p-2.5 shadow-2xl backdrop-blur-xl text-xs space-y-1">
                              <p className="font-mono text-[10px] text-neutral-400">Timeline: {data.time}</p>
                              <p className="font-semibold text-purple-300 font-mono">
                                Remaining ETA: {formatEtaSeconds(data.eta)}
                              </p>
                              <p className="font-mono text-cyan-300 text-[11px]">
                                Speed: {data.speed} MB/s
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="eta"
                      stroke="#c084fc"
                      strokeWidth={2.5}
                      fill="url(#etaGradient)"
                      isAnimationActive={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taskChartData} margin={{ top: 8, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid stroke="#ffffff0a" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#71717a"
                      fontSize={9}
                      tickLine={false}
                      axisLine={{ stroke: '#ffffff10' }}
                    />
                    <YAxis
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      unit="%"
                      domain={[0, 100]}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="rounded-xl bg-[#14151B] border border-white/15 p-2.5 shadow-2xl backdrop-blur-xl text-xs space-y-1">
                              <p className="font-semibold text-white">{d.name}</p>
                              <p className="font-mono text-emerald-400 text-[11px]">
                                Progress: {d.progress}%
                              </p>
                              <p className="font-mono text-neutral-400 text-[10px]">
                                Remaining: {d.remainingMB} MB · ETA: {formatEtaSeconds(d.taskEta)}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="progress" radius={[4, 4, 0, 0]}>
                      {taskChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.status === 'completed'
                              ? '#10b981'
                              : entry.status === 'downloading'
                              ? '#38bdf8'
                              : '#6b7280'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Multi-URL Paste Sub-Form */}
      <div className="rounded-3xl bg-neutral-900/40 border border-white/[0.06] p-5 backdrop-blur-xl space-y-3">
        <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
          <ListPlus className="w-4 h-4 text-blue-400" />
          <span>Quick Multi-Link Paste (One URL Per Line)</span>
        </label>
        <form onSubmit={handleBulkSubmit} className="space-y-3">
          <textarea
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=...&#10;https://open.spotify.com/track/...&#10;https://www.tiktok.com/@...&#10;https://en.wikipedia.org/wiki/..."
            rows={3}
            className="w-full bg-neutral-950/80 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-white/25 resize-none transition-colors"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!bulkInput.trim() || isAdding}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                !bulkInput.trim() || isAdding
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              <ListPlus className="w-3.5 h-3.5" />
              <span>Queue Links</span>
            </button>
          </div>
        </form>
      </div>

      {/* Reorder Notification Toast */}
      {reorderToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-neutral-900/95 border border-cyan-500/40 text-white shadow-2xl backdrop-blur-2xl animate-fade-in text-xs font-medium">
          <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <Zap className="w-3 h-3 fill-cyan-400 text-cyan-400" />
          </div>
          <span>{reorderToast}</span>
        </div>
      )}

      {/* Tasks List with Drag and Drop Reordering */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-400 px-1 font-mono">
          <div className="flex items-center gap-2">
            <span>Tasks ({filteredQueue.length}{statusFilter !== 'all' ? ` of ${queue.length}` : ''})</span>
            {queue.length > 1 && (
              <span className="text-[11px] text-cyan-400/90 font-sans hidden sm:inline flex items-center gap-1">
                · Drag items or use <span className="font-mono text-cyan-300">⚡ / ↑ / ↓</span> to prioritize download order
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {queue.length === 0 && (
              <button
                type="button"
                onClick={handleSeedSampleQueue}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 font-sans transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load Sample Queue</span>
              </button>
            )}
            {totalPages > 1 && <span>Page {validPage} of {totalPages}</span>}
          </div>
        </div>

        {/* Visual Status Filter Chips */}
        {queue.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-neutral-950/70 rounded-2xl border border-white/[0.06] text-xs">
            <button
              onClick={() => {
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-neutral-400" />
              <span>All ({queue.length})</span>
            </button>

            <button
              onClick={() => {
                setStatusFilter('downloading');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'downloading'
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm'
                  : 'text-neutral-400 hover:text-blue-300'
              }`}
            >
              <Loader2
                className={`w-3.5 h-3.5 text-blue-400 ${
                  statusCounts.downloading > 0 ? 'animate-spin' : ''
                }`}
              />
              <span>Downloading ({statusCounts.downloading})</span>
            </button>

            <button
              onClick={() => {
                setStatusFilter('idle');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'idle'
                  ? 'bg-neutral-800 text-neutral-200 border border-white/10 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-neutral-400" />
              <span>Waiting ({statusCounts.idle})</span>
            </button>

            <button
              onClick={() => {
                setStatusFilter('completed');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-neutral-400 hover:text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Completed ({statusCounts.completed})</span>
            </button>

            {statusCounts.failed > 0 && (
              <button
                onClick={() => {
                  setStatusFilter('failed');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'failed'
                    ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'text-neutral-400 hover:text-rose-300'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Failed ({statusCounts.failed})</span>
              </button>
            )}

            {statusCounts.paused > 0 && (
              <button
                onClick={() => {
                  setStatusFilter('paused');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'paused'
                    ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-neutral-400 hover:text-amber-300'
                }`}
              >
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span>Paused ({statusCounts.paused})</span>
              </button>
            )}
          </div>
        )}

        {queue.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-500 bg-neutral-950/40 rounded-2xl border border-white/[0.05] space-y-3">
            <Layers className="w-8 h-8 mx-auto text-neutral-600 mb-1" />
            <p className="font-semibold text-neutral-300 text-sm">Queue is currently empty</p>
            <p className="text-[11px] text-neutral-500 max-w-md mx-auto">
              Paste multiple links above or populate sample queue items to test drag-and-drop prioritization.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSeedSampleQueue}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors border border-white/10"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Populate Sample Queue (4 Items)</span>
              </button>
            </div>
          </div>
        ) : (
          paginatedQueue.map((task) => {
            const overallIndex = queue.findIndex((t) => t.id === task.id);
            const priorityRank = overallIndex + 1;
            const isPriorityOne = overallIndex === 0;
            const isDraggingThis = draggedTaskId === task.id;
            const isDropTargetAbove = dragOverTarget?.id === task.id && dragOverTarget.position === 'above';
            const isDropTargetBelow = dragOverTarget?.id === task.id && dragOverTarget.position === 'below';

            return (
              <div
                key={task.id}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragOver={(e) => handleDragOver(e, task.id)}
                onDragLeave={(e) => handleDragLeave(e, task.id)}
                onDrop={(e) => handleDrop(e, task.id)}
                onDragEnd={handleDragEnd}
                className={`relative p-4 rounded-2xl bg-neutral-900/70 border backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-150 select-none ${
                  isDraggingThis
                    ? 'opacity-35 scale-[0.98] border-dashed border-cyan-400/60 bg-cyan-950/20 shadow-none'
                    : isDropTargetAbove
                    ? 'border-t-2 border-t-cyan-400 border-white/[0.07] shadow-[0_-4px_16px_rgba(34,211,238,0.5)]'
                    : isDropTargetBelow
                    ? 'border-b-2 border-b-cyan-400 border-white/[0.07] shadow-[0_4px_16px_rgba(34,211,238,0.5)]'
                    : 'border-white/[0.07] hover:border-white/[0.15] hover:bg-neutral-900/90'
                }`}
              >
                {/* Drag Handle & Priority Badge */}
                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className="p-1 text-neutral-500 hover:text-white cursor-grab active:cursor-grabbing rounded-lg hover:bg-white/[0.06] transition-colors"
                    title="Drag to reorder priority in queue"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>

                  <div
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 shrink-0 ${
                      isPriorityOne
                        ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                        : 'bg-neutral-800/80 border border-white/10 text-neutral-300'
                    }`}
                  >
                    {isPriorityOne ? <Zap className="w-3 h-3 text-amber-400 fill-amber-400" /> : null}
                    <span>#{priorityRank}</span>
                    <span className="hidden md:inline text-[9px] font-normal text-neutral-400 ml-0.5">
                      {isPriorityOne ? 'Next' : 'Queue'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-950 border border-white/10 shrink-0 relative">
                    <img
                      src={task.thumbnail}
                      alt={task.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    {/* Visual status icon on top-left of thumbnail */}
                    <div className="absolute top-1 left-1">
                      {renderThumbnailStatusIcon(task.status)}
                    </div>
                    <div className="absolute bottom-1 right-1 px-1 rounded bg-black/80 text-[8px] font-mono text-white">
                      {task.format.toUpperCase()}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-white truncate mr-2" title={task.title}>
                        {task.title}
                      </h4>
                      <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                        {task.resolution || task.format} · {task.size}
                      </span>
                    </div>

                    {/* Progress bar with status-specific tint */}
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          task.status === 'completed'
                            ? 'bg-emerald-500'
                            : task.status === 'downloading'
                            ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 shadow-[0_0_8px_rgba(59,130,246,0.4)]'
                            : task.status === 'failed'
                            ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                            : task.status === 'paused'
                            ? 'bg-amber-500'
                            : 'bg-neutral-600'
                        }`}
                        style={{ width: `${task.status === 'idle' ? 0 : task.progress}%` }}
                      />
                    </div>

                    {/* Status Badge with Visual Icon and Action */}
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center gap-2">
                        {renderTaskStatusBadge(task.status, task.speed)}
                        {task.status === 'failed' && (
                          <button
                            type="button"
                            onClick={() => handleToggleTaskStatus(task.id)}
                            className="text-[10px] text-rose-300 hover:text-white underline font-sans flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Retry</span>
                          </button>
                        )}
                      </div>
                      <span className="text-neutral-400 tabular-nums text-[10px]">
                        {task.status === 'completed'
                          ? '100% Downloaded'
                          : task.status === 'downloading'
                          ? `${task.progress}%`
                          : task.status === 'paused'
                          ? `Paused at ${task.progress}%`
                          : task.status === 'failed'
                          ? 'Interrupted'
                          : 'Ready in queue'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reordering and Task Action Controls */}
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-white/[0.05]">
                  {/* Quick Priority Up/Down/Top Controls */}
                  <div className="flex items-center gap-0.5 bg-neutral-950/60 border border-white/[0.08] rounded-xl p-0.5">
                    <button
                      type="button"
                      onClick={(e) => handleMoveToTop(task.id, e)}
                      disabled={isPriorityOne}
                      title="Prioritize: Move to Top of Queue"
                      className={`p-1.5 rounded-lg transition-colors ${
                        isPriorityOne
                          ? 'text-neutral-600 cursor-not-allowed'
                          : 'text-neutral-400 hover:text-amber-300 hover:bg-amber-500/20'
                      }`}
                    >
                      <ArrowUpToLine className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleMoveUp(task.id, e)}
                      disabled={overallIndex === 0}
                      title="Move Up in Queue"
                      className={`p-1.5 rounded-lg transition-colors ${
                        overallIndex === 0
                          ? 'text-neutral-600 cursor-not-allowed'
                          : 'text-neutral-400 hover:text-white hover:bg-white/[0.08]'
                      }`}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleMoveDown(task.id, e)}
                      disabled={overallIndex === queue.length - 1}
                      title="Move Down in Queue"
                      className={`p-1.5 rounded-lg transition-colors ${
                        overallIndex === queue.length - 1
                          ? 'text-neutral-600 cursor-not-allowed'
                          : 'text-neutral-400 hover:text-white hover:bg-white/[0.08]'
                      }`}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Task Actions */}
                  <div className="flex items-center gap-1.5">
                    {task.status === 'completed' ? (
                      <a
                        href={`/api/download?url=${encodeURIComponent(task.url)}&title=${encodeURIComponent(
                          task.title
                        )}&format=${task.format?.toLowerCase().includes('mp3') ? 'mp3' : task.format?.toLowerCase().includes('wav') ? 'wav' : task.type === 'audio' ? 'mp3' : 'mp4'}&type=${task.type}`}
                        download={`${task.title.replace(/[/\\?%*:|"<>]/g, '_')}.${task.type === 'audio' ? 'mp3' : 'mp4'}`}
                        className="p-2 text-emerald-400 hover:text-white bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl transition-colors shadow-sm"
                        title="Download to computer"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <button
                        onClick={() => handleToggleTaskStatus(task.id)}
                        className="p-2 text-neutral-300 hover:text-white bg-neutral-800 rounded-xl transition-colors"
                        title={task.status === 'downloading' ? 'Pause' : 'Start'}
                      >
                        {task.status === 'downloading' ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-white" />
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-xl transition-colors"
                      title="Remove from Queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-xs">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={validPage === 1}
            className={`px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-1 transition-colors ${
              validPage === 1
                ? 'text-neutral-600 bg-neutral-950/40 cursor-not-allowed'
                : 'text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <span className="font-mono text-neutral-400 text-[11px]">
            Page {validPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={validPage === totalPages}
            className={`px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-1 transition-colors ${
              validPage === totalPages
                ? 'text-neutral-600 bg-neutral-950/40 cursor-not-allowed'
                : 'text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800'
            }`}
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
