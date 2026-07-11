const WIDTH = 150
const HEIGHT = 8

/**
 * Shield bar renderer (ticket #196): Shield HP drawn independently from (and
 * above) Castle Health. Renders nothing while the kingdom has no shield, so
 * visibility tracks shield gain/destruction automatically. Shields have no
 * hard cap, so the fill is scaled against the castle's max HP and clamped.
 */
export function ShieldBar({ shield, maxHp }: { shield: number; maxHp: number }) {
  if (shield <= 0) return null
  const fraction = maxHp > 0 ? Math.min(1, shield / maxHp) : 1
  return (
    <g className="shield-bar" data-testid="shield-bar" data-shield={shield}>
      <title>{`${shield} shield`}</title>
      <rect
        x={-WIDTH / 2}
        width={WIDTH}
        height={HEIGHT}
        rx={HEIGHT / 2}
        fill="rgba(255,255,255,0.12)"
      />
      <rect
        data-testid="shield-bar-fill"
        x={-WIDTH / 2}
        width={WIDTH * fraction}
        height={HEIGHT}
        rx={HEIGHT / 2}
        fill="#6fd0ff"
      />
    </g>
  )
}
