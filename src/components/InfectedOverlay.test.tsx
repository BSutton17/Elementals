/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import { InfectedOverlay } from './InfectedOverlay'

afterEach(cleanup)

const CSS = 'src/components/InfectedOverlay.css'
const css = () => readFileSync(CSS, 'utf8')

/**
 * The stylesheet with comments removed.
 *
 * Anything asserting a property is ABSENT has to read this rather than the raw
 * file: the comment explaining why a property must never be used contains the
 * property name, and would fail the very check it documents.
 */
const declarations = () => css().replace(/\/\*[\s\S]*?\*\//g, '')

/** The declarations inside one rule. */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const block = new RegExp(escaped + '\\s*\\{([^}]*)\\}').exec(css())
  expect(block, `the ${selector} rule vanished`).not.toBeNull()
  return block![1]!
}

describe('the Infected overlay', () => {
  it('shows nothing while the player is healthy', () => {
    const { container } = render(<InfectedOverlay active={false} />)
    expect(container.querySelector('[data-testid="infected-overlay"]')).toBeNull()
  })

  it('blurs the screen while Infected holds', () => {
    const { container } = render(<InfectedOverlay active />)
    expect(container.querySelector('[data-testid="infected-overlay"]')).not.toBeNull()
    expect(container.querySelector('.infected-overlay__blur')).not.toBeNull()
  })

  it('lifts slowly rather than blinking off', () => {
    // A sickness that vanishes between two frames reads as a bug.
    vi.useFakeTimers()
    try {
      const { container, rerender } = render(<InfectedOverlay active />)
      rerender(<InfectedOverlay active={false} />)
      // Still mounted, and no longer flagged as on, so the CSS fades it.
      const layer = container.querySelector('[data-testid="infected-overlay"]')
      expect(layer).not.toBeNull()
      expect(layer!.className).not.toContain('infected-overlay--on')

      act(() => {
        vi.advanceTimersByTime(2000)
      })
      expect(container.querySelector('[data-testid="infected-overlay"]')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('never eats a click', () => {
    // The victim has to keep playing through it — that is the whole design.
    expect(rule('.infected-overlay')).toMatch(/pointer-events:\s*none/)
  })
})

describe('it is soft, not blinding', () => {
  it('actually blurs what is underneath', () => {
    // `backdrop-filter` is the only thing here that touches the game itself; a
    // plain background would tint the screen without ever softening it.
    expect(rule('.infected-overlay__blur')).toMatch(/backdrop-filter:\s*blur\(/)
  })

  it('never isolates the group, or the blur silently becomes a no-op', () => {
    // A child with `mix-blend-mode` forces its parent to become an isolated
    // stacking context, and a backdrop-filter inside an isolated group has no
    // backdrop to sample — the blur renders as ZERO while every tint keeps
    // working perfectly. This shipped once and was invisible in screenshots:
    // a forced 12px blur produced byte-identical output to 2.4px, because both
    // were nothing. Nothing in this overlay may blend or set opacity on the
    // container that holds the backdrop-filter layers.
    expect(declarations()).not.toMatch(/mix-blend-mode/)
    expect(declarations()).not.toMatch(/\bisolation:\s*isolate/)
    // The container's own opacity is animated for the fade; that is fine only
    // because it settles at 1 while the effect is live.
    expect(rule('.infected-overlay--on')).toMatch(/opacity:\s*1/)
  })

  it('keeps the blur mild enough to play through', () => {
    // Fifteen seconds is a long time to be unable to read your own gold. Past a
    // few pixels this stops being a debuff and becomes a lockout.
    const blurs = [...css().matchAll(/blur\(([\d.]+)px\)/g)].map((m) => Number(m[1]))
    expect(blurs.length).toBeGreaterThan(2)
    for (const b of blurs) expect(b).toBeLessThanOrEqual(7)
  })

  it('never fully covers the board', () => {
    // Any layer here at full opacity would be a blackout wearing another name.
    const washOpacity = /opacity:\s*([\d.]+)/.exec(rule('.infected-overlay__fringe'))
    expect(Number(washOpacity![1])).toBeLessThan(0.5)
  })

  it('yields to the effects that are meant to overrule it', () => {
    // Being properly blinded beats being unwell, and those layers have to paint
    // SHARP on top of this one rather than through its blur.
    const z = (path: string, selector: string) => {
      const src = readFileSync(path, 'utf8')
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const block = new RegExp(escaped + '\\s*\\{([^}]*)\\}').exec(src)
      return Number(/z-index:\s*(\d+)/.exec(block![1]!)![1])
    }
    const infected = z(CSS, '.infected-overlay')
    expect(infected).toBeLessThan(z('src/components/FogOverlay.css', '.fog-overlay'))
    expect(infected).toBeLessThan(z('src/components/HackOverlay.css', '.hack-overlay'))
    // …but above the HUD, or the ability bar would sit sharp on top of it.
    expect(infected).toBeGreaterThan(z('src/components/AbilityBar.css', '.ability-bar-wrapper'))
  })
})

describe('the disorientation', () => {
  it('moves the out-of-focus patch around the board', () => {
    // A fixed blur is a smudged screen; one that wanders is vision that will
    // not hold still. Transforming a backdrop-filter element moves the region
    // it samples, which is what drags the soft patch across the board.
    const swim = rule('.infected-overlay__swim')
    expect(swim).toMatch(/backdrop-filter:\s*blur\(/)
    expect(swim).toMatch(/animation:\s*infected-swim/)
    const frames = /@keyframes infected-swim\s*\{([\s\S]*?)\n\}/.exec(css())![1]!
    const offsets = [...frames.matchAll(/translate\((-?[\d.]+)%/g)].map((m) => Number(m[1]))
    expect(new Set(offsets).size).toBeGreaterThan(1)
  })

  it('separates the colours, and pulls them apart in opposite directions', () => {
    // The mismatch is what reads as your own focus failing rather than as fog.
    const a = /@keyframes infected-drift-a\s*\{([\s\S]*?)\n\}/.exec(css())![1]!
    const b = /@keyframes infected-drift-b\s*\{([\s\S]*?)\n\}/.exec(css())![1]!
    const startOf = (frames: string) => Number(/from\s*\{[^}]*translate\((-?[\d.]+)%/.exec(frames)![1])
    // One starts left, the other right.
    expect(Math.sign(startOf(a))).toBe(-Math.sign(startOf(b)))
  })

  it('keeps the focus breathing so the eye never settles', () => {
    const frames = /@keyframes infected-focus\s*\{([\s\S]*?)\n\}/.exec(css())![1]!
    const blurs = [...frames.matchAll(/blur\(([\d.]+)px\)/g)].map((m) => Number(m[1]))
    expect(new Set(blurs).size).toBeGreaterThan(1)
  })
})

describe('reduced motion', () => {
  const reduced = () => {
    const src = css()
    const at = src.indexOf('@media (prefers-reduced-motion: reduce)')
    expect(at).toBeGreaterThan(-1)
    const open = src.indexOf('{', at)
    let depth = 0
    let i = open
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++
      else if (src[i] === '}' && --depth === 0) break
    }
    return src.slice(open + 1, i)
  }

  it('keeps the screen soft — the victim must still see WHY they are missing', () => {
    // Removing it entirely would leave their attacks rebounding with no cause
    // shown anywhere on screen.
    const block = reduced()
    expect(block).not.toMatch(/display:\s*none/)
    expect(block).not.toMatch(/opacity:\s*0\s*[;}]/)
    expect(block).toMatch(/backdrop-filter:\s*blur\(/)
  })

  it('stops the wandering rather than the effect', () => {
    const block = reduced()
    expect(block).toMatch(/animation-name:\s*infected-hold/)
    // …and that keyframe has to exist, or the name resolves to nothing and the
    // swim snaps back over the middle of the board.
    expect(css()).toMatch(/@keyframes\s+infected-hold\s*\{/)
  })
})
