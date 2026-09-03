import { useEffect, useRef, useState } from 'react'
import { partyAct, type PartySnapshot } from '../../game/party'

/**
 * Catch the coins.
 *
 * ⚠️ THE SERVER DEALT THE SHOWER; THIS ONLY DROPS IT. Every coin arrives with an
 * id, a kind, a lane and the tick it enters on, so each coin's position is a
 * function of elapsed time rather than anything this side invented — which is
 * what makes every player's screen show the same rain, and what makes a catch
 * checkable. A client that spawned its own coins would be deciding its own
 * income.
 *
 * ⚠️ AND POSITION IS COMPUTED, NOT ACCUMULATED. Stepping each coin down by a
 * little every frame drifts as soon as a frame is dropped, and on a phone that
 * is constantly: the coin under your finger would not be the coin the server
 * thinks you caught.
 */

interface Coin {
  id: number
  kind: 'bronze' | 'silver' | 'gold'
  x: number
  atTick: number
}

const VALUE: Record<Coin['kind'], number> = { bronze: 25, silver: 50, gold: 100 }
/** How long a coin takes to cross the screen, in ticks. */
const FALL_TICKS = 44

export function GoldPartyGame({
  party,
  youId,
}: {
  party: PartySnapshot
  youId: string | null
}) {
  const coins = (party.shared.coins as Coin[] | undefined) ?? []
  const mine = youId ? party.players[youId] : undefined
  const caught = (mine?.data.caught as number[] | undefined) ?? []
  const earned = (mine?.data.earned as number | undefined) ?? 0

  // The tick advances with the sync (20/s); animation between syncs comes from
  // the CSS transition on each coin, so the fall stays smooth without this
  // component re-rendering at frame rate.
  const elapsed = party.elapsedTicks
  const [grabbed, setGrabbed] = useState<number[]>([])
  const pending = useRef(new Set<number>())

  useEffect(() => {
    // Anything the server has confirmed can leave the local optimistic list.
    if (caught.length > 0) setGrabbed((local) => local.filter((id) => !caught.includes(id)))
  }, [caught.length])

  const take = (coin: Coin) => {
    if (pending.current.has(coin.id) || caught.includes(coin.id)) return
    pending.current.add(coin.id)
    // Shown as caught immediately: a coin that stays on screen for a round trip
    // feels missed, and the server's answer arrives a frame or two later.
    setGrabbed((local) => [...local, coin.id])
    void partyAct({ type: 'catch', coinId: coin.id })
  }

  const falling = coins.filter((coin) => {
    const age = elapsed - coin.atTick
    return age >= -2 && age <= FALL_TICKS && !caught.includes(coin.id) && !grabbed.includes(coin.id)
  })

  return (
    <div className="party-coins">
      <p className="party-coins__earned" data-testid="coins-earned">
        +{earned.toLocaleString()} gold
      </p>

      <div className="party-coins__sky" data-testid="coins-sky">
        {falling.map((coin) => {
          const age = Math.max(0, elapsed - coin.atTick)
          const fallen = Math.min(1, age / FALL_TICKS)
          return (
            <button
              key={coin.id}
              type="button"
              className={`party-coins__coin party-coins__coin--${coin.kind}`}
              style={{ left: `${coin.x * 100}%`, top: `${fallen * 100}%` }}
              onPointerDown={() => take(coin)}
              data-testid={`coin-${coin.id}`}
              aria-label={`${coin.kind} coin, ${VALUE[coin.kind]} gold`}
            >
              <span className="party-coins__value">{VALUE[coin.kind]}</span>
            </button>
          )
        })}
      </div>

      <p className="party-coins__hint">Bronze 25 · Silver 50 · Gold 100</p>
    </div>
  )
}
