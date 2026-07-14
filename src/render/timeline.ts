import type { EasingName } from './types'
import { ease } from './easing'

// Animation timeline (Epic 9, ticket #210). A tiny, allocation-light scheduler
// that advances many concurrent animations from one delta-time update, driven
// by the Pixi ticker. Systems can also run their own per-item motion; this is
// the shared primitive for arbitrary tweened values (fades, scales, sequences).

/** Anything the timeline can advance. Returns true once finished. */
export interface Animation {
  update(dtMs: number): boolean
}

export interface TweenOptions {
  durationMs: number
  easing?: EasingName
  /** Called every update with eased progress in [0,1]. */
  onUpdate: (eased: number, rawProgress: number) => void
  onComplete?: () => void
}

/** Interpolates progress 0→1 over a duration with an easing curve. */
export class Tween implements Animation {
  private elapsed = 0
  private done = false
  private readonly options: TweenOptions

  constructor(options: TweenOptions) {
    this.options = options
  }

  update(dtMs: number): boolean {
    if (this.done) return true
    this.elapsed += dtMs
    const raw = this.options.durationMs <= 0 ? 1 : Math.min(1, this.elapsed / this.options.durationMs)
    this.options.onUpdate(ease(this.options.easing, raw), raw)
    if (raw >= 1) {
      this.done = true
      this.options.onComplete?.()
    }
    return this.done
  }
}

/** Runs a set of animations, dropping each as it finishes. */
export class AnimationTimeline {
  private animations: Animation[] = []

  add<A extends Animation>(animation: A): A {
    this.animations.push(animation)
    return animation
  }

  /** Convenience: schedule a tween. */
  tween(options: TweenOptions): Tween {
    return this.add(new Tween(options))
  }

  update(dtMs: number): void {
    // Iterate backwards so finished animations can be removed in place.
    for (let i = this.animations.length - 1; i >= 0; i--) {
      if (this.animations[i]!.update(dtMs)) this.animations.splice(i, 1)
    }
  }

  clear(): void {
    this.animations.length = 0
  }

  get active(): number {
    return this.animations.length
  }
}
