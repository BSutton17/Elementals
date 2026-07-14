import { getKingdomTheme } from '../game/kingdomThemes'
import type { ThemeToken } from './types'

// Bridges the shared elemental palette (kingdomThemes.ts) into Pixi's numeric
// colours, so effect definitions reference theme tokens instead of hardcoding
// per-kingdom hues.

/** '#rrggbb' → 0xRRGGBB. */
export function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16)
}

/** The source kingdom's themed colour for a token, or white when unknown. */
export function themeColor(
  kingdomId: string | null | undefined,
  token: ThemeToken = 'primary',
): number {
  const theme = getKingdomTheme(kingdomId ?? null)
  return theme ? hexToNumber(theme[token]) : 0xffffff
}
