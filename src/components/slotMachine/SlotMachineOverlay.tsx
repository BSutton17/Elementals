import { useEffect, useRef, useState } from 'react'
import { useReels } from './useReels'
import { VERDICT_HOLD_MS } from './reelMotion'
import './SlotMachineOverlay.css'

// Joker's ultimate, from the VICTIM's side: a circus cabinet drops over their
// screen and their gold production is frozen until they pull the lever. There
// is no dismiss button — the only way out is to spin.
//
// The cabinet is decorated and alive when it lands — lights chase the trim,
// gears turn, smoke curls off it — but the REELS are still: nothing spins until
// the player pulls the lever. The pull winds them up, the server rolls, and
// they settle onto the true symbols one at a time, left to right, with the
// cabinet shaking and throwing chips and coins the whole way. The reels
// themselves are cosmetic; the roll is entirely the server's.

type Phase = 'idle' | 'spinning' | 'done'

export interface SlotSpinResult {
  symbols: string[]
  result: string
}

export function SlotMachineOverlay({
  active,
  onSpin,
  onFinished,
}: {
  /** This player owes a spin (server-synced `pendingSpin`). */
  active: boolean
  /** Pulls the lever server-side; resolves with the true reels and verdict. */
  onSpin: () => Promise<SlotSpinResult | null>
  /** Fired once the cabinet is fully gone, so a queued game can take over. */
  onFinished?: () => void
}) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<string | null>(null)
  /** Kept true through the spin + verdict, so the cabinet doesn't vanish the
   *  instant the server frees the player's income. */
  const [showing, setShowing] = useState(false)

  // The reels are mounted with the cabinet but sit still until `begin()`.
  const { view, begin, commit, release, landedCount } = useReels(showing)

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const onFinishedRef = useRef(onFinished)
  onFinishedRef.current = onFinished

  const stopTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  // A fresh machine arrives: reset and show it.
  useEffect(() => {
    if (!active) return
    stopTimers()
    setPhase('idle')
    setResult(null)
    setShowing(true)
  }, [active])

  useEffect(() => stopTimers, [])

  const dismiss = () => {
    setShowing(false)
    onFinishedRef.current?.()
  }

  const pull = async () => {
    if (phase !== 'idle') return
    setPhase('spinning')
    // The reels wind up on the pull itself, not on the server's reply — the
    // machine has to respond to the lever instantly.
    begin()

    const spin = await onSpin()
    if (!spin) {
      // The server refused (nothing owed) — stop the reels and put the lever up.
      release()
      setPhase('idle')
      return
    }

    // `commit` returns the real time to the verdict, measured from the motion
    // it just scheduled, so the payout can never beat the last reel.
    const untilVerdict = commit(spin.symbols)
    timers.current.push(
      setTimeout(() => {
        setResult(spin.result)
        setPhase('done')
      }, untilVerdict),
    )
    timers.current.push(setTimeout(dismiss, untilVerdict + VERDICT_HOLD_MS))
  }

  if (!showing) return null

  const spinning = phase === 'spinning'
  // The cabinet works hardest while reels are still loose, and settles as each
  // one locks — so the shake and the light show wind down with the reels.
  const looseReels = view.filter((r) => r.moving).length
  const intensity = phase === 'done' ? 0 : looseReels / view.length

  return (
    <div
      className={`slot slot--${phase}`}
      data-testid="slot-machine"
      role="dialog"
      aria-label="Slot Machine"
      // Clicking the backdrop dismisses the cabinet, but only after the
      // result has landed — you cannot click past the spin itself.
      onClick={phase === 'done' ? dismiss : undefined}
    >
      {/* Casino litter thrown by the cabinet while it works. */}
      {intensity > 0 && <CasinoLitter intensity={intensity} />}

      {/* Clicks on the cabinet itself never dismiss it. */}
      <div
        className={`slot__cabinet${spinning ? ' slot__cabinet--working' : ''}`}
        style={{ '--intensity': intensity } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Magical smoke curling off the cabinet shoulders. */}
        <Smoke />

        {/* Gold filigree and turning gears down both flanks. */}
        <Flank side="left" turning={intensity > 0} />
        <Flank side="right" turning={intensity > 0} />

        <div className="slot__marquee">
          {/* Chase lights around the marquee, like a real cabinet. */}
          <span className="slot__bulbs" aria-hidden="true">
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className="slot__bulb"
                style={{ '--i': i } as React.CSSProperties}
              />
            ))}
          </span>
          <span className="slot__marquee-text">SLOT MACHINE</span>
        </div>

        <p className="slot__subtitle">
          {phase === 'done' ? 'Good luck!' : 'JACKPOT: A FULL restoration of health'}
        </p>

        <div className="slot__body">
          <div className="slot__reels" data-testid="slot-reels">
            {view.map((reel, i) => (
              <div
                key={i}
                className={`slot__reel${reel.moving ? ' slot__reel--spinning' : ''}`}
                data-testid={`slot-reel-${i}`}
                data-symbol={reel.symbol}
              >
                {/* The strip scrolls continuously: the symbols above and below
                    slide through the window as the reel turns. */}
                <div
                  className="slot__strip"
                  style={{
                    // Positive: a rising position pushes the strip DOWNWARD, so
                    // symbols arrive from the top and drop out of the bottom.
                    transform: `translateY(${reel.offset * 100}%)`,
                    filter: reel.blur > 0.2 ? `blur(${reel.blur.toFixed(2)}px)` : undefined,
                  }}
                >
                  <span className="slot__symbol slot__symbol--ghost">{reel.above}</span>
                  <span className="slot__symbol">{reel.symbol}</span>
                  <span className="slot__symbol slot__symbol--ghost">{reel.below}</span>
                </div>
                {/* Curved glass over the reel. */}
                <span className="slot__glass" aria-hidden="true" />
                {/* A flash as the reel locks into place. */}
                {reel.landed && (
                  <span className="slot__lock-flash" aria-hidden="true" key={`lock-${landedCount}`} />
                )}
              </div>
            ))}
          </div>

          {/* The lever: an arm on a track that visibly swings down on the pull. */}
          <button
            type="button"
            className={`slot__lever${phase !== 'idle' ? ' slot__lever--pulled' : ''}`}
            disabled={phase !== 'idle'}
            onClick={() => void pull()}
            aria-label="Pull the lever"
            data-testid="slot-lever"
          >
            <span className="slot__lever-track" aria-hidden="true" />
            <span className="slot__lever-arm" aria-hidden="true">
              <span className="slot__lever-knob" />
            </span>
          </button>
        </div>

        <div
          className={`slot__result${result ? ' slot__result--lit' : ''}`}
          aria-live="polite"
        >
          {result ? (
            <span className="slot__result-text" data-testid="slot-result">
              {result}
            </span>
          ) : (
            <span className="slot__result-placeholder">
              {spinning ? 'Spinning…' : 'Pull the lever'}
            </span>
          )}
        </div>

        {/* Coin tray along the bottom, glinting under the gold trim. */}
        <span className="slot__tray" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} className="slot__tray-coin" style={{ '--i': i } as React.CSSProperties} />
          ))}
        </span>
      </div>
    </div>
  )
}

