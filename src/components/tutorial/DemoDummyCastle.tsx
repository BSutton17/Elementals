import { KingdomSite } from '../KingdomSite'
import { SANDBOX_TICK_RATE, type SandboxDummy, type SandboxHit } from '../../game/useTutorialSandbox'
import type { GamePlayer } from '../../game/gameState'
// The battlefield's own styles so the demo castle looks exactly like the real
// thing (selectable glow, name plate, submerge effect, elimination text…).
import '../BattlefieldView.css'

// A single castle rendered with the REAL battlefield components inside a small
// stand-alone SVG stage — the walkthrough's practice target (or your own keep).

interface DemoDummyCastleProps {
  name: string
  kingdomId: string
  color: string
  hp: number
  maxHp: number
  shield?: number
  statuses?: SandboxDummy['statuses']
  eliminated?: boolean
  citizens?: number
  incomePerSecond?: number
  isYou?: boolean
  isYourTarget?: boolean
  onSelect?: () => void
  /** Latest outgoing hit — pops a floating damage number over the castle. */
  hit?: SandboxHit | null
  /** Latest incoming-hit seq — flashes an impact burst (defense demo). */
  incomingSeq?: number
}

export function DemoDummyCastle({
  name,
  kingdomId,
  color,
  hp,
  maxHp,
  shield = 0,
  statuses = [],
  eliminated = false,
  citizens = 10,
  incomePerSecond = 10,
  isYou = false,
  isYourTarget = false,
  onSelect,
  hit = null,
  incomingSeq,
}: DemoDummyCastleProps) {
  const player: GamePlayer = {
    id: isYou ? 'you' : 'dummy',
    name,
    kingdomId,
    castle: { hp, maxHp, shield },
    economy: {
      citizens,
      currency: 0,
      incomePerTick: incomePerSecond / SANDBOX_TICK_RATE,
    },
    target: null,
    eliminated,
    statuses,
  }

  return (
    <svg
      className="howto-stage"
      viewBox="-210 -215 420 350"
      role="img"
      aria-label={isYou ? 'Your castle' : `Practice target: ${name}`}
      data-testid="demo-castle"
    >
      <KingdomSite
        player={player}
        color={color}
        x={0}
        y={0}
        isYou={isYou}
        isYourTarget={isYourTarget}
        tickRate={SANDBOX_TICK_RATE}
        onSelect={onSelect}
      />

      {/* Floating damage number — re-keyed per hit so the pop replays. */}
      {hit && (
        <text key={hit.seq} className="howto-stage__damage" x={70} y={-40} aria-hidden="true">
          -{hit.amount}
        </text>
      )}

      {/* Incoming impact burst (defense demo) — re-keyed per strike. */}
      {incomingSeq != null && incomingSeq > 0 && (
        <g key={incomingSeq} aria-hidden="true">
          <circle className="howto-stage__impact" cx={-60} cy={-20} r={26} />
        </g>
      )}
    </svg>
  )
}
