import { useState } from 'react'
import { useSocket } from '../sockets/useSocket'
import { useLobby } from '../game/useLobby'
import { createRoom } from '../game/lobbyStore'
import { HowToPlay } from './HowToPlay'
import { hasSeenTutorial } from '../game/tutorial'
import './StartupScreen.css'

interface StartupScreenProps {
  name: string
  onName: (name: string) => void
  onJoin: () => void
}

/**
 * Main menu: set a name and either host a room or go to the join screen. Once in
 * a room, App routes to the lobby. Also hosts the How to Play walkthrough —
 * with a gentle pulse on the button until it's been opened once.
 */
export function StartupScreen({ name, onName, onJoin }: StartupScreenProps) {
  const { connected } = useSocket()
  const { error } = useLobby()
  const [showHowTo, setShowHowTo] = useState(false)
  // Evaluated once per mount: nudge new players toward the tutorial.
  const [nudge] = useState(() => !hasSeenTutorial())

  const nameOk = connected && name.trim().length > 0

  return (
    <main className="startup">
      <div className="startup__content">
        <h1 className="startup__title">Elementals</h1>
        <input
          className="startup__input"
          type="text"
          placeholder="Your name"
          value={name}
          maxLength={24}
          onChange={(e) => onName(e.target.value)}
          aria-label="Your name"
        />

        <button
          type="button"
          className="startup__play"
          disabled={!nameOk}
          onClick={() => void createRoom(name.trim())}
        >
          Create Room
        </button>

        <button type="button" className="startup__secondary" onClick={onJoin}>
          Join Room
        </button>

        <button
          type="button"
          className={`startup__secondary startup__howto${nudge && !showHowTo ? ' startup__howto--nudge' : ''}`}
          onClick={() => setShowHowTo(true)}
        >
          How to Play
        </button>

        {error && <p className="startup__error">{error}</p>}

        <div
          className={`startup__status startup__status--${connected ? 'online' : 'offline'}`}
        >
        </div>
      </div>

      {showHowTo && <HowToPlay onClose={() => setShowHowTo(false)} />}
    </main>
  )
}
