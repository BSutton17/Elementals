import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AbilityBar } from './AbilityBar'

// Mock abilities definition mapping to avoid testing dependencies on the real registry
const mockAbilities = [
  { id: 'fireball', level: 1, cooldownRemaining: 0, enabled: true, cost: 100, upgradeCost: 150 },
  { id: 'scorchingSun', level: 0, cooldownRemaining: 0, enabled: true, cost: 250, upgradeCost: 200 },
  { id: 'firenado', level: 2, cooldownRemaining: 40, enabled: true, cost: 400, upgradeCost: 450 },
  { id: 'heatWave', level: 1, cooldownRemaining: 0, enabled: true, cost: 150, upgradeCost: 200 },
  { id: 'blazingDetermination', level: 1, cooldownRemaining: 0, enabled: true, cost: 200, upgradeCost: 250 },
]

describe('AbilityBar', () => {
  it('renders player stats (gold, income, citizens, HP, and shield)', () => {
    render(
      <AbilityBar
        kingdomId="fire"
        theme={null}
        currency={500}
        citizens={12}
        castleHp={8500}
        maxCastleHp={10000}
        shieldHp={2000}
        nextCitizenCost={15}
        nextRepairCost={1000}
        shieldCost={50}
        repairsUsed={0}
        maxRepairs={3}
        incomePerSecond={24.0}
        abilities={mockAbilities}
        tickRate={20}
        onCastAbility={() => {}}
        onUpgradeAbility={() => {}}
        onBuyItem={() => {}}
      />
    )

    // Check stats are rendered correctly
    expect(screen.getByText(/500g/)).toBeTruthy()
    expect(screen.getByText(/\+24\.0\/s/)).toBeTruthy()
    expect(screen.getByText('12')).toBeTruthy()
    expect(screen.getByText('Citizens')).toBeTruthy()
    // Only current HP is shown (max HP is omitted to keep the readout compact).
    expect(screen.getByText(/8,500/)).toBeTruthy()
    expect(screen.queryByText(/10,000/)).toBeNull()
    expect(screen.getByText(/2000 Shield/)).toBeTruthy()
  })

  it('renders all 5 active capabilities for the selected kingdom', () => {
    render(
      <AbilityBar
        kingdomId="fire"
        theme={null}
        currency={500}
        citizens={10}
        castleHp={10000}
        maxCastleHp={10000}
        shieldHp={0}
        nextCitizenCost={10}
        nextRepairCost={1000}
        shieldCost={50}
        repairsUsed={0}
        maxRepairs={3}
        incomePerSecond={20}
        abilities={mockAbilities}
        tickRate={20}
        onCastAbility={() => {}}
        onUpgradeAbility={() => {}}
        onBuyItem={() => {}}
      />
    )

    // Fire active abilities: Fireball, Scorching Sun, Firenado, Heat Wave, Blazing Determination.
    // Scorching Sun is level 0 in mockAbilities, so its card is a buy button.
    expect(screen.getByLabelText('Cast Fireball')).toBeTruthy()
    expect(screen.getByLabelText('Unlock Scorching Sun')).toBeTruthy()
    expect(screen.getByLabelText('Cast Firenado')).toBeTruthy()
    expect(screen.getByLabelText('Cast Heat Wave')).toBeTruthy()
    expect(screen.getByLabelText('Cast Blazing Determination')).toBeTruthy()
  })

  it('handles ability cast triggers and upgrade commands', () => {
    const onCast = vi.fn()
    const onUpgrade = vi.fn()

    render(
      <AbilityBar
        kingdomId="fire"
        theme={null}
        currency={500}
        citizens={10}
        castleHp={10000}
        maxCastleHp={10000}
        shieldHp={0}
        nextCitizenCost={10}
        nextRepairCost={1000}
        shieldCost={50}
        repairsUsed={0}
        maxRepairs={3}
        incomePerSecond={20}
        abilities={mockAbilities}
        tickRate={20}
        onCastAbility={onCast}
        onUpgradeAbility={onUpgrade}
        onBuyItem={() => {}}
      />
    )

    // Click cast Fireball (non-charge abilities pass no charge count, and no
    // choice — only a choice-bearing card like Yin and Yang supplies one)
    fireEvent.click(screen.getByLabelText('Cast Fireball'))
    expect(onCast).toHaveBeenCalledWith('fireball', undefined, undefined)

    // Click upgrade Fireball (needs enough currency, Fireball upgradeCost = 150g, currency = 500g, so clickable)
    const upgradeBtns = screen.getAllByRole('button', { name: /Upgrade/ })
    // The first upgrade button belongs to Fireball (mockAbilities[0])
    fireEvent.click(upgradeBtns[0]!)
    expect(onUpgrade).toHaveBeenCalledWith('fireball')
  })

  it('shows locked icon for un-upgraded abilities (level 0)', () => {
    render(
      <AbilityBar
        kingdomId="fire"
        theme={null}
        currency={500}
        citizens={10}
        castleHp={10000}
        maxCastleHp={10000}
        shieldHp={0}
        nextCitizenCost={10}
        nextRepairCost={1000}
        shieldCost={50}
        repairsUsed={0}
        maxRepairs={3}
        incomePerSecond={20}
        abilities={mockAbilities}
        tickRate={20}
        onCastAbility={() => {}}
        onUpgradeAbility={() => {}}
        onBuyItem={() => {}}
      />
    )

    // Scorching Sun has level 0 in mockAbilities — locked, buyable by clicking
    const scorchBtn = screen.getByLabelText('Unlock Scorching Sun')
    expect(scorchBtn.querySelector('.ability-button__locked-overlay')).toBeTruthy()
  })

  it('renders cooldown sweep clock on active cooldown abilities', () => {
    render(
      <AbilityBar
        kingdomId="fire"
        theme={null}
        currency={500}
        citizens={10}
        castleHp={10000}
        maxCastleHp={10000}
        shieldHp={0}
        nextCitizenCost={10}
        nextRepairCost={1000}
        shieldCost={50}
        repairsUsed={0}
        maxRepairs={3}
        incomePerSecond={20}
        abilities={mockAbilities}
        tickRate={20}
        onCastAbility={() => {}}
        onUpgradeAbility={() => {}}
        onBuyItem={() => {}}
      />
    )

    // Firenado has cooldownRemaining = 40 ticks
    const firenadoBtn = screen.getByLabelText('Cast Firenado')
    expect(firenadoBtn.querySelector('.ability-button__cooldown-overlay')).toBeTruthy()
    // 40 ticks / 20 tickRate = 2.0s
    expect(firenadoBtn.querySelector('.ability-button__cooldown-text')!.textContent).toBe('2.0s')
  })

  it('toggles Repairs & Shields menu and triggers buy operations', () => {
    const onBuy = vi.fn()

    render(
      <AbilityBar
        kingdomId="fire"
        theme={null}
        currency={5000}
        citizens={10}
        castleHp={8000} // damaged so repairs are active
        maxCastleHp={10000}
        shieldHp={0}
        nextCitizenCost={15}
        nextRepairCost={1000}
        shieldCost={50}
        repairsUsed={0}
        maxRepairs={3}
        incomePerSecond={20}
        abilities={mockAbilities}
        tickRate={20}
        onCastAbility={() => {}}
        onUpgradeAbility={() => {}}
        onBuyItem={onBuy}
      />
    )

    // Shop overlay starts closed
    expect(screen.queryByTestId('shop-overlay')).toBeNull()

    // Click toggle button
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Repairs and Shield Menu' }))

    // Shop overlay should open
    expect(screen.getByTestId('shop-overlay')).toBeTruthy()

    // Trigger hire citizen
    fireEvent.click(screen.getByRole('button', { name: 'Buy (15g)' }))
    expect(onBuy).toHaveBeenCalledWith('citizen')

    // Trigger repair (flat 1000g base cost, capped at 3 per match)
    fireEvent.click(screen.getByRole('button', { name: 'Buy (1000g)' }))
    expect(onBuy).toHaveBeenCalledWith('repair')

    // Trigger shield
    fireEvent.click(screen.getByRole('button', { name: 'Buy (50g)' }))
    expect(onBuy).toHaveBeenCalledWith('shield')

    // Close shop
    fireEvent.click(screen.getByRole('button', { name: 'Close Shop' }))
    expect(screen.queryByTestId('shop-overlay')).toBeNull()
  })

  it('Toxic Gas locks the Repairs & Shields menu shut', () => {
    const { rerender } = render(
      <AbilityBar
        kingdomId="fire"
        theme={null}
        currency={5000}
        citizens={10}
        castleHp={8000}
        maxCastleHp={10000}
        shieldHp={0}
        nextCitizenCost={15}
        nextRepairCost={1000}
        shieldCost={50}
        repairsUsed={0}
        maxRepairs={3}
        incomePerSecond={20}
        abilities={mockAbilities}
        tickRate={20}
        onCastAbility={() => {}}
        onUpgradeAbility={() => {}}
        onBuyItem={() => {}}
      />
    )

    // Open the menu, then toxic gas lands → it force-closes and cannot reopen.
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Repairs and Shield Menu' }))
    expect(screen.getByTestId('shop-overlay')).toBeTruthy()

    rerender(
      <AbilityBar
        kingdomId="fire"
        theme={null}
        currency={5000}
        citizens={10}
        castleHp={8000}
        maxCastleHp={10000}
        shieldHp={0}
        nextCitizenCost={15}
        nextRepairCost={1000}
        shieldCost={50}
        repairsUsed={0}
        maxRepairs={3}
        lockedOut
        incomePerSecond={20}
        abilities={mockAbilities}
        tickRate={20}
        onCastAbility={() => {}}
        onUpgradeAbility={() => {}}
        onBuyItem={() => {}}
      />
    )

    // Menu force-closed; the button is disabled and shows the sealed label.
    expect(screen.queryByTestId('shop-overlay')).toBeNull()
    const sealed = screen.getByRole('button', { name: 'Repairs and Shields sealed by Toxic Gas' })
    expect((sealed as HTMLButtonElement).disabled).toBe(true)

    // Clicking the sealed button does nothing.
    fireEvent.click(sealed)
    expect(screen.queryByTestId('shop-overlay')).toBeNull()
  })

  it('Frozen ices over the action buttons and seals the shop', () => {
    const onCast = vi.fn()
    const { container } = render(
      <AbilityBar
        kingdomId="fire"
        theme={null}
        currency={5000}
        citizens={10}
        castleHp={8000}
        maxCastleHp={10000}
        shieldHp={0}
        nextCitizenCost={15}
        nextRepairCost={1000}
        shieldCost={50}
        repairsUsed={0}
        maxRepairs={3}
        frozen
        incomePerSecond={20}
        abilities={mockAbilities}
        tickRate={20}
        onCastAbility={onCast}
        onUpgradeAbility={() => {}}
        onBuyItem={() => {}}
      />
    )

    // A frost coat seals each ability card plus the shop toggle, and snow drifts
    // over the whole bar.
    expect(container.querySelectorAll('.frost-coat').length).toBeGreaterThan(0)
    expect(container.querySelector('.ability-bar__frost-snow')).toBeTruthy()

    // The shop toggle is frozen solid (disabled, can't open).
    const shop = screen.getByRole('button', { name: 'Repairs and Shields frozen solid' })
    expect((shop as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(shop)
    expect(screen.queryByTestId('shop-overlay')).toBeNull()

    // Clicking a frozen ability card cracks the ice instead of casting: the
    // frost coat intercepts the click, so no cast fires.
    const coat = container.querySelector('.frost-coat')!
    fireEvent.click(coat)
    expect(onCast).not.toHaveBeenCalled()
  })
})

// Dark's Never-ending Nightmare locks the victim to their basic attack. The
// client's rule has to match the server's exactly (`basicAttackIdFor` + the
// attack/ultimate check), or a card looks castable and is then refused.
describe('Never-ending Nightmare bars illegal moves', () => {
  const darkAbilities = [
    { id: 'shadowStrike', level: 1, cooldownRemaining: 0, enabled: true, cost: 100, upgradeCost: 150 },
    { id: 'yinAndYang', level: 1, cooldownRemaining: 0, enabled: true, cost: 200, upgradeCost: 250 },
    { id: 'unlimitedRage', level: 1, cooldownRemaining: 0, enabled: true, cost: 600, upgradeCost: 1000 },
    { id: 'neverEndingNightmare', level: 1, cooldownRemaining: 0, enabled: true, cost: 300, upgradeCost: 400 },
    { id: 'infinitumTenebrae', level: 1, cooldownRemaining: 0, enabled: true, cost: 800, upgradeCost: 1200 },
  ]

  const renderDark = (nightmared: boolean) =>
    render(
      <AbilityBar
        kingdomId="dark"
        theme={null}
        currency={5000}
        citizens={12}
        castleHp={10000}
        maxCastleHp={10000}
        shieldHp={0}
        nextCitizenCost={15}
        nextRepairCost={1000}
        shieldCost={50}
        repairsUsed={0}
        maxRepairs={3}
        incomePerSecond={24}
        abilities={darkAbilities}
        tickRate={20}
        nightmared={nightmared}
        onCastAbility={() => {}}
        onUpgradeAbility={() => {}}
        onBuyItem={() => {}}
      />,
    )

  it('marks nothing while the victim is free', () => {
    const { container } = renderDark(false)
    expect(container.querySelectorAll('.ability-button--barred')).toHaveLength(0)
    expect(container.querySelectorAll('[data-testid="barred-sign"]')).toHaveLength(0)
  })

  it('bars every attack but the basic one, and the ultimate', () => {
    const { container } = renderDark(true)
    // shadowStrike (basic attack) and neverEndingNightmare (utility) stay legal;
    // yinAndYang, unlimitedRage (attacks) and infinitumTenebrae (ultimate) do not.
    expect(container.querySelectorAll('.ability-button--barred')).toHaveLength(3)
    expect(container.querySelectorAll('[data-testid="barred-sign"]')).toHaveLength(3)
  })

  it('leaves the basic attack castable — it is the one legal move', () => {
    const { container } = renderDark(true)
    const cards = [...container.querySelectorAll('.ability-button')]
    const basic = cards[0]!
    expect(basic.className).not.toContain('ability-button--barred')
    expect((basic as HTMLButtonElement).disabled).toBe(false)
  })

  it('a barred card cannot be clicked at all', () => {
    const onCast = vi.fn()
    const { container } = render(
      <AbilityBar
        kingdomId="dark"
        theme={null}
        currency={5000}
        citizens={12}
        castleHp={10000}
        maxCastleHp={10000}
        shieldHp={0}
        nextCitizenCost={15}
        nextRepairCost={1000}
        shieldCost={50}
        repairsUsed={0}
        maxRepairs={3}
        incomePerSecond={24}
        abilities={darkAbilities}
        tickRate={20}
        nightmared
        onCastAbility={onCast}
        onUpgradeAbility={() => {}}
        onBuyItem={() => {}}
      />,
    )
    const barred = container.querySelector('.ability-button--barred') as HTMLButtonElement
    expect(barred.disabled).toBe(true)
    fireEvent.click(barred)
    expect(onCast).not.toHaveBeenCalled()
  })
})

describe('only one thing may hold the middle of the battlefield', () => {
  // Magma's volcano and Insects' butterfly both claim the centre of the field
  // and contradict each other, so while either stands the other cannot be cast.
  // The server owns the rule; this bar only has to show it, so a player never
  // spends a click discovering their ultimate is unavailable.

  const magmaAbilities = [
    { id: 'lavaPunch', level: 1, cooldownRemaining: 0, enabled: true, cost: 100, upgradeCost: 150 },
    { id: 'eruption', level: 1, cooldownRemaining: 0, enabled: true, cost: 300, upgradeCost: 400 },
    { id: 'floorIsLava', level: 1, cooldownRemaining: 0, enabled: true, cost: 400, upgradeCost: 500 },
    { id: 'smokeScreen', level: 1, cooldownRemaining: 0, enabled: true, cost: 350, upgradeCost: 450 },
    {
      id: 'theEndOfTheWorld',
      level: 1,
      cooldownRemaining: 0,
      enabled: true,
      cost: 1000,
      upgradeCost: 1200,
    },
  ]

  const renderMagma = (fieldOccupiedBy: string | null) =>
    render(
      <AbilityBar
        kingdomId="magma"
        theme={null}
        currency={50000}
        citizens={12}
        castleHp={10000}
        maxCastleHp={10000}
        shieldHp={0}
        nextCitizenCost={15}
        nextRepairCost={1000}
        shieldCost={50}
        repairsUsed={0}
        maxRepairs={3}
        incomePerSecond={24}
        abilities={magmaAbilities}
        tickRate={20}
        fieldOccupiedBy={fieldOccupiedBy}
        onCastAbility={() => {}}
        onUpgradeAbility={() => {}}
        onBuyItem={() => {}}
      />,
    )

  it('bars nothing while the centre is clear', () => {
    const { container } = renderMagma(null)
    expect(container.querySelectorAll('.ability-button--barred')).toHaveLength(0)
  })

  it('bars the ultimate while a butterfly holds the field', () => {
    const { container } = renderMagma('Caprice')
    const barred = [...container.querySelectorAll('.ability-button--barred')]
    expect(barred).toHaveLength(1)
    expect(barred[0]!.getAttribute('aria-label')).toBe('Cast The End of the World')
  })

  it('bars the ultimate against its OWN kind of centrepiece too', () => {
    // A second volcano on top of the first is just as incoherent as a volcano
    // on top of a butterfly. The slot is exclusive to everything.
    const { container } = renderMagma('The End of the World')
    expect(container.querySelectorAll('.ability-button--barred')).toHaveLength(1)
  })

  it('leaves the rest of the kit alone', () => {
    // The volcano is a target the whole table has to swing at, so the match has
    // to keep running normally underneath it.
    const { container } = renderMagma('Caprice')
    const cards = [...container.querySelectorAll('.ability-button')] as HTMLButtonElement[]
    for (const card of cards.slice(0, 4)) {
      expect(card.className).not.toContain('ability-button--barred')
      expect(card.disabled).toBe(false)
    }
  })

  it('cannot be clicked, and says why with a no-entry sign', () => {
    const onCast = vi.fn()
    const { container } = render(
      <AbilityBar
        kingdomId="magma"
        theme={null}
        currency={50000}
        citizens={12}
        castleHp={10000}
        maxCastleHp={10000}
        shieldHp={0}
        nextCitizenCost={15}
        nextRepairCost={1000}
        shieldCost={50}
        repairsUsed={0}
        maxRepairs={3}
        incomePerSecond={24}
        abilities={magmaAbilities}
        tickRate={20}
        fieldOccupiedBy="Caprice"
        onCastAbility={onCast}
        onUpgradeAbility={() => {}}
        onBuyItem={() => {}}
      />,
    )
    const barred = container.querySelector('.ability-button--barred') as HTMLButtonElement
    expect(barred.disabled).toBe(true)
    expect(barred.querySelector('[data-testid="barred-sign"]')).not.toBeNull()
    fireEvent.click(barred)
    expect(onCast).not.toHaveBeenCalled()
  })
})

// Mobile: the ability description used to stay on screen after you tapped away.
// Touch browsers synthesize `mouseenter` on tap (which is how the tooltip opens
// on a phone at all) but do not reliably synthesize the matching `mouseleave`,
// so nothing ever closed it and it covered the neighbouring cards.
describe('ability tooltip dismissal (mobile)', () => {
  const renderBar = () =>
    render(
      <AbilityBar
        kingdomId="fire"
        theme={null}
        currency={5000}
        citizens={10}
        castleHp={10000}
        maxCastleHp={10000}
        shieldHp={0}
        nextCitizenCost={10}
        nextRepairCost={1000}
        shieldCost={50}
        repairsUsed={0}
        maxRepairs={3}
        incomePerSecond={12}
        abilities={mockAbilities}
        tickRate={20}
        onCastAbility={() => {}}
        onUpgradeAbility={() => {}}
        onBuyItem={() => {}}
      />
    )

  const openFirstTooltip = (container: HTMLElement) => {
    const card = container.querySelector('.ability-button-container') as HTMLElement
    fireEvent.mouseEnter(card)
    return card
  }

  it('opens the description when a card is tapped', () => {
    const { container } = renderBar()
    openFirstTooltip(container)
    expect(container.querySelector('.ability-tooltip')).toBeTruthy()
  })

  it('closes the description when the next tap lands outside the card', () => {
    const { container } = renderBar()
    openFirstTooltip(container)
    expect(container.querySelector('.ability-tooltip')).toBeTruthy()

    // The tap that used to leave the tooltip stranded: no `mouseleave`, just a
    // pointer going down somewhere else entirely.
    fireEvent.pointerDown(document.body)
    expect(container.querySelector('.ability-tooltip')).toBeNull()
  })

  it('keeps the description open while the tap is on the card itself', () => {
    const { container } = renderBar()
    const card = openFirstTooltip(container)
    fireEvent.pointerDown(card)
    expect(container.querySelector('.ability-tooltip')).toBeTruthy()
  })

  it('closes the description when a touch is cancelled', () => {
    const { container } = renderBar()
    openFirstTooltip(container)
    fireEvent.pointerCancel(document.body)
    expect(container.querySelector('.ability-tooltip')).toBeNull()
  })
})
