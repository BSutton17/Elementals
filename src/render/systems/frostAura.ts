import type { DisplayNode, FrostAuraConfig, Vec2 } from '../types'
import { ObjectPool, type PoolOptions } from '../pool'
import { clamp01, ease } from '../easing'
import { UNIT_RADIUS, resetDisplayNode } from '../nodeUtil'

// Frost aura system (Ice's Flood of Frost, Epic 9). A persistent lingering frost
// locked onto a target, keyed per target. Rendered in the Pixi front layers.
// Organized into independent modules driven from one per-frame update:
//
//   • frost creep    — crystalline patches that grow across the castle from
//     staggered points, then hold with a subtle shimmer (branching frost).
//   • drifting snow   — tiny flakes falling over the target.
//   • cold vapor      — pale vapor curling upward off the ice.
//   • sparkles        — crystals occasionally catch the light and twinkle.
//   • Chilling Retribution enhancement — enhance(): pale-blue magical energy, a
//     pulsing rune RING slowly rotating + breathing, and brighter frost, to show
//     the cold is interfering with the kingdom's recovery.
//   • cooldown pulse  — pulse(): a brief brighten + a burst of shimmering ice
//     particles, fired whenever the target's cooldowns are slowed.
//   • expiration      — stop(): the magical energy fades and the ice melts into
//     cold mist rather than vanishing.
//
// Appearance is tint + scale on soft/additive unit sprites (element-agnostic), so
// future Ice abilities (blizzard, frostbite, deep freeze) can reuse it by palette
// alone. Pooled and capped for many simultaneous targets.

const CRYSTAL_COUNT = 9
const RUNE_COUNT = 6
const MAX_PARTICLES = 300
const SNOW_RATE = 9 // flakes/sec
const VAPOR_RATE = 6 // vapor puffs/sec
const SPARKLE_EVERY_MS = 620
const PULSE_EVERY_MS = 1400 // auto icy-pulse cadence while enhanced

type PoolKind = 'soft' | 'glow'
// 'gather' converges inward (Freeze to the Core's buildup); the rest are the
// lingering atmosphere / eruption particles.
type Behavior = 'snow' | 'vapor' | 'sparkle' | 'shard' | 'gather'

interface Particle {
  node: DisplayNode
  pool: PoolKind
  behavior: Behavior
  owner: FrostAura | null // null for one-shot cast particles (gather/erupt)
  x: number
  y: number
  vx: number
  vy: number
  gravity: number
  age: number
  lifetime: number
  size: number
  grow: number
  sway: number
  swayFreq: number
  swayPhase: number
  baseAlpha: number
}

interface Crystal {
  node: DisplayNode
  glow: DisplayNode // bright highlight riding the crystal
  homeX: number
  homeY: number
  size: number
  angle: number
  phase: number
  delay: number // staggered grow-in
}

interface Rune {
  node: DisplayNode
  angle: number
  radius: number
  phase: number
}

interface FrostAura {
  target: Vec2
  config: FrostAuraConfig
  age: number
  dissolving: boolean
  dissolve: number
  enhanced: boolean
  autoDissolveAt: number | null // base lingering cutoff, cleared once enhanced
  pulse: number // 0..1, decays
  seed: number
  crystals: Crystal[]
  runes: Rune[]
  snowDebt: number
  vaporDebt: number
  sparkleTimer: number
  pulseTimer: number
}

