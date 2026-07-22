import { Container, Graphics } from 'pixi.js'
import type { BoltLayer, BoltNode, DisplayNode } from './types'
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

/**
 * A unit spike (a sharp isosceles triangle) pointing along +x, so a projectile
 * with `faceDirection` rotates its TIP toward the target — Ice's Icicle. Sized
 * around UNIT_RADIUS so it scales by `size / baseRadius` exactly like the circle.
 * Satisfies DisplayNode.
 */
export function makeTriangleNode(parent: Container): DisplayNode {
  const R = UNIT_RADIUS
  const g = new Graphics()
  // Tip forward (+x), a short flared base behind — a slim icicle silhouette.
  g.poly([R * 1.9, 0, -R * 0.7, -R * 0.6, -R * 0.7, R * 0.6]).fill(0xffffff)
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

/**
 * A soft glowing unit disc with ADDITIVE blending, so overlapping glow sprites
 * accumulate into bright cores and haloes (used for the vortex eye and embers).
 * Satisfies DisplayNode. Additive blend is baked in here so the systems stay
 * Pixi-free and just drive tint/alpha/scale.
 */
export function makeGlowNode(parent: Container): DisplayNode {
  const g = new Graphics()
  g.circle(0, 0, UNIT_RADIUS).fill(0xffffff)
  g.blendMode = 'add'
  g.visible = false
  parent.addChild(g)
  return g as unknown as DisplayNode
}

/**
 * A lightning bolt drawer: an ADDITIVE Pixi Graphics that restrokes arbitrary
 * polylines each frame in world coordinates (the layer root's transform scales
 * it like every other node). Additive so overlapping glow + core read as bright
 * electricity. Implements the Pixi-free `BoltNode` contract the LightningSystem
 * drives; tests pass a fake instead.
 */
export function makeBoltNode(parent: Container): BoltNode {
  const g = new Graphics()
  g.blendMode = 'add'
  parent.addChild(g)
  return {
    draw(layers: BoltLayer[]): void {
      g.clear()
      for (const layer of layers) {
        for (const path of layer.paths) {
          if (path.length < 2) continue
          g.moveTo(path[0]!.x, path[0]!.y)
          for (let i = 1; i < path.length; i++) g.lineTo(path[i]!.x, path[i]!.y)
        }
        g.stroke({ width: layer.width, color: layer.color, alpha: layer.alpha, cap: 'round', join: 'round' })
      }
      g.visible = true
    },
    clear(): void {
      g.clear()
      g.visible = false
    },
    destroy(): void {
      g.destroy()
    },
  }
}

/**
 * A unit-length beam segment: a 1×1 rectangle whose left edge sits at the origin
 * and is vertically centered, so the beam system positions it at the source,
 * rotates it toward the target, and scales x → length, y → thickness. Satisfies
 * DisplayNode. NOTE: unlike the circle/ring, its base size is 1 (not
 * UNIT_RADIUS) — the beam system scales in absolute world units directly.
 */
export function makeBeamNode(parent: Container): DisplayNode {
  const g = new Graphics()
  g.rect(0, -0.5, 1, 1).fill(0xffffff)
  g.visible = false
  parent.addChild(g)
  return g as unknown as DisplayNode
}

/**
 * An ADDITIVE unit-length beam segment — same geometry as `makeBeamNode` but
 * blended additively, so stacked beam layers (corona → plasma → inner → core)
 * accumulate into a blinding white-hot centre (Fire's Scorching Sun solar laser).
 * Satisfies DisplayNode; base size 1 like the plain beam.
 */
export function makeGlowBeamNode(parent: Container): DisplayNode {
  const g = new Graphics()
  g.rect(0, -0.5, 1, 1).fill(0xffffff)
  g.blendMode = 'add'
  g.visible = false
  parent.addChild(g)
  return g as unknown as DisplayNode
}
