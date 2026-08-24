import { describe, expect, it } from 'vitest'
import { pickWatched } from './spectatorFocus'

describe('pickWatched', () => {
  it('holds the same victim while they remain a candidate', () => {
    // Re-rendering must not re-roll: a fresh pick every frame would flicker a
    // Slot Machine cinematic between two players' reels several times a second.
    let held: string | null = null
    held = pickWatched(held, ['a', 'b', 'c'], () => 0.9)
    expect(held).toBe('c')
    for (let i = 0; i < 20; i++) {
      // Even with a roll that would choose differently, the hold wins.
      held = pickWatched(held, ['a', 'b', 'c'], () => 0)
      expect(held).toBe('c')
    }
  })

  it('re-rolls once the held victim stops being afflicted', () => {
    // Which is exactly when the effect they were chosen for has ended.
    expect(pickWatched('a', ['b', 'c'], () => 0)).toBe('b')
  })

  it('clears when nobody is afflicted', () => {
    expect(pickWatched('a', [])).toBeNull()
  })

  it('can reach every candidate', () => {
    // A picker that always returned the first would pass the tests above while
    // making "random" a lie.
    expect(pickWatched(null, ['a', 'b', 'c'], () => 0)).toBe('a')
    expect(pickWatched(null, ['a', 'b', 'c'], () => 0.5)).toBe('b')
    expect(pickWatched(null, ['a', 'b', 'c'], () => 0.99)).toBe('c')
  })
})
