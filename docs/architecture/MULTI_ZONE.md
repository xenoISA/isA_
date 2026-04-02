# Multi-Zone Architecture

The isA platform serves multiple Next.js applications under a single domain using
Next.js multi-zone routing and Apache APISIX as the edge gateway. Each zone is an
independent Next.js app with its own build, deploy, and dev server.

## Architecture

```
                    iapro.ai
                       |
               APISIX Gateway (:9080)
              /        |        \
    /*             /console/*      /docs/*
     |                |              |
  isA_ (:4100)  isA_Console (:4200)  isA_Docs (:4300)
  Main app       Developer console   Documentation
```

Each zone owns its URL prefix. APISIX strips nothing -- the prefix is part of the
app's routing, handled via Next.js `basePath`.

## Zone Configuration

| Zone         | Repo           | Port | basePath    | Notes                        |
|--------------|----------------|------|-------------|------------------------------|
| isA_         | `isA_`         | 4100 | _(none)_    | Root zone, serves `/`        |
| isA_Console  | `isA_Console`  | 4200 | `/console`  | Set in `next.config.ts`      |
| isA_Docs     | `isA_Docs`     | 4300 | `/docs`     | Set in Nextra/Next config    |

### isA_ (this repo)

No `basePath` needed. This is the default zone that handles all paths not claimed
by other zones. Surface URLs are configured in `src/config/surfaceConfig.ts`:

```ts
export const surfaceUrls = Object.freeze({
  marketing: process.env.NEXT_PUBLIC_MARKETING_URL || '/',
  app:       process.env.NEXT_PUBLIC_APP_URL       || '/app',
  console:   process.env.NEXT_PUBLIC_CONSOLE_URL   || '/console',
  docs:      process.env.NEXT_PUBLIC_DOCS_URL      || '/docs',
});
```

### isA_Console

Must set `basePath: '/console'` in `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  basePath: '/console',
  // ...
};
```

### isA_Docs

Must set `basePath: '/docs'` in the Next.js/Nextra config:

```ts
const nextConfig: NextConfig = {
  basePath: '/docs',
  // ...
};
```

## Surface Switching

In **production**, all zones share the same domain. Cross-zone links use relative
paths (`/console`, `/docs/getting-started`). The `surfaceUrls` object defaults to
these relative paths.

In **development**, each app runs on its own port. Override with env vars in
`.env.local` to use absolute URLs:

```bash
NEXT_PUBLIC_CONSOLE_URL=http://localhost:4200/console
NEXT_PUBLIC_DOCS_URL=http://localhost:4300/docs
```

The `surfaceLinks` and `docsLinks` objects in `surfaceConfig.ts` build all
cross-surface navigation from these base URLs.

## Shared Components

- **PlatformNav**: Shared navigation bar from `@isa/ui-web` renders zone-aware
  links using `surfaceUrls`.
- **SSO cookies**: Auth cookies are set on `.iapro.ai` so all zones share the
  same session. See `docs/cross-surface-auth-contract.md`.
- **Org context**: Shared via `isa_current_org_id` storage key and URL params
  (`currentOrgId`, `returnTo`, `sso`).

## Local Development

1. Start each app on its port:
   ```bash
   # Terminal 1 -- isA_
   cd isA_ && pnpm dev          # http://localhost:4100

   # Terminal 2 -- isA_Console
   cd isA_Console && pnpm dev   # http://localhost:4200

   # Terminal 3 -- isA_Docs
   cd isA_Docs && pnpm dev      # http://localhost:4300
   ```

2. Access apps directly by port, or start APISIX locally to test unified routing
   through `:9080`. See `docs/architecture/APISIX_ROUTES.md` for route config.

3. Set env vars for cross-zone linking (`.env.local`):
   ```bash
   NEXT_PUBLIC_GATEWAY_URL=http://localhost:9080
   NEXT_PUBLIC_CONSOLE_URL=http://localhost:4200/console
   NEXT_PUBLIC_DOCS_URL=http://localhost:4300/docs
   NEXT_PUBLIC_MARKETING_URL=http://localhost:4100
   ```

## Environment Variables

| Variable                       | Purpose                              | Default                  |
|--------------------------------|--------------------------------------|--------------------------|
| `NEXT_PUBLIC_GATEWAY_URL`      | APISIX gateway base URL              | `http://localhost:9080`  |
| `NEXT_PUBLIC_MARKETING_URL`    | Marketing surface base URL           | `/`                      |
| `NEXT_PUBLIC_APP_URL`          | App surface base URL                 | `/app`                   |
| `NEXT_PUBLIC_CONSOLE_URL`      | Console surface URL                  | `/console`               |
| `NEXT_PUBLIC_DOCS_URL`         | Docs surface URL                     | `/docs`                  |
| `NEXT_PUBLIC_MARKETING_HOSTS`  | Comma-separated marketing hostnames  | `www.iapro.ai,iapro.ai` |

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Console shows 404 in prod | Missing `basePath: '/console'` in isA_Console | Add basePath to `next.config.ts` |
| Docs assets 404 | Static files not prefixed with basePath | Nextra handles this automatically with basePath set |
| CORS errors between zones | APISIX not forwarding origin headers | Add CORS plugin to APISIX route config |
| Cookie not shared across zones | Cookie domain too specific | Set cookie domain to `.iapro.ai` |
| Links go to wrong port in dev | Surface URL env vars not set | Add overrides to `.env.local` |
| Gateway 502 | Upstream app not running | Start the target app on its port |
