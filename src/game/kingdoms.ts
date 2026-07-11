// The seven elemental kingdoms (client copy of the server list) with display
// metadata for the lobby's kingdom selector.

export const KINGDOMS = [
  { id: 'water', label: 'Water', color: '#4aa3ff' },
  { id: 'fire', label: 'Fire', color: '#ff6b4a' },
  { id: 'air', label: 'Air', color: '#b7c9ff' },
  { id: 'earth', label: 'Earth', color: '#c9a56b' },
  { id: 'electricity', label: 'Electricity', color: '#ffd24a' },
  { id: 'ice', label: 'Ice', color: '#8fe3ff' },
  { id: 'nature', label: 'Nature', color: '#6bd88a' },
] as const

export type KingdomId = (typeof KINGDOMS)[number]['id']
