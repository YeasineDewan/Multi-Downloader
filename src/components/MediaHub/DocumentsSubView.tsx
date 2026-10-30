import React, { useState, useMemo } from 'react';
import { ScrapedSiteAsset } from '../../types';
import {
  FileText,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Archive,
  BookOpen,
  FileCode,
} from 'lucide-react';

interface DocumentsSubViewProps {
  documents: ScrapedSiteAsset[];
  mediaTitle: string;
}

export const DocumentsSubView: React.FC<DocumentsSubViewProps> = ({
  documents,
  mediaTitle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState<'all' | 'pdf' | 'epub' | 'archive' | 'other'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Filter documents
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const ext = doc.extension.toLowerCase();
      const matchesType =
        docTypeFilter === 'all'
          ? true
          : docTypeFilter === 'pdf'
          ? ext === 'pdf'
          : docTypeFilter === 'epub'
          ? ext === 'epub'
          : docTypeFilter === 'archive'
          ? ext === 'zip' || ext === 'rar' || ext === 'tar' || ext === 'gz'
          : ext !== 'pdf' && ext !== 'epub' && ext !== 'zip' && ext !== 'rar';

      const matchesSearch =
        searchQuery.trim() === ''
          ? true
          : doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.extension.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesType && matchesSearch;
    });
  }, [documents, docTypeFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedDocs = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return filteredDocs.slice(start, start + pageSize);
  }, [filteredDocs, validPage, pageSize]);

  if (documents.length === 0) {
    return (
      <div className="p-12 text-center text-xs text-neutral-500 bg-neutral-950/40 rounded-2xl border border-white/[0.05] space-y-2 animate-fade-in">
        <FileText className="w-8 h-8 mx-auto text-neutral-600 mb-2" />
        <p className="font-semibold text-neutral-400">No standalone documents found on this link</p>
        <p className="text-[11px] text-neutral-600">
          PDF, EPUB, and archive files embedded in the webpage will automatically appear here.
        </p>
      </div>
    );
  }

  const getDocIcon = (ext: string) => {
    const lower = ext.toLowerCase();
    if (lower === 'pdf') return <FileText className="w-5 h-5 text-rose-400" />;
    if (lower === 'epub') return <BookOpen className="w-5 h-5 text-emerald-400" />;
    if (lower === 'zip' || lower === 'rar') return <Archive className="w-5 h-5 text-amber-400" />;
    return <FileCode className="w-5 h-5 text-blue-400" />;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-white/[0.06]">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'pdf', 'epub', 'archive', 'other'] as const).map((type) => {
            const count =
              type === 'all'
                ? documents.length
                : documents.filter((d) => {
                    const ext = d.extension.toLowerCase();
                    if (type === 'pdf') return ext === 'pdf';
                    if (type === 'epub') return ext === 'epub';
                    if (type === 'archive') return ext === 'zip' || ext === 'rar';
                    return ext !== 'pdf' && ext !== 'epub' && ext !== 'zip' && ext !== 'rar';
                  }).length;

            return (
              <button
                key={type}
                onClick={() => {
                  setDocTypeFilter(type);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all active:scale-95 ${
                  docTypeFilter === type
                    ? 'bg-neutral-800 text-white shadow-sm border border-white/10 ring-1 ring-white/10'
                    : 'text-neutral-400 hover:text-white bg-neutral-950/60'
                }`}
              >
                <span>{type === 'all' ? 'All Files' : type.toUpperCase()}</span>
                <span className="text-[10px] text-neutral-500 font-mono ml-1.5">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-auto">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search documents..."
            className="w-full sm:w-48 bg-neutral-950/80 border border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
      </div>

      {/* Stats counter */}
      <div className="flex items-center justify-between text-xs text-neutral-400 px-1 font-mono">
        <span>
          Showing {filteredDocs.length === 0 ? 0 : (validPage - 1) * pageSize + 1}–
          {Math.min(validPage * pageSize, filteredDocs.length)} of {filteredDocs.length} files
        </span>
        {totalPages > 1 && (
          <span>Page {validPage} of {totalPages}</span>
        )}
      </div>

      {/* Document Items Grid */}
      {paginatedDocs.length === 0 ? (
        <div className="p-8 text-center text-xs text-neutral-500 bg-neutral-950/40 rounded-2xl border border-white/[0.05]">
          No documents match your filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {paginatedDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-3.5 rounded-2xl bg-neutral-950/70 border border-white/[0.07] flex items-center justify-between gap-3 hover:border-white/20 hover:bg-neutral-900/40 transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  {getDocIcon(doc.extension)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-white truncate" title={doc.filename}>
                    {doc.filename}
                  </h4>
                  <div className="text-[10px] text-neutral-400 font-mono mt-0.5 uppercase flex items-center gap-1.5">
                    <span className="text-neutral-300 font-bold">{doc.extension}</span>
                    <span>·</span>
                    <span>{doc.sizeEst}</span>
                  </div>
                </div>
              </div>

              <a
                href={`/api/download?url=${encodeURIComponent(doc.url)}&title=${encodeURIComponent(
                  doc.filename
                )}&format=${doc.extension}`}
                download={`${doc.filename}.${doc.extension}`}
                className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-xl border border-white/5 transition-colors shrink-0 shadow-sm"
                title="Download file"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      )}

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

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                onClick={() => setCurrentPage(num)}
                className={`w-7 h-7 rounded-lg font-mono text-xs flex items-center justify-center transition-colors ${
                  num === validPage
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-neutral-400 hover:text-white bg-neutral-950/60'
                }`}
              >
                {num}
              </button>
            ))}
          </div>

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
