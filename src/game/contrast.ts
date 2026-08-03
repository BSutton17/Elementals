// Readability helpers for kingdom colours.
//
// The UI is dark throughout, which is fine for twelve of the thirteen kingdoms
// and a problem for Dark: its colour is #12121a, so a Dark swatch on a dark
// panel is very nearly invisible. Rather than special-casing that one id in
// every place a kingdom is drawn, these derive what a colour NEEDS from the
// colour itself — so a future pale or near-black kingdom is handled the day it
// is added, not the day someone notices.

/** Perceived brightness of a hex colour, 0 (black) → 1 (white). */
export function luminanceOf(hex: string): number {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h
  const n = parseInt(full, 16)
  if (Number.isNaN(n)) return 1
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

/**
 * Below this a colour cannot be told apart from the app's dark backgrounds.
 *
 * Chosen to sit between the two darkest kingdoms rather than picked by feel:
 * Dark's #12121a is 0.07 and genuinely disappears, while Space's #5b21b6 is
 * 0.26 and reads fine as a saturated violet. 0.15 separates them with room on
 * both sides.
 */
const TOO_DARK = 0.15

/** True when a colour needs help to be visible against the dark UI. */
export function needsOutline(hex: string): boolean {
  return luminanceOf(hex) < TOO_DARK
}

/** A readable ink to draw ON a swatch of `hex`. */
export function inkFor(hex: string): string {
  return luminanceOf(hex) > 0.45 ? '#0b0e17' : '#f7f7f2'
}

/**
 * A version of `hex` safe to draw a glyph or line IN, against the dark UI.
 * Near-black kingdoms (Dark) are swapped for their outline white; everything
 * else keeps its own colour.
 */
export function accentFor(hex: string): string {
  return needsOutline(hex) ? '#f7f7f2' : hex
}

/**
 * The outline a swatch of `hex` should carry so it stays visible. Near-black
 * kingdoms (Dark) get a white ring; everything else gets none, so the outline
 * reads as "this one would otherwise disappear" rather than as decoration.
 */
export function outlineFor(hex: string): string {
  return needsOutline(hex) ? '#f7f7f2' : 'transparent'
}
