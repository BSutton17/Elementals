import { useState } from 'react'
import { CastleSprite, CASTLE_VIEWBOX } from '../CastleSprite'
import { getCastleOutline, getKingdomTheme } from '../../game/kingdomThemes'
import { equipItem, type CosmeticItem, type CosmeticSlot } from '../../game/auth'
import './Shop.css'

/**
 * Assigning skins to kingdoms.
 *
 * ⚠️ ORGANISED BY KINGDOM, NOT BY ITEM. Skins are equipped per kingdom, so the
 * question a player is answering is "what does my Fire castle look like" — not
 * "where does this skin go". A flat list of owned items would make them work
 * that mapping out themselves, sixteen times.
 *
 * Only kingdoms with something to choose between are listed. A kingdom whose
 * sole option is the standard look is not a decision, and a row offering one
 * choice reads as broken.
 */

export function KingdomWardrobe({
  catalogue,
  owned,
  loadout,
  onChange,
}: {
  catalogue: CosmeticItem[]
  owned: string[]
  loadout: Record<string, Partial<Record<CosmeticSlot, string>>>
  onChange: (kingdomId: string, slot: CosmeticSlot, itemId: string) => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  /** Everything this player may wear: their purchases, plus every default. */
  const wearable = catalogue.filter((i) => i.isDefault || owned.includes(i.id))

  const kingdoms = [...new Set(wearable.map((i) => i.kingdomId).filter(Boolean))] as string[]

  const choices = (kingdomId: string, slot: CosmeticSlot) =>
    wearable.filter((i) => i.kingdomId === kingdomId && i.slot === slot)

  /** Kingdoms where at least one slot has a real choice. */
  const withOptions = kingdoms.filter(
    (k) => choices(k, 'castle').length > 1 || choices(k, 'shield').length > 1,
  )

  if (withOptions.length === 0) {
    return (
      <p className="account-section__pending">
        Skins you buy in the shop can be assigned to each kingdom here.
      </p>
    )
  }

  const equipped = (kingdomId: string, slot: CosmeticSlot) =>
    loadout[kingdomId]?.[slot] ??
    catalogue.find((i) => i.kingdomId === kingdomId && i.slot === slot && i.isDefault)?.id

  const select = async (kingdomId: string, slot: CosmeticSlot, itemId: string) => {
    setBusy(`${kingdomId}:${slot}`)
    setError(null)
    const result = await equipItem(kingdomId, itemId)
    setBusy(null)
    if (!result.ok) {
      setError(result.message ?? 'Could not equip that.')
      return
    }
    onChange(kingdomId, slot, itemId)
  }

  return (
    <div className="wardrobe">
      {error && (
        <p className="detail__error" role="alert">
          {error}
        </p>
      )}

      {withOptions.sort().map((kingdomId) => {
        const theme = getKingdomTheme(kingdomId)
        const wornCastle = equipped(kingdomId, 'castle')
        const worn = catalogue.find((i) => i.id === wornCastle)

        return (
          <section className="wardrobe__kingdom" key={kingdomId}>
            <div className="wardrobe__preview">
              <svg viewBox={CASTLE_VIEWBOX} aria-hidden="true">
                <CastleSprite
                  color={theme?.primary ?? '#6b7385'}
                  outline={getCastleOutline(kingdomId)}
                  paint={worn?.paint}
                />
              </svg>
            </div>

            <div className="wardrobe__body">
              <h4 className="wardrobe__name">{theme?.name ?? kingdomId}</h4>

              {(['castle', 'shield'] as CosmeticSlot[]).map((slot) => {
                const options = choices(kingdomId, slot)
                if (options.length <= 1) return null
                const current = equipped(kingdomId, slot)
                const key = `${kingdomId}:${slot}`

                return (
                  <div className="wardrobe__slot" key={slot}>
                    <span className="wardrobe__slot-label">
                      {slot === 'castle' ? 'Castle' : 'Shield'}
                    </span>
                    <div
                      className="wardrobe__options"
                      role="radiogroup"
                      aria-label={`${theme?.name ?? kingdomId} ${slot} skin`}
                    >
                      {options.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          role="radio"
                          aria-checked={current === option.id}
                          disabled={busy === key}
                          className={`wardrobe__option${
                            current === option.id ? ' wardrobe__option--on' : ''
                          }`}
                          onClick={() => void select(kingdomId, slot, option.id)}
                        >
                          {option.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
