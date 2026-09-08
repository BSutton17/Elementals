import { IoMdPeople } from 'react-icons/io'
import { GiAutoRepair } from 'react-icons/gi'
import { FaShieldAlt } from 'react-icons/fa'
import { type KingdomTheme } from '../game/kingdomThemes'
import type { ScrambleDisplay } from './scramble/useScrambleValues'
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
  /** Seconds left on the buy-shield break cooldown (0 = ready). */
  shieldCooldownSeconds?: number
  /** A swarm on YOUR castle bars you from buying a shield (Light's Fireflies)
   *  — the server rejects the purchase, so grey it out and say why. */
  shieldBlockedBySwarm?: boolean
  /**
   * Half Past 12: show these numbers instead of the real ones. Null normally.
   *
   * ⚠️ DISPLAY ONLY, AND THE DISTINCTION IS LOAD-BEARING HERE. Every
   * `canAfford*` below is computed from the REAL props and stays that way: this
   * panel gates its own buttons, so feeding it scrambled prices would disable a
   * purchase the player can actually afford and change what a click does. The
   * scramble lies about what things cost; it must never lie about what happens.
   */
  scramble?: ScrambleDisplay | null
  theme: KingdomTheme | null
  onBuyItem: (id: 'citizen' | 'repair' | 'shield' | 'dispel') => void
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
  shieldCooldownSeconds = 0,
  shieldBlockedBySwarm = false,
  scramble = null,
  theme,
  onBuyItem,
  onClose,
}: ShopOverlayProps) {
  if (!isOpen) return null

  const isFullHp = castleHp >= maxCastleHp
  const hasActiveShield = shieldHp > 0
  const repairsExhausted = repairsUsed >= maxRepairs
  const shieldOnCooldown = shieldCooldownSeconds > 0

  const canAffordCitizen = currency >= nextCitizenCost
  const canAffordRepair = currency >= nextRepairCost && !isFullHp && !repairsExhausted
  const canAffordShield =
    currency >= shieldCost && !hasActiveShield && !shieldOnCooldown && !shieldBlockedBySwarm

  // ---- what the player SEES. Everything above this line is the truth and
  // decides what the buttons do; everything below is only drawn.
  const dCitizenCost = scramble ? scramble.citizenCost : nextCitizenCost
  const dRepairCost = scramble ? scramble.repairCost : nextRepairCost
  const dShieldCost = scramble ? scramble.shieldCost : shieldCost
  const dCurrency = scramble ? scramble.gold : currency
  const dCitizens = scramble ? scramble.citizens : citizens
  const dCastleHp = scramble ? scramble.castleHp : castleHp
  const dShieldHp = scramble ? scramble.shieldHp : shieldHp
  const shortBy = (cost: number) => Math.max(0, cost - dCurrency).toFixed(0)

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
            <span className="shop-item__stat">Current: {dCitizens} citizens</span>
            {!canAffordCitizen && (
              <span className="shop-item__cost-needed">
                Need {shortBy(dCitizenCost)}g more
              </span>
            )}
          </div>
          <button
            type="button"
            className="shop-item__buy-btn"
            disabled={!canAffordCitizen}
            onClick={() => onBuyItem('citizen')}
          >
            Buy ({dCitizenCost}g)
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
              HP: {dCastleHp} / {maxCastleHp} · Repairs: {repairsUsed}/{maxRepairs}
            </span>
            {!isFullHp && !repairsExhausted && !canAffordRepair && (
              <span className="shop-item__cost-needed">
                Need {shortBy(dRepairCost)}g more
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
                : `Buy (${dRepairCost}g)`}
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
              Active Shield: {shieldHp > 0 ? `${dShieldHp} HP` : 'None'}
            </span>
            {shieldBlockedBySwarm ? (
              <span className="shop-item__cost-needed">
                Fireflies are swarming your castle — shoo them off first.
              </span>
            ) : shieldOnCooldown ? (
              <span className="shop-item__cost-needed">
                Shield broken — ready in {Math.ceil(shieldCooldownSeconds)}s
              </span>
            ) : (
              !hasActiveShield &&
              !canAffordShield && (
                <span className="shop-item__cost-needed">
                  Need {shortBy(dShieldCost)}g more
                </span>
              )
            )}
          </div>
          <button
            type="button"
            className="shop-item__buy-btn"
            disabled={
              !canAffordShield || hasActiveShield || shieldOnCooldown || shieldBlockedBySwarm
            }
            onClick={() => onBuyItem('shield')}
          >
            {hasActiveShield
              ? 'Active'
              : shieldBlockedBySwarm
                ? 'Swarmed'
                : shieldOnCooldown
                  ? `${Math.ceil(shieldCooldownSeconds)}s`
                  : `Buy (${dShieldCost}g)`}
          </button>
        </div>

      </div>
    </div>
  )
}
