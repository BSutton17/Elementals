import { Container } from 'pixi.js'

// Layer manager (Epic 9, ticket #210). Owns the ordered render layers under a
// single root container, so effects composite predictably (impacts under
// particles under projectiles) and the whole battlefield can be transformed by
// the camera as one unit.

export type LayerName = 'background' | 'impacts' | 'particles' | 'projectiles' | 'overlay'

/** Back-to-front draw order. */
export const LAYER_ORDER: readonly LayerName[] = [
  'background',
  'impacts',
  'particles',
  'projectiles',
  'overlay',
]

export class LayerManager {
  /** The transformable root the stage places into the Pixi scene. */
  readonly root = new Container()
  private readonly layers = new Map<LayerName, Container>()

  constructor(order: readonly LayerName[] = LAYER_ORDER) {
    for (const name of order) {
      const container = new Container()
      container.label = name
      this.layers.set(name, container)
      this.root.addChild(container)
    }
  }

  get(name: LayerName): Container {
    const container = this.layers.get(name)
    if (!container) throw new Error(`Unknown render layer: ${name}`)
    return container
  }

  destroy(): void {
    this.root.destroy({ children: true })
    this.layers.clear()
  }
}
