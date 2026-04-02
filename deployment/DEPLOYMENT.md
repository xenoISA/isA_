# isA_ Frontend — Deployment Guide

## Prerequisites

- Docker 24+
- Access to container registry (e.g., `ghcr.io/xenoisa/isa-app`)
- isA_App_SDK packages (`@isa/core`, `@isa/transport`) available locally

## Environment Variables

Copy the template and fill in real values:

```bash
cp deployment/environments/production.env .env.production.local
```

### Required at build time

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_GATEWAY_URL` | APISIX gateway URL (e.g., `https://gateway.isa.ai`) |
| `NEXT_PUBLIC_APP_ENV` | Set to `production` |

### Secrets (load from vault or K8s secrets, never bake into image)

| Variable | Source |
|----------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings |
| `RUDDERSTACK_WEBHOOK_SECRET` | RudderStack dashboard |

### Optional runtime variables

See `deployment/environments/production.env` for the full list with descriptions.

## Build

```bash
# 1. Stage SDK packages into the build context
mkdir -p .sdk/core .sdk/transport
cp -r ../isA_App_SDK/packages/core/* .sdk/core/
cp -r ../isA_App_SDK/packages/transport/* .sdk/transport/

# 2. Build the image (pass NEXT_PUBLIC_* as build args)
docker build \
  --build-arg NEXT_PUBLIC_GATEWAY_URL=https://gateway.isa.ai \
  --build-arg NEXT_PUBLIC_APP_ENV=production \
  -t isa-app:latest .
```

## Run

```bash
# With env file
docker run -p 4100:4100 --env-file deployment/environments/production.env isa-app:latest

# With K8s secrets mounted as env vars (preferred in production)
kubectl apply -f deployment/k8s/
```

## Service Endpoints

| Service | Port | Path |
|---------|------|------|
| isA_ Frontend | 4100 | `/` |
| APISIX Gateway | 9080 | All `/api/v1/*` routes |
| Agent Service | 8080 | via gateway `/api/v1/agents` |
| Auth Service | 8202 | via gateway `/api/v1/auth` |
| Accounts Service | 8201 | via gateway `/api/v1/accounts` |
| Sessions Service | 8205 | via gateway `/api/v1/sessions` |
| MCP Service | 8081 | via gateway `/api/v1/mcp` |

See `src/config/gatewayConfig.ts` for the complete service map.

## Health Checks

```bash
# Frontend
curl http://localhost:4100/

# Gateway
curl http://gateway.isa.ai/health
```

## Troubleshooting

- **Blank page / API errors**: Verify `NEXT_PUBLIC_GATEWAY_URL` was set at *build* time, not just runtime. Next.js inlines `NEXT_PUBLIC_*` during the build.
- **Auth failures**: Ensure Supabase keys are correct and the gateway auth route (`/api/v1/auth`) is reachable.
- **Missing SDK**: If `npm ci` fails, confirm `.sdk/core/` and `.sdk/transport/` are populated before `docker build`.
