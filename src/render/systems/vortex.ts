import type { DisplayNode, VortexConfig, Vec2 } from '../types'
import { ObjectPool, type PoolOptions } from '../pool'
import { ease, clamp01 } from '../easing'
import { UNIT_RADIUS, resetDisplayNode } from '../nodeUtil'

// Vortex system (Epic 9). A spinning vortex parked ON a point (Fire's Firenado,
// Air's Hurricane — same effect, different palette). It is deliberately NOT one
// rotating sprite: it layers procedural animation so it reads as churning
// energy rather than a pinwheel —
//
//   • outer glow  — a soft additive halo that breathes.
//   • core "eye"  — a bright additive disc that pulses fast at the centre.
//   • spiral bands — several elongated smoke streaks at varied radii, each with
//     DIFFERENTIAL rotation (inner bands spin faster) and its own turbulence
//     (wobble in angle/radius), randomized width/alpha/phase so it's never
//     symmetrical.
//   • embers — emitted CONTINUOUSLY for the whole life, each orbiting the centre
//     while spiralling inward + upward (faster lift near the eye); a few eject.
//
// The body swells in over ~250 ms, breathes, then collapses inward + fades over
// the last ~380 ms. Everything is pooled and driven by the shared per-frame
// update. Appearance is tint + scale on white sprites (glow sprites are
// additive), so Firenado/Hurricane differ only by the palette in VortexConfig.

const DEFAULT_ARMS = 6
const DEFAULT_EMBER_RATE = 55
const FORMATION_MS = 250
const COLLAPSE_MS = 380
/** Stop feeding embers past this fraction of life so emission tapers naturally. */
const EMBER_EMIT_UNTIL = 0.82
/** Hard cap on simultaneously alive embers (across all vortices) for perf. */
const MAX_EMBERS = 260

interface Band {
  node: DisplayNode
  radiusFrac: number // 0..1 position along the spiral
  phase: number // angular offset
  spinMul: number // differential rotation (inner faster)
  widthMul: number
  alphaMul: number
  wobbleFreq: number
  wobblePhase: number
}

interface Ember {
  node: DisplayNode
  center: Vec2
  angle: number
  angularVel: number // rad/s
  radius: number
  radiusVel: number // world units/s (usually inward)
  rise: number // accumulated upward offset
  riseVel: number
  age: number
  lifetime: number
  radiusWorld: number
  refSize: number // the parent vortex's radius (for near-eye lift falloff)
  ejecting: boolean
}

interface ActiveVortex {
  center: Vec2
  config: VortexConfig
  elapsed: number
  emberDebt: number // fractional embers owed
  glow: DisplayNode
  core: DisplayNode
  bands: Band[]
}

export class VortexSystem {
  private readonly bandPool: ObjectPool<DisplayNode>
  private readonly glowPool: ObjectPool<DisplayNode>
  private readonly items: ActiveVortex[] = []
  private readonly embers: Ember[] = []
  private readonly baseRadius: number
  private readonly rng: () => number

  constructor(
    createBandNode: () => DisplayNode,
    createGlowNode: () => DisplayNode,
    baseRadius = UNIT_RADIUS,
    options: { rng?: () => number } & PoolOptions = {},
  ) {
    this.baseRadius = baseRadius
    this.rng = options.rng ?? Math.random
    const poolOptions: PoolOptions = { prewarm: options.prewarm ?? 12, maxIdle: options.maxIdle }
    this.bandPool = new ObjectPool(createBandNode, resetDisplayNode, poolOptions)
    // Glow pool feeds the halo, the eye, AND every ember, so prewarm generously.
    this.glowPool = new ObjectPool(createGlowNode, resetDisplayNode, { prewarm: 48 })
  }

