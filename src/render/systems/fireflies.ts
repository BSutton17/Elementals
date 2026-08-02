import type { DisplayNode, FirefliesConfig, Vec2 } from '../types'
import { ObjectPool, type PoolOptions } from '../pool'
import { clamp01, ease } from '../easing'
import { UNIT_RADIUS, resetDisplayNode } from '../nodeUtil'

// Fireflies system (Light's Fireflies, Epic 9). A swarm of little lights that
// settles over a kingdom and DANCES there — indefinitely. Unlike every other
// aura in the engine this one has no natural lifetime: the swarm stays until
// the victim pays the ransom to be rid of it, so `stop()` is the only exit.
//
// Keyed per target and rendered in the Pixi front layers. Organized into
// independent modules driven from one per-frame update:
//
//   • the swarm      — each fly wanders its own lazy orbit around the kingdom,
//     bobbing and weaving on its own noise so no two move alike and the cloud
//     never looks like a rotating ring.
//   • the blink      — each fly pulses its own glow at its own rate, the way
//     real fireflies do: mostly dim, briefly brilliant.
//   • trails         — a faint mote shed behind a fly that is moving quickly,
//     so a fast swarm reads as streaks of light rather than dots.
//   • agitation      — agitate(): Illumination lit them up. The whole swarm
//     brightens, speeds up, and swarms tighter for a while, then eases back to
//     its lazy drift. Cumulative, so repeated casts keep stacking the frenzy.
//   • expiration     — stop(): the ransom was paid. The lights scatter outward
//     and wink out one by one rather than all vanishing on the same frame.
//
// Appearance is tint + scale on additive glow sprites (element-agnostic), so any
// future "swarm of little lights" ability can reuse this by palette alone.

/** How many flies make up a swarm. */
const FLY_COUNT = 22
/** Hard cap on trail motes across ALL swarms (protects frame time). */
const MAX_TRAILS = 220
/** Trail motes shed per second by a fly at full agitation. */
const TRAIL_RATE = 5
/** How long the agitation from one Illumination takes to fade, in ms. */
const AGITATION_DECAY_MS = 6000
/** How long the swarm takes to scatter and wink out once dispelled, in ms. */
const SCATTER_MS = 900

interface Fly {
  glow: DisplayNode
  /** Current position, relative to the swarm's centre. */
  x: number
  y: number
  /** The orbit this fly wanders: a base angle + radius it drifts around. */
  angle: number
  radius: number
  /** Independent speeds so the swarm never moves as one body. */
  angularSpeed: number
  /** Vertical bob. */
  bobPhase: number
  bobSpeed: number
  bobHeight: number
  /** Wander: a slow wobble in and out of its orbit. */
  wanderPhase: number
  wanderSpeed: number
  wanderAmount: number
  /** Blink: its own rhythm, offset from every other fly. */
  blinkPhase: number
  blinkSpeed: number
  size: number
  /** Set while scattering: the direction it flees. */
  fleeX: number
  fleeY: number
  /** Staggered so they don't all wink out together. */
  fleeDelay: number
  trailDebt: number
}

interface Trail {
  node: DisplayNode
  x: number
  y: number
  age: number
  lifetime: number
  size: number
  tint: number
}

interface Swarm {
  target: Vec2
  config: FirefliesConfig
  age: number
  /** 0→1+, how worked-up the swarm is. Decays back to 0 on its own. */
  agitation: number
  scattering: boolean
  scatter: number
  flies: Fly[]
}

export class FirefliesSystem {
  private readonly glowPool: ObjectPool<DisplayNode>
  private readonly swarms = new Map<string, Swarm>()
  private readonly trails: Trail[] = []
  private readonly baseRadius: number
  private readonly rng: () => number

  constructor(
    createGlow: () => DisplayNode,
    baseRadius = UNIT_RADIUS,
    options: { rng?: () => number } & PoolOptions = {},
  ) {
    this.baseRadius = baseRadius
    this.rng = options.rng ?? Math.random
    this.glowPool = new ObjectPool(createGlow, resetDisplayNode, {
      prewarm: options.prewarm ?? 48,
    })
  }

