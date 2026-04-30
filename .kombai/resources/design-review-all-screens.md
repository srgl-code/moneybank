# Design Review: Prestige Ledger — All Screens

**Review Date**: 2026-04-23  
**Screens**: Home, Player Dashboard, Banker Dashboard  
**Focus Areas**: Visual Design, UX/Usability, Responsive/Mobile, Accessibility, Micro-interactions, Consistency, SEO, Performance

## Summary

Prestige Ledger is a well-crafted Monopoly digital banker app with strong design foundations (MD3 tokens, glassmorphism, Framer Motion animations). However, there are **critical accessibility gaps**, **severe performance bottlenecks** (6.8s FCP, 3.2MB payload), **language inconsistencies** (PT-BR mixed with English), and **missing SEO fundamentals**. The app would benefit from landmark structure, font optimization, consistent localization, and functional quick actions.

## Issues

| # | Issue | Criticality | Category | Location |
|---|-------|-------------|----------|----------|
| 1 | **FCP: 6,824ms / LCP: 7,456ms** — Extremely slow first paint. Main cause: 3.2MB page size from unoptimized font loading (Google Fonts CSS loaded twice: once in `index.html`, again in `index.css`). Material Symbols full font (~300KB) loaded for ~15 icons. | 🔴 Critical | Performance | `client/index.html:9-11`, `client/src/index.css:6-7` |
| 2 | **INP: 512ms** — Interaction to Next Paint is "Poor" (should be <200ms). Heavy Framer Motion layout animations + React re-renders from GameContext broadcasting all state changes cause jank on interaction. | 🔴 Critical | Performance | `client/src/context/GameContext.jsx`, `client/src/components/BankerDashboard.jsx:225-298` |
| 3 | **No landmark regions on Home screen** — All page content is outside `<main>`, `<nav>`, or `<section>` landmarks. Screen readers cannot navigate by region. axe-core violation: `region` (moderate impact, 5 nodes affected). | 🔴 Critical | Accessibility | `client/src/components/Home.jsx:81-347` |
| 4 | **Missing `<main>` landmark on Home** — Player/Banker dashboards use `<main>` but Home renders everything inside a plain `<div>`. Inconsistent landmark structure breaks screen reader navigation. | 🔴 Critical | Accessibility | `client/src/components/Home.jsx:81` |
| 5 | **No skip-to-content link** — Keyboard users must tab through the header on every page load. There's no way to jump directly to main content. | 🟠 High | Accessibility | `client/src/components/ui/AppHeader.jsx` |
| 6 | **Pin selection buttons lack descriptive aria-labels** — Pin buttons use `title={p.label}` but no `aria-label`. The custom emoji button only has `title="Personalizado"`. Screen readers announce these as unlabeled buttons. | 🟠 High | Accessibility | `client/src/components/Home.jsx:256-301` |
| 7 | **Custom checkbox not a real checkbox** — The "Outro valor" toggle is a `<button>` styled as a checkbox with a checkmark character. It lacks `role="checkbox"`, `aria-checked`, and keyboard toggle semantics. | 🟠 High | Accessibility | `client/src/components/Home.jsx:187-209` |
| 8 | **Modal focus trap missing** — `TransferModal` listens for Escape key but does not trap focus within the modal. Tab key can escape to background elements. `ApprovalModal` and `CardMachine` lack Escape handling entirely. | 🟠 High | Accessibility | `client/src/components/TransferModal.jsx:20-24`, `client/src/components/ApprovalModal.jsx:100-201`, `client/src/components/CardMachine.jsx:29-136` |
| 9 | **Modals missing `role="dialog"` and `aria-modal="true"`** — All three modals (Transfer, Approval, CardMachine) render as plain `<div>` elements without dialog semantics. | 🟠 High | Accessibility | `client/src/components/TransferModal.jsx:50-51`, `client/src/components/ApprovalModal.jsx:101-102`, `client/src/components/CardMachine.jsx:30-31` |
| 10 | **Language inconsistency (PT-BR vs English)** — UI mixes Portuguese and English throughout. Labels/buttons are Portuguese ("Entrar na Sala", "Teu nome") but section headings are English ("Total Wealth", "Initiate Transfer", "Transfer Funds", "Ledger", "Global Estate", "Banker Control", "Quick Actions", "Current Balance", "Deduct", "Add"). This confuses users. | 🟠 High | Consistency | `client/src/components/PlayerDashboard.jsx:62,107,137,151`, `client/src/components/BankerDashboard.jsx:101-106,129,353-355,377-381`, `client/src/components/RankingList.jsx:93` |
| 11 | **Quick Actions buttons are non-functional** — "Pass GO", "Collect Fine", "Auction", and "Community" buttons in the Banker Dashboard have no `onClick` handlers. They render as styled `<motion.button>` elements that do nothing when clicked. | 🟠 High | UX/Usability | `client/src/components/BankerDashboard.jsx:133-159` |
| 12 | **Missing Open Graph and social meta tags** — No `og:title`, `og:description`, `og:image`, `og:url`, or `twitter:card` meta tags. Shared links on social media will show no preview. | 🟠 High | SEO | `client/index.html:4-8` |
| 13 | **No robots.txt or sitemap.xml** — Search engines have no guidance for crawling. For an SPA, a basic robots.txt and sitemap improve discoverability. | 🟡 Medium | SEO | Project root |
| 14 | **No canonical URL** — Missing `<link rel="canonical">` tag. Can cause duplicate content issues if served from multiple URLs. | 🟡 Medium | SEO | `client/index.html:4-8` |
| 15 | **No manifest.json for PWA** — This mobile-focused app has no web app manifest. Users can't install it as a PWA. Missing `theme-color` meta tag. | 🟡 Medium | SEO | `client/index.html` |
| 16 | **SPA with no SSR/prerendering** — Entire content is client-rendered JavaScript. Search engines may not index content properly. Consider prerendering the home page at minimum. | 🟡 Medium | SEO | `client/vite.config.js` |
| 17 | **`fmt()` utility duplicated in 6+ files** — The `M$ ${Number(n).toLocaleString('pt-BR')}` formatter is copy-pasted in `PlayerDashboard`, `BankerDashboard`, `RankingList`, `TransferModal`, `ApprovalModal`, `CardMachine`, `TransactionHistory`, and `AnimatedBalance`. Should be a shared utility. | 🟡 Medium | Consistency | Multiple files |
| 18 | **White pin nearly invisible on light backgrounds** — The white pin (`#e2e8f0`) has very low contrast against `bg-surface-container-highest` (`#e5e2e1`). Contrast ratio ≈ 1.02:1, effectively invisible. | 🟡 Medium | Visual Design | `client/src/components/PinIcon.jsx:11`, `client/src/components/Home.jsx:263-268` |
| 19 | **Bottom nav excessive safe area padding** — `pb-6` (1.5rem / 24px) bottom padding plus `pb-32` on content creates excessive dead space on non-notched devices. Should use `env(safe-area-inset-bottom)` instead. | 🟡 Medium | Responsive | `client/src/components/ui/BottomNav.jsx:15`, `client/src/components/PlayerDashboard.jsx:34` |
| 20 | **Pin picker grid layout asymmetry** — 9 items (8 pins + 1 custom) in a 4-column grid creates rows of 4-4-1, leaving the custom button alone on the last row. Looks unbalanced. | 🟡 Medium | Visual Design | `client/src/components/Home.jsx:252-301` |
| 21 | **Bottom nav tab mapping is confusing in Banker Dashboard** — Tab IDs are remapped: `ledger→players`, `ranking→machine`, `banker→history`. The "Ranking" icon shows the card machine, and "Banker" shows history. Icons don't match content. | 🟡 Medium | UX/Usability | `client/src/components/BankerDashboard.jsx:68-72,301-304` |
| 22 | **No confirmation dialog when leaving room** — `leaveRoom()` is called directly on button click with no confirmation. Accidental taps on mobile can disconnect a player mid-game. | 🟡 Medium | UX/Usability | `client/src/components/PlayerDashboard.jsx:38-45`, `client/src/components/BankerDashboard.jsx:87-91` |
| 23 | **Toast notifications lack dismiss button** — Toasts auto-dismiss but have no manual close button. Users cannot dismiss intrusive notifications. | 🟡 Medium | UX/Usability | `client/src/components/Toast.jsx:26-45` |
| 24 | **Room code display not announced to screen readers** — The room code in the banker header is visually prominent but not marked as a status or live region. Copying provides no screen reader feedback. | 🟡 Medium | Accessibility | `client/src/components/BankerDashboard.jsx:79-86` |
| 25 | **Recipient avatars have no text for screen readers** — The recipient carousel in Player Dashboard shows pin icons and truncated names, but the parent button lacks a complete `aria-label` like "Transfer to [name]". | 🟡 Medium | Accessibility | `client/src/components/PlayerDashboard.jsx:119-131` |
| 26 | **Missing loading/skeleton states** — When connecting to a room or waiting for data, there are no skeleton loaders. The UI shows a blank state until data arrives. | ⚪ Low | Micro-interactions | `client/src/components/PlayerDashboard.jsx`, `client/src/components/BankerDashboard.jsx` |
| 27 | **No hover states on transaction history items** — Transaction entries in the ledger have no hover feedback on desktop. They appear static and non-interactive. | ⚪ Low | Micro-interactions | `client/src/components/TransactionHistory.jsx:47-57` |
| 28 | **AppHeader logo button has no handler in dashboards** — The bank icon in the header (`onLogoClick`) is never passed a handler from PlayerDashboard or BankerDashboard. It renders as a clickable button that does nothing. | ⚪ Low | UX/Usability | `client/src/components/ui/AppHeader.jsx:8-16` |
| 29 | **Duplicate font imports** — Google Fonts for Space Grotesk and Plus Jakarta Sans are imported both in `index.html` (via `<link>`) and in `index.css` (via `@import`). This doubles download time for these fonts. | ⚪ Low | Performance | `client/index.html:9-11`, `client/src/index.css:6` |
| 30 | **RankingList shows "You" in English instead of "Tu"** — The ranking list displays "You" for the current player (line 93) but also shows "Tu" as a subtitle (line 98). Mixed languages within the same component. | ⚪ Low | Consistency | `client/src/components/RankingList.jsx:93-98` |

