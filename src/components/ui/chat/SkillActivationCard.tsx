/**
 * SkillActivationCard — Inline card for widget/skill activation in chat (#123)
 *
 * When a widget (now called "skill" in the user-facing layer) is triggered from
 * conversation, this card renders inline to show:
 *   - "Mate is using [skill name]..." with skill icon
 *   - Progress indicator while executing
 *   - Compact result preview with "Expand" to open full widget panel
 *
 * Statuses:
 *   activating  -> pulsing indicator, conversational prefix shown
 *   running     -> animated progress bar
 *   completed   -> result summary with optional expand button
 *   error       -> gentle error message
 */
import React, { memo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SkillActivationStatus = 'activating' | 'running' | 'completed' | 'error';

export interface SkillActivationCardProps {
  /** Plugin/skill id (e.g. 'dream') */
  skillId: string;
  /** Human-readable label (e.g. "Image Generation") */
  skillLabel: string;
  /** Emoji or icon for the skill */
  icon: string;
  /** Current execution status */
  status: SkillActivationStatus;
  /** Optional result preview (rendered when status === 'completed') */
  result?: React.ReactNode;
  /** Called when the user clicks "Expand" to open the full widget panel */
  onExpand?: () => void;
  /** Optional error message when status === 'error' */
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const PulsingDots = () => (
  <div className="flex space-x-1 items-center">
    <div className="w-1.5 h-1.5 rounded-full bg-[var(--mate-accent,#7c8cf5)] animate-pulse" />
    <div className="w-1.5 h-1.5 rounded-full bg-[var(--mate-accent,#7c8cf5)] animate-pulse delay-75" />
    <div className="w-1.5 h-1.5 rounded-full bg-[var(--mate-accent,#7c8cf5)] animate-pulse delay-150" />
  </div>
);

const ProgressBar = () => (
  <div className="mt-2 h-1 w-full rounded-full bg-white/10 overflow-hidden">
    <div
      className="h-full rounded-full bg-gradient-to-r from-[var(--mate-accent,#7c8cf5)] to-purple-400 animate-skill-progress"
      style={{
        // CSS animation defined inline as a keyframe fallback
        animation: 'skill-progress-slide 1.5s ease-in-out infinite',
      }}
    />
    {/* Keyframe injection — safe for SSR because it's inside the component tree */}
    <style>{`
      @keyframes skill-progress-slide {
        0%   { width: 15%; margin-left: 0; }
        50%  { width: 40%; margin-left: 30%; }
        100% { width: 15%; margin-left: 85%; }
      }
    `}</style>
  </div>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SkillActivationCard = memo<SkillActivationCardProps>(({
  skillId,
  skillLabel,
  icon,
  status,
  result,
  onExpand,
  errorMessage,
}) => {
  const isActive = status === 'activating' || status === 'running';
  const isDone = status === 'completed';
  const isError = status === 'error';

  const statusText = (() => {
    switch (status) {
      case 'activating':
        return `Mate is activating ${skillLabel}...`;
      case 'running':
        return `Mate is using ${skillLabel}...`;
      case 'completed':
        return `${skillLabel} complete`;
      case 'error':
        return `${skillLabel} encountered an issue`;
    }
  })();

  return (
    <div
      className={`
        my-3 ml-12 rounded-xl border overflow-hidden transition-all duration-300
        ${isActive
          ? 'border-[var(--mate-accent,#7c8cf5)]/30 bg-[var(--mate-accent,#7c8cf5)]/5'
          : isDone
            ? 'border-green-500/20 bg-green-500/5'
            : 'border-red-500/20 bg-red-500/5'
        }
      `}
      style={{
        borderLeftWidth: 3,
        borderLeftColor: isActive
          ? 'var(--mate-accent, #7c8cf5)'
          : isDone
            ? 'rgba(34,197,94,0.5)'
            : 'rgba(239,68,68,0.5)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <span className="text-base flex-shrink-0">{icon}</span>
        <span className="text-sm font-medium text-white/80">{statusText}</span>
        {isActive && <PulsingDots />}
        {isDone && (
          <svg className="w-4 h-4 text-green-400 flex-shrink-0" viewBox="0 0 16 16" fill="none">
            <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      {/* Progress bar for running state */}
      {status === 'running' && (
        <div className="px-4 pb-3">
          <ProgressBar />
        </div>
      )}

      {/* Result preview for completed state */}
      {isDone && result && (
        <div className="px-4 pb-3 text-sm text-white/70 leading-relaxed">
          {result}
        </div>
      )}

      {/* Error message */}
      {isError && errorMessage && (
        <div className="px-4 pb-3 text-sm text-red-300/70 leading-relaxed">
          {errorMessage}
        </div>
      )}

      {/* Expand button — opens full widget panel */}
      {isDone && onExpand && (
        <button
          onClick={onExpand}
          className="w-full px-4 py-2 text-xs text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors border-t border-white/5 text-left"
        >
          Expand full view
        </button>
      )}
    </div>
  );
});

SkillActivationCard.displayName = 'SkillActivationCard';
