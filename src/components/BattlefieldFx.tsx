import { useEffect, useRef } from 'react'
import { PixiStage } from '../render/stage'
import {
  ABILITY_EFFECTS,
  ACID_RAIN_CONFIG,
  AURA_EFFECTS,
  EARTHQUAKE_CONFIG,
  FROST_AURA_CONFIG,
  FROZEN_ATMOSPHERE_CONFIG,
  GASTRO_POISON_CONFIG,
  THUNDERDOME_CONFIG,
  WIND_DEFLECTION,
} from '../render/effects'
import { placeKingdoms } from '../game/placement'
import { onGameEvents } from '../game/gameEvents'
import type {
  AbilityCastEvent,
  DamageEvent,
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
        dispatch(event, front, back, positionOf, kingdomOf, seats)
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
  seats: SeatOrder[],
): void {
  switch (event.type) {
    case 'abilityCast': {
      const cast = event as unknown as AbilityCastEvent
      const from = positionOf(cast.casterId)
      if (!from) return
      const sourceKingdom = kingdomOf(cast.casterId)

      // Earthquake: a primary rupture at the target, then seismic waves race to
      // every OTHER kingdom (the `otherEnemies` aftershock) and strike each on
      // arrival — so the propagation is clearly visible from the origin.
      if (cast.abilityId === 'earthquake') {
        const primaryId = cast.targetIds[0]
        const primary = primaryId ? positionOf(primaryId) : undefined
        if (primary) {
          const neighbors = seats
            .filter((s) => s.id !== cast.casterId && s.id !== primaryId)
            .map((s) => positionOf(s.id))
            .filter((p): p is { x: number; y: number } => !!p)
          front.framework.playEarthquake(primary, neighbors, EARTHQUAKE_CONFIG)
        }
        return
      }
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
      // Air's passive turned some shots aside: map final target → the Air castle
      // that intercepted it, so those play the two-leg wind-deflection sequence.
      const interceptedBy = new Map((cast.redirects ?? []).map((r) => [r.to, r.via]))
      for (const targetId of cast.targetIds) {
        if (!hasEffect && targetId === cast.casterId) continue
        const to = positionOf(targetId)
        if (!to) continue
        // Gastro Acid leaves a cloud-less corrosion aura on each (final) target
        // for the strong Poison — bubbling acid, toxic fumes, drips — stopped
        // when the Poison expires. Keyed apart from the Corroded storm.
        if (cast.abilityId === 'gastroAcid') {
          front.framework.startAcidRain(auraKey('gastroPoison', targetId), to, GASTRO_POISON_CONFIG)
        }
        // Flood of Frost leaves a lingering frost on each (final) target; if
        // Chilling Retribution lands it's enhanced below and kept alive, else it
        // melts on its own after the base window.
        if (cast.abilityId === 'floodOfFrost') {
          front.framework.startFrost(auraKey('frost', targetId), to, FROST_AURA_CONFIG)
        }
        // Freeze to the Core: the dramatic cast (energy gathers inward → icy-blue
        // flash → explosive crystal eruption). The encasement + cold atmosphere
        // follow from the guaranteed `frozen` status below.
        if (cast.abilityId === 'freezeToTheCore') {
          front.framework.playFreezeCast(to, FROZEN_ATMOSPHERE_CONFIG)
        }
        // Scorching Sun's guaranteed Burn shows as bright solar flames coating
        // the target for the Burn window (5s). Self-stops on its own timer.
        if (cast.abilityId === 'scorchingSun') {
          front.framework.startAura('solarBurn', auraKey('solarBurn', targetId), to, 5000)
        }
        const viaId = interceptedBy.get(targetId)
        const via = viaId ? positionOf(viaId) : undefined
        if (via) {
          // Redirected: attacker → Air castle → new target, with the wind
          // deflection event between the two legs (instant abilities fall back
          // to a normal cast inside the framework).
          front.framework.playRedirectedAbility(
            cast.abilityId,
            { from, via, to, sourceKingdom, charges: cast.chargesUsed },
            WIND_DEFLECTION,
          )
          continue
        }
        // `chargesUsed` scales Lightning Barrage; harmless for other abilities.
        front.framework.playAbility(cast.abilityId, {
          from,
          to,
          sourceKingdom,
          charges: cast.chargesUsed,
        })
      }
      return
    }
    case 'statusApplied': {
      const applied = event as unknown as StatusAppliedEvent
      const at = positionOf(applied.targetId)
      if (!at) return
      // Thunderdome: an electrical pentagon cage around the target.
      if (applied.statusId === 'thunderdome') {
        front.framework.startThunderdome(auraKey('thunderdome', applied.targetId), at, THUNDERDOME_CONFIG)
        return
      }
      // Corroded (Nature's Acid Rain): a toxic storm cloud + acid rain + a
      // persistent chemical-corrosion aura over the target for the status.
      if (applied.statusId === 'corroded') {
        front.framework.startAcidRain(auraKey('acidRain', applied.targetId), at, ACID_RAIN_CONFIG)
        return
      }
      // Frozen (Ice's Freeze): a dense, oppressive cold atmosphere (mist, snow,
      // vapor, sparkles) around the encased castle for the freeze's duration.
      if (applied.statusId === 'frozen') {
        front.framework.startFrost(auraKey('frozen', applied.targetId), at, FROZEN_ATMOSPHERE_CONFIG)
        return
      }
      // Poison landing on an already-Corroded target is the stacking synergy —
      // intensify its corrosion (no-op if the target isn't Corroded). Falls
      // through so any future poison aura still resolves below.
      if (applied.statusId === 'poison') {
        front.framework.surgeAcidRain(auraKey('acidRain', applied.targetId))
      }
      // Chilling Retribution landed (Flood of Frost, 35%): enhance the lingering
      // frost with magical energy + runes and keep it alive for the status.
      if (applied.statusId === 'chillingRetribution') {
        const key = auraKey('frost', applied.targetId)
        // If the base frost already melted (unlikely — same cast), restart it.
        if (!front.framework.hasFrost(key)) front.framework.startFrost(key, at, FROST_AURA_CONFIG)
        front.framework.enhanceFrost(key)
        return
      }
      // Persistent auras (Heat Wave smoke, Blazing Determination flames, Burn
      // smoke). Unregistered status ids are ignored by the framework.
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
      if (expired.statusId === 'thunderdome') {
        front.framework.stopThunderdome(auraKey('thunderdome', expired.playerId))
        return
      }
      if (expired.statusId === 'corroded') {
        front.framework.stopAcidRain(auraKey('acidRain', expired.playerId))
        return
      }
      // The strong Poison faded — dissolve Gastro Acid's corrosion aura (bubbling
      // slows, fumes thin, residue evaporates) rather than cutting it dead.
      if (expired.statusId === 'poison') {
        front.framework.stopAcidRain(auraKey('gastroPoison', expired.playerId))
        return
      }
      // Chilling Retribution faded — melt the frost into cold mist.
      if (expired.statusId === 'chillingRetribution') {
        front.framework.stopFrost(auraKey('frost', expired.playerId))
        return
      }
      // Freeze ended — thaw the frozen atmosphere into cold mist.
      if (expired.statusId === 'frozen') {
        front.framework.stopFrost(auraKey('frozen', expired.playerId))
        return
      }
      const key = auraKey(expired.statusId, expired.playerId)
      front.framework.stopAura(key)
      back?.framework.stopAura(key)
      return
    }
    case 'damage': {
      // An Electricity hit on a trapped target surges its Thunderdome (no-op if
      // there isn't one). The floating damage number is handled separately.
      const dmg = event as unknown as DamageEvent
      if (dmg.element === 'electricity') {
        front.framework.surgeThunderdome(auraKey('thunderdome', dmg.targetId))
      }
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
