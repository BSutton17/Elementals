import { describe, it, expect } from 'vitest'
import { ABILITY_EFFECTS } from './effects'

// The basic attacks of the three newest kingdoms, plus the pictorial-bolt size
// bump. These pin the SHAPE/scale decisions, which are easy to knock loose when
// the shared `basicBolt` is retuned.

describe('the new kingdoms’ basic attacks', () => {
  it('Light Beam is an actual beam, not a travelling bolt', () => {
    const fx = ABILITY_EFFECTS.lightBeam!
    expect(fx.beam).toBeDefined()
    expect(fx.projectile).toBeUndefined() // nothing flies; the lance just fires
    // Distinct hues so the lance reads with depth, like Scorching Sun's.
    expect(fx.beam!.coreColor).not.toBe(fx.beam!.coronaColor)
    // A basic attack, so a fraction of the ultimate's scale.
    expect(fx.beam!.chargeMs).toBeLessThan(ABILITY_EFFECTS.scorchingSun!.beam!.chargeMs)
    expect(fx.beam!.width).toBeLessThan(ABILITY_EFFECTS.scorchingSun!.beam!.width)
  })

  it('Ace of Spades flies as a spade pip', () => {
    const fx = ABILITY_EFFECTS.aceOfSpades!
    expect(fx.projectile?.shape).toBe('spade')
    expect(fx.projectile?.faceDirection).toBe(true) // so the tip leads
  })

  it('Shadow Strike is white-tinted so its baked pale rim survives', () => {
    const fx = ABILITY_EFFECTS.shadowStrike!
    expect(fx.projectile?.shape).toBeUndefined() // a plain bolt, as asked
    // The shadow node bakes its own dark fill + white rim; a coloured tint
    // would darken the rim and the bolt would vanish on the dark field.
    expect(fx.projectile?.color).toBe(0xffffff)
  })
})

describe('pictorial bolts are sized up', () => {
  const ROUND_BOLT_SIZE = ABILITY_EFFECTS.fireball!.projectile!.size

  it.each([
    ['icicle', 'triangle'],
    ['toughLove', 'heart'],
    ['aceOfSpades', 'spade'],
  ])('%s is 1.5x a round bolt', (id, shape) => {
    const projectile = ABILITY_EFFECTS[id]!.projectile!
    expect(projectile.shape).toBe(shape)
    expect(projectile.size).toBeCloseTo(ROUND_BOLT_SIZE * 1.5, 5)
  })

  it('leaves the plain round bolts alone', () => {
    for (const id of ['fireball', 'waterBall', 'rockThrow', 'shadowStrike']) {
      expect(ABILITY_EFFECTS[id]!.projectile!.size).toBe(ROUND_BOLT_SIZE)
    }
  })
})
