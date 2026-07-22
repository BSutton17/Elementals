import type { BeamConfig, DisplayNode, Vec2 } from '../types'
import { ObjectPool, type PoolOptions } from '../pool'
import { ease } from '../easing'
import { angleBetween, distance } from '../trajectory'
import { UNIT_RADIUS, resetDisplayNode } from '../nodeUtil'

// Beam system (Epic 9) — Fire's Scorching Sun SOLAR LASER. A charge-then-fire
// star-beam, driven by the shared per-frame update and organized into modules:
//
//   • charge orb    — a white-hot sphere of compressed solar energy grows in
//     front of the caster, pulsing faster and brighter as it nears critical.
//   • convergence    — flames/embers/sparks are pulled INWARD into the orb, with
//     a faint aim-ray telegraphing the firing line late in the charge.
//   • heat ripples    — expanding blooms of distortion radiate off the orb.
//   • layered beam    — on fire, stacked ADDITIVE layers (outer corona → orange
//     plasma → yellow inner → blinding white core) snap out to the target; the
//     corona flickers/expands/contracts and the whole thing fades over its brief
//     life.
//   • plasma currents — bright streaks surge FORWARD along the beam while embers,
//     sparks, and ash peel away perpendicular and drift off before fading.
//   • detonation      — at the target, a white flash erupts into expanding plasma
//     rings, radial solar flares, and molten embers (the shockwave ring + shake
//     come from the EffectDefinition's burst via `onFire`).
//
// Two pools — additive glow (unit circle: orb, sparks, embers, rings, flares) and
// additive beam (unit-length rect: the beam layers + aim ray). `onFire` fires the
// instant the beam does, so the burst lands with the beam. Everything is pooled
// and the particle count is capped for frame time.

const MAX_PARTICLES = 420
/** Beam layers, outer → inner, as [width multiple of core, alpha]. */
const LAYERS: { widthMul: number; alpha: number; hue: 'corona' | 'plasma' | 'inner' | 'core' }[] = [
  { widthMul: 4.2, alpha: 0.34, hue: 'corona' },
  { widthMul: 2.4, alpha: 0.55, hue: 'plasma' },
  { widthMul: 1.35, alpha: 0.8, hue: 'inner' },
  { widthMul: 0.55, alpha: 1, hue: 'core' },
]

type Behavior = 'spark' | 'ember' | 'plasma' | 'flare' | 'bloom'

interface Particle {
  node: DisplayNode
  x: number
  y: number
  vx: number
  vy: number
  gravity: number
  age: number
  life: number
  size: number
  grow: number // scale multiplier reached at end of life
  stretch: number // >1 = elongated along velocity (streaks/flares)
  behavior: Behavior
  baseAlpha: number
}

interface ActiveBeam {
  from: Vec2
  to: Vec2
  angle: number
  length: number
  config: BeamConfig
  elapsed: number
  fired: boolean
  seed: number
  chargeDebt: number
  emitDebt: number
  core: DisplayNode | null // charge orb core
  halo: DisplayNode | null // charge orb halo
  aim: DisplayNode | null // faint aim-ray telegraph
  layers: DisplayNode[] // fire beam layers
  onFire?: (at: Vec2) => void
}

/** Resolve the solar palette from a config, each hue falling back to `color`. */
function palette(c: BeamConfig) {
  return {
    core: c.coreColor ?? 0xffffff,
    inner: c.innerColor ?? c.color,
    plasma: c.plasmaColor ?? c.color,
    corona: c.coronaColor ?? c.color,
    ember: c.emberColor ?? c.color,
  }
}

export class BeamSystem {
  private readonly glowPool: ObjectPool<DisplayNode>
  private readonly beamPool: ObjectPool<DisplayNode>
  private readonly items: ActiveBeam[] = []
  private readonly particles: Particle[] = []
  private readonly glowRadius: number
  private readonly rng: () => number

  constructor(
    createBeamNode: () => DisplayNode,
    createGlowNode: () => DisplayNode,
    glowRadius = UNIT_RADIUS,
    options: { rng?: () => number } & PoolOptions = {},
  ) {
    this.glowRadius = glowRadius
    this.rng = options.rng ?? Math.random
    this.beamPool = new ObjectPool(createBeamNode, resetDisplayNode, { prewarm: options.prewarm ?? 6 })
    this.glowPool = new ObjectPool(createGlowNode, resetDisplayNode, { prewarm: 24 })
  }

