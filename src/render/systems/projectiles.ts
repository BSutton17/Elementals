import type { DisplayNode, ProjectileConfig, ProjectileShape, Vec2 } from '../types'
import { ObjectPool, type PoolOptions } from '../pool'
import { ease } from '../easing'
import { angleBetween, applySpiral, lerpPoint } from '../trajectory'
import { UNIT_RADIUS, resetDisplayNode } from '../nodeUtil'

/**
 * A gravitational singularity (Space's Supernova, levels 2/3): while active,
 * EVERY in-flight projectile — any kingdom's, any ability, already airborne or
 * launched while the well is up — visibly bends toward `at` as it passes within
 * `radius`, without altering its own arrival time or target. This is the
 * "projectile path bending" primitive the whole framework shares; a well is
 * keyed so several (future) abilities could park independent wells.
 */
export interface GravityWell {
  at: Vec2
  /** Influence radius, world units — no pull at or beyond this distance. */
  radius: number
  /** Peak inward displacement at the well's edge, world units. Fades linearly
   *  toward the well's center at the SAME rate it fades near the projectile's
   *  own arrival, so a projectile still lands exactly on its real target. */
  strength: number
}

// Projectile system (Epic 9, ticket #210). An attack travels in a STRAIGHT LINE
// from A to B over a data-defined `durationMs`, then invokes `onArrive` (which
// the framework uses to trigger the impact/particles at B). Nodes are pooled,
// with a separate pool per SHAPE (circle blobs vs. Icicle spikes) so each keeps
// its own silhouette; an unknown/missing shape falls back to the circle pool.

/**
 * A running bob for four-legged projectiles (Kitsune's foxes). Lifts the sprite
 * through each bound and pitches its body with the stride. Applied AFTER the
 * path, so it is pure animation — it never changes where the projectile is
 * heading or when it gets there.
 */
export function applyGait(
  node: DisplayNode,
  from: Vec2,
  to: Vec2,
  elapsedMs: number,
  config: ProjectileConfig,
): void {
  const gait = config.gait
  if (!gait) return
  const beat = (elapsedMs / 1000) * gait.rate + (gait.phase ?? 0)
  // |sin| so every bound arcs UPWARD: a plain sine would drive the fox into
  // the ground on alternate strides.
  node.y -= Math.abs(Math.sin(beat * Math.PI)) * gait.bounce
  if (gait.tilt) {
    // Pitch about the direction of travel — nose up on the rise, down on the
    // landing — rather than about world zero, or the fox would run sideways.
    const base = config.faceDirection ? angleBetween(from, to) : node.rotation
    node.rotation = base + Math.cos(beat * Math.PI * 2) * gait.tilt
  }
}

interface ActiveProjectile {
  node: DisplayNode
  pool: ObjectPool<DisplayNode> // the pool this node came from (per shape)
  from: Vec2
  to: Vec2
  config: ProjectileConfig
  elapsed: number
  onArrive?: (at: Vec2) => void
  onStep?: (at: Vec2, dtMs: number) => void
}

// A held projectile — the "pause controller" for Air's redirect (Epic 9). A
// projectile that has arrived at the deflection point is suspended in place for
// a beat while it rotates from its incoming heading to its new one, keeping its
// full visual identity (size/tint), before being relaunched. A subtle scale
// pulse sells "caught by an invisible force".
interface HeldProjectile {
  node: DisplayNode
  pool: ObjectPool<DisplayNode>
  fromAngle: number
  toAngle: number
  baseScale: number
  durationMs: number
  elapsed: number
  onDone: () => void
}

