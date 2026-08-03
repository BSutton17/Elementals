import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { PerkChips } from './PerkChips'
import { PERKS } from '../game/perks'

describe('PerkChips', () => {
  it('shows both perks the player locked in', () => {
    const { container } = render(<PerkChips perks={['sharperSwords', 'deepPockets']} />)
    expect(container.querySelectorAll('.perk-chips__chip')).toHaveLength(2)
    expect(container.querySelector('[data-testid="perk-chip-sharperSwords"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="perk-chip-deepPockets"]')).not.toBeNull()
  })

  it('names the perk and its effect, so the bonus is never a mystery', () => {
    const { container } = render(<PerkChips perks={['sharperSwords']} />)
    const chip = container.querySelector('.perk-chips__chip')!
    const perk = PERKS.find((p) => p.id === 'sharperSwords')!
    expect(chip.getAttribute('title')).toContain(perk.name)
    expect(chip.getAttribute('title')).toContain(perk.description)
  })

  it('renders nothing at all when no perks were picked', () => {
    expect(render(<PerkChips perks={[]} />).container.firstChild).toBeNull()
    expect(render(<PerkChips />).container.firstChild).toBeNull()
  })

  it('ignores an unknown perk id rather than rendering a blank chip', () => {
    const { container } = render(<PerkChips perks={['sharperSwords', 'notAPerk']} />)
    expect(container.querySelectorAll('.perk-chips__chip')).toHaveLength(1)
  })
})
