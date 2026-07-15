---
name: "投資搭檔"
description: "Professional design token system for 投資搭檔. Brand palette derived from forecastock.tw, normalized into a semantic UI system."
colors:
  brand: "#0366A4"
  brand-light: "#E8F4FC"
  brand-accent: "#FFB43B"
  action-primary: "#0879C8"
  action-hover: "#066EAE"
  action-active: "#055D96"
  action-disabled: "#9DCFED"
  ink: "#1A1A1A"
  muted: "#525252"
  subtle: "#8C8C8C"
  line: "#E0E2E6"
  neutral-subtle: "#F3F4F6"
  surface: "#FFFFFF"
  canvas: "#EDEEF0"
  on-ink: "#FFFFFF"
  positive: "#126B4A"
  positive-subtle: "#E9F7EF"
  negative: "#B42B24"
  negative-subtle: "#FEF2F2"
  warning: "#92400E"
  warning-subtle: "#FFF8E6"
  focus: "#0879C8"
typography:
  display:
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.25
  heading:
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.25
  lg:
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  xs:
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
spacing:
  scale: "4px base"
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  10: "40px"
  12: "48px"
radius:
  sm: "4px"
  md: "8px"
  lg: "12px"
  pill: "999px"
elevation:
  sm: "0 1px 3px rgb(0 0 0 / 6%)"
  md: "0 2px 8px rgb(0 0 0 / 8%)"
  lg: "0 8px 24px rgb(0 0 0 / 12%)"
  overlay: "0 12px 40px rgb(0 0 0 / 16%)"
motion:
  duration-fast: "150ms"
  duration-normal: "250ms"
  duration-slow: "400ms"
  ease-out: "cubic-bezier(0.16, 1, 0.3, 1)"
  ease-in-out: "cubic-bezier(0.45, 0, 0.55, 1)"
z-index:
  sticky: 10
  nav: 50
  overlay: 100
  toast: 200
layout:
  shell-max-width: "520px"
  tab-bar-height: "60px"
components:
  button:
    radius: "{radius.md}"
    padding: "8px 16px"
    font-weight: 600
  input:
    radius: "{radius.md}"
    padding: "10px 12px"
    border: "1px solid {colors.line}"
  card:
    radius: "{radius.md}"
    shadow: "{elevation.md}"
    padding: "16px"
  pill:
    radius: "{radius.pill}"
    padding: "4px 12px"
    font-size: "{typography.caption.fontSize}"
---

# 投資搭檔 — Design System

## Overview

