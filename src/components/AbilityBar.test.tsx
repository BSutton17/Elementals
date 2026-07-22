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

    // Click cast Fireball (non-charge abilities pass no charge count)
    fireEvent.click(screen.getByLabelText('Cast Fireball'))
    expect(onCast).toHaveBeenCalledWith('fireball', undefined)

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
