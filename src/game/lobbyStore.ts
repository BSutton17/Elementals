import { socket } from '../sockets/socket'
import {
  clearStoredRoomCode,
  getStoredRoomCode,
  getStoredSessionId,
  storeRoomCode,
} from '../sockets/session'
import type { Ack } from '../sockets/types'
import {
  matchFromSnapshot,
  type LobbyMatch,
  type MatchConfig,
  type MatchSnapshot,
  type BotDifficulty,
} from './lobby'
import type { KingdomId } from './kingdoms'

// The single source of truth for the client's current match. It captures every
// authoritative server event (lobby:updated, match:started, state:full) so the
// UI can render both the lobby and, later, gameplay. The current room is also
// persisted so a page refresh can resume the match (ticket #40).

export interface MatchState {
  match: LobbyMatch | null
  youId: string | null
  /** Server clock at the last snapshot/start, for aligning timers. */
  serverTime: number | null
  error: string | null
}

let state: MatchState = {
  match: null,
  youId: null,
  serverTime: null,
  error: null,
}

const listeners = new Set<() => void>()

export function getLobbyState(): MatchState {
  return state
}

export function subscribeLobby(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function setState(patch: Partial<MatchState>): void {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

// --- server event subscriptions --------------------------------------------

// Canonical lobby state broadcast.
socket.on('lobby:updated', (payload: { match: LobbyMatch }) => {
  setState({ match: payload.match })
})

// Match initialization: capture the authoritative start info.
socket.on(
  'match:started',
  (payload: { serverTime: number; config: MatchConfig }) => {
    setState({ serverTime: payload.serverTime })
  },
)

// Match conclusion: the server announces the winner and stops broadcasting
// syncs. Flip the phase locally so the UI routes to the game-over screen.
socket.on('match:ended', (payload: { winnerId: string | null }) => {
  if (!state.match) return
  setState({
    match: { ...state.match, phase: 'ended', winnerId: payload.winnerId },
  })
})

// Full authoritative snapshot (sent on reconnection): rebuild match state.
socket.on('state:full', (snapshot: MatchSnapshot) => {
  storeRoomCode(snapshot.roomCode)
  setState({
    match: matchFromSnapshot(snapshot),
    youId: snapshot.you?.id ?? state.youId,
    serverTime: snapshot.serverTime,
    error: null,
  })
})

// --- actions ---------------------------------------------------------------

interface RoomAck {
  roomCode: string
  playerId: string
  match: LobbyMatch
}

async function enterRoom(
  event: 'lobby:create' | 'lobby:join',
  payload: Record<string, unknown>,
): Promise<Ack<RoomAck>> {
  const res = (await socket.emitWithAck(event, payload)) as Ack<RoomAck>
  if (res.ok && res.data) {
    storeRoomCode(res.data.roomCode)
    setState({ match: res.data.match, youId: res.data.playerId, error: null })
  } else {
    setState({ error: res.error?.message ?? 'Something went wrong' })
  }
  return res
}

export function createRoom(name: string): Promise<Ack<RoomAck>> {
  return enterRoom('lobby:create', { name })
}

export function joinRoom(name: string, roomCode: string): Promise<Ack<RoomAck>> {
  return enterRoom('lobby:join', { name, roomCode })
}

export async function reconnectToRoom(roomCode: string): Promise<Ack<RoomAck>> {
  const sessionId = getStoredSessionId()
  const res = (await socket.emitWithAck('room:reconnect', {
    sessionId,
    roomCode,
  })) as Ack<RoomAck>
  if (res.ok && res.data) {
    storeRoomCode(res.data.roomCode)
    setState({ match: res.data.match, youId: res.data.playerId, error: null })
  } else {
    // Stale room — drop it so we don't keep trying to resume a dead match.
    clearStoredRoomCode()
  }
  return res
}

/** Attempts to resume a persisted match after a reconnect/refresh. */
export async function resumeMatch(): Promise<void> {
  const roomCode = getStoredRoomCode()
  if (roomCode) await reconnectToRoom(roomCode)
}

export async function toggleReady(): Promise<void> {
  const { match, youId } = state
  const me = match?.players.find((p) => p.id === youId)
  await socket.emitWithAck('lobby:ready', { ready: !me?.ready })
}

export async function selectKingdom(kingdom: KingdomId): Promise<void> {
  const res = (await socket.emitWithAck('lobby:selectKingdom', { kingdom })) as Ack
  if (!res.ok) setState({ error: res.error?.message ?? 'Cannot pick that kingdom' })
}

/**
 * Sends the player's whole perk selection (0–2 ids). The server validates and
 * broadcasts it, so the UI renders from the authoritative lobby state rather
 * than a local copy.
 */
export async function selectPerks(perks: readonly string[]): Promise<void> {
  const res = (await socket.emitWithAck('lobby:selectPerks', {
    perks: [...perks],
  })) as Ack
  if (!res.ok) setState({ error: res.error?.message ?? 'Cannot pick that perk' })
}

/**
 * Host-only room rule: whether an eliminated player keeps seeing every
 * surviving kingdom's health. Rejected by the server for anyone else, and once
 * the match has started.
 */
export async function setEliminatedSeeAllHealth(on: boolean): Promise<void> {
  const res = (await socket.emitWithAck('lobby:setRules', {
    eliminatedSeeAllHealth: on,
  })) as Ack
  if (!res.ok) setState({ error: res.error?.message ?? 'Cannot change that rule' })
}

/**
 * Host-only: add a computer opponent to the room.
 *
 * The server picks the bot's kingdom, perks and name — a bot cannot click, and
 * the room refuses to start with a seat that has not chosen — so the client
 * sends only the difficulty and renders whatever comes back on the next lobby
 * broadcast. No local bot state is kept anywhere.
 */
export async function addBot(difficulty: BotDifficulty = 'hard'): Promise<void> {
  const res = (await socket.emitWithAck('lobby:addBot', { difficulty })) as Ack
  if (!res.ok) setState({ error: res.error?.message ?? 'Cannot add a bot' })
}

/** Host-only: change which trained opponent drives an existing bot seat. */
export async function setBotDifficulty(
  botId: string,
  difficulty: BotDifficulty,
): Promise<void> {
  const res = (await socket.emitWithAck('lobby:setBotDifficulty', {
    botId,
    difficulty,
  })) as Ack
  if (!res.ok) setState({ error: res.error?.message ?? 'Cannot change that bot' })
}

/** Host-only: remove a bot seat from the room. */
export async function removeBot(botId: string): Promise<void> {
  const res = (await socket.emitWithAck('lobby:removeBot', { botId })) as Ack
  if (!res.ok) setState({ error: res.error?.message ?? 'Cannot remove that bot' })
}

/** Opt this seat out of playing — watch the match as a spectator instead. */
export async function spectate(): Promise<void> {
  await socket.emitWithAck('lobby:selectKingdom', { kingdom: 'spectator' })
}

export async function startMatch(): Promise<Ack> {
  const res = (await socket.emitWithAck('lobby:start', {})) as Ack
  if (!res.ok) setState({ error: res.error?.message ?? 'Cannot start yet' })
  return res
}

export async function leaveRoom(): Promise<void> {
  await socket.emitWithAck('lobby:leave', {})
  clearStoredRoomCode()
  setState({ match: null, youId: null, serverTime: null, error: null })
}
