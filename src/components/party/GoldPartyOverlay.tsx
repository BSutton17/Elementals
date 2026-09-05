import { useEffect, useRef, useState } from 'react'
import { partyAct, type PartySnapshot } from '../../game/party'
import './GoldPartyOverlay.css'

/**
 * Coins, falling across the match you are already playing.
 *
 * ⚠️ NO PANEL, NO COUNTER, NO CLOCK — AND ALL THREE WERE HERE. Gold Party was a
 * card in the middle of the screen with its own little sky, an earned-so-far
 * total and a legend explaining what each coin was worth. That is a slot
 * machine, not a party: it hid the battlefield, and it turned catching coins
 * into reading a receipt. What is left is the coins themselves over the real
 * board, and the banner at the top naming the event.
 *
 * ⚠️ THE OVERLAY ITSELF IS NOT CLICKABLE, ONLY THE COINS ARE. It covers the
 * whole viewport, so taking pointer events would mean nobody could target,
 * attack or buy anything for ten seconds — the match would freeze behind a
 * transparent sheet. `pointer-events` is off on the layer and on for each coin.
 *
 * ⚠️ THE SERVER DEALT THE SHOWER; THIS ONLY DROPS IT. Every coin arrives with
 * an id, a kind, a lane and the tick it enters on, so each position is a
 * function of elapsed time rather than of anything this side invented — which
 * is what makes every player's screen show the same rain and what makes a catch
 * checkable. A client that spawned its own coins would be deciding its own
 * income. And position is COMPUTED, not accumulated: stepping each coin down a
 * little per frame drifts the moment a frame is dropped, and on a phone that is
 * constantly — the coin under your finger would stop being the coin the server
 * thinks you caught.
 */

interface Coin {
  id: number
  kind: 'bronze' | 'silver' | 'gold'
  x: number
  atTick: number
}

/** How long a coin takes to cross the screen, in ticks. */
const FALL_TICKS = 44

export function GoldPartyOverlay({
  party,
  youId,
}: {
  party: PartySnapshot | null | undefined
  youId: string | null
}) {
  const [grabbed, setGrabbed] = useState<number[]>([])
  const pending = useRef(new Set<number>())

  const mine = party && youId ? party.players[youId] : undefined
  const caught = (mine?.data.caught as number[] | undefined) ?? []
  const caughtCount = caught.length

  useEffect(() => {
    // Anything the server has confirmed can leave the local optimistic list.
    if (caughtCount > 0) setGrabbed((local) => local.filter((id) => !caught.includes(id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caughtCount])

  if (!party || party.gameId !== 'goldParty' || party.resolved) return null
  if (!mine) return null

  const coins = (party.shared.coins as Coin[] | undefined) ?? []
  // The tick advances with the sync (20/s); the motion between syncs comes from
  // the CSS transition on each coin, so the fall stays smooth without this
  // component re-rendering at frame rate.
  const elapsed = party.elapsedTicks

  const take = (coin: Coin) => {
    if (pending.current.has(coin.id) || caught.includes(coin.id)) return
    pending.current.add(coin.id)
    // Shown as caught immediately: a coin that stays on screen for a round trip
    // feels missed, and the server's answer is a frame or two behind.
    setGrabbed((local) => [...local, coin.id])
    void partyAct({ type: 'catch', coinId: coin.id })
  }

  const falling = coins.filter((coin) => {
    const age = elapsed - coin.atTick
    return (
      age >= -2 && age <= FALL_TICKS && !caught.includes(coin.id) && !grabbed.includes(coin.id)
    )
  })

  return (
    <div className="gold-party" data-testid="gold-party">
      {falling.map((coin) => {
        const age = Math.max(0, elapsed - coin.atTick)
        const fallen = Math.min(1, age / FALL_TICKS)
        return (
          <button
            key={coin.id}
            type="button"
            className={`gold-party__coin gold-party__coin--${coin.kind}`}
            style={{ left: `${coin.x * 100}%`, top: `${fallen * 100}%` }}
            onPointerDown={() => take(coin)}
            data-testid={`coin-${coin.id}`}
            aria-label={`${coin.kind} coin`}
          />
        )
      })}
    </div>
  )
}
