const WIDTH = 150
const HEIGHT = 13

/** Green → amber → red as the castle weakens. */
function healthColor(fraction: number): string {
  if (fraction > 0.5) return '#5fd97a'
  if (fraction > 0.25) return '#ffc857'
  return '#ff5a5a'
}

/**
 * Health bar renderer (ticket #195): Castle HP above a kingdom, filled
 * proportionally and recolored as it drains. Pure render of the synchronized
 * state — every `state:sync` re-render moves it.
 */
export function HealthBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const fraction = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0
  return (
    <g
      className="health-bar"
      data-testid="health-bar"
      data-hp={hp}
      data-max-hp={maxHp}
    >
      <title>{`${hp} / ${maxHp} HP`}</title>
      <rect
        x={-WIDTH / 2}
        width={WIDTH}
        height={HEIGHT}
        rx={HEIGHT / 2}
        fill="rgba(255,255,255,0.12)"
      />
      <rect
        data-testid="health-bar-fill"
        x={-WIDTH / 2}
        width={WIDTH * fraction}
        height={HEIGHT}
        rx={HEIGHT / 2}
        fill={healthColor(fraction)}
      />
    </g>
  )
}
