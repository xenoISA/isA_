import { useState, useEffect, useCallback } from 'react';

const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
const isElectron = typeof window !== 'undefined' && !!(window as any).isElectron;

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloaded' | 'up-to-date' | 'error';

/**
 * Bridge hook for Electron auto-updater.
 * Tracks update status and provides manual check/install triggers.
 */
export function useAutoUpdater() {
  const [status, setStatus] = useState<UpdateStatus>('idle');

  useEffect(() => {
    if (!isElectron || !electronAPI) return;

    const unsub = electronAPI.on('updater:status', (newStatus: UpdateStatus) => {
      setStatus(newStatus);
    });

    return unsub;
  }, []);

  const checkForUpdates = useCallback(() => {
    if (!isElectron || !electronAPI) return;
    electronAPI.send('updater:check-now');
  }, []);

  const quitAndInstall = useCallback(() => {
    if (!isElectron || !electronAPI) return;
    electronAPI.send('updater:quit-and-install');
  }, []);

  return {
    isAvailable: isElectron,
    status,
    checkForUpdates,
    quitAndInstall,
    hasUpdate: status === 'available' || status === 'downloaded',
  };
}
