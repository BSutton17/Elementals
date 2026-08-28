import { useEffect, useState } from 'react'
import { CastleSprite, CASTLE_VIEWBOX } from '../CastleSprite'
import { getCastleOutline, getKingdomTheme } from '../../game/kingdomThemes'
import type { CosmeticItem } from '../../game/auth'
import type { OwnState } from './ItemCard'
import './Shop.css'

/**
 * The detail view for a selected item.
 *
 * A side panel on desktop and a bottom sheet on a phone — the same component,
 * repositioned by CSS. A modal would cover the grid you are comparing against,
 * and a separate page would lose your place in it.
 *
 * This is where BUYING happens. Keeping the action out of the grid means an
 * item can never be bought by mis-tapping a card while scrolling.
 */

const RARITY_LABEL: Record<string, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  legendary: 'Legendary',
}

/** What each rarity actually is, so the tier means something concrete. */
const RARITY_BLURB: Record<string, string> = {
  common: 'Standard but special.',
  uncommon: 'Show off your favorite kingdom with a new look.',
  rare: 'A prestigious look for a prestigious ruler.',
  legendary: 'The most elaborate and exclusive treatment a kingdom can have.',
}

export function ItemDetail({
  item,
  state,
  balance,
  busy,
  error,
  onBuy,
  onEquip,
  onClose,
}: {
  item: CosmeticItem
  state: OwnState
  balance: number | null
  busy: boolean
  error: string | null
  onBuy: () => void
  onEquip: () => void
  onClose: () => void
}) {
  const theme = getKingdomTheme(item.kingdomId)
  const shortfall =
    balance !== null && balance < item.price ? item.price - balance : 0

  /**
   * Skins whose look is rolled per match cycle through combinations here, so
   * the shop shows what you are actually buying rather than one arbitrary roll
   * of it.
   *
   * ⚠️ THE SHOP IS THE ONLY PLACE THIS HAPPENS. In a match the seed comes from
   * the server and holds for the whole game — a castle that reshuffled itself
   * mid-fight would be unreadable, and worse, would not match what anyone else
   * is looking at. This is a preview affordance, not the skin animating.
   */
  const varies = item.paint?.varies === true
  const [shot, setShot] = useState(0)
  useEffect(() => {
    if (!varies) return
    const reduced =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const t = setInterval(() => setShot((n) => n + 1), 2600)
    return () => clearInterval(t)
  }, [varies, item.id])

  // A fresh seed per shot, and a stable one when the skin does not vary.
  const showcase = varies
    ? { ...item.paint, variantSeed: (shot * 2654435761 + 12345) >>> 0 }
    : item.paint

  return (
    <aside className="detail" aria-label={`${item.name} details`}>
      <button
        type="button"
        className="detail__close"
        onClick={onClose}
        aria-label="Close details"
      >
        ✕
      </button>

      <div className="detail__preview">
        <svg viewBox={CASTLE_VIEWBOX} aria-hidden="true">
          <CastleSprite
            color={theme?.primary ?? '#6b7385'}
            outline={getCastleOutline(item.kingdomId)}
            paint={showcase}
          />
        </svg>
      </div>

      <h3 className="detail__name">{item.name}</h3>

      <p className="detail__sub">
        <span className="detail__rarity" data-rarity={item.rarity}>
          {RARITY_LABEL[item.rarity] ?? item.rarity}
        </span>
        {theme && <span className="detail__kingdom">{theme.name}</span>}
        <span className="detail__slot">
          {item.slot === 'castle' ? 'Castle skin' : item.slot === 'shield' ? 'Shield skin' : 'Nameplate'}
        </span>
      </p>

      <p className="detail__blurb">{RARITY_BLURB[item.rarity]}</p>

      {error && (
        <p className="detail__error" role="alert">
          {error}
        </p>
      )}

      <div className="detail__action">
        {state === 'equipped' && (
          <p className="detail__state">Equipped on {theme?.name ?? 'this kingdom'}.</p>
        )}

        {state === 'owned' && (
          <button
            type="button"
            className="account-btn account-btn--primary"
            disabled={busy}
            onClick={onEquip}
          >
            {busy ? 'Equipping…' : 'Equip'}
          </button>
        )}

        {(state === 'buyable' || state === 'unaffordable') && (
          <>
            <button
              type="button"
              className="account-btn account-btn--primary"
              disabled={busy || state === 'unaffordable'}
              onClick={onBuy}
            >
              {busy ? 'Buying…' : `Buy · ${item.price.toLocaleString()}`}
            </button>
            {/* Says how far short, not just that you are short — a number the
                player can act on beats a refusal they have to work out. */}
            {shortfall > 0 && (
              <p className="detail__shortfall">
                {shortfall.toLocaleString()} more coins needed.
              </p>
            )}
          </>
        )}

        {state === 'locked' && item.requiresMastery && (
          <p className="detail__state">
            Reach {item.requiresMastery} mastery with {theme?.name ?? 'this kingdom'} to
            unlock.
          </p>
        )}
      </div>
    </aside>
  )
}
