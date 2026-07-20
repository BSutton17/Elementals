import type { DisplayNode, ProjectileConfig, Vec2 } from '../types'
import { ObjectPool, type PoolOptions } from '../pool'
import { ease } from '../easing'
import { angleBetween, lerpPoint } from '../trajectory'
import { UNIT_RADIUS, resetDisplayNode } from '../nodeUtil'

// Projectile system (Epic 9, ticket #210). An attack travels in a STRAIGHT LINE
// from A to B over a data-defined `durationMs`, then invokes `onArrive` (which
// the framework uses to trigger the impact/particles at B). Nodes are pooled.

interface ActiveProjectile {
  node: DisplayNode
  from: Vec2
  to: Vec2
  config: ProjectileConfig
  elapsed: number
  onArrive?: (at: Vec2) => void
  onStep?: (at: Vec2, dtMs: number) => void
}

export class ProjectileSystem {
  private readonly pool: ObjectPool<DisplayNode>
  private readonly items: ActiveProjectile[] = []
  private readonly baseRadius: number

  constructor(
    createNode: () => DisplayNode,
    baseRadius = UNIT_RADIUS,
    poolOptions: PoolOptions = { prewarm: 8 },
  ) {
    this.baseRadius = baseRadius
    this.pool = new ObjectPool(createNode, resetDisplayNode, poolOptions)
  }

  /**
   * Launch a projectile from `from` to `to`. `onArrive` fires once it lands;
   * `onStep` fires each frame with the projectile's current position (used to
   * stream a trail along the path).
   */
  spawn(
    config: ProjectileConfig,
    from: Vec2,
    to: Vec2,
    onArrive?: (at: Vec2) => void,
    onStep?: (at: Vec2, dtMs: number) => void,
  ): void {
    const node = this.pool.acquire()
    node.visible = true
    node.alpha = 1
    node.tint = config.color
    node.x = from.x
    node.y = from.y
    node.scale.set(config.size / this.baseRadius)
    if (config.faceDirection) node.rotation = angleBetween(from, to)
    this.items.push({
      node,
      from: { x: from.x, y: from.y },
      to: { x: to.x, y: to.y },
      config,
      elapsed: 0,
      onArrive,
      onStep,
    })
  }

  update(dtMs: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i]!
      p.elapsed += dtMs
      const raw = p.config.durationMs <= 0 ? 1 : Math.min(1, p.elapsed / p.config.durationMs)
      const pos = lerpPoint(p.from, p.to, ease(p.config.easing, raw))
      p.node.x = pos.x
      p.node.y = pos.y
      if (!p.config.faceDirection && p.config.spin) {
        p.node.rotation += p.config.spin * (dtMs / 1000)
      }
      p.onStep?.(pos, dtMs)
      if (raw >= 1) {
        this.items.splice(i, 1)
        this.pool.release(p.node)
        p.onArrive?.(p.to)
      }
    }
  }

  /** Number of projectiles currently in flight. */
  get active(): number {
    return this.items.length
  }

  clear(): void {
    for (const p of this.items) this.pool.release(p.node)
    this.items.length = 0
  }
}
