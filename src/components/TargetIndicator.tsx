import type { KingdomPosition } from '../game/placement'

/** How far from a kingdom's center an indicator starts and stops. */
const START_OFFSET = 130
const END_OFFSET = 150

/**
 * Target indicator renderer (ticket #199): an arrow from an attacking kingdom
 * toward the kingdom it currently targets, tinted with the attacker's color.
 * The player's own arrow is emphasized. Pure render of synchronized `target`
 * fields, so indicators appear/move the moment a target changes.
 */
export function TargetIndicator({
  from,
  to,
  color,
  isYou = false,
  fromId,
  toId,
}: {
  from: KingdomPosition
  to: KingdomPosition
  color: string
  isYou?: boolean
  fromId: string
  toId: string
}) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  if (length <= START_OFFSET + END_OFFSET) return null
  const ux = dx / length
  const uy = dy / length

  const x1 = from.x + ux * START_OFFSET
  const y1 = from.y + uy * START_OFFSET
  const x2 = to.x - ux * END_OFFSET
  const y2 = to.y - uy * END_OFFSET

  // Arrowhead at the target end, built from the direction's normal.
  const head = 14
  const nx = -uy
  const ny = ux
  const tip = `${x2 + ux * head},${y2 + uy * head}`
  const left = `${x2 + nx * (head / 2)},${y2 + ny * (head / 2)}`
  const right = `${x2 - nx * (head / 2)},${y2 - ny * (head / 2)}`

  return (
    <g
      className={`target-indicator${isYou ? ' target-indicator--you' : ''}`}
      data-testid="target-indicator"
      data-from={fromId}
      data-to={toId}
      opacity={isYou ? 0.95 : 0.45}
    >
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={isYou ? 6 : 3.5}
        strokeLinecap="round"
        strokeDasharray={isYou ? undefined : '10 8'}
      />
      <polygon points={`${tip} ${left} ${right}`} fill={color} />
    </g>
  )
}