## Criticality Legend

- 🔴 **Critical**: Breaks functionality, violates accessibility standards, or causes severe performance degradation
- 🟠 **High**: Significantly impacts user experience, accessibility, or design quality
- 🟡 **Medium**: Noticeable issue that should be addressed for production readiness
- ⚪ **Low**: Nice-to-have improvement for polish

## SEO Audit Summary

| Aspect | Status | Details |
|--------|--------|---------|
| `<title>` tag | ✅ Present | "MoneyBank – Banco Imobiliário Digital" |
| `<meta description>` | ✅ Present | Good descriptive text in Portuguese |
| `lang` attribute | ✅ Present | `lang="pt-BR"` correctly set |
| Viewport meta | ✅ Present | Properly configured |
| Open Graph tags | ❌ Missing | No `og:title`, `og:description`, `og:image` |
| Twitter Card tags | ❌ Missing | No `twitter:card`, `twitter:title` |
| Canonical URL | ❌ Missing | No `<link rel="canonical">` |
| Structured Data | ❌ Missing | No JSON-LD or microdata |
| Favicon | ✅ Present | SVG emoji favicon (🏦) |
| robots.txt | ❌ Missing | No robots.txt file |
| sitemap.xml | ❌ Missing | No sitemap |
| Web App Manifest | ❌ Missing | No manifest.json for PWA |
| SSR / Prerendering | ❌ Missing | Pure client-side rendering |

