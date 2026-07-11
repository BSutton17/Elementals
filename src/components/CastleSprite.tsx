/**
 * Castle renderer (ticket #194): the visual representation of one kingdom's
 * castle, drawn as a parametric SVG group centered on (0, 0). Everything is
 * driven by props (color, eliminated) and grouped under stable class names so
 * future tickets can layer on animations, upgrade variants, and hit effects
 * without touching callers.
 */
export function CastleSprite({
  color,
  eliminated = false,
}: {
  color: string
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
      <rect x={-20} y={-58} width={40} height={46} rx={3} fill={color} stroke="#0b0e17" strokeWidth={3} />
      {/* Keep battlements */}
      <rect x={-20} y={-64} width={10} height={10} fill={color} stroke="#0b0e17" strokeWidth={2} />
      <rect x={-5} y={-64} width={10} height={10} fill={color} stroke="#0b0e17" strokeWidth={2} />
      <rect x={10} y={-64} width={10} height={10} fill={color} stroke="#0b0e17" strokeWidth={2} />
      {/* Curtain wall */}
      <rect x={-52} y={-24} width={104} height={54} rx={4} fill={color} stroke="#0b0e17" strokeWidth={3} />
      {/* Wall battlements */}
      <rect x={-52} y={-32} width={12} height={12} fill={color} stroke="#0b0e17" strokeWidth={2} />
      <rect x={-30} y={-32} width={12} height={12} fill={color} stroke="#0b0e17" strokeWidth={2} />
      <rect x={18} y={-32} width={12} height={12} fill={color} stroke="#0b0e17" strokeWidth={2} />
      <rect x={40} y={-32} width={12} height={12} fill={color} stroke="#0b0e17" strokeWidth={2} />
      {/* Gate */}
      <path d="M -11 30 v -20 a 11 11 0 0 1 22 0 v 20 z" fill="#0b0e17" opacity={0.8} />
      {/* Banner */}
      <line x1={0} y1={-64} x2={0} y2={-84} stroke="#0b0e17" strokeWidth={3} />
      <path d="M 0 -84 l 22 6 l -22 6 z" fill={color} stroke="#0b0e17" strokeWidth={2} />
    </g>
  )
}
