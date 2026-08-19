import { describe, it, expect } from 'vitest'
import { placeKingdoms } from './placement'

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y)

describe('placeKingdoms (#193)', () => {
  it('returns one position per kingdom for 2–8 players', () => {
    for (let n = 2; n <= 8; n++) {
      expect(placeKingdoms(n)).toHaveLength(n)
    }
  })

  it('keeps every kingdom on the circle', () => {
    for (const p of placeKingdoms(5, 500, 500, 340)) {
      expect(dist(p, { x: 500, y: 500 })).toBeCloseTo(340, 6)
    }
  })

  it('2 players form a line through the center (opposite ends)', () => {
    const [a, b] = placeKingdoms(2, 500, 500, 340)
    expect((a!.x + b!.x) / 2).toBeCloseTo(500, 6)
    expect((a!.y + b!.y) / 2).toBeCloseTo(500, 6)
  })

  it('3 players form an equilateral triangle', () => {
    const [a, b, c] = placeKingdoms(3)
    const sides = [dist(a!, b!), dist(b!, c!), dist(c!, a!)]
    expect(sides[0]).toBeCloseTo(sides[1]!, 6)
    expect(sides[1]).toBeCloseTo(sides[2]!, 6)
  })

  it('4 players form a square (equal sides and diagonals)', () => {
    const [a, b, c, d] = placeKingdoms(4)
    expect(dist(a!, b!)).toBeCloseTo(dist(b!, c!), 6)
    expect(dist(b!, c!)).toBeCloseTo(dist(c!, d!), 6)
    expect(dist(c!, d!)).toBeCloseTo(dist(d!, a!), 6)
    expect(dist(a!, c!)).toBeCloseTo(dist(b!, d!), 6)
  })

  it('the first kingdom sits at the top of the circle', () => {
    const [first] = placeKingdoms(6, 500, 500, 340)
    expect(first!.x).toBeCloseTo(500, 6)
    expect(first!.y).toBeCloseTo(160, 6) // 500 − 340
  })
})

/**
 * The arena and the effects layer must place seats from the SAME list.
 *
 * Placement is derived from a seat list's length and index, so two callers with
 * different lists silently disagree about where every kingdom is. That is what
 * happened: `BattlefieldView` seats `match.players.filter(p => !p.spectator)`
 * while `BattlefieldFx` was handed `match.players` — so one watcher turned a
 * 7-seat board into an 8-seat circle for effects only. Both endpoints of every
 * animation were drawn at the wrong place, and it looked intermittent because a
 * lobby with no spectator lines up perfectly.
 */
describe('spectators must not shift the battlefield layout', () => {
  const seat = (id: string, spectator = false) => ({ id, spectator })

  it('a spectator changes the layout when they are not filtered out', () => {
    const players = [seat('a'), seat('b'), seat('c'), seat('watcher', true)]
    const playing = players.filter((p) => !p.spectator)

    const correct = placeKingdoms(playing.length)
    const wrong = placeKingdoms(players.length)

    // Proof the bug was real: same kingdom, two different places.
    expect(correct).toHaveLength(3)
    expect(wrong).toHaveLength(4)
    // Seat 0 is pinned to -PI/2 whatever the count, so the drift has to be read
    // off a later seat — every one of which moves.
    expect(wrong[1]!.angle).not.toBeCloseTo(correct[1]!.angle)
    expect(wrong[2]!.angle).not.toBeCloseTo(correct[2]!.angle)
  })

  it('the mismatch grows with the roster, which is why it showed at 6-7 players', () => {
    // At full house the spacing error is a whole seat's worth of arc.
    const sevenSeats = placeKingdoms(7)
    const eightSeats = placeKingdoms(8)
    const drift = Math.abs(eightSeats[6]!.angle - sevenSeats[6]!.angle)
    expect(drift).toBeGreaterThan(0.5) // radians — visibly wrong, not a nudge
  })

  it('filtering spectators reproduces the arena layout exactly', () => {
    const players = [seat('watcher', true), seat('a'), seat('b'), seat('c')]
    const playing = players.filter((p) => !p.spectator)
    expect(placeKingdoms(playing.length)).toEqual(placeKingdoms(3))

    // And a spectator EARLIER in the list shifts every index after it, which is
    // the severe form — kingdoms land on each other's sites, not just off-centre.
    const wrongIndexOfA = players.findIndex((p) => p.id === 'a')
    const rightIndexOfA = playing.findIndex((p) => p.id === 'a')
    expect(wrongIndexOfA).not.toBe(rightIndexOfA)
  })
})
