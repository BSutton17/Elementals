import { useEffect, useRef, useState } from 'react'
import { onGameEvents } from '../game/gameEvents'
import type { AbilityCastEvent } from '../game/events'
import './FlashBangOverlay.css'

// Light's Flash Bang. The ability stretches every cooldown already running on
// every OPPOSING kingdom, so every screen in the match is blinded EXCEPT the
// caster's: Light set the thing off and is the one player who knew to look
// away. Blinding them too would contradict the mechanic they're exempt from.
//
// The look is the real thing: an instantaneous white-out with no ramp at all,
// then a long, slow bleed back to normal as the eyes recover. There is no
// projectile and no impact — the generic bolt is suppressed in effects.ts, so
// this overlay IS the ability.

/** How long the eyes take to recover. Long and slow — that's the whole effect. */
const FADE_MS = 2600

export function FlashBangOverlay({ youId }: { youId: string | null }) {
  /** Bumped per cast, so a second Flash Bang re-blinds instead of being
   *  swallowed by the first one's fade. */
  const [burst, setBurst] = useState(0)
  const [active, setActive] = useState(false)
  // Read through a ref so the subscription isn't torn down and rebuilt when the
  // parent re-renders, which would drop a fade already in progress.
  const youIdRef = useRef(youId)
  youIdRef.current = youId

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = onGameEvents((events) => {
      for (const event of events) {
        if (event.type !== 'abilityCast') continue
        const cast = event as unknown as AbilityCastEvent
        if (cast.abilityId !== 'flashBang') continue
        // The kingdom that threw it is not blinded by it.
        if (youIdRef.current && cast.casterId === youIdRef.current) continue
        setBurst((n) => n + 1)
        setActive(true)
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => setActive(false), FADE_MS)
      }
    })
    return () => {
      unsubscribe()
      if (timer) clearTimeout(timer)
    }
  }, [])

  if (!active) return null
  // Keyed on the burst so a re-cast restarts the animation from full white.
  return <div key={burst} className="flashbang" aria-hidden="true" />
}
