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

/**
 * A unit HEART (Love's Tough Love). Drawn white and tinted per-effect; sized
 * around UNIT_RADIUS so it scales like the circle. Not direction-facing — a
 * heart reads upright regardless of travel. Satisfies DisplayNode.
 */
export function makeHeartNode(parent: Container): DisplayNode {
  const R = UNIT_RADIUS
  const g = new Graphics()
  // Two top lobes + a bottom point, in local units (y-down). Cusp at top-center.
  g.moveTo(0, -R * 0.35)
  g.bezierCurveTo(R * 0.55, -R * 1.05, R * 1.35, -R * 0.15, 0, R * 0.95)
  g.bezierCurveTo(-R * 1.35, -R * 0.15, -R * 0.55, -R * 1.05, 0, -R * 0.35)
  g.fill(0xffffff)
  g.visible = false
  parent.addChild(g)
  return g as unknown as DisplayNode
}

/**
 * A unit ARROW (Love's Cupid's Arrow): a slim shaft with a pointed head at the
 * tip and fletching at the tail, all pointing along +x so a `faceDirection`
 * projectile aims its head toward the target. White + tinted; scales like the
 * circle. Satisfies DisplayNode.
 */
export function makeArrowNode(parent: Container): DisplayNode {
  const R = UNIT_RADIUS
  const g = new Graphics()
  // Shaft.
  g.rect(-R * 1.4, -R * 0.12, R * 2.6, R * 0.24).fill(0xffffff)
  // Arrowhead (triangle at the tip, +x).
  g.poly([R * 1.9, 0, R * 1.0, -R * 0.5, R * 1.0, R * 0.5]).fill(0xffffff)
  // Fletching (two angled flights at the tail).
  g.poly([-R * 1.4, 0, -R * 1.9, -R * 0.5, -R * 1.1, 0]).fill(0xffffff)
  g.poly([-R * 1.4, 0, -R * 1.9, R * 0.5, -R * 1.1, 0]).fill(0xffffff)
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
 * A tilted, spinning planetary ring (Space's Saturn's Rings projectile). An
 * ADDITIVE ellipse band — squashed on y so it reads as a ring seen at an angle —
 * with a brighter inner line and a small bright "shepherd" node off to one side
 * so its ROTATION is visible as it spins (a plain symmetric ring would look
 * static). Drawn white and tinted per-effect; scaled uniformly by the projectile
 * system (the y-squash is baked into the geometry). Satisfies DisplayNode.
 */
export function makeSaturnRingNode(parent: Container): DisplayNode {
  const R = UNIT_RADIUS
  const g = new Graphics()
  // Outer translucent dust band.
  g.ellipse(0, 0, R * 1.15, R * 0.5).stroke({ width: R * 0.42, color: 0xffffff, alpha: 0.28, alignment: 0.5 })
  // Bright inner ring line.
  g.ellipse(0, 0, R * 1.0, R * 0.42).stroke({ width: R * 0.14, color: 0xffffff, alpha: 0.9, alignment: 0.5 })
  // A bright shepherd fleck on the ring's edge — makes the spin read.
  g.circle(R * 1.0, 0, R * 0.16).fill({ color: 0xffffff, alpha: 0.95 })
  g.blendMode = 'add'
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
