import { useEffect, useRef, useState } from 'react'
import { CgDanger } from 'react-icons/cg'
import { onGameEvents } from '../../game/gameEvents'
import type { HotAshMarkedEvent } from '../../game/events'
import './HotAshLayer.css'

// Magma's "Hot ash", drawn inside the arena SVG above every kingdom currently
// aiming at Magma.
//
// The mark changes nothing on its own — it is a periodic readout of who is
// already taking extra damage from Magma for pointing at it. It is shown to
// MAGMA ALONE: it is Magma's read on who is committed against it, and putting
// it on everyone's screen would hand the whole table that intelligence for
// free. Gated on the event's `ownerId`, so a match with two Magmas (or a
// spectator) can never leak one player's board to another.

/** How far above the castle the warning sits, in arena units. */
const ABOVE = 178

interface Mark {
  key: number
  playerIds: string[]
}

export function HotAshLayer({
  positionOf,
  tickRate,
  youId,
}: {
  positionOf: (id: string) => { x: number; y: number } | undefined
  tickRate: number
  /** The local player. Only the Magma being aimed at sees these marks. */
  youId: string | null
}) {
  const [marks, setMarks] = useState<Mark[]>([])
  // Read through refs: both are rebuilt every render, and putting them in the
  // effect's deps would re-subscribe constantly and drop pending timers.
  const locate = useRef(positionOf)
  locate.current = positionOf
  const rate = useRef(tickRate)
  rate.current = tickRate
  const me = useRef(youId)
  me.current = youId

  useEffect(() => {
    let seq = 0
    const timers: ReturnType<typeof setTimeout>[] = []

    const unsubscribe = onGameEvents((events) => {
      for (const event of events) {
        if (event.type !== 'hotAshMarked') continue
        const marked = event as unknown as HotAshMarkedEvent
        if (marked.targeterIds.length === 0) continue
        // Magma's own screen only — everyone else is told nothing.
        if (marked.ownerId !== me.current) continue

        const key = ++seq
        setMarks((prev) => [...prev, { key, playerIds: marked.targeterIds }])
        const ms = (marked.durationTicks / Math.max(1, rate.current)) * 1000
        timers.push(
          setTimeout(() => setMarks((prev) => prev.filter((m) => m.key !== key)), ms),
        )
      }
    })

    return () => {
      unsubscribe()
      timers.forEach(clearTimeout)
    }
  }, [])

  if (marks.length === 0) return null

  return (
    <g className="hot-ash" data-testid="hot-ash" aria-hidden="true">
      {marks.map((mark) =>
        mark.playerIds.map((id) => {
          const at = locate.current(id)
          if (!at) return null
          return (
            <g
              key={`${mark.key}-${id}`}
              className="hot-ash__mark"
              transform={`translate(${at.x} ${at.y - ABOVE})`}
              data-testid={`hot-ash-${id}`}
            >
              <CgDanger size={74} x={-37} y={-37} color="#ff7518" />
            </g>
          )
        }),
      )}
    </g>
  )
}
