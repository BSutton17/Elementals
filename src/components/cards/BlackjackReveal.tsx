import { useEffect, useRef, useState } from 'react'
import { CardBack, CardFace, rarityOf } from './PlayingCard'
import {
  BLACKJACK_TOTAL_MS,
  REVEAL_COMPLETE_AT,
  expoIn,
  flipDegreesFor,
  isFaceUp,
  presentationFor,
  smoothstep,
  stageAt,
  stageProgress,
  type BlackjackStage,
} from './blackjackStages'
import './BlackjackReveal.css'

// Joker's Blackjack, as a casino reveal rather than a projectile. The Pixi
// fallback bolt is suppressed for this ability (see `effects.ts`) — everything
// you see is this overlay.
//
// The gameplay logic has ALREADY drawn the card and resolved the damage; this
// only presents it. The server holds that damage for exactly `BLACKJACK_TOTAL_MS`
// so it lands on the impact frame below and never before.

export interface BlackjackCinematic {
  /** Unique per cast, so a re-draw of the same card still replays. */
  key: number
  /** The drawn card: "2".."10", "Ace", "Jack", "Queen", "King", "Joker". */
  card: string
  /** Where the card is summoned, in viewport %. */
  from: { x: number; y: number }
  /** Where it is thrown, in viewport %. */
  to: { x: number; y: number }
}

export function BlackjackReveal({ cast }: { cast: BlackjackCinematic | null }) {
  const [elapsed, setElapsed] = useState(0)
  const raf = useRef(0)

  useEffect(() => {
    if (!cast) return
    setElapsed(0)
    const start = performance.now()
    const loop = () => {
      const t = performance.now() - start
      setElapsed(t)
      if (t < BLACKJACK_TOTAL_MS) raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf.current)
  }, [cast])

  if (!cast) return null
  const stage = stageAt(elapsed)
  if (stage === 'done') return null

  const p = stageProgress(elapsed, stage)
  const show = presentationFor(cast.card)
  // Which side is showing is read off the ACTUAL turn angle rather than
  // guessed from the stage — a card mid-way through a multi-turn reveal passes
  // its back to the camera more than once.
  const flip = flipAt(stage, p, show.extraFlips)
  const faceUp = isFaceUp(flip)

  return (
    <div className="bj" data-testid="blackjack-reveal" aria-hidden="true">
      {/* The house lights dim for the reveal, then come back up. */}
      <div
        className="bj__dim"
        style={{ opacity: dimFor(stage, p) }}
      />

      {/* A golden bloom behind the card, sized by how good the card is. */}
      {faceUp && stage !== 'impact' && (
        <div
          className={`bj__bloom bj__bloom--${rarityOf(cast.card)}`}
          style={{ '--bloom': `${show.bloomRem}rem` } as React.CSSProperties}
        />
      )}

      {/* The card itself. */}
      <div className="bj__stage" style={cardTransform(cast, stage, p, flip)}>
        <div className={`bj__card${faceUp ? ' bj__card--faceup' : ''}`}>
          <div className="bj__card-side bj__card-side--back">
            <CardBack />
          </div>
          <div className="bj__card-side bj__card-side--front">
            <CardFace card={cast.card} />
          </div>
        </div>
      </div>

      {/* Casino litter shed on the way in and orbiting during the showcase. */}
      {(stage === 'approach' || stage === 'showcase') && (
        <Litter count={Math.round(14 * show.particles)} orbiting={stage === 'showcase'} />
      )}

      {/* Jokers bring chaos: rainbow confetti and swirling cards. */}
      {show.chaos && stage === 'showcase' && <Confetti />}

      {/* The card slices through and bursts. */}
      {stage === 'impact' && (
        <Burst at={cast.to} count={Math.round(18 * show.particles)} progress={p} />
      )}
    </div>
  )
}

/** How dark the backdrop is at each stage. */
function dimFor(stage: BlackjackStage, p: number): number {
  if (stage === 'summon') return 0.25 * p
  // The lights drop on the same exponential curve as the rush.
  if (stage === 'approach') return 0.25 + 0.4 * expoIn(p)
  if (stage === 'showcase') return 0.65
  if (stage === 'throw') return 0.65 * (1 - p)
  return 0
}

