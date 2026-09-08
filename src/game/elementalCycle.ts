import { KINGDOMS } from './kingdoms'

/**
 * Who beats whom under "Elemental's Elementaled".
 *
 * ⚠️ THIS IS A SECOND COPY OF THE SERVER'S RINGS, AND IT IS DISPLAY ONLY. The
 * damage is decided entirely by `Server/src/data/elementalCycle.ts`; nothing
 * here changes a single number. What this drives is the badge telling a player
 * who they are strong and weak against — so if the two ever disagreed, the game
 * would keep playing correctly while lying to the player about why, which is a
 * particularly nasty shape of bug to chase.
 *
 * The two repos cannot import from each other, so the rings are stated in both
 * and each side has a test pinning them to the same chain. Change one, change
 * the other, and both tests will tell you if you did not.
 *
 *   water → fire → ice → nature → earth → air → electricity → (water)
 *   time → space → light → dark → love → (time)
 *   joker → kitsune → magma → insects → (joker)
 */
export const ELEMENTAL_RINGS: readonly (readonly string[])[] = [
  ['water', 'fire', 'ice', 'nature', 'earth', 'air', 'electricity'],
  ['time', 'space', 'light', 'dark', 'love'],
  ['joker', 'kitsune', 'magma', 'insects'],
]

const strong = new Map<string, string>()
const weak = new Map<string, string>()

for (const ring of ELEMENTAL_RINGS) {
  ring.forEach((kingdom, i) => {
    const next = ring[(i + 1) % ring.length]!
    strong.set(kingdom, next)
    weak.set(next, kingdom)
  })
}

/** The kingdom this one has the advantage over, or null. */
export function strongAgainst(kingdomId: string | null | undefined): string | null {
  return kingdomId ? strong.get(kingdomId) ?? null : null
}

/** The kingdom that has the advantage over this one, or null. */
export function weakAgainst(kingdomId: string | null | undefined): string | null {
  return kingdomId ? weak.get(kingdomId) ?? null : null
}

/** A kingdom's display name, for the badge. */
export function kingdomName(kingdomId: string | null): string | null {
  if (!kingdomId) return null
  return KINGDOMS.find((k) => k.id === kingdomId)?.label ?? kingdomId
}
