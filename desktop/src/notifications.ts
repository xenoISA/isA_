import { Notification, BrowserWindow } from 'electron';

interface NotificationOptions {
  title: string;
  body: string;
  route?: string; // Navigate to this route on click
}

// Rate limiting: max 3 notifications in 10 seconds
const recentTimestamps: number[] = [];
const MAX_PER_WINDOW = 3;
const WINDOW_MS = 10_000;
let batchedCount = 0;
let batchTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Show a native OS notification. Rate-limited to prevent flooding.
 */
export function showNotification(
  opts: NotificationOptions,
  getMainWindow: () => BrowserWindow | undefined,
): void {
  const now = Date.now();

  // Prune old timestamps
  while (recentTimestamps.length > 0 && now - recentTimestamps[0] > WINDOW_MS) {
    recentTimestamps.shift();
  }

  // Rate limit check
  if (recentTimestamps.length >= MAX_PER_WINDOW) {
    batchedCount++;
    scheduleBatchSummary(getMainWindow);
    return;
  }

  recentTimestamps.push(now);
  sendNotification(opts, getMainWindow);
}

function sendNotification(
  opts: NotificationOptions,
  getMainWindow: () => BrowserWindow | undefined,
): void {
  if (!Notification.isSupported()) return;

  const notification = new Notification({
    title: opts.title,
    body: opts.body,
    silent: false,
  });

  notification.on('click', () => {
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
      if (opts.route) {
        win.webContents.send('notification:click', opts.route);
      }
    }
  });

  notification.show();
}

function scheduleBatchSummary(getMainWindow: () => BrowserWindow | undefined): void {
  if (batchTimer) return;

  batchTimer = setTimeout(() => {
    if (batchedCount > 0) {
      sendNotification(
        {
          title: 'isA_',
          body: `${batchedCount} more notification${batchedCount > 1 ? 's' : ''} while you were away`,
        },
        getMainWindow,
      );
      batchedCount = 0;
    }
    batchTimer = null;
  }, WINDOW_MS);
}
