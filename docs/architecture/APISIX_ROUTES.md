# APISIX Route Configuration

Apache APISIX serves as the edge gateway for the isA platform, routing requests
to the correct upstream application based on URL prefix.

## Route Definitions

### Zone Routes (Multi-Zone)

These routes implement multi-zone routing -- each Next.js app owns a URL prefix.

```yaml
# isA_Console -- developer console
routes:
  - uri: /console/*
    name: isa-console
    upstream:
      type: roundrobin
      nodes:
        "127.0.0.1:4200": 1
    plugins:
      proxy-rewrite:
        regex_uri: ["^/console/(.*)", "/console/$1"]

  # isA_Docs -- documentation site
  - uri: /docs/*
    name: isa-docs
    upstream:
      type: roundrobin
      nodes:
        "127.0.0.1:4300": 1
    plugins:
      proxy-rewrite:
        regex_uri: ["^/docs/(.*)", "/docs/$1"]

  # isA_ -- main app (default/catch-all, lowest priority)
  - uri: /*
    name: isa-main
    priority: -1
    upstream:
      type: roundrobin
      nodes:
        "127.0.0.1:4100": 1
```

The `/console/*` and `/docs/*` routes match first due to higher specificity.
The catch-all `/*` route has `priority: -1` so it only handles unmatched paths.

Note: `proxy-rewrite` preserves the prefix because each app expects it (via
`basePath`). The URI is forwarded as-is.

### API Routes (Backend Services)

Backend microservices are routed under `/api/v1/*`. These are defined separately
from the zone routes. See `src/config/gatewayConfig.ts` for the full service map.

```yaml
routes:
  # Agent service
  - uri: /api/v1/agents/*
    name: isa-agents
    upstream:
      nodes:
        "127.0.0.1:8080": 1

  # MCP tool service
  - uri: /api/v1/mcp/*
    name: isa-mcp
    upstream:
      nodes:
        "127.0.0.1:8081": 1

  # Auth service
  - uri: /api/v1/auth/*
    name: isa-auth
    upstream:
      nodes:
        "127.0.0.1:8202": 1

  # Account service
  - uri: /api/v1/accounts/*
    name: isa-accounts
    upstream:
      nodes:
        "127.0.0.1:8201": 1

  # Session service
  - uri: /api/v1/sessions/*
    name: isa-sessions
    upstream:
      nodes:
        "127.0.0.1:8205": 1
```

## Upstream Configuration

Each upstream uses `roundrobin` load balancing with a single node in development.
In production, multiple nodes can be added for horizontal scaling:

```yaml
upstream:
  type: roundrobin
  nodes:
    "app-1.internal:4100": 1
    "app-2.internal:4100": 1
  checks:
    active:
      type: http
      http_path: /api/health
      healthy:
        interval: 5
        successes: 2
      unhealthy:
        interval: 5
        http_failures: 3
```

## Health Check Routes

Each zone exposes a health endpoint used by APISIX active health checks:

| Zone         | Health endpoint       | Expected response |
|--------------|-----------------------|-------------------|
| isA_         | `GET /api/health`     | `200 OK`          |
| isA_Console  | `GET /console/api/health` | `200 OK`      |
| isA_Docs     | `GET /docs/api/health`    | `200 OK`      |
| Gateway      | `GET /health`         | `200 OK`          |

Backend services expose `/health` on their respective ports.

## CORS Configuration

Apply the CORS plugin globally or per-route to allow cross-zone requests:

```yaml
plugins:
  cors:
    allow_origins: "https://iapro.ai"
    allow_methods: "GET, POST, PUT, DELETE, OPTIONS"
    allow_headers: "Authorization, Content-Type, X-API-Key"
    allow_credential: true
    max_age: 3600
```

In development, set `allow_origins` to `http://localhost:4100, http://localhost:4200, http://localhost:4300`.

## Route Priority

APISIX evaluates routes by specificity, then by explicit `priority` field:

1. `/api/v1/agents/*` -- most specific, matches first
2. `/console/*` -- zone prefix
3. `/docs/*` -- zone prefix
4. `/*` (priority: -1) -- catch-all for isA_ main app

## Adding a New Zone

1. Create the Next.js app with `basePath: '/<prefix>'` in `next.config.ts`.
2. Add an APISIX route for `/<prefix>/*` pointing to the new upstream.
3. Add the surface URL env var (`NEXT_PUBLIC_<NAME>_URL`) to `surfaceConfig.ts`.
4. Update PlatformNav in `@isa/ui-web` to include the new zone link.
