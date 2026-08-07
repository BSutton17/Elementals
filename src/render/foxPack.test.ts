import { describe, it, expect } from 'vitest'
import { AnimationFramework } from './framework'
import { ABILITY_EFFECTS } from './effects'
import { applyGait } from './systems/projectiles'
import type { DisplayNode, FoxPackConfig, ProjectileConfig } from './types'

// Old Friends: a pack of foxes that RUNS to the target. What is worth pinning
// is that they travel as a group but not as one rigid object — same journey,
// different lanes, strides and arrival times.

function fakeNode(): DisplayNode {
  const scale = {
    x: 1,
    y: 1,
    set(x: number, y?: number) {
      this.x = x
      this.y = y ?? x
    },
  }
  // Hidden on creation, like the real Pixi node factories — the pool prewarms
  // spare nodes, and `visible` is how an in-flight fox is told from a spare.
  return { x: 0, y: 0, alpha: 1, rotation: 0, visible: false, tint: 0xffffff, scale, destroy() {} }
}

const FROM = { x: 200, y: 500 }
const TO = { x: 800, y: 500 }

const CFG: FoxPackConfig = {
  count: 4,
  durationMs: 1000,
  size: 16,
  color: 0xdff0ff,
  trailColor: 0x0f52ba,
  spread: 30,
  staggerMs: 80,
  durationJitter: 0.15,
  weave: 25,
}

/** The same pack with every random flourish switched off — no weave, no
 *  arrival jitter, no bob — so the lane geometry underneath can be asserted
 *  exactly rather than statistically. */
const CFG_PLAIN: FoxPackConfig = { ...CFG, weave: 0, durationJitter: 0, bounce: 0 }

/** A framework whose fox nodes are all recorded, so their paths can be read. */
function harness() {
  const foxes: DisplayNode[] = []
  const fw = new AnimationFramework({
    projectile: fakeNode,
    projectileFox: () => {
      const n = fakeNode()
      foxes.push(n)
      return n
    },
    impact: fakeNode,
    particle: fakeNode,
  })
  return { fw, foxes }
}

/** The y positions of the foxes currently crossing the field. */
function laneSpread(foxes: DisplayNode[]): number {
  const ys = foxes.filter((f) => f.visible).map((f) => f.y)
  return Math.max(...ys) - Math.min(...ys)
}

describe('the fox pack', () => {
  it('runs as one group — every fox on the field at the same time', () => {
    const { fw } = harness()
    fw.playFoxPack(FROM, TO, CFG)
    // The first fox leaves immediately; the rest are staggered behind it.
    fw.update(16)
    expect(fw.projectiles.active).toBe(1)
    // Past the last stagger they are all running together. If a fox waited for
    // another to finish this would be a volley, not a pack.
    for (let i = 0; i < 20; i++) fw.update(16)
    expect(fw.projectiles.active).toBe(CFG.count)
  })

  it('gives every fox its own lane, so they do not run single file', () => {
    const { fw, foxes } = harness()
    fw.playFoxPack(FROM, TO, CFG_PLAIN)
    for (let i = 0; i < 25; i++) fw.update(16) // all launched, all mid-run
    const running = foxes.filter((f) => f.visible)
    expect(running).toHaveLength(CFG_PLAIN.count)
    expect(new Set(running.map((f) => Math.round(f.y))).size).toBe(CFG_PLAIN.count)
    // …but still a pack: nobody strays outside the formation.
    for (const f of running) {
      expect(Math.abs(f.y - FROM.y)).toBeLessThanOrEqual(CFG_PLAIN.spread + 1)
    }
  })

  it('converges on the castle instead of arriving as a rank', () => {
    const { fw, foxes } = harness()
    fw.playFoxPack(FROM, TO, CFG_PLAIN)
    for (let i = 0; i < 25; i++) fw.update(16) // ~400ms: early in the run
    const early = laneSpread(foxes)
    for (let i = 0; i < 35; i++) fw.update(16) // ~960ms: closing on the castle
    const late = laneSpread(foxes)
    expect(late).toBeLessThan(early)
  })

  it('weaves — the run is not a straight line', () => {
    // One fox, no lane offset and no bounce, so every departure from the
    // straight line between the castles is the weave and nothing else.
    const solo: FoxPackConfig = {
      ...CFG,
      count: 1,
      spread: 0,
      staggerMs: 0,
      durationJitter: 0,
      bounce: 0,
      weave: 60,
    }
    const { fw, foxes } = harness()
    fw.playFoxPack(FROM, TO, solo)

    let above = 0
    let below = 0
    let widest = 0
    for (let i = 0; i < 80; i++) {
      fw.update(16)
      const fox = foxes.find((f) => f.visible)
      if (!fox) continue
      const off = fox.y - FROM.y
      if (off > 1) above++
      if (off < -1) below++
      widest = Math.max(widest, Math.abs(off))
    }
    // It leans to BOTH sides of the run — a loping weave, not a single bow.
    expect(above).toBeGreaterThan(0)
    expect(below).toBeGreaterThan(0)
    // …by a visible margin. The randomised amplitude bottoms out at 0.6×.
    expect(widest).toBeGreaterThan(solo.weave! * 0.5)
  })

  it('bursts exactly once, on the LAST fox in', () => {
    const { fw } = harness()
    let burst = 0
    fw.playFoxPack(FROM, TO, CFG, () => burst++)

    for (let i = 0; i < 400; i++) {
      const burstsBefore = burst
      fw.update(16)
      if (burst > burstsBefore) {
        // Fires on the frame the pack FINISHES — not when the leader gets in.
        // Deliberately not asserting that exactly one fox was still running
        // beforehand: with jittered arrivals the last two can land on the same
        // 16ms frame, which is fine and is not what this test is about.
        expect(fw.projectiles.active).toBe(0)
      }
    }
    expect(burst).toBe(1)
  })

  it('gets the whole pack home', () => {
    const { fw } = harness()
    fw.playFoxPack(FROM, TO, CFG)
    for (let i = 0; i < 400; i++) fw.update(16)
    expect(fw.projectiles.active).toBe(0)
  })

  it('is what Old Friends uses, with no straight-line projectile', () => {
    const fx = ABILITY_EFFECTS.oldFriends!
    expect(fx.foxPack).toBeDefined()
    expect(fx.projectile).toBeUndefined() // nothing is thrown; they run
    expect(fx.foxPack!.count).toBeGreaterThanOrEqual(3)
    expect(fx.foxPack!.count).toBeLessThanOrEqual(4)
    // Slower than Kitsune's actual projectiles — animals covering ground read
    // wrong at bolt speed, and this is the ability that arrives to stay.
    expect(fx.foxPack!.durationMs).toBeGreaterThan(ABILITY_EFFECTS.foxFire!.projectile!.durationMs)
    expect(fx.foxPack!.weave!).toBeGreaterThan(0)
    expect(fx.foxPack!.staggerMs).toBeGreaterThan(0)
  })
})

