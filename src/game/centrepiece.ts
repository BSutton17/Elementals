/**
 * The middle of the battlefield holds ONE thing at a time.
 *
 * Four abilities claim that space — Magma's volcano ("The End of the World"),
 * Insects' butterfly ("Caprice"), Space's black hole and Light's disc ("Light
 * Show"). They contradict each other outright (the volcano needs everyone able
 * to aim at it; Caprice takes everyone's aim away) and they would be drawn on
 * top of one another, so while any of them is standing the others cannot be
 * cast.
 *
 * THE SERVER OWNS THIS RULE (`engine/centrepiece.ts`) and sends the answer down
 * as `centrepiece` on each sync. This side does not re-derive it: two of the
 * four never appear in the state payload at all — the black hole and the Light
 * Show reach the client as EVENTS — so a local reimplementation would know
 * about the two it could see and silently miss the other two. It did exactly
 * that once.
 *
 * All that lives here is the mapping from ability id to "this one claims the
 * centre", so a barred card can be drawn before the player spends a click on
 * an ultimate the server is going to refuse.
 */

/** Ability ids that put an entity in the middle of the field. */
const CENTREPIECE_ABILITY_IDS = new Set([
  'theEndOfTheWorld',
  'caprice',
  'blackHole',
  'lightShow',
])

/** True if casting this ability would claim the centre of the battlefield. */
export function spawnsCentrepiece(abilityId: string): boolean {
  return CENTREPIECE_ABILITY_IDS.has(abilityId)
}
