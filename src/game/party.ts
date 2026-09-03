import { socket } from '../sockets/socket'
import type { Ack } from '../sockets/types'

/**
 * Party Mode on the client: the shapes that come down the wire, and the one
 * way a move goes back up.
 *
 * ⚠️ NOTHING IN HERE DECIDES ANYTHING. Every minigame is scored on the server —
 * this side reports what the player did ("here is the path I dragged", "I
 * clicked at 212 degrees") and renders whatever comes back. A client that
 * settled its own results would be the easiest thing in the game to cheat, and
 * these hand out gold.
 */

export type PartyGameId =
  | 'maze'
  | 'spotTheDifference'
  | 'blackjack'
  | 'memory'
  | 'lockpick'
  | 'reaction'
  | 'quickMath'
  | 'buttonMash'
  | 'bombAttack'
  | 'kingdomThief'
  | 'pickAChest'
  | 'dontMove'
  | 'kingdomSwap'
  | 'haunted'
  | 'goldParty'
  | 'cleanUp'

export interface PartyPlayerWire {
  done: boolean
  outcome: 'won' | 'lost' | null
  finishedTick: number | null
  data: Record<string, unknown>
}

export interface PartySnapshot {
  gameId: PartyGameId
  /** The banner text, authored server-side so the two can never disagree. */
  description: string
  elapsedTicks: number
  /** Ticks left on a timed game, or null for one that waits for an answer. */
  ticksRemaining: number | null
  shared: Record<string, unknown>
  players: Record<string, PartyPlayerWire>
  /** Null until somebody finishes; while it is null, attacks are held. */
  firstFinisherId: string | null
  finishOrder: string[]
  resolved: boolean
  resultText: string | null
}

// --- the shapes each game puts in `shared` / `data` --------------------------

export interface MazeCell {
  top: boolean
  right: boolean
  bottom: boolean
  left: boolean
}

export interface MazeLayout {
  size: number
  cells: MazeCell[]
  start: { row: number; col: number }
  exit: { row: number; col: number }
}

export interface SpotOrnament {
  x: number
  y: number
  r: number
  colour: string
}

export interface SpotSetup {
  cosmeticId: string
  kingdomId: string
  ornaments: SpotOrnament[]
  changedIndex: number
  kind: 'removed' | 'recoloured'
  newColour: string | null
}

export interface LockState {
  picked: number
  zoneStart: number
  zoneWidth: number
  speed: number
  misses: number
}

export interface Card {
  rank: number
  suit: 'clubs' | 'diamonds' | 'hearts' | 'spades'
}

export interface BlackjackHand {
  cards: Card[]
  bet: number
  standing: boolean
  doubled: boolean
  fromSplit: boolean
  outcome: 'win' | 'lose' | 'push' | 'blackjack' | null
}

export interface BlackjackState {
  hands: BlackjackHand[]
  active: number
  dealerUp: Card | null
  /** Null until the dealer turns it over — the server withholds it. */
  dealerHole: Card | null
  dealerCards: Card[]
  stake: number
  owed: number
  settled: boolean
  net: number
}

export interface MemoryQuestionWire {
  kind: 'positional' | 'repeated' | 'followed'
  position?: number
  after?: string
}

// --- talking to the server ---------------------------------------------------

/** Sends one move. Resolves false when the server refused it. */
export async function partyAct(action: Record<string, unknown>): Promise<boolean> {
  try {
    const res = (await socket.timeout(8000).emitWithAck('party:act', { action })) as Ack
    return res.ok === true
  } catch {
    // A refused or unanswered move is not worth an error screen mid-minigame:
    // the next state sync is authoritative and will put the player right.
    return false
  }
}

/**
 * Host only, and the server enforces that — see `partyHandlers.ts`.
 *
 * The refusal message is carried back rather than swallowed: this is a testing
 * tool, and "Needs an eliminated kingdom to raise" is the whole answer to why
 * a button appeared to do nothing.
 */
export async function partyDebugStart(
  gameId: PartyGameId,
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const res = (await socket.timeout(8000).emitWithAck('party:debug', { gameId })) as Ack
    return { ok: res.ok === true, error: res.error?.message ?? null }
  } catch {
    return { ok: false, error: 'The server did not answer' }
  }
}

export interface PartyDebugGame {
  id: PartyGameId
  description: string
  /** Why it will not start right now, or null when it will. */
  reason: string | null
}

export async function partyDebugAvailable(): Promise<
  { available: boolean; games: PartyDebugGame[] }
> {
  try {
    const res = (await socket
      .timeout(8000)
      .emitWithAck('party:debugList', {})) as Ack<{
      available: boolean
      games: PartyDebugGame[]
    }>
    if (!res.ok || !res.data) return { available: false, games: [] }
    return res.data
  } catch {
    return { available: false, games: [] }
  }
}

/** This player's slice of the running session, or null. */
export function myPartyState(
  party: PartySnapshot | null,
  youId: string | null,
): PartyPlayerWire | null {
  if (!party || !youId) return null
  return party.players[youId] ?? null
}