describe('the running gait', () => {
  const gaitCfg: ProjectileConfig = {
    durationMs: 1000,
    size: 16,
    color: 0xffffff,
    faceDirection: true,
    gait: { bounce: 10, rate: 5, tilt: 0.2 },
  }

  it('only ever lifts the fox, never sinks it into the ground', () => {
    // |sin| — a raw sine would drive alternate strides below the running line.
    let lowest = -Infinity
    for (let ms = 0; ms <= 1000; ms += 10) {
      const node = fakeNode()
      node.y = 500
      applyGait(node, FROM, TO, ms, gaitCfg)
      lowest = Math.max(lowest, node.y)
      expect(node.y).toBeLessThanOrEqual(500 + 1e-9)
    }
    expect(lowest).toBeCloseTo(500, 6) // it does touch back down each stride
  })

  it('bounds repeatedly rather than rising once', () => {
    const heights: number[] = []
    for (let ms = 0; ms <= 1000; ms += 5) {
      const node = fakeNode()
      node.y = 500
      applyGait(node, FROM, TO, ms, gaitCfg)
      heights.push(500 - node.y)
    }
    // 5 bounds/sec across 1s: the fox should be back on the ground ~5 times.
    expect(heights.filter((h) => h < 0.5).length).toBeGreaterThanOrEqual(5)
    expect(Math.max(...heights)).toBeCloseTo(10, 1) // the full bounce height
  })

  it('pitches about the direction of travel, not about world zero', () => {
    const node = fakeNode()
    node.y = 500
    // Running straight up the screen: the body must stay aligned to THAT run,
    // or the fox pitches sideways.
    const from = { x: 500, y: 900 }
    const to = { x: 500, y: 100 }
    const axis = Math.atan2(to.y - from.y, to.x - from.x)
    for (let ms = 0; ms <= 1000; ms += 25) {
      node.rotation = 0
      applyGait(node, from, to, ms, gaitCfg)
      expect(Math.abs(node.rotation - axis)).toBeLessThanOrEqual(gaitCfg.gait!.tilt! + 1e-9)
    }
  })

  it('leaves a projectile with no gait completely alone', () => {
    const node = fakeNode()
    node.y = 500
    node.rotation = 1.23
    applyGait(node, FROM, TO, 400, { durationMs: 1000, size: 16, color: 0xffffff })
    expect(node.y).toBe(500)
    expect(node.rotation).toBe(1.23)
  })
})
