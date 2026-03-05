# Configuration

## Environment Files

- `.env.example` is the canonical template.
- `env.example` is a legacy alias.
- For deployment, use `deployment/environments/*.env` as base templates.

## Core Variables

- `NEXT_PUBLIC_GATEWAY_URL` - APISIX gateway base URL (default `http://localhost:9080`).
- `NEXT_PUBLIC_APP_ENV` - runtime environment label.
- `NODE_ENV` - standard Node environment.

## Analytics (Optional)

- `NEXT_PUBLIC_RUDDERSTACK_WRITE_KEY`
- `NEXT_PUBLIC_RUDDERSTACK_DATA_PLANE_URL`
- `RUDDERSTACK_WEBHOOK_SECRET`

## Supabase (Optional)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Feature Flags / Debug

- `REACT_APP_ENABLE_AUTH`
- `REACT_APP_ENABLE_FILE_UPLOAD`
- `REACT_APP_ENABLE_REAL_TIME_CHAT`
- `REACT_APP_ENABLE_WIDGETS`
- `REACT_APP_ENABLE_DEBUG_MODE`
- `REACT_APP_ENABLE_LOGGING_DASHBOARD`
- `REACT_APP_ENABLE_ANALYTICS`
- `REACT_APP_LOG_LEVEL`

## References

- [../.env.example](../.env.example)
- [../env.example](../env.example)
- [deployment/README.md](../deployment/README.md)
