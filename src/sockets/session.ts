import type { Socket } from 'socket.io-client'
import type { Ack } from './types'

// Per-tab session identity. We use sessionStorage (NOT localStorage) so each
// browser tab/window is its own player: it survives a refresh (so reconnection
// works) but is not shared across tabs — otherwise two tabs of the same browser
// would be treated as the same player and collide. The server issues/echoes the
// session id via `conn:identify` (see SOCKET_EVENTS.md, server ticket #23.2).

/** Long enough for a slow phone on a bad connection, short enough to notice. */
const ACK_TIMEOUT_MS = 8_000

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

/**
 * Tells the server which ACCOUNT is on this socket.
 *
 * ⚠️ SEPARATE FROM `identify`, AND IT HAS TO BE. A session id is an anonymous
 * per-tab handle — a guest has one — so it can restore a seat but can never
 * answer "is this person allowed to do that". Socket events never carry the
 * Authorization header the HTTP routes read, so anything decided per account
 * needs the signed token presented here as well.
 *
 * Signed out is a normal answer, not a failure: it means playing as a guest.
 */
export async function authenticate(
  socket: Socket,
  token: string | null,
): Promise<{ signedIn: boolean; admin: boolean }> {
  // ⚠️ TIMED, UNLIKE EVERY OTHER emitWithAck HERE. A server that predates this
  // event has no handler for it, and an un-timed ack against one never settles
  // — the promise simply hangs and the account silently stays a guest, which
  // looks exactly like being signed out. This is the shape of the bug that
  // costs an afternoon, so it fails loudly and fast instead.
  try {
    const res = (await socket
      .timeout(ACK_TIMEOUT_MS)
      .emitWithAck('conn:authenticate', {
        token: token ?? undefined,
      })) as Ack<{ signedIn: boolean; admin: boolean }>

    if (!res.ok || !res.data) return { signedIn: false, admin: false }
    const who = { signedIn: res.data.signedIn === true, admin: res.data.admin === true }
    // Says out loud, in dev, which account the SOCKET thinks it is. Admin-gated
    // UI is invisible when this is wrong, and invisible is indistinguishable
    // from missing — which is exactly how an afternoon gets spent looking for a
    // button that was never going to be drawn.
    if (import.meta.env.DEV) console.info('[kingdoms] socket account:', who)
    return who
  } catch {
    console.warn(
      'The server did not answer conn:authenticate. It is probably an older ' +
        'build than this client — account-gated controls will stay hidden.',
    )
    return { signedIn: false, admin: false }
  }
}
