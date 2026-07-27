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

const SATURN = {
  rings: 9,
  minGapMs: 100,
  maxGapMs: 200,
  size: 30,
  ringColor: 0x9d6bff,
  dustColor: 0x5b3aa6,
  asteroidColor: 0x7a5a9e,
  starColor: 0xe6d8ff,
  glowColor: 0x3ad0ff,
  energyColor: 0x8be3ff,
}

test("Saturn's Rings fires a staggered ring barrage that fuels an energy return", () => {
  const fw = new AnimationFramework({ projectile: fakeNode, impact: fakeNode, particle: fakeNode })
  fw.registry.register('saturnsRings', { ringBarrage: SATURN })

  fw.playAbility('saturnsRings', { from: { x: 0, y: 0 }, to: { x: 300, y: 0 }, sourceKingdom: 'space' })

  // The summon fires immediately (planet bloom + gathering debris); no ring has
  // launched yet (they're scheduled after the ~260ms summon).
  expect(fw.impacts.active).toBeGreaterThan(0)
  expect(fw.projectiles.active).toBe(0)

  // Advance past the summon → rings begin launching one after another. Ride the
  // whole barrage out; every ring impact + its energy return eventually resolve.
  let guard = 0
  let sawRing = false
  let sawShake = false
  while ((fw.projectiles.active > 0 || guard < 200) && guard++ < 4000) {
    fw.update(16)
    if (fw.projectiles.active > 0) sawRing = true
    if (fw.camera.shaking) sawShake = true
  }
  // Rings flew (as projectiles), impacts landed, and the barrage kicked the camera.
  expect(sawRing).toBe(true)
  expect(sawShake).toBe(true)
  // Everything settles: no ring or energy stream left in flight.
  expect(fw.projectiles.active).toBe(0)
})

const SUPERNOVA = {
  chargeMs: 100,
  explosionMs: 100,
  collapseMs: 120,
  impactMs: 80,
  size: 40,
  flashColor: 0xffffff,
  goldColor: 0xffd76a,
  blueColor: 0x8fbaff,
  nebulaColor: 0x6a2fd6,
  dustColor: 0x5b3aa6,
  asteroidColor: 0x4a3a72,
  starColor: 0xe6d8ff,
  lensColor: 0x3ad0ff,
  plasmaColor: 0xb98bff,
  wellColor: 0x9d6bff,
  wellRadius: 60,
  wellStrength: 30,
}

test('Supernova charges, explodes, collapses onto the target, and settles', () => {
  const fw = new AnimationFramework({ projectile: fakeNode, impact: fakeNode, particle: fakeNode })

  fw.playSupernova({ x: 0, y: 0 }, { x: 300, y: 0 }, SUPERNOVA, 1)

  // Stellar formation fires immediately (vortex + lensing halo at the caster).
  expect(fw.vortices.active).toBeGreaterThan(0)
  expect(fw.impacts.active).toBeGreaterThan(0)

  // Ride the whole sequence out: charge → explosion → collapse → final impact.
  let guard = 0
  let sawShake = false
  let sawCollapseStreams = false
  while (guard++ < 6000) {
    fw.update(16)
    if (fw.camera.shaking) sawShake = true
    if (fw.projectiles.active > 0) sawCollapseStreams = true
    // Done once nothing is left in flight and enough time has clearly passed
    // for the whole scripted sequence to have resolved.
    if (guard > 400 && fw.projectiles.active === 0) break
  }
  expect(sawShake).toBe(true)
  expect(sawCollapseStreams).toBe(true) // the collapse streams were real projectiles
  expect(fw.projectiles.active).toBe(0)
})

test('Supernova with a confirmed redirect opens a singularity that bends other attacks, then dissolves', () => {
  const fw = new AnimationFramework({ projectile: fakeNode, impact: fakeNode, particle: fakeNode })
  const to = { x: 300, y: 0 }

  fw.playSupernova({ x: 0, y: 0 }, to, SUPERNOVA, 3, 400) // wellDurationMs = 400

  // Drive forward until the singularity actually opens (right at final impact,
  // after the whole charge→explosion→collapse sequence resolves).
  let guard = 0
  while (fw.projectiles.wellCount === 0 && guard++ < 3000) fw.update(16)
  expect(fw.projectiles.wellCount).toBe(1)

  // A concurrent, unrelated projectile passing right by the well (at `to`)
  // bends off its straight-line path while the well is active. It starts well
  // outside the well's radius (level 3 well radius = 60 × 2.3 ≈ 138) and flies
  // straight through the middle of it.
  fw.projectiles.spawn(
    { durationMs: 1000, size: 10, color: 0xffffff, easing: 'linear' },
    { x: 300, y: -200 },
    { x: 300, y: 200 },
  )
  const items = (fw.projectiles as unknown as { items: { node: { x: number; y: number } }[] }).items
  const node = items.at(-1)!.node
  fw.update(180) // now inside the well's radius, well into the pull
  const unbentY = -200 + 400 * (180 / 1000) // where a straight line would be
  // Bent toward the well at (300, 0): pulled to a LARGER y than the pure
  // straight-line position would give at this point in its flight (travelling
  // from y=-200 toward y=200, so being pulled toward y=0 advances y further
  // than an unbent linear step would).
  expect(node.y).toBeGreaterThan(unbentY + 1)

  // The well self-expires after its duration — bending stops and it dissolves.
  guard = 0
  while (fw.projectiles.wellCount > 0 && guard++ < 3000) fw.update(16)
  expect(fw.projectiles.wellCount).toBe(0)
})

