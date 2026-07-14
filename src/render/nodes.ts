import { Container, Graphics } from 'pixi.js'
import type { DisplayNode } from './types'
import { UNIT_RADIUS } from './nodeUtil'

// Pixi node factories (Epic 9, ticket #210). The systems drive appearance
// entirely through tint + scale on a plain unit sprite, so these primitives are
// element-agnostic — one white circle/ring reused (and pooled) for every
// kingdom, coloured per-effect at spawn. Real textures can replace these later
// without touching the systems.

/** A solid unit disc, added hidden to `parent`. Satisfies DisplayNode. */
export function makeCircleNode(parent: Container): DisplayNode {
  const g = new Graphics()
  g.circle(0, 0, UNIT_RADIUS).fill(0xffffff)
  g.visible = false
  parent.addChild(g)
  return g as unknown as DisplayNode
}

/** A unit ring (hollow), used for impact shockwaves. Satisfies DisplayNode. */
export function makeRingNode(parent: Container): DisplayNode {
  const g = new Graphics()
  g.circle(0, 0, UNIT_RADIUS).stroke({ width: 3, color: 0xffffff, alignment: 0.5 })
  g.visible = false
  parent.addChild(g)
  return g as unknown as DisplayNode
}
