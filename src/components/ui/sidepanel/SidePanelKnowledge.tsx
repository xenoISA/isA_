/**
 * SidePanelKnowledge — Personal knowledge surface showing what Mate knows about you.
 *
 * Displays facts, preferences, and patterns in a warm, personal layout.
 * Each item shows content, when it was learned, and a delete action on hover.
 */
import React, { useState } from 'react';
import { useMateKnowledge } from '../../../hooks/useMateKnowledge';
import type { MateKnowledgeItem, MateKnowledgeType } from '../../../types/mateTypes';

// ── Color tokens per knowledge type ──────────────────────────────────────────
const TYPE_STYLES: Record<MateKnowledgeType, { accent: string; bg: string; icon: string }> = {
  fact: {
    accent: 'text-amber-400',
    bg: 'bg-amber-400/5 border-amber-400/15 hover:border-amber-400/25',
    icon: '\u2727', // sparkle ✧
  },
  preference: {
    accent: 'text-blue-400',
    bg: 'bg-blue-400/5 border-blue-400/15 hover:border-blue-400/25',
    icon: '\u2665', // heart ♥
  },
  pattern: {
    accent: 'text-purple-400',
    bg: 'bg-purple-400/5 border-purple-400/15 hover:border-purple-400/25',
    icon: '\u223F', // sine ∿
  },
};

// ── Relative time helper ─────────────────────────────────────────────────────
function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Knowledge item row ───────────────────────────────────────────────────────
const KnowledgeItem: React.FC<{
  item: MateKnowledgeItem;
  onDelete: (id: string) => void;
}> = ({ item, onDelete }) => {
  const style = TYPE_STYLES[item.type] ?? TYPE_STYLES.fact;
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      onDelete(item.id);
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div
      className={`group relative rounded-lg p-3 border transition-colors duration-200 ${style.bg}`}
    >
      <div className="flex items-start gap-2">
        <span className={`text-sm mt-0.5 shrink-0 ${style.accent}`}>{style.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/75 leading-relaxed">{item.content}</p>
          <span className="text-[10px] text-white/30 mt-1 block">
            {relativeTime(item.learned_at)}
          </span>
        </div>
      </div>

      {/* Delete button — visible on hover */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-white/25 hover:text-red-400 text-xs p-0.5 rounded"
        aria-label="Forget this"
        title="Forget this"
      >
        {deleting ? '\u2026' : '\u2715'}
      </button>
    </div>
  );
};

// ── Main component ───────────────────────────────────────────────────────────
export const SidePanelKnowledge: React.FC = () => {
  const { knowledge, isLoading, error, refetch, deleteItem } = useMateKnowledge();

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🧠</span>
          <h3 className="text-sm font-display font-semibold text-[var(--mate-accent)]">
            What Mate knows about you
          </h3>
        </div>
        <button
          onClick={refetch}
          className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
          title="Refresh"
        >
          ↻
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-2 py-6 justify-center">
          <div className="w-3 h-3 border border-[var(--mate-accent)]/40 border-t-[var(--mate-accent)] rounded-full animate-spin" />
          <span className="text-xs text-white/40">Loading...</span>
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="text-center py-6 space-y-2">
          <p className="text-xs text-white/40">Couldn&apos;t reach Mate&apos;s memory</p>
          <button
            onClick={refetch}
            className="text-xs text-[var(--mate-accent)] hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && knowledge.length === 0 && (
        <div className="text-center py-8 px-2 space-y-3">
          <div className="text-2xl opacity-40">🌱</div>
          <p className="text-xs text-white/40 leading-relaxed">
            Mate is still getting to know you. The more you chat, the more context Mate will
            remember.
          </p>
        </div>
      )}

      {/* Knowledge groups */}
      {!isLoading &&
        !error &&
        knowledge.map((group) => (
          <div key={group.type} className="space-y-2">
            <h4 className="text-[11px] font-display font-medium text-white/50 uppercase tracking-wider">
              {group.label}
            </h4>
            <div className="space-y-1.5">
              {group.items.map((item) => (
                <KnowledgeItem key={item.id} item={item} onDelete={deleteItem} />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
};
