import type { BeamConfig, DisplayNode, Vec2 } from '../types'
import { ObjectPool, type PoolOptions } from '../pool'
import { ease } from '../easing'
import { angleBetween, distance } from '../trajectory'
import { UNIT_RADIUS, resetDisplayNode } from '../nodeUtil'

// Beam system (Epic 9). A charge-then-fire laser: a circular glow builds at the
// SOURCE for `chargeMs`, then a straight beam snaps out to the target and holds
// for `fireMs` while fading. `onFire` fires the instant the beam does (the
// framework uses it to trigger the impact/particles/shake), so the burst lands
// with the beam, not at cast time. Two pools — glow (unit circle) and beam
// (unit-length rect) — both driven by the shared per-frame update.

interface ActiveBeam {
  from: Vec2
  to: Vec2
  config: BeamConfig
  elapsed: number
  fired: boolean
  glow: DisplayNode | null
  beam: DisplayNode | null
  onFire?: (at: Vec2) => void
}

export class BeamSystem {
  private readonly glowPool: ObjectPool<DisplayNode>
  private readonly beamPool: ObjectPool<DisplayNode>
  private readonly items: ActiveBeam[] = []
  private readonly glowRadius: number

  constructor(
    createBeamNode: () => DisplayNode,
    createGlowNode: () => DisplayNode,
    // The beam sprite is a unit-length rect scaled in absolute world units; only
    // the (circular) charge glow needs a base radius to map `chargeSize` to a
    // scale factor.
    glowRadius = UNIT_RADIUS,
    poolOptions: PoolOptions = { prewarm: 2 },
  ) {
    this.glowRadius = glowRadius
    this.beamPool = new ObjectPool(createBeamNode, resetDisplayNode, poolOptions)
    this.glowPool = new ObjectPool(createGlowNode, resetDisplayNode, poolOptions)
  }

  /** Begin charging a beam from `from`; `onFire` fires when it snaps to `to`. */
  spawn(config: BeamConfig, from: Vec2, to: Vec2, onFire?: (at: Vec2) => void): void {
    const glow = this.glowPool.acquire()
    glow.visible = true
    glow.alpha = 0.25
    glow.tint = config.color
    glow.x = from.x
    glow.y = from.y
    glow.scale.set(0.001) // grows to chargeSize over chargeMs
    this.items.push({
      from: { x: from.x, y: from.y },
      to: { x: to.x, y: to.y },
      config,
      elapsed: 0,
      fired: false,
      glow,
      beam: null,
      onFire,
    })
  }

  update(dtMs: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const b = this.items[i]!
      b.elapsed += dtMs
      const { chargeMs, fireMs, width, color } = b.config

      // --- Charge phase: the glow builds at the source. ---
      if (b.elapsed < chargeMs) {
        const t = chargeMs <= 0 ? 1 : b.elapsed / chargeMs
        const e = ease(b.config.easing ?? 'easeIn', t)
        const chargeScale = (b.config.chargeSize ?? width * 2) / this.glowRadius
        if (b.glow) {
          b.glow.scale.set(chargeScale * e)
          b.glow.alpha = 0.25 + 0.75 * e // brightens as it charges
        }
        continue
      }

      // --- Fire: snap the beam out and trigger the burst, once. ---
      if (!b.fired) {
        b.fired = true
        if (b.glow) {
          this.glowPool.release(b.glow)
          b.glow = null
        }
        const beam = this.beamPool.acquire()
        beam.visible = true
        beam.alpha = 1
        beam.tint = color
        beam.x = b.from.x
        beam.y = b.from.y
        beam.rotation = angleBetween(b.from, b.to)
        beam.scale.set(distance(b.from, b.to), width) // length × thickness
        b.beam = beam
        b.onFire?.(b.to)
      }

      // --- Fire phase: the beam fades and thins out. ---
      const ft = fireMs <= 0 ? 1 : Math.min(1, (b.elapsed - chargeMs) / fireMs)
      if (b.beam) {
        b.beam.alpha = 1 - ft
        b.beam.scale.set(distance(b.from, b.to), width * (1 - 0.5 * ft))
      }

      if (b.elapsed >= chargeMs + fireMs) {
        if (b.beam) this.beamPool.release(b.beam)
        this.items.splice(i, 1)
      }
    }
  }

  /** Number of beams currently charging or firing. */
  get active(): number {
    return this.items.length
  }

  clear(): void {
    for (const b of this.items) {
      if (b.glow) this.glowPool.release(b.glow)
      if (b.beam) this.beamPool.release(b.beam)
    }
    this.items.length = 0
  }
}
