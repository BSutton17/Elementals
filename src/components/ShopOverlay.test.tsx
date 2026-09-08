import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ShopOverlay } from './ShopOverlay'
import type { ScrambleDisplay } from './scramble/useScrambleValues'

/**
 * Half Past 12 reaches the Repairs & Shields panel.
 *
 * ⚠️ THE PROPERTY THAT MATTERS IS NOT "THE NUMBERS CHANGED". This panel gates
 * its own buttons — `disabled={!canAffordCitizen}` — from the same props it
 * prints. Handing it scrambled prices would have disabled a purchase the player
 * could actually afford, which turns a cosmetic debuff into a silent lockout of
 * the shop. The scramble lies about what things COST; it must never lie about
 * what a click DOES.
 */

const scramble = (over: Partial<ScrambleDisplay> = {}): ScrambleDisplay => ({
  gold: 7,
  incomePerSecond: 13,
  citizens: 44,
  castleHp: 1234,
  shieldHp: 999,
  supernovaMeter: 111,
  meterFraction: 0.5,
  citizenCost: 888,
  repairCost: 777,
  shieldCost: 666,
  cost: () => 0,
  upgradeCost: () => 0,
  unlockCost: () => 0,
  cooldown: () => 0,
  affordable: () => true,
  ...over,
})

const shop = (props: Partial<Parameters<typeof ShopOverlay>[0]> = {}) =>
  render(
    <ShopOverlay
      isOpen
      currency={10_000}
      citizens={20}
      castleHp={5000}
      maxCastleHp={10_000}
      shieldHp={0}
      nextCitizenCost={100}
      nextRepairCost={200}
      shieldCost={300}
      repairsUsed={0}
      maxRepairs={3}
      theme={null}
      onBuyItem={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />,
  )

describe('the shop, unscrambled', () => {
  it('shows the real prices', () => {
    shop()
    expect(screen.getByRole('button', { name: 'Buy (100g)' })).toBeTruthy()
    expect(screen.getByText(/Current: 20 citizens/)).toBeTruthy()
  })
})

describe('the shop, scrambled', () => {
  it('prints the scrambled price instead of the real one', () => {
    shop({ scramble: scramble() })
    expect(screen.getByRole('button', { name: 'Buy (888g)' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Buy (100g)' })).toBeNull()
  })

  it('scrambles the counts and the castle it is repairing', () => {
    shop({ scramble: scramble(), shieldHp: 400 })
    expect(screen.getByText(/Current: 44 citizens/)).toBeTruthy()
    expect(screen.getByText(/HP: 1234/)).toBeTruthy()
    expect(screen.getByText(/Active Shield: 999 HP/)).toBeTruthy()
  })

  it('⚠️ still lets you buy what you can really afford', () => {
    // Real: 10,000 gold against a 100g citizen — plainly affordable. The
    // scramble claims 7 gold and a 888g price, which is a lie about the money
    // and must stay one.
    shop({ scramble: scramble() })
    const buy = screen.getByRole('button', { name: 'Buy (888g)' }) as HTMLButtonElement
    expect(buy.disabled, 'the scramble disabled a purchase the player could afford').toBe(false)
  })

  it('⚠️ and still refuses what you really cannot', () => {
    // The mirror image: broke in reality, rich in the scramble.
    shop({ currency: 0, scramble: scramble({ gold: 9999, citizenCost: 1 }) })
    const buy = screen.getByRole('button', { name: 'Buy (1g)' }) as HTMLButtonElement
    expect(buy.disabled, 'the scramble bought a purchase the player could not afford').toBe(true)
  })

  it('never invents a shield that is not there', () => {
    // Consistent with the ability bar: the shield readout scrambles only while
    // a shield is actually up, so the panel cannot conjure armour out of a lie.
    shop({ scramble: scramble(), shieldHp: 0 })
    expect(screen.getByText(/Active Shield: None/)).toBeTruthy()
  })
})
