import './RageMeter.css'

/**
 * Fallback cap, used only until the match config arrives. The REAL number is
 * the server's `DARK.RAGE_FULL`, sent as `config.rageFull` — this file used to
 * keep its own copy and duly advertised 6000 long after the engine had moved
 * on. The live cap comes from the synced match config; the constant below is
 * only what to draw before the first sync arrives. Never hardcode the live
 * value here again.
 */
export const RAGE_FULL_FALLBACK = 2000

/**
 * Dark's Unlimited Rage readout — sits above the ability buttons once the
 * ultimate is unlocked. Unlike Supernova there are no tiers: it is all or
 * nothing, so the bar is a single climb to full and the ultimate stays
 * uncastable until it gets there. Full charge pulses to say so.
 */
export function RageMeter({ meter, full: cap }: { meter: number; full?: number }) {
  const RAGE_FULL = cap && cap > 0 ? cap : RAGE_FULL_FALLBACK
  const clamped = Math.max(0, Math.min(meter, RAGE_FULL))
  const full = clamped >= RAGE_FULL
  const fillPct = (clamped / RAGE_FULL) * 100

  return (
    <div
      className={`rage-meter${full ? ' rage-meter--full' : ''}`}
      data-testid="rage-meter"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={RAGE_FULL}
      aria-valuenow={Math.round(clamped)}
      aria-label="Unlimited Rage charge"
    >
      <span className="rage-meter__label">Rage</span>
      <div className="rage-meter__track">
        <div className="rage-meter__fill" style={{ width: `${fillPct}%` }} />
      </div>
      <span className="rage-meter__value">
        {full ? 'READY' : `${Math.round(clamped)} / ${RAGE_FULL}`}
      </span>
    </div>
  )
}
