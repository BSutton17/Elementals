import { useEffect, useRef, useState } from 'react'
import { onGameEvents } from '../game/gameEvents'
import { ABILITY_EFFECTS, EARTHQUAKE_CONFIG } from '../render/effects'
import { METEOR_FALL_MIN_MS } from '../render/framework'
import { ERUPTION_LAUNCH_LEAD_MS, VOLCANO_WINDUP_MS } from '../render/types'

/** The server's `cause` on damage dealt by a volcano eruption. */
const VOLCANO_CAUSE = 'volcano'
import type {
  AttackMissedEvent,
  DamageEvent,
  HealEvent,
  RawGameEvent,
  StatusRepelledEvent,
} from '../game/events'

// Floating combat numbers (#265, #266). An SVG `<g>` layer that lives INSIDE the
// battlefield's 1000×1000 viewBox, so numbers share the exact coordinate space
// as the castles (via placement.ts) and letterbox/scale with the arena — no
// separate coordinate mapping. It holds NO gameplay logic: it only visualizes
// authoritative `damage`/`heal` events the server already decided.
//
//  - Damage numbers take the ATTACKER's kingdom colour; criticals render bold.
//  - Healing numbers are always green and prefixed with `+`.
//  - A direct hit appears only once its ability connects (delayed by a beam's
//    charge or a projectile's travel — the same timing the Pixi effect uses),
//    then sits to the RIGHT of the castle and rises + fades over 2.5s.
//  - Damage-over-time ticks (Burn, Poison, …) are held back until the hit that
//    applied them has shown, so a slow-charging attack's Burn "10"s don't beat
//    the initial number onto the screen.

/** How long a number stays on screen — matches the CSS rise animation (#265). */
const LIFETIME_MS = 2500
/** Always-green fill for healing numbers (#266). */
const HEAL_COLOR = '#4ade80'
/** Cap concurrent numbers so a burst of hits can't flood the DOM. */
const MAX_ACTIVE = 40
/** Horizontal offset (user units) placing the number to the RIGHT of the castle. */
const RIGHT_OFFSET = 100
/** Vertical bias so the number sits beside the castle body, not its label. */
const VERTICAL_BIAS = 8
/** How far above the castle Orion's Belt's "MISS" text appears (user units). */
const MISS_VERTICAL_OFFSET = 90

interface FloatingNumber {
  key: number
  x: number
  y: number
  text: string
  color: string
  crit: boolean
  /** Orion's Belt dodge — styled larger/glowing, centered above the castle. */
  miss?: boolean
  /** Love's Cupid's Arrow shared-pain redirect — styled with a heart glow. */
  sharedPain?: boolean
  /** Text anchor — 'start' right-of-castle, 'end' left-of-castle, 'middle' centered. */
  anchor: 'start' | 'end' | 'middle'
}

/** A number plus how long to wait before showing it (time-to-impact). */
export interface BuiltNumber {
  number: FloatingNumber
  delayMs: number
  /** The struck player, so DoT ticks can sync to that castle's last hit. */
  targetId: string
  /** True for damage-over-time ticks (status:*) — held until the hit shows. */
  dot: boolean
}

export interface FloatingNumbersProps {
  /** Battlefield coordinate (1000×1000 space) of a player id, or undefined. */
  positionOf: (id: string) => { x: number; y: number } | undefined
  /** Kingdom id of a player id (used to colour damage by the attacker). */
  kingdomOf: (id: string) => string | null
  /** Kingdom id → theme colour hex. */
  colorOf: (kingdomId: string | null) => string
  /** The local viewer's player id — phantom hits on them are hidden (Love's
   *  "Love Galore" stealth phase: the bearer knows they weren't hurt). */
  youId?: string | null
}

