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
  impact?: ImpactConfig
  particles?: ParticleBurstConfig
  shake?: CameraShakeConfig
  tintFrom?: ThemeToken
}
