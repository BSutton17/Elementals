import { useEffect, useRef, useState } from 'react'
import type { VolcanoSnapshot } from '../../game/gameState'
import './VolcanoLayer.css'

// Magma's "The End of the World", drawn in the middle of the arena SVG.
//
// A mountain everyone can see, everyone can click, and everyone can watch bleed
// — because breaking it in time is a job none of them can do alone. The whole
// ability is a forced truce: for twenty seconds the table either cooperates or
// all goes down together, and none of that reads unless the health bar and the
// clock are public.
//
// It is deliberately the largest thing on the field. It has to dominate the
// board the way it dominates the next twenty seconds of the match.

/** Arena-space centre of the battlefield — where the mountain rises. */
const CX = 500
const CY = 500
/**
 * Half-width of the mountain's base, in arena units. Deliberately wider than
 * it is tall: a squat, heavy mountain sits ON the battlefield, where a tall
 * narrow one reads as a spire floating in front of it.
 */
const HALF_BASE = 236
/** How far the rim stands above the centre line. */
const HEIGHT = 166
/** Where the foot of the mountain meets the ground. */
const BASE_Y = 122
/** The crater's two rim tips — the notch between them is the mouth. */
const RIM_L = -52
const RIM_R = 44

/** How long the mountain takes to crumble away once it is broken. */
const DEATH_MS = 2600

