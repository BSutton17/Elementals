import type {
  AuraDefinition,
  BffsConfig,
  BlackHoleConfig,
  CupidsArrowConfig,
  BoltNode,
  DisplayNode,
  EffectDefinition,
  AcidRainConfig,
  EarthquakeConfig,
  FrostAuraConfig,
  LightningBarrageConfig,
  LightningConfig,
  MeteorShowerConfig,
  OrionsBeltConfig,
  ParticleBurstConfig,
  RingBarrageConfig,
  SupernovaConfig,
  ProjectileConfig,
  ThunderdomeConfig,
  Vec2,
  WindDeflectionConfig,
} from './types'
import { angleBetween, distance, lerpPoint } from './trajectory'
import { ARENA_CENTER } from '../game/placement'
import { ProjectileSystem } from './systems/projectiles'
import { ImpactSystem } from './systems/impacts'
import { ParticleSystem, type ParticleSystemOptions } from './systems/particles'
import { BeamSystem } from './systems/beams'
import { VortexSystem } from './systems/vortex'
import { WaveSystem } from './systems/wave'
import { LightningSystem } from './systems/lightning'
import { ThunderdomeSystem } from './systems/thunderdome'
import { AcidRainSystem } from './systems/acidRain'
import { FrostAuraSystem } from './systems/frostAura'
import { AuraSystem } from './systems/aura'
import { Camera } from './camera'
import { AnimationTimeline } from './timeline'
import { EffectRegistry } from './registry'
import { themeColor } from './colors'
import { DEFAULT_ABILITY_EFFECT } from './defaults'
import { UNIT_RADIUS } from './nodeUtil'

// Animation framework (Epic 9, ticket #210). Composes the reusable systems,
// camera, timeline, and registry into one façade. It contains NO gameplay logic
// and NO kingdom-specific code — callers pass authoritative-event data (which
// ability, from/to points, source kingdom) and the framework resolves a
// data-driven definition and drives the systems. Pixi lives only in the node
// factories injected here, so the whole façade is unit-testable with fakes.

export interface NodeFactories {
  projectile: () => DisplayNode
  /** Spike sprite for triangle-shaped projectiles (Ice's Icicle). Falls back to
   *  the circle projectile pool when omitted. */
  projectileTriangle?: () => DisplayNode
  /** Tilted spinning ring sprite (Space's Saturn's Rings). Falls back to the
   *  circle projectile pool when omitted. */
  projectileRing?: () => DisplayNode
  /** Heart sprite (Love's Tough Love). Falls back to the circle pool. */
  projectileHeart?: () => DisplayNode
  /** Arrow sprite (Love's Cupid's Arrow). Falls back to the circle pool. */
  projectileArrow?: () => DisplayNode
  impact: () => DisplayNode
  particle: () => DisplayNode
  /** Beam segment sprite. Falls back to the projectile factory if omitted. */
  beam?: () => DisplayNode
  /** Beam charge-glow sprite. Falls back to the impact factory if omitted. */
  beamGlow?: () => DisplayNode
  /** Vortex spiral-band sprite (a circle). Falls back to the particle factory. */
  vortex?: () => DisplayNode
  /** Vortex glow/ember sprite (additive circle). Falls back to the particle factory. */
  vortexGlow?: () => DisplayNode
  /** Wave body/droplet sprite (a circle). Falls back to the particle factory. */
  wave?: () => DisplayNode
  /** Wave foam/mist sprite (additive circle). Falls back to the particle factory. */
  waveGlow?: () => DisplayNode
  /** Lightning polyline drawer. Falls back to a no-op (nothing drawn) if omitted. */
  bolt?: () => BoltNode
  /** Aura smoke sprite (a circle). Falls back to the particle factory. */
  aura?: () => DisplayNode
  /** Aura flame/ember sprite (additive circle). Falls back to the particle factory. */
  auraGlow?: () => DisplayNode
}

export interface FrameworkOptions {
  /** Base radius of the unit sprites the factories produce (see nodeUtil). */
  baseRadius?: number
  particles?: ParticleSystemOptions
  camera?: Camera
  /** Fallback for unregistered ids. Pass null to disable the generic effect. */
  defaultEffect?: EffectDefinition | null
}

export interface PlayArgs {
  from: Vec2
  to: Vec2
  /** Casting kingdom id — resolves `tintFrom` against the shared palette. */
  sourceKingdom?: string | null
  /** Charges spent (Lightning Barrage) — scales a `barrage` effect's intensity. */
  charges?: number
  /** Charge LEVEL (1–3) — scales a `supernova` effect's size/intensity, and any
   *  future level-scaled cosmic effect built on the same primitives. */
  level?: number
}

/**
 * A redirected cast (Air's passive): the projectile flies attacker → `via` (the
 * Air castle), is deflected there, then flies `via` → `to` (the new target).
 */
export interface RedirectArgs extends PlayArgs {
  /** The Air castle where the attack is intercepted and turned. */
  via: Vec2
}

/** Default pause the projectile hangs in the wind burst (ms), and how long the
 *  lingering wind spiral is left behind at the deflection point. */
const WIND_PAUSE_MS = 150
const WIND_LINGER_MS = 520

/** A bolt node that draws nothing — the lightning fallback when no factory is
 *  injected (keeps the system's timing/lifecycle working in tests). */
function makeNoopBolt(): BoltNode {
  return { draw() {}, clear() {}, destroy() {} }
}

/** A random point on a circle of `radius` around `center`. */
function ringPoint(center: Vec2, radius: number): Vec2 {
  const a = Math.random() * Math.PI * 2
  return { x: center.x + Math.cos(a) * radius, y: center.y + Math.sin(a) * radius }
}

/** Supernova's level→scale multiplier (index by charge level 1–3). A level 3
 *  cast should "briefly dominate the battlefield"; level 1 stays comparatively
 *  restrained. Index 0 is unused (level is always clamped to at least 1). */
const SUPERNOVA_LEVEL_SCALE = [0, 1, 1.55, 2.3]

/** Black Hole's ambient pull field, relative to its event-horizon radius — a
 *  cosmetic "extra" pull on any stray attack the explicit interceptor doesn't
 *  catch (already mid-flight when the hole opens). */
const BLACK_HOLE_WELL_RADIUS_MUL = 3.2
const BLACK_HOLE_WELL_STRENGTH_MUL = 0.3

/** A spark burst config for the barrage impact, of the given count/colour. */
function barrageSparks(color: number, count: number): ParticleBurstConfig {
  return {
    count,
    speed: [240, 640],
    spread: Math.PI, // full-circle spray
    lifetimeMs: 340,
    size: 4,
    color,
    gravity: 140,
    fade: true,
  }
}

/** Returns a copy of a config with its colour overridden, or the config as-is. */
function withColor<T extends { color: number }>(
  config: T | undefined,
  color: number | undefined,
): T | undefined {
  if (!config) return undefined
  return color === undefined ? config : { ...config, color }
}

export class AnimationFramework {
  readonly projectiles: ProjectileSystem
  readonly impacts: ImpactSystem
  readonly particles: ParticleSystem
  readonly beams: BeamSystem
  readonly vortices: VortexSystem
  readonly waves: WaveSystem
  readonly lightning: LightningSystem
  readonly thunderdomes: ThunderdomeSystem
  readonly acidRains: AcidRainSystem
  readonly frostAuras: FrostAuraSystem
  readonly auras: AuraSystem
  readonly camera: Camera
  readonly timeline = new AnimationTimeline()
  readonly registry = new EffectRegistry()
  /** Persistent status-aura definitions, keyed by status id. */
  readonly auraRegistry = new Map<string, AuraDefinition>()
  private readonly defaultEffect: EffectDefinition | null
  // Tiny scheduler for scripted multi-step effects (Lightning Barrage): a
  // running clock plus timed callbacks fired from `update`.
  private clock = 0
  private scheduled: { at: number; fn: () => void }[] = []
  // Unique keys for scoped, self-timed gravity wells (Supernova's singularity).
  private wellSeq = 0

  constructor(nodes: NodeFactories, options: FrameworkOptions = {}) {
    const baseRadius = options.baseRadius ?? UNIT_RADIUS
    this.projectiles = new ProjectileSystem(
      nodes.projectile,
      baseRadius,
      undefined,
      {
        ...(nodes.projectileTriangle ? { triangle: nodes.projectileTriangle } : {}),
        ...(nodes.projectileRing ? { ring: nodes.projectileRing } : {}),
        ...(nodes.projectileHeart ? { heart: nodes.projectileHeart } : {}),
        ...(nodes.projectileArrow ? { arrow: nodes.projectileArrow } : {}),
      },
    )
    this.impacts = new ImpactSystem(nodes.impact, baseRadius)
    this.particles = new ParticleSystem(nodes.particle, baseRadius, options.particles)
    // The beam sprite is a rect scaled in absolute world units; only the charge
    // glow (a circle) needs the base radius. Both factories fall back to
    // existing ones (fake nodes) when not injected.
    this.beams = new BeamSystem(
      nodes.beam ?? nodes.projectile,
      nodes.beamGlow ?? nodes.impact,
      baseRadius,
    )
    this.vortices = new VortexSystem(
      nodes.vortex ?? nodes.particle,
      nodes.vortexGlow ?? nodes.particle,
      baseRadius,
    )
    this.waves = new WaveSystem(
      nodes.wave ?? nodes.particle,
      nodes.waveGlow ?? nodes.particle,
      baseRadius,
    )
    // Lightning draws polylines, not sprites; if no bolt factory is injected
    // (e.g. in tests) fall back to a no-op node so the system still runs.
    this.lightning = new LightningSystem(nodes.bolt ?? makeNoopBolt)
    // Thunderdome uses additive glow sprites (corners/interior/sparks) + bolt
    // polylines (edges/arcs), both on the front layer so it sits above shields.
    this.thunderdomes = new ThunderdomeSystem(
      nodes.vortexGlow ?? nodes.particle,
      nodes.bolt ?? makeNoopBolt,
      baseRadius,
    )
    // Acid Rain reuses the soft (smoke) + additive (glow) node factories, so it
    // needs no new node types — its whole look is tint + scale like every system.
    this.acidRains = new AcidRainSystem(
      nodes.aura ?? nodes.particle,
      nodes.auraGlow ?? nodes.particle,
      baseRadius,
    )
    // Frost aura (Flood of Frost) reuses the same soft + additive factories.
    this.frostAuras = new FrostAuraSystem(
      nodes.aura ?? nodes.particle,
      nodes.auraGlow ?? nodes.particle,
      baseRadius,
    )
    this.auras = new AuraSystem(
      nodes.aura ?? nodes.particle,
      nodes.auraGlow ?? nodes.particle,
      baseRadius,
    )
    this.camera = options.camera ?? new Camera()
    this.defaultEffect =
      options.defaultEffect === undefined ? DEFAULT_ABILITY_EFFECT : options.defaultEffect
  }

  /** Advances every system from a single delta time (driven by the stage ticker). */
  update(dtMs: number): void {
    this.clock += dtMs
    this.runScheduled()
    this.projectiles.update(dtMs)
    this.impacts.update(dtMs)
    this.particles.update(dtMs)
    this.beams.update(dtMs)
    this.vortices.update(dtMs)
    this.waves.update(dtMs)
    this.lightning.update(dtMs)
    this.thunderdomes.update(dtMs)
    this.acidRains.update(dtMs)
    this.frostAuras.update(dtMs)
    this.auras.update(dtMs)
    this.timeline.update(dtMs)
    this.camera.update(dtMs)
  }

  /** Fires any scheduled callbacks now due (see `schedule`). */
  private runScheduled(): void {
    if (this.scheduled.length === 0) return
    const due = this.scheduled.filter((s) => s.at <= this.clock)
    if (due.length === 0) return
    this.scheduled = this.scheduled.filter((s) => s.at > this.clock)
    for (const s of due) s.fn()
  }

  /** Runs `fn` after `delayMs` (driven by `update`'s clock). */
  private schedule(delayMs: number, fn: () => void): void {
    this.scheduled.push({ at: this.clock + Math.max(0, delayMs), fn })
  }

  /**
   * Visualize an ability cast: a projectile travels from → to, and its impact +
   * particles (+ optional shake) fire at the landing point. Unregistered ids
   * fall back to the generic themed effect. Definitions without a projectile
   * burst immediately at `to`.
   */
  playAbility(abilityId: string, args: PlayArgs): void {
    const def = this.registry.resolve(abilityId) ?? this.defaultEffect
    if (!def) return
    const color = def.tintFrom ? themeColor(args.sourceKingdom, def.tintFrom) : undefined
    // A charge-scaled lightning barrage — a scripted multi-strike sequence.
    if (def.barrage) {
      this.playBarrage(def.barrage, args.from, args.to, args.charges ?? 1)
      return
    }
    // A meteor bombardment — a scripted multi-impact barrage on the target.
    if (def.meteorShower) {
      this.playMeteorShower(args.to, def.meteorShower)
      return
    }
    // Saturn's Rings — a relentless ring bombardment from caster to target.
    if (def.ringBarrage) {
      this.playRingBarrage(args.from, args.to, def.ringBarrage)
      return
    }
    // A star-collapse cosmic bombardment (Space's Supernova and future large-
    // scale cosmic effects built on the same primitives), scaled by charge level.
    if (def.supernova) {
      this.playSupernova(args.from, args.to, def.supernova, args.level ?? 1)
      return
    }
    // A weaving enchanted arrow (Love's Cupid's Arrow).
    if (def.cupidsArrow) {
      this.playCupidsArrow(args.from, args.to, def.cupidsArrow)
      return
    }
    // A beam charges at the source, then fires + bursts at the target on impact.
    const beam = withColor(def.beam, color)
    if (beam) {
      this.beams.spawn(beam, args.from, args.to, (at) => this.burst(def, at, color))
      return
    }
    // A vortex parks on the target and spins; it lands immediately (no travel),
    // so it bursts at once alongside the swirl.
    const vortex = withColor(def.vortex, color)
    if (vortex) {
      this.vortices.spawn(vortex, args.to)
      this.burst(def, args.to, color)
      return
    }
    // A wave gathers at the caster, travels, then splashes (burst) on arrival.
    if (def.wave) {
      this.waves.spawn(def.wave, args.from, args.to, (at) => this.burst(def, at, color))
      return
    }
    // Lightning strikes instantly, then the impact burst (flash/sparks/shake)
    // fires at the target immediately (no travel).
    if (def.lightning) {
      this.lightning.spawn(def.lightning, args.from, args.to)
      this.burst(def, args.to, color)
      return
    }
    const projectile = withColor(def.projectile, color)
    if (projectile) {
      const onStep = this.makeTrailEmitter(def.trail, color)
      this.projectiles.spawn(
        projectile,
        args.from,
        args.to,
        (at) => this.burst(def, at, color),
        onStep,
      )
    } else {
      this.burst(def, args.to, color)
    }
  }

