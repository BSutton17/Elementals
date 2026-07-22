import { useState } from 'react'
import { KINGDOMS, canMultiTarget, multiTargetLimit } from '../game/kingdoms'
import { placeKingdoms } from '../game/placement'
import { getKingdomTheme } from '../game/kingdomThemes'
import { KingdomSite } from './KingdomSite'
// import { TargetIndicator } from './TargetIndicator'
import { BattlefieldFx } from './BattlefieldFx'
import { FloatingNumbers } from './FloatingNumbers'
import { DustBunniesLayer } from './DustBunniesLayer'
import { AbilityBar } from './AbilityBar'
import { getAbilitiesForKingdom, getUpgradeCost } from '../game/abilities'
import { castAbility, buyItem, buyUpgrade, changeTarget } from '../game/matchStore'
import type { GamePlayer } from '../game/gameState'
import type { LobbyMatch } from '../game/lobby'
import './BattlefieldView.css'

const FALLBACK_COLOR = '#3a4152'
const DEFAULT_TICK_RATE = 20

/**
 * The primary battlefield renderer (ticket #192): a responsive, square SVG
 * arena that draws every kingdom around a circle (#193) with its castle,
 * bars, and economy readouts (#194–#198), plus live target indicators (#199).
 * Layers are explicit `<g>` groups (arena → targets → kingdoms → projectiles)
 * so future tickets can slot in projectile flights and visual effects without
 * restructuring. Everything renders from the synchronized game state; until
 * the first `state:sync` lands, sensible defaults come from the match config.
 */
