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


## Interaction motion additions

`PlayfulButton` is used for sign-in and demo-account filling. Its key cue, press scale, loading dots, success check and burst use transform and opacity; reduced-motion users see final states without decoration. Demo-account inputs are filled under React control and stop the sequence when the user edits either field.

`DissolveText` animates upload-button label changes: the outgoing label separates into letters, drifts, blurs and fades, then the incoming label fades in. It never gates form submission, and reduced motion shows the current label immediately. The upload progress display eases toward each real XHR percentage with a short requestAnimationFrame step, snaps to 100% on completion, and drives the button fill and rig together.


## Report ranking and motion

Clause rank uses effective score (lawyer override when present, otherwise auto score), descending, with clause index ascending for ties. Auto and override scores remain visible side by side. Risk bands are high at 8+, medium at 5–7, low above 0 and below 5, and neutral at 0. High-risk cards use a muted red border and tint with a slow, soft pulse; reduced motion keeps the static treatment without pulses.

The Report dashboard uses a 12-column desktop grid, two columns on tablet, and one column on mobile. Its gauge and stat counts animate on load. Sort/filter changes use FLIP transforms, disclosure panels animate with grid row expansion, and the Top 5 and category bars enter in sequence. Reduced-motion preferences snap these elements to their final layout.


Login mode changes follow a slide-first sequence: the cover moves for 0.8 seconds, then the newly revealed form content fades and rises in an 80 ms stagger. Content from the covered form fades out at slide start. The inactive form is inert and hidden from assistive technology; focus moves to the revealed Email field. Reduced motion switches forms immediately without delay.

## Merged Documents and lawyer review

`/documents` serves every signed-in role. Lawyers select a row to open a review pane at `/documents/:id`; other roles retain the normal document list and are redirected back to it if they request a review-style URL. `/review/:id` redirects to the merged workspace. The review panel preserves automatic scores beside saved lawyer overrides and uses effective score for clause ordering and risk presentation. Navigation labels dissolve on click without delaying navigation; the active capsule measures the link box, and reduced motion skips the effect.
