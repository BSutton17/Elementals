import { useEffect, useState } from 'react'
import { CiSettings } from 'react-icons/ci'
import {
  partyDebugAvailable,
  partyDebugStart,
  type PartyDebugGame,
  type PartyGameId,
} from '../../game/party'
import './PartyDebugPanel.css'

/**
 * Start any minigame on demand.
 *
 * ⚠️ THE SERVER DECIDES WHETHER THIS EXISTS AT ALL. It asks once, on mount, and
 * draws nothing unless the answer is yes — a development build over loopback,
 * or, temporarily, an admin on the deployed one. Every check is repeated on the
 * actual start, so this component being rendered by accident (or forced open in
 * devtools) achieves nothing.
 *
 * ⚠️ AND THE LIST COMES FROM THE SERVER, NOT FROM HERE. A minigame that is
 * renamed, added or removed shows up correctly in this panel without this file
 * being touched — which matters, because a launcher that quietly lists fifteen
 * of sixteen is worse than no launcher: the missing one looks tested.
 *
 * It exists because the alternative is testing sixteen minigames by waiting on
 * a one-in-ten roll every twenty-five seconds.
 */
export function PartyDebugPanel() {
  const [games, setGames] = useState<PartyDebugGame[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<PartyGameId | null>(null)
  const [refused, setRefused] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void partyDebugAvailable().then((answer) => {
      if (cancelled) return
      setGames(answer.available ? answer.games : [])
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (games.length === 0) return null

  const refresh = () =>
    void partyDebugAvailable().then((next) => setGames(next.available ? next.games : []))

  const start = async (id: PartyGameId) => {
    setBusy(id)
    setRefused(null)
    const answer = await partyDebugStart(id)
    setBusy(null)
    if (answer.ok) {
      setOpen(false)
      // Re-asked because starting one changes what the others can do: raising
      // ghosts is exactly what makes Haunted startable.
      refresh()
    } else {
      setRefused(answer.error ?? 'The server refused that')
    }
  }

  return (
    <div className="party-debug">
      <button
        type="button"
        className="party-debug__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        data-testid="party-debug-toggle"
      >
        <CiSettings aria-hidden /> Minigames
      </button>

      {open && (
        <div className="party-debug__panel" data-testid="party-debug-panel">
          <p className="party-debug__note">
            {games.length} minigames — starts one now, cutting off any already running.
          </p>
          {games.map((game) => (
            <button
              key={game.id}
              type="button"
              className={`party-debug__game${game.reason ? ' party-debug__game--blocked' : ''}`}
              // Blocked ones are still pressable. The reason can be a second or
              // two stale, and for testing a button that refuses out loud beats
              // one that cannot be pressed and does not say why.
              disabled={busy !== null}
              onClick={() => void start(game.id)}
              data-testid={`party-debug-${game.id}`}
              title={game.reason ?? game.description}
            >
              <span className="party-debug__game-id">{game.id}</span>
              <span className="party-debug__game-desc">
                {game.reason ?? game.description}
              </span>
            </button>
          ))}
          {refused && <p className="party-debug__refused">{refused}</p>}
        </div>
      )}
    </div>
  )
}
