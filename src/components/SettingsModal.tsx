import React, { useState, useMemo } from 'react';
import {
  X,
  Sliders,
  Check,
  ShieldCheck,
  HardDrive,
  Sparkles,
  Trash2,
  Clock,
  Database,
  Calendar,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  Info,
} from 'lucide-react';
import { DownloadTask } from '../types';
import {
  SmartCleanupConfig,
  evaluateCleanupCandidates,
  formatMb,
  parseSizeToMb,
  DEFAULT_SMART_CLEANUP_CONFIG,
} from '../utils/smartCleanup';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferredQuality: string;
  setPreferredQuality: (q: string) => void;
  preferredAudio: string;
  setPreferredAudio: (a: string) => void;
  autoTagId3: boolean;
  setAutoTagId3: (val: boolean) => void;
  accentTone: string;
  setAccentTone: (tone: string) => void;
  smartCleanupConfig: SmartCleanupConfig;
  setSmartCleanupConfig: React.Dispatch<React.SetStateAction<SmartCleanupConfig>>;
  library: DownloadTask[];
  onExecuteCleanup: (itemIdsToRemove: string[]) => { count: number; freedMb: number };
  onSeedSampleData?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  preferredQuality,
  setPreferredQuality,
  preferredAudio,
  setPreferredAudio,
  autoTagId3,
  setAutoTagId3,
  accentTone,
  setAccentTone,
  smartCleanupConfig,
  setSmartCleanupConfig,
  library,
  onExecuteCleanup,
  onSeedSampleData,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'cleanup'>('cleanup');
  const [cleanupSuccessMessage, setCleanupSuccessMessage] = useState<string | null>(null);
  const [customMbInput, setCustomMbInput] = useState<string>(
    smartCleanupConfig.largerThanMb.toString()
  );

  // Evaluate candidate items dynamically based on current rules
  const candidateResult = useMemo(() => {
    return evaluateCleanupCandidates(library, smartCleanupConfig);
  }, [library, smartCleanupConfig]);

  if (!isOpen) return null;

  // Preset day choices
  const dayPresets = [
    { days: 7, label: '7 Days' },
    { days: 14, label: '14 Days' },
    { days: 30, label: '30 Days (Default)' },
    { days: 60, label: '60 Days' },
    { days: 90, label: '90 Days' },
  ];

  // Preset size choices in MB
  const sizePresets = [
    { mb: 50, label: '50 MB' },
    { mb: 100, label: '100 MB' },
    { mb: 250, label: '250 MB' },
    { mb: 500, label: '500 MB' },
    { mb: 1024, label: '1 GB' },
  ];

  const handleRunManualCleanup = () => {
    if (candidateResult.matches.length === 0) return;
    const matchIds = candidateResult.matches.map((item) => item.id);
    const { count, freedMb } = onExecuteCleanup(matchIds);
    setCleanupSuccessMessage(`Cleaned ${count} items · Reclaimed ${formatMb(freedMb)} disk space`);
    setTimeout(() => {
      setCleanupSuccessMessage(null);
    }, 3500);
  };

  const handleResetDefaults = () => {
    setSmartCleanupConfig(DEFAULT_SMART_CLEANUP_CONFIG);
    setCustomMbInput(DEFAULT_SMART_CLEANUP_CONFIG.largerThanMb.toString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-xl bg-neutral-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 px-6 border-b border-white/[0.08] bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-blue-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Downloader Preferences</h3>
              <p className="text-[11px] text-neutral-400">Audio, video, and automated library cleanup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Apple iOS Tab Switcher */}
        <div className="px-6 pt-3 pb-1 border-b border-white/[0.06] bg-neutral-950/40">
          <div className="grid grid-cols-2 p-1 bg-neutral-900/90 rounded-2xl border border-white/[0.06]">
            <button
              onClick={() => setActiveTab('cleanup')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'cleanup'
                  ? 'bg-neutral-800 text-white shadow-sm border border-white/10'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Smart Cleanup</span>
              {candidateResult.matches.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] bg-amber-500/20 text-amber-300 font-mono rounded-full border border-amber-500/30">
                  {candidateResult.matches.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('general')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'general'
                  ? 'bg-neutral-800 text-white shadow-sm border border-white/10'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>Media & Quality</span>
            </button>
          </div>
        </div>

        {/* Settings Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {activeTab === 'cleanup' ? (
            /* Smart Cleanup Section */
            <div className="space-y-5 animate-fade-in">
              {/* Feature Introduction Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 border border-amber-500/20 flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-white tracking-wide">
                    Smart Storage Purge Policy
                  </h4>
                  <p className="text-[11px] text-neutral-300 mt-0.5 leading-relaxed">
                    Automatically delete media items from your Library that are older than 30 days
                    or exceed your specified file size threshold to prevent local storage bloat.
                  </p>
                </div>
              </div>

              {/* Master Auto-Cleanup Switch */}
              <div className="bg-neutral-950/80 rounded-2xl border border-white/[0.06] p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <span>Automatic Smart Cleanup</span>
                    <span className="text-[10px] font-medium text-emerald-400 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      Background
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    Continuously evaluate rules and auto-purge matching items on app launch & downloads
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSmartCleanupConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
                  }
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 shrink-0 ${
                    smartCleanupConfig.enabled ? 'bg-amber-500' : 'bg-neutral-800'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      smartCleanupConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Rule 1: Age Rule (Older than 30 days) */}
              <div className="space-y-2.5">
                <div className="bg-neutral-950/80 rounded-2xl border border-white/[0.06] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-white">
                          Delete items older than
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          Purge media archived more than {smartCleanupConfig.olderThanDays} days ago
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSmartCleanupConfig((prev) => ({
                          ...prev,
                          deleteOlderThan: !prev.deleteOlderThan,
                        }))
                      }
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 shrink-0 ${
                        smartCleanupConfig.deleteOlderThan ? 'bg-blue-600' : 'bg-neutral-800'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                          smartCleanupConfig.deleteOlderThan ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {smartCleanupConfig.deleteOlderThan && (
                    <div className="pt-2 border-t border-white/[0.06] space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <span>Select Age Limit:</span>
                        <span className="font-semibold text-blue-400 font-mono">
                          {smartCleanupConfig.olderThanDays} Days
                        </span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                        {dayPresets.map((preset) => {
                          const isSelected = smartCleanupConfig.olderThanDays === preset.days;
                          return (
                            <button
                              key={preset.days}
                              type="button"
                              onClick={() =>
                                setSmartCleanupConfig((prev) => ({
                                  ...prev,
                                  olderThanDays: preset.days,
                                }))
                              }
                              className={`py-1.5 px-2 rounded-xl text-center text-[11px] font-medium transition-all ${
                                isSelected
                                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                                  : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-white/[0.05]'
                              }`}
                            >
                              {preset.days}d {preset.days === 30 && '⭐'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Rule 2: File Size Rule (Larger than specified size) */}
              <div className="space-y-2.5">
                <div className="bg-neutral-950/80 rounded-2xl border border-white/[0.06] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-rose-400 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-white">
                          Delete items larger than specified size
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          Purge heavy files exceeding{' '}
                          {smartCleanupConfig.largerThanMb >= 1024
                            ? `${(smartCleanupConfig.largerThanMb / 1024).toFixed(1)} GB`
                            : `${smartCleanupConfig.largerThanMb} MB`}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSmartCleanupConfig((prev) => ({
                          ...prev,
                          deleteLargerThan: !prev.deleteLargerThan,
                        }))
                      }
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 shrink-0 ${
                        smartCleanupConfig.deleteLargerThan ? 'bg-rose-600' : 'bg-neutral-800'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                          smartCleanupConfig.deleteLargerThan ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {smartCleanupConfig.deleteLargerThan && (
                    <div className="pt-2 border-t border-white/[0.06] space-y-2.5 animate-fade-in">
                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <span>Threshold Presets:</span>
                        <span className="font-semibold text-rose-400 font-mono">
                          {formatMb(smartCleanupConfig.largerThanMb)}
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-1.5">
                        {sizePresets.map((preset) => {
                          const isSelected = smartCleanupConfig.largerThanMb === preset.mb;
                          return (
                            <button
                              key={preset.mb}
                              type="button"
                              onClick={() => {
                                setSmartCleanupConfig((prev) => ({
                                  ...prev,
                                  largerThanMb: preset.mb,
                                }));
                                setCustomMbInput(preset.mb.toString());
                              }}
                              className={`py-1.5 px-1.5 rounded-xl text-center text-[11px] font-medium transition-all ${
                                isSelected
                                  ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-400'
                                  : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-white/[0.05]'
                              }`}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom MB input */}
                      <div className="flex items-center gap-2 pt-1">
                        <label className="text-[11px] text-neutral-400 shrink-0">
                          Custom Limit:
                        </label>
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="5"
                            max="10000"
                            value={customMbInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomMbInput(val);
                              const parsed = parseFloat(val);
                              if (!isNaN(parsed) && parsed > 0) {
                                setSmartCleanupConfig((prev) => ({
                                  ...prev,
                                  largerThanMb: parsed,
                                }));
                              }
                            }}
                            className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
                            placeholder="Enter MB (e.g. 250)"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 font-mono">
                            MB
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Real-time Storage Impact & Candidate Items Preview */}
              <div className="rounded-2xl bg-neutral-950/90 border border-white/[0.08] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Current Cleanup Impact</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
                    title="Reset to 30 days & 250 MB"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Defaults</span>
                  </button>
                </div>

                {cleanupSuccessMessage && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-xs text-emerald-200 flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{cleanupSuccessMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-white/[0.05]">
                    <div className="text-[10px] text-neutral-400">Total in Library</div>
                    <div className="text-sm font-bold text-white font-mono mt-0.5">
                      {library.length} items
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-white/[0.05]">
                    <div className="text-[10px] text-neutral-400">Eligible to Clean</div>
                    <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">
                      {candidateResult.matches.length} items
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-white/[0.05]">
                    <div className="text-[10px] text-neutral-400">Reclaimable Space</div>
                    <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                      {candidateResult.formattedReclaimedSize}
                    </div>
                  </div>
                </div>

                {/* Candidate list preview */}
                {candidateResult.matches.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] text-neutral-400 font-medium">
                      Items marked for deletion ({candidateResult.matches.length}):
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {candidateResult.matches.map((item) => {
                        const ageDays = Math.round(
                          (Date.now() - item.timestamp) / (1000 * 60 * 60 * 24)
                        );
                        const isOlderMatch =
                          smartCleanupConfig.deleteOlderThan &&
                          ageDays >= smartCleanupConfig.olderThanDays;
                        const itemMb = parseSizeToMb(item.size);
                        const isSizeMatch =
                          smartCleanupConfig.deleteLargerThan &&
                          itemMb >= smartCleanupConfig.largerThanMb;

                        return (
                          <div
                            key={item.id}
                            className="p-2 rounded-xl bg-neutral-900/60 border border-white/[0.04] flex items-center justify-between text-xs gap-2"
                          >
                            <div className="min-w-0 flex-1 flex items-center gap-2">
                              {item.thumbnail ? (
                                <img
                                  src={item.thumbnail}
                                  alt=""
                                  className="w-7 h-7 rounded-lg object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-neutral-800 shrink-0 flex items-center justify-center text-[10px] text-neutral-400">
                                  {item.type[0].toUpperCase()}
                                </div>
                              )}
                              <div className="truncate">
                                <div className="text-xs text-white truncate font-medium">
                                  {item.title}
                                </div>
                                <div className="text-[10px] text-neutral-400 flex items-center gap-1.5">
                                  <span>{item.author}</span>
                                  <span>·</span>
                                  <span>{ageDays}d ago</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isOlderMatch && (
                                <span className="text-[10px] bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded-md border border-blue-500/20">
                                  &gt;30d
                                </span>
                              )}
                              {isSizeMatch && (
                                <span className="text-[10px] bg-rose-500/10 text-rose-300 px-1.5 py-0.5 rounded-md border border-rose-500/20">
                                  Large
                                </span>
                              )}
                              <span className="text-xs font-mono font-medium text-neutral-200">
                                {item.size}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-neutral-900/40 border border-white/[0.04] text-center">
                    <div className="text-xs text-neutral-400">
                      {library.length === 0
                        ? 'No items currently in Library.'
                        : 'All items in your Library are safe within current retention limits.'}
                    </div>
                    {library.length === 0 && onSeedSampleData && (
                      <button
                        type="button"
                        onClick={onSeedSampleData}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 border border-white/10 transition-colors"
                      >
                        Load Sample Library Items (for testing)
                      </button>
                    )}
                  </div>
                )}

                {/* Immediate Cleanup Trigger Button */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRunManualCleanup}
                    disabled={candidateResult.matches.length === 0}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      candidateResult.matches.length > 0
                        ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 active:scale-[0.99]'
                        : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {candidateResult.matches.length > 0
                        ? `Run Smart Cleanup Now (${candidateResult.matches.length} Items · ${candidateResult.formattedReclaimedSize})`
                        : 'No Items to Clean'}
                    </span>
                  </button>

                  {onSeedSampleData && library.length < 5 && (
                    <button
                      type="button"
                      onClick={onSeedSampleData}
                      className="px-3 py-2.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-white/5 transition-colors"
                      title="Add sample downloads to test 30-day and file size filters"
                    >
                      Sample Data
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Media & Quality Preferences Tab */
            <div className="space-y-6 animate-fade-in">
              {/* Default Video Resolution */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                  Default Video Resolution
                </label>
                <div className="bg-neutral-950/80 rounded-2xl border border-white/[0.06] overflow-hidden divide-y divide-white/[0.05]">
                  {[
                    { id: '4k', label: '4K Ultra HD (2160p)', desc: 'Highest visual fidelity' },
                    { id: '1080p', label: '1080p Full HD (60fps)', desc: 'Balanced file size & clarity' },
                    { id: '720p', label: '720p Standard HD', desc: 'Fast mobile download' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setPreferredQuality(opt.id)}
                      className="w-full p-3.5 flex items-center justify-between text-left hover:bg-neutral-800/40 transition-colors"
                    >
                      <div>
                        <div className="text-xs font-semibold text-white">{opt.label}</div>
                        <div className="text-[11px] text-neutral-500">{opt.desc}</div>
                      </div>
                      {preferredQuality === opt.id && (
                        <Check className="w-4 h-4 text-blue-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Audio Format */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                  Default Audio Format
                </label>
                <div className="bg-neutral-950/80 rounded-2xl border border-white/[0.06] overflow-hidden divide-y divide-white/[0.05]">
                  {[
                    { id: 'mp3-320', label: 'MP3 Master Studio (320 kbps)', desc: 'Universal audio player compatibility' },
                    { id: 'flac', label: 'Hi-Fi FLAC (Lossless 24-bit)', desc: 'Bit-perfect audio quality' },
                    { id: 'aac-256', label: 'Apple AAC / M4A (256 kbps)', desc: 'Optimized for Apple devices' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setPreferredAudio(opt.id)}
                      className="w-full p-3.5 flex items-center justify-between text-left hover:bg-neutral-800/40 transition-colors"
                    >
                      <div>
                        <div className="text-xs font-semibold text-white">{opt.label}</div>
                        <div className="text-[11px] text-neutral-500">{opt.desc}</div>
                      </div>
                      {preferredAudio === opt.id && (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ID3 Toggles */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                  Audio Metadata & ID3
                </label>
                <div className="bg-neutral-950/80 rounded-2xl border border-white/[0.06] p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white">Auto-Tag ID3v2 Metadata</div>
                    <div className="text-[11px] text-neutral-500">
                      Embed track title, artist, album, and cover art directly into MP3 files
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoTagId3(!autoTagId3)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 shrink-0 ${
                      autoTagId3 ? 'bg-blue-600' : 'bg-neutral-800'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                        autoTagId3 ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Accent Theme */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                  Interface Dark Accent
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'titanium', name: 'Titanium', color: 'bg-neutral-300' },
                    { id: 'charcoal', name: 'Charcoal', color: 'bg-neutral-600' },
                    { id: 'indigo', name: 'Cobalt', color: 'bg-blue-500' },
                    { id: 'emerald', name: 'Emerald', color: 'bg-emerald-500' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setAccentTone(t.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        accentTone === t.id
                          ? 'bg-neutral-800 border-white/40 ring-1 ring-white/10'
                          : 'bg-neutral-950/60 border-white/[0.05] hover:bg-neutral-800/40'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full ${t.color} mx-auto mb-1.5 shadow-sm`} />
                      <span className="text-[11px] font-medium text-neutral-300">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-white/[0.08] flex items-center justify-between bg-neutral-900/60">
          <div className="text-[11px] text-neutral-500">
            {activeTab === 'cleanup' ? (
              <span>
                Policy: &gt;{smartCleanupConfig.olderThanDays}d{' '}
                {smartCleanupConfig.deleteLargerThan
                  ? `· &gt;${formatMb(smartCleanupConfig.largerThanMb)}`
                  : ''}
              </span>
            ) : (
              <span>Settings saved locally</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
