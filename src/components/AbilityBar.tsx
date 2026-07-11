import { useState } from 'react'
import { GiReceiveMoney } from 'react-icons/gi'
import { IoMdPeople } from 'react-icons/io'
import { FaHeart, FaShieldAlt, FaTools } from 'react-icons/fa'
import { getAbilitiesForKingdom } from '../game/abilities'
import { type KingdomTheme } from '../game/kingdomThemes'
import { AbilityButton } from './AbilityButton'
import { ShopOverlay } from './ShopOverlay'
import './AbilityBar.css'

interface AbilityState {
  id: string
  level: number
  cooldownRemaining: number
  enabled: boolean
  cost: number
  upgradeCost?: number | null
  unlockCost?: number
  /** Ticks until each spent charge regenerates (charge-based abilities). */
  rechargeTicks?: number[]
}

interface AbilityBarProps {
  kingdomId: string | null
  theme: KingdomTheme | null
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
  incomePerSecond: number
  abilities: AbilityState[]
  tickRate: number
  onCastAbility: (abilityId: string, chargesToUse?: number) => void
  onUpgradeAbility?: (abilityId: string) => void
  onBuyItem: (id: 'citizen' | 'repair' | 'shield') => void
}

export function AbilityBar({
  kingdomId,
  theme,
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
  incomePerSecond,
  abilities,
  tickRate,
  onCastAbility,
  onUpgradeAbility,
  onBuyItem,
}: AbilityBarProps) {
  const [isShopOpen, setIsShopOpen] = useState(false)

  // Get metadata definitions for player's kingdom
  const metadatas = getAbilitiesForKingdom(kingdomId)

  // Map state from props to metadata definitions, ensuring correct display order
  const activeAbilities = metadatas
    .filter((m) => m.kind !== 'passive') // passives are not shown on bottom bar
    .map((metadata) => {
      const state = abilities.find((a) => a.id === metadata.id) || {
        level: 0,
        cooldownRemaining: 0,
        enabled: true,
        cost: 0,
        upgradeCost: 150, // fallback starting cost
        unlockCost: undefined,
        rechargeTicks: undefined,
      }
      return {
        metadata,
        level: state.level,
        cooldownRemaining: state.cooldownRemaining,
        enabled: state.enabled,
        cost: state.cost,
        upgradeCost: state.upgradeCost,
        unlockCost: state.unlockCost,
        rechargeTicks: state.rechargeTicks,
      }
    })

  // Format HP and shield numbers nicely
  const formattedHp = castleHp.toLocaleString()
  const formattedIncome = incomePerSecond.toFixed(1)
  const formattedCurrency = Math.floor(currency)

  const themeVars = {
    '--bar-primary': theme?.primary || '#4aa3ff',
    '--bar-secondary': theme?.secondary || '#2193b0',
    '--bar-dark': theme?.dark || '#1e3c72',
  } as React.CSSProperties

  return (
    <div className="ability-bar-wrapper" style={themeVars} data-testid="ability-bar">
      {/* Expanding Repairs & Shields Menu */}
      <ShopOverlay
        isOpen={isShopOpen}
        currency={currency}
        citizens={citizens}
        castleHp={castleHp}
        maxCastleHp={maxCastleHp}
        shieldHp={shieldHp}
        nextCitizenCost={nextCitizenCost}
        nextRepairCost={nextRepairCost}
        shieldCost={shieldCost}
        repairsUsed={repairsUsed}
        maxRepairs={maxRepairs}
        theme={theme}
        onBuyItem={onBuyItem}
        onClose={() => setIsShopOpen(false)}
      />

      {/* Main Bottom HUD Bar */}
      <div className="ability-bar">
        {/* Left Side: Player Statistics Panel */}
        <div className="ability-bar__stats">
          {/* Gold Stats */}
          <div className="ability-bar__stat-group" title="Gold & Income">
            <span className="ability-bar__stat-icon"><GiReceiveMoney /></span>
            <div className="ability-bar__stat-values">
              <span className="ability-bar__stat-val ability-bar__stat-val--gold">
                {formattedCurrency}g
              </span>
              <span className="ability-bar__stat-label">+{formattedIncome}/s</span>
            </div>
          </div>

          {/* Citizen Stats */}
          <div className="ability-bar__stat-group" title="Citizens">
            <span className="ability-bar__stat-icon"><IoMdPeople /></span>
            <div className="ability-bar__stat-values">
              <span className="ability-bar__stat-val">{citizens}</span>
              <span className="ability-bar__stat-label">Citizens</span>
            </div>
          </div>

          {/* HP and Shield Stats — current HP only, to keep the readout compact. */}
          <div className="ability-bar__stat-group ability-bar__stat-group--large" title="Castle HP & Shield">
            <span className="ability-bar__stat-icon"><FaHeart /></span>
            <div className="ability-bar__stat-values">
              <span className="ability-bar__stat-val">{formattedHp}</span>
              {shieldHp > 0 ? (
                <span className="ability-bar__stat-label ability-bar__stat-label--shield">
                  <span style={{ display: 'inline-block', marginRight: '4px' }}><FaShieldAlt /></span> +{shieldHp} Shield
                </span>
              ) : (
                <span className="ability-bar__stat-label">Castle HP</span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Castable Ability Buttons */}
        <div className="ability-bar__buttons">
          {activeAbilities.map(({ metadata, level, cooldownRemaining, enabled, cost, upgradeCost, unlockCost, rechargeTicks }) => (
            <AbilityButton
              key={metadata.id}
              metadata={metadata}
              level={level}
              cooldownRemaining={cooldownRemaining}
              tickRate={tickRate}
              currency={currency}
              enabled={enabled}
              cost={cost}
              rechargeTicks={rechargeTicks}
              onCast={(chargesToUse) => onCastAbility(metadata.id, chargesToUse)}
              onUnlock={onUpgradeAbility ? () => onUpgradeAbility(metadata.id) : undefined}
              onUpgrade={onUpgradeAbility ? () => onUpgradeAbility(metadata.id) : undefined}
              upgradeCost={upgradeCost}
              unlockCost={unlockCost}
            />
          ))}
        </div>

        {/* Right Side: Repairs & Shields Toggle Panel Trigger */}
        <div className="ability-bar__controls">
          <button
            type="button"
            className={`ability-bar__shop-toggle ${isShopOpen ? 'ability-bar__shop-toggle--active' : ''}`}
            onClick={() => setIsShopOpen(!isShopOpen)}
            aria-expanded={isShopOpen}
            aria-label="Toggle Repairs and Shield Menu"
          >
            <span className="ability-bar__shop-toggle-icon"><FaTools /></span>
            <span className="ability-bar__shop-toggle-text">Repairs & Shields</span>
          </button>
        </div>
      </div>
    </div>
  )
}
