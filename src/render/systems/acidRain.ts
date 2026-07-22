import type { AcidRainConfig, DisplayNode, Vec2 } from '../types'
import { ObjectPool, type PoolOptions } from '../pool'
import { clamp01, ease } from '../easing'
import { UNIT_RADIUS, resetDisplayNode } from '../nodeUtil'

// Acid Rain / Corroded system (Nature, Epic 9). A persistent chemical-corrosion
// effect locked onto a target for the whole Corroded status. Rendered in the
// Pixi front layers (above the SVG castles). Organized into independent modules
// driven from one per-frame update, keyed by target:
//
//   • toxic storm cloud   — puffs gather IN from many directions to form a
//     concentrated cloud overhead, then constantly churn + pulse (never static).
//   • acid rainfall        — glowing yellow-green droplets fall continuously onto
//     the target, thick and unnatural (additive sheen on each drop).
//   • splash effects       — each drop that lands sizzles: outward specks, a wisp
//     of steam, and the occasional bubble.
//   • bubbling puddles     — bubbles continuously form + burst where acid pools.
//   • chemical vapor       — thin green vapor keeps rising off the target.
//   • corrosion idle       — glowing droplets slide down the target (acid eating
//     away), plus periodic sizzle flashes + bubble bursts so it reads as ACTIVE.
//   • poison synergy        — surge(): a fresh Poison landed while Corroded, so the
//     glow brightens, bubbles + vapor surge, and a stronger sizzle splash fires.
//   • expiration            — stop(): the rain stops FIRST, then the cloud dissolves
//     into drifting toxic vapor while the residue bubbling/sizzling evaporates.
//
// Appearance is tint + scale on soft/additive unit sprites (element-agnostic), so
// future Nature chemical abilities can reuse this by palette + dimensions alone.
// Pooled and capped for many simultaneous targets.

const PUFF_COUNT = 11
const MAX_PARTICLES = 340 // hard cap across ALL clouds (protects frame time)
// Continuous emission rates (particles/sec per target, at full intensity).
const RAIN_RATE = 28
const BUBBLE_RATE = 10
const VAPOR_RATE = 7
const SLIDE_RATE = 4
const SIZZLE_EVERY_MS = 720 // idle sizzle-flash cadence (± jitter)
const DISSOLVE_RAIN_STOP = true

type PoolKind = 'soft' | 'glow'
type Behavior = 'rain' | 'splash' | 'steam' | 'bubble' | 'vapor' | 'slide' | 'sizzle'

interface Particle {
  node: DisplayNode
  pool: PoolKind
  behavior: Behavior
  owner: Cloud
  x: number
  y: number
  vx: number
  vy: number
  gravity: number
  age: number
  lifetime: number
  size: number
  grow: number // scale multiplier reached at end of life
  stretch: number // vertical scale multiplier (1 = round; >1 = droplet)
  sway: number
  swayFreq: number
  swayPhase: number
  groundY: number // rain: y at which it splashes
  baseAlpha: number
  burstsVapor?: boolean // a swollen bubble that pops into a small vapor cloud
}

interface Puff {
  node: DisplayNode
  homeX: number
  homeY: number
  fromX: number // gather-from offset (relative to cloud centre)
  fromY: number
  size: number
  phase: number
  churnFreq: number
  driftX: number // dissolve drift direction
  driftY: number
  alphaMul: number
}

interface Cloud {
  target: Vec2
  center: Vec2 // cloud centre, above the target
  groundY: number
  config: AcidRainConfig
  age: number
  dissolving: boolean
  dissolve: number // elapsed in the dissolve phase, ms
  surge: number // 0..1, decays each frame
  seed: number
  puffs: Puff[]
  rainDebt: number
  bubbleDebt: number
  vaporDebt: number
  slideDebt: number
  sizzleTimer: number
}

