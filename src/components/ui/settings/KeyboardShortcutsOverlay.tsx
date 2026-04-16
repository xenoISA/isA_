/**
 * KeyboardShortcutsOverlay — Shows all available keyboard shortcuts (#198)
 */
import React from 'react';
import { APP_SHORTCUTS, formatShortcut } from '../../../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsOverlayProps {
  open: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsOverlay: React.FC<KeyboardShortcutsOverlayProps> = ({ open, onClose }) => {
  if (!open) return null;

  // Group by category
  const grouped = APP_SHORTCUTS.reduce<Record<string, typeof APP_SHORTCUTS>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[400px] max-h-[60vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4 space-y-6 overflow-y-auto">
          {Object.entries(grouped).map(([category, shortcuts]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{category}</h3>
              <div className="space-y-2">
                {shortcuts.map((s) => (
                  <div key={s.key + (s.meta ? 'm' : '') + (s.shift ? 's' : '')} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{s.description}</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-600">
                      {formatShortcut(s)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
