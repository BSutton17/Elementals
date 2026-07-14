import type { EffectDefinition } from './types'

// Per-ability effect definitions (Epic 9), keyed by the authoritative ability id
// the server's `abilityCast` event carries. Registered into the framework's
// EffectRegistry; unregistered abilities fall back to the generic themed effect.
// Abilities are added one at a time as they're polished.

/**
 * Fireball — Fire's basic attack. A searing orange core streaks to the target
 * in a straight line, then bursts into a fiery shockwave and a shower of embers
 * that arc down under gravity, with a short screen kick.
 */
const FIREBALL: EffectDefinition = {
  projectile: {
    durationMs: 420, // straight-line travel time A→B (data-editable)
    size: 14,
    color: 0xff7a3c,
    easing: 'linear',
    faceDirection: true,
  },
  impact: {
    durationMs: 320,
    size: 64,
    color: 0xffa640,
    easing: 'easeOut',
  },
  particles: {
    count: 22,
    speed: [180, 460],
    spread: Math.PI, // full-circle ember burst
    lifetimeMs: 560,
    size: 5,
    color: 0xffb84a,
    gravity: 300,
    fade: true,
  },
  shake: { magnitude: 6, durationMs: 200 },
}

/** All registered ability effects, keyed by ability id. */
export const ABILITY_EFFECTS: Record<string, EffectDefinition> = {
  fireball: FIREBALL,
}
