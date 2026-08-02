import { RouletteWheel } from './RouletteWheel'
import { useRouletteSpin } from './useRouletteSpin'
import './RouletteMirror.css'

// Joker's view of a Roulette it called: a small wheel pinned to the side of the
// screen showing whose bet it is, the same spin the victim is watching, and the
// result once the ball settles. Runs the identical `useRouletteSpin` motion off
// the same landed pocket, so the two screens stay in step.

export interface MirrorSpin {
  playerName: string
  /** The colour they bet, or null while they are still deciding. */
  bet: string | null
  /** The landed pocket, or null until the bet is placed. */
  pocket: number | null
  /** Its colour, once known. */
  color: string | null
  /** The verdict text, shown only once the ball has settled. */
  result: string | null
}

export function RouletteMirror({ spins }: { spins: MirrorSpin[] }) {
  if (spins.length === 0) return null
  return (
    <div className="roulette-mirror" data-testid="roulette-mirror" aria-hidden="true">
      {spins.map((spin) => (
        <MirrorCard key={spin.playerName} spin={spin} />
      ))}
    </div>
  )
}

function MirrorCard({ spin }: { spin: MirrorSpin }) {
  const motion = useRouletteSpin(spin.pocket)
  return (
    <div className="roulette-mirror__card">
      <span className="roulette-mirror__name">{spin.playerName}</span>
      <RouletteWheel
        className="roulette-mirror__wheel"
        wheelAngle={motion.wheelAngle}
        ballAngle={motion.ballAngle}
        ballDrop={motion.ballDrop}
        spinMs={motion.spinMs}
      />
      <span className="roulette-mirror__bet">
        {spin.bet ? (
          <>
            bet{' '}
            <b className={`roulette-mirror__swatch roulette-mirror__swatch--${spin.bet}`}>
              {spin.bet}
            </b>
          </>
        ) : (
          'placing a bet…'
        )}
      </span>
      {spin.result && (
        <span className={`roulette-mirror__result roulette-mirror__result--${spin.color}`}>
          {spin.result}
        </span>
      )}
    </div>
  )
}
