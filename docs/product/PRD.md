# isA_ Product Requirements Document

## Overview

isA_ is the **unified platform entry point** for the isA ecosystem, serving three audiences through a single application:

- **End users** (isA Mate) — AI chat, widgets, task automation
- **Developers** (isA Console) — agent management, API access, admin tools
- **Everyone** (isA Docs) — guides, API reference, tutorials

The application is built on Next.js 14 and branded as **iapro.ai**.

## Architecture

### Multi-Zone Entry Point

isA_ serves as the unified entry point via **Next.js Multi-Zone routing** through the APISIX gateway. Each surface is an independent Next.js app served under a single domain via path-based routing.

```
iapro.ai (single domain)
  │
  APISIX Gateway (:9080)
  ├── /*           → isA_        (:4100)  — Marketing + Agentic chat app
  ├── /console/*   → isA_Console (:4200)  — Management interface
  └── /docs/*      → isA_Docs    (:4300)  — Documentation portal
```

### Surface Responsibilities

| Surface | App | Port | Audience | Purpose |
|---------|-----|------|----------|---------|
| `/` | isA_ | 4100 | All | Marketing pages (home, pricing, enterprise, demo) |
| `/app` | isA_ | 4100 | Customers | Agentic chat app (isA_Mate backend) |
| `/console` | isA_Console | 4200 | Developers | Agent management, API keys, admin tools |
| `/docs` | isA_Docs | 4300 | Developers | Guides, API reference, tutorials |

### Backend Connectivity

All surfaces share a single APISIX gateway for backend microservices:

```
Frontend Zones → APISIX Gateway (:9080) → Backend Services
                                            ├── isA_Mate   (:18789) — Agentic chat backend
                                            ├── isA_Agent  (:8080)  — Agent management
                                            ├── isA_Model  (:8082)  — Model routing/inference
                                            ├── isA_MCP    (:8081)  — Tool server
                                            ├── isA_user   (:8201+) — Auth, accounts, billing
                                            └── isA_Data   (:8084)  — Storage, data services
```

### Shared Platform Shell

All zones share:
- **`<PlatformNav>`** — shared navigation component from `@isa/ui-web` (isA_App_SDK)
- **SSO auth** — JWT + HttpOnly refresh cookie on root domain (`.iapro.ai`)
- **Surface config** — relative path links (`/console`, `/docs`) instead of absolute URLs

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Multi-Zone vs Monolith | Multi-Zone | Apps use different Next.js versions (14, 16) and frameworks (Nextra). Multi-Zone avoids version conflicts |
| Port range | 4100-4300 | Avoids conflicts with infra (3000 Grafana, 5432 PG), services (8080-8230), and agents (18789+) |
| Surface switching | Full page load | Acceptable trade-off — surface switches are infrequent. Avoids micro-frontend complexity |
| Shared nav delivery | npm package (@isa/ui-web) | Already exists in isA_App_SDK. All 3 apps already depend on it |

## Epics

### Epic: Production Readiness — Build, Quality, and Deployment Baseline

**Priority**: P0-Critical
**Milestone**: v1.0 — Unified Platform
**Status**: Ready for dev

Foundational work required before multi-app integration (Epic #5/#9) can ship to production.

#### Requirements

1. **Build must pass** — tsconfig must exclude non-web code (emoFrame); `npm run build` must succeed cleanly
2. **CI/CD pipeline** — GitHub Actions for build, lint, type-check on every PR; block merge on failure
3. **Production logging** — All console.log/warn/error calls replaced with structured logger utility; no raw console calls in production
4. **Module decomposition** — ChatModule (1,518 lines) split into focused sub-modules (chat UI, HIL handling, widget coordination, streaming, task progress)
5. **Security baseline** — Auth tokens in HttpOnly cookies (not localStorage); server-side rate limiting via APISIX; React strict mode enabled
6. **SDK packaging** — @isa/core and @isa/transport published to private npm registry; no local file: references in package.json
7. **Deployment config** — Dockerfile, production env template with real values, container-ready build
8. **Code hygiene** — All TODOs/FIXMEs resolved or converted to tracked issues; React Hook warnings fixed; duplicate/dead code removed

#### Out of Scope

- Multi-app routing (covered by Epic #5)
- Shared auth/SSO (covered by Epic #5, Issue #2)
- Marketing page content (separate workstream)

### Epic: Unified Entry-Point Integration (Existing — Epic #5)

See GitHub Issue #5. Covers routing, SSO, agent lifecycle, docs integration.

### Epic: Platform Entry Point (Epic #9) — Multi-Zone Implementation

**Priority**: P1-High
**Milestone**: v1.0 — Unified Platform
**Status**: Ready for design → implementation planned

Implementation via Multi-Zone gateway routing (see Architecture section above).

#### Phase 1 — Foundation (P0)
1. Configure frontend dev ports: isA_ → 4100, isA_Console → 4200, isA_Docs → 4300
2. Add APISIX gateway routes for `/console/*` → :4200, `/docs/*` → :4300
3. Set `basePath: '/console'` in isA_Console `next.config.ts`
4. Set `basePath: '/docs'` in isA_Docs Nextra config

#### Phase 2 — Unified Experience (P1)
5. Build shared `<PlatformNav>` in `@isa/ui-web` (isA_App_SDK)
6. Integrate `<PlatformNav>` into isA_, isA_Console, isA_Docs
7. Unify auth cookie domain to `.iapro.ai` for cross-zone SSO
8. Update `surfaceConfig.ts` to use zone-relative URLs

#### Phase 3 — Integration & Polish (P2)
9. Integrate isA_Mate as chat backend (replaces isA_Agent consumer flow)
10. Build landing page surface switcher (customer vs developer CTAs)
11. Add gateway health aggregation for frontend upstreams
12. Update deployment configs (Docker, CI, env templates)

#### Out of Scope
- Merging Console/Docs code into isA_ (Multi-Zone keeps them separate)
- Micro-frontend module federation (unnecessary complexity)
- Client-side cross-zone navigation (full page loads are acceptable)

### isA Mate Integration

**Priority**: P2-Medium

isA Mate replaces the previous isA Agent consumer flow. isA_ must serve as the primary Mate interface:

- Chat-based AI interaction (existing)
- Widget ecosystem (Dream, Hunt, Omni, Knowledge, DataScientist, CustomAutomation)
- Session persistence and history
- Human-in-the-loop authorization
- Future: DigitalHub and Doc widgets (Issue #14)

### Role-Based Access Control

**Priority**: P2-Medium

Portal contexts require different access levels:

- **End user**: App/Mate features, session history, billing
- **Developer**: Console access, API keys, agent management, webhooks
- **Admin**: Organization management, user administration, analytics

Depends on shared SSO (Issue #2) being in place first.

## Technical Constraints

- Next.js 14 with pages router
- Frontend SDK: @isa/core, @isa/transport (from isA_App_SDK)
- Backend: APISIX gateway → microservices
- Auth: Custom JWT via gateway (Auth0 removed)
- Analytics: RudderStack
- Deployment target: Vercel (marketing) + containerized (platform)