/**
 * How far the card has turned over, in degrees, at any moment. The turn happens
 * ON THE WAY IN and completes before the card lands; every stage after that
 * holds the finished angle, which `flipDegreesFor` guarantees is face-up.
 */
function flipAt(stage: BlackjackStage, p: number, extraFlips: number): number {
  const total = flipDegreesFor(extraFlips)
  if (stage === 'summon') return 0
  if (stage === 'approach') {
    return total * smoothstep(Math.min(1, p / REVEAL_COMPLETE_AT))
  }
  return total
}

/** Where the card is, how big, and how it is turned, at any moment. */
function cardTransform(
  cast: BlackjackCinematic,
  stage: BlackjackStage,
  p: number,
  flip: number,
): React.CSSProperties {
  const { from, to } = cast
  const centre = { x: 50, y: 50 }
  let x = from.x
  let y = from.y
  let scale = 0.25
  let spin = 0

  if (stage === 'summon') {
    scale = 0.25 + 0.15 * p
    spin = 8 * Math.sin(p * Math.PI)
  } else if (stage === 'approach') {
    // Hurtling at the camera: it hangs a beat, then the exponential curve
    // takes over and it RUSHES in, growing the whole way.
    const e = expoIn(p)
    x = from.x + (centre.x - from.x) * e
    y = from.y + (centre.y - from.y) * e
    scale = 0.4 + 2.6 * e
    spin = 220 * e
  } else if (stage === 'showcase') {
    x = centre.x
    y = centre.y
    scale = 3
    // Gentle float + sway so it never looks frozen.
    y += Math.sin(p * Math.PI * 2) * 1.2
    spin = Math.sin(p * Math.PI * 4) * 3
  } else if (stage === 'throw') {
    const e = p * p // accelerating away
    x = centre.x + (to.x - centre.x) * e
    y = centre.y + (to.y - centre.y) * e
    scale = 3 - 2.6 * e
    spin = 900 * e // spinning like a thrown card
  } else {
    x = to.x
    y = to.y
    scale = 0.4
    spin = 900
  }

  return {
    left: `${x}%`,
    top: `${y}%`,
    opacity: stage === 'impact' ? 1 - p : 1,
    transform: `translate(-50%, -50%) scale(${scale}) rotate(${spin}deg)`,
    '--flip': `${flip}deg`,
  } as React.CSSProperties
}

/** Chips, sparkles, and card wisps shed on the way in / orbiting the showcase. */
function Litter({ count, orbiting }: { count: number; orbiting: boolean }) {
  return (
    <div className={`bj__litter${orbiting ? ' bj__litter--orbit' : ''}`}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={`bj__bit bj__bit--${['chip', 'spark', 'card'][i % 3]}`}
          style={
            {
              // Precomputed: a `calc()` divisor must be a literal, so dividing
              // by a var() would void the transform entirely.
              '--a': `${(i / count) * 360}deg`,
              '--delay': `${(i / count) * 1.4}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

/** A joker's chaotic rainbow layer. */
function Confetti() {
  return (
    <div className="bj__confetti" data-testid="blackjack-confetti">
      {Array.from({ length: 40 }).map((_, i) => (
        <span
          key={i}
          className="bj__flake"
          style={
            {
              '--i': i,
              '--x': `${(i * 37) % 100}%`,
              '--delay': `${(i % 10) * 0.12}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

/** The card slicing through and bursting into fragments at the victim. */
function Burst({
  at,
  count,
  progress,
}: {
  at: { x: number; y: number }
  count: number
  progress: number
}) {
  return (
    <div
      className="bj__burst"
      style={{ left: `${at.x}%`, top: `${at.y}%`, opacity: 1 - progress }}
    >
      <span className="bj__slash" />
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={`bj__frag bj__frag--${['chip', 'spark', 'card'][i % 3]}`}
          style={{ '--a': `${(360 / count) * i}deg` } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
