/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ThroneStep } from './steps/ThroneStep'
import { KingdomsStep } from './steps/KingdomsStep'
import { KINGDOM_ICONS } from '../../game/kingdomIcons'
import { KINGDOMS, SELECTABLE_KINGDOMS } from '../../game/kingdoms'
import { ORBIT_TIMING, PULSE_FRACTION } from './steps/ThroneStep'

// The tutorial is the first thing a new player reads, so it drifting from the
// roster is worse than most bugs: it taught "Ten Kingdoms" for a while after
// there were thirteen, and drew water droplets for the three it didn't know.

describe('the tutorial keeps up with the roster', () => {
  it('gives every kingdom its own icon', () => {
    for (const k of KINGDOMS) expect(KINGDOM_ICONS[k.id]).toBeTruthy()
    // No two kingdoms share a face.
    const icons = KINGDOMS.map((k) => KINGDOM_ICONS[k.id])
    expect(new Set(icons).size).toBe(KINGDOMS.length)
  })

  it('orbits one orb per kingdom on page 1', () => {
    const { container } = render(<ThroneStep />)
    expect(container.querySelectorAll('.howto-orbit__orb')).toHaveLength(KINGDOMS.length)
  })

  it('states the real number of kingdoms in the headline', () => {
    const { container } = render(<ThroneStep />)
    // Derived from the roster, so adding a kingdom updates the headline rather
    // than breaking this test — pinning the number here defeats the point.
    const words = [
      'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
      'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
    ]
    expect(container.textContent).toContain(`${words[KINGDOMS.length]} Kingdoms`)
  })

  it('gives the near-black kingdom a readable icon colour', () => {
    // Dark's orb is #12121a — a dark icon on it would be invisible.
    const { container } = render(<ThroneStep />)
    const orbs = [...container.querySelectorAll('.howto-orbit__orb')] as HTMLElement[]
    const darkIndex = KINGDOMS.findIndex((k) => k.id === 'dark')
    expect(orbs[darkIndex]!.style.getPropertyValue('--orb-ink')).toBe('#f7f7f2')
    // …and the pale one keeps the dark ink.
    const lightIndex = KINGDOMS.findIndex((k) => k.id === 'light')
    expect(orbs[lightIndex]!.style.getPropertyValue('--orb-ink')).toBe('#0b0e17')
  })

  it('browses every selectable kingdom, each with its icon', () => {
    const { container } = render(<KingdomsStep />)
    const tabs = container.querySelectorAll('.howto-kingdoms__tab')
    expect(tabs).toHaveLength(SELECTABLE_KINGDOMS.length)
    expect(container.querySelectorAll('.howto-kingdoms__tab-icon')).toHaveLength(
      SELECTABLE_KINGDOMS.length,
    )
  })

  it('has real flavour for the newest three, not placeholder text', () => {
    const { container } = render(<KingdomsStep />)
    expect(container.textContent).not.toMatch(/placeholder/i)
    expect(container.textContent).not.toMatch(/coming soon/i)
  })
})

describe('the orbit wave', () => {
  it('travels at a constant speed, whatever the roster size', () => {
    const { container } = render(<ThroneStep />)
    const orbs = [...container.querySelectorAll('.howto-orbit__orb')] as HTMLElement[]
    const delays = orbs.map((o) => parseFloat(o.style.getPropertyValue('--orb-delay')))

    expect(delays[0]).toBe(0)
    // A fixed step per orb — the wave's speed, independent of how many there
    // are. (Deriving it from the count instead made the wave slower with every
    // kingdom added, which is not what "same speed" means.)
    delays.forEach((d, i) => expect(d).toBeCloseTo(ORBIT_TIMING.stepSeconds * i, 5))
  })

  it('fires in passes with a rest, rather than shimmering continuously', () => {
    const { container } = render(<ThroneStep />)
    const ring = container.querySelector('.howto-orbit') as HTMLElement
    expect(ring.style.getPropertyValue('--orb-cycle')).toBe(
      `${ORBIT_TIMING.cycleSeconds}s`,
    )
    // The pulse must leave real idle time in the cycle, or there is no rest.
    expect(PULSE_FRACTION).toBeLessThan(1)
    expect(PULSE_FRACTION).toBeGreaterThan(0)
  })

  it('keeps the CSS keyframe offsets in step with the timing constants', () => {
    // Keyframe offsets have to be literal percentages — `var()` is invalid
    // there — so the pulse/rest split is duplicated in CSS and can silently
    // drift from the constants it is meant to express.
    const css = readFileSync('src/pages/HowToPlay.css', 'utf8')
    const at = css.indexOf('@keyframes howto-orb-pulse')
    expect(at, 'the orb pulse keyframes vanished').toBeGreaterThan(-1)
    const open = css.indexOf('{', at)
    const block = css.slice(open, css.indexOf(String.fromCharCode(10) + '}', open))

    const peak = (PULSE_FRACTION / 2) * 100
    const end = PULSE_FRACTION * 100
    expect(block).toContain(peak.toFixed(1) + '%')
    expect(block).toContain(end.toFixed(0) + '%')
  })
})
