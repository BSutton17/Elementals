import type { BlobNode, DisplayNode, LavaFloorConfig, Vec2 } from '../types'
import { ObjectPool, type PoolOptions } from '../pool'
import { clamp01, ease } from '../easing'
import { UNIT_RADIUS, resetDisplayNode } from '../nodeUtil'

// Lava floor system (Magma's Floor is Lava, Epic 9). Molten ground that wells
// up out of the Magma castle and creeps outward until it has swallowed the
// whole battlefield, then cools and fades when the ability ends.
//
// Deliberately NOT a growing circle. A clean expanding ring reads as a
// targeting indicator or an aura — a UI element telling you about a radius.
// This is supposed to be MATERIAL flowing across the ground, so the edge is
// sampled at irregular radii that drift independently over time:
//
//   • the front   — each of `samples` directions carries its own radius bias
//     and its own slow wobble, so the flood advances in lobes and inlets and
//     never closes into a circle even at full spread.
//   • the surge   — the leading edge runs fastest early and creeps at the end
//     (easeOut), the way a spill loses momentum as it thins.
//   • the surface — bubbles and embers pop anywhere inside the covered area,
//     denser near the vent it came from, so the sheet reads as liquid rather
//     than as a flat shape.
//   • cooling     — stop(): the ability ended. The sheet does NOT retract (the
//     lava did not go anywhere); it darkens and fades in place.

/** Bubbles popping across the surface, per second, at full spread. */
const BUBBLE_RATE = 26
/** Hard cap on surface bubbles across ALL floods (protects frame time). */
const MAX_BUBBLES = 150

interface Bubble {
  node: DisplayNode
  x: number
  y: number
  vy: number
  ageMs: number
  lifeMs: number
  size: number
}

interface Flood {
  origin: Vec2
  config: LavaFloorConfig
  node: BlobNode
  ageMs: number
  /** Per-direction radius bias — what makes the edge lobed instead of round. */
  bias: number[]
  /** Per-direction wobble phase and speed, so the lobes also MOVE. */
  phase: number[]
  speed: number[]
  /** Cool automatically once this old, so the sheet matches the ability's own
   *  duration without the caller having to run a timer. */
  autoStopMs?: number
  /** Set by stop(): cooling in place, not retracting. */
  cooling: boolean
  coolMs: number
  bubbleDebt: number
}

export class LavaFloorSystem {
  private readonly bubblePool: ObjectPool<DisplayNode>
  private readonly createBlob: () => BlobNode
  private readonly floods = new Map<string, Flood>()
  private readonly bubbles: Bubble[] = []
  private readonly baseRadius: number
  private readonly rng: () => number

  constructor(
    createBlob: () => BlobNode,
    createBubble: () => DisplayNode,
    baseRadius = UNIT_RADIUS,
    options: { rng?: () => number } & PoolOptions = {},
  ) {
    this.createBlob = createBlob
    this.baseRadius = baseRadius
    this.rng = options.rng ?? Math.random
    this.bubblePool = new ObjectPool(createBubble, resetDisplayNode, {
      prewarm: options.prewarm ?? 32,
    })
  }

  /**
   * Opens a flood at `origin`, keyed by `key`. Re-starting one already running
   * leaves it alone rather than restarting the spread from nothing.
   *
   * `autoStopMs` is the ability's own duration: the sheet begins cooling by
   * itself once it elapses, so the visual can never outlive the molten ground
   * it is showing, and the caller does not have to keep a timer alive.
   */
  start(key: string, origin: Vec2, config: LavaFloorConfig, autoStopMs?: number): void {
    const existing = this.floods.get(key)
    if (existing && !existing.cooling) return
    if (existing) this.release(existing)

    const samples = Math.max(3, Math.round(config.samples))
    const bias: number[] = []
    const phase: number[] = []
    const speed: number[] = []

    // The outline is built from a few LOW-FREQUENCY HARMONICS rather than an
    // independent random per direction.
    //
    // Independent randoms were the reason this read as spiky: neighbouring
    // samples could differ by the full +/-30% with nothing connecting them, so
    // the edge was a run of unrelated spikes rather than a shape. Harmonics
    // vary smoothly with angle, so adjacent samples agree and the silhouette
    // comes out as lobes and inlets — which is what "never a circle" was
    // actually after.
    //
    // Two harmonics, deliberately: one sets the overall lopsidedness (2-3
    // lobes), the second adds a gentler ripple on top. More would start to look
    // like noise again.
    const lobes = 2 + Math.floor(this.rng() * 2); // 2 or 3 big lobes
    const ripples = lobes + 2 + Math.floor(this.rng() * 2);
    const lobePhase = this.rng() * Math.PI * 2;
    const ripplePhase = this.rng() * Math.PI * 2;
    // Split the budget so the big lobe dominates and the ripple decorates.
    const lobeAmp = config.roughness * 0.68;
    const rippleAmp = config.roughness * 0.32;

    for (let i = 0; i < samples; i++) {
      const angle = (i / samples) * Math.PI * 2;
      bias.push(
        1 +
          Math.sin(angle * lobes + lobePhase) * lobeAmp +
          Math.sin(angle * ripples + ripplePhase) * rippleAmp,
      );
      // The drift is a function of ANGLE too, so the edge breathes as a sheet
      // instead of every vertex shimmering on its own clock.
      phase.push(angle * lobes + lobePhase);
      speed.push(0.28 + this.rng() * 0.18);
    }

    this.floods.set(key, {
      origin: { x: origin.x, y: origin.y },
      config,
      node: this.createBlob(),
      ageMs: 0,
      autoStopMs,
      bias,
      phase,
      speed,
      cooling: false,
      coolMs: 0,
      bubbleDebt: 0,
    })
  }