export class FrostAuraSystem {
  private readonly softPool: ObjectPool<DisplayNode>
  private readonly glowPool: ObjectPool<DisplayNode>
  private readonly auras = new Map<string, FrostAura>()
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
    this.softPool = new ObjectPool(createSoft, resetDisplayNode, { prewarm: options.prewarm ?? 32 })
    this.glowPool = new ObjectPool(createGlow, resetDisplayNode, { prewarm: 24 })
  }

  /** Begin (or refresh) a frost aura on `at`, keyed by `key`. */
  start(key: string, at: Vec2, config: FrostAuraConfig): void {
    const existing = this.auras.get(key)
    if (existing && !existing.dissolving) {
      existing.target = { x: at.x, y: at.y }
      return
    }
    if (existing) this.releaseAura(existing)

    const aura: FrostAura = {
      target: { x: at.x, y: at.y },
      config,
      age: 0,
      dissolving: false,
      dissolve: 0,
      enhanced: false,
      autoDissolveAt: config.baseDurationMs,
      pulse: 0,
      seed: this.rng() * Math.PI * 2,
      crystals: [],
      runes: [],
      snowDebt: 0,
      vaporDebt: 0,
      sparkleTimer: SPARKLE_EVERY_MS,
      pulseTimer: PULSE_EVERY_MS,
    }
    // Frost creep: crystal patches around the castle body.
    for (let i = 0; i < CRYSTAL_COUNT; i++) {
      const a = (i / CRYSTAL_COUNT) * Math.PI * 2 + this.rng() * 0.4
      const rad = config.radius * (0.35 + 0.6 * this.rng())
      const node = this.softPool.acquire()
      node.visible = true
      node.alpha = 0
      node.tint = config.frostColor
      const glow = this.glowPool.acquire()
      glow.visible = true
      glow.alpha = 0
      glow.tint = config.iceColor
      aura.crystals.push({
        node,
        glow,
        homeX: Math.cos(a) * rad,
        homeY: Math.sin(a) * rad * 0.7,
        size: config.radius * (0.16 + 0.16 * this.rng()),
        angle: a,
        phase: this.rng() * Math.PI * 2,
        delay: i * 55,
      })
    }
    this.auras.set(key, aura)
  }

  /** Chilling Retribution landed — enhance the frost with magical energy + runes
   *  and keep it alive until it's explicitly stopped. */
  enhance(key: string): void {
    const a = this.auras.get(key)
    if (!a || a.dissolving) return
    a.autoDissolveAt = null // persists until statusExpired
    a.pulse = 1
    if (a.enhanced) return
    a.enhanced = true
    for (let i = 0; i < RUNE_COUNT; i++) {
      const node = this.glowPool.acquire()
      node.visible = true
      node.alpha = 0
      node.tint = a.config.runeColor
      a.runes.push({
        node,
        angle: (i / RUNE_COUNT) * Math.PI * 2,
        radius: a.config.radius * 0.9,
        phase: this.rng() * Math.PI * 2,
      })
    }
  }

  /** A cooldown was slowed — flash the frost brighter + a shimmer burst. */
  pulse(key: string): void {
    const a = this.auras.get(key)
    if (!a || a.dissolving) return
    a.pulse = 1
    for (let i = 0; i < 8; i++) this.spawnShard(a)
  }

  /**
   * Freeze to the Core buildup: dense freezing mist, snow, and ice crystals
   * spiral INWARD toward the target over the gather window. One-shot (no keyed
   * aura) — the cast orchestrates gather → flash → {@link erupt}.
   */
  gather(at: Vec2, config: FrostAuraConfig): void {
    const gatherMs = 560
    for (let i = 0; i < 30; i++) {
      const a = this.rng() * Math.PI * 2
      const r = config.radius * (1.5 + this.rng() * 0.9)
      const x = at.x + Math.cos(a) * r
      const y = at.y + Math.sin(a) * r * 0.85
      const life = gatherMs * (0.7 + this.rng() * 0.3)
      const dist = Math.hypot(at.x - x, at.y - y)
      const speed = dist / (life / 1000) // arrives ~at the centre as it dies
      // A tangential lean so it spirals inward rather than falling straight in.
      const dir = Math.atan2(at.y - y, at.x - x) + (this.rng() < 0.5 ? 0.35 : -0.35)
      const kind = this.rng()
      const pool: PoolKind = kind < 0.3 ? 'glow' : 'soft'
      const tint = kind < 0.3 ? config.iceColor : kind < 0.7 ? config.vaporColor : config.frostColor
      const node = this.take(pool, tint)
      if (!node) continue
      this.push({
        node, pool, behavior: 'gather', owner: null,
        x, y,
        vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed,
        gravity: 0,
        age: 0, lifetime: life,
        size: 2 + this.rng() * 4, grow: 0.6,
        sway: 0, swayFreq: 0, swayPhase: 0,
        baseAlpha: 0.72,
      })
    }
  }

  /** Explosive crystal growth on the flash: ice shards burst outward + a scatter
   *  of bright sparkles erupt around the castle. One-shot. */
  erupt(at: Vec2, config: FrostAuraConfig): void {
    for (let i = 0; i < 26; i++) {
      const a = this.rng() * Math.PI * 2
      const spd = 160 + this.rng() * 340
      const node = this.take('glow', this.rng() < 0.5 ? config.iceColor : config.frostColor)
      if (!node) continue
      this.push({
        node, pool: 'glow', behavior: 'shard', owner: null,
        x: at.x, y: at.y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 30,
        gravity: 120,
        age: 0, lifetime: 480 + this.rng() * 320,
        size: 3 + this.rng() * 4, grow: 0.5,
        sway: 0, swayFreq: 0, swayPhase: 0,
        baseAlpha: 0.95,
      })
    }
    for (let i = 0; i < 8; i++) {
      const a = this.rng() * Math.PI * 2
      const r = config.radius * (0.4 + this.rng() * 0.7)
      const node = this.take('glow', config.iceColor)
      if (!node) continue
      this.push({
        node, pool: 'glow', behavior: 'sparkle', owner: null,
        x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r * 0.8,
        vx: 0, vy: 0, gravity: 0,
        age: 0, lifetime: 360, size: 4 + this.rng() * 3, grow: 1.8,
        sway: 0, swayFreq: 0, swayPhase: 0, baseAlpha: 0.95,
      })
    }
  }

  /** Begin the melt: magical energy fades, ice thaws into cold mist. */
  stop(key: string): void {
    const a = this.auras.get(key)
    if (a && !a.dissolving) {
      a.dissolving = true
      a.dissolve = 0
    }
  }

  /** True while a live (non-dissolving) aura exists under `key`. */
  has(key: string): boolean {
    const a = this.auras.get(key)
    return !!a && !a.dissolving
  }

  update(dtMs: number): void {
    for (const [key, a] of this.auras) {
      a.age += dtMs
      a.pulse = Math.max(0, a.pulse - dtMs / 500)
      if (!a.dissolving && a.autoDissolveAt !== null && a.age >= a.autoDissolveAt) {
        a.dissolving = true
        a.dissolve = 0
      }
      this.updateCrystals(a)
      if (a.enhanced) this.updateRunes(a, dtMs)
      if (a.dissolving) {
        a.dissolve += dtMs
        const taper = 1 - clamp01(a.dissolve / a.config.dissolveMs)
        this.emitVapor(a, dtMs, taper) // thaws into cold mist
        if (a.dissolve >= a.config.dissolveMs) {
          this.releaseAura(a)
          this.auras.delete(key)
        }
      } else {
        this.emitSnow(a, dtMs)
        this.emitVapor(a, dtMs, 1)
        this.updateSparkle(a, dtMs)
        if (a.enhanced) this.updatePulse(a, dtMs)
      }
    }
    this.updateParticles(dtMs)
  }

  // --- Frost creep + runes --------------------------------------------------

  private updateCrystals(a: FrostAura): void {
    const t = a.age / 1000
    const df = a.dissolving ? clamp01(a.dissolve / a.config.dissolveMs) : 0
    const bright = 1 + a.pulse * 0.8
    for (const c of a.crystals) {
      const grow = ease('easeOutCubic', clamp01((a.age - c.delay) / 500))
      const shimmer = 0.85 + 0.15 * Math.sin(t * 2 + c.phase)
      const melt = 1 - df
      const cx = a.target.x + c.homeX
      const cy = a.target.y + c.homeY
      const scale = (c.size * grow * melt * (0.9 + 0.1 * Math.sin(t * 1.5 + c.phase))) / this.baseRadius
      c.node.x = cx
      c.node.y = cy
      c.node.rotation = c.angle
      c.node.scale.set(scale, scale * 1.7) // elongated crystal shard
      c.node.tint = a.enhanced ? a.config.runeColor : a.config.frostColor
      c.node.alpha = grow * melt * 0.72 * shimmer
      c.glow.x = cx
      c.glow.y = cy
      c.glow.scale.set((c.size * 0.7 * grow * melt) / this.baseRadius)
      c.glow.alpha = grow * melt * (0.3 + 0.4 * a.pulse) * bright * shimmer
    }
  }

  private updateRunes(a: FrostAura, dtMs: number): void {
    const t = a.age / 1000
    const df = a.dissolving ? clamp01(a.dissolve / a.config.dissolveMs) : 0
    const spin = t * 0.6
    // The ring slowly breathes (expands + contracts) — runes "actively working".
    const breathe = 1 + Math.sin(t * 1.4 + a.seed) * 0.12
    const bright = 0.4 + 0.4 * a.pulse + 0.2 * Math.sin(t * 3 + a.seed)
    for (const r of a.runes) {
      const ang = r.angle + spin
      const rad = r.radius * breathe
      r.node.x = a.target.x + Math.cos(ang) * rad
      r.node.y = a.target.y + Math.sin(ang) * rad * 0.7
      r.node.scale.set((a.config.radius * 0.09) / this.baseRadius)
      r.node.alpha = (1 - df) * bright * (0.7 + 0.3 * Math.sin(t * 4 + r.phase))
    }
    void dtMs
  }

  private updatePulse(a: FrostAura, dtMs: number): void {
    // While enhanced, slow icy pulses travel around the target on their own so
    // the "cold interfering with recovery" reads even without a cooldown event.
    a.pulseTimer -= dtMs
    if (a.pulseTimer > 0) return
    a.pulseTimer = PULSE_EVERY_MS
    a.pulse = Math.max(a.pulse, 0.7)
    for (let i = 0; i < 5; i++) this.spawnShard(a)
  }

  // --- Snow / vapor / sparkle / shard ---------------------------------------

  private emitSnow(a: FrostAura, dtMs: number): void {
    a.snowDebt += SNOW_RATE * (dtMs / 1000)
    while (a.snowDebt >= 1) {
      a.snowDebt -= 1
      this.spawnSnow(a)
    }
  }

  private spawnSnow(a: FrostAura): void {
    const node = this.take('soft', 0xffffff)
    if (!node) return
    this.push({
      node,
      pool: 'soft',
      behavior: 'snow',
      owner: a,
      x: a.target.x + (this.rng() * 2 - 1) * a.config.radius,
      y: a.target.y - a.config.radius * 0.9,
      vx: (this.rng() * 2 - 1) * 8,
      vy: 30 + this.rng() * 40,
      gravity: 8,
      age: 0,
      lifetime: 1400 + this.rng() * 700,
      size: 1.4 + this.rng() * 1.4,
      grow: 1,
      sway: 10,
      swayFreq: 1.5 + this.rng() * 1.5,
      swayPhase: this.rng() * Math.PI * 2,
      baseAlpha: 0.9,
    })
  }

  private emitVapor(a: FrostAura, dtMs: number, intensity: number): void {
    a.vaporDebt += VAPOR_RATE * intensity * (dtMs / 1000)
    while (a.vaporDebt >= 1) {
      a.vaporDebt -= 1
      this.spawnVapor(a)
    }
  }

  private spawnVapor(a: FrostAura): void {
    const node = this.take('soft', a.config.vaporColor)
    if (!node) return
    this.push({
      node,
      pool: 'soft',
      behavior: 'vapor',
      owner: a,
      x: a.target.x + (this.rng() * 2 - 1) * a.config.radius * 0.7,
      y: a.target.y + a.config.radius * 0.3,
      vx: (this.rng() * 2 - 1) * 6,
      vy: -(22 + this.rng() * 34),
      gravity: 0,
      age: 0,
      lifetime: 1200 + this.rng() * 700,
      size: 3 + this.rng() * 3,
      grow: 2.2,
      sway: 8, // curls as it rises
      swayFreq: 2 + this.rng() * 2,
      swayPhase: this.rng() * Math.PI * 2,
      baseAlpha: 0.34,
    })
  }

  private updateSparkle(a: FrostAura, dtMs: number): void {
    a.sparkleTimer -= dtMs
    if (a.sparkleTimer > 0) return
    a.sparkleTimer = SPARKLE_EVERY_MS + this.rng() * 500
    const c = a.crystals[Math.floor(this.rng() * a.crystals.length)]
    if (!c) return
    const node = this.take('glow', a.config.iceColor)
    if (!node) return
    this.push({
      node,
      pool: 'glow',
      behavior: 'sparkle',
      owner: a,
      x: a.target.x + c.homeX,
      y: a.target.y + c.homeY,
      vx: 0,
      vy: 0,
      gravity: 0,
      age: 0,
      lifetime: 340,
      size: 4 + this.rng() * 3,
      grow: 1.7,
      sway: 0,
      swayFreq: 0,
      swayPhase: 0,
      baseAlpha: 0.9,
    })
  }

  /** A shimmering ice particle flung out on a cooldown pulse. */
  private spawnShard(a: FrostAura): void {
    const node = this.take('glow', a.config.iceColor)
    if (!node) return
    const ang = this.rng() * Math.PI * 2
    const spd = 90 + this.rng() * 160
    this.push({
      node,
      pool: 'glow',
      behavior: 'shard',
      owner: a,
      x: a.target.x + (this.rng() * 2 - 1) * a.config.radius * 0.4,
      y: a.target.y + (this.rng() * 2 - 1) * a.config.radius * 0.3,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 20,
      gravity: 60,
      age: 0,
      lifetime: 420 + this.rng() * 240,
      size: 2 + this.rng() * 2,
      grow: 0.4,
      sway: 0,
      swayFreq: 0,
      swayPhase: 0,
      baseAlpha: 0.95,
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
        this.release(p)
        this.particles.splice(i, 1)
        continue
      }
      p.vy += p.gravity * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.sway) p.x += Math.cos((p.age / 1000) * p.swayFreq + p.swayPhase) * p.sway * dt
      p.node.x = p.x
      p.node.y = p.y
      const sc = (p.size * (1 + (p.grow - 1) * life)) / this.baseRadius
      p.node.scale.set(sc)
      // Sparkles + converging gather particles fade in then out; the rest fade out.
      const fade = p.behavior === 'sparkle' || p.behavior === 'gather'
        ? Math.sin(life * Math.PI)
        : 1 - life
      p.node.alpha = Math.min(1, p.baseAlpha * fade * (1 + (p.owner?.pulse ?? 0) * 0.4))
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

  private releaseAura(a: FrostAura): void {
    for (const c of a.crystals) {
      this.softPool.release(c.node)
      this.glowPool.release(c.glow)
    }
    a.crystals.length = 0
    for (const r of a.runes) this.glowPool.release(r.node)
    a.runes.length = 0
  }

  /** Number of live (including dissolving) auras. */
  get active(): number {
    return this.auras.size
  }

  /** Total live particles — exposed for tests/inspection. */
  get particleCount(): number {
    return this.particles.length
  }

  clear(): void {
    for (const a of this.auras.values()) this.releaseAura(a)
    this.auras.clear()
    for (const p of this.particles) this.release(p)
    this.particles.length = 0
  }
}
