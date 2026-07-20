import { test, expect } from 'vitest'
import { ABILITY_EFFECTS, AURA_EFFECTS } from './effects'
import { AnimationFramework } from './framework'
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

test('fireball is registered as a projectile that bursts on impact', () => {
  const fb = ABILITY_EFFECTS.fireball
  expect(fb).toBeDefined()
  expect(fb!.projectile?.durationMs).toBeGreaterThan(0)
  expect(fb!.impact).toBeDefined()
  expect(fb!.particles?.count).toBeGreaterThan(0)
  expect(fb!.shake).toBeDefined()
})

test('fireball has a flaming trail whose colour differs from the core (reads as fire)', () => {
  const fb = ABILITY_EFFECTS.fireball!
  expect(fb.trail?.particles.count).toBeGreaterThan(0)
  // A trail streamed along the path plus a distinct core hue is what gives the
  // fireball its comet shape and multi-colour look.
  expect(fb.trail!.particles.color).not.toBe(fb.projectile!.color)
})

test('every kingdom basic attack reuses the fireball bolt, differing only by colour', () => {
  const basics = ['fireball', 'waterBall', 'aLightBreeze', 'rockThrow', 'zap', 'icicle', 'sludge']
  const fb = ABILITY_EFFECTS.fireball!
  for (const id of basics) {
    const def = ABILITY_EFFECTS[id]
    expect(def, id).toBeDefined()
    // Same motion/timing as fireball (shared helper) …
    expect(def!.projectile?.durationMs).toBe(fb.projectile!.durationMs)
    expect(def!.trail?.particles.count).toBe(fb.trail!.particles.count)
    expect(def!.projectile?.faceDirection).toBe(true)
    // … and the two-tone comet look (trail hue distinct from the bright core).
    expect(def!.trail!.particles.color).not.toBe(def!.projectile!.color)
  }
  // …but the palettes genuinely differ between kingdoms.
  expect(ABILITY_EFFECTS.waterBall!.projectile!.color).not.toBe(fb.projectile!.color)
  expect(ABILITY_EFFECTS.sludge!.impact!.color).not.toBe(fb.impact!.color)
})

test('scorching sun charges a beam, then fires + bursts on the target', () => {
  const ss = ABILITY_EFFECTS.scorchingSun!
  expect(ss.beam?.chargeMs).toBe(1500)
  expect(ss.shake).toBeDefined() // screen kick on impact

  const fw = new AnimationFramework(
    { projectile: fakeNode, impact: fakeNode, particle: fakeNode },
    { defaultEffect: null },
  )
  fw.registry.registerMany(ABILITY_EFFECTS)

  fw.playAbility('scorchingSun', { from: { x: 0, y: 0 }, to: { x: 300, y: 0 }, sourceKingdom: 'fire' })
  expect(fw.beams.active).toBe(1)

  // Charge almost fully (derive from the config so it survives retuning): still
  // charging, nothing has fired yet.
  const chargeMs = ss.beam!.chargeMs
  fw.update(chargeMs - 40)
  expect(fw.impacts.active).toBe(0)
  expect(fw.camera.shaking).toBe(false)

  // A small step crosses the charge threshold; the beam fires: burst + shake.
  // (Small dt so the shake is observed before it decays.)
  fw.update(60)
  expect(fw.impacts.active).toBe(1)
  expect(fw.camera.shaking).toBe(true)

  // Beam clears after its fire window elapses.
  let guard = 0
  while (fw.beams.active > 0 && guard++ < 500) fw.update(16)
  expect(fw.beams.active).toBe(0)
})

test('flood reuses the vortex (water-coloured) like firenado', () => {
  const fl = ABILITY_EFFECTS.flood!
  const fn = ABILITY_EFFECTS.firenado!
  // Same effect shape/timing as Firenado…
  expect(fl.vortex?.durationMs).toBe(fn.vortex!.durationMs)
  expect(fl.vortex?.arms).toBe(fn.vortex!.arms)
  // …but a different (water) palette.
  expect(fl.vortex!.color).not.toBe(fn.vortex!.color)
})

