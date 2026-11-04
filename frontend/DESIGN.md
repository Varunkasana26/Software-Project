# Design spec: Legal Document Summarizer

Our own spec. Tokens and rules only. It was informed by one public reference (apple.com/in): large calm whitespace, centred focus, alternating light and dark bands, flat surfaces with hairline borders, pill buttons, short transitions. No logo, font file, image, illustration or copy from that site is used. Reference extraction notes: `docs/design/reference/` (screenshots and assets are git-ignored).

**Tone:** calm, high-contrast, restrained. A serious legal-risk tool. No decoration that carries no meaning.

**Rule for risk:** colour is never the only signal. Every risk shows an icon, a word and a number.

## 1. Colour tokens

All text and UI colours below meet WCAG AA (4.5:1 text, 3:1 UI). Ratios were computed, not estimated.

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--color-bg` | `#ffffff` | Page background | |
| `--color-surface` | `#f4f5f7` | Alternating bands, cards on white | |
| `--color-ink` | `#14181f` | Body text, headings | 17.8 on bg, 16.3 on surface |
| `--color-muted` | `#4f5868` | Secondary text | 7.2 on bg, 6.6 on surface |
| `--color-border` | `#d5d9e0` | Dividers, card borders (decorative) | |
| `--color-border-strong` | `#6b7385` | Input and control borders | 4.8 on bg |
| `--color-accent` | `#0a58c9` | Primary action, links, focus | 6.5 on bg, 5.9 on surface |
| `--color-on-accent` | `#ffffff` | Text on accent | 6.5 |
| `--color-band` | `#0f1420` | Dark header and hero band | |
| `--color-on-band` | `#f4f6fa` | Text on band | 17.0 |
| `--color-on-band-muted` | `#b4bccb` | Secondary text on band | 9.6 |
| `--color-focus-on-band` | `#7db3ff` | Focus ring on band | 8.6 |

Risk and status (text on tint, each with an icon and a label):

| Token set | Text | Tint | Border | Contrast | Icon | Label |
|---|---|---|---|---|---|---|
| `--risk-high` | `#a11217` | `#fdeced` | `#a11217` | 7.0 | triangle (filled) | High risk |
| `--risk-medium` | `#7a4a00` | `#fff4d9` | `#7a4a00` | 6.8 | diamond | Medium risk |
| `--risk-low` | `#14633a` | `#e5f6ec` | `#14633a` | 6.5 | circle with check | Low risk or Favorable |
| `--risk-neutral` | `#3d4554` | `#eceef2` | `#3d4554` | 8.3 | dash in circle | Neutral or not scored |

Score to tier (score is 0-10, from `score.auto`, or `score.lawyer_override` when present):
`7-10` High, `4-6.9` Medium, `0.1-3.9` Low, `0` Neutral. A clause with label `FAVORABLE` always shows the Low/Favorable style.

Error text `#a11217` on white is 8.0. Success uses `--risk-low`. Warnings use `--risk-medium`.

## 2. Typography

System font stack only, no font files:

