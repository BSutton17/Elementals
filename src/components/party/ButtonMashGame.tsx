import { useEffect, useRef, useState } from 'react'
import { partyAct, type PartySnapshot } from '../../game/party'

/**
 * Click as fast as you can.
 *
 * ⚠️ CLICKS ARE COUNTED LOCALLY AND FLUSHED IN BATCHES. One socket message per
 * press would be forty a second per player — three hundred across a full table,
 * for five seconds. The count is kept in a ref (state would re-render on every
 * press and throttle the very thing being measured) and sent four times a
 * second. The server caps what a batch may add, so a tampered count buys
 * nothing.
 *
 * ⚠️ AND THE FLUSH ON UNMOUNT IS NOT OPTIONAL. The game ends by the panel going
 * away; without a final send, every press since the last flush — up to a
 * quarter of a second of frantic clicking — is thrown away, and on a game
 * decided by a handful of clicks that is the difference between healing and
 * taking two thousand damage.
 */

const FLUSH_MS = 250

export function ButtonMashGame({
  party,
  youId,
}: {
  party: PartySnapshot
  youId: string | null
}) {
  const mine = youId ? party.players[youId] : undefined
  const counted = Math.floor((mine?.data.clicks as number | undefined) ?? 0)
  const done = mine?.done ?? false
  const result = mine?.data.result as string | undefined

  const pending = useRef(0)
  const [local, setLocal] = useState(0)

  useEffect(() => {
    const flush = () => {
      if (pending.current <= 0) return
      const batch = pending.current
      pending.current = 0
      void partyAct({ type: 'mash', clicks: batch })
    }
    const timer = window.setInterval(flush, FLUSH_MS)
    return () => {
      window.clearInterval(timer)
      flush() // the last handful, on the way out
    }
  }, [])

  // ⚠️ THIS ONE KEEPS ITS FULL CLOCK, deliberately. Everywhere else a running
  // timer distracts from the task; here the timer IS the task — five seconds of
  // mashing with no idea how long is left is just mashing.
  const seconds =
    party.ticksRemaining === null ? null : Math.max(0, Math.ceil(party.ticksRemaining / 20))

  if (done) {
    return (
      <div className={`party-mash party-mash--${result ?? 'middle'}`}>
        <p className="party-mash__verdict">
          {result === 'most' ? 'Fastest hands' : result === 'least' ? 'Slowest hands' : 'Done'}
        </p>
        <p className="party-mash__count" data-testid="mash-final">
          {counted}
        </p>
        <p className="party-mash__note">
          {result === 'most'
            ? '+1,000 health'
            : result === 'least'
              ? '−2,000 health'
              : 'Somewhere in the middle.'}
        </p>
      </div>
    )
  }

  return (
    <div className="party-mash">
      {seconds !== null && (
        <p className="party-mash__clock" data-testid="mash-clock">
          {seconds}s
        </p>
      )}
      <button
        type="button"
        className="party-mash__button"
        data-testid="mash-button"
        // `onPointerDown`, not `onClick`: a click fires on RELEASE, which halves
        // what a fast masher can register.
        onPointerDown={() => {
          pending.current += 1
          setLocal((n) => n + 1)
        }}
      >
        CLICK!
      </button>
      <p className="party-mash__count" data-testid="mash-count">
        {Math.max(local, counted)}
      </p>
    </div>
  )
}
