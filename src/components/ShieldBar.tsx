const WIDTH = 150
const HEIGHT = 8

/** Default shield-bar scale — the standard shield ceiling. Earth's fortress
 *  shields (its ultimate) are much larger, so they scale against a bigger max. */
export const DEFAULT_MAX_SHIELD = 1750
export const EARTH_MAX_SHIELD = 5000

/**
 * Shield bar renderer (ticket #196): Shield HP drawn independently from (and
 * above) Castle Health. Renders nothing while the kingdom has no shield, so
 * visibility tracks shield gain/destruction automatically. The fill scales
 * against the shield ceiling (`maxShield`), not the castle's max HP, and clamps.
 */
export function ShieldBar({ shield, maxShield = DEFAULT_MAX_SHIELD }: { shield: number; maxShield?: number }) {
  if (shield <= 0) return null
  const fraction = maxShield > 0 ? Math.min(1, shield / maxShield) : 1
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
