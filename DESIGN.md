---
version: alpha
name: Docklight
description: A clean, minimal admin dashboard for Dokku server management. Neutral palette with high-contrast typography, subtle depth, and purposeful color for status signals. Supports light and dark themes with responsive layouts from mobile to desktop.
colors:
  primary: "#0F0F12"
  secondary: "#52525B"
  tertiary: "#1E40AF"
  neutral: "#FFFFFF"
  surface: "#F8F9FA"
  on-primary: "#FAFAFA"
  on-tertiary: "#FFFFFF"
  destructive: "#B91C1C"
  success: "#15803D"
  warning: "#B45309"
  success-surface: "#DCFCE7"
  success-on-surface: "#14532D"
  destructive-surface: "#FEE2E2"
  destructive-on-surface: "#7F1D1D"
  warning-surface: "#FEF3C7"
  warning-on-surface: "#78350F"
  primary-dark: "#FAFAFA"
  secondary-dark: "#D4D4D8"
  neutral-dark: "#18181B"
  surface-dark: "#09090B"
  on-primary-dark: "#18181B"
  border-dark: "#27272A"
  tertiary-dark: "#93C5FD"
  success-surface-dark: "#052E16"
  success-on-surface-dark: "#BBF7D0"
  destructive-surface-dark: "#450A0A"
  destructive-on-surface-dark: "#FECACA"
  warning-surface-dark: "#422006"
  warning-on-surface-dark: "#FDE68A"
typography:
  font-sans:
    fontFamily: "IBM Plex Sans"
    fontFeature: "\"kern\", \"liga\", \"calt\""
  font-mono:
    fontFamily: "IBM Plex Mono"
    fontFeature: "\"kern\", \"liga\""
  h1:
    fontFamily: "IBM Plex Sans"
    fontSize: 1.875rem
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  h2:
    fontFamily: "IBM Plex Sans"
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body-md:
    fontFamily: "IBM Plex Sans"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0.01em"
  label-caps:
    fontFamily: "IBM Plex Sans"
    fontSize: 0.75rem
    fontWeight: 600
    letterSpacing: "0.06em"
  mono:
    fontFamily: "IBM Plex Mono"
    fontSize: 0.875rem
    lineHeight: 1.6
rounded:
  sm: 6px
  md: 8px
  lg: 12px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  page-padding-mobile: 16px
  page-padding-tablet: 24px
  page-padding-desktop: 32px
  sidebar-width: 256px
  content-max-width: 1280px
breakpoints:
  sm: 640px
  md: 768px
  lg: 1024px
  xl: 1280px
components:
  sidebar:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    width: "{spacing.sidebar-width}"
  sidebar-dark:
    backgroundColor: "{colors.neutral-dark}"
    textColor: "{colors.primary-dark}"
    width: "{spacing.sidebar-width}"
  sidebar-link:
    backgroundColor: transparent
    textColor: "{colors.on-primary}"
    padding: 8px 16px
    rounded: "{rounded.sm}"
  sidebar-link-hover:
    backgroundColor: "rgba(255,255,255,0.08)"
  sidebar-link-active:
    backgroundColor: "rgba(255,255,255,0.20)"
    textColor: "{colors.on-primary}"
  page:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
  page-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.primary-dark}"
  card:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
    padding: 24px
  card-dark:
    backgroundColor: "{colors.neutral-dark}"
    textColor: "{colors.primary-dark}"
    rounded: "{rounded.lg}"
    padding: 24px
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    rounded: "{rounded.sm}"
    padding: 8px 16px
  button-primary-hover:
    backgroundColor: "#1D4ED8"
  button-secondary:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: 8px 16px
  button-secondary-hover:
    backgroundColor: "{colors.surface}"
  badge-success:
    backgroundColor: "{colors.success-surface}"
    textColor: "{colors.success-on-surface}"
    rounded: "{rounded.full}"
  badge-success-dark:
    backgroundColor: "{colors.success-surface-dark}"
    textColor: "{colors.success-on-surface-dark}"
    rounded: "{rounded.full}"
  badge-error:
    backgroundColor: "{colors.destructive-surface}"
    textColor: "{colors.destructive-on-surface}"
    rounded: "{rounded.full}"
  badge-error-dark:
    backgroundColor: "{colors.destructive-surface-dark}"
    textColor: "{colors.destructive-on-surface-dark}"
    rounded: "{rounded.full}"
  badge-warning:
    backgroundColor: "{colors.warning-surface}"
    textColor: "{colors.warning-on-surface}"
    rounded: "{rounded.full}"
  badge-warning-dark:
    backgroundColor: "{colors.warning-surface-dark}"
    textColor: "{colors.warning-on-surface-dark}"
    rounded: "{rounded.full}"
  input:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: 8px 12px
  status-indicator-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.on-tertiary}"
  status-indicator-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.on-tertiary}"
  status-indicator-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.on-tertiary}"
  text-muted-dark:
    textColor: "{colors.secondary-dark}"
  border-subtle-dark:
    backgroundColor: "{colors.border-dark}"
  theme-toggle:
    backgroundColor: transparent
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: 8px
---

