import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LobbyView } from './LobbyView'
import type { LobbyMatch } from '../game/lobby'

const match: LobbyMatch = {
  roomCode: '1234',
  phase: 'lobby',
  hostId: 'a',
  playerCount: 2,
  maxPlayers: 8,
  tick: 0,
  winnerId: null,
  players: [
    { id: 'a', name: 'Alice', kingdomId: 'fire', ready: true, connected: true, socketId: 's1' },
    { id: 'b', name: 'Bob', kingdomId: null, ready: false, connected: true, socketId: 's2' },
  ],
}

const noop = () => {}

describe('LobbyView', () => {
  it('shows the room code, players, host status, and ready status', () => {
    render(
      <LobbyView
        match={match}
        youId="b"
        onToggleReady={noop}
        onSelectKingdom={noop}
        onStart={noop}
        onLeave={noop}
      />,
    )
    expect(screen.getByLabelText('Room code 1234')).toBeTruthy()
    expect(screen.getByText('Alice')).toBeTruthy()
    expect(screen.getByText('Bob')).toBeTruthy()
    expect(screen.getByText('Host')).toBeTruthy() // Alice
    expect(screen.getByText('You')).toBeTruthy() // Bob (youId)
    expect(screen.getByText('Ready')).toBeTruthy() // Alice's ready label
  })

  it('fires callbacks for kingdom select, ready, and leave', () => {
    const onSelectKingdom = vi.fn()
    const onToggleReady = vi.fn()
    const onLeave = vi.fn()
    render(
      <LobbyView
        match={match}
        youId="b"
        onToggleReady={onToggleReady}
        onSelectKingdom={onSelectKingdom}
        onStart={noop}
        onLeave={onLeave}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Water' }))
    expect(onSelectKingdom).toHaveBeenCalledWith('water')

    fireEvent.click(screen.getByRole('button', { name: /ready up/i }))
    expect(onToggleReady).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Leave' }))
    expect(onLeave).toHaveBeenCalledTimes(1)
  })

  it('disables a kingdom already taken by another player', () => {
    // Alice (a) holds "fire"; from Bob's view it should be disabled, others free.
    render(
      <LobbyView
        match={match}
        youId="b"
        onToggleReady={noop}
        onSelectKingdom={noop}
        onStart={noop}
        onLeave={noop}
      />,
    )
    const fire = screen.getByRole('button', { name: /fire/i }) as HTMLButtonElement
    expect(fire.disabled).toBe(true)
    const water = screen.getByRole('button', { name: 'Water' }) as HTMLButtonElement
    expect(water.disabled).toBe(false)
  })

  it('only the host sees Start, and it is gated until everyone is ready', () => {
    // Bob (not host) sees no Start button.
    const { unmount } = render(
      <LobbyView
        match={match}
        youId="b"
        onToggleReady={noop}
        onSelectKingdom={noop}
        onStart={noop}
        onLeave={noop}
      />,
    )
    expect(
      screen.queryByRole('button', { name: /start match|everyone must|need \d/i }),
    ).toBeNull()
    unmount()

    // Alice (host) sees the Start button, disabled with a reason (Bob has no
    // kingdom in the fixture).
    const onStart = vi.fn()
    render(
      <LobbyView
        match={match}
        youId="a"
        onToggleReady={noop}
        onSelectKingdom={noop}
        onStart={onStart}
        onLeave={noop}
      />,
    )
    const start = screen.getByRole('button', {
      name: /everyone must pick a kingdom/i,
    }) as HTMLButtonElement
    expect(start.disabled).toBe(true)
  })

  it('enables Start for the host once all connected players are ready with a kingdom', () => {
    const allReady = {
      ...match,
      players: match.players.map((p, i) => ({
        ...p,
        ready: true,
        kingdomId: p.kingdomId ?? (i === 0 ? 'fire' : 'water'),
      })),
    }
    const onStart = vi.fn()
    render(
      <LobbyView
        match={allReady}
        youId="a"
        onToggleReady={noop}
        onSelectKingdom={noop}
        onStart={onStart}
        onLeave={noop}
      />,
    )
    const start = screen.getByRole('button', { name: 'Start Match' }) as HTMLButtonElement
    expect(start.disabled).toBe(false)
    fireEvent.click(start)
    expect(onStart).toHaveBeenCalledTimes(1)
  })
})
