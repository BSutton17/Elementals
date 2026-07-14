import { test, expect } from 'vitest'
import { Camera } from './camera'

test('shake stays within its magnitude and decays to zero', () => {
  const cam = new Camera(() => 0) // deterministic phase
  cam.shake({ magnitude: 10, durationMs: 100, frequency: 30 })
  expect(cam.shaking).toBe(true)
  for (let i = 0; i < 5; i++) {
    cam.update(10)
    expect(Math.abs(cam.offset.x)).toBeLessThanOrEqual(10.0001)
    expect(Math.abs(cam.offset.y)).toBeLessThanOrEqual(10.0001)
  }
  cam.update(60) // total 110ms > duration
  expect(cam.shaking).toBe(false)
  expect(cam.offset.x).toBe(0)
  expect(cam.offset.y).toBe(0)
})

test('clear cancels an in-progress shake', () => {
  const cam = new Camera(() => 0.5)
  cam.shake({ magnitude: 8, durationMs: 500 })
  cam.update(50)
  cam.clear()
  expect(cam.shaking).toBe(false)
  expect(cam.offset).toEqual({ x: 0, y: 0 })
})
