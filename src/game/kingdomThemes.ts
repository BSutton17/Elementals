export interface KingdomTheme {
  id: string
  name: string
  primary: string // Main color for UI
  secondary: string // Accent/secondary color
  dark: string // Darkened variant
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
    primary: '#ffd24a',
    secondary: '#f9d423',
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
}

export function getKingdomTheme(kingdomId: string | null): KingdomTheme | null {
  if (!kingdomId || !KINGDOM_THEMES[kingdomId]) return null
  return KINGDOM_THEMES[kingdomId]
}
