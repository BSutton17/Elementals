import { useEffect, useState } from 'react'
import { CiSettings } from 'react-icons/ci'
import {
  partyDebugAvailable,
  partyDebugStart,
  type PartyGameId,
} from '../../game/party'
import './PartyDebugPanel.css'

/**
 * Start any minigame on demand.
 *
 * ⚠️ THE SERVER DECIDES WHETHER THIS EXISTS AT ALL. It asks once, on mount, and
 * draws nothing unless the answer is yes — and the answer is only yes for the
 * host, on a development build, over loopback. Every one of those checks is
 * repeated on the actual start, so this component being rendered by accident
 * (or forced open in devtools) achieves nothing.
 *
 * It exists because the alternative is testing fourteen minigames by waiting on
 * a one-in-ten roll every twenty-five seconds.
 */
export function PartyDebugPanel() {
  const [games, setGames] = useState<{ id: PartyGameId; description: string }[]>([])
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

  const start = async (id: PartyGameId) => {
    setBusy(id)
    setRefused(null)
    const ok = await partyDebugStart(id)
    setBusy(null)
    if (ok) setOpen(false)
    else setRefused('The server refused that — is one already running?')
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
          <p className="party-debug__note">Local host only — starts one immediately.</p>
          {games.map((game) => (
            <button
              key={game.id}
              type="button"
              className="party-debug__game"
              disabled={busy !== null}
              onClick={() => void start(game.id)}
              data-testid={`party-debug-${game.id}`}
            >
              <span className="party-debug__game-id">{game.id}</span>
              <span className="party-debug__game-desc">{game.description}</span>
            </button>
          ))}
          {refused && <p className="party-debug__refused">{refused}</p>}
        </div>
      )}
    </div>
  )
}
