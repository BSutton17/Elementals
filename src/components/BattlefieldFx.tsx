import { useEffect, useRef } from 'react'
import { PixiStage } from '../render/stage'
import { ABILITY_EFFECTS, AURA_EFFECTS } from '../render/effects'
import { placeKingdoms } from '../game/placement'
import { onGameEvents } from '../game/gameEvents'
import type {
  AbilityCastEvent,
  RawGameEvent,
  ShieldDestroyedEvent,
  StatusAppliedEvent,
  StatusExpiredEvent,
} from '../game/events'

// Battlefield VFX layer (Epic 9). Mounts PixiJS as transparent overlays on the
// arena and translates authoritative gameplay events into framework animations.
// It holds NO gameplay logic: it only maps event ids → battlefield coordinates
// (via placement.ts, the same math the SVG uses) and forwards to the framework.
//
// TWO canvases share the arena box: a FRONT canvas above the SVG castles (all
// projectiles, beams, vortices, impacts, and most auras) and a BACK canvas
// beneath them (auras flagged `behind`, e.g. Blazing Determination's flames, so
// the castle silhouette stays visible in front of the fire). Both are
// pointer-events:none so the SVG remains the interactive targeting surface. The
// front stage alone owns the screen-shake transform (both canvases sit inside
// the arena box, so it shakes them together).

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
  const frontHostRef = useRef<HTMLDivElement>(null)
  const backHostRef = useRef<HTMLDivElement>(null)
  const frontRef = useRef<PixiStage | null>(null)
  const backRef = useRef<PixiStage | null>(null)
  // Seat order can change identity between renders; read the latest inside the
  // event handler without re-subscribing.
  const orderRef = useRef(order)
  orderRef.current = order

  useEffect(() => {
    const frontHost = frontHostRef.current
    const backHost = backHostRef.current
    if (!frontHost || !backHost || !webglAvailable()) return

    let alive = true
    const stages: PixiStage[] = []

    // Front stage: everything in front of the castles; owns the screen shake.
    const front = new PixiStage()
    stages.push(front)
    front
      .mount(frontHost)
      .then(() => {
        if (!alive) return
        front.framework.registry.registerMany(ABILITY_EFFECTS)
        front.framework.registerAuras(AURA_EFFECTS)
        frontRef.current = front
      })
      .catch(() => {
        // VFX is non-critical: a failed GPU init must never break the match.
      })

    // Back stage: `behind` auras only; must not drive the shared shake transform.
    const back = new PixiStage({ screenShake: false })
    stages.push(back)
    back
      .mount(backHost)
      .then(() => {
        if (!alive) return
        back.framework.registerAuras(AURA_EFFECTS)
        backRef.current = back
      })
      .catch(() => {})

    const unsubscribe = onGameEvents((events) => {
      const front = frontRef.current
      if (!front) return
      const back = backRef.current
      const seats = orderRef.current
      const positions = placeKingdoms(seats.length)
      const positionOf = (id: string) => {
        const i = seats.findIndex((s) => s.id === id)
        return i >= 0 ? positions[i] : undefined
      }
      const kingdomOf = (id: string) => seats.find((s) => s.id === id)?.kingdomId ?? null

      for (const event of events) {
        dispatch(event, front, back, positionOf, kingdomOf)
      }
    })

    return () => {
      alive = false
      unsubscribe()
      frontRef.current = null
      backRef.current = null
      for (const stage of stages) stage.destroy()
    }
  }, [])

  return (
    <>
      <div ref={backHostRef} className="battlefield__fx battlefield__fx--back" aria-hidden="true" />
      <div ref={frontHostRef} className="battlefield__fx" aria-hidden="true" />
    </>
  )
}

/** Routes one authoritative event to the framework. Unknown types are ignored. */
function dispatch(
  event: RawGameEvent,
  front: PixiStage,
  back: PixiStage | null,
  positionOf: (id: string) => { x: number; y: number } | undefined,
  kingdomOf: (id: string) => string | null,
): void {
  switch (event.type) {
    case 'abilityCast': {
      const cast = event as unknown as AbilityCastEvent
      const from = positionOf(cast.casterId)
      if (!from) return
      const sourceKingdom = kingdomOf(cast.casterId)
      // Water sustain abilities leave the CASTER's own castle bubbling for a
      // window (there's no self-status to drive it, so it's time-boxed here).
      const mistMs = MIST_ON_CAST_MS[cast.abilityId]
      if (mistMs) {
        front.framework.startAura('misting', auraKey('misting', cast.casterId), from, mistMs)
      }
      // Self-buffs (utility/ultimate) cast on themselves; without a registered
      // effect the generic fallback would fire a projectile at the caster's own
      // castle ("hitting itself"). Those are shown by their status aura instead,
      // so skip the fallback for a self-target with no registered effect.
      const hasEffect = front.framework.registry.has(cast.abilityId)
      for (const targetId of cast.targetIds) {
        if (!hasEffect && targetId === cast.casterId) continue
        const to = positionOf(targetId)
        if (!to) continue
        front.framework.playAbility(cast.abilityId, { from, to, sourceKingdom })
      }
      return
    }
    case 'statusApplied': {
      // Persistent auras (Heat Wave smoke, Blazing Determination flames, Burn
      // smoke). Unregistered status ids are ignored by the framework.
      const applied = event as unknown as StatusAppliedEvent
      const at = positionOf(applied.targetId)
      if (!at) return
      const def = AURA_EFFECTS[applied.statusId]
      if (!def) return
      const key = auraKey(applied.statusId, applied.targetId)
      const stage = def.behind ? (back ?? front) : front
      // The back stage's camera doesn't drive the screen shake — mirror any
      // ignite shake onto the front stage so it's actually felt.
      if (def.behind && def.shakeOnStart && back && !back.framework.auras.has(key)) {
        front.framework.camera.shake(def.shakeOnStart)
      }
      stage.framework.startAura(applied.statusId, key, at)
      return
    }
    case 'statusExpired': {
      const expired = event as unknown as StatusExpiredEvent
      const key = auraKey(expired.statusId, expired.playerId)
      front.framework.stopAura(key)
      back?.framework.stopAura(key)
      return
    }
    case 'shieldDestroyed': {
      // The persistent shield ring/octagon lives in the SVG (KingdomSite); this
      // is the one-shot shatter when it breaks, tinted to the kingdom.
      const broken = event as unknown as ShieldDestroyedEvent
      const at = positionOf(broken.playerId)
      if (!at) return
      front.framework.playAbility('shieldBreak', {
        from: at,
        to: at,
        sourceKingdom: kingdomOf(broken.playerId),
      })
      return
    }
    default:
      return
  }
}

/** Unique aura key per (status, castle) so it can be stopped on expiry. */
function auraKey(statusId: string, playerId: string): string {
  return `${statusId}:${playerId}`
}

/**
 * Water abilities that leave the caster's own castle bubbling ("misting") for a
 * window after the cast, keyed by ability id → duration in ms. There's no server
 * status for this (Fluid Assimilation marks enemies, Flood marks its target), so
 * the aura self-stops after the window instead of on `statusExpired`.
 */
const MIST_ON_CAST_MS: Record<string, number> = {
  fluidAssimilation: 10_000, // ~the protection window
  flood: 5_000, // lingering wet after washing over a target
}
