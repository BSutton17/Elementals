import { useEffect, useRef, useState } from 'react'
import { onGameEvents } from '../game/gameEvents'
import { SpectatorLog } from './SpectatorLog'
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
import { placeKingdoms, VOLCANO_TARGET_ID } from '../game/placement'
import { MONSTER_TARGET_ID } from '../game/placement'
import { getKingdomTheme } from '../game/kingdomThemes'
import { KingdomSite } from './KingdomSite'
// import { TargetIndicator } from './TargetIndicator'
import { BattlefieldFx } from './BattlefieldFx'
import { LightShowLayer } from './lightShow/LightShowLayer'
import { WagerResultLayer } from './wager/WagerResultLayer'
import { HotAshLayer } from './hotAsh/HotAshLayer'
import { VolcanoLayer } from './volcano/VolcanoLayer'
import { MonsterLayer } from './monster/MonsterLayer'
import { CapriceButterfly } from './caprice/CapriceButterfly'
import { BlackHoleAccumulator } from './BlackHoleAccumulator'
import { FloatingNumbers } from './FloatingNumbers'
import { MonsterSpoils } from './monster/MonsterSpoils'
import { EmpathyReaction } from './EmpathyReaction'
import { BffsLinkLayer } from './BffsLinkLayer'
import { DustBunniesLayer } from './DustBunniesLayer'
import { AbilityBar } from './AbilityBar'
import { BlackjackReveal, type BlackjackCinematic } from './cards/BlackjackReveal'
import { LuckyDrawOverlay } from './cards/LuckyDrawOverlay'
import { useScrambleValues } from './scramble/useScrambleValues'
import { getAbilitiesForKingdom } from '../game/abilities'
import { castAbility, buyItem, buyUpgrade, changeTarget } from '../game/matchStore'
import type {
  CapriceSnapshot,
  GamePlayer,
  MonsterSnapshot,
  VolcanoSnapshot,
} from '../game/gameState'
import { partyAct, type PartySnapshot } from '../game/party'
import { BombMarker } from './party/BombMarker'
import { BombBlast } from './party/BombBlast'
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
  volcano = null,
  monster = null,
  party = null,
  caprice = null,
  centrepiece = null,
}: {
  match: LobbyMatch
  youId: string | null
  players: GamePlayer[]
  /** Current server tick — drives time-gated readouts (slot-machine reveals). */
  tick?: number
  /** Watch-only mode: fullscreen arena, no header, no controls, no targeting. */
  spectator?: boolean
  /** Magma's volcano, when one is standing. Shown to everyone. */
  volcano?: VolcanoSnapshot | null
  /** The monster, when one is standing. Shown to everyone. */
  monster?: MonsterSnapshot | null
  /** The running minigame, or null. Only Bomb Attack changes this view. */
  party?: PartySnapshot | null
  /** Insects' butterfly, when one is out. Shown to everyone. */
  caprice?: CapriceSnapshot | null
  /** The NAME of whatever holds the middle of the field, or null when clear.
   *  Server-decided — see `game/centrepiece.ts` for why this is not worked out
   *  on this side. */
  centrepiece?: string | null
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
  // Bomb Attack is played on this board rather than in a panel: while it runs,
  // a castle click hands the bomb over instead of aiming at anybody.
  const bombLive = party !== null && party.gameId === 'bombAttack' && !party.resolved
  const bombHolderId = bombLive ? ((party.shared.holderId as string | undefined) ?? null) : null
  const selectLimit = Math.max(localSelectLimit(you.kingdomId), grantedLimit)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  /**
   * Whether a selected id is still worth holding a slot: a living opponent, or
   * the volcano while it stands.
   *
   * ⚠️ THE VOLCANO COUNTS. It is not on the roster — it is not a kingdom —
   * so a roster-only test silently dropped it from the selection the moment it
   * was picked, which meant Air and a Dark player holding Infinitum Tenebrae
   * could not attack "The End of the World" at all.
   */
  const stillTargetable = (id: string) =>
    id === VOLCANO_TARGET_ID
      ? !!volcano && volcano.hp > 0
      : roster.some((p) => p.id === id && p.id !== youId && !p.eliminated)
  const activeSelected = selectedIds.filter(stillTargetable)
  const isTargeted = (id: string) =>
    localSelect ? activeSelected.includes(id) : you?.target === id
  const toggleTarget = (id: string) => {
    // ⚠️ DURING A BOMB, A CASTLE CLICK PASSES THE BOMB. It does not also aim
    // at that kingdom — the server refuses targeting for the duration, so a
    // click that tried to do both would half-work and read as a bug. Handled at
    // the top of the one function every castle click goes through, so there is
    // no path that misses it.
    if (bombLive) {
      if (bombHolderId === youId && id !== youId && id !== MONSTER_TARGET_ID) {
        void partyAct({ type: 'pass', targetId: id })
      }
      return
    }
    if (localSelect) {
      setSelectedIds((prev) => {
        /* ⚠️ THE CAP COUNTS LIVING TARGETS ONLY, AND THIS IS WHY. The stored
           list kept ids of kingdoms that had since been eliminated. Casting and
           the target rings both filtered them out, so everything LOOKED right
           — but the cap was measured against the raw list, so a dead pick went
           on occupying one of the three slots, and an eliminated castle has no
           click handler, so there was no way to give the slot back. Kill one of
           an Air player's three targets and they were stuck at the limit for
           the rest of the match, with new picks silently ignored.
           Pruning here rather than in an effect keeps it a pure function of the
           click: no extra render, and the stored list repairs itself the next
           time it is touched. */
        const live = prev.filter(stillTargetable)
        if (live.includes(id)) return live.filter((x) => x !== id)
        return live.length >= selectLimit ? live : [...live, id] // cap (Air 3, Love 2)
      })
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
  // Love's BFFS!!! link, read from SYNCED STATE rather than only from the event
  // that created it — so a spectator or a reconnecting player sees a bond that
  // formed before they were watching.
  //
  // ⚠️ ONLY WHEN UNAMBIGUOUS. The synced status carries no source id, so with
  // two links live at once there is no way to tell which castle is tied to
  // which, and guessing would draw a ribbon between the wrong pair — visibly
  // wrong, and worse than drawing nothing. Two bearers is the common case by a
  // wide margin; beyond that the live event path still handles anyone who was
  // watching when it formed.
  const bffsBearers = players
    .filter((p) => p.statuses?.some((s) => s.id === 'bffsLink'))
    .map((p) => p.id)
  const bffsPair = bffsBearers.length === 2 ? bffsBearers : null

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
            suit: draw.suit ?? null,
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
  // "Besieged": living kingdoms currently targeting you BEYOND the first. The
  // bonus starts at two attackers — a fair 1v1 earns nothing — so this mirrors
  // the server's `besiegedStacks` exactly rather than counting targeters.
  const besiegedStacks = Math.max(
    0,
    players.filter((p) => !p.eliminated && p.id !== you.id && p.target === you.id).length - 1,
  )
  // Host rule: once you're out, you can watch the rest of the game properly.
  // Only meaningful while you ARE eliminated, so a living player never gains
  // vision from it.
  const deadSeesAll = (match.eliminatedSeeAllHealth ?? false) && you.eliminated === true
  // Nature's Toxic Gas chemically seals the Repairs & Shields menu shut.
  const shopLocked = you.statuses?.some((s) => s.id === 'toxicGas') ?? false
  // Gastro Acid can poison the citizens, sapping income.
  const citizensPoisoned = you.statuses?.some((s) => s.id === 'poisonedCitizens') ?? false
  // Ice's Frostbite (its retaliation passive) slows income — frost the citizens
  // the same way Nature's poison greens them.
  const citizensFrostbitten = you.statuses?.some((s) => s.id === 'frostbite') ?? false
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
      {/* Spectators have no kingdom header or ability bar, and an eliminated
          player has lost their ability bar too — so for both, nothing on screen
          names who cast what. The log fills that gap; it is collapsed by
          default so it never covers the fight it is describing. */}
      {(spectator || you?.eliminated) && (
        <SpectatorLog
          kingdomOf={(id) => roster.find((p) => p.id === id)?.kingdomId ?? null}
          // An eliminated player still has their kingdom header on screen, so
          // the log drops below it rather than landing on top of it. A true
          // spectator has that corner to itself.
          belowHeader={!spectator}
        />
      )}
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

        {/* Layer: Insects' Caprice — the butterfly holding the middle of the
            field. Over the arena furniture but under the kingdoms, so it never
            hides a castle it is not supposed to be hiding. */}
        <CapriceButterfly active={caprice !== null} />

        {/* Layer: the monster — nobody's, everybody's problem. Same place in
            the stack as the volcano and for the same reasons: over the arena
            furniture so it reads as standing ON the field, under the kingdoms
            so it can never hide a castle, and visible to spectators too. */}
        <MonsterLayer
          monster={monster ?? null}
          tickRate={tickRate}
          targeted={you?.target === MONSTER_TARGET_ID}
          onTarget={
            !spectator && you && !you.eliminated
              ? () => toggleTarget(MONSTER_TARGET_ID)
              : undefined
          }
        />

        {/* Layer: Magma's volcano — the mountain in the middle of the field.
            Under the kingdoms so the castles are never hidden behind it, but
            over the arena furniture. Visible to EVERYONE, including spectators
            and Magma: the whole point is that the table can see the clock. */}
        <VolcanoLayer
          volcano={volcano}
          tickRate={tickRate}
          targeted={you?.target === VOLCANO_TARGET_ID}
          onTarget={
            // Magma cannot attack its own eruption, and spectators cannot
            // attack anything — the server rejects both, so neither gets a
            // click that would only fail.
            !spectator && volcano && you && !you.eliminated && volcano.ownerId !== you.id
              ? () => toggleTarget(VOLCANO_TARGET_ID)
              : undefined
          }
        />

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
                showStats={spectator || isYou || hasAirVision || deadSeesAll}
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

        {/* Layer: Magma's "Hot ash" — who is currently aiming at Magma. Shown
            to Magma alone; the layer gates on the event's owner. */}
        <HotAshLayer positionOf={positionOf} tickRate={tickRate} youId={youId} />

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
        <BffsLinkLayer positionOf={positionOf} linkedPair={bffsPair} />

        {/* Layer: floating combat numbers (#265–#266) — topmost so damage and
            healing values read clearly above the castles. */}
        <FloatingNumbers
          positionOf={positionOf}
          kingdomOf={(id) => roster.find((p) => p.id === id)?.kingdomId ?? null}
          colorOf={colorOf}
          youId={youId}
        />

        {/* Bomb Attack: the bomb over whoever is carrying it, and the blast
            when it finally goes off. */}
        <BombMarker party={party} positionOf={positionOf} />
        <BombBlast party={party} positionOf={positionOf} />

        {/* Who got paid for killing the monster — a trophy for most damage, a
            tick for the finishing blow, over the winning castle(s). */}
        <MonsterSpoils positionOf={positionOf} />

        {/* Dust Bunnies (#… Nature ultimate): hopping bunnies + brawl clouds. */}
        <DustBunniesLayer positionOf={positionOf} />

        {/* Love's "Have some Empathy!" — a grinning-hearts face over Love and
            the attacker each time a hit is reflected back. */}
        <EmpathyReaction positionOf={positionOf} />
      </svg>
      {/* PixiJS effects overlay (Epic 9): visualizes authoritative events;
          pointer-events:none keeps the SVG the interactive targeting surface. */}
      <BattlefieldFx
        // MUST be `roster`, not `match.players`. Placement is derived from the
        // seat list's LENGTH and INDEX, so handing this layer a different list
        // than the castles use puts every effect somewhere the kingdom is not.
        // `match.players` includes spectators; the arena does not seat them, so
        // a single watcher made this an 8-seat circle over a 7-seat board —
        // wrong spacing for everyone, and wrong index for every kingdom after
        // the spectator in the list.
        order={roster.map((p) => ({ id: p.id, kingdomId: p.kingdomId }))}
        tickRate={tickRate}
      />
      <BlackHoleAccumulator />
      {/* Joker's Blackjack: the whole card reveal, replacing the default bolt.
          The damage is held server-side until the impact frame below. */}
      {/* Spectators do not see the draw. The card is the caster's own hand and
          the reveal is theatre for the two kingdoms involved — showing it to
          the stands gives away a card nobody at the table has seen yet.
          Blizzard, Toxic Gas and the casino ARE shown to spectators, because
          those are events on the field rather than a private hand; see the
          spectator branch in BattlefieldScreen. */}
      <BlackjackReveal cast={spectator ? null : blackjack} />
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
          seats={match.config?.playerCount ?? match.players.length}
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
            Math.round(350 * Math.pow(1.25, you.castle.repairs ?? 0))
          }
          // The server's own price wins; these literals only cover the frames
          // before the first sync lands. They mirror SHIELD.COST /
          // SHIELD.COST_GROWTH and have to be retuned alongside them.
          //
          // Both of these had gone stale — repair still said 500 and shield 400
          // after the server moved to 350 and 300 — which is what a hand-copied
          // constant does. Harmless here only because it is overwritten within a
          // frame; check them whenever balance.ts moves.
          shieldCost={
            you.castle.nextShieldCost ??
            Math.round(300 * Math.pow(1.05, you.castle.shieldsPurchased ?? 0))
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
          // Mirrors CASTLE.MAX_REPAIRS; the server enforces the real cap.
          maxRepairs={4}
          lockedOut={shopLocked}
          citizensPoisoned={citizensPoisoned}
          citizensFrostbitten={citizensFrostbitten}
          frozen={frozen}
          // Never-ending Nightmare: every attack but your basic one, and your
          // ultimate, are illegal until it lifts.
          nightmared={you.statuses?.some((s) => s.id === 'neverEndingNightmare') ?? false}
          // The centre of the field is a single slot: while a volcano or a
          // butterfly holds it, the ultimates that would spawn another are
          // barred until it clears.
          fieldOccupiedBy={centrepiece}
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
          // Kitsune only: "Swift Tails" charges whether they act or not, so the
          // meter is always worth watching. null hides it for everyone else.
          memoryMeter={you.kingdomId === 'kitsune' ? you.ancientMemory ?? 0 : null}
          memoryFull={match.config?.memoryFull}
          perks={you.perks}
          besieged={besiegedStacks > 0}
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
