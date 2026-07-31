// The seven elemental kingdoms (client copy of the server list) with display
// metadata for the lobby's kingdom selector.

export const KINGDOMS = [
  { id: 'water', label: 'Water', color: '#4aa3ff' },
  { id: 'fire', label: 'Fire', color: '#ff6b4a' },
  { id: 'air', label: 'Air', color: '#b7c9ff' },
  { id: 'earth', label: 'Earth', color: '#c9a56b' },
  { id: 'electricity', label: 'Electricity', color: '#a855f7' },
  { id: 'ice', label: 'Ice', color: '#8fe3ff' },
  { id: 'nature', label: 'Nature', color: '#6bd88a' },
  { id: 'time', label: 'Time', color: '#a9834e' }, // grandfather-clock brass
  { id: 'space', label: 'Space', color: '#5b21b6' }, // deep void-violet
  { id: 'love', label: 'Love', color: '#ff4d8d' }, // rose pink
  { id: 'joker', label: 'Joker', color: '#e02434' }, // circus red
  { id: 'light', label: 'Light', color: '#f7f7f2' }, // pure white
  { id: 'dark', label: 'Dark', color: '#12121a' }, // near-black
] as const

export type KingdomId = (typeof KINGDOMS)[number]['id']

/**
 * Kingdoms whose kits are still placeholders — hidden from the lobby's kingdom
 * picker and the tutorial's kingdom browser so players can't select an
 * unfinished kingdom in production. Everything behind them is fully wired, so
 * putting one back in the game is just commenting out its line here.
 */
const UNRELEASED_KINGDOM_IDS: readonly string[] = [
  'joker',
  'light',
  'dark',
]

/** The kingdoms a player may actually pick right now. */
export const SELECTABLE_KINGDOMS = KINGDOMS.filter(
  (k) => !UNRELEASED_KINGDOM_IDS.includes(k.id),
)

/**
 * Kingdoms whose attacks may strike several kingdoms at once (Air's "Embrace of
 * Winds", Epic 8). Mirrors the server's `multiTargetAttacks` passive so the
 * battlefield offers multi-select targeting to exactly these kingdoms.
 */
export const MULTI_TARGET_KINGDOMS: ReadonlySet<string> = new Set(['air'])

export function canMultiTarget(kingdomId: string | null): boolean {
  return kingdomId != null && MULTI_TARGET_KINGDOMS.has(kingdomId)
}

/**
 * Max enemies a multi-target attack may hit at once — mirrors the server's
 * `multiTargetAttacks.maxTargets` (Air's "Embrace of Winds": 3 base, 5 upgraded;
 * the server enforces the authoritative cap). 1 for kingdoms without the passive.
 */
export function multiTargetLimit(kingdomId: string | null): number {
  return canMultiTarget(kingdomId) ? 3 : 1
}

/**
 * Kingdoms whose targeting is a LOCAL click-to-toggle selection (client-only,
 * cap = the value here) rather than a single server-tracked target:
 *  - Air (3): its passive spreads EVERY attack across the whole selected set.
 *  - Love (2): only BFFS!!! consumes both; every other Love ability uses the
 *    FIRST selection and drops the rest (see `MULTI_SELECT_ABILITIES`).
 */
export const LOCAL_SELECT_LIMITS: Readonly<Record<string, number>> = { air: 3, love: 2 }

export function usesLocalTargeting(kingdomId: string | null): boolean {
  return kingdomId != null && kingdomId in LOCAL_SELECT_LIMITS
}

export function localSelectLimit(kingdomId: string | null): number {
  return (kingdomId != null && LOCAL_SELECT_LIMITS[kingdomId]) || 1
}

/**
 * Abilities that consume MORE than one selected target on cast. Air spreads all
 * its attacks (handled by kingdom, not here); this set is for one-off
 * multi-target abilities on otherwise single-target kingdoms — currently just
 * Love's BFFS!!! (needs exactly two). Mirrors the server's
 * `targeting.secondTarget`.
 */
export const MULTI_SELECT_ABILITIES: ReadonlySet<string> = new Set(['bffs'])
