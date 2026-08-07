import { describe, it, expect } from 'vitest'
import { KINGDOMS, SELECTABLE_KINGDOMS } from './kingdoms'
import { KINGDOM_ICONS } from './kingdomIcons'
import { KINGDOM_THEMES } from './kingdomThemes'
import { KINGDOM_PASSIVES_INFO } from './kingdomInfo'
import { getAbilitiesForKingdom } from './abilities'

// A kingdom is wired across six client files, and missing one of them fails
// quietly rather than loudly: a kingdom with no ability metadata is selectable,
// loads into a match, and hands the player an EMPTY ability bar. Insects very
// nearly shipped that way. This sweeps the whole roster so the next one cannot.

describe('every kingdom on the roster is fully wired', () => {
  it.each(KINGDOMS.map((k) => [k.id, k.label] as const))(
    '%s has a theme, an icon, a passive entry and a full ability bar',
    (id) => {
      expect(KINGDOM_THEMES[id], `${id} has no theme`).toBeTruthy()
      expect(KINGDOM_ICONS[id], `${id} has no icon`).toBeTruthy()
      // Passive COPY may legitimately be an empty list while a kingdom is a
      // placeholder — but the key has to exist, or the dossier renders nothing
      // and there is no way to tell "none yet" from "forgot to wire it".
      expect(KINGDOM_PASSIVES_INFO[id], `${id} has no passive entry`).toBeDefined()
      // Five castable abilities, matching the server's kit size.
      expect(getAbilitiesForKingdom(id).length, `${id} has an empty ability bar`).toBe(5)
    },
  )

  it('gives every kingdom its own colour', () => {
    const colors = KINGDOMS.map((k) => k.color.toLowerCase())
    expect(new Set(colors).size).toBe(colors.length)
  })

  it('gives every kingdom its own icon', () => {
    // Two kingdoms sharing a mark is worse than none: it says they are the
    // same thing.
    const icons = KINGDOMS.map((k) => KINGDOM_ICONS[k.id])
    expect(new Set(icons).size).toBe(icons.length)
  })

  it('has no duplicate ability ids across the whole roster', () => {
    const ids = KINGDOMS.flatMap((k) => getAbilitiesForKingdom(k.id).map((a) => a.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('offers every kingdom in the picker', () => {
    expect(SELECTABLE_KINGDOMS.length).toBe(KINGDOMS.length)
  })
})
