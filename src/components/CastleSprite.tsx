import { DEFAULT_CASTLE_OUTLINE } from '../game/kingdomThemes'

/**
 * Castle renderer (ticket #194): the visual representation of one kingdom's
 * castle, drawn as a parametric SVG group centered on (0, 0). Everything is
 * driven by props (color, outline, eliminated) and grouped under stable class
 * names so future tickets can layer on animations, upgrade variants, and hit
 * effects without touching callers.
 *
 * `outline` exists because the default near-black stroke vanishes on a castle
 * that is itself dark — Dark's theme flips it to white so the silhouette still
 * reads against the battlefield.
 */
export function CastleSprite({
  color,
  outline = DEFAULT_CASTLE_OUTLINE,
  eliminated = false,
}: {
  color: string
  outline?: string
  eliminated?: boolean
}) {
  return (
    <g
      className="castle"
      data-testid="castle"
      data-eliminated={eliminated || undefined}
      opacity={eliminated ? 0.35 : 1}
    >
      {/* Keep (center tower) */}
      <rect x={-20} y={-58} width={40} height={46} rx={3} fill={color} stroke={outline} strokeWidth={3} />
      {/* Keep battlements */}
      <rect x={-20} y={-64} width={10} height={10} fill={color} stroke={outline} strokeWidth={2} />
      <rect x={-5} y={-64} width={10} height={10} fill={color} stroke={outline} strokeWidth={2} />
      <rect x={10} y={-64} width={10} height={10} fill={color} stroke={outline} strokeWidth={2} />
      {/* Curtain wall */}
      <rect x={-52} y={-24} width={104} height={54} rx={4} fill={color} stroke={outline} strokeWidth={3} />
      {/* Wall battlements */}
      <rect x={-52} y={-32} width={12} height={12} fill={color} stroke={outline} strokeWidth={2} />
      <rect x={-30} y={-32} width={12} height={12} fill={color} stroke={outline} strokeWidth={2} />
      <rect x={18} y={-32} width={12} height={12} fill={color} stroke={outline} strokeWidth={2} />
      <rect x={40} y={-32} width={12} height={12} fill={color} stroke={outline} strokeWidth={2} />
      {/* Gate — filled with the dark default so it always reads as a recess,
          but outlined like the rest so the arch stays visible on a castle whose
          own colour is dark (Dark's white outline). */}
      <path
        d="M -11 30 v -20 a 11 11 0 0 1 22 0 v 20 z"
        fill={DEFAULT_CASTLE_OUTLINE}
        stroke={outline}
        strokeWidth={2}
        opacity={0.8}
      />
      {/* Banner */}
      <line x1={0} y1={-64} x2={0} y2={-84} stroke={outline} strokeWidth={3} />
      <path d="M 0 -84 l 22 6 l -22 6 z" fill={color} stroke={outline} strokeWidth={2} />
    </g>
  )
}
