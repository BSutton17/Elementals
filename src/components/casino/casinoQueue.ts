// Joker runs two blocking casino games — the Slot Machine (ultimate) and
// Roulette (heavy) — and a victim can easily owe both at once. They must never
// share the screen: whichever takes the stage plays to the end, and the other
// waits its turn.
//
// The scheduling rule is deliberately NOT "whichever the server is still
// flagging". A game's server-side hold ends the moment the victim acts (the
// lever pull, the chip click) but its cinematic runs on for seconds afterwards
// — the reels decelerating, the ball rolling, the verdict blinking. Handing the
// stage over on the server flag alone is exactly what let a slot machine open
// on top of a still-rolling roulette wheel.
//
// So the stage is claimed until the presenting overlay says it is *visually*
// finished, and only then does the next game step forward.

/** The two casino games, by the order they were dealt. */
export type CasinoGame = 'slot' | 'roulette'

export interface CasinoDebt {
  /** Tick the Slot Machine was dealt, or undefined if none is owed. */
  spinAt?: number
  /** Tick the Roulette was dealt, or undefined if none is owed. */
  betAt?: number
}

/**
 * Which game should take the stage next, given what the victim owes. Ties go to
 * the Slot Machine — it is the ultimate, and it is the one that arrived with
 * the bigger entrance.
 *
 * Returns null when nothing is owed.
 */
export function nextGame({ spinAt, betAt }: CasinoDebt): CasinoGame | null {
  if (spinAt == null && betAt == null) return null
  if (spinAt == null) return 'roulette'
  if (betAt == null) return 'slot'
  return spinAt <= betAt ? 'slot' : 'roulette'
}

/**
 * The beat between one game leaving and the next arriving. Long enough that the
 * outgoing table has visibly cleared before the next cabinet drops in, short
 * enough that it reads as one dealer handing over to another rather than a gap
 * in the action.
 */
export const HANDOVER_MS = 420

/**
 * Resolves what should actually be on screen right now.
 *
 * `presenting` is whoever currently holds the stage — it wins outright, even if
 * the other game has since been dealt and even if the server has already
 * cleared its own debt, because its cinematic is still running.
 */
export function stageOccupant(
  presenting: CasinoGame | null,
  debt: CasinoDebt,
): CasinoGame | null {
  return presenting ?? nextGame(debt)
}
