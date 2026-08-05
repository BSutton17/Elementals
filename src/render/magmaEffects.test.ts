import { describe, it, expect } from 'vitest'
import { AnimationFramework } from './framework'
import { ABILITY_EFFECTS, AURA_EFFECTS, LAVA_FLOOR_CONFIG, VOLCANO_BLAST } from './effects'
import { LavaFloorSystem } from './systems/lavaFloor'
import type { BlobNode, DisplayNode, LavaFloorConfig, Vec2 } from './types'

// Magma's kit. Where Fire is bright and fast, Magma is heavy and hot: its bolt
// drips instead of trailing, its heavy attack announces itself for two seconds
// before it throws anything, and its utility floods the board.

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

describe('Lava Punch', () => {
  const magma = ABILITY_EFFECTS.lavaPunch!
  const fire = ABILITY_EFFECTS.fireball!

  it('is a basic bolt, not a scripted sequence', () => {
    expect(magma.projectile).toBeDefined()
    expect(magma.eruption).toBeUndefined()
  })

  it('DRIPS where Fireball trails — the clearest difference in flight', () => {
    // Fire's embers rise (negative gravity); molten rock falls. This one sign
    // flip is most of what separates the two kingdoms mid-flight.
    expect(fire.trail!.particles.gravity!).toBeLessThan(0)
    expect(magma.trail!.particles.gravity!).toBeGreaterThan(0)
  })

  it('burns thicker and heavier than Fire', () => {
    // Denser emission and more particles per puff = a continuous smear of
    // molten rock rather than Fireball's few separated puffs.
    expect(magma.trail!.emitEveryMs!).toBeLessThan(fire.trail!.emitEveryMs!)
    expect(magma.trail!.particles.count).toBeGreaterThan(fire.trail!.particles.count)
    // And it travels slower, because it is heavier.
    expect(magma.projectile!.durationMs).toBeGreaterThan(fire.projectile!.durationMs)
  })

  it('throws spatter that falls back to the ground', () => {
    expect(magma.particles!.gravity!).toBeGreaterThan(0)
  })
})

describe('Eruption', () => {
  const fx = ABILITY_EFFECTS.eruption!

  it('rumbles for seconds before it throws anything', () => {
    const cfg = fx.eruption!
    expect(cfg.buildupMs).toBeGreaterThanOrEqual(1500)
    // The buildup is the ability — it must dominate, not be a grace note.
    expect(cfg.buildupMs).toBeGreaterThan(cfg.travelMs / 2)
  })

  it('throws its lava up and over, from a vent above the castle', () => {
    const cfg = fx.eruption!
    expect(cfg.arc).toBeGreaterThan(0)
    expect(cfg.ventY).toBeLessThan(0) // negative = above the castle centre
    expect(cfg.gobs).toBeGreaterThan(1)
  })

  it('shakes the screen before a single gob is in the air', () => {
    let shakes = 0
    const nodes: DisplayNode[] = []
    const fw = new AnimationFramework({
      projectile: () => {
        const n = fakeNode()
        nodes.push(n)
        return n
      },
      impact: fakeNode,
      particle: fakeNode,
    })
    const realShake = fw.camera.shake.bind(fw.camera)
    fw.camera.shake = (cfg) => {
      shakes++
      realShake(cfg)
    }

    fw.playEruption({ x: 200, y: 500 }, { x: 800, y: 500 }, fx.eruption!)
    // A second in: the ground is moving and nothing has been thrown.
    for (let i = 0; i < 60; i++) fw.update(16)
    expect(shakes).toBeGreaterThan(0)
    expect(fw.projectiles.active).toBe(0)
    // The pool prewarms spare nodes at construction, so counting factory calls
    // would prove nothing — VISIBLE is what says something is in the air.
    expect(nodes.filter((n) => n.visible)).toHaveLength(0)
  })

  it('eventually throws every gob, and they all land', () => {
    const fw = new AnimationFramework({
      projectile: fakeNode,
      impact: fakeNode,
      particle: fakeNode,
    })
    fw.playEruption({ x: 200, y: 500 }, { x: 800, y: 500 }, fx.eruption!)

    let peak = 0
    for (let i = 0; i < 500; i++) {
      fw.update(16)
      peak = Math.max(peak, fw.projectiles.active)
    }
    expect(peak).toBeGreaterThan(1) // a volley, not one shot
    expect(fw.projectiles.active).toBe(0) // and all of it lands
  })

  it('arcs the gob above the straight line between the castles', () => {
    const nodes: DisplayNode[] = []
    const fw = new AnimationFramework({
      projectile: () => {
        const n = fakeNode()
        nodes.push(n)
        return n
      },
      impact: fakeNode,
      particle: fakeNode,
    })
    const from = { x: 200, y: 500 }
    const to = { x: 800, y: 500 }
    fw.playEruption(from, to, fx.eruption!)

    // Advance past the buildup, then watch the first gob mid-flight.
    let highest = Infinity
    for (let i = 0; i < 400; i++) {
      fw.update(16)
      for (const n of nodes) if (n.visible) highest = Math.min(highest, n.y)
    }
    // Screen y grows downward, so "above the line" means a SMALLER y than the
    // castles it was thrown between.
    expect(highest).toBeLessThan(from.y - 50)
  })
})