  /**
   * Visualize an attack that Air's passive REDIRECTED. A universal framework:
   * the projectile flies to the Air castle (`via`) EXACTLY as a normal shot would
   * — same sprite, speed, trail — with nothing hinting at the redirect. On
   * arrival it slams into an invisible wall of compressed wind, hangs suspended
   * for a beat while it turns, and is then hurled at the new target (`to`),
   * preserving its ORIGINAL speed, trail, rotation, impact, and damage-timing.
   * Only TRAVELING (projectile) abilities are deflected; instant abilities
   * (beam/vortex/lightning/wave/barrage) keep their own treatment and simply
   * resolve at the final target. Works for any current/future projectile with no
   * per-ability code — the wind dressing is the only thing Air adds.
   */
  playRedirectedAbility(abilityId: string, args: RedirectArgs, wind: WindDeflectionConfig): void {
    const def = this.registry.resolve(abilityId) ?? this.defaultEffect
    if (!def) return
    const color = def.tintFrom ? themeColor(args.sourceKingdom, def.tintFrom) : undefined
    const projectile = withColor(def.projectile, color)
    // Non-projectile (instant) abilities aren't part of the deflection visual;
    // just resolve them normally at the final target.
    if (!projectile) {
      this.playAbility(abilityId, {
        from: args.from,
        to: args.to,
        sourceKingdom: args.sourceKingdom,
        charges: args.charges,
      })
      return
    }
    const { from, via, to } = args
    // Leg 1: attacker → Air castle, indistinguishable from a normal shot.
    this.projectiles.spawn(
      projectile,
      from,
      via,
      () => this.deflectAtWindBarrier(projectile, def, color, from, via, to, wind),
      this.makeTrailEmitter(def.trail, color),
    )
  }

  /**
   * The redirection EVENT at the Air castle, composed of small reusable modules:
   * the wind-barrier burst (interception), the pause controller (projectile
   * suspended + turning), the launch gust (forceful relaunch), and the lingering
   * wind spiral left behind. Leg 2 preserves the projectile's original speed by
   * matching leg 1's px/ms, and reuses the definition's own trail + impact burst.
   */
  private deflectAtWindBarrier(
    projectile: ProjectileConfig,
    def: EffectDefinition,
    color: number | undefined,
    from: Vec2,
    via: Vec2,
    to: Vec2,
    wind: WindDeflectionConfig,
  ): void {
    this.windBarrierBurst(via, from, to, wind)
    this.windLingerSpiral(via, wind)
    const pauseMs = wind.pauseMs ?? WIND_PAUSE_MS
    this.projectiles.hold(projectile, via, from, to, pauseMs, () => {
      this.windLaunchGust(via, to, wind)
      // Preserve the projectile's ORIGINAL speed: match leg 1's px/ms so the
      // deflected shot travels at the same pace, just along a new segment.
      const refSpeed = distance(from, via) / Math.max(1, projectile.durationMs)
      const leg2: ProjectileConfig = {
        ...projectile,
        durationMs: Math.max(1, distance(via, to) / Math.max(1e-4, refSpeed)),
      }
      this.projectiles.spawn(
        leg2,
        via,
        to,
        (at) => this.burst(def, at, color),
        this.makeTrailEmitter(def.trail, color),
      )
    })
  }

  /**
   * The interception: the projectile collides with the wall of compressed wind
   * around the castle. A bright compressed-air core, expanding wind rings,
   * swirling white + pale-blue gusts, feathers + tiny air specks, a sharp
   * directional flash along the NEW trajectory, a back-splash toward the
   * attacker, and a small screen kick — all pale-air coloured from `wind`.
   */
  private windBarrierBurst(at: Vec2, from: Vec2, to: Vec2, wind: WindDeflectionConfig): void {
    const outDir = angleBetween(at, to) // where it's about to go
    const backDir = angleBetween(at, from) // splash back toward the attacker
    // Compressed-air core burst.
    this.impacts.spawn({ durationMs: 220, size: 62, color: wind.flash, easing: 'easeOut', startScale: 0.5 }, at)
    // Expanding wind rings, staggered outward.
    for (let i = 0; i < 3; i++) {
      this.schedule(i * 55, () => {
        this.impacts.spawn(
          { durationMs: 380, size: 84 + i * 46, color: wind.ring, easing: 'easeOut', startScale: 0.3 },
          at,
        )
      })
    }
    // Swirling white + pale-blue gusts (full circle).
    this.particles.emit({ count: 22, speed: [140, 380], spread: Math.PI, lifetimeMs: 460, size: 7, color: wind.gust, fade: true }, at)
    this.particles.emit({ count: 18, speed: [90, 300], spread: Math.PI, lifetimeMs: 560, size: 9, color: wind.gustAlt, gravity: -20, fade: true }, at)
    // Feathers (slow float) + tiny air specks (quick).
    this.particles.emit({ count: 10, speed: [40, 150], spread: Math.PI, lifetimeMs: 900, size: 8, color: wind.feather, gravity: 30, fade: true }, at)
    this.particles.emit({ count: 16, speed: [260, 620], spread: Math.PI, lifetimeMs: 320, size: 3, color: wind.gust, fade: true }, at)
    // Sharp directional flash along the new heading + a quick white core flash.
    this.particles.emit({ count: 12, speed: [420, 780], spread: 0.28, direction: outDir, lifetimeMs: 260, size: 5, color: wind.flash, fade: true }, at)
    this.impacts.spawn({ durationMs: 150, size: 40, color: 0xffffff, easing: 'easeOut', startScale: 0.6 }, at)
    // Back-splash toward the attacker (the projectile rebounding off the wall).
    this.particles.emit({ count: 8, speed: [150, 360], spread: 0.5, direction: backDir, lifetimeMs: 300, size: 5, color: wind.gustAlt, fade: true }, at)
    this.camera.shake({ magnitude: 5, durationMs: 180 })
  }

  /**
   * The relaunch: a forceful wind blast hurls the projectile along its new path.
   * A concentrated blast behind it, motion streaks aligned with the trajectory,
   * small quickly-dissipating spiraling gusts, and air distortion at the launch.
   */
  private windLaunchGust(at: Vec2, to: Vec2, wind: WindDeflectionConfig): void {
    const outDir = angleBetween(at, to)
    const back = outDir + Math.PI
    // Concentrated blast behind the projectile (pushes it forward).
    this.particles.emit({ count: 16, speed: [200, 520], spread: 0.5, direction: back, lifetimeMs: 340, size: 7, color: wind.gust, fade: true }, at)
    // Motion streaks aligned with the new trajectory (fast, tight).
    this.particles.emit({ count: 14, speed: [360, 760], spread: 0.2, direction: outDir, lifetimeMs: 300, size: 4, color: wind.gustAlt, fade: true }, at)
    // Small spiraling gusts + air distortion at the launch point.
    this.particles.emit({ count: 12, speed: [120, 360], spread: Math.PI, lifetimeMs: 380, size: 6, color: wind.gustAlt, gravity: -10, fade: true }, at)
    this.impacts.spawn({ durationMs: 240, size: 54, color: wind.flash, easing: 'easeOut', startScale: 0.4 }, at)
  }

  /**
   * The lingering wind spiral left where the deflection happened (~0.5s):
   * rotating gusts + a faint circular distortion (a short-lived pale vortex) with
   * a few drifting feathers, fading away naturally.
   */
  private windLingerSpiral(at: Vec2, wind: WindDeflectionConfig): void {
    this.vortices.spawn(
      {
        durationMs: WIND_LINGER_MS,
        size: 58,
        color: wind.gust,
        coreColor: wind.flash,
        emberColor: wind.feather,
        spin: 4.5,
        arms: 14,
        emberRate: 30,
      },
      at,
    )
    this.particles.emit({ count: 8, speed: [30, 120], spread: Math.PI, lifetimeMs: 950, size: 8, color: wind.feather, gravity: 24, fade: true }, at)
  }

  /**
   * Lightning Barrage: a scripted storm of procedural strikes on the target,
   * scaling automatically with `charges` (1–3). Every knob the design calls out
   * — bolt count, branch density, glow/core width, spark count, impact size,
   * corona, and screen shake — is a per-charge multiplier here, so all three
   * levels share this one method with no duplication. Strikes fire in rapid
   * succession from ramping angles (later ones from around the target, like a
   * storm collapsing), the shake ramps into one enormous finishing impact, and a
   * corona of small arcs keeps jumping around the target for a moment after.
   */
  private playBarrage(cfg: LightningBarrageConfig, from: Vec2, to: Vec2, charges: number): void {
    const c = Math.max(1, Math.min(3, Math.round(charges)))
    const i = c - 1
    const strikes = [1, 3, 6][i]!
    const windowMs = [0, 170, 300][i]!
    const glowW = [12, 16, 22][i]!
    const coreW = [4, 5, 6][i]!
    const branchChance = [0.45, 0.6, 0.75][i]!
    const boltArcs = [3, 4, 5][i]!
    const impactSize = [95, 140, 190][i]!
    const sparkTotal = [22, 40, 62][i]!
    const shakeBase = [5, 9, 14][i]!
    const coronaMs = [220, 370, 500][i]!
    const coronaArcs = [2, 4, 7][i]!
    const ringRadius = [0, 150, 200][i]!

    const bolt: LightningConfig = {
      durationMs: 120,
      coreColor: cfg.coreColor,
      glowColor: cfg.glowColor,
      coreWidth: coreW,
      glowWidth: glowW,
      jaggedness: 0.34,
      subdivisions: 5,
      branchChance,
      impactArcs: boltArcs,
    }

    for (let s = 0; s < strikes; s++) {
      const ramp = strikes > 1 ? s / (strikes - 1) : 1
      const delay = strikes > 1 ? ramp * windowMs + Math.random() * 25 : 0
      // First strike comes from the caster; the rest rain in from around the
      // target (a storm collapsing onto one enemy).
      const origin = s === 0 || ringRadius === 0 ? from : ringPoint(to, ringRadius)
      this.schedule(delay, () => {
        this.lightning.spawn(bolt, origin, to)
        this.impacts.spawn(
          { durationMs: 200, size: impactSize * (0.7 + 0.3 * ramp), color: cfg.flashColor, easing: 'easeOut' },
          to,
        )
        this.particles.emit(barrageSparks(cfg.sparkColor, Math.ceil(sparkTotal / strikes)), to)
        this.camera.shake({ magnitude: shakeBase * (0.6 + 0.4 * ramp), durationMs: 160 })
      })
    }

    // One enormous finishing impact after the last strike.
    this.schedule(windowMs + 30, () => {
      this.impacts.spawn(
        { durationMs: 340, size: impactSize * 1.35, color: cfg.flashColor, easing: 'easeOut' },
        to,
      )
      this.particles.emit(barrageSparks(cfg.sparkColor, sparkTotal), to)
      this.camera.shake({ magnitude: shakeBase * 1.4, durationMs: 260 })
    })

    // Lingering corona: small arcs dance around the target, then fade.
    const coronaBolt: LightningConfig = {
      durationMs: 130,
      coreColor: cfg.coreColor,
      glowColor: cfg.glowColor,
      coreWidth: coreW * 0.55,
      glowWidth: glowW * 0.45,
      jaggedness: 0.4,
      subdivisions: 3,
      branchChance: 0.2,
      impactArcs: 0,
    }
    for (let t = windowMs; t < windowMs + coronaMs; t += 55) {
      this.schedule(t, () => {
        for (let a = 0; a < coronaArcs; a++) {
          this.lightning.spawn(coronaBolt, ringPoint(to, 55), ringPoint(to, 55))
        }
      })
    }
  }

  /**
   * Meteor Shower (Earth): a scripted MULTI-IMPACT bombardment on the target.
   * Meteors are staggered across the window (so each strike registers on its
   * own), and each one falls from high above — accelerating under "gravity"
   * (easeIn) with a blazing trail — then detonates with its own explosion +
   * screen kick. Every meteor varies in size/speed/trajectory. Composed of small
   * reusable modules: the drop (a falling projectile + trail) and the impact
   * (ring + rock debris + molten fragments + rolling dust + pebbles + shake).
   */
  private playMeteorShower(at: Vec2, cfg: MeteorShowerConfig): void {
    const n = Math.max(1, Math.round(cfg.meteors))
    for (let i = 0; i < n; i++) {
      const ramp = n > 1 ? i / (n - 1) : 0
      // Stagger across the window with a little jitter so it's not metronomic.
      const delay = ramp * cfg.durationMs + (Math.random() - 0.5) * (cfg.durationMs / n) * 0.7
      this.schedule(Math.max(0, delay), () => this.dropMeteor(at, cfg))
    }
  }

