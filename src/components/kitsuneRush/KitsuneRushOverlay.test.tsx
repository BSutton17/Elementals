/// <reference types="node" />
// The app tsconfig limits `types` to vite/client, but @types/node is installed
// — the reference above opts this file in so it can read the stylesheet.
// (`?raw` is not an option: vitest stubs CSS imports to an empty string.)
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KitsuneRushOverlay } from './KitsuneRushOverlay'

// The caster-side Kitsune Rush overlay. jsdom does not run CSS animations, so
// these pin the structure and the values the animation hangs off — above all
// that every mark is given a flight path, since a mark that merely flashes on
// and off says nothing about speed and that is the entire ability.

describe('KitsuneRushOverlay', () => {
  it('shows nothing at all when the Rush is not running', () => {
    render(<KitsuneRushOverlay active={false} />)
    expect(screen.queryByTestId('kitsune-rush-overlay')).toBeNull()
  })

  it('fills the screen with foxfire while the Rush holds', () => {
    render(<KitsuneRushOverlay active />)
    const overlay = screen.getByTestId('kitsune-rush-overlay')
    expect(overlay.querySelector('.kitsune-rush__wash')).not.toBeNull()
    expect(overlay.querySelectorAll('.kitsune-rush__mark').length).toBeGreaterThan(8)
  })

  it('draws all three kinds — streaks, swirls and loops', () => {
    render(<KitsuneRushOverlay active />)
    const overlay = screen.getByTestId('kitsune-rush-overlay')
    for (const kind of ['streak', 'swirl', 'loop']) {
      expect(overlay.querySelectorAll(`.kitsune-rush__mark--${kind}`).length).toBeGreaterThan(0)
    }
  })

  it('layers a bloom under a bright core on every mark', () => {
    render(<KitsuneRushOverlay active />)
    for (const mark of screen.getByTestId('kitsune-rush-overlay').querySelectorAll(
      '.kitsune-rush__mark',
    )) {
      // A flat single stroke reads as ink; the pair is what makes it burn.
      expect(mark.querySelector('.kitsune-rush__glow')).not.toBeNull()
      expect(mark.querySelector('.kitsune-rush__core')).not.toBeNull()
    }
  })
})

