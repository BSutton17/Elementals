import { test, expect, afterEach, vi } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import { WagerResultLayer } from './WagerResultLayer'
import { applyEventBatch } from '../../game/gameEvents'
import type { RawGameEvent } from '../../game/events'

afterEach(cleanup)

const raw = (e: Record<string, unknown>) => e as unknown as RawGameEvent

const AT: Record<string, { x: number; y: number }> = {
  victim: { x: 500, y: 840 },
  other: { x: 160, y: 500 },
}
const positionOf = (id: string) => AT[id]

/** The settlement damage the server emits, tagged with how it was read. */
const settle = (targetId: string, side: string, read: 'right' | 'wrong') =>
  raw({
    type: 'damage',
    tick: 10,
    sourceId: 'dark',
    targetId,
    amount: 700,
    absorbedByShield: 0,
    dealtToHp: 700,
    overkill: 0,
    crit: false,
    cause: `yinYang:${side}:${read}`,
  })

function renderLayer() {
  return render(
    <svg viewBox="0 0 1000 1000">
      <WagerResultLayer positionOf={positionOf} />
    </svg>,
  )
}

test('a correct read is marked over the victim', () => {
  vi.useFakeTimers()
  try {
    const { container } = renderLayer()
    expect(container.querySelector('[data-testid="wager-result"]')).toBeNull()

    act(() => applyEventBatch({ tick: 10, events: [settle('victim', 'yin', 'right')] }))
    expect(container.querySelector('[data-testid="wager-right"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="wager-wrong"]')).toBeNull()
  } finally {
    vi.useRealTimers()
  }
})

test('a wrong read gets the other mark', () => {
  vi.useFakeTimers()
  try {
    const { container } = renderLayer()
    act(() => applyEventBatch({ tick: 10, events: [settle('victim', 'yang', 'wrong')] }))
    expect(container.querySelector('[data-testid="wager-wrong"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="wager-right"]')).toBeNull()
  } finally {
    vi.useRealTimers()
  }
})

test('the mark sits above the wagered kingdom, and only that one', () => {
  vi.useFakeTimers()
  try {
    const { container } = renderLayer()
    act(() => applyEventBatch({ tick: 10, events: [settle('victim', 'yin', 'right')] }))

    const marks = [...container.querySelectorAll('.wager-result__mark')]
    expect(marks).toHaveLength(1)
    // Above the victim's castle (y 840), not the other kingdom's.
    expect(marks[0]!.getAttribute('transform')).toBe('translate(500 662)')
  } finally {
    vi.useRealTimers()
  }
})

test('the verdict clears itself', () => {
  vi.useFakeTimers()
  try {
    const { container } = renderLayer()
    act(() => applyEventBatch({ tick: 10, events: [settle('victim', 'yin', 'right')] }))
    expect(container.querySelector('.wager-result__mark')).not.toBeNull()

    act(() => vi.advanceTimersByTime(2600))
    expect(container.querySelector('[data-testid="wager-result"]')).toBeNull()
  } finally {
    vi.useRealTimers()
  }
})

test('ordinary damage is not mistaken for a wager verdict', () => {
  vi.useFakeTimers()
  try {
    const { container } = renderLayer()
    act(() =>
      applyEventBatch({
        tick: 10,
        events: [
          raw({
            type: 'damage',
            tick: 10,
            sourceId: 'dark',
            targetId: 'victim',
            amount: 250,
            absorbedByShield: 0,
            dealtToHp: 250,
            overkill: 0,
            crit: false,
            cause: 'shadowStrike',
          }),
        ],
      }),
    )
    expect(container.querySelector('[data-testid="wager-result"]')).toBeNull()
  } finally {
    vi.useRealTimers()
  }
})

test('two kingdoms settling at once each get their own mark', () => {
  vi.useFakeTimers()
  try {
    const { container } = renderLayer()
    act(() =>
      applyEventBatch({
        tick: 10,
        events: [settle('victim', 'yin', 'right'), settle('other', 'yang', 'wrong')],
      }),
    )
    expect(container.querySelectorAll('.wager-result__mark')).toHaveLength(2)
    expect(container.querySelector('[data-testid="wager-right"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="wager-wrong"]')).not.toBeNull()
  } finally {
    vi.useRealTimers()
  }
})
