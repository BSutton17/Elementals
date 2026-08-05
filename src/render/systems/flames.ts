import type { DisplayNode, FlameBurstConfig, Vec2 } from '../types'
import { ObjectPool, type PoolOptions } from '../pool'
import { clamp01 } from '../easing'
import { UNIT_RADIUS, resetDisplayNode } from '../nodeUtil'

// Flame system (Kitsune's Fox Fire, Epic 9). A detonation made of FIRE rather
// than of rings.
//
// The framework's impact ring is a circle that grows — clean, readable, and
// completely wrong for something that is supposed to be burning. This throws
// tongues of flame instead:
//
//   • tongues  — tapered flames hurled outward from the point of impact, each
//     at its own angle, its own reach and its own length. They stretch as they
//     travel, flicker, and burn out. The angles are jittered rather than evenly
//     spaced, so the burst has gaps and clumps like real fire instead of the
//     even spokes a loop over `i / count` would give.
//   • pockets  — the fire that is left behind. Small flames scattered around
//     the kingdom that ignite on a stagger, gutter in place for a few seconds,
//     and burn down one by one, so the ground is still alight well after the
//     explosion itself is gone.
//
// Appearance is tint + scale on a flame sprite, so any future kingdom's fire
// (Magma's especially) can reuse the whole thing by palette alone.

/** Fraction of a flame's life spent flaring up before it starts burning down. */
const IGNITE = 0.18

interface Flame {
  node: DisplayNode
  /** Where it burns (tongues advance along `angle`; pockets stay put). */
  x: number
  y: number
  originX: number
  originY: number
  angle: number
  /** How far a tongue travels from the origin. Zero for a pocket. */
  reach: number
  size: number
  ageMs: number
  /** Time before it lights at all — the stagger that makes fire spread. */
  delayMs: number
  lifeMs: number
  /** Own flicker rhythm, so no two flames pulse together. */
  flickerPhase: number
  flickerSpeed: number
  /** Tongues point the way they were thrown; pockets stand upright. */
  upright: boolean
}

export class FlameSystem {
  private readonly pool: ObjectPool<DisplayNode>
  private readonly flames: Flame[] = []
  private readonly baseRadius: number
  private readonly rng: () => number

  constructor(
    createFlame: () => DisplayNode,
    baseRadius = UNIT_RADIUS,
    options: { rng?: () => number } & PoolOptions = {},
  ) {
    this.baseRadius = baseRadius
    this.rng = options.rng ?? Math.random
    this.pool = new ObjectPool(createFlame, resetDisplayNode, { prewarm: options.prewarm ?? 24 })
  }

  /** Detonates at `at`: tongues outward, then pockets left burning around it. */
  burst(at: Vec2, config: FlameBurstConfig): void {
    const tongues = Math.max(0, Math.round(config.tongues))
    for (let i = 0; i < tongues; i++) {
      // Jittered around an even spread: enough structure to cover every
      // direction, enough disorder that the burst is never a wheel of spokes.
      const angle = (i / tongues) * Math.PI * 2 + (this.rng() - 0.5) * 1.5
      this.spawn({
        x: at.x,
        y: at.y,
        angle,
        reach: config.reach * (0.45 + this.rng() * 0.75),
        size: config.tongueSize * (0.6 + this.rng() * 0.8),
        // Staggered by a hair so the flames do not all peak on one frame.
        delayMs: this.rng() * 90,
        lifeMs: config.durationMs * (0.7 + this.rng() * 0.6),
        color: this.rng() < 0.4 ? config.coreColor : config.color,
        upright: false,
      })
    }

    const pockets = Math.max(0, Math.round(config.pockets ?? 0))
    if (pockets === 0) return
    const radius = config.pocketRadius ?? config.reach
    const pocketMs = config.pocketMs ?? 3000
    for (let i = 0; i < pockets; i++) {
      // Scattered by area rather than by angle, so they do not ring the castle.
      const angle = this.rng() * Math.PI * 2
      const dist = radius * Math.sqrt(this.rng())
      this.spawn({
        x: at.x + Math.cos(angle) * dist,
        // Squashed vertically: the pockets are lying on the ground around the
        // castle, not floating in a circle around it.
        y: at.y + Math.sin(angle) * dist * 0.55,
        angle: 0,
        reach: 0,
        size: (config.pocketSize ?? config.tongueSize * 0.7) * (0.7 + this.rng() * 0.7),
        // Fire spreads: each pocket catches a little later than the last.
        delayMs: this.rng() * 420,
        lifeMs: pocketMs * (0.7 + this.rng() * 0.55),
        color: this.rng() < 0.3 ? config.coreColor : config.color,
        upright: true,
      })
    }
  }

  private spawn(spec: {
    x: number
    y: number
    angle: number
    reach: number
    size: number
    delayMs: number
    lifeMs: number
    color: number
    upright: boolean
  }): void {
    const node = this.pool.acquire()
    // Hidden until it actually catches: a flame on a stagger has not started
    // burning yet, and fire spreading is half of what sells the pockets.
    node.visible = false
    node.alpha = 0
    node.tint = spec.color
    this.flames.push({
      node,
      x: spec.x,
      y: spec.y,
      originX: spec.x,
      originY: spec.y,
      angle: spec.angle,
      reach: spec.reach,
      size: spec.size,
      ageMs: 0,
      delayMs: spec.delayMs,
      lifeMs: Math.max(1, spec.lifeMs),
      flickerPhase: this.rng() * Math.PI * 2,
      flickerSpeed: 9 + this.rng() * 11,
      upright: spec.upright,
    })
  }

  /** Number of flames currently alight (including ones yet to catch). */
  get active(): number {
    return this.flames.length
  }

  update(dtMs: number): void {
    for (let i = this.flames.length - 1; i >= 0; i--) {
      const f = this.flames[i]!
      f.ageMs += dtMs
      const lit = f.ageMs - f.delayMs
      if (lit < 0) continue // not caught yet
      f.node.visible = true

      const t = clamp01(lit / f.lifeMs)
      if (t >= 1) {
        this.flames.splice(i, 1)
        this.pool.release(f.node)
        continue
      }

      // A tongue races out fast and then stalls, the way a flame front does.
      if (f.reach > 0) {
        const travel = 1 - Math.pow(1 - t, 2.4)
        f.x = f.originX + Math.cos(f.angle) * f.reach * travel
        f.y = f.originY + Math.sin(f.angle) * f.reach * travel * 0.8
      }

      // Flare up hard, then burn down slowly — fire is never symmetric in time.
      const envelope = t < IGNITE ? t / IGNITE : 1 - (t - IGNITE) / (1 - IGNITE)
      const flicker = 0.82 + 0.18 * Math.sin(f.flickerPhase + (lit / 1000) * f.flickerSpeed)
      const scale = (f.size / this.baseRadius) * envelope * flicker

      f.node.x = f.x
      f.node.y = f.y
      f.node.alpha = Math.min(1, envelope * 1.25)
      // A tongue points the way it was thrown; a pocket stands up off the
      // ground and sways, because that is what a fire burning in place does.
      f.node.rotation = f.upright
        ? -Math.PI / 2 + Math.sin(f.flickerPhase + (lit / 1000) * 3.5) * 0.22
        : f.angle
      // Stretched along its own axis: a flame is a tongue, not a blob.
      f.node.scale.set(scale * (f.upright ? 1 : 1.5), scale)
    }
  }

  /** Puts every flame out immediately (match end). */
  clear(): void {
    for (const f of this.flames) this.pool.release(f.node)
    this.flames.length = 0
  }
}
