import { test, expect } from 'vitest'
import { ProjectileSystem } from './projectiles'
import { ImpactSystem } from './impacts'
import { ParticleSystem } from './particles'
import type { DisplayNode, Vec2 } from '../types'

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
