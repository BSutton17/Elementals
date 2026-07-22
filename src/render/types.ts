// Core animation framework (Epic 9, ticket #210) — shared types.
//
// The framework is a REUSABLE renderer with no gameplay logic and no
// kingdom-specific code. Effects are described by data (the *Config types
// below) and resolved from an id-keyed registry, so every current and future
// kingdom is supported without touching this code. Gameplay stays entirely
// server-authoritative; this layer only visualizes.

export interface Vec2 {
  x: number
  y: number
}

/**
 * The minimal display-object contract the animation systems drive. PixiJS
 * `Container`/`Graphics`/`Sprite` satisfy it structurally, so production nodes
 * are real Pixi objects — but tests can supply plain fakes, which keeps every
 * system's motion logic verifiable without a WebGL context.
 */
export interface DisplayNode {
  x: number
  y: number
  alpha: number
  rotation: number
  visible: boolean
  tint: number
  scale: { x: number; y: number; set(x: number, y?: number): void }
  destroy(): void
}

export type EasingName =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'easeOutCubic'
  | 'easeOutBack'

/** A colour token resolved against the source kingdom's elemental theme, so
 *  effect definitions can share the common palette instead of hardcoding hues. */
export type ThemeToken = 'primary' | 'secondary' | 'dark'

/** Projectile sprite silhouette — a round blob (default) or a sharp spike
 *  (Ice's Icicle). Selects which pooled node factory the system draws from. */
export type ProjectileShape = 'circle' | 'triangle'

/**
 * A projectile that travels in a STRAIGHT LINE from A to B over `durationMs`
 * (data-editable). Colour and size are visual only.
 */
export interface ProjectileConfig {
  /** Straight-line travel time A→B, in milliseconds. */
  durationMs: number
  /** Radius in world units (1000×1000 arena space, matching placement.ts). */
  size: number
  /** 0xRRGGBB tint applied to the unit sprite. */
  color: number
  easing?: EasingName
  /** Rotate the sprite to face its travel direction. */
  faceDirection?: boolean
  /** Spin rate in radians/sec (used when not facing direction). */
  spin?: number
  /** Sprite silhouette (default 'circle'). 'triangle' draws a sharp spike whose
   *  tip leads along the travel direction — Ice's Icicle. */
  shape?: ProjectileShape
}

/** A one-shot burst at a point: grows from small to `size` while fading out. */
export interface ImpactConfig {
  durationMs: number
  /** Peak radius in world units. */
  size: number
  color: number
  easing?: EasingName
  /** Start scale as a fraction of peak (default 0.2). */
  startScale?: number
}

/** A burst of pooled particles thrown from a point. */
export interface ParticleBurstConfig {
  count: number
  /** Speed in world units/sec: a single value or a [min, max] range. */
  speed: number | [number, number]
  /** Emission cone half-angle in radians (Math.PI = full circle). */
  spread: number
  /** Base emission direction in radians (0 = +x). Default: full circle. */
  direction?: number
  lifetimeMs: number
  /** Particle radius in world units. */
  size: number
  color: number
  /** Downward acceleration in world units/sec² (default 0). */
  gravity?: number
  /** Fade alpha to 0 over the lifetime (default true). */
  fade?: boolean
}

/**
 * A stream of particles emitted along a projectile's flight path, giving it a
 * comet-like trail (e.g. a fireball's flaming tail). The framework emits one
 * `particles` puff at the projectile's current position every `emitEveryMs`
 * while it travels. Purely visual — has no effect without a `projectile`.
 */
export interface TrailConfig {
  particles: ParticleBurstConfig
  /** Milliseconds between puffs along the path (default 24). */
  emitEveryMs?: number
}

/**
 * A charge-then-fire beam (e.g. Scorching Sun's laser). A glow builds at the
 * SOURCE for `chargeMs`, then a straight beam snaps out to the target and holds
 * for `fireMs` while fading. The burst (impact/particles/shake) fires at the
 * moment the beam does, not at cast time. Purely visual.
 */
