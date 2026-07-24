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
}

export interface GameEconomy {
  citizens: number
  currency: number
  incomePerTick: number
  nextCitizenCost?: number
  citizensPurchased?: number
}

export interface GamePlayer {
  id: string
  name: string
  kingdomId: string | null
  castle: GameCastle
  economy: GameEconomy
  /** The player this kingdom is currently targeting, or null. */
  target: string | null
  eliminated: boolean
  cooldowns?: Record<string, number>
  upgrades?: Record<string, number>
  /** Abilities the player has bought; bought = usable at base strength. */
  unlocked?: Record<string, boolean>
  statuses?: Array<{ id: string; remainingTicks: number; stacks: number }>
  /**
   * Effective cast cost per unlocked ability id, upgrade discounts applied —
   * server-derived so HUD price tags match what a cast will actually charge.
   */
  abilityCosts?: Record<string, number>
  /** Active stat modifiers (buffs/debuffs). */
  modifiers?: Array<{ id: string; stat: string; remainingTicks: number | null }>
  /**
   * Charge regeneration per charge-based ability (Lightning Barrage): one
   * countdown (ticks) per spent charge. Available = ability max − list length.
   */
  recharges?: Record<string, number[]>
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
