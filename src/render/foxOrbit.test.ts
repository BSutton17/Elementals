import { describe, it, expect } from 'vitest'
import { FoxOrbitSystem } from './systems/foxOrbit'
import { KITSUNE_RUSH_ORBIT } from './effects'
import type { DisplayNode, FoxOrbitConfig } from './types'

// Kitsune Rush's ring of foxes. The load-bearing behaviour is that it CIRCLES
// (rather than wandering like the fireflies swarm), that it lives exactly as
// long as the buff, and that a fox running the far side of the ring is never
// upside down.

function fakeNode(): DisplayNode {
  const scale = {
    x: 1,
    y: 1,
    set(x: number, y?: number) {
      this.x = x
      this.y = y ?? x
    },
  }
  return { x: 0, y: 0, alpha: 1, rotation: 0, visible: false, tint: 0xffffff, scale, destroy() {} }
}

const AT = { x: 500, y: 500 }

const CFG: FoxOrbitConfig = {
  count: 5,
  radius: 90,
  lapsPerSecond: 0.6,
  size: 15,
  color: 0xdff0ff,
  moteColor: 0x4aa8ff,
  flatten: 0.5,
}

function harness(cfg: FoxOrbitConfig = CFG) {
  const foxes: DisplayNode[] = []
  const sys = new FoxOrbitSystem(
    () => {
      const n = fakeNode()
      foxes.push(n)
      return n
    },
    fakeNode,
    16,
  )
  return { sys, foxes, cfg }
}

/** The foxes currently on the ring. */
const running = (foxes: DisplayNode[]) => foxes.filter((f) => f.visible)

describe('the ring of foxes', () => {
  it('puts the whole pack on the ring and keeps them there', () => {
    const { sys, foxes } = harness()
    sys.start('rush:a', AT, CFG)
    sys.update(16)
    expect(sys.has('rush:a')).toBe(true)
    expect(running(foxes)).toHaveLength(CFG.count)

    // Fifteen seconds of Rush: the ring is still full, and still a ring.
    for (let i = 0; i < 900; i++) sys.update(16)
    expect(running(foxes)).toHaveLength(CFG.count)
    for (const f of running(foxes)) {
      const dx = f.x - AT.x
      expect(Math.abs(dx)).toBeLessThanOrEqual(CFG.radius * 1.25)
    }
  })

  it('actually circles — every fox comes back round', () => {
    const { sys, foxes } = harness()
    sys.start('rush:a', AT, CFG)
    sys.update(16)
    const fox = running(foxes)[0]!

    let leftOfCastle = false
    let rightOfCastle = false
    let aboveCastle = false
    let belowCastle = false
    // One lap at 0.6 laps/sec is under two seconds; give it three.
    for (let i = 0; i < 190; i++) {
      sys.update(16)
      if (fox.x < AT.x - 20) leftOfCastle = true
      if (fox.x > AT.x + 20) rightOfCastle = true
      if (fox.y < AT.y - 20) aboveCastle = true
      if (fox.y > AT.y + 20) belowCastle = true
    }
    expect([leftOfCastle, rightOfCastle, aboveCastle, belowCastle]).toEqual([
      true,
      true,
      true,
      true,
    ])
  })

  it('runs a flattened ring, so it reads as ground and not a drawn circle', () => {
    const { sys, foxes } = harness()
    sys.start('rush:a', AT, CFG)
    let widest = 0
    let tallest = 0
    for (let i = 0; i < 190; i++) {
      sys.update(16)
      for (const f of running(foxes)) {
        widest = Math.max(widest, Math.abs(f.x - AT.x))
        tallest = Math.max(tallest, Math.abs(f.y - AT.y))
      }
    }
    expect(tallest).toBeLessThan(widest)
  })

  it('never stands a fox on its head', () => {
    const { sys, foxes } = harness()
    sys.start('rush:a', AT, CFG)
    for (let i = 0; i < 190; i++) {
      sys.update(16)
      for (const f of running(foxes)) {
        // A fox on the far side is MIRRORED (negative x scale), not rotated the
        // long way round — so its rotation always stays within a quarter turn
        // of level, and its vertical scale is never flipped.
        const upright = Math.cos(f.rotation)
        expect(upright).toBeGreaterThanOrEqual(-1e-9)
        expect(f.scale.y).toBeGreaterThan(0)
      }
    }
  })

  it('fades the pack in rather than popping it into place', () => {
    const { sys, foxes } = harness()
    sys.start('rush:a', AT, CFG)
    sys.update(16)
    const first = running(foxes)[0]!
    expect(first.alpha).toBeLessThan(0.5)
    for (let i = 0; i < 40; i++) sys.update(16)
    expect(running(foxes)[0]!.alpha).toBeCloseTo(1, 2)
  })
})

