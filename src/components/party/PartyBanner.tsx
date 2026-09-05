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

/** Matches the server's `PARTY.RESULT_SECONDS`, plus the fade. */
const RESULT_MS = 4000
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
 * ⚠️ KINGDOM SWAP RUNS FOR THIRTY SECONDS AND HAS NO OTHER UI AT ALL. A line
 * reading "Kingdom Swap" pinned across the top for half a minute stops being an
 * announcement and becomes furniture — and it sits over the board the borrowed
 * kit is supposed to be used on. It announces, then leaves; the ability bar has
 * already changed underneath, which is the real notification.
 */
const BRIEF_MS: Record<string, number> = { kingdomSwap: 3500 }

export function PartyBanner({ party }: { party?: PartySnapshot | null }) {
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

  const shown =
    !party
      ? null
      : party.resolved
        ? party.resultText
          ? { text: party.resultText, kind: 'result' as const }
          : null
        : briefExpired
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
