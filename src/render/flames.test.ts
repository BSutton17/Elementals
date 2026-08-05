import { describe, it, expect } from 'vitest'
import { FlameSystem } from './systems/flames'
import type { DisplayNode, FlameBurstConfig } from './types'

// Fox Fire's detonation. The point of this system is that it does NOT look like
// the impact ring: the flames spread unevenly, they point outward, and some of
// them stay burning long after the blast.

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

const CFG: FlameBurstConfig = {
  tongues: 16,
  reach: 130,
  tongueSize: 44,
  durationMs: 600,
  color: 0x4aa8ff,
  coreColor: 0xdff0ff,
  pockets: 10,
  pocketRadius: 170,
  pocketMs: 3200,
  pocketSize: 28,
}

function harness(cfg: FlameBurstConfig = CFG) {
  const nodes: DisplayNode[] = []
  const sys = new FlameSystem(
    () => {
      const n = fakeNode()
      nodes.push(n)
      return n
    },
    16,
  )
  return { sys, nodes, cfg }
}

const alight = (nodes: DisplayNode[]) => nodes.filter((n) => n.visible)

describe('the flame burst', () => {
  it('throws a tongue for every flame and a pocket for every pocket', () => {
    const { sys } = harness()
    sys.burst(AT, CFG)
    expect(sys.active).toBe(CFG.tongues + CFG.pockets!)
  })

  it('spreads unevenly — it is fire, not a wheel of spokes', () => {
    const { sys, nodes } = harness({ ...CFG, pockets: 0 })
    sys.burst(AT, { ...CFG, pockets: 0 })
    for (let i = 0; i < 20; i++) sys.update(16)

    const angles = alight(nodes)
      .map((n) => Math.atan2(n.y - AT.y, n.x - AT.x))
      .sort((a, b) => a - b)
    const gaps: number[] = []
    for (let i = 1; i < angles.length; i++) gaps.push(angles[i]! - angles[i - 1]!)
    // Evenly spaced spokes would give near-identical gaps; jittered fire does
    // not. Assert the spread of gaps is a real fraction of their average.
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length
    const spread = Math.max(...gaps) - Math.min(...gaps)
    expect(spread).toBeGreaterThan(mean * 0.5)
  })

  it('reaches unequal distances, so the blast has an uneven edge', () => {
    const { sys, nodes } = harness({ ...CFG, pockets: 0 })
    sys.burst(AT, { ...CFG, pockets: 0 })
    for (let i = 0; i < 22; i++) sys.update(16)
    const dists = alight(nodes).map((n) => Math.hypot(n.x - AT.x, n.y - AT.y))
    expect(Math.max(...dists)).toBeGreaterThan(Math.min(...dists) * 1.4)
  })

  it('points each tongue the way it was thrown', () => {
    const { sys, nodes } = harness({ ...CFG, pockets: 0 })
    sys.burst(AT, { ...CFG, pockets: 0 })
    for (let i = 0; i < 22; i++) sys.update(16)
    for (const n of alight(nodes)) {
      const heading = Math.atan2(n.y - AT.y, n.x - AT.x)
      // The sprite's tip is +x, so its rotation must track where it is going.
      // (The travel is squashed vertically, so allow generous slack.)
      const delta = Math.abs(Math.atan2(Math.sin(n.rotation - heading), Math.cos(n.rotation - heading)))
      expect(delta).toBeLessThan(0.6)
    }
  })

  it('stretches flames along their own axis rather than drawing blobs', () => {
    const { sys, nodes } = harness({ ...CFG, pockets: 0 })
    sys.burst(AT, { ...CFG, pockets: 0 })
    for (let i = 0; i < 15; i++) sys.update(16)
    for (const n of alight(nodes)) expect(Math.abs(n.scale.x)).toBeGreaterThan(n.scale.y)
  })

  it('flares up fast and burns down slow', () => {
    const { sys, nodes } = harness({ ...CFG, tongues: 1, pockets: 0 })
    sys.burst(AT, { ...CFG, tongues: 1, pockets: 0 })
    const alphas: number[] = []
    for (let i = 0; i < 60; i++) {
      sys.update(16)
      const n = alight(nodes)[0]
      if (n) alphas.push(n.alpha)
    }
    const peak = alphas.indexOf(Math.max(...alphas))
    // The peak sits in the first part of its life, not the middle — fire is
    // never symmetric in time.
    expect(peak).toBeLessThan(alphas.length * 0.45)
  })

  it('is out once the burst is over', () => {
    const { sys, nodes } = harness({ ...CFG, pockets: 0 })
    sys.burst(AT, { ...CFG, pockets: 0 })
    for (let i = 0; i < 200; i++) sys.update(16)
    expect(sys.active).toBe(0)
    expect(alight(nodes)).toHaveLength(0)
  })
})

describe('the pockets left behind', () => {
  it('are still burning long after the blast has gone out', () => {
    const { sys, nodes } = harness()
    sys.burst(AT, CFG)
    // Well past the burst duration (600ms), well short of the pockets (3200ms).
    for (let i = 0; i < 110; i++) sys.update(16)
    const left = alight(nodes)
    expect(left.length).toBeGreaterThan(0)
    // …and every one is a pocket: upright, not a spent tongue.
    for (const n of left) expect(Math.abs(n.scale.x)).toBeCloseTo(n.scale.y, 5)
  })

  it('sit AROUND the kingdom rather than on the impact point', () => {
    const { sys, nodes } = harness()
    sys.burst(AT, CFG)
    for (let i = 0; i < 110; i++) sys.update(16)
    const dists = alight(nodes).map((n) => Math.hypot(n.x - AT.x, n.y - AT.y))
    expect(Math.max(...dists)).toBeGreaterThan(40)
    for (const d of dists) expect(d).toBeLessThanOrEqual(CFG.pocketRadius! + 1)
  })

  it('catch on a stagger and go out one at a time', () => {
    const { sys, nodes } = harness()
    sys.burst(AT, CFG)
    // Fire spreads: they must not all light on the same frame.
    sys.update(16)
    const litImmediately = alight(nodes).length
    expect(litImmediately).toBeLessThan(CFG.tongues + CFG.pockets!)

    // …nor all go out on the same frame.
    const counts: number[] = []
    for (let i = 0; i < 300; i++) {
      sys.update(16)
      counts.push(alight(nodes).length)
    }
    const tail = counts.slice(counts.findIndex((c) => c > 0 && c <= CFG.pockets!))
    expect(new Set(tail.filter((c) => c > 0)).size).toBeGreaterThan(2)
  })

  it('all burn out eventually', () => {
    const { sys, nodes } = harness()
    sys.burst(AT, CFG)
    for (let i = 0; i < 500; i++) sys.update(16)
    expect(sys.active).toBe(0)
    expect(alight(nodes)).toHaveLength(0)
  })

  it('are optional — a burst with no pockets leaves nothing behind', () => {
    const { sys } = harness()
    const noPockets: FlameBurstConfig = { ...CFG }
    delete noPockets.pockets
    sys.burst(AT, noPockets)
    expect(sys.active).toBe(CFG.tongues)
  })

  it('clear() puts everything out at once', () => {
    const { sys, nodes } = harness()
    sys.burst(AT, CFG)
    for (let i = 0; i < 20; i++) sys.update(16)
    sys.clear()
    expect(sys.active).toBe(0)
    expect(alight(nodes)).toHaveLength(0)
  })
})
