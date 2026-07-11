import type { Socket } from 'socket.io-client'
import type { Ack } from './types'

// Per-tab session identity. We use sessionStorage (NOT localStorage) so each
// browser tab/window is its own player: it survives a refresh (so reconnection
// works) but is not shared across tabs — otherwise two tabs of the same browser
// would be treated as the same player and collide. The server issues/echoes the
// session id via `conn:identify` (see SOCKET_EVENTS.md, server ticket #23.2).

const SESSION_KEY = 'kingdoms.sessionId'
const ROOM_KEY = 'kingdoms.roomCode'

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    /* storage unavailable — non-fatal */
  }
}

function remove(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* non-fatal */
  }
}

export function getStoredSessionId(): string | null {
  return read(SESSION_KEY)
}

function storeSessionId(id: string): void {
  write(SESSION_KEY, id)
}

/** The room the player is currently in, persisted so a refresh can resume it. */
export function getStoredRoomCode(): string | null {
  return read(ROOM_KEY)
}

export function storeRoomCode(roomCode: string): void {
  write(ROOM_KEY, roomCode)
}

export function clearStoredRoomCode(): void {
  remove(ROOM_KEY)
}

/** Identifies with the server, restoring/persisting our session id. */
export async function identify(socket: Socket): Promise<string | null> {
  const stored = getStoredSessionId()
  const res = (await socket.emitWithAck('conn:identify', {
    sessionId: stored ?? undefined,
  })) as Ack<{ sessionId: string }>

  const sessionId = res.ok ? res.data?.sessionId ?? null : null
  if (sessionId) storeSessionId(sessionId)
  return sessionId
}
