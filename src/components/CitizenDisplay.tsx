/**
 * Citizen display renderer (ticket #197): the kingdom's current citizen count
 * beside a small person glyph, drawn under the castle.
 */
export function CitizenDisplay({ citizens }: { citizens: number }) {
  return (
    <g className="citizen-display" data-testid="citizens" data-citizens={citizens}>
      <title>{`${citizens} citizens`}</title>
      {/* A minimal person glyph (head + shoulders). */}
      <circle cx={-16} cy={-5} r={4.5} fill="#cdd4e2" />
      <path d="M -24 6 a 8 8 0 0 1 16 0 z" fill="#cdd4e2" />
      <text x={-4} y={6} className="battlefield__stat-text">
        {citizens}
      </text>
    </g>
  )
}