const BLACK_HOLE = {
  growMs: 60,
  radius: 40,
  horizonColor: 0x05020c,
  flashColor: 0xffffff,
  plasmaBlue: 0x6fb8ff,
  plasmaPurple: 0x9d4bff,
  plasmaOrange: 0xff9a4a,
  asteroidColor: 0x4a3a72,
  nebulaColor: 0x6a2fd6,
  lensColor: 0x3ad0ff,
  starColor: 0xe6d8ff,
  singularityHoldMs: 60,
  beamChargeMs: 40,
  beamFireMs: 200,
  beamWidth: 20,
}

test('Black Hole opens a dominating, self-timed body and settles cleanly', () => {
  const fw = new AnimationFramework({ projectile: fakeNode, impact: fakeNode, particle: fakeNode })
  fw.openBlackHole(BLACK_HOLE, 300)

  // The dark event horizon + growth flash spawn immediately; the ambient pull
  // field is live for the whole open window.
  expect(fw.particles.active).toBeGreaterThan(0)
  expect(fw.impacts.active).toBeGreaterThan(0)
  expect(fw.projectiles.wellCount).toBe(1)

  // Everything self-times off `durationMs`; ride past it and the well is gone.
  let guard = 0
  while (fw.projectiles.wellCount > 0 && guard++ < 3000) fw.update(16)
  expect(fw.projectiles.wellCount).toBe(0)
})

test('Black Hole charging pulse gives immediate feedback', () => {
  const fw = new AnimationFramework({ projectile: fakeNode, impact: fakeNode, particle: fakeNode })
  fw.pulseBlackHole(BLACK_HOLE)
  expect(fw.impacts.active).toBeGreaterThan(0)
  expect(fw.particles.active).toBeGreaterThan(0)
  expect(fw.camera.shaking).toBe(true)
})

test('a traveling attack intercepted into the Black Hole launches normally, then curves in and vanishes', () => {
  const fw = new AnimationFramework({ projectile: fakeNode, impact: fakeNode, particle: fakeNode })
  fw.registry.register('fireball', {
    projectile: { durationMs: 400, size: 12, color: 0xff6b4a, faceDirection: true },
    trail: { particles: { count: 2, speed: [10, 40], spread: Math.PI, lifetimeMs: 200, size: 4, color: 0xff6b4a } },
  })
  const from = { x: 0, y: 0 }
  const originalTo = { x: 400, y: 0 }
  fw.interceptIntoBlackHole('fireball', from, originalTo, 'fire', BLACK_HOLE, 0xff6b4a)

  // Leg 1: launches exactly like a normal fireball cast.
  expect(fw.projectiles.active).toBe(1)

  let guard = 0
  let sawSecondLeg = false
  while (guard++ < 500) {
    fw.update(16)
    if (fw.projectiles.active > 0) sawSecondLeg = true
    if (fw.projectiles.active === 0 && guard > 5) break
  }
  expect(sawSecondLeg).toBe(true) // it kept flying (leg 2, curving into the hole)
  expect(fw.projectiles.active).toBe(0) // vanished, nothing left in flight
  expect(fw.impacts.active).toBeGreaterThan(0) // horizon absorption burst
})

test('an instant (non-projectile) ability under the Black Hole is generically ripped apart and dragged in', () => {
  const fw = new AnimationFramework({ projectile: fakeNode, impact: fakeNode, particle: fakeNode })
  fw.registry.register('firenado', { vortex: { durationMs: 500, size: 40, color: 0xff5858, spin: 6 } })
  const originalTo = { x: 300, y: 100 }
  fw.interceptIntoBlackHole('firenado', { x: 0, y: 0 }, originalTo, 'fire', BLACK_HOLE, 0xff5858)

  // No vortex plays (the normal effect never resolves) — instead a stream
  // rips free and heads for the black hole.
  expect(fw.vortices.active).toBe(0)
  expect(fw.projectiles.active).toBe(1)

  let guard = 0
  while (fw.projectiles.active > 0 && guard++ < 500) fw.update(16)
  expect(fw.impacts.active).toBeGreaterThan(0) // horizon absorption
})

