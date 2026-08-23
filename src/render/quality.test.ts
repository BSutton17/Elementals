import { test, expect } from 'vitest'
import { chooseQuality } from './quality'

// The policy, not the plumbing. What matters is that a phone stops rasterising
// nine times the pixels it needs, and that nothing about the EFFECTS changes.

test('a modern phone is capped well below its reported pixel ratio', () => {
  // DPR 3 with a healthy core count: capped to 2, which is 4x the logical
  // pixels instead of 9x — a 55% cut in fill rate per canvas, and there are two
  // canvases mounted.
  const q = chooseQuality({ devicePixelRatio: 3, hardwareConcurrency: 8 })
  expect(q.resolution).toBe(2)
  expect(q.reduced).toBe(true)
})

test('a budget phone is capped harder still', () => {
  const q = chooseQuality({ devicePixelRatio: 3, hardwareConcurrency: 4 })
  expect(q.resolution).toBe(1.5)
  expect(q.reduced).toBe(true)
})

test('a low-DPR screen is left exactly alone', () => {
  // ⚠️ The cap is a CEILING, never a target. A 1x display must not be scaled
  // up — that would cost fill rate to gain nothing.
  const q = chooseQuality({ devicePixelRatio: 1, hardwareConcurrency: 8 })
  expect(q.resolution).toBe(1)
  expect(q.reduced).toBe(false)
  expect(q.antialias).toBe(true)
})

test('antialias is dropped only where supersampling already replaces it', () => {
  // At 1x nothing else is smoothing the edge, so it stays on. Above 1x the
  // extra samples do that job and multisampling would pay for it twice —
  // disproportionately so on the tile-based GPUs phones use.
  expect(chooseQuality({ devicePixelRatio: 1, hardwareConcurrency: 8 }).antialias).toBe(true)
  expect(chooseQuality({ devicePixelRatio: 2, hardwareConcurrency: 8 }).antialias).toBe(false)
  expect(chooseQuality({ devicePixelRatio: 3, hardwareConcurrency: 2 }).antialias).toBe(false)
})

test('an absent hardware hint is not treated as a weak device', () => {
  // Safari reports no deviceMemory, which is most of the mobile audience this
  // is for. Missing evidence must not be read as evidence of a slow phone.
  const q = chooseQuality({ devicePixelRatio: 3 })
  expect(q.resolution).toBe(2)
})

test('a nonsense pixel ratio falls back to 1x rather than 0', () => {
  // A zero or NaN resolution produces a canvas with no pixels; the effects
  // would vanish entirely, which is far worse than being slow.
  expect(chooseQuality({ devicePixelRatio: 0 }).resolution).toBe(1)
  expect(chooseQuality({ devicePixelRatio: Number.NaN }).resolution).toBe(1)
})
