import { useEffect, useState } from 'react'
import { onGameEvents } from '../game/gameEvents'
import type { AbilityCastEvent } from '../game/events'
import './FlashBangOverlay.css'

// Light's Flash Bang. The ability stretches every cooldown already running on
// EVERY kingdom — the caster's included — so the blast is not aimed at anyone
// and every screen in the match takes it.
//
// The look is the real thing: an instantaneous white-out with no ramp at all,
// then a long, slow bleed back to normal as the eyes recover. There is no
// projectile and no impact — the generic bolt is suppressed in effects.ts, so
// this overlay IS the ability.

/** How long the eyes take to recover. Long and slow — that's the whole effect. */
const FADE_MS = 2600

export function FlashBangOverlay() {
  /** Bumped per cast, so a second Flash Bang re-blinds instead of being
   *  swallowed by the first one's fade. */
  const [burst, setBurst] = useState(0)
  const [active, setActive] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = onGameEvents((events) => {
      for (const event of events) {
        if (event.type !== 'abilityCast') continue
        const cast = event as unknown as AbilityCastEvent
        if (cast.abilityId !== 'flashBang') continue
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
