import { useEffect } from 'react';
import { useRouter } from 'next/router';

const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
const isElectron = typeof window !== 'undefined' && !!(window as any).isElectron;

/**
 * Bridge hook for deep link navigation (isaapp:// protocol).
 * Listens for deep-link events from the main process and navigates accordingly.
 */
export function useDeepLinks() {
  const router = useRouter();

  useEffect(() => {
    if (!isElectron || !electronAPI) return;

    const unsub = electronAPI.on('app:deep-link', (route: string) => {
      if (route) router.push(route);
    });

    return unsub;
  }, [router]);
}
