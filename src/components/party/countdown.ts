/**
 * When a party countdown is worth showing.
 *
 * ⚠️ ONLY THE LAST THREE SECONDS, EVERYWHERE. A timer running for the whole
 * game turns whatever it is attached to into a stopwatch: players watch the
 * number instead of the maze, and a ten-second decision spends nine of those
 * seconds as pressure with nothing to do about it. Appearing at three is a
 * prompt to commit; running from ten is a metronome.
 *
 * One helper rather than the same `<= 3` in five components, so the rule is
 * changed once and cannot drift between games.
 */

/** Matches the server's `PARTY.COUNTDOWN_VISIBLE_SECONDS`. */
export const COUNTDOWN_VISIBLE_SECONDS = 3

/** Server ticks per second. */
const TICK_RATE = 20

/**
 * Seconds to show on screen, or null while the clock should stay hidden.
 *
 * `null` for a game with no clock at all, so a caller can render the same way
 * for "untimed" and "not yet worth showing".
 */
export function countdownSeconds(ticksRemaining: number | null | undefined): number | null {
  if (ticksRemaining === null || ticksRemaining === undefined) return null
  const seconds = Math.max(0, Math.ceil(ticksRemaining / TICK_RATE))
  return seconds <= COUNTDOWN_VISIBLE_SECONDS ? seconds : null
}
