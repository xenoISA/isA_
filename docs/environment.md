# Environment Variables

## Env Files

- `.env.example` (canonical)
- `env.example` (legacy alias)
- `.env.local` (local overrides)
- `deployment/environments/*.env`

## Key Variables

- `NEXT_PUBLIC_GATEWAY_URL` - gateway URL
- `NEXT_PUBLIC_APP_ENV` - app environment label
- `NODE_ENV` - Node environment
- `NEXT_PUBLIC_RUDDERSTACK_WRITE_KEY` / `NEXT_PUBLIC_RUDDERSTACK_DATA_PLANE_URL`
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- Feature flags prefixed with `REACT_APP_ENABLE_*`

## References

- [../.env.example](../.env.example)
- [../env.example](../env.example)
- [deployment/README.md](../deployment/README.md)
