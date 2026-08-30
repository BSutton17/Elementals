import { useEffect, useRef, useState } from 'react'
import { HiTrophy } from 'react-icons/hi2'
import { FaCheckCircle } from 'react-icons/fa'
import { onGameEvents } from '../../game/gameEvents'
import type { RawGameEvent } from '../../game/events'
import './MonsterSpoils.css'

/**
 * Who got paid for killing the monster, shown over their castle.
 *
 * Two rewards, two marks, and they are deliberately different shapes:
 *
 *   • a TROPHY for the kingdom that dealt the most damage — the long game
 *   • a TICK for the kingdom that landed the finishing blow — the moment
 *
 * One kingdom can take both, and when it does both marks appear side by side
 * over that castle rather than one replacing the other. That case is the whole
 * reason the rewards are split (see `monster.ts`): a kingdom that out-damaged
 * everyone AND swung last earned two things, and the screen should say so.
 *
 * ⚠️ VISUALISATION ONLY, LIKE EVERY OTHER LAYER IN HERE. The server has already
 * decided and already paid; this reads `monsterDefeated` and draws. It never
 * works out a winner from damage numbers of its own.
 *
 * Lives inside the battlefield's 1000×1000 viewBox so it shares the castles'
 * coordinate space and letterboxes with the arena.
 */

/** How long a mark stays up. Both animations end exactly here. */
const LIFETIME_MS = 3500
/** Straight up from the castle's anchor, clear of its name plate. */
const RISE_ABOVE = 132
/** Side-by-side offset when one kingdom took both rewards. */
const PAIR_OFFSET = 46
/**
 * Drawn size in user units — big enough to read at a phone's arena scale.
 *
 * ⚠️ PASSED AS `size`, NOT `width`/`height`. react-icons writes its own
 * width and height onto the <svg> AFTER spreading your props, so the two
 * attributes are silently ignored and the icon falls back to `1em` — which,
 * inside a 1000-unit viewBox, is a speck. `x`/`y` do pass through.
 */
const ICON = 64
/** Green for "you won this", the same green the heal numbers use. */
const WIN_COLOR = '#4ade80'

interface Mark {
  key: number
  x: number
  y: number
  /** `trophy` fades in and holds; `blow` fades in and rises, like a hit number. */
  kind: 'trophy' | 'blow'
}

interface MonsterDefeatedEvent {
  type: 'monsterDefeated'
  tick: number
  lastHitBy: string | null
  mostDamageBy: string | null
}

export interface MonsterSpoilsProps {
  /** Battlefield coordinate (1000×1000 space) of a player id, or undefined. */
  positionOf: (id: string) => { x: number; y: number } | undefined
}

export function MonsterSpoils({ positionOf }: MonsterSpoilsProps) {
  const [marks, setMarks] = useState<Mark[]>([])

  // The resolver's identity changes between renders; read the latest inside the
  // handler rather than resubscribing (mirrors FloatingNumbers).
  const place = useRef(positionOf)
  place.current = positionOf
  const nextKey = useRef(0)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    const unsubscribe = onGameEvents((events: RawGameEvent[]) => {
      for (const raw of events) {
        if (raw.type !== 'monsterDefeated') continue
        const event = raw as unknown as MonsterDefeatedEvent

        // Both rewards can land on one kingdom, so the marks are gathered per
        // castle first and only then placed — that is what lets a double
        // winner get two marks that sit beside each other instead of on top of
        // each other.
        const won = new Map<string, Mark['kind'][]>()
        const claim = (id: string | null, kind: Mark['kind']) => {
          if (id === null) return
          won.set(id, [...(won.get(id) ?? []), kind])
        }
        claim(event.mostDamageBy, 'trophy')
        claim(event.lastHitBy, 'blow')

        const fresh: Mark[] = []
        for (const [playerId, kinds] of won) {
          const at = place.current(playerId)
          if (at === undefined) continue
          const spread = kinds.length > 1 ? PAIR_OFFSET : 0
          kinds.forEach((kind, i) => {
            fresh.push({
              key: nextKey.current++,
              x: at.x + (spread === 0 ? 0 : i === 0 ? -spread : spread),
              y: at.y - RISE_ABOVE,
              kind,
            })
          })
        }
        if (fresh.length === 0) continue

        setMarks((current) => [...current, ...fresh])
        const keys = new Set(fresh.map((m) => m.key))
        timers.push(
          setTimeout(() => setMarks((current) => current.filter((m) => !keys.has(m.key))), LIFETIME_MS),
        )
      }
    })

    return () => {
      unsubscribe()
      for (const t of timers) clearTimeout(t)
    }
  }, [])

  return (
    <g className="battlefield__layer-spoils" aria-hidden="true">
      {marks.map((mark) =>
        mark.kind === 'trophy' ? (
          <HiTrophy
            key={mark.key}
            className="monster-spoil monster-spoil--trophy"
            x={mark.x - ICON / 2}
            y={mark.y - ICON / 2}
            size={ICON}
            color={WIN_COLOR}
          />
        ) : (
          <FaCheckCircle
            key={mark.key}
            className="monster-spoil monster-spoil--blow"
            x={mark.x - ICON / 2}
            y={mark.y - ICON / 2}
            size={ICON}
            color={WIN_COLOR}
          />
        ),
      )}
    </g>
  )
}
