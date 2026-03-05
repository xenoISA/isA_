/**
 * In-memory auth token store.
 *
 * Replaces localStorage token storage to prevent XSS token theft.
 * Access tokens live only in memory; a refresh-token HttpOnly cookie
 * (set by the gateway) restores the session on page reload.
 */

let _accessToken: string | null = null;

export const authTokenStore = {
  getToken: (): string | null => _accessToken,
  setToken: (token: string | null): void => { _accessToken = token; },
  clearToken: (): void => { _accessToken = null; },
  hasToken: (): boolean => _accessToken !== null,
};
