import { useEffect, useRef, useState } from 'react'
import { onGameEvents } from '../game/gameEvents'
import type {
  AbilityCastEvent,
  AttackUndoneEvent,
  CardDrawnEvent,
  LuckyDrawEvent,
  ShieldDestroyedEvent,
} from '../game/events'
import {
  KINGDOMS,
  canMultiTarget,
  usesLocalTargeting,
  localSelectLimit,
  statusMultiTargetLimit,
  MULTI_SELECT_ABILITIES,
} from '../game/kingdoms'
import { placeKingdoms } from '../game/placement'
import { getKingdomTheme } from '../game/kingdomThemes'
import { KingdomSite } from './KingdomSite'
// import { TargetIndicator } from './TargetIndicator'
import { BattlefieldFx } from './BattlefieldFx'
import { LightShowLayer } from './lightShow/LightShowLayer'
import { WagerResultLayer } from './wager/WagerResultLayer'
import { BlackHoleAccumulator } from './BlackHoleAccumulator'
import { FloatingNumbers } from './FloatingNumbers'
import { EmpathyReaction } from './EmpathyReaction'
import { BffsLinkLayer } from './BffsLinkLayer'
import { DustBunniesLayer } from './DustBunniesLayer'
import { AbilityBar } from './AbilityBar'
import { BlackjackReveal, type BlackjackCinematic } from './cards/BlackjackReveal'
import { LuckyDrawOverlay } from './cards/LuckyDrawOverlay'
import { useScrambleValues } from './scramble/useScrambleValues'
import { getAbilitiesForKingdom } from '../game/abilities'
import { castAbility, buyItem, buyUpgrade, changeTarget } from '../game/matchStore'
import type { GamePlayer } from '../game/gameState'
import type { LobbyMatch } from '../game/lobby'
import './BattlefieldView.css'

const FALLBACK_COLOR = '#3a4152'

/**
 * Ability ids we've already complained about, so the warning below fires once
 * per ability rather than every frame.
 */
const warnedMissingPrices = new Set<string>()

/**
 * Shouts when the server priced SOME abilities but not this one. That only
 * happens on a version skew — the client knows an ability the server doesn't,
 * which in practice means the server is running a stale `dist/` (its dev script
 * serves compiled output, so a `npm run build` is needed after a data change
 * while Vite hot-reloads the client instantly).
 *
 * Without this the failure is silent and baffling: the card renders with no
 * price and refuses to unlock, exactly as if the ability were broken.
 */
