# Core Concepts

## Architecture

The app is organized into UI components, managers, modules, providers, services, sidebars, and global state. The flow is:

```
User Input → ChatInputModule → SimpleAIClient → AI Backend
     ↓                                              ↓
SessionManager ← AppIntegration ← AppModules ← AI Response
     ↓                    ↓
AppStore (Zustand) → SidebarManager → App Sidebars
     ↓
ArtifactManager → UI Components
```

## Component Categories

- **UI Components (`components/ui/`)**: standalone, reusable, minimal business logic.
- **Managers (`components/managers/`)**: orchestrate workflows and integrate services.
- **Dashboard (`components/dashboard/`)**: developer/admin tooling.

## Multi-App System

Supports multiple app modules: Dream, Hunt, Omni, Assistant, DigitalHub, DataScientist, Doc. Each module has its own sidebar and integrates via `AppIntegration`.

## Session Management

Sessions are persisted (localStorage), track metadata, and support switching. The session layer coordinates across modules.

## Artifact System

Generated content is captured as artifacts (images, text, data) for reuse and display.

## State Management

Global state uses Zustand with app-specific slices and actions.

## References

- [README.md](../README.md)
