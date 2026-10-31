import React, { useState, useMemo } from 'react';
import { VideoFormatOption, AudioFormatOption } from '../../types';
import {
  Table,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  Film,
  Music,
  FileDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
} from 'lucide-react';

interface FormatComparisonTableProps {
  videoFormats: VideoFormatOption[];
  audioFormats: AudioFormatOption[];
  selectedVideo: VideoFormatOption;
  selectedAudio: AudioFormatOption;
  optimalVideoId?: string;
  optimalAudioId?: string;
  mediaTitle?: string;
  onSelectVideo: (format: VideoFormatOption) => void;
  onSelectAudio: (format: AudioFormatOption) => void;
}

type VideoSortField = 'resolution' | 'codec' | 'bitrate' | 'fps' | 'size' | null;
type AudioSortField = 'quality' | 'codec' | 'bitrate' | 'samplerate' | 'size' | null;
type SortDirection = 'asc' | 'desc';

export const FormatComparisonTable: React.FC<FormatComparisonTableProps> = ({
  videoFormats,
  audioFormats,
  selectedVideo,
  selectedAudio,
  optimalVideoId,
  optimalAudioId,
  mediaTitle = '',
  onSelectVideo,
  onSelectAudio,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'video' | 'audio'>('video');
  const [exported, setExported] = useState(false);

  // Sorting state for video
  const [videoSortField, setVideoSortField] = useState<VideoSortField>(null);
  const [videoSortDir, setVideoSortDir] = useState<SortDirection>('desc');

  // Sorting state for audio
  const [audioSortField, setAudioSortField] = useState<AudioSortField>(null);
  const [audioSortDir, setAudioSortDir] = useState<SortDirection>('desc');

  // Value parsing helpers for precise numeric comparisons
  const parseBitrateVal = (bitrate: string = ''): number => {
    const match = bitrate.match(/([\d.]+)\s*(mbps|kbps)?/i);
    if (!match) return 0;
    const num = parseFloat(match[1]);
    const unit = (match[2] || '').toLowerCase();
    if (unit === 'mbps') return num * 1000;
    return num;
  };

  const parseSizeVal = (sizeStr: string = ''): number => {
    const match = sizeStr.match(/([\d.]+)\s*(GB|MB|KB|B)/i);
    if (!match) return 0;
    const num = parseFloat(match[1]);
    const unit = (match[2] || '').toUpperCase();
    if (unit === 'GB') return num * 1024 * 1024 * 1024;
    if (unit === 'MB') return num * 1024 * 1024;
    if (unit === 'KB') return num * 1024;
    return num;
  };

  const parseResolutionVal = (res: string = ''): number => {
    const match = res.match(/(\d{3,4})/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const parseSampleRateVal = (sr: string = ''): number => {
    const match = sr.match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const getTargetUseLabel = (resolution: string): string => {
    const res = resolution.toLowerCase();
    if (res.includes('2160') || res.includes('4k')) return 'OLED 4K TV & Master Cinema';
    if (res.includes('1440') || res.includes('2k')) return 'Desktop Monitors & Editing';
    if (res.includes('1080')) return 'Universal Standard (Laptops & TVs)';
    if (res.includes('720')) return 'Fast Streaming & Mobile Devices';
    if (res.includes('480')) return 'Data-Saver & Compact Storage';
    if (res.includes('360')) return 'Lowest Bandwidth / Voice Notes';
    return 'General Media Playback';
  };

  const getAudioTargetUse = (quality: string, container: string): string => {
    const q = quality.toLowerCase();
    if (q.includes('lossless') || container === 'FLAC') return 'Audiophile Lossless Archive';
    if (q.includes('pcm') || container === 'WAV') return 'DAW & Video Editor Master';
    if (q.includes('320')) return 'Studio Master Fidelity (AirPods & Hi-Fi)';
    if (q.includes('256')) return 'Apple Music & iOS Optimized';
    return 'Voice / Podcasts & Casual Listening';
  };

  // Video sorting handler
  const toggleVideoSort = (field: Exclude<VideoSortField, null>) => {
    if (videoSortField === field) {
      if (videoSortDir === 'desc') {
        setVideoSortDir('asc');
      } else {
        setVideoSortField(null);
        setVideoSortDir('desc');
      }
    } else {
      setVideoSortField(field);
      setVideoSortDir(field === 'codec' ? 'asc' : 'desc');
    }
  };

  // Audio sorting handler
  const toggleAudioSort = (field: Exclude<AudioSortField, null>) => {
    if (audioSortField === field) {
      if (audioSortDir === 'desc') {
        setAudioSortDir('asc');
      } else {
        setAudioSortField(null);
        setAudioSortDir('desc');
      }
    } else {
      setAudioSortField(field);
      setAudioSortDir(field === 'codec' ? 'asc' : 'desc');
    }
  };

  // Sorted Video Formats memo
  const sortedVideoFormats = useMemo(() => {
    if (!videoSortField) return videoFormats;
    return [...videoFormats].sort((a, b) => {
      let cmp = 0;
      if (videoSortField === 'bitrate') {
        cmp = parseBitrateVal(a.bitrate) - parseBitrateVal(b.bitrate);
      } else if (videoSortField === 'size') {
        cmp = parseSizeVal(a.estimatedSize) - parseSizeVal(b.estimatedSize);
      } else if (videoSortField === 'codec') {
        cmp = (a.codec || '').localeCompare(b.codec || '');
      } else if (videoSortField === 'resolution') {
        cmp = parseResolutionVal(a.resolution) - parseResolutionVal(b.resolution);
      } else if (videoSortField === 'fps') {
        cmp = (a.fps || 0) - (b.fps || 0);
      }
      return videoSortDir === 'asc' ? cmp : -cmp;
    });
  }, [videoFormats, videoSortField, videoSortDir]);

  // Sorted Audio Formats memo
  const sortedAudioFormats = useMemo(() => {
    if (!audioSortField) return audioFormats;
    return [...audioFormats].sort((a, b) => {
      let cmp = 0;
      if (audioSortField === 'bitrate' || audioSortField === 'quality') {
        cmp = parseBitrateVal(a.quality) - parseBitrateVal(b.quality);
      } else if (audioSortField === 'size') {
        cmp = parseSizeVal(a.estimatedSize) - parseSizeVal(b.estimatedSize);
      } else if (audioSortField === 'codec') {
        cmp = (a.container || '').localeCompare(b.container || '');
      } else if (audioSortField === 'samplerate') {
        cmp = parseSampleRateVal(a.sampleRate) - parseSampleRateVal(b.sampleRate);
      }
      return audioSortDir === 'asc' ? cmp : -cmp;
    });
  }, [audioFormats, audioSortField, audioSortDir]);

  // Export CSV handler
  const handleExportCSV = (e: React.MouseEvent) => {
    e.stopPropagation();

    const sanitizeCSV = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      'Category',
      'Format ID',
      'Profile / Resolution',
      'Container',
      'Codec',
      'Bitrate',
      'Framerate / Sample Rate',
      'Estimated Size',
      'Estimated Size (Bytes)',
      'Recommended Optimal',
      'Target Best Use Case',
      'Direct Stream Available',
    ];

    const rows: string[][] = [];

    // Video streams
    videoFormats.forEach((vf) => {
      rows.push([
        'Video',
        vf.id,
        vf.resolution,
        vf.container,
        vf.codec,
        vf.bitrate,
        `${vf.fps} fps`,
        vf.estimatedSize,
        String(parseSizeVal(vf.estimatedSize)),
        vf.id === optimalVideoId ? 'Yes (Optimal)' : 'No',
        getTargetUseLabel(vf.resolution),
        vf.streamUrl ? 'Yes' : 'No',
      ]);
    });

    // Audio streams
    audioFormats.forEach((af) => {
      rows.push([
        'Audio',
        af.id,
        af.label,
        af.container,
        af.container,
        af.quality,
        af.sampleRate,
        af.estimatedSize,
        String(parseSizeVal(af.estimatedSize)),
        af.id === optimalAudioId ? 'Yes (Optimal)' : 'No',
        getAudioTargetUse(af.quality, af.container),
        af.streamUrl ? 'Yes' : 'No',
      ]);
    });

    const csvContent = [
      headers.map(sanitizeCSV).join(','),
      ...rows.map((row) => row.map(sanitizeCSV).join(',')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = (mediaTitle || 'Media')
      .replace(/[/\\?%*:|"<>]/g, '_')
      .substring(0, 45);
    link.setAttribute('href', url);
    link.setAttribute('download', `${safeTitle}_format_specifications.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExported(true);
    setTimeout(() => setExported(false), 2400);
  };

  const renderSortHeader = (
    label: string,
    field: Exclude<VideoSortField, null>,
    currentField: VideoSortField,
    currentDir: SortDirection,
    onToggle: (f: Exclude<VideoSortField, null>) => void,
    hiddenClass: string = ''
  ) => {
    const isActive = currentField === field;
    return (
      <th
        onClick={() => onToggle(field)}
        className={`py-2.5 px-3 sm:px-4 cursor-pointer select-none transition-colors group ${hiddenClass} ${
          isActive ? 'text-blue-300 font-bold bg-blue-500/10' : 'text-neutral-400 hover:text-white'
        }`}
        title={`Sort by ${label} (${isActive && currentDir === 'desc' ? 'Descending' : 'Ascending'})`}
      >
        <div className="flex items-center gap-1.5">
          <span>{label}</span>
          <span className="shrink-0">
            {isActive ? (
              currentDir === 'desc' ? (
                <ArrowDown className="w-3 h-3 text-blue-400" />
              ) : (
                <ArrowUp className="w-3 h-3 text-blue-400" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
            )}
          </span>
        </div>
      </th>
    );
  };

  const renderAudioSortHeader = (
    label: string,
    field: Exclude<AudioSortField, null>,
    currentField: AudioSortField,
    currentDir: SortDirection,
    onToggle: (f: Exclude<AudioSortField, null>) => void,
    hiddenClass: string = ''
  ) => {
    const isActive = currentField === field;
    return (
      <th
        onClick={() => onToggle(field)}
        className={`py-2.5 px-3 sm:px-4 cursor-pointer select-none transition-colors group ${hiddenClass} ${
          isActive ? 'text-emerald-300 font-bold bg-emerald-500/10' : 'text-neutral-400 hover:text-white'
        }`}
        title={`Sort by ${label} (${isActive && currentDir === 'desc' ? 'Descending' : 'Ascending'})`}
      >
        <div className="flex items-center gap-1.5">
          <span>{label}</span>
          <span className="shrink-0">
            {isActive ? (
              currentDir === 'desc' ? (
                <ArrowDown className="w-3 h-3 text-emerald-400" />
              ) : (
                <ArrowUp className="w-3 h-3 text-emerald-400" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
            )}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="rounded-2xl bg-neutral-950/70 border border-white/[0.08] backdrop-blur-2xl overflow-hidden transition-all duration-300">
      {/* 1. Collapsible Drawer Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left hover:bg-neutral-900/40 transition-colors select-none group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0">
            <Table className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
                Format & Codec Comparison Table
              </span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-white/5 hidden sm:inline">
                {videoFormats.length} Video · {audioFormats.length} Audio
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 truncate">
              Compare bitrate, codec standards, and file sizes to make informed download choices
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-[11px] font-medium text-neutral-400 group-hover:text-neutral-200 hidden sm:inline">
            {isOpen ? 'Hide Matrix' : 'Compare Formats'}
          </span>
          <div className="w-6 h-6 rounded-lg bg-neutral-800/80 border border-white/10 flex items-center justify-center text-neutral-300 group-hover:text-white transition-colors">
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </div>
      </button>

      {/* 2. Expanded Comparative Table */}
      {isOpen && (
        <div className="p-4 sm:p-5 border-t border-white/[0.08] space-y-4 animate-fade-in">
          {/* Sub-tab switcher + Export CSV Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center p-1 bg-neutral-900/90 border border-white/[0.08] rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveTab('video')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'video'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Video Profiles ({videoFormats.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('audio')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'audio'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>Audio Encodings ({audioFormats.length})</span>
              </button>
            </div>

            {/* Actions: Sort Status + Export CSV */}
            <div className="flex items-center gap-2">
              {/* Reset Sort indicator button if sort is active */}
              {((activeTab === 'video' && videoSortField) ||
                (activeTab === 'audio' && audioSortField)) && (
                <button
                  onClick={() => {
                    if (activeTab === 'video') setVideoSortField(null);
                    else setAudioSortField(null);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-white/[0.06] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Reset to default stream order"
                >
                  <RotateCcw className="w-3 h-3 text-neutral-400" />
                  <span className="hidden sm:inline">Reset Sort</span>
                </button>
              )}

              {/* Export CSV Button */}
              <button
                onClick={handleExportCSV}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer ${
                  exported
                    ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                    : 'bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 hover:text-white border-white/[0.1] hover:border-white/20'
                }`}
                title="Download full CSV specifications of all available audio & video media formats"
              >
                {exported ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>CSV Exported!</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-3.5 h-3.5 text-blue-400" />
                    <span>Export CSV</span>
                  </>
                )}
              </button>

              <div className="hidden lg:flex items-center gap-1 text-[11px] text-neutral-400 font-mono ml-1">
                <Sparkles className="w-3 h-3 text-blue-400" />
                <span>Click headers to sort</span>
              </div>
            </div>
          </div>

          {/* Video Comparison Table */}
          {activeTab === 'video' && (
            <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-900/80 text-neutral-400 font-semibold border-b border-white/[0.08]">
                    {renderSortHeader(
                      'Resolution & Profile',
                      'resolution',
                      videoSortField,
                      videoSortDir,
                      toggleVideoSort
                    )}
                    {renderSortHeader(
                      'Video Codec',
                      'codec',
                      videoSortField,
                      videoSortDir,
                      toggleVideoSort
                    )}
                    {renderSortHeader(
                      'Bitrate',
                      'bitrate',
                      videoSortField,
                      videoSortDir,
                      toggleVideoSort
                    )}
                    {renderSortHeader(
                      'Framerate',
                      'fps',
                      videoSortField,
                      videoSortDir,
                      toggleVideoSort
                    )}
                    {renderSortHeader(
                      'Est. File Size',
                      'size',
                      videoSortField,
                      videoSortDir,
                      toggleVideoSort
                    )}
                    <th className="py-2.5 px-3 sm:px-4 hidden md:table-cell">Best Use Case</th>
                    <th className="py-2.5 px-3 sm:px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {sortedVideoFormats.map((item) => {
                    const isSelected = selectedVideo.id === item.id;
                    const isOptimal = optimalVideoId === item.id;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => onSelectVideo(item)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-950/30'
                            : isOptimal
                            ? 'bg-blue-900/10 hover:bg-neutral-900/60'
                            : 'hover:bg-neutral-900/40'
                        }`}
                      >
                        {/* Resolution & Label */}
                        <td className="py-3 px-3 sm:px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white tracking-tight">
                              {item.resolution}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-300 border border-white/5">
                              {item.container}
                            </span>
                            {isOptimal && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1 animate-pulse">
                                <Sparkles className="w-2.5 h-2.5 text-blue-400" />
                                <span>Optimal</span>
                              </span>
                            )}
                            {item.hdr && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-400/15 text-amber-300 border border-amber-400/25">
                                HDR 10-Bit
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Codec */}
                        <td className="py-3 px-3 sm:px-4 text-neutral-300 font-mono text-[11px]">
                          {item.codec}
                        </td>

                        {/* Bitrate */}
                        <td className="py-3 px-3 sm:px-4 text-neutral-200 font-mono font-medium">
                          {item.bitrate}
                        </td>

                        {/* Framerate */}
                        <td className="py-3 px-3 sm:px-4 text-neutral-300 font-mono">
                          {item.fps} fps
                        </td>

                        {/* Estimated Size */}
                        <td className="py-3 px-3 sm:px-4 font-mono font-semibold text-white tabular-nums">
                          {item.estimatedSize}
                        </td>

                        {/* Best Use Case */}
                        <td className="py-3 px-3 sm:px-4 text-neutral-400 text-[11px] hidden md:table-cell">
                          {getTargetUseLabel(item.resolution)}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-3 sm:px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectVideo(item);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-white/5'
                            }`}
                          >
                            {isSelected ? (
                              <span className="flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span>Select</span>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Audio Comparison Table */}
          {activeTab === 'audio' && (
            <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-900/80 text-neutral-400 font-semibold border-b border-white/[0.08]">
                    {renderAudioSortHeader(
                      'Audio Profile',
                      'quality',
                      audioSortField,
                      audioSortDir,
                      toggleAudioSort
                    )}
                    {renderAudioSortHeader(
                      'Container / Codec',
                      'codec',
                      audioSortField,
                      audioSortDir,
                      toggleAudioSort
                    )}
                    {renderAudioSortHeader(
                      'Bitrate / Quality',
                      'bitrate',
                      audioSortField,
                      audioSortDir,
                      toggleAudioSort
                    )}
                    {renderAudioSortHeader(
                      'Sample Rate',
                      'samplerate',
                      audioSortField,
                      audioSortDir,
                      toggleAudioSort
                    )}
                    {renderAudioSortHeader(
                      'Est. File Size',
                      'size',
                      audioSortField,
                      audioSortDir,
                      toggleAudioSort
                    )}
                    <th className="py-2.5 px-3 sm:px-4 hidden md:table-cell">Fidelity Profile</th>
                    <th className="py-2.5 px-3 sm:px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {sortedAudioFormats.map((item) => {
                    const isSelected = selectedAudio.id === item.id;
                    const isOptimal = optimalAudioId === item.id;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => onSelectAudio(item)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950/30'
                            : isOptimal
                            ? 'bg-emerald-900/10 hover:bg-neutral-900/60'
                            : 'hover:bg-neutral-900/40'
                        }`}
                      >
                        {/* Profile Name */}
                        <td className="py-3 px-3 sm:px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white tracking-tight">
                              {item.label}
                            </span>
                            {isOptimal && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1 animate-pulse">
                                <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                                <span>Optimal</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Container */}
                        <td className="py-3 px-3 sm:px-4 font-mono font-semibold text-neutral-300">
                          {item.container}
                        </td>

                        {/* Quality */}
                        <td className="py-3 px-3 sm:px-4 text-neutral-200 font-mono font-medium">
                          {item.quality}
                        </td>

                        {/* Sample Rate */}
                        <td className="py-3 px-3 sm:px-4 text-neutral-300 font-mono">
                          {item.sampleRate}
                        </td>

                        {/* Estimated Size */}
                        <td className="py-3 px-3 sm:px-4 font-mono font-semibold text-white tabular-nums">
                          {item.estimatedSize}
                        </td>

                        {/* Best Use Case */}
                        <td className="py-3 px-3 sm:px-4 text-neutral-400 text-[11px] hidden md:table-cell">
                          {getAudioTargetUse(item.quality, item.container)}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-3 sm:px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectAudio(item);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                              isSelected
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-white/5'
                            }`}
                          >
                            {isSelected ? (
                              <span className="flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span>Select</span>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
