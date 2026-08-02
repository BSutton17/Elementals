/// <reference types="node" />
// The app tsconfig limits `types` to vite/client, but @types/node is installed
// — the reference above opts this test file in so it can read the stylesheet.
// (`?raw` is not an option: vitest stubs CSS imports to an empty string.)
import { readFileSync } from 'node:fs'
import { test, expect, afterEach, vi } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import { LightShowLayer } from './LightShowLayer'
import { applyEventBatch } from '../../game/gameEvents'
import type { RawGameEvent } from '../../game/events'

afterEach(cleanup)

// These tests exist because the Light Show failed twice in ways that looked
// like styling but were not:
//
//   1. the strike timer was being cleared by an effect that re-subscribed on
//      every render, so the lasers NEVER fired; and
//   2. the disc's rotation was written as a CSS animation on an SVG <g>, which
//      did not actually turn it.
//
// Both are invisible to a type-checker and to every other test in the suite, so
// they are pinned here: the disc's transform must genuinely change frame to
// frame, and the lasers must genuinely appear.

const raw = (e: Record<string, unknown>) => e as unknown as RawGameEvent

const ROSTER = [{ id: 'light' }, { id: 'a' }, { id: 'b' }, { id: 'c' }]
const POSITIONS = [
  { x: 500, y: 160 },
  { x: 840, y: 500 },
  { x: 500, y: 840 },
  { x: 160, y: 500 },
]
const TICK_RATE = 20

/** Light Show cast at tick 100, landing 3 seconds later. */
const strike = (ownerId = 'light') =>
  raw({
    type: 'strikeIncoming',
    tick: 100,
    ownerId,
    abilityId: 'lightShow',
    resolveTick: 100 + 3 * TICK_RATE,
  })

function renderLayer() {
  // The layer is an SVG <g>, so it needs an <svg> parent to render into.
  return render(
    <svg viewBox="0 0 1000 1000">
      <LightShowLayer positions={POSITIONS} roster={ROSTER} tickRate={TICK_RATE} />
    </svg>,
  )
}

/** Runs `frames` animation frames, advancing the clock `stepMs` each time. */
function advanceFrames(frames: number, stepMs = 16) {
  for (let i = 0; i < frames; i++) {
    act(() => {
      vi.advanceTimersByTime(stepMs)
    })
  }
}