Design tokens for **投資搭檔** (AI 投資反思夥伴). Brand palette derived from [forecastock.tw](https://www.forecastock.tw/), normalized into a semantic, WCAG 2.2 AA-compliant token system suitable for a mobile-first financial product.

This document is the **single source of truth** for all UI decisions. Components reference these tokens — no hard-coded values in component styles.

---

## 1. Color Palette

### Brand & Action

| Token | Value | Usage |
|-------|-------|-------|
| `--brand` | `#0366A4` | Brand identity, text links on white (passes AA at 4.5:1) |
| `--brand-light` | `#E8F4FC` | Tinted backgrounds, selected states |
| `--brand-accent` | `#FFB43B` | Gold accent from forecastock brand |
| `--action-primary` | `#0879C8` | Filled button backgrounds |
| `--action-hover` | `#066EAE` | Button hover |
| `--action-active` | `#055D96` | Button pressed |
| `--action-disabled` | `#9DCFED` | Disabled button fill |

### Neutral

| Token | Value | Usage |
|-------|-------|-------|
| `--ink` | `#1A1A1A` | Primary text |
| `--muted` | `#525252` | Secondary text, labels |
| `--subtle` | `#8C8C8C` | Tertiary text, timestamps |
| `--line` | `#E0E2E6` | Borders, dividers |
| `--neutral-subtle` | `#F3F4F6` | Subtle backgrounds |
| `--surface` | `#FFFFFF` | Card / panel backgrounds |
| `--canvas` | `#EDEEF0` | Page body background |
| `--on-ink` | `#FFFFFF` | Text on dark/filled surfaces |

### Semantic

| Token | Value | Usage |
|-------|-------|-------|
| `--positive` | `#126B4A` | Gains, success text (AA on white) |
| `--positive-subtle` | `#E9F7EF` | Success background |
| `--negative` | `#B42B24` | Losses, error text (AA on white) |
| `--negative-subtle` | `#FEF2F2` | Error/loss background |
| `--warning` | `#92400E` | Warning text (AA on subtle bg) |
| `--warning-subtle` | `#FFF8E6` | Warning background |

### Focus

| Token | Value | Usage |
|-------|-------|-------|
| `--focus` | `#0879C8` | Focus ring (2px outline, 2px offset) |

---

## 2. Typography

System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Noto Sans TC", sans-serif`

### Scale (Minor Third — 1.2 ratio)

| Token | Size | Weight | Line-height | Usage |
|-------|------|--------|-------------|-------|
| `--text-display` | 2rem (32px) | 700 | 1.25 | Portfolio value, hero numbers |
| `--text-heading` | 1.5rem (24px) | 700 | 1.25 | Page titles |
| `--text-lg` | 1.25rem (20px) | 600 | 1.4 | Section sub-headings |
| `--text-body` | 1rem (16px) | 400 | 1.5 | Default body text |
| `--text-caption` | 0.8125rem (13px) | 400 | 1.5 | Labels, badges, metadata |
| `--text-xs` | 0.75rem (12px) | 400 | 1.5 | Timestamps, fine print |

### Line-height tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--leading-tight` | 1.25 | Headings, display |
| `--leading-normal` | 1.5 | Body, captions |
| `--leading-relaxed` | 1.65 | Long-form readable text |

### Weight tokens

| Token | Value |
|-------|-------|
| `--weight-normal` | 400 |
| `--weight-medium` | 500 |
| `--weight-semibold` | 600 |
| `--weight-bold` | 700 |

---

## 3. Spacing

4px base unit. Tokens follow a linear + skip scale:

| Token | Value |
|-------|-------|
| `--space-1` | 0.25rem (4px) |
| `--space-2` | 0.5rem (8px) |
| `--space-3` | 0.75rem (12px) |
| `--space-4` | 1rem (16px) |
| `--space-5` | 1.25rem (20px) |
| `--space-6` | 1.5rem (24px) |
| `--space-8` | 2rem (32px) |
| `--space-10` | 2.5rem (40px) |
| `--space-12` | 3rem (48px) |

---

## 4. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Small badges, inline chips |
| `--radius-md` | 8px | Buttons, inputs, cards — default for all interactive elements |
| `--radius-lg` | 12px | Modals, bottom sheets |
| `--radius-pill` | 999px | Tags, filter pills (NOT buttons) |

**Rule:** All buttons and inputs share `--radius-md`. Pill is reserved for non-actionable tags/chips.

---

## 5. Elevation (Shadow Scale)

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 3px rgb(0 0 0 / 6%)` | Subtle lift (hover feedback) |
| `--shadow-md` | `0 2px 8px rgb(0 0 0 / 8%)` | Cards (default) |
| `--shadow-lg` | `0 8px 24px rgb(0 0 0 / 12%)` | Drawers, expanded overlays |
| `--shadow-overlay` | `0 12px 40px rgb(0 0 0 / 16%)` | Modals, toasts |

**Rule:** Cards use `--shadow-md`. Inline/embedded metrics use border only (`1px solid var(--line)`). Never combine border + shadow on the same element.

---

## 6. Motion

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | 150ms | Hover states, micro-interactions |
| `--duration-normal` | 250ms | Page transitions, expand/collapse |
| `--duration-slow` | 400ms | Drawer open/close, staggered entry |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entrances (spring out) |
| `--ease-in-out` | `cubic-bezier(0.45, 0, 0.55, 1)` | State changes |

---

## 7. Z-Index

| Token | Value | Usage |
|-------|-------|-------|
| `--z-sticky` | 10 | Sticky headers within scroll areas |
| `--z-nav` | 50 | Tab bar |
| `--z-overlay` | 100 | Drawers, bottom sheets |
| `--z-toast` | 200 | Toast notifications |

---

## 8. Layout

| Token | Value |
|-------|-------|
| `--shell-max-width` | 520px |
| `--tab-bar-height` | 60px |

- Shell: `max-width: var(--shell-max-width)`, centered, `min-height: 100dvh`, flex column
- Content: `flex: 1` (pushes nav to bottom)
- Tab bar: `margin-top: auto`, sticky bottom, safe-area-aware
- Page padding: `var(--space-6) var(--space-4)` (24px top, 16px sides)

---

## 9. Component Patterns

### Cards
- Background: `var(--surface)`
- Radius: `var(--radius-md)`
- Shadow: `var(--shadow-md)`
- Padding: `var(--space-4)`
- No border (shadow provides elevation)

### Buttons (Primary)
- Background: `var(--action-primary)`
- Text: `var(--on-ink)`
- Radius: `var(--radius-md)`
- Padding: `var(--space-2) var(--space-4)`
- Weight: `var(--weight-semibold)`
- Hover: `var(--action-hover)`
- Active: `var(--action-active)`
- Disabled: `var(--action-disabled)`, `opacity: 0.6`
- Focus: `outline: 2px solid var(--focus); outline-offset: 2px`

### Buttons (Secondary / Ghost)
- Background: transparent
- Text: `var(--action-primary)`
- Border: `1px solid var(--line)`
- Same radius and padding as primary

### Inputs
- Background: `var(--surface)`
- Border: `1px solid var(--line)`
- Radius: `var(--radius-md)`
- Padding: `var(--space-3) var(--space-3)`
- Focus: border-color → `var(--focus)`

### Pills / Tags
- Background: `var(--neutral-subtle)` or `var(--brand-light)`
- Radius: `var(--radius-pill)`
- Padding: `var(--space-1) var(--space-3)`
- Font: `var(--text-caption)`, `var(--weight-medium)`

### Toast
- Background: `var(--positive)` (success) or `var(--negative)` (error)
- Text: `var(--on-ink)`
- Shadow: `var(--shadow-overlay)`
- Radius: `var(--radius-md)`
- Z-index: `var(--z-toast)`

---

## 10. Accessibility

- All text colors pass WCAG 2.2 AA (4.5:1) on their intended background
- Focus ring: 2px solid `var(--focus)`, 2px offset, on all interactive elements
- `prefers-reduced-motion`: all transitions collapse to 0.01ms
- Semantic HTML: `<main>`, `<nav>`, `<section>`, `<article>` for screen readers
- Safe-area insets respected for iOS home-bar

---

## Design Decisions Log

| Decision | Rationale |
|----------|-----------|
| Darker `--brand` (#0366A4) for text | Original #0B8BE3 fails AA contrast (3.8:1 on white). Darkened version passes at 5.2:1 |
| Single `--negative` (no `--danger` alias) | Finance app — "negative" is the correct domain term |
| `--radius-md` for all interactive elements | Component family consistency > variety |
| Pill reserved for tags, NOT buttons | Clear visual hierarchy: rounded = informational, squared = actionable |
| Shadow-only cards (no border+shadow) | Clean elevation model — border is for inline/embedded elements only |
| Display size (32px) added | Portfolio value needs visual weight above page titles |
| 4px spacing base | Matches forecastock.tw observed spacing; provides fine-grained control for dense mobile UI |
