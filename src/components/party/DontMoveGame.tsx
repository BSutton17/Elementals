import { useEffect, useRef, useState } from 'react'
import { partyAct, type PartySnapshot } from '../../game/party'
import { countdownSeconds } from './countdown'

/**
 * Don't move.
 *
 * ⚠️ THIS IS THE ONE GAME WHERE THE CLIENT IS THE ONLY WITNESS. Nothing on the
 * server can see a mouse twitch, so this component watches and reports it —
 * and the server still decides what a report is worth, refuses a second one,
 * and ignores anything arriving late. Reporting is not the same as scoring.
 *
 * ⚠️ AND THE LISTENERS ARE DELIBERATELY BROAD AND PASSIVE. Every pointer,
 * keyboard, wheel and touch event on the window counts, captured on the way
 * DOWN so nothing can swallow one first, and `passive` so watching can never
 * itself make the page stutter. A movement threshold keeps a resting hand's
 * one-pixel drift from failing somebody who did exactly what was asked.
 */

/** Pixels of pointer travel that count as "moving", not as a resting hand. */
const TWITCH_PX = 6

export function DontMoveGame({
  party,
  youId,
}: {
  party: PartySnapshot
  youId: string | null
}) {
  const mine = youId ? party.players[youId] : undefined
  const moved = mine?.data.moved === true
  const done = mine?.done ?? false
  const seconds = countdownSeconds(party.ticksRemaining)
  const [caught, setCaught] = useState(false)

  const reported = useRef(false)
  const origin = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (done) return

    const fail = () => {
      if (reported.current) return
      reported.current = true
      setCaught(true)
      void partyAct({ type: 'moved' })
    }

    const onPointer = (event: PointerEvent | MouseEvent) => {
      const here = { x: event.clientX, y: event.clientY }
      if (origin.current === null) {
        origin.current = here
        return
      }
      const travelled = Math.hypot(here.x - origin.current.x, here.y - origin.current.y)
      if (travelled > TWITCH_PX) fail()
    }

    const options = { capture: true, passive: true } as const
    window.addEventListener('pointermove', onPointer, options)
    window.addEventListener('pointerdown', fail, options)
    window.addEventListener('keydown', fail, options)
    window.addEventListener('wheel', fail, options)
    window.addEventListener('touchstart', fail, options)

    return () => {
      window.removeEventListener('pointermove', onPointer, options)
      window.removeEventListener('pointerdown', fail, options)
      window.removeEventListener('keydown', fail, options)
      window.removeEventListener('wheel', fail, options)
      window.removeEventListener('touchstart', fail, options)
    }
  }, [done])

  const failed = moved || caught

  return (
    <div className={`party-still${failed ? ' party-still--caught' : ''}`}>
      <div className="party-still__clock" aria-hidden="true">
        {/* A plain black-and-white clock, and it is the only thing moving on
            the screen — which is the joke. */}
        <svg viewBox="0 0 100 100" className="party-still__face">
          <circle cx="50" cy="50" r="44" className="party-still__rim" />
          {Array.from({ length: 12 }, (_, i) => {
            const angle = (i / 12) * Math.PI * 2
            return (
              <line
                key={i}
                x1={50 + Math.sin(angle) * 36}
                y1={50 - Math.cos(angle) * 36}
                x2={50 + Math.sin(angle) * 41}
                y2={50 - Math.cos(angle) * 41}
                className="party-still__tick"
              />
            )
          })}
          <line x1="50" y1="50" x2="50" y2="22" className="party-still__hand" />
          <circle cx="50" cy="50" r="4" className="party-still__hub" />
        </svg>
      </div>

      <p className="party-still__line" data-testid="dontmove-line">
        {failed ? 'You moved.' : 'Do not move.'}
      </p>
      {seconds !== null && !failed && (
        <p className="party-still__count" data-testid="dontmove-clock">
          {seconds}
        </p>
      )}
      {failed && <p className="party-still__cost">−5,000 health</p>}
    </div>
  )
}
