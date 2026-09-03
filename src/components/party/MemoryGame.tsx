import { useEffect, useState } from 'react'
import { FaRandom, FaAdjust } from 'react-icons/fa'
import { AiFillAccountBook } from 'react-icons/ai'
import { Bs0Circle } from 'react-icons/bs'
import { BiAbacus } from 'react-icons/bi'
import { CiAirportSign1 } from 'react-icons/ci'
import { CgAbstract } from 'react-icons/cg'
import { DiAndroid } from 'react-icons/di'
import { FiActivity } from 'react-icons/fi'
import { GiAbstract016 } from 'react-icons/gi'
import { partyAct, type MemoryQuestionWire, type PartySnapshot } from '../../game/party'

/**
 * Memorize the following symbols.
 *
 * A countdown, eight symbols one after another, then one question. The phases
 * are derived from `elapsedTicks` rather than from a timer started on mount —
 * a player whose tab was backgrounded, or who joined the render a beat late,
 * has to see the same phase as everybody else, and a local timer would put them
 * in their own private version of the sequence.
 */

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  random: FaRandom,
  accountBook: AiFillAccountBook,
  zeroCircle: Bs0Circle,
  abacus: BiAbacus,
  airportSign: CiAirportSign1,
  abstract: CgAbstract,
  android: DiAndroid,
  activity: FiActivity,
  adjust: FaAdjust,
  abstract016: GiAbstract016,
}

const ORDINALS: Record<number, string> = { 3: 'third', 5: 'fifth', 7: 'seventh' }

export function MemoryGame({
  party,
  youId,
}: {
  party: PartySnapshot
  youId: string | null
}) {
  const sequence = (party.shared.sequence as string[] | undefined) ?? []
  const question = party.shared.question as MemoryQuestionWire | null | undefined
  const countdownSeconds = (party.shared.countdownSeconds as number | undefined) ?? 3
  const flashMs = (party.shared.flashMs as number | undefined) ?? 650
  const mine = youId ? party.players[youId] : undefined
  const done = mine?.done ?? false

  // Elapsed comes off the wire, so every phase boundary is the server's.
  const elapsedMs = (party.elapsedTicks / 20) * 1000
  const countdownMs = countdownSeconds * 1000
  const flashingFor = elapsedMs - countdownMs
  const index = Math.floor(flashingFor / flashMs)

  const counting = elapsedMs < countdownMs
  const flashing = !counting && index < sequence.length
  const asking = !counting && !flashing

  const [pulse, setPulse] = useState(0)
  useEffect(() => {
    // Re-key the symbol so each one replays its entrance instead of the icon
    // silently swapping inside a box that never moves.
    setPulse((n) => n + 1)
  }, [index])

  if (done) {
    const right = mine?.outcome === 'won'
    const answer = mine?.data.correctAnswer as string | undefined
    const Answer = answer ? ICONS[answer] : undefined
    return (
      <div className={`party-memory__verdict party-memory__verdict--${right ? 'win' : 'loss'}`}>
        <p className="party-memory__verdict-line">{right ? 'Correct' : 'Wrong'}</p>
        {!right && Answer && (
          <p className="party-memory__verdict-answer">
            It was <Answer className="party-memory__inline-icon" />
          </p>
        )}
      </div>
    )
  }

  if (counting) {
    const left = Math.ceil((countdownMs - elapsedMs) / 1000)
    return (
      <div className="party-memory">
        <p className="party-memory__prompt">Get ready…</p>
        <div className="party-memory__countdown" data-testid="memory-countdown">
          {Math.max(1, left)}
        </div>
      </div>
    )
  }

  if (flashing) {
    const symbol = sequence[index]
    const Icon = symbol ? ICONS[symbol] : undefined
    return (
      <div className="party-memory">
        <p className="party-memory__prompt">Watch…</p>
        <div className="party-memory__stage" data-testid="memory-flash">
          {Icon && <Icon key={pulse} className="party-memory__symbol" />}
        </div>
        <div className="party-memory__progress" aria-hidden="true">
          {sequence.map((_, i) => (
            <span
              key={i}
              className={`party-memory__tick${i <= index ? ' party-memory__tick--seen' : ''}`}
            />
          ))}
        </div>
      </div>
    )
  }

  // "What came before X" needs to SHOW X: naming it in words would mean naming
  // ten abstract glyphs, and they do not have names.
  const Anchor = question?.kind === 'followed' ? ICONS[question.after ?? ''] : undefined

  return (
    <div className="party-memory">
      <p className="party-memory__prompt" data-testid="memory-question">
        {asking && question ? questionText(question) : 'Which one was it?'}
        {Anchor && <Anchor className="party-memory__inline-icon" />}
      </p>
      <div className="party-memory__choices">
        {Object.entries(ICONS).map(([id, Icon]) => (
          <button
            key={id}
            type="button"
            className="party-memory__choice"
            aria-label={id}
            data-testid={`memory-choice-${id}`}
            onClick={() => void partyAct({ type: 'answer', symbol: id })}
          >
            <Icon className="party-memory__choice-icon" />
          </button>
        ))}
      </div>
    </div>
  )
}

function questionText(question: MemoryQuestionWire): string {
  if (question.kind === 'positional') {
    return `What was the ${ORDINALS[question.position ?? 3] ?? 'third'} symbol?`
  }
  if (question.kind === 'repeated') return 'Which symbol appeared twice?'
  return 'Which symbol came just before this one?'
}
