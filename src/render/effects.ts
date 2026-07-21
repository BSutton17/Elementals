import type { AuraDefinition, EffectDefinition, ThunderdomeConfig } from './types'

// Per-ability effect definitions (Epic 9), keyed by the authoritative ability id
// the server's `abilityCast` event carries. Registered into the framework's
// EffectRegistry; unregistered abilities fall back to the generic themed effect.
// Abilities are added one at a time as they're polished.

/** Palette for a basic-attack bolt — the ONLY thing that differs per kingdom. */
interface BoltPalette {
  /** Bright projectile core (should be the lightest hue). */
  core: number
  /** Streaming trail behind the core (a darker, saturated element hue). */
  trail: number
  /** Impact shockwave ring. */
  impact: number
  /** Burst particles thrown on landing. */
  ember: number
}

/**
 * A basic attack bolt — Fire's Fireball generalized. A bright core streaks to
 * the target trailing a comet tail, then bursts into a shockwave ring and a
 * shower of particles, with a short screen kick. Every kingdom's basic attack
 * (Water Ball, Sludge, A Light Breeze, Rock Throw, Zap, Icicle, …) reuses this
 * exact motion/timing and differs ONLY by palette. Core/trail/impact/ember use
 * distinct hues so the bolt reads with depth, not as a flat disc.
 */
function basicBolt(palette: BoltPalette): EffectDefinition {
  return {
    projectile: {
      durationMs: 420, // straight-line travel time A→B (data-editable)
      size: 13,
      color: palette.core, // brighter than the trail
      easing: 'linear',
      faceDirection: true,
    },
    // Comet tail: small puffs streamed along the flight path. Their low speed +
    // slight rise (negative gravity) linger behind the moving core, elongating
    // into the trail — this is what gives the bolt its shape.
    trail: {
      emitEveryMs: 18,
      particles: {
        count: 4,
        speed: [10, 55],
        spread: Math.PI,
        lifetimeMs: 320,
        size: 6,
        color: palette.trail,
        gravity: -70,
        fade: true,
      },
    },
    impact: {
      durationMs: 320,
      size: 64,
      color: palette.impact,
      easing: 'easeOut',
    },
    particles: {
      count: 22,
      speed: [180, 460],
      spread: Math.PI, // full-circle burst
      lifetimeMs: 560,
      size: 5,
      color: palette.ember,
      gravity: 300,
      fade: true,
    },
    shake: { magnitude: 6, durationMs: 200 },
  }
}

// Basic attacks (each kingdom's "Q") — same bolt, kingdom-coloured.
const FIREBALL = basicBolt({ core: 0xffe27a, trail: 0xff4d1a, impact: 0xffa640, ember: 0xffb84a })
const WATER_BALL = basicBolt({ core: 0xcdeaff, trail: 0x1e6fd0, impact: 0x4aa3ff, ember: 0x86c8ff })
const A_LIGHT_BREEZE = basicBolt({ core: 0xffffff, trail: 0x8aa2e0, impact: 0xb7c9ff, ember: 0xd7e2ff })
const ROCK_THROW = basicBolt({ core: 0xe8d3a8, trail: 0x7a5325, impact: 0xc9a56b, ember: 0xb08a4a })
const ICICLE = basicBolt({ core: 0xeaffff, trail: 0x2aa0d8, impact: 0x8fe3ff, ember: 0xc4f0ff })
const SLUDGE = basicBolt({ core: 0xd7ffcf, trail: 0x2f9e4f, impact: 0x6bd88a, ember: 0xa8f0b8 })

/**
 * Zap — Electricity's basic attack. A procedural lightning strike (not the
 * shared bolt): a yellow-white core inside a purple glow bloom, regenerated
 * every frame so it flickers and forks uniquely each cast, then a bright flash +
 * spark burst + short crackling arcs at the target. Electricity's palette:
 * yellow-white core, purple glow (see LightningSystem; reusable by Thunderdome /
 * Thundering Fate later).
 */
