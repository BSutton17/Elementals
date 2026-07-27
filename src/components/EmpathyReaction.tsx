import { useEffect, useRef, useState } from 'react'
import { FaFaceGrinHearts } from 'react-icons/fa6'
import { onGameEvents } from '../game/gameEvents'
import type { DamageEvent } from '../game/events'

// Love's "Have some Empathy!" reaction (utility VFX). While Love is empathetic,
// every hit it takes is dealt right back to the attacker — the engine emits that
// reflection as a `damage` event with cause 'empathy' (sourceId = Love,
// targetId = the attacker who just got a taste of their own medicine). Whenever
// that fires, a grinning-hearts face blooms over BOTH castles for 2.5s: Love,
// delighted, and the kingdom that walked into it.
//
// Lives inside the battlefield's 1000×1000 SVG `<g>` (like FloatingNumbers), so
// it shares the castles' coordinate space via `positionOf`. react-icons render
// as plain <svg> nodes, so the face is placed directly with x/y (mirrors
// InfatuatedAura's inline icons) — no foreignObject needed.

/** How long each face lingers — matches the CSS bloom/float/fade. */
const LIFETIME_MS = 2500
/** Face size in user units; sits just above the castle body. */
const FACE_SIZE = 84
const VERTICAL_OFFSET = 96

interface Reaction {
  key: number
  x: number
  y: number
}

export interface EmpathyReactionProps {
  /** Battlefield coordinate (1000×1000 space) of a player id, or undefined. */
  positionOf: (id: string) => { x: number; y: number } | undefined
}

export function EmpathyReaction({ positionOf }: EmpathyReactionProps) {
  const [reactions, setReactions] = useState<Reaction[]>([])

  // Resolver can change identity between renders; read the latest inside the
  // handler without re-subscribing (mirrors FloatingNumbers/BattlefieldFx).
  const positionRef = useRef(positionOf)
  positionRef.current = positionOf

  useEffect(() => {
    let nextKey = 0
    const timers = new Set<ReturnType<typeof setTimeout>>()
    // One live face per castle: rapid reflections refresh it rather than stack.
    const activeByPlayer = new Map<string, number>()

    const pop = (playerId: string) => {
      const at = positionRef.current(playerId)
      if (!at) return
      const key = nextKey++
      // Replace any face already over this castle so hits don't pile up.
      const prevKey = activeByPlayer.get(playerId)
      activeByPlayer.set(playerId, key)
      setReactions((prev) => {
        const kept = prevKey === undefined ? prev : prev.filter((r) => r.key !== prevKey)
        return [...kept, { key, x: at.x, y: at.y - VERTICAL_OFFSET }]
      })
      const remove = setTimeout(() => {
        timers.delete(remove)
        if (activeByPlayer.get(playerId) === key) activeByPlayer.delete(playerId)
        setReactions((prev) => prev.filter((r) => r.key !== key))
      }, LIFETIME_MS)
      timers.add(remove)
    }

    const unsubscribe = onGameEvents((events) => {
      for (const event of events) {
        if (event.type !== 'damage') continue
        const dmg = event as unknown as DamageEvent
        if (dmg.cause !== 'empathy') continue
        // Love (who reflected) and the attacker (who took it back) both react.
        pop(dmg.sourceId)
        pop(dmg.targetId)
      }
    })

    return () => {
      unsubscribe()
      for (const timer of timers) clearTimeout(timer)
      timers.clear()
    }
  }, [])

  return (
    <g className="battlefield__layer-empathy" aria-hidden="true">
      {reactions.map((r) => (
        // Outer group positions in battlefield space; inner group owns the CSS
        // bloom animation (a CSS transform on the outer would clobber this
        // translate, so positioning and motion are kept on separate nodes).
        <g key={r.key} transform={`translate(${r.x} ${r.y})`}>
          <g className="empathy-face">
            <FaFaceGrinHearts
              size={FACE_SIZE}
              x={-FACE_SIZE / 2}
              y={-FACE_SIZE / 2}
              color="#ff4d8d"
            />
          </g>
        </g>
      ))}
    </g>
  )
}
