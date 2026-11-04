# Evidence Manifest: apple-in

## Source

- URL: https://www.apple.com/in/
- Captured: 2026-11-04T02:17:33Z
- Mode: single-url

## Inventory

| Evidence | Type | Path | Purpose |
| --- | --- | --- | --- |
| `ev:screenshot/home` | screenshot | `evidence/screenshots/home.png` | Baseline visual reference |
| `ev:computed/body` | computed-style | `raw/computed-styles.json` | Computed style and component samples |
| `ev:script/library-detect` | script | `raw/library-detect.json` | Animation and UI library detection |
| `ev:animation/transition-scan` | animation | `raw/transition-scan.json` | Computed transition patterns |


## Interactions Tested

- Hover: transition declaration scan only; trigger not confirmed
- Focus-visible: transition declaration scan only; trigger not confirmed
- Active: transition declaration scan only; trigger not confirmed
- Open/close: not tested by `extract-styles.py`
- Scroll: not tested by `extract-styles.py`

## Gaps

- CORS-protected stylesheets may not expose all CSS variables.
- Complex motion requires `extract-keyframes.py` and manual review.
- Third-party assets need review before distribution.
- Detected libraries: none detected.

## Reuse Decisions

| Feature | Decision | Reason | Evidence |
| --- | --- | --- | --- |
| Source page content and brand assets | Discarded | Preserve visual language only | `ev:screenshot/home` |
