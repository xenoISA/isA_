# isA_ Desktop

Electron wrapper for the isA_ web application.

## Prerequisites

- Node.js >= 18
- npm >= 9
- The isA_ Next.js app (parent directory)

## Development

The desktop app loads the Next.js dev server, so you need both running:

```bash
# Terminal 1 — Start the Next.js app
cd ..
npm run dev          # starts on http://localhost:4100

# Terminal 2 — Start Electron
cd desktop
npm install
npm start            # opens the Electron window pointing at :4100
```

Or from the repo root:

```bash
npm run dev           # terminal 1
npm run desktop       # terminal 2
```

## Building Distributables

```bash
# Package for the current platform (no installer)
npm run package

# Build platform installers (.dmg, .exe, .deb, etc.)
npm run make
```

Build output goes to `desktop/out/`.

## Architecture

- **`src/main.ts`** — Electron main process. Creates the BrowserWindow, sets up menus, handles single-instance lock.
- **`src/preload.ts`** — Preload script. Exposes `window.isElectron` and `window.electronAPI` via contextBridge.
- **`forge.config.ts`** — Electron Forge configuration for packaging and making installers.
- **`vite.main.config.ts`** / **`vite.preload.config.ts`** — Vite configs for bundling main and preload scripts.

## How It Works

- **Dev mode**: Loads `http://localhost:4100` (the Next.js dev server).
- **Production mode**: Loads from the bundled Next.js standalone build (to be configured in a follow-up).

The Next.js app detects it is running inside Electron via `window.isElectron` (set by the preload script) and the existing `src/utils/nativeApp.ts` detection logic.