  /** One meteor: falls from high above the target, accelerating, trailing fire,
   *  then explodes on arrival. */
  private dropMeteor(at: Vec2, cfg: MeteorShowerConfig): void {
    const sizeMul = 0.7 + Math.random() * 0.7
    const impact = {
      x: at.x + (Math.random() * 2 - 1) * cfg.spread,
      y: at.y + (Math.random() * 2 - 1) * cfg.spread * 0.25,
    }
    const from = {
      x: impact.x + (Math.random() * 2 - 1) * cfg.spread * 0.5, // slight angle
      y: impact.y - cfg.fallHeight * (0.85 + Math.random() * 0.3),
    }
    const meteor: ProjectileConfig = {
      durationMs: 300 + Math.random() * 240, // varied speed
      size: cfg.size * sizeMul,
      color: cfg.coreColor, // molten glowing core
      easing: 'easeIn', // accelerate under gravity
      faceDirection: true,
    }
    // A blazing orange-red trail of embers + molten fragments peeling off.
    const onStep = this.makeTrailEmitter(
      {
        emitEveryMs: 15,
        particles: {
          count: 3,
          speed: [20, 100],
          spread: 0.8,
          lifetimeMs: 360,
          size: 5 * sizeMul,
          color: cfg.trailColor,
          gravity: -40, // embers linger/rise behind the falling rock
          fade: true,
        },
      },
      undefined,
    )
    this.projectiles.spawn(meteor, from, impact, (a) => this.meteorImpact(a, cfg, sizeMul), onStep)
  }

  /** A single meteor's ground explosion. */
  private meteorImpact(at: Vec2, cfg: MeteorShowerConfig, sizeMul: number): void {
    // Expanding shockwave ring.
    this.impacts.spawn(
      { durationMs: 360, size: 78 * sizeMul, color: cfg.coreColor, easing: 'easeOut', startScale: 0.2 },
      at,
    )
    // A massive burst of rock + shattered stone flung out (falls under gravity).
    this.particles.emit(
      { count: Math.round(14 * sizeMul), speed: [160, 440], spread: Math.PI, lifetimeMs: 640, size: 5 * sizeMul, color: cfg.rockColor, gravity: 440, fade: true },
      at,
    )
    // Molten fragments thrown outward (bright, hot).
    this.particles.emit(
      { count: Math.round(10 * sizeMul), speed: [180, 470], spread: Math.PI, lifetimeMs: 520, size: 4, color: cfg.emberColor, gravity: 320, fade: true },
      at,
    )
    // Dust clouds rolling across the ground (slow, rise + linger).
    this.particles.emit(
      { count: Math.round(8 * sizeMul), speed: [40, 130], spread: Math.PI, lifetimeMs: 820, size: 12 * sizeMul, color: cfg.dustColor, gravity: -18, fade: true },
      at,
    )
    // Flying pebbles (small, fast, fall quickly).
    this.particles.emit(
      { count: Math.round(10 * sizeMul), speed: [220, 520], spread: Math.PI, lifetimeMs: 460, size: 2.5, color: cfg.rockColor, gravity: 400, fade: true },
      at,
    )
    // A satisfying kick per impact (bigger meteors hit harder).
    this.camera.shake({ magnitude: 5 * sizeMul, durationMs: 170 })
  }

  /**
   * Saturn's Rings (Space): a relentless bombardment of planetary rings. Composed
   * of small reusable modules — the Saturn SUMMON telegraph at the caster (a
   * ringed planet blooms, debris spiralling in), the BARRAGE CONTROLLER (rings
   * break away one after another every ~100–200 ms), the traveling ROTATING RING
   * (a tilted spinning ring shedding orbiting asteroids, cosmic dust, and stars),
   * the compact IMPACT (gravitational shockwave + lensing + dust + fragments +
   * stars + a kick), and the STELLAR-ENERGY TRANSFER that peels off each impact
   * back toward the caster to feed the Supernova. The final ring is dramatically
   * larger and heavier. Every ring varies so it reads as an endless storm.
   */
  private playRingBarrage(from: Vec2, to: Vec2, cfg: RingBarrageConfig): void {
    const n = Math.max(1, Math.round(cfg.rings))
    // 1. Summon telegraph: Saturn forms at the caster before the barrage.
    this.summonSaturn(from, cfg)
    // 2. Barrage controller: stagger launches 100–200 ms apart after the summon,
    // accumulating real gaps so the cadence is irregular, not metronomic.
    const summonMs = 260
    let t = summonMs
    for (let i = 0; i < n; i++) {
      const isFinal = i === n - 1
      this.schedule(t, () => this.fireRing(from, to, cfg, isFinal))
      t += cfg.minGapMs + Math.random() * Math.max(0, cfg.maxGapMs - cfg.minGapMs)
    }
  }

  /** The Saturn "summon": a ringed planet blooms at the caster with debris,
   *  dust, and starlight spiralling inward before the rings peel away. */
  private summonSaturn(at: Vec2, cfg: RingBarrageConfig): void {
    // The planet core blooms, wrapped by a bright ring halo.
    this.impacts.spawn({ durationMs: 300, size: 46, color: cfg.ringColor, easing: 'easeOut', startScale: 0.2 }, at)
    this.impacts.spawn({ durationMs: 340, size: 74, color: cfg.glowColor, easing: 'easeOut', startScale: 0.3 }, at)
    // Debris + dust + starlight pulled into orbit (inward — negative gravity rise
    // + slow drift reads as gathering matter).
    this.particles.emit({ count: 16, speed: [60, 200], spread: Math.PI, lifetimeMs: 460, size: 3, color: cfg.asteroidColor, gravity: -18, fade: true }, at)
    this.particles.emit({ count: 14, speed: [40, 150], spread: Math.PI, lifetimeMs: 560, size: 7, color: cfg.dustColor, gravity: -8, fade: true }, at)
    this.particles.emit({ count: 10, speed: [120, 320], spread: Math.PI, lifetimeMs: 380, size: 2.5, color: cfg.starColor, fade: true }, at)
    this.camera.shake({ magnitude: 3, durationMs: 160 })
  }

  /** One planetary ring: breaks away from Saturn and flies to the target as a
   *  tilted, spinning ring shedding orbiting asteroids/dust/stars, then slams in.
   *  The final ring is larger, spins faster, and hits harder. */
  private fireRing(from: Vec2, to: Vec2, cfg: RingBarrageConfig, isFinal: boolean): void {
    const sizeMul = isFinal ? 1.9 : 0.75 + Math.random() * 0.6
    // Each ring is unique: varied diameter, spin direction/speed, and travel time.
    const spin = (Math.random() < 0.5 ? -1 : 1) * (isFinal ? 7 : 3 + Math.random() * 3)
    const ring: ProjectileConfig = {
      durationMs: isFinal ? 360 : 220 + Math.random() * 130,
      size: cfg.size * sizeMul,
      color: cfg.ringColor,
      easing: 'linear',
      shape: 'ring',
      spin,
    }
    // Orbiting debris storm streamed along the ring's path: asteroid rocks +
    // translucent cosmic dust + occasional embedded stars (additive twinkle).
    let since = 0
    const onStep = (pos: Vec2, dtMs: number) => {
      since += dtMs
      if (since < 20) return
      since = 0
      this.particles.emit({ count: 3, speed: [30, 140], spread: Math.PI, lifetimeMs: 340, size: 2.5 * sizeMul, color: cfg.asteroidColor, gravity: 0, fade: true }, pos)
      this.particles.emit({ count: 2, speed: [10, 70], spread: Math.PI, lifetimeMs: 460, size: 6 * sizeMul, color: cfg.dustColor, gravity: -6, fade: true }, pos)
      if (Math.random() < 0.5) {
        this.particles.emit({ count: 1, speed: [20, 120], spread: Math.PI, lifetimeMs: 300, size: 2, color: cfg.starColor, fade: true }, pos)
      }
    }
    this.projectiles.spawn(ring, from, to, (at) => this.ringImpact(from, at, cfg, sizeMul, isFinal), onStep)
  }

  /** A single ring's impact: heavy but quick, compact so the next ring follows
   *  without obscuring the action. Gravitational shockwave + faint lensing halo +
   *  cosmic dust + flung asteroid fragments + bright stars + a screen kick, then a
   *  stellar-energy stream peels back to the caster. */
  private ringImpact(caster: Vec2, at: Vec2, cfg: RingBarrageConfig, sizeMul: number, isFinal: boolean): void {
    // Gravitational shockwave ring.
    this.impacts.spawn({ durationMs: 300, size: 60 * sizeMul, color: cfg.ringColor, easing: 'easeOut', startScale: 0.25 }, at)
    // Space distortion / gravitational lensing — a faint, larger, slower halo.
    this.impacts.spawn({ durationMs: 460, size: 108 * sizeMul, color: cfg.glowColor, easing: 'easeOut', startScale: 0.15 }, at)
    // Burst of cosmic dust (slow, lingering).
    this.particles.emit({ count: Math.round(9 * sizeMul), speed: [40, 150], spread: Math.PI, lifetimeMs: 620, size: 8 * sizeMul, color: cfg.dustColor, gravity: -10, fade: true }, at)
    // Flying asteroid fragments (fast, fall slightly).
    this.particles.emit({ count: Math.round(10 * sizeMul), speed: [180, 480], spread: Math.PI, lifetimeMs: 460, size: 3.5 * sizeMul, color: cfg.asteroidColor, gravity: 120, fade: true }, at)
    // Bright star particles (additive twinkle).
    this.particles.emit({ count: Math.round(8 * sizeMul), speed: [200, 520], spread: Math.PI, lifetimeMs: 420, size: 2.5, color: cfg.starColor, fade: true }, at)
    // A light kick per impact; the final ring lands the heaviest blow.
    this.camera.shake({ magnitude: (isFinal ? 8 : 3) * (isFinal ? 1 : sizeMul), durationMs: isFinal ? 260 : 130 })
    // Stellar energy peels off and races back to the caster's Supernova meter.
    this.ringEnergyTransfer(at, caster, cfg)
  }

  /** A stream of stellar energy peeling off an impact and racing back to the
   *  caster — visual feedback that every hit fuels the Supernova. */
  private ringEnergyTransfer(from: Vec2, to: Vec2, cfg: RingBarrageConfig): void {
    const stream: ProjectileConfig = {
      durationMs: 260,
      size: 7,
      color: cfg.energyColor,
      easing: 'easeIn', // accelerates home
      faceDirection: true,
    }
    const trail = this.makeTrailEmitter(
      { emitEveryMs: 16, particles: { count: 2, speed: [10, 60], spread: Math.PI, lifetimeMs: 300, size: 4, color: cfg.energyColor, gravity: 0, fade: true } },
      undefined,
    )
    this.projectiles.spawn(
      stream,
      from,
      to,
      (at) => this.impacts.spawn({ durationMs: 200, size: 30, color: cfg.energyColor, easing: 'easeOut', startScale: 0.4 }, at),
      trail,
    )
  }

  /**
   * Supernova (Space's ultimate) — the reusable foundation for every large-scale
   * cosmic Space effect (future planets/black holes/galaxies/wormholes share
   * these same primitives). See `SupernovaConfig` for the phase breakdown.
   * `level` (1–3) scales every phase's size/density/intensity. `wellDurationMs`
   * — set only when the server confirms a successful gravitational redirect
   * (level 2/3) — turns the target into a singularity for that long once the
   * final impact lands; omitted/0 skips the singularity entirely.
   */
  playSupernova(from: Vec2, to: Vec2, cfg: SupernovaConfig, level: number, wellDurationMs = 0): void {
    const lvl = Math.max(1, Math.min(3, Math.round(level)))
    const scale = SUPERNOVA_LEVEL_SCALE[lvl]!
    // Charge/explosion/collapse grow only modestly with level — a Lv1 cast
    // still feels snappy; SIZE/DENSITY is where the scaling really shows.
    const chargeMs = cfg.chargeMs * (0.82 + 0.18 * scale)
    const explosionMs = cfg.explosionMs * (0.82 + 0.18 * scale)
    const collapseMs = cfg.collapseMs * (0.82 + 0.18 * scale)

    // 1. Stellar formation at the caster.
    this.stellarFormation(from, cfg, scale, chargeMs)

    // 2. The star goes unstable and detonates outward...
    this.schedule(chargeMs, () => {
      this.supernovaExplosion(from, cfg, scale, explosionMs)
      // 3. ...then immediately reverses into a collapse streaming to the target.
      this.schedule(explosionMs * 0.45, () => {
        this.gravitationalCollapse(from, to, cfg, scale, collapseMs, () => {
          // 4. Final impact.
          this.gravitationalFinalImpact(to, cfg, scale)
          // Levels 2/3, successful redirect only: the target becomes a singularity.
          if (wellDurationMs > 0) this.singularityController(to, cfg, scale, wellDurationMs)
        })
      })
    })
  }

