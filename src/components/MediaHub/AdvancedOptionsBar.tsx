import React from 'react';
import { AdvancedDownloadSettings } from '../../types';
import { Sliders, Scissors, Music, Volume2, Film, Sparkles, Check } from 'lucide-react';

interface AdvancedOptionsBarProps {
  settings: AdvancedDownloadSettings;
  onChange: (settings: AdvancedDownloadSettings) => void;
  durationSec: number;
}

export const AdvancedOptionsBar: React.FC<AdvancedOptionsBarProps> = ({
  settings,
  onChange,
  durationSec,
}) => {
  const updateSetting = <K extends keyof AdvancedDownloadSettings>(
    key: K,
    value: AdvancedDownloadSettings[K]
  ) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-neutral-900/80 border border-white/[0.08] rounded-2xl p-5 space-y-5 backdrop-blur-2xl animate-fade-in">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Subcategory Tuning & DSP</h4>
        </div>
        <span className="text-[11px] text-neutral-500 font-mono">iOS Control Deck</span>
      </div>

      {/* 1. Trimmer Range */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-medium text-neutral-200">Clip Trimmer / Range Cut</span>
          </div>
          <button
            type="button"
            onClick={() => updateSetting('trimEnabled', !settings.trimEnabled)}
            className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors duration-200 ${
              settings.trimEnabled ? 'bg-blue-600' : 'bg-neutral-800'
            }`}
          >
            <div
              className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform duration-200 ${
                settings.trimEnabled ? 'translate-x-4.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {settings.trimEnabled && (
          <div className="p-3 bg-neutral-950/70 rounded-xl border border-white/[0.05] grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-neutral-400 block mb-1">Start Time (MM:SS)</label>
              <input
                type="text"
                value={settings.startTime}
                onChange={(e) => updateSetting('startTime', e.target.value)}
                placeholder="00:00"
                className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono text-center focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-neutral-400 block mb-1">End Time (MM:SS)</label>
              <input
                type="text"
                value={settings.endTime}
                onChange={(e) => updateSetting('endTime', e.target.value)}
                placeholder={formatSeconds(durationSec)}
                className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono text-center focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Audio Master DSP */}
      <div className="space-y-3 pt-3 border-t border-white/[0.06]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-400 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Volume Boost & Normalization</span>
          </span>
          <span className="font-mono text-white tabular-nums">{settings.volumeBoost}%</span>
        </div>
        <input
          type="range"
          min={100}
          max={200}
          step={5}
          value={settings.volumeBoost}
          onChange={(e) => updateSetting('volumeBoost', Number(e.target.value))}
          className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <div className="flex items-center justify-between p-2.5 bg-neutral-950/50 rounded-xl border border-white/[0.04]">
            <span className="text-xs text-neutral-300">Bass Enhancement</span>
            <button
              type="button"
              onClick={() => updateSetting('bassBoost', !settings.bassBoost)}
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                settings.bassBoost ? 'bg-emerald-600' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${
                  settings.bassBoost ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-neutral-950/50 rounded-xl border border-white/[0.04]">
            <span className="text-xs text-neutral-300">Auto ID3 Metadata</span>
            <button
              type="button"
              onClick={() => updateSetting('autoTagId3', !settings.autoTagId3)}
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                settings.autoTagId3 ? 'bg-blue-600' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${
                  settings.autoTagId3 ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Video Customizer */}
      <div className="space-y-3 pt-3 border-t border-white/[0.06]">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-purple-400" />
            <span>Playback Speed Rate</span>
          </span>
          <span className="font-mono text-white">{settings.playbackSpeed}x</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5 p-1 bg-neutral-950/70 rounded-xl border border-white/[0.05]">
          {[0.5, 0.75, 1.0, 1.25, 1.5].map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => updateSetting('playbackSpeed', speed)}
              className={`py-1 text-xs font-medium rounded-lg transition-colors font-mono ${
                settings.playbackSpeed === speed
                  ? 'bg-neutral-800 text-white font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="flex items-center justify-between p-2.5 bg-neutral-950/50 rounded-xl border border-white/[0.04]">
            <span className="text-xs text-neutral-300">Mute / Video Only</span>
            <button
              type="button"
              onClick={() => updateSetting('muteVideo', !settings.muteVideo)}
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                settings.muteVideo ? 'bg-purple-600' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${
                  settings.muteVideo ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-neutral-950/50 rounded-xl border border-white/[0.04]">
            <span className="text-xs text-neutral-300">Convert to GIF</span>
            <button
              type="button"
              onClick={() => updateSetting('convertToGif', !settings.convertToGif)}
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                settings.convertToGif ? 'bg-amber-600' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${
                  settings.convertToGif ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