export function BattlefieldView({
  match,
  youId,
  players,
}: {
  match: LobbyMatch
  youId: string | null
  players: GamePlayer[]
}) {
  const tickRate = match.config?.tickRate ?? DEFAULT_TICK_RATE

  // Join the lobby roster with live gameplay state; before the first sync,
  // fall back to the configured starting values so the arena renders at once.
  const roster: GamePlayer[] = match.players.map((p) => {
    const live = players.find((g) => g.id === p.id)
    if (live) return { ...live, name: p.name, kingdomId: p.kingdomId }
    return {
      id: p.id,
      name: p.name,
      kingdomId: p.kingdomId,
      castle: {
        hp: match.config?.startingCastleHp ?? 0,
        maxHp: match.config?.startingCastleHp ?? 0,
        shield: 0,
      },
      economy: { citizens: match.config?.startingCitizens ?? 0, currency: 0, incomePerTick: 0 },
      target: null,
      eliminated: false,
    }
  })

  const positions = placeKingdoms(roster.length)
  const positionOf = (id: string) => {
    const i = roster.findIndex((p) => p.id === id)
    return i >= 0 ? positions[i] : undefined
  }
  const colorOf = (kingdomId: string | null) =>
    KINGDOMS.find((k) => k.id === kingdomId)?.color ?? FALLBACK_COLOR

  const you = roster.find((p) => p.id === youId) || roster[0]

  // Air's "Embrace of Winds" (Epic 8): its attacks can strike several kingdoms
  // at once with the damage split evenly. For those kingdoms, targeting is a
  // local multi-select (click to toggle); everyone else keeps the single,
  // server-tracked target. Only living opponents can stay selected.
  const multiTarget = canMultiTarget(you.kingdomId)
  const targetLimit = multiTargetLimit(you.kingdomId)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const activeSelected = selectedIds.filter((id) =>
    roster.some((p) => p.id === id && p.id !== youId && !p.eliminated),
  )
  const isTargeted = (id: string) =>
    multiTarget ? activeSelected.includes(id) : you?.target === id
  const toggleTarget = (id: string) => {
    if (multiTarget) {
      setSelectedIds((prev) =>
        prev.includes(id)
          ? prev.filter((x) => x !== id)
          : prev.length >= targetLimit // Embrace of Winds cap (server-authoritative)
            ? prev
            : [...prev, id],
      )
    } else {
      void changeTarget(id)
    }
  }

  const yourTheme = getKingdomTheme(you.kingdomId)
  const hasAirVision = you.statuses?.some((s) => s.id === 'birdsEyeView') ?? false
  // Nature's Toxic Gas chemically seals the Repairs & Shields menu shut.
  const shopLocked = you.statuses?.some((s) => s.id === 'toxicGas') ?? false
  // Gastro Acid can poison the citizens, sapping income.
  const citizensPoisoned = you.statuses?.some((s) => s.id === 'poisonedCitizens') ?? false
  // Ice's Freeze ices over every action button and seals the shop.
  const frozen = you.statuses?.some((s) => s.id === 'frozen') ?? false
  // Chilling Retribution lengthens your cooldowns — snowflake the slowed cards.
  const cooldownChilled = you.statuses?.some((s) => s.id === 'chillingRetribution') ?? false
  const cssVars = {
    '--kingdom-primary': yourTheme?.primary || '#4aa3ff',
    '--kingdom-secondary': yourTheme?.secondary || '#2193b0',
    '--kingdom-dark': yourTheme?.dark || '#1e3c72',
  } as React.CSSProperties

  return (
    <main className="battlefield" style={cssVars}>
      <h1 className="battlefield__sr-title">Battlefield</h1>
      <div className="battlefield__kingdom-header">
        <div className="battlefield__level-circle">
          {you.unlocked ? Object.values(you.unlocked).filter(Boolean).length : 0}
        </div>
        <h2>{yourTheme?.name || 'Kingdom'}</h2>
      </div>
      <div className="battlefield__arena-box">
      <svg
        className="battlefield__arena"
        viewBox="0 0 1000 1000"
        role="img"
        aria-label="Battlefield"
      >
        {/* Layer: arena floor */}
        <g className="battlefield__layer-arena">
          <circle cx={500} cy={500} r={470} fill="rgba(255,255,255,0.025)" />
          <circle
            cx={500}
            cy={500}
            r={340}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={2}
            strokeDasharray="4 10"
          />
        </g>

        {/* Layer: target indicators (#199) — under the kingdoms. Your own
            multi-select (Air) draws one line per selected kingdom; everyone
            else draws their single server-tracked target. */}
        <g className="battlefield__layer-targets">
          {roster.flatMap((p) => {
            if (p.eliminated) return []
            // const targetIds =
            //   p.id === youId && multiTarget
            //     ? activeSelected
            //     : p.target
            //       ? [p.target]
            //       : []
            const from = positionOf(p.id)
            if (!from) return []
            // return targetIds.flatMap((targetId) => {
            //   const to = positionOf(targetId)
            //   if (!to) return []
            //   return [
            //     <TargetIndicator
            //       key={`target-${p.id}-${targetId}`}
            //       from={from}
            //       to={to}
            //       color={colorOf(p.kingdomId)}
            //       isYou={p.id === youId}
            //       fromId={p.id}
            //       toId={targetId}
            //     />,
            //   ]
            // })
          })}
        </g>

        {/* Layer: kingdoms (#193–#198) */}
        <g className="battlefield__layer-kingdoms">
          {roster.map((p, i) => (
            <KingdomSite
              key={p.id}
              player={p}
              color={colorOf(p.kingdomId)}
              x={positions[i]!.x}
              y={positions[i]!.y}
              isYou={p.id === youId}
              isYourTarget={isTargeted(p.id)}
              tickRate={tickRate}
              showStats={p.id === youId || hasAirVision}
              onSelect={
                p.id !== youId && !p.eliminated
                  ? () => toggleTarget(p.id)
                  : undefined
              }
            />
          ))}
        </g>

        {/* Layer: projectiles & effects — populated by later tickets. */}
        <g className="battlefield__layer-projectiles" data-testid="projectile-layer" />

        {/* Layer: floating combat numbers (#265–#266) — topmost so damage and
            healing values read clearly above the castles. */}
        <FloatingNumbers
          positionOf={positionOf}
          kingdomOf={(id) => roster.find((p) => p.id === id)?.kingdomId ?? null}
          colorOf={colorOf}
        />

        {/* Dust Bunnies (#… Nature ultimate): hopping bunnies + brawl clouds. */}
        <DustBunniesLayer positionOf={positionOf} />
      </svg>
      {/* PixiJS effects overlay (Epic 9): visualizes authoritative events;
          pointer-events:none keeps the SVG the interactive targeting surface. */}
      <BattlefieldFx order={match.players.map((p) => ({ id: p.id, kingdomId: p.kingdomId }))} />
      </div>

      {you && (
        <AbilityBar
          kingdomId={you.kingdomId}
          theme={yourTheme}
          currency={you.economy.currency}
          citizens={you.economy.citizens}
          castleHp={you.castle.hp}
          maxCastleHp={you.castle.maxHp}
          shieldHp={you.castle.shield}
          nextCitizenCost={
            you.economy.nextCitizenCost ??
            Math.round(25 * Math.pow(1.10, you.economy.citizensPurchased ?? 0))
          }
          nextRepairCost={
            you.castle.nextRepairCost ??
            Math.round(500 * Math.pow(1.25, you.castle.repairs ?? 0))
          }
          shieldCost={500}
          repairsUsed={you.castle.repairs ?? 0}
          maxRepairs={3}
          lockedOut={shopLocked}
          citizensPoisoned={citizensPoisoned}
          frozen={frozen}
          cooldownChilled={cooldownChilled}
          incomePerSecond={you.economy.incomePerTick * tickRate}
          abilities={getAbilitiesForKingdom(you.kingdomId).map((metadata) => {
            // Bought abilities show as level 1; upgrade tiers stack on top.
            const isUnlocked = you.unlocked?.[metadata.id] ?? false
            const tier = you.upgrades?.[metadata.id] ?? 0
            const level = isUnlocked ? tier + 1 : 0
            const cooldownRemaining = you.cooldowns?.[metadata.id] ?? 0
            // Find if there is an active/enabled state from server snapshot
            const enabled = true // fallback to true
            const cost = metadata.baseCost
            const upgradeCost = isUnlocked ? getUpgradeCost(metadata.id, tier) : null
            const unlockCost = isUnlocked
              ? undefined
              : metadata.unlockCost ?? Math.ceil(cost * 0.5)
            // Charge-based abilities: each spent charge regenerates on its own
            // synced countdown; available = max − recharging.
            const rechargeTicks = metadata.charges
              ? you.recharges?.[metadata.id] ?? []
              : undefined
            return {
              id: metadata.id,
              level,
              cooldownRemaining,
              enabled,
              cost,
              upgradeCost,
              unlockCost,
              rechargeTicks,
            }
          })}
          tickRate={tickRate}
          onCastAbility={(abilityId, chargesToUse) => {
            // Multi-target kingdoms (Air) send the whole selected set; the
            // server spreads an attack's damage across them and ignores the
            // list for self/all-target abilities.
            const target = multiTarget ? activeSelected : you.target
            void castAbility(abilityId, target, chargesToUse)
          }}
          onUpgradeAbility={(abilityId) => {
            void buyUpgrade(abilityId)
          }}
          onBuyItem={(purchaseId) => {
            void buyItem(purchaseId)
          }}
        />
      )}
    </main>
  )
}
