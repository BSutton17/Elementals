import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LobbyScreen } from './LobbyScreen'
import { setAdmin } from '../game/adminStore'
import type { LobbyMatch } from '../game/lobby'

/**
 * The wire from "the server says you are an admin" to "the gear is on screen".
 *
 * ⚠️ THIS IS THE JOIN THAT BROKE. Both halves worked in isolation — the server
 * answered `conn:authenticate` correctly and the panel rendered correctly in its
 * own tests — and the button still was not there, because nothing asserted that
 * the flag actually reaches the lobby. Tested through the real store rather than
 * a mocked prop, so the path under test is the one that runs.
 */

const lobby = { match: null as LobbyMatch | null, youId: 'a' }
vi.mock('../game/useLobby', () => ({ useLobby: () => lobby }))

const match = (over: Partial<LobbyMatch> = {}): LobbyMatch =>
  ({
    roomCode: '1234',
    phase: 'lobby',
    hostId: 'a',
    visibility: 'private',
    playerCount: 1,
    maxPlayers: 8,
    tick: 0,
    winnerId: null,
    monstersEnabled: true,
    eliminatedSeeAllHealth: false,
    players: [
      { id: 'a', name: 'Alice', kingdomId: 'fire', perks: [], ready: false, connected: true, socketId: 's1' },
    ],
    ...over,
  }) as LobbyMatch

describe('the lobby screen', () => {
  beforeEach(() => {
    lobby.match = match()
    setAdmin(false)
  })

  it('shows the gear once the server says we are an admin', () => {
    const { rerender } = render(<LobbyScreen />)
    expect(screen.queryByTestId('room-options-gear')).toBeNull()

    // Arrives after the first paint: it is a database read the handshake
    // deliberately does not wait for.
    setAdmin(true)
    rerender(<LobbyScreen />)
    expect(screen.getByTestId('room-options-gear')).toBeTruthy()
  })

  it('takes it away again on sign-out', () => {
    setAdmin(true)
    const { rerender } = render(<LobbyScreen />)
    expect(screen.getByTestId('room-options-gear')).toBeTruthy()

    setAdmin(false)
    rerender(<LobbyScreen />)
    expect(screen.queryByTestId('room-options-gear')).toBeNull()
  })
})