export class AcidRainSystem {
  private readonly softPool: ObjectPool<DisplayNode>
  private readonly glowPool: ObjectPool<DisplayNode>
  private readonly clouds = new Map<string, Cloud>()
  private readonly particles: Particle[] = []
  private readonly baseRadius: number
  private readonly rng: () => number

  constructor(
    createSoft: () => DisplayNode,
    createGlow: () => DisplayNode,
    baseRadius = UNIT_RADIUS,
    options: { rng?: () => number } & PoolOptions = {},
  ) {
    this.baseRadius = baseRadius
    this.rng = options.rng ?? Math.random
    this.softPool = new ObjectPool(createSoft, resetDisplayNode, { prewarm: options.prewarm ?? 40 })
    this.glowPool = new ObjectPool(createGlow, resetDisplayNode, { prewarm: 24 })
  }

  /** Begin (or refresh) Acid Rain on `at`, keyed by `key`. */
  start(key: string, at: Vec2, config: AcidRainConfig): void {
    const existing = this.clouds.get(key)
    if (existing && !existing.dissolving) {
      existing.target = { x: at.x, y: at.y }
      existing.center = { x: at.x, y: at.y - config.cloudHeight }
      existing.groundY = at.y + 8
      return
    }
    if (existing) this.releaseCloud(existing)

    const center = { x: at.x, y: at.y - config.cloudHeight }
    const cloud: Cloud = {
      target: { x: at.x, y: at.y },
      center,
      groundY: at.y + 8,
      config,
      age: 0,
      dissolving: false,
      dissolve: 0,
      surge: 0,
      seed: this.rng() * Math.PI * 2,
      puffs: [],
      rainDebt: 0,
      bubbleDebt: 0,
      vaporDebt: 0,
      slideDebt: 0,
      sizzleTimer: SIZZLE_EVERY_MS,
    }
    // Toxic storm cloud: puffs clustered in a wide, low ellipse, each gathering
    // in from its own far-off direction. Skipped for a cloud-less corrosion aura
    // (Gastro Acid's poison idle) — then only the ground corrosion runs.
    if (config.cloud !== false) for (let i = 0; i < PUFF_COUNT; i++) {
      const a = this.rng() * Math.PI * 2
      const rad = config.radius * (0.35 + 0.75 * this.rng())
      const homeX = Math.cos(a) * rad
      const homeY = Math.sin(a) * rad * 0.45 // flatter than wide
      const gatherDir = this.rng() * Math.PI * 2
      const gatherDist = config.radius * (1.6 + 1.4 * this.rng())
      const node = this.softPool.acquire()
      node.visible = true
      node.alpha = 0
      node.tint = config.cloudColor
      cloud.puffs.push({
        node,
        homeX,
        homeY,
        fromX: homeX + Math.cos(gatherDir) * gatherDist,
        fromY: homeY + Math.sin(gatherDir) * gatherDist,
        size: config.radius * (0.42 + 0.34 * this.rng()),
        phase: this.rng() * Math.PI * 2,
        churnFreq: 1.4 + this.rng() * 1.8,
        driftX: Math.cos(gatherDir) * (0.4 + this.rng() * 0.8),
        driftY: -(0.5 + this.rng() * 0.7), // dissolve drifts upward
        alphaMul: 0.55 + 0.4 * this.rng(),
      })
    }
    this.clouds.set(key, cloud)
  }

  /** Begin the expiration: rain stops first, then the cloud dissolves to vapor. */
  stop(key: string): void {
    const c = this.clouds.get(key)
    if (c && !c.dissolving) {
      c.dissolving = true
      c.dissolve = 0
    }
  }

  /** Poison-synergy reaction — a fresh Poison landed while Corroded. */
  surge(key: string): void {
    const c = this.clouds.get(key)
    if (!c || c.dissolving) return
    c.surge = 1
    // A one-shot intensification: brighter sizzle flash, a vapor surge, a burst
    // of bubbles, and a stronger sizzle splash so the stack reads as dangerous.
    this.spawnSizzle(c, 1.5)
    const gx = c.target.x + (this.rng() * 2 - 1) * c.config.radius * 0.6
    this.spawnSplash(gx, c.groundY, c, 1.8)
    for (let i = 0; i < 10; i++) this.spawnBubble(c, 1.4)
    for (let i = 0; i < 8; i++) this.spawnVapor(c, 1.6)
  }

