import type { SpiralConfig, Vec2 } from './types'

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

/**
 * Displaces a point perpendicular to the from→to line so a projectile
 * corkscrews around its own flight path (Kitsune's Fox Fire) instead of flying
 * straight. Mutates `pos` in place — this runs for every in-flight bolt, every
 * frame.
 *
 * The offset is a sine of `progress`, so it is zero at t=0: the bolt always
 * DEPARTS from the caster exactly. Whether it also lands exactly on the target
 * is up to the envelope — 'taper' collapses the coil to nothing by t=1, which
 * is why it is the default.
 */
export function applySpiral(
  pos: Vec2,
  from: Vec2,
  to: Vec2,
  progress: number,
  spiral: SpiralConfig,
): void {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return // degenerate: nothing to be perpendicular to

  // Unit normal to the flight path.
  const nx = -dy / length
  const ny = dx / length

  const envelope =
    spiral.envelope === 'even'
      ? 1
      : spiral.envelope === 'bloom'
        ? progress
        : 1 - progress // 'taper' (default): converge onto the target
  const angle = (progress * spiral.turns + (spiral.phase ?? 0)) * Math.PI * 2
  const offset = Math.sin(angle) * spiral.radius * envelope
  pos.x += nx * offset
  pos.y += ny * offset
}
