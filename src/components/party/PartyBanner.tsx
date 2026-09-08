import { useEffect, useRef, useState } from 'react'
import type { PartySnapshot } from '../../game/party'
import './PartyBanner.css'

/**
 * The line across the top of the screen while a minigame runs.
 *
 * Two states and one rule: the DESCRIPTION shows for as long as the game is
 * running, and the RESULT replaces it for four seconds when it ends, then
 * fades. Games whose result is "none" send no result text and simply fade out.
 *
 * ⚠️ THE TEXT COMES FROM THE SERVER, BOTH TIMES. The description is authored
 * next to the game's rules and the result names a kingdom the server ranked, so
 * neither is written here — a second copy of "Escape the maze" on this side is
 * a copy that can drift.
 */

/**
 * Matches the server's `PARTY.RESULT_SECONDS`, plus the fade.
 *
 * ⚠️ KEEP THESE TWO IN STEP. The server decides when the session clears; this
 * decides when the banner fades. Let them drift and the line disappears while
 * the verdict it belongs to is still on screen, or hangs after the panel has
 * gone.
 */
const RESULT_MS = 5250
const FADE_MS = 600

/**
 * Games whose banner sits along the BOTTOM instead.
 *
 * ⚠️ THE TOP OF THE SCREEN IS WHERE THE FIRST FEW KINGDOMS ARE. On a phone the
 * banner covered them outright, which for a game played ON the board — you have
 * to see and press a kingdom to pass the bomb — hid the thing being played. The
 * bottom is free precisely because these games suspend attacking, so the
 * controls that normally live there are not in use.
 */
const BOTTOM_BANNER = new Set(['bombAttack'])

/**
 * Games whose description says its piece and goes, rather than standing for the
 * whole session.
 *
 * Empty since Kingdom Swap was retired — it was the only game long enough, and
 * quiet enough, for a permanent line across the top to become furniture. Kept
 * because the next long ambient game will want it.
 */
const BRIEF_MS: Record<string, number> = {}

export function PartyBanner({
  party,
  youId = null,
}: {
  party?: PartySnapshot | null
  /** The local seat, so the banner knows when THIS player is finished. */
  youId?: string | null
}) {
  // ⚠️ DERIVED, NOT STORED. What the banner says is a function of the session:
  // the description while it runs, the result once it is over. Keeping that in
  // state and filling it from an effect costs a blank first frame and puts the
  // two copies one render out of step whenever the session changes.
  // ⚠️ `!party`, NOT `party === null`. A server that predates Party Mode sends
  // no such field at all, and so does any state built before it existed — so
  // this arrives as `undefined` as readily as `null`. Checking only for null
  // threw on the undefined case, and this component sits above the whole
  // battlefield: it took the entire match screen down with it.

  // A brief game's description is only shown for its first few seconds. Read
  // off the session's own elapsed ticks rather than a local timer, so it is the
  // same few seconds on every screen and survives a re-render.
  const brief = party ? BRIEF_MS[party.gameId] : undefined
  const briefExpired =
    brief !== undefined && party !== null && party !== undefined
      ? party.elapsedTicks * 50 > brief
      : false

  /**
   * ⚠️ THE DESCRIPTION IS AN INSTRUCTION, AND IT GOES WHEN YOU HAVE FOLLOWED IT.
   * "May the odds be ever in your favor" stayed across the top of the screen
   * after a hand of blackjack was settled and the panel had gone — the player
   * was back on the battlefield being told to play a game they had finished,
   * for as long as the slowest person at the table took. The same was true of
   * "Escape the maze" once you were out.
   *
   * A RESULT is different and still shows: that is news, not an instruction.
   * Spectators have no seat, so nothing is finished and they keep the line.
   */
  const mineDone = (party && youId ? party.players[youId]?.done : false) ?? false

  const shown =
    !party
      ? null
      : party.resolved
        ? party.resultText
          ? { text: party.resultText, kind: 'result' as const }
          : null
        : briefExpired || mineDone
          ? null
          : { text: party.description, kind: 'description' as const }

  // The only thing a timer is needed for: holding the result for its four
  // seconds and then fading it, after which this stops drawing even though the
  // session may still be on the wire.
  const [expired, setExpired] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const resolved = party?.resolved ?? false
  useEffect(() => {
    for (const t of timers.current) clearTimeout(t)
    timers.current = []
    setExpired(false)
    setLeaving(false)
    if (!resolved) return

    timers.current.push(setTimeout(() => setLeaving(true), RESULT_MS - FADE_MS))
    timers.current.push(setTimeout(() => setExpired(true), RESULT_MS))
    return () => {
      for (const t of timers.current) clearTimeout(t)
      timers.current = []
    }
  }, [resolved, party?.gameId])

  useEffect(() => {
    return () => {
      for (const t of timers.current) clearTimeout(t)
    }
  }, [])

  if (!shown || expired) return null

  const bottom = party?.gameId ? BOTTOM_BANNER.has(party.gameId) : false

  return (
    <div
      className={`party-banner party-banner--${shown.kind}${
        bottom ? ' party-banner--bottom' : ''
      }${leaving ? ' party-banner--leaving' : ''}`}
      data-testid="party-banner"
      role="status"
      aria-live="polite"
    >
      <span className="party-banner__text">{shown.text}</span>
    </div>
  )
}
