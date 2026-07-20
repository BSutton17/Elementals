import type { DisplayNode, WaveConfig, Vec2 } from '../types'
import { ObjectPool, type PoolOptions } from '../pool'
import { ease, clamp01 } from '../easing'
import { lerpPoint, distance } from '../trajectory'
import { UNIT_RADIUS, resetDisplayNode } from '../nodeUtil'

// Wave system (Epic 9). A traveling wave of water (Water's Waterfall; reusable
// for future tidal/tsunami abilities). It is deliberately NOT a moving sprite —
// it layers procedural animation so it reads as a heavy, living mass of water:
//
//   • gather   — for `gatherMs` the water swells and swirls at the CASTER
//     (anticipation) before launching.
//   • body     — a cluster of translucent body blobs + a couple of darker
//     interior blobs churn around the wave centre with per-blob wobble, so the
//     silhouette is never rigid.
//   • crest     — bright additive foam blobs ride the leading edge.
//   • spray     — foam, mist, and bubbles are emitted CONTINUOUSLY along the
//     path (not just at spawn), inheriting the wave's forward velocity plus a
//     randomized up/out kick; mist rises and lingers, droplets fall under
//     gravity — this becomes the trailing wake.
//   • travel   — non-linear ease (accelerate out, decelerate into impact); the
//     mass also rises then settles, so it has weight.
//   • impact   — on arrival the body collapses and a directional splash of
//     droplets + mist bursts forward/outward (the ring/particles/shake proper
//     come from the EffectDefinition's burst via `onArrive`).
//
// Pooled; driven by the shared per-frame update. Body/droplets use the normal
// circle factory; foam/mist/highlights use the additive glow factory.

const DEFAULT_BLOBS = 5
const DEFAULT_SPRAY_RATE = 70
const MAX_PARTICLES = 340
/** Fraction of the body that is darker "deep" water. */
const DEEP_FRACTION = 0.35

interface BodyBlob {
  node: DisplayNode
  kind: 'body' | 'deep' | 'foam'
  along: number // position along the travel axis, in size units
  across: number // position across the travel axis, in size units
  sizeMul: number
  wobbleFreq: number
  wobblePhase: number
}

interface WaveParticle {
  node: DisplayNode
  x: number
  y: number
  vx: number
  vy: number
  gravity: number
  age: number
  lifetime: number
  size0: number
  growth: number
  glow: boolean
}

interface ActiveWave {
  from: Vec2
  to: Vec2
  fwd: Vec2 // unit forward
  perp: Vec2 // unit perpendicular
  config: WaveConfig
  elapsed: number
  arrived: boolean
  sprayDebt: number
  blobs: BodyBlob[]
  onArrive?: (at: Vec2) => void
}

export class WaveSystem {
  private readonly bodyPool: ObjectPool<DisplayNode>
  private readonly glowPool: ObjectPool<DisplayNode>
  private readonly waves: ActiveWave[] = []
  private readonly particles: WaveParticle[] = []
  private readonly baseRadius: number
  private readonly rng: () => number

  constructor(
    createBodyNode: () => DisplayNode,
    createGlowNode: () => DisplayNode,
    baseRadius = UNIT_RADIUS,
    options: { rng?: () => number } & PoolOptions = {},
  ) {
    this.baseRadius = baseRadius
    this.rng = options.rng ?? Math.random
    this.bodyPool = new ObjectPool(createBodyNode, resetDisplayNode, { prewarm: options.prewarm ?? 10 })
    this.glowPool = new ObjectPool(createGlowNode, resetDisplayNode, { prewarm: 40 })
  }

