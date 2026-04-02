/**
 * Auth Cookie Helpers
 *
 * Utilities for cookie-based auth in production (HttpOnly cookies managed
 * by the gateway via Set-Cookie headers) and development (regular cookies
 * readable by JavaScript).
 *
 * In production the gateway sets HttpOnly cookies on `.iapro.ai` so all
 * zones (/, /console, /docs) share the session automatically. The frontend
 * only needs `credentials: 'include'` on fetch calls.
 *
 * In development (localhost) cookies are not HttpOnly, so these helpers
 * can read/clear them for debugging and fallback purposes.
 */

const AUTH_COOKIE_NAME = 'isa_access_token';
const REFRESH_COOKIE_NAME = 'isa_refresh_token';

/**
 * Returns true when the app is running in production cookie mode where
 * the gateway manages HttpOnly Set-Cookie headers. In this mode the
 * frontend cannot read the cookie value directly — it just sends
 * `credentials: 'include'` and trusts the gateway.
 */
export function isHttpOnlyCookieMode(): boolean {
  if (typeof window === 'undefined') return false;
  const domain = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN || '.iapro.ai';
  // In production the hostname will be under .iapro.ai
  return window.location.hostname.endsWith(domain.replace(/^\./, ''));
}

/**
 * Read the access token cookie (only works in dev mode where the cookie
 * is NOT HttpOnly). Returns null when HttpOnly or absent.
 */
export function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Clear auth cookies on logout by setting their expiry to the past.
 * Works for non-HttpOnly cookies (dev). For HttpOnly cookies the
 * gateway logout endpoint must clear them via Set-Cookie.
 */
export function clearAuthCookies(): void {
  if (typeof document === 'undefined') return;
  const domain = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN || '.iapro.ai';
  const expires = 'Thu, 01 Jan 1970 00:00:00 GMT';

  // Clear with domain scope (production)
  document.cookie = `${AUTH_COOKIE_NAME}=; expires=${expires}; path=/; domain=${domain}`;
  document.cookie = `${REFRESH_COOKIE_NAME}=; expires=${expires}; path=/; domain=${domain}`;

  // Clear without domain scope (localhost dev)
  document.cookie = `${AUTH_COOKIE_NAME}=; expires=${expires}; path=/`;
  document.cookie = `${REFRESH_COOKIE_NAME}=; expires=${expires}; path=/`;
}

/**
 * Return the credentials mode appropriate for the current environment.
 * - `'include'` in production so cross-origin cookies are sent to the gateway.
 * - `'include'` in development too (gateway on different port counts as
 *   cross-origin), but can be overridden via env var if needed.
 */
export function getCredentialsMode(): RequestCredentials {
  return (process.env.NEXT_PUBLIC_AUTH_CREDENTIALS_MODE as RequestCredentials) || 'include';
}