export function VolcanoLayer({
  volcano,
  tickRate,
  onTarget,
  targeted = false,
}: {
  volcano: VolcanoSnapshot | null
  tickRate: number
  /** Clicking the mountain aims at it. Omitted for spectators and for Magma,
   *  who cannot attack their own eruption. */
  onTarget?: () => void
  /** True while this player is aiming at the volcano. */
  targeted?: boolean
}) {
  // The mountain has to outlive the state that describes it: when the server
  // clears `volcano`, it should crumble rather than vanish on a frame. So the
  // last snapshot is held and replayed through a death animation.
  const [dying, setDying] = useState<VolcanoSnapshot | null>(null)
  const last = useRef<VolcanoSnapshot | null>(null)

  useEffect(() => {
    if (volcano) {
      last.current = volcano
      setDying(null)
      return
    }
    if (!last.current) return
    // It was standing a moment ago and is gone now — see it out.
    const corpse = last.current
    last.current = null
    setDying(corpse)
    const timer = setTimeout(() => setDying(null), DEATH_MS)
    return () => clearTimeout(timer)
  }, [volcano])

  const shown = volcano ?? dying
  if (!shown) return null

  const isDying = volcano === null
  const hpFraction = Math.max(0, Math.min(1, shown.hp / Math.max(1, shown.maxHp)))
  const seconds = Math.max(0, Math.ceil(shown.ticksRemaining / Math.max(1, tickRate)))
  // The last five seconds are the ones that decide it.
  const urgent = !isDying && seconds <= 5

  return (
    <g
      className={`volcano${isDying ? ' volcano--dying' : ''}`}
      data-testid="volcano"
      data-dying={isDying || undefined}
    >
      <g className="volcano__body">
        {/* The ground it sits on, so the mountain has weight rather than
            floating over the battlefield. */}
        <ellipse
          className="volcano__shadow"
          cx={CX}
          cy={CY + BASE_Y}
          rx={HALF_BASE + 16}
          ry={30}
        />

        {/* The silhouette: broad concave flanks rising to a broken-open crater
            notch, rather than a clean triangle. The concavity is what makes it
            read as a volcano and not as a hill — real cones flare out at the
            foot and steepen toward the rim. */}
        <path
          className="volcano__rock"
          d={`M ${CX - HALF_BASE} ${CY + BASE_Y}
              C ${CX - 196} ${CY + BASE_Y - 46}, ${CX - 122} ${CY - 34}, ${CX + RIM_L - 20} ${CY - HEIGHT + 30}
              L ${CX + RIM_L} ${CY - HEIGHT}
              L ${CX - 10} ${CY - HEIGHT + 24}
              L ${CX + RIM_R} ${CY - HEIGHT + 6}
              C ${CX + 108} ${CY - HEIGHT + 56}, ${CX + 176} ${CY + BASE_Y - 54}, ${CX + HALF_BASE} ${CY + BASE_Y}
              Z`}
        />

        {/* The lit face. A lighter wedge down the left flank gives the cone
            form — without it the silhouette is a flat cut-out. */}
        <path
          className="volcano__face"
          d={`M ${CX + RIM_L} ${CY - HEIGHT + 2}
              C ${CX - 108} ${CY - 40}, ${CX - 168} ${CY + BASE_Y - 52}, ${CX - HALF_BASE + 10} ${CY + BASE_Y}
              L ${CX - 40} ${CY + BASE_Y} Z`}
        />

        {/* Ridges catching the light on the way down — texture, so the flanks
            are not two flat fills. */}
        <path
          className="volcano__ridge"
          d={`M ${CX - 24} ${CY - HEIGHT + 34} q -34 62 -58 108`}
        />
        <path
          className="volcano__ridge"
          d={`M ${CX + 40} ${CY - HEIGHT + 36} q 30 58 62 100`}
        />

        {/* Molten veins glowing through the rock. */}
        <path
          className="volcano__vein"
          d={`M ${CX - 6} ${CY - HEIGHT + 40} q -18 44 -10 78 q 8 34 -10 60`}
        />
        <path
          className="volcano__vein"
          d={`M ${CX + 26} ${CY - HEIGHT + 44} q 20 40 14 74`}
        />

        {/* Lava spilling over the rim and running down the flanks — the
            mountain is already live before anyone touches it. */}
        <path
          className="volcano__flow"
          d={`M ${CX + RIM_L + 14} ${CY - HEIGHT + 14}
              q -30 58 -18 106 q 12 44 -20 84`}
        />
        <path
          className="volcano__flow volcano__flow--thin"
          d={`M ${CX + RIM_R - 12} ${CY - HEIGHT + 16}
              q 34 54 22 104 q -10 42 22 86`}
        />
        <path
          className="volcano__flow volcano__flow--thin"
          d={`M ${CX + 4} ${CY - HEIGHT + 20} q 8 66 -4 116`}
        />

        {/* The molten pool sitting in the crater notch, brighter the closer it
            is to going off. */}
        <ellipse
          className={`volcano__crater${urgent ? ' volcano__crater--urgent' : ''}`}
          cx={CX - 4}
          cy={CY - HEIGHT + 13}
          rx={48}
          ry={15}
        />
        {/* A white-hot core inside the pool. */}
        <ellipse
          className={`volcano__core${urgent ? ' volcano__core--urgent' : ''}`}
          cx={CX - 4}
          cy={CY - HEIGHT + 13}
          rx={24}
          ry={7}
        />

        {/* Smoke venting from the mouth, drifting up and thinning out. */}
        <g className="volcano__smoke" aria-hidden="true">
          <ellipse cx={CX - 8} cy={CY - HEIGHT - 18} rx={26} ry={17} />
          <ellipse cx={CX + 14} cy={CY - HEIGHT - 44} rx={20} ry={13} />
          <ellipse cx={CX - 18} cy={CY - HEIGHT - 66} rx={15} ry={10} />
        </g>
      </g>

      {/* The hit area. A generous rectangle over the whole mountain rather
          than the rock path itself: this is the one target on the board that
          everybody has to be able to hit in a hurry. */}
      {onTarget && !isDying && (
        <rect
          className="volcano__hit"
          data-testid="volcano-hit"
          x={CX - HALF_BASE}
          y={CY - HEIGHT - 16}
          width={HALF_BASE * 2}
          height={HEIGHT + BASE_Y + 16}
          onClick={onTarget}
          role="button"
          aria-label="Attack the volcano"
        />
      )}

      {targeted && !isDying && (
        <rect
          className="volcano__reticle"
          x={CX - HALF_BASE - 6}
          y={CY - HEIGHT - 22}
          width={(HALF_BASE + 6) * 2}
          height={HEIGHT + BASE_Y + 28}
          rx={14}
        />
      )}

      {/* Health and clock, public to the whole table. */}
      {!isDying && (
        <g className="volcano__hud" data-testid="volcano-hud">
          <rect
            className="volcano__bar-bg"
            x={CX - 150}
            y={CY - HEIGHT - 118}
            width={300}
            height={20}
            rx={10}
          />
          <rect
            className="volcano__bar-fill"
            x={CX - 150}
            y={CY - HEIGHT - 118}
            width={Math.max(0, 300 * hpFraction)}
            height={20}
            rx={10}
          />
          <text className="volcano__hp" x={CX} y={CY - HEIGHT - 103} textAnchor="middle">
            {Math.max(0, Math.round(shown.hp))} / {Math.round(shown.maxHp)}
          </text>
          <text
            className={`volcano__clock${urgent ? ' volcano__clock--urgent' : ''}`}
            x={CX}
            y={CY - HEIGHT - 132}
            textAnchor="middle"
          >
            {seconds}
          </text>
        </g>
      )}
    </g>
  )
}
