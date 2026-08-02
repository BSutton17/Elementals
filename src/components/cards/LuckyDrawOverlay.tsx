import { useEffect, useState } from 'react'
import { CardBack } from './PlayingCard'
import { faceFor, LUCKY_CARD_COUNT } from './luckyFaces'
import './LuckyDrawOverlay.css'

// Joker's Lucky Draw as a game show. It opens straight on the choice — no
// shuffle to sit through — then:
//
//   choose  — five identical face-down cards fan out; the player picks one
//   reveal  — the others dissolve, the pick centres and flips
//   showcase— the effect is named and described for 3 s, then dissolves
//
// The OUTCOME is not the player's to influence: the server rolled it at cast
// and every card is the same face-down back. The choice is theatre, and that is
// the point — the suspense is real even though the odds are not.

const REVEAL_MS = 700
const SHOWCASE_MS = 3000
const DISSOLVE_MS = 600

type Phase = 'choose' | 'reveal' | 'showcase' | 'dissolve'

export function LuckyDrawOverlay({
  /** The outcome the server rolled, or null when nothing is running. */
  outcome,
  /** Bumped per cast so a repeat of the same face still replays. */
  castKey,
}: {
  outcome: string | null
  castKey: number
}) {
  const [phase, setPhase] = useState<Phase>('choose')
  const [picked, setPicked] = useState<number | null>(null)
  const [showing, setShowing] = useState(false)

  useEffect(() => {
    if (outcome === null) return
    setShowing(true)
    setPicked(null)
    setPhase('choose')
  }, [outcome, castKey])

  const pick = (index: number) => {
    if (phase !== 'choose') return
    setPicked(index)
    setPhase('reveal')
    setTimeout(() => setPhase('showcase'), REVEAL_MS)
    setTimeout(() => setPhase('dissolve'), REVEAL_MS + SHOWCASE_MS)
    setTimeout(() => setShowing(false), REVEAL_MS + SHOWCASE_MS + DISSOLVE_MS)
  }

  if (!showing || outcome === null) return null
  const face = faceFor(outcome)

  return (
    <div
      className={`lucky lucky--${phase}`}
      data-testid="lucky-draw"
      role="dialog"
      aria-label="Lucky Draw"
    >
      <div className="lucky__dim" />

      <div className="lucky__fan" data-testid="lucky-fan">
        {Array.from({ length: LUCKY_CARD_COUNT }).map((_, i) => {
          const isPicked = picked === i
          const gone = picked !== null && !isPicked
          return (
            <button
              key={i}
              type="button"
              className={[
                'lucky__slot',
                isPicked ? 'lucky__slot--picked' : '',
                gone ? 'lucky__slot--dissolving' : '',
                phase === 'choose' ? 'lucky__slot--live' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ '--i': i, '--n': LUCKY_CARD_COUNT } as React.CSSProperties}
              disabled={phase !== 'choose'}
              onClick={() => pick(i)}
              aria-label={`Card ${i + 1}`}
              data-testid={`lucky-card-${i}`}
            >
              <span className="lucky__card">
                <span className="lucky__side lucky__side--back">
                  <CardBack />
                </span>
                <span className={`lucky__side lucky__side--front lucky__front--${face.theme}`}>
                  <span className="lucky__pip">{face.pip}</span>
                  <span className="lucky__name">{face.name}</span>
                  <span className="lucky__desc">{face.description}</span>
                </span>
              </span>
              {/* Motes rising off each waiting card. */}
              {phase === 'choose' && (
                <span className="lucky__aura" aria-hidden="true">
                  {Array.from({ length: 4 }).map((_, m) => (
                    <span
                      key={m}
                      className="lucky__mote"
                      style={{ '--m': m } as React.CSSProperties}
                    />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {phase === 'choose' && (
        <p className="lucky__prompt">Pick a card. Any card.</p>
      )}

      {(phase === 'showcase' || phase === 'dissolve') && (
        <div className={`lucky__theme lucky__theme--${face.theme}`} aria-hidden="true">
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className="lucky__spark"
              style={
                {
                  '--a': `${(i / 18) * 360}deg`,
                  '--i': i,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

