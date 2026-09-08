import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MatchupBadge } from './MatchupBadge'
import { ELEMENTAL_RINGS, strongAgainst, weakAgainst } from '../game/elementalCycle'
import { KINGDOMS } from '../game/kingdoms'

/**
 * The matchup badge, and the rings behind it.
 *
 * ⚠️ THESE RINGS ARE A SECOND COPY OF THE SERVER'S, AND THE DANGER IS SPECIFIC.
 * The damage is decided entirely on the server; this side only says who to
 * expect it from. If the two ever disagreed the game would keep playing
 * perfectly while telling the player the wrong thing about why — which is far
 * harder to notice, and to chase, than an outright wrong number.
 *
 * Both repos pin the chain to the same list, so a change to one fails the other
 * side's test rather than silently drifting.
 */

describe('the elemental rings', () => {
  it('places every kingdom exactly once', () => {
    const placed = ELEMENTAL_RINGS.flat()
    expect(new Set(placed).size, 'a kingdom is in two rings').toBe(placed.length)
    expect(placed.length, 'the rings do not cover every kingdom').toBe(KINGDOMS.length)
    for (const k of KINGDOMS) {
      expect(placed, `${k.id} is in no ring`).toContain(k.id)
    }
  })

  it('matches the chain the server holds', () => {
    // Stated as the pairs rather than derived, so this fails if either side is
    // edited alone.
    const chain: [string, string][] = [
      ['water', 'fire'],
      ['fire', 'ice'],
      ['ice', 'nature'],
      ['nature', 'earth'],
      ['earth', 'air'],
      ['air', 'electricity'],
      ['electricity', 'water'],
      ['time', 'space'],
      ['space', 'light'],
      ['light', 'dark'],
      ['dark', 'love'],
      ['love', 'time'],
      ['joker', 'kitsune'],
      ['kitsune', 'magma'],
      ['magma', 'insects'],
      ['insects', 'joker'],
    ]
    for (const [a, b] of chain) {
      expect(strongAgainst(a), `${a} should beat ${b}`).toBe(b)
      expect(weakAgainst(b), `${b} should fear ${a}`).toBe(a)
    }
  })

  it('reads the same relationship from both ends', () => {
    for (const k of KINGDOMS) {
      const beats = strongAgainst(k.id)!
      expect(beats, `${k.id} is strong against nothing`).toBeTruthy()
      expect(weakAgainst(beats)).toBe(k.id)
    }
  })
})

describe('the badge', () => {
  it('names both kingdoms, not just the direction', () => {
    // ⚠️ AN ARROW ALONE IS USELESS HERE. It would tell a player they are strong
    // at something without saying what — and the badge exists to answer "who
    // should I be hitting" in the couple of seconds they have to decide.
    render(<MatchupBadge kingdomId="water" />)
    expect(screen.getByTestId('matchup-strong').textContent).toContain('Fire')
    expect(screen.getByTestId('matchup-weak').textContent).toContain('Electricity')
  })

  it('wraps around the end of a ring', () => {
    // Electricity is last in its ring and beats Water, the first.
    render(<MatchupBadge kingdomId="electricity" />)
    expect(screen.getByTestId('matchup-strong').textContent).toContain('Water')
  })

  it('says it in words for a screen reader', () => {
    // Visually it is an arrow and two icons, which reads as nothing at all.
    render(<MatchupBadge kingdomId="time" />)
    expect(screen.getByLabelText(/Strong against Space/i)).toBeTruthy()
    expect(screen.getByLabelText(/Weak against Love/i)).toBeTruthy()
  })

  it('draws nothing for a kingdom it does not know', () => {
    const { container } = render(<MatchupBadge kingdomId="not-a-kingdom" />)
    expect(container.querySelector('[data-testid="matchup-badge"]')).toBeNull()
  })

  it('draws nothing before a kingdom is chosen', () => {
    const { container } = render(<MatchupBadge kingdomId={null} />)
    expect(container.querySelector('[data-testid="matchup-badge"]')).toBeNull()
  })
})
