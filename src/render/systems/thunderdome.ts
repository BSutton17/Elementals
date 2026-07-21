import type { BoltNode, DisplayNode, ThunderdomeConfig, Vec2 } from '../types'
import { ObjectPool, type PoolOptions } from '../pool'
import { clamp01 } from '../easing'
import { generateBolt } from './lightning'
import { UNIT_RADIUS, resetDisplayNode } from '../nodeUtil'

// Thunderdome system (Epic 9). A persistent electrical pentagon cage locked
// around a trapped target. Rendered in the Pixi front layer, so it sits above
// the SVG shields automatically. Organized into independent modules driven from
// one per-frame update — each keyed by target:
//
//   • corner nodes   — five glowing nodes that pop in one after another.
//   • pentagon edges — lightning arcs constructed between the nodes in sequence,
//     then RACING electricity (regenerated every frame) pulsing purple↔yellow.
//   • branch/interior arcs — short bolts that jump between adjacent corners or
//     inward, plus faint interior currents; density rises with surge.
//   • interior field — a soft purple glow that gently pulses.
//   • sparks         — occasional crackle (idle), bursts (surge / collapse).
//   • motion         — hover, gentle back-and-forth rotation, scale breathing.
//   • surge          — a decaying spike that brightens edges, flashes nodes, and
//     throws extra interior lightning when Electricity hits the trapped target.
//   • collapse       — on expiry the edges retract into the corners, which then
//     burst into sparks, leaving a brief purple afterglow.
//
// Lightning geometry reuses `generateBolt` (pure), so the arena is never static;
// only sprite/polyline drawing is Pixi. Pooled for many simultaneous domes.

const CORNERS = 5
const NODE_STAGGER_MS = 90 // between corner appearances during build
const EDGE_BUILD_MS = 340 // to construct all edges after the nodes are in
const HOVER_Y = -10 // the cage floats slightly above the target
const MAX_SPARKS = 200

interface Spark {
  node: DisplayNode
  x: number
  y: number
  vx: number
  vy: number
  age: number
  lifetime: number
  size: number
}

interface Dome {
  center: Vec2
  config: ThunderdomeConfig
  age: number
  collapsing: boolean
  collapse: number // elapsed in the collapse phase, ms
  exploded: boolean // corner burst fired once during collapse
  surge: number // 0..1, decays each frame
  seed: number // per-dome animation phase offset
  corners: DisplayNode[] // 5 corner glow nodes
  core: DisplayNode // interior glow
  edgeBolt: BoltNode // the pentagon edges
  arcBolt: BoltNode // branch + interior arcs
  sparkDebt: number
}

export class ThunderdomeSystem {
  private readonly glowPool: ObjectPool<DisplayNode>
  private readonly boltPool: ObjectPool<BoltNode>
  private readonly domes = new Map<string, Dome>()
  private readonly sparks: Spark[] = []
  private readonly baseRadius: number
  private readonly rng: () => number

  constructor(
    createGlow: () => DisplayNode,
    createBolt: () => BoltNode,
    baseRadius = UNIT_RADIUS,
    options: { rng?: () => number } & PoolOptions = {},
  ) {
    this.baseRadius = baseRadius
    this.rng = options.rng ?? Math.random
    this.glowPool = new ObjectPool(createGlow, resetDisplayNode, { prewarm: options.prewarm ?? 24 })
    this.boltPool = new ObjectPool(createBolt, (b) => b.clear(), { prewarm: 4 })
  }

  /** Begin (or refresh) a Thunderdome around `at`, keyed by `key`. */
  start(key: string, at: Vec2, config: ThunderdomeConfig): void {
    const existing = this.domes.get(key)
    if (existing && !existing.collapsing) {
      existing.center = { x: at.x, y: at.y }
      return
    }
    if (existing) this.release(existing)
    const corners: DisplayNode[] = []
    for (let i = 0; i < CORNERS; i++) {
      const n = this.glowPool.acquire()
      n.visible = true
      n.alpha = 0
      corners.push(n)
    }
    const core = this.glowPool.acquire()
    core.visible = true
    core.alpha = 0
    this.domes.set(key, {
      center: { x: at.x, y: at.y },
      config,
      age: 0,
      collapsing: false,
      collapse: 0,
      exploded: false,
      surge: 0,
      seed: this.rng() * Math.PI * 2,
      corners,
      core,
      edgeBolt: this.boltPool.acquire(),
      arcBolt: this.boltPool.acquire(),
      sparkDebt: 0,
    })
  }

  /** Begin the graceful collapse (energy retracts into the corners). */
  stop(key: string): void {
    const d = this.domes.get(key)
    if (d && !d.collapsing) {
      d.collapsing = true
      d.collapse = 0
    }
  }

  /** Reactive surge — Electricity struck the trapped target. */
  surge(key: string): void {
    const d = this.domes.get(key)
    if (d && !d.collapsing) d.surge = 1
  }

  /** True while a live (non-collapsing) dome exists under `key`. */
  has(key: string): boolean {
    const d = this.domes.get(key)
    return !!d && !d.collapsing
  }

