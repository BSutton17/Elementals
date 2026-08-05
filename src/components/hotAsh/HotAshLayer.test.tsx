import { test, expect, afterEach, vi } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import { HotAshLayer } from './HotAshLayer'
import { applyEventBatch } from '../../game/gameEvents'
import type { RawGameEvent } from '../../game/events'

afterEach(cleanup)

const raw = (e: Record<string, unknown>) => e as unknown as RawGameEvent
const AT: Record<string, { x: number; y: number }> = {
  a: { x: 840, y: 500 },
  b: { x: 160, y: 500 },
}
const positionOf = (id: string) => AT[id]

const marked = (targeterIds: string[]) =>
  raw({ type: 'hotAshMarked', tick: 900, ownerId: 'magma', targeterIds, durationTicks: 60 })

/** Renders the layer as the given viewer. Defaults to Magma, whose marks
 *  these are — every other seat is expected to see nothing at all. */
const renderLayer = (youId: string | null = 'magma') =>
  render(
    <svg viewBox="0 0 1000 1000">
      <HotAshLayer positionOf={positionOf} tickRate={20} youId={youId} />
    </svg>,
  )

test('marks every kingdom aiming at Magma', () => {
  vi.useFakeTimers()
  try {
    const { container } = renderLayer()
    expect(container.querySelector('[data-testid="hot-ash"]')).toBeNull()

    act(() => applyEventBatch({ tick: 900, events: [marked(['a', 'b'])] }))
    expect(container.querySelectorAll('.hot-ash__mark')).toHaveLength(2)
    expect(container.querySelector('[data-testid="hot-ash-a"]')).not.toBeNull()
  } finally {
    vi.useRealTimers()
  }
})

test('sits above the marked castle', () => {
  vi.useFakeTimers()
  try {
    const { container } = renderLayer()
    act(() => applyEventBatch({ tick: 900, events: [marked(['a'])] }))
    // 840,500 minus the 178-unit lift.
    expect(
      container.querySelector('[data-testid="hot-ash-a"]')!.getAttribute('transform'),
    ).toBe('translate(840 322)')
  } finally {
    vi.useRealTimers()
  }
})

test('clears itself after the duration the server set', () => {
  vi.useFakeTimers()
  try {
    const { container } = renderLayer()
    act(() => applyEventBatch({ tick: 900, events: [marked(['a'])] }))
    expect(container.querySelector('.hot-ash__mark')).not.toBeNull()

    // 60 ticks at 20/s = 3 seconds.
    act(() => vi.advanceTimersByTime(3000))
    expect(container.querySelector('[data-testid="hot-ash"]')).toBeNull()
  } finally {
    vi.useRealTimers()
  }
})

test('an empty mark renders nothing', () => {
  vi.useFakeTimers()
  try {
    const { container } = renderLayer()
    act(() => applyEventBatch({ tick: 900, events: [marked([])] }))
    expect(container.querySelector('[data-testid="hot-ash"]')).toBeNull()
  } finally {
    vi.useRealTimers()
  }
})

test('shows the marks to Magma and to nobody else', () => {
  vi.useFakeTimers()
  try {
    // The marks are Magma's read on who is committed against it. Putting them
    // on every screen would hand the whole table that intelligence for free.
    for (const viewer of ['a', 'b', null]) {
      const { container } = renderLayer(viewer)
      act(() => applyEventBatch({ tick: 900, events: [marked(['a', 'b'])] }))
      expect(container.querySelector('[data-testid="hot-ash"]')).toBeNull()
      cleanup()
    }

    // …and Magma still sees them.
    const { container } = renderLayer('magma')
    act(() => applyEventBatch({ tick: 900, events: [marked(['a', 'b'])] }))
    expect(container.querySelectorAll('.hot-ash__mark')).toHaveLength(2)
  } finally {
    vi.useRealTimers()
  }
})

test('a second Magma’s marks never leak onto the first one’s screen', () => {
  vi.useFakeTimers()
  try {
    const { container } = renderLayer('magma')
    act(() =>
      applyEventBatch({
        tick: 900,
        events: [
          raw({
            type: 'hotAshMarked',
            tick: 900,
            ownerId: 'otherMagma',
            targeterIds: ['a', 'b'],
            durationTicks: 60,
          }),
        ],
      }),
    )
    expect(container.querySelector('[data-testid="hot-ash"]')).toBeNull()
  } finally {
    vi.useRealTimers()
  }
})
