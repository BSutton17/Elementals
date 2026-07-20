import type { AuraDefinition, DisplayNode, EffectDefinition, Vec2 } from './types'
import { ProjectileSystem } from './systems/projectiles'
import { ImpactSystem } from './systems/impacts'
import { ParticleSystem, type ParticleSystemOptions } from './systems/particles'
import { BeamSystem } from './systems/beams'
import { VortexSystem } from './systems/vortex'
import { WaveSystem } from './systems/wave'
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
  readonly auras: AuraSystem
  readonly camera: Camera
  readonly timeline = new AnimationTimeline()
  readonly registry = new EffectRegistry()
  /** Persistent status-aura definitions, keyed by status id. */
  readonly auraRegistry = new Map<string, AuraDefinition>()
  private readonly defaultEffect: EffectDefinition | null

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
    this.projectiles.update(dtMs)
    this.impacts.update(dtMs)
    this.particles.update(dtMs)
    this.beams.update(dtMs)
    this.vortices.update(dtMs)
    this.waves.update(dtMs)
    this.auras.update(dtMs)
    this.timeline.update(dtMs)
    this.camera.update(dtMs)
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
    this.projectiles.clear()
    this.impacts.clear()
    this.particles.clear()
    this.beams.clear()
    this.vortices.clear()
    this.waves.clear()
    this.auras.clear()
    this.timeline.clear()
    this.camera.clear()
  }

  destroy(): void {
    this.clear()
  }
}
