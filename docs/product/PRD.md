# isA_ Product Requirements Document

## Overview

isA_ is the **unified platform entry point** for the isA ecosystem, serving three audiences through a single application:

- **End users** (isA Mate) — AI chat, widgets, task automation
- **Developers** (isA Console) — agent management, API access, admin tools
- **Everyone** (isA Docs) — guides, API reference, tutorials

The application is built on Next.js 14 and branded as **iapro.ai**.

## Architecture

```
iapro.ai (isA_)
  ├── Marketing: Landing page, pricing, onboarding
  ├── App (Mate): AI chat, widgets, task automation
  ├── Console: → isA_Console (admin, agents, settings)
  └── Docs: → isA_Docs (guides, API reference, tutorials)
```

Backend connectivity via APISIX gateway to microservices (agents, accounts, sessions, auth, payment, etc.)

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

### Epic: Platform Entry Point (Existing — Epic #9)

See GitHub Issue #9. Covers navigation shell, auth handoff, marketing pages, deep linking.

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
