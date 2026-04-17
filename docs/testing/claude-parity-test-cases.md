# Claude App Feature Parity — Test Cases

> Track testing progress for isA_ vs Claude web app feature parity.
> Updated: 2026-04-17

## How to Use

- Run each test case manually in the browser at `http://localhost:4100/app`
- Login with: `alice@example.com` / `test123456` (100,000 credits)
- Mark status: `PASS`, `FAIL`, `PARTIAL`, `SKIP`, `BLOCKED`
- Add notes for any failures

---

## 1. Core Chat Flow

| # | Test | Steps | Expected | Status | Notes |
|---|------|-------|----------|--------|-------|
| 1.1 | Send message + streaming | Type "Explain quantum computing in 3 paragraphs" → Enter | Message appears, response streams word-by-word, stop button visible during stream | | |
| 1.2 | Stop streaming | Send long prompt → click stop button during streaming | Response truncated at stop point, input returns to normal | | |
| 1.3 | Message editing | Hover user message → click pencil → edit text → Save & Submit | Original preserved as branch, new response generated | | |
| 1.4 | Regenerate response | Hover assistant message → click refresh icon | New response generated, old preserved as branch | | |
| 1.5 | Branch navigation | After edit/regen → use < 1/2 > arrows | Switch between original and new response | | |
| 1.6 | Extended thinking | Ask "Think step by step: what's 17 x 23?" with thinking enabled | Thinking block appears (collapsible) above response | | |
| 1.7 | Code in response | Ask "Write a Python function to sort a list" | Code block with syntax highlighting, copy button | | |
| 1.8 | Markdown rendering | Ask "Create a table comparing Python vs JavaScript" | Table renders properly with formatting | | |

## 2. Conversation Management

| # | Test | Steps | Expected | Status | Notes |
|---|------|-------|----------|--------|-------|
| 2.1 | New chat | Click "+ New" in sidebar | New session created, welcome screen shown | | |
| 2.2 | Switch conversations | Click different session in sidebar | Messages load for selected session | | |
| 2.3 | Time grouping | Have chats from different days | Shows "Today", "Yesterday", "Previous 7 Days" headers | | |
| 2.4 | Search conversations | Cmd+K → type search query | Matching conversations shown with snippets | | |
| 2.5 | Rename conversation | Hover session → click rename | Title updates in sidebar | | |
| 2.6 | Delete conversation | Hover session → click delete | Session removed from sidebar | | |
| 2.7 | Starred conversations | Click star on a conversation | Starred section at top of sidebar | | |

## 3. Projects

| # | Test | Steps | Expected | Status | Notes |
|---|------|-------|----------|--------|-------|
| 3.1 | Create project | Click "All Conversations" dropdown → "New Project" → type name → Create | Project created, appears in dropdown | | |
| 3.2 | Switch project | Select project from dropdown | Conversations filtered to that project | | |
| 3.3 | Project instructions | Settings → Project tab → type instructions → Save | Instructions saved, applied to new chats in project | | |
| 3.4 | Knowledge base upload | Settings → Project tab → drag file to upload area | File appears in knowledge list | | |

## 4. Settings

| # | Test | Steps | Expected | Status | Notes |
|---|------|-------|----------|--------|-------|
| 4.1 | Open settings (keyboard) | Press Cmd+, | Settings modal opens on Appearance tab | | |
| 4.2 | Theme: Light | Settings → Appearance → click Light | App switches to light theme immediately | | |
| 4.3 | Theme: Dark | Settings → Appearance → click Dark | App switches to dark theme immediately | | |
| 4.4 | Theme: System | Settings → Appearance → click System | App follows OS theme preference | | |
| 4.5 | Font selection | Settings → Appearance → change Chat Font dropdown | Font updates in chat area | | |
| 4.6 | Send behavior | Settings → Appearance → toggle Enter/Cmd+Enter | Send behavior changes accordingly | | |
| 4.7 | Custom instructions | Settings → General → type instructions → Save | Instructions saved, "Saved" confirmation shown | | |
| 4.8 | Memory management | Settings → Memory → view/search/edit/delete memories | Memory CRUD works, grouped by type | | |
| 4.9 | Skills builder | Settings → Skills → New Skill → fill form → Create | Skill saved, appears in list | | |
| 4.10 | Integrations | Settings → Integrations → search/filter connectors | Grid of connectors shown, categories filter | | |

## 5. Model Selection

| # | Test | Steps | Expected | Status | Notes |
|---|------|-------|----------|--------|-------|
| 5.1 | Model picker visible | Check above input area | Model selector dropdown visible | | |
| 5.2 | Switch model | Click selector → choose different model | Selection persists, next message uses selected model | | |
| 5.3 | Model capabilities | Open model dropdown | Each model shows capabilities (vision, thinking, code) | | |

