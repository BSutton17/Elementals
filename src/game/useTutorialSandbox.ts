// The tutorial's pocket universe: a tiny, fully client-side imitation of a
// match that the How to Play walkthrough uses for its hands-on demos. It feeds
// the REAL HUD components (AbilityBar, ShopOverlay, KingdomSite) the same prop
// shapes the battlefield does, but every number here is local make-believe —
// no sockets, no server, and deliberately qualitative demo values (the server
// owns the authoritative balance).

import { useEffect, useMemo, useRef, useState } from 'react'
import { ABILITY_METADATA, getAbilitiesForKingdom, getUpgradeCost } from './abilities'

/** Sandbox ticks per second (drives income, cooldowns, status durations). */
export const SANDBOX_TICK_RATE = 10
const TICK_MS = 1000 / SANDBOX_TICK_RATE

/** 1 gold per citizen per second, paid out fractionally each tick. */
const GOLD_PER_CITIZEN_PER_TICK = 1 / SANDBOX_TICK_RATE

const STARTING_CURRENCY = 500
const STARTING_CITIZENS = 10
const STARTING_CASTLE_HP = 10_000
const CITIZEN_BASE_COST = 100
const CITIZEN_COST_GROWTH = 1.2
const REPAIR_COST = 200
const REPAIR_HEAL = 2_500
const MAX_REPAIRS = 3
const SHIELD_COST = 250
const SHIELD_HP = 1_000

/** Dummy castle rebuild time after it falls (it has infinite patience). */
const DUMMY_RESPAWN_TICKS = 25

/** Under-attack demo: an off-screen rival lobs a fireball this often. */
const INCOMING_EVERY_TICKS = 45
const INCOMING_DAMAGE = 450
/** The demo never lets your castle actually die — that lesson can wait. */
const CASTLE_HP_FLOOR = 500

/**
 * Demo-only combat numbers for the tutorial kingdom's abilities. Damage and
 * cooldowns are flavour, not balance; statuses reuse real status ids so the
 * real battlefield visuals (e.g. Water's "Current" submersion) light up.
 */
const DEMO_ABILITIES: Record<
  string,
  { damage: number; cooldownTicks: number; status?: { id: string; ticks: number } }
> = {
  waterBall: { damage: 300, cooldownTicks: 15 },
  waterfall: { damage: 550, cooldownTicks: 40, status: { id: 'current', ticks: 100 } },
  flood: { damage: 800, cooldownTicks: 60 },
  fluidAssimilation: { damage: 0, cooldownTicks: 80 },
  riptide: { damage: 0, cooldownTicks: 150 },
}

/** Fallback for abilities without a bespoke demo entry (non-water kingdoms). */
function demoStatsFor(abilityId: string) {
  const known = DEMO_ABILITIES[abilityId]
  if (known) return known
  const meta = ABILITY_METADATA[abilityId]
  const damage = meta && meta.kind === 'attack' ? Math.round(meta.baseCost * 2.5) : 0
  return { damage, cooldownTicks: 40, status: undefined }
}

export interface SandboxStatus {
  id: string
  remainingTicks: number
  stacks: number
}

export interface SandboxDummy {
  hp: number
  maxHp: number
  shield: number
  statuses: SandboxStatus[]
  eliminated: boolean
  selected: boolean
}

/** One outgoing hit, for floating damage numbers (seq bumps every hit). */
export interface SandboxHit {
  seq: number
  amount: number
  abilityId: string
}

/** One incoming hit against YOUR castle (under-attack demo). */
export interface SandboxIncomingHit {
  seq: number
  amount: number
  /** How much of it the shield ate. */
  absorbed: number
}

interface SandboxState {
  currency: number
  citizens: number
  citizensPurchased: number
  castleHp: number
  shieldHp: number
  repairsUsed: number
  cooldowns: Record<string, number>
  levels: Record<string, number>
  dummy: SandboxDummy
  respawnTicks: number
  lastHit: SandboxHit | null
  incomingHit: SandboxIncomingHit | null
  ticksUntilIncoming: number
}

export interface TutorialSandboxOptions {
  /** Kingdom whose kit the demos use. The tutorial teaches with Water. */
  kingdomId?: string
  /** Start with the dummy already locked on (skips the targeting lesson). */
  preselectTarget?: boolean
  /** An unseen rival periodically attacks your castle (defense lesson). */
  underAttack?: boolean
}

