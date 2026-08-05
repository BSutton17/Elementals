import { describe, it, expect } from 'vitest'
import {
  applyStateSync,
  clearGameState,
  getGameState,
  subscribeGame,
  type GamePlayer,
} from './gameState'

const player = (id: string, overrides: Partial<GamePlayer> = {}): GamePlayer => ({
  id,
  name: id,
  kingdomId: 'water',
  castle: { hp: 10_000, maxHp: 10_000, shield: 0 },
  economy: { citizens: 10, currency: 0, incomePerTick: 1 },
  target: null,
  eliminated: false,
  ...overrides,
})

describe('gameState store', () => {
  it('applies state:sync payloads and notifies subscribers', () => {
    let notified = 0
    const unsubscribe = subscribeGame(() => notified++)

    applyStateSync({
      tick: 42,
      serverTime: 1234,
      players: [player('a', { target: 'b' }), player('b')],
    })

    const state = getGameState()
    expect(state.tick).toBe(42)
    expect(state.players).toHaveLength(2)
    expect(state.players[0]!.target).toBe('b')
    expect(notified).toBe(1)

    unsubscribe()
    clearGameState()
  })

  it('clears back to an empty state', () => {
    applyStateSync({ tick: 7, serverTime: 1, players: [player('a')] })
    clearGameState()
    const state = getGameState()
    expect(state.tick).toBe(0)
    expect(state.players).toHaveLength(0)
  })
})

describe('the volcano in synced state', () => {
  const volcano = { ownerId: 'm', hp: 2400, maxHp: 3000, ticksRemaining: 200 }

  it('carries the volcano through to the store', () => {
    // The volcano arrives on `state:sync`, not as an event — if the store
    // drops it, nothing downstream can draw it and the ultimate looks like it
    // did nothing at all.
    applyStateSync({ tick: 5, serverTime: 1, players: [player('a')], volcano })
    expect(getGameState().volcano).toEqual(volcano)
  })

  it('clears it again when the server says it is gone', () => {
    applyStateSync({ tick: 5, serverTime: 1, players: [player('a')], volcano })
    applyStateSync({ tick: 6, serverTime: 1, players: [player('a')], volcano: null })
    expect(getGameState().volcano).toBeNull()
  })

  it('treats a payload with no volcano field as no volcano', () => {
    // A server that has not been rebuilt sends no `volcano` at all. That has to
    // read as "none standing", not as undefined leaking into the renderer.
    applyStateSync({ tick: 5, serverTime: 1, players: [player('a')], volcano })
    applyStateSync({ tick: 6, serverTime: 1, players: [player('a')] })
    expect(getGameState().volcano).toBeNull()
  })

  it('is cleared with the rest of the state on leaving a match', () => {
    applyStateSync({ tick: 5, serverTime: 1, players: [player('a')], volcano })
    clearGameState()
    expect(getGameState().volcano).toBeNull()
  })
})
