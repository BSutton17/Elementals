import { socket } from '../sockets/socket'

// Client mirror of the server's `state:sync` broadcast (gameSync.ts): each
// player's live castle, economy, and targeting state. This is the data source
// for the battlefield renderers (tickets #192–#199); the server re-broadcasts
// on a fixed interval and immediately after any state-changing action, so
// health, shields, citizens, income, and targets update automatically.

export interface GameCastle {
  hp: number
  maxHp: number
  shield: number
  nextRepairCost?: number
  repairs?: number
  /** Server-derived cost of the next shield (scales per purchase). */
  nextShieldCost?: number
  /** Number of shields purchased this match (drives the fallback shield cost). */
  shieldsPurchased?: number
  /** Ticks left on the buy-shield break cooldown (0 = ready). */
  shieldCooldownRemaining?: number
}

export interface GameEconomy {
  citizens: number
  currency: number
  incomePerTick: number
  nextCitizenCost?: number
  citizensPurchased?: number
}

/** Server-resolved prices for one ability (mirrors gameSync.ts `AbilityPrices`). */
export interface AbilityPrices {
  /** Effective cast cost at the player's current upgrade tier. */
  cast: number
  /** Price to buy this ability, or null once it is unlocked. */
  unlock: number | null
  /** Price of the next upgrade tier, or null while locked or fully upgraded. */
  upgrade: number | null
  /** Charge-based abilities: the charge economy at this tier. */
  charges?: {
    max: number
    costPerCharge: number
    damageByCharges: number[]
    rechargeTicks: number
  }
}

export interface GamePlayer {
  id: string
  name: string
  kingdomId: string | null
  /** Lobby-chosen perk ids (see game/perks.ts); fixed for the whole match. */
  perks?: string[]
  castle: GameCastle
  economy: GameEconomy
  /** The player this kingdom is currently targeting, or null. */
  target: string | null
  eliminated: boolean
  cooldowns?: Record<string, number>
  upgrades?: Record<string, number>
  /** Abilities the player has bought; bought = usable at base strength. */
  unlocked?: Record<string, boolean>
  statuses?: Array<{
    id: string
    /** Who applied it — lets the UI tell "my swarm" from "someone else's". */
    sourceId?: string
    remainingTicks: number
    stacks: number
    /** Two-phase status has revealed (Love's "Love Galore"): drives its aura. */
    revealed?: boolean
  }>
  /**
   * A status this player can buy their way out of and its current price
   * (Light's Fireflies), or null when they hold none. Server-derived — the
   * price is snapshotted when the status lands and can be inflated afterwards.
   */
  dispel?: { statusId: string; cost: number } | null
  /**
   * Every price the HUD shows, per ability id of this player's kingdom, with
   * upgrade tiers and perks applied. The SINGLE source of ability pricing —
   * the client holds none of its own, so a tag can never drift from what a
   * click actually charges. Authored in the server's `<kingdom>Abilities.ts`
   * and resolved by `abilityPrices` in gameSync.ts.
   */
  abilityPrices?: Record<string, AbilityPrices>
  /** Active stat modifiers (buffs/debuffs). */
  modifiers?: Array<{ id: string; stat: string; remainingTicks: number | null }>
  /**
   * Charge regeneration per charge-based ability (Lightning Barrage): one
   * countdown (ticks) per spent charge. Available = ability max − list length.
   */
  recharges?: Record<string, number[]>
  /**
   * Space's Supernova charge meter (xp). Shooting Star, Saturn's Rings, and
   * Orion's Belt misses fill it; Supernova fires at the level it maps to
   * (thresholds 50/150/250). 0/absent for non-Space kingdoms.
   */
  supernovaMeter?: number
  /**
   * Dark's Unlimited Rage charge, in damage absorbed. Fills from every hit
   * taken; the ultimate is uncastable below `RAGE_FULL` and empties it on use.
   * Present for every kingdom, meaningful only for Dark.
   */
  rageMeter?: number
  /**
   * Joker's Slot Machine: this player owes a spin and their gold production is
   * frozen until they pull the lever. Absent/null when nothing is owed.
   */
  pendingSpin?: { sourceId: string; abilityId: string; atTick: number } | null
  /**
   * Their most recent spin. `revealTick` is when the reels stop and the result
   * becomes public — Joker's overhead readout holds at "Spinning…" until then,
   * so it lands at the same moment the victim's own reels do.
   */
  lastSpin?: { symbols: string[]; outcome: string; revealTick: number } | null
  /**
   * Joker's Roulette: this player owes a bet and their gold production is
   * frozen until they call a colour. `atTick` orders it against `pendingSpin`,
   * so whichever landed first is the one shown and the other waits.
   */
  pendingBet?: { sourceId: string; abilityId: string; atTick: number } | null
  /** Their most recent wheel, held back until `revealTick` like `lastSpin`. */
  lastBet?: {
    pocket: number
    color: string
    bet: string
    /** The verdict as told to the bettor ("you missed, 750 damage"). */
    outcome: string
    /** The same verdict told ABOUT them — what Joker's mirror shows. */
    publicOutcome?: string
    revealTick: number
  } | null
}

export interface GameState {
  tick: number
  serverTime: number | null
  players: GamePlayer[]
}

let state: GameState = { tick: 0, serverTime: null, players: [] }

const listeners = new Set<() => void>()

export function getGameState(): GameState {
  return state
}

export function subscribeGame(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Applies an authoritative `state:sync` payload. Exported so tests can drive
 * the store without a live socket.
 */
export function applyStateSync(payload: {
  tick: number
  serverTime: number
  players: GamePlayer[]
}): void {
  state = {
    tick: payload.tick,
    serverTime: payload.serverTime,
    players: payload.players,
  }
  listeners.forEach((l) => l())
}

/** Clears gameplay state (e.g. after leaving a match). */
export function clearGameState(): void {
  state = { tick: 0, serverTime: null, players: [] }
  listeners.forEach((l) => l())
}

socket.on('state:sync', applyStateSync)
