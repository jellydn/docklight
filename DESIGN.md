---
version: alpha
name: Docklight
description: A clean, minimal admin dashboard for Dokku server management. Neutral palette with high-contrast typography, subtle depth, and purposeful color for status signals. Supports light and dark themes with responsive layouts from mobile to desktop.
colors:
  primary: "#17171C"
  secondary: "#71717A"
  tertiary: "#2563EB"
  neutral: "#FFFFFF"
  surface: "#F8F9FA"
  on-primary: "#FAFAFA"
  on-tertiary: "#FFFFFF"
  destructive: "#DC2626"
  success: "#16A34A"
  warning: "#D97706"
  success-surface: "#DCFCE7"
  success-on-surface: "#166534"
  destructive-surface: "#FEE2E2"
  destructive-on-surface: "#991B1B"
  warning-surface: "#FEF3C7"
  warning-on-surface: "#92400E"
  primary-dark: "#FAFAFA"
  secondary-dark: "#A1A1AA"
  neutral-dark: "#18181B"
  surface-dark: "#09090B"
  on-primary-dark: "#18181B"
  border-dark: "#27272A"
  success-surface-dark: "#052E16"
  success-on-surface-dark: "#86EFAC"
  destructive-surface-dark: "#450A0A"
  destructive-on-surface-dark: "#FCA5A5"
  warning-surface-dark: "#422006"
  warning-on-surface-dark: "#FCD34D"
typography:
  h1:
    fontFamily: Inter
    fontSize: 1.875rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  h2:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    lineHeight: 1.5
  label-caps:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: 600
    letterSpacing: "0.08em"
  mono:
    fontFamily: "JetBrains Mono"
    fontSize: 0.8125rem
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

- **Primary (#17171C):** Near-black for text and the sidebar background. High contrast against white surfaces.
- **Secondary (#71717A):** Zinc gray for supporting text, metadata, and de-emphasized content.
- **Tertiary (#2563EB):** Blue for interactive elements — buttons, links, selected states. Used sparingly to preserve its signal as an action affordance.
- **Neutral (#FFFFFF):** Card backgrounds and white surfaces. The default canvas.
- **Surface (#F8F9FA):** Page background. Slightly off-white to create subtle depth against cards.
- **Destructive (#DC2626):** Red for destructive actions (delete, destroy) and critical errors.
- **Success (#16A34A):** Green for running status and successful operations.
- **Warning (#D97706):** Amber for warnings and degraded states.

### Dark mode

- **Primary-dark (#FAFAFA):** Near-white for primary text on dark surfaces.
- **Secondary-dark (#A1A1AA):** Muted zinc for supporting text and metadata.
- **Neutral-dark (#18181B):** Card and elevated surface background.
- **Surface-dark (#09090B):** Page background. Deep zinc for maximum contrast with cards.
- **Border-dark (#27272A):** Subtle dividers and input borders.

Status badges use tinted surface tokens (`success-surface`, `destructive-surface`, `warning-surface`) with paired on-surface text colors for WCAG AA contrast in both themes.

## Typography

Inter for all UI text. JetBrains Mono for command output and code. Weight and size carry hierarchy — no decorative fonts. Tight letter-spacing on headings; default tracking on body text.

- **H1 (1.875rem, 700):** Page titles. Bold, slightly tight tracking.
- **H2 (1.25rem, 600):** Section headers within cards and content areas.
- **Body (0.875rem):** Default text size. Compact for information density.
- **Label (0.6875rem, 600, uppercase tracking):** Small caps for table headers and labels.
- **Mono (0.8125rem):** Command output, log entries, technical values.

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

- **Light:** Surface (#F8F9FA) → Card (#FFFFFF) → Sidebar (#17171C)
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
- **Button (primary):** Blue (#2563EB), white text, 6px radius. Hover darkens to #1D4ED8.
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
- **Do** place the theme toggle in the sidebar footer and mobile header for consistent access.
- **Don't** add decorative elements, gradients, or illustrations. The UI is functional.
- **Don't** use box-shadows for depth — use background color contrast instead.
- **Don't** introduce colors outside the palette. Extend the palette if a new semantic color is needed.
- **Don't** nest component variants. `button-primary-hover` is a sibling, not a child.
- **Don't** hardcode light-only colors (`text-green-800`, `bg-red-100`) — they break dark mode contrast.