  /**
   * MODULE — stellar formation: a young star ignites at `at` and steadily
   * brightens while pulling in surrounding matter (dust, nebula, asteroids,
   * floating starlight, plasma streams), with gravitational lensing visibly
   * strengthening as it charges toward instability. The vortex system's real
   * orbital motion (embers spiralling inward) IS the "matter being pulled in".
   */
  private stellarFormation(at: Vec2, cfg: SupernovaConfig, scale: number, chargeMs: number): void {
    this.vortices.spawn(
      {
        durationMs: chargeMs,
        size: 26 * scale,
        color: cfg.lensColor,
        coreColor: cfg.flashColor,
        emberColor: cfg.plasmaColor,
        spin: 3.2,
        arms: Math.round(5 + scale * 10),
        emberRate: 30 * scale,
      },
      at,
    )
    // Inward-pulling matter: dust, asteroids, floating starlight, and nebula,
    // pulsed in waves (negative gravity + short life reads as "drawn inward").
    const pulses = Math.max(2, Math.round(3 * scale))
    for (let i = 0; i < pulses; i++) {
      this.schedule((i / pulses) * chargeMs, () => {
        this.particles.emit({ count: Math.round(6 * scale), speed: [50, 170], spread: Math.PI, lifetimeMs: 420, size: 5, color: cfg.dustColor, gravity: -22, fade: true }, at)
        this.particles.emit({ count: Math.round(5 * scale), speed: [70, 220], spread: Math.PI, lifetimeMs: 360, size: 3, color: cfg.asteroidColor, gravity: -14, fade: true }, at)
        this.particles.emit({ count: Math.round(4 * scale), speed: [90, 260], spread: Math.PI, lifetimeMs: 320, size: 2, color: cfg.starColor, gravity: -8, fade: true }, at)
        this.particles.emit({ count: Math.round(3 * scale), speed: [60, 190], spread: Math.PI, lifetimeMs: 380, size: 6, color: cfg.nebulaColor, gravity: -10, fade: true }, at)
      })
    }
    // Growing gravitational-lensing halo — a slow-expanding, brightening ring.
    this.impacts.spawn({ durationMs: chargeMs, size: 30 * scale, color: cfg.lensColor, easing: 'easeOut', startScale: 0.15 }, at)
    // The star's own brightening core flash, peaking right at instability.
    this.schedule(chargeMs * 0.55, () => {
      this.impacts.spawn({ durationMs: chargeMs * 0.45, size: 22 * scale, color: cfg.flashColor, easing: 'easeOut', startScale: 0.3 }, at)
    })
  }

  /**
   * MODULE — supernova explosion: the star violently detonates outward. A
   * massive expanding plasma shell, a brilliant flash, gold/blue stellar
   * flames, nebula, a dense shower of glowing particles, asteroid fragments, an
   * expanding shockwave, and rippling space distortion — briefly larger than
   * any kingdom at high levels.
   */
  private supernovaExplosion(at: Vec2, cfg: SupernovaConfig, scale: number, explosionMs: number): void {
    const shell = cfg.size * scale
    // Blinding flash at the core.
    this.impacts.spawn({ durationMs: explosionMs * 0.4, size: shell * 0.6, color: cfg.flashColor, easing: 'easeOut', startScale: 0.4 }, at)
    // Massive expanding plasma shell — staggered rings so it reads as THICK.
    for (let i = 0; i < 3; i++) {
      this.schedule(i * 30, () => {
        this.impacts.spawn(
          { durationMs: explosionMs * (0.85 + i * 0.1), size: shell * (0.75 + i * 0.4), color: i === 0 ? cfg.goldColor : cfg.blueColor, easing: 'easeOut', startScale: 0.1 },
          at,
        )
      })
    }
    // Rippling space distortion — a huge, slow, faint lensing wave.
    this.impacts.spawn({ durationMs: explosionMs * 1.4, size: shell * 2.4, color: cfg.lensColor, easing: 'easeOut', startScale: 0.05 }, at)
    // Gold + blue stellar flame bursts.
    this.particles.emit({ count: Math.round(20 * scale), speed: [200, 560], spread: Math.PI, lifetimeMs: 620, size: 6, color: cfg.goldColor, fade: true }, at)
    this.particles.emit({ count: Math.round(16 * scale), speed: [180, 520], spread: Math.PI, lifetimeMs: 680, size: 5, color: cfg.blueColor, fade: true }, at)
    // Nebula clouds rolling outward (slow, lingering).
    this.particles.emit({ count: Math.round(10 * scale), speed: [60, 200], spread: Math.PI, lifetimeMs: 900, size: 16, color: cfg.nebulaColor, gravity: -10, fade: true }, at)
    // A dense shower of glowing star particles.
    this.particles.emit({ count: Math.round(30 * scale), speed: [220, 680], spread: Math.PI, lifetimeMs: 520, size: 2.5, color: cfg.starColor, fade: true }, at)
    // Asteroid fragments flung outward.
    this.particles.emit({ count: Math.round(14 * scale), speed: [160, 460], spread: Math.PI, lifetimeMs: 560, size: 4, color: cfg.asteroidColor, gravity: 60, fade: true }, at)
    // A heavy screen kick, scaled by level.
    this.camera.shake({ magnitude: 7 * scale, durationMs: 260 })
  }

  /**
   * MODULE — gravitational collapse: the explosion abruptly reverses. Several
   * independent streams (plasma/nebula/asteroid/star-tinted) launch from points
   * scattered around the origin and converge on the TARGET, accelerating the
   * whole way (`easeIn`) — so it reads as an entire region of space being
   * pulled inward, not one bolt. The designated stream fires the Final Impact
   * on arrival (the others land with a small connecting burst only).
   */
  private gravitationalCollapse(
    from: Vec2,
    to: Vec2,
    cfg: SupernovaConfig,
    scale: number,
    collapseMs: number,
    onImpact: () => void,
  ): void {
    const streams = Math.max(4, Math.round(4 * scale))
    const finalIndex = Math.floor(streams / 2)
    const originRadius = cfg.size * scale * 1.3
    const palette = [cfg.plasmaColor, cfg.nebulaColor, cfg.asteroidColor, cfg.starColor]
    for (let i = 0; i < streams; i++) {
      const origin = ringPoint(from, originRadius * (0.5 + Math.random() * 0.5))
      const color = palette[i % palette.length]!
      const stream: ProjectileConfig = {
        durationMs: collapseMs * (0.9 + Math.random() * 0.2),
        size: (6 + Math.random() * 5) * Math.sqrt(scale),
        color,
        easing: 'easeIn', // accelerates the whole way in
        faceDirection: true,
      }
      let since = 0
      const onStep = (pos: Vec2, dtMs: number) => {
        since += dtMs
        if (since < 22) return
        since = 0
        this.particles.emit({ count: 2, speed: [20, 90], spread: Math.PI, lifetimeMs: 260, size: 3, color, fade: true }, pos)
      }
      this.projectiles.spawn(
        stream,
        origin,
        to,
        (at) => {
          this.particles.emit({ count: 4, speed: [60, 200], spread: Math.PI, lifetimeMs: 300, size: 3, color, fade: true }, at)
          if (i === finalIndex) onImpact()
        },
        onStep,
      )
    }
  }

  /**
   * MODULE — final impact: the collapse culminates in one devastating strike —
   * less an explosion, more the universe folding inward onto one point. A
   * blinding flash, a huge gravitational shockwave, space-time distortion,
   * bright cosmic dust, rolling nebula, twinkling stars, flying asteroid
   * debris, and long-lasting gravitational ripples.
   */
  private gravitationalFinalImpact(at: Vec2, cfg: SupernovaConfig, scale: number): void {
    const shell = cfg.size * scale
    // Blinding stellar flash.
    this.impacts.spawn({ durationMs: 260, size: shell * 0.55, color: cfg.flashColor, easing: 'easeOut', startScale: 0.5 }, at)
    // Huge expanding gravitational shockwave.
    this.impacts.spawn({ durationMs: 520, size: shell * 1.6, color: cfg.lensColor, easing: 'easeOut', startScale: 0.15 }, at)
    // Space-time distortion — slower, larger, very faint.
    this.impacts.spawn({ durationMs: 900, size: shell * 2.6, color: cfg.wellColor, easing: 'easeOut', startScale: 0.08 }, at)
    // Long-lasting gravitational ripples — staggered, fainter follow-up rings.
    for (let i = 1; i <= 2; i++) {
      this.schedule(i * 140, () => {
        this.impacts.spawn({ durationMs: 700, size: shell * (1.2 + i * 0.7), color: cfg.lensColor, easing: 'easeOut', startScale: 0.1 }, at)
      })
    }
    // Bright cosmic dust.
    this.particles.emit({ count: Math.round(16 * scale), speed: [80, 260], spread: Math.PI, lifetimeMs: 720, size: 9, color: cfg.dustColor, gravity: -12, fade: true }, at)
    // Nebula clouds rolling outward.
    this.particles.emit({ count: Math.round(10 * scale), speed: [50, 180], spread: Math.PI, lifetimeMs: 900, size: 16, color: cfg.nebulaColor, gravity: -8, fade: true }, at)
    // Twinkling stars.
    this.particles.emit({ count: Math.round(22 * scale), speed: [180, 520], spread: Math.PI, lifetimeMs: 460, size: 2.5, color: cfg.starColor, fade: true }, at)
    // Flying asteroid debris.
    this.particles.emit({ count: Math.round(14 * scale), speed: [160, 440], spread: Math.PI, lifetimeMs: 520, size: 4, color: cfg.asteroidColor, gravity: 140, fade: true }, at)
    // The heaviest kick of the whole sequence.
    this.camera.shake({ magnitude: 9 * scale, durationMs: 300 })
  }

  /**
   * MODULE — singularity controller: the target becomes a temporary
   * gravitational singularity (levels 2/3, successful redirect only). A
   * shimmering gravity field — concentric rings, warped starlight, and
   * genuinely orbiting debris (the vortex system's real orbital motion) —
   * surrounds the kingdom, and every in-flight projectile visibly bends toward
   * it (the shared `GravityWell` primitive on the projectile system, so this
   * works for ANY ability, current or future, with no per-ability code).
   * Dissolves into drifting starlight when the duration elapses.
   */
  private singularityController(at: Vec2, cfg: SupernovaConfig, scale: number, durationMs: number): void {
    const key = `supernovaWell:${this.wellSeq++}`
    const radius = cfg.wellRadius * scale
    // The lensing/orbital body: concentric rings + orbiting debris that spirals
    // inward exactly the way the vortex system's embers already behave.
    this.vortices.spawn(
      {
        durationMs,
        size: radius,
        color: cfg.wellColor,
        coreColor: cfg.flashColor,
        emberColor: cfg.lensColor,
        spin: 2.6,
        arms: Math.round(6 + scale * 25),
        emberRate: 42,
      },
      at,
    )
    // Every in-flight (and newly launched) projectile bends toward the well.
    this.projectiles.addWell(key, { at, radius, strength: cfg.wellStrength * scale })
    // Concentric warning rings pulsing outward for the well's whole life.
    this.pulseWellRings(at, cfg, radius, durationMs)
    // A mixed storm of "trapped" debris pulled into orbit before falling in.
    this.pulseWellDebris(at, cfg, radius, durationMs)
    // On expiry: the field relaxes, bending stops, and it dissolves to starlight.
    this.schedule(durationMs, () => {
      this.projectiles.removeWell(key)
      this.singularityDissolve(at, cfg, scale)
    })
  }

  /** Periodic concentric rings around an active well (the "shimmering gravity
   *  field... concentric rings" cue). Self-chains until the well's time is up. */
  private pulseWellRings(at: Vec2, cfg: SupernovaConfig, radius: number, remainingMs: number): void {
    if (remainingMs <= 0) return
    this.impacts.spawn({ durationMs: 700, size: radius * 0.9, color: cfg.wellColor, easing: 'easeOut', startScale: 0.3 }, at)
    this.schedule(820, () => this.pulseWellRings(at, cfg, radius, remainingMs - 820))
  }

  /** Periodic bursts of small debris drawn toward the well then pulled inward —
   *  dust, rocky pebbles, starlight, and plasma sparks, echoing "trapped"
   *  battlefield matter caught in the singularity's pull. Self-chains. */
  private pulseWellDebris(at: Vec2, cfg: SupernovaConfig, radius: number, remainingMs: number): void {
    if (remainingMs <= 0) return
    const spot = ringPoint(at, radius * (0.5 + Math.random() * 0.4))
    const palette = [cfg.dustColor, cfg.asteroidColor, cfg.starColor, cfg.plasmaColor]
    const color = palette[Math.floor(Math.random() * palette.length)]!
    const dir = angleBetween(spot, at) // falls inward toward the well's center
    this.particles.emit({ count: 3, speed: [30, 90], spread: 0.6, direction: dir, lifetimeMs: 500, size: 3, color, fade: true }, spot)
    this.schedule(260 + Math.random() * 180, () => this.pulseWellDebris(at, cfg, radius, remainingMs - 300))
  }

  /** The well relaxing: lensing fades, orbiting particles escape, and the whole
   *  field dissolves into a soft burst of drifting starlight. */
  private singularityDissolve(at: Vec2, cfg: SupernovaConfig, scale: number): void {
    this.impacts.spawn({ durationMs: 560, size: cfg.wellRadius * scale * 0.7, color: cfg.wellColor, easing: 'easeOut', startScale: 0.6 }, at)
    this.particles.emit({ count: Math.round(14 * scale), speed: [40, 140], spread: Math.PI, lifetimeMs: 820, size: 2.5, color: cfg.starColor, gravity: -14, fade: true }, at)
  }

  // ===========================================================================
  // Black Hole (Space's other ultimate) — see `BlackHoleConfig` in types.ts for
  // the full phase breakdown. Anchored at the ARENA CENTER (not the caster),
  // unlike Supernova. Built on the same procedural-cosmic primitives, and — per
  // the design brief — the reusable foundation for future galaxy-scale Space
  // effects (wormholes, quasars, neutron stars, …).
  // ===========================================================================

  /**
   * Open phase (`blackHoleOpened`) — MODULES: singularity renderer, accretion
   * disk simulation + orbital debris system, gravitational lensing, nebula.
   * Ignites at the arena center and grows into a dominating, ever-rotating
   * body for `durationMs`, escalating into visible instability near expiry.
   * Also parks an ambient `GravityWell` so any attack the explicit
   * interceptor doesn't catch (already mid-flight when the hole opens) still
   * visibly gets pulled toward it.
   */
  openBlackHole(cfg: BlackHoleConfig, durationMs: number): void {
    const at = ARENA_CENTER
    const id = `blackHole:${this.wellSeq++}`
    this.singularityGrow(at, cfg)
    this.accretionDisk(at, cfg, durationMs)
    this.lensingAndNebula(at, cfg, durationMs, id)
    this.projectiles.addWell(id, {
      at,
      radius: cfg.radius * BLACK_HOLE_WELL_RADIUS_MUL,
      strength: cfg.radius * BLACK_HOLE_WELL_STRENGTH_MUL,
    })
    const rampMs = durationMs * 0.35
    this.schedule(durationMs - rampMs, () => this.instabilityRamp(at, cfg, rampMs, rampMs))
    this.schedule(durationMs, () => this.projectiles.removeWell(id))
  }

