import { describe, it, expect } from 'vitest'
import {
  BLACKJACK_TOTAL_MS,
  REVEAL_COMPLETE_AT,
  STAGE_MS,
  STAGE_ORDER,
  STAGE_START,
  expoIn,
  flipDegreesFor,
  halfTurnsFor,
  isFaceUp,
  presentationFor,
  smoothstep,
  stageAt,
  stageProgress,
} from './blackjackStages'
import { rarityOf } from './PlayingCard'
import { faceFor, LUCKY_FACES, LUCKY_CARD_COUNT } from './luckyFaces'

// The cinematic's timing is a CONTRACT with the server: Blackjack's damage is
// held for exactly this long so the card is always seen landing before the
// victim is hurt. If these drift, the victim takes damage from a card still
// floating at centre screen.

describe('blackjack stage timing', () => {
  it('runs its stages back to back with no gaps', () => {
    let expected = 0
    for (const stage of STAGE_ORDER) {
      expect(STAGE_START[stage]).toBe(expected)
      expected += STAGE_MS[stage]
    }
    expect(BLACKJACK_TOTAL_MS).toBe(expected)
  })

  it('reaches the victim exactly when the server releases the damage', () => {
    // The server holds Blackjack's hit for BLACKJACK_IMPACT_DELAY (4.75s × 20
    // ticks). The card must ARRIVE on that same frame — the start of the impact
    // stage — so the victim is never hurt by a card still floating at centre.
    const SERVER_HOLD_MS = 4.75 * 1000
    expect(STAGE_START.impact).toBe(SERVER_HOLD_MS)
    // The burst plays out after the hit has landed.
    expect(BLACKJACK_TOTAL_MS).toBeGreaterThan(SERVER_HOLD_MS)
  })

  it('shows the card face-up, centred, for a full 3 seconds', () => {
    expect(STAGE_MS.showcase).toBe(3000)
  })

  it('lands the impact at the very end, after the throw', () => {
    expect(STAGE_ORDER[STAGE_ORDER.length - 1]).toBe('impact')
    expect(STAGE_START.approach).toBeGreaterThan(STAGE_START.summon)
    expect(STAGE_START.throw).toBeGreaterThan(STAGE_START.showcase)
  })

  it('reports the right stage across the whole timeline', () => {
    expect(stageAt(0)).toBe('summon')
    expect(stageAt(STAGE_START.approach + 10)).toBe('approach')
    expect(stageAt(STAGE_START.showcase + 10)).toBe('showcase')
    expect(stageAt(STAGE_START.throw + 10)).toBe('throw')
    expect(stageAt(STAGE_START.impact + 10)).toBe('impact')
    expect(stageAt(BLACKJACK_TOTAL_MS)).toBe('done')
  })

  it('reports 0→1 progress within a stage', () => {
    expect(stageProgress(STAGE_START.showcase, 'showcase')).toBe(0)
    expect(stageProgress(STAGE_START.showcase + 1500, 'showcase')).toBeCloseTo(0.5, 5)
    expect(stageProgress(STAGE_START.showcase + 3000, 'showcase')).toBe(1)
  })
})

describe('the fly-in accelerates instead of sliding', () => {
  it('covers ground exponentially, not linearly', () => {
    expect(expoIn(0)).toBe(0)
    expect(expoIn(1)).toBeCloseTo(1, 5)
    // Halfway through the stage it has barely started moving — a linear ease
    // would be at 0.5 here. The speed is all in the last stretch.
    expect(expoIn(0.5)).toBeLessThan(0.05)
    // Each successive slice of time covers more ground than the one before it.
    // Measured from 0.1: the curve is clamped to exactly 0 at p=0, so the first
    // two steps tie — an artifact of the clamp, not of the acceleration.
    let previous = expoIn(0.1)
    let lastStep = 0
    for (let p = 0.2; p <= 1.0001; p += 0.1) {
      const step = expoIn(p) - previous
      expect(step).toBeGreaterThan(lastStep)
      lastStep = step
      previous = expoIn(p)
    }
  })

  it('finishes the turn-over before the card arrives', () => {
    // The reveal has to COMPLETE during the approach — the card reaches the
    // camera already face-up, rather than landing and then flipping.
    expect(REVEAL_COMPLETE_AT).toBeLessThan(1)
    expect(smoothstep(1)).toBe(1)
    // Fully turned by REVEAL_COMPLETE_AT, with the rest of the rush face-up.
    const turn = (p: number) => smoothstep(Math.min(1, p / REVEAL_COMPLETE_AT))
    expect(turn(REVEAL_COMPLETE_AT)).toBe(1)
    expect(turn(1)).toBe(1)
    // …and it is still hidden at the start, so there is something to reveal.
    expect(turn(0)).toBe(0)
    expect(turn(0.1)).toBeLessThan(0.5)
  })
})

