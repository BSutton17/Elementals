import { useState } from 'react'
import { useSocket } from '../sockets/useSocket'
import { useLobby } from '../game/useLobby'
import { joinRoom } from '../game/lobbyStore'
import './StartupScreen.css'

interface JoinScreenProps {
  name: string
  onName: (name: string) => void
  onBack: () => void
}

/**
 * Join screen (ticket #28): enter a four-digit room code and attempt to join an
 * existing lobby. On success the store updates and App routes to the lobby; on
 * failure the server error is shown.
 */
export function JoinScreen({ name, onName, onBack }: JoinScreenProps) {
  const { connected } = useSocket()
  const { error } = useLobby()
  const [code, setCode] = useState('')

  const nameOk = connected && name.trim().length > 0
  const codeOk = /^\d{4}$/.test(code)

  return (
    <main className="startup">
      <div className="startup__content">
        <button type="button" className="startup__back" onClick={onBack}>
          ← Back
        </button>

        <h1 className="startup__title startup__title--sm">Join Room</h1>
        <p className="startup__tagline">Enter the four-digit room code.</p>

        <input
          className="startup__input"
          type="text"
          placeholder="Your name"
          value={name}
          maxLength={24}
          onChange={(e) => onName(e.target.value)}
          aria-label="Your name"
        />

        <input
          className="startup__input startup__code-input"
          type="text"
          inputMode="numeric"
          placeholder="0000"
          value={code}
          maxLength={4}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          aria-label="Room code"
        />

        <button
          type="button"
          className="startup__play"
          disabled={!nameOk || !codeOk}
          onClick={() => void joinRoom(name.trim(), code)}
        >
          Join Room
        </button>

        {error && <p className="startup__error">{error}</p>} 
      </div>
    </main>
  )
}
