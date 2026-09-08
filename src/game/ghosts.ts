import type { GamePlayer } from './gameState'

/**
 * Whether this kingdom is currently raised by Haunted.
 *
 * ⚠️ A GHOST IS BOTH ELIMINATED AND PLAYING, WHICH NO SINGLE FLAG SAYS. The
 * server keeps `eliminated` true for the whole haunting — that is what stops a
 * ghost winning the match and what makes it untargetable — so anything asking
 * "is this player out of the game" has to ask this as well or it will treat a
 * kingdom that is up and fighting as a corpse.
 *
 * One function rather than the comparison written out at each call site,
 * because it is the second half of a rule that is easy to forget entirely.
 */
export function isGhost(player: GamePlayer | null | undefined, tick: number): boolean {
  if (!player?.eliminated) return false
  return (player.ghostUntilTick ?? 0) > tick
}
