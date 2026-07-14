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
