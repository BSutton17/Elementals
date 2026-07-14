import type { DisplayNode } from './types'

// Shared, Pixi-free node helpers. The production unit sprites are drawn at
// UNIT_RADIUS (see nodes.ts); systems scale by size/UNIT_RADIUS so a config
// `size` is an absolute world-space radius regardless of the base geometry.

export const UNIT_RADIUS = 16

/** Returns a node to a neutral, hidden state for pooled reuse. */
export function resetDisplayNode(node: DisplayNode): void {
  node.visible = false
  node.alpha = 1
  node.rotation = 0
  node.tint = 0xffffff
  node.x = 0
  node.y = 0
  node.scale.set(1)
}
