import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent, act } from '@testing-library/react'
import { VolcanoLayer } from './VolcanoLayer'
import type { VolcanoSnapshot } from '../../game/gameState'

afterEach(cleanup)

// Magma's "The End of the World". The ability is a forced truce — for twenty
// seconds the table either cooperates or all goes down together — and none of
// that works unless the mountain is public, clickable, and visibly on a clock.

const standing: VolcanoSnapshot = {
  ownerId: 'magma',
  hp: 3000,
  maxHp: 5000,
  ticksRemaining: 240, // 12s at 20/s
}

const renderVolcano = (props: Partial<Parameters<typeof VolcanoLayer>[0]> = {}) =>
  render(
    <svg viewBox="0 0 1000 1000">
      <VolcanoLayer volcano={standing} tickRate={20} {...props} />
    </svg>,
  )

describe('the volcano', () => {
  it('is absent when there is none', () => {
    const { container } = renderVolcano({ volcano: null })
    expect(container.querySelector('[data-testid="volcano"]')).toBeNull()
  })

  it('stands in the middle of the field, not on anyone’s castle', () => {
    const { container } = renderVolcano()
    const d = container.querySelector('.volcano__rock')!.getAttribute('d')!
    // Curved flanks and a notched rim, not a triangle.
    expect(d).toContain('C')
    expect([...d.matchAll(/L /g)].length).toBeGreaterThan(2)
    // Its base spans the centre of the 1000×1000 arena.
    const numbers = d.match(/-?\d+(\.\d+)?/g)!.map(Number)
    expect(Math.min(...numbers)).toBeLessThan(500)
    expect(Math.max(...numbers)).toBeGreaterThan(500)
  })

  it('is wider than it is tall — a mountain, not a spire', () => {
    const { container } = renderVolcano()
    const box = (container.querySelector('.volcano__rock') as SVGPathElement).getAttribute('d')!
    const nums = box.match(/-?\d+(\.\d+)?/g)!.map(Number)
    // Path pairs are (x, y); split them apart to measure the silhouette.
    const xs = nums.filter((_, i) => i % 2 === 0)
    const ys = nums.filter((_, i) => i % 2 === 1)
    const width = Math.max(...xs) - Math.min(...xs)
    const height = Math.max(...ys) - Math.min(...ys)
    // A squat mountain sits ON the battlefield; a tall narrow one reads as a
    // spire floating in front of it.
    expect(width).toBeGreaterThan(height)
  })

  it('is built up in layers rather than one flat cut-out', () => {
    const { container } = renderVolcano()
    // Form (a lit face), texture (ridges), heat (veins, flows, a molten pool
    // with a hot core) and a plume. Losing any of these flattens it.
    for (const cls of [
      'volcano__shadow',
      'volcano__face',
      'volcano__ridge',
      'volcano__vein',
      'volcano__flow',
      'volcano__crater',
      'volcano__core',
      'volcano__smoke',
    ]) {
      expect(container.querySelector(`.${cls}`)).not.toBeNull()
    }
  })

  it('shows its health and its clock to everyone', () => {
    const { container } = renderVolcano()
    const hud = container.querySelector('[data-testid="volcano-hud"]')!
    expect(hud).not.toBeNull()
    expect(hud.querySelector('.volcano__hp')?.textContent).toBe('3000 / 5000')
    expect(hud.querySelector('.volcano__clock')?.textContent).toBe('12')
  })

  it('draws the health bar in proportion to what is left', () => {
    const width = (hp: number) => {
      const { container } = render(
        <svg viewBox="0 0 1000 1000">
          <VolcanoLayer volcano={{ ...standing, hp }} tickRate={20} />
        </svg>,
      )
      const w = Number(container.querySelector('.volcano__bar-fill')!.getAttribute('width'))
      cleanup()
      return w
    }
    expect(width(5000)).toBeGreaterThan(width(2500))
    expect(width(2500)).toBeGreaterThan(width(0))
    expect(width(0)).toBe(0)
  })

  it('never draws a negative bar or a negative clock', () => {
    // Overkill and a lapsed clock both arrive as out-of-range numbers.
    const { container } = renderVolcano({
      volcano: { ...standing, hp: -400, ticksRemaining: -60 },
    })
    expect(Number(container.querySelector('.volcano__bar-fill')!.getAttribute('width'))).toBe(0)
    expect(container.querySelector('.volcano__clock')?.textContent).toBe('0')
    expect(container.querySelector('.volcano__hp')?.textContent).toBe('0 / 5000')
  })

  it('can be clicked to aim at it', () => {
    const onTarget = vi.fn()
    const { container } = renderVolcano({ onTarget })
    fireEvent.click(container.querySelector('[data-testid="volcano-hit"]')!)
    expect(onTarget).toHaveBeenCalledTimes(1)
  })

  it('offers no click to someone who cannot attack it', () => {
    // Magma and spectators are passed no handler — the server would reject
    // them, so they must not get a click that can only fail.
    const { container } = renderVolcano()
    expect(container.querySelector('[data-testid="volcano-hit"]')).toBeNull()
  })

  it('marks itself when you are aiming at it', () => {
    const { container } = renderVolcano({ targeted: true })
    expect(container.querySelector('.volcano__reticle')).not.toBeNull()
    cleanup()
    const plain = renderVolcano({ targeted: false })
    expect(plain.container.querySelector('.volcano__reticle')).toBeNull()
  })

  it('flags the last seconds as urgent', () => {
    const { container } = renderVolcano({
      volcano: { ...standing, ticksRemaining: 60 }, // 3s
    })
    expect(container.querySelector('.volcano__clock--urgent')).not.toBeNull()
    expect(container.querySelector('.volcano__crater--urgent')).not.toBeNull()
    cleanup()
    const early = renderVolcano()
    expect(early.container.querySelector('.volcano__clock--urgent')).toBeNull()
  })
})

describe('the volcano dying', () => {
  it('crumbles instead of vanishing the frame it is destroyed', () => {
    vi.useFakeTimers()
    try {
      const { container, rerender } = render(
        <svg viewBox="0 0 1000 1000">
          <VolcanoLayer volcano={standing} tickRate={20} />
        </svg>,
      )
      expect(container.querySelector('[data-testid="volcano"]')).not.toBeNull()

      // The server clears it the instant it is broken. The mountain has to
      // outlive that and be seen out.
      rerender(
        <svg viewBox="0 0 1000 1000">
          <VolcanoLayer volcano={null} tickRate={20} />
        </svg>,
      )
      const dying = container.querySelector('[data-testid="volcano"]')
      expect(dying).not.toBeNull()
      expect(dying!.getAttribute('data-dying')).toBe('true')
      // No health bar on a corpse — the fight is over.
      expect(container.querySelector('[data-testid="volcano-hud"]')).toBeNull()
      // And nothing to click.
      expect(container.querySelector('[data-testid="volcano-hit"]')).toBeNull()

      act(() => void vi.advanceTimersByTime(3000))
      expect(container.querySelector('[data-testid="volcano"]')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not animate a death for a volcano that never stood', () => {
    const { container } = render(
      <svg viewBox="0 0 1000 1000">
        <VolcanoLayer volcano={null} tickRate={20} />
      </svg>,
    )
    expect(container.querySelector('[data-testid="volcano"]')).toBeNull()
  })
})
