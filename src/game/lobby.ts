// Client-side mirrors of the server's serialized lobby state (see the server's
// Match.serialize / SOCKET_EVENTS.md). Separate repos, so this is our own copy.

/** Minimum connected players before the host can start (mirrors server). */
export const MIN_PLAYERS_TO_START = 2

/**
 * Kingdom-playing seats in a room. A room holds one more person than this, but
 * that last seat is spectator-only — so this, not the room's total capacity, is
 * the number to show a player deciding whether they can get in.
 *
 * Mirrors the server's `MATCH.MAX_ACTIVE_PLAYERS`; live lobbies read
 * `match.maxActivePlayers` off the sync instead. This is only for copy shown
 * before a room exists (the tutorial).
 */
export const MAX_ACTIVE_PLAYERS = 7

export interface LobbyPlayer {
  id: string
  name: string
  kingdomId: string | null
  /** Chosen perk ids (see game/perks.ts); absent until they start picking. */
  perks?: string[]
  ready: boolean
  connected: boolean
  socketId: string | null
  /** A spectator watches without a kingdom/castle (the 8th seat). */
  spectator?: boolean
  /** True when this seat is played by the computer rather than a person. */
  isBot?: boolean
  /** Which trained opponent drives it. Only meaningful alongside `isBot`. */
  botDifficulty?: BotDifficulty
}

/** The three computer-opponent strengths the server ships. */
export type BotDifficulty = 'easy' | 'medium' | 'hard'

/** Ordered for the cycle control — Easy is the gentlest. */
export const BOT_DIFFICULTIES: readonly BotDifficulty[] = ['easy', 'medium', 'hard']

/**
 * The next difficulty in the cycle, wrapping hard -> easy.
 *
 * A tap-to-cycle control rather than a dropdown: there are only three values,
 * so a menu costs two interactions (open, choose) where a tap costs one, and on
 * a phone it avoids the platform picker covering the roster you are editing.
 */
export function nextDifficulty(current: BotDifficulty | undefined): BotDifficulty {
  const at = BOT_DIFFICULTIES.indexOf(current ?? 'hard')
  return BOT_DIFFICULTIES[(at + 1) % BOT_DIFFICULTIES.length]!
}

/** Sentence-case label for a difficulty, for anything player-facing. */
export function botDifficultyLabel(d: BotDifficulty): string {
  return d.charAt(0).toUpperCase() + d.slice(1)
}

export interface MatchConfig {
  roomCode: string
  maxPlayers: number
  tickRate: number
  startingCitizens: number
  startingCastleHp: number
  /** Damage Dark must absorb to fill the Unlimited Rage meter (server-owned). */
  rageFull?: number
  /** What a full Ancient Memory meter is worth (Kitsune, server-owned). */
  memoryFull?: number
}

export interface LobbyMatch {
  roomCode: string
  phase: string
  hostId: string | null
  players: LobbyPlayer[]
  playerCount: number
  maxPlayers: number
  /** Max kingdom-playing participants (7); seats beyond this must spectate. */
  maxActivePlayers?: number
  /** Host rule: an eliminated player keeps seeing every surviving kingdom's
   *  health bar. Off unless the host turned it on. */
  eliminatedSeeAllHealth?: boolean
  /** "private" (code + host) or "public" (matchmade, hostless, self-starting). */
  visibility?: 'private' | 'public'
  /**
   * When a public lobby starts itself, as an absolute timestamp, or null.
   *
   * A deadline rather than a countdown: "18 seconds left" drifts by each
   * client's own latency and clients end up disagreeing about when the match
   * begins. Subtract this from `Date.now()` to render.
   */
  startsAt?: number | null
  tick: number
  winnerId: string | null
  config?: MatchConfig | null
}

/** The authoritative `state:full` snapshot the server sends on reconnection. */
export interface MatchSnapshot {
  roomCode: string
  phase: string
  tick: number
  serverTime: number
  hostId: string | null
  winnerId: string | null
  maxPlayers: number
  maxActivePlayers?: number
  /** Host rule: an eliminated player keeps seeing every surviving kingdom's
   *  health bar. Off unless the host turned it on. */
  eliminatedSeeAllHealth?: boolean
  /** "private" (code + host) or "public" (matchmade, hostless, self-starting). */
  visibility?: 'private' | 'public'
  /**
   * When a public lobby starts itself, as an absolute timestamp, or null.
   *
   * A deadline rather than a countdown: "18 seconds left" drifts by each
   * client's own latency and clients end up disagreeing about when the match
   * begins. Subtract this from `Date.now()` to render.
   */
  startsAt?: number | null
  config: MatchConfig | null
  you: LobbyPlayer | null
  players: LobbyPlayer[]
  projectiles: unknown[]
}

/** Rebuilds a match view from a reconnection snapshot. */
export function matchFromSnapshot(s: MatchSnapshot): LobbyMatch {
  return {
    roomCode: s.roomCode,
    phase: s.phase,
    hostId: s.hostId,
    players: s.players,
    playerCount: s.players.length,
    maxPlayers: s.maxPlayers,
    maxActivePlayers: s.maxActivePlayers,
    tick: s.tick,
    winnerId: s.winnerId,
    config: s.config,
  }
}
