import { useEffect, useId, useRef, useState } from 'react'
import type { MonsterSnapshot } from '../../game/gameState'
import { MONSTER_BOX, MONSTER_NAMES, MonsterBody, type MonsterKind } from './monsters'
import './MonsterLayer.css'

/**
 * The monster, in the middle of the arena.
 *
 * It belongs to nobody, it hits the whole table, and it leaves when it is dead
 * — so everything about it is public: the health bar, the name, what its next
 * swing will cost, and how long you have before it lands.
 *
 * ⚠️ THE CLOCK MEANS THE OPPOSITE OF THE VOLCANO'S. A volcano's countdown is
 * "how long you have to break it"; this one is "how long until it hits you
 * again", and it never runs out — killing it is the only way to stop it. So the
 * number is drawn next to the damage it is about to deal rather than on its
 * own, because those two facts are only useful together: 900 in four seconds is
 * a reason to buy a shield, 900 eventually is not.
 */

/** Arena-space centre of the battlefield. */
const CX = 500
const CY = 500
/** Where the creature's feet meet the ground, relative to the centre. */
const GROUND_Y = 118
/** Arena units per monster unit. Monsters are drawn ~200 units wide. */
const SCALE = 1.34
/** How long the corpse takes to fall once the server stops sending it. */
const DEATH_MS = 2200

export function MonsterLayer({
  monster,
  tickRate,
  onTarget,
  targeted = false,
}: {
  monster: MonsterSnapshot | null
  tickRate: number
  /** Clicking it aims at it. Omitted for spectators. */
  onTarget?: () => void
  /** True while this player is aiming at the monster. */
  targeted?: boolean
}) {
  // Like the volcano, it has to outlive the state that describes it: when the
  // server clears `monster` the thing should fall over, not blink out.
  const [dying, setDying] = useState<MonsterSnapshot | null>(null)
  const last = useRef<MonsterSnapshot | null>(null)
  // Namespaces the creature's gradient ids, so a second copy of this layer
  // anywhere in the document cannot steal its fills.
  const uid = useId().replace(/:/g, '')

  useEffect(() => {
    if (monster) {
      last.current = monster
      setDying(null)
      return
    }
    if (!last.current) return
    const corpse = last.current
    last.current = null
    setDying(corpse)
    const timer = setTimeout(() => setDying(null), DEATH_MS)
    return () => clearTimeout(timer)
  }, [monster])

  const shown = monster ?? dying
  if (!shown) return null

  const isDying = monster === null
  // ⚠️ AN UNKNOWN KIND STILL DRAWS THE FURNITURE. The server decides which
  // monster spawned; a client that has not shipped that one yet must degrade to
  // "something is there, here is its health" rather than to a blank arena.
  const kind: MonsterKind = shown.kind ?? 'rock'
  const box = MONSTER_BOX[kind] ?? MONSTER_BOX.rock
  const hpFraction = Math.max(0, Math.min(1, shown.hp / Math.max(1, shown.maxHp)))
  const seconds = Math.max(0, Math.ceil(shown.ticksUntilAttack / Math.max(1, tickRate)))
  // The last breath before a swing lands is when a shield still helps.
  const imminent = !isDying && seconds <= 3

  const halfWidth = box.halfWidth * SCALE
  const height = box.height * SCALE
  const top = CY + GROUND_Y - height

  return (
    <g
      className={`monster-layer${isDying ? ' monster-layer--dying' : ''}`}
      data-testid="monster"
      data-kind={kind}
      data-dying={isDying || undefined}
    >
      {/* The ground it stands on. Without it the creature floats. */}
      <ellipse
        className="monster-layer__shadow"
        cx={CX}
        cy={CY + GROUND_Y}
        rx={halfWidth * 0.92}
        ry={26}
      />

      <g
        className="monster-layer__body"
        transform={`translate(${CX} ${CY + GROUND_Y}) scale(${SCALE})`}
      >
        <MonsterBody kind={kind} uid={uid} />
      </g>

      {/* The hit area: a generous rectangle over the whole creature rather than
          its own outline. Everyone at the table has to be able to hit this in a
          hurry, and half of them are on a phone. */}
      {onTarget && !isDying && (
        <rect
          className="monster-layer__hit"
          data-testid="monster-hit"
          x={CX - halfWidth}
          y={top - 12}
          width={halfWidth * 2}
          height={height + 30}
          onClick={onTarget}
          role="button"
          aria-label={`Attack the ${MONSTER_NAMES[kind] ?? 'monster'}`}
        />
      )}

      {targeted && !isDying && (
        <rect
          className="monster-layer__reticle"
          x={CX - halfWidth - 8}
          y={top - 20}
          width={(halfWidth + 8) * 2}
          height={height + 44}
          rx={16}
        />
      )}

      {!isDying && (
        <g className="monster-layer__hud" data-testid="monster-hud">
          <text className="monster-layer__name" x={CX} y={top - 74} textAnchor="middle">
            {MONSTER_NAMES[kind] ?? 'Monster'}
          </text>
          <rect
            className="monster-layer__bar-bg"
            x={CX - 160}
            y={top - 62}
            width={320}
            height={20}
            rx={10}
          />
          <rect
            className="monster-layer__bar-fill"
            x={CX - 160}
            y={top - 62}
            width={Math.max(0, 320 * hpFraction)}
            height={20}
            rx={10}
          />
          <text className="monster-layer__hp" x={CX} y={top - 47} textAnchor="middle">
            {Math.max(0, Math.round(shown.hp))} / {Math.round(shown.maxHp)}
          </text>
          {/* The two numbers that decide what you do next, together: what the
              next swing costs and how long until it lands. */}
          <text
            className={`monster-layer__threat${imminent ? ' monster-layer__threat--imminent' : ''}`}
            x={CX}
            y={top - 24}
            textAnchor="middle"
          >
            {Math.round(shown.attackDamage)} in {seconds}s
          </text>
        </g>
      )}
    </g>
  )
}
