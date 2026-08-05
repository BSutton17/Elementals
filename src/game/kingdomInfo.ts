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
  // Joker, Light, and Dark have their real passives; only their ABILITY kits
  // are still placeholders.
  joker: [
    {
      name: 'Beginners luck',
      description: 'Your attacks land critical hits twice as often as anyone else.',
    },
    {
      name: 'Why so serious?',
      description: 'While your shield is up, attacks against you sometimes miss entirely.',
    },
  ],
  light: [
    {
      name: 'Speed of light',
      description: 'Every ability you cast hurries all your other abilities off cooldown.',
    },
    {
      name: 'Bright idea',
      description: 'Upgrading your abilities costs less.',
    },
  ],
  dark: [
    {
      name: 'Night terrors',
      description: 'Kingdoms that attack you risk having their own screen plunged into darkness.',
    },
    {
      name: 'Black Magic',
      description: 'Both of your chosen perks work noticeably harder than they would for anyone else.',
    },
  ],
  kitsune: [
    {
      name: 'Swift Tails',
      description:
        'Your Ancient Memory meter fills on its own, whatever you are doing — and faster with every point of damage you deal.',
    },
    {
      name: 'Three tailed fox',
      description: 'You choose three perks instead of two.',
    },
  ],
  magma: [
    {
      name: 'Hotter fire',
      description:
        'Your burns go straight through shields. A shield softens each tick but never blocks it, so raising one against you is worth doing and is never a full answer.',
    },
    {
      name: 'Hot ash',
      description:
        'You deal extra damage to any kingdom currently targeting you — and every 45 seconds each of them is marked on YOUR screen, so you always know who is committed against you.',
    },
  ],
}
