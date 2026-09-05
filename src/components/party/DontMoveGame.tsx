import { useEffect, useRef, useState } from 'react'
import { partyAct, type PartySnapshot } from '../../game/party'

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
      {/* ⚠️ NO CLOCK AND NO COUNTDOWN, ON PURPOSE. Both were here, and both
          took the game away: told exactly how many seconds are left, you stop
          keeping still and start watching a number tick down. Not knowing when
          it ends is the whole of it. The panel is translucent for the same
          reason — you sit there and watch the match carry on behind it. */}
      <p className="party-still__line" data-testid="dontmove-line">
        {failed ? 'You moved.' : 'Do not move.'}
      </p>
      {failed && <p className="party-still__cost">−5,000 health</p>}
    </div>
  )
}
