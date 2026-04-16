import { Html, Head, Main, NextScript } from 'next/document'

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
      </Head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}