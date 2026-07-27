import { useEffect, useRef, useState } from 'react'
import { TbBrandSupernova } from 'react-icons/tb'
import './SupernovaMeter.css'

/**
 * Cumulative meter "xp" to reach Supernova levels 1/2/3. Mirrors the server's
 * `SPACE.SUPERNOVA_LEVEL_THRESHOLDS` (balance.ts) — keep the two in sync.
 */
export const SUPERNOVA_THRESHOLDS = [50, 150, 250] as const
const SUPERNOVA_MAX = SUPERNOVA_THRESHOLDS[SUPERNOVA_THRESHOLDS.length - 1]

/** Supernova level (0–3) from a meter value, using the ramping thresholds. */
export function supernovaLevel(meter: number): number {
  let level = 0
  for (let i = 0; i < SUPERNOVA_THRESHOLDS.length; i++) {
    if (meter >= SUPERNOVA_THRESHOLDS[i]) level = i + 1
  }
  return level
}

interface SupernovaMeterProps {
  /** Current charge (synced from the server's playerState.supernovaMeter). */
  meter: number
}

/**
 * Space's Supernova charge readout — sits above the ability buttons and appears
 * the moment Supernova is unlocked. The bar fills toward the three ramping
 * thresholds; each level-up flares, and the whole thing pulses once fully
 * charged (level 3) to signal a maxed, devastating blast is ready.
 *
 * Level 0 = not yet firable; level ≥ 1 shows a READY chip.
 */
export function SupernovaMeter({ meter }: SupernovaMeterProps) {
  const clamped = Math.max(0, Math.min(meter, SUPERNOVA_MAX))
  const level = supernovaLevel(clamped)
  const fillPct = (clamped / SUPERNOVA_MAX) * 100

  // Flash when a new level is crossed (charge only ever climbs between casts;
  // firing resets it to 0, which we don't flash).
  const prevLevel = useRef(level)
  const [flare, setFlare] = useState(false)
  useEffect(() => {
    if (level > prevLevel.current) {
      setFlare(true)
      const t = setTimeout(() => setFlare(false), 700)
      prevLevel.current = level
      return () => clearTimeout(t)
    }
    prevLevel.current = level
  }, [level])

  return (
    <div
      className={[
        'supernova-meter',
        `supernova-meter--lvl${level}`,
        level >= SUPERNOVA_THRESHOLDS.length ? 'supernova-meter--max' : '',
        flare ? 'supernova-meter--flare' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid="supernova-meter"
      aria-label={`Supernova level ${level}`}
    >
      <span className="supernova-meter__icon" aria-hidden="true">
        <TbBrandSupernova />
      </span>

      <div className="supernova-meter__body">
        <div className="supernova-meter__header">
          <span className="supernova-meter__title">SUPERNOVA</span>
          <span className="supernova-meter__level">
            {level >= 1 ? (
              <span className="supernova-meter__ready">
                Lv {level}
                {level >= SUPERNOVA_THRESHOLDS.length ? ' · MAX' : ' · READY'}
              </span>
            ) : (
              <span className="supernova-meter__charging">CHARGING…</span>
            )}
          </span>
        </div>

        <div className="supernova-meter__track">
          <div className="supernova-meter__fill" style={{ width: `${fillPct}%` }}>
            <span className="supernova-meter__fill-glow" aria-hidden="true" />
          </div>
          {/* Level threshold notches (the last one is the far edge). */}
          {SUPERNOVA_THRESHOLDS.slice(0, -1).map((t, i) => (
            <span
              key={i}
              className={`supernova-meter__notch${clamped >= t ? ' supernova-meter__notch--lit' : ''}`}
              style={{ left: `${(t / SUPERNOVA_MAX) * 100}%` }}
              aria-hidden="true"
            />
          ))}
          {/* Level pips. */}
          <div className="supernova-meter__pips" aria-hidden="true">
            {SUPERNOVA_THRESHOLDS.map((t, i) => (
              <span
                key={i}
                className={`supernova-meter__pip${clamped >= t ? ' supernova-meter__pip--lit' : ''}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
