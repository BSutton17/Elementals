// Display copy for the lobby's kingdom selection screen: each kingdom's
// always-on passives, described qualitatively (no raw multipliers or
// percentages — see server data/kingdoms.ts for the authoritative numbers).

export interface KingdomPassiveInfo {
  name: string
  description: string
  /** Marks a drawback so the UI can style it differently. */
  weakness?: boolean
}

export const KINGDOM_PASSIVES_INFO: Record<string, KingdomPassiveInfo[]> = {
  water: [
    {
      name: "We're In This Together",
      description: 'Your citizens each produce extra gold.',
    },
    {
      name: 'Fountain of Youth',
      description: 'All damage over time effects hurts you 15% less.',
    },
  ],
  fire: [
    {
      name: 'Set Your Heart Ablaze!',
      description: 'Start with reduced castle HP but increased damage output.',
    },
    {
      name: 'Roast!',
      description: 'Deal extra damage to shields.',
    },
  ],
  air: [
    {
      name: 'Embrace of Winds',
      description: 'Attacks can strike multiple kingdoms at once.',
    },
    {
      name: 'A Gust of Envy',
      description: 'Incoming attacks are sometimes redirected to another kingdom.',
    },
  ],
  earth: [
    {
      name: 'Rock Hard Determination',
      description: 'Begin the game with a shield already in place.',
    },
    {
      name: 'Distraught',
      description: 'Dealing damage slowly regenerates your shield.',
    },
  ],
  electricity: [
    {
      name: "Don't Blink",
      description: 'Your attacks recharge faster.',
    },
    {
      name: 'AfterShock',
      description: 'Attacks sometimes strike a second time for bonus damage.',
    },
  ],
  ice: [
    {
      name: 'Cold Embrace',
      description: 'Attacks have a chance to freeze the target.',
    },
    {
      name: 'Frostbite',
      description: 'Those who attack you risk having their income slowed.',
    },
  ],
  nature: [
    {
      name: 'No Rose Without Thorns',
      description: 'Attackers sometimes take part of their own damage back.',
    },
    {
      name: "Gardener's Gift",
      description: 'Begin the game with extra citizens.',
    },
  ],
  time: [
    {
      name: 'Longevity',
      description: 'The longer the battle lasts, the stronger you get — your attacks and your defenses both steadily improve over time.',
    },
    {
      name: 'Time is money',
      description: 'Hiring a citizen sometimes brings a second one along for free, without raising the next hire\'s price.',
    },
  ],
  space: [
    {
      name: 'Blast off!',
      description: 'Start the match with extra gold in the bank.',
    },
    {
      name: 'Vast Universe',
      description: 'Your economy grows stronger the more kingdoms are targeting you.',
    },
  ],
  love: [
    {
      name: 'Warm Welcome',
      description: 'All citzens come at a discount.',
    },
    {
      name: 'Feel the love!',
      description: 'Whenever another kingdom heals, you receive a share of it too.',
    },
  ],
}
