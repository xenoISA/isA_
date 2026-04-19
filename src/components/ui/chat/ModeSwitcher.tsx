/**
 * ModeSwitcher — Toggle between Chat, Design, and Browse modes.
 *
 * Sits above the chat input to switch the right panel content.
 * Design and Browse modes activate split layout with chat + canvas/viewport.
 *
 * @module
 */

import React from 'react';

export type AppMode = 'chat' | 'design' | 'browse';

export interface ModeSwitcherProps {
  /** Current active mode */
  activeMode: AppMode;
  /** Called when mode changes */
  onModeChange: (mode: AppMode) => void;
  /** Whether Design mode is available */
  designAvailable?: boolean;
  /** Whether Browse mode is available */
  browseAvailable?: boolean;
  /** Additional CSS class */
  className?: string;
}

const MODE_CONFIG: Array<{ mode: AppMode; label: string; icon: string }> = [
  { mode: 'chat', label: 'Chat', icon: '💬' },
  { mode: 'design', label: 'Design', icon: '🎨' },
  { mode: 'browse', label: 'Browse', icon: '🌐' },
];

export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({
  activeMode,
  onModeChange,
  designAvailable = true,
  browseAvailable = true,
  className = '',
}) => {
  const availableModes = MODE_CONFIG.filter((m) => {
    if (m.mode === 'design') return designAvailable;
    if (m.mode === 'browse') return browseAvailable;
    return true;
  });

  // Don't render if only chat mode is available
  if (availableModes.length <= 1) return null;

  return (
    <div
      className={`mode-switcher ${className}`}
      role="tablist"
      aria-label="Application mode"
      style={{
        display: 'inline-flex',
        gap: '2px',
        padding: '2px',
        borderRadius: '8px',
        background: 'var(--surface-subtle, #f3f4f6)',
        border: '1px solid var(--border-subtle, #e5e7eb)',
      }}
    >
      {availableModes.map((m) => (
        <button
          key={m.mode}
          role="tab"
          aria-selected={activeMode === m.mode}
          onClick={() => onModeChange(m.mode)}
          style={{
            padding: '4px 12px',
            borderRadius: '6px',
            border: 'none',
            background: activeMode === m.mode ? 'var(--surface, #fff)' : 'transparent',
            boxShadow: activeMode === m.mode ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: 'inherit',
            fontWeight: activeMode === m.mode ? 500 : 400,
            color: activeMode === m.mode ? 'var(--text-primary, #374151)' : 'var(--text-secondary, #6b7280)',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '13px' }}>{m.icon}</span>
          {m.label}
        </button>
      ))}
    </div>
  );
};