  /** Launch a wave from `from` to `to`; `onArrive` fires the splash at `to`. */
  spawn(config: WaveConfig, from: Vec2, to: Vec2, onArrive?: (at: Vec2) => void): void {
    const dist = Math.max(1, distance(from, to))
    const fwd = { x: (to.x - from.x) / dist, y: (to.y - from.y) / dist }
    const perp = { x: -fwd.y, y: fwd.x }
    const count = Math.max(1, Math.round(config.blobs ?? DEFAULT_BLOBS))
    const blobs: BodyBlob[] = []
    for (let i = 0; i < count; i++) {
      const frac = count === 1 ? 0 : i / (count - 1)
      const deep = this.rng() < DEEP_FRACTION
      const node = deep ? this.bodyPool.acquire() : this.bodyPool.acquire()
      node.visible = true
      node.alpha = 0
      blobs.push({
        node,
        kind: deep ? 'deep' : 'body',
        // Spread the mass along the travel axis; bias toward the trailing side
        // so the leading edge stays defined for the foam crest.
        along: -0.5 + frac * 0.7 + (this.rng() - 0.5) * 0.2,
        across: (this.rng() - 0.5) * 0.9,
        sizeMul: 0.6 + this.rng() * 0.7,
        wobbleFreq: 4 + this.rng() * 5,
        wobblePhase: this.rng() * Math.PI * 2,
      })
    }
    // Two foam crest blobs riding the leading edge.
    for (let i = 0; i < 2; i++) {
      const node = this.glowPool.acquire()
      node.visible = true
      node.alpha = 0
      blobs.push({
        node,
        kind: 'foam',
        along: 0.4 + this.rng() * 0.2,
        across: (this.rng() - 0.5) * 0.7,
        sizeMul: 0.4 + this.rng() * 0.4,
        wobbleFreq: 6 + this.rng() * 5,
        wobblePhase: this.rng() * Math.PI * 2,
      })
    }
    this.waves.push({
      from: { x: from.x, y: from.y },
      to: { x: to.x, y: to.y },
      fwd,
      perp,
      config,
      elapsed: 0,
      arrived: false,
      sprayDebt: 0,
      blobs,
      onArrive,
    })
  }

  update(dtMs: number): void {
    this.updateWaves(dtMs)
    this.updateParticles(dtMs)
  }

  private updateWaves(dtMs: number): void {
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i]!
      w.elapsed += dtMs
      const { gatherMs, travelMs, size } = w.config
      const bodyColor = w.config.bodyColor
      const deepColor = w.config.deepColor
      const foamColor = w.config.foamColor

      // Phase + centre.
      let center: Vec2
      let heightMul: number // vertical swell of the mass
      let alpha: number
      if (w.elapsed < gatherMs) {
        // Gather: water swells at the caster; nothing travels yet.
        const g = ease('easeOutCubic', clamp01(w.elapsed / gatherMs))
        center = w.from
        heightMul = 0.5 + 0.5 * g
        alpha = g
      } else {
        const t = travelMs <= 0 ? 1 : clamp01((w.elapsed - gatherMs) / travelMs)
        const moved = ease(w.config.easing ?? 'easeInOut', t) // accelerate/decelerate
        center = lerpPoint(w.from, w.to, moved)
        // Rise after launch, settle before impact.
        heightMul = 1 + 0.25 * Math.sin(t * Math.PI)
        alpha = t < 0.85 ? 1 : Math.max(0, 1 - (t - 0.85) / 0.15) // collapse into impact
        this.emitSpray(w, center, heightMul, dtMs)
        if (t >= 1 && !w.arrived) {
          w.arrived = true
          w.onArrive?.(w.to)
          this.splash(w)
        }
      }

      const swirl = w.elapsed < gatherMs ? w.elapsed / 1000 * 6 : 0 // gather swirl
      for (const b of w.blobs) {
        const wob = Math.sin((w.elapsed / 1000) * b.wobbleFreq + b.wobblePhase)
        const along = b.along + wob * 0.05
        const across = b.across + wob * 0.12
        const ax = across + Math.sin(swirl + b.wobblePhase) * (swirl > 0 ? 0.3 : 0)
        const px = center.x + w.fwd.x * along * size + w.perp.x * ax * size
        const py =
          center.y +
          w.fwd.y * along * size +
          w.perp.y * ax * size -
          (b.kind === 'foam' ? size * 0.22 * heightMul : 0) // crest sits on top
        b.node.x = px
        b.node.y = py
        const r = size * b.sizeMul * heightMul * (b.kind === 'foam' ? 0.55 : 1)
        b.node.scale.set(r / this.baseRadius)
        b.node.tint = b.kind === 'foam' ? foamColor : b.kind === 'deep' ? deepColor : bodyColor
        // Body translucent, deep water a touch stronger, foam bright.
        const layerAlpha = b.kind === 'foam' ? 0.9 : b.kind === 'deep' ? 0.75 : 0.55
        b.node.alpha = alpha * layerAlpha
      }