  /** Begin charging a beam from `from`; `onFire` fires when it snaps to `to`. */
  spawn(config: BeamConfig, from: Vec2, to: Vec2, onFire?: (at: Vec2) => void): void {
    const pal = palette(config)
    const core = this.glowPool.acquire()
    core.visible = true
    core.alpha = 0
    core.tint = pal.core
    core.x = from.x
    core.y = from.y
    core.scale.set(0.001)
    const halo = this.glowPool.acquire()
    halo.visible = true
    halo.alpha = 0
    halo.tint = pal.plasma
    halo.x = from.x
    halo.y = from.y
    halo.scale.set(0.001)
    this.items.push({
      from: { x: from.x, y: from.y },
      to: { x: to.x, y: to.y },
      angle: angleBetween(from, to),
      length: distance(from, to),
      config,
      elapsed: 0,
      fired: false,
      seed: this.rng() * Math.PI * 2,
      chargeDebt: 0,
      emitDebt: 0,
      core,
      halo,
      aim: null,
      layers: [],
      onFire,
    })
  }

  update(dtMs: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const b = this.items[i]!
      b.elapsed += dtMs
      if (b.elapsed < b.config.chargeMs) {
        this.updateCharge(b, dtMs)
        continue
      }
      if (!b.fired) this.fire(b)
      this.updateFire(b, dtMs)
      if (b.elapsed >= b.config.chargeMs + b.config.fireMs) {
        for (const l of b.layers) this.beamPool.release(l)
        b.layers.length = 0
        this.items.splice(i, 1)
      }
    }
    this.updateParticles(dtMs)
  }

  // --- Charge: growing orb + inward convergence + aim telegraph --------------

  private updateCharge(b: ActiveBeam, dtMs: number): void {
    const pal = palette(b.config)
    const t = b.config.chargeMs <= 0 ? 1 : b.elapsed / b.config.chargeMs
    const e = ease(b.config.easing ?? 'easeIn', t)
    // Pulse accelerates toward critical intensity.
    const pulse = 1 + 0.18 * Math.sin((b.elapsed / 1000) * (10 + 46 * t) + b.seed)
    const chargeSize = b.config.chargeSize ?? b.config.width * 2
    if (b.core) {
      b.core.scale.set((chargeSize * 0.62 * e * pulse) / this.glowRadius)
      b.core.alpha = 0.5 + 0.5 * e
      b.core.tint = pal.core
    }
    if (b.halo) {
      b.halo.scale.set((chargeSize * e * pulse) / this.glowRadius)
      b.halo.alpha = (0.25 + 0.4 * e) * (0.85 + 0.15 * Math.sin((b.elapsed / 1000) * 8))
      b.halo.tint = pal.plasma
    }
    // Convergence: sparks pulled inward, more as the charge intensifies.
    b.chargeDebt += (30 + 90 * e) * (dtMs / 1000)
    while (b.chargeDebt >= 1) {
      b.chargeDebt -= 1
      this.spawnConverging(b, pal, chargeSize)
    }
    // Heat ripple blooms off the orb.
    if (this.rng() < 0.06 + 0.14 * e) this.spawnBloom(b.from, pal.plasma, chargeSize * 1.6, 0.18)
    // Aim-ray telegraph in the last ~45% of the charge.
    if (t > 0.55) {
      if (!b.aim) {
        b.aim = this.beamPool.acquire()
        b.aim.visible = true
        b.aim.tint = pal.inner
        b.aim.x = b.from.x
        b.aim.y = b.from.y
        b.aim.rotation = b.angle
      }
      const at = (t - 0.55) / 0.45
      b.aim.alpha = 0.06 + 0.16 * at * (0.7 + 0.3 * Math.sin(b.elapsed / 40))
      b.aim.scale.set(b.length, b.config.width * 0.4 * at)
    }
  }

  private spawnConverging(b: ActiveBeam, pal: ReturnType<typeof palette>, chargeSize: number): void {
    const node = this.take(this.rng() < 0.5 ? pal.inner : pal.ember)
    if (!node) return
    // Bias the spawn ring toward the firing line so the direction reads.
    const biased = this.rng() < 0.5
    const a = biased ? b.angle + Math.PI + (this.rng() * 2 - 1) * 0.7 : this.rng() * Math.PI * 2
    const r = chargeSize * (2.2 + this.rng() * 2.4)
    const x = b.from.x + Math.cos(a) * r
    const y = b.from.y + Math.sin(a) * r
    const life = 260 + this.rng() * 160
    const dist = Math.hypot(b.from.x - x, b.from.y - y)
    const speed = dist / (life / 1000)
    const dir = Math.atan2(b.from.y - y, b.from.x - x)
    this.push({
      node, x, y,
      vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed,
      gravity: 0, age: 0, life,
      size: 2 + this.rng() * 3, grow: 0.4, stretch: 2, behavior: 'spark', baseAlpha: 0.9,
    })
  }

  // --- Fire: the layered beam snaps out; detonation at the target ------------

  private fire(b: ActiveBeam): void {
    b.fired = true
    const pal = palette(b.config)
    if (b.core) { this.glowPool.release(b.core); b.core = null }
    if (b.halo) { this.glowPool.release(b.halo); b.halo = null }
    if (b.aim) { this.beamPool.release(b.aim); b.aim = null }
    for (const layer of LAYERS) {
      const node = this.beamPool.acquire()
      node.visible = true
      node.alpha = layer.alpha
      node.tint = pal[layer.hue]
      node.x = b.from.x
      node.y = b.from.y
      node.rotation = b.angle
      node.scale.set(b.length, b.config.width * layer.widthMul)
      b.layers.push(node)
    }
    b.onFire?.(b.to)
    this.detonate(b.to, pal, b.config.width)
  }

  private updateFire(b: ActiveBeam, dtMs: number): void {
    const pal = palette(b.config)
    const ft = b.config.fireMs <= 0 ? 1 : Math.min(1, (b.elapsed - b.config.chargeMs) / b.config.fireMs)
    const life = 1 - ft
    const now = b.elapsed / 1000
    for (let k = 0; k < b.layers.length; k++) {
      const spec = LAYERS[k]!
      const node = b.layers[k]!
      // The corona flickers + breathes; inner layers stay steadier.
      const flicker = spec.hue === 'corona'
        ? 0.7 + 0.3 * Math.sin(now * 40 + b.seed) + 0.15 * Math.sin(now * 17)
        : 0.9 + 0.1 * Math.sin(now * 26 + k)
      const breathe = spec.hue === 'corona' ? 1 + 0.28 * Math.sin(now * 22 + b.seed) : 1
      node.alpha = spec.alpha * flicker * (spec.hue === 'core' ? 1 - 0.5 * ft : life)
      node.scale.set(b.length, b.config.width * spec.widthMul * breathe)
    }
    // Plasma currents surging forward + embers/ash peeling away along the beam.
    b.emitDebt += 90 * (dtMs / 1000)
    while (b.emitDebt >= 1) {
      b.emitDebt -= 1
      this.spawnAlongBeam(b, pal)
    }
  }

  private spawnAlongBeam(b: ActiveBeam, pal: ReturnType<typeof palette>): void {
    const f = this.rng()
    const px = b.from.x + (b.to.x - b.from.x) * f
    const py = b.from.y + (b.to.y - b.from.y) * f
    const roll = this.rng()
    if (roll < 0.5) {
      // Plasma current: a bright streak surging FORWARD along the beam.
      const node = this.take(this.rng() < 0.5 ? pal.core : pal.inner)
      if (!node) return
      const spd = 620 + this.rng() * 520
      this.push({
        node, x: px, y: py,
        vx: Math.cos(b.angle) * spd, vy: Math.sin(b.angle) * spd,
        gravity: 0, age: 0, life: 150 + this.rng() * 120,
        size: 2 + this.rng() * 2, grow: 0.5, stretch: 3.2, behavior: 'plasma', baseAlpha: 0.95,
      })
    } else {
      // Ember / spark / ash peeling away perpendicular, then drifting off.
      const side = this.rng() < 0.5 ? 1 : -1
      const perp = b.angle + (side * Math.PI) / 2
      const spd = 60 + this.rng() * 150
      const ash = roll > 0.85
      this.push({
        node: this.take(ash ? pal.corona : pal.ember)!, x: px, y: py,
        vx: Math.cos(perp) * spd + Math.cos(b.angle) * 40,
        vy: Math.sin(perp) * spd + Math.sin(b.angle) * 40 - 20,
        gravity: ash ? -20 : 90, age: 0, life: 360 + this.rng() * 340,
        size: ash ? 3 + this.rng() * 3 : 2 + this.rng() * 2,
        grow: ash ? 1.6 : 0.4, stretch: 1, behavior: 'ember', baseAlpha: ash ? 0.4 : 0.9,
      })
    }
  }

  /** The solar detonation: white flash → plasma rings → flares → molten embers. */
  private detonate(at: Vec2, pal: ReturnType<typeof palette>, width: number): void {
    // Brilliant white flash.
    this.spawnBloom(at, pal.core, width * 7, 0.95, 180)
    // Expanding plasma rings.
    this.spawnBloom(at, pal.inner, width * 11, 0.6, 320)
    this.spawnBloom(at, pal.plasma, width * 16, 0.45, 460)
    this.spawnBloom(at, pal.corona, width * 22, 0.3, 620)
    // Radial solar flares (elongated glow shooting outward).
    for (let i = 0; i < 10; i++) {
      const a = this.rng() * Math.PI * 2
      const spd = 260 + this.rng() * 420
      const node = this.take(this.rng() < 0.5 ? pal.inner : pal.plasma)
      if (!node) break
      this.push({
        node, x: at.x, y: at.y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        gravity: 0, age: 0, life: 300 + this.rng() * 240,
        size: 4 + this.rng() * 4, grow: 0.3, stretch: 4, behavior: 'flare', baseAlpha: 0.95,
      })
    }
    // Molten embers flung out under gravity.
    for (let i = 0; i < 24; i++) {
      const a = this.rng() * Math.PI * 2
      const spd = 180 + this.rng() * 460
      const node = this.take(pal.ember)
      if (!node) break
      this.push({
        node, x: at.x, y: at.y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 40,
        gravity: 320, age: 0, life: 520 + this.rng() * 420,
        size: 3 + this.rng() * 4, grow: 0.4, stretch: 1, behavior: 'ember', baseAlpha: 0.95,
      })
    }
  }

  private spawnBloom(at: Vec2, tint: number, size: number, alpha: number, life = 300): void {
    const node = this.take(tint)
    if (!node) return
    this.push({
      node, x: at.x, y: at.y,
      vx: 0, vy: 0, gravity: 0, age: 0, life,
      size, grow: 1, stretch: 1, behavior: 'bloom', baseAlpha: alpha,
    })
  }

  // --- Shared particle update -----------------------------------------------

  private updateParticles(dtMs: number): void {
    const dt = dtMs / 1000
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!
      p.age += dtMs
      const lf = Math.min(1, p.age / p.life)
      if (lf >= 1) {
        this.glowPool.release(p.node)
        this.particles.splice(i, 1)
        continue
      }
      p.vy += p.gravity * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.node.x = p.x
      p.node.y = p.y
      if (p.stretch !== 1 && (p.vx || p.vy)) {
        p.node.rotation = Math.atan2(p.vy, p.vx)
        const sc = (p.size * (1 + (p.grow - 1) * lf)) / this.glowRadius
        p.node.scale.set(sc * p.stretch, sc)
      } else {
        const sc = (p.size * (1 + (p.grow - 1) * lf)) / this.glowRadius
        p.node.scale.set(sc)
      }
      // Blooms fade out; the rest fade out too, flares/plasma pop then vanish.
      p.node.alpha = p.baseAlpha * (1 - lf)
    }
  }

  // --- Pool helpers ---------------------------------------------------------

  private take(tint: number): DisplayNode | null {
    if (this.particles.length >= MAX_PARTICLES) return null
    const node = this.glowPool.acquire()
    node.visible = true
    node.alpha = 0
    node.tint = tint
    node.rotation = 0
    return node
  }

  private push(p: Particle): void {
    p.node.x = p.x
    p.node.y = p.y
    p.node.scale.set(p.size / this.glowRadius)
    this.particles.push(p)
  }

  /** Number of beams currently charging or firing. */
  get active(): number {
    return this.items.length
  }

  /** Total live beam particles — exposed for tests/inspection. */
  get particleCount(): number {
    return this.particles.length
  }

  clear(): void {
    for (const b of this.items) {
      if (b.core) this.glowPool.release(b.core)
      if (b.halo) this.glowPool.release(b.halo)
      if (b.aim) this.beamPool.release(b.aim)
      for (const l of b.layers) this.beamPool.release(l)
    }
    this.items.length = 0
    for (const p of this.particles) this.glowPool.release(p.node)
    this.particles.length = 0
  }
}
