import { useEffect, useRef, useState } from 'react'
import { joinPublicRoom } from '../game/lobbyStore'
import './SearchingScreen.css'

interface SearchingScreenProps {
  name: string
  /** Called once a room is found AND the hand-off animation has played. */
  onSeated: () => void
  onCancel: () => void
}

/** How long the found-a-room beat is held before the lobby appears. */
const HANDOFF_MIN_MS = 1500
const HANDOFF_MAX_MS = 2500

/**
 * Matchmaking, with the wait made legible.
 *
 * The server searches for an existing room for up to fifteen seconds before
 * opening one — so two people who queue close together land in the same lobby
 * rather than each starting a room alone. That is a long time to show nothing,
 * hence the spinner and the reassurance underneath it.
 *
 * ⚠️ THE HAND-OFF PAUSE IS DELIBERATE, NOT LATENCY. When a room is found the
 * text fades and the screen holds for 1.5-2.5s before the lobby appears.
 * Snapping straight from "Searching" to a full lobby reads as a glitch: the
 * player has no moment to register that the search succeeded, and arrives
 * already behind on a screen full of names. The pause is where "found one"
 * lands.
 */
export function SearchingScreen({ name, onSeated, onCancel }: SearchingScreenProps) {
  const [phase, setPhase] = useState<'searching' | 'found' | 'failed'>('searching')
  const [error, setError] = useState<string | null>(null)
  // Guards against a late resolve after the player has cancelled and unmounted.
  const live = useRef(true)

  useEffect(() => {
    live.current = true
    void (async () => {
      const res = await joinPublicRoom(name)
      if (!live.current) return
      if (!res.ok) {
        setError(res.error?.message ?? 'Could not find a match')
        setPhase('failed')
        return
      }
      setPhase('found')
      const hold = HANDOFF_MIN_MS + Math.random() * (HANDOFF_MAX_MS - HANDOFF_MIN_MS)
      window.setTimeout(() => {
        if (live.current) onSeated()
      }, hold)
    })()
    return () => {
      live.current = false
    }
    // Runs once per mount: re-queuing on a re-render would open a second search.
  }, [])

  return (
    <main className="searching">
      <div className="searching__content">
        <div
          className={`searching__spinner${phase === 'found' ? ' searching__spinner--found' : ''}`}
          role="progressbar"
          aria-label="Searching for a match"
        />

        {/* The text fades on `found`; the spinner keeps turning underneath so
            the screen does not go empty during the hand-off. */}
        <div className={`searching__text${phase !== 'searching' ? ' searching__text--out' : ''}`}>
          <h2 className="searching__title">Searching for room…</h2>
          <p className="searching__hint">Looking for other players</p>
        </div>

        {phase === 'failed' && (
          <div className="searching__failed">
            <p className="searching__error">{error}</p>
            <button type="button" className="searching__cancel" onClick={onCancel}>
              Back
            </button>
          </div>
        )}

        {phase === 'searching' && (
          <button type="button" className="searching__cancel" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </main>
  )
}
