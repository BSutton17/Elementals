import React, { useState } from 'react'
import { CiLock } from 'react-icons/ci'
import type { ClientAbilityMetadata } from '../game/abilities'
import './AbilityBar.css'

interface AbilityButtonProps {
  metadata: ClientAbilityMetadata
  level: number // 0 = locked/not upgraded yet, 1+ = active levels
  cooldownRemaining: number // in ticks
  tickRate: number // ticks per second
  currency: number // player's current gold
  enabled: boolean
  isUltimateCharged?: boolean
  cost: number // gold cost to cast
  /** Ticks until each spent charge regenerates (charge-based abilities). */
  rechargeTicks?: number[]
  onCast: (chargesToUse?: number) => void
  onUnlock?: () => void // buy a locked ability (puts it at level 1)
  onUpgrade?: () => void
  upgradeCost?: number | null // next upgrade cost, null if maxed
  unlockCost?: number // cost to unlock a locked ability (50% of cast cost)
}

export function AbilityButton({
  metadata,
  level,
  cooldownRemaining,
  tickRate,
  currency,
  enabled,
  isUltimateCharged = true,
  cost,
  rechargeTicks,
  onCast,
  onUnlock,
  onUpgrade,
  upgradeCost,
  unlockCost,
}: AbilityButtonProps) {
  const [hovered, setHovered] = useState(false)
  const [upgradeHovered, setUpgradeHovered] = useState(false)

  // Compute cooldown timing
  const isCooldown = cooldownRemaining > 0
  const cooldownSeconds = (cooldownRemaining / tickRate).toFixed(1)

  // Cooldown percentage for SVG radial circle wipe.
  // We assume a standard duration based on ability type if not provided, or default to a full circle if cooling.
  const cooldownPercent = isCooldown ? Math.min(100, Math.max(0, (cooldownRemaining / (10 * tickRate)) * 100)) : 0

  // Charge-based abilities (Lightning Barrage): the pool holds `max` charges;
  // each spent one is regenerating on its own timer in `rechargeTicks`.
  const chargeSpec = metadata.charges
  const availableCharges = chargeSpec
    ? Math.max(0, chargeSpec.max - (rechargeTicks?.length ?? 0))
    : 0
  // The card's headline cost: one charge for charge-based casts.
  const effectiveCost = chargeSpec ? chargeSpec.costPerCharge : cost

  const canAfford = currency >= effectiveCost
  const canAffordUpgrade = upgradeCost != null && currency >= upgradeCost
  const isLocked = level === 0 && metadata.kind !== 'passive'
  const canAffordUnlock = unlockCost != null && currency >= unlockCost
  // A locked card is a "buy" button: clickable whenever the unlock is affordable.
  const isCastingDisabled = isLocked
    ? !canAffordUnlock
    : isCooldown ||
      !enabled ||
      !canAfford ||
      (chargeSpec != null && availableCharges === 0) ||
      (metadata.kind === 'ultimate' && !isUltimateCharged)

  return (
    <div
      className="ability-button-container"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className={`ability-button ability-button--${metadata.element} ${
          isCastingDisabled ? 'ability-button--disabled' : ''
        } ${metadata.kind === 'ultimate' ? 'ability-button--ultimate' : ''}`}
        style={{ '--gradient': metadata.gradient } as React.CSSProperties}
        disabled={isCastingDisabled}
        onClick={() =>
          isLocked ? onUnlock?.() : onCast(chargeSpec ? 1 : undefined)
        }
        aria-label={isLocked ? `Unlock ${metadata.name}` : `Cast ${metadata.name}`}
      >
        {/* Ability Badge Icon */}
        <span className="ability-button__badge"><metadata.icon /></span>

        {/* Hotkey Tag */}
        <span className="ability-button__hotkey">{metadata.hotkey}</span>

        {/* Cost Tag — charge-based casts show the single-charge price. */}
        {effectiveCost > 0 && (
          <span className="ability-button__cost">
            {effectiveCost}g{chargeSpec ? '/⚡' : ''}
          </span>
        )}

        {/* Charge pool indicator: how many charges are ready right now. */}
        {chargeSpec && !isLocked && (
          <span className="ability-button__charges" data-testid="charge-pool">
            {Array.from({ length: chargeSpec.max }).map((_, i) => (
              <span
                key={i}
                className={`ability-button__charge-pip${i < availableCharges ? ' ability-button__charge-pip--held' : ''}`}
                title={
                  i < availableCharges
                    ? 'Charge ready'
                    : `Recharging — back in ${Math.ceil((rechargeTicks?.[i - availableCharges] ?? 0) / tickRate)}s`
                }
              >
                ⚡
              </span>
            ))}
          </span>
        )}

        {/* Cooldown Overlay */}
        {isCooldown && (
          <div className="ability-button__cooldown-overlay">
            <svg className="ability-button__cooldown-svg" viewBox="0 0 36 36">
              <path
                className="ability-button__cooldown-path"
                strokeDasharray="100, 100"
                strokeDashoffset={cooldownPercent}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="ability-button__cooldown-text">{cooldownSeconds}s</span>
          </div>
        )}

        {/* Level Tag (Pips/Stars) */}
        {level > 0 && (
          <div className="ability-button__level-badge">
            {Array.from({ length: Math.min(5, level) }).map((_, i) => (
              <span key={i} className="ability-button__level-pip">★</span>
            ))}
            {level > 5 && <span className="ability-button__level-text">Lv.{level}</span>}
          </div>
        )}

        {/* Locked state overlay */}
        {isLocked && (
          <div className="ability-button__locked-overlay">
            <div className="ability-button__locked-content">
              <span className="ability-button__locked-icon"><CiLock /></span>
              {unlockCost && (
                <span className="ability-button__unlock-cost">{unlockCost}g</span>
              )}
            </div>
          </div>
        )}
      </button>

      {/* Charge cast buttons (Lightning Barrage): spend exactly 1, 2, or 3
          charges. Each is enabled only while that many charges are ready and
          affordable — leftover charges stay castable while others recharge. */}
      {chargeSpec && !isLocked && (
        <div className="ability-button__charge-cast" data-testid="charge-cast-buttons">
          {Array.from({ length: chargeSpec.max }).map((_, i) => {
            const k = i + 1
            const kCost = chargeSpec.costPerCharge * k
            const usable = enabled && k <= availableCharges && currency >= kCost
            return (
              <button
                key={k}
                type="button"
                className={`ability-button__charge-cast-btn${usable ? ' ability-button__charge-cast-btn--ready' : ''}`}
                disabled={!usable}
                title={
                  k <= availableCharges
                    ? `Spend ${k} charge${k > 1 ? 's' : ''}: ${kCost}g, ${chargeSpec.damageByCharges[k - 1]} dmg`
                    : `Needs ${k} charges ready (${availableCharges} now)`
                }
                aria-label={`Cast ${metadata.name} with ${k} charge${k > 1 ? 's' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onCast(k)
                }}
              >
                {k}
              </button>
            )
          })}
        </div>
      )}

      {/* Upgrade Plus Button — pinned to the card's top-right corner. Only
          unlocked abilities can be upgraded; locked cards are bought by
          clicking the card itself. */}
      {!isLocked && onUpgrade && upgradeCost !== undefined && upgradeCost !== null && (
        <>
          <button
            type="button"
            className={`ability-button__upgrade-btn ${
              canAffordUpgrade ? 'ability-button__upgrade-btn--active' : ''
            }`}
            disabled={!canAffordUpgrade}
            onClick={(e) => {
              e.stopPropagation()
              onUpgrade()
            }}
            onMouseEnter={() => setUpgradeHovered(true)}
            onMouseLeave={() => setUpgradeHovered(false)}
            aria-label={`Upgrade ${metadata.name} for ${upgradeCost} gold`}
          >
            +
          </button>
          {upgradeHovered && (
            <div className="ability-upgrade-tooltip">
              <div className="ability-upgrade-tooltip__header">
                Upgrade to Level {level + 1}
              </div>
              <div className="ability-upgrade-tooltip__cost">
                Cost: <span className="text-gold">{upgradeCost}g</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Floating Tooltip */}
      {hovered && (
        <div className="ability-tooltip">
          <div className="ability-tooltip__header">
            <span className="ability-tooltip__name">{metadata.name}</span>
            <span className={`ability-tooltip__kind ability-tooltip__kind--${metadata.kind}`}>
              {metadata.kind.toUpperCase()}
            </span>
          </div>
          
          <div className="ability-tooltip__meta">
            {cost > 0 && <span className="ability-tooltip__cost">Cost: {cost} Gold</span>}
            <span className="ability-tooltip__hotkey">Hotkey: {metadata.hotkey}</span>
          </div>

          <p className="ability-tooltip__desc">{metadata.description}</p>

          {/* Charge details: pool status, per-charge recharge timers, and the
              damage/cost table for spending 1, 2, or 3 at once. */}
          {chargeSpec && (
            <div className="ability-tooltip__charges">
              <div className="ability-tooltip__charge-row">
                Charges ready: <strong>{availableCharges}/{chargeSpec.max}</strong>
                {rechargeTicks && rechargeTicks.length > 0 && (
                  <span className="ability-tooltip__charge-timers">
                    {' '}(recharging: {rechargeTicks
                      .map((t) => `${Math.ceil(t / tickRate)}s`)
                      .join(', ')})
                  </span>
                )}
              </div>
              <div className="ability-tooltip__charge-row ability-tooltip__charge-table">
                {chargeSpec.damageByCharges.map((dmg, i) => (
                  <span key={i}>
                    {i + 1}⚡ = {dmg} dmg ({chargeSpec.costPerCharge * (i + 1)}g)
                  </span>
                ))}
              </div>
              <div className="ability-tooltip__charge-row ability-tooltip__charge-hint">
                Use the 1 / 2 / 3 buttons to pick how many charges to spend.
                Each spent charge recharges on its own ~{chargeSpec.rechargeSeconds}s
                timer; unspent charges fire immediately.
              </div>
            </div>
          )}

          {/* <div className="ability-tooltip__footer">
            <div className="ability-tooltip__level-info">
              Current Level: <strong>{level === 0 ? 'Locked' : `Lv. ${level}`}</strong>
            </div>
            {isLocked ? (
              <div className={`ability-tooltip__upgrade ${canAffordUnlock ? 'text-green' : 'text-red'}`}>
                Click to unlock: <strong>{unlockCost}g</strong>
              </div>
            ) : upgradeCost !== null && upgradeCost !== undefined ? (
              <div className={`ability-tooltip__upgrade ${canAffordUpgrade ? 'text-green' : 'text-red'}`}>
                Upgrade cost: <strong>{upgradeCost}g</strong>
              </div>
            ) : (
              <div className="ability-tooltip__upgrade text-gold">
                Max level reached
              </div>
            )}
          </div> */}
        </div>
      )}
    </div>
  )
}
