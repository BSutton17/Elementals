import { useEffect, useRef, useState } from 'react'
import { onGameEvents } from '../game/gameEvents'
import type {
  BlackHoleAbsorbedEvent,
  BlackHoleCollapsedEvent,
  BlackHoleOpenedEvent,
  RawGameEvent,
} from '../game/events'
import './BlackHoleAccumulator.css'

// The glowing damage counter orbiting just outside Space's Black Hole — every
// absorbed attack visibly climbs the running total so the whole table can
// watch the stored energy build across the 10-second open window. Global (no
// youId filter): the black hole sits at the arena center, visible to everyone.
// Purely cosmetic — the server already applies the eventual dump; this only
// displays the exact `amount` it reports absorbing.

/** How long the total lingers, fading, after the hole collapses — long enough
 *  to register "that's how much was unleashed" through the implosion beat. */
const LINGER_MS = 1400

export function BlackHoleAccumulator() {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [total, setTotal] = useState(0)
  const [pulseKey, setPulseKey] = useState(0)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return onGameEvents((events: RawGameEvent[]) => {
      for (const e of events) {
        if (e.type === 'blackHoleOpened') {
          void (e as unknown as BlackHoleOpenedEvent)
          if (closeTimer.current) {
            clearTimeout(closeTimer.current)
            closeTimer.current = null
          }
          setTotal(0)
          setClosing(false)
          setOpen(true)
        } else if (e.type === 'blackHoleAbsorbed') {
          const absorbed = e as unknown as BlackHoleAbsorbedEvent
          setTotal((t) => t + absorbed.amount)
          setPulseKey((k) => k + 1)
        } else if (e.type === 'blackHoleCollapsed') {
          void (e as unknown as BlackHoleCollapsedEvent)
          setClosing(true)
          closeTimer.current = setTimeout(() => {
            setOpen(false)
            setClosing(false)
          }, LINGER_MS)
        }
      }
    })
  }, [])

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  if (!open) return null

  return (
    <div
      className={`black-hole-accumulator${closing ? ' black-hole-accumulator--closing' : ''}`}
      aria-hidden="true"
      data-testid="black-hole-accumulator"
    >
      <div className="black-hole-accumulator__orbit">
        <div key={pulseKey} className="black-hole-accumulator__badge">
          <span className="black-hole-accumulator__label">STORED</span>
          <span className="black-hole-accumulator__value">{Math.round(total).toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}
