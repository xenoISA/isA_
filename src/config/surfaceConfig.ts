/**
 * Cross-surface URL and host configuration.
 *
 * This keeps entry-point routing and cross-app links centralized so
 * marketing/app/console/docs can be changed via env vars without code edits.
 */

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const normalizeHost = (host: string): string => host.split(':')[0].trim().toLowerCase();

const getEnv = (key: string, fallback: string): string => {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : fallback;
};

const parseHostCsv = (value: string, fallback: string[]): Set<string> => {
  const parsed = value
    .split(',')
    .map((host) => normalizeHost(host))
    .filter(Boolean);

  const hostnames = parsed.length > 0 ? parsed : fallback.map((host) => normalizeHost(host));
  return new Set(hostnames);
};

export const isAbsoluteUrl = (value: string): boolean => ABSOLUTE_URL_PATTERN.test(value);

export const extractHostname = (hostOrUrl: string): string => {
  if (!hostOrUrl) return '';

  if (isAbsoluteUrl(hostOrUrl)) {
    try {
      return normalizeHost(new URL(hostOrUrl).hostname);
    } catch {
      return '';
    }
  }

  return normalizeHost(hostOrUrl);
};

const DEFAULT_MARKETING_HOSTS = ['www.iapro.ai', 'iapro.ai', 'localhost', '127.0.0.1'];

const marketingHostSet = parseHostCsv(
  getEnv('NEXT_PUBLIC_MARKETING_HOSTS', DEFAULT_MARKETING_HOSTS.join(',')),
  DEFAULT_MARKETING_HOSTS
);

export const isMarketingHostname = (hostname: string): boolean => marketingHostSet.has(extractHostname(hostname));

export const getMarketingHostnames = (): string[] => Array.from(marketingHostSet);

export const surfaceUrls = Object.freeze({
  marketing: trimTrailingSlash(getEnv('NEXT_PUBLIC_MARKETING_URL', 'http://localhost:5173')),
  app: trimTrailingSlash(getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:5173/app')),
  appDashboard: trimTrailingSlash(
    getEnv('NEXT_PUBLIC_APP_DASHBOARD_URL', getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:5173/app'))
  ),
  console: trimTrailingSlash(getEnv('NEXT_PUBLIC_CONSOLE_URL', 'http://localhost:5174')),
  docs: trimTrailingSlash(getEnv('NEXT_PUBLIC_DOCS_URL', 'http://localhost:3001')),
});

const appendPath = (base: string, path: string): string => {
  if (!path) return base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!isAbsoluteUrl(base)) {
    return `${trimTrailingSlash(base)}${normalizedPath}`;
  }

  const url = new URL(base);
  const basePath = url.pathname.replace(/\/+$/, '');
  url.pathname = `${basePath}${normalizedPath}`.replace(/\/{2,}/g, '/');
  return url.toString();
};

export const appendSearchParams = (url: string, search: string): string => {
  if (!search) return url;
  const normalized = search.startsWith('?') ? search.slice(1) : search;
  if (!normalized) return url;

  if (!isAbsoluteUrl(url)) {
    return `${url}${url.includes('?') ? '&' : '?'}${normalized}`;
  }

  const absoluteUrl = new URL(url);
  const params = new URLSearchParams(normalized);
  params.forEach((value, key) => absoluteUrl.searchParams.set(key, value));
  return absoluteUrl.toString();
};

export const surfaceLinks = Object.freeze({
  marketingHome: appendPath(surfaceUrls.marketing, '/home'),
  marketingPricing: appendPath(surfaceUrls.marketing, '/pricing'),
  marketingEnterprise: appendPath(surfaceUrls.marketing, '/enterprise'),
  appEntry: surfaceUrls.app,
  appDashboard: surfaceUrls.appDashboard,
  consoleHome: surfaceUrls.console,
  docsHome: surfaceUrls.docs,
});