const AT: Vec2 = { x: 300, y: 400 }

function lavaHarness(cfg: LavaFloorConfig = LAVA_FLOOR_CONFIG) {
  const frames: { points: Vec2[]; alpha: number }[] = []
  const blob: BlobNode = {
    draw(points, _fill, _rim, alpha) {
      frames.push({ points: points.map((p) => ({ ...p })), alpha })
    },
    clear() {},
    destroy() {},
  }
  const sys = new LavaFloorSystem(() => blob, fakeNode, 16)
  return { sys, frames, cfg }
}

/** How far the drawn edge reaches from the origin, at its widest. */
const reachOf = (points: Vec2[]) =>
  Math.max(...points.map((p) => Math.hypot(p.x - AT.x, p.y - AT.y)))

describe('Floor is Lava', () => {
  it('spreads outward from the castle that lit it', () => {
    const { sys, frames } = lavaHarness()
    sys.start('lava:a', AT, LAVA_FLOOR_CONFIG)
    for (let i = 0; i < 6; i++) sys.update(16)
    const early = reachOf(frames[frames.length - 1]!.points)
    for (let i = 0; i < 60; i++) sys.update(16)
    const later = reachOf(frames[frames.length - 1]!.points)
    expect(later).toBeGreaterThan(early)
  })

  it('covers the whole battlefield, wherever it started', () => {
    // Castles sit on a circle of radius 340 about (500,500), so a flood lit on
    // one seat has to travel ~680 to reach the far side.
    const { sys, frames } = lavaHarness()
    sys.start('lava:a', AT, LAVA_FLOOR_CONFIG)
    const spreadFrames = Math.ceil(LAVA_FLOOR_CONFIG.spreadMs / 16) + 10
    for (let i = 0; i < spreadFrames; i++) sys.update(16)
    expect(reachOf(frames[frames.length - 1]!.points)).toBeGreaterThan(680)
  })

  it('is a BLOB, not a clean circle', () => {
    const { sys, frames } = lavaHarness()
    sys.start('lava:a', AT, LAVA_FLOOR_CONFIG)
    for (let i = 0; i < 120; i++) sys.update(16)

    const points = frames[frames.length - 1]!.points
    // Undo the vertical squash before measuring, or the ellipse itself would
    // look like roughness and the test would pass on a perfect circle.
    const radii = points.map((p) =>
      Math.hypot(p.x - AT.x, (p.y - AT.y) / 0.82),
    )
    const min = Math.min(...radii)
    const max = Math.max(...radii)
    // A circle would give max/min ≈ 1. Lobes and inlets give a real spread.
    expect(max / min).toBeGreaterThan(1.25)
  })

  it('has an edge that MOVES, not just an uneven fixed shape', () => {
    const { sys, frames } = lavaHarness()
    sys.start('lava:a', AT, LAVA_FLOOR_CONFIG)
    // Well past full spread, so growth cannot explain the difference.
    for (let i = 0; i < 400; i++) sys.update(16)
    const a = frames[frames.length - 1]!.points
    for (let i = 0; i < 60; i++) sys.update(16)
    const b = frames[frames.length - 1]!.points
    const moved = a.some((p, i) => Math.hypot(p.x - b[i]!.x, p.y - b[i]!.y) > 1)
    expect(moved).toBe(true)
  })

  it('cools in place rather than retracting', () => {
    const { sys, frames } = lavaHarness()
    sys.start('lava:a', AT, LAVA_FLOOR_CONFIG)
    for (let i = 0; i < 300; i++) sys.update(16)
    const before = frames[frames.length - 1]!

    sys.stop('lava:a')
    for (let i = 0; i < 30; i++) sys.update(16)
    const after = frames[frames.length - 1]!

    // Dimmer, but still just as big — the lava did not go anywhere, it went out.
    expect(after.alpha).toBeLessThan(before.alpha)
    expect(reachOf(after.points)).toBeGreaterThan(reachOf(before.points) * 0.9)
  })

  it('cools by itself when the ability runs out', () => {
    const { sys } = lavaHarness()
    // The sheet must never outlive the molten ground it is advertising.
    sys.start('lava:a', AT, LAVA_FLOOR_CONFIG, 1000)
    for (let i = 0; i < 40; i++) sys.update(16) // 640ms — still burning
    expect(sys.has('lava:a')).toBe(true)

    const total = 1000 + LAVA_FLOOR_CONFIG.fadeMs + 200
    for (let i = 0; i < Math.ceil(total / 16); i++) sys.update(16)
    expect(sys.has('lava:a')).toBe(false)
    expect(sys.active).toBe(0)
  })

  it('re-lighting a running flood does not restart the spread', () => {
    const { sys, frames } = lavaHarness()
    sys.start('lava:a', AT, LAVA_FLOOR_CONFIG)
    for (let i = 0; i < 100; i++) sys.update(16)
    const grown = reachOf(frames[frames.length - 1]!.points)

    sys.start('lava:a', AT, LAVA_FLOOR_CONFIG)
    sys.update(16)
    expect(reachOf(frames[frames.length - 1]!.points)).toBeGreaterThanOrEqual(grown * 0.95)
    expect(sys.active).toBe(1)
  })

  it('clear() drops everything at once', () => {
    const { sys } = lavaHarness()
    sys.start('lava:a', AT, LAVA_FLOOR_CONFIG)
    sys.start('lava:b', { x: 700, y: 600 }, LAVA_FLOOR_CONFIG)
    for (let i = 0; i < 40; i++) sys.update(16)
    sys.clear()
    expect(sys.active).toBe(0)
  })

  it('is registered as a field, with no bolt thrown at anyone', () => {
    expect(ABILITY_EFFECTS.floorIsLava).toEqual({})
    expect(LAVA_FLOOR_CONFIG.spreadMs).toBeGreaterThan(1500) // "a few seconds"
    expect(LAVA_FLOOR_CONFIG.fadeMs).toBeGreaterThan(1000) // "slowly fade away"
  })
})

