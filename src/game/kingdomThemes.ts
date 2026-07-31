export interface KingdomTheme {
  id: string
  name: string
  primary: string // Main color for UI
  secondary: string // Accent/secondary color
  dark: string // Darkened variant
  /**
   * Outline for this kingdom's castle sprite. Omitted for every kingdom whose
   * colour reads fine against the battlefield's near-black default outline;
   * set it when the castle itself is dark (Dark uses white).
   */
  outline?: string
}

/** The castle outline used unless a kingdom's theme overrides it. */
export const DEFAULT_CASTLE_OUTLINE = '#0b0e17'

/** The outline colour for a kingdom's castle sprite. */
export function getCastleOutline(kingdomId: string | null): string {
  return getKingdomTheme(kingdomId)?.outline ?? DEFAULT_CASTLE_OUTLINE
}

export const KINGDOM_THEMES: Record<string, KingdomTheme> = {
  water: {
    id: 'water',
    name: 'Water',
    primary: '#4aa3ff',
    secondary: '#2193b0',
    dark: '#1e3c72',
  },
  fire: {
    id: 'fire',
    name: 'Fire',
    primary: '#ff6b4a',
    secondary: '#f5af19',
    dark: '#870000',
  },
  air: {
    id: 'air',
    name: 'Air',
    primary: '#b7c9ff',
    secondary: '#83a4d4',
    dark: '#4b6cb7',
  },
  earth: {
    id: 'earth',
    name: 'Earth',
    primary: '#c9a56b',
    secondary: '#ba8b02',
    dark: '#3E5151',
  },
  electricity: {
    id: 'electricity',
    name: 'Electricity',
    primary: '#a855f7', // electric purple
    secondary: '#ffe14a', // yellow accent
    dark: '#360033',
  },
  ice: {
    id: 'ice',
    name: 'Ice',
    primary: '#8fe3ff',
    secondary: '#36d1dc',
    dark: '#1c92d2',
  },
  nature: {
    id: 'nature',
    name: 'Nature',
    primary: '#6bd88a',
    secondary: '#a8ff78',
    dark: '#11998e',
  },
  time: {
    id: 'time',
    name: 'Time',
    primary: '#a9834e', // aged brass / brown wood
    secondary: '#d9c39a', // clock-face beige
    dark: '#3d2b1a', // deep walnut
  },
  space: {
    id: 'space',
    name: 'Space',
    primary: '#5b21b6', // deep void-violet (darker than Electricity's bright purple)
    secondary: '#3ad0ff', // starlight cyan
    dark: '#0a0518', // near-black void
  },
  love: {
    id: 'love',
    name: 'Love',
    primary: '#ff4d8d', // rose pink
    secondary: '#ffd1e3', // soft blush
    dark: '#5c1030', // deep wine
  },
  joker: {
    id: 'joker',
    name: 'Joker',
    primary: '#e02434', // circus-tent red
    secondary: '#f7f7f2', // big-top white
    dark: '#5e0a13', // deep curtain crimson
  },
  light: {
    id: 'light',
    name: 'Light',
    primary: '#f7f7f2', // pure white
    secondary: '#12121a', // black accent
    dark: '#9a9a93', // shadowed grey, so gradients still read
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    primary: '#12121a', // near-black
    secondary: '#f7f7f2', // white accent
    dark: '#050508', // void
    // A black castle disappears against the battlefield, so Dark overrides the
    // sprite's near-black outline with its white accent (see CastleSprite).
    outline: '#f7f7f2',
  },
}

export function getKingdomTheme(kingdomId: string | null): KingdomTheme | null {
  if (!kingdomId || !KINGDOM_THEMES[kingdomId]) return null
  return KINGDOM_THEMES[kingdomId]
}
