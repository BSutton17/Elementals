import { Application } from 'pixi.js'
import { LayerManager } from './layers'
import { AnimationFramework } from './framework'
import { makeCircleNode, makeRingNode, makeBeamNode, makeGlowNode } from './nodes'

// Pixi stage (Epic 9, ticket #210). Owns the Pixi Application, mounts a
// transparent canvas BENEATH the existing HTML/CSS UI, and drives the framework
// from the Pixi ticker. It maps the shared 1000×1000 arena space (placement.ts)
// into the host element (contain-fit, centered), and applies the camera offset
// to the render root. Full cleanup lifecycle via destroy().

export interface PixiStageOptions {
  /** Logical world size; the arena is 1000×1000 to match placement.ts. */
  worldSize?: number
  antialias?: boolean
  /** Whether this stage drives the screen-shake DOM transform. Only the primary
   *  (front) stage should — a second stage sharing the arena box would fight it.
   *  Default true. */
  screenShake?: boolean
}

export class PixiStage {
  readonly app = new Application()
  readonly layers = new LayerManager()
  readonly framework: AnimationFramework
  private readonly worldSize: number
  private readonly antialias: boolean
  private readonly screenShake: boolean
  private host: HTMLElement | null = null
  /** Element the screen shake transforms — the arena box holding the SVG
   *  castles AND this canvas, so both shake together as one screen. */
  private shakeTarget: HTMLElement | null = null
  private baseScale = 1
  private baseX = 0
  private baseY = 0
  private mounted = false
  private destroyed = false

  constructor(options: PixiStageOptions = {}) {
    this.worldSize = options.worldSize ?? 1000
    this.antialias = options.antialias ?? true
    this.screenShake = options.screenShake ?? true
    this.framework = new AnimationFramework({
      projectile: () => makeCircleNode(this.layers.get('projectiles')),
      impact: () => makeRingNode(this.layers.get('impacts')),
      particle: () => makeCircleNode(this.layers.get('particles')),
      beam: () => makeBeamNode(this.layers.get('projectiles')),
      beamGlow: () => makeCircleNode(this.layers.get('projectiles')),
      vortex: () => makeCircleNode(this.layers.get('particles')),
      vortexGlow: () => makeGlowNode(this.layers.get('projectiles')),
      wave: () => makeCircleNode(this.layers.get('particles')),
      waveGlow: () => makeGlowNode(this.layers.get('projectiles')),
      aura: () => makeCircleNode(this.layers.get('particles')),
      auraGlow: () => makeGlowNode(this.layers.get('projectiles')),
    })
  }

  /** Mounts the transparent canvas into `host` (which keeps the DOM UI on top). */
  async mount(host: HTMLElement): Promise<void> {
    if (this.mounted || this.destroyed) return
    this.host = host
    // Shake the arena box (parent of this canvas AND the SVG battlefield) so the
    // whole screen moves as one; fall back to the host if there's no parent.
    // A non-primary stage leaves this null so it doesn't fight for the transform.
    this.shakeTarget = this.screenShake ? (host.parentElement ?? host) : null
    await this.app.init({
      backgroundAlpha: 0,
      antialias: this.antialias,
      resizeTo: host,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    })
    // If destroy() was called while `app.init()` was still pending (common under
    // React StrictMode's mount→unmount→mount), tear the freshly-inited app down
    // and bail rather than mounting an orphaned canvas.
    if (this.destroyed) {
      this.app.destroy(true, { children: true })
      return
    }
    host.appendChild(this.app.canvas)
    this.app.stage.addChild(this.layers.root)
    this.resize()
    this.app.ticker.add(this.tick)
    window.addEventListener('resize', this.resize)
    this.mounted = true
  }

  private readonly tick = (): void => {
    this.framework.update(this.app.ticker.deltaMS)
    // Screen shake: translate the whole arena box (SVG + canvas) by the camera
    // offset, rather than only the Pixi root — so castles and effects shake
    // together as a real screen shake. Offset is in world units; scale to px
    // like the world contain-fit. layers.root stays at its base (set in resize).
    const { x, y } = this.framework.camera.offset
    if (this.shakeTarget) {
      this.shakeTarget.style.transform =
        x === 0 && y === 0
          ? ''
          : `translate(${x * this.baseScale}px, ${y * this.baseScale}px)`
    }
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
    // Idempotent and safe to call before `mount()` finishes: if the Pixi
    // Application hasn't been initialized yet, touching its ticker/renderer would
    // throw — a pending `mount()` handles the teardown once `init()` resolves
    // (see the `this.destroyed` guard there).
    if (this.destroyed) return
    this.destroyed = true
    window.removeEventListener('resize', this.resize)
    if (this.shakeTarget) this.shakeTarget.style.transform = ''
    this.shakeTarget = null
    if (this.mounted) {
      this.app.ticker.remove(this.tick)
      this.framework.destroy()
      const canvas = this.app.canvas
      this.app.destroy(true, { children: true })
      if (canvas?.parentNode) canvas.parentNode.removeChild(canvas)
      this.mounted = false
    }
    this.host = null
  }
}
