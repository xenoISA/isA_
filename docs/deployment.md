# Deployment

## Environment Templates

Use templates in `deployment/environments/`:

- `deployment/environments/dev.env`
- `deployment/environments/staging.env`
- `deployment/environments/production.env`

## Local Development

```bash
cp deployment/environments/dev.env .env.local
npm run dev
```

## Gateway Contract

Frontend API traffic must go through the APISIX gateway (`NEXT_PUBLIC_GATEWAY_URL`). Do not configure per-service direct URLs.

## Progressive Rollout / Architecture Migration

Deployment controls and rollback guidance live in:

- `PRODUCTION_READY_CHECKLIST.md`
- `deployment/progressive-rollout-strategy.md`

Common commands:

```bash
node scripts/deploy-control.js status
node scripts/deploy-control.js enable-new
node scripts/deploy-control.js rollback
node scripts/deploy-control.js test
```

## References

- [deployment/README.md](../deployment/README.md)
- [deployment/progressive-rollout-strategy.md](../deployment/progressive-rollout-strategy.md)
- [PRODUCTION_READY_CHECKLIST.md](../PRODUCTION_READY_CHECKLIST.md)
