import { describe, it, expect } from 'vitest'
import { matchFromSnapshot, type MatchSnapshot } from './lobby'

describe('matchFromSnapshot', () => {
  it('rebuilds a match view from a reconnection snapshot', () => {
    const snapshot: MatchSnapshot = {
      roomCode: '1234',
      phase: 'active',
      tick: 42,
      serverTime: 1000,
      hostId: 'a',
      winnerId: null,
      maxPlayers: 8,
      config: {
        roomCode: '1234',
        maxPlayers: 8,
        tickRate: 20,
        startingCitizens: 10,
        startingCastleHp: 10000,
      },
      you: { id: 'b', name: 'Bob', kingdomId: 'water', ready: true, connected: true, socketId: 's' },
      players: [
        { id: 'a', name: 'Alice', kingdomId: 'fire', ready: true, connected: true, socketId: 's1' },
        { id: 'b', name: 'Bob', kingdomId: 'water', ready: true, connected: true, socketId: 's2' },
      ],
      projectiles: [],
    }

    const match = matchFromSnapshot(snapshot)
    expect(match.roomCode).toBe('1234')
    expect(match.phase).toBe('active')
    expect(match.tick).toBe(42)
    expect(match.playerCount).toBe(2)
    expect(match.hostId).toBe('a')
    expect(match.config?.startingCastleHp).toBe(10000)
  })
})
