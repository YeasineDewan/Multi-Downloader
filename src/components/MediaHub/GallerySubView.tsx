import React, { useState, useMemo, useEffect } from 'react';
import { ScrapedSiteAsset, DownloadTask } from '../../types';
import {
  Grid,
  Check,
  Download,
  Eye,
  Archive,
  Search,
  CheckSquare,
  Square,
  Loader2,
  Copy,
  Plus,
  Film,
  Music,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
} from 'lucide-react';

interface GallerySubViewProps {
  assets: ScrapedSiteAsset[];
  mediaTitle: string;
  onAddToQueue?: (task: Omit<DownloadTask, 'id' | 'progress' | 'status' | 'speed' | 'timestamp'>) => void;
}

export const GallerySubView: React.FC<GallerySubViewProps> = ({
  assets,
  mediaTitle,
  onAddToQueue,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [gridCols, setGridCols] = useState<3 | 4 | 5>(4);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(24);

  // Filtered Assets based on category and search
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesCategory =
        categoryFilter === 'all'
          ? true
          : categoryFilter === 'image'
          ? asset.category === 'image'
          : categoryFilter === 'video'
          ? asset.category === 'video'
          : asset.category === 'audio';

      const matchesSearch =
        searchQuery.trim() === ''
          ? true
          : asset.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.extension.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (asset.altText && asset.altText.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  }, [assets, categoryFilter, searchQuery]);

  // Reset page when search or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, searchQuery, pageSize]);

  // Pagination calculations
  const totalItems = filteredAssets.length;
  const effectivePageSize = pageSize === 'all' ? Math.max(1, totalItems) : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (validCurrentPage - 1) * effectivePageSize;
  const endIndex = Math.min(startIndex + effectivePageSize, totalItems);
  const paginatedAssets = useMemo(() => {
    if (pageSize === 'all') return filteredAssets;
    return filteredAssets.slice(startIndex, endIndex);
  }, [filteredAssets, startIndex, endIndex, pageSize]);

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectPage = () => {
    const pageIds = paginatedAssets.map((a) => a.id);
    const allPageSelected = pageIds.every((id) => selectedIds.has(id));
    const next = new Set(selectedIds);

    if (allPageSelected) {
      pageIds.forEach((id) => next.delete(id));
    } else {
      pageIds.forEach((id) => next.add(id));
    }
    setSelectedIds(next);
  };

  const handleSelectAllTotal = () => {
    const allIds = filteredAssets.map((a) => a.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const handleDownloadSingle = (asset: ScrapedSiteAsset, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const downloadUrl = `/api/download?url=${encodeURIComponent(asset.url)}&title=${encodeURIComponent(
      asset.filename
    )}&format=${asset.extension}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${asset.filename}.${asset.extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyLink = (asset: ScrapedSiteAsset, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(asset.url);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadSelectedZip = async () => {
    const selected = assets.filter((a) => selectedIds.has(a.id));
    if (selected.length === 0 || isZipping) return;

    setIsZipping(true);
    try {
      const res = await fetch('/api/batch-download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleName: `Gallery_${mediaTitle.slice(0, 18).replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
          items: selected.map((a) => ({
            title: a.filename,
            format: a.extension,
            url: a.url,
          })),
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `Selected_Gallery_Bundle_${selected.length}_items.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      }
    } catch (err) {
      console.error('ZIP download error:', err);
    } finally {
      setIsZipping(false);
    }
  };

  const handleAddSelectedToQueue = () => {
    if (!onAddToQueue) return;
    const selected = assets.filter((a) => selectedIds.has(a.id));
    selected.forEach((asset) => {
      onAddToQueue({
        url: asset.url,
        title: asset.filename,
        author: mediaTitle,
        thumbnail: asset.thumbnailUrl || asset.url,
        platform: {
          id: 'generic',
          name: 'Media Gallery',
          color: '#3B82F6',
          icon: 'image',
        },
        type:
          asset.category === 'video'
            ? 'video'
            : asset.category === 'audio'
            ? 'audio'
            : 'asset',
        format: asset.extension,
        resolution: asset.dimensions || 'Original',
        size: asset.sizeEst,
      });
    });
    setSelectedIds(new Set());
  };

  const previewAsset =
    previewIndex !== null && paginatedAssets[previewIndex] ? paginatedAssets[previewIndex] : null;

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (validCurrentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (validCurrentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', validCurrentPage - 1, validCurrentPage, validCurrentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 1. Header Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'image', 'video', 'audio'] as const).map((cat) => {
            const count =
              cat === 'all'
                ? assets.length
                : assets.filter((a) => a.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all active:scale-95 ${
                  categoryFilter === cat
                    ? 'bg-neutral-800 text-white shadow-sm border border-white/10 ring-1 ring-white/10'
                    : 'text-neutral-400 hover:text-white bg-neutral-950/60 hover:bg-neutral-900/60'
                }`}
              >
                <span>{cat === 'image' ? 'Images' : cat === 'video' ? 'Videos' : cat === 'audio' ? 'Audio' : 'All Media'}</span>
                <span className="text-[10px] text-neutral-500 font-mono ml-1.5">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search & Grid Columns */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets..."
              className="bg-neutral-950/80 border border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/20 w-36 sm:w-44 transition-colors"
            />
          </div>

          {/* Grid Column Selector */}
          <div className="hidden sm:flex items-center gap-1 p-1 bg-neutral-950/60 rounded-xl border border-white/[0.06] text-xs">
            {[3, 4, 5].map((cols) => (
              <button
                key={cols}
                onClick={() => setGridCols(cols as 3 | 4 | 5)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-colors ${
                  gridCols === cols
                    ? 'bg-neutral-800 text-white font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {cols}C
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Sub-Toolbar: Selection and Paging Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1 text-xs text-neutral-400">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Select Page */}
          <button
            onClick={handleSelectPage}
            disabled={paginatedAssets.length === 0}
            className="px-2.5 py-1 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg border border-white/5 flex items-center gap-1.5 transition-colors"
          >
            {paginatedAssets.length > 0 && paginatedAssets.every((a) => selectedIds.has(a.id)) ? (
              <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <Square className="w-3.5 h-3.5 text-neutral-500" />
            )}
            <span>Select Page ({paginatedAssets.length})</span>
          </button>

          {/* Select All Total */}
          <button
            onClick={handleSelectAllTotal}
            disabled={filteredAssets.length === 0}
            className="px-2.5 py-1 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg border border-white/5 flex items-center gap-1.5 transition-colors"
          >
            {filteredAssets.length > 0 && filteredAssets.every((a) => selectedIds.has(a.id)) ? (
              <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <Square className="w-3.5 h-3.5 text-neutral-500" />
            )}
            <span>Select All ({filteredAssets.length})</span>
          </button>

          {selectedIds.size > 0 && (
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-neutral-400 hover:text-white underline text-[11px] ml-1"
            >
              Clear Selection ({selectedIds.size})
            </button>
          )}
        </div>

        {/* Paging stats and Page Size selector */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className="font-mono text-[11px] text-neutral-400">
            {totalItems === 0
              ? '0 assets'
              : `Showing ${startIndex + 1}–${endIndex} of ${totalItems} assets`}
          </span>

          <div className="flex items-center gap-1 text-[11px] font-mono">
            <span className="text-neutral-500">Per page:</span>
            {[12, 24, 48, 'all' as const].map((size) => (
              <button
                key={size}
                onClick={() => setPageSize(size)}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  pageSize === size
                    ? 'bg-neutral-800 text-white font-semibold'
                    : 'text-neutral-400 hover:text-white bg-neutral-950/60'
                }`}
              >
                {size === 'all' ? 'All' : size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Empty State */}
      {paginatedAssets.length === 0 && (
        <div className="p-12 text-center text-xs text-neutral-500 bg-neutral-950/40 rounded-2xl border border-white/[0.05] space-y-2">
          <Grid className="w-8 h-8 mx-auto text-neutral-600 mb-2" />
          <p className="font-semibold text-neutral-400">No media assets found matching your criteria</p>
          <p className="text-[11px] text-neutral-600">Try adjusting your category filter or search keywords.</p>
        </div>
      )}

      {/* 4. Grid Display */}
      {paginatedAssets.length > 0 && (
        <div
          className={`grid gap-3.5 ${
            gridCols === 3
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
              : gridCols === 5
              ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
              : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
          }`}
        >
          {paginatedAssets.map((asset, index) => {
            const isSelected = selectedIds.has(asset.id);
            const isVideo = asset.category === 'video';
            const isAudio = asset.category === 'audio';
            const isImage = asset.category === 'image';

            return (
              <div
                key={asset.id}
                onClick={() => toggleSelect(asset.id)}
                className={`group relative rounded-2xl overflow-hidden bg-neutral-950/80 border transition-all duration-200 cursor-pointer flex flex-col ${
                  isSelected
                    ? 'border-blue-500/70 shadow-lg ring-1 ring-blue-500/40'
                    : 'border-white/[0.07] hover:border-white/20 hover:bg-neutral-900/40'
                }`}
              >
                {/* Media Preview Box */}
                <div className="relative aspect-video w-full bg-black/90 flex items-center justify-center overflow-hidden">
                  {isImage ? (
                    <img
                      src={asset.url}
                      alt={asset.altText || asset.filename}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : isVideo ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 to-indigo-950/40 text-indigo-300 p-4 relative">
                      {asset.thumbnailUrl ? (
                        <img
                          src={asset.thumbnailUrl}
                          alt={asset.filename}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover absolute inset-0 opacity-70"
                        />
                      ) : (
                        <Film className="w-10 h-10 mb-2 opacity-80" />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                          <Film className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  ) : isAudio ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 to-emerald-950/40 text-emerald-300 p-4">
                      <Music className="w-10 h-10 mb-2 opacity-80" />
                      <div className="flex items-end gap-1 h-5 mt-2">
                        {[12, 18, 14, 22, 10, 16, 20].map((h, i) => (
                          <div
                            key={i}
                            className="w-1 bg-emerald-400/70 rounded-full"
                            style={{ height: `${h}px` }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900 text-amber-300 p-4">
                      <FileText className="w-10 h-10 mb-2 opacity-80" />
                      <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400">
                        {asset.extension}
                      </span>
                    </div>
                  )}

                  {/* Top Left Selection Checkbox */}
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <button
                      type="button"
                      onClick={(e) => toggleSelect(asset.id, e)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40 scale-105'
                          : 'bg-black/60 backdrop-blur-md text-transparent border border-white/20 hover:border-white/50'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Top Right Format Badge */}
                  <div className="absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-mono font-semibold uppercase text-neutral-200 border border-white/10">
                    {asset.extension}
                  </div>

                  {/* Hover Action Overlay */}
                  <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 p-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewIndex(index);
                      }}
                      className="p-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-colors"
                      title="Inspect asset"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDownloadSingle(asset, e)}
                      className="p-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-colors"
                      title="Download asset"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(asset, e)}
                      className="p-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-colors"
                      title="Copy URL"
                    >
                      {copiedId === asset.id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="p-3 space-y-1">
                  <div className="text-xs font-semibold text-white truncate" title={asset.filename}>
                    {asset.filename}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                    <span>{asset.dimensions || asset.category}</span>
                    <span>{asset.sizeEst}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Pagination Bar (Visible when pageSize != 'all' and totalPages > 1) */}
      {pageSize !== 'all' && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/[0.06] text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={validCurrentPage === 1}
              className={`p-2 rounded-xl border border-white/5 transition-colors ${
                validCurrentPage === 1
                  ? 'text-neutral-600 bg-neutral-950/40 cursor-not-allowed'
                  : 'text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800'
              }`}
              title="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage === 1}
              className={`px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-1 transition-colors ${
                validCurrentPage === 1
                  ? 'text-neutral-600 bg-neutral-950/40 cursor-not-allowed'
                  : 'text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {/* Page number buttons */}
            <div className="flex items-center gap-1 mx-1">
              {getPageNumbers().map((num, idx) => {
                if (num === '...') {
                  return (
                    <span key={`ellipsis-${idx}`} className="px-2 text-neutral-500 font-mono">
                      …
                    </span>
                  );
                }
                const pageNum = Number(num);
                const isActive = pageNum === validCurrentPage;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-xl font-mono text-xs transition-colors flex items-center justify-center ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                        : 'text-neutral-400 hover:text-white bg-neutral-950/60 hover:bg-neutral-900'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage === totalPages}
              className={`px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-1 transition-colors ${
                validCurrentPage === totalPages
                  ? 'text-neutral-600 bg-neutral-950/40 cursor-not-allowed'
                  : 'text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800'
              }`}
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={validCurrentPage === totalPages}
              className={`p-2 rounded-xl border border-white/5 transition-colors ${
                validCurrentPage === totalPages
                  ? 'text-neutral-600 bg-neutral-950/40 cursor-not-allowed'
                  : 'text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800'
              }`}
              title="Last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-neutral-400 font-mono text-xs">
            <span>Page {validCurrentPage} of {totalPages}</span>
          </div>
        </div>
      )}

      {/* 6. Floating Action Capsule (When items are selected) */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-4 z-30 max-w-lg mx-auto">
          <div className="p-2 px-4 rounded-2xl bg-neutral-900/90 border border-white/20 shadow-2xl backdrop-blur-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-white shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span>{selectedIds.size} selected</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadSelectedZip}
                disabled={isZipping}
                className="px-3.5 py-1.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-md"
              >
                {isZipping ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Archive className="w-3.5 h-3.5" />
                )}
                <span>Export ZIP</span>
              </button>

              {onAddToQueue && (
                <button
                  onClick={handleAddSelectedToQueue}
                  className="px-3.5 py-1.5 rounded-xl bg-neutral-800 text-white text-xs font-semibold hover:bg-neutral-700 active:scale-[0.98] transition-all flex items-center gap-1.5 border border-white/10"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>To Queue</span>
                </button>
              )}

              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                title="Deselect all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Lightbox Inspector Modal */}
      {previewAsset && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6"
          onClick={() => setPreviewIndex(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-neutral-900/95 border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 px-6 border-b border-white/10 flex items-center justify-between bg-neutral-950/60">
              <div className="min-w-0 flex-1 mr-4">
                <h4 className="text-sm font-bold text-white truncate">{previewAsset.filename}</h4>
                <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono mt-0.5">
                  <span className="uppercase text-blue-400 font-semibold">{previewAsset.extension}</span>
                  <span>·</span>
                  <span>{previewAsset.dimensions || previewAsset.category}</span>
                  <span>·</span>
                  <span>{previewAsset.sizeEst}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => handleDownloadSingle(previewAsset, e)}
                  className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded-xl hover:bg-neutral-200 transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>

                <button
                  onClick={() => setPreviewIndex(null)}
                  className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Media Body */}
            <div className="flex-1 bg-black/90 p-4 flex items-center justify-center overflow-auto min-h-[300px]">
              {previewAsset.category === 'image' ? (
                <img
                  src={previewAsset.url}
                  alt={previewAsset.filename}
                  referrerPolicy="no-referrer"
                  className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-lg"
                />
              ) : previewAsset.category === 'video' ? (
                <video
                  src={previewAsset.url}
                  controls
                  autoPlay
                  className="max-h-[60vh] max-w-full rounded-lg shadow-lg"
                />
              ) : previewAsset.category === 'audio' ? (
                <div className="w-full max-w-md p-6 rounded-2xl bg-neutral-900 border border-white/10 text-center space-y-4">
                  <Music className="w-12 h-12 mx-auto text-emerald-400" />
                  <audio src={previewAsset.url} controls className="w-full" autoPlay />
                </div>
              ) : (
                <div className="text-center p-8 space-y-3">
                  <FileText className="w-16 h-16 mx-auto text-amber-400 opacity-80" />
                  <p className="text-sm text-neutral-300">{previewAsset.filename}</p>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-3 px-6 bg-neutral-950/60 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400">
              <button
                onClick={() => setPreviewIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : paginatedAssets.length - 1))}
                className="hover:text-white flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-neutral-800"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Item</span>
              </button>

              <span className="font-mono text-[11px]">
                Item {(previewIndex || 0) + 1} of {paginatedAssets.length} (Page {validCurrentPage})
              </span>

              <button
                onClick={() => setPreviewIndex((prev) => (prev !== null && prev < paginatedAssets.length - 1 ? prev + 1 : 0))}
                className="hover:text-white flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-neutral-800"
              >
                <span>Next Item</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
