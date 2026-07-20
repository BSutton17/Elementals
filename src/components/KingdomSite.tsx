import { CastleSprite } from './CastleSprite'
import { HealthBar } from './HealthBar'
import { ShieldBar } from './ShieldBar'
import { ShieldOverlay } from './ShieldOverlay'
import { CitizenDisplay } from './CitizenDisplay'
import { IncomeDisplay } from './IncomeDisplay'
import type { GamePlayer } from '../game/gameState'

/**
 * One kingdom's spot on the battlefield: castle (#194) with name, health bar
 * (#195), shield bar (#196), citizen count (#197), and income (#198), all
 * centered on the position chosen by the placement math (#193).
 */
export function KingdomSite({
  player,
  color,
  x,
  y,
  isYou,
  isYourTarget,
  tickRate,
  showStats = true,
  onSelect,
}: {
  player: GamePlayer
  color: string
  x: number
  y: number
  isYou: boolean
  isYourTarget: boolean
  tickRate: number
  showStats?: boolean
  /** Called when this kingdom is clicked (used to select it as your target). */
  onSelect?: () => void
}) {
  const selectable = onSelect != null
  // Water's "Current" mark (from Waterfall): the castle looks half-submerged.
  const submerged = player.statuses?.some((s) => s.id === 'current') ?? false
  // Active shield: a ring around the kingdom in its colour. Earth's fortress
  // shield renders as an octagon; every other shield is a circle.
  const shielded = player.castle.shield > 0 && !player.eliminated
  return (
    <g
      className={`kingdom-site${selectable ? ' kingdom-site--selectable' : ''}`}
      data-testid="kingdom-site"
      data-player-id={player.id}
      transform={`translate(${x} ${y})`}
      onClick={onSelect}
      role={selectable ? 'button' : undefined}
      aria-label={selectable ? `Target ${player.name}` : undefined}
    >
      {/* Ring highlighting the kingdom you are targeting. */}
      {isYourTarget && (
        <circle
          className="kingdom-site__target-ring"
          data-testid="target-ring"
          r={125}
          fill="none"
          stroke="#ff5a5a"
          strokeWidth={4}
          strokeDasharray="16 10"
          opacity={0.8}
        />
      )}

      <text y={-124} className="battlefield__name" data-testid="kingdom-name">
        {player.name}
        {isYou ? ' (You)' : ''}
      </text>

      {showStats && (
        <>
          <g transform="translate(0 -106)">
            <ShieldBar shield={player.castle.shield} maxHp={player.castle.maxHp} />
          </g>
          <g transform="translate(0 -92)">
            <HealthBar hp={player.castle.hp} maxHp={player.castle.maxHp} />
          </g>
        </>
      )}

      <g transform="translate(0 24)">
        <CastleSprite color={color} eliminated={player.eliminated} />
      </g>

      {/* "Current" mark: a translucent, gently-bobbing water plane over the
          lower castle so it reads as half-submerged. Drawn after (in front of)
          the castle in the same local space as the sprite. */}
      {submerged && !player.eliminated && (
        <g transform="translate(0 24)">
          <g className="kingdom-site__submerge" data-testid="submerged" aria-hidden="true">
            <path
              className="kingdom-site__submerge-body"
              d="M -56 -2 q 14 -8 28 0 t 28 0 t 28 0 t 28 0 L 56 42 L -56 42 Z"
            />
            <path
              className="kingdom-site__submerge-surface"
              d="M -56 -2 q 14 -8 28 0 t 28 0 t 28 0 t 28 0"
            />
          </g>
        </g>
      )}

      {/* Active shield bubble, in front of the castle so it reads as a dome. */}
      {shielded && (
        <ShieldOverlay
          shield={player.castle.shield}
          color={color}
          octagon={player.kingdomId === 'earth'}
        />
      )}

      {player.eliminated ? (
        <text y={78} className="battlefield__eliminated" data-testid="eliminated">
          ELIMINATED
        </text>
      ) : (
        showStats && (
          <>
            <g transform="translate(-38 72)">
              <CitizenDisplay citizens={player.economy.citizens} />
            </g>
            <g transform="translate(38 72)">
              <IncomeDisplay
                incomePerTick={player.economy.incomePerTick}
                tickRate={tickRate}
              />
            </g>
          </>
        )
      )}
    </g>
  )
}
