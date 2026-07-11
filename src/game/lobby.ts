// Client-side mirrors of the server's serialized lobby state (see the server's
// Match.serialize / SOCKET_EVENTS.md). Separate repos, so this is our own copy.

/** Minimum connected players before the host can start (mirrors server). */
export const MIN_PLAYERS_TO_START = 2

export interface LobbyPlayer {
  id: string
  name: string
  kingdomId: string | null
  ready: boolean
  connected: boolean
  socketId: string | null
}

export interface MatchConfig {
  roomCode: string
  maxPlayers: number
  tickRate: number
  startingCitizens: number
  startingCastleHp: number
}

export interface LobbyMatch {
  roomCode: string
  phase: string
  hostId: string | null
  players: LobbyPlayer[]
  playerCount: number
  maxPlayers: number
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
    tick: s.tick,
    winnerId: s.winnerId,
    config: s.config,
  }
}
