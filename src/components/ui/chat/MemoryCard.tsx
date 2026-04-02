/**
 * MemoryCard — Inline card showing a proactive memory recall.
 *
 * Renders above the assistant message bubble to surface remembered context.
 * Color-coded by memory type with dismiss/correct actions on hover.
 */
import React, { memo, useState } from 'react';
import type { MemoryRecallData, MemoryType } from '../../../types/memoryTypes';

// ── colour & icon mapping per memory type ─────────────────────────────
const TYPE_STYLES: Record<MemoryType, { border: string; bg: string; text: string; icon: string }> = {
  factual:    { border: 'border-amber-500/20',  bg: 'bg-amber-500/5',   text: 'text-amber-400', icon: '📌' },
  episodic:   { border: 'border-blue-500/20',   bg: 'bg-blue-500/5',    text: 'text-blue-400',  icon: '🕰️' },
  semantic:   { border: 'border-purple-500/20',  bg: 'bg-purple-500/5',  text: 'text-purple-400', icon: '🔗' },
  procedural: { border: 'border-green-500/20',   bg: 'bg-green-500/5',   text: 'text-green-400', icon: '⚙️' },
  working:    { border: 'border-gray-500/20',    bg: 'bg-gray-500/5',    text: 'text-gray-400',  icon: '💭' },
};

// ── relative-time helper ──────────────────────────────────────────────
function relativeTime(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── props ─────────────────────────────────────────────────────────────
export interface MemoryCardProps extends MemoryRecallData {
  onDismiss?: () => void;
  onCorrect?: () => void;
}

export const MemoryCard = memo<MemoryCardProps>(({
  memoryType,
  content,
  learnedAt,
  confidence,
  onDismiss,
  onCorrect,
}) => {
  const [hovered, setHovered] = useState(false);
  const style = TYPE_STYLES[memoryType] ?? TYPE_STYLES.factual;

  // Truncate content to ~120 chars (roughly 1-2 lines)
  const truncated = content.length > 120 ? content.slice(0, 117) + '...' : content;

  return (
    <div
      className={`relative flex items-start gap-2 px-3 py-2 rounded-2xl border ${style.border} ${style.bg} transition-all duration-150`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Left accent border */}
      <span className={`shrink-0 text-base leading-none mt-0.5 ${style.text}`}>
        {style.icon}
      </span>

      <div className="min-w-0 flex-1">
        {/* Content snippet */}
        <p className="text-sm text-white/80 leading-snug line-clamp-2">
          {truncated}
        </p>

        {/* Caption */}
        <p className={`mt-0.5 text-xs ${style.text} opacity-70`}>
          {learnedAt ? `Remembered from ${relativeTime(learnedAt)}` : 'Recalled from memory'}
          {typeof confidence === 'number' && ` · ${Math.round(confidence * 100)}%`}
        </p>
      </div>

      {/* Hover actions */}
      {hovered && (
        <div className="absolute top-1 right-1 flex gap-1">
          {onCorrect && (
            <button
              onClick={(e) => { e.stopPropagation(); onCorrect(); }}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white/90 transition-colors"
              title="Correct this memory"
              aria-label="Correct this memory"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          )}
          {onDismiss && (
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(); }}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white/90 transition-colors"
              title="Dismiss"
              aria-label="Dismiss memory"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
});

MemoryCard.displayName = 'MemoryCard';
