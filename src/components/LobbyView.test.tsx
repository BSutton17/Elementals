import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LobbyView } from './LobbyView'
import type { LobbyMatch } from '../game/lobby'

/** A full perk selection, so a fixture player can ready up. */
const PERKS = ['sharperSwords', 'extraGuards']

const match: LobbyMatch = {
  roomCode: '1234',
  phase: 'lobby',
  hostId: 'a',
  playerCount: 2,
  maxPlayers: 8,
  tick: 0,
  winnerId: null,
  players: [
    { id: 'a', name: 'Alice', kingdomId: 'fire', perks: PERKS, ready: true, connected: true, socketId: 's1' },
    { id: 'b', name: 'Bob', kingdomId: null, perks: [], ready: false, connected: true, socketId: 's2' },
  ],
}

const noop = () => {}

/** Renders the view with every callback stubbed unless overridden. */
function renderLobby(props: Partial<Parameters<typeof LobbyView>[0]> = {}) {
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
      {...props}
    />,
  )
}

describe('LobbyView', () => {
  it('shows the room code, players, host status, and ready status', () => {
    renderLobby()
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
    // Bob has a kingdom and both perks here, so Ready Up is unlocked.
    const readyable: LobbyMatch = {
      ...match,
      players: match.players.map((p) =>
        p.id === 'b' ? { ...p, kingdomId: 'water', perks: PERKS } : p,
      ),
    }
    renderLobby({ match: readyable, onSelectKingdom, onToggleReady, onLeave })

    fireEvent.click(screen.getByRole('button', { name: 'Water' }))
    expect(onSelectKingdom).toHaveBeenCalledWith('water')

    fireEvent.click(screen.getByRole('button', { name: /ready up/i }))
    expect(onToggleReady).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Leave' }))
    expect(onLeave).toHaveBeenCalledTimes(1)
  })

  it('disables a kingdom already taken by another player', () => {
    // Alice (a) holds "fire"; from Bob's view it should be disabled, others free.
    renderLobby()
    const fire = screen.getByRole('button', { name: /fire/i }) as HTMLButtonElement
    expect(fire.disabled).toBe(true)
    const water = screen.getByRole('button', { name: 'Water' }) as HTMLButtonElement
    expect(water.disabled).toBe(false)
  })

  it('only the host sees Start, and it is gated until everyone is ready', () => {
    // Bob (not host) sees no Start button.
    const { unmount } = renderLobby()
    expect(
      screen.queryByRole('button', { name: /start match|everyone must|need \d/i }),
    ).toBeNull()
    unmount()

    // Alice (host) sees the Start button, disabled with a reason (Bob has no
    // kingdom in the fixture).
    renderLobby({ youId: 'a', onStart: vi.fn() })
    const start = screen.getByRole('button', {
      name: /everyone must pick a kingdom/i,
    }) as HTMLButtonElement
    expect(start.disabled).toBe(true)
  })

  it('blocks Start while someone still owes perks', () => {
    const kingdomsOnly: LobbyMatch = {
      ...match,
      players: match.players.map((p, i) => ({
        ...p,
        ready: true,
        kingdomId: p.kingdomId ?? (i === 0 ? 'fire' : 'water'),
        perks: i === 0 ? PERKS : ['sharperSwords'], // Bob is one perk short
      })),
    }
    renderLobby({ match: kingdomsOnly, youId: 'a' })
    const start = screen.getByRole('button', {
      name: /everyone must pick 2 perks/i,
    }) as HTMLButtonElement
    expect(start.disabled).toBe(true)
  })

  it('enables Start for the host once all connected players are ready with a kingdom and perks', () => {
    const allReady: LobbyMatch = {
      ...match,
      players: match.players.map((p, i) => ({
        ...p,
        ready: true,
        kingdomId: p.kingdomId ?? (i === 0 ? 'fire' : 'water'),
        perks: PERKS,
      })),
    }
    const onStart = vi.fn()
    renderLobby({ match: allReady, youId: 'a', onStart })
    const start = screen.getByRole('button', { name: 'Start Match' }) as HTMLButtonElement
    expect(start.disabled).toBe(false)
    fireEvent.click(start)
    expect(onStart).toHaveBeenCalledTimes(1)
  })
})

describe('LobbyView perks', () => {
  it('cannot ready up without a kingdom or without a full perk set', () => {
    // Bob: no kingdom, no perks.
    const { unmount } = renderLobby()
    const noKingdom = screen.getByRole('button', {
      name: /pick a kingdom first/i,
    }) as HTMLButtonElement
    expect(noKingdom.disabled).toBe(true)
    unmount()

    // Bob: kingdom + one perk — still one short.
    const onePerk: LobbyMatch = {
      ...match,
      players: match.players.map((p) =>
        p.id === 'b' ? { ...p, kingdomId: 'water', perks: ['deepPockets'] } : p,
      ),
    }
    renderLobby({ match: onePerk })
    const onePerkBtn = screen.getByRole('button', {
      name: /pick 1 more perk/i,
    }) as HTMLButtonElement
    expect(onePerkBtn.disabled).toBe(true)
  })

  it('toggles a perk on, and reports the whole new selection', () => {
    const onSelectPerks = vi.fn()
    renderLobby({ onSelectPerks })
    fireEvent.click(screen.getByRole('button', { name: /deep pockets/i }))
    expect(onSelectPerks).toHaveBeenCalledWith(['deepPockets'])
  })

  it('toggles a picked perk back off', () => {
    const onSelectPerks = vi.fn()
    const picked: LobbyMatch = {
      ...match,
      players: match.players.map((p) =>
        p.id === 'b' ? { ...p, perks: ['deepPockets', 'extraMedics'] } : p,
      ),
    }
    renderLobby({ match: picked, onSelectPerks })
    fireEvent.click(screen.getByRole('button', { name: /deep pockets/i }))
    expect(onSelectPerks).toHaveBeenCalledWith(['extraMedics'])
  })

  it('locks the unpicked perks once two are chosen', () => {
    const picked: LobbyMatch = {
      ...match,
      players: match.players.map((p) =>
        p.id === 'b' ? { ...p, perks: ['deepPockets', 'extraMedics'] } : p,
      ),
    }
    renderLobby({ match: picked })
    const chosen = screen.getByRole('button', { name: /deep pockets/i }) as HTMLButtonElement
    const other = screen.getByRole('button', { name: /sharper swords/i }) as HTMLButtonElement
    expect(chosen.disabled).toBe(false) // still swappable
    expect(other.disabled).toBe(true)
  })

  it("shows every player's chosen perks next to their name", () => {
    renderLobby()
    // Alice's two perks are labelled in the roster.
    expect(screen.getAllByLabelText('Sharper Swords').length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText('Extra Guards').length).toBeGreaterThan(0)
  })
})
