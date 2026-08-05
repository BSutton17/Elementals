import type { DisplayNode, FoxOrbitConfig, Vec2 } from '../types'
import { ObjectPool, type PoolOptions } from '../pool'
import { clamp01 } from '../easing'
import { UNIT_RADIUS, resetDisplayNode } from '../nodeUtil'

// Fox orbit system (Kitsune's Kitsune Rush, Epic 9). A pack of foxes that
// circles a castle at speed for as long as the Rush holds — the visual for a
// kingdom running at double time.
//
// It is deliberately NOT the fireflies swarm with a different sprite. Fireflies
// wander; these run a lap. The shape has to read as a ring being CIRCLED, fast,
// because that is what the ability does — so the foxes keep to their orbits and
// the variation is in how they run, not in where they go:
//
//   • the ring    — each fox holds its own orbit radius and speed, on an ellipse
//     flattened toward the horizontal so the ring reads as ground the foxes are
//     running on rather than a circle drawn on the screen.
//   • the run     — the same bounding gait the pack uses (see projectiles.ts),
//     each fox on its own stride phase, and each faces the way it is going
//     (mirrored rather than rotated past vertical, so nobody runs upside down).
//   • the trail   — foxfire motes shed off their paws, thickest from the fastest
//     foxes, so a fast ring reads as streaks of light.
//   • arrival     — they fade up over a moment instead of popping into place.
//   • departure   — stop(): the Rush ended. They sprint outward and fade, so the
//     ring dissolves rather than being cut.

/** How long the foxes take to fade in when the Rush starts. */
const ARRIVE_MS = 400
/** How long they take to peel away and fade once it ends. */
const DEPART_MS = 700
/** Hard cap on trail motes across ALL orbits (protects frame time). */
const MAX_MOTES = 160
/** Motes shed per second by one fox. */
const MOTE_RATE = 7

interface OrbitFox {
  node: DisplayNode
  /** Where on the ring it currently is. */
  angle: number
  /** Laps per second (signed — a couple run the other way). */
  angularSpeed: number
  /** Its own lane of the ring. */
  radius: number
  /** Its own stride, so the ring is not a line of synchronised sprites. */
  gaitPhase: number
  /** Own size, so the pack is not four identical foxes. */
  size: number
  /** Seconds of mote-shedding owed, carried across frames. */
  moteDebt: number
}

interface Orbit {
  at: Vec2
  config: FoxOrbitConfig
  foxes: OrbitFox[]
  ageMs: number
  /** Set by stop(): the ring is peeling away and will be released. */
  departing: boolean
  departMs: number
}

interface Mote {
  node: DisplayNode
  x: number
  y: number
  vx: number
  vy: number
  ageMs: number
  lifeMs: number
  size: number
}

export class FoxOrbitSystem {
  private readonly foxPool: ObjectPool<DisplayNode>
  private readonly motePool: ObjectPool<DisplayNode>
  private readonly orbits = new Map<string, Orbit>()
  private readonly motes: Mote[] = []
  private readonly baseRadius: number
  private readonly rng: () => number

  constructor(
    createFox: () => DisplayNode,
    createMote: () => DisplayNode,
    baseRadius = UNIT_RADIUS,
    options: { rng?: () => number } & PoolOptions = {},
  ) {
    this.baseRadius = baseRadius
    this.rng = options.rng ?? Math.random
    this.foxPool = new ObjectPool(createFox, resetDisplayNode, { prewarm: options.prewarm ?? 8 })
    this.motePool = new ObjectPool(createMote, resetDisplayNode, { prewarm: 32 })
  }

  /** Sets a ring of foxes running around `at`, keyed by `key`. Re-starting an
   *  existing ring just moves it (and calls off a departure in progress). */
  start(key: string, at: Vec2, config: FoxOrbitConfig): void {
    const existing = this.orbits.get(key)
    if (existing && !existing.departing) {
      existing.at = { x: at.x, y: at.y }
      return
    }
    if (existing) this.release(existing)

    const count = Math.max(1, Math.round(config.count))
    const orbit: Orbit = {
      at: { x: at.x, y: at.y },
      config,
      foxes: [],
      ageMs: 0,
      departing: false,
      departMs: 0,
    }
    for (let i = 0; i < count; i++) {
      const node = this.foxPool.acquire()
      node.visible = true
      node.alpha = 0
      node.tint = config.color
      orbit.foxes.push({
        node,
        // Evenly spaced to start, then nudged, so the ring is full from the
        // first frame but not mechanically regular.
        angle: (i / count) * Math.PI * 2 + this.rng() * 0.5,
        // Mostly one direction with the odd fox running against the ring —
        // enough disorder to look alive, not enough to lose the circle.
        angularSpeed:
          (config.lapsPerSecond * (0.8 + this.rng() * 0.45)) * (this.rng() < 0.85 ? 1 : -1),
        radius: config.radius * (0.82 + this.rng() * 0.36),
        gaitPhase: this.rng(),
        size: config.size * (0.85 + this.rng() * 0.3),
        moteDebt: 0,
      })
    }
    this.orbits.set(key, orbit)
  }

