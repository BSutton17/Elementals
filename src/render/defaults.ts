import type { EffectDefinition } from './types'

// Generic fallback effect (Epic 9, ticket #210). Any ability without a
// registered definition still animates — a themed projectile that travels A→B,
// then a burst on impact — so a brand-new kingdom is visualized with zero code
// changes. Per-ability definitions (later tickets) override this per id.
export const DEFAULT_ABILITY_EFFECT: EffectDefinition = {
  projectile: {
    durationMs: 450,
    size: 12,
    color: 0xffffff,
    easing: 'linear',
    faceDirection: true,
  },
  impact: { durationMs: 260, size: 44, color: 0xffffff, easing: 'easeOut' },
  particles: {
    count: 14,
    speed: [140, 320],
    spread: Math.PI,
    lifetimeMs: 480,
    size: 4,
    color: 0xffffff,
    gravity: 220,
    fade: true,
  },
  shake: { magnitude: 4, durationMs: 160 },
  // Tint the whole effect with the casting kingdom's theme colour.
  tintFrom: 'primary',
}
