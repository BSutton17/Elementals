import { test, expect } from 'vitest'
import { AnimationFramework } from './framework'
import { EffectRegistry } from './registry'
import { hexToNumber, themeColor } from './colors'
import { DEFAULT_ABILITY_EFFECT } from './defaults'
import type { DisplayNode } from './types'

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

test('registry register / resolve / has', () => {
  const r = new EffectRegistry()
  r.register('fireball', { projectile: { durationMs: 1, size: 1, color: 0x123 } })
  expect(r.has('fireball')).toBe(true)
  expect(r.resolve('fireball')?.projectile?.color).toBe(0x123)
  expect(r.has('missing')).toBe(false)
})

test('themeColor maps the shared palette; unknown → white', () => {
  expect(themeColor('fire', 'primary')).toBe(hexToNumber('#ff6b4a'))
  expect(themeColor('ice', 'secondary')).toBe(hexToNumber('#36d1dc'))
  expect(themeColor(null)).toBe(0xffffff)
})

test('playAbility runs the full pipeline; unknown ids use the themed default', () => {
  const projNodes: DisplayNode[] = []
  const fw = new AnimationFramework({
    projectile: () => {
      const n = fakeNode()
      projNodes.push(n)
      return n
    },
    impact: fakeNode,
    particle: fakeNode,
  })

  fw.playAbility('a-brand-new-ability', {
    from: { x: 0, y: 0 },
    to: { x: 10, y: 0 },
    sourceKingdom: 'fire',
  })
  expect(fw.projectiles.active).toBe(1)
  // The generic default tints from the caster's theme — no per-kingdom code.
  // (The system prewarms pooled nodes, so assert one carries the themed tint.)
  expect(projNodes.some((n) => n.tint === themeColor('fire', 'primary'))).toBe(true)

  // Advance in realistic ~16ms frames until the projectile lands; on that frame
  // the burst (impact + particles + shake) spawns at B.
  let guard = 0
  while (fw.projectiles.active > 0 && guard++ < 500) fw.update(16)
  expect(fw.projectiles.active).toBe(0)
  expect(fw.impacts.active).toBe(1)
  expect(fw.particles.active).toBe(DEFAULT_ABILITY_EFFECT.particles!.count)
  expect(fw.camera.shaking).toBe(true)
})

const WIND = {
  flash: 0xffffff,
  ring: 0xeaf2ff,
  gust: 0xffffff,
  gustAlt: 0xc3d4ff,
  feather: 0xdfe8ff,
  pauseMs: 150,
}

test('playRedirectedAbility flies to via, deflects, then relaunches to the new target', () => {
  const fw = new AnimationFramework({ projectile: fakeNode, impact: fakeNode, particle: fakeNode })
  fw.registry.register('fireball', {
    projectile: { durationMs: 200, size: 12, color: 0xff0000, faceDirection: true },
    impact: { durationMs: 100, size: 40, color: 0xffaa00 },
    particles: { count: 8, speed: 200, spread: Math.PI, lifetimeMs: 200, size: 4, color: 0xffaa00 },
    shake: { magnitude: 4, durationMs: 100 },
  })

  const from = { x: 0, y: 0 }
  const via = { x: 100, y: 0 } // Air castle
  const to = { x: 100, y: 100 } // new target
  fw.playRedirectedAbility('fireball', { from, via, to }, WIND)

  // Leg 1 in flight; nothing has burst or been suspended yet.
  expect(fw.projectiles.active).toBe(1)
  expect(fw.projectiles.holding).toBe(0)

  // Fly leg 1 to the Air castle → the interception fires and the projectile is
  // suspended in the wind barrier (impacts/particles/linger vortex all spawn).
  let guard = 0
  while (fw.projectiles.active > 0 && guard++ < 500) fw.update(16)
  expect(fw.projectiles.holding).toBe(1)
  expect(fw.impacts.active).toBeGreaterThan(0)
  expect(fw.particles.active).toBeGreaterThan(0)
  expect(fw.vortices.active).toBe(1) // lingering wind spiral
  expect(fw.camera.shaking).toBe(true)

  // Ride out the pause → the projectile relaunches (leg 2) toward the new target.
  guard = 0
  while (fw.projectiles.holding > 0 && guard++ < 200) fw.update(16)
  expect(fw.projectiles.active).toBe(1) // leg 2 now in flight

  // Leg 2 lands → the ORIGINAL impact burst fires at the new target.
  guard = 0
  while (fw.projectiles.active > 0 && guard++ < 500) fw.update(16)
  expect(fw.impacts.active).toBeGreaterThan(0)
})

test('playRedirectedAbility on an instant (non-projectile) ability just resolves at the target', () => {
  const fw = new AnimationFramework({ projectile: fakeNode, impact: fakeNode, particle: fakeNode })
  fw.registry.register('zap', {
    lightning: {
      durationMs: 100, coreColor: 0xffffff, glowColor: 0xaa00ff,
      coreWidth: 2, glowWidth: 8, jaggedness: 0.3, subdivisions: 3, branchChance: 0.2,
    },
    impact: { durationMs: 100, size: 40, color: 0xffffff },
  })
  fw.playRedirectedAbility('zap', { from: { x: 0, y: 0 }, via: { x: 50, y: 0 }, to: { x: 90, y: 0 } }, WIND)
  // No wind interception for instants: it resolves immediately at the final
  // target with no suspended projectile.
  expect(fw.projectiles.holding).toBe(0)
  expect(fw.impacts.active).toBe(1)
})

test('playFreezeCast gathers inward, then flashes + erupts after the buildup', () => {
  const fw = new AnimationFramework({ projectile: fakeNode, impact: fakeNode, particle: fakeNode })
  const at = { x: 200, y: 200 }
  const frost = {
    frostColor: 0xdcf3ff,
    iceColor: 0xffffff,
    vaporColor: 0xbfe0ff,
    runeColor: 0x8fd0ff,
    radius: 82,
    baseDurationMs: 8000,
    dissolveMs: 1200,
  }

  fw.playFreezeCast(at, frost)
  // Buildup: converging frost particles + a rumble; nothing has flashed yet.
  expect(fw.frostAuras.particleCount).toBeGreaterThan(0)
  expect(fw.impacts.active).toBe(0)

  // Advance past the buildup: the icy flash (impacts) + eruption fire.
  const gathered = fw.frostAuras.particleCount
  for (let i = 0; i < 45; i++) fw.update(16) // ~720ms > 560ms buildup
  expect(fw.impacts.active).toBeGreaterThan(0) // the brilliant flash
  expect(fw.frostAuras.particleCount).toBeGreaterThan(0)
  // The eruption threw a fresh outward burst (guard: some gather particles have
  // since died, so just assert the flash spawned impacts, above).
  void gathered
})

test('registered definitions override the default; playStatus bursts with no projectile', () => {
  const fw = new AnimationFramework(
    { projectile: fakeNode, impact: fakeNode, particle: fakeNode },
    { defaultEffect: null },
  )
  fw.registry.register('freeze', { impact: { durationMs: 100, size: 20, color: 0x00ffff } })

  fw.playStatus('freeze', { x: 5, y: 5 })
  expect(fw.impacts.active).toBe(1)
  expect(fw.projectiles.active).toBe(0)

  // With the default disabled, an unregistered ability does nothing.
  fw.playAbility('unknown', { from: { x: 0, y: 0 }, to: { x: 1, y: 1 } })
  expect(fw.projectiles.active).toBe(0)
})