export function FloatingNumbers({ positionOf, kingdomOf, colorOf, youId }: FloatingNumbersProps) {
  const [numbers, setNumbers] = useState<FloatingNumber[]>([])

  // Resolvers can change identity between renders; read the latest inside the
  // event handler without re-subscribing (mirrors BattlefieldFx).
  const resolvers = useRef({ positionOf, kingdomOf, colorOf })
  resolvers.current = { positionOf, kingdomOf, colorOf }
  const youIdRef = useRef(youId)
  youIdRef.current = youId

  useEffect(() => {
    let nextKey = 0
    const timers = new Set<ReturnType<typeof setTimeout>>()
    // Per target: wall-clock time its most recent direct hit becomes visible.
    // DoT ticks on that target wait until then, so they trail the initial hit.
    const impactUntil = new Map<string, number>()

    const show = (n: FloatingNumber) => {
      setNumbers((prev) => [...prev, n].slice(-MAX_ACTIVE))
      const removeTimer = setTimeout(() => {
        timers.delete(removeTimer)
        setNumbers((prev) => prev.filter((x) => x.key !== n.key))
      }, LIFETIME_MS)
      timers.add(removeTimer)
    }

    const unsubscribe = onGameEvents((events) => {
      const { positionOf, kingdomOf, colorOf } = resolvers.current

      for (const event of events) {
        // Love's "Love Galore" stealth: a phantom hit is a decoy shown to
        // everyone but the bearer, who knows the damage never really landed.
        if (
          event.type === 'damage' &&
          (event as unknown as DamageEvent).phantom &&
          (event as unknown as DamageEvent).targetId === youIdRef.current
        ) {
          continue
        }
        const built = buildNumber(event, positionOf, kingdomOf, colorOf, () => nextKey++)
        if (!built) continue

        const now = Date.now()
        let delay = built.delayMs
        if (built.dot) {
          // A DoT tick shows no earlier than the hit that applied it.
          delay = Math.max(delay, (impactUntil.get(built.targetId) ?? 0) - now)
        } else if (built.delayMs > 0) {
          // A delayed direct hit sets the bar its DoTs must clear.
          const until = Math.max(impactUntil.get(built.targetId) ?? 0, now + built.delayMs)
          impactUntil.set(built.targetId, until)
        }

        if (delay > 0) {
          const showTimer = setTimeout(() => {
            timers.delete(showTimer)
            show(built.number)
          }, delay)
          timers.add(showTimer)
        } else {
          show(built.number)
        }
      }
    })

    return () => {
      unsubscribe()
      for (const timer of timers) clearTimeout(timer)
      timers.clear()
    }
  }, [])

  return (
    <g className="battlefield__layer-damage" aria-hidden="true">
      {numbers.map((n) => (
        <text
          key={n.key}
          x={n.x}
          y={n.y}
          fill={n.color}
          textAnchor={n.anchor}
          className={`floating-number${n.crit ? ' floating-number--crit' : ''}${n.miss ? ' floating-number--miss' : ''}${n.sharedPain ? ' floating-number--shared-pain' : ''}`}
        >
          {n.text}
        </text>
      ))}
    </g>
  )
}

/**
 * Translates one authoritative event into a floating number (plus its show
 * delay), or `null` for events this layer doesn't visualize (or zero-magnitude
 * ones). Exported for unit tests. Direct damage + healing sit to the RIGHT of
 * the castle; damage-over-time (Burn, Poison) sits on the opposite (LEFT) side.
 * A small vertical jitter keeps rapid hits from stacking exactly.
 */
export function buildNumber(
  event: RawGameEvent,
  positionOf: (id: string) => { x: number; y: number } | undefined,
  kingdomOf: (id: string) => string | null,
  colorOf: (kingdomId: string | null) => string,
  nextKey: () => number,
): BuiltNumber | null {
  if (event.type === 'damage') {
    const dmg = event as unknown as DamageEvent
    const amount = Math.round(dmg.amount)
    if (amount <= 0) return null
    const at = positionOf(dmg.targetId)
    if (!at) return null
    // Damage-over-time (Burn, Poison) sits on the LEFT of the castle, opposite
    // the RIGHT where direct damage + healing appear.
    const dot = isDot(dmg.cause)
    // Love's Cupid's Arrow: a share of Love's damage redirected onto an
    // infatuated kingdom reads as "Shared Pain" (centered above, heart-glow)
    // rather than a plain number — it communicates the magical bond, not a
    // separate attack.
    const sharedPain = dmg.cause === 'infatuated'
    return {
      number: sharedPain
        ? {
            key: nextKey(),
            x: at.x,
            y: at.y - MISS_VERTICAL_OFFSET,
            text: 'Shared Pain',
            color: '#ff6fa8',
            crit: false,
            sharedPain: true,
            anchor: 'middle',
          }
        : {
            key: nextKey(),
            x: at.x + (dot ? -RIGHT_OFFSET : RIGHT_OFFSET),
            y: at.y + VERTICAL_BIAS + jitter(),
            text: String(amount),
            color: colorOf(kingdomOf(dmg.sourceId)), // attacker's colour (#265)
            crit: dmg.crit === true,
            anchor: dot ? 'end' : 'start',
          },
      delayMs: impactDelay(dmg.cause),
      targetId: dmg.targetId,
      dot,
    }
  }
  if (event.type === 'attackMissed') {
    const missed = event as unknown as AttackMissedEvent
    const at = positionOf(missed.playerId)
    if (!at) return null
    return {
      number: {
        key: nextKey(),
        x: at.x,
        y: at.y - MISS_VERTICAL_OFFSET,
        text: 'MISS',
        color: '#8be3ff',
        crit: false,
        miss: true,
        anchor: 'middle',
      },
      delayMs: abilityImpactDelay(missed.abilityId),
      targetId: missed.playerId,
      dot: false,
    }
  }
  if (event.type === 'statusRepelled') {
    // A shield turned the effect away entirely (Fireflies). Shown above the
    // castle like a dodge, because that is what it is.
    const repelled = event as unknown as StatusRepelledEvent
    const at = positionOf(repelled.playerId)
    if (!at) return null
    return {
      number: {
        key: nextKey(),
        x: at.x,
        y: at.y - MISS_VERTICAL_OFFSET,
        text: 'SHIELDED',
        color: '#ffe9a8',
        crit: false,
        miss: true,
        anchor: 'middle',
      },
      delayMs: abilityImpactDelay(repelled.abilityId),
      targetId: repelled.playerId,
      dot: false,
    }
  }
  if (event.type === 'heal') {
    const heal = event as unknown as HealEvent
    const amount = Math.round(heal.amount)
    if (amount <= 0) return null
    const at = positionOf(heal.targetId)
    if (!at) return null
    return {
      number: {
        key: nextKey(),
        x: at.x + RIGHT_OFFSET, // healing sits on the RIGHT, with direct damage
        y: at.y + VERTICAL_BIAS + jitter(),
        text: `+${amount}`,
        color: HEAL_COLOR, // healing is always green (#266)
        crit: false,
        anchor: 'start',
      },
      delayMs: impactDelay(heal.cause),
      targetId: heal.targetId,
      dot: false, // heals aren't held back
    }
  }
  return null
}

