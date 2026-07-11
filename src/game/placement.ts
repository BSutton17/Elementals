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
