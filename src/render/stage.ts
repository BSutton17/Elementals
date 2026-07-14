import { Application } from 'pixi.js'
import { LayerManager } from './layers'
import { AnimationFramework } from './framework'
import { makeCircleNode, makeRingNode } from './nodes'

// Pixi stage (Epic 9, ticket #210). Owns the Pixi Application, mounts a
// transparent canvas BENEATH the existing HTML/CSS UI, and drives the framework
// from the Pixi ticker. It maps the shared 1000×1000 arena space (placement.ts)
// into the host element (contain-fit, centered), and applies the camera offset
// to the render root. Full cleanup lifecycle via destroy().

export interface PixiStageOptions {
  /** Logical world size; the arena is 1000×1000 to match placement.ts. */
  worldSize?: number
  antialias?: boolean
}

export class PixiStage {
  readonly app = new Application()
  readonly layers = new LayerManager()
  readonly framework: AnimationFramework
  private readonly worldSize: number
  private readonly antialias: boolean
  private host: HTMLElement | null = null
  private baseScale = 1
  private baseX = 0
  private baseY = 0
  private mounted = false

  constructor(options: PixiStageOptions = {}) {
    this.worldSize = options.worldSize ?? 1000
    this.antialias = options.antialias ?? true
    this.framework = new AnimationFramework({
      projectile: () => makeCircleNode(this.layers.get('projectiles')),
      impact: () => makeRingNode(this.layers.get('impacts')),
      particle: () => makeCircleNode(this.layers.get('particles')),
    })
  }

  /** Mounts the transparent canvas into `host` (which keeps the DOM UI on top). */
  async mount(host: HTMLElement): Promise<void> {
    if (this.mounted) return
    this.host = host
    await this.app.init({
      backgroundAlpha: 0,
      antialias: this.antialias,
      resizeTo: host,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    })
    host.appendChild(this.app.canvas)
    this.app.stage.addChild(this.layers.root)
    this.resize()
    this.app.ticker.add(this.tick)
    window.addEventListener('resize', this.resize)
    this.mounted = true
  }

  private readonly tick = (): void => {
    this.framework.update(this.app.ticker.deltaMS)
    const { x, y } = this.framework.camera.offset
    this.layers.root.position.set(
      this.baseX + x * this.baseScale,
      this.baseY + y * this.baseScale,
    )
  }

  /** Contain-fits the 1000×1000 world into the host, centered. */
  private readonly resize = (): void => {
    if (!this.host) return
    const w = this.host.clientWidth
    const h = this.host.clientHeight
    this.baseScale = Math.min(w, h) / this.worldSize
    this.baseX = (w - this.worldSize * this.baseScale) / 2
    this.baseY = (h - this.worldSize * this.baseScale) / 2
    this.layers.root.scale.set(this.baseScale)
    this.layers.root.position.set(this.baseX, this.baseY)
  }

  destroy(): void {
    window.removeEventListener('resize', this.resize)
    this.app.ticker.remove(this.tick)
    this.framework.destroy()
    const canvas = this.app.canvas
    this.app.destroy(true, { children: true })
    if (canvas?.parentNode) canvas.parentNode.removeChild(canvas)
    this.mounted = false
    this.host = null
  }
}