  /**
   * Charging pulse (`blackHoleAbsorbed`, one per absorbed attack) — MODULE:
   * pulse controller. Immediate, satisfying feedback that the stored energy
   * grew: the accretion disk brightens, the singularity pulses, a shockwave
   * ripples, debris accelerates, fresh plasma ignites, and the battlefield
   * takes a light kick. The visible running total is a separate DOM overlay
   * (BlackHoleAccumulator) driven off the same event.
   */
  pulseBlackHole(cfg: BlackHoleConfig): void {
    const at = ARENA_CENTER
    this.impacts.spawn({ durationMs: 260, size: cfg.radius * 0.9, color: cfg.flashColor, easing: 'easeOut', startScale: 0.4 }, at)
    this.impacts.spawn({ durationMs: 420, size: cfg.radius * 1.6, color: cfg.lensColor, easing: 'easeOut', startScale: 0.2 }, at)
    this.particles.emit({ count: 10, speed: [140, 380], spread: Math.PI, lifetimeMs: 380, size: 3, color: cfg.plasmaBlue, fade: true }, at)
    this.particles.emit({ count: 8, speed: [120, 340], spread: Math.PI, lifetimeMs: 420, size: 3, color: cfg.plasmaPurple, fade: true }, at)
    this.particles.emit({ count: 8, speed: [100, 300], spread: Math.PI, lifetimeMs: 360, size: 4, color: cfg.asteroidColor, gravity: -30, fade: true }, at)
    this.camera.shake({ magnitude: 4, durationMs: 160 })
  }

  /**
   * Universal projectile interception (traveling attacks) + instant-ability
   * absorption framework (everything else) — MODULES: universal projectile
   * interception, instant ability absorption framework. Called once per
   * intercepted `abilityCast` from ANY kingdom while the hole is open. A
   * traveling attack launches with its OWN unmodified animation, then — partway
   * through its normal flight ("gravity begins affecting it") — curves hard
   * toward the black hole, accelerating, before vanishing under the horizon. An
   * instant ability (no registered projectile) is generically "ripped apart" at
   * its own resolution point and dragged in the same way — this is what makes
   * ANY current or future ability (vortex/beam/wave/lightning/meteor shower/
   * ring barrage/…) feel like gravity overpowered it, with no per-ability code.
   */
  interceptIntoBlackHole(
    abilityId: string,
    from: Vec2,
    originalTo: Vec2,
    sourceKingdom: string | null,
    cfg: BlackHoleConfig,
    fallbackColor: number,
  ): void {
    const at = ARENA_CENTER
    const def = this.registry.resolve(abilityId) ?? this.defaultEffect
    const themedColor = def?.tintFrom ? themeColor(sourceKingdom, def.tintFrom) : undefined
    const projectile = def ? withColor(def.projectile, themedColor) : undefined
    const color = themedColor ?? fallbackColor
    if (!projectile) {
      this.absorbInstantIntoBlackHole(originalTo, at, cfg, color)
      return
    }
    // Leg 1: launches exactly as normal — its own animation fully intact.
    const via = lerpPoint(from, originalTo, 0.45)
    this.projectiles.spawn(
      projectile,
      from,
      via,
      () => this.gravityCapture(projectile, def, color, via, at, cfg),
      this.makeTrailEmitter(def?.trail, themedColor),
    )
  }

  /** Leg 2 of interception: from where gravity took hold, the attack curves
   *  hard toward the black hole — speed increasing, trail stretching, growing
   *  distorted — before vanishing beneath the event horizon. */
  private gravityCapture(
    projectile: ProjectileConfig,
    def: EffectDefinition | null | undefined,
    color: number,
    via: Vec2,
    at: Vec2,
    cfg: BlackHoleConfig,
  ): void {
    const captured: ProjectileConfig = {
      ...projectile,
      durationMs: Math.max(120, projectile.durationMs * 0.4), // speed increases dramatically
      easing: 'easeIn', // accelerates the rest of the way in
    }
    const baseTrailSize = def?.trail?.particles.size ?? 5
    const trail = this.makeTrailEmitter(
      {
        emitEveryMs: 12,
        particles: { count: 3, speed: [30, 120], spread: Math.PI, lifetimeMs: 260, size: baseTrailSize * 1.4, color, fade: true },
      },
      undefined,
    )
    this.projectiles.spawn(captured, via, at, () => this.horizonAbsorption(at, cfg), trail)
  }

  /** An instant (non-projectile) ability, ripped apart at its own resolution
   *  point and dragged into the black hole as a fast accelerating stream. */
  private absorbInstantIntoBlackHole(originalTo: Vec2, at: Vec2, cfg: BlackHoleConfig, color: number): void {
    this.impacts.spawn({ durationMs: 240, size: 46, color, easing: 'easeOut', startScale: 0.4 }, originalTo)
    this.particles.emit({ count: 16, speed: [140, 420], spread: Math.PI, lifetimeMs: 380, size: 4, color, fade: true }, originalTo)
    const stream: ProjectileConfig = { durationMs: 380, size: 10, color, easing: 'easeIn', faceDirection: true }
    const trail = this.makeTrailEmitter(
      { emitEveryMs: 14, particles: { count: 3, speed: [30, 110], spread: Math.PI, lifetimeMs: 260, size: 5, color, fade: true } },
      undefined,
    )
    this.projectiles.spawn(stream, originalTo, at, () => this.horizonAbsorption(at, cfg), trail)
  }

  /** The moment an attack vanishes into the black hole — shared by every
   *  interception path: a bright gravitational flash, an accretion-disk
   *  ripple, space distortion, and a pulse through the singularity. */
  private horizonAbsorption(at: Vec2, cfg: BlackHoleConfig): void {
    this.impacts.spawn({ durationMs: 220, size: cfg.radius * 0.55, color: cfg.flashColor, easing: 'easeOut', startScale: 0.5 }, at)
    this.impacts.spawn({ durationMs: 360, size: cfg.radius * 1.1, color: cfg.plasmaBlue, easing: 'easeOut', startScale: 0.2 }, at)
    this.impacts.spawn({ durationMs: 520, size: cfg.radius * 1.7, color: cfg.lensColor, easing: 'easeOut', startScale: 0.1 }, at)
    this.particles.emit({ count: 10, speed: [80, 220], spread: Math.PI, lifetimeMs: 340, size: 3, color: cfg.starColor, fade: true }, at)
  }

  /**
   * MODULE — singularity renderer: the icon "tears open reality" — a bright
   * pinprick that rapidly widens into the full, near-black event horizon (a
   * static opaque disc — additive glow can't render true black, so this is a
   * long-lived particle, not a vortex layer) wrapped in bright plasma.
   */
  private singularityGrow(at: Vec2, cfg: BlackHoleConfig): void {
    this.impacts.spawn({ durationMs: cfg.growMs * 0.5, size: cfg.radius * 0.15, color: cfg.flashColor, easing: 'easeOut', startScale: 0.05 }, at)
    this.schedule(cfg.growMs * 0.25, () => {
      this.impacts.spawn({ durationMs: cfg.growMs * 0.75, size: cfg.radius, color: cfg.horizonColor, easing: 'easeOutCubic', startScale: 0.05 }, at)
      this.impacts.spawn({ durationMs: cfg.growMs * 0.9, size: cfg.radius * 1.3, color: cfg.plasmaPurple, easing: 'easeOutCubic', startScale: 0.05 }, at)
      this.camera.shake({ magnitude: 8, durationMs: 300 })
    })
  }

  /**
   * MODULE — accretion disk simulation + orbital debris system: layered
   * counter-paced vortices (real orbital motion, never static) reading as a
   * dark event horizon wrapped in bright swirling plasma, with slower rocky
   * debris (occasional "ejecting" embers read as broken meteors) further out.
   */
  private accretionDisk(at: Vec2, cfg: BlackHoleConfig, durationMs: number): void {
    // The perfectly dark event horizon itself — a plain black circle.
    this.particles.emit(
      { count: 1, speed: 0, spread: 0, lifetimeMs: durationMs, size: cfg.radius * 0.62, color: cfg.horizonColor, gravity: 0, fade: false },
      at,
    )
    // Rotating accretion effects around the disc: self-chaining orbit pulses
    // (no vortex bodies — just glints placed at advancing angles).
    this.rotateAccretion(at, cfg, durationMs, 0)
  }

  /** Self-chaining rotation around the event horizon: paired plasma glints on
   *  an inner fast orbit, asteroid specks on an outer slow one — the advancing
   *  angles read as the whole disc spinning, without any vortex geometry. */
  private rotateAccretion(at: Vec2, cfg: BlackHoleConfig, remainingMs: number, angle: number): void {
    if (remainingMs <= 0) return
    // Inner plasma band: two opposed glints, alternating hues, fast orbit.
    const inner = cfg.radius * 0.95
    for (const side of [0, Math.PI]) {
      const a = angle + side
      const spot = { x: at.x + Math.cos(a) * inner, y: at.y + Math.sin(a) * inner }
      const color = side === 0 ? cfg.plasmaBlue : cfg.plasmaPurple
      // Emitted tangentially so each glint streaks along its orbit.
      this.particles.emit({ count: 2, speed: [50, 130], spread: 0.4, direction: a + Math.PI / 2, lifetimeMs: 340, size: 4, color, fade: true }, spot)
    }
    // Occasional hot orange flare on the inner band.
    if (Math.random() < 0.3) {
      const a = angle + Math.random() * Math.PI * 2
      const spot = { x: at.x + Math.cos(a) * inner, y: at.y + Math.sin(a) * inner }
      this.particles.emit({ count: 2, speed: [60, 160], spread: 0.4, direction: a + Math.PI / 2, lifetimeMs: 300, size: 3, color: cfg.plasmaOrange, fade: true }, spot)
    }
    // Outer debris band: asteroid specks on a slower counter-orbit.
    const outer = cfg.radius * 1.7
    const oa = -angle * 0.4
    const spot = { x: at.x + Math.cos(oa) * outer, y: at.y + Math.sin(oa) * outer }
    this.particles.emit({ count: 1, speed: [30, 90], spread: 0.5, direction: oa - Math.PI / 2, lifetimeMs: 420, size: 3.5, color: cfg.asteroidColor, fade: true }, spot)
    const step = 60
    this.schedule(step, () => this.rotateAccretion(at, cfg, remainingMs - step, angle + 0.34))
  }

  /** MODULE — gravitational lensing + nebula: a slow-drifting nebula aura, and
   *  self-chaining pulses of expanding lensing rings + inward-spiraling
   *  particle streams for the black hole's whole open duration. */
  private lensingAndNebula(at: Vec2, cfg: BlackHoleConfig, durationMs: number, id: string): void {
    this.auras.start(
      `${id}:nebula`,
      [{ rate: 6, color: cfg.nebulaColor, size: [14, 26], lifetimeMs: 2200, riseSpeed: [6, 18], drift: 26, spawnWidth: cfg.radius * 2.4, sway: 18, growth: 1.4, fade: true }],
      at,
      durationMs,
    )
    this.pulseLensingRings(at, cfg, durationMs)
    this.pulseInwardStreams(at, cfg, durationMs)
  }

  /** Self-chaining expanding lensing rings — light visibly bending around the
   *  event horizon — for the rest of `remainingMs`. */
  private pulseLensingRings(at: Vec2, cfg: BlackHoleConfig, remainingMs: number): void {
    if (remainingMs <= 0) return
    this.impacts.spawn({ durationMs: 900, size: cfg.radius * 2.2, color: cfg.lensColor, easing: 'easeOut', startScale: 0.3 }, at)
    this.schedule(760, () => this.pulseLensingRings(at, cfg, remainingMs - 760))
  }

  /** Self-chaining streams of glowing particles spiraling inward toward the
   *  horizon, for the rest of `remainingMs`. */
  private pulseInwardStreams(at: Vec2, cfg: BlackHoleConfig, remainingMs: number): void {
    if (remainingMs <= 0) return
    const spot = ringPoint(at, cfg.radius * (1.3 + Math.random() * 1.4))
    const dir = angleBetween(spot, at)
    const palette = [cfg.plasmaBlue, cfg.plasmaPurple, cfg.starColor, cfg.nebulaColor]
    const color = palette[Math.floor(Math.random() * palette.length)]!
    this.particles.emit({ count: 3, speed: [80, 220], spread: 0.5, direction: dir, lifetimeMs: 480, size: 3, color, fade: true }, spot)
    this.schedule(90 + Math.random() * 90, () => this.pulseInwardStreams(at, cfg, remainingMs - 140))
  }

  /** Self-chaining escalating instability through the black hole's back
   *  stretch: lensing intensifies, plasma whitens, debris bursts faster and
   *  harder, and the battlefield begins to vibrate as expiration nears. */
  private instabilityRamp(at: Vec2, cfg: BlackHoleConfig, remainingMs: number, totalRampMs: number): void {
    if (remainingMs <= 0) return
    const intensity = 1 - remainingMs / totalRampMs // 0 → 1 as expiration nears
    this.impacts.spawn({ durationMs: 260, size: cfg.radius * (0.5 + intensity * 0.6), color: cfg.flashColor, easing: 'easeOut', startScale: 0.3 }, at)
    this.particles.emit({ count: Math.round(4 + intensity * 10), speed: [200, 500 + intensity * 300], spread: Math.PI, lifetimeMs: 300, size: 3, color: cfg.flashColor, fade: true }, at)
    if (Math.random() < 0.3 + intensity * 0.5) this.camera.shake({ magnitude: 2 + intensity * 6, durationMs: 140 })
    const interval = 420 - intensity * 260 // pulses come faster as it destabilizes
    this.schedule(interval, () => this.instabilityRamp(at, cfg, remainingMs - interval, totalRampMs))
  }

