import React from 'react';
import { VideoFormatOption, SubtitleOption } from '../../types';
import { Film, Check, Download, FileText, Sparkles } from 'lucide-react';

interface VideoSubViewProps {
  formats: VideoFormatOption[];
  selectedFormat: VideoFormatOption;
  onSelectFormat: (format: VideoFormatOption) => void;
  subtitles: SubtitleOption[];
  mediaTitle: string;
}

export const VideoSubView: React.FC<VideoSubViewProps> = ({
  formats,
  selectedFormat,
  onSelectFormat,
  subtitles,
  mediaTitle,
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Resolution & Quality Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-semibold text-white">Select Video Resolution</span>
          <span>{formats.length} Quality Profiles Available</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {formats.map((item) => {
            const isSelected = selectedFormat.id === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectFormat(item)}
                className={`p-4 rounded-2xl text-left border transition-all duration-200 flex flex-col justify-between relative group ${
                  isSelected
                    ? 'bg-neutral-800/90 border-blue-500/50 shadow-lg ring-1 ring-blue-500/30'
                    : 'bg-neutral-950/50 border-white/[0.06] hover:bg-neutral-900/60 hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white tracking-tight">
                      {item.resolution}
                    </span>
                    {item.hdr && (
                      <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                        HDR 10-Bit
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono font-medium text-neutral-300 tabular-nums">
                    {item.estimatedSize}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-400 w-full mt-1 font-mono">
                  <span>
                    {item.container} · {item.fps}fps · {item.bitrate}
                  </span>
                  {item.recommended && (
                    <span className="text-[11px] text-blue-400 font-sans font-semibold">
                      Recommended
                    </span>
                  )}
                </div>

                {isSelected && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Subtitle Tracks Selector */}
      {subtitles && subtitles.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Closed Captions & Subtitles</span>
            </span>
            <span>{subtitles.length} languages</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {subtitles.map((sub) => (
              <div
                key={sub.code}
                className="p-3 rounded-xl bg-neutral-950/60 border border-white/[0.05] flex flex-col justify-between"
              >
                <span className="text-xs font-medium text-white truncate mb-2">
                  {sub.label}
                </span>
                <div className="flex items-center gap-1.5">
                  <a
                    href={`/api/download?title=${encodeURIComponent(
                      `${mediaTitle}_${sub.code}`
                    )}&format=srt`}
                    download={`${mediaTitle}_${sub.code}.srt`}
                    className="flex-1 py-1 text-[11px] font-mono text-center bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors border border-white/5"
                  >
                    .SRT
                  </a>
                  <a
                    href={`/api/download?title=${encodeURIComponent(
                      `${mediaTitle}_${sub.code}`
                    )}&format=vtt`}
                    download={`${mediaTitle}_${sub.code}.vtt`}
                    className="flex-1 py-1 text-[11px] font-mono text-center bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors border border-white/5"
                  >
                    .VTT
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
