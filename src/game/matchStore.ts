import { socket } from '../sockets/socket'
import type { Ack } from '../sockets/types'

// Socket.IO emitter functions for active gameplay actions. The server validates
// funds, phase, and target rules authoritatively (see ARCHITECTURE.md §5).

export interface AbilityAck {
  accepted: boolean
  cooldownRemaining: number
  tick: number
}

export interface BuyCitizenAck {
  citizens: number
  currency: number
  nextCost: number
}

export interface BuyRepairAck {
  castleHp: number
  currency: number
  nextRepairCost: number
}

export interface BuyShieldAck {
  shield: number
  currency: number
}

export interface TargetAck {
  targetId: string | null
}

export interface UpgradeAck {
  level: number
  cost: number
  currency: number
}

/** Casts an active ability. `target` is a single kingdom id, or an array of
 *  ids for a multi-target attack (Air's "Embrace of Winds" — the server spreads
 *  the damage evenly). `chargesToUse` selects how many charges a charge-costed
 *  ability (Lightning Barrage) spends on this cast. */
export async function castAbility(
  abilityId: string,
  target?: string | string[] | null,
  chargesToUse?: number,
  choice?: string,
): Promise<Ack<AbilityAck>> {
  const targetIds = Array.isArray(target) ? target : undefined
  const targetId = Array.isArray(target) ? undefined : target
  return (await socket.emitWithAck('match:useAbility', {
    abilityId,
    targetId,
    targetIds,
    chargesToUse,
    choice,
  })) as Ack<AbilityAck>
}

/**
 * Pulls the lever on Joker's Slot Machine. The server rolls, applies the
 * verdict, and frees this player's gold production; the reels returned here are
 * the real ones for the client to spin onto. Null when nothing was owed.
 */
export async function spinSlotMachine(): Promise<{
  symbols: string[]
  result: string
} | null> {
  const res = (await socket.emitWithAck('match:spin', {})) as Ack<{
    symbols: string[]
    result: string
  }>
  return res.ok && res.data ? res.data : null
}

/**
 * Calls a colour on Joker's Roulette. The server spins, settles the bet, and
 * frees this player's gold production; the pocket returned here is the real one
 * for the client to land its ball on. Null when no bet was owed.
 */
export async function placeRouletteBet(bet: 'red' | 'black' | 'green'): Promise<{
  pocket: number
  color: string
  bet: string
  won: boolean
  result: string
} | null> {
  const res = (await socket.emitWithAck('match:bet', { bet })) as Ack<{
    pocket: number
    color: string
    bet: string
    won: boolean
    result: string
  }>
  return res.ok && res.data ? res.data : null
}

/** Purchases a shop item: 'citizen', 'repair', or 'shield'. */
export async function buyItem(
  purchaseId: 'citizen' | 'repair' | 'shield' | 'dispel',
): Promise<Ack<BuyCitizenAck | BuyRepairAck | BuyShieldAck>> {
  return (await socket.emitWithAck('match:buy', {
    purchaseId,
  })) as Ack<BuyCitizenAck | BuyRepairAck | BuyShieldAck>
}

/** Sets the current targeting state of the player. */
export async function changeTarget(targetId: string | null): Promise<Ack<TargetAck>> {
  return (await socket.emitWithAck('match:target', {
    targetId,
  })) as Ack<TargetAck>
}

/** Upgrades an ability's tier level. */
export async function buyUpgrade(abilityId: string): Promise<Ack<UpgradeAck>> {
  return (await socket.emitWithAck('match:upgrade', {
    abilityId,
  })) as Ack<UpgradeAck>
}
