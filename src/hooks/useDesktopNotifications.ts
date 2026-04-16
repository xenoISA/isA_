import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
const isElectron = typeof window !== 'undefined' && !!(window as any).isElectron;

/**
 * Bridge hook for desktop notifications.
 * In Electron: routes to native OS notifications via IPC.
 * In browser: falls through to the browser Notification API.
 */
export function useDesktopNotifications() {
  const router = useRouter();

  // Listen for notification clicks from main process
  useEffect(() => {
    if (!isElectron || !electronAPI) return;

    const unsub = electronAPI.on('notification:click', (route: string) => {
      if (route) router.push(route);
    });

    return unsub;
  }, [router]);

  const sendNotification = useCallback((title: string, body: string, route?: string) => {
    if (isElectron && electronAPI) {
      electronAPI.send('notification:show', title, body, route);
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const n = new Notification(title, { body });
      if (route) {
        n.onclick = () => {
          window.focus();
          router.push(route);
        };
      }
    }
  }, [router]);

  return { sendNotification };
}