      // Once arrived and collapsed, retire the body but let the splash live on.
      if (w.arrived) {
        for (const b of w.blobs) this.releaseBlob(b)
        this.waves.splice(i, 1)
      }
    }
  }

  /** Continuously shed spray/mist/bubbles from the crest as the wave travels. */
  private emitSpray(w: ActiveWave, center: Vec2, heightMul: number, dtMs: number): void {
    const rate = w.config.sprayRate ?? DEFAULT_SPRAY_RATE
    w.sprayDebt += rate * (dtMs / 1000)
    const { size, travelMs } = w.config
    const speed = distance(w.from, w.to) / Math.max(1, travelMs / 1000) // ~forward speed
    const crestX = center.x + w.fwd.x * size * 0.4
    const crestY = center.y + w.fwd.y * size * 0.4 - size * 0.2 * heightMul
    while (w.sprayDebt >= 1) {
      w.sprayDebt -= 1
      if (this.particles.length >= MAX_PARTICLES) break
      const mist = this.rng() < 0.5
      const inherit = 0.25 + this.rng() * 0.3
      const outward = (this.rng() - 0.5) * 2
      const vx = w.fwd.x * speed * inherit + w.perp.x * outward * size * 1.2
      const vy = w.fwd.y * speed * inherit + w.perp.y * outward * size * 1.2 - (60 + this.rng() * 120)
      this.spawnParticle({
        x: crestX + (this.rng() - 0.5) * size * 0.5,
        y: crestY + (this.rng() - 0.5) * size * 0.3,
        vx,
        vy,
        gravity: mist ? -30 : 320, // mist rises, droplets fall
        lifetime: mist ? 700 + this.rng() * 500 : 380 + this.rng() * 320,
        size0: mist ? size * (0.14 + this.rng() * 0.12) : size * (0.05 + this.rng() * 0.05),
        growth: mist ? 2.2 : 0.7,
        glow: mist,
        color: mist ? w.config.foamColor : w.config.bodyColor,
      })
    }
  }

  /** Directional splash burst when the wave lands (forward + outward). */
  private splash(w: ActiveWave): void {
    const { size } = w.config
    const droplets = 26
    for (let i = 0; i < droplets; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      const spreadAngle = (this.rng() - 0.5) * Math.PI * 0.9 // fan forward
      // Rotate the forward vector by the spread angle.
      const cos = Math.cos(spreadAngle)
      const sin = Math.sin(spreadAngle)
      const dx = w.fwd.x * cos - w.fwd.y * sin
      const dy = w.fwd.x * sin + w.fwd.y * cos
      const spd = 260 + this.rng() * 420
      const drop = this.rng() < 0.7
      this.spawnParticle({
        x: w.to.x,
        y: w.to.y,
        vx: dx * spd,
        vy: dy * spd - (drop ? 120 : 40),
        gravity: drop ? 520 : -20,
        lifetime: drop ? 420 + this.rng() * 360 : 700 + this.rng() * 400,
        size0: drop ? size * (0.06 + this.rng() * 0.06) : size * (0.16 + this.rng() * 0.14),
        growth: drop ? 0.6 : 2.4,
        glow: !drop,
        color: drop ? w.config.bodyColor : w.config.foamColor,
      })
    }
  }

  private spawnParticle(p: {
    x: number
    y: number
    vx: number
    vy: number
    gravity: number
    lifetime: number
    size0: number
    growth: number
    glow: boolean
    color: number
  }): void {
    const node = (p.glow ? this.glowPool : this.bodyPool).acquire()
    node.visible = true
    node.alpha = 1
    node.tint = p.color
    node.x = p.x
    node.y = p.y
    node.scale.set(p.size0 / this.baseRadius)
    this.particles.push({
      node,
      x: p.x,
      y: p.y,
      vx: p.vx,
      vy: p.vy,
      gravity: p.gravity,
      age: 0,
      lifetime: p.lifetime,
      size0: p.size0,
      growth: p.growth,
      glow: p.glow,
    })
  }

  private updateParticles(dtMs: number): void {
    const dt = dtMs / 1000
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!
      p.age += dtMs
      const lifeFrac = p.lifetime <= 0 ? 1 : p.age / p.lifetime
      if (lifeFrac >= 1) {
        ;(p.glow ? this.glowPool : this.bodyPool).release(p.node)
        this.particles.splice(i, 1)
        continue
      }
      p.vy += p.gravity * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.node.x = p.x
      p.node.y = p.y
      p.node.scale.set((p.size0 * (1 + (p.growth - 1) * lifeFrac)) / this.baseRadius)
      p.node.alpha = 1 - lifeFrac
    }
  }

  private releaseBlob(b: BodyBlob): void {
    ;(b.kind === 'foam' ? this.glowPool : this.bodyPool).release(b.node)
  }

  /** Waves currently gathering or traveling (spray may briefly outlive one). */
  get active(): number {
    return this.waves.length
  }

  /** Live spray/splash particles — exposed for tests/inspection. */
  get particleCount(): number {
    return this.particles.length
  }

  clear(): void {
    for (const w of this.waves) for (const b of w.blobs) this.releaseBlob(b)
    this.waves.length = 0
    for (const p of this.particles) (p.glow ? this.glowPool : this.bodyPool).release(p.node)
    this.particles.length = 0
  }
}