  /**
   * Collapse (`blackHoleCollapsed`) — MODULES: black hole collapse, judgment
   * targeting. Everything stops, a beat of silence, then a violent implosion
   * leaves a crackling singularity for `singularityHoldMs`. If the server
   * names a victim (`victimAt`), the colossal Judgment Beam fires; otherwise
   * the singularity simply dissipates. Targeting itself is resolved
   * server-side (the "last kingdom to feed it" — see `GameState.blackHole`);
   * this only visualizes whatever the authoritative event names.
   */
  collapseBlackHole(cfg: BlackHoleConfig, victimAt: Vec2 | null): void {
    const at = ARENA_CENTER
    const implodeAt = 180 // the freeze/silence beat before it gives
    const holdStartsAt = implodeAt + 420
    this.schedule(implodeAt, () => this.blackHoleImplode(at, cfg))
    this.schedule(holdStartsAt, () => this.singularityCrackle(at, cfg, cfg.singularityHoldMs))
    this.schedule(holdStartsAt + cfg.singularityHoldMs, () => {
      if (victimAt) this.fireJudgmentBeam(at, victimAt, cfg)
      else this.judgmentAftermath(at, cfg)
    })
  }

  /** The violent implosion: everything nearby rushes inward in one sharp beat,
   *  then collapses into a single impossibly bright point of light. */
  private blackHoleImplode(at: Vec2, cfg: BlackHoleConfig): void {
    const palette = [cfg.plasmaBlue, cfg.plasmaPurple, cfg.asteroidColor, cfg.starColor]
    for (let i = 0; i < 14; i++) {
      const spot = ringPoint(at, cfg.radius * (1.4 + Math.random() * 1.2))
      const dir = angleBetween(spot, at)
      this.particles.emit({ count: 3, speed: [260, 520], spread: 0.3, direction: dir, lifetimeMs: 220, size: 4, color: palette[i % palette.length]!, fade: true }, spot)
    }
    this.impacts.spawn({ durationMs: 320, size: cfg.radius * 0.06, color: cfg.flashColor, easing: 'easeOut', startScale: 1 }, at)
    this.camera.shake({ magnitude: 10, durationMs: 260 })
  }

  /** Self-chaining crackle: a tiny glowing singularity radiating arcs of
   *  cosmic plasma and unstable light, building anticipation for the release. */
  private singularityCrackle(at: Vec2, cfg: BlackHoleConfig, remainingMs: number): void {
    if (remainingMs <= 0) return
    this.impacts.spawn({ durationMs: 160, size: cfg.radius * (0.08 + Math.random() * 0.05), color: cfg.flashColor, easing: 'easeOut', startScale: 0.6 }, at)
    const spot = ringPoint(at, cfg.radius * 0.3)
    this.particles.emit({ count: 2, speed: [40, 140], spread: Math.PI, lifetimeMs: 220, size: 2, color: cfg.plasmaPurple, fade: true }, spot)
    const gap = 90 + Math.random() * 70
    this.schedule(gap, () => this.singularityCrackle(at, cfg, remainingMs - gap))
  }

  /**
   * MODULE — colossal beam renderer: the singularity rotates onto its victim
   * and fires the largest beam in the game for `beamFireMs` (~5s). Built on
   * `BeamSystem`'s own layered solar-laser rendering (corona→plasma→inner→
   * core, already continuously flickering/breathing — the "surge, pulse,
   * fluctuate" is inherent, not bolted on), with traveling gravitational
   * rings + flowing nebula/starlight layered on top, continuous escalating
   * screen shake, and the victim's surroundings tearing apart throughout.
   */
  private fireJudgmentBeam(at: Vec2, victimAt: Vec2, cfg: BlackHoleConfig): void {
    this.beams.spawn(
      {
        chargeMs: cfg.beamChargeMs,
        fireMs: cfg.beamFireMs,
        width: cfg.beamWidth,
        color: cfg.plasmaPurple,
        chargeSize: cfg.beamWidth * 3,
        coreColor: cfg.flashColor,
        innerColor: cfg.plasmaBlue,
        plasmaColor: cfg.plasmaPurple,
        coronaColor: cfg.plasmaPurple,
        emberColor: cfg.starColor,
      },
      at,
      { x: victimAt.x, y: victimAt.y * 2},
    )
    this.pulseBeamRings(at, victimAt, cfg, cfg.beamChargeMs + cfg.beamFireMs)
    this.continuousBeamShake(cfg.beamFireMs, cfg.beamFireMs, cfg.beamChargeMs)
    // The instant the beam fires, the whole screen flashes white for a split
    // second — one giant white particle covering the entire arena.
    this.schedule(cfg.beamChargeMs, () => {
      this.particles.emit(
        { count: 1, speed: 0, spread: 0, lifetimeMs: 150, size: 900, color: 0xffffff, gravity: 0, fade: true },
        ARENA_CENTER,
      )
      this.spaceFractureAtVictim(victimAt, cfg, cfg.beamFireMs)
    })
    this.schedule(cfg.beamChargeMs + cfg.beamFireMs, () => this.judgmentAftermath(at, cfg, victimAt))
  }

  /** Self-chaining rotating gravitational rings traveling down the beam
   *  (reusing the tilted spinning ring projectile), with nebula clouds and
   *  consumed starlight drifting along its length throughout. */
  private pulseBeamRings(at: Vec2, to: Vec2, cfg: BlackHoleConfig, remainingMs: number): void {
    if (remainingMs <= 0) return
    const ring: ProjectileConfig = { durationMs: 260, size: cfg.beamWidth * 1.8, color: cfg.plasmaBlue, easing: 'linear', shape: 'ring', spin: 10, faceDirection: true }
    this.projectiles.spawn(ring, at, to)
    const mid = lerpPoint(at, to, Math.random())
    this.particles.emit({ count: 2, speed: [20, 60], spread: Math.PI, lifetimeMs: 500, size: 10, color: cfg.nebulaColor, fade: true }, mid)
    this.particles.emit({ count: 2, speed: [40, 120], spread: Math.PI, lifetimeMs: 320, size: 2, color: cfg.starColor, fade: true }, mid)
    this.schedule(180, () => this.pulseBeamRings(at, to, cfg, remainingMs - 180))
  }

  /** MODULE — continuous screen shake controller: self-chaining, escalating
   *  shake for the beam's whole fire window — the battlefield barely holding
   *  together under the discharge. `delayMs` offsets the first pulse past the
   *  beam's charge-up so shaking starts exactly when it fires. */
  private continuousBeamShake(remainingMs: number, totalMs: number, delayMs = 0): void {
    if (delayMs > 0) {
      this.schedule(delayMs, () => this.continuousBeamShake(remainingMs, totalMs, 0))
      return
    }
    if (remainingMs <= 0) return
    const progress = 1 - remainingMs / totalMs
    this.camera.shake({ magnitude: 6 + progress * 22, durationMs: 220 })
    const step = 150
    this.schedule(step, () => this.continuousBeamShake(remainingMs - step, totalMs))
  }

  /** MODULE — space fracture effects: self-chaining devastation around the
   *  victim for the beam's whole fire window — repeated space fractures,
   *  expanding gravitational shockwaves, disintegrating asteroids, exploding
   *  stars, and erupting nebula. */
  private spaceFractureAtVictim(at: Vec2, cfg: BlackHoleConfig, remainingMs: number): void {
    if (remainingMs <= 0) return
    this.impacts.spawn({ durationMs: 220, size: 50, color: cfg.flashColor, easing: 'easeOut', startScale: 0.5 }, at)
    this.impacts.spawn({ durationMs: 460, size: 130, color: cfg.lensColor, easing: 'easeOut', startScale: 0.15 }, at)
    this.particles.emit({ count: 8, speed: [140, 380], spread: Math.PI, lifetimeMs: 380, size: 3, color: cfg.asteroidColor, gravity: 60, fade: true }, at)
    this.particles.emit({ count: 12, speed: [180, 480], spread: Math.PI, lifetimeMs: 360, size: 2.5, color: cfg.starColor, fade: true }, at)
    this.particles.emit({ count: 6, speed: [60, 180], spread: Math.PI, lifetimeMs: 620, size: 14, color: cfg.nebulaColor, gravity: -10, fade: true }, at)
    const gap = 220 + Math.random() * 140
    this.schedule(gap, () => this.spaceFractureAtVictim(at, cfg, remainingMs - gap))
  }

  /** MODULE — recovery sequence: once the beam is spent, remaining energy
   *  dissipates into drifting starlight, lensing relaxes, and — at the
   *  victim, if any — debris falls out of orbit as space visibly heals. */
  private judgmentAftermath(at: Vec2, cfg: BlackHoleConfig, victimAt?: Vec2): void {
    this.impacts.spawn({ durationMs: 700, size: cfg.radius * 0.9, color: cfg.lensColor, easing: 'easeOut', startScale: 0.6 }, at)
    this.particles.emit({ count: 26, speed: [40, 140], spread: Math.PI, lifetimeMs: 900, size: 2.5, color: cfg.starColor, gravity: -14, fade: true }, at)
    if (victimAt) {
      this.impacts.spawn({ durationMs: 560, size: 90, color: cfg.lensColor, easing: 'easeOut', startScale: 0.5 }, victimAt)
      this.particles.emit({ count: 14, speed: [60, 180], spread: Math.PI, lifetimeMs: 700, size: 3, color: cfg.asteroidColor, gravity: 120, fade: true }, victimAt)
    }
  }

  // ===========================================================================
  // Orion's Belt (Space utility) — the interception half; the persistent
  // orbiting-asteroid ring itself is a separate SVG layer (`OrionsBeltRing`,
  // mirroring Earth's Natural Terrain). See `OrionsBeltConfig` in types.ts.
  // ===========================================================================

  /**
   * MODULES — gravitational miss detection, projectile deflection, stellar
   * energy transfer. Called once per intercepted `attackMissed` event (see
   * BattlefieldFx, which correlates it against the SAME-tick `abilityCast`).
   * The incoming attack keeps its own real projectile and travels exactly as
   * normal until the very last moment ("gravitational miss detection"); then
   * gravity visibly bends it off to a nearby stone instead of the castle
   * ("projectile deflection") before a stream of stellar energy races from
   * the deflection point back into the Supernova meter ("stellar energy
   * transfer"). An instant (non-projectile) ability skips the travel/bend and
   * just deflects near the castle. Works for ANY current or future attack
   * with no per-ability code, mirroring Black Hole's `interceptIntoBlackHole`.
   */
  deflectByOrionsBelt(
    abilityId: string,
    from: Vec2,
    to: Vec2,
    sourceKingdom: string | null,
    cfg: OrionsBeltConfig,
    fallbackColor: number,
  ): void {
    const def = this.registry.resolve(abilityId) ?? this.defaultEffect
    const themedColor = def?.tintFrom ? themeColor(sourceKingdom, def.tintFrom) : undefined
    const projectile = def ? withColor(def.projectile, themedColor) : undefined
    const color = themedColor ?? fallbackColor
    const deflectAt = ringPoint(to, cfg.deflectOffset)
    if (!projectile) {
      this.orionsDeflection(deflectAt, to, color, cfg)
      return
    }
    // Travels exactly as normal, unmodified, until the very last moment.
    const via = lerpPoint(from, to, cfg.interceptAt)
    this.projectiles.spawn(
      projectile,
      from,
      via,
      () => this.orionsGravityBend(projectile, def, color, via, deflectAt, to, cfg),
      this.makeTrailEmitter(def?.trail, themedColor),
    )
  }

  /** The late bend: from where gravity took hold, the attack curves toward a
   *  nearby stone instead of the castle — a visible swerve, not a snap. */
  private orionsGravityBend(
    projectile: ProjectileConfig,
    def: EffectDefinition | null | undefined,
    color: number,
    via: Vec2,
    deflectAt: Vec2,
    castleAt: Vec2,
    cfg: OrionsBeltConfig,
  ): void {
    const bent: ProjectileConfig = { ...projectile, durationMs: Math.max(90, projectile.durationMs * 0.22), easing: 'easeOut' }
    const baseTrailSize = def?.trail?.particles.size ?? 5
    const trail = this.makeTrailEmitter(
      { emitEveryMs: 10, particles: { count: 2, speed: [20, 80], spread: Math.PI, lifetimeMs: 220, size: baseTrailSize, color, fade: true } },
      undefined,
    )
    this.projectiles.spawn(bent, via, deflectAt, () => this.orionsDeflection(deflectAt, castleAt, color, cfg), trail)
  }

  /** The deflection moment: a nearby celestial stone swings into the shot's
   *  path — bright flash, gravitational ripple, starlight sparkle, a light
   *  screen kick, soft lensing — then a stream of stellar energy races home
   *  to charge the Supernova meter. The attack visibly hit something else,
   *  not the castle, rather than simply vanishing. */
  private orionsDeflection(at: Vec2, castleAt: Vec2, color: number, cfg: OrionsBeltConfig): void {
    this.impacts.spawn({ durationMs: 200, size: 34, color: cfg.flashColor, easing: 'easeOut', startScale: 0.5 }, at)
    this.impacts.spawn({ durationMs: 380, size: 62, color: cfg.glowColor, easing: 'easeOut', startScale: 0.2 }, at)
    this.particles.emit({ count: 10, speed: [120, 320], spread: Math.PI, lifetimeMs: 340, size: 3, color: cfg.asteroidColor, gravity: 60, fade: true }, at)
    this.particles.emit({ count: 8, speed: [80, 220], spread: Math.PI, lifetimeMs: 300, size: 2.5, color: cfg.starColor, fade: true }, at)
    this.particles.emit({ count: 4, speed: [60, 160], spread: Math.PI, lifetimeMs: 260, size: 3, color, fade: true }, at) // the attack's own colour, glancing off
    this.camera.shake({ magnitude: 4, durationMs: 150 })
    this.orionsEnergyTransfer(at, castleAt, cfg)
  }

