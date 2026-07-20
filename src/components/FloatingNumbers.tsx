import { useEffect, useRef, useState } from 'react'
import { onGameEvents } from '../game/gameEvents'
import { ABILITY_EFFECTS } from '../render/effects'
import type { DamageEvent, HealEvent, RawGameEvent } from '../game/events'

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

interface FloatingNumber {
  key: number
  x: number
  y: number
  text: string
  color: string
  crit: boolean
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
}

export function FloatingNumbers({ positionOf, kingdomOf, colorOf }: FloatingNumbersProps) {
  const [numbers, setNumbers] = useState<FloatingNumber[]>([])

  // Resolvers can change identity between renders; read the latest inside the
  // event handler without re-subscribing (mirrors BattlefieldFx).
  const resolvers = useRef({ positionOf, kingdomOf, colorOf })
  resolvers.current = { positionOf, kingdomOf, colorOf }

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
          textAnchor="start"
          className={`floating-number${n.crit ? ' floating-number--crit' : ''}`}
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
 * ones). Exported for unit tests. The number is placed to the RIGHT of the
 * castle with a small vertical jitter so rapid hits fan out instead of stacking.
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
    return {
      number: {
        key: nextKey(),
        x: at.x + RIGHT_OFFSET,
        y: at.y + VERTICAL_BIAS + jitter(),
        text: String(amount),
        color: colorOf(kingdomOf(dmg.sourceId)), // attacker's colour (#265)
        crit: dmg.crit === true,
      },
      delayMs: impactDelay(dmg.cause),
      targetId: dmg.targetId,
      dot: isDot(dmg.cause),
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
        x: at.x + RIGHT_OFFSET,
        y: at.y + VERTICAL_BIAS + jitter(),
        text: `+${amount}`,
        color: HEAL_COLOR, // healing is always green (#266)
        crit: false,
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
  const abilityId = i >= 0 ? cause.slice(i + 1) : cause
  const effect = ABILITY_EFFECTS[abilityId]
  if (!effect) return 0
  if (effect.beam) return effect.beam.chargeMs
  return effect.projectile?.durationMs ?? 0
}

/** ±22 user-unit vertical offset so stacked hits fan out instead of overlap. */
function jitter(): number {
  return (Math.random() * 2 - 1) * 22
}