export interface BeamConfig {
  /** Charge-up time before the beam fires, in ms (the glow builds over this). */
  chargeMs: number
  /** How long the beam stays after firing before it's gone, in ms. */
  fireMs: number
  /** Beam thickness in world units (the bright CORE width; outer layers scale up). */
  width: number
  color: number
  /** Radius the charge glow builds to, in world units (default width × 2). */
  chargeSize?: number
  /** Easing for the charge build-up (default 'easeIn'). */
  easing?: EasingName
  // --- Solar-laser layering (Scorching Sun). When present, the beam renders as
  // stacked additive layers (corona → plasma → inner → core) with an animated
  // charge orb, converging sparks, along-beam plasma/embers, and a detonation.
  // All optional; each falls back to `color` so a plain beam still works. ---
  /** Blinding white-hot central-core colour. */
  coreColor?: number
  /** Bright inner-beam colour (yellow). */
  innerColor?: number
  /** Surrounding plasma colour (orange/gold). */
  plasmaColor?: number
  /** Outer solar-corona colour. */
  coronaColor?: number
  /** Peeling ember / spark / ash colour. */
  emberColor?: number
}

/**
 * A traveling wave of water (Waterfall, and future tidal/tsunami abilities).
 * Rendered as LAYERED procedural animation, not a moving sprite: water gathers
 * at the caster (anticipation), then a churning mass — translucent body, darker
 * interior, a foam crest that wobbles — travels A→B on a non-linear ease
 * (accelerate out, decelerate into impact), continuously shedding spray, mist,
 * and bubbles, before collapsing into a directional splash at the target (the
 * splash proper is the EffectDefinition's impact/particles/shake). Reusable
 * across water abilities via scale + palette. Purely visual.
 */
export interface WaveConfig {
  /** Anticipation: water gathers/swirls at the caster before launch, in ms. */
  gatherMs: number
  /** Travel time A→B, in ms. */
  travelMs: number
  /** Overall wave radius in world units. */
  size: number
  /** Translucent water-body colour. */
  bodyColor: number
  /** Darker interior/undershadow colour. */
  deepColor: number
  /** Bright foam/highlight colour (rendered additive). */
  foamColor: number
  /** Body blobs forming the churning mass (default 5). */
  blobs?: number
  /** Spray/mist/bubbles emitted per second while traveling (default 70). */
  sprayRate?: number
  /** Travel easing — default 'easeInOut' for a weighty accelerate/decelerate. */
  easing?: EasingName
}

/**
 * A spinning vortex parked ON a point (e.g. Firenado / Hurricane). Rendered as
 * layered procedural animation — a soft outer glow, a bright pulsing core
 * "eye", several spiral bands with differential rotation + per-band turbulence,
 * and a stream of embers that orbit and spiral upward — so it reads as churning
 * energy, not rotating geometry. Reusable across kingdoms: only the palette
 * changes (fire vs air). Purely visual.
 */
export interface VortexConfig {
  /** How long the vortex spins on the target, in ms. */
  durationMs: number
  /** Overall radius of the vortex, in world units. */
  size: number
  /** Spiral bands / smoke colour. */
  color: number
  /** Bright core "eye" colour (default: `color`). */
  coreColor?: number
  /** Glowing ember colour (default: `coreColor` ?? `color`). */
  emberColor?: number
  /** Base rotation speed in radians/sec (inner bands spin faster). */
  spin: number
  /** Number of spiral bands (default 6). */
  arms?: number
  /** Embers emitted per second over the vortex's life (default 55). */
  emberRate?: number
}

/**
 * A continuously-emitting particle stream for a PERSISTENT status aura (e.g.
 * Heat Wave's chimney smoke, Blazing Determination's flames). Unlike a
 * ParticleBurst (one-shot), an aura emits at `rate` for as long as the status
 * is active, then stops (existing particles finish). Purely visual.
 */
