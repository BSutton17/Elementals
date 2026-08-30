import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MonsterLayer } from './MonsterLayer'
import { MONSTER_KINDS, MONSTER_BOX, MONSTER_NAMES } from './monsters'
import type { MonsterSnapshot } from '../../game/gameState'

// The monster layer. What matters here is the FURNITURE — the health, the
// threat readout, the hit area — because those are what the table plays
// against. The creatures themselves are art and are reviewed by eye.

const monster = (over: Partial<MonsterSnapshot> = {}): MonsterSnapshot => ({
  hp: 6000,
  maxHp: 10_000,
  attackDamage: 900,
  ticksUntilAttack: 200,
  kind: 'dragon',
  ...over,
})

const svg = (ui: React.ReactElement) =>
  render(
    <svg viewBox="0 0 1000 1000">
      {ui}
    </svg>,
  )

describe('MonsterLayer', () => {
  it('draws nothing when there is no monster', () => {
    const { container } = svg(<MonsterLayer monster={null} tickRate={20} />)
    expect(container.querySelector('[data-testid="monster"]')).toBeNull()
  })

  it('names the creature and shows its health', () => {
    svg(<MonsterLayer monster={monster()} tickRate={20} />)
    expect(screen.getByText(MONSTER_NAMES.dragon)).toBeTruthy()
    expect(screen.getByText('6000 / 10000')).toBeTruthy()
  })

  it('says nothing about the swing — not its damage, not its timing', () => {
    // ⚠️ BOTH NUMBERS ARE DELIBERATELY ABSENT. A countdown turns every cycle
    // into a solved problem (shield on the last second, ignore it otherwise),
    // and a damage figure beside it just makes that arithmetic easier. Both
    // still arrive on the wire and the monster still swings on its own clock;
    // the player is shown the health bar and nothing else.
    const { container } = svg(
      <MonsterLayer monster={monster({ attackDamage: 900, ticksUntilAttack: 80 })} tickRate={20} />,
    )
    const hud = container.querySelector('[data-testid="monster-hud"]')!
    expect(hud.textContent).not.toMatch(/\d+s/)
    expect(hud.textContent).not.toContain('900')
    // The health bar is still there — this is a removal, not a blanking.
    expect(hud.textContent).toContain('6000 / 10000')
  })

  it('is clickable, and says what clicking it does', () => {
    const onTarget = vi.fn()
    svg(<MonsterLayer monster={monster()} tickRate={20} onTarget={onTarget} />)
    const hit = screen.getByTestId('monster-hit')
    expect(hit.getAttribute('aria-label')).toContain(MONSTER_NAMES.dragon)
    fireEvent.click(hit)
    expect(onTarget).toHaveBeenCalledOnce()
  })

  it('offers no hit area to a spectator', () => {
    svg(<MonsterLayer monster={monster()} tickRate={20} />)
    expect(screen.queryByTestId('monster-hit')).toBeNull()
  })

  it('sizes the hit area to the creature, weapon included', () => {
    // ⚠️ THE BOX IS THE DRAWN EXTENT. The goblin's cleaver reaches 176 units
    // out; a box that only covered its body would leave a third of what the
    // player is looking at unclickable.
    const onTarget = vi.fn()
    for (const kind of MONSTER_KINDS) {
      const { unmount } = svg(
        <MonsterLayer monster={monster({ kind })} tickRate={20} onTarget={onTarget} />,
      )
      const hit = screen.getByTestId('monster-hit')
      const width = Number(hit.getAttribute('width'))
      expect(width).toBeGreaterThan(MONSTER_BOX[kind].halfWidth * 2)
      unmount()
    }
  })

  it('falls back to a drawable monster when the server sends a kind it does not know', () => {
    // A client one release behind must degrade to "something is there, here is
    // its health", never to a blank arena or a crash.
    const { container } = svg(
      <MonsterLayer
        monster={{ ...monster(), kind: 'krakenoid' as never }}
        tickRate={20}
      />,
    )
    expect(container.querySelector('[data-testid="monster"]')).toBeTruthy()
    expect(screen.getByText('6000 / 10000')).toBeTruthy()
  })

  it('stays on screen after the server drops it, so it can die visibly', () => {
    // Killing this thing is what the whole table has been working towards; it
    // must not blink out of existence on the frame the last hit lands.
    const { container, rerender } = render(
      <svg viewBox="0 0 1000 1000">
        <MonsterLayer monster={monster()} tickRate={20} />
      </svg>,
    )
    rerender(
      <svg viewBox="0 0 1000 1000">
        <MonsterLayer monster={null} tickRate={20} />
      </svg>,
    )
    const corpse = container.querySelector('[data-testid="monster"]')
    expect(corpse).toBeTruthy()
    expect(corpse!.getAttribute('data-dying')).toBe('true')
    // …and the HUD goes with it: a dead monster has no next attack.
    expect(container.querySelector('[data-testid="monster-hud"]')).toBeNull()
  })
})