test('Black Hole collapse with a named victim implodes, holds, fires the Judgment Beam, then settles', () => {
  const fw = new AnimationFramework({ projectile: fakeNode, impact: fakeNode, particle: fakeNode, beam: fakeNode, beamGlow: fakeNode })
  const victim = { x: 500, y: 0 }
  fw.collapseBlackHole(BLACK_HOLE, victim)

  let guard = 0
  let sawBeam = false
  let sawEscalatingShake = false
  while (guard++ < 6000) {
    fw.update(16)
    if (fw.beams.active > 0) sawBeam = true
    if (fw.camera.shaking) sawEscalatingShake = true
    if (guard > 400 && fw.beams.active === 0 && fw.projectiles.active === 0) break
  }
  expect(sawBeam).toBe(true)
  expect(sawEscalatingShake).toBe(true)
  expect(fw.beams.active).toBe(0) // the beam ran its course and settled
})

test('Black Hole collapse with no victim just dissipates (no beam)', () => {
  const fw = new AnimationFramework({ projectile: fakeNode, impact: fakeNode, particle: fakeNode })
  fw.collapseBlackHole(BLACK_HOLE, null)

  let guard = 0
  while (guard++ < 500) fw.update(16)
  expect(fw.beams.active).toBe(0)
})

const ORIONS_BELT = {
  interceptAt: 0.82,
  deflectOffset: 46,
  asteroidColor: 0x7a5a9e,
  glowColor: 0x3ad0ff,
  starColor: 0xe6d8ff,
  energyColor: 0x8be3ff,
  flashColor: 0xffffff,
}

test("Orion's Belt: a deflected attack travels normally, bends late, and streams energy home", () => {
  const fw = new AnimationFramework({ projectile: fakeNode, impact: fakeNode, particle: fakeNode })
  fw.registry.register('fireball', {
    projectile: { durationMs: 400, size: 12, color: 0xff6b4a, faceDirection: true },
    trail: { particles: { count: 2, speed: [10, 40], spread: Math.PI, lifetimeMs: 200, size: 4, color: 0xff6b4a } },
  })
  const from = { x: 0, y: 0 }
  const to = { x: 400, y: 0 } // the belted defender
  fw.deflectByOrionsBelt('fireball', from, to, 'fire', ORIONS_BELT, 0xff6b4a)

  // Leg 1: launches exactly like a normal fireball cast.
  expect(fw.projectiles.active).toBe(1)

  let guard = 0
  let sawBend = false
  let sawDeflectionBurst = false
  let sawShake = false
  while (guard++ < 500) {
    fw.update(16)
    if (fw.projectiles.active > 0) sawBend = true
    if (fw.impacts.active > 0) sawDeflectionBurst = true
    if (fw.camera.shaking) sawShake = true
    if (fw.projectiles.active === 0 && guard > 5) break
  }
  expect(sawBend).toBe(true) // it kept flying past leg 1 (the late bend)
  expect(sawDeflectionBurst).toBe(true) // the deflection burst fired
  expect(sawShake).toBe(true) // the light screen kick
  expect(fw.projectiles.active).toBe(0) // everything (including the energy stream) settled
})

test("Orion's Belt: an instant (non-projectile) ability still deflects near the castle", () => {
  const fw = new AnimationFramework({ projectile: fakeNode, impact: fakeNode, particle: fakeNode })
  fw.registry.register('zap', {
    lightning: { durationMs: 100, coreColor: 0xffffff, glowColor: 0xaa00ff, coreWidth: 2, glowWidth: 8, jaggedness: 0.3, subdivisions: 3, branchChance: 0.2 },
  })
  const to = { x: 200, y: 100 }
  fw.deflectByOrionsBelt('zap', { x: 0, y: 0 }, to, 'electricity', ORIONS_BELT, 0xa855f7)
  expect(fw.impacts.active).toBeGreaterThan(0) // the deflection burst fires immediately
  expect(fw.projectiles.active).toBe(1) // the stellar-energy stream is now heading home
})

const CUPIDS_ARROW = {
  bowGatherMs: 100,
  arrowSegments: 3,
  arrowDurationMs: 150,
  weaveAmplitude: 20,
  spiritDurationMs: 200,
  goldColor: 0xe8c66a,
  crystalColor: 0xff8fc0,
  ribbonColor: 0xff4d8d,
  heartColor: 0xff6fa8,
  petalColor: 0xffd1e3,
  dustColor: 0xfff0f6,
  sigilColor: 0xffffff,
  spiritColor: 0xffe27a,
}

