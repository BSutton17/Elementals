import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BattlefieldView } from './BattlefieldView'
import { castAbility, changeTarget } from '../game/matchStore'
import type { LobbyMatch } from '../game/lobby'
import type { GamePlayer } from '../game/gameState'

vi.mock('../game/matchStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../game/matchStore')>()
  return {
    ...actual,
    castAbility: vi.fn(async () => ({ ok: true, data: {} })),
    changeTarget: vi.fn(async () => ({ ok: true, data: {} })),
    buyItem: vi.fn(async () => ({ ok: true, data: {} })),
    buyUpgrade: vi.fn(async () => ({ ok: true, data: {} })),
  }
})

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
    expect(screen.queryByText(/Alice/)).toBeNull() // your own name is hidden
    expect(screen.getByText('Bob')).toBeTruthy() // opponents' names still show
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

  // SKIPPED: the target-indicator arrows are intentionally disabled — the
  // `TargetIndicator` render block in BattlefieldView is commented out. The
  // component itself is intact, so re-enable that block and drop these `.skip`s
  // together when the arrows come back.
  it.skip('draws a target indicator per live targeting pair and rings your target (#199)', () => {
    const { container } = render(<BattlefieldView match={match} youId="a" players={game()} />)
    const indicators = screen.getAllByTestId('target-indicator')
    expect(indicators).toHaveLength(2) // a→b and b→a; Cleo is eliminated
    const yours = indicators.find((el) => el.getAttribute('data-from') === 'a')!
    expect(yours.getAttribute('data-to')).toBe('b')
    // The kingdom you target carries the highlight ring.
    expect(site(container, 'b').querySelector('[data-testid="target-ring"]')).toBeTruthy()
    expect(site(container, 'a').querySelector('[data-testid="target-ring"]')).toBeNull()
  })

  // SKIPPED with the above — depends on the disabled target-indicator arrows.
  it.skip('updates indicators when targets change', () => {
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

// --- Air multi-select targeting (Embrace of Winds) ---------------------------------

const airMatch: LobbyMatch = {
  ...match,
  players: [
    { id: 'a', name: 'Ari', kingdomId: 'air', ready: true, connected: true, socketId: 's1' },
    { id: 'b', name: 'Bob', kingdomId: 'water', ready: true, connected: true, socketId: 's2' },
    { id: 'c', name: 'Cleo', kingdomId: 'nature', ready: true, connected: true, socketId: 's3' },
  ],
}

const airGame = (): GamePlayer[] => [
  {
    id: 'a',
    name: 'Ari',
    kingdomId: 'air',
    castle: { hp: 10_000, maxHp: 10_000, shield: 0 },
    economy: { citizens: 12, currency: 5000, incomePerTick: 1.2 },
    target: null,
    eliminated: false,
    unlocked: { aLightBreeze: true },
    cooldowns: { aLightBreeze: 0 },
  },
  {
    id: 'b',
    name: 'Bob',
    kingdomId: 'water',
    castle: { hp: 10_000, maxHp: 10_000, shield: 0 },
    economy: { citizens: 10, currency: 0, incomePerTick: 2 },
    target: null,
    eliminated: false,
  },
  {
    id: 'c',
    name: 'Cleo',
    kingdomId: 'nature',
    castle: { hp: 10_000, maxHp: 10_000, shield: 0 },
    economy: { citizens: 10, currency: 0, incomePerTick: 2 },
    target: null,
    eliminated: false,
  },
]

describe('BattlefieldView — Air multi-select targeting', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lets Air toggle several kingdoms as targets at once', () => {
    const { container } = render(
      <BattlefieldView match={airMatch} youId="a" players={airGame()} />,
    )
    fireEvent.click(screen.getByLabelText('Target Bob'))
    fireEvent.click(screen.getByLabelText('Target Cleo'))

    // Both selected kingdoms carry the highlight ring.
    expect(site(container, 'b').querySelector('[data-testid="target-ring"]')).toBeTruthy()
    expect(site(container, 'c').querySelector('[data-testid="target-ring"]')).toBeTruthy()
    // (The per-selection target-indicator arrows are asserted by the skipped
    // #199 tests above — that render block is currently disabled.)
    // Multi-select is local — it never pushes a single server-side target.
    expect(changeTarget).not.toHaveBeenCalled()
  })

  it('clicking a selected kingdom again removes it from the set', () => {
    const { container } = render(
      <BattlefieldView match={airMatch} youId="a" players={airGame()} />,
    )
    fireEvent.click(screen.getByLabelText('Target Bob'))
    fireEvent.click(screen.getByLabelText('Target Bob')) // toggle off
    expect(site(container, 'b').querySelector('[data-testid="target-ring"]')).toBeNull()
    expect(
      screen.queryAllByTestId('target-indicator').filter((el) => el.getAttribute('data-from') === 'a'),
    ).toHaveLength(0)
  })

  it('casts an attack against the whole selected set', () => {
    render(<BattlefieldView match={airMatch} youId="a" players={airGame()} />)
    fireEvent.click(screen.getByLabelText('Target Bob'))
    fireEvent.click(screen.getByLabelText('Target Cleo'))
    fireEvent.click(screen.getByLabelText('Cast A Light Breeze'))

    expect(castAbility).toHaveBeenCalledWith('aLightBreeze', ['b', 'c'], undefined)
  })

  it('non-multi kingdoms keep single, server-tracked targeting', () => {
    // Alice is Fire — clicking sets one server target, not a local set.
    render(<BattlefieldView match={match} youId="a" players={game()} />)
    fireEvent.click(screen.getByLabelText('Target Bob'))
    expect(changeTarget).toHaveBeenCalledWith('b')
  })
})
