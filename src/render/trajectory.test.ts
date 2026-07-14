import { test, expect } from 'vitest'
import { lerp, lerpPoint, angleBetween, distance } from './trajectory'

test('lerp and lerpPoint follow a straight line', () => {
  expect(lerp(0, 10, 0.5)).toBe(5)
  expect(lerpPoint({ x: 0, y: 0 }, { x: 100, y: 200 }, 0.25)).toEqual({ x: 25, y: 50 })
  expect(lerpPoint({ x: 0, y: 0 }, { x: 100, y: 200 }, 1)).toEqual({ x: 100, y: 200 })
})

test('angleBetween and distance', () => {
  expect(angleBetween({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(0)
  expect(angleBetween({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(Math.PI / 2)
  expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
})