  /** True while a live (non-dissolving) cloud exists under `key`. */
  has(key: string): boolean {
    const c = this.clouds.get(key)
    return !!c && !c.dissolving
  }

  update(dtMs: number): void {
    for (const [key, c] of this.clouds) {
      c.age += dtMs
      c.surge = Math.max(0, c.surge - dtMs / 700) // ~0.7s to settle
      this.updateCloud(c, dtMs)
      if (!c.dissolving) {
        this.emitRainfall(c, dtMs)
        this.emitBubbles(c, dtMs, 1)
        this.emitVapor(c, dtMs, 1)
        this.emitSlide(c, dtMs)
        this.updateSizzle(c, dtMs)
      } else {
        c.dissolve += dtMs
        // Residue evaporates: bubbling + vapor taper to nothing over the dissolve.
        const taper = 1 - clamp01(c.dissolve / c.config.dissolveMs)
        this.emitBubbles(c, dtMs, taper)
        this.emitVapor(c, dtMs, taper * 0.6)
        this.updateSizzle(c, dtMs, taper)
        if (c.dissolve >= c.config.dissolveMs) {
          this.releaseCloud(c)
          this.clouds.delete(key)
        }
      }
    }
    this.updateParticles(dtMs)
  }

  // --- Toxic storm cloud ----------------------------------------------------

  private updateCloud(c: Cloud, _dtMs: number): void {
    const t = c.age / 1000
    const gather = ease('easeOutCubic', clamp01(c.age / c.config.gatherMs))
    const df = c.dissolving ? clamp01(c.dissolve / c.config.dissolveMs) : 0
    const cx = c.center.x
    const cy = c.center.y
    const breathe = 1 + Math.sin(t * 1.3 + c.seed) * 0.03
    for (const p of c.puffs) {
      // Gather in from the puff's far origin toward its home slot.
      const gx = p.fromX + (p.homeX - p.fromX) * gather
      const gy = p.fromY + (p.homeY - p.fromY) * gather
      // Constant internal churn so the cloud never sits still.
      const churnX = Math.cos(t * 0.6 + p.phase) * (c.config.radius * 0.06)
      const churnY = Math.sin(t * 0.9 + p.phase) * (c.config.radius * 0.045)
      const driftX = p.driftX * df * c.config.radius * 1.3
      const driftY = p.driftY * df * c.config.radius * 1.6
      p.node.x = cx + gx + churnX + driftX
      p.node.y = cy + gy + churnY + driftY
      const pulse = 1 + Math.sin(t * p.churnFreq + p.phase) * 0.09
      const scale = (p.size * pulse * breathe * (1 + 0.7 * df)) / this.baseRadius
      p.node.scale.set(scale)
      // Dissolving puffs turn from storm-dark to drifting vapor as they fade.
      p.node.tint = df > 0.25 ? c.config.vaporColor : c.config.cloudColor
      p.node.alpha = gather * p.alphaMul * (1 - df)
    }
  }

  // --- Acid rainfall + splashes ---------------------------------------------

  private emitRainfall(c: Cloud, dtMs: number): void {
    if (c.config.cloud === false) return // cloud-less corrosion aura: no rain
    if (DISSOLVE_RAIN_STOP && c.dissolving) return
    const ramp = clamp01(c.age / c.config.gatherMs)
    const rate = RAIN_RATE * (0.25 + 0.75 * ramp) * (1 + c.surge)
    c.rainDebt += rate * (dtMs / 1000)
    while (c.rainDebt >= 1) {
      c.rainDebt -= 1
      this.spawnRain(c)
    }
  }