const ZAP: EffectDefinition = {
  lightning: {
    durationMs: 210, // flickers briefly then gone
    coreColor: 0xfff6c0, // yellow-white core
    glowColor: 0xa855f7, // purple bloom
    coreWidth: 3,
    glowWidth: 12,
    jaggedness: 0.32,
    subdivisions: 5,
    branchChance: 0.4,
    impactArcs: 4, // crackling arcs at the hit
  },
  // Impact: a bright flash + a burst of yellow sparks + a short kick.
  impact: { durationMs: 200, size: 74, color: 0xe6ccff, easing: 'easeOut' },
  particles: {
    count: 22,
    speed: [220, 560],
    spread: Math.PI,
    lifetimeMs: 300,
    size: 4,
    color: 0xfff2a0,
    gravity: 120,
    fade: true,
  },
  shake: { magnitude: 5, durationMs: 150 },
}

/**
 * Lightning Barrage — Electricity's charge-based attack. A scripted storm of
 * procedural strikes whose intensity scales automatically with the charges
 * spent (1–3): the framework ramps bolt count, branches, glow, sparks, impact,
 * corona, and shake from these colours (see `playBarrage`). Same palette as Zap.
 */
const LIGHTNING_BARRAGE: EffectDefinition = {
  barrage: {
    coreColor: 0xfff6c0, // yellow-white
    glowColor: 0xa855f7, // purple
    flashColor: 0xe6ccff, // impact flash
    sparkColor: 0xfff2a0, // airborne sparks
  },
}

/**
 * Scorching Sun — Fire's powerful attack. A concentrated solar beam: a blazing
 * orb charges at the caster for 1.25s, then a searing yellow-white laser snaps
 * out to the target, bursting into fire and kicking the screen on impact.
 */
const SCORCHING_SUN: EffectDefinition = {
  beam: {
    chargeMs: 1500, // charge-up before firing (per design)
    fireMs: 1500, // how long the beam lingers after firing
    width: 16,
    color: 0xfff2a0, // searing yellow-white core
    chargeSize: 46, // radius the charge orb builds to
    easing: 'easeIn',
  },
  impact: {
    durationMs: 540,
    size: 78,
    color: 0xffa640,
    easing: 'easeOut',
  },
  particles: {
    count: 26,
    speed: [200, 520],
    spread: Math.PI,
    lifetimeMs: 600,
    size: 6,
    color: 0xffcf5a,
    gravity: 280,
    fade: true,
  },
  // The user-requested screen shake, fired the instant the beam lands.
  shake: { magnitude: 12, durationMs: 560 },
}

/** Palette for a swirling vortex — the ONLY thing that differs between kingdoms. */
interface VortexPalette {
  /** Spiral bands / smoke. */
  band: number
  /** Bright core "eye". */
  core: number
  /** Glowing embers + landing dust. */
  ember: number
}

/**
 * A spinning vortex parked on the target for 2.5s: layered glow + core eye +
 * turbulent spiral bands + a continuous stream of orbiting embers (handled by
 * the VortexSystem), plus a landing punch — an expanding shockwave ring, a
 * short screen kick, and a puff of dust. Shared by Fire's Firenado and (later)
 * Air's Hurricane; they differ ONLY by palette, so both come from this helper.
 */
function swirlingVortex(palette: VortexPalette): EffectDefinition {
  return {
    vortex: {
      durationMs: 2500,
      size: 96,
      color: palette.band,
      coreColor: palette.core,
      emberColor: palette.ember,
      spin: 6.5,
      arms: 60,
      emberRate: 60,
    },
    // Landing: an expanding shockwave ring (the impact system draws a ring).
    impact: { durationMs: 460, size: 150, color: palette.core, easing: 'easeOut' },
    // …a puff of dust thrown up on touchdown.
    particles: {
      count: 30,
      speed: [120, 340],
      spread: Math.PI,
      lifetimeMs: 560,
      size: 5,
      color: palette.ember,
      gravity: 220,
      fade: true,
    },
    // …and a brief screen kick so the touchdown feels weighty.
    shake: { magnitude: 8, durationMs: 1060 },
  }
}

/**
 * Firenado — Fire's very powerful attack. A churning vortex of fire lands on the
 * target and spins for 2.5s. Damage lands immediately (no travel). Reuses the
 * shared vortex; Air's Hurricane will reuse it too with an air palette.
 */