export interface AuraEmitterConfig {
  /** Particles emitted per second while the aura is active. */
  rate: number
  color: number
  /** Particle radius in world units (single value or [min, max]). */
  size: number | [number, number]
  lifetimeMs: number
  /** Upward speed in world units/sec (particles rise; y decreases). */
  riseSpeed: number | [number, number]
  /** Horizontal velocity spread in world units/sec. */
  drift?: number
  /** Vertical offset of the emission origin from the anchor (negative = above,
   *  e.g. the castle's chimney top). */
  originY?: number
  /** Horizontal spread of spawn positions in world units. */
  spawnWidth?: number
  /** Additive blending (flames/embers glow) vs normal (smoke). */
  glow?: boolean
  /** Scale multiplier reached at end of life (>1 grows like smoke, <1 shrinks). */
  growth?: number
  /** Horizontal sway amplitude in world units (drifting smoke). */
  sway?: number
  /** Fade alpha to 0 over lifetime (default true). */
  fade?: boolean
}

/**
 * A persistent status aura, keyed by status id. Started on `statusApplied` and
 * stopped on `statusExpired`. One or more emitter layers (e.g. flames + embers)
 * plus an optional one-shot shake when it begins.
 */
export interface AuraDefinition {
  emitters: AuraEmitterConfig[]
  /** A one-shot camera shake fired when the aura starts (e.g. on cast). */
  shakeOnStart?: CameraShakeConfig
  /** Render behind the castles (e.g. flames engulfing a castle) instead of in
   *  front. Routed to a separate canvas beneath the SVG battlefield. */
  behind?: boolean
}

/**
 * A procedural lightning strike (Electricity's Zap; reusable by stronger
 * Electricity abilities). The bolt is generated fresh every frame by recursive
 * midpoint displacement so no two strikes — or even two frames — repeat, and it
 * flickers over a very short life. Layered: a wide additive `glow` bloom under a
 * thin bright `core`, with short unstable branches. Colours are explicit (two
 * hues: core + glow), so `tintFrom` does NOT recolour it. Purely visual.
 */
export interface LightningConfig {
  /** Total on-screen lifetime, ms (very short — ~60–120). */
  durationMs: number
  /** Bright core colour (yellow-white). */
  coreColor: number
  /** Blooming glow colour (purple), drawn wider + additive under the core. */
  glowColor: number
  /** Core stroke width in world units. */
  coreWidth: number
  /** Glow stroke width in world units (wider than the core). */
  glowWidth: number
  /** Max lateral kink as a fraction of a segment's length (jaggedness). */
  jaggedness: number
  /** Recursive midpoint subdivisions (more = finer chaos). */
  subdivisions: number
  /** Probability [0..1] each interior node spawns a short branch. */
  branchChance: number
  /** Short crackling arcs spawned at the impact point (default 0). */
  impactArcs?: number
}

/**
 * A charge-scaled lightning barrage (Electricity's Lightning Barrage). One
 * scripted sequence whose intensity scales AUTOMATICALLY with the number of
 * charges spent (1–3) — bolt count, branch density, glow/core width, spark
 * count, impact size, corona, and screen shake all ramp from these colours plus
 * per-charge multipliers in the framework, so there's no per-charge duplication.
 * Reuses the same procedural LightningSystem and Zap's purple/yellow palette.
 */
export interface LightningBarrageConfig {
  /** Bright core colour (yellow-white). */
  coreColor: number
  /** Glow bloom colour (purple). */
  glowColor: number
  /** Impact flash / shockwave ring colour. */
  flashColor: number
  /** Airborne spark colour. */
  sparkColor: number
}

/**
 * A meteor bombardment (Earth's Meteor Shower). A scripted MULTI-HIT barrage:
 * many glowing meteors fall from high above the target, staggered over the
 * window so each impact registers distinctly, and each collides with its own
 * explosion (shockwave ring + rock debris + molten fragments + rolling dust +
 * pebbles + a screen kick). Meteors vary in size/speed/trajectory so it reads as
 * a natural shower. Reusable by future Earth/impact abilities. Purely visual.
 */
export interface MeteorShowerConfig {
  /** How many meteors fall (each produces its own impact). */
  meteors: number
  /** Total window the meteors are staggered across, in ms. */
  durationMs: number
  /** Height above the target the meteors start from, in world units. */
  fallHeight: number
  /** Horizontal spread of impacts around the target, in world units. */
  spread: number
  /** Base meteor radius in world units (varied per meteor). */
  size: number
  /** Molten glowing-core colour. */
  coreColor: number
  /** Dark rocky-exterior / debris colour. */
  rockColor: number
  /** Blazing orange-red trail colour. */
  trailColor: number
  /** Molten-ember colour. */
  emberColor: number
  /** Rolling dust-cloud colour. */
  dustColor: number
}