  private spawnRain(c: Cloud): void {
    const node = this.take('glow', c.config.acidColor)
    if (!node) return
    const x = c.center.x + (this.rng() * 2 - 1) * c.config.radius
    const y = c.center.y + c.config.radius * (0.2 + 0.3 * this.rng())
    this.push({
      node,
      pool: 'glow',
      behavior: 'rain',
      owner: c,
      x,
      y,
      vx: (this.rng() * 2 - 1) * 20,
      vy: 380 + this.rng() * 260,
      gravity: 220,
      age: 0,
      lifetime: 1600,
      size: 2.4 + this.rng() * 1.4,
      grow: 1,
      stretch: 2.4 + this.rng() * 0.8, // elongated falling droplet
      sway: 0,
      swayFreq: 0,
      swayPhase: 0,
      groundY: c.groundY + this.rng() * 10,
      baseAlpha: 0.9,
    })
  }

  /** A droplet struck the ground: sizzling specks + steam + the odd bubble. */
  private spawnSplash(x: number, y: number, c: Cloud, scale = 1): void {
    const specks = Math.round((2 + this.rng() * 2) * scale)
    for (let i = 0; i < specks; i++) {
      const node = this.take('soft', c.config.acidColor)
      if (!node) break
      const a = -Math.PI / 2 + (this.rng() * 2 - 1) * 1.1
      const spd = (60 + this.rng() * 130) * scale
      this.push({
        node,
        pool: 'soft',
        behavior: 'splash',
        owner: c,
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        gravity: 420,
        age: 0,
        lifetime: 220 + this.rng() * 160,
        size: 1.6 + this.rng() * 1.6,
        grow: 0.4,
        stretch: 1,
        sway: 0,
        swayFreq: 0,
        swayPhase: 0,
        groundY: 0,
        baseAlpha: 0.85,
      })
    }
    // A wisp of steam / acidic mist rising off the splash.
    if (this.rng() < 0.55 * scale) {
      const node = this.take('soft', c.config.vaporColor)
      if (node) {
        this.push({
          node,
          pool: 'soft',
          behavior: 'steam',
          owner: c,
          x: x + (this.rng() * 2 - 1) * 6,
          y,
          vx: (this.rng() * 2 - 1) * 8,
          vy: -(30 + this.rng() * 40),
          gravity: 0,
          age: 0,
          lifetime: 520 + this.rng() * 340,
          size: 3 + this.rng() * 3,
          grow: 2.4,
          stretch: 1,
          sway: 4,
          swayFreq: 3 + this.rng() * 2,
          swayPhase: this.rng() * Math.PI * 2,
          groundY: 0,
          baseAlpha: 0.4,
        })
      }
    }
    if (this.rng() < 0.4 * scale) this.spawnBubble(c, 1, x)
  }

  // --- Bubbling puddles ------------------------------------------------------

  private emitBubbles(c: Cloud, dtMs: number, intensity: number): void {
    const rate = BUBBLE_RATE * intensity * (c.config.intensity ?? 1) * (1 + c.surge * 1.4)
    c.bubbleDebt += rate * (dtMs / 1000)
    while (c.bubbleDebt >= 1) {
      c.bubbleDebt -= 1
      this.spawnBubble(c, 1)
    }
  }

  private spawnBubble(c: Cloud, scale = 1, atX?: number): void {
    const node = this.take('soft', c.config.acidColor)
    if (!node) return
    const x = atX ?? c.target.x + (this.rng() * 2 - 1) * c.config.radius * 0.95
    // Occasionally a LARGE bubble that swells slowly, then bursts into a small
    // cloud of poisonous vapor (see updateParticles) — the heavier the poison,
    // the more of them.
    const big = this.rng() < 0.12 * (c.config.intensity ?? 1)
    this.push({
      node,
      pool: 'soft',
      behavior: 'bubble',
      owner: c,
      x,
      y: c.groundY - this.rng() * 5,
      vx: (this.rng() * 2 - 1) * 6,
      vy: -(6 + this.rng() * 16) * (big ? 0.5 : 1),
      gravity: 0,
      age: 0,
      lifetime: (big ? 620 + this.rng() * 360 : 360 + this.rng() * 300),
      size: (big ? 4.5 + this.rng() * 3 : 1.8 + this.rng() * 2.2) * scale,
      grow: big ? 2.4 : 1.7, // swells before it pops
      stretch: 1,
      sway: 0,
      swayFreq: 0,
      swayPhase: 0,
      groundY: 0,
      baseAlpha: 0.7,
      burstsVapor: big,
    })
  }

