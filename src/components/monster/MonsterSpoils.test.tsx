import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { MonsterSpoils } from './MonsterSpoils'
import { applyEventBatch } from '../../game/gameEvents'

/**
 * The payout marks over the winning castle.
 *
 * The interesting case is the one the split rewards exist for: ONE kingdom
 * taking both. Everything else here is bookkeeping around it.
 */

const POSITIONS: Record<string, { x: number; y: number }> = {
  a: { x: 300, y: 400 },
  b: { x: 700, y: 600 },
}

const positionOf = (id: string) => POSITIONS[id]

const draw = () =>
  render(
    <svg viewBox="0 0 1000 1000">
      <MonsterSpoils positionOf={positionOf} />
    </svg>,
  )

const defeated = (mostDamageBy: string | null, lastHitBy: string | null) =>
  act(() => {
    applyEventBatch({
      tick: 100,
      events: [{ type: 'monsterDefeated', tick: 100, mostDamageBy, lastHitBy }],
    })
  })

const trophies = (c: HTMLElement) => c.querySelectorAll('.monster-spoil--trophy')
const ticks = (c: HTMLElement) => c.querySelectorAll('.monster-spoil--blow')

describe('the monster payout marks', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('draws nothing until something dies', () => {
    const { container } = draw()
    expect(container.querySelectorAll('.monster-spoil')).toHaveLength(0)
  })

  it('puts the trophy on the biggest hitter and the tick on the last swing', () => {
    const { container } = draw()
    defeated('a', 'b')
    expect(trophies(container)).toHaveLength(1)
    expect(ticks(container)).toHaveLength(1)
    // Each over its own castle, and above it.
    expect(Number(trophies(container)[0]!.getAttribute('x'))).toBeCloseTo(300 - 32)
    expect(Number(ticks(container)[0]!.getAttribute('x'))).toBeCloseTo(700 - 32)
    expect(Number(trophies(container)[0]!.getAttribute('y'))).toBeLessThan(400)
  })

  it('gives one kingdom BOTH marks, side by side', () => {
    // ⚠️ THE CASE THE SPLIT REWARDS EXIST FOR. Out-damaging everyone and
    // landing the finishing blow are two separate earnings and pay twice
    // (×1.5², see monster.ts), so one mark replacing the other would
    // under-report what just happened.
    const { container } = draw()
    defeated('a', 'a')
    expect(trophies(container)).toHaveLength(1)
    expect(ticks(container)).toHaveLength(1)
    const x1 = Number(trophies(container)[0]!.getAttribute('x'))
    const x2 = Number(ticks(container)[0]!.getAttribute('x'))
    expect(x1).not.toBe(x2)
    // Straddling the castle rather than stacked on it.
    expect((x1 + x2) / 2).toBeCloseTo(300 - 32)
  })

  it('clears both after 3.5 seconds', () => {
    const { container } = draw()
    defeated('a', 'a')
    act(() => void vi.advanceTimersByTime(3499))
    expect(container.querySelectorAll('.monster-spoil')).toHaveLength(2)
    act(() => void vi.advanceTimersByTime(2))
    expect(container.querySelectorAll('.monster-spoil')).toHaveLength(0)
  })

  it('skips a winner it cannot place', () => {
    // A spectator joining mid-kill, or a castle already removed: no coordinate,
    // no mark — never a mark at 0,0.
    const { container } = draw()
    defeated('ghost', 'b')
    expect(trophies(container)).toHaveLength(0)
    expect(ticks(container)).toHaveLength(1)
  })

  it('survives a monster nobody managed to hit', () => {
    const { container } = draw()
    defeated(null, null)
    expect(container.querySelectorAll('.monster-spoil')).toHaveLength(0)
  })
})