## Overview

Docklight is a minimal, self-hosted web UI for managing a single-node Dokku server. The design prioritizes clarity and operational density — administrators need to see status, act quickly, and navigate confidently. The visual language is neutral and restrained, letting data and status colors do the talking.

The tone is professional but not sterile. Think of it as a well-organized cockpit: every element has a purpose, nothing competes for attention unnecessarily.

Light and dark themes share the same semantic structure. Tertiary blue, success green, destructive red, and warning amber stay consistent across modes; only surfaces and text invert.

## Colors

### Light mode

- **Primary (#0F0F12):** Near-black for text and the sidebar background. Tuned for WCAG AAA contrast on white surfaces.
- **Secondary (#52525B):** Zinc gray for supporting text, metadata, and de-emphasized content (≥7:1 on surface).
- **Tertiary (#1E40AF):** Deep blue for links and interactive text. Meets AAA on white; buttons use white on-surface text.
- **Neutral (#FFFFFF):** Card backgrounds and white surfaces. The default canvas.
- **Surface (#F8F9FA):** Page background. Slightly off-white to create subtle depth against cards.
- **Destructive (#B91C1C):** Red for destructive actions (delete, destroy) and critical errors.
- **Success (#15803D):** Green for running status and successful operations.
- **Warning (#B45309):** Amber for warnings and degraded states.

### Dark mode

- **Primary-dark (#FAFAFA):** Near-white for primary text on dark surfaces.
- **Secondary-dark (#D4D4D8):** Light zinc for supporting text and metadata (≥7:1 on dark surfaces).
- **Tertiary-dark (#93C5FD):** Light blue for links on dark backgrounds.
- **Neutral-dark (#18181B):** Card and elevated surface background.
- **Surface-dark (#09090B):** Page background. Deep zinc for maximum contrast with cards.
- **Border-dark (#27272A):** Subtle dividers and input borders.

Status badges use tinted surface tokens (`success-surface`, `destructive-surface`, `warning-surface`) with paired on-surface text colors tuned for **WCAG AAA** (7:1 normal text, 4.5:1 large text) in both themes.

## Typography

**IBM Plex Sans** for all UI text. **IBM Plex Mono** for command output and code.

IBM Plex Sans was chosen over Inter for this admin UI because it offers stronger character distinction at small sizes (Il1, O0), a slightly taller x-height for dense tables, and was designed for technical interfaces. It remains neutral and professional without the over-familiar “startup dashboard” feel of Inter.

Both families are loaded via Google Fonts with `display=swap` and fall back to system UI fonts when offline.

### Readability rules (AAA)

- **Base body size is 16px (1rem)** — 14px fails AAA contrast targets for secondary text far more often.
- **Line height 1.6** on body copy for comfortable scanning of logs and tables.
- **Muted text** uses `secondary` tokens darkened/lightened to maintain ≥7:1 against page and card surfaces.
- **Links** use a darker blue (`#1E40AF`) in light mode and a lighter blue (`#93C5FD`) in dark mode — both meet AAA on their respective surfaces.
- **Table labels** use 12px semibold uppercase minimum; avoid 11px for any text that carries meaning.
- Enable kerning and ligatures via `font-feature-settings`.

### Scale

- **H1 (1.875rem, 700):** Page titles. Bold, slightly tight tracking.
- **H2 (1.25rem, 600):** Section headers within cards and content areas.
- **Body (1rem, 400):** Default text size. 16px base for AAA compliance.
- **Label (0.75rem, 600, uppercase tracking):** Table headers and metadata labels.
- **Mono (0.875rem):** Command output, log entries, technical values.

## Layout

The layout is a classic admin shell: fixed sidebar (256px) with a scrollable main content area. On viewports below 768px, the sidebar collapses into an off-canvas drawer with a top bar and hamburger control.

### Breakpoints

| Token | Width | Usage |
| --- | --- | --- |
| `sm` | 640px | Stack page headers; compact table padding |
| `md` | 768px | Sidebar becomes persistent; hide mobile top bar |
| `lg` | 1024px | Increase page padding; multi-column card grids |
| `xl` | 1280px | Cap content width at 1280px, centered |

### Spacing

Spacing follows a 4px baseline grid. Use `md` (16px) for card padding and component gaps on mobile, `lg` (24px) for section breaks, `xl` (32px) for page-level margins on desktop.

Page padding scales: 16px mobile, 24px tablet, 32px desktop. Main content is capped at 1280px and centered on wide screens.

Cards use 12px border-radius and no box-shadow — depth comes from the background color difference, not elevation.

Tables use horizontal scroll on narrow viewports. Tab navigation scrolls horizontally when labels overflow.

## Elevation & Depth

Depth is achieved through **tonal layers**, not shadows. The page surface sits one step below card surfaces; the sidebar uses the darkest tone in light mode and matches card tone in dark mode.

- **Light:** Surface (#F8F9FA) → Card (#FFFFFF) → Sidebar (#0F0F12)
- **Dark:** Surface (#09090B) → Card (#18181B) → Sidebar (#18181B with border)

Interactive focus rings use tertiary blue in light mode and a lighter ring in dark mode. No box-shadows on cards or buttons.

## Shapes

- **sm (6px):** Buttons, inputs, badges — interactive elements.
- **md (8px):** Smaller containers, inner cards.
- **lg (12px):** Top-level cards and dialogs.
- **full (9999px):** Avatars, status badges, pill-shaped elements.

## Components

- **Sidebar:** Dark background in light mode, card-tone in dark mode. Logo and app name at top. Navigation links with subtle hover/active states. Theme toggle and user info pinned to bottom.
- **Theme toggle:** Icon button (sun/moon) in sidebar footer and mobile header. Persists preference to localStorage; respects `prefers-color-scheme` on first visit.
- **Card:** Surface-colored background, 12px radius, responsive padding (16px mobile, 24px desktop). No shadow.
- **Button (primary):** Blue (#1E40AF), white text, 6px radius. Hover darkens to #1D4ED8.
- **Button (secondary):** Surface background, primary text, thin border. Hover lightens.
- **Status badge:** Pill-shaped with tinted background tokens. Green for running, red for stopped/error, amber for warning. Uses theme-aware surface tokens.
- **Alert banner:** Tinted destructive/warning/success surfaces for inline errors and health status.
- **Table:** Clean rows with subtle bottom borders. Compact padding for density. Horizontal scroll on mobile.
- **Input:** Card background, thin border, 6px radius. Blue ring on focus.

## Do's and Don'ts

- **Do** use the design token CSS variables (`--background`, `--foreground`, `--success-surface`, etc.) instead of hardcoded Tailwind color classes like `bg-green-100`.
- **Do** use status colors consistently: green = healthy, red = error/stopped, amber = warning.
- **Do** keep interactive elements visually distinct from static content.
- **Do** test layouts at 375px, 768px, and 1280px widths.
- **Do** maintain WCAG AAA contrast (7:1 normal text, 4.5:1 large text) when introducing new color pairs.
- **Do** use IBM Plex Sans / IBM Plex Mono via design tokens — do not load additional display fonts.
- **Don't** add decorative elements, gradients, or illustrations. The UI is functional.
- **Don't** use box-shadows for depth — use background color contrast instead.
- **Don't** introduce colors outside the palette. Extend the palette if a new semantic color is needed.
- **Don't** nest component variants. `button-primary-hover` is a sibling, not a child.
- **Don't** hardcode light-only colors (`text-green-800`, `bg-red-100`) — they break dark mode contrast.
