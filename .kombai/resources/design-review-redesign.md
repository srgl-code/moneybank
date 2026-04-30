# Design Review: Prestige Ledger — Redesign "Tropical Board Game"

**Review Date**: 2026-04-23  
**Direction**: Bold & Playful — Tropical Board Game palette on dark navy  
**Previous Review**: [design-review-all-screens.md](./design-review-all-screens.md) (30 issues)

## Design Direction Summary

| Aspect | Before (MD3 Light) | After (Tropical Board Game) |
|--------|--------------------|-----------------------------|
| Background | White/gray (#fcf9f8) | Dark navy (#0f172a → #1e293b) |
| Primary | Muted green (#006a46) | Vibrant teal (#14b8a6) |
| Accent 1 | Red (#b6171e) | Vibrant orange (#f97316) |
| Accent 2 | Gold (#755700) | Golden yellow (#fbbf24) |
| Danger | Error red (#ba1a1a) | Coral (#f43f5e) |
| Cards | White containers | Dark slate (#334155) with glow borders |
| Effects | Subtle shadows | Neon glow, gradients, particle bg |
| Typography | Same fonts, white text on dark | Space Grotesk + Plus Jakarta Sans |
| Animations | Minimal | Playful micro-interactions everywhere |
| Language | Mixed PT-BR/English | 100% Portuguese (PT-BR) |

## New Features Added

### Player Dashboard
| Feature | Component | Socket Event |
|---------|-----------|-------------|
| Balance sparkline chart | `MiniChart` | `balance_history` |
| Property tracker grid | `PropertyTracker` + `PropertyCard` | `update_properties` |
| Notification center | `NotificationCenter` | `game_notification` |
| 3-tab layout (Extrato/Ranking/Alertas) | `SegmentedControl` | — |

### Banker Dashboard
| Feature | Component | Socket Event |
|---------|-----------|-------------|
| Game analytics (donut chart) | `GameAnalytics` | — (computed from gameState) |
| Functional quick actions | `QuickActionButton` | `pass_go`, `collect_fine`, `start_auction` |
| Property overview + assign/remove | PropertyOverview tab | `assign_property`, `remove_property` |
| Activity feed | `ActivityFeed` | `game_notification` |
| 4-tab layout (Jogadores/Aprovações/Extrato/Imóveis) | `SegmentedControl` | — |

### Home Screen
| Feature | Component | Socket Event |
|---------|-----------|-------------|
| Game mode selector | `GameModeSelector` | — (sent with `create_room`) |
| Recent rooms (localStorage) | `RecentRooms` | — |
| 3-tab segmented (Entrar/Criar/Recentes) | `SegmentedControl` | — |
| Playful hero with particles | AnimatedHero | — |

## Issues Tracking (from Previous Review)

### Resolved in Redesign

| # | Issue | Resolution |
|---|-------|-----------|
| 3 | No landmark regions on Home | ✅ Adding `<main>`, `<nav>`, `<section>` landmarks |
| 4 | Missing `<main>` landmark on Home | ✅ All screens use `<main>` |
| 5 | No skip-to-content link | ✅ Added to `AppHeader` |
| 6 | Pin buttons lack aria-labels | ✅ Added descriptive aria-labels |
| 7 | Custom checkbox not a real checkbox | ✅ Replaced with proper `role="checkbox"` + `aria-checked` |
| 8 | Modal focus trap missing | ✅ Focus trap added to all modals |
| 9 | Modals missing role="dialog" | ✅ All modals have `role="dialog"` + `aria-modal="true"` |
| 10 | Language inconsistency | ✅ All UI text standardized to PT-BR |
| 11 | Quick Actions non-functional | ✅ All wired to real socket handlers |
| 17 | `fmt()` duplicated in 6+ files | ✅ Extracted to `utils/format.js` |
| 18 | White pin invisible | ✅ New dark theme fixes contrast |
| 20 | Pin grid asymmetry | ✅ Redesigned layout |
| 21 | Bottom nav tab mapping confusing | ✅ Banker nav redesigned with clear icons |
| 22 | No leave-room confirmation | ✅ `ConfirmDialog` component added |
| 23 | Toast lacks dismiss button | ✅ Added dismiss button |
| 25 | Recipient avatars no text for SR | ✅ Added complete aria-labels |
| 29 | Duplicate font imports | ✅ Single import point |
| 30 | "You" in English | ✅ Changed to "Você" |

### Deferred (SEO / Performance)

| # | Issue | Status |
|---|-------|--------|
| 1 | FCP/LCP slow (font loading) | 🔜 Font optimization planned |
| 2 | INP 512ms | 🔜 Context memoization planned |
| 12 | Missing OG/Twitter meta | 🔜 Post-redesign |
| 13 | No robots.txt/sitemap | 🔜 Post-redesign |
| 14 | No canonical URL | 🔜 Post-redesign |
| 15 | No manifest.json | 🔜 Post-redesign |
| 16 | No SSR/prerendering | 🔜 Out of scope |

## Component Inventory

### Kept & Restyled
- `AnimatedBalance` — new glow gradient card
- `PageTransition` — kept as-is
- `SegmentedControl` — dark theme with glow active pill
- `PinIcon` — contrast fixed on dark bg
- `TransferModal` — dark theme + a11y (dialog role, focus trap)
- `ApprovalModal` — dark theme + a11y
- `CardMachine` — dark theme + a11y
- `Toast` — dark theme + dismiss button
- `BottomNav` — dark theme, banker-specific icons
- `AppHeader` — dark theme + skip link

### New Components
- `StatCard` — animated stat with icon + label
- `QuickActionButton` — icon + label + glow + onClick handler
- `MiniChart` — SVG sparkline for balance history
- `PropertyCard` — single property with color bar + value
- `PropertyTracker` — grid of PropertyCards
- `NotificationCenter` — bell icon + dropdown + badge count
- `ActivityFeed` — timestamped real-time event list
- `GameModeSelector` — badge/pill selector for game presets
- `RecentRooms` — localStorage-backed room list + rejoin
- `GameAnalytics` — SVG donut chart + stats
- `ConfirmDialog` — reusable confirmation modal

## Wireframes

- [Home Screen](./.kombai/resources/lofi-wireframe-home.html)
- [Player Dashboard](./.kombai/resources/lofi-wireframe-player.html)
- [Banker Dashboard](./.kombai/resources/lofi-wireframe-banker.html)
