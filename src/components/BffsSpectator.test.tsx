import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BattlefieldView } from './BattlefieldView'
import type { GamePlayer } from '../game/gameState'

/**
 * A spectator watches the field, and Love's BFFS!!! ribbon is a thing that
 * happens ON the field — two castles visibly bound together. It is not private
 * information the way a Blackjack draw is, so the stands should see it.
 */

const players = [
  {
    id: 'a', name: 'A', kingdomId: 'love',
    castle: { hp: 8500, maxHp: 8500, shield: 0 },
    economy: { citizens: 12, currency: 500, incomePerTick: 1.2 },
    target: 'b', eliminated: false, statuses: [],
  },
  {
    id: 'b', name: 'B', kingdomId: 'fire',
    castle: { hp: 8500, maxHp: 8500, shield: 0 },
    economy: { citizens: 12, currency: 500, incomePerTick: 1.2 },
    target: 'a', eliminated: false, statuses: [],
  },
  {
    id: 'c', name: 'C', kingdomId: 'ice',
    castle: { hp: 8500, maxHp: 8500, shield: 0 },
    economy: { citizens: 12, currency: 500, incomePerTick: 1.2 },
    target: null, eliminated: false, statuses: [],
  },
] as unknown as GamePlayer[]

const match = {
  roomCode: '1234',
  phase: 'active',
  hostId: 'a',
  playerCount: 3,
  maxPlayers: 8,
  tick: 100,
  winnerId: null,
  config: {
    roomCode: '1234', maxPlayers: 8, tickRate: 20,
    startingCitizens: 10, startingCastleHp: 10_000,
  },
  players: [
    { id: 'a', name: 'A', kingdomId: 'love', ready: true, connected: true, socketId: 's1' },
    { id: 'b', name: 'B', kingdomId: 'fire', ready: true, connected: true, socketId: 's2' },
    { id: 'c', name: 'C', kingdomId: 'ice', ready: true, connected: true, socketId: 's3' },
  ],
} as never

function renderField(spectator: boolean, youId: string | null) {
  return render(
    <BattlefieldView
      match={match}
      youId={youId as never}
      players={players}
      tick={0}
      volcano={undefined as never}
      caprice={undefined as never}
      centrepiece={undefined as never}
      spectator={spectator}
    />,
  )
}

describe('the BFFS!!! link and who can see it', () => {
  it('is mounted for a spectator', () => {
    // The layer is event-driven and carries no player filter, so what matters
    // is that a spectator's battlefield renders it at all — a gate here would
    // silently deny the stands an effect that is public on the field.
    renderField(true, null)
    expect(screen.getByTestId('bffs-link-layer')).toBeTruthy()
  })

  it('is mounted for a player too', () => {
    renderField(false, 'b')
    expect(screen.getByTestId('bffs-link-layer')).toBeTruthy()
  })

  it('is not hidden the way the Blackjack reveal is', () => {
    // Blackjack IS withheld from spectators — it is the caster's own hand, and
    // showing it gives away a card nobody at the table has seen. The BFFS
    // ribbon is the opposite: it is drawn between two castles in the open.
    const { container } = renderField(true, null)
    const layer = screen.getByTestId('bffs-link-layer')
    expect(layer.getAttribute('aria-hidden')).toBe('true') // decorative, not absent
    expect(container.contains(layer)).toBe(true)
  })

  it('draws a link that formed before this client was watching', () => {
    // ⚠️ THE ACTUAL BUG. Every link used to be built purely from the live
    // `statusApplied` event, so anyone who arrived after it fired — a
    // spectator, who joins mid-match by definition — saw two castles the game
    // state says are bound and nothing between them. Seeded from synced state,
    // the ribbon exists for them too.
    const linked = players.map((p) =>
      p.id === 'a' || p.id === 'b'
        ? { ...p, statuses: [{ id: 'bffsLink', remainingTicks: 200, stacks: 1 }] }
        : p,
    ) as never

    const { container } = render(
      <BattlefieldView
        match={match}
        youId={null as never}
        players={linked}
        tick={0}
        volcano={undefined as never}
        caprice={undefined as never}
        centrepiece={undefined as never}
        spectator
      />,
    )
    const layer = screen.getByTestId('bffs-link-layer')
    expect(container.contains(layer)).toBe(true)
    // The ribbon paths exist for a link taken from state, not just from an event.
    expect(layer.querySelectorAll('path').length).toBeGreaterThan(0)
  })

  it('draws nothing when the pairing cannot be known', () => {
    // The synced status carries no source id, so with two links live at once
    // there is no way to tell which castle is tied to which. Guessing would put
    // a ribbon between the wrong pair, which is worse than none.
    const three = players.map((p) => ({
      ...p,
      statuses: [{ id: 'bffsLink', remainingTicks: 200, stacks: 1 }],
    })) as never

    render(
      <BattlefieldView
        match={match}
        youId={null as never}
        players={three}
        tick={0}
        volcano={undefined as never}
        caprice={undefined as never}
        centrepiece={undefined as never}
        spectator
      />,
    )
    // The layer is still mounted; it simply has no link it can trust.
    expect(screen.getByTestId('bffs-link-layer')).toBeTruthy()
  })
})