  update(dtMs: number): void {
    for (const [key, d] of this.domes) {
      d.age += dtMs
      d.surge = Math.max(0, d.surge - dtMs / 260) // ~260ms to settle
      if (d.collapsing) {
        d.collapse += dtMs
        this.drawCollapse(d)
        if (d.collapse >= d.config.collapseMs) {
          this.release(d)
          this.domes.delete(key)
        }
      } else {
        this.drawActive(d, dtMs)
      }
    }
    this.updateSparks(dtMs)
  }

  // --- Build + idle + surge -------------------------------------------------

  private drawActive(d: Dome, dtMs: number): void {
    const { config } = d
    const R = config.radius
    const t = d.age / 1000
    // Motion: gentle sway + breathing.
    const rot = Math.sin(t * 0.8 + d.seed) * (6 * (Math.PI / 180))
    const breathe = 1 + Math.sin(t * 1.7 + d.seed) * 0.03
    const s = 1 + d.surge * 0.7 // surge intensity multiplier
    const pts = this.cornerPositions(d, R * breathe, rot)

    // Corner nodes (staggered pop-in, then pulse + surge flash).
    for (let i = 0; i < CORNERS; i++) {
      const appear = clamp01((d.age - i * NODE_STAGGER_MS) / 130)
      const pulse = 0.7 + 0.3 * Math.sin(t * 6 + i)
      const node = d.corners[i]!
      node.x = pts[i]!.x
      node.y = pts[i]!.y
      node.tint = config.coreColor
      node.alpha = appear * pulse * (0.85 + 0.6 * d.surge)
      node.scale.set(((10 + 4 * d.surge) / this.baseRadius) * appear * breathe)
    }

    // Interior glow field (soft purple, slow pulse + surge).
    const cx = d.center.x
    const cy = d.center.y + HOVER_Y
    const fieldAppear = clamp01((d.age - CORNERS * NODE_STAGGER_MS) / 300)
    d.core.x = cx
    d.core.y = cy
    d.core.tint = config.glowColor
    d.core.alpha = fieldAppear * (0.1 + 0.06 * Math.sin(t * 2.2) + 0.18 * d.surge)
    d.core.scale.set((R * 0.95 * breathe) / this.baseRadius)

    // Pentagon edges: each constructs in sequence, then races with electricity.
    const nodesDoneAt = CORNERS * NODE_STAGGER_MS
    const edgeSpan = EDGE_BUILD_MS / CORNERS
    const purple: Vec2[][] = []
    const core: Vec2[][] = []
    for (let i = 0; i < CORNERS; i++) {
      const a = pts[i]!
      const b = pts[(i + 1) % CORNERS]!
      const edgeAlpha = clamp01((d.age - (nodesDoneAt + i * edgeSpan)) / 150)
      if (edgeAlpha <= 0) continue
      // Regenerated every frame → racing crackle that never sits still.
      const path = generateBolt(a, b, 0.14, 3, this.rng)
      purple.push(path)
      core.push(path)
    }
    const flick = 0.75 + 0.25 * this.rng()
    // Pulse the two hues out of phase so the cage shifts purple↔yellow.
    const pPulse = 0.55 + 0.45 * Math.sin(t * 4)
    const yPulse = 0.55 + 0.45 * Math.sin(t * 4 + Math.PI)
    d.edgeBolt.draw([
      { paths: purple, width: (6 + 3 * d.surge) * breathe, color: config.glowColor, alpha: 0.5 * pPulse * s * flick },
      { paths: core, width: (2.2 + 1.5 * d.surge) * breathe, color: config.coreColor, alpha: 0.9 * yPulse * s * flick },
    ])

    // Branch + interior arcs — density rises with surge.
    const arcs = this.buildArcs(d, pts, cx, cy)
    d.arcBolt.draw([
      { paths: arcs, width: 2 + 2 * d.surge, color: config.coreColor, alpha: (0.35 + 0.5 * d.surge) * flick },
    ])

    // Sparks: idle crackle, plus a burst on surge.
    const rate = 8 + d.surge * 70
    d.sparkDebt += rate * (dtMs / 1000)
    while (d.sparkDebt >= 1) {
      d.sparkDebt -= 1
      const p = pts[Math.floor(this.rng() * CORNERS)]!
      this.spawnSpark(p.x, p.y, config.coreColor, 40 + 160 * d.surge)
    }
  }

  /** Short arcs jumping between adjacent corners / inward, plus interior currents. */
  private buildArcs(d: Dome, pts: Vec2[], cx: number, cy: number): Vec2[][] {
    const arcs: Vec2[][] = []
    const built = d.age > CORNERS * NODE_STAGGER_MS + EDGE_BUILD_MS
    if (!built) return arcs
    // Idle: an occasional jump; surge: several, including cross-interior bolts.
    const count = (this.rng() < 0.3 ? 1 : 0) + Math.round(d.surge * 4)
    for (let k = 0; k < count; k++) {
      const i = Math.floor(this.rng() * CORNERS)
      const r = this.rng()
      if (r < 0.45) {
        // between adjacent corners (a brighter re-arc of an edge)
        arcs.push(generateBolt(pts[i]!, pts[(i + 1) % CORNERS]!, 0.22, 3, this.rng))
      } else if (r < 0.8) {
        // inward toward the trapped target
        arcs.push(generateBolt(pts[i]!, { x: cx, y: cy }, 0.3, 3, this.rng))
      } else {
        // across the interior (surge-ish)
        arcs.push(generateBolt(pts[i]!, pts[(i + 2) % CORNERS]!, 0.28, 4, this.rng))
      }
    }
    return arcs
  }