  /** Start a vortex centered at `at`. */
  spawn(config: VortexConfig, at: Vec2): void {
    const center = { x: at.x, y: at.y }
    const count = Math.max(1, Math.round(config.arms ?? DEFAULT_ARMS))
    const bands: Band[] = []
    for (let i = 0; i < count; i++) {
      const node = this.bandPool.acquire()
      node.visible = true
      node.alpha = 0
      node.tint = config.color
      node.x = center.x
      node.y = center.y
      const radiusFrac = 0.22 + 0.72 * this.rng()
      bands.push({
        node,
        radiusFrac,
        phase: this.rng() * Math.PI * 2,
        // Inner bands (small radiusFrac) rotate faster than outer ones.
        spinMul: 1.5 - 0.7 * radiusFrac + (this.rng() - 0.5) * 0.25,
        widthMul: 0.7 + 0.7 * this.rng(),
        alphaMul: 0.55 + 0.45 * this.rng(),
        wobbleFreq: 3 + this.rng() * 4,
        wobblePhase: this.rng() * Math.PI * 2,
      })
    }
    const glow = this.acquireGlow(center, config.coreColor ?? config.color)
    const core = this.acquireGlow(center, config.coreColor ?? config.color)
    this.items.push({ center, config, elapsed: 0, emberDebt: 0, glow, core, bands })
  }

  private acquireGlow(at: Vec2, tint: number): DisplayNode {
    const node = this.glowPool.acquire()
    node.visible = true
    node.alpha = 0
    node.tint = tint
    node.x = at.x
    node.y = at.y
    return node
  }

  update(dtMs: number): void {
    this.updateBodies(dtMs)
    this.updateEmbers(dtMs)
  }