/**
 * A tectonic rupture (Earth's Earthquake). A heavy primary quake at the target —
 * branching glowing ground fractures, stone eruptions, rolling dust, debris, and
 * a hard screen kick — after a brief trembling buildup, then SEISMIC WAVES that
 * visibly race outward to the other kingdoms, each triggering a lighter secondary
 * impact on arrival so the damage clearly propagates from the origin. Reusable by
 * future Earth abilities (fissures, cave-ins, landslides, tectonic events).
 * Purely visual.
 */
export interface EarthquakeConfig {
  /** Trembling-buildup time before the main rupture, in ms. */
  buildupMs: number
  /** Seismic-wave travel speed toward neighbours, in world units/sec. */
  waveSpeed: number
  /** Fracture reach around the primary target, in world units. */
  radius: number
  /** Faint underground-glow colour of the fractures. */
  glowColor: number
  /** Bright molten crack-core colour. */
  coreColor: number
  /** Stone / rock-debris colour. */
  rockColor: number
  /** Rolling dust-cloud colour. */
  dustColor: number
  /** Flying dirt / gravel colour. */
  gravelColor: number
}

/**
 * An electrical pentagon "cage" locked around a target (Electricity's
 * Thunderdome). A persistent effect: five corner nodes pop in, lightning edges
 * construct between them, then it idles with racing electricity, an interior
 * field, gentle rotation/breathing, and reactive surges when Electricity hits
 * the trapped target — collapsing into the corners when it expires. Purple/
 * yellow palette; rendered above shields. Purely visual.
 */
export interface ThunderdomeConfig {
  /** Radius of the pentagon around the target, in world units. */
  radius: number
  /** Bright racing-electricity / node-core colour (yellow-white). */
  coreColor: number
  /** Glow / interior-field colour (purple). */
  glowColor: number
  /** Build sequence length (nodes stagger in, then edges construct), ms. */
  buildMs: number
  /** Collapse sequence length on expiry, ms. */
  collapseMs: number
}

/**
 * Acid Rain / Corroded (Nature, Epic 9). A persistent chemical-corrosion effect
 * locked onto a target for the Corroded status: a toxic storm cloud gathers and
 * churns overhead, glowing acidic rain falls and sizzles into bubbling puddles,
 * and green vapor keeps rising off the chemically-weakened target — intensifying
 * whenever a fresh Poison lands (the stacking synergy) and dissolving to drifting
 * vapor when it expires. Reusable palette so future Nature chemical abilities can
 * share the same systems; only these colours + dimensions change. Purely visual.
 */
export interface AcidRainConfig {
  /** Dark, murky storm-cloud colour. */
  cloudColor: number
  /** Toxic yellow-green acid colour (rain, puddles, glow). */
  acidColor: number
  /** Bright luminescent highlight colour (rain sheen, sizzle flashes). */
  glowColor: number
  /** Green chemical-vapor colour. */
  vaporColor: number
  /** Radius of the ground zone the rain covers, in world units. */
  radius: number
  /** Height the cloud forms above the target (world units; positive = higher). */
  cloudHeight: number
  /** Cloud gather-in time before rain begins in earnest, ms. */
  gatherMs: number
  /** Cloud dissolve time on expiry, ms. */
  dissolveMs: number
  /**
   * Render the overhead storm cloud + falling acid rain (default true). Set false
   * for a ground-only corrosion aura — bubbling acid, toxic fumes, dripping, and
   * sizzle over the target with no cloud/rain (Gastro Acid's poison idle, and any
   * future toxin/venom/disease DoT that corrodes a target without a storm).
   */
  cloud?: boolean
  /** Scales the corrosion emission rates — a denser, more dangerous poison
   *  (default 1). */
  intensity?: number
}

/**
 * Frost aura (Ice's Flood of Frost, Epic 9). A persistent lingering frost on a
 * target: crystalline frost creeps across the castle, snow drifts down, cold
 * vapor curls upward, and crystals sparkle. When Chilling Retribution lands it
 * switches to an ENHANCED mode — pale-blue magical energy flows through the ice
 * with a pulsing rune ring — and `pulse()` flashes it brighter whenever the
 * target's cooldowns are slowed. Melts to mist on expiry. Reusable palette so
 * future Ice abilities (blizzard, frostbite, deep freeze) can share it.
 */
