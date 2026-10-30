import React from 'react';
import {
  ArrowDownToLine,
  SlidersHorizontal,
  Layers,
  History,
  Clipboard,
  Sparkles,
  Sliders,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'hub' | 'batch' | 'library';
  setActiveTab: (tab: 'hub' | 'batch' | 'library') => void;
  onOpenSettings: () => void;
  onQuickPaste: () => void;
  batchCount?: number;
  libraryCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  onQuickPaste,
  batchCount = 0,
  libraryCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#0A0B0E]/80 backdrop-blur-3xl transition-all select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Apple Display Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('hub')}
            className="flex items-center gap-3 text-left group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded-2xl p-1 transition-transform active:scale-[0.98]"
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
            className={`px-3.5 py-1.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'hub'
                ? 'bg-neutral-800 text-white shadow-md border border-white/10 ring-1 ring-white/10'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
            }`}
          >
            <span>Media Hub</span>
          </button>

          <button
            onClick={() => setActiveTab('batch')}
            className={`px-3.5 py-1.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'batch'
                ? 'bg-neutral-800 text-white shadow-md border border-white/10 ring-1 ring-white/10'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
            }`}
          >
            <span>Batch Queue</span>
            {batchCount > 0 && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  activeTab === 'batch'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/20'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {batchCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`px-3.5 py-1.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
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

        {/* Zone 3: Apple Action Cluster */}
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
    </header>
  );
};
