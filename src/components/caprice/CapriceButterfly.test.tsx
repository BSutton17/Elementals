/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import { CapriceButterfly } from './CapriceButterfly'

afterEach(cleanup)

const renderButterfly = (active = true) =>
  render(
    <svg viewBox="0 0 1000 1000">
      <CapriceButterfly active={active} />
    </svg>,
  )

describe('the Caprice butterfly', () => {
  it('is absent when no butterfly is out', () => {
    const { container } = renderButterfly(false)
    expect(container.querySelector('[data-testid="caprice-butterfly"]')).toBeNull()
  })

  it('holds the middle of the field', () => {
    const { container } = renderButterfly()
    const halo = container.querySelector('.caprice__halo')!
    expect(halo.getAttribute('cx')).toBe('500')
    expect(halo.getAttribute('cy')).toBe('500')
  })

  it('has four wings, a body and antennae', () => {
    const { container } = renderButterfly()
    expect(container.querySelectorAll('.caprice__fore')).toHaveLength(2)
    expect(container.querySelectorAll('.caprice__hind')).toHaveLength(2)
    expect(container.querySelector('.caprice__thorax')).not.toBeNull()
    expect(container.querySelectorAll('.caprice__antenna')).toHaveLength(2)
  })

  it('carries vein tracery and soft lights, not heavy markings', () => {
    // The gradient is what draws this butterfly; heavy eyespots would fight it.
    const { container } = renderButterfly()
    expect(container.querySelectorAll('.caprice__vein').length).toBeGreaterThan(4)
    expect(container.querySelectorAll('.caprice__spot').length).toBeGreaterThan(2)
  })

  it('runs violet at the body out to teal-green at the tips', () => {
    // The whole identity of the thing. Both colours in every wing — split
    // between wings would read as two different butterflies.
    const { container } = renderButterfly()
    const defs = container.querySelector('defs')!.innerHTML
    expect(defs).toMatch(/3b0764|6d28d9|7c3aed/i) // violet, at the body
    expect(defs).toMatch(/22d3ee|14b8a6|bbf7d0|a7f3d0/i) // teal-green, at the tip
  })

  it('mirrors the gradient so the dark end is always against the body', () => {
    // One shared fill would run the same way on both wings, putting the dark
    // edge OUTSIDE on one of them and breaking the symmetry entirely.
    const { container } = renderButterfly()
    const left = container.querySelector('#caprice-wing-l')!
    const right = container.querySelector('#caprice-wing-r')!
    expect(left.getAttribute('x1')).not.toBe(right.getAttribute('x1'))
    // Each wing pair uses its own side's gradient.
    const fores = [...container.querySelectorAll('.caprice__fore')].map((n) =>
      n.getAttribute('fill'),
    )
    expect(new Set(fores).size).toBe(2)
  })

  it('is never alone', () => {
    // A single insect, however large, reads as a specimen. The scatter of
    // smaller butterflies is what makes it mystical.
    const { container } = renderButterfly()
    expect(container.querySelectorAll('.caprice__mote').length).toBeGreaterThan(3)
  })

  it('gives ONE slow beat every few seconds, not a burst', () => {
    // A permanent flap reads as a loading spinner, and a burst of four reads
    // as agitation. A settled butterfly opens its wings and gives a single
    // beat every five or six seconds.
    const css = readFileSync('src/components/caprice/CapriceButterfly.css', 'utf8')
    const beat = /@keyframes caprice-beat\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? ''
    expect(beat).toBeTruthy()
    // A real held-open stretch before anything happens — asserted as a share
    // of the cycle rather than a pinned percentage, so retuning the rhythm
    // does not break the test that only cares that the pause exists.
    const held = Number(/0%,\s*(\d+)%/.exec(beat)?.[1])
    expect(held).toBeGreaterThan(70)
    // Exactly one closure — one flap, not a flurry of them.
    const closes = [...beat.matchAll(/scaleX\((0\.\d+)\)/g)].map((m) => Number(m[1]))
    expect(closes).toHaveLength(1)
    // …and a deep one: closing to a fifth of its span is what reads as a FLAP
    // from across the board, where a shallow squeeze reads as breathing.
    expect(closes[0]).toBeLessThan(0.3)

    // The cycle itself has to be long enough that the beat is an event.
    const css2 = readFileSync('src/components/caprice/CapriceButterfly.css', 'utf8')
    const secs = Number(/\.caprice__wing\s*\{[^}]*animation:[^;]*?([\d.]+)s/.exec(css2)![1]!)
    expect(secs).toBeGreaterThanOrEqual(5)
    expect(secs).toBeLessThanOrEqual(7)
  })

  it('moves its antennae on a different rhythm from its wings', () => {
    // The mismatch is what makes it read as curious rather than as one
    // animated object.
    const css = readFileSync('src/components/caprice/CapriceButterfly.css', 'utf8')
    const wing = /\.caprice__wing\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
    const antennae = /\.caprice__antennae\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
    const wingSecs = /animation:[^;]*?([\d.]+)s/.exec(wing)?.[1]
    const antSecs = /animation:[^;]*?([\d.]+)s/.exec(antennae)?.[1]
    expect(wingSecs).toBeTruthy()
    expect(antSecs).toBeTruthy()
    expect(antSecs).not.toBe(wingSecs)
  })

  it('never eats a click', () => {
    const css = readFileSync('src/components/caprice/CapriceButterfly.css', 'utf8')
    const layer = /\.caprice\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
    expect(layer).toMatch(/pointer-events:\s*none/)
  })
})

