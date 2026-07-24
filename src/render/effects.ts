import type {
  AcidRainConfig,
  AuraDefinition,
  EarthquakeConfig,
  EffectDefinition,
  FrostAuraConfig,
  ProjectileShape,
  ThunderdomeConfig,
  WindDeflectionConfig,
} from './types'

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
function basicBolt(palette: BoltPalette, shape?: ProjectileShape): EffectDefinition {
  return {
    projectile: {
      durationMs: 420, // straight-line travel time A→B (data-editable)
      size: 13,
      color: palette.core, // brighter than the trail
      easing: 'linear',
      faceDirection: true,
      // Most basics are round blobs; Ice's Icicle is a spike (tip leads).
      ...(shape ? { shape } : {}),
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
// Ice's Icicle is the shared bolt drawn as a sharp spike instead of a round blob.
const ICICLE = basicBolt({ core: 0xeaffff, trail: 0x2aa0d8, impact: 0x8fe3ff, ember: 0xc4f0ff }, 'triangle')
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
 * Scorching Sun — Fire's powerful attack, a colossal SOLAR LASER. A white-hot
 * orb of compressed solar energy charges briefly (~450ms) while flames + embers
 * are pulled inward, then a devastating multi-layer star-beam (blinding white
 * core → yellow inner → orange/gold plasma → flickering corona) snaps across the
 * battlefield, shedding plasma currents + embers, and detonates in an enormous
 * solar explosion. The layered beam, charge orb, convergence, along-beam
 * particles, and the flash/rings/flares of the detonation are all rendered by the
 * BeamSystem; the shockwave ring + molten spray + screen kick come from the burst
 * below. The guaranteed Burn is shown as bright solar flames (SOLAR_BURN_AURA).
 */
const SCORCHING_SUN: EffectDefinition = {
  beam: {
    chargeMs: 450, // a brief, dramatic charge (300–600ms)
    fireMs: 320, // the laser is nearly instantaneous, brief-lived
    width: 14, // the blinding CORE width; the outer layers scale up around it
    color: 0xffe27a, // fallback hue
    chargeSize: 42, // radius the charge orb builds to
    easing: 'easeIn',
    coreColor: 0xffffff, // blinding white-hot centre
    innerColor: 0xffe27a, // bright yellow inner beam
    plasmaColor: 0xffa640, // surrounding orange/gold plasma
    coronaColor: 0xff6a1a, // outer solar corona
    emberColor: 0xffc24a, // peeling embers / sparks / ash
  },
  // Detonation garnish: the expanding solar shockwave ring + a shower of molten
  // embers + a heavy screen kick (the white flash, plasma rings, and flares are
  // the BeamSystem's own detonation).
  impact: { durationMs: 560, size: 150, color: 0xffd27a, easing: 'easeOut' },
  particles: {
    count: 34,
    speed: [220, 620],
    spread: Math.PI,
    lifetimeMs: 640,
    size: 6,
    color: 0xffcf5a,
    gravity: 300,
    fade: true,
  },
  shake: { magnitude: 13, durationMs: 520 },
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
      arms: 100,
      emberRate: 60,
    },
    // Landing: an expanding shockwave ring (the impact system draws a ring).
    impact: { durationMs: 460, size: 150, color: palette.core, easing: 'easeOut' },
    // …a puff of dust thrown up on touchdown.
    particles: {
      count: 35,
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

/** Hurricane — Air's powerful attack. The same swirling vortex as Firenado /
 *  Flood, in Air's colours. */
const HURRICANE = swirlingVortex({ band: 0x8aa2e0, core: 0xeaf2ff, ember: 0xc3d4ff })

/**
 * Thick Fog — Air's screen-blinding attack. The TRAVEL reads like a gust of wind
 * blowing toward the opponent: a pale, soft cloud puff streaks over with a wide
 * wispy tail, then bursts into a puff on arrival. (The blinding fog overlay
 * itself is a separate full-screen effect for the victim — see FogOverlay.)
 */
const THICK_FOG: EffectDefinition = {
  projectile: {
    durationMs: 500,
    size: 22, // a broad, soft gust, not a hard bolt
    color: 0xeaf2ff,
    easing: 'easeOut', // gusts fast then eases as it arrives
    faceDirection: true,
  },
  // A wide, wispy tail trailing the gust like blown cloud.
  trail: {
    emitEveryMs: 14,
    particles: {
      count: 5,
      speed: [30, 110],
      spread: 0.9, // fans out behind, not a tight line
      lifetimeMs: 460,
      size: 12,
      color: 0xc3d4ff,
      gravity: -12, // drifts up softly
      fade: true,
    },
  },
  // A soft puff on arrival (no shake — wind lands gently).
  impact: { durationMs: 340, size: 96, color: 0xdfe8ff, easing: 'easeOut' },
  particles: {
    count: 18,
    speed: [120, 300],
    spread: Math.PI,
    lifetimeMs: 520,
    size: 9,
    color: 0xc3d4ff,
    gravity: 20,
    fade: true,
  },
}

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
 * Gastro Acid — Nature's powerful attack. A massive PRESSURIZED stream of
 * corrosive acid: reuses the WaveSystem (churning translucent body + darker
 * green interior + bright yellow foam crest, shedding droplets/streams as it
 * travels) in a toxic-green palette, thicker and faster than Sludge's bolt, then
 * detonates in a violent corrosive explosion (expanding ring + a heavy shower of
 * droplets + a screen kick). The lingering bubbling/sizzling/steam + the 5 s
 * poison idle come from a cloud-less AcidRainSystem aura (GASTRO_POISON_CONFIG),
 * started per target on cast.
 */
const GASTRO_ACID_EFFECT: EffectDefinition = {
  wave: {
    gatherMs: 200, // brief pressurize before the blast launches
    travelMs: 560,
    size: 56, // thicker/more dangerous than Sludge
    bodyColor: 0x6ee23a, // toxic green body
    deepColor: 0x2f6b1a, // darker green interior (depth)
    foamColor: 0xeaff7a, // bright yellow highlights (additive)
    blobs: 6,
    sprayRate: 95, // heavy shed of corrosive droplets/streams
    easing: 'easeInOut',
  },
  // Violent corrosive explosion (not a simple splash).
  impact: { durationMs: 460, size: 150, color: 0xbfff4d, easing: 'easeOut' },
  particles: {
    count: 40,
    speed: [200, 560],
    spread: Math.PI, // droplets spray in all directions
    lifetimeMs: 620,
    size: 6,
    color: 0x9be86a,
    gravity: 340, // heavy acid droplets fall
    fade: true,
  },
  shake: { magnitude: 9, durationMs: 300 },
}

/**
 * Gastro Acid's poison idle — a cloud-less AcidRainSystem corrosion aura started
 * on each target for the 5 s strong Poison: dense toxic fumes, bubbling acid,
 * dripping corrosive liquid, and swollen bubbles that burst into vapor. Denser
 * (`intensity`) than the Corroded storm to read as the stronger poison, and it
 * evaporates naturally when the Poison expires. Reusable by future toxin/venom/
 * disease DoTs.
 */
export const GASTRO_POISON_CONFIG: AcidRainConfig = {
  cloud: false, // ground corrosion only — no storm cloud or rain
  intensity: 1.6, // stronger/more dangerous than Sludge's (nonexistent) idle
  cloudColor: 0x2e3b22, // unused without a cloud, but part of the shared palette
  acidColor: 0xbfff4d,
  glowColor: 0xeaffa0,
  vaporColor: 0x9be86a,
  radius: 60,
  cloudHeight: 0,
  gatherMs: 300,
  dissolveMs: 1400,
}

/**
 * Flood of Frost — Ice's powerful attack. A massive FREEZING tidal wave: reuses
 * the WaveSystem in a dark-blue/frosty palette (translucent ice body, deep-blue
 * interior, bright frost foam), shedding icy mist + frost spray as it surges,
 * then flash-freezes on impact — a violent splash that instantly locks into
 * jagged ice (expanding ring + a shower of ice shards + a screen kick). The
 * lingering frost + Chilling Retribution enhancement come from a FrostAuraSystem
 * aura (FROST_AURA_CONFIG), started per target on cast.
 */
const FLOOD_OF_FROST_EFFECT: EffectDefinition = {
  wave: {
    gatherMs: 180, // a fast, overwhelming surge
    travelMs: 560,
    size: 54,
    bodyColor: 0x2f6fd0, // dark icy-blue water
    deepColor: 0x123a72, // deep frozen interior
    foamColor: 0xdff2ff, // bright frost crest / spray
    blobs: 6,
    sprayRate: 100, // heavy icy mist + frost shards trailing
    easing: 'easeInOut',
  },
  // Flash-freeze: a violent splash that instantly turns to jagged ice.
  impact: { durationMs: 460, size: 150, color: 0xbfe6ff, easing: 'easeOut' },
  particles: {
    count: 40,
    speed: [200, 560],
    spread: Math.PI, // ice shards fly outward
    lifetimeMs: 640,
    size: 6,
    color: 0xdff2ff,
    gravity: 300,
    fade: true,
  },
  shake: { magnitude: 9, durationMs: 320 },
}

/**
 * Flood of Frost's lingering frost — a FrostAuraSystem aura started on each
 * target on cast: creeping frost crystals, drifting snow, cold vapor, sparkles.
 * When Chilling Retribution lands (`chillingRetribution` status) it's ENHANCED
 * with pale-blue magical energy + a pulsing rune ring and kept alive until the
 * status expires; otherwise it melts after `baseDurationMs`. Reusable by future
 * Ice DoTs/CC (blizzard, frostbite, deep freeze).
 */
export const FROST_AURA_CONFIG: FrostAuraConfig = {
  frostColor: 0xdcf3ff, // pale icy white-blue frost
  iceColor: 0xffffff, // bright crystal highlight / sparkle
  vaporColor: 0xbfe0ff, // cold vapor
  runeColor: 0x8fd0ff, // pale-blue magical energy
  radius: 66,
  baseDurationMs: 3200, // base lingering frost when Chilling Retribution misses
  dissolveMs: 1400,
}

/**
 * Freeze to the Core's frozen atmosphere — the FrostAuraSystem aura for the
 * `frozen` status (Ice ultimate; also the passive freeze-on-hit). Denser and
 * larger than Flood of Frost's lingering frost: an oppressive cold shroud around
 * the whole castle (drifting mist, falling snow, rising vapor, sparkles, creeping
 * crystals) that lasts the freeze. Never auto-melts within a freeze (`frozen` is
 * a few seconds); it's stopped on `frozen` expiry. The cast's gather→flash→erupt
 * is `framework.playFreezeCast`; the ice-cube encasement is the SVG FrozenOverlay.
 */
export const FROZEN_ATMOSPHERE_CONFIG: FrostAuraConfig = {
  frostColor: 0xdcf3ff,
  iceColor: 0xffffff,
  vaporColor: 0xbfe0ff,
  runeColor: 0x8fd0ff, // unused (frozen isn't "enhanced"), kept for palette parity
  radius: 82, // a dense, oppressive shroud around the whole castle
  baseDurationMs: 8000, // outlasts the freeze; stopped on statusExpired
  dissolveMs: 1200,
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

/**
 * Air's projectile-deflection dressing (Epic 9). Fed to
 * `framework.playRedirectedAbility` when the server reports Air's passive turned
 * an attack aside: a wall of compressed white/pale-blue wind that intercepts the
 * incoming projectile at the Air castle and hurls it at a new target. Purely the
 * WIND look — the projectile keeps its own palette — so this one config covers
 * every current and future traveling ability Air can redirect.
 */
export const WIND_DEFLECTION: WindDeflectionConfig = {
  flash: 0xffffff, // compressed-air core / directional flash
  ring: 0xeaf2ff, // expanding wind rings
  gust: 0xffffff, // swirling white gusts
  gustAlt: 0xc3d4ff, // pale-blue gusts / streaks
  feather: 0xdfe8ff, // drifting feathers
  pauseMs: 150, // suspended-in-the-burst beat (100–200)
}

/**
 * Meteor Shower — Earth's powerful attack, an orbital bombardment. A scripted
 * MULTI-IMPACT barrage: glowing molten meteors fall from high above the target,
 * staggered so each strike registers on its own, each accelerating under gravity
 * with a blazing orange-red trail before detonating in its own explosion (rock
 * debris, molten fragments, rolling dust, pebbles, shockwave, screen kick). See
 * `framework.playMeteorShower`.
 */
const METEOR_SHOWER: EffectDefinition = {
  meteorShower: {
    meteors: 9, // several distinct impacts (the multi-hit barrage)
    durationMs: 1500, // staggered across ~1.5s so each strike registers
    fallHeight: 620, // meteors start high above the target
    spread: 78, // impacts scatter around the target
    size: 15,
    coreColor: 0xffb24a, // molten glowing core
    rockColor: 0x6b4a2a, // dark rocky exterior / debris
    trailColor: 0xff5a1e, // blazing orange-red trail
    emberColor: 0xffcf5a, // molten embers / fragments
    dustColor: 0xa88a5c, // rolling dust clouds
  },
}

/**
 * Earthquake — Earth's heavy attack. A tectonic rupture at the primary target
 * (branching glowing fractures, erupting stone, rolling dust, debris, heavy
 * shake) after a trembling buildup, then seismic waves that race to every other
 * kingdom and strike each with a lighter aftershock. Driven per cast by
 * `framework.playEarthquake` (BattlefieldFx supplies the neighbour positions).
 */
export const EARTHQUAKE_CONFIG: EarthquakeConfig = {
  buildupMs: 1820, // ground trembles before the rupture
  waveSpeed: 900, // seismic waves race outward at this speed
  radius: 130, // fracture reach around the primary
  glowColor: 0xd2691e, // faint molten underground glow
  coreColor: 0xffa64a, // bright crack core
  rockColor: 0x6b5540, // stone / rock debris
  dustColor: 0xa8977a, // rolling dust
  gravelColor: 0x8a6f4a, // flying dirt / gravel
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
  // Fluid Assimilation is a self-protection (Assimilated on every enemy) with
  // no battlefield projectile — empty suppresses the generic fallback bolt it
  // would otherwise fling at each enemy.
  fluidAssimilation: {},
  // Air specials.
  hurricane: HURRICANE,
  thickFog: THICK_FOG,
  // Earth specials.
  meteorShower: METEOR_SHOWER,
  // Earthquake's whole visual is the orchestrated rupture + seismic waves
  // (framework.playEarthquake, driven from BattlefieldFx); empty suppresses the
  // generic fallback projectile.
  earthquake: {},
  // Electricity specials.
  lightningBarrage: LIGHTNING_BARRAGE,
  // Hack keeps the generic fallback projectile (a themed bolt at the victim)
  // on top of the victim's full-screen HackOverlay — no entry needed here.
  // Dust Bunnies is drawn by DustBunniesLayer (SVG bunnies + brawl clouds), so
  // suppress the generic fallback projectiles it would otherwise fire per enemy.
  dustBunnies: {},
  // Acid Rain's whole visual is the persistent Corroded storm/rain/corrosion
  // (AcidRainSystem, driven by the `corroded` status) — suppress the fallback
  // projectile so the cast doesn't also fling a generic bolt at the target.
  acidRain: {},
  // Gastro Acid: a churning acid wave + violent explosion; its poison idle is a
  // cloud-less corrosion aura started per target on cast (see BattlefieldFx).
  gastroAcid: GASTRO_ACID_EFFECT,
  // Flood of Frost: a freezing tidal wave + flash-freeze; its lingering frost /
  // Chilling Retribution is a FrostAuraSystem aura started per target on cast.
  floodOfFrost: FLOOD_OF_FROST_EFFECT,
  // Freeze to the Core: the cast is the orchestrated gather→flash→erupt
  // (framework.playFreezeCast); the encasement + atmosphere are driven by the
  // `frozen` status. Empty here so the generic fallback projectile is suppressed.
  freezeToTheCore: {},
  // Blizzard: a GLOBAL weather event — the full-screen BlizzardOverlay + each
  // enemy's `frozen` frost. Empty so no per-enemy fallback bolt is flung.
  blizzard: {},
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
 * Solar Burn — Scorching Sun's Burn, shown as intensely bright SOLAR flames
 * rather than ordinary fire/smoke: white-hot highlights over golden fire and
 * orange plasma, with embers pulsing with residual solar energy. Not a distinct
 * server status (Burn is shared) — it's started on the TARGET on Scorching Sun's
 * cast for the Burn window (see BattlefieldFx), so it self-stops on a timer.
 */
const SOLAR_BURN_AURA: AuraDefinition = {
  emitters: [
    {
      // Golden/orange solar flames licking up the castle.
      rate: 62,
      color: 0xffb838,
      size: [18, 28],
      lifetimeMs: 620,
      riseSpeed: [160, 260],
      drift: 22,
      originY: 20,
      spawnWidth: 112,
      glow: true,
      growth: 0.4,
      sway: 8,
      fade: true,
    },
    {
      // White-hot highlights at the flame roots.
      rate: 26,
      color: 0xffffff,
      size: [6, 12],
      lifetimeMs: 460,
      riseSpeed: [200, 320],
      drift: 18,
      originY: 10,
      spawnWidth: 82,
      glow: true,
      growth: 0.3,
      fade: true,
    },
    {
      // Embers rising with residual solar energy.
      rate: 22,
      color: 0xffd870,
      size: [2, 5],
      lifetimeMs: 900,
      riseSpeed: [220, 340],
      drift: 26,
      originY: 6,
      spawnWidth: 92,
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

/**
 * Acid Rain / Corroded (Nature). A toxic storm cloud + glowing acid rain + a
 * persistent chemical-corrosion aura, keyed to the `corroded` status and surged
 * whenever a fresh Poison lands while Corroded (the stacking synergy). Murky
 * storm-green cloud, toxic yellow-green acid, luminescent sheen, green vapor —
 * reusable by future Nature chemical abilities via palette + dimensions alone.
 */
export const ACID_RAIN_CONFIG: AcidRainConfig = {
  cloudColor: 0x2e3b22, // dark murky storm green
  acidColor: 0xbfff4d, // toxic yellow-green
  glowColor: 0xeaffa0, // luminescent highlight / sizzle flash
  vaporColor: 0x9be86a, // rising chemical vapor
  radius: 74,
  cloudHeight: 150, // cloud forms this far above the target
  gatherMs: 700,
  dissolveMs: 1200,
}

/** All registered status auras, keyed by status id. */
export const AURA_EFFECTS: Record<string, AuraDefinition> = {
  heatWave: HEAT_WAVE_AURA,
  blazingDetermination: BLAZING_DETERMINATION_AURA,
  burn: BURN_AURA,
  misting: MISTING_AURA,
  // Cast-driven (not a status): Scorching Sun's bright solar-flame Burn.
  solarBurn: SOLAR_BURN_AURA,
}
