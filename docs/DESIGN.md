---
name: "投資搭檔"
description: "Corporate Trust design system adapted for mobile finance app. Indigo/violet palette with colored shadows, Plus Jakarta Sans, and elevated card patterns."
style: "Corporate Trust"
colors:
  primary: "#4F46E5"
  secondary: "#7C3AED"
  canvas: "#F8FAFC"
  surface: "#FFFFFF"
  ink: "#0F172A"
  muted: "#64748B"
  subtle: "#94A3B8"
  line: "#E2E8F0"
  neutral-subtle: "#F1F5F9"
  on-ink: "#FFFFFF"
  positive: "#10B981"
  positive-subtle: "#ECFDF5"
  negative: "#EF4444"
  negative-subtle: "#FEF2F2"
  warning: "#F59E0B"
  warning-subtle: "#FFFBEB"
  focus: "#4F46E5"
  brand-accent: "#7C3AED"
typography:
  fontFamily: "Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang TC', 'Noto Sans TC', sans-serif"
  scale: "Major Third (1.25)"
  display:
    fontSize: "32px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  heading:
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  lg:
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  caption:
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
  xs:
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.45
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
  sm: "6px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  pill: "999px"
elevation:
  sm: "0 1px 3px rgba(79, 70, 229, 0.06)"
  md: "0 4px 20px -2px rgba(79, 70, 229, 0.1)"
  lg: "0 10px 25px -5px rgba(79, 70, 229, 0.15), 0 8px 10px -6px rgba(79, 70, 229, 0.1)"
  overlay: "0 20px 40px -4px rgba(79, 70, 229, 0.2)"
motion:
  duration-fast: "150ms"
  duration-normal: "200ms"
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
  button-primary:
    background: "linear-gradient(135deg, #4F46E5, #7C3AED)"
    color: "#FFFFFF"
    radius: "{radius.lg}"
    padding: "10px 20px"
    font-weight: 600
    shadow: "0 4px 14px rgba(79, 70, 229, 0.3)"
    hover: "translateY(-1px), shadow increase"
  button-secondary:
    background: "#FFFFFF"
    color: "#0F172A"
    border: "1px solid {colors.line}"
    radius: "{radius.lg}"
    hover: "background #F8FAFC, border darken"
  card:
    background: "#FFFFFF"
    radius: "{radius.lg}"
    shadow: "{elevation.md}"
    border: "1px solid rgba(226, 232, 240, 0.6)"
    hover: "translateY(-2px), shadow → lg"
  input:
    background: "#FFFFFF"
    border: "1px solid {colors.line}"
    radius: "{radius.md}"
    focus: "ring-2 {colors.primary}, border {colors.primary}"
  pill:
    radius: "{radius.pill}"
    padding: "6px 14px"
    font-size: "{typography.caption.fontSize}"
    font-weight: 500
---

# 投資搭檔 — Design System

## Overview

**Style: Corporate Trust** — adapted for a mobile-first finance app.

Trustworthy yet vibrant. Uses an indigo-to-violet gradient spectrum with colored shadows to create dimensional depth. Plus Jakarta Sans provides a friendly-professional typographic voice. Cards lift on interaction. Every surface has subtle brand-tinted depth.

This is NOT a marketing landing page adaptation — it's the Corporate Trust visual DNA applied to a dense, mobile-native product UI at 520px max-width.

---

## 1. Color Palette

### Primary & Secondary

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#4F46E5` | Indigo 600 — brand, links, primary buttons, focus rings |
| `--secondary` | `#7C3AED` | Violet 600 — gradient endpoint, accent highlights |
| `--primary-subtle` | `#EEF2FF` | Indigo 50 — selected states, tinted backgrounds |
| `--secondary-subtle` | `#F5F3FF` | Violet 50 — alternate tinted backgrounds |

### Neutral

| Token | Value | Usage |
|-------|-------|-------|
| `--ink` | `#0F172A` | Slate 900 — primary text |
| `--muted` | `#64748B` | Slate 500 — secondary text |
| `--subtle` | `#94A3B8` | Slate 400 — tertiary/timestamps |
| `--line` | `#E2E8F0` | Slate 200 — borders, dividers |
| `--neutral-subtle` | `#F1F5F9` | Slate 100 — subtle backgrounds |
| `--surface` | `#FFFFFF` | Cards, panels |
| `--canvas` | `#F8FAFC` | Slate 50 — page body |
| `--on-ink` | `#FFFFFF` | Text on filled surfaces |

### Semantic

| Token | Value | Usage |
|-------|-------|-------|
| `--positive` | `#10B981` | Emerald 500 — gains |
| `--positive-subtle` | `#ECFDF5` | Emerald 50 — gain backgrounds |
| `--negative` | `#EF4444` | Red 500 — losses |
| `--negative-subtle` | `#FEF2F2` | Red 50 — loss backgrounds |
| `--warning` | `#F59E0B` | Amber 500 — caution |
| `--warning-subtle` | `#FFFBEB` | Amber 50 — warning backgrounds |

### Focus

| Token | Value |
|-------|-------|
| `--focus` | `#4F46E5` (= primary) |

---

## 2. Typography

**Font:** Plus Jakarta Sans (Google Fonts), geometric sans-serif with rounded terminals.

### Scale (Major Third — 1.25 ratio)

