/**
 * CommandPalette — Cmd+K search and navigation (#193)
 *
 * Design ref (docs/design/claude-ui-reference.md):
 * - width: 560px, border-radius: 12px, centered at 20vh from top
 * - Search input at top, results below with keyboard nav
 * - Backdrop: rgba(0,0,0,0.5)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GATEWAY_ENDPOINTS } from '../../../config/gatewayConfig';

interface SearchResult {
  id: string;
  title: string;
  snippet?: string;
  type: 'conversation' | 'action';
  timestamp?: string;
}

const DEFAULT_ACTIONS: SearchResult[] = [
  { id: 'new-chat', title: 'New Chat', type: 'action' },
  { id: 'settings', title: 'Settings', type: 'action' },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSelectConversation?: (sessionId: string) => void;
  onAction?: (actionId: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open, onClose, onSelectConversation, onAction,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>(DEFAULT_ACTIONS);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults(DEFAULT_ACTIONS);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Search conversations
  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(DEFAULT_ACTIONS);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${GATEWAY_ENDPOINTS.SESSIONS.SEARCH}?q=${encodeURIComponent(q)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        const sessions = (data.results || data.sessions || []).map((s: any) => ({
          id: s.session_id || s.id,
          title: s.title || s.snippet || q,
          snippet: s.snippet || s.preview,
          type: 'conversation' as const,
          timestamp: s.created_at || s.timestamp,
        }));
        setResults(sessions.length > 0 ? sessions : DEFAULT_ACTIONS);
      }
    } catch {
      // Silently fail — show default actions
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      const item = results[selectedIndex];
      if (item.type === 'conversation') onSelectConversation?.(item.id);
      else onAction?.(item.id);
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center pt-[20vh]" onKeyDown={handleKeyDown}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Palette */}
      <div className="relative w-[560px] max-h-[400px] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center border-b border-gray-200 dark:border-gray-700">
          <svg className="w-5 h-5 text-gray-400 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="Search conversations..."
            className="flex-1 px-4 py-4 text-base bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
          />
          {loading && (
            <div className="w-4 h-4 mr-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          )}
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-[320px]">
          {results.map((item, i) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.type === 'conversation') onSelectConversation?.(item.id);
                else onAction?.(item.id);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                i === selectedIndex
                  ? 'bg-gray-100 dark:bg-white/10'
                  : 'hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              {/* Icon */}
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                {item.type === 'conversation' ? (
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.title}</div>
                {item.snippet && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.snippet}</div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-4 text-xs text-gray-400">
          <span><kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">↑↓</kbd> navigate</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">↵</kbd> select</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
};
