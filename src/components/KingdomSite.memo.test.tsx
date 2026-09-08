import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '@testing-library/react'
import {
  KingdomSite,
  sameSite,
  WATCHED_STATUS_IDS,
  type KingdomSiteProps,
} from './KingdomSite'
import type { GamePlayer } from '../game/gameState'

/**
 * The memo on `KingdomSite`, and the one way it could go wrong quietly.
 *
 * ⚠️ THE COMPARATOR IS A SECOND, HAND-MAINTAINED COPY OF "WHAT THIS COMPONENT
 * DRAWS". That is what makes it fast and what makes it dangerous: a field read
 * in the render but missing from the comparator does not throw, does not warn,
 * and does not fail any ordinary test — it just stops updating on screen. A
 * castle that never freezes, a shield ring that never lights.
 *
 * So the first test here does not test behaviour at all. It reads the component
 * source and checks the two lists against each other, which is the only way to
 * catch a status added to the render six months from now.
 */

const source = readFileSync(join(__dirname, 'KingdomSite.tsx'), 'utf8')

const player = (over: Partial<GamePlayer> = {}): GamePlayer => ({
  id: 'a',
  name: 'Alice',
  kingdomId: 'fire',
  castle: { hp: 8000, maxHp: 10_000, shield: 0 },
  economy: { citizens: 12, currency: 500, incomePerTick: 1.2 },
  target: null,
  eliminated: false,
  ...over,
})

const props = (over: Partial<KingdomSiteProps> = {}): KingdomSiteProps => ({
  player: player(),
  color: '#ff0000',
  x: 100,
  y: 100,
  isYou: false,
  isYourTarget: false,
  tickRate: 20,
  ...over,
})

/** Renders once, re-renders with new props, and reports what is on screen. */
function rerenderWith(a: KingdomSiteProps, b: KingdomSiteProps) {
  const view = render(
    <svg>
      <KingdomSite {...a} />
    </svg>,
  )
  view.rerender(
    <svg>
      <KingdomSite {...b} />
    </svg>,
  )
  return view
}