| Token | Size | Weight | Line-height | Letter-spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| `--text-display` | 2rem (32px) | 800 | 1.1 | -0.02em | Portfolio value, hero numbers |
| `--text-heading` | 1.5rem (24px) | 700 | 1.2 | -0.01em | Page titles |
| `--text-lg` | 1.25rem (20px) | 600 | 1.35 | normal | Section sub-headings |
| `--text-body` | 1rem (16px) | 400 | 1.6 | normal | Default body |
| `--text-caption` | 0.875rem (14px) | 500 | 1.5 | normal | Labels, metadata |
| `--text-xs` | 0.75rem (12px) | 500 | 1.45 | 0.01em | Fine print, badges |

### Weight tokens

| Token | Value |
|-------|-------|
| `--weight-normal` | 400 |
| `--weight-medium` | 500 |
| `--weight-semibold` | 600 |
| `--weight-bold` | 700 |
| `--weight-extrabold` | 800 |

---

## 3. Spacing

4px base, same scale as before.

---

## 4. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Badges, small pills |
| `--radius-md` | 10px | Buttons, inputs |
| `--radius-lg` | 12px | Cards (default) |
| `--radius-xl` | 16px | Modals, sheets |
| `--radius-pill` | 999px | Tags, chat input |

**Rule:** Cards use `--radius-lg` (12px). Buttons and inputs use `--radius-md` (10px). Upgrade from previous 8px system.

---

## 5. Elevation (Colored Shadows)

The defining visual trait — shadows use indigo tint instead of neutral grey.

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 3px rgba(79, 70, 229, 0.06)` | Subtle lift |
| `--shadow-md` | `0 4px 20px -2px rgba(79, 70, 229, 0.1)` | Cards (default) |
| `--shadow-lg` | `0 10px 25px -5px rgba(79, 70, 229, 0.15), 0 8px 10px -6px rgba(79, 70, 229, 0.1)` | Hover state, active cards |
| `--shadow-overlay` | `0 20px 40px -4px rgba(79, 70, 229, 0.2)` | Modals, toasts, drawers |
| `--shadow-button` | `0 4px 14px rgba(79, 70, 229, 0.3)` | Primary CTA buttons |

---

## 6. Motion

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | 150ms | Hover, micro-interactions |
| `--duration-normal` | 200ms | Card lift, state changes |
| `--duration-slow` | 400ms | Drawer, page transitions |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entrances, lifts |
| `--ease-in-out` | `cubic-bezier(0.45, 0, 0.55, 1)` | Symmetric transitions |

---

## 7. Component Patterns

### Cards (Elevated)
- Background: `var(--surface)`
- Radius: `var(--radius-lg)` (12px)
- Shadow: `var(--shadow-md)` (indigo-tinted)
- Border: `1px solid rgba(226, 232, 240, 0.6)` (subtle, semi-transparent)
- Hover: `translateY(-2px)` + shadow → `--shadow-lg`
- Transition: `var(--duration-normal) var(--ease-out)`

### Buttons (Primary — Gradient)
- Background: `linear-gradient(135deg, var(--primary), var(--secondary))`
- Text: white, weight-semibold
- Radius: `var(--radius-md)`
- Shadow: `var(--shadow-button)`
- Hover: `translateY(-1px)` + enhanced shadow
- Focus: `outline: 2px solid var(--focus); outline-offset: 2px`

### Buttons (Secondary — Ghost)
- Background: `var(--surface)`
- Border: `1px solid var(--line)`
- Text: `var(--ink)`
- Hover: `background: var(--neutral-subtle)`, border darkens

### Inputs
- Background: `var(--surface)`
- Border: `1px solid var(--line)`
- Radius: `var(--radius-md)` (10px)
- Focus: `box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2); border-color: var(--primary)`
- Transition: smooth border + shadow

### Gradient Text (Accent)
For emphasis in key headings:
```css
background: linear-gradient(135deg, var(--primary), var(--secondary));
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
background-clip: text;
```

---

## 8. Accessibility

- All text passes WCAG AA: Slate 900 on Slate 50 = 15.4:1 (AAA)
- Indigo 600 on white = 5.0:1 (AA for normal text)
- Focus: 2px solid primary ring with 2px offset
- `prefers-reduced-motion`: all transitions collapse
- Semantic HTML preserved (header, main, nav, section)
- Touch targets: minimum 44px

---

## 9. Design Decisions

| Decision | Rationale |
|----------|-----------|
| Plus Jakarta Sans over system fonts | Geometric, friendly-professional. The rounded terminals convey approachability for a finance app that aims to feel less intimidating |
| Indigo/Violet gradient | Corporate Trust DNA — vibrant yet professional. Indigo is the primary, violet adds energy |
| Colored shadows (indigo-tinted) | The signature visual trait. Creates cohesive depth without the cold feel of neutral grey shadows |
| 12px card radius (up from 8px) | Friendlier, more modern. Matches the "approachable enterprise" philosophy |
| Gradient primary buttons | Strong visual presence for CTAs. The indigo→violet direction reinforces brand |
| 16px body text | Standard browser default. Maximizes legibility on mobile without sacrificing density — Jakarta Sans remains compact at 1rem |
| Caption weight 500 (up from 400) | Jakarta Sans at small sizes needs medium weight for legibility |
| Semi-transparent card border | Softer edge that doesn't compete with the colored shadow for definition |
