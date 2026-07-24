import type {
  AuraDefinition,
  BoltNode,
  DisplayNode,
  EffectDefinition,
  AcidRainConfig,
  EarthquakeConfig,
  FrostAuraConfig,
  LightningBarrageConfig,
  LightningConfig,
  MeteorShowerConfig,
  ParticleBurstConfig,
  ProjectileConfig,
  ThunderdomeConfig,
  Vec2,
  WindDeflectionConfig,
} from './types'
import { angleBetween, distance } from './trajectory'
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

  constructor(nodes: NodeFactories, options: FrameworkOptions = {}) {
    const baseRadius = options.baseRadius ?? UNIT_RADIUS
    this.projectiles = new ProjectileSystem(
      nodes.projectile,
      baseRadius,
      undefined,
      nodes.projectileTriangle ? { triangle: nodes.projectileTriangle } : undefined,
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
