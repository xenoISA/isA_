import { autoUpdater, BrowserWindow } from 'electron';

let checkInterval: ReturnType<typeof setInterval> | null = null;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Initialize the auto-updater. Sends IPC events to the renderer
 * for update status changes.
 */
export function initAutoUpdater(getMainWindow: () => BrowserWindow | undefined): void {
  // autoUpdater only works with signed apps + a update server
  // For development, this is a no-op. In production, configure
  // the feed URL in forge.config.ts or via electron-updater.
  if (process.env.NODE_ENV === 'development') {
    console.log('[isA Desktop] Auto-updater disabled in development');
    return;
  }

  autoUpdater.on('checking-for-update', () => {
    sendToRenderer(getMainWindow, 'updater:status', 'checking');
  });

  autoUpdater.on('update-available', () => {
    sendToRenderer(getMainWindow, 'updater:status', 'available');
  });

  autoUpdater.on('update-not-available', () => {
    sendToRenderer(getMainWindow, 'updater:status', 'up-to-date');
  });

  autoUpdater.on('update-downloaded', () => {
    sendToRenderer(getMainWindow, 'updater:status', 'downloaded');
  });

  autoUpdater.on('error', (err) => {
    sendToRenderer(getMainWindow, 'updater:status', 'error');
    console.error('[isA Desktop] Auto-updater error:', err);
  });

  // Check on launch
  checkForUpdates();

  // Periodic check
  checkInterval = setInterval(checkForUpdates, CHECK_INTERVAL_MS);
}

export function checkForUpdates(): void {
  try {
    autoUpdater.checkForUpdates();
  } catch (err) {
    console.warn('[isA Desktop] Update check failed:', err);
  }
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall();
}

export function stopAutoUpdater(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

function sendToRenderer(getMainWindow: () => BrowserWindow | undefined, channel: string, ...args: unknown[]): void {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, ...args);
  }
}
