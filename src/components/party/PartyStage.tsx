import { useEffect, useState } from 'react'
import type { PartySnapshot } from '../../game/party'
import { MazeGame } from './MazeGame'
import { MemoryGame } from './MemoryGame'
import { LockpickGame } from './LockpickGame'
import { BlackjackGame } from './BlackjackGame'
import { SpotTheDifferenceGame } from './SpotTheDifferenceGame'
import { ReactionGame } from './ReactionGame'
import { QuickMathGame } from './QuickMathGame'
import { ButtonMashGame } from './ButtonMashGame'
import { KingdomThiefGame } from './KingdomThiefGame'
import { PickAChestGame } from './PickAChestGame'
import { DontMoveGame } from './DontMoveGame'
import './PartyStage.css'

/**
 * The panel a minigame is played in.
 *
 * ⚠️ IT IS NOT A MODAL, AND THAT IS DELIBERATE. The battlefield stays visible
 * and readable behind it: the match is still running, castles are still taking
 * damage from things already in flight, and a player who cannot see the board
 * cannot tell whether they are about to lose while they play. It covers the
 * middle of the screen, dims what is behind it, and leaves the HUD alone.
 *
 * ⚠️ AND IT NEVER TRAPS THE PLAYER. Once they have finished, the panel shrinks
 * to a small "waiting on the table" note rather than holding the screen until
 * the last person answers — which on a seven-player table can be half a minute.
 */

const GAMES = {
  maze: MazeGame,
  memory: MemoryGame,
  lockpick: LockpickGame,
  blackjack: BlackjackGame,
  spotTheDifference: SpotTheDifferenceGame,
  reaction: ReactionGame,
  quickMath: QuickMathGame,
  buttonMash: ButtonMashGame,
  kingdomThief: KingdomThiefGame,
  pickAChest: PickAChestGame,
  dontMove: DontMoveGame,
} as const

/**
 * Games that are played ON the battlefield rather than in this panel.
 *
 * ⚠️ BOMB ATTACK CANNOT LIVE IN A MODAL. Passing the bomb means clicking
 * another kingdom's castle, so a panel over the arena would cover the only
 * thing the player can interact with. It draws its own heads-up strip instead
 * (`BombHud`) and this component stands aside — which is why an unknown game id
 * and a field game both render nothing here, but for opposite reasons.
 */
const FIELD_GAMES = new Set([
  'bombAttack',
  // Clean Up is its own full-screen layer (`CleanUpOverlay`): the mess has to
  // be IN THE WAY of the match, and a panel would make it a chore in a box.
  'cleanUp',
  // Haunted happens to the board, not in a dialog — the living carry on and the
  // dead get their kit back. The banner says everything there is to say.
  'haunted',
  // Gold Party rains on the battlefield itself; catching a coin means tapping
  // where it actually is, not where a panel redrew it.
  'goldParty',
])

/**
 * Games that get out of the way when you finish, and how long they wait first.
 *
 * ⚠️ FINISHING EARLY MUST NOT BE A PUNISHMENT. Being held behind a "waiting on
 * 4 kingdoms" card while the match runs on without you is a penalty for being
 * FAST, so anything with nothing left to show leaves the moment it is over.
 *
 * The delay is only ever there to let a RESULT be read, and only when the game
 * has not already shown it: the chest's whole outcome is one number that lands
 * as you tap, so it holds; blackjack's hand was already read during the
 * server's own reveal window, so it does not. A game absent from this map is
 * one where the waiting card itself is worth seeing — Memory's verdict and
 * Reaction's placing only mean anything against the rest of the table.
 *
 * ⚠️ AND ZERO IS NOT THE SAME AS ABSENT. The chest sat at zero, which mounted
 * and unmounted the opened chest in the same frame: the player tapped and was
 * returned to the battlefield having been told nothing, which reads as a broken
 * game rather than as a loss.
 */
