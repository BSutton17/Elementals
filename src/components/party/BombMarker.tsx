import { FaBomb } from 'react-icons/fa6'
import type { PartySnapshot } from '../../game/party'

/**
 * The bomb, over the head of whoever is holding it.
 *
 * ⚠️ THIS IS THE WHOLE INTERFACE FOR BOMB ATTACK, and it replaced a table of
 * per-kingdom hold times. The table was accurate and useless: the game is
 * played by looking at the BOARD and clicking a castle, so a leaderboard in the
 * corner asks the player to read numbers somewhere other than where the game
 * is happening. One icon over one castle answers the only question that
 * matters at any moment — who has it — in the place they are already looking.
 *
 * Lives inside the battlefield's 1000×1000 viewBox, so it travels with the
 * castles and letterboxes with the arena.
 */

/** Drawn size in user units — readable at a phone's arena scale. */
const ICON = 58
/** Clear of the castle's name plate. */
const ABOVE = 140

export function BombMarker({
  party,
  positionOf,
}: {
  party: PartySnapshot | null | undefined
  /** Battlefield coordinate of a player id, or undefined. */
  positionOf: (id: string) => { x: number; y: number } | undefined
}) {
  if (!party || party.gameId !== 'bombAttack' || party.resolved) return null

  const holderId = party.shared.holderId as string | undefined
  if (!holderId) return null
  const at = positionOf(holderId)
  if (!at) return null

  return (
    <g className="bomb-marker" data-testid="bomb-marker" aria-hidden="true">
      {/* A soft glow under it, so the icon reads against a bright castle as
          well as a dark field. */}
      <circle className="bomb-marker__halo" cx={at.x} cy={at.y - ABOVE} r={ICON * 0.62} />
      <FaBomb
        className="bomb-marker__icon"
        x={at.x - ICON / 2}
        y={at.y - ABOVE - ICON / 2}
        // ⚠️ `size`, NOT width/height: react-icons writes its own dimensions
        // after spreading props, so those two are silently ignored and the icon
        // falls back to 1em — a speck inside a 1000-unit viewBox.
        size={ICON}
        color="#ff7a4a"
      />
    </g>
  )
}
