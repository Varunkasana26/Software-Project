# Motion Guide: apple-in

## Summary

Computed transition declarations were found. Trigger mapping is not confirmed by this script and should be reviewed against hover, focus, active, open, and scroll states.

## Patterns

| Pattern | Trigger | Properties | Duration | Easing | Evidence |
| --- | --- | --- | --- | --- | --- |
| `motion.transition.1` | state-change | background | 240 | cubic-bezier(0.4, 0, 0.6, 1) | `ev:animation/transition-scan` |
| `motion.transition.2` | state-change | color | 320 | cubic-bezier(0.4, 0, 0.6, 1) | `ev:animation/transition-scan` |
| `motion.transition.3` | state-change | opacity, transform | 160 | unknown | `ev:animation/transition-scan` |
| `motion.transition.4` | state-change | opacity, transform | 180 | unknown | `ev:animation/transition-scan` |
| `motion.transition.5` | state-change | opacity, transform | 220 | unknown | `ev:animation/transition-scan` |
| `motion.transition.6` | state-change | opacity | 240 | cubic-bezier(0.4, 0, 0.6, 1) | `ev:animation/transition-scan` |
| `motion.transition.7` | state-change | opacity, transform | 240 | unknown | `ev:animation/transition-scan` |
| `motion.transition.8` | state-change | opacity, transform | 200 | unknown | `ev:animation/transition-scan` |
| `motion.transition.9` | state-change | opacity, transform | 320 | unknown | `ev:animation/transition-scan` |
| `motion.transition.10` | state-change | opacity, transform | 320 | unknown | `ev:animation/transition-scan` |
| `motion.transition.11` | state-change | opacity, transform | 320 | unknown | `ev:animation/transition-scan` |
| `motion.transition.12` | state-change | visibility | 240 | unknown | `ev:animation/transition-scan` |

## Reduced Motion

Check `prefers-reduced-motion` behavior manually before reuse.

## Limitations

- Transition declarations do not prove the exact interaction trigger.
- Keyframes and JS-driven animation still require `extract-keyframes.py` and manual review.