describe('the arrival', () => {
  // Pink and green motes gather in a ring, rush together, and blow back out —
  // the butterfly is what the burst leaves behind.

  it('opens with a ring of sparks', () => {
    const { container } = renderButterfly()
    const sparks = container.querySelectorAll('.caprice__spark')
    expect(sparks.length).toBeGreaterThan(20)
  })

  it('is cast in pink and green', () => {
    // The ability's colours, and the whole point of the request.
    const { container } = renderButterfly()
    expect(container.querySelectorAll('.caprice__spark--pink').length).toBeGreaterThan(5)
    expect(container.querySelectorAll('.caprice__spark--green').length).toBeGreaterThan(5)
  })

  it('gives every spark a place on the ring and somewhere to be thrown', () => {
    const { container } = renderButterfly()
    for (const spark of container.querySelectorAll<SVGElement>('.caprice__spark')) {
      // Keyframes cannot compute a position, so both ends arrive inline.
      expect(spark.style.getPropertyValue('--ring-x')).toMatch(/^-?\d+px$/)
      expect(spark.style.getPropertyValue('--ring-y')).toMatch(/^-?\d+px$/)
      expect(spark.style.getPropertyValue('--burst-x')).toMatch(/^-?\d+px$/)
      expect(spark.style.getPropertyValue('--burst-y')).toMatch(/^-?\d+px$/)
    }
  })

  it('actually forms a ring rather than a cluster', () => {
    // Every spark starts life at the arena centre and is moved there by
    // transform; if the ring maths collapsed, they would all sit on the middle
    // and the gather would be invisible.
    const { container } = renderButterfly()
    const radii = [...container.querySelectorAll<SVGElement>('.caprice__spark')].map((s) =>
      Math.hypot(
        parseFloat(s.style.getPropertyValue('--ring-x')),
        parseFloat(s.style.getPropertyValue('--ring-y')),
      ),
    )
    for (const r of radii) expect(r).toBeGreaterThan(250)
    // …and the burst throws them further out than they started.
    const burst = [...container.querySelectorAll<SVGElement>('.caprice__spark')].map((s) =>
      Math.hypot(
        parseFloat(s.style.getPropertyValue('--burst-x')),
        parseFloat(s.style.getPropertyValue('--burst-y')),
      ),
    )
    for (const b of burst) expect(b).toBeGreaterThan(Math.max(...radii))
  })

  it('draws the ring around rather than snapping it on all at once', () => {
    const { container } = renderButterfly()
    const delays = [...container.querySelectorAll<SVGElement>('.caprice__spark')].map((s) =>
      parseFloat(s.style.animationDelay),
    )
    expect(new Set(delays).size).toBeGreaterThan(10)
    expect(Math.max(...delays)).toBeGreaterThan(0.2)
  })

  it('flashes where they meet', () => {
    const { container } = renderButterfly()
    expect(container.querySelector('.caprice__flash')).not.toBeNull()
  })

  it('runs the sparks, the flash and the reveal off ONE clock', () => {
    // Three separate durations would need retuning together every time one
    // changed, and any drift between them breaks the causal read: the burst has
    // to be what produces the butterfly.
    const css = readFileSync('src/components/caprice/CapriceButterfly.css', 'utf8')
    const durationOf = (sel: string) =>
      /animation:[^;]*?([\d.]+)s/.exec(
        new RegExp('\\' + sel + '\\s*\\{([^}]*)\\}').exec(css)![1]!,
      )![1]
    const spark = durationOf('.caprice__spark')
    expect(durationOf('.caprice__flash')).toBe(spark)
    expect(durationOf('.caprice__reveal')).toBe(spark)
  })

  it('sends the sparks ring → centre → burst, in that order', () => {
    const css = readFileSync('src/components/caprice/CapriceButterfly.css', 'utf8')
    const frames = /@keyframes caprice-gather\s*\{([\s\S]*?)\n\}/.exec(css)![1]!
    const ringAt = frames.indexOf('var(--ring-x)')
    const centreAt = frames.indexOf('translate(0, 0)')
    const burstAt = frames.indexOf('var(--burst-x)')
    expect(ringAt).toBeGreaterThan(-1)
    expect(centreAt).toBeGreaterThan(ringAt)
    expect(burstAt).toBeGreaterThan(centreAt)
  })

  it('keeps the reveal off the element that drifts', () => {
    // A CSS transform animation overrides another on the same element outright.
    // If the arrival scale shared a node with the endless hover, one of the two
    // would simply never run.
    const { container } = renderButterfly()
    const reveal = container.querySelector('.caprice__reveal')!
    expect(reveal).not.toBeNull()
    expect(reveal.classList.contains('caprice__body-group')).toBe(false)
    expect(reveal.querySelector('.caprice__body-group')).not.toBeNull()
  })

  it('clears the spawn away once it has landed', async () => {
    vi.useFakeTimers()
    try {
      const { container } = render(
        <svg viewBox="0 0 1000 1000">
          <CapriceButterfly active />
        </svg>,
      )
      expect(container.querySelector('[data-testid="caprice-spawn"]')).not.toBeNull()
      // Forty-odd sparks have no business sitting invisible on the field for
      // the remaining twenty-plus seconds.
      await act(async () => {
        vi.advanceTimersByTime(4000)
      })
      expect(container.querySelector('[data-testid="caprice-spawn"]')).toBeNull()
      // The butterfly itself stays.
      expect(container.querySelector('.caprice__reveal')).not.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not spawn anything when no butterfly is out', () => {
    const { container } = renderButterfly(false)
    expect(container.querySelector('[data-testid="caprice-spawn"]')).toBeNull()
  })
})

describe('everything is alive', () => {
  it('drifts each companion on its own path and its own clock', () => {
    const { container } = renderButterfly()
    const motes = [...container.querySelectorAll<SVGElement>('.caprice__mote')]
    expect(motes.length).toBeGreaterThan(3)
    for (const m of motes) {
      // Keyframes cannot compute a path, so the drift arrives inline.
      expect(m.style.getPropertyValue('--drift-x')).toMatch(/^-?\d+px$/)
      expect(m.style.getPropertyValue('--drift-y')).toMatch(/^-?\d+px$/)
      expect(m.style.animationDuration).toMatch(/^[\d.]+s$/)
    }
    // No two on the same cycle — a scatter that pulses together is one object.
    const cycles = motes.map((m) => m.style.animationDuration)
    expect(new Set(cycles).size).toBe(motes.length)
  })

  it('flutters the companions much faster than the giant beats', () => {
    const { container } = renderButterfly()
    const flutters = [...container.querySelectorAll<SVGElement>('.caprice__mote-wings')].map(
      (w) => parseFloat(w.style.animationDuration),
    )
    expect(flutters.length).toBeGreaterThan(3)
    const css = readFileSync('src/components/caprice/CapriceButterfly.css', 'utf8')
    const giant = parseFloat(
      /\.caprice__wing\s*\{[^}]*animation:[^;]*?([\d.]+)s/.exec(css)![1]!,
    )
    // A small butterfly beating at the giant's rate reads as a scale model of
    // it rather than as its own creature.
    for (const f of flutters) expect(f).toBeLessThan(giant / 3)
    expect(new Set(flutters).size).toBe(flutters.length)
  })

  it('keeps drift, placement and wingbeat on separate elements', () => {
    // A CSS transform animation OVERRIDES an SVG transform attribute outright.
    // If the drift shared an element with the placement, every companion would
    // snap to the centre of the board the moment the animation started.
    const { container } = renderButterfly()
    for (const mote of container.querySelectorAll('.caprice__mote')) {
      expect(mote.getAttribute('transform')).toBeNull()
      const placed = mote.querySelector('[transform]')
      expect(placed).not.toBeNull()
      expect(placed!.querySelector('.caprice__mote-wings')).not.toBeNull()
    }
  })
})
