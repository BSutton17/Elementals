import { test, expect } from 'vitest'
import { Tween, AnimationTimeline } from './timeline'

test('tween interpolates over its duration and completes exactly once', () => {
  const values: number[] = []
  let completions = 0
  const tween = new Tween({
    durationMs: 100,
    onUpdate: (t) => values.push(t),
    onComplete: () => completions++,
  })
  expect(tween.update(50)).toBe(false)
  expect(values[values.length - 1]).toBeCloseTo(0.5)
  expect(tween.update(50)).toBe(true)
  expect(values[values.length - 1]).toBe(1)
  expect(completions).toBe(1)
  // Further updates are inert.
  expect(tween.update(50)).toBe(true)
  expect(completions).toBe(1)
})

test('timeline advances and drops finished animations', () => {
  const tl = new AnimationTimeline()
  tl.tween({ durationMs: 100, onUpdate: () => {} })
  tl.tween({ durationMs: 300, onUpdate: () => {} })
  expect(tl.active).toBe(2)
  tl.update(100)
  expect(tl.active).toBe(1)
  tl.update(200)
  expect(tl.active).toBe(0)
})
