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
