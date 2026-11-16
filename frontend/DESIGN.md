# Frontend design spec

Calm legal interface in light and dark monochrome with one steel blue accent. Components consume CSS variables from `src/styles/tokens.css`; layout and motion live in `src/index.css`.

## Palette

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#f7f7f5` | `#0a0a0b` |
| `--surface` | `#ffffff` | `#121214` |
| `--surface-2` | `#efefec` | `#1a1a1d` |
| `--line` | `rgba(0,0,0,.12)` | `rgba(255,255,255,.12)` |
| `--text` | `#111113` | `#ededea` |
| `--muted` | `#5f5f66` | `#9a9aa0` |
| `--accent` | `#2f4a6f` | `#7f9bbf` |
| `--accent-hover` | `#263d5c` | `#a5bad6` |
| `--on-accent` | `#ffffff` | `#0a0a0b` |
| `--risk-high` | `#c62828` | `#f0686c` |
| `--risk-med` | `#8a5a00` | `#d9a441` |
| `--risk-low` | `#1b6e4f` | `#5bb894` |
| `--grid` | `rgba(0,0,0,.05)` | `rgba(255,255,255,.05)` |
| `--glass` | `rgba(255,255,255,.55)` | `rgba(255,255,255,.07)` |

Text uses system sans; headings use Iowan Old Style, Georgia, Times New Roman. Light/dark selection follows system on first visit, user choice is stored as `theme` in localStorage. Root controls use `data-theme`.

## Motion and components

Motion tokens: `--dur-fast:.15s`, `--dur:.35s`, `--dur-slow:.8s`, `--ease:cubic-bezier(.2,.8,.2,1)`, `--ease-slide:cubic-bezier(.77,0,.18,1)`. Use transform, opacity and filter for decorative motion; SVG path morph is reserved for the upload rig. Risk animations are restrained. Reduced motion disables decoration and snaps state to its final value. Every interactive control has a visible focus outline. Risks always pair an icon and label with the score; HIGH RISK starts at effective score 8, including lawyer overrides.

The nav is a scrollable glass pill with a spring active marker. Login uses a sliding panel. Upload progress comes from XHR. Report cards expose the rule IDs, matched IDs, explanation, original score and override. Admin rule activation remains a button with pressed state. At mobile widths, content stacks and tables scroll within their own wrapper.
