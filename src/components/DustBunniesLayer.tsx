import { useEffect, useRef, useState } from 'react'
import { onGameEvents } from '../game/gameEvents'
import { DustBunnyEffect } from './DustBunnyEffect'
import type { StatusAppliedEvent, StatusExpiredEvent } from '../game/events'

// Dust Bunnies battlefield layer (Nature's ultimate). Lives inside the
// battlefield SVG (like FloatingNumbers) so it shares the 1000×1000 coordinate
// space. Nature's `dustBunnies` DoT status is applied per enemy (allEnemies), so
// each `statusApplied` spawns one hopping bunny → brawl cloud on that target, and
// each `statusExpired` collapses that target's cloud independently — clouds
// begin/end per bunny while sharing the ability's overall duration.

interface Vec2 {
  x: number
  y: number
}

interface ActiveDust {
  key: number
  targetId: string
  from: Vec2
  to: Vec2
  expiring: boolean
}

export function DustBunniesLayer({
  positionOf,
}: {
  positionOf: (id: string) => Vec2 | undefined
}) {
  const [dusts, setDusts] = useState<ActiveDust[]>([])
  const posRef = useRef(positionOf)
  posRef.current = positionOf

  useEffect(() => {
    let nextKey = 0
    const unsubscribe = onGameEvents((events) => {
      for (const event of events) {
        if (event.type === 'statusApplied' && (event as unknown as StatusAppliedEvent).statusId === 'dustBunnies') {
          const a = event as unknown as StatusAppliedEvent
          const from = posRef.current(a.sourceId)
          const to = posRef.current(a.targetId)
          if (!from || !to) continue
          setDusts((prev) =>
            // One live cloud per target; a re-apply refreshes rather than stacks.
            prev.some((d) => d.targetId === a.targetId && !d.expiring)
              ? prev
              : [...prev, { key: nextKey++, targetId: a.targetId, from: { ...from }, to: { ...to }, expiring: false }],
          )
        } else if (event.type === 'statusExpired' && (event as unknown as StatusExpiredEvent).statusId === 'dustBunnies') {
          const playerId = (event as unknown as StatusExpiredEvent).playerId
          setDusts((prev) => prev.map((d) => (d.targetId === playerId ? { ...d, expiring: true } : d)))
        }
      }
    })
    return unsubscribe
  }, [])

  const remove = (key: number) => setDusts((prev) => prev.filter((d) => d.key !== key))

  return (
    <g className="battlefield__layer-dustbunnies" aria-hidden="true">
      {dusts.map((d) => (
        <DustBunnyEffect
          key={d.key}
          from={d.from}
          to={d.to}
          targetId={d.targetId}
          expiring={d.expiring}
          onDone={() => remove(d.key)}
        />
      ))}
    </g>
  )
}
