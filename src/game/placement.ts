// Kingdom placement math (ticket #193): positions 2–8 kingdoms evenly around
// a circle — 2 players form a line (opposite ends), 3 a triangle, 4 a square,
// and so on. Pure geometry so it is trivially testable and shared by any
// renderer (SVG today, PixiJS later).

export interface KingdomPosition {
  x: number
  y: number
  /** Radians from the circle's center (useful for orienting effects later). */
  angle: number
}

/** The arena's fixed center point (matches `placeKingdoms`'s own defaults) —
 *  where battlefield-center effects (Space's Black Hole) are anchored. */
export const ARENA_CENTER = { x: 500, y: 500 }

/**
 * Evenly distributes `count` kingdoms on a circle of `radius` around
 * (`cx`, `cy`). The first kingdom sits at the top; the rest follow clockwise.
 */
export function placeKingdoms(
  count: number,
  cx = 500,
  cy = 500,
  radius = 340,
): KingdomPosition[] {
  const positions: KingdomPosition[] = []
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count
    positions.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      angle,
    })
  }
  return positions
}

/**
 * The sentinel target id meaning "the volcano", not a kingdom (Magma's
 * "The End of the World"). Must match the server's `VOLCANO_TARGET_ID`.
 */
export const VOLCANO_TARGET_ID = '__volcano__'

/**
 * The same idea for the monster, which is also a target and also not a kingdom.
 * Must match the server's `MONSTER_TARGET_ID`.
 */
export const MONSTER_TARGET_ID = '__monster__'
