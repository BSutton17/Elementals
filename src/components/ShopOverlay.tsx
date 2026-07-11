import { IoMdPeople } from 'react-icons/io'
import { GiAutoRepair } from 'react-icons/gi'
import { FaShieldAlt } from 'react-icons/fa'
import { type KingdomTheme } from '../game/kingdomThemes'
import './AbilityBar.css'

interface ShopOverlayProps {
  isOpen: boolean
  currency: number
  citizens: number
  castleHp: number
  maxCastleHp: number
  shieldHp: number
  nextCitizenCost: number
  nextRepairCost: number
  shieldCost: number
  /** Repairs already purchased this match (capped at maxRepairs). */
  repairsUsed: number
  maxRepairs: number
  theme: KingdomTheme | null
  onBuyItem: (id: 'citizen' | 'repair' | 'shield') => void
  onClose: () => void
}

export function ShopOverlay({
  isOpen,
  currency,
  citizens,
  castleHp,
  maxCastleHp,
  shieldHp,
  nextCitizenCost,
  nextRepairCost,
  shieldCost,
  repairsUsed,
  maxRepairs,
  theme,
  onBuyItem,
  onClose,
}: ShopOverlayProps) {
  if (!isOpen) return null

  const isFullHp = castleHp >= maxCastleHp
  const hasActiveShield = shieldHp > 0
  const repairsExhausted = repairsUsed >= maxRepairs

  const canAffordCitizen = currency >= nextCitizenCost
  const canAffordRepair = currency >= nextRepairCost && !isFullHp && !repairsExhausted
  const canAffordShield = currency >= shieldCost && !hasActiveShield

  const themeVars = {
    '--bar-primary': theme?.primary || '#4aa3ff',
    '--bar-secondary': theme?.secondary || '#2193b0',
    '--bar-dark': theme?.dark || '#1e3c72',
  } as React.CSSProperties

  return (
    <div className="shop-overlay" style={themeVars} data-testid="shop-overlay">
      <div className="shop-overlay__header">
        <h3 className="shop-overlay__title">Castle Repairs & Shields</h3>
        <button
          type="button"
          className="shop-overlay__close-btn"
          onClick={onClose}
          aria-label="Close Shop"
        >
          ✕
        </button>
      </div>

      <div className="shop-overlay__grid">
        {/* Purchase: Citizen */}
        <div className="shop-item">
          <div className="shop-item__icon-wrapper">
            <span className="shop-item__icon"><IoMdPeople /></span>
          </div>
          <div className="shop-item__info">
            <span className="shop-item__name">Hire Citizen</span>
            <span className="shop-item__desc">Increases passive income generation.</span>
            <span className="shop-item__stat">Current: {citizens} citizens</span>
            {!canAffordCitizen && (
              <span className="shop-item__cost-needed">
                Need {(nextCitizenCost - currency).toFixed(0)}g more
              </span>
            )}
          </div>
          <button
            type="button"
            className="shop-item__buy-btn"
            disabled={!canAffordCitizen}
            onClick={() => onBuyItem('citizen')}
          >
            Buy ({nextCitizenCost}g)
          </button>
        </div>

        {/* Purchase: Repair */}
        <div className="shop-item">
          <div className="shop-item__icon-wrapper">
            <span className="shop-item__icon"><GiAutoRepair /></span>
          </div>
          <div className="shop-item__info">
            <span className="shop-item__name">Repair Castle</span>
            <span className="shop-item__desc">
              Restores a portion of your castle's health. Limited uses per match.
            </span>
            <span className="shop-item__stat">
              HP: {castleHp} / {maxCastleHp} · Repairs: {repairsUsed}/{maxRepairs}
            </span>
            {!isFullHp && !repairsExhausted && !canAffordRepair && (
              <span className="shop-item__cost-needed">
                Need {(nextRepairCost - currency).toFixed(0)}g more
              </span>
            )}
          </div>
          <button
            type="button"
            className="shop-item__buy-btn"
            disabled={!canAffordRepair || isFullHp || repairsExhausted}
            onClick={() => onBuyItem('repair')}
          >
            {repairsExhausted
              ? 'No repairs left'
              : isFullHp
                ? 'Max HP'
                : `Buy (${nextRepairCost}g)`}
          </button>
        </div>

        {/* Purchase: Shield */}
        <div className="shop-item">
          <div className="shop-item__icon-wrapper">
            <span className="shop-item__icon"><FaShieldAlt /></span>
          </div>
          <div className="shop-item__info">
            <span className="shop-item__name">Buy Shield</span>
            <span className="shop-item__desc">Surrounds your castle with a protective barrier.</span>
            <span className="shop-item__stat">
              Active Shield: {shieldHp > 0 ? `${shieldHp} HP` : 'None'}
            </span>
            {!hasActiveShield && !canAffordShield && (
              <span className="shop-item__cost-needed">
                Need {(shieldCost - currency).toFixed(0)}g more
              </span>
            )}
          </div>
          <button
            type="button"
            className="shop-item__buy-btn"
            disabled={!canAffordShield || hasActiveShield}
            onClick={() => onBuyItem('shield')}
          >
            {hasActiveShield ? 'Active' : `Buy (${shieldCost}g)`}
          </button>
        </div>
      </div>
    </div>
  )
}
