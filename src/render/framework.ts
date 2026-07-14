import type { DisplayNode, EffectDefinition, Vec2 } from './types'
import { ProjectileSystem } from './systems/projectiles'
import { ImpactSystem } from './systems/impacts'
import { ParticleSystem, type ParticleSystemOptions } from './systems/particles'
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
  readonly camera: Camera
  readonly timeline = new AnimationTimeline()
  readonly registry = new EffectRegistry()
  private readonly defaultEffect: EffectDefinition | null

  constructor(nodes: NodeFactories, options: FrameworkOptions = {}) {
    const baseRadius = options.baseRadius ?? UNIT_RADIUS
    this.projectiles = new ProjectileSystem(nodes.projectile, baseRadius)
    this.impacts = new ImpactSystem(nodes.impact, baseRadius)
    this.particles = new ParticleSystem(nodes.particle, baseRadius, options.particles)
    this.camera = options.camera ?? new Camera()
    this.defaultEffect =
      options.defaultEffect === undefined ? DEFAULT_ABILITY_EFFECT : options.defaultEffect
  }

  /** Advances every system from a single delta time (driven by the stage ticker). */
  update(dtMs: number): void {
    this.projectiles.update(dtMs)
    this.impacts.update(dtMs)
    this.particles.update(dtMs)
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
    const projectile = withColor(def.projectile, color)
    if (projectile) {
      this.projectiles.spawn(projectile, args.from, args.to, (at) => this.burst(def, at, color))
    } else {
      this.burst(def, args.to, color)
    }
  }

  /** Visualize a status/aura by its id at a point (no projectile phase). */
  playStatus(statusId: string, at: Vec2, sourceKingdom?: string | null): void {
    const def = this.registry.resolve(statusId)
    if (!def) return
    const color = def.tintFrom ? themeColor(sourceKingdom, def.tintFrom) : undefined
    this.burst(def, at, color)
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
    this.timeline.clear()
    this.camera.clear()
  }

  destroy(): void {
    this.clear()
  }
}
