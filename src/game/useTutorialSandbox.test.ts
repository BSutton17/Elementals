import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTutorialSandbox } from './useTutorialSandbox'

// The tutorial's pocket universe: income ticks, casting, cooldowns, statuses,
// purchases, and the under-attack defense demo — all local, no sockets.

describe('useTutorialSandbox', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('accrues income from citizens over time', () => {
    const { result } = renderHook(() => useTutorialSandbox())
    expect(result.current.currency).toBe(500)
    expect(result.current.citizens).toBe(10)
    expect(result.current.incomePerSecond).toBe(10)

    act(() => vi.advanceTimersByTime(1000))
    // 10 citizens × 1g/s ≈ +10g after a second.
    expect(result.current.currency).toBeCloseTo(510, 0)
  })

  it('hiring a citizen costs gold and raises income', () => {
    const { result } = renderHook(() => useTutorialSandbox())
    const cost = result.current.nextCitizenCost
    expect(cost).toBe(100)

    act(() => result.current.buyItem('citizen'))
    expect(result.current.citizens).toBe(11)
    expect(result.current.currency).toBe(400)
    expect(result.current.incomePerSecond).toBe(11)
    // Prices climb.
    expect(result.current.nextCitizenCost).toBeGreaterThan(cost)
  })

  it('casting deducts gold, damages the dummy, and starts a cooldown', () => {
    const { result } = renderHook(() => useTutorialSandbox({ preselectTarget: true }))

    act(() => result.current.castAbility('waterBall'))
    expect(result.current.currency).toBe(400) // 500 - 100
    expect(result.current.dummy.hp).toBe(9700) // -300 demo damage
    expect(result.current.lastHit).toMatchObject({ amount: 300, abilityId: 'waterBall' })

    const state = result.current.abilityStates.find((a) => a.id === 'waterBall')
    expect(state?.cooldownRemaining).toBeGreaterThan(0)

    // A second cast while cooling down is a no-op.
    act(() => result.current.castAbility('waterBall'))
    expect(result.current.currency).toBe(400)
    expect(result.current.dummy.hp).toBe(9700)

    // After the cooldown elapses, the cast lands again.
    act(() => vi.advanceTimersByTime(2000))
    act(() => result.current.castAbility('waterBall'))
    expect(result.current.dummy.hp).toBe(9400)
  })

  it('waterfall applies the Current status and it expires on its own', () => {
    const { result } = renderHook(() => useTutorialSandbox({ preselectTarget: true }))

    act(() => result.current.castAbility('waterfall'))
    expect(result.current.dummy.statuses.some((s) => s.id === 'current')).toBe(true)

    // 100 ticks at 10/s = 10 seconds; give it a little extra.
    act(() => vi.advanceTimersByTime(11_000))
    expect(result.current.dummy.statuses.some((s) => s.id === 'current')).toBe(false)
  })

  it('upgrading an ability raises its level and its demo damage', () => {
    const { result } = renderHook(() => useTutorialSandbox({ preselectTarget: true }))

    // Abilities start unlocked at level 1, so the next step (1 -> 2) costs
    // upgradeCosts[1] = 250g for Water Ball.
    act(() => result.current.upgradeAbility('waterBall'))
    expect(result.current.currency).toBe(250)
    expect(
      result.current.abilityStates.find((a) => a.id === 'waterBall')?.level,
    ).toBe(2)

    act(() => result.current.castAbility('waterBall'))
    // 300 × 1.25 = 375 at level 2.
    expect(result.current.dummy.hp).toBe(10_000 - 375)
  })

  it('buying a shield raises it once, and repairs are capped', () => {
    const { result } = renderHook(() => useTutorialSandbox())

    act(() => result.current.buyItem('shield'))
    expect(result.current.shieldHp).toBe(1000)
    const after = result.current.currency

    // A second shield while one is up is a no-op.
    act(() => result.current.buyItem('shield'))
    expect(result.current.currency).toBe(after)

    // Repair at full HP is a no-op.
    act(() => result.current.buyItem('repair'))
    expect(result.current.repairsUsed).toBe(0)
  })

  it('under attack, incoming hits land and an active shield absorbs them', () => {
    const { result } = renderHook(() => useTutorialSandbox({ underAttack: true }))

    act(() => result.current.buyItem('shield'))
    expect(result.current.shieldHp).toBe(1000)

    // 45 ticks at 10/s = 4.5s to the first fireball.
    act(() => vi.advanceTimersByTime(5000))
    expect(result.current.incomingHit).not.toBeNull()
    expect(result.current.incomingHit?.absorbed).toBe(450)
    expect(result.current.shieldHp).toBe(550)
    // The castle itself was untouched.
    expect(result.current.castleHp).toBe(10_000)
  })

  it('the dummy is eliminated at zero HP and rebuilds itself', () => {
    const { result } = renderHook(() => useTutorialSandbox({ preselectTarget: true }))

    // Pound the dummy to zero: flood (800 dmg, 325g) with long pauses so the
    // 10g/s income always refills the vault; stop as soon as the dummy falls
    // (waiting further would let it rebuild).
    for (let i = 0; i < 13 && !result.current.dummy.eliminated; i++) {
      act(() => result.current.castAbility('flood'))
      if (!result.current.dummy.eliminated) {
        act(() => vi.advanceTimersByTime(40_000))
      }
    }
    expect(result.current.dummy.eliminated).toBe(true)

    // 25 respawn ticks = 2.5s; it comes back at full health.
    act(() => vi.advanceTimersByTime(3000))
    expect(result.current.dummy.eliminated).toBe(false)
    expect(result.current.dummy.hp).toBe(10_000)
  })
})
