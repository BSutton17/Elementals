import { useEffect, useState } from 'react'
import { GiEagleEmblem } from 'react-icons/gi'
import { CastleSprite } from './CastleSprite'
import { getCastleOutline } from '../game/kingdomThemes'
import { HealthBar } from './HealthBar'
import { ShieldBar, DEFAULT_MAX_SHIELD, EARTH_MAX_SHIELD } from './ShieldBar'
import { ShieldOverlay } from './ShieldOverlay'
import { FrozenOverlay } from './FrozenOverlay'
import { NaturalTerrainRing } from './NaturalTerrainRing'
import { OrionsBeltRing } from './OrionsBeltRing'
import { InfatuatedAura } from './InfatuatedAura'
import { LoveGaloreAura } from './LoveGaloreAura'
import { CitizenDisplay } from './CitizenDisplay'
import { IncomeDisplay } from './IncomeDisplay'
import type { GamePlayer } from '../game/gameState'

/** Fade-out duration for the Bird's Eye emblem after the buff ends, ms. */
const BIRDS_EYE_FADE_MS = 700

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
  ultShield = false,
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
  /** This kingdom's shield came from its ULTIMATE (Earth's Brick Wall) — render
   *  the fortress hexadecagon instead of the normal circle. */
  ultShield?: boolean
  /** Called when this kingdom is clicked (used to select it as your target). */
  onSelect?: () => void
}) {
  const selectable = onSelect != null
  // Water's "Current" mark (from Waterfall): the castle looks half-submerged.
  const submerged = player.statuses?.some((s) => s.id === 'current') ?? false
  // Ice's Frozen: the whole castle is encased in a block of ice.
  const frozen = (player.statuses?.some((s) => s.id === 'frozen') ?? false) && !player.eliminated

  // Earth's Natural Terrain: a protective ring of stone guardians orbits the
  // castle while the buff is active. Kept mounted through its crumble-away
  // deactivation, then removed (like the Bird's Eye emblem).
  const hasNaturalTerrain =
    (player.statuses?.some((s) => s.id === 'naturalTerrain') ?? false) && !player.eliminated
  const [terrain, setTerrain] = useState(false)
  useEffect(() => {
    if (hasNaturalTerrain) setTerrain(true)
  }, [hasNaturalTerrain])
  // Space's Orion's Belt: a miniature system of orbiting celestial bodies
  // surrounds the castle while the buff is active. Kept mounted through its
  // orbital-decay deactivation, then removed (like Natural Terrain).
  const hasOrionsBelt =
    (player.statuses?.some((s) => s.id === 'orionsBelt') ?? false) && !player.eliminated
  const [belt, setBelt] = useState(false)
  useEffect(() => {
    if (hasOrionsBelt) setBelt(true)
  }, [hasOrionsBelt])
  // Love's Cupid's Arrow: the "infatuated" mark — a gentle enchanted aura
  // surrounds the castle while it lasts. Kept mounted through its fade-out
  // deactivation, then removed (like Orion's Belt / Natural Terrain).
  const hasInfatuated =
    (player.statuses?.some((s) => s.id === 'infatuated') ?? false) && !player.eliminated
  const [infatuated, setInfatuated] = useState(false)
  useEffect(() => {
    if (hasInfatuated) setInfatuated(true)
  }, [hasInfatuated])
  // Love's "Love Galore": once the ultimate REVEALS (server-synced `revealed`
  // flag on the shield status), swirling ribbons + the ultimate icon bloom over
  // the castle. Hidden during the stealth phase. Kept mounted through its
  // fade-out, then removed.
  const hasLoveGalore =
    (player.statuses?.some((s) => s.id === 'loveGaloreShield' && s.revealed) ?? false) &&
    !player.eliminated
  const [loveGalore, setLoveGalore] = useState(false)
  useEffect(() => {
    if (hasLoveGalore) setLoveGalore(true)
  }, [hasLoveGalore])
  // Active shield: a ring around the kingdom in its colour. Every shield is a
  // circle except Earth's ultimate (Brick Wall), which is a hexadecagon.
  const shielded = player.castle.shield > 0 && !player.eliminated

  // Bird's Eye View: an eagle emblem hovers above the castle for the buff's
  // whole duration — fading in when it starts and out when it ends.
  const hasBirdsEye = player.statuses?.some((s) => s.id === 'birdsEyeView') ?? false
  const [birdsEye, setBirdsEye] = useState<'in' | 'out' | null>(null)
  useEffect(() => {
    if (hasBirdsEye) {
      setBirdsEye('in')
      return
    }
    // Buff ended: fade out (only if it was showing), then remove.
    setBirdsEye((prev) => (prev === 'in' ? 'out' : null))
    const timer = setTimeout(() => setBirdsEye(null), BIRDS_EYE_FADE_MS)
    return () => clearTimeout(timer)
  }, [hasBirdsEye])

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

      {/* Your own name is hidden above your castle (you know it's yours). */}
      {!isYou && (
        <text y={-124} className="battlefield__name" data-testid="kingdom-name">
          {player.name}
        </text>
      )}

      {/* Bird's Eye View emblem — floats above the castle for the buff's
          duration, fading in on start and out on end. */}
      {birdsEye && (
        <g transform="translate(0 -178)">
          <g className={`kingdom-site__birdseye kingdom-site__birdseye--${birdsEye}`} aria-hidden="true">
            <GiEagleEmblem size={72} x={-36} y={-36} color={color} />
          </g>
        </g>
      )}

      {showStats && (
        <>
          <g transform="translate(0 -106)">
            <ShieldBar
              shield={player.castle.shield}
              maxShield={player.kingdomId === 'earth' ? EARTH_MAX_SHIELD : DEFAULT_MAX_SHIELD}
            />
          </g>
          <g transform="translate(0 -92)">
            <HealthBar hp={player.castle.hp} maxHp={player.castle.maxHp} />
          </g>
        </>
      )}

      <g transform="translate(0 24)">
        <CastleSprite
          color={color}
          outline={getCastleOutline(player.kingdomId)}
          eliminated={player.eliminated}
        />
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
          sides={ultShield ? 16 : undefined}
        />
      )}

      {/* Frozen: a block of ice encasing the castle (in front of the sprite). */}
      {frozen && (
        <g transform="translate(0 24)">
          <FrozenOverlay />
        </g>
      )}

      {/* Natural Terrain: orbiting stone guardians protecting the Earth castle. */}
      {terrain && (
        <g transform="translate(0 24)">
          <NaturalTerrainRing active={hasNaturalTerrain} onExpired={() => setTerrain(false)} />
        </g>
      )}

      {/* Orion's Belt: a miniature orbiting asteroid system protecting Space. */}
      {belt && (
        <g transform="translate(0 24)">
          <OrionsBeltRing active={hasOrionsBelt} onExpired={() => setBelt(false)} />
        </g>
      )}

      {/* Cupid's Arrow: the gentle enchanted "infatuated" aura. */}
      {infatuated && (
        <g transform="translate(0 24)">
          <InfatuatedAura active={hasInfatuated} onExpired={() => setInfatuated(false)} />
        </g>
      )}

      {/* Love Galore: the revealed ultimate — swirling ribbons + its icon. */}
      {loveGalore && (
        <g transform="translate(0 24)">
          <LoveGaloreAura active={hasLoveGalore} onExpired={() => setLoveGalore(false)} />
        </g>
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
