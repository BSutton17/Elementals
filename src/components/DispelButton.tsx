import { GiFireflake } from 'react-icons/gi'
import './DispelButton.css'

// A status you can pay to be rid of (Light's Fireflies). This is deliberately
// NOT a shop row: a swarm blocks your shield and gets more expensive the longer
// it sits there, so burying it behind the shop toggle hid the one purchase you
// most need to see. It floats over the inventory bar instead — absolutely
// positioned, so it never reflows the battlefield above it.

/** Copy for each status that can be bought off. */
const DISPEL_COPY: Record<string, { name: string; hint: string }> = {
  fireflies: {
    name: 'Shoo Fireflies',
    hint: "A swarm has your castle, and you can't raise a shield until it's gone. The price was set by your population when it landed — and Light's glare can drive it higher.",
  },
}

export function DispelButton({
  dispel,
  currency,
  onBuy,
}: {
  /** The status stuck to you and its current price, or null for nothing. */
  dispel: { statusId: string; cost: number } | null
  currency: number
  onBuy: () => void
}) {
  if (!dispel) return null

  const copy = DISPEL_COPY[dispel.statusId]
  const affordable = currency >= dispel.cost
  const short = Math.ceil(dispel.cost - currency)

  return (
    <button
      type="button"
      className={`dispel-btn${affordable ? '' : ' dispel-btn--broke'}`}
      disabled={!affordable}
      onClick={onBuy}
      title={copy?.hint ?? 'Pay to remove this effect immediately.'}
      data-testid="dispel-button"
    >
      <span className="dispel-btn__icon" aria-hidden="true">
        <GiFireflake />
      </span>
      <span className="dispel-btn__text">
        <span className="dispel-btn__name">{copy?.name ?? 'Dispel'}</span>
        <span className="dispel-btn__cost">
          {affordable ? `${dispel.cost}g` : `Need ${short}g more`}
        </span>
      </span>
    </button>
  )
}
