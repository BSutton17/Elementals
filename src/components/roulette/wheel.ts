// The European wheel's geometry and colours, shared by the victim's table and
// Joker's side-screen mirror. Mirrors the server's `engine/roulette.ts` — the
// pocket ORDER matters, because the ball has to land on the right wedge.

/** Single-zero wheel in its real pocket order, clockwise from 0. */
export const WHEEL_POCKETS: readonly number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
]

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
])

export type BetColor = 'red' | 'black' | 'green'

export function colorOfPocket(pocket: number): BetColor {
  if (pocket === 0) return 'green'
  return RED_NUMBERS.has(pocket) ? 'red' : 'black'
}

/** Degrees each pocket occupies (360 / 37). */
export const POCKET_ARC = 360 / WHEEL_POCKETS.length

/** The angle of a pocket's CENTRE, measured clockwise from the wheel's 12. */
export function angleOfPocket(pocket: number): number {
  const index = WHEEL_POCKETS.indexOf(pocket)
  if (index < 0) return 0
  return index * POCKET_ARC + POCKET_ARC / 2
}

/** Hex fills for each colour, used by both the wedges and the chips. */
export const COLOR_FILL: Record<BetColor, string> = {
  red: '#c1121f',
  black: '#14141a',
  green: '#0f7b3d',
}