function initialState(opts: TutorialSandboxOptions): SandboxState {
  return {
    currency: STARTING_CURRENCY,
    citizens: STARTING_CITIZENS,
    citizensPurchased: 0,
    castleHp: STARTING_CASTLE_HP,
    shieldHp: 0,
    repairsUsed: 0,
    cooldowns: {},
    levels: {},
    dummy: {
      hp: STARTING_CASTLE_HP,
      maxHp: STARTING_CASTLE_HP,
      shield: 0,
      statuses: [],
      eliminated: false,
      selected: opts.preselectTarget ?? false,
    },
    respawnTicks: 0,
    lastHit: null,
    incomingHit: null,
    ticksUntilIncoming: INCOMING_EVERY_TICKS,
  }
}

/** Advance the pocket universe by one tick. Pure — trivially testable. */
export function tickSandbox(s: SandboxState, underAttack: boolean): SandboxState {
  const cooldowns: Record<string, number> = {}
  for (const [id, cd] of Object.entries(s.cooldowns)) {
    if (cd > 1) cooldowns[id] = cd - 1
  }

  const statuses = s.dummy.statuses
    .map((st) => ({ ...st, remainingTicks: st.remainingTicks - 1 }))
    .filter((st) => st.remainingTicks > 0)

  let dummy: SandboxDummy = { ...s.dummy, statuses }
  let respawnTicks = s.respawnTicks
  if (respawnTicks > 0) {
    respawnTicks -= 1
    if (respawnTicks === 0) {
      // The training dummy rebuilds itself, statuses and grudges forgotten.
      dummy = { ...dummy, hp: dummy.maxHp, eliminated: false, statuses: [] }
    }
  }

  let { shieldHp, castleHp, ticksUntilIncoming } = s
  let incomingHit = s.incomingHit
  if (underAttack) {
    ticksUntilIncoming -= 1
    if (ticksUntilIncoming <= 0) {
      ticksUntilIncoming = INCOMING_EVERY_TICKS
      const absorbed = Math.min(shieldHp, INCOMING_DAMAGE)
      shieldHp -= absorbed
      castleHp = Math.max(CASTLE_HP_FLOOR, castleHp - (INCOMING_DAMAGE - absorbed))
      incomingHit = {
        seq: (s.incomingHit?.seq ?? 0) + 1,
        amount: INCOMING_DAMAGE,
        absorbed,
      }
    }
  }

  return {
    ...s,
    currency: s.currency + s.citizens * GOLD_PER_CITIZEN_PER_TICK,
    cooldowns,
    dummy,
    respawnTicks,
    shieldHp,
    castleHp,
    ticksUntilIncoming,
    incomingHit,
  }
}

/**
 * The walkthrough's local mock match. Each demo page mounts its own instance,
 * so every lesson starts from a clean, predictable slate.
 */
