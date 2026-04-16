import { useState, useEffect, useCallback } from 'react';

const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
const isElectron = typeof window !== 'undefined' && !!(window as any).isElectron;

type ClipboardContentType = 'code' | 'url' | 'text' | 'image' | 'empty';

interface ClipboardEvent {
  type: ClipboardContentType;
  text?: string;
  imageBase64?: string;
}

/**
 * Bridge hook for clipboard intelligence.
 * Watches clipboard changes and provides context-aware content type detection.
 * Off by default for privacy — call `enable()` to start watching.
 */
export function useClipboardIntelligence() {
  const [lastClipboard, setLastClipboard] = useState<ClipboardEvent | null>(null);
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    if (!isElectron || !electronAPI) return;

    const unsub = electronAPI.on('clipboard:changed', (event: ClipboardEvent) => {
      setLastClipboard(event);
    });

    return unsub;
  }, []);

  const enable = useCallback(() => {
    if (!isElectron || !electronAPI) return;
    electronAPI.send('clipboard:start-watch');
    setWatching(true);
  }, []);

  const disable = useCallback(() => {
    if (!isElectron || !electronAPI) return;
    electronAPI.send('clipboard:stop-watch');
    setWatching(false);
    setLastClipboard(null);
  }, []);

  const getContent = useCallback(async (): Promise<ClipboardEvent | null> => {
    if (!isElectron || !electronAPI) return null;
    return electronAPI.invoke('clipboard:get-content');
  }, []);

  return {
    isAvailable: isElectron,
    watching,
    lastClipboard,
    enable,
    disable,
    getContent,
  };
}