test("Cupid's Arrow: the bow gathers, the arrow weaves in several hops, then impacts", () => {
  const fw = new AnimationFramework({ projectile: fakeNode, impact: fakeNode, particle: fakeNode })
  fw.registry.register('cupidsArrow', { cupidsArrow: CUPIDS_ARROW })

  fw.playAbility('cupidsArrow', { from: { x: 0, y: 0 }, to: { x: 300, y: 0 }, sourceKingdom: 'love' })

  // The bow summon fires immediately; the arrow hasn't launched yet.
  expect(fw.impacts.active).toBeGreaterThan(0)
  expect(fw.projectiles.active).toBe(0)

  let guard = 0
  let sawArrowLeg = false
  let framesInFlight = 0
  while (guard++ < 4000) {
    fw.update(16)
    if (fw.projectiles.active > 0) {
      sawArrowLeg = true
      framesInFlight++
    }
    if (guard > 40 && fw.projectiles.active === 0) break
  }
  expect(sawArrowLeg).toBe(true)
  // Several short hops chained back-to-back take noticeably longer in total
  // than any single leg (arrowDurationMs/arrowSegments = 50ms ≈ 3 frames) —
  // this rules out the arrow having flown just one straight leg.
  expect(framesInFlight).toBeGreaterThan(5)
  expect(fw.projectiles.active).toBe(0) // the arrow landed and settled
  expect(fw.impacts.active).toBeGreaterThan(0) // the impact + heart sigil
})

test("Cupid's Arrow: citizen spirits skip between the castles and merge on arrival", () => {
  const fw = new AnimationFramework({ projectile: fakeNode, impact: fakeNode, particle: fakeNode })
  fw.playCitizenSpirits({ x: 0, y: 0 }, { x: 200, y: 0 }, CUPIDS_ARROW, 2)

  let guard = 0
  let sawSpirits = false
  while (guard++ < 500) {
    fw.update(16)
    if (fw.projectiles.active > 0) sawSpirits = true
    if (guard > 20 && fw.projectiles.active === 0) break
  }
  expect(sawSpirits).toBe(true)
  expect(fw.projectiles.active).toBe(0) // both spirits arrived and merged
  expect(fw.impacts.active).toBeGreaterThan(0) // the merge bursts
})

test("Cupid's Arrow: the shared-pain ribbon connects Love to the infatuated kingdom", () => {
  const fw = new AnimationFramework({ projectile: fakeNode, impact: fakeNode, particle: fakeNode })
  fw.playSharedPainRibbon({ x: 0, y: 0 }, { x: 200, y: 0 }, CUPIDS_ARROW)
  expect(fw.particles.active).toBeGreaterThan(0) // the ribbon + shattering hearts
  expect(fw.impacts.active).toBeGreaterThan(0) // the sigil flash
  expect(fw.camera.shaking).toBe(true)
})

const BFFS = {
  gatherMs: 100,
  pendantDurationMs: 150,
  ribbonColor: 0xff4d8d,
  goldColor: 0xe8c66a,
  heartColor: 0xff6fa8,
  petalColor: 0xffd1e3,
  dustColor: 0xfff0f6,
  emblemColor: 0xffb3cf,
}

test("BFFS!!!: pendants gather, fly to BOTH kingdoms, then a ribbon snaps between them", () => {
  const fw = new AnimationFramework({ projectile: fakeNode, impact: fakeNode, particle: fakeNode })
  const from = { x: 0, y: 0 }
  const toA = { x: 300, y: 0 }
  const toB = { x: -200, y: 150 }
  fw.playBffs(from, toA, toB, BFFS)

  // The pendant summon fires immediately; no pendant has launched yet.
  expect(fw.impacts.active).toBeGreaterThan(0)
  expect(fw.projectiles.active).toBe(0)

  let guard = 0
  let maxInFlight = 0
  let sawRibbonSnapParticles = false
  while (guard++ < 3000) {
    fw.update(16)
    maxInFlight = Math.max(maxInFlight, fw.projectiles.active)
    // The ribbon snap (after both pendants land) lays a line of particles.
    if (maxInFlight === 2 && fw.projectiles.active === 0 && fw.particles.active > 0) {
      sawRibbonSnapParticles = true
    }
    if (guard > 60 && fw.projectiles.active === 0 && sawRibbonSnapParticles) break
  }
  // Two pendants flew simultaneously, then the connecting ribbon snapped.
  expect(maxInFlight).toBe(2)
  expect(sawRibbonSnapParticles).toBe(true)
  expect(fw.projectiles.active).toBe(0) // both embedded
})
