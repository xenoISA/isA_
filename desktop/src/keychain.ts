import { safeStorage, app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const TOKEN_FILE = 'auth.enc';

function getTokenPath(): string {
  return path.join(app.getPath('userData'), TOKEN_FILE);
}

/**
 * Save a refresh token encrypted via the OS keychain (safeStorage).
 * On macOS uses Keychain, on Windows uses DPAPI, on Linux uses Secret Service.
 */
export function saveToken(token: string): boolean {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('[isA Desktop] safeStorage not available — token not persisted');
    return false;
  }

  try {
    const encrypted = safeStorage.encryptString(token);
    fs.writeFileSync(getTokenPath(), encrypted);
    return true;
  } catch (err) {
    console.error('[isA Desktop] Failed to save token:', err);
    return false;
  }
}

/**
 * Load the stored refresh token. Returns null if not available.
 */
export function loadToken(): string | null {
  if (!safeStorage.isEncryptionAvailable()) {
    return null;
  }

  const tokenPath = getTokenPath();
  if (!fs.existsSync(tokenPath)) {
    return null;
  }

  try {
    const encrypted = fs.readFileSync(tokenPath);
    return safeStorage.decryptString(encrypted);
  } catch (err) {
    console.error('[isA Desktop] Failed to load token:', err);
    return null;
  }
}

/**
 * Clear the stored token (logout).
 */
export function clearToken(): boolean {
  const tokenPath = getTokenPath();
  try {
    if (fs.existsSync(tokenPath)) {
      fs.unlinkSync(tokenPath);
    }
    return true;
  } catch (err) {
    console.error('[isA Desktop] Failed to clear token:', err);
    return false;
  }
}
