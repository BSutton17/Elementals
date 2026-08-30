import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LobbyView } from './LobbyView'
import type { LobbyMatch } from '../game/lobby'

/**
 * A public room is hostless and self-starting, and the lobby has to reflect
 * both: no start button, a countdown in its place, and the room rules gone
 * rather than merely greyed out.
 */

const PERKS = ['sharperSwords', 'extraGuards']

function publicMatch(over: Partial<LobbyMatch> = {}): LobbyMatch {
  return {
    roomCode: 'PUB1',
    phase: 'lobby',
    // ⚠️ A public room has NO host — this is null on the server too, which is
    // what makes every host-gated action refuse for everyone.
    hostId: null,
    visibility: 'public',
    startsAt: null,
    playerCount: 2,
    maxPlayers: 8,
    tick: 0,
    winnerId: null,
    players: [
      { id: 'a', name: 'Alice', kingdomId: 'fire', perks: PERKS, ready: true, connected: true, socketId: 's1' },
      { id: 'b', name: 'Bob', kingdomId: null, perks: [], ready: false, connected: true, socketId: 's2' },
    ],
    ...over,
  } as LobbyMatch
}

const noop = () => {}

function renderPublic(match: LobbyMatch) {
  return render(
    <LobbyView
      match={match}
      youId="b"
      onToggleReady={noop}
      onSelectKingdom={noop}
      onSelectPerks={noop}
      onSpectate={noop}
      onStart={noop}
      onLeave={noop}
    />,
  )
}

afterEach(() => {
  vi.useRealTimers()
})

describe('a public lobby', () => {
  it('offers nobody a start button, because nobody is the host', () => {
    renderPublic(publicMatch())
    expect(screen.queryByRole('button', { name: /start match/i })).toBeNull()
  })

  it('hides the options gear entirely, even from an admin', () => {
    // ⚠️ HIDDEN, NOT GREYED OUT, AND NOT EVEN FOR THE ADMIN. Elimination vision
    // is an advantage handed to a player who can no longer be punished for
    // having it, and a monster is a shared emergency that costs everyone gold
    // and attention. A stranger in matchmaking queued for neither. The server
    // refuses both in a public room too — this keeps the UI honest rather than
    // being the check itself.
    render(
      <LobbyView
        match={publicMatch()}
        youId="b"
        isAdmin
        onToggleReady={noop}
        onSelectKingdom={noop}
        onSelectPerks={noop}
        onSpectate={noop}
        onStart={noop}
        onLeave={noop}
      />,
    )
    expect(screen.queryByTestId('room-options-gear')).toBeNull()
  })

  it('does not advertise the rules a public room cannot have', () => {
    // `monstersEnabled` is forced off server-side for a public match, so the
    // summary line has nothing to list — and it must not appear regardless.
    renderPublic(publicMatch())
    expect(screen.queryByTestId('lobby-rules')).toBeNull()
  })

  it('shows the gear to an admin in a private room', () => {
    // The controls belong to a table of friends who agreed to them.
    render(
      <LobbyView
        match={publicMatch({ visibility: 'private', hostId: 'b' })}
        youId="b"
        isAdmin
        onToggleReady={noop}
        onSelectKingdom={noop}
        onSelectPerks={noop}
        onSpectate={noop}
        onStart={noop}
        onLeave={noop}
      />,
    )
    expect(screen.getByTestId('room-options-gear')).toBeTruthy()
  })

  it('hides it from a private room’s non-admin host', () => {
    // Anyone can be a host: you create a room and you are one. These switches
    // are not a host power.
    render(
      <LobbyView
        match={publicMatch({ visibility: 'private', hostId: 'b' })}
        youId="b"
        onToggleReady={noop}
        onSelectKingdom={noop}
        onSelectPerks={noop}
        onSpectate={noop}
        onStart={noop}
        onLeave={noop}
      />,
    )
    expect(screen.queryByTestId('room-options-gear')).toBeNull()
  })

  it('counts down from the deadline the server set', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const startsAt = Date.now() + 12_000
    renderPublic(publicMatch({ startsAt }))

    // Derived from an absolute timestamp, so every client shows the same number
    // regardless of its own latency.
    expect(screen.getByRole('timer').textContent).toContain('12')
  })

  it('says it is waiting when no countdown has started', () => {
    renderPublic(publicMatch({ startsAt: null }))
    expect(screen.getByText(/waiting for players/i)).toBeTruthy()
  })

  it('tells the player the empty seats will be filled', () => {
    // Otherwise a two-person lobby that starts as a seven-way looks like a bug.
    renderPublic(publicMatch({ startsAt: Date.now() + 8_000 }))
    expect(screen.getByText(/empty seats fill with bots/i)).toBeTruthy()
  })
})
