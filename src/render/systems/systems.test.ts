import { test, expect } from 'vitest'
import { ProjectileSystem } from './projectiles'
import { ImpactSystem } from './impacts'
import { ParticleSystem } from './particles'
import { AcidRainSystem } from './acidRain'
import { FrostAuraSystem } from './frostAura'
import type { AcidRainConfig, FrostAuraConfig, DisplayNode, Vec2 } from '../types'

/** A plain stand-in for a Pixi display object, so system motion is testable
 *  without a WebGL context. */
function fakeNode(): DisplayNode {
  const scale = {
    x: 1,
    y: 1,
    set(x: number, y?: number) {
      this.x = x
      this.y = y ?? x
    },
  }
  return { x: 0, y: 0, alpha: 1, rotation: 0, visible: true, tint: 0xffffff, scale, destroy() {} }
}

// --- Projectiles ---------------------------------------------------------------

test('projectile travels straight A→B over durationMs, then arrives', () => {
  const created: DisplayNode[] = []
  const sys = new ProjectileSystem(
    () => {
      const n = fakeNode()
      created.push(n)
      return n
    },
    16,
    { prewarm: 0 },
  )
  let arrived: Vec2 | null = null
  sys.spawn(
    { durationMs: 1000, size: 16, color: 0x112233, easing: 'linear' },
    { x: 0, y: 0 },
    { x: 100, y: 200 },
    (at) => {
      arrived = at
    },
  )
  expect(sys.active).toBe(1)
  const node = created[0]!
  expect(node.visible).toBe(true)
  expect(node.tint).toBe(0x112233)
  expect(node.scale.x).toBeCloseTo(1) // size 16 / baseRadius 16

  sys.update(500) // halfway along the straight line
  expect(node.x).toBeCloseTo(50)
  expect(node.y).toBeCloseTo(100)
  expect(arrived).toBeNull()

  sys.update(499) // t ≈ 0.999 — nearly at B, still travelling
  expect(node.x).toBeGreaterThan(99)
  expect(arrived).toBeNull()

  sys.update(1) // arrival: onArrive fires with B, node released to the pool
  expect(arrived).toEqual({ x: 100, y: 200 })
  expect(sys.active).toBe(0)
})

test('travel time is data-driven and nodes are pooled/reused', () => {
  const created: DisplayNode[] = []
  const sys = new ProjectileSystem(
    () => {
      const n = fakeNode()
      created.push(n)
      return n
    },
    16,
    { prewarm: 0 },
  )
  let hits = 0
  sys.spawn({ durationMs: 200, size: 16, color: 0xffffff, faceDirection: true }, { x: 0, y: 0 }, { x: 0, y: 10 }, () => hits++)
  expect(created[0]!.rotation).toBeCloseTo(Math.PI / 2) // faces +y
  sys.update(199)
  expect(hits).toBe(0) // not yet — duration governs arrival
  sys.update(1)
  expect(hits).toBe(1)

  sys.spawn({ durationMs: 100, size: 16, color: 0xffffff }, { x: 0, y: 0 }, { x: 5, y: 0 })
  expect(created.length).toBe(1) // reused the released node
})

test('a shaped projectile draws from its own pool (Icicle triangle)', () => {
  const circles: DisplayNode[] = []
  const triangles: DisplayNode[] = []
  const sys = new ProjectileSystem(
    () => {
      const n = fakeNode()
      circles.push(n)
      return n
    },
    16,
    { prewarm: 0 },
    {
      triangle: () => {
        const n = fakeNode()
        triangles.push(n)
        return n
      },
    },
  )
  // A triangle-shaped projectile pulls from the triangle pool, not the circle one.
  sys.spawn({ durationMs: 100, size: 16, color: 0xffffff, shape: 'triangle' }, { x: 0, y: 0 }, { x: 10, y: 0 })
  expect(triangles.length).toBe(1)
  expect(circles.length).toBe(0)
  // A default (round) projectile still pulls from the circle pool.
  sys.spawn({ durationMs: 100, size: 16, color: 0xffffff }, { x: 0, y: 0 }, { x: 10, y: 0 })
  expect(circles.length).toBe(1)
})

test('a shaped projectile falls back to the circle pool when no factory is injected', () => {
  const circles: DisplayNode[] = []
  const sys = new ProjectileSystem(
    () => {
      const n = fakeNode()
      circles.push(n)
      return n
    },
    16,
    { prewarm: 0 },
  )
  // No triangle factory (as in the test harness / a headless framework) → the
  // triangle projectile still spawns, using the circle pool. This is why the
  // framework tests that inject only a circle factory keep working.
  sys.spawn({ durationMs: 100, size: 16, color: 0xffffff, shape: 'triangle' }, { x: 0, y: 0 }, { x: 10, y: 0 })
  expect(circles.length).toBe(1)
  expect(sys.active).toBe(1)
})

