/**
 * DelegationCard — inline progress card for Mate team delegation.
 *
 * Shows 3 states:
 *   - delegating: "Asking the [team] to help..." with pulsing bar
 *   - working:    "[team] is working on it..." with progress animation
 *   - completed / failed: "[team] Done / Failed" (static)
 */
import React, { memo, useState } from 'react';
import { DelegationState } from '../../../types/chatTypes';
import { DELEGATION_TEAMS } from '../../../constants/delegationTeams';

export interface DelegationCardProps {
  delegation: DelegationState;
}

export const DelegationCard = memo<DelegationCardProps>(({ delegation }) => {
  const [expanded, setExpanded] = useState(false);

  const team = DELEGATION_TEAMS[delegation.teamId];
  if (!team) return null;

  const isActive = delegation.status === 'delegating' || delegation.status === 'working';
  const isDone = delegation.status === 'completed';
  const isFailed = delegation.status === 'failed';

  const statusText = (() => {
    switch (delegation.status) {
      case 'delegating':
        return `Asking the ${team.label} to help...`;
      case 'working':
        return `${team.label} is working on it...`;
      case 'completed':
        return `${team.label} \u2713 Done`;
      case 'failed':
        return `${team.label} \u2717 Failed`;
    }
  })();

  return (
    <div
      className="my-3 ml-12 rounded-xl border border-white/10 overflow-hidden transition-all duration-300"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: team.color,
        background: 'rgba(255, 255, 255, 0.04)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => (isDone || isFailed) && setExpanded((e) => !e)}
      >
        {/* Team icon */}
        <span className="text-lg flex-shrink-0">{team.icon}</span>

        {/* Status text */}
        <span className="text-sm font-medium text-white/90 flex-1">
          {statusText}
        </span>

        {/* Expand chevron for completed / failed */}
        {(isDone || isFailed) && (
          <svg
            className={`w-4 h-4 text-white/50 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>

      {/* Animated progress bar for active states */}
      {isActive && (
        <div className="h-0.5 w-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div
            className="h-full animate-pulse"
            style={{
              width: delegation.status === 'delegating' ? '40%' : '70%',
              background: `linear-gradient(90deg, ${team.color}00, ${team.color}, ${team.color}00)`,
              animation: 'delegation-slide 1.8s ease-in-out infinite',
            }}
          />
        </div>
      )}

      {/* Expandable detail section */}
      {expanded && (isDone || isFailed) && (
        <div className="px-4 pb-3 pt-1 text-xs text-white/50 border-t border-white/5">
          {delegation.error && (
            <p className="text-red-400/80">{delegation.error}</p>
          )}
          {delegation.result != null && !delegation.error ? (
            <pre className="whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
              {typeof delegation.result === 'string'
                ? delegation.result
                : JSON.stringify(delegation.result, null, 2)}
            </pre>
          ) : null}
          {delegation.result == null && !delegation.error && (
            <p>Completed with no output.</p>
          )}
        </div>
      )}

      {/* Inline keyframes for the sliding animation */}
      <style>{`
        @keyframes delegation-slide {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(150%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
});

DelegationCard.displayName = 'DelegationCard';
