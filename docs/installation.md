# Installation

## Prerequisites

- Node.js and npm (project uses Next.js 14; use a compatible Node LTS).
- Local APISIX gateway reachable at `NEXT_PUBLIC_GATEWAY_URL` (default `http://localhost:9080`).

## Install

```bash
cd /Users/xenodennis/Documents/Fun/isa/isA_
cp .env.example .env.local
npm install
```

## Verify

```bash
npm run dev
```

App should start on `http://localhost:5173` (configured by the `dev` script).

## References

- [README.md](../README.md)
- [deployment/README.md](../deployment/README.md)