describe('ending the Rush', () => {
  it('lets them run off instead of blinking out', () => {
    const { sys, foxes } = harness()
    sys.start('rush:a', AT, CFG)
    for (let i = 0; i < 60; i++) sys.update(16)

    // Mean rather than max: the foxes are still lapping, so which one happens
    // to be furthest out changes frame to frame.
    const spread = (nodes: DisplayNode[]) =>
      nodes.reduce((sum, f) => sum + Math.hypot(f.x - AT.x, (f.y - AT.y) / 0.5), 0) /
      nodes.length

    const before = spread(running(foxes))
    sys.stop('rush:a')
    // Far enough in that the outward sprint dwarfs the stride bounce, which is
    // the same order of magnitude as a couple of frames of it.
    for (let i = 0; i < 15; i++) sys.update(16)

    // Still on screen, dimmer, and further out — sprinting away.
    const mid = running(foxes)
    expect(mid.length).toBe(CFG.count)
    expect(mid[0]!.alpha).toBeLessThan(1)
    expect(spread(mid)).toBeGreaterThan(before)
  })

  it('is gone once they have left', () => {
    const { sys, foxes } = harness()
    sys.start('rush:a', AT, CFG)
    for (let i = 0; i < 60; i++) sys.update(16)
    sys.stop('rush:a')
    for (let i = 0; i < 60; i++) sys.update(16)
    expect(sys.has('rush:a')).toBe(false)
    expect(sys.active).toBe(0)
    expect(running(foxes)).toHaveLength(0)
  })

  it('re-starting an existing ring moves it rather than doubling it', () => {
    const { sys, foxes } = harness()
    sys.start('rush:a', AT, CFG)
    sys.update(16)
    sys.start('rush:a', { x: 200, y: 200 }, CFG)
    for (let i = 0; i < 5; i++) sys.update(16)
    expect(sys.active).toBe(1)
    expect(running(foxes)).toHaveLength(CFG.count)
    for (const f of running(foxes)) {
      expect(Math.abs(f.x - 200)).toBeLessThanOrEqual(CFG.radius * 1.3)
    }
  })

  it('stopping a ring that was never started is harmless', () => {
    const { sys } = harness()
    expect(() => sys.stop('nobody')).not.toThrow()
    expect(sys.active).toBe(0)
  })

  it('clear() drops everything at once', () => {
    const { sys, foxes } = harness()
    sys.start('rush:a', AT, CFG)
    sys.start('rush:b', { x: 100, y: 100 }, CFG)
    for (let i = 0; i < 30; i++) sys.update(16)
    sys.clear()
    expect(sys.active).toBe(0)
    expect(running(foxes)).toHaveLength(0)
  })
})

describe('the Kitsune Rush ring config', () => {
  it('is a pack at a sprint, in Kitsune blue', () => {
    expect(KITSUNE_RUSH_ORBIT.count).toBeGreaterThanOrEqual(3)
    expect(KITSUNE_RUSH_ORBIT.lapsPerSecond).toBeGreaterThan(0)
    // Squashed, so the ring reads as ground being circled.
    expect(KITSUNE_RUSH_ORBIT.flatten!).toBeLessThan(1)
    // Sprinting: a faster stride than the pack crossing the field.
    expect(KITSUNE_RUSH_ORBIT.gaitRate!).toBeGreaterThan(5.5)
  })
})
