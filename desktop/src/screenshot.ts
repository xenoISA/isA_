import { desktopCapturer, BrowserWindow, app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR = 'isa-screenshots';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

function getScreenshotDir(): string {
  const dir = path.join(app.getPath('temp'), SCREENSHOT_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Capture the entire active screen. Returns base64 PNG and file path.
 */
export async function captureScreen(): Promise<{ path: string; base64: string }> {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1920, height: 1080 },
  });

  const source = sources[0];
  if (!source) throw new Error('No screen source available');

  const png = source.thumbnail.toPNG();
  const filename = `screen-${Date.now()}.png`;
  const filePath = path.join(getScreenshotDir(), filename);
  fs.writeFileSync(filePath, png);

  return {
    path: filePath,
    base64: png.toString('base64'),
  };
}

/**
 * Capture the current Electron window contents. Returns base64 PNG and file path.
 */
export async function captureWindow(win?: BrowserWindow): Promise<{ path: string; base64: string }> {
  const targetWin = win || BrowserWindow.getFocusedWindow();
  if (!targetWin) throw new Error('No focused window to capture');

  const image = await targetWin.webContents.capturePage();
  const png = image.toPNG();
  const filename = `window-${Date.now()}.png`;
  const filePath = path.join(getScreenshotDir(), filename);
  fs.writeFileSync(filePath, png);

  return {
    path: filePath,
    base64: png.toString('base64'),
  };
}

/**
 * Delete screenshots older than 24 hours. Call on app startup.
 */
export function cleanupOldScreenshots(): void {
  const dir = path.join(app.getPath('temp'), SCREENSHOT_DIR);
  if (!fs.existsSync(dir)) return;

  const now = Date.now();
  try {
    for (const file of fs.readdirSync(dir)) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > MAX_AGE_MS) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (err) {
    console.warn('[isA Desktop] Screenshot cleanup error:', err);
  }
}