  // --- Chemical vapor + corrosion idle --------------------------------------

  private emitVapor(c: Cloud, dtMs: number, intensity: number): void {
    const rate = VAPOR_RATE * intensity * (c.config.intensity ?? 1) * (1 + c.surge)
    c.vaporDebt += rate * (dtMs / 1000)
    while (c.vaporDebt >= 1) {
      c.vaporDebt -= 1
      this.spawnVapor(c, 1)
    }
  }

  private spawnVapor(c: Cloud, scale = 1): void {
    this.spawnVaporAt(
      c,
      c.target.x + (this.rng() * 2 - 1) * c.config.radius * 0.5,
      c.target.y - 10 - this.rng() * 22,
      scale,
    )
  }

  /** A rising green vapor puff at a specific point (target fumes + bubble pops). */
  private spawnVaporAt(c: Cloud, x: number, y: number, scale = 1): void {
    const node = this.take('soft', c.config.vaporColor)
    if (!node) return
    this.push({
      node,
      pool: 'soft',
      behavior: 'vapor',
      owner: c,
      x,
      y,
      vx: (this.rng() * 2 - 1) * 6,
      vy: -(28 + this.rng() * 44) * scale,
      gravity: 0,
      age: 0,
      lifetime: 1100 + this.rng() * 700,
      size: (3 + this.rng() * 3.5) * scale,
      grow: 2.1,
      stretch: 1,
      sway: 6,
      swayFreq: 2 + this.rng() * 2,
      swayPhase: this.rng() * Math.PI * 2,
      groundY: 0,
      baseAlpha: 0.42,
    })
  }

  private emitSlide(c: Cloud, dtMs: number): void {
    const rate = SLIDE_RATE * (c.config.intensity ?? 1) * (1 + c.surge)
    c.slideDebt += rate * (dtMs / 1000)
    while (c.slideDebt >= 1) {
      c.slideDebt -= 1
      this.spawnSlide(c)
    }
  }

  /** A glowing droplet sliding down the target — acid eating away at it. */
  private spawnSlide(c: Cloud): void {
    const node = this.take('glow', c.config.glowColor)
    if (!node) return
    this.push({
      node,
      pool: 'glow',
      behavior: 'slide',
      owner: c,
      x: c.target.x + (this.rng() * 2 - 1) * c.config.radius * 0.45,
      y: c.target.y - 30 - this.rng() * 16,
      vx: (this.rng() * 2 - 1) * 4,
      vy: 16 + this.rng() * 24,
      gravity: 10,
      age: 0,
      lifetime: 820 + this.rng() * 520,
      size: 1.8 + this.rng() * 1.4,
      grow: 0.7,
      stretch: 1.6,
      sway: 0,
      swayFreq: 0,
      swayPhase: 0,
      groundY: 0,
      baseAlpha: 0.85,
    })
  }

  private updateSizzle(c: Cloud, dtMs: number, intensity = 1): void {
    c.sizzleTimer -= dtMs
    if (c.sizzleTimer > 0) return
    c.sizzleTimer = (SIZZLE_EVERY_MS + this.rng() * 500) / Math.max(0.25, intensity)
    this.spawnSizzle(c, intensity)
    const bursts = 2 + Math.round(this.rng() * 2 * intensity)
    for (let i = 0; i < bursts; i++) this.spawnBubble(c, 1)
  }

