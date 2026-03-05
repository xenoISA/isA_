# Quickstart

## 5-Minute Setup

1. Copy environment template:
   ```bash
   cp .env.example .env.local
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start dev server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:5173`.

## Gateway Requirement

All API traffic goes through the APISIX gateway. Ensure it is reachable at `NEXT_PUBLIC_GATEWAY_URL` (default `http://localhost:9080`).

## Next Steps

- Read [Core Concepts](./concepts.md)
- Review [Configuration](./configuration.md)