test('the countdown disc actually rotates, and keeps accelerating', () => {
  vi.useFakeTimers()
  try {
    const { container } = renderLayer()
    act(() => applyEventBatch({ tick: 100, events: [strike()] }))

    const disc = () => container.querySelector('.lightshow__disc')
    expect(disc()).not.toBeNull()

    const angleOf = (): number => {
      const t = disc()!.getAttribute('transform') ?? ''
      const m = /rotate\(([-\d.]+)/.exec(t)
      expect(m, `no rotate() in transform: "${t}"`).not.toBeNull()
      return Number(m![1])
    }

    // It starts unrotated...
    expect(angleOf()).toBeCloseTo(0, 1)

    // ...and is TURNING within the first few frames. A disc that only starts
    // moving near the end reads as static for most of the countdown, which is
    // exactly the complaint this pins.
    advanceFrames(12)
    const early = angleOf()
    expect(early).toBeGreaterThan(0)

    advanceFrames(40)
    const middle = angleOf()
    expect(middle).toBeGreaterThan(early)

    advanceFrames(40)
    const late = angleOf()
    expect(late).toBeGreaterThan(middle)

    // And it ACCELERATES: the last stretch covers more ground than the first.
    expect(late - middle).toBeGreaterThan(middle - early)
  } finally {
    vi.useRealTimers()
  }
})

test('the disc turns about the centre of the arena, not some other point', () => {
  vi.useFakeTimers()
  try {
    const { container } = renderLayer()
    act(() => applyEventBatch({ tick: 100, events: [strike()] }))
    advanceFrames(20)

    // An explicit rotation centre is the whole reason this is an SVG attribute
    // rather than a CSS animation — without it the disc swings off screen.
    const t = container.querySelector('.lightshow__disc')!.getAttribute('transform')!
    expect(t).toMatch(/rotate\([-\d.]+ 500 500\)/)
  } finally {
    vi.useRealTimers()
  }
})

test('the disc holds one size — it only ever rotates', () => {
  vi.useFakeTimers()
  try {
    const { container } = renderLayer()
    act(() => applyEventBatch({ tick: 100, events: [strike()] }))

    const transformOf = () =>
      container.querySelector('.lightshow__disc')!.getAttribute('transform') ?? ''

    // No scaling anywhere in the transform, at any point in the countdown.
    for (const frames of [0, 20, 40, 60]) {
      advanceFrames(frames)
      expect(transformOf()).not.toMatch(/scale/)
      expect(transformOf()).toMatch(/^rotate\([-\d.]+ 500 500\)$/)
    }

    // And the circle's own radius never changes either.
    const r = container.querySelector('.lightshow__disc-body')!.getAttribute('r')
    advanceFrames(40)
    expect(container.querySelector('.lightshow__disc-body')!.getAttribute('r')).toBe(r)
  } finally {
    vi.useRealTimers()
  }
})

test('at zero the disc is gone and a laser fires at every kingdom but Light', () => {
  vi.useFakeTimers()
  try {
    const { container } = renderLayer()
    act(() => applyEventBatch({ tick: 100, events: [strike('light')] }))

    // Before the strike: disc up, no lasers.
    expect(container.querySelector('.lightshow__disc')).not.toBeNull()
    expect(container.querySelectorAll('.lightshow__laser')).toHaveLength(0)

    // The full 3 second warning elapses.
    act(() => vi.advanceTimersByTime(3000))

    // The disc is gone and the volley is out: three kingdoms, not four —
    // Light is never hit by its own Light Show.
    expect(container.querySelector('.lightshow__disc')).toBeNull()
    expect(container.querySelectorAll('.lightshow__laser')).toHaveLength(3)
  } finally {
    vi.useRealTimers()
  }
})

test('each laser runs from the arena centre to its kingdom', () => {
  vi.useFakeTimers()
  try {
    const { container } = renderLayer()
    act(() => applyEventBatch({ tick: 100, events: [strike('light')] }))
    act(() => vi.advanceTimersByTime(3000))

    const cores = [...container.querySelectorAll('.lightshow__beam--core')]
    expect(cores).toHaveLength(3)
    const ends = cores.map((c) => `${c.getAttribute('x2')},${c.getAttribute('y2')}`)

    for (const c of cores) {
      expect(c.getAttribute('x1')).toBe('500')
      expect(c.getAttribute('y1')).toBe('500')
    }
    // They land on the three non-Light kingdoms, each exactly once.
    expect(new Set(ends)).toEqual(new Set(['840,500', '500,840', '160,500']))
  } finally {
    vi.useRealTimers()
  }
})

test('the whole cinematic clears itself once the lasers finish', () => {
  vi.useFakeTimers()
  try {
    const { container } = renderLayer()
    act(() => applyEventBatch({ tick: 100, events: [strike()] }))
    act(() => vi.advanceTimersByTime(3000))
    expect(container.querySelector('.lightshow')).not.toBeNull()

    act(() => vi.advanceTimersByTime(1200))
    expect(container.querySelector('.lightshow')).toBeNull()
  } finally {
    vi.useRealTimers()
  }
})

test('a re-render mid-countdown does not cancel the strike', () => {
  // The original bug: `positions` is a fresh array every render, so an effect
  // keyed on it re-subscribed constantly and its cleanup killed the pending
  // strike timer. The countdown played; the lasers never came.
  vi.useFakeTimers()
  try {
    const { container, rerender } = render(
      <svg viewBox="0 0 1000 1000">
        <LightShowLayer positions={POSITIONS} roster={ROSTER} tickRate={TICK_RATE} />
      </svg>,
    )
    act(() => applyEventBatch({ tick: 100, events: [strike()] }))

    // Re-render repeatedly with fresh array identities, as the battlefield does.
    for (let i = 0; i < 5; i++) {
      act(() => {
        vi.advanceTimersByTime(200)
        rerender(
          <svg viewBox="0 0 1000 1000">
            <LightShowLayer
              positions={POSITIONS.map((p) => ({ ...p }))}
              roster={ROSTER.map((r) => ({ ...r }))}
              tickRate={TICK_RATE}
            />
          </svg>,
        )
      })
    }

    act(() => vi.advanceTimersByTime(2200))
    expect(container.querySelectorAll('.lightshow__laser')).toHaveLength(3)
  } finally {
    vi.useRealTimers()
  }
})

test('a Light Show from another kingdom spares that caster instead', () => {
  vi.useFakeTimers()
  try {
    const { container } = renderLayer()
    act(() => applyEventBatch({ tick: 100, events: [strike('b')] }))
    act(() => vi.advanceTimersByTime(3000))

    const ends = [...container.querySelectorAll('.lightshow__beam--core')].map(
      (c) => `${c.getAttribute('x2')},${c.getAttribute('y2')}`,
    )
    // 'b' sits at 500,840 — it must not be struck by its own cast.
    expect(ends).toHaveLength(3)
    expect(ends).not.toContain('500,840')
  } finally {
    vi.useRealTimers()
  }
})

test('no CSS rule animates the disc transform out from under the JS', () => {
  // A CSS transform WINS over an SVG transform attribute, so a stylesheet rule
  // animating `.lightshow__disc`'s transform silently overrides the per-frame
  // rotation and the disc stops turning. jsdom does not run CSS animations, so
  // no rendering test above can catch it — the stylesheet is checked directly.
  const css = readFileSync('src/components/lightShow/LightShowLayer.css', 'utf8')

  const block = /\.lightshow__disc\s*\{([^}]*)\}/.exec(css)
  expect(block, 'the .lightshow__disc rule vanished').not.toBeNull()
  const body = block![1]!

  // Nothing may set a transform directly...
  expect(body).not.toMatch(/(^|[\s;])transform\s*:/)

  // ...and any animation it does run must not touch the transform either.
  // The keyframes body is found by index rather than by a built-up regex: a
  // template literal eats backslashes (`\s` becomes `s`), which silently made
  // an earlier version of this check match nothing and pass regardless.
  const NEWLINE_BRACE = String.fromCharCode(10) + '}'
  const keyframesOf = (name: string): string | null => {
    const at = css.indexOf('@keyframes ' + name)
    if (at < 0) return null
    const open = css.indexOf('{', at)
    const close = css.indexOf(NEWLINE_BRACE, open)
    return close < 0 ? css.slice(open) : css.slice(open, close)
  }

  const names = [...body.matchAll(/animation:\s*([A-Za-z][\w-]*)/g)].map((m) => m[1]!)
  for (const name of names) {
    const frames = keyframesOf(name)
    if (frames === null) continue
    expect(
      frames,
      `@keyframes ${name} animates transform on the disc — that overrides the JS spin`,
    ).not.toMatch(/transform\s*:/)
  }
})