  // --- Collapse -------------------------------------------------------------

  private drawCollapse(d: Dome): void {
    const { config } = d
    const cf = clamp01(d.collapse / config.collapseMs)
    const R = config.radius
    const rot = Math.sin((d.age / 1000) * 0.8 + d.seed) * (6 * (Math.PI / 180))
    const pts = this.cornerPositions(d, R, rot)
    const cx = d.center.x
    const cy = d.center.y + HOVER_Y

    // Edges retract into the corners over the first ~55%, then vanish.
    const retract = clamp01(cf / 0.55)
    const edgeAlpha = Math.max(0, 1 - cf / 0.55)
    const purple: Vec2[][] = []
    if (edgeAlpha > 0) {
      for (let i = 0; i < CORNERS; i++) {
        const a = pts[i]!
        const b = pts[(i + 1) % CORNERS]!
        // Shrink each edge toward corner `a` as it retracts.
        const end = { x: a.x + (b.x - a.x) * (1 - retract), y: a.y + (b.y - a.y) * (1 - retract) }
        purple.push(generateBolt(a, end, 0.16, 2, this.rng))
      }
    }
    d.edgeBolt.draw([
      { paths: purple, width: 5, color: config.glowColor, alpha: 0.5 * edgeAlpha },
      { paths: purple, width: 2, color: config.coreColor, alpha: 0.9 * edgeAlpha },
    ])
    d.arcBolt.clear()

    // Corners pull the energy in (brighten/grow), then burst once at ~55%.
    for (let i = 0; i < CORNERS; i++) {
      const node = d.corners[i]!
      node.x = pts[i]!.x
      node.y = pts[i]!.y
      node.tint = config.coreColor
      const pre = 1 - clamp01((cf - 0.55) / 0.45) // fade after the burst
      node.alpha = pre * (0.9 + 0.4 * retract)
      node.scale.set(((10 + 8 * retract) / this.baseRadius) * pre)
    }
    if (!d.exploded && cf >= 0.55) {
      d.exploded = true
      for (const p of pts) {
        for (let k = 0; k < 8; k++) this.spawnSpark(p.x, p.y, config.coreColor, 200)
      }
    }

    // Interior afterglow lingers, fading out.
    d.core.x = cx
    d.core.y = cy
    d.core.tint = config.glowColor
    d.core.alpha = 0.22 * (1 - cf)
    d.core.scale.set((R * (0.95 + 0.3 * cf)) / this.baseRadius)
  }

  // --- Sparks + helpers -----------------------------------------------------

  private spawnSpark(x: number, y: number, color: number, speed: number): void {
    if (this.sparks.length >= MAX_SPARKS) return
    const node = this.glowPool.acquire()
    node.visible = true
    node.tint = color
    node.alpha = 1
    node.x = x
    node.y = y
    const a = this.rng() * Math.PI * 2
    const spd = speed * (0.4 + 0.6 * this.rng())
    const size = 2 + 2 * this.rng()
    node.scale.set(size / this.baseRadius)
    this.sparks.push({
      node,
      x,
      y,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd - 30,
      age: 0,
      lifetime: 260 + this.rng() * 220,
      size,
    })
  }

  private updateSparks(dtMs: number): void {
    const dt = dtMs / 1000
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i]!
      p.age += dtMs
      const life = p.age / p.lifetime
      if (life >= 1) {
        this.glowPool.release(p.node)
        this.sparks.splice(i, 1)
        continue
      }
      p.vy += 260 * dt // slight gravity
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.node.x = p.x
      p.node.y = p.y
      p.node.alpha = 1 - life
      p.node.scale.set((p.size * (1 - 0.5 * life)) / this.baseRadius)
    }
  }

  /** The five pentagon corners (point-up) after rotation, hovering above target. */
  private cornerPositions(d: Dome, radius: number, rot: number): Vec2[] {
    const pts: Vec2[] = []
    for (let i = 0; i < CORNERS; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / CORNERS + rot
      pts.push({
        x: d.center.x + Math.cos(a) * radius,
        y: d.center.y + HOVER_Y + Math.sin(a) * radius,
      })
    }
    return pts
  }

  private release(d: Dome): void {
    for (const c of d.corners) this.glowPool.release(c)
    this.glowPool.release(d.core)
    this.boltPool.release(d.edgeBolt)
    this.boltPool.release(d.arcBolt)
  }

  /** Number of live (including collapsing) domes. */
  get active(): number {
    return this.domes.size
  }

  clear(): void {
    for (const d of this.domes.values()) this.release(d)
    this.domes.clear()
    for (const p of this.sparks) this.glowPool.release(p.node)
    this.sparks.length = 0
  }
}
