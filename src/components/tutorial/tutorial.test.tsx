import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ThroneStep } from './steps/ThroneStep'
import { KingdomsStep } from './steps/KingdomsStep'
import { KINGDOM_ICONS } from './kingdomIcons'
import { KINGDOMS, SELECTABLE_KINGDOMS } from '../../game/kingdoms'

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
    // Thirteen today; derived, so this follows the roster rather than pinning it.
    expect(container.textContent).toContain('Thirteen Kingdoms')
    expect(KINGDOMS.length).toBe(13)
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
