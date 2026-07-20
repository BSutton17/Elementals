import type { AuraEmitterConfig, DisplayNode, Vec2 } from '../types'
import { ObjectPool, type PoolOptions } from '../pool'
import { UNIT_RADIUS, resetDisplayNode } from '../nodeUtil'

// Aura system (Epic 9). Persistent status auras — a status applies (Heat Wave,
// Blazing Determination) and the effect emits CONTINUOUSLY until the status
// expires, unlike the one-shot ParticleBurst. Each aura runs one or more emitter
// layers (e.g. smoke + embers, or flames + sparks) that spawn particles at a
// fixed rate; particles rise, drift/sway, grow or shrink, and fade. When an aura
// is stopped its particles finish their lives naturally. Two pools (normal +
// additive glow) so smoke and glowing flames coexist. Appearance is tint + scale
// on white sprites, so it's kingdom-agnostic and unit-testable with fakes.

/** Safety cap on simultaneously alive aura particles (across all auras). */
const MAX_PARTICLES = 420

interface AuraParticle {
  node: DisplayNode
  baseX: number // pre-sway x
  y: number
  vx: number
  vy: number // negative = rising
  age: number
  lifetime: number
  size0: number // world radius at spawn
  growth: number
  sway: number
  swayFreq: number
  swayPhase: number
  fade: boolean
  glow: boolean
}

interface EmitterState {
  config: AuraEmitterConfig
  debt: number
}

interface Aura {
  at: Vec2
  emitters: EmitterState[]
  emitting: boolean
  /** Time emitting so far (ms) — only tracked when `autoStopMs` is set. */
  elapsed: number
  /** Self-stop after this many ms (for cast-driven auras with no expiry event). */
  autoStopMs?: number
}

export class AuraSystem {
  private readonly normalPool: ObjectPool<DisplayNode>
  private readonly glowPool: ObjectPool<DisplayNode>
  private readonly auras = new Map<string, Aura>()
  private readonly particles: AuraParticle[] = []
  private readonly baseRadius: number
  private readonly rng: () => number

  constructor(
    createNode: () => DisplayNode,
    createGlowNode: () => DisplayNode,
    baseRadius = UNIT_RADIUS,
    options: { rng?: () => number } & PoolOptions = {},
  ) {
    this.baseRadius = baseRadius
    this.rng = options.rng ?? Math.random
    this.normalPool = new ObjectPool(createNode, resetDisplayNode, { prewarm: options.prewarm ?? 24 })
    this.glowPool = new ObjectPool(createGlowNode, resetDisplayNode, { prewarm: 24 })
  }

  /**
   * Start (or refresh) a persistent aura at `at`, keyed by `key`. With
   * `autoStopMs` the aura stops itself after that long — used for cast-driven
   * auras (no `statusExpired` to stop them); a refresh restarts the timer.
   */
  start(key: string, emitters: AuraEmitterConfig[], at: Vec2, autoStopMs?: number): void {
    const existing = this.auras.get(key)
    if (existing) {
      existing.at = { x: at.x, y: at.y }
      existing.emitting = true
      existing.elapsed = 0
      existing.autoStopMs = autoStopMs
      return
    }
    this.auras.set(key, {
      at: { x: at.x, y: at.y },
      emitting: true,
      elapsed: 0,
      autoStopMs,
      emitters: emitters.map((config) => ({ config, debt: 0 })),
    })
  }

  /** Stop emitting; the aura's existing particles finish their lives. */
  stop(key: string): void {
    const aura = this.auras.get(key)
    if (aura) aura.emitting = false
  }

  /** True while an aura is actively emitting under `key`. */
  has(key: string): boolean {
    return this.auras.get(key)?.emitting ?? false
  }

  update(dtMs: number): void {
    // Emit from active auras; drop stopped ones (their particles live on).
    for (const [key, aura] of this.auras) {
      if (!aura.emitting) {
        this.auras.delete(key)
        continue
      }
      // Cast-driven auras stop themselves after their window elapses.
      if (aura.autoStopMs !== undefined) {
        aura.elapsed += dtMs
        if (aura.elapsed >= aura.autoStopMs) {
          aura.emitting = false
          continue
        }
      }
      for (const em of aura.emitters) {
        em.debt += em.config.rate * (dtMs / 1000)
        while (em.debt >= 1) {
          em.debt -= 1
          if (this.particles.length < MAX_PARTICLES) this.spawn(em.config, aura.at)
        }
      }
    }

    const dt = dtMs / 1000
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!
      p.age += dtMs
      const lifeFrac = p.lifetime <= 0 ? 1 : p.age / p.lifetime
      if (lifeFrac >= 1) {
        this.release(p)
        this.particles.splice(i, 1)
        continue
      }
      p.baseX += p.vx * dt
      p.y += p.vy * dt
      const swayX = p.sway > 0 ? Math.sin((p.age / 1000) * p.swayFreq + p.swayPhase) * p.sway : 0
      p.node.x = p.baseX + swayX
      p.node.y = p.y
      p.node.scale.set((p.size0 * (1 + (p.growth - 1) * lifeFrac)) / this.baseRadius)
      p.node.alpha = p.fade ? 1 - lifeFrac : 1
    }
  }

  private spawn(config: AuraEmitterConfig, at: Vec2): void {
    const glow = config.glow ?? false
    const node = (glow ? this.glowPool : this.normalPool).acquire()
    const size0 = pick(config.size, this.rng)
    const rise = pick(config.riseSpeed, this.rng)
    const drift = config.drift ?? 0
    const baseX = at.x + (this.rng() - 0.5) * (config.spawnWidth ?? 0)
    const y = at.y + (config.originY ?? 0)
    node.visible = true
    node.tint = config.color
    node.alpha = 1
    node.x = baseX
    node.y = y
    node.scale.set(size0 / this.baseRadius)
    this.particles.push({
      node,
      baseX,
      y,
      vx: (this.rng() - 0.5) * 2 * drift,
      vy: -rise,
      age: 0,
      lifetime: config.lifetimeMs,
      size0,
      growth: config.growth ?? 1,
      sway: config.sway ?? 0,
      swayFreq: 2 + this.rng() * 3,
      swayPhase: this.rng() * Math.PI * 2,
      fade: config.fade ?? true,
      glow,
    })
  }

  private release(p: AuraParticle): void {
    ;(p.glow ? this.glowPool : this.normalPool).release(p.node)
  }

  /** Number of auras currently emitting. */
  get activeAuras(): number {
    return this.auras.size
  }

  /** Total live aura particles — exposed for tests/inspection. */
  get particleCount(): number {
    return this.particles.length
  }

  clear(): void {
    for (const p of this.particles) this.release(p)
    this.particles.length = 0
    this.auras.clear()
  }
}

/** Resolve a scalar or [min, max] range to a number. */
function pick(value: number | [number, number], rng: () => number): number {
  return Array.isArray(value) ? value[0] + rng() * (value[1] - value[0]) : value
}