/** Shortest signed angular delta from `a` to `b`, in [−π, π]. */
function shortestAngle(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

export class ProjectileSystem {
  /** One pool per shape; 'circle' always exists and is the fallback. */
  private readonly pools = new Map<ProjectileShape, ObjectPool<DisplayNode>>()
  private readonly circlePool: ObjectPool<DisplayNode>
  private readonly items: ActiveProjectile[] = []
  private readonly holds: HeldProjectile[] = []
  private readonly baseRadius: number
  private readonly wells = new Map<string, GravityWell>()

  constructor(
    createNode: () => DisplayNode,
    baseRadius = UNIT_RADIUS,
    poolOptions: PoolOptions = { prewarm: 8 },
    /** Extra per-shape node factories (e.g. `{ triangle }`). Omitted shapes fall
     *  back to the circle pool, so tests that inject only a circle still work. */
    shapeFactories?: Partial<Record<ProjectileShape, () => DisplayNode>>,
  ) {
    this.baseRadius = baseRadius
    this.circlePool = new ObjectPool(createNode, resetDisplayNode, poolOptions)
    this.pools.set('circle', this.circlePool)
    for (const [shape, factory] of Object.entries(shapeFactories ?? {})) {
      if (factory) this.pools.set(shape as ProjectileShape, new ObjectPool(factory, resetDisplayNode, poolOptions))
    }
  }

  /** The pool for a config's shape, falling back to circle when unregistered. */
  private poolFor(shape: ProjectileShape | undefined): ObjectPool<DisplayNode> {
    return (shape && this.pools.get(shape)) || this.circlePool
  }

  /**
   * Launch a projectile from `from` to `to`. `onArrive` fires once it lands;
   * `onStep` fires each frame with the projectile's current position (used to
   * stream a trail along the path).
   */
  spawn(
    config: ProjectileConfig,
    from: Vec2,
    to: Vec2,
    onArrive?: (at: Vec2) => void,
    onStep?: (at: Vec2, dtMs: number) => void,
  ): void {
    const pool = this.poolFor(config.shape)
    const node = pool.acquire()
    node.visible = true
    node.alpha = 1
    node.tint = config.color
    node.x = from.x
    node.y = from.y
    node.scale.set(config.size / this.baseRadius)
    if (config.faceDirection) node.rotation = angleBetween(from, to)
    this.items.push({
      node,
      pool,
      from: { x: from.x, y: from.y },
      to: { x: to.x, y: to.y },
      config,
      elapsed: 0,
      onArrive,
      onStep,
    })
  }

  /**
   * Suspend a projectile at `at` for `durationMs` (the redirect "pause
   * controller"): it holds position while its rotation eases from its incoming
   * heading (`faceFrom` → `at`) to its new heading (`at` → `faceTo`), with a
   * subtle scale pulse, then releases and fires `onDone`. Keeps the projectile's
   * original size/tint so a Fireball still looks like a Fireball, etc. Reusable
   * for any future "catch and relaunch" behaviour, not just Air's deflection.
   */
  hold(
    config: ProjectileConfig,
    at: Vec2,
    faceFrom: Vec2,
    faceTo: Vec2,
    durationMs: number,
    onDone: () => void,
  ): void {
    const pool = this.poolFor(config.shape)
    const node = pool.acquire()
    const baseScale = config.size / this.baseRadius
    node.visible = true
    node.alpha = 1
    node.tint = config.color
    node.x = at.x
    node.y = at.y
    node.scale.set(baseScale)
    node.rotation = angleBetween(faceFrom, at)
    this.holds.push({
      node,
      pool,
      fromAngle: angleBetween(faceFrom, at),
      toAngle: angleBetween(at, faceTo),
      baseScale,
      durationMs: Math.max(1, durationMs),
      elapsed: 0,
      onDone,
    })
  }

  /** Parks (or replaces) a gravity well under `id`. */
  addWell(id: string, well: GravityWell): void {
    this.wells.set(id, well)
  }

  /** Removes a gravity well; projectiles fly straight again immediately. */
  removeWell(id: string): void {
    this.wells.delete(id)
  }

  /** Number of gravity wells currently bending flight paths. */
  get wellCount(): number {
    return this.wells.size
  }

  /** Displaces `pos` toward any nearby wells — in place — fading to zero both
   *  at the well's edge and as the projectile nears its OWN arrival (`raw`→1),
   *  so bending is visible mid-flight but every projectile still lands exactly
   *  on its real target. */
  private bendTowardWells(pos: Vec2, raw: number): void {
    if (this.wells.size === 0) return
    const arrivalFade = 1 - raw
    if (arrivalFade <= 0) return
    for (const well of this.wells.values()) {
      const dx = well.at.x - pos.x
      const dy = well.at.y - pos.y
      const d = Math.hypot(dx, dy)
      if (d <= 0 || d >= well.radius) continue
      const proximity = 1 - d / well.radius
      const pull = well.strength * proximity * arrivalFade
      pos.x += (dx / d) * pull
      pos.y += (dy / d) * pull
    }
  }

  update(dtMs: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i]!
      p.elapsed += dtMs
      const raw = p.config.durationMs <= 0 ? 1 : Math.min(1, p.elapsed / p.config.durationMs)
      const pos = lerpPoint(p.from, p.to, ease(p.config.easing, raw))
      // A spiral is applied as a perpendicular offset to the straight path, so
      // the projectile still departs and arrives exactly where it should — the
      // curve is presentation, never a change of destination.
      if (p.config.spiral) applySpiral(pos, p.from, p.to, raw, p.config.spiral)
      this.bendTowardWells(pos, raw)
      p.node.x = pos.x
      p.node.y = pos.y
      // A lob, applied AFTER the path and always toward the top of the screen,
      // so a shot fired left and one fired right arc the same way (see `arc`).
      if (p.config.arc) p.node.y -= Math.sin(raw * Math.PI) * p.config.arc
      if (p.config.gait) applyGait(p.node, p.from, p.to, p.elapsed, p.config)
      if (!p.config.faceDirection && p.config.spin) {
        p.node.rotation += p.config.spin * (dtMs / 1000)
      }
      p.onStep?.(pos, dtMs)
      if (raw >= 1) {
        this.items.splice(i, 1)
        p.pool.release(p.node)
        p.onArrive?.(p.to)
      }
    }
    for (let i = this.holds.length - 1; i >= 0; i--) {
      const h = this.holds[i]!
      h.elapsed += dtMs
      const raw = Math.min(1, h.elapsed / h.durationMs)
      const e = ease('easeOut', raw)
      h.node.rotation = h.fromAngle + shortestAngle(h.fromAngle, h.toAngle) * e
      // A brief squash (caught by compressed wind) that recovers as it releases.
      const pulse = 1 - 0.18 * Math.sin(raw * Math.PI)
      h.node.scale.set(h.baseScale * pulse)
      if (raw >= 1) {
        this.holds.splice(i, 1)
        h.pool.release(h.node)
        h.onDone()
      }
    }
  }

  /** Number of projectiles currently in flight. */
  get active(): number {
    return this.items.length
  }

  /** Number of projectiles currently suspended in a redirect pause. */
  get holding(): number {
    return this.holds.length
  }

  clear(): void {
    for (const p of this.items) p.pool.release(p.node)
    this.items.length = 0
    for (const h of this.holds) h.pool.release(h.node)
    this.holds.length = 0
    this.wells.clear()
  }
}
