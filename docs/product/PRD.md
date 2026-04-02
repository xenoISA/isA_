# isA_ Product Requirements Document

## Overview

isA_ is your **personal AGI companion app**, powered by isA Mate. It is the primary interface through which users interact with their AI mate — a companion that remembers you, schedules things for you, delegates to specialist agents when needed, and reaches you across channels.

The application is built on Next.js 14 and branded as **iapro.ai**.

### Product Vision

isA_ is a **companion, not a dashboard**. Every capability — memory, scheduling, delegation, autonomy — surfaces naturally through conversation. Users talk to Mate; they don't operate software.

**Design Principles:**
- **Conversation-first** — Everything starts from talking to Mate
- **Proactive, not reactive** — Mate surfaces context, suggestions, and status without being asked
- **Ambient awareness** — Memory, tasks, and channels are woven into the chat, not separate views
- **Personal** — Feels like your companion knows you, not like software you operate

### Audiences

- **End users** (primary) — Personal AI companion via isA Mate (chat, memory, tasks, automation)
- **Developers** (via Console) — Agent management, API access, admin tools (isA_Console)
- **Everyone** (via Docs) — Guides, API reference, tutorials (isA_Docs)

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

### Epic: Audit Remediation — Production Quality Gaps

**Priority**: P1-High
**Milestone**: v1.0 — Unified Platform
**Status**: Ready for dev

Spec-vs-implementation gaps identified during product audit (2026-04-02).

#### Requirements

1. **Structured logging** — Replace raw console.log/warn/error in creditMonitor.ts, ComponentDemo.tsx, MessageList.tsx with structured logger utility
2. **TypeScript strict mode** — Fix remaining TS errors, remove `ignoreBuildErrors: true` from next.config.js and `continue-on-error` from CI
3. **SDK registry migration** — Publish @isa/core, @isa/transport, @isa/ui-web to @xenoisa npm scope; remove file: references (see Issue #30)
4. **Multi-Zone documentation** — Verify basePath config in Console/Docs repos; document multi-zone setup
5. **Widget TODO cleanup** — Convert 20+ TODOs in widget plugins to tracked issues or mark out-of-scope
6. **Cross-zone SSO** — Implement HttpOnly auth cookies with domain `.iapro.ai` for cross-zone session sharing
7. **Production env template** — Complete deployment/environments/production.env with documented values and secrets management strategy

### Epic: AGI Mate Experience — Companion, Not Dashboard

**Priority**: P1-High
**Milestone**: v1.0 — Unified Platform
**Status**: Ready for design

Mate now has memory (persistent + extractive), scheduling (cron v2), multi-agent delegation (4 specialist teams), autonomous mode, and 10-channel presence — but isA_ only exposes the chat stream. This epic surfaces Mate's full capabilities naturally through the companion experience.

#### Requirements

1. **Memory in context** — Mate proactively surfaces relevant memories inline during conversation ("Last time we discussed X, you decided Y"). No separate memory page required.
2. **Natural task scheduling** — Users say "remind me to check deploys every morning" and Mate creates a cron job conversationally. Upcoming tasks appear as a lightweight side element, not a CRUD page.
3. **Transparent delegation** — When Mate delegates to isa_vibe, isa_trade, isa_creative, or isa_marketing, the chat shows a subtle indicator with live progress. No team management UI.
4. **Companion presence** — Ambient status showing Mate is online, active channels, and autonomous work in progress. Like a companion that's "there."
5. **Autonomous activity feed** — Results from scheduled tasks and trigger responses appear as gentle inline cards in the timeline ("While you were away, I checked the deploy and everything looks good").
6. **Cross-channel continuity** — Conversations from Telegram/Discord/Slack continue seamlessly in the web app with shared context.
7. **Personal knowledge surface** — Minimal side view of what Mate knows about you (facts, preferences, patterns). Editable. Feels personal, not like a database browser.
8. **Companion onboarding** — First-time experience where Mate introduces itself and learns about you through conversation, not a settings form.

#### Design Principles

- Everything flows through conversation — no admin pages
- Mate's capabilities are experienced, not configured
- Widgets (Dream, Hunt, Knowledge, etc.) reframed as "things Mate can do" — triggered conversationally, results inline

#### Out of Scope

- Channel configuration UI (belongs in settings/Console)
- Team/agent management (belongs in isA_Console)
- Scheduler CRUD admin (CLI or Console)

### Epic: Companion UI Redesign

**Priority**: P1-High
**Milestone**: v1.0 — Unified Platform
**Status**: Ready for design

Evolve the UI from "LLM chat app" to "personal AGI companion" — warmer, more personal, ambient.

#### Requirements

1. **Conversational layout evolution** — Warmer typography, Mate's personality in UI chrome, subtle presence indicators. Move beyond generic chat UI.
2. **Contextual side panel** — Replace rigid right sidebar with fluid panel showing what's relevant now — task progress, memories, delegation status — adapting to conversation context.
3. **Gentle notification pattern** — Autonomous results and cross-channel messages as soft inline cards, not system alerts. Feels like Mate telling you things.
4. **Widgets as Mate skills** — Dream, Hunt, Knowledge, etc. feel like things Mate can do, not separate apps. Triggered conversationally, results inline.

### Epic: Architecture Enablement

**Priority**: P2-Medium
**Milestone**: v1.0 — Unified Platform
**Status**: Ready for dev

Minimal refactoring to support the AGI Mate Experience and Companion UI epics.

#### Requirements

1. **Split useChatStore** — Decompose 884-line store into message store + streaming store to support autonomous background messages
2. **Mate API client** — Add client for Mate's scheduler, memory, and health endpoints (REST on :18789)
3. **Background message support** — Streaming architecture must handle autonomous/scheduled messages appearing in timeline without active user session

### isA Mate Backend

isA Mate is the backend powering isA_. Key capabilities exposed via REST/SSE/WebSocket on port 18789:

- **190+ tools** — File, web, task, calendar, memory, media, office, shell operations
- **Persistent memory** — Factual, episodic, semantic, procedural types with progressive summarization
- **Scheduler** — Cron v2 with catch-up, team job dispatch, pause/resume
- **Multi-agent delegation** — Pinned teams (isa_vibe, isa_trade, isa_creative, isa_marketing) + dynamic directory
- **Autonomous mode** — Scheduler-driven dispatch, trigger responses, feedback learning
- **10 channels** — Telegram, Discord, Slack, WhatsApp, Feishu, Teams, Matrix, Signal, iMessage, LINE
- **Observability** — Prometheus metrics, OpenTelemetry traces, health registry

Integration via `MateEventAdapter` translating Mate SSE → AGUI protocol events.

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