  private updateBodies(dtMs: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const v = this.items[i]!
      v.elapsed += dtMs
      const { size, spin } = v.config
      const coreColor = v.config.coreColor ?? v.config.color
      const emberColor = v.config.emberColor ?? coreColor
      const dur = v.config.durationMs
      const t = dur <= 0 ? 1 : clamp01(v.elapsed / dur)

      // Lifetime envelope: grow-in, breathe, collapse-in + fade.
      const grow = ease('easeOutCubic', clamp01(v.elapsed / FORMATION_MS))
      const collapse = clamp01((dur - v.elapsed) / COLLAPSE_MS) // 1 → 0 at the very end
      const breathe = 1 + 0.05 * Math.sin((v.elapsed / 1000) * 5)
      const bodyScale = grow * breathe * (0.32 + 0.68 * collapse)
      const bodyAlpha = grow * collapse
      const cx = v.center.x
      const cy = v.center.y
      const baseAngle = spin * (v.elapsed / 1000)

      // Outer glow halo (soft, breathing).
      this.placeGlow(v.glow, cx, cy, size * 0.95 * bodyScale, bodyAlpha * 0.22, coreColor)
      // Core eye (bright, fast pulse).
      const eyePulse = 1 + 0.14 * Math.sin((v.elapsed / 1000) * 9)
      this.placeGlow(v.core, cx, cy, size * 0.3 * bodyScale * eyePulse, bodyAlpha * 0.85, coreColor)

      // Spiral bands with differential rotation + turbulence.
      for (const b of v.bands) {
        const wob = Math.sin((v.elapsed / 1000) * b.wobbleFreq + b.wobblePhase)
        const angle = baseAngle * b.spinMul + b.phase + wob * 0.15
        const r = size * b.radiusFrac * bodyScale * (1 + wob * 0.06)
        b.node.x = cx + Math.cos(angle) * r
        b.node.y = cy + Math.sin(angle) * r
        b.node.rotation = angle + Math.PI / 2 + wob * 0.12 // streak tangent to its orbit
        const length = (size * (0.32 + 0.42 * b.radiusFrac) * b.widthMul * bodyScale) / this.baseRadius
        const width = (size * 0.1 * b.widthMul) / this.baseRadius
        b.node.scale.set(length, width)
        b.node.alpha = bodyAlpha * b.alphaMul * (0.55 + 0.45 * (1 - b.radiusFrac))
        b.node.tint = v.config.color
      }

      // Continuous ember emission, tapering off near the end.
      if (t < EMBER_EMIT_UNTIL) {
        const rate = v.config.emberRate ?? DEFAULT_EMBER_RATE
        v.emberDebt += rate * (dtMs / 1000)
        while (v.emberDebt >= 1) {
          v.emberDebt -= 1
          if (this.embers.length < MAX_EMBERS) this.spawnEmber(v, emberColor)
        }
      }

      if (v.elapsed >= dur) {
        // Glow + core came from the glow pool; bands from the band pool.
        this.glowPool.release(v.glow)
        this.glowPool.release(v.core)
        for (const b of v.bands) this.bandPool.release(b.node)
        this.items.splice(i, 1)
      }
    }
  }

  private placeGlow(
    node: DisplayNode,
    x: number,
    y: number,
    radius: number,
    alpha: number,
    tint: number,
  ): void {
    node.x = x
    node.y = y
    node.tint = tint
    node.alpha = alpha
    node.scale.set(radius / this.baseRadius)
  }

  private spawnEmber(v: ActiveVortex, color: number): void {
    const size = v.config.size
    const ejecting = this.rng() < 0.12
    const node = this.glowPool.acquire()
    node.visible = true
    node.tint = color
    const dir = v.config.spin >= 0 ? 1 : -1
    this.embers.push({
      node,
      center: v.center,
      angle: this.rng() * Math.PI * 2,
      // Embers circulate faster than the bands (same direction).
      angularVel: dir * v.config.spin * (1.2 + this.rng() * 0.9),
      radius: size * (0.12 + 0.5 * this.rng()),
      // Most drift inward; the occasional ejected one flies out.
      radiusVel: ejecting ? 55 + this.rng() * 70 : -(8 + this.rng() * 22),
      rise: 0,
      riseVel: 18 + this.rng() * 46,
      age: 0,
      lifetime: 900 + this.rng() * 800,
      radiusWorld: size * (0.03 + 0.035 * this.rng()),
      refSize: size,
      ejecting,
    })
  }

  private updateEmbers(dtMs: number): void {
    const dt = dtMs / 1000
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const e = this.embers[i]!
      e.age += dtMs
      const lifeFrac = e.lifetime <= 0 ? 1 : e.age / e.lifetime
      if (lifeFrac >= 1) {
        this.glowPool.release(e.node)
        this.embers.splice(i, 1)
        continue
      }
      e.angle += e.angularVel * dt
      e.radius += e.radiusVel * dt
      if (!e.ejecting && e.radius < 4) e.radius = 4 // trapped embers don't cross the eye
      // Lift is stronger near the eye (updraft up the funnel) and grows with age.
      const nearEye = 1 - clamp01(e.radius / (e.refSize * 0.6))
      const riseFactor = 0.4 + 0.7 * nearEye + 0.4 * lifeFrac
      e.rise += e.riseVel * riseFactor * dt
      e.node.x = e.center.x + Math.cos(e.angle) * e.radius
      e.node.y = e.center.y + Math.sin(e.angle) * e.radius - e.rise
      e.node.alpha = (1 - lifeFrac) * (e.ejecting ? 0.95 : 0.8)
      e.node.scale.set((e.radiusWorld * (1 - 0.4 * lifeFrac)) / this.baseRadius)
    }
  }

  /** Number of vortex BODIES currently spinning (embers may briefly outlive one). */
  get active(): number {
    return this.items.length
  }

  /** Total live embers — exposed for tests/inspection. */
  get emberCount(): number {
    return this.embers.length
  }

  clear(): void {
    for (const v of this.items) {
      this.glowPool.release(v.glow)
      this.glowPool.release(v.core)
      for (const b of v.bands) this.bandPool.release(b.node)
    }
    this.items.length = 0
    for (const e of this.embers) this.glowPool.release(e.node)
    this.embers.length = 0
  }
}