  /** Begin (or relocate) a swarm on `at`, keyed by `key`. */
  start(key: string, at: Vec2, config: FirefliesConfig): void {
    const existing = this.swarms.get(key)
    if (existing && !existing.scattering) {
      existing.target = { x: at.x, y: at.y }
      return
    }
    if (existing) this.releaseSwarm(existing)

    const swarm: Swarm = {
      target: { x: at.x, y: at.y },
      config,
      age: 0,
      agitation: 0,
      scattering: false,
      scatter: 0,
      flies: [],
    }
    for (let i = 0; i < FLY_COUNT; i++) {
      const angle = (i / FLY_COUNT) * Math.PI * 2 + this.rng() * 0.8
      // Spread them through the volume rather than around a ring.
      const radius = config.radius * (0.28 + 0.72 * Math.sqrt(this.rng()))
      const glow = this.glowPool.acquire()
      glow.visible = true
      glow.alpha = 0
      glow.tint = config.glowColor
      swarm.flies.push({
        glow,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.66,
        angle,
        radius,
        // Half drift one way, half the other — a swarm, not a carousel.
        angularSpeed: (0.18 + this.rng() * 0.42) * (this.rng() < 0.5 ? -1 : 1),
        bobPhase: this.rng() * Math.PI * 2,
        bobSpeed: 0.8 + this.rng() * 1.6,
        bobHeight: config.radius * (0.06 + this.rng() * 0.14),
        wanderPhase: this.rng() * Math.PI * 2,
        wanderSpeed: 0.3 + this.rng() * 0.7,
        wanderAmount: config.radius * (0.08 + this.rng() * 0.2),
        blinkPhase: this.rng() * Math.PI * 2,
        blinkSpeed: 1.4 + this.rng() * 2.2,
        size: config.flySize * (0.7 + this.rng() * 0.6),
        fleeX: 0,
        fleeY: 0,
        fleeDelay: this.rng() * 260,
        trailDebt: 0,
      })
    }
    this.swarms.set(key, swarm)
  }

  /**
   * Illumination lit the swarm up: they shine brighter, dance faster, and pull
   * in tighter for a few seconds. Stacks, so a second cast on an already-frantic
   * swarm drives it harder still. No-op if the target has no fireflies.
   */
  agitate(key: string, amount = 1): void {
    const swarm = this.swarms.get(key)
    if (!swarm || swarm.scattering) return
    swarm.agitation = Math.min(2.5, swarm.agitation + amount)
  }

  /** The ransom was paid — scatter the swarm and let it wink out. */
  stop(key: string): void {
    const swarm = this.swarms.get(key)
    if (!swarm || swarm.scattering) return
    swarm.scattering = true
    swarm.scatter = 0
    for (const fly of swarm.flies) {
      // Flee outward from wherever it happens to be sitting.
      const len = Math.hypot(fly.x, fly.y) || 1
      fly.fleeX = (fly.x / len) * swarm.config.radius * (1.4 + this.rng())
      fly.fleeY = (fly.y / len) * swarm.config.radius * (1.0 + this.rng()) - swarm.config.radius * 0.4
    }
  }

  /** True while a live (non-scattering) swarm exists under `key`. */
  has(key: string): boolean {
    const swarm = this.swarms.get(key)
    return !!swarm && !swarm.scattering
  }

  /**
   * How worked-up a swarm is, 0 = its lazy resting drift. Exposed so the
   * Illumination synergy can be asserted without reaching into private state.
   */
  agitationOf(key: string): number {
    return this.swarms.get(key)?.agitation ?? 0
  }

  /** Where each fly currently is, in world coords. Empty for an unknown key. */
  positions(key: string): Vec2[] {
    const swarm = this.swarms.get(key)
    if (!swarm) return []
    return swarm.flies.map((f) => ({ x: swarm.target.x + f.x, y: swarm.target.y + f.y }))
  }

  /** Reposition a live swarm (the kingdom moved / the layout changed). */
  moveTo(key: string, at: Vec2): void {
    const swarm = this.swarms.get(key)
    if (swarm) swarm.target = { x: at.x, y: at.y }
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000
    for (const [key, swarm] of this.swarms) {
      swarm.age += dtMs
      // Agitation always bleeds back toward a lazy drift.
      if (swarm.agitation > 0) {
        swarm.agitation = Math.max(0, swarm.agitation - dtMs / AGITATION_DECAY_MS)
      }
      if (swarm.scattering) {
        swarm.scatter += dtMs
        if (swarm.scatter >= SCATTER_MS + 300) {
          this.releaseSwarm(swarm)
          this.swarms.delete(key)
          continue
        }
      }
      this.updateSwarm(swarm, dt, dtMs)
    }
    this.updateTrails(dtMs)
  }