// --- Impacts -------------------------------------------------------------------

test('impact grows to peak, fades out, and releases', () => {
  const created: DisplayNode[] = []
  const sys = new ImpactSystem(
    () => {
      const n = fakeNode()
      created.push(n)
      return n
    },
    16,
    { prewarm: 0 },
  )
  sys.spawn({ durationMs: 100, size: 32, color: 0xabcdef, startScale: 0.5 }, { x: 5, y: 5 })
  const n = created[0]!
  expect(n.x).toBe(5)
  expect(n.tint).toBe(0xabcdef)
  expect(n.scale.x).toBeCloseTo(1) // startScale 0.5 × peak (32/16 = 2)
  sys.update(99) // nearly complete — still active, node not yet reset
  expect(n.scale.x).toBeCloseTo(2) // grown to peak
  expect(n.alpha).toBeCloseTo(0)
  expect(sys.active).toBe(1)
  sys.update(1) // completes and releases
  expect(sys.active).toBe(0)
})

// --- Particles -----------------------------------------------------------------

test('particle burst spawns count, moves with gravity, then expires', () => {
  const nodes: DisplayNode[] = []
  const sys = new ParticleSystem(
    () => {
      const n = fakeNode()
      nodes.push(n)
      return n
    },
    16,
    { rng: () => 0.5, prewarm: 0 },
  )
  const spawned = sys.emit(
    { count: 1, speed: 100, spread: 0, direction: 0, lifetimeMs: 1000, size: 16, color: 0x00ff00, gravity: 200, fade: true },
    { x: 0, y: 0 },
  )
  expect(spawned).toBe(1)
  expect(sys.active).toBe(1)

  sys.update(500) // vx=100 → x≈50; gravity pulls y down
  const n = nodes[0]!
  expect(n.x).toBeCloseTo(50)
  expect(n.y).toBeGreaterThan(0)
  expect(n.alpha).toBeCloseTo(0.5)

  sys.update(600) // total 1100 > lifetime
  expect(sys.active).toBe(0)
})

test('maxActive caps concurrent particles', () => {
  const sys = new ParticleSystem(fakeNode, 16, { rng: () => 0.5, maxActive: 5, prewarm: 0 })
  const spawned = sys.emit(
    { count: 20, speed: 10, spread: 0, direction: 0, lifetimeMs: 100, size: 8, color: 0 },
    { x: 0, y: 0 },
  )
  expect(spawned).toBe(5)
  expect(sys.active).toBe(5)
})

// --- Acid Rain / Corroded ------------------------------------------------------

const ACID: AcidRainConfig = {
  cloudColor: 0x2e3b22,
  acidColor: 0xbfff4d,
  glowColor: 0xeaffa0,
  vaporColor: 0x9be86a,
  radius: 74,
  cloudHeight: 150,
  gatherMs: 700,
  dissolveMs: 1200,
}

test('acid rain gathers a cloud, emits particles, surges, then dissolves away', () => {
  const sys = new AcidRainSystem(fakeNode, fakeNode, 16, { rng: () => 0.5 })
  const at: Vec2 = { x: 500, y: 500 }
  sys.start('t1', at, ACID)
  expect(sys.active).toBe(1)
  expect(sys.has('t1')).toBe(true)

  // Run a couple of seconds of animation: rain, splashes, bubbles, vapor spawn.
  for (let i = 0; i < 120; i++) sys.update(16)
  expect(sys.particleCount).toBeGreaterThan(0)

  // Poison synergy surge on a live cloud spawns an extra burst.
  const before = sys.particleCount
  sys.surge('t1')
  expect(sys.particleCount).toBeGreaterThan(before)

  // Expire: rain stops, cloud dissolves, and after dissolveMs the cloud is gone.
  sys.stop('t1')
  expect(sys.has('t1')).toBe(false) // dissolving no longer counts as live
  for (let i = 0; i < 120; i++) sys.update(16) // > dissolveMs (1200)
  expect(sys.active).toBe(0)
})