test('waterfall gathers, travels, then splashes on arrival', () => {
  const wf = ABILITY_EFFECTS.waterfall!
  expect(wf.wave?.gatherMs).toBeGreaterThan(0)
  expect(wf.impact).toBeDefined() // the splash

  const fw = new AnimationFramework(
    { projectile: fakeNode, impact: fakeNode, particle: fakeNode },
    { defaultEffect: null },
  )
  fw.registry.registerMany(ABILITY_EFFECTS)

  fw.playAbility('waterfall', { from: { x: 0, y: 0 }, to: { x: 400, y: 0 }, sourceKingdom: 'water' })
  expect(fw.waves.active).toBe(1)
  expect(fw.impacts.active).toBe(0) // nothing splashes until it lands

  // Mid-flight it sheds spray continuously (not a one-shot burst).
  const gather = wf.wave!.gatherMs
  fw.update(gather + 200)
  expect(fw.waves.particleCount).toBeGreaterThan(0)

  // It travels its full duration, then splashes (burst) and the body collapses.
  let guard = 0
  while (fw.waves.active > 0 && guard++ < 500) fw.update(16)
  expect(fw.impacts.active).toBe(1) // splash ring fired on arrival
  expect(fw.camera.shaking).toBe(true)
})

test('firenado spins a vortex on the target and bursts immediately', () => {
  const fn = ABILITY_EFFECTS.firenado!
  expect(fn.vortex?.durationMs).toBe(2500)

  const fw = new AnimationFramework(
    { projectile: fakeNode, impact: fakeNode, particle: fakeNode },
    { defaultEffect: null },
  )
  fw.registry.registerMany(ABILITY_EFFECTS)

  fw.playAbility('firenado', { from: { x: 0, y: 0 }, to: { x: 300, y: 0 }, sourceKingdom: 'fire' })
  // No travel: the vortex spins AND the burst lands at once (damage immediate).
  expect(fw.vortices.active).toBe(1)
  expect(fw.impacts.active).toBe(1)

  // It emits embers continuously (not a one-shot burst).
  fw.update(500)
  const earlyEmbers = fw.vortices.emberCount
  expect(earlyEmbers).toBeGreaterThan(0)
  fw.update(500) // still mid-life → keeps feeding itself
  expect(fw.vortices.emberCount).toBeGreaterThan(0)

  // The vortex body spins for its duration, then clears.
  expect(fw.vortices.active).toBe(1)
  fw.update(1700) // total 2700ms > durationMs
  expect(fw.vortices.active).toBe(0)
})

test('shieldBreak bursts a kingdom-tinted shatter immediately at the castle', () => {
  const sb = ABILITY_EFFECTS.shieldBreak!
  expect(sb.tintFrom).toBe('primary') // shards take the kingdom's colour
  expect(sb.projectile).toBeUndefined() // no travel — bursts on the spot

  const fw = new AnimationFramework(
    { projectile: fakeNode, impact: fakeNode, particle: fakeNode },
    { defaultEffect: null },
  )
  fw.registry.registerMany(ABILITY_EFFECTS)

  const at = { x: 200, y: 200 }
  fw.playAbility('shieldBreak', { from: at, to: at, sourceKingdom: 'earth' })
  expect(fw.impacts.active).toBe(1) // shatter ring
  expect(fw.particles.active).toBeGreaterThan(0) // shards
  expect(fw.camera.shaking).toBe(true)
})

test('AURA_EFFECTS: heat wave is smoke; blazing determination flames, shakes, and sits behind', () => {
  expect(AURA_EFFECTS.heatWave!.emitters.length).toBeGreaterThan(0)
  expect(AURA_EFFECTS.heatWave!.shakeOnStart).toBeUndefined()
  expect(AURA_EFFECTS.heatWave!.behind).toBeFalsy() // smoke rises in front, fine
  expect(AURA_EFFECTS.blazingDetermination!.emitters.length).toBeGreaterThan(0)
  expect(AURA_EFFECTS.blazingDetermination!.shakeOnStart).toBeDefined()
  expect(AURA_EFFECTS.blazingDetermination!.behind).toBe(true) // flames behind the castle
})

test('AURA_EFFECTS: burn gives any burning castle a smoke aura', () => {
  // Keyed by the status id, so it applies to whichever castle is Burning, not
  // just Fire's own.
  expect(AURA_EFFECTS.burn!.emitters.length).toBeGreaterThan(0)
})

