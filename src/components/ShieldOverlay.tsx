/**
 * Persistent shield overlay around a castle (state-driven, like the "Current"
 * submerge overlay). A translucent shape in the kingdom's colour with a darker
 * border marking the edge; cracks appear (and multiply) as it nears breaking.
 * Every shield is a circle — EXCEPT Earth's ultimate (Brick Wall), whose
 * fortress shield renders as a faceted hexadecagon that cracks later (bigger
 * pool). The one-shot shatter when it hits 0 is handled by the Pixi layer via
 * the `shieldDestroyed` event (see BattlefieldFx).
 */

/** Shield radius in SVG user units, just inside the target ring (r=125). */
const SHIELD_R = 116
/** HP at/below which cracks start forming — higher for the big fortress shield. */
const CIRCLE_CRACK_HP = 500
const FORTRESS_CRACK_HP = 1000

export function ShieldOverlay({
  shield,
  color,
  sides,
}: {
  shield: number
  color: string
  /** Render as a regular polygon with this many sides (Brick Wall = 16).
   *  Omitted/0 renders the default circular shield. */
  sides?: number
}) {
  const R = SHIELD_R
  const faceted = !!sides && sides > 2
  const threshold = faceted ? FORTRESS_CRACK_HP : CIRCLE_CRACK_HP
  const cracked = shield <= threshold
  // 0.25 → 1 as the shield falls from the crack threshold toward 0.
  const intensity = cracked ? Math.min(1, Math.max(0.25, (threshold - shield) / threshold)) : 0
  const edge = darken(color, 0.5)

  const cracks = buildCracks(R)
  const visibleCracks = cracked ? Math.max(1, Math.round(intensity * cracks.length)) : 0

  return (
    <g className="kingdom-site__shield" data-testid="shield" aria-hidden="true">
      {faceted ? (
        <polygon
          className="kingdom-site__shield-shape"
          points={polygonPoints(R, sides!)}
          fill={color}
          fillOpacity={0.12}
          stroke={edge}
          strokeWidth={5}
        />
      ) : (
        <circle
          className="kingdom-site__shield-shape"
          r={R}
          fill={color}
          fillOpacity={0.12}
          stroke={edge}
          strokeWidth={5}
        />
      )}
      {visibleCracks > 0 && (
        <g
          className="kingdom-site__shield-cracks"
          stroke={edge}
          strokeWidth={2.4}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.5 + 0.45 * intensity}
        >
          {cracks.slice(0, visibleCracks).map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      )}
    </g>
  )
}

/** Vertices of a flat-topped regular `n`-gon of circumradius `R`, centered on
 *  the origin (Brick Wall's fortress shield uses n = 16). */
function polygonPoints(R: number, n: number): string {
  const pts: string[] = []
  const step = (Math.PI * 2) / n
  for (let i = 0; i < n; i++) {
    const a = step / 2 + i * step // half-step offset → flat top, not a vertex
    pts.push(`${(Math.cos(a) * R).toFixed(1)},${(Math.sin(a) * R).toFixed(1)}`)
  }
  return pts.join(' ')
}

/** A handful of jagged crack polylines, scaled to the shield radius `R`. */
function buildCracks(R: number): string[] {
  const p = (fx: number, fy: number) => `${(fx * R).toFixed(1)} ${(fy * R).toFixed(1)}`
  return [
    `M ${p(0.02, -0.12)} L ${p(0.18, 0.02)} L ${p(0.08, 0.28)} L ${p(0.34, 0.52)}`,
    `M ${p(0.24, -0.44)} L ${p(0.06, -0.12)} L ${p(0.26, 0.08)} L ${p(0.12, 0.46)}`,
    `M ${p(-0.32, 0.18)} L ${p(-0.1, 0.04)} L ${p(-0.22, -0.22)} L ${p(-0.48, -0.36)}`,
    `M ${p(-0.06, 0.1)} L ${p(-0.22, 0.34)} L ${p(-0.02, 0.52)}`,
  ]
}

/** Multiplies an `#rrggbb` colour toward black by `factor` (0–1) for the edge. */
function darken(hex: string, factor: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const r = Math.round(((n >> 16) & 255) * factor)
  const g = Math.round(((n >> 8) & 255) * factor)
  const b = Math.round((n & 255) * factor)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}
