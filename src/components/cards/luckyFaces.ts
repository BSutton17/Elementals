// The five faces Lucky Draw can land, as display data. The SERVER decides which
// one it is (uniformly, at cast) — the player's click only chooses which of the
// five face-down cards turns over to show it. Picking card three does not make
// it the third face; nothing is knowable until it flips.
//
// Keyed by the outcome label the server sends on its `luckyDraw` event.

export interface LuckyFace {
  /** The label `describeOutcome`-side sends: a status id, or shield/heal. */
  id: string
  name: string
  description: string
  /** The pip shown on the card front. */
  pip: string
  /** Particle theme, matching the effect's character. */
  theme: 'attack' | 'armor' | 'gold' | 'shield' | 'heal'
}

export const LUCKY_FACES: Record<string, LuckyFace> = {
  luckyAttack: {
    id: 'luckyAttack',
    name: 'Ace of Diamonds',
    description: '+10% attack for 20 seconds',
    pip: '⚔️',
    theme: 'attack',
  },
  luckyArmor: {
    id: 'luckyArmor',
    name: '10 of Spades',
    description: '+10% damage reduction for 20 seconds',
    pip: '🛡️',
    theme: 'armor',
  },
  luckyGold: {
    id: 'luckyGold',
    name: '3 of diamonds',
    description: '+10% gold production for 20 seconds',
    pip: '🪙',
    theme: 'gold',
  },
  shield: {
    id: 'shield',
    name: '8 of Clubs',
    description: 'A free 1000hp shield',
    pip: '🏰',
    theme: 'shield',
  },
  heal: {
    id: 'heal',
    name: 'Queen of Hearts',
    description: '750hp restored',
    pip: '❤️',
    theme: 'heal',
  },
}

/** The face for an outcome label, falling back to a neutral card. */
export function faceFor(outcome: string | null): LuckyFace {
  return (
    (outcome ? LUCKY_FACES[outcome] : undefined) ?? {
      id: 'unknown',
      name: 'Wild',
      description: 'Something happened.',
      pip: '🃏',
      theme: 'gold',
    }
  )
}

/** How many cards are fanned out for the choice. */
export const LUCKY_CARD_COUNT = 5
