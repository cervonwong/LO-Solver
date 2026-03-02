# Hatched Button Hover Effect Design

## Summary

Add diagonal hatching background to all stamp buttons on hover, using CSS `repeating-linear-gradient`. Lines match each button variant's text color via `currentColor`.

## Decisions

- **Trigger:** Hover only (not default state)
- **Scope:** All three `.stamp-btn` variants
- **Technique:** `repeating-linear-gradient` at 45deg
- **Line density:** 1px lines, 8px spacing (medium)
- **Color:** `currentColor` (red/cyan/white per variant)
- **Disabled:** No hatching on disabled buttons

## Implementation

Single CSS addition to `src/app/globals.css` in the stamp button section:

```css
.stamp-btn:hover:not(:disabled),
.stamp-btn-accent:hover:not(:disabled),
.stamp-btn-secondary:hover:not(:disabled) {
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 7px,
    currentColor 7px,
    currentColor 8px
  );
}
```

## Files changed

- `src/app/globals.css` - Add hover hatching rules