describe('the volcano’s two endings', () => {
  const build = () => {
    let shakes: { magnitude: number; durationMs: number }[] = []
    let peakImpacts = 0
    let peakParticles = 0
    const fw = new AnimationFramework({
      projectile: fakeNode,
      impact: fakeNode,
      particle: fakeNode,
    })
    const real = fw.camera.shake.bind(fw.camera)
    fw.camera.shake = (cfg) => {
      shakes.push({ magnitude: cfg.magnitude, durationMs: cfg.durationMs })
      real(cfg)
    }
    return {
      fw,
      run: (frames = 400) => {
        for (let i = 0; i < frames; i++) {
          fw.update(16)
          // Peak CONCURRENT counts, not factory calls — the pools prewarm
          // spare nodes at construction, so counting those measures nothing.
          peakImpacts = Math.max(peakImpacts, fw.impacts.active)
          peakParticles = Math.max(peakParticles, fw.particles.active)
        }
      },
      peakShake: () => Math.max(...shakes.map((s) => s.magnitude)),
      shakeCount: () => shakes.length,
      peakImpacts: () => peakImpacts,
      peakParticles: () => peakParticles,
    }
  }

  const AT = { x: 500, y: 500 }

  it('the failed eruption is the most violent thing in the game', () => {
    const h = build()
    h.fw.playVolcanoEruption(AT, VOLCANO_BLAST)
    h.run()

    // Harder than Eruption's own landing, which is already a heavy hit — this
    // one bills the entire table at once and has to read that way.
    expect(h.peakShake()).toBeGreaterThan(ABILITY_EFFECTS.eruption!.eruption!.shake * 2)
    // And it keeps moving: aftershocks well after the flash.
    expect(h.shakeCount()).toBeGreaterThan(4)
  })

  it('the eruption keeps shaking long after it goes off', () => {
    const h = build()
    h.fw.playVolcanoEruption(AT, VOLCANO_BLAST)
    // Past the blast itself.
    for (let i = 0; i < 80; i++) h.fw.update(16)
    const during = h.shakeCount()
    for (let i = 0; i < 200; i++) h.fw.update(16)
    expect(h.shakeCount()).toBeGreaterThan(during)
  })

  it('breaking it in time is markedly quieter than failing', () => {
    const failed = build()
    failed.fw.playVolcanoEruption(AT, VOLCANO_BLAST)
    failed.run()

    const broken = build()
    broken.fw.playVolcanoBroken(AT, VOLCANO_BLAST)
    broken.run()

    // The reward for cooperating is the ABSENCE of catastrophe. Matching the
    // eruption's violence here would say the opposite of what happened.
    expect(broken.peakShake()).toBeLessThan(failed.peakShake() / 2)
    expect(broken.peakImpacts()).toBeLessThan(failed.peakImpacts())
    expect(broken.peakParticles()).toBeLessThan(failed.peakParticles())
  })

  it('both endings still shake — the mountain moved either way', () => {
    const h = build()
    h.fw.playVolcanoBroken(AT, VOLCANO_BLAST)
    h.run(20)
    expect(h.peakShake()).toBeGreaterThan(0)
  })

  it('a covered eruption bills nobody, so it must not level the board', () => {
    // `amount <= 0` means the field chipped off the full yield between them.
    // BattlefieldFx routes that to the quiet ending; this pins the two apart.
    const quiet = build()
    quiet.fw.playVolcanoBroken(AT, VOLCANO_BLAST)
    quiet.run()
    const loud = build()
    loud.fw.playVolcanoEruption(AT, VOLCANO_BLAST)
    loud.run()
    expect(quiet.peakShake()).toBeLessThan(loud.peakShake())
  })
})

describe('Ignited reads as a threat, not a fire', () => {
  const ignited = AURA_EFFECTS.ignited!
  const solar = AURA_EFFECTS.solarBurn!

  it('is registered as a status aura, so it lives exactly as long as the mark', () => {
    expect(ignited).toBeDefined()
    expect(ignited.emitters.length).toBeGreaterThan(0)
  })

  it('smoulders far more quietly than an actual burn', () => {
    // It holds for a MINUTE on potentially every enemy at once. Solar Burn's
    // rates are tuned for a five-second window; reusing them here would put
    // thousands of particles in flight.
    const total = (a: typeof ignited) => a.emitters.reduce((n, e) => n + e.rate, 0)
    expect(total(ignited)).toBeLessThan(total(solar) / 4)
  })

  it('is visible enough to actually notice', () => {
    // The whole ability is the victim knowing they are lit and not knowing
    // when it will catch. Zero emission would break that as surely as flames.
    expect(ignited.emitters.some((e) => e.rate > 0)).toBe(true)
  })
})