function warnIfUnpriced(abilityId: string, hasAnyPrices: boolean, priced: boolean): void {
  if (!hasAnyPrices || priced || warnedMissingPrices.has(abilityId)) return
  warnedMissingPrices.add(abilityId)
  console.warn(
    `[kingdoms] The server sent no prices for "${abilityId}" — it can't be ` +
      `unlocked or cast. The server is probably running a stale build; ` +
      `rebuild it (npm run build in Server/) and restart.`,
  )
}
const DEFAULT_TICK_RATE = 20
/** How long a finished spin's symbols stay above a kingdom on Joker's screen. */
const SLOT_RESULT_LINGER_SECONDS = 7
/** How long a Blip travel-attack rewind streak takes to fly back (ms). */
const REWIND_MS = 700

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
  tick = 0,
  spectator = false,
}: {
  match: LobbyMatch
  youId: string | null
  players: GamePlayer[]
  /** Current server tick — drives time-gated readouts (slot-machine reveals). */
  tick?: number
  /** Watch-only mode: fullscreen arena, no header, no controls, no targeting. */
  spectator?: boolean
}) {
  const tickRate = match.config?.tickRate ?? DEFAULT_TICK_RATE

  // Join the lobby roster with live gameplay state; before the first sync,
  // fall back to the configured starting values so the arena renders at once.
  // Spectators never occupy a battlefield site, so they're filtered out here.
  const roster: GamePlayer[] = match.players.filter((p) => !p.spectator).map((p) => {
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

  // Earth's ultimate (Brick Wall) raises a FORTRESS shield, drawn as a faceted
  // hexadecagon instead of the normal circle. The shield itself carries no
  // status to read, so track who last raised one: set on the cast, cleared when
  // that shield shatters (and, defensively, whenever the pool reaches 0 below).
  const [ultShieldIds, setUltShieldIds] = useState<ReadonlySet<string>>(new Set())
  useEffect(
    () =>
      onGameEvents((events) => {
        setUltShieldIds((prev) => {
          let next = prev
          const mutate = () => (next === prev ? (next = new Set(prev)) : next) as Set<string>
          for (const event of events) {
            if (event.type === 'abilityCast') {
              const cast = event as unknown as AbilityCastEvent
              if (cast.abilityId === 'brickWall' && !next.has(cast.casterId)) {
                mutate().add(cast.casterId)
              }
            } else if (event.type === 'shieldDestroyed') {
              const broken = event as unknown as ShieldDestroyedEvent
              if (next.has(broken.playerId)) mutate().delete(broken.playerId)
            }
          }
          return next
        })
      }),
    [],
  )

  // Blip! travel-attack rewind (Epic — Time): when a kingdom undoes an attack,
  // a mote in the attacker's colour streaks from the victim BACK to the caster,
  // so the shot visibly "un-happens" on the shared battlefield. Driven by a rAF
  // that interpolates each streak's position (SMIL doesn't reliably play on
  // dynamically-inserted nodes), then prunes it.
  const rewindKey = useRef(0)
  const [rewinds, setRewinds] = useState<{ key: number; from: string; to: string; start: number }[]>([])
  const [, forceRewindFrame] = useState(0)
  useEffect(
    () =>
      onGameEvents((events) => {
        for (const event of events) {
          if (event.type !== 'attackUndone') continue
          const undo = event as unknown as AttackUndoneEvent
          const key = ++rewindKey.current
          setRewinds((prev) => [
            ...prev,
            { key, from: undo.playerId, to: undo.sourceId, start: performance.now() },
          ])
        }
      }),
    [],
  )
  // Animate + prune active streaks (~700ms each) while any are in flight.
  useEffect(() => {
    if (rewinds.length === 0) return
    let raf = 0
    const loop = () => {
      const now = performance.now()
      setRewinds((prev) => prev.filter((r) => now - r.start < REWIND_MS))
      forceRewindFrame((f) => f + 1)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [rewinds.length])

  // Local click-to-toggle multi-select (Air's "Embrace of Winds" spreads every
  // attack across the set; Love picks up to two for BFFS!!!). Everyone else
  // keeps the single, server-tracked target. Only living opponents stay
  // selected. `multiTarget` (Air, spreads ALL attacks) is a narrower flag than
  // `localSelect` (Air OR Love) — Love only spreads BFFS.
  // Dark's Infinitum Tenebrae grants the same thing TEMPORARILY, so the
  // targeting UI has to follow the live status too, not just the kingdom.
  const grantedLimit = statusMultiTargetLimit(you.statuses)
  const multiTarget = canMultiTarget(you.kingdomId) || grantedLimit > 1
  const localSelect = usesLocalTargeting(you.kingdomId) || grantedLimit > 1
  const selectLimit = Math.max(localSelectLimit(you.kingdomId), grantedLimit)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const activeSelected = selectedIds.filter((id) =>
    roster.some((p) => p.id === id && p.id !== youId && !p.eliminated),
  )
  const isTargeted = (id: string) =>
    localSelect ? activeSelected.includes(id) : you?.target === id
  const toggleTarget = (id: string) => {
    if (localSelect) {
      setSelectedIds((prev) =>
        prev.includes(id)
          ? prev.filter((x) => x !== id)
          : prev.length >= selectLimit // cap (Air 3, Love 2)
            ? prev
            : [...prev, id],
      )
    } else {
      void changeTarget(id)
    }
  }

  // Joker's Slot Machine, watched from outside. Only Joker sees this — it is
  // the payoff for casting it, and nobody else needs to know who is stuck at
  // the machine. The readout holds at "Spinning…" until the server's
  // `revealTick`, so it flips to the symbols exactly when the victim's own
  // reels stop. The EFFECT is never shown; that is the victim's business.
  const watchingSlots = you.kingdomId === 'joker'
  const slotDisplayFor = (p: GamePlayer): { text: string; spinning: boolean } | null => {
    if (!watchingSlots || p.id === you.id) return null
    if (p.pendingSpin) return { text: 'Spinning…', spinning: true }
    const spin = p.lastSpin
    if (!spin) return null
    if (tick < spin.revealTick) return { text: 'Spinning…', spinning: true }
    // `lastSpin` is never wiped server-side, so the readout clears itself once
    // the result has had its moment — otherwise every kingdom would wear its
    // last spin overhead for the rest of the match.
    if (tick >= spin.revealTick + SLOT_RESULT_LINGER_SECONDS * tickRate) return null
    return { text: spin.symbols.join(' '), spinning: false }
  }

  // Joker's Blackjack: the drawn card is announced on CAST, and the server
  // holds its damage until the cinematic delivers it, so the card is always
  // seen landing before the victim is hurt. Positions are converted from arena
  // space (1000×1000) to viewport percentages for the overlay.
  const [blackjack, setBlackjack] = useState<BlackjackCinematic | null>(null)
  const blackjackKey = useRef(0)
  useEffect(
    () =>
      onGameEvents((events) => {
        for (const event of events) {
          if (event.type !== 'cardDrawn') continue
          const draw = event as unknown as CardDrawnEvent
          const caster = positionOf(draw.playerId)
          const victimId = roster.find((r) => r.id === draw.playerId)?.target
          const victim = victimId ? positionOf(victimId) : undefined
          setBlackjack({
            key: ++blackjackKey.current,
            card: draw.card,
            from: { x: (caster?.x ?? 500) / 10, y: (caster?.y ?? 500) / 10 },
            to: { x: (victim?.x ?? 500) / 10, y: (victim?.y ?? 500) / 10 },
          })
        }
      }),
    // `positionOf`/`roster` are rebuilt each render; the handler only reads them
    // when an event actually fires, so re-subscribing per render is intended.
  )

  // Joker's Lucky Draw: the server has already rolled which of the five faces
  // landed. The overlay lets the CASTER pick a card to turn over — theatre, not
  // influence — so only Joker sees it.
  const [luckyOutcome, setLuckyOutcome] = useState<string | null>(null)
  const luckyKey = useRef(0)
  useEffect(
    () =>
      onGameEvents((events) => {
        for (const event of events) {
          if (event.type !== 'luckyDraw') continue
          const draw = event as unknown as LuckyDrawEvent
          if (draw.playerId !== youId) continue // the caster's own choice
          luckyKey.current += 1
          setLuckyOutcome(draw.outcome)
        }
      }),
  )

  // A brief on-screen hint (e.g. "BFFS!!! needs two kingdoms"). Self-clearing.
  const [castHint, setCastHint] = useState<string | null>(null)
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashHint = (msg: string) => {
    setCastHint(msg)
    if (hintTimer.current) clearTimeout(hintTimer.current)
    hintTimer.current = setTimeout(() => setCastHint(null), 2600)
  }
  useEffect(() => () => {
    if (hintTimer.current) clearTimeout(hintTimer.current)
  }, [])

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
  // Time's Half Past 12 scrambles the victim's UI — the bar wobbles/jitters and
  // every one of your OWN numbers churns randomly (cosmetic only; real values
  // still drive all gating). Other kingdoms (incl. Bird's Eye reveals) untouched.
  const scrambled = you.statuses?.some((s) => s.id === 'scrambled') ?? false
  const scramble = useScrambleValues(scrambled)
  // Time's Father Time: while marked, badge your damaging attacks with a clock
  // (landing one resets the punishing idle countdown).
  const fatherTimeMarked = you.statuses?.some((s) => s.id === 'fatherTimeMark') ?? false
  const cssVars = {
    '--kingdom-primary': yourTheme?.primary || '#4aa3ff',
    '--kingdom-secondary': yourTheme?.secondary || '#2193b0',
    '--kingdom-dark': yourTheme?.dark || '#1e3c72',
  } as React.CSSProperties

  return (
    <main
      className={`battlefield${spectator ? ' battlefield--spectator' : ''}`}
      style={cssVars}
    >
      <h1 className="battlefield__sr-title">Battlefield</h1>
      {!spectator && (
        <div className="battlefield__kingdom-header">
          <div className="battlefield__level-circle">
            {you.unlocked ? Object.values(you.unlocked).filter(Boolean).length : 0}
          </div>
          <h2>{yourTheme?.name || 'Kingdom'}</h2>
        </div>
      )}
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
          {roster.map((p, i) => {
            const isYou = p.id === youId
            // Half Past 12: scramble ONLY your own HP/shield bars (shield only
            // when one is actually up). Everyone else — and any Bird's Eye
            // reveal of them — keeps their real values.
            const displayPlayer =
              isYou && scramble
                ? {
                    ...p,
                    castle: {
                      ...p.castle,
                      hp: scramble.castleHp,
                      shield: p.castle.shield > 0 ? scramble.shieldHp : 0,
                    },
                  }
                : p
            return (
              <KingdomSite
                key={p.id}
                player={displayPlayer}
                color={colorOf(p.kingdomId)}
                x={positions[i]!.x}
                y={positions[i]!.y}
                isYou={isYou}
                isYourTarget={!spectator && isTargeted(p.id)}
                tickRate={tickRate}
                showStats={spectator || isYou || hasAirVision}
                ultShield={ultShieldIds.has(p.id) && p.castle.shield > 0}
                slotDisplay={slotDisplayFor(p)}
                onSelect={
                  !spectator && !isYou && !p.eliminated
                    ? () => toggleTarget(p.id)
                    : undefined
                }
              />
            )
          })}
        </g>

        {/* Layer: projectiles & effects — populated by later tickets. */}
        <g className="battlefield__layer-projectiles" data-testid="projectile-layer" />

        {/* Layer: Light Show — the warning ring + countdown over the centre of
            the field, then a lance to every kingdom but Light. Lives inside the
            arena SVG so it shares the kingdoms' exact coordinate space. */}
        <LightShowLayer positions={positions} roster={roster} tickRate={tickRate} />

        {/* Layer: the Yin and Yang verdict — did they read the wager right? */}
        <WagerResultLayer positionOf={positionOf} />

        {/* Layer: Blip! travel-attack rewinds — a mote in the attacker's colour
            streaks from the victim back to the caster (the shot un-happening).
            Positions are interpolated per frame by the rAF above. */}
        <g className="battlefield__layer-rewinds" data-testid="rewind-layer">
          {rewinds.map((r) => {
            const from = positionOf(r.from)
            const to = positionOf(r.to)
            if (!from || !to) return null
            const attacker = roster.find((p) => p.id === r.to)
            const color = colorOf(attacker?.kingdomId ?? null)
            const p = Math.min(1, (performance.now() - r.start) / REWIND_MS)
            const ease = 1 - (1 - p) * (1 - p) // easeOut
            const x = from.x + (to.x - from.x) * ease
            const y = from.y + (to.y - from.y) * ease
            const op = 1 - p
            return (
              <g key={r.key}>
                {/* The path already travelled fades behind the returning mote. */}
                <line
                  x1={x}
                  y1={y}
                  x2={from.x}
                  y2={from.y}
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray="8 10"
                  opacity={0.35 * op}
                />
                <circle cx={x} cy={y} r={11} fill={color} opacity={0.35 * op} />
                <circle cx={x} cy={y} r={6} fill="#fff" opacity={0.9 * op} />
              </g>
            )
          })}
        </g>

        {/* Layer: Love's BFFS!!! link ribbons spanning paired castles. Below
            the floating numbers so damage values still read on top. */}
        <BffsLinkLayer positionOf={positionOf} />

        {/* Layer: floating combat numbers (#265–#266) — topmost so damage and
            healing values read clearly above the castles. */}
        <FloatingNumbers
          positionOf={positionOf}
          kingdomOf={(id) => roster.find((p) => p.id === id)?.kingdomId ?? null}
          colorOf={colorOf}
          youId={youId}
        />

        {/* Dust Bunnies (#… Nature ultimate): hopping bunnies + brawl clouds. */}
        <DustBunniesLayer positionOf={positionOf} />

        {/* Love's "Have some Empathy!" — a grinning-hearts face over Love and
            the attacker each time a hit is reflected back. */}
        <EmpathyReaction positionOf={positionOf} />
      </svg>
      {/* PixiJS effects overlay (Epic 9): visualizes authoritative events;
          pointer-events:none keeps the SVG the interactive targeting surface. */}
      <BattlefieldFx
        order={match.players.map((p) => ({ id: p.id, kingdomId: p.kingdomId }))}
        tickRate={tickRate}
      />
      <BlackHoleAccumulator />
      {/* Joker's Blackjack: the whole card reveal, replacing the default bolt.
          The damage is held server-side until the impact frame below. */}
      <BlackjackReveal cast={blackjack} />
      {/* Joker's Lucky Draw: the caster's own five-card selection. */}
      <LuckyDrawOverlay outcome={luckyOutcome} castKey={luckyKey.current} />
      {castHint && (
        <div className="battlefield__cast-hint" role="status">
          {castHint}
        </div>
      )}
      </div>

      {!spectator && you && (
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
          shieldCost={
            you.castle.nextShieldCost ??
            Math.round(500 * Math.pow(1.05, you.castle.shieldsPurchased ?? 0))
          }
          shieldCooldownSeconds={(you.castle.shieldCooldownRemaining ?? 0) / tickRate}
          // Light's Fireflies: a swarm on your castle bars you from buying a
          // shield until you pay it off (the server enforces it; this is just
          // so the button says why).
          shieldBlockedBySwarm={
            you.statuses?.some((s) => s.id === 'fireflies') ?? false
          }
          dispel={you.dispel ?? null}
          repairsUsed={you.castle.repairs ?? 0}
          maxRepairs={3}
          lockedOut={shopLocked}
          citizensPoisoned={citizensPoisoned}
          frozen={frozen}
          // Never-ending Nightmare: every attack but your basic one, and your
          // ultimate, are illegal until it lifts.
          nightmared={you.statuses?.some((s) => s.id === 'neverEndingNightmare') ?? false}
          scrambled={scrambled}
          scramble={scramble}
          fatherTimeMarked={fatherTimeMarked}
          cooldownChilled={cooldownChilled}
          incomePerSecond={you.economy.incomePerTick * tickRate}
          // Space only: show the Supernova charge meter once Supernova is
          // unlocked (undefined for every other kingdom hides it).
          supernovaMeter={you.unlocked?.supernova ? you.supernovaMeter ?? 0 : null}
          // Dark only: show the Unlimited Rage meter once the ultimate is
          // unlocked (null for every other kingdom hides it).
          rageMeter={you.unlocked?.unlimitedRage ? you.rageMeter ?? 0 : null}
          rageFull={match.config?.rageFull}
          abilities={getAbilitiesForKingdom(you.kingdomId).map((metadata) => {
            // Bought abilities show as level 1; upgrade tiers stack on top.
            const isUnlocked = you.unlocked?.[metadata.id] ?? false
            const tier = you.upgrades?.[metadata.id] ?? 0
            const level = isUnlocked ? tier + 1 : 0
            const cooldownRemaining = you.cooldowns?.[metadata.id] ?? 0
            // Find if there is an active/enabled state from server snapshot
            const enabled = true // fallback to true
            // Every price is server-derived from the kingdom's ability data,
            // with upgrade tiers and perks already applied — the client has no
            // cost data of its own to drift from it. Zeroed until the first
            // sync arrives, at which point real prices replace them.
            const prices = you.abilityPrices?.[metadata.id]
            warnIfUnpriced(
              metadata.id,
              Object.keys(you.abilityPrices ?? {}).length > 0,
              prices != null,
            )
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
              cost: prices?.cast ?? 0,
              upgradeCost: prices?.upgrade ?? null,
              unlockCost: prices?.unlock ?? undefined,
              charges: prices?.charges,
              rechargeTicks,
            }
          })}
          tickRate={tickRate}
          onCastAbility={(abilityId, chargesToUse, choice) => {
            // Air spreads every attack across the whole selected set. Love picks
            // up to two but only BFFS!!! consumes both — every other Love
            // ability uses the FIRST selection and DROPS the rest. Everyone
            // else uses their single server-tracked target.
            let target: string | string[] | null
            if (multiTarget) {
              target = activeSelected // Air: whole set, always
            } else if (localSelect) {
              if (MULTI_SELECT_ABILITIES.has(abilityId)) {
                // BFFS!!! needs exactly two — reject early with a hint rather
                // than a silent server rejection.
                if (activeSelected.length < 2) {
                  flashHint('BFFS!!! needs two kingdoms — select a second.')
                  return
                }
                target = activeSelected.slice(0, 2)
              } else {
                // Single-target Love ability: use the first selection and drop
                // any extra so the leftover BFFS pick doesn't linger.
                target = activeSelected[0] ?? null
                if (activeSelected.length > 1) setSelectedIds(activeSelected.slice(0, 1))
              }
            } else {
              target = you.target
            }
            void castAbility(abilityId, target, chargesToUse, choice)
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
