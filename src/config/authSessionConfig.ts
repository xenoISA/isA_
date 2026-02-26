import { appendSearchParams, surfaceLinks } from './surfaceConfig';

const getEnv = (key: string, fallback: string): string => {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : fallback;
};

const trim = (value: string | null | undefined): string => (value || '').trim();

export const ORG_CONTEXT_STORAGE_KEY = getEnv('NEXT_PUBLIC_ORG_CONTEXT_STORAGE_KEY', 'isa_current_org_id');
export const ORG_CONTEXT_QUERY_PARAM = getEnv('NEXT_PUBLIC_ORG_CONTEXT_QUERY_PARAM', 'currentOrgId');
export const RETURN_TO_QUERY_PARAM = getEnv('NEXT_PUBLIC_RETURN_TO_QUERY_PARAM', 'returnTo');
export const SSO_HINT_QUERY_PARAM = getEnv('NEXT_PUBLIC_SSO_HINT_QUERY_PARAM', 'sso');

export interface BuildConsoleEntryOptions {
  currentOrgId?: string | null;
  returnTo?: string | null;
  requestSso?: boolean;
}

export const getCurrentRelativeUrl = (): string => {
  if (typeof window === 'undefined') {
    return '/app';
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

export const getLogoutReturnToUrl = (): string => {
  const configured = getEnv('NEXT_PUBLIC_AUTH_LOGOUT_RETURN_TO', surfaceLinks.marketingHome);

  if (configured.startsWith('/')) {
    if (typeof window === 'undefined') {
      return configured;
    }
    return `${window.location.origin}${configured}`;
  }

  return configured;
};

export const getStoredOrgContextId = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = trim(window.localStorage.getItem(ORG_CONTEXT_STORAGE_KEY));
  return stored || null;
};

export const setStoredOrgContextId = (orgId: string | null | undefined): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const normalized = trim(orgId);
  if (!normalized) {
    window.localStorage.removeItem(ORG_CONTEXT_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(ORG_CONTEXT_STORAGE_KEY, normalized);
};

export const getOrgContextFromSearch = (search: string): string | null => {
  const normalized = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(normalized);
  return trim(params.get(ORG_CONTEXT_QUERY_PARAM)) || null;
};

export const consumeOrgContextFromCurrentUrl = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const currentUrl = new URL(window.location.href);
  const orgId = trim(currentUrl.searchParams.get(ORG_CONTEXT_QUERY_PARAM));

  if (!orgId) {
    return null;
  }

  currentUrl.searchParams.delete(ORG_CONTEXT_QUERY_PARAM);
  const normalizedSearch = currentUrl.searchParams.toString();
  const nextRelativeUrl = `${currentUrl.pathname}${normalizedSearch ? `?${normalizedSearch}` : ''}${currentUrl.hash}`;
  window.history.replaceState({}, '', nextRelativeUrl);

  return orgId;
};

export const buildConsoleEntryUrl = (options: BuildConsoleEntryOptions = {}): string => {
  const params = new URLSearchParams();
  const currentOrgId = trim(options.currentOrgId);
  const returnTo = trim(options.returnTo);
  const requestSso = options.requestSso !== false;

  if (currentOrgId) {
    params.set(ORG_CONTEXT_QUERY_PARAM, currentOrgId);
  }

  if (returnTo) {
    params.set(RETURN_TO_QUERY_PARAM, returnTo);
  }

  if (requestSso) {
    params.set(SSO_HINT_QUERY_PARAM, '1');
  }

  return appendSearchParams(surfaceLinks.consoleHome, params.toString());
};