/** Whether a cause is a damage-over-time status tick (e.g. "status:burn"). */
function isDot(cause: string | undefined): boolean {
  return cause?.startsWith('status:') ?? false
}

/**
 * How long to wait before showing a number, so it lands when the attack visually
 * connects. `cause` is an ability id ("fireball"), a prefixed cause
 * ("lifesteal:waterfall", "status:burn"), or a system tag ("aftershock"). The
 * delay is the registered effect's time-to-impact: a beam's charge-up, else a
 * projectile's travel time. Everything else (DoT ticks, self-heals, aftershocks)
 * shows immediately.
 */
function impactDelay(cause: string | undefined): number {
  if (!cause) return 0
  const i = cause.indexOf(':')
  return abilityImpactDelay(i >= 0 ? cause.slice(i + 1) : cause)
}

/**
 * Time-to-impact for a bare ability id — how long the number is held back so it
 * appears when the ability visibly CONNECTS rather than when the server
 * resolved it.
 *
 * The server deals every point of damage the instant a cast is accepted. Almost
 * every ability in this game then spends time getting there: charging, winding
 * up, flying, arcing, or marching a pack across the field. Without a delay the
 * number is simply wrong — it beats the effect, sometimes by seconds, and the
 * hit reads as having come from nowhere.
 *
 * Every effect shape that has a lead time is listed here, most-specific first.
 * A shape with no lead time (a vortex parked on the target, an instant
 * lightning strike) correctly falls through to 0.
 */
function abilityImpactDelay(abilityId: string): number {
  // Not an ability cast at all: the volcano's eruption is dealt the instant its
  // timer runs out, while the blast spends its wind-up drawing inward.
  if (abilityId === VOLCANO_CAUSE) return VOLCANO_WINDUP_MS

  const effect = ABILITY_EFFECTS[abilityId]
  if (!effect) return 0

  // A charge-then-fire beam lands when the beam fires, not when it starts.
  if (effect.beam) return effect.beam.chargeMs

  // Magma's Eruption: seconds of rumble, then lava arcing across the field.
  if (effect.eruption) {
    return effect.eruption.buildupMs + ERUPTION_LAUNCH_LEAD_MS + effect.eruption.travelMs
  }

  // A pack that RUNS to the target (Kitsune's Old Friends, Insects' Infected).
  // Timed to the first arrival, not the last: the target is being hit from the
  // moment the front of the pack reaches them.
  if (effect.foxPack) return effect.foxPack.durationMs

  // A wave gathers at the caster before it travels.
  if (effect.wave) return effect.wave.gatherMs + effect.wave.travelMs

  // Cupid's Arrow draws the bow first, then the arrow weaves across.
  if (effect.cupidsArrow) {
    return effect.cupidsArrow.bowGatherMs + effect.cupidsArrow.arrowDurationMs
  }

  // Earth's Earthquake trembles before it breaks. Dispatched by ability id
  // rather than off the definition (it needs the neighbours' positions, which
  // only BattlefieldFx knows), so its timing is read from the config directly.
  if (abilityId === 'earthquake') return EARTHQUAKE_CONFIG.buildupMs

  // A charge-scaled barrage: the first bolt lands almost at once, so the number
  // rides with it rather than waiting for the finishing strike.
  if (effect.barrage) return 0

  // Meteors fall from high above; the number rides the FIRST one down.
  if (effect.meteorShower) return METEOR_FALL_MIN_MS

  // Anything else that travels in a straight line.
  return effect.projectile?.durationMs ?? 0
}

/** ±22 user-unit vertical offset so stacked hits fan out instead of overlap. */
function jitter(): number {
  return (Math.random() * 2 - 1) * 22
}
