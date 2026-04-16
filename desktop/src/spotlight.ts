import { BrowserWindow, screen } from 'electron';
import path from 'node:path';

let spotlightWindow: BrowserWindow | null = null;

const DEV_URL = 'http://localhost:4100/spotlight';
const IS_DEV = !require('electron').app.isPackaged;
const isMac = process.platform === 'darwin';

/**
 * Create or toggle the spotlight window — a compact, floating Mate input
 * that appears centered on the active screen.
 */
export function toggleSpotlight(preloadPath: string): void {
  if (spotlightWindow && !spotlightWindow.isDestroyed()) {
    if (spotlightWindow.isVisible()) {
      spotlightWindow.hide();
    } else {
      showSpotlight();
    }
    return;
  }

  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const { width: screenW, height: screenH } = display.workAreaSize;
  const { x: screenX, y: screenY } = display.workArea;
  const winW = 680;
  const winH = 72;

  spotlightWindow = new BrowserWindow({
    width: winW,
    height: winH,
    x: screenX + Math.round((screenW - winW) / 2),
    y: screenY + Math.round(screenH * 0.25),
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    hasShadow: true,
    vibrancy: isMac ? 'under-window' : undefined,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (IS_DEV) {
    spotlightWindow.loadURL(DEV_URL);
  } else {
    const prodIndex = path.join(__dirname, '..', 'renderer', 'spotlight.html');
    spotlightWindow.loadFile(prodIndex).catch(() => {
      spotlightWindow?.loadURL(DEV_URL);
    });
  }

  spotlightWindow.on('blur', () => {
    spotlightWindow?.hide();
  });

  spotlightWindow.on('closed', () => {
    spotlightWindow = null;
  });

  spotlightWindow.once('ready-to-show', () => {
    showSpotlight();
  });
}

function showSpotlight(): void {
  if (!spotlightWindow || spotlightWindow.isDestroyed()) return;

  // Re-center on the active display each time
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const { width: screenW } = display.workAreaSize;
  const { x: screenX, y: screenY } = display.workArea;
  const [winW] = spotlightWindow.getSize();
  const screenH = display.workAreaSize.height;

  spotlightWindow.setPosition(
    screenX + Math.round((screenW - winW) / 2),
    screenY + Math.round(screenH * 0.25),
  );
  spotlightWindow.show();
  spotlightWindow.focus();
}

export function hideSpotlight(): void {
  spotlightWindow?.hide();
}

export function resizeSpotlight(height: number): void {
  if (!spotlightWindow || spotlightWindow.isDestroyed()) return;
  const [w] = spotlightWindow.getSize();
  spotlightWindow.setSize(w, Math.min(height, 520));
}

export function getSpotlightWindow(): BrowserWindow | null {
  return spotlightWindow;
}
