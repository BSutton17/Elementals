import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DailyChallenges } from './DailyChallenges'
import type { DailyQuest } from '../game/auth'

// The menu panel. Its whole job is to answer "is there anything worth doing
// today" without being read closely, so the tests are about what it shows at a
// glance rather than about its markup.

const quest = (over: Partial<DailyQuest> = {}): DailyQuest => ({
  questId: 'q1',
  tier: 'easy',
  description: 'Win a match',
  progress: 0,
  target: 1,
  completed: false,
  xp: 40,
  coins: 25,
  ...over,
})

const inHours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString()

describe('DailyChallenges', () => {
  it('renders one row per quest with its progress', () => {
    render(
      <DailyChallenges
        quests={[
          quest({ questId: 'a', description: 'Win a match' }),
          quest({ questId: 'b', tier: 'medium', description: 'Deal 20,000 damage', progress: 8000, target: 20000 }),
          quest({ questId: 'c', tier: 'hard', description: 'Win with three kingdoms', progress: 1, target: 3 }),
        ]}
        resetsAt={inHours(6)}
      />,
    )
    expect(screen.getAllByTestId('menu-quest')).toHaveLength(3)
    expect(screen.getByText('Deal 20,000 damage')).toBeTruthy()
    expect(screen.getByText('8000/20000')).toBeTruthy()
    // The bar is the same number again, for anyone not reading the digits.
    const bars = screen.getAllByRole('progressbar')
    expect(bars[1]!.getAttribute('aria-valuenow')).toBe('8000')
    expect(bars[1]!.getAttribute('aria-valuemax')).toBe('20000')
  })

  it('shows nothing at all when there are no quests', () => {
    // A guest has no progress to show and never will, so the panel is absent
    // rather than present and empty.
    const { container } = render(<DailyChallenges quests={[]} resetsAt={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('summarises how many are done, and ticks the finished ones', () => {
    render(
      <DailyChallenges
        quests={[
          quest({ questId: 'a', completed: true, progress: 1 }),
          quest({ questId: 'b', completed: true, progress: 1 }),
          quest({ questId: 'c' }),
        ]}
        resetsAt={inHours(2)}
      />,
    )
    expect(screen.getByText('2/3')).toBeTruthy()
    expect(screen.getAllByText('✓')).toHaveLength(2)
  })

  it('counts only what is still unclaimed in the reward line', () => {
    // Advertising coins the player has already banked would be a lie the first
    // time they finish a quest and the number does not move.
    render(
      <DailyChallenges
        quests={[
          quest({ questId: 'a', completed: true, coins: 25, xp: 40 }),
          quest({ questId: 'b', coins: 60, xp: 90 }),
        ]}
        resetsAt={null}
      />,
    )
    expect(screen.getByText(/60 coins and 90 XP/)).toBeTruthy()
  })

  it('says when the day rolls over, in hours and minutes', () => {
    render(<DailyChallenges quests={[quest()]} resetsAt={inHours(6.5)} />)
    expect(screen.getByText(/new in 6h 3[01]m/)).toBeTruthy()
  })

  it('drops the countdown when the server did not send one', () => {
    // An older server, or a profile read that failed halfway: the panel still
    // works, it just says less.
    render(<DailyChallenges quests={[quest()]} resetsAt={null} />)
    expect(screen.queryByText(/new in/)).toBeNull()
    // "0/1" appears twice — the header summary and the row — which is itself
    // the point: both halves still render without a reset time.
    expect(screen.getAllByText('0/1')).toHaveLength(2)
  })
})
