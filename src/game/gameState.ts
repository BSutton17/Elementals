import { socket } from '../sockets/socket'
import type { MonsterKind } from '../components/monster/monsters'

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

/**
 * Mirrors the server's `data/cosmetics.Paint` and the client's CastleSprite.
 *
 * ⚠️ IT MUST LIST `decor`. The earlier version stopped at fill/outline/accent/
 * strokeScale, which typechecks fine when passed to CastleSprite (every field
 * is optional) while silently describing a skin as nothing but a colour — the
 * decoration id IS the skin.
 */
export interface CastlePaint {
  fill?: string
  outline?: string
  accent?: string
  strokeScale?: number
  gradient?: { from: string; to: string }
  decor?: string
  varies?: boolean
  variantSeed?: number
  scale?: number
}

export interface GamePlayer {
  /** Account level, or undefined for guests and bots. */
  level?: number
  /**
   * Resolved castle paint from an equipped skin, or undefined for standard.
   *
   * ⚠️ THIS DOES NOT COME FROM `state:sync`. That payload is built from the
   * engine's PlayerState, which has no cosmetics on it; the paint is stamped
   * on the lobby seats instead and merged back in by `applyStateSync`. The
   * field is on GamePlayer because that is what the battlefield renders from.
   */
  castlePaint?: CastlePaint
  id: string
  name: string
  kingdomId: string | null
  /** Lobby-chosen perk ids (see game/perks.ts); fixed for the whole match. */
  perks?: string[]
  /** Kitsune's "Ancient Memory" ("Swift Tails") — charges on its own and from
   *  damage dealt. Present for everyone; only Kitsune's HUD shows it. */
  ancientMemory?: number
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
    /** Insects' "Creepy Crawlers": clicks landed on each bug so far. One entry
     *  per bug; a bug is gone once it reaches `hitsToKill`. */
    bugHits?: number[]
    /** Clicks needed to squash one bug. */
    hitsToKill?: number
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

/**
 * Magma's "The End of the World", as everyone sees it. Synced to the whole
 * table rather than to Magma alone: breaking it in time is a job none of them
 * can do by themselves, so all of them need to see it, click it, and watch its
 * health fall.
 */
export interface VolcanoSnapshot {
  /** The Magma that called it down — the one kingdom the eruption spares. */
  ownerId: string
  hp: number
  maxHp: number
  /** Ticks left before it erupts. */
  ticksRemaining: number
}

/**
 * The monster standing in the middle of the field.
 *
 * It belongs to nobody and it has no clock: `ticksUntilAttack` counts down to
 * its NEXT swing, not to its departure, and it starts again every time one
 * lands. The only way it leaves is dead.
 */
export interface MonsterSnapshot {
  hp: number
  maxHp: number
  /** What its next successful swing costs every kingdom — it climbs. */
  attackDamage: number
  /** Ticks until that swing. Reset on every cycle, never runs out. */
  ticksUntilAttack: number
  /**
   * Which creature it is.
   *
   * ⚠️ OPTIONAL, AND THE SERVER OWNS IT. Every client has to see the same
   * monster, so the choice cannot be made on this side: two players looking at
   * different creatures in the same match is worse than everyone seeing the
   * same placeholder. Absent, the layer falls back to one look and still draws
   * the health bar and the hit area, so a client one release behind stays
   * playable.
   */
  kind?: MonsterKind
}

/**
 * Insects' "Caprice", as everyone sees it. Synced to the whole table: the
 * butterfly is everybody's problem, and the client needs to know when to stop
 * offering a targeting UI the server is about to overrule anyway.
 */
export interface CapriceSnapshot {
  /** The Insects kingdom holding the field — exempt, and untargetable. */
  ownerId: string
  ticksRemaining: number
}

export interface GameState {
  tick: number
  serverTime: number | null
  players: GamePlayer[]
  /** The volcano standing in the middle of the field, or null when there
   *  isn't one. */
  volcano: VolcanoSnapshot | null
  /** The monster in the middle of the field, or null when there is none. */
  monster: MonsterSnapshot | null
  /** The butterfly holding the field, or null when there is none. */
  caprice: CapriceSnapshot | null
  /** The NAME of whatever holds the middle of the battlefield, or null when it
   *  is clear. Server-decided: only one thing may ever stand there, and two of
   *  the four candidates (the black hole, the Light Show) never appear in this
   *  payload, so this side must not try to work it out for itself. */
  centrepiece: string | null
}

let state: GameState = {
  tick: 0,
  serverTime: null,
  players: [],
  volcano: null,
  monster: null,
  caprice: null,
  centrepiece: null,
}

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
/**
 * Castle paint by player id, resolved by the server once per match.
 *
 * ⚠️ KEPT BESIDE THE LIVE STATE, NOT INSIDE IT. `state:sync` replaces the whole
 * player list twenty times a second and carries no cosmetics, so anything
 * merged into a player object is gone on the next tick — which is exactly why
 * every castle rendered standard. Held here and re-attached on each sync.
 */
let castlePaints: Record<string, CastlePaint> = {}

/** Records the paint from an authoritative roster (match:started, state:full). */
export function setCastlePaints(
  players: { id: string; castlePaint?: CastlePaint }[] | undefined,
): void {
  if (!players?.length) return
  const next = { ...castlePaints }
  for (const p of players) {
    // An absent paint means "standard", and must not wipe a known one: the
    // lobby roster and the snapshot do not always arrive in the same order.
    if (p.castlePaint) next[p.id] = p.castlePaint
  }
  castlePaints = next
  state = { ...state, players: withPaint(state.players) }
  listeners.forEach((l) => l())
}

/** Forgets every skin. Called when gameplay state is cleared. */
export function clearCastlePaints(): void {
  castlePaints = {}
}

function withPaint(players: GamePlayer[]): GamePlayer[] {
  return players.map((p) =>
    castlePaints[p.id] ? { ...p, castlePaint: castlePaints[p.id] } : p,
  )
}

export function applyStateSync(payload: {
  tick: number
  serverTime: number
  players: GamePlayer[]
  volcano?: VolcanoSnapshot | null
  monster?: MonsterSnapshot | null
  caprice?: CapriceSnapshot | null
  centrepiece?: string | null
}): void {
  state = {
    tick: payload.tick,
    serverTime: payload.serverTime,
    players: withPaint(payload.players),
    volcano: payload.volcano ?? null,
    monster: payload.monster ?? null,
    caprice: payload.caprice ?? null,
    centrepiece: payload.centrepiece ?? null,
  }
  listeners.forEach((l) => l())
}

/** Clears gameplay state (e.g. after leaving a match). */
export function clearGameState(): void {
  clearCastlePaints()
  state = {
    tick: 0,
    serverTime: null,
    players: [],
    volcano: null,
  monster: null,
    caprice: null,
    centrepiece: null,
  }
  listeners.forEach((l) => l())
}

socket.on('state:sync', applyStateSync)
