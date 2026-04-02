/**
 * ============================================================================
 * MatePresenceIndicator — Compact presence widget for Mate status
 * ============================================================================
 *
 * Shows a small gradient dot with tooltip on hover:
 *   - Green pulse (animate-mate-breathe) when online+idle
 *   - Amber faster pulse when working on autonomous tasks
 *   - Gray when offline
 */

import React, { useState } from 'react';
import { useMatePresence } from '../../../hooks/useMatePresence';

export const MatePresenceIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isOnline, status, channels, isWorking, error } = useMatePresence();
  const [showTooltip, setShowTooltip] = useState(false);

  // Dot color and animation
  const dotColor = !isOnline
    ? 'bg-gray-500'
    : isWorking
      ? 'bg-amber-400'
      : 'bg-green-400';

  const dotAnimation = !isOnline
    ? ''
    : isWorking
      ? 'animate-pulse'
      : 'animate-mate-breathe';

  // Status text for tooltip
  const statusText = !isOnline
    ? 'Mate is offline'
    : isWorking
      ? 'Mate is working'
      : 'Mate is online';

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Presence dot */}
      <div className="relative flex items-center justify-center w-5 h-5">
        {/* Glow ring for online states */}
        {isOnline && (
          <div
            className={`absolute inset-0 rounded-full opacity-30 ${dotColor} ${dotAnimation}`}
          />
        )}
        {/* Core dot */}
        <div
          className={`relative w-2.5 h-2.5 rounded-full ${dotColor} ${dotAnimation}`}
          style={isOnline ? { boxShadow: `0 0 6px ${isWorking ? '#fbbf24' : '#4ade80'}` } : undefined}
        />
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 pointer-events-none">
          <div className="bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white shadow-xl whitespace-nowrap">
            <p className="font-semibold text-[var(--mate-accent)]">{statusText}</p>
            {isOnline && status !== 'healthy' && (
              <p className="mt-0.5 text-white/50">Status: {status}</p>
            )}
            {channels.length > 0 && (
              <p className="mt-0.5 text-white/50">
                Active on {channels.join(', ')}
              </p>
            )}
            {!isOnline && error && (
              <p className="mt-0.5 text-red-400/70 max-w-[200px] truncate">{error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