## 6. Artifacts

| # | Test | Steps | Expected | Status | Notes |
|---|------|-------|----------|--------|-------|
| 6.1 | Code artifact inline | Ask "Create a React component for a todo list" | ArtifactPeekCard shown inline with code preview | | |
| 6.2 | Open artifact panel | Click the artifact card | Side panel opens with Preview/Code/Edit tabs | | |
| 6.3 | Artifact versioning | Edit artifact → type instruction → Apply | New version created, version selector shows v1/v2 | | |
| 6.4 | Copy artifact | Click copy button in artifact panel header | Content copied to clipboard | | |
| 6.5 | Edit-to-version flow | Panel → Edit tab → type "add dark mode support" → Apply | Edit sent to Mate, new version created from response | | |
| 6.6 | Full canvas view | Click expand button in panel (or Cmd+Shift+A) | Full-screen view with version timeline sidebar | | |
| 6.7 | Mobile sheet | Resize to mobile width → tap artifact | Bottom sheet opens (75vh) with Preview/Code tabs | | |

## 7. Keyboard Shortcuts

| # | Test | Steps | Expected | Status | Notes |
|---|------|-------|----------|--------|-------|
| 7.1 | Cmd+K | Press Cmd+K | Command palette opens with search input | | |
| 7.2 | Cmd+, | Press Cmd+, | Settings modal opens | | |
| 7.3 | ? key | Press ? key (not in input) | Keyboard shortcuts overlay shown | | |
| 7.4 | Escape | Press Esc on any modal/palette | Modal closes, returns to chat | | |
| 7.5 | Arrow keys in palette | Cmd+K → arrow down/up | Selection moves between items | | |
| 7.6 | Enter in palette | Cmd+K → arrow to Settings → Enter | Settings opens | | |

## 8. Widget System (isA_ Differentiator)

| # | Test | Steps | Expected | Status | Notes |
|---|------|-------|----------|--------|-------|
| 8.1 | Omni Content | Click Omni Content card on welcome screen | Widget activates in sidebar, content generated | | |
| 8.2 | DreamForge AI | Click DreamForge card → enter image prompt | Image generation widget opens | | |
| 8.3 | HuntAI | Click HuntAI card → enter search query | Product/info search results shown | | |
| 8.4 | Knowledge Hub | Click Knowledge Hub card → describe analysis | Document analysis widget activates | | |
| 8.5 | Widget in sidebar | After activating widget → check right sidebar | Widget panel shows with output | | |

## 9. Voice & Research

| # | Test | Steps | Expected | Status | Notes |
|---|------|-------|----------|--------|-------|
| 9.1 | Voice input button | Check chat input area for mic icon | Mic button visible (if browser supports Web Speech) | | |
| 9.2 | Voice recording | Click mic → speak → release | Speech transcribed to text in input | | |
| 9.3 | Research mode | Ask "Research the latest trends in AI agents" | Research panel shows progress steps | | |

## 10. Auth & Billing

| # | Test | Steps | Expected | Status | Notes |
|---|------|-------|----------|--------|-------|
| 10.1 | Sign in | Click Sign In → enter alice@example.com / test123456 | Login succeeds, no console errors, app loads | | |
| 10.2 | Credits display | After login → check UI for credit count | Shows 100,000 credits somewhere in UI | | |
| 10.3 | Send with credits | Send a message after login | Message sends without "No Credits" modal | | |
| 10.4 | Sign out | Click user area → Sign Out | Returns to unauthenticated state, no crash | | |
| 10.5 | Session persistence | Sign in → create chat → refresh page | Previous session and messages preserved | | |
| 10.6 | No-auth experience | Before signing in → explore app | Welcome screen, settings, Cmd+K all work without auth | | |

---

## Test Summary

| Category | Total | Pass | Fail | Partial | Skip | Blocked |
|----------|-------|------|------|---------|------|---------|
| 1. Core Chat | 8 | | | | | |
| 2. Conversation Mgmt | 7 | | | | | |
| 3. Projects | 4 | | | | | |
| 4. Settings | 10 | | | | | |
| 5. Model Selection | 3 | | | | | |
| 6. Artifacts | 7 | | | | | |
| 7. Keyboard Shortcuts | 6 | | | | | |
| 8. Widgets | 5 | | | | | |
| 9. Voice & Research | 3 | | | | | |
| 10. Auth & Billing | 6 | | | | | |
| **Total** | **59** | | | | | |

## Known Issues

_Add issues discovered during testing here:_

1. ...
