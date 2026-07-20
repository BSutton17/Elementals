import { test, expect } from 'vitest'
import { onGameEvents, applyEventBatch } from './gameEvents'
import type { RawGameEvent } from './events'

test('dispatches event batches to subscribers with the tick', () => {
  const received: Array<{ events: RawGameEvent[]; tick: number }> = []
  const unsubscribe = onGameEvents((events, tick) => received.push({ events, tick }))

  applyEventBatch({
    tick: 5,
    events: [
      { type: 'abilityCast', tick: 5, casterId: 'a', abilityId: 'fireball', targetIds: ['b'] },
    ],
  })

  expect(received).toHaveLength(1)
  expect(received[0]!.tick).toBe(5)
  expect(received[0]!.events[0]!.type).toBe('abilityCast')

  unsubscribe()
  applyEventBatch({ tick: 6, events: [{ type: 'damage', tick: 6 }] })
  expect(received).toHaveLength(1) // no longer receiving after unsubscribe
})
