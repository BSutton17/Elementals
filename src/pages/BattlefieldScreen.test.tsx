import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BattlefieldScreen } from './BattlefieldScreen'
import type { GamePlayer, MonsterSnapshot } from '../game/gameState'
import type { LobbyMatch } from '../game/lobby'

/**
 * What the battlefield SCREEN hands down to the arena.
 *
 * ⚠️ THIS FILE EXISTS BECAUSE THE SCREEN HAS TWO RENDER PATHS AND ONLY ONE OF
 * THEM WAS WIRED. Spectators saw the monster; players — everyone who actually
 * plays the game — got `undefined`, so the creature never drew and its hit area
 * never existed. Every unit test around the layer passed the whole time,
 * because the layer was never the broken part. Anything the arena needs is
 * asserted here for BOTH paths.
 */

const monster = (): MonsterSnapshot => ({
  hp: 8000,
  maxHp: 10_000,
  attackDamage: 900,
  ticksUntilAttack: 120,
  kind: 'dragon',
})

const state = {
  players: [] as GamePlayer[],
  tick: 100,
  serverTime: 0,
  volcano: null,
  monster: monster() as MonsterSnapshot | null,
  caprice: null,
  centrepiece: null,
}

const lobby = { match: null as LobbyMatch | null, youId: 'a' }

vi.mock('../game/useGameState', () => ({ useGameState: () => state }))
vi.mock('../game/useLobby', () => ({ useLobby: () => lobby }))

const player = (id: string, kingdomId: string): GamePlayer => ({
  id,
  name: id,
  kingdomId,
  castle: { hp: 10_000, maxHp: 10_000, shield: 0 },
  economy: { citizens: 10, currency: 500, incomePerTick: 1 },
  target: null,
  eliminated: false,
})

const match = (spectator: boolean): LobbyMatch => ({
  roomCode: '1234',
  phase: 'active',
  hostId: 'a',
  playerCount: 2,
  maxPlayers: 8,
  tick: 100,
  winnerId: null,
  config: {
    roomCode: '1234',
    maxPlayers: 8,
    tickRate: 20,
    startingCitizens: 10,
    startingCastleHp: 10_000,
    playerCount: 2,
  },
  players: [
    { id: 'a', name: 'Alice', kingdomId: 'fire', ready: true, connected: true, socketId: 's1', spectator },
    { id: 'b', name: 'Bob', kingdomId: 'water', ready: true, connected: true, socketId: 's2' },
  ],
})

describe('BattlefieldScreen', () => {
  beforeEach(() => {
    state.players = [player('a', 'fire'), player('b', 'water')]
    state.monster = monster()
    lobby.match = match(false)
  })

  it('draws the monster for a PLAYER, and lets them attack it', () => {
    const { container } = render(<BattlefieldScreen />)
    expect(container.querySelector('[data-testid="monster"]')).toBeTruthy()
    // The hit area is the half that was actually reported broken: invisible AND
    // unclickable.
    expect(screen.getByTestId('monster-hit')).toBeTruthy()
  })

  it('draws it for a spectator too, without a way to hit it', () => {
    lobby.match = match(true)
    const { container } = render(<BattlefieldScreen />)
    expect(container.querySelector('[data-testid="monster"]')).toBeTruthy()
    expect(screen.queryByTestId('monster-hit')).toBeNull()
  })

  it('draws nothing when there is no monster', () => {
    state.monster = null
    const { container } = render(<BattlefieldScreen />)
    expect(container.querySelector('[data-testid="monster"]')).toBeNull()
  })
})
