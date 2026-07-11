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
