import { useEffect, useRef } from 'react'
import { PixiStage } from '../render/stage'
import { ABILITY_EFFECTS } from '../render/effects'
import { placeKingdoms } from '../game/placement'
import { onGameEvents } from '../game/gameEvents'
import type { AbilityCastEvent, RawGameEvent } from '../game/events'

// Battlefield VFX layer (Epic 9). Mounts the PixiJS stage as a transparent
// overlay on the arena and translates authoritative gameplay events into
// framework animations. It holds NO gameplay logic: it only maps event ids →
// battlefield coordinates (via placement.ts, the same math the SVG uses) and
// forwards to the framework. Clicks pass through (pointer-events:none) so the
// SVG castles remain the interactive targeting surface.

export interface SeatOrder {
  id: string
  kingdomId: string | null
}

/** True when a WebGL context is obtainable (false in jsdom/headless tests). */
function webglAvailable(): boolean {
  try {
    const probe = document.createElement('canvas')
    return !!(probe.getContext('webgl2') || probe.getContext('webgl'))
  } catch {
    return false
  }
}

export function BattlefieldFx({ order }: { order: SeatOrder[] }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<PixiStage | null>(null)
  // Seat order can change identity between renders; read the latest inside the
  // event handler without re-subscribing.
  const orderRef = useRef(order)
  orderRef.current = order

  useEffect(() => {
    const host = hostRef.current
    if (!host || !webglAvailable()) return

    const stage = new PixiStage()
    let alive = true
    stage
      .mount(host)
      .then(() => {
        if (!alive) {
          stage.destroy()
          return
        }
        stage.framework.registry.registerMany(ABILITY_EFFECTS)
        stageRef.current = stage
      })
      .catch(() => {
        // VFX is non-critical: a failed GPU init must never break the match.
      })

    const unsubscribe = onGameEvents((events) => {
      const st = stageRef.current
      if (!st) return
      const seats = orderRef.current
      const positions = placeKingdoms(seats.length)
      const positionOf = (id: string) => {
        const i = seats.findIndex((s) => s.id === id)
        return i >= 0 ? positions[i] : undefined
      }
      const kingdomOf = (id: string) => seats.find((s) => s.id === id)?.kingdomId ?? null

      for (const event of events) {
        dispatch(event, st, positionOf, kingdomOf)
      }
    })

    return () => {
      alive = false
      unsubscribe()
      const st = stageRef.current
      stageRef.current = null
      st?.destroy()
    }
  }, [])

  return <div ref={hostRef} className="battlefield__fx" aria-hidden="true" />
}

/** Routes one authoritative event to the framework. Unknown types are ignored. */
function dispatch(
  event: RawGameEvent,
  stage: PixiStage,
  positionOf: (id: string) => { x: number; y: number } | undefined,
  kingdomOf: (id: string) => string | null,
): void {
  switch (event.type) {
    case 'abilityCast': {
      const cast = event as unknown as AbilityCastEvent
      const from = positionOf(cast.casterId)
      if (!from) return
      const sourceKingdom = kingdomOf(cast.casterId)
      for (const targetId of cast.targetIds) {
        const to = positionOf(targetId)
        if (!to) continue
        stage.framework.playAbility(cast.abilityId, { from, to, sourceKingdom })
      }
      return
    }
    default:
      return
  }
}
