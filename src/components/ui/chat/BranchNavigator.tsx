/**
 * BranchNavigator — Simple "< 1/2 >" branch navigation (#187)
 *
 * Design ref: small icon buttons ~20px, counter in text-sm muted.
 */
import React from 'react';

interface BranchNavigatorProps {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export const BranchNavigator: React.FC<BranchNavigatorProps> = ({ current, total, onPrev, onNext }) => {
  if (total <= 1) return null;

  return (
    <div className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
      <button
        onClick={onPrev}
        disabled={current <= 1}
        className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="tabular-nums">{current} / {total}</span>
      <button
        onClick={onNext}
        disabled={current >= total}
        className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};
