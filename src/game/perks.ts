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

// NOTE: no perk MAGNITUDES live here, with ONE exception below. The
// descriptions are display copy; every number a perk actually changes is
// applied server-side (see the server's `engine/perks.ts`), and prices reach
// the HUD already discounted via `GamePlayer.abilityPrices`.

export interface Perk {
  id: string
  name: string
  /** The effect, as it reads in the picker. */
  description: string
  icon: IconType
  /** Accent colour, so a perk chip is recognizable at a glance. */
  color: string
}

/**
 * Better Construction's shield bonus, and the rate it grows with the table.
 *
 * ⚠️ THE ONE MAGNITUDE THIS FILE KNOWS, and it is here because the number
 * CHANGES WITH THE LOBBY. The server scales the bonus by table size (see
 * PLAYER_SCALING.SHIELD_BONUS_PER_EXTRA_PLAYER in its `data/balance.ts`), so a
 * fixed "+500 shield health" was wrong in every game but a duel — it reads +625
 * at a full table of seven. The perks are chosen in the LOBBY, before any match
 * config exists to carry the real figure, so the picker has to work it out.
 *
 * Keep these two in step with the server's balance file; the shape of the sum
 * is fixed, and a drift here shows up as a wrong number rather than a wrong
 * effect.
 */
const SHIELD_BONUS_HP = 500
const SHIELD_BONUS_PER_EXTRA_PLAYER = 0.05

/** Better Construction's actual bonus at a table of `seats`. */
export function shieldBonusFor(seats: number): number {
  const extra = Math.max(0, (Number.isFinite(seats) ? seats : 2) - 2)
  return Math.round(SHIELD_BONUS_HP * (1 + SHIELD_BONUS_PER_EXTRA_PLAYER * extra))
}

/**
 * A perk's description as it reads for THIS lobby. Only Better Construction
 * varies; everything else is a percentage, which the table size does not move.
 */
export function perkDescription(perk: Perk, seats?: number): string {
  if (perk.id !== 'betterConstruction' || seats === undefined) return perk.description
  return `+${shieldBonusFor(seats).toLocaleString()} shield health`
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
    description: '-10% cooldown',
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
    // The base figure, for anywhere the table size is not known. The picker
    // and the HUD both pass one and show the real number.
    description: '+500 shield health',
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

/**
 * How many perks THIS kingdom picks. Kitsune's "Three tailed fox" takes one
 * more than everyone else, so the allowance is a function of the kingdom rather
 * than a constant. Mirrors the server's `perksAllowedFor` — the server is the
 * authority and will reject an over-full selection regardless.
 */
export function perksAllowedFor(kingdomId: string | null | undefined): number {
  return kingdomId === 'kitsune' ? PERKS_PER_PLAYER + 1 : PERKS_PER_PLAYER
}

/** Whether a selection is complete — the gate on readying up (mirrors server). */
export function hasFullPerkSelection(
  ids: readonly string[] | undefined,
  kingdomId?: string | null,
): boolean {
  return (ids?.length ?? 0) === perksAllowedFor(kingdomId)
}

/**
 * The selection after toggling `id`: removes it when already picked, adds it
 * when there's room, and otherwise leaves the selection untouched (the picker
 * disables full-but-unpicked perks, so this is just a guard).
 */
export function togglePerk(
  selected: readonly string[],
  id: string,
  kingdomId?: string | null,
): string[] {
  if (selected.includes(id)) return selected.filter((p) => p !== id)
  if (selected.length >= perksAllowedFor(kingdomId)) return [...selected]
  return [...selected, id]
}
