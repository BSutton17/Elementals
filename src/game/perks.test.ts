import { describe, it, expect } from 'vitest'
import {
  PERKS_PER_PLAYER,
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
