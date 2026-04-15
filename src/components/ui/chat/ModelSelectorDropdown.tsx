/**
 * ModelSelectorDropdown — Claude-style model picker for chat input (#194)
 *
 * Design ref (docs/design/claude-ui-reference.md):
 * - Trigger: model name + chevron-down, subtle button
 * - Dropdown ~320px: model name (bold) + description (muted), checkmark on selected
 */
import React, { useState, useRef, useEffect } from 'react';
import { useModelSelection, AvailableModel } from '../../../hooks/useModelSelection';

function modelDescription(m: AvailableModel): string {
  const caps: string[] = [];
  if (m.capabilities.thinking) caps.push('Thinking');
  if (m.capabilities.vision) caps.push('Vision');
  if (m.capabilities.code) caps.push('Code');
  return caps.length ? caps.join(' · ') : m.provider;
}

export const ModelSelectorDropdown: React.FC = () => {
  const { models, selectedModel, selectModel, loading } = useModelSelection();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (loading || models.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-150"
      >
        {selectedModel?.name || 'Select model'}
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          <div className="p-1">
            {models.map((m) => (
              <button
                key={m.id}
                onClick={() => { selectModel(m.id); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors duration-150 ${
                  m.id === selectedModel?.id
                    ? 'bg-gray-50 dark:bg-white/5'
                    : 'hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{m.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{modelDescription(m)}</div>
                </div>
                {m.id === selectedModel?.id && (
                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
