import { test, expect, afterEach, vi } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import { HackOverlay } from './HackOverlay'
import { applyEventBatch } from '../game/gameEvents'
import type { RawGameEvent } from '../game/events'

afterEach(cleanup)

const raw = (e: Record<string, unknown>) => e as unknown as RawGameEvent
const hackCast = (targetIds: string[]) =>
  raw({ type: 'abilityCast', tick: 1, casterId: 'x', abilityId: 'hack', targetIds })

test('hack overlay flashes for the victim, then clears after 2.5s', () => {
  vi.useFakeTimers()
  try {
    const { container } = render(<HackOverlay youId="me" />)
    expect(container.querySelector('.hack-overlay')).toBeNull()

    act(() => applyEventBatch({ tick: 1, events: [hackCast(['me'])] }))
    expect(container.querySelector('.hack-overlay')).not.toBeNull()
    expect(container.querySelector('.hack-overlay__icon')).not.toBeNull()

    act(() => vi.advanceTimersByTime(2500))
    expect(container.querySelector('.hack-overlay')).toBeNull()
  } finally {
    vi.useRealTimers()
  }
})

test('hack overlay ignores hacks on other players and non-hack casts', () => {
  const { container } = render(<HackOverlay youId="me" />)
  act(() =>
    applyEventBatch({
      tick: 1,
      events: [
        hackCast(['other']), // someone else got hacked
        raw({ type: 'abilityCast', tick: 1, casterId: 'x', abilityId: 'zap', targetIds: ['me'] }),
      ],
    }),
  )
  expect(container.querySelector('.hack-overlay')).toBeNull()
})
