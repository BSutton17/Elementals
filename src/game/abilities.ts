import type { IconType } from 'react-icons'
import { PiDropFill, PiFireFill, PiWindFill, PiEyeFill, PiMeteorFill, PiLightningFill, PiThermometerCold, PiBiohazardFill, PiSkullFill } from 'react-icons/pi'
import { BsWater } from 'react-icons/bs'
import { MdFlood } from 'react-icons/md'
import { FaSun, FaIcicles, FaMountain } from 'react-icons/fa'
import { FaBottleWater, FaHurricane } from 'react-icons/fa6'
import { GiWaveSurfer, GiFireDash, GiStonePile, GiDefensiveWall, GiLightningFlame, GiLightningDome, GiThunderSkull, GiMeltingIceCube, GiSnowing, GiAppleCore, GiPoisonGas } from 'react-icons/gi'
import { TbTornado, TbTemperatureMinusFilled, TbDeviceLaptop, TbCloudRain } from 'react-icons/tb'
import { WiFog } from 'react-icons/wi'
import { SiBunnydotnet } from 'react-icons/si'
import { RiEarthquakeFill, RiSnowflakeFill } from 'react-icons/ri'

export interface ClientAbilityMetadata {
  id: string
  name: string
  description: string
  hotkey: string
  kind: 'attack' | 'utility' | 'ultimate' | 'passive'
  element: string
  color: string // theme color hex
  gradient: string // CSS gradient for buttons
  icon: IconType // react-icons component rendered on the ability card
  baseCost: number
  /** Explicit unlock price; when omitted, unlocking costs 50% of baseCost. */
  unlockCost?: number
  upgradeCosts: number[] // costs for level 0->1, 1->2, 2->3, etc.
  /**
   * Charge-based casts (Lightning Barrage): the ability owns a pool of `max`
   * charges. The card shows three mini cast buttons (spend 1/2/3), priced at
   * costPerCharge each; damageByCharges is total damage indexed by charges
   * spent. Spent charges regenerate independently (~rechargeSeconds apart).
   */
  charges?: {
    max: number
    costPerCharge: number
    damageByCharges: number[]
    rechargeSeconds: number
  }
}

