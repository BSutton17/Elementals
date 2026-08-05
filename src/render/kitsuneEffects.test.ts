import { describe, it, expect } from 'vitest'
import { ABILITY_EFFECTS } from './effects'
import { applySpiral, lerpPoint } from './trajectory'
import type { SpiralConfig } from './types'

// Kitsune's two attacks. Fox Swipe is the standard bolt with a spreading ring
// of blue fire; Fox Fire corkscrews to the target and blows out bigger. These
// pin the parts that are easy to knock loose: the spiral must not move where
// the projectile starts or lands, and Fox Fire must stay the larger of the two.

const FROM = { x: 100, y: 500 }
const TO = { x: 900, y: 500 }
const SPIRAL: SpiralConfig = { turns: 3, radius: 80, envelope: 'taper' }

/** Where a spiralling projectile actually sits at `t` (linear travel). */
function pointAt(t: number, spiral: SpiralConfig = SPIRAL) {
  const pos = lerpPoint(FROM, TO, t)
  applySpiral(pos, FROM, TO, t, spiral)
  return pos
}

describe('spiral travel', () => {
  it('departs from the caster and lands on the target exactly', () => {
    // A curved path is presentation only — it must never change the endpoints,
    // or the bolt would visibly miss the castle it is about to damage.
    expect(pointAt(0)).toEqual(FROM)
    const end = pointAt(1)
    expect(end.x).toBeCloseTo(TO.x, 6)
    expect(end.y).toBeCloseTo(TO.y, 6)
  })

  it('swings off the straight line mid-flight', () => {
    const t = 0.25 // a quarter turn in: peak of the first coil
    const straight = lerpPoint(FROM, TO, t)
    const curved = pointAt(t)
    expect(curved.x).toBeCloseTo(straight.x, 6) // travel axis is untouched
    expect(Math.abs(curved.y - straight.y)).toBeGreaterThan(20)
  })

  it('crosses back over the line once per half turn', () => {
    // 3 turns => the offset changes sign 6 times. Sampling the sign at the
    // midpoint of each half-turn is enough to prove it actually coils rather
    // than bulging out to one side.
    const signs = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5].map((half) => {
      const t = (half / 2) / SPIRAL.turns
      return Math.sign(pointAt(t).y - lerpPoint(FROM, TO, t).y)
    })
    expect(signs).toEqual([1, -1, 1, -1, 1, -1])
  })

  it('tapers: the coil is widest early and tightest on approach', () => {
    const early = Math.abs(pointAt(1 / (SPIRAL.turns * 4)).y - FROM.y)
    // Last peak of the final coil.
    const late = Math.abs(pointAt(1 - 1 / (SPIRAL.turns * 4)).y - FROM.y)
    expect(early).toBeGreaterThan(late)
  })

  it('holds its width the whole way when the envelope is "even"', () => {
    const even: SpiralConfig = { ...SPIRAL, envelope: 'even' }
    const first = Math.abs(pointAt(1 / (SPIRAL.turns * 4), even).y - FROM.y)
    const last = Math.abs(pointAt(1 - 1 / (SPIRAL.turns * 4), even).y - FROM.y)
    expect(first).toBeCloseTo(last, 6)
    expect(first).toBeCloseTo(SPIRAL.radius, 6)
  })

  it('leaves a zero-length flight alone instead of dividing by zero', () => {
    const pos = { x: 300, y: 300 }
    applySpiral(pos, { x: 300, y: 300 }, { x: 300, y: 300 }, 0.5, SPIRAL)
    expect(pos).toEqual({ x: 300, y: 300 })
  })
})

describe('Fox Swipe', () => {
  const fx = ABILITY_EFFECTS.foxSwipe!

  it('is the standard bolt — it flies straight', () => {
    expect(fx.projectile).toBeDefined()
    expect(fx.projectile!.spiral).toBeUndefined()
  })

  it('bursts into a ring of fire that spreads outward', () => {
    const rings = fx.impactRings!
    expect(rings.count).toBeGreaterThanOrEqual(3)
    expect(rings.sizeStep).toBeGreaterThan(0) // each ring wider than the last
    expect(rings.staggerMs).toBeGreaterThan(0) // …and later, so it spreads
    // Rings have to visibly grow, so they start well under full size.
    expect(rings.startScale!).toBeLessThan(0.5)
  })
})

describe('Fox Fire', () => {
  const fx = ABILITY_EFFECTS.foxFire!
  const swipe = ABILITY_EFFECTS.foxSwipe!

  it('spirals to the target', () => {
    expect(fx.projectile!.spiral).toBeDefined()
    expect(fx.projectile!.spiral!.turns).toBeGreaterThanOrEqual(2)
    expect(fx.projectile!.spiral!.radius).toBeGreaterThan(0)
    // It has to take longer than a basic or the coil is a blur.
    expect(fx.projectile!.durationMs).toBeGreaterThan(swipe.projectile!.durationMs)
  })

  it('detonates as FIRE, not as rings', () => {
    // Rings are legible but they are unmistakably circles. This is the ability
    // that sets its victim alight, so its blast is tongues of flame.
    expect(fx.flameBurst).toBeDefined()
    expect(fx.impactRings).toBeUndefined()
    expect(fx.flameBurst!.tongues).toBeGreaterThan(8)
    // Two hues, so the fire has depth instead of being one flat colour.
    expect(fx.flameBurst!.coreColor).not.toBe(fx.flameBurst!.color)
  })

  it('explodes larger than Fox Swipe', () => {
    // Its flames reach past the widest ring Fox Swipe ever throws.
    const widestSwipeRing =
      (swipe.impactRings!.size + (swipe.impactRings!.count - 1) * swipe.impactRings!.sizeStep) / 2
    expect(fx.flameBurst!.reach + fx.flameBurst!.tongueSize).toBeGreaterThan(widestSwipeRing)
    expect(fx.particles!.count).toBeGreaterThan(swipe.particles!.count)
    expect(fx.shake!.magnitude).toBeGreaterThan(swipe.shake!.magnitude)
  })

  it('leaves the ground burning for seconds afterwards', () => {
    const burst = fx.flameBurst!
    expect(burst.pockets!).toBeGreaterThan(4)
    // "A few seconds" — long enough to still be alight well after the blast.
    expect(burst.pocketMs!).toBeGreaterThan(2000)
    expect(burst.pocketMs!).toBeGreaterThan(burst.durationMs)
    // Scattered wider than the blast itself, so they sit AROUND the kingdom
    // rather than piling on the impact point.
    expect(burst.pocketRadius!).toBeGreaterThan(burst.reach)
  })

  it('burns blue, like the rest of the kit', () => {
    // Both attacks pull from the same foxfire palette; if one drifts to a
    // different hue family the kingdom stops reading as one kingdom.
    expect(fx.flameBurst!.color).toBe(swipe.impactRings!.color)
  })
})
