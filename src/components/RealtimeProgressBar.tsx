import React from 'react';
import {
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCw,
  Play,
  FileCheck,
  Zap,
  Clock,
  HardDrive,
} from 'lucide-react';

export interface RealtimeProgressState {
  status: 'idle' | 'downloading' | 'completed' | 'error' | 'cancelled';
  progress: number; // 0 - 100
  receivedBytes: number;
  totalBytes: number;
  speed: string; // e.g. "24.5 MB/s"
  eta: string; // e.g. "00:04"
  filename: string;
  resolution: string;
  format: string;
  errorMessage?: string;
  blobUrl?: string;
}

interface RealtimeProgressBarProps {
  state: RealtimeProgressState;
  onCancel?: () => void;
  onRetry?: () => void;
  onPreview?: () => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const clampedI = Math.min(units.length - 1, Math.max(0, i));
  return `${(bytes / Math.pow(1024, clampedI)).toFixed(1)} ${units[clampedI]}`;
}

export const RealtimeProgressBar: React.FC<RealtimeProgressBarProps> = ({
  state,
  onCancel,
  onRetry,
  onPreview,
}) => {
  const {
    status,
    progress,
    receivedBytes,
    totalBytes,
    speed,
    eta,
    filename,
    resolution,
    format,
    errorMessage,
    blobUrl,
  } = state;

  if (status === 'idle') {
    return null;
  }

  // Completed State
  if (status === 'completed') {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950/80 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl animate-fade-in space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-tight">
                  Download Complete · Saved to Device
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  100%
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-mono truncate max-w-[280px] sm:max-w-[400px]">
                {filename} ({formatBytes(totalBytes || receivedBytes)})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto pt-1 sm:pt-0">
            {blobUrl && (
              <a
                href={blobUrl}
                download={filename}
                className="flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors text-center shadow-lg shadow-emerald-600/20"
              >
                Save Again
              </a>
            )}
            {onPreview && (
              <button
                onClick={onPreview}
                className="px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-xl border border-white/10 transition-colors flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </button>
            )}
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl border border-white/10 transition-colors flex items-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Re-download</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (status === 'error') {
    return (
      <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 backdrop-blur-2xl shadow-xl animate-fade-in space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-rose-200">Download Stream Interrupted</h5>
              <p className="text-[11px] text-rose-300/80 line-clamp-1">
                {errorMessage || 'Failed to retrieve media stream. Please verify network and try again.'}
              </p>
            </div>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Downloading / Active Progress Bar State
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950/85 border border-white/10 backdrop-blur-3xl shadow-2xl animate-fade-in space-y-3 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header: Title, Real-time Percentage, Cancel Button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Download className="w-4 h-4 animate-bounce" style={{ animationDuration: '1.2s' }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-tight truncate">
                Downloading {resolution || 'Media'} ({format?.toUpperCase() || 'MP4'})
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 border border-white/5">
                Streaming
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-mono truncate max-w-[220px] sm:max-w-[340px]">
              {filename}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Big High-Tech Percentage Display */}
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-white tabular-nums tracking-tight">
              {progress}
            </span>
            <span className="text-xs font-bold text-neutral-400">%</span>
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              className="p-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-white/10 transition-colors"
              title="Cancel download"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Real-time Progress Bar Track */}
      <div className="space-y-1.5">
        <div className="relative w-full h-3 rounded-full bg-neutral-900/90 border border-white/[0.08] overflow-hidden p-[1px]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-150 ease-out relative"
            style={{ width: `${Math.max(2, Math.min(100, progress))}%` }}
          >
            {/* Shimmer sweep animation */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
          </div>
        </div>

        {/* Live Telemetry Data Row */}
        <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono pt-1">
          {/* Transferred Bytes / Total Bytes */}
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <span className="tabular-nums text-neutral-300">
              {formatBytes(receivedBytes)}
            </span>
            {totalBytes > 0 && (
              <>
                <span className="text-neutral-600">/</span>
                <span className="tabular-nums text-neutral-400">
                  {formatBytes(totalBytes)}
                </span>
              </>
            )}
          </div>

          {/* Transfer Speed & ETA */}
          <div className="flex items-center gap-3">
            {speed && (
              <div className="flex items-center gap-1 text-blue-400 font-medium">
                <Zap className="w-3 h-3 text-blue-400" />
                <span className="tabular-nums">{speed}</span>
              </div>
            )}
            {eta && (
              <div className="flex items-center gap-1 text-neutral-400">
                <Clock className="w-3 h-3 text-neutral-500" />
                <span className="tabular-nums">ETA: {eta}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
