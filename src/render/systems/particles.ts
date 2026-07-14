import type { DisplayNode, ParticleBurstConfig, Vec2 } from '../types'
import { ObjectPool, type PoolOptions } from '../pool'
import { UNIT_RADIUS, resetDisplayNode } from '../nodeUtil'

// Particle system (Epic 9, ticket #210). Emits bursts of pooled particles with
// randomized velocity within a cone, optional gravity, and lifetime fade. A
// hard `maxActive` cap protects frame time under heavy 8-player load — excess
// emissions are simply skipped rather than dropping the whole match's FPS.
//
// Perf note: nodes are pooled Container/Graphics today; swapping the particle
// layer to a Pixi ParticleContainer is a localized change (nodes.ts + the
// layer) handled in the perf pass, since it needs real particle textures.

interface ActiveParticle {
  node: DisplayNode
  vx: number
  vy: number
  gravity: number
  lifetimeMs: number
  elapsed: number
  fade: boolean
}

export interface ParticleSystemOptions extends PoolOptions {
  /** Max simultaneously alive particles across all bursts. */
  maxActive?: number
  /** Injectable RNG for deterministic tests. */
  rng?: () => number
}

export class ParticleSystem {
  private readonly pool: ObjectPool<DisplayNode>
  private readonly items: ActiveParticle[] = []
  private readonly maxActive: number
  private readonly rng: () => number
  private readonly baseRadius: number

  constructor(
    createNode: () => DisplayNode,
    baseRadius = UNIT_RADIUS,
    options: ParticleSystemOptions = {},
  ) {
    this.baseRadius = baseRadius
    this.maxActive = options.maxActive ?? 600
    this.rng = options.rng ?? Math.random
    this.pool = new ObjectPool(createNode, resetDisplayNode, {
      prewarm: options.prewarm ?? 32,
      maxIdle: options.maxIdle,
    })
  }

  /** Emit a burst at `at`. Returns how many particles were actually spawned. */
  emit(config: ParticleBurstConfig, at: Vec2): number {
    const baseDir = config.direction ?? 0
    const fullCircle = config.direction === undefined
    const scale = config.size / this.baseRadius
    let spawned = 0
    for (let i = 0; i < config.count; i++) {
      if (this.items.length >= this.maxActive) break
      const angle = fullCircle
        ? this.rng() * Math.PI * 2
        : baseDir + (this.rng() * 2 - 1) * config.spread
      const speed = Array.isArray(config.speed)
        ? config.speed[0] + this.rng() * (config.speed[1] - config.speed[0])
        : config.speed
      const node = this.pool.acquire()
      node.visible = true
      node.alpha = 1
      node.tint = config.color
      node.x = at.x
      node.y = at.y
      node.scale.set(scale)
      this.items.push({
        node,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: config.gravity ?? 0,
        lifetimeMs: config.lifetimeMs,
        elapsed: 0,
        fade: config.fade ?? true,
      })
      spawned++
    }
    return spawned
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i]!
      p.elapsed += dtMs
      p.vy += p.gravity * dt
      p.node.x += p.vx * dt
      p.node.y += p.vy * dt
      if (p.fade) p.node.alpha = Math.max(0, 1 - p.elapsed / p.lifetimeMs)
      if (p.elapsed >= p.lifetimeMs) {
        this.items.splice(i, 1)
        this.pool.release(p.node)
      }
    }
  }

  get active(): number {
    return this.items.length
  }

  clear(): void {
    for (const p of this.items) this.pool.release(p.node)
    this.items.length = 0
  }
}
