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
] as const

export type KingdomId = (typeof KINGDOMS)[number]['id']

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
