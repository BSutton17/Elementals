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
import { GoldPartyGame } from './GoldPartyGame'
import { KingdomSwapNote } from './KingdomSwapNote'
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
  goldParty: GoldPartyGame,
  kingdomSwap: KingdomSwapNote,
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
])

/**
 * Games that get out of the way the instant you finish them.
 *
 * ⚠️ THE WAITING PANEL IS ONLY WORTH SHOWING WHEN THERE IS SOMETHING TO SEE.
 * Blackjack has a settled hand, Memory has a verdict, Reaction has your time —
 * those are worth a beat. Spotting a difference, answering a sum and opening a
 * chest are not: you already know how it went, and being held behind a "waiting
 * on 4 kingdoms" card while the match runs on without you is a punishment for
 * being FAST.
 *
 * The chest is the sharpest case of the three — its whole result is one number
 * that lands the instant you tap, and there is nothing after that to look at.
 */
const DISMISS_ON_FINISH = new Set(['spotTheDifference', 'quickMath', 'pickAChest'])

/**
 * Games whose panel closes on a timer rather than on the player finishing.
 *
 * ⚠️ KINGDOM SWAP IS THIRTY SECONDS LONG AND MEANT TO BE PLAYED. Holding a card
 * over the board for its whole duration would be the exact opposite of what the
 * swap is for: it hands you a new kit and then hides the battlefield you would
 * use it on. The note says whose abilities you have, and gets out of the way.
 */
const ANNOUNCEMENTS: Record<string, number> = { kingdomSwap: 3500 }

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

  if (!party) return null
  // A spectator, or somebody who joined after it started, has no seat in it.
  const mine = youId ? party.players[youId] : undefined
  if (!mine) return null

  if (FIELD_GAMES.has(party.gameId)) return null
  if (mine.done && DISMISS_ON_FINISH.has(party.gameId)) return null

  const announcement = ANNOUNCEMENTS[party.gameId]
  if (announcement !== undefined && party.elapsedTicks * 50 > announcement) return null

  const Game = GAMES[party.gameId as keyof typeof GAMES]
  if (!Game) return null

  const waiting = mine.done && !party.resolved
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
