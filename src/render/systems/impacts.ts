import type { DisplayNode, ImpactConfig, Vec2 } from '../types'
import { ObjectPool, type PoolOptions } from '../pool'
import { ease } from '../easing'
import { UNIT_RADIUS, resetDisplayNode } from '../nodeUtil'

// Impact system (Epic 9, ticket #210). A one-shot burst at a point: the node
// grows from `startScale` to full `size` while fading out over `durationMs`.
// Pooled; driven by the shared per-frame update.

interface ActiveImpact {
  node: DisplayNode
  config: ImpactConfig
  peakScale: number
  startScale: number
  elapsed: number
}

export class ImpactSystem {
  private readonly pool: ObjectPool<DisplayNode>
  private readonly items: ActiveImpact[] = []
  private readonly baseRadius: number

  constructor(
    createNode: () => DisplayNode,
    baseRadius = UNIT_RADIUS,
    poolOptions: PoolOptions = { prewarm: 8 },
  ) {
    this.baseRadius = baseRadius
    this.pool = new ObjectPool(createNode, resetDisplayNode, poolOptions)
  }

  spawn(config: ImpactConfig, at: Vec2): void {
    const node = this.pool.acquire()
    const peakScale = config.size / this.baseRadius
    const startScale = (config.startScale ?? 0.2) * peakScale
    node.visible = true
    node.alpha = 1
    node.tint = config.color
    node.x = at.x
    node.y = at.y
    node.scale.set(startScale)
    this.items.push({ node, config, peakScale, startScale, elapsed: 0 })
  }

  update(dtMs: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i]!
      it.elapsed += dtMs
      const raw = it.config.durationMs <= 0 ? 1 : Math.min(1, it.elapsed / it.config.durationMs)
      const e = ease(it.config.easing ?? 'easeOut', raw)
      it.node.scale.set(it.startScale + (it.peakScale - it.startScale) * e)
      it.node.alpha = 1 - e
      if (raw >= 1) {
        this.items.splice(i, 1)
        this.pool.release(it.node)
      }
    }
  }

  get active(): number {
    return this.items.length
  }

  clear(): void {
    for (const it of this.items) this.pool.release(it.node)
    this.items.length = 0
  }
}
