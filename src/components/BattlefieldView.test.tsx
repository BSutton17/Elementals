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
    // EVERY kingdom is named now, your own included - it used to be hidden.
    expect(screen.getByText('Alice')).toBeTruthy()
    expect(screen.getByText('Bob')).toBeTruthy()
  })

  it('marks your own name so you can find your castle among seven', () => {
    // The reason the name was hidden was "you know it's yours". Now that they
    // all show, something else has to answer that at a glance.
    const { container } = render(<BattlefieldView match={match} youId="a" players={game()} />)
    const mine = site(container, 'a').querySelector('[data-testid="kingdom-name"]')!
    const theirs = site(container, 'b').querySelector('[data-testid="kingdom-name"]')!
    expect(mine.classList.contains('battlefield__name--you')).toBe(true)
    expect(theirs.classList.contains('battlefield__name--you')).toBe(false)
  })

  it('shows a level beside the name, and nothing for players without one', () => {
    // Guests and bots have no level. A dash or a zero would read as a
    // rendering fault rather than as "this player has no account".
    const players = game()
    players[0]!.level = 12
    const { container } = render(<BattlefieldView match={match} youId="a" players={players} />)
    expect(
      site(container, 'a').querySelector('[data-testid="kingdom-level"]')!.textContent,
    ).toBe('12')
    expect(site(container, 'b').querySelector('[data-testid="kingdom-level"]')).toBeNull()
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

    expect(castAbility).toHaveBeenCalledWith('aLightBreeze', ['b', 'c'], undefined, undefined)
  })

  it('non-multi kingdoms keep single, server-tracked targeting', () => {
    // Alice is Fire — clicking sets one server target, not a local set.
    render(<BattlefieldView match={match} youId="a" players={game()} />)
    fireEvent.click(screen.getByLabelText('Target Bob'))
    expect(changeTarget).toHaveBeenCalledWith('b')
  })
})

// The host can let a knocked-out player keep watching the board properly.
describe('eliminated vision (host rule)', () => {
  const barsVisible = (container: HTMLElement) =>
    container.querySelectorAll('[data-testid="health-bar"]').length

  // The shared fixture hands Alice a Bird's Eye View status so other tests can
  // read enemy stats. That would mask this rule entirely, so these start from a
  // player with no vision of their own.
  const blind = (overrides: Partial<GamePlayer> = {}) =>
    game([{ statuses: [], ...overrides }])

  it("hides other kingdoms' health from a living player, as normal", () => {
    const { container } = render(
      <BattlefieldView match={match} youId="a" players={blind()} />,
    )
    // Only your own bar — everyone else's is hidden while you're alive.
    expect(barsVisible(container)).toBe(1)
  })

  it('still hides them from an eliminated player when the rule is off', () => {
    const { container } = render(
      <BattlefieldView match={match} youId="a" players={blind({ eliminated: true })} />,
    )
    expect(barsVisible(container)).toBe(1)
  })

  it('shows every kingdom once you are eliminated and the host allowed it', () => {
    const { container } = render(
      <BattlefieldView
        match={{ ...match, eliminatedSeeAllHealth: true }}
        youId="a"
        players={blind({ eliminated: true })}
      />,
    )
    expect(barsVisible(container)).toBe(3)
  })

  it('grants a LIVING player nothing, even with the rule on', () => {
    // The rule is about watching after you're out — it must never become a
    // vision advantage for someone still in the game.
    const { container } = render(
      <BattlefieldView
        match={{ ...match, eliminatedSeeAllHealth: true }}
        youId="a"
        players={blind()}
      />,
    )
    expect(barsVisible(container)).toBe(1)
  })
})

// The besieged bonus raises your gold production silently — the number just
// moves. The marker is the only thing that says why.
describe('besieged boost marker', () => {
  // Cleo is eliminated in the shared fixture; these need her alive to besiege.
  const targeting = (targets: (string | null)[]) =>
    game([
      { statuses: [], target: targets[0] },
      { target: targets[1] },
      { target: targets[2], eliminated: false },
    ])

  it('is hidden in a fair fight — one attacker earns nothing', () => {
    // Only Bob is on you; Cleo is targeting nobody.
    const { queryByTestId } = render(
      <BattlefieldView match={match} youId="a" players={targeting([null, 'a', null])} />,
    )
    expect(queryByTestId('besieged-boost')).toBeNull()
  })

  it('shows once a second kingdom piles on', () => {
    const { getByTestId } = render(
      <BattlefieldView match={match} youId="a" players={targeting([null, 'a', 'a'])} />,
    )
    expect(getByTestId('besieged-boost')).toBeTruthy()
  })

  it('ignores kingdoms attacking someone else', () => {
    const { queryByTestId } = render(
      <BattlefieldView match={match} youId="a" players={targeting([null, 'c', 'b'])} />,
    )
    expect(queryByTestId('besieged-boost')).toBeNull()
  })

  it('does not count an eliminated attacker', () => {
    // Cleo is eliminated in the fixture, so her target must not prop up the
    // count — a dead kingdom is not besieging anyone.
    const players = game([
      { statuses: [], target: null },
      { target: 'a' },
      { target: 'a', eliminated: true },
    ])
    const { queryByTestId } = render(
      <BattlefieldView match={match} youId="a" players={players} />,
    )
    expect(queryByTestId('besieged-boost')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Magma's volcano. It arrives on `state:sync` rather than as an event, so the
// whole chain — sync payload → store → screen → view → layer — has to be
// wired for it to appear at all.
// ---------------------------------------------------------------------------

describe('the volcano on the battlefield', () => {
  const volcano = { ownerId: 'c', hp: 2400, maxHp: 3000, ticksRemaining: 200 }

  it('appears in the middle of the field for everyone', () => {
    const { container } = render(
      <BattlefieldView match={match} youId="a" players={game()} volcano={volcano} />,
    )
    expect(container.querySelector('[data-testid="volcano"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="volcano-hud"]')).not.toBeNull()
  })

  it('is absent when there is no volcano', () => {
    const { container } = render(
      <BattlefieldView match={match} youId="a" players={game()} />,
    )
    expect(container.querySelector('[data-testid="volcano"]')).toBeNull()
  })

  it('can be clicked to target it, and tells the server', () => {
    const { container } = render(
      <BattlefieldView match={match} youId="a" players={game()} volcano={volcano} />,
    )
    fireEvent.click(container.querySelector('[data-testid="volcano-hit"]')!)
    expect(changeTarget).toHaveBeenCalledWith('__volcano__')
  })

  it('gives Magma no way to attack its own eruption', () => {
    // 'c' owns it. The server rejects the target, so the click must not exist.
    const { container } = render(
      <BattlefieldView match={match} youId="c" players={game()} volcano={volcano} />,
    )
    expect(container.querySelector('[data-testid="volcano"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="volcano-hit"]')).toBeNull()
  })

  it('shows spectators the mountain but no way to hit it', () => {
    const { container } = render(
      <BattlefieldView match={match} youId={null} players={game()} volcano={volcano} spectator />,
    )
    expect(container.querySelector('[data-testid="volcano"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="volcano-hit"]')).toBeNull()
  })
})