const FIRENADO = swirlingVortex({ band: 0xd8471a, core: 0xffe08a, ember: 0xffa23a })

/** Flood — Water's heavy attack. The vortex, water-coloured (same effect as
 *  Firenado / Air's Hurricane). */
const FLOOD = swirlingVortex({ band: 0x1e6fd0, core: 0xd4f0ff, ember: 0x7fc4ff })

/**
 * Waterfall — Water's powerful attack. A heavy wave of water gathers at the
 * caster, surges across the arena on a weighty ease shedding foam + mist, and
 * crashes into the target with a directional splash. Reuses the WaveSystem;
 * future water abilities (tidal wave, tsunami, …) can reuse it by scale/palette.
 */
const WATERFALL: EffectDefinition = {
  wave: {
    gatherMs: 260, // water gathers/swirls at the caster before launching
    travelMs: 620,
    size: 48,
    bodyColor: 0x2e7fd6, // translucent blue body
    deepColor: 0x123a6b, // darker interior
    foamColor: 0xdff2ff, // bright foam / mist
    blobs: 5,
    sprayRate: 80,
    easing: 'easeInOut', // accelerate out, decelerate into impact
  },
  // Splash: expanding ring + a burst of droplets + a short kick.
  impact: { durationMs: 380, size: 120, color: 0x9fd6ff, easing: 'easeOut' },
  particles: {
    count: 28,
    speed: [160, 440],
    spread: Math.PI,
    lifetimeMs: 560,
    size: 5,
    color: 0x8fd0ff,
    gravity: 380,
    fade: true,
  },
  shake: { magnitude: 5, durationMs: 240 },
}

/**
 * Shield break — a shatter burst when a castle's shield is destroyed. Not a
 * server ability: BattlefieldFx plays it at the castle on the `shieldDestroyed`
 * event. `tintFrom: 'primary'` colours the shards to the kingdom's theme.
 */
const SHIELD_BREAK: EffectDefinition = {
  tintFrom: 'primary',
  impact: { durationMs: 420, size: 130, color: 0xffffff, easing: 'easeOut' }, // expanding ring
  particles: {
    count: 34,
    speed: [240, 560],
    spread: Math.PI, // shards fly out in all directions
    lifetimeMs: 620,
    size: 5,
    color: 0xffffff,
    gravity: 240, // heavier shards fall
    fade: true,
  },
  shake: { magnitude: 6, durationMs: 220 },
}

/** All registered ability effects, keyed by ability id. */
export const ABILITY_EFFECTS: Record<string, EffectDefinition> = {
  // Basic attacks — one shared bolt, kingdom-coloured.
  fireball: FIREBALL,
  waterBall: WATER_BALL,
  aLightBreeze: A_LIGHT_BREEZE,
  rockThrow: ROCK_THROW,
  zap: ZAP,
  icicle: ICICLE,
  sludge: SLUDGE,
  // Fire specials.
  scorchingSun: SCORCHING_SUN,
  firenado: FIRENADO,
  // Water specials.
  waterfall: WATERFALL,
  flood: FLOOD,
  // Electricity specials.
  lightningBarrage: LIGHTNING_BARRAGE,
  // Synthetic (event-driven, not a server ability id).
  shieldBreak: SHIELD_BREAK,
}

// --- Persistent status auras -------------------------------------------------
// Keyed by STATUS id (not ability id). Started on `statusApplied`, stopped on
// `statusExpired`. These emit continuously for the status's whole duration.

/**
 * Heat Wave — a self-buff on the Fire castle. Smoulders like a chimney: grey
 * smoke rises from the castle top (with a few faint embers) for the buff's
 * duration.
 */
const HEAT_WAVE_AURA: AuraDefinition = {
  emitters: [
    {
      // Smoke column rising and spreading from the castle top.
      rate: 12,
      color: 0x6f6f6f,
      size: [2, 6],
      lifetimeMs: 1600,
      riseSpeed: [50, 95],
      drift: 10,
      originY: -62, // out the top, chimney-style
      spawnWidth: 16,
      growth: 2.4, // smoke billows outward as it climbs
      sway: 10,
      fade: true,
    },
    {
      // A sparse scatter of glowing embers riding the smoke.
      rate: 6,
      color: 0xff7a3c,
      size: [2, 4],
      lifetimeMs: 900,
      riseSpeed: [95, 150],
      drift: 8,
      originY: -58,
      spawnWidth: 18,
      glow: true,
      growth: 0.6,
      fade: true,
    },
  ],
}