  /** A stream of stellar energy peeling off the deflection and racing back to
   *  the belt-bearer's own castle — visual feedback that the dodge is
   *  charging the Supernova. */
  private orionsEnergyTransfer(from: Vec2, to: Vec2, cfg: OrionsBeltConfig): void {
    const stream: ProjectileConfig = { durationMs: 300, size: 6, color: cfg.energyColor, easing: 'easeIn', faceDirection: true }
    const trail = this.makeTrailEmitter(
      { emitEveryMs: 16, particles: { count: 2, speed: [10, 60], spread: Math.PI, lifetimeMs: 280, size: 4, color: cfg.energyColor, fade: true } },
      undefined,
    )
    this.projectiles.spawn(
      stream,
      from,
      to,
      (at) => this.impacts.spawn({ durationMs: 200, size: 24, color: cfg.energyColor, easing: 'easeOut', startScale: 0.4 }, at),
      trail,
    )
  }

  // ===========================================================================
  // Cupid's Arrow (Love's medium attack) — see `CupidsArrowConfig` in types.ts.
  // The persistent ambient aura on the infatuated castle is a separate SVG
  // layer (`InfatuatedAura`, mirroring `OrionsBeltRing`), not part of this
  // module. Charming on the surface, unsettling underneath.
  // ===========================================================================

  /**
   * MODULES — magical bow summon, enchanted arrow renderer, ribbon trail,
   * impact animation. A crystal-and-blossom bow gathers at the caster, then
   * looses an arrow that WEAVES to the target — several short hops with
   * alternating perpendicular offset, not a rigid line — trailing ribbons,
   * hearts, and petals, before dissolving into a heart sigil at impact.
   */
  playCupidsArrow(from: Vec2, to: Vec2, cfg: CupidsArrowConfig): void {
    this.cupidsBowSummon(from, cfg)
    this.schedule(cfg.bowGatherMs, () => this.cupidsFireArrow(from, to, cfg))
  }

  /** The bow materializing: golden vines and crystal draw inward, petals and
   *  hearts spiral around it, and a soft aura builds as it draws back. */
  private cupidsBowSummon(at: Vec2, cfg: CupidsArrowConfig): void {
    this.impacts.spawn({ durationMs: cfg.bowGatherMs, size: 30, color: cfg.crystalColor, easing: 'easeOut', startScale: 0.15 }, at)
    this.impacts.spawn({ durationMs: cfg.bowGatherMs * 0.8, size: 46, color: cfg.goldColor, easing: 'easeOut', startScale: 0.25 }, at)
    const pulses = 3
    for (let i = 0; i < pulses; i++) {
      this.schedule((i / pulses) * cfg.bowGatherMs, () => {
        this.particles.emit({ count: 3, speed: [40, 120], spread: Math.PI, lifetimeMs: 360, size: 3, color: cfg.heartColor, gravity: -10, fade: true }, at)
        this.particles.emit({ count: 3, speed: [30, 100], spread: Math.PI, lifetimeMs: 380, size: 3, color: cfg.petalColor, gravity: -6, fade: true }, at)
        this.particles.emit({ count: 4, speed: [60, 160], spread: Math.PI, lifetimeMs: 300, size: 2, color: cfg.dustColor, fade: true }, at)
      })
    }
  }

  /** The arrow's flight: several short weaving hops (alternating perpendicular
   *  offset) instead of a rigid straight line, trailing ribbons/hearts/petals
   *  the whole way, ending in the impact. */
  private cupidsFireArrow(from: Vec2, to: Vec2, cfg: CupidsArrowConfig): void {
    const n = Math.max(2, Math.round(cfg.arrowSegments))
    const legMs = cfg.arrowDurationMs / n
    const dx = to.x - from.x
    const dy = to.y - from.y
    const len = Math.max(1, Math.hypot(dx, dy))
    const perp = { x: -dy / len, y: dx / len } // unit perpendicular to the flight line
    const waypoints: Vec2[] = [from]
    for (let i = 1; i < n; i++) {
      const t = i / n
      const side = i % 2 === 0 ? 1 : -1
      const wave = Math.sin(t * Math.PI) * cfg.weaveAmplitude * side // eases out at both ends
      waypoints.push({
        x: from.x + dx * t + perp.x * wave,
        y: from.y + dy * t + perp.y * wave,
      })
    }
    waypoints.push(to)

    // Bowstring release: a sharp directional flash + spark streak along the aim
    // line, so it clearly reads that an arrow was LOOSED (not just a drifting
    // projectile). Fired the instant the arrow leaves the bow.
    const aim = Math.atan2(dy, dx)
    this.impacts.spawn({ durationMs: 180, size: 28, color: cfg.sigilColor, easing: 'easeOut', startScale: 0.4 }, from)
    this.particles.emit({ count: 8, speed: [260, 520], spread: 0.35, direction: aim, lifetimeMs: 240, size: 3, color: cfg.goldColor, fade: true }, from)

    // The arrow itself — a proper arrow silhouette (shaft + head + fletching)
    // that aims its head down the flight path.
    const arrow: ProjectileConfig = { durationMs: legMs, size: 16, color: cfg.crystalColor, easing: 'linear', faceDirection: true, shape: 'arrow' }
    const trail = this.makeTrailEmitter(
      {
        emitEveryMs: 14,
        particles: { count: 2, speed: [10, 50], spread: Math.PI, lifetimeMs: 340, size: 4, color: cfg.ribbonColor, gravity: -18, fade: true },
      },
      undefined,
    )
    const flyLeg = (leg: number) => {
      const legFrom = waypoints[leg]!
      const legTo = waypoints[leg + 1]!
      this.projectiles.spawn(
        arrow,
        legFrom,
        legTo,
        (at) => {
          // A trailing wisp of hearts + petals marks each turn of the weave.
          this.particles.emit({ count: 2, speed: [20, 70], spread: Math.PI, lifetimeMs: 280, size: 2.5, color: cfg.heartColor, fade: true }, at)
          this.particles.emit({ count: 2, speed: [15, 60], spread: Math.PI, lifetimeMs: 300, size: 3, color: cfg.petalColor, gravity: -8, fade: true }, at)
          if (leg + 1 < waypoints.length - 1) flyLeg(leg + 1)
          else this.cupidsArrowImpact(to, cfg)
        },
        trail,
      )
    }
    flyLeg(0)
  }

  /** The arrow dissolves into pink light, petals, hearts, and expanding rings
   *  of magical energy — a glowing heart sigil briefly appears before fading
   *  into the Infatuated mark (the persistent aura picks up from here). */
  private cupidsArrowImpact(at: Vec2, cfg: CupidsArrowConfig): void {
    this.impacts.spawn({ durationMs: 220, size: 40, color: cfg.sigilColor, easing: 'easeOut', startScale: 0.5 }, at) // the heart sigil flash
    this.impacts.spawn({ durationMs: 380, size: 70, color: cfg.ribbonColor, easing: 'easeOut', startScale: 0.2 }, at)
    this.impacts.spawn({ durationMs: 520, size: 100, color: cfg.crystalColor, easing: 'easeOut', startScale: 0.1 }, at)
    this.particles.emit({ count: 14, speed: [100, 280], spread: Math.PI, lifetimeMs: 460, size: 3, color: cfg.heartColor, gravity: 20, fade: true }, at)
    this.particles.emit({ count: 12, speed: [80, 240], spread: Math.PI, lifetimeMs: 520, size: 4, color: cfg.petalColor, gravity: 40, fade: true }, at)
    this.particles.emit({ count: 10, speed: [140, 340], spread: Math.PI, lifetimeMs: 340, size: 2, color: cfg.dustColor, fade: true }, at)
    this.camera.shake({ magnitude: 3, durationMs: 120 })
  }

  /**
   * MODULE — citizen transfer system. Two tiny glowing citizen spirits skip
   * charmingly between the two castles — outward when Infatuated is applied,
   * home again when it expires (same call, swapped `from`/`to`). Each trails
   * sparkling hearts and merges into the destination castle with a warm burst.
   */
  playCitizenSpirits(from: Vec2, to: Vec2, cfg: CupidsArrowConfig, count = 2): void {
    for (let i = 0; i < count; i++) {
      this.schedule(i * 160, () => this.cupidsOneSpirit(from, to, cfg))
    }
  }

