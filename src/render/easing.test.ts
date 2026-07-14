import { test, expect } from 'vitest'
import { ease, clamp01, EASINGS, type EasingFn } from './easing'

test('linear is identity and progress is clamped to [0,1]', () => {
  expect(ease('linear', 0.5)).toBe(0.5)
  expect(ease('linear', -1)).toBe(0)
  expect(ease('linear', 2)).toBe(1)
  expect(clamp01(5)).toBe(1)
  expect(clamp01(-5)).toBe(0)
})

test('every curve passes through 0 and 1 at the endpoints', () => {
  for (const name of Object.keys(EASINGS) as (keyof typeof EASINGS)[]) {
    const fn: EasingFn = EASINGS[name]
    expect(fn(0)).toBeCloseTo(0)
    expect(fn(1)).toBeCloseTo(1)
  }
})

test('easeOut leads linear past the midpoint', () => {
  expect(ease('easeOut', 0.5)).toBeGreaterThan(0.5)
})

test('unknown easing falls back to linear', () => {
  expect(ease(undefined, 0.3)).toBeCloseTo(0.3)
})
