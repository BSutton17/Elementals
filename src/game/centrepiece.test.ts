import { describe, it, expect } from 'vitest'
import { spawnsCentrepiece } from './centrepiece'
import { getAbilitiesForKingdom } from './abilities'

// The middle of the field holds one thing at a time. The server enforces it and
// sends down WHAT is standing there; this side only has to agree about which
// abilities claim that space, so a barred card matches what the server refuses.

/** Every ability that puts something in the middle of the battlefield. */
const CENTREPIECES = [
  { kingdom: 'magma', id: 'theEndOfTheWorld' },
  { kingdom: 'insects', id: 'caprice' },
  { kingdom: 'space', id: 'blackHole' },
  { kingdom: 'light', id: 'lightShow' },
]

describe('which abilities claim the centre of the field', () => {
  it('knows all four', () => {
    for (const c of CENTREPIECES) {
      expect(spawnsCentrepiece(c.id), `${c.id} is not recognised`).toBe(true)
    }
  })

  it('names abilities that actually exist', () => {
    // A typo here is silent: the id would simply never match, the card would
    // never bar, and it would look exactly like the feature not being built.
    // This caught nothing when the list held two — it exists because the list
    // grew, and the two that were added were ones nobody had registered.
    for (const c of CENTREPIECES) {
      const ids = getAbilitiesForKingdom(c.kingdom).map((a) => a.id)
      expect(ids, `${c.kingdom} has no ability "${c.id}"`).toContain(c.id)
    }
  })

  it('claims nothing on behalf of ordinary abilities', () => {
    // A rule this broad going wrong the other way would bar half the game.
    const claimed = new Set(CENTREPIECES.map((c) => c.id))
    for (const kingdom of ['water', 'fire', 'magma', 'insects', 'space', 'light', 'time']) {
      for (const ability of getAbilitiesForKingdom(kingdom)) {
        if (claimed.has(ability.id)) continue
        expect(spawnsCentrepiece(ability.id), `${ability.id} claims the centre`).toBe(false)
      }
    }
  })

  it('covers every ULTIMATE that draws in the middle, and no other kind', () => {
    // All four are ultimates. If a basic attack ever ends up in the list it is
    // almost certainly a copied id rather than a design decision.
    for (const c of CENTREPIECES) {
      const ability = getAbilitiesForKingdom(c.kingdom).find((a) => a.id === c.id)!
      expect(ability.kind, `${c.id} is not an ultimate`).toBe('ultimate')
    }
  })
})
