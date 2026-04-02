/**
 * AutonomousActivityCard — Gentle inline card for autonomous messages
 * in the chat timeline. Renders all autonomous source types (scheduler,
 * trigger, channel) with distinct visual treatment per source.
 */

import React, { useState } from 'react';
import type { RegularMessage, AutonomousSource } from '../../../types/chatTypes';

// ---------------------------------------------------------------------------
// Source configuration — icon, label, border color
// ---------------------------------------------------------------------------

const SOURCE_CONFIG: Record<AutonomousSource, { icon: React.ReactNode; label: string; borderColor: string }> = {
  scheduler: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    label: 'Scheduled Task',
    borderColor: 'border-l-cyan-500',
  },
  trigger: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    label: 'Trigger',
    borderColor: 'border-l-amber-500',
  },
  channel: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    label: 'Channel',
    borderColor: 'border-l-purple-500',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AutonomousActivityCardProps {
  message: RegularMessage;
  onDismiss?: (messageId: string) => void;
}

export const AutonomousActivityCard: React.FC<AutonomousActivityCardProps> = ({
  message,
  onDismiss,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const source: AutonomousSource = message.autonomousSource || 'scheduler';
  const config = SOURCE_CONFIG[source];
  const completedAt = message.completedAt || message.timestamp;

  const formattedTime = new Date(completedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Determine if content is long enough to warrant expand/collapse
  const contentLines = message.content.split('\n');
  const isLong = contentLines.length > 3 || message.content.length > 240;
  const displayContent = !expanded && isLong
    ? contentLines.slice(0, 3).join('\n').slice(0, 240) + '...'
    : message.content;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.(message.id);
  };

  return (
    <div
      className={`my-2 rounded-xl bg-slate-800/40 border border-white/5 border-l-2 ${config.borderColor} p-3 transition-all duration-200 hover:bg-slate-800/60`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-white/60">{config.icon}</span>
        <span className="text-white/70 text-xs font-semibold tracking-wide uppercase">
          {config.label}
        </span>
        <span className="text-white/30 text-xs ml-auto">{formattedTime}</span>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="text-white/20 hover:text-white/50 transition-colors ml-1 p-0.5"
          aria-label="Dismiss"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="text-white/70 text-sm whitespace-pre-wrap leading-relaxed">
        {displayContent}
      </div>

      {/* Expand / collapse toggle */}
      {isLong && (
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
};