  /** Ends a ring: the foxes sprint outward and fade instead of vanishing. */
  stop(key: string): void {
    const orbit = this.orbits.get(key)
    if (!orbit || orbit.departing) return
    orbit.departing = true
    orbit.departMs = 0
  }

  /** True while a ring is running (or peeling away) under `key`. */
  has(key: string): boolean {
    return this.orbits.has(key)
  }

  /** Number of rings currently on the field. */
  get active(): number {
    return this.orbits.size
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000
    for (const [key, orbit] of this.orbits) {
      orbit.ageMs += dtMs
      let fade = clamp01(orbit.ageMs / ARRIVE_MS)
      // Peeling away: the ring widens as it dims, so they run OFF rather than
      // dissolving on the spot.
      let flee = 0
      if (orbit.departing) {
        orbit.departMs += dtMs
        const t = clamp01(orbit.departMs / DEPART_MS)
        fade *= 1 - t
        flee = t * orbit.config.radius * 1.6
        if (t >= 1) {
          this.release(orbit)
          this.orbits.delete(key)
          continue
        }
      }

      const cfg = orbit.config
      const flatten = cfg.flatten ?? 0.52
      for (const fox of orbit.foxes) {
        fox.angle += fox.angularSpeed * Math.PI * 2 * dt
        const r = fox.radius + flee
        const x = orbit.at.x + Math.cos(fox.angle) * r
        const y = orbit.at.y + Math.sin(fox.angle) * r * flatten

        // Tangent to the ellipse: which way this fox is actually running.
        const heading = Math.atan2(
          Math.cos(fox.angle) * flatten * Math.sign(fox.angularSpeed),
          -Math.sin(fox.angle) * Math.sign(fox.angularSpeed),
        )

        // The bounding gait, each fox on its own stride.
        const beat = (orbit.ageMs / 1000) * (cfg.gaitRate ?? 6) + fox.gaitPhase
        const bounce = Math.abs(Math.sin(beat * Math.PI)) * (cfg.bounce ?? 7)

        fox.node.x = x
        fox.node.y = y - bounce
        fox.node.alpha = fade
        const scale = fox.size / this.baseRadius
        // The sprite is drawn in profile facing +x. A fox running leftward is
        // MIRRORED rather than rotated the long way round — rotating past
        // vertical would stand it on its head.
        if (Math.cos(heading) < 0) {
          fox.node.rotation = heading + Math.PI
          fox.node.scale.set(-scale, scale)
        } else {
          fox.node.rotation = heading
          fox.node.scale.set(scale, scale)
        }

        // Foxfire shed off their paws — the faster the fox, the denser its
        // streak, so the ring reads as speed.
        if (!orbit.departing && this.motes.length < MAX_MOTES) {
          const rate = MOTE_RATE * Math.min(2, Math.abs(fox.angularSpeed) / cfg.lapsPerSecond)
          fox.moteDebt += rate * dt
          while (fox.moteDebt >= 1 && this.motes.length < MAX_MOTES) {
            fox.moteDebt -= 1
            this.spawnMote(x, y, cfg, fade)
          }
        }
      }
    }
    this.updateMotes(dtMs)
  }

  private spawnMote(x: number, y: number, cfg: FoxOrbitConfig, fade: number): void {
    const node = this.motePool.acquire()
    node.visible = true
    node.tint = cfg.moteColor
    node.alpha = fade
    const size = cfg.size * (0.14 + this.rng() * 0.16)
    node.scale.set(size / this.baseRadius)
    this.motes.push({
      node,
      x,
      y,
      // Motes drift up and outward off the paws and hang there.
      vx: (this.rng() * 2 - 1) * 18,
      vy: -12 - this.rng() * 26,
      ageMs: 0,
      lifeMs: 420 + this.rng() * 320,
      size,
    })
  }

  private updateMotes(dtMs: number): void {
    const dt = dtMs / 1000
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i]!
      m.ageMs += dtMs
      const t = clamp01(m.ageMs / m.lifeMs)
      if (t >= 1) {
        this.motes.splice(i, 1)
        this.motePool.release(m.node)
        continue
      }
      m.x += m.vx * dt
      m.y += m.vy * dt
      m.node.x = m.x
      m.node.y = m.y
      m.node.alpha = (1 - t) * 0.85
    }
  }

  private release(orbit: Orbit): void {
    for (const fox of orbit.foxes) this.foxPool.release(fox.node)
    orbit.foxes.length = 0
  }

  /** Drops every ring and mote immediately (match end). */
  clear(): void {
    for (const orbit of this.orbits.values()) this.release(orbit)
    this.orbits.clear()
    for (const m of this.motes) this.motePool.release(m.node)
    this.motes.length = 0
  }
}