  /** Ends a flood: the lava cools and fades where it lies. */
  stop(key: string): void {
    const flood = this.floods.get(key)
    if (!flood || flood.cooling) return
    flood.cooling = true
    flood.coolMs = 0
  }

  /** True while a flood is spreading (or cooling) under `key`. */
  has(key: string): boolean {
    return this.floods.has(key)
  }

  /** Number of floods currently on the field. */
  get active(): number {
    return this.floods.size
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000
    for (const [key, flood] of this.floods) {
      flood.ageMs += dtMs
      // The ability's duration ran out — start cooling on our own.
      if (
        !flood.cooling &&
        flood.autoStopMs !== undefined &&
        flood.ageMs >= flood.autoStopMs
      ) {
        flood.cooling = true
        flood.coolMs = 0
      }

      let alpha = flood.config.opacity
      if (flood.cooling) {
        flood.coolMs += dtMs
        const t = clamp01(flood.coolMs / flood.config.fadeMs)
        alpha *= 1 - t
        if (t >= 1) {
          this.release(flood)
          this.floods.delete(key)
          continue
        }
      }

      // The front surges early and creeps at the end, the way a spill loses
      // momentum as it thins out.
      const spread = ease('easeOut', clamp01(flood.ageMs / flood.config.spreadMs))
      const reach = flood.config.radius * spread
      const seconds = flood.ageMs / 1000

      const points: Vec2[] = []
      const samples = flood.bias.length
      for (let i = 0; i < samples; i++) {
        const angle = (i / samples) * Math.PI * 2
        // The lobes drift as well as differ, so the edge is never static.
        // Coherent along the edge, so the sheet swells and settles rather
        // than each vertex jittering independently.
        const wobble = 1 + Math.sin(flood.phase[i]! + seconds * flood.speed[i]!) * 0.055
        const r = reach * flood.bias[i]! * wobble
        points.push({
          x: flood.origin.x + Math.cos(angle) * r,
          // Squashed vertically: the lava is lying ON the battlefield, seen at
          // an angle, not standing up facing the camera.
          y: flood.origin.y + Math.sin(angle) * r * 0.82,
        })
      }
      flood.node.draw(points, flood.config.fillColor, flood.config.rimColor, alpha)

      // Surface bubbles, anywhere inside the sheet. Suppressed once cooling —
      // lava that is going out stops boiling.
      if (!flood.cooling && this.bubbles.length < MAX_BUBBLES) {
        flood.bubbleDebt += BUBBLE_RATE * spread * dt
        while (flood.bubbleDebt >= 1 && this.bubbles.length < MAX_BUBBLES) {
          flood.bubbleDebt -= 1
          this.spawnBubble(flood, reach)
        }
      }
    }
    this.updateBubbles(dtMs)
  }

  private spawnBubble(flood: Flood, reach: number): void {
    const node = this.bubblePool.acquire()
    node.visible = true
    node.tint = flood.config.emberColor
    // Biased toward the vent (sqrt would spread evenly by area; squaring the
    // roll pulls them inward), so the source stays the hottest part.
    const roll = this.rng()
    const dist = reach * roll * roll
    const angle = this.rng() * Math.PI * 2
    const size = 3 + this.rng() * 5
    node.scale.set(size / this.baseRadius)
    node.alpha = 0.9
    this.bubbles.push({
      node,
      x: flood.origin.x + Math.cos(angle) * dist,
      y: flood.origin.y + Math.sin(angle) * dist * 0.82,
      vy: -8 - this.rng() * 26,
      ageMs: 0,
      lifeMs: 380 + this.rng() * 420,
      size,
    })
  }

  private updateBubbles(dtMs: number): void {
    const dt = dtMs / 1000
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i]!
      b.ageMs += dtMs
      const t = clamp01(b.ageMs / b.lifeMs)
      if (t >= 1) {
        this.bubbles.splice(i, 1)
        this.bubblePool.release(b.node)
        continue
      }
      b.y += b.vy * dt
      b.node.x = b.x
      b.node.y = b.y
      b.node.alpha = (1 - t) * 0.9
      // Swells as it rises, then bursts — a bubble surfacing, not a spark.
      b.node.scale.set((b.size * (1 + t * 0.8)) / this.baseRadius)
    }
  }

  private release(flood: Flood): void {
    flood.node.clear()
    flood.node.destroy()
  }

  /** Drops every flood and bubble immediately (match end). */
  clear(): void {
    for (const flood of this.floods.values()) this.release(flood)
    this.floods.clear()
    for (const b of this.bubbles) this.bubblePool.release(b.node)
    this.bubbles.length = 0
  }
}
