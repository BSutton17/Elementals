import { FaMountain, FaLeaf, FaHeart } from 'react-icons/fa'
import { PiDropFill, PiFireFill, PiWindFill, PiLightningFill, PiSunFill } from 'react-icons/pi'
import { RiSnowflakeFill } from 'react-icons/ri'
import { CgSandClock } from 'react-icons/cg'
import { GiBlackHoleBolas, GiCardRandom, GiFoxHead, GiMoon, GiVolcano } from 'react-icons/gi'
import { BiBug } from 'react-icons/bi'
import type { IconType } from 'react-icons'
import type { KingdomId } from './kingdoms'

// One icon per kingdom: its signature mark. Shared by the lobby's kingdom
// picker and every tutorial page that shows the roster. (Deliberately NOT on
// the battlefield castles — that was tried and removed.)
//
// A total Record, so adding a kingdom to KINGDOMS fails the type-check here
// until it has been given a face — which is how the orbit on page 1 ended up
// silently drawing three water droplets when the roster grew to thirteen.

export const KINGDOM_ICONS: Record<KingdomId, IconType> = {
  water: PiDropFill,
  fire: PiFireFill,
  air: PiWindFill,
  earth: FaMountain,
  electricity: PiLightningFill,
  ice: RiSnowflakeFill,
  nature: FaLeaf,
  time: CgSandClock,
  space: GiBlackHoleBolas,
  love: FaHeart,
  joker: GiCardRandom,
  light: PiSunFill,
  dark: GiMoon,
  kitsune: GiFoxHead,
  magma: GiVolcano,
  insects: BiBug,
}

