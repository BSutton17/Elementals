import type {
  AcidRainConfig,
  AuraDefinition,
  BffsConfig,
  BlackHoleConfig,
  CupidsArrowConfig,
  EarthquakeConfig,
  EffectDefinition,
  FirefliesConfig,
  FoxOrbitConfig,
  EruptionConfig,
  LavaFloorConfig,
  FrostAuraConfig,
  OrionsBeltConfig,
  ProjectileShape,
  SupernovaConfig,
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
function basicBolt(
  palette: BoltPalette,
  shape?: ProjectileShape,
  /** Scales ONLY the travelling element — the trail, impact, and burst are
   *  untouched. Shaped bolts read smaller than a disc at the same radius, so
   *  the pictorial ones (icicle, heart, spade) are sized up to compensate. */
  travelScale = 1,
): EffectDefinition {
  return {
    projectile: {
      durationMs: 420, // straight-line travel time A→B (data-editable)
      size: 13 * travelScale,
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
const ICICLE = basicBolt({ core: 0xeaffff, trail: 0x2aa0d8, impact: 0x8fe3ff, ember: 0xc4f0ff }, 'triangle', 1.5)
const SLUDGE = basicBolt({ core: 0xd7ffcf, trail: 0x2f9e4f, impact: 0x6bd88a, ember: 0xa8f0b8 })
// Time's Tik Tok — the shared bolt in grandfather-clock brown & beige.
const TIK_TOK = basicBolt({ core: 0xf0e2c0, trail: 0x5c4326, impact: 0xa9834e, ember: 0xd9c39a })
// Space's Shooting Star — the shared bolt in deep void-violet with starlight-cyan embers.
const SHOOTING_STAR = basicBolt({ core: 0xc9b8ff, trail: 0x3a1a8e, impact: 0x6a2fd0, ember: 0x3ad0ff })
// Love's Tough Love — the shared bolt drawn as a flying HEART in rose pink.
const TOUGH_LOVE = basicBolt({ core: 0xffd1e3, trail: 0xb8265c, impact: 0xff4d8d, ember: 0xff6fa8 }, 'heart', 1.5)

// Joker's Ace of Spades — the shared bolt drawn as a spade pip that flies
// tip-first, in Joker's circus red and white. Sized up like the other pictorial
// bolts so the pip reads at speed.
const ACE_OF_SPADES = basicBolt(
  { core: 0xf7f7f2, trail: 0x8a0f1a, impact: 0xe02434, ember: 0xff6b76 },
  'spade',
  1.5,
)

// Dark's Shadow Strike — the shared bolt as a white-rimmed shadow orb. Its
// projectile colour is deliberately WHITE: the shadow node bakes its own dark
// fill and pale rim, so the tint must be the identity or the rim goes dark too
// and the bolt disappears into the battlefield (see `makeShadowNode`).
const SHADOW_STRIKE = basicBolt({
  core: 0xffffff,
  trail: 0x2a2a3a,
  impact: 0x12121a,
  ember: 0xf7f7f2,
})

// Dark's Yin and Yang — the shared bolt drawn as the taijitu itself, so the
// symbol the caster chose against is the thing that flies at the victim. Like
// Shadow Strike its projectile colour is WHITE, because the node bakes its own
// black-and-white halves and a tint would flatten them to one colour. Sized up
// like the other pictorial bolts so the symbol reads at speed.
const YIN_AND_YANG = basicBolt(
  { core: 0xffffff, trail: 0x3a3a4a, impact: 0xf7f7f2, ember: 0xc9c9d4 },
  'yinYang',
  1.6,
)

/**
 * Dark's Shadow Strike WHILE Infinitum Tenebrae is up. The ultimate doesn't
 * just buff the numbers — it visibly changes what the basic attack is. This is
 * Water's Waterfall wave, the same churning body/interior/crest machinery, with
 * every colour swapped for Dark's: a torrent of shadow instead of water.
 *
 * Registered under its own id and selected at cast time (see BattlefieldFx),
 * so the plain Shadow Strike is untouched the moment the buff drops.
 */
const SHADOW_TORRENT: EffectDefinition = {
  wave: {
    gatherMs: 260,
    travelMs: 620,
    size: 48,
    bodyColor: 0x2a2a3a, // translucent shadow body (was blue)
    deepColor: 0x05050a, // near-black interior (was deep blue)
    foamColor: 0xf7f7f2, // white crest — Dark's only bright note
    blobs: 5,
    sprayRate: 80,
    easing: 'easeInOut',
  },
  impact: { durationMs: 380, size: 120, color: 0xf7f7f2, easing: 'easeOut' },
  particles: {
    count: 28,
    speed: [160, 440],
    spread: Math.PI,
    lifetimeMs: 560,
    size: 5,
    color: 0xc9c9d4,
    gravity: 380,
    fade: true,
  },
  shake: { magnitude: 5, durationMs: 240 },
}

/**
 * Dark's Unlimited Rage — Scorching Sun's solar laser inverted: the same
 * BeamSystem machinery, but a column of pure black edged in white, and it
 * holds far longer. Every point of punishment Dark has absorbed comes back at
 * once, so the beam is not a flash but a sustained outpouring.
 *
 * The core is the DARK part and the corona is white: on a dark battlefield a
 * black beam alone would be invisible, so the white edge is what draws it.
 */
const UNLIMITED_RAGE: EffectDefinition = {
  beam: {
    chargeMs: 900, // a long, menacing gather — the debt being called in
    fireMs: 1900, // held far longer than Scorching Sun's 320ms snap
    width: 18,
    color: 0x0b0b12,
    chargeSize: 52,
    easing: 'easeIn',
    coreColor: 0x000000, // pure black centre
    innerColor: 0x12121a, // near-black inner column
    plasmaColor: 0x3a3a4a, // charcoal plasma
    coronaColor: 0xf7f7f2, // the WHITE outline that makes it visible
    emberColor: 0xf7f7f2, // white motes peeling off it
  },
  impact: { durationMs: 700, size: 175, color: 0xf7f7f2, easing: 'easeOut' },
  particles: {
    count: 40,
    speed: [240, 660],
    spread: Math.PI,
    lifetimeMs: 780,
    size: 6,
    color: 0xf7f7f2,
    gravity: 300,
    fade: true,
  },
  shake: { magnitude: 15, durationMs: 900 },
}

/**
 * Light's Light Beam — an actual beam rather than a travelling bolt. It reuses
 * the solar-laser BeamSystem that Scorching Sun runs on, cut down to a basic
 * attack: a brief charge, a thin white-gold lance, and a small flash. Same
 * machinery, a fraction of the scale.
 */
const LIGHT_BEAM: EffectDefinition = {
  beam: {
    chargeMs: 180, // a quick wind-up, not Scorching Sun's dramatic hold
    fireMs: 260, // the lance snaps out and is gone
    width: 7, // the blinding CORE width; outer layers scale around it
    color: 0xfff6d5,
    chargeSize: 18,
    easing: 'easeIn',
    coreColor: 0xffffff, // white-hot centre
    innerColor: 0xfff6d5, // warm inner light
    plasmaColor: 0xffe9a8, // pale gold
    coronaColor: 0xf7f7f2, // near-white outer corona
    emberColor: 0xfff2c4, // motes peeling off the lance
  },
  impact: { durationMs: 260, size: 52, color: 0xfff6d5, easing: 'easeOut' },
  particles: {
    count: 16,
    speed: [160, 400],
    spread: Math.PI,
    lifetimeMs: 460,
    size: 4,
    color: 0xfff2c4,
    gravity: 220,
    fade: true,
  },
  shake: { magnitude: 4, durationMs: 160 },
}

/**
 * Light's Illumination — the heavy, and a genuine solar-class laser. Where
 * Light Beam is a thin lance, this is the same BeamSystem opened right up: a
 * long, dramatic charge, a wide multi-layer white-gold column, and a detonation
 * with a screen kick in Scorching Sun's league.
 *
 * It also lights up any Fireflies already on the target — the swarm flares and
 * whips into a frenzy (see BattlefieldFx). That synergy is the reason to cast
 * it second.
 */
const ILLUMINATION: EffectDefinition = {
  beam: {
    chargeMs: 420, // a real hold, like Scorching Sun's
    fireMs: 340,
    width: 15, // wide blinding core; the outer layers scale up around it
    color: 0xfff6d5,
    chargeSize: 44,
    easing: 'easeIn',
    coreColor: 0xffffff, // blinding white centre
    innerColor: 0xfffbe8, // brilliant near-white inner beam
    plasmaColor: 0xffe9a8, // pale gold plasma
    coronaColor: 0xffd98a, // warm gold corona
    emberColor: 0xfff2c4,
  },
  impact: { durationMs: 580, size: 158, color: 0xfff6d5, easing: 'easeOut' },
  particles: {
    count: 36,
    speed: [230, 640],
    spread: Math.PI,
    lifetimeMs: 660,
    size: 6,
    color: 0xfff2c4,
    gravity: 300,
    fade: true,
  },
  // The heavy kick the user asked for — a shade past Scorching Sun's.
  shake: { magnitude: 15, durationMs: 560 },
}

/**
 * Light's Fireflies — the swarm that settles over a kingdom and dances there
 * until the ransom is paid. Driven by the `fireflies` status rather than the
 * cast, because it outlives the cast by design (FirefliesSystem).
 *
 * `litColor` is what they burn while Illumination has them agitated.
 */
export const FIREFLIES_CONFIG: FirefliesConfig = {
  glowColor: 0xffe9a8, // warm resting amber
  litColor: 0xffffff, // blinding white once Illumination hits them
  radius: 74, // they range over the whole castle
  flySize: 7,
  intensity: 0.95,
}

// Time's Half Past 12 — the "temporal pulse" that lands on the victim: a fast
// faint strike, a massive expanding ring of distorted space (pale-blue), and a
// burst of golden/silver clock-and-gear fragments blown from the impact, with a
// heavy screen kick. The 12-second UI SCRAMBLE that follows is the victim-only
// ScrambleOverlay (driven by the `scrambled` status), not this cast effect.
const HALF_PAST_12: EffectDefinition = {
  projectile: {
    durationMs: 300,
    size: 11,
    color: 0xd9b25a,
    easing: 'easeIn',
    faceDirection: true,
  },
  impact: { durationMs: 560, size: 128, color: 0x9fd0ff, easing: 'easeOut' },
  particles: {
    count: 36,
    speed: [200, 580],
    spread: Math.PI, // full-circle fragment blast
    lifetimeMs: 820,
    size: 5,
    color: 0xd9b25a,
    gravity: 140,
    fade: true,
  },
  shake: { magnitude: 11, durationMs: 400 },
}

// Time's Father Time — the heavy strike that summons Father Time and marks the
// victim: a brilliant golden flash, a wide temporal shockwave, and an eruption
// of clock fragments, gear teeth, and falling sand. (The lingering per-second
// pressure is the victim-only FatherTimeOverlay, driven by the `fatherTimeMark`
// status — not this cast effect.)
const FATHER_TIME_STRIKE: EffectDefinition = {
  projectile: {
    durationMs: 340,
    size: 12,
    color: 0xf5e6b0,
    easing: 'easeIn',
    faceDirection: true,
  },
  impact: { durationMs: 620, size: 150, color: 0xf3d27a, easing: 'easeOut' },
  particles: {
    count: 44,
    speed: [160, 620],
    spread: Math.PI, // full-circle eruption of fragments + sand
    lifetimeMs: 900,
    size: 5,
    color: 0xd9b25a,
    gravity: 260, // fragments + sand fall away
    fade: true,
  },
  shake: { magnitude: 13, durationMs: 460 },
}

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
 * Saturn's Rings — Space's medium attack, a relentless celestial bombardment. A
 * scripted MULTI-HIT barrage: after a brief Saturn summon at the caster, nine
 * tilted, spinning rings break away one after another and slam into the target
 * ~100–200 ms apart — each shedding orbiting asteroids, cosmic dust, and stars,
 * then collapsing into a compact impact (gravitational shockwave + lensing halo +
 * dust + fragments + starlight + a kick), with a stellar-energy stream peeling
 * back to feed the Supernova. The final ring is dramatically larger and heavier.
 * Dark-purple palette; see `framework.playRingBarrage`.
 */
const SATURNS_RINGS_FX: EffectDefinition = {
  ringBarrage: {
    rings: 9, // nine distinct ring impacts (the multi-hit barrage)
    minGapMs: 100, // rapid-fire cadence: a ring every 100–200 ms
    maxGapMs: 200,
    size: 34, // base ring radius (varied per ring; final ring is far larger)
    ringColor: 0x9d6bff, // glowing violet ring band
    dustColor: 0x5b3aa6, // translucent cosmic dust
    asteroidColor: 0x7a5a9e, // rocky orbiting debris
    starColor: 0xe6d8ff, // sparkling embedded starlight
    glowColor: 0x3ad0ff, // nebula glow / gravitational lensing (starlight cyan)
    energyColor: 0x8be3ff, // stellar-energy stream feeding the Supernova
  },
}

/**
 * Supernova — Space's ultimate and signature ability. NOT a bolt of fire,
 * lightning, or magic: a star ignites at the caster, brightens while pulling in
 * dust/nebula/asteroids/starlight/plasma (visible lensing), then goes unstable
 * and detonates outward before immediately reversing into a collapse that
 * streams the wreckage onto the target, culminating in one devastating final
 * impact. Charge level (1–3) scales every phase bigger/brighter/heavier; a
 * successful gravitational redirect (level 2/3) turns the victim into a
 * singularity that bends every in-flight attack toward it. Driven directly by
 * `framework.playSupernova` from the `supernovaFired` event (needs the
 * server's charge level, which a plain ability-cast lookup doesn't carry) —
 * this entry only suppresses the generic fallback bolt on `abilityCast`.
 * See `framework.playSupernova` for the full phase breakdown.
 */
export const SUPERNOVA_CONFIG: SupernovaConfig = {
  chargeMs: 480,
  explosionMs: 460,
  collapseMs: 520,
  impactMs: 420,
  size: 70, // base explosion shell radius at level 1
  flashColor: 0xffffff, // blinding stellar-white
  goldColor: 0xffd76a, // golden stellar flame
  blueColor: 0x8fbaff, // blue stellar flame
  nebulaColor: 0x6a2fd6, // nebula cloud
  dustColor: 0x5b3aa6, // cosmic dust
  asteroidColor: 0x4a3a72, // rocky fragments
  starColor: 0xe6d8ff, // sparkling starlight
  lensColor: 0x3ad0ff, // gravitational lensing / space distortion
  plasmaColor: 0xb98bff, // stellar plasma
  wellColor: 0x9d6bff, // singularity ring / lensing (levels 2/3)
  wellRadius: 130, // base gravity-well radius at level 1
  wellStrength: 46, // base projectile-bending strength at the well's edge
}

/**
 * Black Hole — Space's other ultimate, one of the biggest and longest-running
 * effects in the game. Forms at the ARENA CENTER (not the caster) and grows
 * into a dominating, ever-rotating body — dark event horizon, layered
 * accretion disk, orbiting asteroid/meteor debris, drifting nebula, and heavy
 * gravitational lensing — that intercepts EVERY attack from EVERY kingdom for
 * its whole duration. On collapse it fires a colossal Judgment Beam at
 * whichever kingdom the server names as the last to feed it. Driven directly
 * by `framework.openBlackHole`/`pulseBlackHole`/`collapseBlackHole`/
 * `interceptIntoBlackHole` from the matching server events (needs exact
 * durations/positions a plain ability-cast lookup doesn't carry) — this entry
 * only suppresses the generic fallback bolt on the owner's own `abilityCast`.
 * See `framework`'s Black Hole module block for the full phase breakdown.
 */
export const BLACK_HOLE_CONFIG: BlackHoleConfig = {
  growMs: 900,
  radius: 250, // full event-horizon radius — dominates the arena center
  horizonColor: 0x05020c, // perfectly dark
  flashColor: 0xffffff, // blinding white-hot
  plasmaBlue: 0x6fb8ff,
  plasmaPurple: 0x9d4bff,
  plasmaOrange: 0xff9a4a,
  asteroidColor: 0x4a3a72,
  nebulaColor: 0x6a2fd6,
  lensColor: 0x3ad0ff,
  starColor: 0xe6d8ff,
  singularityHoldMs: 2600, // 2–3s crackling pause before the beam
  beamChargeMs: 500,
  beamFireMs: 5000, // the largest, longest beam in the game
  beamWidth: 60, // core width — outer corona spans ~4x this
}

/**
 * Orion's Belt — Space's utility (the interception half; the persistent
 * orbiting-asteroid ring is `OrionsBeltRing`, an SVG layer mirroring Earth's
 * Natural Terrain). Driven directly by `framework.deflectByOrionsBelt` from a
 * correlated `attackMissed` event in BattlefieldFx (needs the exact same-tick
 * miss, which a plain ability-cast lookup doesn't carry).
 */
export const ORIONS_BELT_CONFIG: OrionsBeltConfig = {
  interceptAt: 0.82, // "until the very last moment"
  deflectOffset: 46, // how far off-center the near-miss lands
  asteroidColor: 0x7a5a9e,
  glowColor: 0x3ad0ff, // gravitational ripple / lensing
  starColor: 0xe6d8ff,
  energyColor: 0x8be3ff, // stream back to the Supernova meter
  flashColor: 0xffffff,
}

/**
 * Cupid's Arrow — Love's medium attack. Charming on the surface, unsettling
 * underneath: a crystal-and-blossom bow gathers at the caster, then looses an
 * arrow that weaves gracefully to the target trailing ribbons/hearts/petals,
 * dissolving into a heart sigil on impact. Registered through the normal
 * `playAbility` dispatch (`def.cupidsArrow`) like Saturn's Rings — the two
 * follow-on beats (citizen spirits, shared-pain ribbon) are driven separately
 * from `resourceTransfer`/`damage` events in BattlefieldFx, since they aren't
 * part of the cast itself. See `framework.playCupidsArrow`.
 */
export const CUPIDS_ARROW_CONFIG: CupidsArrowConfig = {
  bowGatherMs: 420,
  arrowSegments: 4,
  arrowDurationMs: 480,
  weaveAmplitude: 34,
  spiritDurationMs: 700,
  goldColor: 0xe8c66a,
  crystalColor: 0xff8fc0,
  ribbonColor: 0xff4d8d,
  heartColor: 0xff6fa8,
  petalColor: 0xffd1e3,
  dustColor: 0xfff0f6,
  sigilColor: 0xffffff,
  spiritColor: 0xffe27a,
}
const CUPIDS_ARROW_FX: EffectDefinition = { cupidsArrow: CUPIDS_ARROW_CONFIG }

/**
 * BFFS!!! — Love's heavy attack. Two heart pendants fly to BOTH selected
 * kingdoms and a ribbon of friendship snaps between them. Driven directly by
 * `framework.playBffs` from the `abilityCast` event (needs BOTH targetIds,
 * which the normal single-`to` playAbility dispatch can't express); the
 * persistent link ribbon is the `BffsLinkLayer` SVG overlay. See
 * `framework.playBffs`.
 */
export const BFFS_CONFIG: BffsConfig = {
  gatherMs: 380,
  pendantDurationMs: 560,
  ribbonColor: 0xff4d8d,
  goldColor: 0xe8c66a,
  heartColor: 0xff6fa8,
  petalColor: 0xffd1e3,
  dustColor: 0xfff0f6,
  emblemColor: 0xffb3cf,
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
// ---------------------------------------------------------------------------
// Kitsune — foxfire. Everything Kitsune throws burns COLD: a white-blue core
// over deep sapphire, and every landing spreads outward in rings rather than
// popping in place, like fire running across the ground.
// ---------------------------------------------------------------------------

/** Kitsune's foxfire hues, shared by both attacks so the kit reads as one kingdom. */
const FOXFIRE = {
  /** White-hot blue centre. */
  core: 0xdff0ff,
  /** Deep sapphire body (the kingdom colour). */
  deep: 0x0f52ba,
  /** Bright cyan-blue flame. */
  flame: 0x4aa8ff,
  /** Pale ember sparks. */
  ember: 0x9fd4ff,
}

/**
 * Fox Swipe: the standard basic bolt, but instead of one flat shockwave the
 * landing throws a RING OF BLUE FIRE that spreads outward — three rings
 * chasing each other out from the point of impact.
 */
const FOX_SWIPE: EffectDefinition = {
  ...basicBolt({
    core: FOXFIRE.core,
    trail: FOXFIRE.deep,
    impact: FOXFIRE.flame,
    ember: FOXFIRE.ember,
  }),
  // Tight core flash; the spread is the rings below, not this.
  impact: { durationMs: 260, size: 46, color: FOXFIRE.core, easing: 'easeOut', startScale: 0.4 },
  impactRings: {
    count: 3,
    durationMs: 420,
    size: 78,
    sizeStep: 40,
    staggerMs: 70,
    color: FOXFIRE.flame,
    startScale: 0.2,
  },
  particles: {
    count: 26,
    speed: [200, 500],
    spread: Math.PI,
    lifetimeMs: 600,
    size: 5,
    color: FOXFIRE.ember,
    gravity: -40, // foxfire drifts up rather than falling
    fade: true,
  },
  shake: { magnitude: 6, durationMs: 200 },
}

/**
 * Fox Fire: a wisp that does NOT fly straight. It corkscrews the whole way to
 * the target, tightening as it closes, and then blows out into a conflagration.
 *
 * Where Fox Swipe lands as RINGS, this lands as FIRE — a spray of tapered
 * tongues hurled outward at uneven angles and reaches, over a white-hot core
 * flash. Rings are legible but they are unmistakably circles, and this is the
 * ability that sets its victim alight; it has to look like it.
 *
 * And it does not end when the explosion does. Pockets of blue fire are left
 * scattered around the kingdom, catching on a stagger and guttering out one by
 * one over the next few seconds — the ground is still burning long after the
 * hit, which is exactly what Fox Fire's lingering stack is.
 */
const FOX_FIRE: EffectDefinition = {
  projectile: {
    durationMs: 720, // slower than a basic: the spiral needs room to be seen
    size: 15,
    color: FOXFIRE.core,
    easing: 'linear',
    faceDirection: true,
    spiral: { turns: 3, radius: 86, envelope: 'taper' },
  },
  // Emitted often enough that the corkscrew is drawn out as a visible helix of
  // flame behind the wisp.
  trail: {
    emitEveryMs: 12,
    particles: {
      count: 5,
      speed: [10, 60],
      spread: Math.PI,
      lifetimeMs: 420,
      size: 7,
      color: FOXFIRE.deep,
      gravity: -70,
      fade: true,
    },
  },
  // The white-hot heart of the blast. Everything outward from here is flame.
  impact: { durationMs: 300, size: 78, color: FOXFIRE.core, easing: 'easeOut', startScale: 0.3 },
  flameBurst: {
    tongues: 18,
    reach: 132,
    tongueSize: 46,
    durationMs: 620,
    color: FOXFIRE.flame,
    coreColor: FOXFIRE.core,
    // Left burning around the castle after the blast.
    pockets: 11,
    pocketRadius: 168,
    pocketMs: 3400,
    pocketSize: 30,
  },
  particles: {
    count: 46,
    speed: [260, 700],
    spread: Math.PI,
    lifetimeMs: 820,
    size: 7,
    color: FOXFIRE.ember,
    gravity: -60,
    fade: true,
  },
  shake: { magnitude: 11, durationMs: 380 },
}

/**
 * Old Friends: four foxes break from the Kitsune castle and RUN the field
 * together, bounding, weaving, and shedding foxfire from their paws. They cross
 * as a pack rather than a volley - staggered starts, their own lanes, their own
 * strides - and pile onto the castle in one burst when the last one gets there.
 *
 * Deliberately slower than anything else Kitsune throws: these are animals
 * covering ground, and the approach is the point. It is also the ability that
 * settles in and stays, so the table should have time to watch it coming.
 */
const OLD_FRIENDS: EffectDefinition = {
  foxPack: {
    count: 4,
    durationMs: 1150, // a run across the field, not a shot
    size: 17,
    color: FOXFIRE.core,
    trailColor: FOXFIRE.deep,
    spread: 34, // formation half-width
    staggerMs: 90,
    durationJitter: 0.14,
    bounce: 10,
    gaitRate: 5.5,
    weave: 26,
  },
  // The pack landing: a low scatter of foxfire rather than a detonation - they
  // are arriving to stay, not exploding.
  impact: { durationMs: 340, size: 70, color: FOXFIRE.flame, easing: 'easeOut', startScale: 0.35 },
  impactRings: {
    count: 2,
    durationMs: 460,
    size: 96,
    sizeStep: 46,
    staggerMs: 90,
    color: FOXFIRE.deep,
    startScale: 0.25,
  },
  particles: {
    count: 30,
    speed: [140, 380],
    spread: Math.PI,
    lifetimeMs: 700,
    size: 5,
    color: FOXFIRE.ember,
    gravity: -40,
    fade: true,
  },
  shake: { magnitude: 7, durationMs: 260 },
}

/**
 * Kitsune Rush: the ring of foxes that laps the caster's own castle for the
 * fifteen seconds the Rush runs. Fast and tight - the ability is "everything
 * happens at double speed", so the ring has to look like it is sprinting.
 */
export const KITSUNE_RUSH_ORBIT: FoxOrbitConfig = {
  count: 5,
  radius: 88,
  lapsPerSecond: 0.55,
  size: 15,
  color: FOXFIRE.core,
  moteColor: FOXFIRE.flame,
  flatten: 0.5, // squashed, so they read as running AROUND the castle
  bounce: 7,
  gaitRate: 7, // a faster stride than the pack's - these are at a sprint
}

// ---------------------------------------------------------------------------
// Magma — molten rock. Where Fire is bright and fast, Magma is heavy and hot:
// everything it throws has weight, falls, and leaves the ground burning.
// ---------------------------------------------------------------------------

/** Magma's hues, shared across the kit so it reads as one kingdom. */
const MOLTEN = {
  /** White-hot centre — hotter than anything in Fire's palette. */
  core: 0xfff1c4,
  /** Running lava. */
  lava: 0xff5a1a,
  /** Cooling crust / deep body. */
  crust: 0x8f1d05,
  /** Airborne embers. */
  ember: 0xffa733,
  /** Volcanic smoke and ash. */
  smoke: 0x4a3a34,
}

/**
 * Lava Punch: the standard bolt, but it burns hotter than Fire's does.
 *
 * Fireball trails a comet tail of embers that rise and thin out. This does the
 * opposite — a heavy, slower core dragging a thick trail of molten spatter that
 * FALLS, plus a second layer of lifting embers over the top. The falling
 * particles are what separate the two: Fire floats, magma drips.
 */
const LAVA_PUNCH: EffectDefinition = {
  ...basicBolt({
    core: MOLTEN.core,
    trail: MOLTEN.lava,
    impact: MOLTEN.lava,
    ember: MOLTEN.ember,
  }),
  projectile: {
    durationMs: 470, // heavier than a Fireball, so it travels slower
    size: 15,
    color: MOLTEN.core,
    easing: 'linear',
    faceDirection: true,
  },
  // Twice Fireball's emission rate and much denser: a thick, continuous smear
  // of molten rock rather than a few puffs.
  trail: {
    emitEveryMs: 9,
    particles: {
      count: 6,
      speed: [15, 90],
      spread: Math.PI,
      lifetimeMs: 520,
      size: 7,
      color: MOLTEN.lava,
      // Positive gravity: the trail DRIPS. Fireball's rises (-70), which is the
      // single clearest difference between the two in flight.
      gravity: 240,
      fade: true,
    },
  },
  impact: { durationMs: 340, size: 74, color: MOLTEN.core, easing: 'easeOut', startScale: 0.35 },
  impactRings: {
    count: 2,
    durationMs: 420,
    size: 82,
    sizeStep: 40,
    staggerMs: 70,
    color: MOLTEN.lava,
    startScale: 0.25,
  },
  particles: {
    count: 28,
    speed: [180, 500],
    spread: Math.PI,
    lifetimeMs: 720,
    size: 6,
    color: MOLTEN.ember,
    gravity: 380, // molten spatter falls back to the ground
    fade: true,
  },
  shake: { magnitude: 7, durationMs: 240 },
}

/**
 * Eruption: the ground shakes for two full seconds, the mountain opens, and
 * lava is thrown over the field in an arc onto the victim.
 *
 * The long buildup is the ability. A heavy hit that simply appears is a basic
 * attack with bigger numbers; the rumble tells the table what is coming and
 * where from, and the arc says who it is coming for, well before it lands.
 */
const ERUPTION_FX: EffectDefinition = {
  eruption: {
    buildupMs: 2000, // "a few seconds" of shaking before anything is thrown
    shake: 18,
    gobs: 5,
    gobStaggerMs: 130,
    travelMs: 900, // slow, so the arc is legible the whole way over
    arc: 190, // thrown well up over the field
    gobSize: 17,
    ventY: -46, // the mouth of the mountain, above the castle
    coreColor: MOLTEN.core,
    lavaColor: MOLTEN.lava,
    emberColor: MOLTEN.ember,
    smokeColor: MOLTEN.smoke,
  },
}

/**
 * Floor is Lava: molten ground wells out of the Magma castle and creeps
 * outward until it has swallowed every kingdom on the field, then cools and
 * fades where it lies.
 *
 * The radius covers the arena from any seat: the castles sit on a circle of
 * radius 340 about the centre, so a flood starting on one of them needs ~680 to
 * reach the far side, and 780 to be past it with the ragged edge to spare.
 */
/**
 * The volcano's two endings (Magma's "The End of the World"). Reuses Eruption's
 * palette and shake scale as its base, so the ultimate reads as the same
 * mountain the medium attack throws from — just on a scale that ends matches.
 */
export const VOLCANO_BLAST: EruptionConfig = {
  buildupMs: 0, // the server's clock WAS the buildup; this is the moment itself
  shake: 30,
  gobs: 0,
  gobStaggerMs: 0,
  travelMs: 0,
  arc: 0,
  gobSize: 0,
  ventY: 0,
  coreColor: MOLTEN.core,
  lavaColor: MOLTEN.lava,
  emberColor: MOLTEN.ember,
  smokeColor: MOLTEN.smoke,
}

export const LAVA_FLOOR_CONFIG: LavaFloorConfig = {
  spreadMs: 3600, // "a few seconds" to cover the battlefield
  fadeMs: 2600, // and a slow cool-down at the end
  radius: 780,
  samples: 34,
  // Now that the outline is harmonics drawn as curves rather than independent
  // randoms drawn as line segments, a SMALLER roughness reads as bigger, softer
  // lobes — the old 0.3 was mostly producing spikes, not shape. More samples
  // because they are curve control points now, and cheap.
  roughness: 0.22,
  fillColor: MOLTEN.crust,
  rimColor: MOLTEN.lava,
  emberColor: MOLTEN.ember,
  opacity: 0.72,
}

// ---------------------------------------------------------------------------
// Insects — chitin and venom. Nothing here is a single big hit: the kingdom
// works by putting THINGS on you and letting them work.
// ---------------------------------------------------------------------------

/** Insects' hues, shared across the kit so it reads as one kingdom. */
const CHITIN = {
  /** Pale wing-membrane highlight. */
  core: 0xe8f59a,
  /** Acid chartreuse — the kingdom colour. */
  acid: 0xa8c020,
  /** Deep carapace. */
  shell: 0x3c4708,
  /** Venom droplets. */
  venom: 0xc8e83a,
}

/** Venom Shot: the standard bolt, in Insects' acid green. */
const VENOM_SHOT_FX = basicBolt({
  core: CHITIN.core,
  trail: CHITIN.acid,
  impact: CHITIN.venom,
  ember: CHITIN.acid,
})

/**
 * Butterflies: a swarm that settles around the target castle and stays there
 * for the whole twenty seconds the debuff runs.
 *
 * Reuses the orbit system Kitsune Rush runs on, with three differences that
 * matter: they are upright (a butterfly has no "forward" — pointing one along
 * its path makes it look like a paper aeroplane), they drift rather than
 * sprint, and there are a lot more of them.
 */
export const BUTTERFLY_SWARM: FoxOrbitConfig = {
  count: 11,
  radius: 104,
  lapsPerSecond: 0.16, // a drift, not a lap
  size: 17,
  shape: 'butterfly',
  upright: true,
  color: CHITIN.acid,
  moteColor: CHITIN.core, // pollen shed as they go
  flatten: 0.62,
  bounce: 14, // they bob rather than bound
  gaitRate: 2.2,
}

/**
 * Infected: an army of insects swarms the target, and the damage lands when
 * they get there.
 *
 * The same pack primitive Old Friends uses — this is exactly "a group of
 * things that runs to the target" — but a swarm rather than a pack: many more,
 * smaller, faster, and much tighter together, so it reads as a wave of bodies
 * rather than as individuals.
 */
const INFECTED_FX: EffectDefinition = {
  foxPack: {
    count: 14,
    shape: 'insect',
    durationMs: 780,
    size: 13,
    color: CHITIN.shell,
    trailColor: CHITIN.acid,
    spread: 68, // a broad front
    staggerMs: 26, // almost together — a swarm, not a queue
    durationJitter: 0.18,
    bounce: 5, // a low scuttle
    gaitRate: 11, // fast little legs
    weave: 20,
  },
  impact: { durationMs: 320, size: 88, color: CHITIN.venom, easing: 'easeOut', startScale: 0.3 },
  impactRings: {
    count: 2,
    durationMs: 420,
    size: 96,
    sizeStep: 44,
    staggerMs: 80,
    color: CHITIN.acid,
    startScale: 0.25,
  },
  particles: {
    count: 34,
    speed: [160, 480],
    spread: Math.PI,
    lifetimeMs: 700,
    size: 5,
    color: CHITIN.acid,
    gravity: 220,
    fade: true,
  },
  shake: { magnitude: 9, durationMs: 300 },
}

export const ABILITY_EFFECTS: Record<string, EffectDefinition> = {
  // Basic attacks — one shared bolt, kingdom-coloured.
  fireball: FIREBALL,
  waterBall: WATER_BALL,
  aLightBreeze: A_LIGHT_BREEZE,
  tikTok: TIK_TOK,
  shootingStar: SHOOTING_STAR,
  halfPassed12: HALF_PAST_12,
  fatherTime: FATHER_TIME_STRIKE,
  rockThrow: ROCK_THROW,
  zap: ZAP,
  icicle: ICICLE,
  sludge: SLUDGE,
  foxSwipe: FOX_SWIPE,
  // Insects.
  venomShot: VENOM_SHOT_FX,
  infected: INFECTED_FX,
  // Butterflies' swarm is driven by the STATUS (see BattlefieldFx), so it
  // lasts exactly as long as the debuff. The cast itself just lands the hit.
  butterflies: {
    impact: { durationMs: 320, size: 76, color: CHITIN.venom, easing: 'easeOut', startScale: 0.35 },
    particles: {
      count: 26,
      speed: [140, 420],
      spread: Math.PI,
      lifetimeMs: 720,
      size: 5,
      color: CHITIN.core,
      gravity: -50,
      fade: true,
    },
    shake: { magnitude: 6, durationMs: 220 },
  },
  // Creepy Crawlers and Caprice are presented as DOM overlays on the victim's
  // own screen, so no battlefield bolt should be thrown at anyone.
  creepyCrawlers: {},
  caprice: {},
  // Magma.
  lavaPunch: LAVA_PUNCH,
  eruption: ERUPTION_FX,
  // Floor is Lava is a FIELD, driven by its own duration (see BattlefieldFx),
  // and Smoke Screen / the volcano are handled elsewhere — empty entries keep
  // the generic fallback bolt from being flung at everyone.
  floorIsLava: {},
  // Kitsune specials.
  foxFire: FOX_FIRE,
  oldFriends: OLD_FRIENDS,
  // A self-buff: the ring of foxes is driven by the `kitsuneRush` STATUS (see
  // BattlefieldFx), so the cast itself must throw nothing at anybody.
  kitsuneRush: {},
  azureGuidance: {},
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
  // Space specials.
  saturnsRings: SATURNS_RINGS_FX,
  // Supernova's whole visual is the orchestrated star→explosion→collapse→
  // singularity sequence (framework.playSupernova, driven from the
  // 'supernovaFired' event in BattlefieldFx, which alone carries the charge
  // level); empty suppresses the generic fallback projectile on abilityCast.
  supernova: {},
  // Black Hole's whole visual is driven directly from its own server events
  // (blackHoleOpened/Absorbed/Collapsed) in BattlefieldFx; empty suppresses
  // the generic fallback projectile on the owner's own abilityCast.
  blackHole: {},
  // Love specials.
  toughLove: TOUGH_LOVE,
  // Blackjack's whole visual is the casino card reveal (BlackjackReveal, an
  // overlay driven by the `cardDrawn` event) — empty suppresses the generic
  // fallback projectile so no bolt flies alongside the cinematic.
  blackjack: {},
  // Lucky Draw is the five-card selection overlay (LuckyDrawOverlay); it is a
  // self-cast with nothing to throw, so suppress the fallback too.
  luckyDraw: {},
  // Light / Joker / Dark basics.
  lightBeam: LIGHT_BEAM,
  illumination: ILLUMINATION,
  // Fireflies is a persistent swarm driven by the `fireflies` status
  // (FirefliesSystem), not a projectile — suppress the generic fallback bolt.
  fireflies: {},
  // Flash Bang has no projectile and no impact: it is a blinding pop felt on
  // every screen at once (FlashBangOverlay, driven by the cast event). Empty
  // suppresses the generic bolt the caster would otherwise fling at itself.
  flashBang: {},
  // Light Show's whole visual is the arena-space warning + volley
  // (LightShowLayer, driven by the `strikeIncoming` event). Empty suppresses
  // the fallback projectile on the self-targeted cast.
  lightShow: {},
  aceOfSpades: ACE_OF_SPADES,
  shadowStrike: SHADOW_STRIKE,
  yinAndYang: YIN_AND_YANG,
  // Not a server ability id: the empowered Shadow Strike, played in place of
  // the plain one while Infinitum Tenebrae is up.
  shadowStrikeEmpowered: SHADOW_TORRENT,
  unlimitedRage: UNLIMITED_RAGE,
  cupidsArrow: CUPIDS_ARROW_FX,
  // BFFS!!!'s cast (twin pendants → ribbon snap) is driven directly from the
  // abilityCast event in BattlefieldFx (needs BOTH targetIds); empty suppresses
  // the generic fallback projectile. The persistent link ribbon is BffsLinkLayer.
  bffs: {},
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
/**
 * Fire's Ignited (Scorching Sun). A castle SMOULDERING — not burning.
 *
 * Deliberately not the solar flames Scorching Sun's detonation throws. Two
 * reasons, and they point the same way:
 *
 *  • Meaning. Ignited is a threat, not a fire. If a marked castle looked the
 *    same as a burning one, the whole ability collapses — the tension is
 *    "something might catch", and you cannot feel that while watching flames.
 *  • Cost. This holds for a full MINUTE on potentially every enemy at once.
 *    Solar Burn emits 110 particles/second for a five-second window; running
 *    that for sixty seconds on four castles would be thousands in flight.
 *
 * So: a thin curl of smoke and the odd rising ember, at roughly a tenth the
 * rate. Unmistakable if you look, and quiet enough to live with.
 */
const IGNITED_AURA: AuraDefinition = {
  emitters: [
    {
      // A thin, dark curl coming off the walls.
      rate: 7,
      color: 0x6b5a4a,
      size: [10, 18],
      lifetimeMs: 1500,
      riseSpeed: [40, 80],
      drift: 16,
      originY: 12,
      spawnWidth: 96,
      growth: 1.7,
      sway: 10,
      fade: true,
    },
    {
      // The occasional ember — the reminder that this could still go up.
      rate: 4,
      color: 0xff9a3c,
      size: [2, 4],
      lifetimeMs: 1200,
      riseSpeed: [90, 170],
      drift: 22,
      originY: 6,
      spawnWidth: 80,
      glow: true,
      growth: 0.4,
      fade: true,
    },
  ],
}

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
  // Fire's Ignited (Scorching Sun): a castle smouldering for the whole minute
  // the mark holds. The victim has to be able to SEE they are lit — the entire
  // ability is not knowing when it will catch — but it must not look like an
  // actual fire, or that tension is gone. Driven by the status, so it starts
  // and stops exactly with the mark.
  ignited: IGNITED_AURA,
  misting: MISTING_AURA,
  // Cast-driven (not a status): Scorching Sun's bright solar-flame Burn.
  solarBurn: SOLAR_BURN_AURA,
}
