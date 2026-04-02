/**
 * GentleNotification — Soft inline notification card for chat timeline (#122)
 *
 * Appears inline among chat messages for system events, cross-channel messages,
 * and Mate updates. Designed to be non-intrusive — no alert banners or toasts.
 *
 * Visual: muted left-border card with Mate's voice prefixes.
 * Dismissible with a fade-out animation.
 */
import React, { memo, useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GentleNotificationType = 'info' | 'update' | 'reminder' | 'channel-message';

export interface GentleNotificationProps {
  /** Notification category — controls prefix and accent colour */
  type: GentleNotificationType;
  /** Body text displayed after the prefix */
  content: string;
  /** ISO timestamp for display */
  timestamp: string;
  /** Called when the user dismisses the notification */
  onDismiss?: () => void;
  /** Optional label for the originating source (e.g. channel name) */
  source?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PREFIXES: Record<GentleNotificationType, string[]> = {
  info: ['I noticed', 'Just so you know', 'Quick note'],
  update: ['Quick update', 'Heads up', 'Just so you know'],
  reminder: ['Friendly reminder', 'Just a reminder', 'Don\'t forget'],
  'channel-message': ['Message from', 'New from', 'Incoming from'],
};

const BORDER_COLORS: Record<GentleNotificationType, string> = {
  info: 'border-slate-500/30',
  update: 'border-blue-500/30',
  reminder: 'border-amber-500/30',
  'channel-message': 'border-purple-500/30',
};

const ICON_MAP: Record<GentleNotificationType, string> = {
  info: '\u2139\uFE0F',        // information
  update: '\uD83D\uDD14',      // bell
  reminder: '\u23F0',           // alarm clock
  'channel-message': '\uD83D\uDCE8', // incoming envelope
};

function pickPrefix(type: GentleNotificationType): string {
  const options = PREFIXES[type];
  return options[Math.floor(Math.random() * options.length)];
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const GentleNotification = memo<GentleNotificationProps>(({
  type,
  content,
  timestamp,
  onDismiss,
  source,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [prefix] = useState(() => pickPrefix(type));

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    // Allow the fade-out animation to complete before calling onDismiss
    setTimeout(() => onDismiss?.(), 300);
  }, [onDismiss]);

  const borderColor = BORDER_COLORS[type];
  const icon = ICON_MAP[type];

  const prefixText = type === 'channel-message' && source
    ? `${prefix} ${source}:`
    : `${prefix}:`;

  return (
    <div
      className={`
        ml-12 my-3 max-w-[80%]
        bg-slate-800/30 border-l-2 ${borderColor} rounded-xl
        px-4 py-3
        transition-all duration-300 ease-out
        ${dismissed ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}
      `}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Icon + content */}
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="text-sm flex-shrink-0 mt-0.5">{icon}</span>
          <div className="min-w-0">
            <p className="text-sm text-white/80 leading-relaxed">
              <span className="font-medium text-white/60">{prefixText}</span>{' '}
              {content}
            </p>
            <span className="text-xs text-white/40 mt-1 block">
              {formatTime(timestamp)}
            </span>
          </div>
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-white/30 hover:text-white/60 transition-colors p-0.5 -mt-0.5"
            aria-label="Dismiss notification"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
});

GentleNotification.displayName = 'GentleNotification';
