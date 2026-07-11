import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BattlefieldView } from './BattlefieldView'
import type { LobbyMatch } from '../game/lobby'
import type { GamePlayer } from '../game/gameState'

const match: LobbyMatch = {
  roomCode: '1234',
  phase: 'active',
  hostId: 'a',
  playerCount: 3,
  maxPlayers: 8,
  tick: 100,
  winnerId: null,
  config: {
    roomCode: '1234',
    maxPlayers: 8,
    tickRate: 20,
    startingCitizens: 10,
    startingCastleHp: 10_000,
  },
  players: [
    { id: 'a', name: 'Alice', kingdomId: 'fire', ready: true, connected: true, socketId: 's1' },
    { id: 'b', name: 'Bob', kingdomId: 'water', ready: true, connected: true, socketId: 's2' },
    { id: 'c', name: 'Cleo', kingdomId: 'nature', ready: true, connected: true, socketId: 's3' },
  ],
}

const game = (overrides: Partial<GamePlayer>[] = []): GamePlayer[] => {
  const base: GamePlayer[] = [
    {
      id: 'a',
      name: 'Alice',
      kingdomId: 'fire',
      castle: { hp: 8500, maxHp: 8500, shield: 0 },
      economy: { citizens: 12, currency: 500, incomePerTick: 1.2 },
      target: 'b',
      eliminated: false,
      statuses: [{ id: 'birdsEyeView', remainingTicks: 100, stacks: 1 }], // Have Bird's Eye View to see enemy stats
    },
    {
      id: 'b',
      name: 'Bob',
      kingdomId: 'water',
      castle: { hp: 5000, maxHp: 10_000, shield: 2500 },
      economy: { citizens: 10, currency: 300, incomePerTick: 2 },
      target: 'a',
      eliminated: false,
    },
    {
      id: 'c',
      name: 'Cleo',
      kingdomId: 'nature',
      castle: { hp: 0, maxHp: 10_000, shield: 0 },
      economy: { citizens: 0, currency: 0, incomePerTick: 0 },
      target: null,
      eliminated: true,
    },
  ]
  return base.map((p, i) => ({ ...p, ...overrides[i] }))
}

const site = (container: HTMLElement, id: string) =>
  container.querySelector(`[data-player-id="${id}"]`)!

describe('BattlefieldView', () => {
  it('renders one kingdom site with a castle per player (#192–#194)', () => {
    const { container } = render(<BattlefieldView match={match} youId="a" players={game()} />)
    expect(screen.getAllByTestId('kingdom-site')).toHaveLength(3)
    expect(screen.getAllByTestId('castle')).toHaveLength(3)
    expect(container.querySelector('.battlefield__layer-projectiles')).toBeTruthy()
    expect(screen.getByText('Alice (You)')).toBeTruthy()
    expect(screen.getByText('Bob')).toBeTruthy()
  })

  it('renders health bars proportional to castle HP (#195)', () => {
    const { container } = render(<BattlefieldView match={match} youId="a" players={game()} />)
    const bar = site(container, 'b').querySelector('[data-testid="health-bar"]')!
    expect(bar.getAttribute('data-hp')).toBe('5000')
    const fill = bar.querySelector('[data-testid="health-bar-fill"]')!
    expect(fill.getAttribute('width')).toBe('75') // 150 × (5000/10000)
  })

  it('shows the shield bar only while a shield exists (#196)', () => {
    const { container } = render(<BattlefieldView match={match} youId="a" players={game()} />)
    expect(screen.getAllByTestId('shield-bar')).toHaveLength(1) // only Bob
    expect(site(container, 'b').querySelector('[data-testid="shield-bar"]')!.getAttribute('data-shield')).toBe('2500')
    expect(site(container, 'a').querySelector('[data-testid="shield-bar"]')).toBeNull()
  })

  it('displays citizens and passive income per kingdom (#197, #198)', () => {
    const { container } = render(<BattlefieldView match={match} youId="a" players={game()} />)
    const alice = site(container, 'a')
    expect(alice.querySelector('[data-testid="citizens"]')!.getAttribute('data-citizens')).toBe('12')
    // $1.20/tick × 20 ticks/s = $24.00/s
    expect(alice.querySelector('[data-testid="income"]')!.textContent).toContain('$24.00/s')
  })

  it('draws a target indicator per live targeting pair and rings your target (#199)', () => {
    const { container } = render(<BattlefieldView match={match} youId="a" players={game()} />)
    const indicators = screen.getAllByTestId('target-indicator')
    expect(indicators).toHaveLength(2) // a→b and b→a; Cleo is eliminated
    const yours = indicators.find((el) => el.getAttribute('data-from') === 'a')!
    expect(yours.getAttribute('data-to')).toBe('b')
    // The kingdom you target carries the highlight ring.
    expect(site(container, 'b').querySelector('[data-testid="target-ring"]')).toBeTruthy()
    expect(site(container, 'a').querySelector('[data-testid="target-ring"]')).toBeNull()
  })

  it('updates indicators when targets change', () => {
    const { rerender } = render(<BattlefieldView match={match} youId="a" players={game()} />)
    rerender(
      <BattlefieldView match={match} youId="a" players={game([{ target: null }, {}, {}])} />,
    )
    const indicators = screen.getAllByTestId('target-indicator')
    expect(indicators).toHaveLength(1) // only b→a remains
    expect(indicators[0]!.getAttribute('data-from')).toBe('b')
  })

  it('marks eliminated kingdoms and hides their economy readouts', () => {
    const { container } = render(<BattlefieldView match={match} youId="a" players={game()} />)
    const cleo = site(container, 'c')
    expect(cleo.querySelector('[data-testid="eliminated"]')).toBeTruthy()
    expect(cleo.querySelector('[data-testid="citizens"]')).toBeNull()
    expect(cleo.querySelector('[data-testid="income"]')).toBeNull()
  })

  it('falls back to configured starting values before the first state:sync', () => {
    const { container } = render(<BattlefieldView match={match} youId="a" players={[]} />)
    expect(screen.getAllByTestId('castle')).toHaveLength(3)
    const bar = site(container, 'a').querySelector('[data-testid="health-bar"]')!
    expect(bar.getAttribute('data-max-hp')).toBe('10000')
    expect(screen.queryAllByTestId('target-indicator')).toHaveLength(0)
  })
})
