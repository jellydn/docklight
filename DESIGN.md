---
version: alpha
name: Docklight
description: A clean, minimal admin dashboard for Dokku server management. Neutral palette with high-contrast typography, subtle depth, and purposeful color for status signals.
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
components:
  sidebar:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    width: 256px
  sidebar-link:
    backgroundColor: transparent
    textColor: "{colors.on-primary}"
    padding: 8px 16px
    rounded: "{rounded.sm}"
  sidebar-link-hover:
    backgroundColor: "rgba(255,255,255,0.08)"
  sidebar-link-active:
    backgroundColor: "rgba(255,255,255,0.20)"
    textColor: "#FFFFFF"
  page:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
  card:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
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
    backgroundColor: "#DCFCE7"
    textColor: "#166534"
    rounded: "{rounded.full}"
  badge-error:
    backgroundColor: "#FEE2E2"
    textColor: "#991B1B"
    rounded: "{rounded.full}"
  badge-warning:
    backgroundColor: "#FEF3C7"
    textColor: "#92400E"
    rounded: "{rounded.full}"
  input:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: 8px 12px
  input-focus:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}" 
    ringColor: "{colors.tertiary}"
    ringWidth: 2px
---

## Overview

Docklight is a minimal, self-hosted web UI for managing a single-node Dokku server. The design prioritizes clarity and operational density — administrators need to see status, act quickly, and navigate confidently. The visual language is neutral and restrained, letting data and status colors do the talking.

The tone is professional but not sterile. Think of it as a well-organized cockpit: every element has a purpose, nothing competes for attention unnecessarily.

## Colors

- **Primary (#17171C):** Near-black for text and the sidebar background. High contrast against white surfaces.
- **Secondary (#71717A):** Zinc gray for supporting text, metadata, and de-emphasized content.
- **Tertiary (#2563EB):** Blue for interactive elements — buttons, links, selected states. Used sparingly to preserve its signal as an action affordance.
- **Neutral (#FFFFFF):** Card backgrounds and white surfaces. The default canvas.
- **Surface (#F8F9FA):** Page background. Slightly off-white to create subtle depth against cards.
- **Destructive (#DC2626):** Red for destructive actions (delete, destroy) and critical errors.
- **Success (#16A34A):** Green for running status and successful operations.
- **Warning (#D97706):** Amber for warnings and degraded states.

Status badges use light tinted backgrounds (success bg: #DCFCE7, error bg: #FEE2E2, warning bg: #FEF3C7) with dark text for WCAG AA contrast.

## Typography

Inter for all UI text. JetBrains Mono for command output and code. Weight and size carry hierarchy — no decorative fonts. Tight letter-spacing on headings; default tracking on body text.

- **H1 (1.875rem, 700):** Page titles. Bold, slightly tight tracking.
- **H2 (1.25rem, 600):** Section headers within cards and content areas.
- **Body (0.875rem):** Default text size. Compact for information density.
- **Label (0.6875rem, 600, uppercase tracking):** Small caps for table headers and labels.
- **Mono (0.8125rem):** Command output, log entries, technical values.

## Layout

The layout is a classic admin shell: fixed sidebar (256px) with a scrollable main content area. The page uses a subtle off-white background (#F8F9FA) so white cards float with natural depth.

Spacing follows a 4px baseline grid. Use `md` (16px) for card padding and component gaps, `lg` (24px) for section breaks, `xl` (32px) for page-level margins.

Cards use 12px border-radius and no box-shadow — depth comes from the background color difference, not elevation. This keeps the UI flat and clean.

## Shapes

- **sm (6px):** Buttons, inputs, badges — interactive elements.
- **md (8px):** Smaller containers, inner cards.
- **lg (12px):** Top-level cards and dialogs.
- **full (9999px):** Avatars, status badges, pill-shaped elements.

## Components

- **Sidebar:** Dark background (#17171C), white text, 256px wide. Logo and app name at top. Navigation links with subtle hover/active states using white opacity. User info pinned to bottom.
- **Card:** White background, 12px radius, 24px padding. No shadow. Section title (H2) with optional action button aligned right.
- **Button (primary):** Blue (#2563EB), white text, 6px radius. Hover darkens to #1D4ED8.
- **Button (secondary):** White background, dark text, thin border. Hover lightens.
- **Status badge:** Pill-shaped with tinted background. Green for running, red for stopped/error, amber for warning.
- **Table:** Clean rows with subtle bottom borders. Compact padding for density. Hover state for row context.
- **Input:** White background, thin border, 6px radius. Blue ring on focus.

## Do's and Don'ts

- **Do** use the design token CSS variables (--background, --foreground, etc.) instead of hardcoded colors.
- **Do** use status colors consistently: green = healthy, red = error/stopped, amber = warning.
- **Do** keep interactive elements visually distinct from static content.
- **Don't** add decorative elements, gradients, or illustrations. The UI is functional.
- **Don't** use box-shadows for depth — use background color contrast instead.
- **Don't** introduce colors outside the palette. Extend the palette if a new semantic color is needed.
- **Don't** nest component variants. `button-primary-hover` is a sibling, not a child.
