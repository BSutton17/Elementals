import { useState } from 'react'
import './RoomCode.css'

/**
 * Prominently displays the four-digit room code with a button to copy it to the
 * clipboard (ticket #27).
 */
export function RoomCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable — non-fatal */
    }
  }

  return (
    <div className="room-code">
      <span className="room-code__label">Room Code</span>
      <div className="room-code__row">
        <span className="room-code__digits" aria-label={`Room code ${code}`}>
          {code}
        </span>
        <button
          type="button"
          className="room-code__copy"
          onClick={copy}
          aria-label="Copy room code"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
