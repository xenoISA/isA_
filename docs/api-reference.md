# API Reference

## Overview

The frontend talks to backend services through the APISIX gateway. Endpoint definitions and auth behavior are centralized in `src/config/gatewayConfig.ts`.

## Key Endpoint Groups

- `AGENTS`: chat and execution control
- `MCP`: tool calls
- `ACCOUNTS`: user/account endpoints
- `SESSIONS`: session list, active, search
- `AUTH` / `AUTHORIZATION`: token and access control
- `PAYMENT`, `ORDER`, `ORGANIZATION`, `INVITATION`, `NOTIFICATION`, `STORAGE`, `WALLET`, `TASK`, `AUDIT`

## Where to Look in Code

- `src/config/gatewayConfig.ts` - base URL, auth headers, endpoint map
- `src/api/*.ts` - service-specific clients (chat, user, session, storage)

## References

- [src/config/gatewayConfig.ts](../src/config/gatewayConfig.ts)
- [MIGRATION_GUIDE.md](../MIGRATION_GUIDE.md)
