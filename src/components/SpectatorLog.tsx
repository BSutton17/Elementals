import { useEffect, useRef, useState } from 'react'
import { onGameEvents } from '../game/gameEvents'
import { ABILITY_METADATA } from '../game/abilities'
import { KINGDOMS } from '../game/kingdoms'
import type { AbilityCastEvent } from '../game/events'
import './SpectatorLog.css'

/**
 * A running "who did what" for spectators.
 *
 * A player reads the board through their own kingdom header and ability bar; a
 * spectator has neither, and with seven castles firing at once the arena alone
 * does not say who cast what. This fills that gap and nothing more — it is a
 * commentary strip, not a second HUD.
 *
 * Deliberately opt-in and collapsed by default: it sits over the arena, and a
 * watcher who wants to see the fight should not have to dismiss a panel first.
 */

export interface LogEntry {
  key: number
  kingdom: string
  ability: string
  color: string
}

/** How many lines are kept. Enough to catch up after looking away, not a history. */
const MAX_ENTRIES = 12

export function describeCast(
  event: AbilityCastEvent,
  kingdomOf: (playerId: string) => string | null,
): Omit<LogEntry, 'key'> | null {
  const kingdomId = kingdomOf(event.casterId)
  if (!kingdomId) return null
  const kingdom = KINGDOMS.find((k) => k.id === kingdomId)
  const ability = ABILITY_METADATA[event.abilityId]
  // An unknown ability id means the wire carries something this build does not
  // know about. Naming the raw id would show a player "used waterBall_v2", so
  // the line is dropped instead — a missing line reads as nothing happening,
  // which is far less confusing than a debug string in the middle of a match.
  if (!ability) return null
  return {
    kingdom: kingdom?.label ?? kingdomId,
    ability: ability.name,
    color: kingdom?.color ?? '#cdd4e2',
  }
}

export function SpectatorLog({
  kingdomOf,
  belowHeader = false,
}: {
  /** Maps a player id to their kingdom id. Null for seats with no kingdom. */
  kingdomOf: (playerId: string) => string | null
  /** Shift down to clear a kingdom header that is still on screen. */
  belowHeader?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<LogEntry[]>([])
  const keyRef = useRef(0)
  // Read inside the handler so the subscription does not churn every render.
  const kingdomOfRef = useRef(kingdomOf)
  kingdomOfRef.current = kingdomOf

  useEffect(
    () =>
      onGameEvents((events) => {
        const fresh: LogEntry[] = []
        for (const event of events) {
          if (event.type !== 'abilityCast') continue
          const described = describeCast(
            event as unknown as AbilityCastEvent,
            kingdomOfRef.current,
          )
          if (described) fresh.push({ key: ++keyRef.current, ...described })
        }
        if (fresh.length === 0) return
        // Newest first, capped. Collected even while collapsed, so opening the
        // log shows what just happened rather than an empty box.
        setEntries((prev) => [...fresh.reverse(), ...prev].slice(0, MAX_ENTRIES))
      }),
    [],
  )

  return (
    <div
      className={`spectator-log${open ? ' spectator-log--open' : ''}${
        belowHeader ? ' spectator-log--below-header' : ''
      }`}
    >
      <button
        type="button"
        className="spectator-log__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        Combat Log
      </button>
      {open && entries.length === 0 && (
        <p className="spectator-log__list spectator-log__empty">Waiting for the first move…</p>
      )}
      {open && entries.length > 0 && (
        <ul className="spectator-log__list" aria-live="polite" aria-label="Combat log">
          {entries.map((e) => (
            <li key={e.key} className="spectator-log__entry">
              <span className="spectator-log__kingdom" style={{ color: e.color }}>
                {e.kingdom}
              </span>
              <span className="spectator-log__verb"> used </span>
              <span className="spectator-log__ability">{e.ability}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
