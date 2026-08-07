/// <reference types="node" />
// The app tsconfig limits `types` to vite/client, but @types/node is installed
// — the reference above opts this file in so it can read the stylesheet.
// (`?raw` is not an option: vitest stubs CSS imports to an empty string.)
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { KitsuneRushOverlay } from './KitsuneRushOverlay'

// The caster-side Kitsune Rush overlay. jsdom runs no CSS animations, so these
// pin the structure the drawing hangs off — above all that each mark is a
// single continuous stroke with a normalised length, and that it MOVES between
// draws rather than blinking on and off in a fixed socket.

const CSS = 'src/components/kitsuneRush/KitsuneRushOverlay.css'
const marks = () => [
  ...screen.getByTestId('kitsune-rush-overlay').querySelectorAll<HTMLElement>('.kitsune-rush__mark'),
]

describe('KitsuneRushOverlay', () => {
  it('shows nothing at all when the Rush is not running', () => {
    render(<KitsuneRushOverlay active={false} />)
    expect(screen.queryByTestId('kitsune-rush-overlay')).toBeNull()
  })

  it('draws a FEW strokes while the Rush holds, not a screenful', () => {
    // A handful taking turns. A screenful of foxfire reads as noise and hides
    // the battlefield the buff exists to help the player fight on.
    render(<KitsuneRushOverlay active />)
    const overlay = screen.getByTestId('kitsune-rush-overlay')
    expect(overlay.querySelector('.kitsune-rush__wash')).not.toBeNull()
    const count = overlay.querySelectorAll('.kitsune-rush__mark').length
    expect(count).toBeGreaterThanOrEqual(3)
    expect(count).toBeLessThanOrEqual(5)
  })

  it('layers a bloom under a bright core on every mark', () => {
    render(<KitsuneRushOverlay active />)
    for (const mark of marks()) {
      // A flat single stroke reads as ink; the pair is what makes it burn.
      expect(mark.querySelector('.kitsune-rush__glow')).not.toBeNull()
      expect(mark.querySelector('.kitsune-rush__core')).not.toBeNull()
    }
  })

  it('never takes input or hides the board', () => {
    render(<KitsuneRushOverlay active />)
    const overlay = screen.getByTestId('kitsune-rush-overlay')
    // A tempo buff must not cost the player the ability to read their own
    // castle, gold or ability bar while it runs.
    expect(overlay.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('every mark is DRAWN', () => {
  it('normalises every path so one dash animation traces any shape', () => {
    // Without `pathLength`, a tight loop and a long streak would draw at wildly
    // different rates off the same keyframes.
    render(<KitsuneRushOverlay active />)
    for (const mark of marks()) {
      for (const path of mark.querySelectorAll('path')) {
        expect(path.getAttribute('pathLength')).toBe('100')
      }
    }
  })

  it('draws each mark as ONE continuous stroke', () => {
    // A shape made of several subpaths would draw all of them at once and lose
    // any sense of a single line being traced by hand.
    render(<KitsuneRushOverlay active />)
    for (const mark of marks()) {
      const d = mark.querySelector('path')!.getAttribute('d')!
      expect(d.match(/M/gi)?.length ?? 0).toBe(1)
    }
  })

  it('grows the stroke from nothing to its full length', () => {
    const css = readFileSync(CSS, 'utf8')
    const draw = /@keyframes kitsune-rush-draw\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? ''
    expect(draw).toMatch(/stroke-dashoffset:\s*100/) // hidden at the start
    expect(draw).toMatch(/stroke-dashoffset:\s*0/) // complete by the end
    // The dash pair has to match the normalised length or it cannot hide it.
    const stroke = /\.kitsune-rush__glow,\s*\n\.kitsune-rush__core \{([^}]*)\}/.exec(css)?.[1] ?? ''
    expect(stroke).toMatch(/stroke-dasharray:\s*100/)
  })

  it('carries the whole clock all the way down to the paths', () => {
    // `inherit` resolves against the DIRECT parent, and a path's parent is the
    // svg — without the svg relaying it, the paths inherit its initial 0s and
    // every stroke renders permanently complete, killing the drawing outright.
    //
    // The DELAY matters just as much and is easier to miss. Each mark carries
    // its own stagger inline; relay the duration alone and the stroke starts
    // drawing immediately while the mark holding it is still waiting out that
    // delay, leaving the two permanently out of phase — lines snapping on
    // already finished, others fading away mid-stroke.
    const css = readFileSync(CSS, 'utf8')
    const svgRule = /\.kitsune-rush__mark svg \{([^}]*)\}/.exec(css)?.[1] ?? ''
    expect(svgRule).toMatch(/animation-duration:\s*inherit/)
    expect(svgRule).toMatch(/animation-delay:\s*inherit/)
    const stroke = /\.kitsune-rush__glow,\s*\n\.kitsune-rush__core \{([^}]*)\}/.exec(css)?.[1] ?? ''
    expect(stroke).toMatch(/animation-duration:\s*inherit/)
    expect(stroke).toMatch(/animation-delay:\s*inherit/)
  })

  it('finishes drawing before it starts fading', () => {
    // A stroke still being traced as it disappears is the flicker the player
    // sees as "glitching". The draw has to complete inside the held-open window.
    const css = readFileSync(CSS, 'utf8')
    const drawDone = Number(/@keyframes kitsune-rush-draw[\s\S]*?(\d+)%,\s*\n\s*100%/.exec(css)![1])
    const fadeStarts = Number(/@keyframes kitsune-rush-cycle[\s\S]*?\n\s*\d+%,\s*\n\s*(\d+)%\s*\{\s*opacity:\s*1/.exec(css)![1])
    expect(drawDone).toBeLessThan(fadeStarts)
  })

  it('rests with the screen clear before coming back', () => {
    // The gap at the tail is what makes a few marks read as taking turns
    // instead of the screen being permanently full.
    const css = readFileSync(CSS, 'utf8')
    const cycle = /@keyframes kitsune-rush-cycle\s*\{([\s\S]*?)\n\}/.exec(css)![1]!
    const restFrom = Number(/(\d+)%,\s*\n\s*100%\s*\{\s*opacity:\s*0/.exec(cycle)![1])
    expect(restFrom).toBeLessThan(100)
    expect(restFrom).toBeGreaterThan(50)
  })

  it('draws slowly enough to look like a hand, not a flicker', () => {
    render(<KitsuneRushOverlay active />)
    for (const m of marks()) {
      expect(parseFloat(m.style.animationDuration)).toBeGreaterThan(2)
    }
  })

  it('spreads the marks across the cycle so they hand over to one another', () => {
    // Random delays clump: several marks land on nearly the same offset and the
    // screen pulses full and then empty instead of turning over steadily.
    render(<KitsuneRushOverlay active />)
    const delays = marks()
      .map((m) => parseFloat(m.style.animationDelay))
      .sort((a, b) => a - b)
    expect(delays).toHaveLength(5)
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]! - delays[i - 1]!).toBeGreaterThan(0.3)
    }
  })

  it('gives every mark its own place, angle, size and pace', () => {
    render(<KitsuneRushOverlay active />)
    const all = marks()
    for (const m of all) {
      expect(m.style.left).toMatch(/^-?[\d.]+%$/)
      expect(m.style.top).toMatch(/^-?[\d.]+%$/)
      expect(m.style.width).toMatch(/^[\d.]+vmax$/)
      expect(m.style.transform).toMatch(/^rotate\(-?\d+deg\)$/)
      expect(m.style.animationDuration).toMatch(/^[\d.]+s$/)
    }
    // Scattered, not stacked.
    expect(new Set(all.map((m) => m.style.left)).size).toBeGreaterThan(all.length / 2)
    // Staggered, so the screen is never blank and never floods.
    expect(new Set(all.map((m) => m.style.animationDelay)).size).toBeGreaterThan(1)
  })

  it('lets the shapes take longer to trace than the speed lines', () => {
    render(<KitsuneRushOverlay active />)
    const by = (kind: string) =>
      marks()
        .filter((m) => m.dataset.kind === kind)
        .map((m) => parseFloat(m.style.animationDuration))
    const streaks = by('streak')
    const shapes = [...by('loop'), ...by('swirl')]
    if (streaks.length && shapes.length) {
      expect(Math.min(...shapes)).toBeGreaterThan(Math.max(...streaks))
    }
  })
})

describe('a finished mark is redrawn somewhere new', () => {
  it('moves when its cycle ends, rather than repeating in place', () => {
    // The load-bearing behaviour. Without this the screen is a fixed set of
    // marks blinking on and off in their sockets, which is what "stuck to one
    // point" looked like.
    render(<KitsuneRushOverlay active />)
    const mark = marks()[0]!
    const before = {
      left: mark.style.left,
      top: mark.style.top,
      rotate: mark.style.transform,
      d: mark.querySelector('path')!.getAttribute('d'),
    }

    // Fire enough cycles that an unchanged placement cannot be coincidence.
    let moved = false
    for (let i = 0; i < 12 && !moved; i++) {
      act(() => {
        fireEvent(mark, new Event('animationiteration', { bubbles: false }))
      })
      moved =
        mark.style.left !== before.left ||
        mark.style.top !== before.top ||
        mark.style.transform !== before.rotate
    }
    expect(moved).toBe(true)
  })

  it('keeps the redrawn mark well-formed', () => {
    render(<KitsuneRushOverlay active />)
    const mark = marks()[0]!
    act(() => {
      fireEvent(mark, new Event('animationiteration', { bubbles: false }))
    })
    expect(mark.style.left).toMatch(/^-?[\d.]+%$/)
    expect(mark.style.animationDuration).toMatch(/^[\d.]+s$/)
    expect(['streak', 'swirl', 'loop']).toContain(mark.dataset.kind)
    // Both paths are re-pointed together, or the bloom would trace a different
    // shape from the core it is supposed to be sitting under.
    const [glow, core] = [...mark.querySelectorAll('path')]
    expect(glow!.getAttribute('d')).toBe(core!.getAttribute('d'))
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

  it('sits above the HUD, or it is painted behind the board', () => {
    const hud = zIndexOf('src/components/AbilityBar.css', '.ability-bar-wrapper')
    expect(zIndexOf(CSS, '.kitsune-rush')).toBeGreaterThan(hud)
  })

  it('still yields to the overlays that are meant to overrule it', () => {
    // Being blinded beats being fast: Fog and Hack both outrank it.
    const rush = zIndexOf(CSS, '.kitsune-rush')
    expect(rush).toBeLessThan(zIndexOf('src/components/FogOverlay.css', '.fog-overlay'))
    expect(rush).toBeLessThan(zIndexOf('src/components/HackOverlay.css', '.hack-overlay'))
  })
})
