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

/** Casts an active ability. `chargesToUse` selects how many charges a
 *  charge-costed ability (Lightning Barrage) spends on this cast. */
export async function castAbility(
  abilityId: string,
  targetId?: string | null,
  chargesToUse?: number,
): Promise<Ack<AbilityAck>> {
  return (await socket.emitWithAck('match:useAbility', {
    abilityId,
    targetId,
    chargesToUse,
  })) as Ack<AbilityAck>
}

/** Purchases a shop item: 'citizen', 'repair', or 'shield'. */
export async function buyItem(
  purchaseId: 'citizen' | 'repair' | 'shield',
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