/**
 * Blazing Determination — a self-buff that persists until the empowered strike
 * is used. The Fire castle is engulfed in flames (with rising sparks), and the
 * screen kicks once when it ignites.
 */
const BLAZING_DETERMINATION_AURA: AuraDefinition = {
  shakeOnStart: { magnitude: 9, durationMs: 420 },
  behind: true, // flames engulf from behind so the castle silhouette stays visible
  emitters: [
    {
      // Flames licking up the castle body.
      rate: 70,
      color: 0xff5a1e,
      size: [22, 32],
      lifetimeMs: 620,
      riseSpeed: [150, 250],
      drift: 24,
      originY: 24, // around the castle body
      spawnWidth: 124,
      glow: true,
      growth: 0.4, // flames taper as they rise
      sway: 8,
      fade: true,
    },
    {
      // Sparks flung upward off the fire.
      rate: 26,
      color: 0xffd27a,
      size: [2, 5],
      lifetimeMs: 900,
      riseSpeed: [210, 330],
      drift: 30,
      originY: 12,
      spawnWidth: 84,
      glow: true,
      growth: 0.5,
      fade: true,
    },
  ],
}

/**
 * Burn — the damage-over-time debuff Fire attacks inflict on ANY castle. While
 * it burns, the castle smoulders: dark smoke rises off its body with a few faint
 * embers. Applies to every kingdom, not just Fire (it's driven by the status,
 * not the caster).
 */
const BURN_AURA: AuraDefinition = {
  emitters: [
    {
      // Smoke rising off the burning castle body.
      rate: 14,
      color: 0x555555,
      size: [3, 8],
      lifetimeMs: 1400,
      riseSpeed: [55, 100],
      drift: 12,
      originY: -18, // off the castle body, not just the roof
      spawnWidth: 60,
      growth: 2.2,
      sway: 12,
      fade: true,
    },
    {
      // A few glowing embers to sell that it's actively burning.
      rate: 8,
      color: 0xff7a3c,
      size: [2, 4],
      lifetimeMs: 780,
      riseSpeed: [90, 150],
      drift: 14,
      originY: -6,
      spawnWidth: 66,
      glow: true,
      growth: 0.6,
      fade: true,
    },
  ],
}

/**
 * Misting — small bubbles rising off the Water castle. Not a server status: it's
 * started on the CASTER when Water casts a sustain ability (Fluid Assimilation,
 * Flood) and self-stops after a set window (see BattlefieldFx MIST_ON_CAST_MS).
 */
const MISTING_AURA: AuraDefinition = {
  emitters: [
    {
      // Small watery bubbles drifting up off the castle.
      rate: 16,
      color: 0xbfe4ff,
      size: [2, 5],
      lifetimeMs: 1100,
      riseSpeed: [40, 90],
      drift: 10,
      originY: -8, // off the castle body
      spawnWidth: 74,
      glow: true, // faint glow so they read as water, not dust
      growth: 1.3, // bubbles swell slightly as they rise
      sway: 8,
      fade: true,
    },
  ],
}

/**
 * Thunderdome — Electricity's electrical cage. A persistent pentagon locked
 * around the trapped target (status id `thunderdome`), built + collapsed by the
 * ThunderdomeSystem, and surged whenever an Electricity attack hits inside it.
 * Purple/yellow palette like Zap.
 */
export const THUNDERDOME_CONFIG: ThunderdomeConfig = {
  radius: 135,
  coreColor: 0xfff6c0, // yellow-white racing electricity / nodes
  glowColor: 0xa855f7, // purple glow / interior field
  buildMs: 800,
  collapseMs: 500,
}

/** All registered status auras, keyed by status id. */
export const AURA_EFFECTS: Record<string, AuraDefinition> = {
  heatWave: HEAT_WAVE_AURA,
  blazingDetermination: BLAZING_DETERMINATION_AURA,
  burn: BURN_AURA,
  misting: MISTING_AURA,
}
