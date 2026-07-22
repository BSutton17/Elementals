import { useEffect, useState } from 'react'
import { RiVirusFill } from 'react-icons/ri'
import { onGameEvents } from '../game/gameEvents'
import type { AbilityCastEvent } from '../game/events'
import './HackOverlay.css'

// Full-screen "you've been hacked" overlay (Electricity's Hack). When the LOCAL
// player is a target of a Hack cast, the screen darkens and a big virus icon
// pulses in the centre for 2.5s. Driven off the authoritative `abilityCast`
// event; purely cosmetic. Only shows for the victim (targetIds includes youId).

const DURATION_MS = 2500

export function HackOverlay({ youId }: { youId: string | null }) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!youId) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = onGameEvents((events) => {
      for (const event of events) {
        if (event.type !== 'abilityCast') continue
        const cast = event as unknown as AbilityCastEvent
        if (cast.abilityId === 'hack' && cast.targetIds.includes(youId)) {
          setActive(true)
          if (timer) clearTimeout(timer)
          timer = setTimeout(() => setActive(false), DURATION_MS)
        }
      }
    })
    return () => {
      unsubscribe()
      if (timer) clearTimeout(timer)
    }
  }, [youId])

  if (!active) return null
  return (
    <div className="hack-overlay" aria-hidden="true">
      <RiVirusFill className="hack-overlay__icon" />
    </div>
  )
}
