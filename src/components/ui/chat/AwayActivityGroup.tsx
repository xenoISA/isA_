/**
 * AwayActivityGroup — "While you were away" collapsible group that wraps
 * multiple consecutive autonomous messages. Shown when 2+ autonomous
 * messages appear without user messages in between.
 */

import React, { useState } from 'react';
import type { RegularMessage, AutonomousSource } from '../../../types/chatTypes';
import { AutonomousActivityCard } from './AutonomousActivityCard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a short human-readable summary of the grouped messages. */
function buildSummary(messages: RegularMessage[]): string {
  const counts: Record<AutonomousSource, number> = {
    scheduler: 0,
    trigger: 0,
    channel: 0,
  };

  for (const msg of messages) {
    const src = msg.autonomousSource || 'scheduler';
    counts[src]++;
  }

  const parts: string[] = [];
  if (counts.scheduler > 0) {
    parts.push(`${counts.scheduler} task${counts.scheduler > 1 ? 's' : ''} completed`);
  }
  if (counts.trigger > 0) {
    parts.push(`${counts.trigger} trigger${counts.trigger > 1 ? 's' : ''} fired`);
  }
  if (counts.channel > 0) {
    parts.push(`${counts.channel} channel message${counts.channel > 1 ? 's' : ''}`);
  }

  return parts.join(', ');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AwayActivityGroupProps {
  messages: RegularMessage[];
  onDismissMessage?: (messageId: string) => void;
}

export const AwayActivityGroup: React.FC<AwayActivityGroupProps> = ({
  messages,
  onDismissMessage,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (messages.length === 0) return null;

  const summary = buildSummary(messages);

  return (
    <div className="my-4">
      {/* Header */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center gap-2 group"
      >
        {/* Decorative line */}
        <div className="flex-1 h-px bg-white/10" />

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-white/10 transition-colors group-hover:bg-slate-800/70">
          <svg
            className="w-3.5 h-3.5 text-white/50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>

          <span className="text-xs font-medium text-white/60">While you were away</span>

          {/* Count badge */}
          <span className="text-[10px] font-semibold text-white/80 bg-white/10 rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
            {messages.length}
          </span>

          {/* Chevron */}
          <svg
            className={`w-3 h-3 text-white/40 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <div className="flex-1 h-px bg-white/10" />
      </button>

      {/* Collapsed summary */}
      {!expanded && (
        <p className="text-center text-xs text-white/40 mt-1.5">
          {summary}
        </p>
      )}

      {/* Expanded: individual cards */}
      {expanded && (
        <div className="mt-2 space-y-1">
          {messages.map((msg) => (
            <AutonomousActivityCard
              key={msg.id}
              message={msg}
              onDismiss={onDismissMessage}
            />
          ))}
        </div>
      )}
    </div>
  );
};
