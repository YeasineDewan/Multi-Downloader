import React from 'react';
import { AudioFormatOption } from '../../types';
import { Music, Check, Disc, Volume2, Sparkles, Play } from 'lucide-react';

interface AudioSubViewProps {
  formats: AudioFormatOption[];
  selectedFormat: AudioFormatOption;
  onSelectFormat: (format: AudioFormatOption) => void;
  onPreviewAudio?: () => void;
  optimalFormatId?: string;
}

export const AudioSubView: React.FC<AudioSubViewProps> = ({
  formats,
  selectedFormat,
  onSelectFormat,
  onPreviewAudio,
  optimalFormatId,
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Studio Audio Visualizer Banner */}
      <div className="p-4 rounded-2xl bg-neutral-950/70 border border-white/[0.06] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Disc className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-tight">Studio Master DSP Engine</h4>
            <p className="text-[11px] text-neutral-400">
              Extract lossless and studio-bitrate audio with ID3v2 tags and embedded cover artwork.
            </p>
          </div>
        </div>

        {onPreviewAudio && (
          <button
            onClick={onPreviewAudio}
            className="px-3.5 py-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl border border-white/10 flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Play Preview</span>
          </button>
        )}
      </div>

      {/* 2. Format Options Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-semibold text-white">Select Audio Encoding</span>
          <span>{formats.length} Audio Profiles</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {formats.map((item) => {
            const isSelected = selectedFormat.id === item.id;
            const isOptimal = optimalFormatId ? item.id === optimalFormatId : item.recommended;

            return (
              <button
                key={item.id}
                onClick={() => onSelectFormat(item)}
                className={`p-4 rounded-2xl text-left border transition-all duration-200 flex flex-col justify-between relative group ${
                  isSelected
                    ? 'bg-neutral-800/90 border-emerald-500/50 shadow-lg ring-1 ring-emerald-500/30'
                    : isOptimal
                    ? 'bg-neutral-950/70 border-emerald-500/30 ring-1 ring-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.12)] hover:bg-neutral-900/70 hover:border-emerald-400/40 animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite]'
                    : 'bg-neutral-950/50 border-white/[0.06] hover:bg-neutral-900/60 hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white tracking-tight">
                      {item.label}
                    </span>
                    {isOptimal && (
                      <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1 shadow-sm animate-pulse">
                        <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                        <span>Recommended</span>
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono font-medium text-neutral-300 tabular-nums">
                    {item.estimatedSize}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-400 w-full mt-1 font-mono">
                  <span>
                    {item.container} · {item.quality} · {item.sampleRate}
                  </span>
                  {item.recommended && !isOptimal && (
                    <span className="text-[11px] text-emerald-400 font-sans font-semibold">
                      Recommended
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-neutral-500 mt-2 line-clamp-1">
                  {item.description}
                </p>

                {isSelected && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