export interface FrostAuraConfig {
  /** Creeping-frost / crystal colour (pale icy white-blue). */
  frostColor: number
  /** Bright crystal highlight / sparkle colour. */
  iceColor: number
  /** Cold-vapor colour. */
  vaporColor: number
  /** Chilling Retribution magical-energy / rune colour (pale blue). */
  runeColor: number
  /** Radius of the frosted zone around the target, in world units. */
  radius: number
  /** Base lingering time before the frost melts on its own (no Chilling
   *  Retribution), in ms. Chilling Retribution keeps it alive until it expires. */
  baseDurationMs: number
  /** Melt time on expiry, in ms. */
  dissolveMs: number
}

/** One styled polyline layer of a lightning bolt (glow / branches / core). */
export interface BoltLayer {
  /** One or more polylines (world coords). */
  paths: Vec2[][]
  width: number
  color: number
  alpha: number
}

/**
 * A node that redraws lightning polylines each frame (a jagged path, not a
 * positioned sprite — so it isn't a `DisplayNode`). Pixi draws the strokes;
 * tests inject a fake that records the layers. All bolt geometry is generated in
 * pure logic, so the procedural path is unit-testable without a GPU.
 */
export interface BoltNode {
  /** Clear and redraw the given styled layers (glow under, core over). */
  draw(layers: BoltLayer[]): void
  /** Hide and clear the geometry (for pooled reuse). */
  clear(): void
  destroy(): void
}

/**
 * Air's projectile-deflection palette + timing (Epic 9). A UNIVERSAL redirect:
 * any traveling projectile ability, current or future, is intercepted at the Air
 * castle by an invisible wall of compressed wind, suspended briefly, then hurled
 * at a new target — keeping ITS OWN visual identity the whole time. This config
 * describes only the WIND dressing (barrier burst, gusts, feathers, linger
 * spiral); the projectile itself comes from its own EffectDefinition, so no
 * per-ability code is needed. Kingdom-agnostic by construction (Air passes it in;
 * a future wind kingdom could reuse it).
 */
export interface WindDeflectionConfig {
  /** Bright flash / compressed-air core colour. */
  flash: number
  /** Expanding wind-ring colour. */
  ring: number
  /** Primary swirling-gust particle colour (white). */
  gust: number
  /** Secondary gust colour (pale blue). */
  gustAlt: number
  /** Drifting-feather colour. */
  feather: number
  /** Milliseconds the projectile hangs suspended in the burst (100–200). */
  pauseMs?: number
}

/** A decaying camera shake. Pure VFX — never affects gameplay or hitboxes. */
export interface CameraShakeConfig {
  /** Peak offset in world units. */
  magnitude: number
  durationMs: number
  /** Oscillations per second (default 30). */
  frequency?: number
}

/**
 * A complete, data-driven effect. Registered under an ability id or status id.
 * `tintFrom` overrides every sub-config's colour with the source kingdom's
 * theme colour at play time (shared elemental palette).
 */
export interface EffectDefinition {
  projectile?: ProjectileConfig
  /** Particle trail streamed along the projectile's path while it travels. */
  trail?: TrailConfig
  /** A charge-then-fire beam. Takes precedence over `projectile` when present. */
  beam?: BeamConfig
  /** A spinning vortex parked on the target for its duration. */
  vortex?: VortexConfig
  /** A traveling water wave (gather → travel → splash). */
  wave?: WaveConfig
  /** A procedural lightning strike (instant, flickering). */
  lightning?: LightningConfig
  /** A charge-scaled lightning barrage (uses `PlayArgs.charges`). */
  barrage?: LightningBarrageConfig
  /** A staggered multi-impact meteor bombardment (Earth's Meteor Shower). */
  meteorShower?: MeteorShowerConfig
  impact?: ImpactConfig
  particles?: ParticleBurstConfig
  shake?: CameraShakeConfig
  tintFrom?: ThemeToken
}
