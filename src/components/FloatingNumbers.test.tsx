import { test, expect, afterEach, vi } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import { buildNumber, FloatingNumbers } from './FloatingNumbers'
import { applyEventBatch } from '../game/gameEvents'
import { ABILITY_EFFECTS } from '../render/effects'
import type { RawGameEvent } from '../game/events'

afterEach(cleanup)

const positionOf = (id: string) =>
  id === 'a' ? { x: 500, y: 300 } : id === 'b' ? { x: 200, y: 700 } : undefined
const kingdomOf = (id: string) => (id === 'a' ? 'fire' : id === 'b' ? 'water' : null)
const colorOf = (k: string | null) =>
  k === 'fire' ? '#ff6b4a' : k === 'water' ? '#4aa3ff' : '#000000'

const raw = (e: Record<string, unknown>) => e as unknown as RawGameEvent

test('damage number uses the attacker colour, sits to the right, and flags crits', () => {
  const built = buildNumber(
    raw({ type: 'damage', tick: 1, sourceId: 'a', targetId: 'b', amount: 250, crit: true, cause: 'fireball' }),
    positionOf,
    kingdomOf,
    colorOf,
    () => 1,
  )
  expect(built).not.toBeNull()
  const n = built!.number
  expect(n.text).toBe('250')
  expect(n.color).toBe('#ff6b4a') // attacker 'a' is fire, not target 'b'
  expect(n.crit).toBe(true)
  expect(n.x).toBeGreaterThan(200) // to the RIGHT of target 'b' (x=200)
})

test('damage is delayed by its ability projectile travel time; DoT/self-heal are not', () => {
  const hit = buildNumber(
    raw({ type: 'damage', tick: 1, sourceId: 'a', targetId: 'b', amount: 100, crit: false, cause: 'fireball' }),
    positionOf,
    kingdomOf,
    colorOf,
    () => 0,
  )
  // Appears only when the fireball would land.
  expect(hit!.delayMs).toBe(ABILITY_EFFECTS.fireball!.projectile!.durationMs)

  // Beams delay by their charge-up (the number lands when the beam fires).
  const beamHit = buildNumber(
    raw({ type: 'damage', tick: 1, sourceId: 'a', targetId: 'b', amount: 300, crit: false, cause: 'scorchingSun' }),
    positionOf,
    kingdomOf,
    colorOf,
    () => 0,
  )
  expect(beamHit!.delayMs).toBe(ABILITY_EFFECTS.scorchingSun!.beam!.chargeMs)

  const dot = buildNumber(
    raw({ type: 'damage', tick: 1, sourceId: 'a', targetId: 'b', amount: 20, crit: false, cause: 'status:burn' }),
    positionOf,
    kingdomOf,
    colorOf,
    () => 0,
  )
  expect(dot!.delayMs).toBe(0) // no projectile → immediate
  expect(dot!.dot).toBe(true) // …but flagged as a DoT tick
  expect(hit!.dot).toBe(false)
})

test('DoT ticks wait for the initiating hit to appear (Scorching Sun → Burn)', () => {
  vi.useFakeTimers()
  try {
    const { container } = render(
      <svg>
        <FloatingNumbers positionOf={positionOf} kingdomOf={kingdomOf} colorOf={colorOf} />
      </svg>,
    )

    // Scorching Sun hits 'b' (delayed by its 1.75s beam charge); a Burn tick on
    // 'b' arrives in the same batch and must not beat the initial number.
    act(() => {
      applyEventBatch({
        tick: 1,
        events: [
          raw({ type: 'damage', tick: 1, sourceId: 'a', targetId: 'b', amount: 300, crit: false, cause: 'scorchingSun' }),
          raw({ type: 'damage', tick: 1, sourceId: 'a', targetId: 'b', amount: 10, crit: false, cause: 'status:burn' }),
        ],
      })
    })
    const texts = () => Array.from(container.querySelectorAll('text.floating-number')).map((t) => t.textContent)

    act(() => vi.advanceTimersByTime(1000)) // mid-charge
    expect(texts()).not.toContain('10') // Burn held back
    expect(texts()).not.toContain('300')

    act(() => vi.advanceTimersByTime(1000)) // past the 1.75s charge
    expect(texts()).toContain('300') // initial hit shown
    expect(texts()).toContain('10') // …and Burn now allowed
  } finally {
    vi.useRealTimers()
  }
})

test('heal number is always green and prefixed with +', () => {
  const built = buildNumber(
    raw({ type: 'heal', tick: 1, targetId: 'a', amount: 400, overheal: 0, cause: 'riptide' }),
    positionOf,
    kingdomOf,
    colorOf,
    () => 2,
  )
  expect(built!.number.text).toBe('+400')
  expect(built!.number.color).toBe('#4ade80')
  expect(built!.number.crit).toBe(false)
})

test('zero-magnitude, unknown-type, and unplaced-target events produce no number', () => {
  const key = () => 0
  expect(
    buildNumber(
      raw({ type: 'damage', tick: 1, sourceId: 'a', targetId: 'b', amount: 0, crit: false, cause: 'fireball' }),
      positionOf,
      kingdomOf,
      colorOf,
      key,
    ),
  ).toBeNull()
  expect(
    buildNumber(
      raw({ type: 'heal', tick: 1, targetId: 'a', amount: 0, overheal: 9, cause: 'riptide' }),
      positionOf,
      kingdomOf,
      colorOf,
      key,
    ),
  ).toBeNull()
  expect(
    buildNumber(raw({ type: 'abilityCast', tick: 1 }), positionOf, kingdomOf, colorOf, key),
  ).toBeNull()
  expect(
    buildNumber(
      raw({ type: 'damage', tick: 1, sourceId: 'a', targetId: 'ghost', amount: 100, crit: false, cause: 'fireball' }),
      positionOf,
      kingdomOf,
      colorOf,
      key,
    ),
  ).toBeNull()
})

test('a damage <text> appears only after the projectile lands, then clears at 2.5s', () => {
  vi.useFakeTimers()
  try {
    const { container } = render(
      <svg>
        <FloatingNumbers positionOf={positionOf} kingdomOf={kingdomOf} colorOf={colorOf} />
      </svg>,
    )

    act(() => {
      applyEventBatch({
        tick: 1,
        events: [
          raw({ type: 'damage', tick: 1, sourceId: 'a', targetId: 'b', amount: 250, crit: true, cause: 'fireball' }),
        ],
      })
    })

    // Nothing yet — the number waits for the fireball to land.
    expect(container.querySelector('text.floating-number')).toBeNull()

    act(() => {
      vi.advanceTimersByTime(ABILITY_EFFECTS.fireball!.projectile!.durationMs)
    })

    const text = container.querySelector('text.floating-number')
    expect(text).not.toBeNull()
    expect(text!.getAttribute('fill')).toBe('#ff6b4a')
    expect(text!.classList.contains('floating-number--crit')).toBe(true) // crit → bold
    expect(text!.textContent).toBe('250')

    act(() => {
      vi.advanceTimersByTime(2500)
    })
    expect(container.querySelector('text.floating-number')).toBeNull()
  } finally {
    vi.useRealTimers()
  }
})
