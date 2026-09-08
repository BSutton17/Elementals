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

// ---- battery saver ----------------------------------------------------------
// ⚠️ THE SETTING USED NOT TO REACH THIS FUNCTION AT ALL. Battery saver dropped
// filters and glass out of the CSS while the canvas underneath kept rasterising
// at 2x device pixels, sixty times a second, on two mounted stages — so a phone
// with the switch ON still cooked. These pin the wiring.

test('battery saver overrules the hardware and drops to 1x', () => {
  const q = chooseQuality({
    devicePixelRatio: 3,
    hardwareConcurrency: 8,
    batterySaver: true,
  })
  expect(q.resolution, 'battery saver did not reach the renderer').toBe(1)
  expect(q.reduced).toBe(true)
})

test('...and caps the frame rate, which nothing else does', () => {
  const saver = chooseQuality({ devicePixelRatio: 3, hardwareConcurrency: 8, batterySaver: true })
  expect(saver.maxFps).toBe(30)

  // ⚠️ A CONSTRAINED DEVICE IS NOT REASON ENOUGH ON ITS OWN. Dropping frames for
  // somebody who never asked for it is the "quietly degrades the game for
  // everyone who never opens the menu" decision the settings module refuses to
  // make.
  const budget = chooseQuality({ devicePixelRatio: 3, hardwareConcurrency: 2 })
  expect(budget.maxFps, 'a weak device had its frames capped uninvited').toBe(0)
})

test('battery saver turns multisampling off rather than on at 1x', () => {
  // The ordinary 1x rule turns antialias ON, because at 1x it is the only thing
  // softening an edge. Under battery saver that trade is the wrong way round:
  // multisampling is disproportionately costly on the tile-based GPUs phones
  // use, and a slightly harder edge is a look, not lost information.
  const plain = chooseQuality({ devicePixelRatio: 1, hardwareConcurrency: 8 })
  expect(plain.antialias).toBe(true)

  const saver = chooseQuality({ devicePixelRatio: 1, hardwareConcurrency: 8, batterySaver: true })
  expect(saver.antialias).toBe(false)
})

test('everyone else is left exactly as they were', () => {
  const off = chooseQuality({ devicePixelRatio: 3, hardwareConcurrency: 8, batterySaver: false })
  expect(off.resolution).toBe(2)
  expect(off.maxFps).toBe(0)
})