export function useTutorialSandbox(options: TutorialSandboxOptions = {}) {
  const { kingdomId = 'water', preselectTarget = false, underAttack = false } = options
  const optsRef = useRef({ kingdomId, preselectTarget, underAttack })
  const [state, setState] = useState<SandboxState>(() => initialState(optsRef.current))

  // The heartbeat: income, cooldowns, status durations, incoming attacks.
  useEffect(() => {
    const timer = setInterval(
      () => setState((s) => tickSandbox(s, optsRef.current.underAttack)),
      TICK_MS,
    )
    return () => clearInterval(timer)
  }, [])

  const actions = useMemo(
    () => ({
      /** Lock onto (or release) the practice dummy. */
      selectTarget(selected = true) {
        setState((s) => ({ ...s, dummy: { ...s.dummy, selected } }))
      },

      /** Cast an ability at the dummy: pay gold, start cooldown, land the hit. */
      castAbility(abilityId: string) {
        setState((s) => {
          const meta = ABILITY_METADATA[abilityId]
          if (!meta) return s
          const cost = meta.baseCost
          const onCooldown = (s.cooldowns[abilityId] ?? 0) > 0
          if (s.currency < cost || onCooldown) return s

          const { damage, cooldownTicks, status } = demoStatsFor(abilityId)
          const level = s.levels[abilityId] ?? 1
          const next: SandboxState = {
            ...s,
            currency: s.currency - cost,
            cooldowns: { ...s.cooldowns, [abilityId]: cooldownTicks },
          }

          // Riptide (Water's ultimate): the tide turns — heal + new citizens.
          if (meta.kind === 'ultimate' && abilityId === 'riptide') {
            next.castleHp = Math.min(
              STARTING_CASTLE_HP,
              next.castleHp + Math.round(STARTING_CASTLE_HP / 2),
            )
            next.citizens = s.citizens + 5
            return next
          }

          if (damage <= 0 || s.dummy.eliminated) return next

          // Upgrades add a satisfying (demo-only) +25% damage per level.
          const dealt = Math.round(damage * (1 + 0.25 * (level - 1)))
          const shieldAbsorb = Math.min(s.dummy.shield, dealt)
          const hp = Math.max(0, s.dummy.hp - (dealt - shieldAbsorb))

          const statuses = status
            ? [
                ...s.dummy.statuses.filter((st) => st.id !== status.id),
                { id: status.id, remainingTicks: status.ticks, stacks: 1 },
              ]
            : s.dummy.statuses

          const fell = hp === 0
          next.dummy = {
            ...s.dummy,
            hp,
            shield: s.dummy.shield - shieldAbsorb,
            statuses: fell ? [] : statuses,
            eliminated: fell || s.dummy.eliminated,
          }
          next.respawnTicks = fell ? DUMMY_RESPAWN_TICKS : s.respawnTicks
          next.lastHit = { seq: (s.lastHit?.seq ?? 0) + 1, amount: dealt, abilityId }
          return next
        })
      },

      /** Spend gold on a demo upgrade (+1 level, more damage). */
      upgradeAbility(abilityId: string) {
        setState((s) => {
          const level = s.levels[abilityId] ?? 1
          const cost = getUpgradeCost(abilityId, level)
          if (cost == null || s.currency < cost) return s
          return {
            ...s,
            currency: s.currency - cost,
            levels: { ...s.levels, [abilityId]: level + 1 },
          }
        })
      },

      /** The Repairs & Shields shop, sandbox edition. */
      buyItem(id: 'citizen' | 'repair' | 'shield') {
        setState((s) => {
          if (id === 'citizen') {
            const cost = nextCitizenCostFor(s.citizensPurchased)
            if (s.currency < cost) return s
            return {
              ...s,
              currency: s.currency - cost,
              citizens: s.citizens + 1,
              citizensPurchased: s.citizensPurchased + 1,
            }
          }
          if (id === 'repair') {
            if (
              s.currency < REPAIR_COST ||
              s.repairsUsed >= MAX_REPAIRS ||
              s.castleHp >= STARTING_CASTLE_HP
            ) {
              return s
            }
            return {
              ...s,
              currency: s.currency - REPAIR_COST,
              castleHp: Math.min(STARTING_CASTLE_HP, s.castleHp + REPAIR_HEAL),
              repairsUsed: s.repairsUsed + 1,
            }
          }
          // shield
          if (s.currency < SHIELD_COST || s.shieldHp > 0) return s
          return { ...s, currency: s.currency - SHIELD_COST, shieldHp: SHIELD_HP }
        })
      },
    }),
    [],
  )

  // Ability cards for the REAL AbilityBar, shaped like matchStore's payload.
  // Everything starts unlocked (level 1) so the lesson has zero friction.
  const abilityStates = useMemo(
    () =>
      getAbilitiesForKingdom(kingdomId)
        .filter((m) => m.kind !== 'passive')
        .map((m) => {
          const level = state.levels[m.id] ?? 1
          return {
            id: m.id,
            level,
            cooldownRemaining: state.cooldowns[m.id] ?? 0,
            enabled: true,
            cost: m.baseCost,
            upgradeCost: getUpgradeCost(m.id, level),
            unlockCost: undefined as number | undefined,
            rechargeTicks: undefined as number[] | undefined,
          }
        }),
    [kingdomId, state.levels, state.cooldowns],
  )

  return {
    tickRate: SANDBOX_TICK_RATE,
    kingdomId,
    currency: state.currency,
    citizens: state.citizens,
    incomePerSecond: state.citizens * GOLD_PER_CITIZEN_PER_TICK * SANDBOX_TICK_RATE,
    nextCitizenCost: nextCitizenCostFor(state.citizensPurchased),
    nextRepairCost: REPAIR_COST,
    shieldCost: SHIELD_COST,
    repairsUsed: state.repairsUsed,
    maxRepairs: MAX_REPAIRS,
    castleHp: Math.round(state.castleHp),
    maxCastleHp: STARTING_CASTLE_HP,
    shieldHp: state.shieldHp,
    abilityStates,
    dummy: state.dummy,
    lastHit: state.lastHit,
    incomingHit: state.incomingHit,
    ...actions,
  }
}

function nextCitizenCostFor(purchased: number): number {
  return Math.round(CITIZEN_BASE_COST * Math.pow(CITIZEN_COST_GROWTH, purchased))
}

export type TutorialSandbox = ReturnType<typeof useTutorialSandbox>
