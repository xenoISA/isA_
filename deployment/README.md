# isA_ Deployment Configuration

This frontend follows the same environment layout style as other isA services:

- `deployment/environments/dev.env`
- `deployment/environments/staging.env`
- `deployment/environments/production.env`

## Local Development

1. Copy `deployment/environments/dev.env` to `.env.local`
2. Ensure APISIX gateway is reachable at `NEXT_PUBLIC_GATEWAY_URL`
3. Start app: `npm run dev`

## Standard Runtime Contract

- Frontend API traffic must go through APISIX gateway:
  - `NEXT_PUBLIC_GATEWAY_URL=http://localhost:9080` (local default)
- Do not configure per-service direct URLs in frontend runtime.

## Notes

- `.env.example` is the canonical root template.
- `env.example` is kept as a legacy alias template.