- `--font-sans`: `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- `--font-mono`: `ui-monospace, "SF Mono", Menlo, Consolas, monospace` (rule ids, scores)

| Token | Size | Line height | Weight | Tracking | Use |
|---|---|---|---|---|---|
| `--text-display` | 40px (2.5rem) | 1.15 | 600 | -0.015em | Page title on band |
| `--text-h2` | 28px (1.75rem) | 1.2 | 600 | -0.01em | Section titles |
| `--text-h3` | 21px (1.3125rem) | 1.3 | 600 | 0 | Card titles |
| `--text-lead` | 18px (1.125rem) | 1.5 | 400 | 0 | Intro text |
| `--text-body` | 16px (1rem) | 1.5 | 400 | 0 | Default |
| `--text-small` | 14px (0.875rem) | 1.45 | 400 | 0 | Meta, helper text |
| `--text-caption` | 12px (0.75rem) | 1.4 | 500 | 0.02em | Badges only |

Below 640px: display 32px, h2 24px. Body never goes below 16px. Max line length 70ch. Weights used: 400, 500, 600.

## 3. Spacing and layout

4px base. Tokens: `--space-1` 4, `-2` 8, `-3` 12, `-4` 16, `-5` 24, `-6` 32, `-7` 48, `-8` 64, `-9` 96.

- Container: `max-width: 1120px`, centred. Side gutters 16px (under 640px), 24px (640-959px), 32px (960px and up).
- Breakpoints: 360 (minimum supported), 640, 960, 1280.
- Section vertical rhythm: `--space-8` on desktop, `--space-7` on mobile. Alternate `--color-bg` and `--color-surface` bands; use `--color-band` for the app header.
- Minimum touch target 44x44px.
- Forms are one column up to 960px. Report uses one column under 960px and a main column plus a 320px side summary above it.
- No horizontal scroll at 360px. Long words and rule ids wrap (`overflow-wrap: anywhere`).

## 4. Radius and elevation

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 6px | Inputs, badges |
| `--radius-md` | 10px | Cards, alerts |
| `--radius-lg` | 16px | Drop zone, dialogs |
| `--radius-pill` | 999px | Buttons, filter chips |

| Token | Value | Use |
|---|---|---|
| `--elev-0` | none | Default. Prefer a 1px `--color-border` over a shadow. |
| `--elev-1` | `0 1px 2px rgba(20,24,31,0.08)` | Raised cards on hover |
| `--elev-2` | `0 8px 24px rgba(20,24,31,0.12)` | Dialogs and menus only |

## 5. Motion

| Token | Value |
|---|---|
| `--motion-fast` | 120ms |
| `--motion-base` | 200ms |
| `--motion-slow` | 320ms |
| `--ease` | `cubic-bezier(0.4, 0, 0.6, 1)` |

Rules:
- Animate only `opacity`, `transform`, `background-color`, `color`, `border-color`. Never animate `width`, `height`, `top` or `left` (no layout shift).
- Expanding a clause explanation may fade in; reserve space first or push content down once, not per frame.
- Loading uses fixed-height skeletons, not spinners that resize the page.
- `@media (prefers-reduced-motion: reduce)`: all durations become `0.01ms` and no transforms.
- Nothing moves unless the user acted, except the loading skeleton shimmer, which is disabled under reduced motion.

## 6. Component rules

**Focus (all interactive elements):** `outline: 3px solid var(--color-accent); outline-offset: 2px;` shown with `:focus-visible`. On the band use `--color-focus-on-band`. Never remove an outline without a replacement.

**Button:** height 44px, padding 0 `--space-5`, `--radius-pill`, weight 600.
- Primary: `--color-accent` fill, `--color-on-accent` text.
- Secondary: transparent, 1.5px `--color-accent` border, accent text.
- Danger: `--risk-high` text on `--risk-high` tint with border.
- Disabled: 55% opacity, `cursor: not-allowed`, and `aria-disabled`. Disabled buttons still explain why in nearby text.
- Busy: label changes ("Analyzing...") and the button is disabled. Width stays fixed.

**Form field:** visible `<label>` above the control (never placeholder-only), 44px control height, 1px `--color-border-strong`, `--radius-sm`. Helper text in `--text-small` muted. Error text under the field in `--risk-high` text with an icon, linked with `aria-describedby`, and the field gets a 2px `--risk-high` border.

**Drop zone (upload):** `--radius-lg`, 2px dashed `--color-border-strong`, `--color-surface` fill; drag-over state: solid accent border and accent tint. It contains a real `<input type="file">` reachable by keyboard and a "Choose file" button. States: idle, drag-over, file chosen (name and size), error (alert below). Accepted: `.pdf`, `.txt`, up to 10 MB.

**Party selector:** radio group with large pill options (Tenant, Landlord, Employee, Employer, Recipient, Discloser, Client, Provider). Required. Selected state uses fill, a check icon and `aria-checked`, not colour alone.

**Risk badge:** `--text-caption`, `--radius-sm`, tint background, 1px border, icon then label then score, for example "Triangle High risk 8". Always all three.

**Summary header (report):** `--color-band` background, title in `--text-display`, counts per category, and the number of High risks.

**Section list (Top 5 risks, obligations, exit conditions):** ordered list for risks, bulleted for others. Each item: badge, clause text clamped to 3 lines with "Show full clause", and `rule_id` in mono.

**Clause card:** border 1px `--color-border`, `--radius-md`. Header: clause number, category chip, risk badge, `rule_id` (mono), auto score. If a lawyer override exists show "Lawyer override 3" next to "Auto 8" and keep both visible, with the original struck through only as text style, not as the only signal. Disclosure button ("Why this was flagged") uses `aria-expanded` and reveals the explanation.

**Filter chips (category, risk):** pill toggle buttons in a labelled group with `aria-pressed`, plus a "Clear filters" button and a live result count (`aria-live="polite"`).

**Rules table (admin):** real `<table>` with `<th scope>`; at under 640px each row becomes a stacked card. Enable/disable is a labelled switch (`role="switch"`). Edit and add use an inline form or dialog with labelled fields; the regex field is monospace and shows an inline error if the server rejects it. Destructive actions ask for confirmation in the page, not with `window.confirm`.

**Lawyer review:** per-clause form: override score (0-10 number, labelled), reason (required, multi-line), Save. Shows original auto score as read-only text. Saving shows a status message; errors stay on screen until dismissed.

**Alert:** `--radius-md`, tint, border, icon, text. Error and warning use `role="alert"`; info and success use `role="status"`.

**Empty state:** icon, one sentence, and one primary action. **Loading state:** skeleton blocks the same height as the content. **Error state:** what failed, the server message if safe to show, and a Retry button.

**Mock marker (development only):** pages backed by mock data show a small amber "Mock data" tag in the header, rendered only when `import.meta.env.DEV` is true. It must not appear in production builds.

**Navigation:** top bar on `--color-band` with skip-to-content link (first focusable element), current page marked with `aria-current="page"`. Under 640px the links wrap to a second row; no hamburger needed (5 items).

## 7. Accessibility checklist (blocking)

- All functionality works by keyboard. Tab order follows reading order.
- Visible focus on every control. Skip link present.
- Text contrast 4.5:1, UI and focus 3:1 (tokens above already pass).
- Colour never alone: risk uses icon, word and number.
- Form errors announced (`role="alert"`) and tied to fields.
- Touch targets 44px. Zoom to 200% without loss of content.
- Reduced-motion respected.
- One `<h1>` per page, headings in order, landmarks `header`, `nav`, `main`.

## 8. Not in this spec

- Dark theme (only the dark header band exists).
- Illustration, photography, logo and custom fonts.
- Animation beyond the rules in section 5.
