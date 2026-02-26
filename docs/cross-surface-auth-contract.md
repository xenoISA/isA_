# Cross-Surface Auth and Session Contract

This document defines how `isA_` (app entry) and `isA_Console` share authentication and organization context.

## Auth and Session Model

- Auth provider: shared Auth0 tenant/client across both surfaces.
- Login behavior: each surface uses redirect-based Auth0 login with `appState.returnTo` so users return to their original route after authentication.
- Logout behavior: both surfaces must call Auth0 logout and clear local session state. `isA_` uses `NEXT_PUBLIC_AUTH_LOGOUT_RETURN_TO` as the post-logout destination.
- SSO expectation: when a user already has an active Auth0 session, navigation between app and console should not require re-entering credentials.

## Organization Context Contract

- Storage key: `isa_current_org_id` (configurable via `NEXT_PUBLIC_ORG_CONTEXT_STORAGE_KEY`).
- Handoff query parameter: `currentOrgId` (configurable via `NEXT_PUBLIC_ORG_CONTEXT_QUERY_PARAM`).
- Return navigation query parameter: `returnTo` (configurable via `NEXT_PUBLIC_RETURN_TO_QUERY_PARAM`).
- Optional SSO hint query parameter: `sso=1` (configurable via `NEXT_PUBLIC_SSO_HINT_QUERY_PARAM`).

When moving from app to console, `isA_` appends `currentOrgId` and `returnTo` so console can restore the same organization scope and provide a path back.

## Security Expectations

- Token storage:
  - Auth0 SDK refresh/access token cache is client-side (`localstorage`) in `isA_`.
  - Organization scope (`isa_current_org_id`) is non-sensitive contextual metadata only.
- Cookies/session:
  - Auth0 session cookie must be configured with secure defaults (`Secure`, `HttpOnly`, `SameSite=Lax` or stricter depending on domain strategy).
- Expiration and renewal:
  - Access tokens are short-lived and renewed through Auth0 SDK refresh flow.
  - Missing/invalid refresh token should trigger interactive login.
- Invalidation:
  - Logout must clear local session state and invoke Auth0 logout endpoint, invalidating cross-surface SSO session.

## Required Env Vars

- `NEXT_PUBLIC_ORG_CONTEXT_STORAGE_KEY`
- `NEXT_PUBLIC_ORG_CONTEXT_QUERY_PARAM`
- `NEXT_PUBLIC_RETURN_TO_QUERY_PARAM`
- `NEXT_PUBLIC_SSO_HINT_QUERY_PARAM`
- `NEXT_PUBLIC_AUTH_LOGOUT_RETURN_TO`