describe('rarity scales the presentation', () => {
  it('sorts cards into number / face / joker', () => {
    expect(rarityOf('2')).toBe('number')
    expect(rarityOf('10')).toBe('number')
    expect(rarityOf('Jack')).toBe('face')
    expect(rarityOf('Queen')).toBe('face')
    expect(rarityOf('King')).toBe('face')
    expect(rarityOf('Ace')).toBe('face')
    expect(rarityOf('Joker')).toBe('joker')
  })

  it('gets louder the better the card', () => {
    const number = presentationFor('7')
    const face = presentationFor('Queen')
    const joker = presentationFor('Joker')

    expect(face.particles).toBeGreaterThan(number.particles)
    expect(joker.particles).toBeGreaterThan(face.particles)
    expect(face.bloomRem).toBeGreaterThan(number.bloomRem)
    expect(joker.bloomRem).toBeGreaterThan(face.bloomRem)
    // Anticipation: better cards spin longer before showing themselves.
    expect(joker.extraFlips).toBeGreaterThan(face.extraFlips)
    expect(face.extraFlips).toBeGreaterThan(number.extraFlips)
    // Only a joker brings the chaos.
    expect(number.chaos).toBe(false)
    expect(face.chaos).toBe(false)
    expect(joker.chaos).toBe(true)
  })

  it('always lands face-up: every flip is an odd number of half-turns', () => {
    // The front face is mounted at 180deg, so an EVEN number of half-turns
    // finishes with the card's back to the camera and the reveal shows nothing
    // but a card back. This is exactly what went wrong for face cards.
    for (const card of ['2', 'Queen', 'Ace', 'King', 'Jack', 'Joker']) {
      const { extraFlips } = presentationFor(card)
      expect(halfTurnsFor(extraFlips) % 2).toBe(1)
      // …and the same angle the component actually renders must read face-up.
      expect(isFaceUp(flipDegreesFor(extraFlips))).toBe(true)
    }
  })

  it('knows which side of the card is showing at any angle', () => {
    expect(isFaceUp(0)).toBe(false) // face down, as summoned
    expect(isFaceUp(180)).toBe(true)
    expect(isFaceUp(360)).toBe(false) // a full turn is back to the start
    expect(isFaceUp(540)).toBe(true)
    expect(isFaceUp(900)).toBe(true)
  })
})

describe('lucky draw faces', () => {
  it('has a face for each of the five server outcomes', () => {
    expect(Object.keys(LUCKY_FACES)).toHaveLength(LUCKY_CARD_COUNT)
    for (const id of ['luckyAttack', 'luckyArmor', 'luckyGold', 'shield', 'heal']) {
      expect(LUCKY_FACES[id]).toBeDefined()
      expect(LUCKY_FACES[id]!.name).toBeTruthy()
      expect(LUCKY_FACES[id]!.description).toBeTruthy()
    }
  })

  it('each face carries its own particle theme', () => {
    const themes = Object.values(LUCKY_FACES).map((f) => f.theme)
    expect(new Set(themes).size).toBe(LUCKY_CARD_COUNT)
  })

  it('falls back to a neutral card for an unknown outcome', () => {
    expect(faceFor('somethingElse').name).toBe('Wild')
    expect(faceFor(null).name).toBe('Wild')
  })
})