describe('the KingdomSite memo', () => {
  it('watches every status the component actually reads', () => {
    // Every `s.id === 'thing'` in the render, whatever it is compared against.
    const read = new Set(
      [...source.matchAll(/s\.id === '([a-zA-Z]+)'/g)].map((m) => m[1]!),
    )
    const watched = new Set<string>(WATCHED_STATUS_IDS)

    const unwatched = [...read].filter((id) => !watched.has(id))
    expect(
      unwatched,
      `KingdomSite reads ${unwatched.join(', ')} but the memo does not compare it — ` +
        `add it to WATCHED_STATUS_IDS or it will stop appearing on screen`,
    ).toEqual([])

    // …and nothing lingers in the list that the component stopped reading, which
    // would quietly make the memo skip fewer renders than it could.
    const stale = [...watched].filter((id) => !read.has(id))
    expect(stale, `WATCHED_STATUS_IDS lists ${stale.join(', ')}, which is no longer read`).toEqual(
      [],
    )
  })

  it('redraws when a number it shows changes', () => {
    // The point of the comparator is skipping work, so the thing worth proving
    // is that it does NOT skip a real change.
    const { container } = rerenderWith(
      props(),
      props({ player: player({ castle: { hp: 1000, maxHp: 10_000, shield: 0 } }) }),
    )
    expect(container.textContent).not.toContain('8000')
    const bar = container.querySelector('[data-testid="health-bar-fill"], .health-bar__fill')
    expect(bar).toBeTruthy()
  })

  it('redraws when a watched status appears', () => {
    const { container } = rerenderWith(
      props(),
      props({
        player: player({ statuses: [{ id: 'frozen', remainingTicks: 100, stacks: 1 }] }),
      }),
    )
    expect(container.querySelector('[data-testid="frozen"]')).toBeTruthy()
  })

  it('redraws when the target ring goes on', () => {
    const { container } = rerenderWith(props(), props({ isYourTarget: true }))
    expect(container.querySelector('[data-testid="target-ring"]')).toBeTruthy()
  })

  it('skips the render the parent asks for ten times a second', () => {
    // ⚠️ THE WHOLE POINT, ASSERTED DIRECTLY. The parent re-derives the roster
    // and rebuilds every callback on each sync, so the props are all new
    // objects even when not one number has moved. If this returned false here
    // the memo would be pure overhead — a comparison run ten times a second
    // that never once skips anything.
    const a = props({ onSelect: () => {} })
    const b = props({ onSelect: () => {} }) // a different closure, as it would be
    expect(a.player).not.toBe(b.player) // …and a different object, as it would be
    expect(a.onSelect).not.toBe(b.onSelect)
    expect(sameSite(a, b)).toBe(true)
  })

  it('does not skip when the click handler appears or disappears', () => {
    // A kingdom that dies loses its handler. Identity is ignored; existence is
    // not, or an eliminated castle would stay clickable.
    expect(sameSite(props({ onSelect: () => {} }), props({ onSelect: undefined }))).toBe(false)
  })

  it.each([
    ['hp', props({ player: player({ castle: { hp: 1, maxHp: 10_000, shield: 0 } }) })],
    ['shield', props({ player: player({ castle: { hp: 8000, maxHp: 10_000, shield: 50 } }) })],
    ['citizens', props({ player: player({ economy: { citizens: 99, currency: 500, incomePerTick: 1.2 } }) })],
    ['income', props({ player: player({ economy: { citizens: 12, currency: 500, incomePerTick: 9 } }) })],
    ['elimination', props({ player: player({ eliminated: true }) })],
    ['name', props({ player: player({ name: 'Bob' }) })],
    ['level', props({ player: player({ level: 7 }) })],
    ['colour', props({ color: '#00ff00' })],
    ['position', props({ x: 5 })],
    ['being you', props({ isYou: true })],
    ['stat visibility', props({ showStats: false })],
    ['the fortress shield', props({ ultShield: true })],
    ['the slot readout', props({ slotDisplay: { text: 'Spinning…', spinning: true } })],
    ['a watched status', props({ player: player({ statuses: [{ id: 'frozen', remainingTicks: 5, stacks: 1 }] }) })],
  ])('redraws when %s changes', (_what, changed) => {
    expect(sameSite(props(), changed)).toBe(false)
  })

  it('ignores a status ticking down, which is what makes it worth having', () => {
    // ⚠️ `remainingTicks` MOVES ON EVERY SYNC — ten times a second, all match.
    // Comparing it would mean never skipping a render, and the memo would cost
    // a comparison while buying nothing at all. Nothing here draws it.
    const first = props({
      player: player({ statuses: [{ id: 'frozen', remainingTicks: 100, stacks: 1 }] }),
    })
    const second = props({
      player: player({ statuses: [{ id: 'frozen', remainingTicks: 40, stacks: 1 }] }),
    })
    const { container } = rerenderWith(first, second)
    // Still frozen, and the identical output is the evidence it did not need
    // to re-run to stay correct.
    expect(container.querySelector('[data-testid="frozen"]')).toBeTruthy()
  })
})

describe('a raised kingdom is not a dead one', () => {
  /**
   * ⚠️ REPORTED FROM A LIVE MATCH: Haunted raised the dead and the board still
   * said ELIMINATED. A ghost keeps `eliminated` true for the whole haunting —
   * that is what stops it winning the match and what makes it untargetable — so
   * anything reading that flag alone calls a kingdom that is up and attacking a
   * corpse.
   */
  it('says RISEN instead of ELIMINATED', () => {
    const { container } = render(
      <svg>
        <KingdomSite {...props({ player: player({ eliminated: true }), ghost: true })} />
      </svg>,
    )
    expect(container.querySelector('[data-testid="risen"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="eliminated"]')).toBeNull()
  })

  it('still says ELIMINATED for a kingdom that is actually out', () => {
    const { container } = render(
      <svg>
        <KingdomSite {...props({ player: player({ eliminated: true }) })} />
      </svg>,
    )
    expect(container.querySelector('[data-testid="eliminated"]')).toBeTruthy()
  })

  it('redraws when the haunting starts and when it ends', () => {
    // ⚠️ THE MEMO HAD TO LEARN THIS PROP. It compares what is drawn, field by
    // field — a new prop that changes the render and is not compared does not
    // throw or warn, it just stops updating, which here would mean a kingdom
    // stuck reading ELIMINATED for the whole haunting. Exactly the bug again,
    // arriving by a different route.
    const dead = props({ player: player({ eliminated: true }) })
    const risen = props({ player: player({ eliminated: true }), ghost: true })
    expect(sameSite(dead, risen)).toBe(false)
    expect(sameSite(risen, dead)).toBe(false)
  })
})
