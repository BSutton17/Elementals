import { describe, it, expect } from 'vitest'
import {
  PERKS,
  PERKS_PER_PLAYER,
  perkDescription,
  shieldBonusFor,
  perksAllowedFor,
  hasFullPerkSelection,
  togglePerk,
} from './perks'

// Kitsune's "Three tailed fox" takes one more perk than everyone else, so the
// allowance is a function of the kingdom rather than a constant. The server is
// the authority; these pin that the UI agrees with it.
describe('per-kingdom perk allowance', () => {
  it('gives Kitsune one more than the field', () => {
    expect(perksAllowedFor('kitsune')).toBe(PERKS_PER_PLAYER + 1)
    expect(perksAllowedFor('water')).toBe(PERKS_PER_PLAYER)
    expect(perksAllowedFor(null)).toBe(PERKS_PER_PLAYER)
    expect(perksAllowedFor(undefined)).toBe(PERKS_PER_PLAYER)
  })

  it('only counts a selection complete at that kingdom’s allowance', () => {
    const two = ['sharperSwords', 'extraGuards']
    const three = [...two, 'deepPockets']
    expect(hasFullPerkSelection(two, 'water')).toBe(true)
    expect(hasFullPerkSelection(two, 'kitsune')).toBe(false)
    expect(hasFullPerkSelection(three, 'kitsune')).toBe(true)
  })

  it('lets Kitsune add a third perk, and stops everyone else at two', () => {
    const two = ['sharperSwords', 'extraGuards']
    expect(togglePerk(two, 'deepPockets', 'kitsune')).toHaveLength(3)
    expect(togglePerk(two, 'deepPockets', 'water')).toHaveLength(2)
  })

  it('still lets anyone deselect a perk they already hold', () => {
    const three = ['sharperSwords', 'extraGuards', 'deepPockets']
    expect(togglePerk(three, 'extraGuards', 'kitsune')).toEqual([
      'sharperSwords',
      'deepPockets',
    ])
  })
})

describe('Better Construction reads its real value for the table', () => {
  // The server scales the shield bonus by seats; a fixed "+500" was right only
  // in a duel, and the perk is chosen in a lobby that can hold seven.
  it('is 500 in a duel and 625 at a full table', () => {
    expect(shieldBonusFor(2)).toBe(500)
    expect(shieldBonusFor(7)).toBe(625)
  })

  it('never goes below the duel value, whatever it is handed', () => {
    // A one-seat lobby is a state the picker can render mid-join.
    expect(shieldBonusFor(1)).toBe(500)
    expect(shieldBonusFor(0)).toBe(500)
    expect(shieldBonusFor(Number.NaN)).toBe(500)
  })

  it('rewrites only Better Construction, and only when seats are known', () => {
    const bc = PERKS.find((p) => p.id === 'betterConstruction')!
    const swords = PERKS.find((p) => p.id === 'sharperSwords')!
    expect(perkDescription(bc, 7)).toBe('+625 shield health')
    // Percentages do not move with the table.
    expect(perkDescription(swords, 7)).toBe(swords.description)
    // No lobby to ask: fall back to the copy rather than inventing a number.
    expect(perkDescription(bc)).toBe('+500 shield health')
  })
})
