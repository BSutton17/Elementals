import { useEffect, useState } from 'react'
import { GiEagleEmblem, GiDreamCatcher } from 'react-icons/gi'
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
  slotDisplay = null,
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
  /** Joker's Slot Machine readout above this kingdom: "Spinning…" while their
   *  reels turn, then the emojis they landed. Null when there's nothing to say. */
  slotDisplay?: { text: string; spinning: boolean } | null
  /** Called when this kingdom is clicked (used to select it as your target). */
  onSelect?: () => void
}) {
  const selectable = onSelect != null
  // Water's "Current" mark (from Waterfall): the castle looks half-submerged.
  // Rough advance width for the 26px label font — enough to place the badge
  // beside the name without measuring text, which SVG makes awkward and which
  // would cost a layout pass every frame.
  const nameWidth = player.name.length * 13
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
  // Dark's Never-ending Nightmare: a dream catcher hangs over the victim's
  // castle for the whole lock, so everyone can see who is barred from
  // attacking — the restriction is public, not a private surprise.
  const nightmared =
    (player.statuses?.some((s) => s.id === 'neverEndingNightmare') ?? false) &&
    !player.eliminated
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

      {/* Every kingdom is named, your own included. The level sits to the left
          of the name, and both are visible to everyone — an opponent's level is
          part of reading the table.

          Guests and bots have no level, so the badge is simply absent for them.
          A dash or a zero would read as a rendering fault rather than as "this
          player has no account". */}
      <g transform={`translate(0 ${-124})`} data-testid="kingdom-label">
        {player.level != null && (
          <>
            <rect
              x={-nameWidth / 2 - 34}
              y={-17}
              width={28}
              height={22}
              rx={4}
              className="battlefield__level-box"
            />
            <text
              x={-nameWidth / 2 - 20}
              className="battlefield__level"
              data-testid="kingdom-level"
            >
              {player.level}
            </text>
          </>
        )}
        {/* Your own name is marked. It used to be hidden entirely — "you know
            it's yours" — and now that every kingdom is named, something has to
            answer the same question at a glance on a ring of seven castles. */}
        <text
          className={`battlefield__name${isYou ? ' battlefield__name--you' : ''}`}
          data-testid="kingdom-name"
        >
          {player.name}
        </text>
      </g>

      {/* Joker's Slot Machine, from the OUTSIDE: whoever owes a spin reads
          "Spinning…" until their reels stop, then shows the symbols they
          landed — never what those symbols did to them. */}
      {slotDisplay && (
        <text
          y={-146}
          className={`battlefield__slot${slotDisplay.spinning ? ' battlefield__slot--spinning' : ''}`}
          data-testid="kingdom-slot"
        >
          {slotDisplay.text}
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

      {/* Never-ending Nightmare: the dream catcher, hung above the castle for
          as long as the victim is locked to their basic attack. */}
      {nightmared && (
        <g transform="translate(0 -178)">
          <g className="kingdom-site__nightmare" aria-hidden="true">
            <GiDreamCatcher size={76} x={-38} y={-38} color="#f7f7f2" />
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
          // Resolved by the server, so a client one release behind still shows
          // a stranger the right castle rather than the wrong one.
          paint={player.castlePaint}
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
