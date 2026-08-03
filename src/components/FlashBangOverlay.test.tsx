import { test, expect, afterEach, vi } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import { FlashBangOverlay } from './FlashBangOverlay'
import { applyEventBatch } from '../game/gameEvents'
import type { RawGameEvent } from '../game/events'

afterEach(cleanup)

const raw = (e: Record<string, unknown>) => e as unknown as RawGameEvent
const flashBang = (casterId: string) =>
  raw({ type: 'abilityCast', tick: 1, casterId, abilityId: 'flashBang', targetIds: [casterId] })

test('every opposing kingdom is blinded', () => {
  vi.useFakeTimers()
  try {
    const { container } = render(<FlashBangOverlay youId="me" />)
    expect(container.querySelector('.flashbang')).toBeNull()

    act(() => applyEventBatch({ tick: 1, events: [flashBang('light')] }))
    expect(container.querySelector('.flashbang')).not.toBeNull()

    act(() => vi.advanceTimersByTime(2600))
    expect(container.querySelector('.flashbang')).toBeNull()
  } finally {
    vi.useRealTimers()
  }
})

test('the caster is NOT blinded by their own flash', () => {
  // Light is exempt from the cooldown stretch, so blinding their screen would
  // contradict the mechanic — they are the one player who knew to look away.
  vi.useFakeTimers()
  try {
    const { container } = render(<FlashBangOverlay youId="me" />)
    act(() => applyEventBatch({ tick: 1, events: [flashBang('me')] }))
    expect(container.querySelector('.flashbang')).toBeNull()
  } finally {
    vi.useRealTimers()
  }
})

test('a spectator with no id still sees the flash', () => {
  vi.useFakeTimers()
  try {
    const { container } = render(<FlashBangOverlay youId={null} />)
    act(() => applyEventBatch({ tick: 1, events: [flashBang('light')] }))
    expect(container.querySelector('.flashbang')).not.toBeNull()
  } finally {
    vi.useRealTimers()
  }
})

test('other casts are ignored', () => {
  vi.useFakeTimers()
  try {
    const { container } = render(<FlashBangOverlay youId="me" />)
    act(() =>
      applyEventBatch({
        tick: 1,
        events: [raw({ type: 'abilityCast', tick: 1, casterId: 'x', abilityId: 'lightBeam', targetIds: ['me'] })],
      }),
    )
    expect(container.querySelector('.flashbang')).toBeNull()
  } finally {
    vi.useRealTimers()
  }
})
