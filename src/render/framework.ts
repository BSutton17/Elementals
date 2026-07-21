import type {
  AuraDefinition,
  BoltNode,
  DisplayNode,
  EffectDefinition,
  LightningBarrageConfig,
  LightningConfig,
  ParticleBurstConfig,
  ThunderdomeConfig,
  Vec2,
} from './types'
import { ProjectileSystem } from './systems/projectiles'
import { ImpactSystem } from './systems/impacts'
import { ParticleSystem, type ParticleSystemOptions } from './systems/particles'
import { BeamSystem } from './systems/beams'
import { VortexSystem } from './systems/vortex'
import { WaveSystem } from './systems/wave'
import { LightningSystem } from './systems/lightning'
import { ThunderdomeSystem } from './systems/thunderdome'
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
    this.projectiles = new ProjectileSystem(nodes.projectile, baseRadius)
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
    this.auras.clear()
    this.timeline.clear()
    this.camera.clear()
  }

  destroy(): void {
    this.clear()
  }
}
