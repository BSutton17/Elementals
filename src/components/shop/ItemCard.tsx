import { CastleSprite, CASTLE_VIEWBOX } from '../CastleSprite'
import { getCastleOutline, getKingdomTheme } from '../../game/kingdomThemes'
import type { CosmeticItem } from '../../game/auth'
import './Shop.css'

/**
 * One item in the shop grid.
 *
 * Hierarchy, top to bottom: PREVIEW, name, rarity, price/status. The preview
 * dominates because it is the thing being bought; everything else is metadata
 * and is sized accordingly.
 *
 * The whole card is a button — for a grid of previews that open a detail panel,
 * the preview genuinely is the target, and a separate "view" affordance would
 * be a second thing to aim at on a phone for no gain. The BUY action lives in
 * the detail panel, so a card can never be bought by a mis-tap.
 */

export type OwnState = 'owned' | 'equipped' | 'buyable' | 'unaffordable' | 'locked'

/** Rarity, written out. Never carried by colour alone. */
const RARITY_LABEL: Record<string, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  legendary: 'Legendary',
}

export function ItemCard({
  item,
  state,
  selected,
  onSelect,
}: {
  item: CosmeticItem
  state: OwnState
  selected: boolean
  onSelect: () => void
}) {
  const theme = getKingdomTheme(item.kingdomId)
  const colour = theme?.primary ?? '#6b7385'

  return (
    <button
      type="button"
      className={`item${selected ? ' item--selected' : ''}`}
      data-rarity={item.rarity}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="item__preview">
        {/* The real sprite with the real paint — not a mockup. Since a skin is
            a parameter set, the preview IS the item. */}
        <svg viewBox={CASTLE_VIEWBOX} aria-hidden="true">
          <CastleSprite
            color={colour}
            outline={getCastleOutline(item.kingdomId)}
            paint={item.paint}
          />
        </svg>
      </span>

      <span className="item__name">{item.name}</span>

      <span className="item__meta">
        <span className="item__rarity">{RARITY_LABEL[item.rarity] ?? item.rarity}</span>
        <span className="item__status">
          {state === 'equipped' && <span className="item__equipped">Equipped</span>}
          {state === 'owned' && <span className="item__owned">Owned</span>}
          {(state === 'buyable' || state === 'unaffordable') && (
            <span
              className={`item__price${state === 'unaffordable' ? ' item__price--short' : ''}`}
            >
              {item.price.toLocaleString()}
            </span>
          )}
          {state === 'locked' && <span className="item__locked">Locked</span>}
        </span>
      </span>
    </button>
  )
}