test('cloud-less corrosion aura (Gastro poison idle) runs ground effects, no cloud/rain', () => {
  const sys = new AcidRainSystem(fakeNode, fakeNode, 16, { rng: () => 0.5 })
  sys.start('gastroPoison:t1', { x: 500, y: 500 }, { ...ACID, cloud: false, intensity: 1.6 })
  expect(sys.active).toBe(1)
  // Bubbling acid + fumes + drips still spawn from the target even with no cloud.
  for (let i = 0; i < 90; i++) sys.update(16)
  expect(sys.particleCount).toBeGreaterThan(0)
  // Dissolves away on expiry like the full effect.
  sys.stop('gastroPoison:t1')
  for (let i = 0; i < 120; i++) sys.update(16)
  expect(sys.active).toBe(0)
})

test('acid rain surge / stop on an unknown key is a no-op', () => {
  const sys = new AcidRainSystem(fakeNode, fakeNode, 16, { rng: () => 0.5 })
  expect(() => sys.surge('missing')).not.toThrow()
  expect(() => sys.stop('missing')).not.toThrow()
  expect(sys.has('missing')).toBe(false)
  expect(sys.active).toBe(0)
})

// --- Frost aura (Flood of Frost) -----------------------------------------------

const FROST: FrostAuraConfig = {
  frostColor: 0xdcf3ff,
  iceColor: 0xffffff,
  vaporColor: 0xbfe0ff,
  runeColor: 0x8fd0ff,
  radius: 66,
  baseDurationMs: 3200,
  dissolveMs: 1400,
}

test('frost aura lingers, enhances (Chilling Retribution), pulses, then melts', () => {
  const sys = new FrostAuraSystem(fakeNode, fakeNode, 16, { rng: () => 0.5 })
  const at: Vec2 = { x: 500, y: 500 }
  sys.start('frost:t1', at, FROST)
  expect(sys.active).toBe(1)
  expect(sys.has('frost:t1')).toBe(true)

  // Snow + vapor + sparkles spawn while it lingers.
  for (let i = 0; i < 60; i++) sys.update(16)
  expect(sys.particleCount).toBeGreaterThan(0)

  // Chilling Retribution enhances it (adds the rune ring) and a pulse throws a
  // shimmer burst.
  sys.enhance('frost:t1')
  const before = sys.particleCount
  sys.pulse('frost:t1')
  expect(sys.particleCount).toBeGreaterThan(before)

  // Enhanced, it persists past the base window (does NOT auto-melt at 3.2s).
  for (let i = 0; i < 240; i++) sys.update(16) // ~3.8s
  expect(sys.has('frost:t1')).toBe(true)

  // Expire → melt over dissolveMs, then it's gone.
  sys.stop('frost:t1')
  expect(sys.has('frost:t1')).toBe(false)
  for (let i = 0; i < 120; i++) sys.update(16)
  expect(sys.active).toBe(0)
})

test('a base frost aura melts on its own after the base window (no enhancement)', () => {
  const sys = new FrostAuraSystem(fakeNode, fakeNode, 16, { rng: () => 0.5 })
  sys.start('frost:t2', { x: 0, y: 0 }, { ...FROST, baseDurationMs: 400, dissolveMs: 400 })
  // Past base + dissolve windows it clears itself without an explicit stop.
  for (let i = 0; i < 80; i++) sys.update(16) // ~1.3s > 400 + 400
  expect(sys.active).toBe(0)
})

test('frost enhance / pulse / stop on an unknown key is a no-op', () => {
  const sys = new FrostAuraSystem(fakeNode, fakeNode, 16, { rng: () => 0.5 })
  expect(() => sys.enhance('missing')).not.toThrow()
  expect(() => sys.pulse('missing')).not.toThrow()
  expect(() => sys.stop('missing')).not.toThrow()
  expect(sys.has('missing')).toBe(false)
})

test('gather + erupt are one-shot cast bursts (no keyed aura) that drain away', () => {
  const sys = new FrostAuraSystem(fakeNode, fakeNode, 16, { rng: () => 0.5 })
  const at: Vec2 = { x: 500, y: 500 }

  // Gather (Freeze to the Core buildup) spawns converging particles.
  sys.gather(at, FROST)
  const afterGather = sys.particleCount
  expect(afterGather).toBeGreaterThan(0)

  // Erupt (the flash) adds an outward shower of shards + sparkles on top.
  sys.erupt(at, FROST)
  expect(sys.particleCount).toBeGreaterThan(afterGather)

  // Neither creates a persistent keyed aura, and every particle drains out.
  expect(sys.active).toBe(0)
  for (let i = 0; i < 120; i++) sys.update(16)
  expect(sys.particleCount).toBe(0)
})