export const ABILITY_METADATA: Record<string, ClientAbilityMetadata> = {
  // Water Abilities
  waterBall: {
    id: 'waterBall',
    name: 'Water Ball',
    description: 'Basic Water attack. Hurls a sphere of compressed water at your target.',
    hotkey: 'Q',
    kind: 'attack',
    element: 'water',
    color: '#4aa3ff',
    gradient: 'linear-gradient(135deg, #1e3c72, #2a5298, #4aa3ff)',
    icon: PiDropFill,
    baseCost: 100,
    upgradeCosts: [150, 250, 400],
  },
  waterfall: {
    id: 'waterfall',
    name: 'Waterfall',
    description: 'Powerful Water attack that applies Current. While caught in the Current, your Water attacks heal your castle based on damage dealt, and Flood lasts longer against them.',
    hotkey: 'W',
    kind: 'attack',
    element: 'water',
    color: '#4aa3ff',
    gradient: 'linear-gradient(135deg, #2b5876, #4e4376, #4aa3ff)',
    icon: BsWater,
    baseCost: 250,
    upgradeCosts: [200, 300, 450, 600],
  },
  flood: {
    id: 'flood',
    name: 'Flood',
    description: 'Heavy Water attack. Washes over the target, preventing them from targeting you for a few seconds — even longer if they are caught in the Current.',
    hotkey: 'E',
    kind: 'attack',
    element: 'water',
    color: '#4aa3ff',
    gradient: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
    icon: MdFlood,
    baseCost: 400,
    upgradeCosts: [300, 450, 600, 800],
  },
  fluidAssimilation: {
    id: 'fluidAssimilation',
    name: 'Fluid Assimilation',
    description: 'Draw in the surrounding moisture to instantly restore a portion of your castle health.',
    hotkey: 'R',
    kind: 'utility',
    element: 'water',
    color: '#4aa3ff',
    gradient: 'linear-gradient(135deg, #2193b0, #6dd5ed)',
    icon: FaBottleWater,
    baseCost: 300,
    upgradeCosts: [200, 350],
  },
  riptide: {
    id: 'riptide',
    name: 'Riptide',
    description: 'The tide turns in your favor: restore half your castle health and swell your population with new citizens.',
    hotkey: 'Space',
    kind: 'ultimate',
    element: 'water',
    color: '#4aa3ff',
    gradient: 'linear-gradient(135deg, #00c6ff, #0072ff)',
    icon: GiWaveSurfer,
    baseCost: 1000,
    upgradeCosts: [],
  },

  // Fire Abilities
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    description: 'Basic Fire attack. Launches a searing fireball at your target.',
    hotkey: 'Q',
    kind: 'attack',
    element: 'fire',
    color: '#ff6b4a',
    gradient: 'linear-gradient(135deg, #870000, #190000, #ff6b4a)',
    icon: PiFireFill,
    baseCost: 100,
    upgradeCosts: [150, 250, 400],
  },
  scorchingSun: {
    id: 'scorchingSun',
    name: 'Scorching Sun',
    description: 'Powerful Fire attack that guarantees Burn on the target, and deals bonus damage if they are already Burning. Burn deals damage over time and makes your Fire attacks hit harder.',
    hotkey: 'W',
    kind: 'attack',
    element: 'fire',
    color: '#ff6b4a',
    gradient: 'linear-gradient(135deg, #f12711, #f5af19)',
    icon: FaSun,
    baseCost: 250,
    upgradeCosts: [200, 300, 450, 600],
  },
  firenado: {
    id: 'firenado',
    name: 'Firenado',
    description: 'Very powerful Fire attack with a coin-flip chance to apply Burn. Burning targets take damage over time and suffer extra from your Fire attacks.',
    hotkey: 'E',
    kind: 'attack',
    element: 'fire',
    color: '#ff6b4a',
    gradient: 'linear-gradient(135deg, #f857a6, #ff5858)',
    icon: TbTornado,
    baseCost: 400,
    upgradeCosts: [300, 450, 600, 800],
  },
  heatWave: {
    id: 'heatWave',
    name: 'Heat Wave',
    description: 'Superheat the air around your castle, temporarily raising your critical strike chance and critical damage. Cannot stack.',
    hotkey: 'R',
    kind: 'utility',
    element: 'fire',
    color: '#ff6b4a',
    gradient: 'linear-gradient(135deg, #ff9966, #ff5e62)',
    icon: TbTemperatureMinusFilled,
    baseCost: 150,
    upgradeCosts: [200, 350],
  },
  blazingDetermination: {
    id: 'blazingDetermination',
    name: 'Blazing Determination',
    description: 'Pour everything into a single strike — your next attack deals massively increased damage.',
    hotkey: 'Space',
    kind: 'ultimate',
    element: 'fire',
    color: '#ff6b4a',
    gradient: 'linear-gradient(135deg, #e52d27, #b31217)',
    icon: GiFireDash,
    baseCost: 200,
    upgradeCosts: [250, 400],
  },

  // Air Abilities
  aLightBreeze: {
    id: 'aLightBreeze',
    name: 'A Light Breeze',
    description: 'Basic Air attack. Slices the target with compressed wind currents.',
    hotkey: 'Q',
    kind: 'attack',
    element: 'air',
    color: '#b7c9ff',
    gradient: 'linear-gradient(135deg, #4b6cb7, #182848)',
    icon: PiWindFill,
    baseCost: 100,
    upgradeCosts: [150, 250, 400],
  },
  hurricane: {
    id: 'hurricane',
    name: 'Hurricane',
    description: 'Powerful Air attack. The next time the victim attacks you, their attack is guaranteed to be deflected into another kingdom instead.',
    hotkey: 'W',
    kind: 'attack',
    element: 'air',
    color: '#b7c9ff',
    gradient: 'linear-gradient(135deg, #83a4d4, #b6fbff)',
    icon: FaHurricane,
    baseCost: 250,
    upgradeCosts: [200, 300, 450, 600],
  },
  thickFog: {
    id: 'thickFog',
    name: 'Thick Fog',
    description: 'Moderate Air attack that blankets the target\'s screen in fog, hiding battlefield information from them for a short time. Up to three players can be fogged at once.',
    hotkey: 'E',
    kind: 'attack',
    element: 'air',
    color: '#b7c9ff',
    gradient: 'linear-gradient(135deg, #6190e8, #a7bfe8)',
    icon: WiFog,
    baseCost: 300,
    upgradeCosts: [200, 300, 450, 600],
  },
  birdsEyeView: {
    id: 'birdsEyeView',
    name: "Bird's Eye View",
    description: 'Rise above the clouds to temporarily reveal every kingdom\'s castle HP, shields, citizens, and income.',
    hotkey: 'R',
    kind: 'utility',
    element: 'air',
    color: '#b7c9ff',
    gradient: 'linear-gradient(135deg, #2b5876, #4e4376)',
    icon: PiEyeFill,
    baseCost: 150,
    upgradeCosts: [200, 350],
  },
  dustBunnies: {
    id: 'dustBunnies',
    name: 'Dust Bunnies',
    description: 'Send dust bunnies scurrying into every opposing kingdom, slowly gnawing away at them with damage over time.',
    hotkey: 'Space',
    kind: 'ultimate',
    element: 'air',
    color: '#b7c9ff',
    gradient: 'linear-gradient(135deg, #3a7bd5, #3a6073)',
    icon: SiBunnydotnet,
    baseCost: 1000,
    upgradeCosts: [],
  },

  // Earth Abilities
  rockThrow: {
    id: 'rockThrow',
    name: 'Rock Throw',
    description: 'Basic Earth attack. Hurls a heavy boulder at your target.',
    hotkey: 'Q',
    kind: 'attack',
    element: 'earth',
    color: '#c9a56b',
    gradient: 'linear-gradient(135deg, #3E5151, #DECBA4)',
    icon: GiStonePile,
    baseCost: 100,
    upgradeCosts: [150, 250, 400],
  },
  meteorShower: {
    id: 'meteorShower',
    name: 'Meteor Shower',
    description: 'Powerful Earth attack. A barrage of meteors strikes the target one after another, each impact dealing bonus damage to shields.',
    hotkey: 'W',
    kind: 'attack',
    element: 'earth',
    color: '#c9a56b',
    gradient: 'linear-gradient(135deg, #ba8b02, #181818)',
    icon: PiMeteorFill,
    baseCost: 250,
    upgradeCosts: [200, 300, 450, 600],
  },
  earthquake: {
    id: 'earthquake',
    name: 'Earthquake',
    description: 'Heavy Earth attack. Damages your target and sends aftershocks rippling into the kingdoms beside them.',
    hotkey: 'E',
    kind: 'attack',
    element: 'earth',
    color: '#c9a56b',
    gradient: 'linear-gradient(135deg, #42275a, #734b6d)',
    icon: RiEarthquakeFill,
    baseCost: 400,
    upgradeCosts: [300, 450, 600, 800],
  },
  naturalTerrain: {
    id: 'naturalTerrain',
    name: 'Natural Terrain',
    description: 'Raise defensive earthworks around your castle — all incoming damage is halved for a while.',
    hotkey: 'R',
    kind: 'utility',
    element: 'earth',
    color: '#c9a56b',
    gradient: 'linear-gradient(135deg, #513B3C, #DECBA4)',
    icon: FaMountain,
    baseCost: 200,
    upgradeCosts: [200, 350],
  },
  brickWall: {
    id: 'brickWall',
    name: 'Brick Wall',
    description: 'Instantly raise a massive shield around your castle.',
    hotkey: 'Space',
    kind: 'ultimate',
    element: 'earth',
    color: '#c9a56b',
    gradient: 'linear-gradient(135deg, #603813, #b29f94)',
    icon: GiDefensiveWall,
    baseCost: 1000,
    upgradeCosts: [],
  },

  // Electricity Abilities
  zap: {
    id: 'zap',
    name: 'Zap',
    description: 'Basic Electricity attack. A quick spark on a very short cooldown.',
    hotkey: 'Q',
    kind: 'attack',
    element: 'electricity',
    color: '#ffd24a',
    gradient: 'linear-gradient(135deg, #f9d423, #ff4e50)',
    icon: PiLightningFill,
    baseCost: 100,
    upgradeCosts: [150, 250, 400],
  },
  lightningBarrage: {
    id: 'lightningBarrage',
    name: 'Lightning Barrage',
    description: 'Holds 3 Lightning charges. Spend 1, 2, or 3 at once — the more charges spent, the harder the bolts hit. Spent charges recharge on their own independent timers, so leftover charges can fire immediately.',
    hotkey: 'W',
    kind: 'attack',
    element: 'electricity',
    color: '#ffd24a',
    gradient: 'linear-gradient(135deg, #e1eec3, #f05053)',
    icon: GiLightningFlame,
    baseCost: 85,
    unlockCost: 125,
    upgradeCosts: [200, 300, 450, 600],
    charges: {
      max: 3,
      costPerCharge: 85,
      damageByCharges: [200, 410, 650],
      rechargeSeconds: 3,
    },
  },
  thunderdome: {
    id: 'thunderdome',
    name: 'Thunderdome',
    description: 'Combo attack that deals moderate damage and cages the target in a Thunderdome. While it stands, your Electricity attacks against them deal bonus damage.',
    hotkey: 'E',
    kind: 'attack',
    element: 'electricity',
    color: '#ffd24a',
    gradient: 'linear-gradient(135deg, #360033, #0b8793)',
    icon: GiLightningDome,
    baseCost: 300,
    upgradeCosts: [200, 300, 450, 600],
  },
  hack: {
    id: 'hack',
    name: 'Hack',
    description: 'Break into the target\'s vault and steal a share of their money and citizens. Deals no damage.',
    hotkey: 'R',
    kind: 'utility',
    element: 'electricity',
    color: '#ffd24a',
    gradient: 'linear-gradient(135deg, #000000, #53346d)',
    icon: TbDeviceLaptop,
    baseCost: 300,
    upgradeCosts: [200, 350],
  },
  thunderingFate: {
    id: 'thunderingFate',
    name: 'Thundering Fate',
    description: 'Overload your circuits — for a short window, Zap has no cooldown and costs a fraction of its usual price. Fire at will.',
    hotkey: 'Space',
    kind: 'ultimate',
    element: 'electricity',
    color: '#ffd24a',
    gradient: 'linear-gradient(135deg, #f7ff00, #db36a4)',
    icon: GiThunderSkull,
    baseCost: 1000,
    upgradeCosts: [],
  },

  // Ice Abilities
  icicle: {
    id: 'icicle',
    name: 'Icicle',
    description: 'Basic Ice attack. Fires a sharpened icicle at your target.',
    hotkey: 'Q',
    kind: 'attack',
    element: 'ice',
    color: '#8fe3ff',
    gradient: 'linear-gradient(135deg, #1c92d2, #f2fcfe)',
    icon: RiSnowflakeFill,
    baseCost: 100,
    upgradeCosts: [150, 250, 400],
  },
  floodOfFrost: {
    id: 'floodOfFrost',
    name: 'Flood of Frost',
    description: 'Powerful Ice attack with a chance to inflict Chilling Retribution, lengthening all of the target\'s cooldowns for a short time.',
    hotkey: 'W',
    kind: 'attack',
    element: 'ice',
    color: '#8fe3ff',
    gradient: 'linear-gradient(135deg, #36d1dc, #5b86e5)',
    icon: FaIcicles,
    baseCost: 250,
    upgradeCosts: [200, 300, 450, 600],
  },
  freezeToTheCore: {
    id: 'freezeToTheCore',
    name: 'Freeze to the Core',
    description: 'Freezes the target solid — guaranteed. Frozen kingdoms cannot attack for a few seconds.',
    hotkey: 'E',
    kind: 'attack',
    element: 'ice',
    color: '#8fe3ff',
    gradient: 'linear-gradient(135deg, #00c6ff, #0072ff)',
    icon: GiMeltingIceCube,
    baseCost: 400,
    upgradeCosts: [300, 450, 600, 800],
  },
  frozenFocus: {
    id: 'frozenFocus',
    name: 'Frozen Focus',
    description: 'Sharpen your cold: your next two Ice attacks are guaranteed to Freeze the target or inflict Chilling Retribution.',
    hotkey: 'R',
    kind: 'utility',
    element: 'ice',
    color: '#8fe3ff',
    gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)',
    icon: PiThermometerCold,
    baseCost: 200,
    upgradeCosts: [200, 350],
  },
  blizzard: {
    id: 'blizzard',
    name: 'Blizzard',
    description: 'A storm engulfs every opposing kingdom: they cannot attack and their production is frozen for several seconds.',
    hotkey: 'Space',
    kind: 'ultimate',
    element: 'ice',
    color: '#8fe3ff',
    gradient: 'linear-gradient(135deg, #2193b0, #6dd5ed)',
    icon: GiSnowing,
    baseCost: 1000,
    upgradeCosts: [],
  },

  // Nature Abilities
  sludge: {
    id: 'sludge',
    name: 'Sludge',
    description: 'Basic Nature attack coated in a weak Poison — a toxin that deals damage over time for a few seconds.',
    hotkey: 'Q',
    kind: 'attack',
    element: 'nature',
    color: '#6bd88a',
    gradient: 'linear-gradient(135deg, #11998e, #38ef7d)',
    icon: PiBiohazardFill,
    baseCost: 100,
    upgradeCosts: [150, 250, 400],
  },
  acidRain: {
    id: 'acidRain',
    name: 'Acid Rain',
    description: 'Moderate Nature attack that applies Corroded. While Corroded, the target takes increased Poison damage and your Poisons can stack on them.',
    hotkey: 'W',
    kind: 'attack',
    element: 'nature',
    color: '#6bd88a',
    gradient: 'linear-gradient(135deg, #a8ff78, #78ffd6)',
    icon: TbCloudRain,
    baseCost: 250,
    upgradeCosts: [200, 300, 450, 600],
  },
  gastroAcid: {
    id: 'gastroAcid',
    name: 'Gastro Acid',
    description: 'Powerful Nature attack that applies a strong Poison, with a coin-flip chance to Poison the citizens too — poisoned citizens produce far less gold.',
    hotkey: 'E',
    kind: 'attack',
    element: 'nature',
    color: '#6bd88a',
    gradient: 'linear-gradient(135deg, #56ab2f, #a8ff78)',
    icon: PiSkullFill,
    baseCost: 400,
    upgradeCosts: [300, 450, 600, 800],
  },
  poisonApple: {
    id: 'poisonApple',
    name: 'Poison Apple',
    description: 'Leave out a tempting trap: the next kingdom to attack you bites the apple and is strongly Poisoned, taking damage over time.',
    hotkey: 'R',
    kind: 'utility',
    element: 'nature',
    color: '#6bd88a',
    gradient: 'linear-gradient(135deg, #ffe259, #ffa751)',
    icon: GiAppleCore,
    baseCost: 200,
    upgradeCosts: [200, 350],
  },
  toxicGas: {
    id: 'toxicGas',
    name: 'Toxic Gas',
    description: 'Envelop the target in a choking cloud of Toxic Gas — while it lingers, they cannot hire citizens or repair their castle.',
    hotkey: 'Space',
    kind: 'ultimate',
    element: 'nature',
    color: '#6bd88a',
    gradient: 'linear-gradient(135deg, #00b4db, #0083b0)',
    icon: GiPoisonGas,
    baseCost: 1000,
    upgradeCosts: [],
  },
}

export function getAbilitiesForKingdom(kingdomId: string | null): ClientAbilityMetadata[] {
  if (!kingdomId) return []
  return Object.values(ABILITY_METADATA).filter((m) => m.element === kingdomId)
}

/**
 * Returns the upgrade cost of an ability based on its current level.
 * level = 0 means has not upgraded yet (still locked), so next cost is upgradeCosts[0] (e.g. 150g).
 * level = 1 means next upgrade is level 2, cost is upgradeCosts[1] (e.g. 250g).
 */
export function getUpgradeCost(abilityId: string, currentLevel: number): number | null {
  const metadata = ABILITY_METADATA[abilityId]
  if (!metadata || !metadata.upgradeCosts) return null
  if (currentLevel >= metadata.upgradeCosts.length) return null // Max level
  return metadata.upgradeCosts[currentLevel]
}
