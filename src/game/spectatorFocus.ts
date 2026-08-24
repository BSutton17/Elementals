import { useRef } from 'react'

/**
 * Which player a spectator is currently watching for a victim-only effect.
 *
 * ⚠️ RANDOM, BUT NOT RE-ROLLED EVERY FRAME. Spectators have no castle, so the
 * screen effects that key off "are YOU afflicted" have nobody to key off. The
 * answer is to watch someone — but picking randomly on each render would swap
 * victim several times a second and turn a Slot Machine cinematic into a
 * flicker between two players' reels.
 *
 * So a pick is made once and HELD for as long as that player is still a
 * candidate. It is only re-rolled when they stop being one, which is exactly
 * when the effect they were chosen for has ended.
 */

/**
 * The decision itself, kept pure so it can be tested without a renderer.
 *
 * `roll` is injectable for the same reason: a test that asserts on a random
 * pick either controls the randomness or asserts nothing.
 */
export function pickWatched(
  held: string | null,
  candidates: readonly string[],
  roll: () => number = Math.random,
): string | null {
  if (candidates.length === 0) return null
  // Still afflicted? Keep watching them — the whole point of holding.
  if (held !== null && candidates.includes(held)) return held
  return candidates[Math.floor(roll() * candidates.length)] ?? null
}

/** React wrapper: remembers the pick across renders. */
export function useWatchedVictim(candidates: readonly string[]): string | null {
  const held = useRef<string | null>(null)
  held.current = pickWatched(held.current, candidates)
  return held.current
}
