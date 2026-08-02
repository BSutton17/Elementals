import { useEffect, useRef, useState } from 'react'
import { RouletteWheel } from './RouletteWheel'
import { useRouletteSpin, SPIN_MS } from './useRouletteSpin'
import { COLOR_FILL, type BetColor } from './wheel'
import './RouletteOverlay.css'

// Joker's Roulette, from the VICTIM's side: a European table is wheeled over
// their screen and their gold production is frozen until they call a colour.
// There is no confirm step — clicking a chip IS the bet, and the wheel starts
// turning on the same click. Gold resumes the instant the bet lands, even
// though the ball is still rolling.
//
// Once the bet is down the table has nothing left to ask of them, so clicking
// off it TUCKS IT ASIDE — the same small card Joker watches from — and hands
// the screen back. The node is never unmounted for that, only restyled, so the
// wheel keeps spinning through the transition instead of restarting.

/** How long the verdict sits on screen before the table is wheeled away (ms). */
const VERDICT_HOLD_MS = 4200

export interface RouletteBetResult {
  pocket: number
  color: string
  bet: string
  won: boolean
  result: string
}

const CHIPS: { color: BetColor; label: string; hint: string }[] = [
  { color: 'red', label: 'RED', hint: 'Right: half damage. Wrong: full damage.' },
  { color: 'green', label: 'GREEN', hint: 'Right: you heal. Wrong: half again as much damage.' },
  { color: 'black', label: 'BLACK', hint: 'Right: half damage. Wrong: full damage.' },
]

export function RouletteOverlay({
  active,
  onBet,
  onFinished,
}: {
  /** This player owes a bet (server-synced `pendingBet`). */
  active: boolean
  /** Places the bet server-side; resolves with the landed pocket and verdict. */
  onBet: (bet: BetColor) => Promise<RouletteBetResult | null>
  /** Fired once the table is fully gone, so a queued game can take the stage. */
  onFinished?: () => void
}) {
  const [placed, setPlaced] = useState<BetColor | null>(null)
  const [outcome, setOutcome] = useState<RouletteBetResult | null>(null)
  const [revealed, setRevealed] = useState(false)
  /** Tucked into the corner: the bet is placed and they've clicked away. */
  const [minimized, setMinimized] = useState(false)
  /** Kept true through the spin + verdict so the table doesn't vanish the
   *  instant the server frees the player's income. */
  const [showing, setShowing] = useState(false)

  const spin = useRouletteSpin(outcome ? outcome.pocket : null)

  // Read through a ref so re-rendering the parent never restarts the timers.
  const onFinishedRef = useRef(onFinished)
  onFinishedRef.current = onFinished
  /** The stage is handed over exactly once per table, whether that happens by
   *  tucking it aside or by the verdict timing out. */
  const handedOver = useRef(false)

  const handOver = () => {
    if (handedOver.current) return
    handedOver.current = true
    onFinishedRef.current?.()
  }

  useEffect(() => {
    if (!active) return
    setPlaced(null)
    setOutcome(null)
    setRevealed(false)
    setMinimized(false)
    handedOver.current = false
    setShowing(true)
  }, [active])

  // Reveal the verdict when the ball settles, then wheel the table away and
  // hand the stage over to whatever is queued behind it.
  useEffect(() => {
    if (!outcome) return
    const reveal = setTimeout(() => setRevealed(true), SPIN_MS)
    const hide = setTimeout(() => {
      setShowing(false)
      handOver()
    }, SPIN_MS + VERDICT_HOLD_MS)
    return () => {
      clearTimeout(reveal)
      clearTimeout(hide)
    }
  }, [outcome])

  const bet = async (color: BetColor) => {
    if (placed) return
    setPlaced(color) // the click IS the bet — no confirmation step
    const result = await onBet(color)
    if (!result) {
      setPlaced(null) // the server refused; hand the chips back
      return
    }
    setOutcome(result)
  }

  if (!showing) return null

  // Clicking off a table that has already taken your bet tucks it into the
  // corner and releases the screen — and the casino stage with it, so a queued
  // Slot Machine can come up while this wheel finishes in the corner.
  const tuckAway = () => {
    if (!placed || minimized) return
    setMinimized(true)
    handOver()
  }

  return (
    <div
      className={`roulette${minimized ? ' roulette--mini' : ''}`}
      data-testid="roulette"
      data-minimized={minimized ? 'true' : 'false'}
      role="dialog"
      aria-label="Roulette"
      onClick={tuckAway}
    >
      <div className="roulette__table" onClick={(e) => e.stopPropagation()}>
        <div className="roulette__header">
          <span className="roulette__title">ROULETTE</span>
          <span className="roulette__sub">
            {placed
              ? revealed
                ? ''
                : minimized
                  ? 'No more bets…'
                  : 'No more bets… (click away to watch this from the corner)'
              : 'Your gold production is stopped until you bet.'}
          </span>
        </div>

        <div className="roulette__felt">
          <RouletteWheel
            className="roulette__wheel"
            wheelAngle={spin.wheelAngle}
            ballAngle={spin.ballAngle}
            ballDrop={spin.ballDrop}
            spinMs={spin.spinMs}
          />

          <div className="roulette__chips" data-testid="roulette-chips">
            {CHIPS.map((chip) => (
              <button
                key={chip.color}
                type="button"
                className={`roulette__chip roulette__chip--${chip.color}${
                  placed === chip.color ? ' roulette__chip--picked' : ''
                }`}
                style={{ '--chip': COLOR_FILL[chip.color] } as React.CSSProperties}
                disabled={placed !== null}
                title={chip.hint}
                onClick={() => void bet(chip.color)}
                data-testid={`roulette-bet-${chip.color}`}
              >
                <span className="roulette__chip-label">{chip.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div
          className={`roulette__result${revealed ? ' roulette__result--lit' : ''}`}
          aria-live="polite"
        >
          {revealed && outcome ? (
            <span
              className={`roulette__result-text roulette__result-text--${outcome.color}`}
              data-testid="roulette-result"
            >
              {outcome.result}
            </span>
          ) : (
            <span className="roulette__result-placeholder">
              {placed ? 'The ball is rolling…' : 'Place your bet'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