## Accessibility Audit Summary

| Aspect | Status | Details |
|--------|--------|---------|
| Document language | ✅ Pass | `lang="pt-BR"` set |
| Page title | ✅ Pass | Non-empty title present |
| Color contrast | ✅ Pass | WCAG AA met for text elements |
| Heading hierarchy | ✅ Pass | h1 → h2 → h3 order correct |
| Button labels | ✅ Pass | Buttons have discernible text |
| Form labels | ✅ Pass | Inputs have associated labels |
| Focus indicators | ✅ Pass | `focus-visible` styles defined |
| Keyboard zoom | ✅ Pass | No zoom restrictions |
| Landmark regions | ❌ Fail | Home page lacks landmarks |
| Modal semantics | ❌ Fail | Missing `role="dialog"`, focus trap |
| Skip navigation | ❌ Fail | No skip-to-content link |
| ARIA on custom controls | ❌ Fail | Custom checkbox lacks ARIA |

## Performance Summary

| Metric | Value | Rating |
|--------|-------|--------|
| First Contentful Paint (FCP) | 6,824ms | 🔴 Poor (target: <1,800ms) |
| Largest Contentful Paint (LCP) | 7,456ms | 🔴 Poor (target: <2,500ms) |
| Cumulative Layout Shift (CLS) | 0 | 🟢 Good |
| Interaction to Next Paint (INP) | 512ms | 🔴 Poor (target: <200ms) |
| Total Blocking Time (TBT) | 159ms | 🟢 Good |
| Page Size | 3.2MB | 🔴 Excessive |
| Memory Usage | 14.59MB | 🟢 Normal |

### Performance Recommendations

1. **Remove duplicate font imports** — Keep only the `index.html` link tags, remove `@import` from `index.css`
2. **Subset Material Symbols** — Use `&icon_names=login,add_circle,...` parameter to load only used icons (~15 vs 2500+)
3. **Add `font-display: swap`** — Already present via Google Fonts, but verify
4. **Lazy load modals** — Use `React.lazy()` for `TransferModal`, `ApprovalModal`, `CardMachine`
5. **Memoize expensive renders** — Wrap `PlayerRow`, `RankingList` items with `React.memo()`

## Next Steps

### Priority 1 (Critical)
1. Fix font loading: remove duplicate imports, subset Material Symbols
2. Add landmark structure (`<main>`, `<nav>`) to Home screen
3. Add `role="dialog"`, `aria-modal="true"`, and focus trapping to all modals

### Priority 2 (High)
4. Standardize all UI text to Portuguese (PT-BR)
5. Add Open Graph + Twitter Card meta tags
6. Add `aria-label` to pin buttons and recipient avatars
7. Make "Outro valor" a proper checkbox with ARIA attributes
8. Either implement Quick Actions or remove them

### Priority 3 (Medium)
9. Add manifest.json for PWA support
10. Extract `fmt()` to a shared utility
11. Fix white pin contrast
12. Add leave-room confirmation dialog
13. Add dismiss button to toasts
14. Fix bottom nav tab mapping in Banker Dashboard
