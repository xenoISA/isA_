import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron';

let tray: Tray | null = null;
let currentStatus: 'online' | 'offline' | 'busy' = 'online';

interface TrayDeps {
  toggleSpotlight: () => void;
  getMainWindow: () => BrowserWindow | undefined;
}

/**
 * Create the system tray icon with context menu.
 * On macOS this appears in the menu bar; on Windows/Linux in the system tray.
 */
export function createTray(deps: TrayDeps): Tray {
  const icon = createTrayIcon('online');
  tray = new Tray(icon);
  tray.setToolTip('isA_ — Your AGI Companion');

  rebuildMenu(deps);
  return tray;
}

/**
 * Update the tray status and rebuild the menu.
 */
export function updateTrayStatus(status: 'online' | 'offline' | 'busy', deps: TrayDeps): void {
  currentStatus = status;
  if (!tray) return;
  tray.setImage(createTrayIcon(status));
  rebuildMenu(deps);
}

/**
 * Set the macOS dock badge count. Pass 0 or '' to clear.
 */
export function setDockBadge(count: number): void {
  if (process.platform !== 'darwin') return;
  app.dock?.setBadge(count > 0 ? String(count) : '');
}

// ---------- Internal ----------

function rebuildMenu(deps: TrayDeps): void {
  if (!tray) return;

  const isMac = process.platform === 'darwin';
  const statusLabel = {
    online: '● Online',
    offline: '○ Offline',
    busy: '◐ Busy',
  }[currentStatus];

  const menu = Menu.buildFromTemplate([
    {
      label: 'New Chat',
      accelerator: isMac ? 'CmdOrCtrl+N' : 'Ctrl+N',
      click: () => {
        const win = deps.getMainWindow();
        if (win) {
          if (win.isMinimized()) win.restore();
          win.focus();
        }
      },
    },
    {
      label: 'Quick Chat',
      accelerator: isMac ? 'CmdOrCtrl+Shift+Space' : 'Ctrl+Shift+Space',
      click: () => deps.toggleSpotlight(),
    },
    { type: 'separator' },
    {
      label: `Status: ${statusLabel}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        const win = deps.getMainWindow();
        if (win) {
          if (win.isMinimized()) win.restore();
          win.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit isA_',
      accelerator: isMac ? 'CmdOrCtrl+Q' : 'Ctrl+Q',
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(menu);
}

/**
 * Create a 16x16 template icon for the tray.
 * Uses a simple circle indicator — template images are auto-themed on macOS.
 */
function createTrayIcon(status: 'online' | 'offline' | 'busy'): Electron.NativeImage {
  // 16x16 PNG with a simple "iA" glyph rendered as a template image.
  // In production, replace with a proper icon from desktop/icons/
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4, 0); // RGBA

  // Draw a filled circle for the status dot
  const cx = 8, cy = 8, r = 6;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * size + x) * 4;

      if (dist <= r) {
        const alpha = status === 'offline' ? 80 : status === 'busy' ? 180 : 255;
        // Template images on macOS use alpha channel only
        canvas[idx] = 0;     // R
        canvas[idx + 1] = 0; // G
        canvas[idx + 2] = 0; // B
        canvas[idx + 3] = alpha;
      } else if (dist <= r + 1) {
        // Anti-aliased edge
        const edge = Math.max(0, 1 - (dist - r));
        const alpha = Math.round(edge * (status === 'offline' ? 80 : 255));
        canvas[idx + 3] = alpha;
      }
    }
  }

  const img = nativeImage.createFromBuffer(canvas, { width: size, height: size });
  img.setTemplateImage(true);
  return img;
}
