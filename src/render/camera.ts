import type { CameraShakeConfig, Vec2 } from './types'

// Camera effects (Epic 9, ticket #210). Produces a per-frame world-space offset
// (screen shake) that the stage applies to the render root. Purely cosmetic —
// it never touches gameplay, positions, or hit resolution.

interface ActiveShake {
  elapsed: number
  durationMs: number
  magnitude: number
  frequency: number
  phaseX: number
  phaseY: number
}

export class Camera {
  /** Current world-space offset; the stage adds this to the render root. */
  readonly offset: Vec2 = { x: 0, y: 0 }
  private shakes: ActiveShake[] = []
  private readonly rng: () => number

  /** `rng` is injectable so tests are deterministic. */
  constructor(rng: () => number = Math.random) {
    this.rng = rng
  }

  /** Queue a decaying shake. Multiple shakes sum (bounded by their magnitudes). */
  shake(config: CameraShakeConfig): void {
    this.shakes.push({
      elapsed: 0,
      durationMs: config.durationMs,
      magnitude: config.magnitude,
      frequency: config.frequency ?? 30,
      phaseX: this.rng() * Math.PI * 2,
      phaseY: this.rng() * Math.PI * 2,
    })
  }

  update(dtMs: number): void {
    let x = 0
    let y = 0
    for (let i = this.shakes.length - 1; i >= 0; i--) {
      const s = this.shakes[i]!
      s.elapsed += dtMs
      if (s.elapsed >= s.durationMs) {
        this.shakes.splice(i, 1)
        continue
      }
      const decay = 1 - s.elapsed / s.durationMs
      const w = s.frequency * 2 * Math.PI * (s.elapsed / 1000)
      x += Math.sin(w + s.phaseX) * s.magnitude * decay
      y += Math.cos(w + s.phaseY) * s.magnitude * decay
    }
    this.offset.x = x
    this.offset.y = y
  }

  get shaking(): boolean {
    return this.shakes.length > 0
  }

  clear(): void {
    this.shakes.length = 0
    this.offset.x = 0
    this.offset.y = 0
  }
}
