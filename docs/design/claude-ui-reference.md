# Claude.ai UI Design Reference

> Compiled as reference for isA_ Claude App Parity implementation.
> Use during /fix for all UI stories.

## Key Design Principles

- **Flat, minimal, no-bubble chat** — Messages flow vertically with minimal decoration
- **System font stack** — `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **15px body text** — line-height 1.6-1.7
- **4px spacing grid** — Common: 4, 8, 12, 16, 24, 32, 48px
- **150ms ease transitions** — All hover/focus interactions
- **680-768px chat max-width** — Centered content area
- **260px sidebar** — Collapsible, gray-50 background

## Quick Reference Measurements

| Element | Value |
|---------|-------|
| Sidebar width | 260px |
| Chat content max-width | 680-768px |
| Artifact panel width | 50% (min 400px, max 700px) |
| Message font size | 15px |
| Body line-height | 1.6-1.7 |
| Border radius (buttons) | 6-8px |
| Border radius (cards/modals) | 12px |
| Border radius (pills) | 9999px |
| Border radius (composer) | 16-24px |
| Hover transition | 150ms ease |
| Command palette width | 560px |
| Model dropdown width | 320px |
| Settings nav width | 220px |
| Avatar size | 24-28px |
| Message vertical gap | 24-32px |

## Color Palette

### Light Mode
- Background: `#FFFFFF`
- Sidebar: `#F9FAFB` (gray-50)
- Primary text: `#111827` (gray-900)
- Secondary text: `#6b7280` (gray-500)
- Muted text: `#9ca3af` (gray-400)
- Borders: `#e5e7eb` (gray-200)
- Brand accent: `#C96442` (terracotta)

### Dark Mode
- Background: `#1a1a1a`
- Surface: `#2d2d2d`
- Primary text: `#f5f5f5`
- Secondary text: `#a3a3a3`
- Borders: `rgba(255,255,255,0.1)`

## Message Actions (hover pattern)

```css
.message-actions { opacity: 0; transition: opacity 150ms ease; }
.message-container:hover .message-actions { opacity: 1; }
.message-action-btn {
  padding: 6px; border-radius: 6px; color: #9ca3af;
  background: transparent; transition: color 150ms, background 150ms;
}
.message-action-btn:hover { color: #374151; background: #f3f4f6; }
```

## Extended Thinking Block

- Collapsible block ABOVE main response
- Left border accent: `2px solid #d4a574` (warm)
- Background: `rgba(180, 140, 100, 0.05)`
- Header: brain icon + "Thought for X seconds" + chevron toggle
- Content: `text-sm` (14px), muted color, markdown rendered
- Default: COLLAPSED after streaming completes

## Stop Button

- Centered below streaming message, above input
- Pill shape: `border-radius: 9999px`, outlined
- Square stop icon + "Stop" text
- `padding: 6px 16px`, `border: 1px solid #d1d5db`

## Regenerate Button

- In message action bar (with copy, thumbs up/down)
- Circular arrow (refresh) icon
- Appears on hover of assistant message
- Creates a branch on regeneration

## Branch Navigation

- Below edited message: `< 1/2 >` navigation
- Small icon buttons (~20px), counter in `text-sm` muted
- Navigating swaps entire thread below branch point

## Conversation Sidebar

- Groups: Today, Yesterday, Previous 7 Days, Previous 30 Days, by month
- Group headers: `text-xs`, `font-medium`, `uppercase`, `letter-spacing: 0.05em`, `color: gray-500`
- Items: `padding: 10px 12px`, `border-radius: 8px`, truncated title
- Hover: `background: #f3f4f6`, shows "..." menu
- Active: `background: #e5e7eb`

## Command Palette (Cmd+K)

- `width: 560px`, `border-radius: 12px`, centered at 20vh from top
- Search input at top (16px font, no border, `padding: 16px`)
- Results: icon + title + secondary text per row
- Keyboard nav: arrows + enter
- Backdrop: `rgba(0, 0, 0, 0.5)`

## Model Selector

- Top-center or in composer area
- Trigger: model name + chevron-down
- Dropdown `width: 320px`: model name (bold) + description (muted)
- Checkmark on selected model

## Artifact Panel

- Right side panel, `width: 50%` (min 400px)
- Header: title + close (X) + actions (copy, download)
- Tabs: "Preview" / "Code" with bottom border active indicator
- Split layout (chat shrinks to accommodate)

## Settings Panel

- Full-page, left nav (220px) + content (max 680px)
- Sections: General, Appearance, Data, Security
- Theme: 3-option selector (System/Light/Dark) with visual thumbnails
- Custom instructions: plain textarea with character count

## Input Composer

- Bottom-centered, same max-width as chat
- Auto-resize textarea, `border-radius: 16-24px`
- Send button (arrow-up in filled circle) on right
- File attachment (paperclip) on left
- Slight shadow/elevation