  /** One citizen spirit's skip: a gentle two-hop arc (a little lift at the
   *  midpoint) rather than a flat line, trailing heart sparkles. */
  private cupidsOneSpirit(from: Vec2, to: Vec2, cfg: CupidsArrowConfig): void {
    const lift = -22 - Math.random() * 14 // world-up is negative y
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 + lift }
    const spirit: ProjectileConfig = { durationMs: cfg.spiritDurationMs * 0.5, size: 6, color: cfg.spiritColor, easing: 'easeOut', faceDirection: true }
    const trail = this.makeTrailEmitter(
      { emitEveryMs: 20, particles: { count: 1, speed: [10, 40], spread: Math.PI, lifetimeMs: 320, size: 2.5, color: cfg.heartColor, gravity: -14, fade: true } },
      undefined,
    )
    this.projectiles.spawn(spirit, from, mid, () => {
      const leg2: ProjectileConfig = { ...spirit, durationMs: cfg.spiritDurationMs * 0.5, easing: 'easeIn' }
      this.projectiles.spawn(leg2, mid, to, (at) => this.cupidsSpiritMerge(at, cfg), trail)
    }, trail)
  }

  /** A citizen spirit merging into its destination castle: a burst of warm
   *  light. */
  private cupidsSpiritMerge(at: Vec2, cfg: CupidsArrowConfig): void {
    this.impacts.spawn({ durationMs: 260, size: 26, color: cfg.spiritColor, easing: 'easeOut', startScale: 0.4 }, at)
    this.particles.emit({ count: 8, speed: [60, 180], spread: Math.PI, lifetimeMs: 340, size: 2.5, color: cfg.heartColor, fade: true }, at)
  }

  /**
   * MODULE — shared damage ribbon. Whenever a share of Love's damage
   * redirects to an infatuated kingdom, a ribbon of pink and gold magical
   * energy snaps taut between the two castles — hearts along it cracking and
   * shattering — while the redirected kingdom's sigil flashes and scatters
   * heart fragments + petals. Called once per redirected hit.
   */
  playSharedPainRibbon(loveAt: Vec2, targetAt: Vec2, cfg: CupidsArrowConfig): void {
    const steps = 7
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const pt = { x: loveAt.x + (targetAt.x - loveAt.x) * t, y: loveAt.y + (targetAt.y - loveAt.y) * t }
      this.particles.emit({ count: 1, speed: 0, spread: 0, lifetimeMs: 260, size: 4, color: i % 2 === 0 ? cfg.ribbonColor : cfg.heartColor, gravity: 0, fade: true }, pt)
    }
    // Hearts along the ribbon crack and shatter.
    this.particles.emit({ count: 6, speed: [60, 160], spread: Math.PI, lifetimeMs: 300, size: 2.5, color: cfg.heartColor, gravity: 40, fade: true }, targetAt)
    // Sigil flash + petal burst at the redirected kingdom.
    this.impacts.spawn({ durationMs: 200, size: 34, color: cfg.sigilColor, easing: 'easeOut', startScale: 0.5 }, targetAt)
    this.particles.emit({ count: 8, speed: [80, 200], spread: Math.PI, lifetimeMs: 360, size: 3, color: cfg.petalColor, gravity: 30, fade: true }, targetAt)
    this.camera.shake({ magnitude: 2.5, durationMs: 100 })
  }

  // ===========================================================================
  // BFFS!!! (Love's heavy attack) — the CAST dressing. The persistent link
  // ribbon + shared-damage/status flashes for the whole duration are a separate
  // SVG battlefield overlay (`BffsLinkLayer`), driven by status events. See
  // `BffsConfig` in types.ts.
  // ===========================================================================

  /**
   * MODULES — pendant summon, twin pendant flight, emblem embed, ribbon snap.
   * Two heart pendants gather at the caster, then fly to BOTH selected kingdoms
   * trailing ribbons/hearts/petals, embed as friendship emblems, and a ribbon
   * of enchanted energy snaps taut between them once both arrive.
   */
  playBffs(from: Vec2, toA: Vec2, toB: Vec2, cfg: BffsConfig): void {
    this.bffsPendantSummon(from, cfg)
    this.schedule(cfg.gatherMs, () => {
      this.bffsFlyPendant(from, toA, cfg)
      this.bffsFlyPendant(from, toB, cfg)
      // Once both have arrived, snap the connecting ribbon taut between them.
      this.schedule(cfg.pendantDurationMs, () => this.bffsRibbonSnap(toA, toB, cfg))
    })
  }

  /** Two heart pendants orbit and gather at the caster, wrapped in ribbon. */
  private bffsPendantSummon(at: Vec2, cfg: BffsConfig): void {
    this.impacts.spawn({ durationMs: cfg.gatherMs, size: 34, color: cfg.emblemColor, easing: 'easeOut', startScale: 0.2 }, at)
    const pulses = 3
    for (let i = 0; i < pulses; i++) {
      this.schedule((i / pulses) * cfg.gatherMs, () => {
        this.particles.emit({ count: 3, speed: [40, 120], spread: Math.PI, lifetimeMs: 360, size: 3, color: cfg.heartColor, gravity: -10, fade: true }, at)
        this.particles.emit({ count: 3, speed: [30, 100], spread: Math.PI, lifetimeMs: 340, size: 2.5, color: cfg.goldColor, fade: true }, at)
      })
    }
  }

  /** One pendant flying to a kingdom, trailing ribbon/hearts/petals, embedding
   *  as a friendship emblem on arrival. */
  private bffsFlyPendant(from: Vec2, to: Vec2, cfg: BffsConfig): void {
    const pendant: ProjectileConfig = { durationMs: cfg.pendantDurationMs, size: 9, color: cfg.emblemColor, easing: 'easeInOut', faceDirection: true }
    const trail = this.makeTrailEmitter(
      { emitEveryMs: 16, particles: { count: 2, speed: [10, 50], spread: Math.PI, lifetimeMs: 360, size: 4, color: cfg.ribbonColor, gravity: -12, fade: true } },
      undefined,
    )
    this.projectiles.spawn(pendant, from, to, (at) => this.bffsEmblemEmbed(at, cfg), trail)
  }

  /** A pendant embedding above a castle as a glowing friendship emblem. */
  private bffsEmblemEmbed(at: Vec2, cfg: BffsConfig): void {
    this.impacts.spawn({ durationMs: 280, size: 30, color: cfg.emblemColor, easing: 'easeOut', startScale: 0.4 }, at)
    this.particles.emit({ count: 8, speed: [60, 180], spread: Math.PI, lifetimeMs: 380, size: 3, color: cfg.heartColor, fade: true }, at)
    this.particles.emit({ count: 6, speed: [40, 140], spread: Math.PI, lifetimeMs: 420, size: 3, color: cfg.petalColor, gravity: 20, fade: true }, at)
  }

  /** The connecting ribbon snapping taut between the two kingdoms — a one-shot
   *  flourish (the PERSISTENT swaying ribbon is the SVG overlay). */
  private bffsRibbonSnap(a: Vec2, b: Vec2, cfg: BffsConfig): void {
    const steps = 12
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const pt = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
      this.particles.emit({ count: 1, speed: 0, spread: 0, lifetimeMs: 360, size: 5, color: i % 2 === 0 ? cfg.ribbonColor : cfg.goldColor, gravity: 0, fade: true }, pt)
    }
    // Both emblems pulse as the bond forms.
    for (const end of [a, b]) {
      this.impacts.spawn({ durationMs: 320, size: 40, color: cfg.emblemColor, easing: 'easeOut', startScale: 0.3 }, end)
      this.particles.emit({ count: 6, speed: [60, 160], spread: Math.PI, lifetimeMs: 340, size: 2.5, color: cfg.heartColor, fade: true }, end)
    }
  }

  /**
   * Earthquake (Earth): a heavy primary rupture at the target, then SEISMIC WAVES
   * that race to the other kingdoms and strike each with a lighter secondary
   * impact — so the damage visibly propagates from the origin. Composed of small
   * reusable modules: the trembling buildup, the layered quake impact (branching
   * fractures + stone eruption + dust + debris + shockwave + shake), the traveling
   * seismic wave (a rolling dust ripple), and the lingering settle.
   */
  playEarthquake(at: Vec2, neighbors: Vec2[], cfg: EarthquakeConfig): void {
    // 1. Trembling buildup — the ground rattles: pebbles bounce, small tremors.
    const tremors = 12
    for (let i = 0; i < tremors; i++) {
      this.schedule((i / tremors) * cfg.buildupMs, () => {
        this.camera.shake({ magnitude: 2 + i * 0.8, durationMs: cfg.buildupMs / tremors + 40 })
        this.particles.emit(
          { count: 5, speed: [50, 150], spread: 0.9, direction: -Math.PI / 2, lifetimeMs: 460, size: 2.5, color: cfg.rockColor, gravity: 520, fade: true },
          at,
        )
      })
    }
    // 2. Primary rupture after the buildup.
    this.schedule(cfg.buildupMs, () => this.quakeImpact(at, cfg, 1))
    // 3. A big ground shockwave ring rolling outward from the origin.
    this.schedule(cfg.buildupMs + 30, () =>
      this.impacts.spawn({ durationMs: 900, size: 360, color: cfg.dustColor, easing: 'easeOut', startScale: 0.05 }, at),
    )
    // 4. Seismic waves race to each other kingdom, striking it as they arrive.
    for (const nb of neighbors) {
      const travelMs = Math.max(120, (distance(at, nb) / cfg.waveSpeed) * 1000)
      this.schedule(cfg.buildupMs + 120, () => {
        const wave: ProjectileConfig = { durationMs: travelMs, size: 9, color: cfg.dustColor, easing: 'linear' }
        const dustWake = this.makeTrailEmitter(
          { emitEveryMs: 26, particles: { count: 4, speed: [20, 90], spread: Math.PI, lifetimeMs: 560, size: 11, color: cfg.dustColor, gravity: -8, fade: true } },
          undefined,
        )
        this.projectiles.spawn(wave, at, nb, (arr) => this.quakeImpact(arr, cfg, 0.5), dustWake)
      })
    }
  }

  /**
   * A single quake impact. `scale` 1 = the primary rupture (heavy), 0.5 = a
   * secondary aftershock (clearly weaker but still dangerous): branching glowing
   * fractures, erupting stone, flying gravel, rolling dust, a shockwave, a screen
   * kick scaled to severity, and lingering debris that keeps falling after.
   */
  private quakeImpact(at: Vec2, cfg: EarthquakeConfig, scale: number): void {
    const primary = scale >= 1
    // Ground fractures: glowing branching cracks splitting outward (procedural
    // jagged polylines, tinted like molten rock rather than electricity).
    const cracks = Math.round(4 * scale) + 3
    for (let i = 0; i < cracks; i++) {
      const a = (i / cracks) * Math.PI * 2 + (Math.random() - 0.5) * 0.6
      const reach = cfg.radius * scale * (0.7 + Math.random() * 0.6)
      const end = { x: at.x + Math.cos(a) * reach, y: at.y + Math.sin(a) * reach * 0.55 }
      this.lightning.spawn(
        { durationMs: 240, coreColor: cfg.coreColor, glowColor: cfg.glowColor, coreWidth: 3 * scale, glowWidth: 10 * scale, jaggedness: 0.5, subdivisions: 4, branchChance: 0.6, impactArcs: 0 },
        at,
        end,
      )
    }
    // Expanding shockwave ring across the ground.
    this.impacts.spawn({ durationMs: 460, size: 130 * scale, color: cfg.rockColor, easing: 'easeOut', startScale: 0.2 }, at)
    // Stone pillars / rock fragments erupting UPWARD, then falling under gravity.
    this.particles.emit({ count: Math.round(16 * scale), speed: [220, 500], spread: 0.7, direction: -Math.PI / 2, lifetimeMs: 720, size: 6 * scale, color: cfg.rockColor, gravity: 540, fade: true }, at)
    // Flying dirt + gravel thrown outward.
    this.particles.emit({ count: Math.round(14 * scale), speed: [160, 420], spread: Math.PI, lifetimeMs: 600, size: 3, color: cfg.gravelColor, gravity: 470, fade: true }, at)
    // Thick rolling dust clouds (slow, rise, and linger).
    this.particles.emit({ count: Math.round(10 * scale), speed: [40, 140], spread: Math.PI, lifetimeMs: 1150, size: 16 * scale, color: cfg.dustColor, gravity: -14, fade: true }, at)
    // Screen kick — heavy for the primary, lighter for aftershocks.
    this.camera.shake({ magnitude: primary ? 16 : 7, durationMs: primary ? 540 : 240 })
    // Loose debris keeps falling a beat after the eruption.
    this.schedule(220, () =>
      this.particles.emit({ count: Math.round(8 * scale), speed: [80, 200], spread: 0.9, direction: -Math.PI / 2, lifetimeMs: 820, size: 4 * scale, color: cfg.rockColor, gravity: 500, fade: true }, at),
    )
  }

  /**
   * Builds a per-frame callback that streams a trail's particle puffs along a
   * projectile's path at a fixed cadence, or `undefined` when there's no trail.
   * The `tintFrom` colour override (if any) recolours the trail like every other
   * sub-effect. Kept private so trails stay data-driven, not per-ability code.
   */
  private makeTrailEmitter(
    trail: EffectDefinition['trail'],
    color: number | undefined,
  ): ((at: Vec2, dtMs: number) => void) | undefined {
    if (!trail) return undefined
    const puff = withColor(trail.particles, color)
    if (!puff) return undefined
    const everyMs = trail.emitEveryMs ?? 24
    let sinceEmit = everyMs // emit on the first frame
    return (at, dtMs) => {
      sinceEmit += dtMs
      if (sinceEmit < everyMs) return
      sinceEmit = 0
      this.particles.emit(puff, at)
    }
  }

  /** Visualize a status/aura by its id at a point (no projectile phase). */
  playStatus(statusId: string, at: Vec2, sourceKingdom?: string | null): void {
    const def = this.registry.resolve(statusId)
    if (!def) return
    const color = def.tintFrom ? themeColor(sourceKingdom, def.tintFrom) : undefined
    this.burst(def, at, color)
  }

  /** Registers persistent status-aura definitions, keyed by status id. */
  registerAuras(defs: Record<string, AuraDefinition>): void {
    for (const [id, def] of Object.entries(defs)) this.auraRegistry.set(id, def)
  }

  /** Begin a Thunderdome cage around a target (keyed per target). */
  startThunderdome(key: string, at: Vec2, config: ThunderdomeConfig): void {
    this.thunderdomes.start(key, at, config)
  }

  /** Collapse a Thunderdome (graceful retract) when its status expires. */
  stopThunderdome(key: string): void {
    this.thunderdomes.stop(key)
  }

  /** Surge a Thunderdome — Electricity hit the trapped target. No-op if none. */
  surgeThunderdome(key: string): void {
    this.thunderdomes.surge(key)
  }

  /** Begin Acid Rain / Corroded on a target (keyed per target). */
  startAcidRain(key: string, at: Vec2, config: AcidRainConfig): void {
    this.acidRains.start(key, at, config)
  }

  /** Dissolve Acid Rain (rain stops, cloud drifts to vapor) when Corroded ends. */
  stopAcidRain(key: string): void {
    this.acidRains.stop(key)
  }

  /** Intensify Acid Rain — a fresh Poison landed while Corroded. No-op if none. */
  surgeAcidRain(key: string): void {
    this.acidRains.surge(key)
  }

  /** True while a live (non-dissolving) Acid Rain cloud exists under `key`. */
  hasAcidRain(key: string): boolean {
    return this.acidRains.has(key)
  }

  /** Begin a Frost aura (Flood of Frost) on a target (keyed per target). */
  startFrost(key: string, at: Vec2, config: FrostAuraConfig): void {
    this.frostAuras.start(key, at, config)
  }

  /** Enhance a Frost aura — Chilling Retribution landed (magical energy + runes,
   *  and it persists until stopped). No-op if none. */
  enhanceFrost(key: string): void {
    this.frostAuras.enhance(key)
  }

  /** Pulse a Frost aura — the target's cooldowns were slowed. No-op if none. */
  pulseFrost(key: string): void {
    this.frostAuras.pulse(key)
  }

  /** Melt a Frost aura (ice thaws to mist) when its status ends. */
  stopFrost(key: string): void {
    this.frostAuras.stop(key)
  }

  /** True while a live (non-melting) Frost aura exists under `key`. */
  hasFrost(key: string): boolean {
    return this.frostAuras.has(key)
  }

  /**
   * Freeze to the Core cast: freezing energy spirals INWARD onto the target for a
   * beat, then a brilliant icy-blue flash + explosive crystal growth erupts
   * around it. The lingering encasement (ice cube + cold atmosphere) is driven
   * separately by the `frozen` status, so this is just the dramatic freeze.
   */
  playFreezeCast(at: Vec2, config: FrostAuraConfig): void {
    this.frostAuras.gather(at, config) // energy spirals in
    this.camera.shake({ magnitude: 3, durationMs: 560 }) // rising buildup rumble
    this.schedule(560, () => {
      // Brilliant flash: a bright white core inside a wide icy-blue ring.
      this.impacts.spawn({ durationMs: 200, size: 78, color: 0xffffff, easing: 'easeOut', startScale: 0.4 }, at)
      this.impacts.spawn({ durationMs: 480, size: 168, color: config.frostColor, easing: 'easeOut' }, at)
      // Explosive crystal growth + a heavy freeze kick.
      this.frostAuras.erupt(at, config)
      this.camera.shake({ magnitude: 12, durationMs: 440 })
    })
  }

  /**
   * Begin a persistent aura for a status (Heat Wave smoke, Blazing Determination
   * flames) at a castle. `key` is unique per (status, castle) so it can be
   * stopped later; a `shakeOnStart` fires only when the aura first begins, not
   * on refresh. Unregistered status ids are ignored.
   */
  startAura(statusId: string, key: string, at: Vec2, durationMs?: number): void {
    const def = this.auraRegistry.get(statusId)
    if (!def) return
    if (def.shakeOnStart && !this.auras.has(key)) this.camera.shake(def.shakeOnStart)
    this.auras.start(key, def.emitters, at, durationMs)
  }

  /** Stop a persistent aura (its particles finish naturally). */
  stopAura(key: string): void {
    this.auras.stop(key)
  }

  private burst(def: EffectDefinition, at: Vec2, color: number | undefined): void {
    const impact = withColor(def.impact, color)
    if (impact) this.impacts.spawn(impact, at)
    const particles = withColor(def.particles, color)
    if (particles) this.particles.emit(particles, at)
    if (def.shake) this.camera.shake(def.shake)
  }

  /** Drops all in-flight effects (e.g. on match end) without tearing down pools. */
  clear(): void {
    this.scheduled = [] // cancel any pending barrage strikes/corona
    this.projectiles.clear()
    this.impacts.clear()
    this.particles.clear()
    this.beams.clear()
    this.vortices.clear()
    this.waves.clear()
    this.lightning.clear()
    this.thunderdomes.clear()
    this.acidRains.clear()
    this.frostAuras.clear()
    this.auras.clear()
    this.timeline.clear()
    this.camera.clear()
  }

  destroy(): void {
    this.clear()
  }
}
