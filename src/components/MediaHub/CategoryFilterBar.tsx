import React from 'react';
import { Film, Music, Image as ImageIcon, FileText, Layers } from 'lucide-react';
import { MediaHubCategory } from '../../types';

export interface CategoryFilterBarProps {
  activeCategory: MediaHubCategory;
  onSelectCategory: (cat: MediaHubCategory) => void;
  counts?: {
    video?: number;
    audio?: number;
    image?: number;
    gallery?: number;
    documents?: number;
    batch?: number;
  };
}

export const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({
  activeCategory,
  onSelectCategory,
  counts,
}) => {
  // Normalize 'gallery' to 'image' for visual selection
  const isImageActive = activeCategory === 'image' || activeCategory === 'gallery';

  const categories: {
    id: MediaHubCategory;
    label: string;
    sublabel?: string;
    icon: React.ReactNode;
    count?: number;
    isPrimaryContentType: boolean;
  }[] = [
    {
      id: 'video',
      label: 'Video',
      sublabel: 'Streams & 4K',
      icon: <Film className="w-4 h-4" />,
      count: counts?.video,
      isPrimaryContentType: true,
    },
    {
      id: 'audio',
      label: 'Audio',
      sublabel: 'Lossless & MP3',
      icon: <Music className="w-4 h-4" />,
      count: counts?.audio,
      isPrimaryContentType: true,
    },
    {
      id: 'image',
      label: 'Image',
      sublabel: 'Photos & Artwork',
      icon: <ImageIcon className="w-4 h-4" />,
      count: counts?.image ?? counts?.gallery,
      isPrimaryContentType: true,
    },
    {
      id: 'documents',
      label: 'Documents',
      sublabel: 'Web Assets',
      icon: <FileText className="w-4 h-4" />,
      count: counts?.documents,
      isPrimaryContentType: false,
    },
    {
      id: 'batch',
      label: 'Batch Queue',
      sublabel: 'Transfer List',
      icon: <Layers className="w-4 h-4" />,
      count: counts?.batch,
      isPrimaryContentType: false,
    },
  ];

  return (
    <div className="w-full space-y-2">
      {/* Category Filter Bar Label & Quick Meta */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px]">
            Content Type Filter
          </span>
          <span className="text-[10px] text-neutral-500 font-mono">
            (Toggle Video · Audio · Image)
          </span>
        </div>
        <div className="text-[11px] text-neutral-400 font-mono hidden sm:block">
          Active:{' '}
          <span className="text-white font-semibold capitalize">
            {activeCategory === 'gallery' ? 'Image' : activeCategory}
          </span>
        </div>
      </div>

      {/* iOS 18 Frosted Glass Segmented Filter Bar */}
      <div
        role="tablist"
        aria-label="Media Hub Content Type Filter"
        className="w-full flex items-center gap-1.5 p-1.5 bg-neutral-950/70 border border-white/[0.08] rounded-2xl backdrop-blur-2xl overflow-x-auto select-none scrollbar-none"
      >
        {categories.map((cat) => {
          const isActive =
            cat.id === 'image'
              ? isImageActive
              : activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              role="tab"
              aria-selected={isActive}
              data-category={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex-1 min-w-[95px] sm:min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200 whitespace-nowrap shrink-0 relative ${
                isActive
                  ? 'bg-neutral-800 text-white shadow-lg border border-white/10 ring-1 ring-white/10'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
              }`}
            >
              <span
                className={`transition-colors ${
                  isActive
                    ? cat.id === 'video'
                      ? 'text-blue-400'
                      : cat.id === 'audio'
                      ? 'text-emerald-400'
                      : cat.id === 'image'
                      ? 'text-purple-400'
                      : 'text-blue-400'
                    : 'text-neutral-500'
                }`}
              >
                {cat.icon}
              </span>
              <span className="tracking-tight">{cat.label}</span>
              {cat.count !== undefined && cat.count > 0 && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full transition-colors ${
                    isActive
                      ? cat.id === 'video'
                        ? 'bg-blue-600/30 text-blue-300 border border-blue-500/20'
                        : cat.id === 'audio'
                        ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/20'
                        : cat.id === 'image'
                        ? 'bg-purple-600/30 text-purple-300 border border-purple-500/20'
                        : 'bg-neutral-700 text-neutral-200'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {cat.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
