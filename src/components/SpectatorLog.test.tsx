import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { SpectatorLog, describeCast } from './SpectatorLog'
import { applyEventBatch } from '../game/gameEvents'
import type { AbilityCastEvent } from '../game/events'

const cast = (casterId: string, abilityId: string): AbilityCastEvent => ({
  type: 'abilityCast',
  tick: 1,
  casterId,
  abilityId,
  targetIds: [],
  cost: 0,
})

describe('the spectator combat log', () => {
  const kingdomOf = (id: string) => (id === 'a' ? 'water' : id === 'b' ? 'fire' : null)

  it('reads a cast as "[kingdom] used [ability]"', () => {
    const line = describeCast(cast('a', 'waterBall'), kingdomOf)
    expect(line?.kingdom).toBe('Water')
    expect(line?.ability).toBe('Water Ball')
  })

  it('drops a cast it cannot name rather than showing a raw id', () => {
    // A newer server can send an ability this build has never heard of. Showing
    // "used waterBall_v2" to a player is worse than showing nothing.
    expect(describeCast(cast('a', 'not_a_real_ability'), kingdomOf)).toBeNull()
    // Same for a seat with no kingdom.
    expect(describeCast(cast('nobody', 'waterBall'), kingdomOf)).toBeNull()
  })

  it('starts collapsed so it never covers the fight', () => {
    render(<SpectatorLog kingdomOf={kingdomOf} />)
    expect(screen.getByRole('button', { name: /combat log/i })).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.queryByText(/waiting for the first move/i)).toBeNull()
  })

  it('shows what happened while it was closed', () => {
    render(<SpectatorLog kingdomOf={kingdomOf} />)
    // Fired BEFORE opening — a watcher who opens the log mid-fight should see
    // the last few moves, not an empty box.
    act(() => applyEventBatch({ tick: 1, events: [cast('a', 'waterBall') as never] }))
    fireEvent.click(screen.getByRole('button', { name: /combat log/i }))
    expect(screen.getByText('Water')).toBeTruthy()
    expect(screen.getByText('Water Ball')).toBeTruthy()
  })

  it('lists the newest cast first', () => {
    render(<SpectatorLog kingdomOf={kingdomOf} />)
    fireEvent.click(screen.getByRole('button', { name: /combat log/i }))
    act(() => applyEventBatch({ tick: 1, events: [cast('a', 'waterBall') as never] }))
    act(() => applyEventBatch({ tick: 2, events: [cast('b', 'fireball') as never] }))
    const names = screen.getAllByRole('listitem').map((li) => li.textContent)
    expect(names[0]).toContain('Fire')
    expect(names[1]).toContain('Water')
  })

  it('toggles shut again', () => {
    render(<SpectatorLog kingdomOf={kingdomOf} />)
    const toggle = screen.getByRole('button', { name: /combat log/i })
    fireEvent.click(toggle)
    expect(screen.getByText(/waiting for the first move/i)).toBeTruthy()
    fireEvent.click(toggle)
    expect(screen.queryByText(/waiting for the first move/i)).toBeNull()
  })
})

describe('who gets the log', () => {
  const kingdomOf = () => 'water'

  it('clears the kingdom header when one is still on screen', () => {
    // An eliminated player keeps their header; a spectator does not. Both see
    // the log, so it has to move rather than overlap.
    const { container, rerender } = render(<SpectatorLog kingdomOf={kingdomOf} belowHeader />)
    expect(container.querySelector('.spectator-log--below-header')).toBeTruthy()

    rerender(<SpectatorLog kingdomOf={kingdomOf} />)
    expect(container.querySelector('.spectator-log--below-header')).toBeNull()
  })
})
