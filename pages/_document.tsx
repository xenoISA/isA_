import { Html, Head, Main, NextScript } from 'next/document'

/**
 * Extract origin from a potentially full URL (e.g., "https://mate.example.com/v1")
 * or return null if it's a relative/invalid value. Used for <link rel="preconnect">
 * hints to warm TCP+TLS before any JS runs (#279).
 */
function originOf(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

// Resource-hint origins — inlined at build time via NEXT_PUBLIC_* env vars.
// Harmless when the connection is already warmed by HTTP/2 coalescing.
const MATE_ORIGIN = originOf(process.env.NEXT_PUBLIC_MATE_URL);
const GATEWAY_ORIGIN = originOf(process.env.NEXT_PUBLIC_GATEWAY_URL);

/**
 * Inline script that runs before React hydration to prevent theme FOUC.
 * Reads the stored preference from localStorage and applies the correct
 * class/attribute so the first paint matches the user's preference.
 */
const themeInitScript = `
(function() {
  try {
    var pref = localStorage.getItem('theme');
    var resolved = pref;
    if (!pref || pref === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    var d = document.documentElement;
    if (resolved === 'dark') {
      d.classList.add('dark');
      d.style.colorScheme = 'dark';
    } else {
      d.classList.remove('dark');
      d.setAttribute('data-theme', 'light');
      d.style.colorScheme = 'light';
    }
  } catch(e) {}
  // Detect Electron and set data attribute + titlebar CSS variable
  try {
    if (window.isElectron || window.electronAPI || navigator.userAgent.includes('Electron')) {
      d.setAttribute('data-electron', 'true');
      var isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      d.style.setProperty('--electron-titlebar-height', isMac ? '38px' : '0px');
    }
  } catch(e2) {}
})();
`;

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <meta charSet="utf-8" />
        {/* Resource hints to warm TCP+TLS to the Mate/Gateway origins before JS runs (#279).
            crossOrigin="use-credentials" because the SSE chat request is credentialed. */}
        {MATE_ORIGIN && (
          <>
            <link rel="preconnect" href={MATE_ORIGIN} crossOrigin="use-credentials" />
            <link rel="dns-prefetch" href={MATE_ORIGIN} />
          </>
        )}
        {GATEWAY_ORIGIN && GATEWAY_ORIGIN !== MATE_ORIGIN && (
          <>
            <link rel="preconnect" href={GATEWAY_ORIGIN} crossOrigin="use-credentials" />
            <link rel="dns-prefetch" href={GATEWAY_ORIGIN} />
          </>
        )}
      </Head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}