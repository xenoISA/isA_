/**
 * useStarredSessions — Star/unstar conversations (#199)
 * Persists to localStorage. Backend persistence can be added later.
 */
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'isa_starred_sessions';

function readStarred(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function writeStarred(ids: Set<string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids])); } catch {}
}

export function useStarredSessions() {
  const [starred, setStarred] = useState<Set<string>>(readStarred);

  const toggleStar = useCallback((sessionId: string) => {
    setStarred(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      writeStarred(next);
      return next;
    });
  }, []);

  const isStarred = useCallback((sessionId: string) => starred.has(sessionId), [starred]);

  return { starred, toggleStar, isStarred };
}
