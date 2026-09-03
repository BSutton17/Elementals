import { useEffect, useRef, useState } from 'react'
import { partyAct, type PartySnapshot } from '../../game/party'

/**
 * Answer as quick as you can.
 *
 * ⚠️ `inputMode="numeric"` IS THE WHOLE MOBILE STORY. Without it a phone opens
 * the full QWERTY keyboard for a box that only ever takes digits, which costs a
 * second of hunting for the number row in a game measured in seconds. With it
 * the number pad comes up immediately.
 *
 * ⚠️ AND A WRONG ANSWER IS NOT AN ENDING. The server refuses it, the box shakes,
 * and the player goes again — which is why the refusal is rendered as feedback
 * rather than as an error.
 */
export function QuickMathGame({
  party,
  youId,
}: {
  party: PartySnapshot
  youId: string | null
}) {
  const left = party.shared.left as number | undefined
  const right = party.shared.right as number | undefined
  const op = (party.shared.op as string | undefined) ?? '+'
  const mine = youId ? party.players[youId] : undefined
  const done = mine?.done ?? false

  const [value, setValue] = useState('')
  const [shaking, setShaking] = useState(false)
  const [wrong, setWrong] = useState(false)
  const box = useRef<HTMLInputElement>(null)
  const sending = useRef(false)

  useEffect(() => {
    // Focus so a desktop player can just type, and a phone gets its keypad.
    if (!done) box.current?.focus()
  }, [done])

  if (left === undefined || right === undefined) return null

  if (done) {
    const attempts = (mine?.data.attempts as number | undefined) ?? 1
    return (
      <div className="party-math party-math--done">
        <p className="party-math__verdict">Correct</p>
        <p className="party-math__note">
          {attempts === 1 ? 'First time.' : `${attempts} tries.`}
        </p>
      </div>
    )
  }

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (sending.current) return
    const guess = Number.parseInt(value, 10)
    if (!Number.isFinite(guess)) return

    sending.current = true
    const accepted = await partyAct({ type: 'answer', value: guess })
    sending.current = false
    if (accepted) return

    setWrong(true)
    setShaking(true)
    setValue('')
    window.setTimeout(() => setShaking(false), 420)
    box.current?.focus()
  }

  return (
    <form className="party-math" onSubmit={submit}>
      <p className="party-math__sum" data-testid="math-sum">
        {left} {op === '-' ? '−' : '+'} {right} = ?
      </p>
      <input
        ref={box}
        className={`party-math__input${shaking ? ' party-math__input--shake' : ''}`}
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[^0-9-]/g, ''))}
        inputMode="numeric"
        // `type="text"` with a numeric inputMode, deliberately: `type="number"`
        // adds spinner arrows nobody wants and silently accepts 'e' and '+'.
        type="text"
        autoComplete="off"
        aria-label="Your answer"
        data-testid="math-input"
      />
      {wrong && (
        <p className="party-math__wrong" data-testid="math-wrong">
          Try again
        </p>
      )}
      <button type="submit" className="party-math__submit" data-testid="math-submit">
        Answer
      </button>
    </form>
  )
}
