import type { Vec2 } from './types'

// Straight-line trajectory math (Epic 9, ticket #210). Pure geometry in the
// shared 1000×1000 arena space (placement.ts is the single source of truth for
// the A/B endpoints); no rendering, trivially testable.

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/** Point at parameter `t` (0→1) along the straight segment from → to. */
export function lerpPoint(from: Vec2, to: Vec2, t: number): Vec2 {
  return { x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) }
}

/** Facing angle (radians) from one point toward another. */
export function angleBetween(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x)
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}
