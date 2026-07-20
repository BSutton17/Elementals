// Core animation framework (Epic 9, ticket #210) — public API.
//
// The framework is a reusable, data-driven PixiJS renderer. It never contains
// gameplay logic and never computes gameplay; later tickets feed it authoritative
// server events. `PixiStage` is the mount point; `AnimationFramework` is the
// façade that drives the projectile / impact / particle / camera systems from an
// id-keyed effect registry.

export type {
  Vec2,
  DisplayNode,
  EasingName,
  ThemeToken,
  ProjectileConfig,
  TrailConfig,
  BeamConfig,
  VortexConfig,
  WaveConfig,
  AuraEmitterConfig,
  AuraDefinition,
  ImpactConfig,
  ParticleBurstConfig,
  CameraShakeConfig,
  EffectDefinition,
} from './types'

export { PixiStage, type PixiStageOptions } from './stage'
export {
  AnimationFramework,
  type NodeFactories,
  type FrameworkOptions,
  type PlayArgs,
} from './framework'
export { EffectRegistry } from './registry'
export { DEFAULT_ABILITY_EFFECT } from './defaults'
export { Camera } from './camera'
export { ObjectPool, type PoolOptions } from './pool'
export { AnimationTimeline, Tween, type Animation } from './timeline'
export { ProjectileSystem } from './systems/projectiles'
export { ImpactSystem } from './systems/impacts'
export { ParticleSystem, type ParticleSystemOptions } from './systems/particles'
export { BeamSystem } from './systems/beams'
export { VortexSystem } from './systems/vortex'
export { WaveSystem } from './systems/wave'
export { AuraSystem } from './systems/aura'
export { LayerManager, LAYER_ORDER, type LayerName } from './layers'
export { themeColor, hexToNumber } from './colors'
export { lerp, lerpPoint, angleBetween, distance } from './trajectory'
export { ease, EASINGS, clamp01, type EasingFn } from './easing'
export { UNIT_RADIUS, resetDisplayNode } from './nodeUtil'
