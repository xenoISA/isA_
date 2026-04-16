/**
 * useKeyboardShortcuts — Global keyboard shortcut system (#198)
 *
 * Registers shortcuts: Cmd+K (search), Cmd+, (settings), Cmd+N (new chat), ? (help)
 */
import { useEffect, useCallback } from 'react';

export interface ShortcutDef {
  key: string;
  meta?: boolean;
  shift?: boolean;
  description: string;
  category: string;
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutDef[]) {
  const handler = useCallback((e: KeyboardEvent) => {
    // Don't fire in input/textarea unless it's a meta combo
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    if (isInput && !e.metaKey && !e.ctrlKey) return;

    for (const s of shortcuts) {
      const metaMatch = s.meta ? (e.metaKey || e.ctrlKey) : (!e.metaKey && !e.ctrlKey);
      const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;
      if (e.key === s.key && metaMatch && shiftMatch) {
        e.preventDefault();
        s.action();
        return;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handler]);
}

/** All registered shortcuts for display in help overlay */
export const APP_SHORTCUTS: Omit<ShortcutDef, 'action'>[] = [
  { key: 'k', meta: true, description: 'Search conversations', category: 'Navigation' },
  { key: ',', meta: true, description: 'Open settings', category: 'Navigation' },
  { key: 'n', meta: true, description: 'New chat', category: 'Chat' },
  { key: '?', description: 'Show keyboard shortcuts', category: 'Help' },
];

export function formatShortcut(s: Omit<ShortcutDef, 'action'>): string {
  const parts: string[] = [];
  if (s.meta) parts.push('⌘');
  if (s.shift) parts.push('⇧');
  parts.push(s.key.toUpperCase());
  return parts.join('');
}