/** Gold filigree, sparkling bulbs, and a pair of gears down one flank. */
function Flank({ side, turning }: { side: 'left' | 'right'; turning: boolean }) {
  return (
    <span className={`slot__flank slot__flank--${side}`} aria-hidden="true">
      <span className={`slot__gear slot__gear--big${turning ? ' slot__gear--turning' : ''}`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="slot__tooth" style={{ '--a': `${i * 45}deg` } as React.CSSProperties} />
        ))}
      </span>
      <span className={`slot__gear slot__gear--small${turning ? ' slot__gear--turning' : ''}`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="slot__tooth" style={{ '--a': `${i * 60}deg` } as React.CSSProperties} />
        ))}
      </span>
      {Array.from({ length: 4 }).map((_, i) => (
        <span key={i} className="slot__sparkle" style={{ '--i': i } as React.CSSProperties} />
      ))}
    </span>
  )
}

/** Magical smoke curling off the cabinet's shoulders. */
function Smoke() {
  return (
    <span className="slot__smoke" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className="slot__puff"
          style={
            {
              '--i': i,
              '--x': `${8 + (i % 4) * 28}%`,
              '--delay': `${(i % 4) * 0.7 + (i > 3 ? 0.35 : 0)}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  )
}

/**
 * What the machine throws while it works: poker chips bouncing off the floor,
 * coins flung upward, and sparks bursting off the trim. All of it thins out as
 * the reels lock, so the room quietens down onto the verdict.
 */
function CasinoLitter({ intensity }: { intensity: number }) {
  const chips = Math.round(8 * intensity)
  const coins = Math.round(7 * intensity)
  const sparks = Math.round(16 * intensity)
  return (
    <span className="slot__litter" aria-hidden="true">
      {Array.from({ length: chips }).map((_, i) => (
        <span
          key={`chip-${i}`}
          className={`slot__chip slot__chip--${['red', 'white', 'gold'][i % 3]}`}
          style={
            {
              '--x': `${10 + ((i * 23) % 80)}%`,
              '--delay': `${(i % 5) * 0.24}s`,
            } as React.CSSProperties
          }
        />
      ))}
      {Array.from({ length: coins }).map((_, i) => (
        <span
          key={`coin-${i}`}
          className="slot__coin"
          style={
            {
              '--x': `${14 + ((i * 31) % 72)}%`,
              '--spin': `${i % 2 ? 720 : -720}deg`,
              '--delay': `${(i % 4) * 0.42}s`,
            } as React.CSSProperties
          }
        />
      ))}
      {Array.from({ length: sparks }).map((_, i) => (
        <span
          key={`spark-${i}`}
          className="slot__spark"
          style={
            {
              // Precomputed: a calc() divisor must be a literal, so dividing by
              // a var() would void the transform entirely.
              '--a': `${(i / Math.max(1, sparks)) * 360}deg`,
              '--delay': `${(i % 6) * 0.16}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  )
}