const DISMISS_AFTER_MS: Record<string, number> = {
  spotTheDifference: 0,
  quickMath: 0,
  // Blackjack's hand is already over by the time `done` is set: the server
  // holds the table open for its own reveal window so the dealer's cards can be
  // read, and only then marks the player finished. By that point there is
  // nothing left to look at, so it leaves at once rather than showing a
  // "waiting on 4 kingdoms" card on top of a result already read.
  blackjack: 0,
  // Five locks picked is five locks picked. Nothing follows it.
  lockpick: 0,
  pickAChest: 3200,
}

export function PartyStage({
  party,
  youId,
}: {
  /** Absent as readily as null — see the note in `PartyBanner`. */
  party?: PartySnapshot | null
  youId: string | null
}) {
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (!party?.resolved) {
      setClosing(false)
      return
    }
    setClosing(true)
  }, [party?.resolved])

  // Whether this player's panel has served its time after they finished. Kept
  // here rather than read off a finish tick because it is a presentation
  // question — the server has already recorded everything that matters.
  const [dismissed, setDismissed] = useState(false)
  const gameId = party?.gameId ?? null
  const mineDone = (party && youId ? party.players[youId]?.done : false) ?? false

  useEffect(() => {
    setDismissed(false)
    if (!mineDone || gameId === null) return
    const delay = DISMISS_AFTER_MS[gameId]
    if (delay === undefined) return
    if (delay === 0) {
      setDismissed(true)
      return
    }
    const timer = setTimeout(() => setDismissed(true), delay)
    return () => clearTimeout(timer)
  }, [mineDone, gameId])

  if (!party) return null
  // A spectator, or somebody who joined after it started, has no seat in it.
  const mine = youId ? party.players[youId] : undefined
  if (!mine) return null

  if (FIELD_GAMES.has(party.gameId)) return null

  const hold = DISMISS_AFTER_MS[party.gameId]
  // ⚠️ A ZERO HOLD IS DECIDED HERE, NOT IN THE EFFECT. Waiting for the effect
  // to set `dismissed` costs a render, and that render is the waiting card — a
  // "Waiting on 6 kingdoms" flash after every hand of blackjack.
  if (mine.done && (hold === 0 || dismissed)) return null

  const Game = GAMES[party.gameId as keyof typeof GAMES]
  if (!Game) return null

  /**
   * ⚠️ THE HOLD IS FOR THE GAME'S OWN RESULT, SO THE GAME KEEPS THE PANEL.
   * This showed the waiting card the moment a player finished, which meant the
   * chest's whole reason for holding — the opened chest and the number in it —
   * was replaced by "Waiting on 6 kingdoms" for the entire 3.2 seconds. The
   * player never saw what they won at all; they watched a queue.
   */
  const holding = mine.done && hold !== undefined && !dismissed
  const waiting = mine.done && !party.resolved && !holding
  const others = Object.values(party.players).filter((p) => !p.done).length

  return (
    <div
      className={`party-stage${closing ? ' party-stage--closing' : ''}`}
      data-testid="party-stage"
      data-game={party.gameId}
    >
      <div className="party-stage__scrim" aria-hidden="true" />
      <div
        className={`party-stage__panel${waiting ? ' party-stage__panel--waiting' : ''}`}
        role="dialog"
        aria-label={party.description}
      >
        {waiting ? (
          <div className="party-stage__waiting" data-testid="party-waiting">
            <span className="party-stage__waiting-mark">✓</span>
            <p className="party-stage__waiting-line">
              {others === 0
                ? 'Everyone is done'
                : `Waiting on ${others} ${others === 1 ? 'kingdom' : 'kingdoms'}`}
            </p>
            <p className="party-stage__waiting-note">Your production is running again.</p>
          </div>
        ) : (
          // ⚠️ KEYED BY GAME. A minigame holds local state that belongs to ONE
          // session — the box's position in the maze, the needle's direction —
          // and re-using a mounted component across two sessions would carry
          // that state into a game it does not describe.
          <Game key={party.gameId} party={party} youId={youId} />
        )}
      </div>
    </div>
  )
}
