# ADR-001: Cross-Platform Framework Selection

**Status**: Accepted
**Date**: 2026-04-16
**Decision makers**: Dennis
**Context**: isA_ expanding from web-only to desktop + mobile

## Context

isA_ is a Next.js 14 web app serving as the primary interface for isA Mate (personal AGI companion). The product roadmap calls for native desktop (Mac/Win/Linux) and mobile (iOS/Android) apps with deep local integration — not just web wrappers.

The existing isA_App_SDK already provides platform-agnostic packages (`@isa/core`, `@isa/transport`, `@isa/hooks`, `@isa/theme`) and platform-specific UI packages (`@isa/ui-web` for React DOM, `@isa/ui-native` for React Native). isA_Frame (smart photo frame) already ships with Expo/RN consuming `@isa/ui-native`. isA_IDE ships with Tauri v2 for desktop.

## Decision

**Desktop: Electron** | **Mobile: Expo (React Native)** | **IDE: Tauri v2 (unchanged)**

## Alternatives Considered

### 1. Tauri v2 for Everything (Desktop + Mobile)

- **Desktop**: Production-ready, lightweight (10-20MB vs Electron's 100MB+), system WebView, Rust backend
- **Mobile**: iOS support is alpha-quality despite "stable" label. Community reports broken circular build processes, missing plugin docs, simulator breakage with native extensions. Android is early but more functional. ~120 total plugins (vs Electron's thousands)
- **Verdict**: Rejected for mobile. iOS is not production-ready for a complex chat app. Would block isA_ iOS indefinitely.

### 2. Electron for Desktop + Expo/RN for Mobile (CHOSEN)

- **Desktop**: Industry standard. Claude Desktop, ChatGPT Desktop, Cursor, VS Code all use Electron. Node.js runtime enables local MCP tool servers in-process. `NativeAppUtils` already has Electron detection code.
- **Mobile**: isA_Frame already validates Expo/RN in the isA ecosystem. `@isa/ui-native` is battle-tested. EAS Build handles store distribution. Native rendering (not WebView) for mobile UX quality.
- **Verdict**: Highest production confidence. Two runtimes to maintain (Chromium + RN), but both are proven at scale.

### 3. React Native Desktop (react-native-windows + react-native-macos)

- Microsoft-maintained, powers Xbox/Office/Messenger
- **No Linux support** — disqualifying for isA_'s target audience (developers)
- Would require rewriting all `@isa/ui-web` components in RN primitives
- **Verdict**: Rejected. No Linux, high migration cost.

### 4. Capacitor (Web Wrapper for All Platforms)

- Wraps existing web app in WebView — highest code reuse (100%)
- Desktop support is a community plugin (`capacitor-community/electron`), not officially maintained
- **Verdict**: Rejected. Desktop support is fragile and could be abandoned.

### 5. Flutter

- Covers all platforms with native rendering
- Requires full rewrite from React/TypeScript to Dart
- Incompatible with entire @isa SDK ecosystem
- **Verdict**: Rejected. Starting from scratch is not viable.

## Consequences

### Positive

- Desktop ships on proven Electron stack — minimal risk, fast time-to-market
- Mobile reuses proven Expo/RN stack from isA_Frame — `@isa/ui-native` already exists
- Shared SDK core (`@isa/core`, `@isa/transport`, `@isa/hooks`, `@isa/theme`) works across all platforms
- Node.js in Electron enables unique local features (MCP servers, file watchers, local model routing)
- Web (Next.js) stays unchanged — no migration needed

### Negative

- Two UI component libraries to maintain (`@isa/ui-web` + `@isa/ui-native`)
- Electron bundles ~100MB Chromium (vs Tauri's 10-20MB)
- Electron has a "bloated" reputation (though it's what every AI app ships)
- Team needs Electron expertise (though JS/TS stack, not a new language)

### Risks

- Electron security surface is larger than Tauri (Chromium attack surface)
- If Tauri mobile matures significantly, the desktop choice may feel suboptimal — but migration path exists (both use web frontend)
- Mobile and desktop component libraries may drift — mitigate with shared design tokens in `@isa/theme`

## Architecture

```
isA_App_SDK (monorepo — shared packages)
├── @isa/core          — Platform-agnostic: auth, services, types
├── @isa/transport     — HTTP, SSE, MQTT, WebSocket
├── @isa/hooks         — Shared React hooks
├── @isa/theme         — Design tokens (web + native)
├── @isa/ui-web        — React DOM components (web + Electron)
├── @isa/ui-native     — React Native components (iOS + Android)
└── @isa/desktop       — NEW: Electron shell APIs (tray, hotkey, file watcher, keychain)

Apps (separate repos)
├── isA_           — Next.js web app (existing)
├── isA_Desktop    — Electron shell wrapping isA_ (NEW)
├── isA_Mobile     — Expo/RN app (NEW, planned after desktop Phase 1)
├── isA_Frame      — Expo/RN smart frame (existing, unchanged)
└── isA_IDE        — Tauri v2 dev tool (existing, unchanged)
```

## References

- isA_Frame: Expo SDK 54 + RN 0.81 + React 19 (production)
- isA_IDE: Tauri v2 + Vite + React 19 (production)
- Claude Desktop: Electron
- ChatGPT Desktop: Electron
- Cursor: Electron (VS Code fork)
- Tauri iOS feedback: github.com/orgs/tauri-apps/discussions/10197
