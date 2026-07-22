import { useEffect, useState } from 'react'
import { GiReceiveMoney, GiPoisonGas } from 'react-icons/gi'
import { IoMdPeople } from 'react-icons/io'
import { FaHeart, FaShieldAlt, FaTools } from 'react-icons/fa'
import { getAbilitiesForKingdom } from '../game/abilities'
import { type KingdomTheme } from '../game/kingdomThemes'
import { AbilityButton } from './AbilityButton'
import { ShopOverlay } from './ShopOverlay'
import { FrostCoat } from './FrostCoat'
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
  /** Nature's Toxic Gas seals the Repairs & Shields menu shut for its duration. */
  lockedOut?: boolean
  /** Gastro Acid poisoned the citizens — income is sapped for the duration. */
  citizensPoisoned?: boolean
  /** Ice's Frozen: every action button ices over and the shop is sealed shut. */
  frozen?: boolean
  /** Chilling Retribution is lengthening the caster's cooldowns — snowflake the
   *  cards that are on cooldown. */
  cooldownChilled?: boolean
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
  lockedOut = false,
  citizensPoisoned = false,
  frozen = false,
  cooldownChilled = false,
  incomePerSecond,
  abilities,
  tickRate,
  onCastAbility,
  onUpgradeAbility,
  onBuyItem,
}: AbilityBarProps) {
  const [isShopOpen, setIsShopOpen] = useState(false)
  // Toxic Gas AND Ice's Freeze both force the menu closed the moment they land
  // and hold it shut (you've lost control); the toggle refuses to reopen while
  // either is active (see below).
  const shopSealed = lockedOut || frozen
  useEffect(() => {
    if (shopSealed) setIsShopOpen(false)
  }, [shopSealed])
  const shopOpen = isShopOpen && !shopSealed

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
      {/* Frozen: tiny snow drifts down over the whole action bar. */}
      {frozen && (
        <div className="ability-bar__frost-snow" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className="ability-bar__frost-flake" />
          ))}
        </div>
      )}

      {/* Expanding Repairs & Shields Menu */}
      <ShopOverlay
        isOpen={shopOpen}
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
          {/* Gold Stats — the income readout goes toxic while citizens are poisoned. */}
          <div className="ability-bar__stat-group" title="Gold & Income">
            <span className="ability-bar__stat-icon"><GiReceiveMoney /></span>
            <div className="ability-bar__stat-values">
              <span className="ability-bar__stat-val ability-bar__stat-val--gold">
                {formattedCurrency}g
              </span>
              <span
                className={`ability-bar__stat-label ${citizensPoisoned ? 'ability-bar__stat-label--poisoned' : ''}`}
              >
                +{formattedIncome}/s
              </span>
            </div>
          </div>

          {/* Citizen Stats — a green contamination film + drifting toxic wisps
              while Gastro Acid's Poisoned Citizens saps their income. */}
          <div
            className={`ability-bar__stat-group ${citizensPoisoned ? 'ability-bar__stat-group--poisoned' : ''}`}
            title={citizensPoisoned ? 'Citizens poisoned — income reduced' : 'Citizens'}
          >
            {citizensPoisoned && (
              <span className="ability-bar__citizen-contam" aria-hidden="true">
                <span className="ability-bar__citizen-contam-wisp" />
                <span className="ability-bar__citizen-contam-wisp" />
                <span className="ability-bar__citizen-contam-icon"><GiPoisonGas /></span>
              </span>
            )}
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
              frozen={frozen}
              chilled={cooldownChilled}
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
          <div className="ability-bar__shop-lock-wrap">
            <button
              type="button"
              className={[
                'ability-bar__shop-toggle',
                shopOpen ? 'ability-bar__shop-toggle--active' : '',
                lockedOut ? 'ability-bar__shop-toggle--locked' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              // Toxic Gas and Ice's Freeze both disable the control entirely — no
              // click, no hover activation, and it drops out of the tab order so
              // keyboard/Enter can't trigger it either.
              onClick={() => {
                if (!shopSealed) setIsShopOpen((open) => !open)
              }}
              disabled={shopSealed}
              aria-expanded={shopOpen}
              aria-disabled={shopSealed}
              aria-label={
                frozen
                  ? 'Repairs and Shields frozen solid'
                  : lockedOut
                    ? 'Repairs and Shields sealed by Toxic Gas'
                    : 'Toggle Repairs and Shield Menu'
              }
            >
              <span className="ability-bar__shop-toggle-icon"><FaTools /></span>
              <span className="ability-bar__shop-toggle-text">Repairs & Shields</span>
            </button>
            {/* The Toxic Gas seal: settles onto the button, pulses, and breathes
                tiny green wisps to show the menu is chemically disabled. */}
            {lockedOut && !frozen && (
              <div className="ability-bar__shop-lock" aria-hidden="true">
                <span className="ability-bar__shop-lock-wisp" />
                <span className="ability-bar__shop-lock-wisp" />
                <span className="ability-bar__shop-lock-wisp" />
                <span className="ability-bar__shop-lock-icon"><GiPoisonGas /></span>
              </div>
            )}
            {/* Ice's Freeze coats the toggle over in frost too. */}
            {frozen && <FrostCoat small />}
          </div>
        </div>
      </div>
    </div>
  )
}
