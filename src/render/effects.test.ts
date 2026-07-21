import { test, expect } from 'vitest'
import { ABILITY_EFFECTS, AURA_EFFECTS, THUNDERDOME_CONFIG } from './effects'
import { AnimationFramework } from './framework'
import { generateBolt, generateBranches } from './systems/lightning'
import type { DisplayNode } from './types'

/** Deterministic RNG for the procedural-lightning tests. */
function seededRng(seed = 1): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

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
  // Zap is the exception — Electricity's basic is a procedural lightning strike.
  const basics = ['fireball', 'waterBall', 'aLightBreeze', 'rockThrow', 'icicle', 'sludge']
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

test('generateBolt preserves endpoints and subdivides into a jagged path', () => {
  const from = { x: 0, y: 0 }
  const to = { x: 100, y: 0 }
  const path = generateBolt(from, to, 0.3, 4, seededRng())
  expect(path[0]).toBe(from) // endpoints anchored to the strike
  expect(path[path.length - 1]).toBe(to)
  expect(path.length).toBe(2 ** 4 + 1) // 4 subdivisions → 17 points

  // With zero jaggedness the midpoints stay exactly on the A→B line.
  const straight = generateBolt(from, to, 0, 4, seededRng())
  expect(straight.every((p) => Math.abs(p.y) < 1e-9)).toBe(true)
})

test('branches spawn along the bolt (or not) and stay short of the target', () => {
  const rng = seededRng(7)
  const main = generateBolt({ x: 0, y: 0 }, { x: 200, y: 0 }, 0.3, 4, rng)
  const branches = generateBranches(main, 1, rng) // always branch
  expect(branches.length).toBeGreaterThan(0)
  for (const b of branches) {
    expect(b.length).toBeGreaterThanOrEqual(2)
    // A branch is instability, not extra reach — it never lands on the target.
    expect(b[b.length - 1]).not.toEqual({ x: 200, y: 0 })
  }
  expect(generateBranches(main, 0, rng).length).toBe(0) // none when chance is 0
})

test('zap is a procedural lightning strike, not the shared bolt', () => {
  const zap = ABILITY_EFFECTS.zap!
  expect(zap.lightning?.durationMs).toBeGreaterThan(0)
  expect(zap.projectile).toBeUndefined()
  // Two hues: a bright core inside a distinct glow.
  expect(zap.lightning!.coreColor).not.toBe(zap.lightning!.glowColor)
  expect(zap.impact).toBeDefined() // flash on impact
})

test('zap strikes lightning, flashes + sparks + shakes, then clears', () => {
  const fw = new AnimationFramework(
    { projectile: fakeNode, impact: fakeNode, particle: fakeNode },
    { defaultEffect: null },
  )
  fw.registry.registerMany(ABILITY_EFFECTS)

  fw.playAbility('zap', { from: { x: 0, y: 0 }, to: { x: 300, y: 0 }, sourceKingdom: 'electricity' })
  expect(fw.lightning.active).toBeGreaterThan(1) // main bolt + impact arcs
  expect(fw.impacts.active).toBe(1) // flash
  expect(fw.particles.active).toBeGreaterThan(0) // sparks
  expect(fw.camera.shaking).toBe(true)

  // The bolt lives only a flicker, then it's gone.
  let guard = 0
  while (fw.lightning.active > 0 && guard++ < 200) fw.update(16)
  expect(fw.lightning.active).toBe(0)
})

test('thunderdome builds, surges, and collapses gracefully to nothing', () => {
  const fw = new AnimationFramework(
    { projectile: fakeNode, impact: fakeNode, particle: fakeNode },
    { defaultEffect: null },
  )
  const at = { x: 200, y: 200 }

  fw.startThunderdome('thunderdome:a', at, THUNDERDOME_CONFIG)
  expect(fw.thunderdomes.active).toBe(1)
  expect(fw.thunderdomes.has('thunderdome:a')).toBe(true)

  // Build → idle: it persists.
  for (let i = 0; i < 50; i++) fw.update(16)
  expect(fw.thunderdomes.active).toBe(1)

  // Surge is safe (existing dome and a missing one).
  expect(() => fw.surgeThunderdome('thunderdome:a')).not.toThrow()
  expect(() => fw.surgeThunderdome('thunderdome:none')).not.toThrow()
  fw.update(16)

  // Expire → collapse (no longer "has" it), then it clears itself.
  fw.stopThunderdome('thunderdome:a')
  expect(fw.thunderdomes.has('thunderdome:a')).toBe(false)
  let guard = 0
  while (fw.thunderdomes.active > 0 && guard++ < 200) fw.update(16)
  expect(fw.thunderdomes.active).toBe(0)
})

test('THUNDERDOME_CONFIG is a two-hue electrical cage', () => {
  expect(THUNDERDOME_CONFIG.radius).toBeGreaterThan(0)
  expect(THUNDERDOME_CONFIG.coreColor).not.toBe(THUNDERDOME_CONFIG.glowColor)
})

test('lightning barrage is a charge-scaled barrage effect', () => {
  const lb = ABILITY_EFFECTS.lightningBarrage!
  expect(lb.barrage).toBeDefined()
  expect(lb.barrage!.coreColor).not.toBe(lb.barrage!.glowColor) // two-hue like Zap
})

test('lightning barrage strikes, flashes, and shakes', () => {
  const fw = new AnimationFramework(
    { projectile: fakeNode, impact: fakeNode, particle: fakeNode },
    { defaultEffect: null },
  )
  fw.registry.registerMany(ABILITY_EFFECTS)

  fw.playAbility('lightningBarrage', {
    from: { x: 0, y: 0 },
    to: { x: 300, y: 0 },
    sourceKingdom: 'electricity',
    charges: 1,
  })
  fw.update(40) // fire the first scheduled strike + impact
  expect(fw.lightning.active).toBeGreaterThan(0)
  expect(fw.impacts.active).toBeGreaterThan(0)
  expect(fw.camera.shaking).toBe(true)
})

test('lightning barrage intensity scales with the charges spent', () => {
  const peakBolts = (charges: number): number => {
    const fw = new AnimationFramework(
      { projectile: fakeNode, impact: fakeNode, particle: fakeNode },
      { defaultEffect: null },
    )
    fw.registry.registerMany(ABILITY_EFFECTS)
    fw.playAbility('lightningBarrage', {
      from: { x: 0, y: 0 },
      to: { x: 300, y: 0 },
      sourceKingdom: 'electricity',
      charges,
    })
    let peak = 0
    for (let i = 0; i < 60; i++) {
      fw.update(16) // ~960ms — covers the strike window + corona
      peak = Math.max(peak, fw.lightning.active)
    }
    return peak
  }
  const one = peakBolts(1)
  const three = peakBolts(3)
  expect(one).toBeGreaterThan(0)
  // Three charges fire many more overlapping bolts than one.
  expect(three).toBeGreaterThan(one)
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