describe('every mark is in flight', () => {
  const marks = () => {
    render(<KitsuneRushOverlay active />)
    return [
      ...screen
        .getByTestId('kitsune-rush-overlay')
        .querySelectorAll<HTMLElement>('.kitsune-rush__mark'),
    ]
  }

  it('gives each one a real distance to travel', () => {
    // The load-bearing assertion. Without a flight vector these are status
    // lights blinking on a panel, not foxfire streaming past the camera.
    for (const mark of marks()) {
      const x = parseFloat(mark.style.getPropertyValue('--fly-x'))
      const y = parseFloat(mark.style.getPropertyValue('--fly-y'))
      expect(Number.isNaN(x)).toBe(false)
      expect(Number.isNaN(y)).toBe(false)
      // Far enough to cross a screen and leave it, not a nudge in place.
      expect(Math.hypot(x, y)).toBeGreaterThan(100)
    }
  })

  it('sends them past from every direction rather than all one way', () => {
    // All-one-heading reads as wind blowing across the board; coming from
    // everywhere reads as the player moving through it.
    const headings = marks().map((m) =>
      Math.atan2(
        parseFloat(m.style.getPropertyValue('--fly-y')),
        parseFloat(m.style.getPropertyValue('--fly-x')),
      ),
    )
    const quadrants = new Set(headings.map((h) => Math.floor((h + Math.PI) / (Math.PI / 2))))
    expect(quadrants.size).toBeGreaterThan(2)
  })

  it('points streaks along their own flight path, and tumbles the shapes', () => {
    for (const mark of marks()) {
      const rot = parseFloat(mark.style.getPropertyValue('--rot'))
      const spin = parseFloat(mark.style.getPropertyValue('--spin'))
      if (mark.className.includes('--streak')) {
        // A streak crossing the screen sideways to its own path looks like a
        // scratch on the lens, so its heading must match its travel.
        const heading =
          (Math.atan2(
            parseFloat(mark.style.getPropertyValue('--fly-y')),
            parseFloat(mark.style.getPropertyValue('--fly-x')),
          ) *
            180) /
          Math.PI
        const delta = Math.abs(((rot - heading + 540) % 360) - 180)
        expect(delta).toBeLessThan(1)
        // …and it holds that heading rather than spinning.
        expect(spin).toBe(0)
      } else {
        // Loops and swirls have no "forward" — spinning is what makes them
        // read as tumbling past rather than sliding.
        expect(Math.abs(spin)).toBeGreaterThan(90)
      }
    }
  })

  it('lets the shapes linger longer than the speed lines', () => {
    const all = marks()
    const durations = (sel: string) =>
      all
        .filter((m) => m.className.includes(sel))
        .map((m) => parseFloat(m.style.animationDuration))
    // A loop that whips past as fast as a streak just smears into another
    // streak; it needs long enough on screen to read as a shape.
    expect(Math.min(...durations('--loop'))).toBeGreaterThan(Math.max(...durations('--streak')))
  })

  it('staggers them so the stream is continuous, not a wave', () => {
    const delays = marks().map((m) => m.style.animationDelay)
    expect(new Set(delays).size).toBeGreaterThan(1)
    for (const d of delays) expect(d).toMatch(/^[\d.]+s$/)
  })

  it('bakes the flight inline, since CSS cannot compute it', () => {
    // Keyframe offsets and calc() divisors cannot read a var(), so the paths
    // have to arrive as concrete inline values.
    for (const mark of marks()) {
      expect(mark.style.animationDuration).toMatch(/^[\d.]+s$/)
      expect(mark.style.getPropertyValue('--fly-x')).toMatch(/^-?[\d.]+vmax$/)
      expect(mark.style.getPropertyValue('--rot')).toMatch(/^-?\d+deg$/)
      expect(mark.style.getPropertyValue('--spin')).toMatch(/^-?\d+deg$/)
    }
  })

  it('never takes input or hides the board', () => {
    render(<KitsuneRushOverlay active />)
    const overlay = screen.getByTestId('kitsune-rush-overlay')
    // A tempo buff must not cost the player the ability to read their own
    // castle, gold or ability bar while it runs.
    expect(overlay.getAttribute('aria-hidden')).toBe('true')
    expect(overlay.className).toContain('kitsune-rush')
  })
})

describe('the overlay is actually on top', () => {
  // This shipped invisible once: the overlay was z-index 60, which is UNDER
  // the ability bar (100) and the battlefield chrome, so it rendered perfectly
  // and was painted behind everything. jsdom does not apply stylesheets, so no
  // rendering test above can catch that — the CSS is read directly.
  const zIndexOf = (path: string, selector: string): number => {
    const css = readFileSync(path, 'utf8')
    // Built by concatenation, not as a template literal: a `\s` inside a
    // template literal is eaten before the regex ever sees it, which silently
    // turns the pattern into something that matches nothing and passes.
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const block = new RegExp(escaped + '\\s*\\{([^}]*)\\}').exec(css)
    expect(block, `the ${selector} rule vanished`).not.toBeNull()
    const z = /z-index:\s*(\d+)/.exec(block![1]!)
    expect(z, `${selector} has no z-index`).not.toBeNull()
    return Number(z![1])
  }

  const OVERLAY = 'src/components/kitsuneRush/KitsuneRushOverlay.css'

  it('sits above the HUD, or it is painted behind the board', () => {
    // The ability-bar wrapper is the highest thing in normal play.
    const hud = zIndexOf('src/components/AbilityBar.css', '.ability-bar-wrapper')
    expect(zIndexOf(OVERLAY, '.kitsune-rush')).toBeGreaterThan(hud)
  })

  it('still yields to the overlays that are meant to overrule it', () => {
    // Being blinded beats being fast: Fog, Flash Bang and Hack all outrank it.
    const rush = zIndexOf(OVERLAY, '.kitsune-rush')
    expect(rush).toBeLessThan(zIndexOf('src/components/FogOverlay.css', '.fog-overlay'))
    expect(rush).toBeLessThan(zIndexOf('src/components/HackOverlay.css', '.hack-overlay'))
  })
})
