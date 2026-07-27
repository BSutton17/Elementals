import { useEffect, useRef } from 'react'
import { PixiStage } from '../render/stage'
import {
  ABILITY_EFFECTS,
  ACID_RAIN_CONFIG,
  AURA_EFFECTS,
  BFFS_CONFIG,
  BLACK_HOLE_CONFIG,
  CUPIDS_ARROW_CONFIG,
  EARTHQUAKE_CONFIG,
  FROST_AURA_CONFIG,
  FROZEN_ATMOSPHERE_CONFIG,
  GASTRO_POISON_CONFIG,
  ORIONS_BELT_CONFIG,
  SUPERNOVA_CONFIG,
  THUNDERDOME_CONFIG,
  WIND_DEFLECTION,
} from '../render/effects'
import { hexToNumber } from '../render/colors'
import { placeKingdoms } from '../game/placement'
import { onGameEvents } from '../game/gameEvents'
import { ABILITY_METADATA } from '../game/abilities'
import type {
  AbilityCastEvent,
  AttackMissedEvent,
  BlackHoleCollapsedEvent,
  BlackHoleOpenedEvent,
  DamageEvent,
  RawGameEvent,
  ResourceTransferEvent,
  ShieldDestroyedEvent,
  StatusAppliedEvent,
  StatusExpiredEvent,
  SupernovaFiredEvent,
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

export function BattlefieldFx({ order, tickRate = 20 }: { order: SeatOrder[]; tickRate?: number }) {
  const frontHostRef = useRef<HTMLDivElement>(null)
  const backHostRef = useRef<HTMLDivElement>(null)
  const frontRef = useRef<PixiStage | null>(null)
  const backRef = useRef<PixiStage | null>(null)
  // Seat order can change identity between renders; read the latest inside the
  // event handler without re-subscribing.
  const orderRef = useRef(order)
  orderRef.current = order
  const tickRateRef = useRef(tickRate)
  tickRateRef.current = tickRate
  // Whether a Black Hole is currently open (between its 'blackHoleOpened' and
  // 'blackHoleCollapsed' events) — while true, every attack-kind cast from
  // every kingdom is intercepted instead of dispatched normally.
  const blackHoleOpenRef = useRef(false)

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

      // Pre-scan: Supernova's forced-redirect (levels 2/3, when the server's
      // chance roll actually succeeds) shows up as `supernovaLock` statusApplied
      // events on the BYSTANDERS it hijacked — same tick as the `supernovaFired`
      // event, but naming them, not the victim. Correlate by (caster, tick) so
      // the whole charge→explosion→collapse→singularity sequence can be handed
      // to the framework as ONE continuous call, timed off its own internal
      // phases rather than guessed from here.
      const supernovaWellMs = new Map<string, number>()
      for (const e of events) {
        if (e.type !== 'statusApplied') continue
        const applied = e as unknown as StatusAppliedEvent
        if (applied.statusId !== 'supernovaLock') continue
        const key = `${applied.sourceId}:${applied.tick}`
        if (!supernovaWellMs.has(key)) {
          supernovaWellMs.set(key, (applied.durationTicks / tickRateRef.current) * 1000)
        }
      }

      // Pre-scan: Orion's Belt causes the server to silently drop a hit's
      // effects on its target — the `abilityCast` that launched it still names
      // that target normally (it doesn't know it whiffed). A same-tick
      // `attackMissed` names exactly which (attacker, target, ability) leg of
      // this batch should play the deflection instead of a normal impact.
      const orionsMisses = new Set<string>()
      for (const e of events) {
        if (e.type !== 'attackMissed') continue
        const missed = e as unknown as AttackMissedEvent
        orionsMisses.add(`${missed.attackerId}:${missed.tick}:${missed.playerId}:${missed.abilityId}`)
      }

      for (const event of events) {
        dispatch(event, front, back, positionOf, kingdomOf, seats, supernovaWellMs, blackHoleOpenRef, tickRateRef.current, orionsMisses)
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
  supernovaWellMs: Map<string, number>,
  blackHoleOpenRef: { current: boolean },
  tickRate: number,
  orionsMisses: Set<string>,
): void {
  switch (event.type) {
    case 'abilityCast': {
      const cast = event as unknown as AbilityCastEvent
      const from = positionOf(cast.casterId)
      if (!from) return
      const sourceKingdom = kingdomOf(cast.casterId)

      // Supernova's whole visual is owned by the later 'supernovaFired' event
      // (which alone carries the charge level); suppress the generic fallback
      // bolt this event would otherwise fire.
      if (cast.abilityId === 'supernova') return

      // BFFS!!!: twin heart pendants fly to BOTH selected kingdoms, then a
      // ribbon snaps between them. Needs both targetIds, which only this cast
      // event carries. (The persistent link ribbon is BffsLinkLayer, driven by
      // the bffsLink status events.)
      if (cast.abilityId === 'bffs') {
        const toA = cast.targetIds[0] ? positionOf(cast.targetIds[0]) : undefined
        const toB = cast.targetIds[1] ? positionOf(cast.targetIds[1]) : undefined
        if (toA && toB) front.framework.playBffs(from, toA, toB, BFFS_CONFIG)
        return
      }

      // Black Hole open: EVERY attack-kind cast from EVERY kingdom (including
      // this one) is intercepted instead of resolving normally — a traveling
      // attack curves into it mid-flight, an instant one is generically torn
      // apart and dragged in. Utility/ultimate self-casts are untouched.
      if (blackHoleOpenRef.current && cast.abilityId !== 'blackHole') {
        const meta = ABILITY_METADATA[cast.abilityId]
        if (meta?.kind === 'attack') {
          const fallbackColor = hexToNumber(meta.color)
          for (const targetId of cast.targetIds) {
            const to = positionOf(targetId)
            if (!to) continue
            front.framework.interceptIntoBlackHole(cast.abilityId, from, to, sourceKingdom, BLACK_HOLE_CONFIG, fallbackColor)
          }
          return
        }
      }

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
        // Orion's Belt: this specific leg whiffed — the attack travels exactly
        // as normal, then gravity bends it off to a nearby stone instead of
        // landing, streaming stellar energy back into the defender's meter.
        // Replaces the normal impact treatment for JUST this target; any other
        // targets in a multi-target cast still resolve normally.
        if (orionsMisses.has(`${cast.casterId}:${cast.tick}:${targetId}:${cast.abilityId}`)) {
          const missMeta = ABILITY_METADATA[cast.abilityId]
          front.framework.deflectByOrionsBelt(
            cast.abilityId,
            from,
            to,
            sourceKingdom,
            ORIONS_BELT_CONFIG,
            hexToNumber(missMeta?.color ?? '#ffffff'),
          )
          continue
        }
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
      // Love's Cupid's Arrow: a share of Love's damage redirected onto an
      // infatuated kingdom — the shared-pain ribbon snaps taut between them.
      if (dmg.cause === 'infatuated') {
        const loveAt = positionOf(dmg.sourceId)
        const targetAt = positionOf(dmg.targetId)
        if (loveAt && targetAt) front.framework.playSharedPainRibbon(loveAt, targetAt, CUPIDS_ARROW_CONFIG)
      }
      return
    }
    case 'resourceTransfer': {
      // Love's Cupid's Arrow: citizen spirits skip between the two castles —
      // outward when "infatuated" is applied (cause: the ability id) and home
      // again when it expires naturally (cause: 'infatuated'). Both directions
      // read straight off fromId → toId, no special-casing needed.
      const transfer = event as unknown as ResourceTransferEvent
      if (transfer.resource === 'citizens' && (transfer.cause === 'cupidsArrow' || transfer.cause === 'infatuated')) {
        const from = positionOf(transfer.fromId)
        const to = positionOf(transfer.toId)
        if (from && to) front.framework.playCitizenSpirits(from, to, CUPIDS_ARROW_CONFIG, Math.max(1, transfer.amount))
      }
      return
    }
    case 'supernovaFired': {
      // Space's ultimate: a star ignites at the caster, explodes, then collapses
      // onto the target, scaled by charge level (1–3). If the pre-scan found a
      // same-tick `supernovaLock` from this caster, the redirect actually fired
      // (level 2/3 only) — hand its exact duration through so the singularity
      // starts the moment the final impact lands, self-timed to match.
      const fired = event as unknown as SupernovaFiredEvent
      const from = positionOf(fired.playerId)
      const to = positionOf(fired.targetId)
      if (!from || !to) return
      const wellMs = supernovaWellMs.get(`${fired.playerId}:${fired.tick}`) ?? 0
      front.framework.playSupernova(from, to, SUPERNOVA_CONFIG, fired.level, wellMs)
      return
    }
    case 'blackHoleOpened': {
      // Space's other ultimate: a singularity ignites at the ARENA CENTER and
      // opens the interception window (see the abilityCast branch above).
      const opened = event as unknown as BlackHoleOpenedEvent
      blackHoleOpenRef.current = true
      const durationMs = (opened.durationTicks / tickRate) * 1000
      front.framework.openBlackHole(BLACK_HOLE_CONFIG, durationMs)
      return
    }
    case 'blackHoleAbsorbed': {
      // One attack was swallowed — charging feedback (the running total is a
      // separate DOM overlay driven off this same event).
      front.framework.pulseBlackHole(BLACK_HOLE_CONFIG)
      return
    }
    case 'blackHoleCollapsed': {
      // Closes the interception window, then implosion → singularity hold →
      // (if named) the colossal Judgment Beam → recovery.
      const collapsed = event as unknown as BlackHoleCollapsedEvent
      blackHoleOpenRef.current = false
      const victimAt = collapsed.victimId ? (positionOf(collapsed.victimId) ?? null) : null
      front.framework.collapseBlackHole(BLACK_HOLE_CONFIG, victimAt)
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