  /** A brief bright sizzle flash on the target — corrosion is active. */
  private spawnSizzle(c: Cloud, scale = 1): void {
    const node = this.take('glow', c.config.glowColor)
    if (!node) return
    this.push({
      node,
      pool: 'glow',
      behavior: 'sizzle',
      owner: c,
      x: c.target.x + (this.rng() * 2 - 1) * c.config.radius * 0.7,
      y: c.target.y - 6 - this.rng() * 30,
      vx: 0,
      vy: 0,
      gravity: 0,
      age: 0,
      lifetime: 160 + this.rng() * 120,
      size: (5 + this.rng() * 4) * scale,
      grow: 1.9,
      stretch: 1,
      sway: 0,
      swayFreq: 0,
      swayPhase: 0,
      groundY: 0,
      baseAlpha: 0.8,
    })
  }

  // --- Shared particle update -----------------------------------------------

  private updateParticles(dtMs: number): void {
    const dt = dtMs / 1000
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!
      p.age += dtMs
      const life = clamp01(p.age / p.lifetime)
      if (life >= 1) {
        // A swollen bubble popping releases a small cloud of poisonous vapor.
        if (p.burstsVapor && !p.owner.dissolving) {
          const owner = p.owner
          const px = p.x
          const py = p.y
          this.release(p)
          this.particles.splice(i, 1)
          for (let k = 0; k < 2; k++) this.spawnVaporAt(owner, px, py)
          continue
        }
        this.release(p)
        this.particles.splice(i, 1)
        continue
      }
      p.vy += p.gravity * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.sway) p.x += Math.cos(p.age / 1000 * p.swayFreq + p.swayPhase) * p.sway * dt
      // Rain: splash the moment it reaches the ground zone.
      if (p.behavior === 'rain' && p.y >= p.groundY) {
        const owner = p.owner
        this.release(p)
        this.particles.splice(i, 1)
        this.spawnSplash(p.x, p.groundY, owner, 1 + owner.surge)
        continue
      }
      p.node.x = p.x
      p.node.y = p.y
      const sc = (p.size * (1 + (p.grow - 1) * life)) / this.baseRadius
      if (p.stretch !== 1) p.node.scale.set(sc, sc * p.stretch)
      else p.node.scale.set(sc)
      // Sizzle flashes pop bright then vanish; everything else fades out linearly.
      const surgeBoost = 1 + p.owner.surge * 0.6
      const fade = p.behavior === 'sizzle' ? Math.sin(life * Math.PI) : 1 - life
      p.node.alpha = Math.min(1, p.baseAlpha * fade * surgeBoost)
    }
  }

  // --- Pool + bookkeeping helpers -------------------------------------------

  private take(pool: PoolKind, tint: number): DisplayNode | null {
    if (this.particles.length >= MAX_PARTICLES) return null
    const node = (pool === 'glow' ? this.glowPool : this.softPool).acquire()
    node.visible = true
    node.alpha = 0
    node.tint = tint
    node.rotation = 0
    return node
  }

  private push(p: Particle): void {
    p.node.x = p.x
    p.node.y = p.y
    p.node.scale.set(p.size / this.baseRadius)
    this.particles.push(p)
  }

  private release(p: Particle): void {
    if (p.pool === 'glow') this.glowPool.release(p.node)
    else this.softPool.release(p.node)
  }

  private releaseCloud(c: Cloud): void {
    for (const p of c.puffs) this.softPool.release(p.node)
    c.puffs.length = 0
  }

  /** Number of live (including dissolving) clouds. */
  get active(): number {
    return this.clouds.size
  }

  /** Total live particles — exposed for tests/inspection. */
  get particleCount(): number {
    return this.particles.length
  }

  clear(): void {
    for (const c of this.clouds.values()) this.releaseCloud(c)
    this.clouds.clear()
    for (const p of this.particles) this.release(p)
    this.particles.length = 0
  }
}
