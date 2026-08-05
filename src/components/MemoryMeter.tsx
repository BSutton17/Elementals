import './RageMeter.css'
import './MemoryMeter.css'

/**
 * Fallback cap, used only until the match config arrives. The REAL number is
 * the server's `KITSUNE.MEMORY_FULL`, sent as `config.memoryFull` — never
 * hardcode the live value here (see RageMeter, which advertised a stale cap for
 * a whole retune).
 */
const MEMORY_FULL_FALLBACK = 6000

/**
 * Kitsune's "Ancient Memory" readout ("Swift Tails"), and the price of Kitsune
 * Rush. Unlike Rage it fills whether or not Kitsune is doing anything —
 * attacking simply fills it faster — so it always creeps.
 *
 * The underlying scale (6000) is deliberately NOT shown. "How full" is the only
 * part a player can act on, so this reads as a percentage: a raw 4,183 / 6,000
 * tells them nothing they can use.
 */
export function MemoryMeter({ meter, full: cap }: { meter: number; full?: number }) {
  const MEMORY_FULL = cap && cap > 0 ? cap : MEMORY_FULL_FALLBACK
  const clamped = Math.max(0, Math.min(meter, MEMORY_FULL))
  const full = clamped >= MEMORY_FULL
  const fillPct = (clamped / MEMORY_FULL) * 100

  return (
    <div
      className={`rage-meter memory-meter${full ? ' rage-meter--full' : ''}`}
      data-testid="memory-meter"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={MEMORY_FULL}
      aria-valuenow={Math.round(clamped)}
      aria-label="Ancient Memory"
    >
      <span className="rage-meter__label">Memory</span>
      <div className="rage-meter__track">
        <div className="rage-meter__fill" style={{ width: `${fillPct}%` }} />
      </div>
      <span className="rage-meter__value">
        {full ? 'READY' : `${Math.floor((clamped / MEMORY_FULL) * 100)}%`}
      </span>
    </div>
  )
}
