import type { IconType } from 'react-icons'
import { LuSwords } from 'react-icons/lu'
import { FiShieldOff } from 'react-icons/fi'
import { FaShieldAlt, FaMoneyBillWave } from 'react-icons/fa'
import { GiHealthCapsule } from 'react-icons/gi'
import { BsLightningChargeFill } from 'react-icons/bs'
import { TbMoneybagMinus } from 'react-icons/tb'
import { PiShieldPlusBold } from 'react-icons/pi'

// Perks: the two match-long bonuses every player picks in the lobby alongside
// their kingdom. Client copy of the server's `data/perks.ts` (separate repos),
// plus the display metadata the lobby needs. The server is authoritative for
// both the selection rules and the effects — this list only has to agree on the
// ids and how many you pick.

/** How many perks each player must pick before they can ready up. */
export const PERKS_PER_PLAYER = 2

/** "Great Merchants" discount, mirroring the server's `PERKS.UNLOCK_DISCOUNT_PCT`. */
const UNLOCK_DISCOUNT_PCT = 0.15

/**
 * The unlock price a player will actually be charged for an ability, so HUD
 * price tags (and their affordability check) match what the server bills. Same
 * rounding as the server's `unlockOrUpgradeAbility`.
 */
export function unlockCostFor(
  baseCost: number,
  perks: readonly string[] | undefined,
): number {
  return perks?.includes('greatMerchants')
    ? Math.ceil(baseCost * (1 - UNLOCK_DISCOUNT_PCT))
    : baseCost
}

export interface Perk {
  id: string
  name: string
  /** The effect, as it reads in the picker. */
  description: string
  icon: IconType
  /** Accent colour, so a perk chip is recognizable at a glance. */
  color: string
}

export const PERKS: readonly Perk[] = [
  {
    id: 'sharperSwords',
    name: 'Sharper Swords',
    description: '+10% attack',
    icon: LuSwords,
    color: '#ff6b4a',
  },
  {
    id: 'sharperAxes',
    name: 'Sharper Axes',
    description: '+15% attack to shields',
    icon: FiShieldOff,
    color: '#ff9d4a',
  },
  {
    id: 'extraGuards',
    name: 'Extra Guards',
    description: '+10% damage reduction',
    icon: FaShieldAlt,
    color: '#4aa3ff',
  },
  {
    id: 'extraMedics',
    name: 'Extra Medics',
    description: '+15% damage reduction to damage-over-time effects',
    icon: GiHealthCapsule,
    color: '#6bd88a',
  },
  {
    id: 'extraRepairs',
    name: 'Extra Repairs',
    description: '-15% cooldown',
    icon: BsLightningChargeFill,
    color: '#a855f7',
  },
  {
    id: 'deepPockets',
    name: 'Deep Pockets',
    description: '+150 starting gold',
    icon: FaMoneyBillWave,
    color: '#ffd24a',
  },
  {
    id: 'greatMerchants',
    name: 'Great Merchants',
    description: '-15% unlock price',
    icon: TbMoneybagMinus,
    color: '#c9a56b',
  },
  {
    id: 'betterConstruction',
    name: 'Better Construction',
    description: '+250 shield health',
    icon: PiShieldPlusBold,
    color: '#8fe3ff',
  },
] as const

export type PerkId = (typeof PERKS)[number]['id']

const BY_ID = new Map(PERKS.map((p) => [p.id, p]))

export function getPerk(id: string): Perk | undefined {
  return BY_ID.get(id)
}

/** Resolves a player's stored perk ids to definitions, skipping unknown ids. */
export function resolvePerks(ids: readonly string[] | undefined): Perk[] {
  if (!ids) return []
  return ids.map((id) => BY_ID.get(id)).filter((p): p is Perk => p !== undefined)
}

/** Whether a selection is complete — the gate on readying up (mirrors server). */
export function hasFullPerkSelection(ids: readonly string[] | undefined): boolean {
  return (ids?.length ?? 0) === PERKS_PER_PLAYER
}

/**
 * The selection after toggling `id`: removes it when already picked, adds it
 * when there's room, and otherwise leaves the selection untouched (the picker
 * disables full-but-unpicked perks, so this is just a guard).
 */
export function togglePerk(
  selected: readonly string[],
  id: string,
): string[] {
  if (selected.includes(id)) return selected.filter((p) => p !== id)
  if (selected.length >= PERKS_PER_PLAYER) return [...selected]
  return [...selected, id]
}