test('a status aura emits continuously while active, then stops and drains on expiry', () => {
  const fw = new AnimationFramework(
    { projectile: fakeNode, impact: fakeNode, particle: fakeNode },
    { defaultEffect: null },
  )
  fw.registerAuras(AURA_EFFECTS)

  fw.startAura('heatWave', 'heatWave:a', { x: 100, y: 100 })
  fw.update(200)
  expect(fw.auras.particleCount).toBeGreaterThan(0) // emitting, not one-shot
  fw.update(200)
  expect(fw.auras.activeAuras).toBe(1)

  // Status expires → stop emitting; the aura clears and its particles drain.
  fw.stopAura('heatWave:a')
  fw.update(20)
  expect(fw.auras.activeAuras).toBe(0)
  let guard = 0
  while (fw.auras.particleCount > 0 && guard++ < 500) fw.update(60)
  expect(fw.auras.particleCount).toBe(0)
})

test('a cast-driven aura (misting) self-stops after its window and drains', () => {
  const fw = new AnimationFramework(
    { projectile: fakeNode, impact: fakeNode, particle: fakeNode },
    { defaultEffect: null },
  )
  fw.registerAuras(AURA_EFFECTS)

  fw.startAura('misting', 'misting:w', { x: 0, y: 0 }, 4000) // 4s window
  fw.update(200)
  expect(fw.auras.particleCount).toBeGreaterThan(0)
  fw.update(1000)
  expect(fw.auras.activeAuras).toBe(1) // still within the window

  // Past the window it stops on its own (no statusExpired needed) and drains.
  fw.update(3200) // total 4400ms > 4000ms → stops emitting
  fw.update(16) // next tick retires the stopped aura
  expect(fw.auras.activeAuras).toBe(0)
  let guard = 0
  while (fw.auras.particleCount > 0 && guard++ < 500) fw.update(60)
  expect(fw.auras.particleCount).toBe(0)
})

test('blazing determination kicks the screen once when it ignites', () => {
  const fw = new AnimationFramework(
    { projectile: fakeNode, impact: fakeNode, particle: fakeNode },
    { defaultEffect: null },
  )
  fw.registerAuras(AURA_EFFECTS)
  expect(fw.camera.shaking).toBe(false)
  fw.startAura('blazingDetermination', 'blazingDetermination:a', { x: 0, y: 0 })
  expect(fw.camera.shaking).toBe(true)
})

test('fireball streams trail particles while the projectile is in flight', () => {
  const fw = new AnimationFramework(
    { projectile: fakeNode, impact: fakeNode, particle: fakeNode },
    { defaultEffect: null },
  )
  fw.registry.registerMany(ABILITY_EFFECTS)

  fw.playAbility('fireball', { from: { x: 0, y: 0 }, to: { x: 300, y: 0 }, sourceKingdom: 'fire' })
  // A few frames in, the projectile is still travelling but the trail is already
  // emitting — the impact hasn't fired yet.
  fw.update(16)
  fw.update(16)
  expect(fw.projectiles.active).toBe(1)
  expect(fw.impacts.active).toBe(0)
  expect(fw.particles.active).toBeGreaterThan(0)
})

test('fireball drives the framework: projectile travels then bursts at the target', () => {
  const fw = new AnimationFramework(
    { projectile: fakeNode, impact: fakeNode, particle: fakeNode },
    { defaultEffect: null },
  )
  fw.registry.registerMany(ABILITY_EFFECTS)

  fw.playAbility('fireball', { from: { x: 0, y: 0 }, to: { x: 300, y: 0 }, sourceKingdom: 'fire' })
  expect(fw.projectiles.active).toBe(1)
  expect(fw.impacts.active).toBe(0) // nothing bursts until it lands

  let guard = 0
  while (fw.projectiles.active > 0 && guard++ < 500) fw.update(16)
  expect(fw.impacts.active).toBe(1)
  // At least the burst's particles are alive; trail particles emitted late in
  // the flight may still be alive too, so this is a lower bound.
  expect(fw.particles.active).toBeGreaterThanOrEqual(ABILITY_EFFECTS.fireball!.particles!.count)
  expect(fw.camera.shaking).toBe(true)
})
