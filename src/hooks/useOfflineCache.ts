import { useState, useEffect, useCallback } from 'react';

const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
const isElectron = typeof window !== 'undefined' && !!(window as any).isElectron;

interface CachedConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  cachedAt: string;
}

/**
 * Bridge hook for offline conversation cache.
 * Caches conversations locally so they're available without network.
 */
export function useOfflineCache() {
  const [isOffline, setIsOffline] = useState(false);
  const [cachedConversations, setCachedConversations] = useState<CachedConversationSummary[]>([]);

  // Check online status
  useEffect(() => {
    if (!isElectron || !electronAPI) return;

    const check = async () => {
      const online = await electronAPI.invoke('offline:is-online');
      setIsOffline(!online);
    };
    check();
    const interval = setInterval(check, 10_000);
    return () => clearInterval(interval);
  }, []);

  const refreshCache = useCallback(async () => {
    if (!isElectron || !electronAPI) return;
    const list = await electronAPI.invoke('offline:get-conversations');
    setCachedConversations(list ?? []);
  }, []);

  useEffect(() => { refreshCache(); }, [refreshCache]);

  const cacheConversation = useCallback(async (id: string, title: string, messages: any[]) => {
    if (!isElectron || !electronAPI) return;
    await electronAPI.invoke('offline:cache-conversation', id, title, messages);
    refreshCache();
  }, [refreshCache]);

  const getCachedConversation = useCallback(async (id: string) => {
    if (!isElectron || !electronAPI) return null;
    return electronAPI.invoke('offline:get-conversation', id);
  }, []);

  const clearCache = useCallback(async () => {
    if (!isElectron || !electronAPI) return;
    await electronAPI.invoke('offline:clear-cache');
    setCachedConversations([]);
  }, []);

  return {
    isAvailable: isElectron,
    isOffline,
    cachedConversations,
    cacheConversation,
    getCachedConversation,
    clearCache,
  };
}
