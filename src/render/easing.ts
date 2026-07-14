import type { EasingName } from './types'

export type EasingFn = (t: number) => number

export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t)

/** Named easing curves. All map [0,1] → roughly [0,1] (back overshoots). */
export const EASINGS: Record<EasingName, EasingFn> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeOutBack: (t) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
}

/** Applies a named easing to a clamped progress value. */
export function ease(name: EasingName | undefined, t: number): number {
  return (EASINGS[name ?? 'linear'] ?? EASINGS.linear)(clamp01(t))
}