  private updateSwarm(swarm: Swarm, dt: number, dtMs: number): void {
    const { config } = swarm
    const agitation = swarm.agitation
    // Agitated flies move faster and pull in toward the kingdom.
    const speedScale = 1 + agitation * 1.8
    const radiusScale = 1 - Math.min(0.42, agitation * 0.22)

    for (const fly of swarm.flies) {
      fly.angle += fly.angularSpeed * speedScale * dt
      fly.wanderPhase += fly.wanderSpeed * speedScale * dt
      fly.bobPhase += fly.bobSpeed * speedScale * dt
      fly.blinkPhase += fly.blinkSpeed * (1 + agitation) * dt

      const wander = Math.sin(fly.wanderPhase) * fly.wanderAmount
      const radius = (fly.radius + wander) * radiusScale
      const homeX = Math.cos(fly.angle) * radius
      const homeY = Math.sin(fly.angle) * radius * 0.66 + Math.sin(fly.bobPhase) * fly.bobHeight

      let x = homeX
      let y = homeY
      let alphaScale = 1

      if (swarm.scattering) {
        // Past its own delay, the fly bolts outward and fades.
        const t = clamp01((swarm.scatter - fly.fleeDelay) / SCATTER_MS)
        const e = ease('easeOut', t)
        x = homeX + fly.fleeX * e
        y = homeY + fly.fleeY * e
        alphaScale = 1 - t
      }

      fly.x = x
      fly.y = y

      // The blink: mostly dim, briefly brilliant. Agitation raises the floor so
      // an Illuminated swarm reads as a solid mass of light.
      const pulse = (Math.sin(fly.blinkPhase) + 1) / 2
      const floor = 0.18 + agitation * 0.34
      const brightness = floor + (1 - floor) * Math.pow(pulse, 3)

      fly.glow.x = swarm.target.x + x
      fly.glow.y = swarm.target.y + y
      const size = (fly.size * (1 + agitation * 0.3)) / this.baseRadius
      fly.glow.scale.set(size)
      fly.glow.alpha = brightness * config.intensity * alphaScale
      fly.glow.tint = agitation > 0.35 ? config.litColor : config.glowColor

      // A quick fly sheds a faint mote behind it.
      if (!swarm.scattering && agitation > 0.2) {
        fly.trailDebt += (TRAIL_RATE * agitation * dtMs) / 1000
        while (fly.trailDebt >= 1) {
          fly.trailDebt -= 1
          this.spawnTrail(swarm, swarm.target.x + x, swarm.target.y + y, fly.size)
        }
      }
    }
  }

  private spawnTrail(swarm: Swarm, x: number, y: number, size: number): void {
    if (this.trails.length >= MAX_TRAILS) return
    const node = this.glowPool.acquire()
    node.visible = true
    node.tint = swarm.config.litColor
    this.trails.push({
      node,
      x,
      y,
      age: 0,
      lifetime: 240 + this.rng() * 220,
      size: size * 0.6,
      tint: swarm.config.litColor,
    })
  }

  private updateTrails(dtMs: number): void {
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const trail = this.trails[i]!
      trail.age += dtMs
      const t = clamp01(trail.age / trail.lifetime)
      if (t >= 1) {
        this.glowPool.release(trail.node)
        this.trails.splice(i, 1)
        continue
      }
      const size = (trail.size * (1 - 0.5 * t)) / this.baseRadius
      trail.node.x = trail.x
      trail.node.y = trail.y
      trail.node.scale.set(size)
      trail.node.alpha = (1 - t) * 0.5
    }
  }

  private releaseSwarm(swarm: Swarm): void {
    for (const fly of swarm.flies) this.glowPool.release(fly.glow)
    swarm.flies.length = 0
  }

  /** Drop every swarm and mote (match teardown). */
  clear(): void {
    for (const swarm of this.swarms.values()) this.releaseSwarm(swarm)
    this.swarms.clear()
    for (const trail of this.trails) this.glowPool.release(trail.node)
    this.trails.length = 0
  }
}
