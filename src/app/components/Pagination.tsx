import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number; // 0-based from server, we display 1-based
  totalPages: number;
  onPageChange: (page: number) => void; // returns 0-based
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const displayed = currentPage + 1;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 0; i < totalPages; i++) pages.push(i);
  } else {
    pages.push(0);
    if (currentPage > 2) pages.push('...');
    for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages - 2, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 3) pages.push('...');
    pages.push(totalPages - 1);
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        className="p-2 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-100 transition-colors"
      >
        <ChevronLeft className="size-4" />
      </button>

      {pages.map((p, idx) =>
        p === '...' ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={`w-9 h-9 rounded-lg text-sm transition-colors ${
              p === currentPage
                ? 'bg-blue-600 text-white'
                : 'border border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {(p as number) + 1}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages - 1}
        className="p-2 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-100 transition-colors"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
};
