import { FaCrown, FaMountain, FaLeaf } from 'react-icons/fa'
import { PiDropFill, PiFireFill, PiWindFill, PiLightningFill } from 'react-icons/pi'
import { RiSnowflakeFill } from 'react-icons/ri'
import type { IconType } from 'react-icons'
import { TutorialStep } from '../TutorialStep'
import { KINGDOMS } from '../../../game/kingdoms'

// Page 1 — the hook. Seven elements circle one throne.

const ELEMENT_ICONS: Record<string, IconType> = {
  water: PiDropFill,
  fire: PiFireFill,
  air: PiWindFill,
  earth: FaMountain,
  electricity: PiLightningFill,
  ice: RiSnowflakeFill,
  nature: FaLeaf,
}

export function ThroneStep() {
  return (
    <TutorialStep
      kicker="Welcome to Elementals"
      title="Seven Kingdoms. One Throne."
      lead="Every match is a free-for-all between elemental kingdoms. Alliances are temporary. Grudges are forever. The last castle standing takes the throne."
    >
      <div className="howto-orbit" aria-hidden="true">
        <span className="howto-orbit__crown">
          <FaCrown />
        </span>
        {KINGDOMS.map((k, i) => {
          const Icon = ELEMENT_ICONS[k.id] ?? PiDropFill
          const angle = (360 / KINGDOMS.length) * i
          return (
            <span
              key={k.id}
              className="howto-orbit__orb"
              style={
                {
                  '--orb-color': k.color,
                  '--orb-angle': `${angle}deg`,
                  '--orb-delay': `${i * 0.35}s`,
                } as React.CSSProperties
              }
            >
              <Icon />
            </span>
          )
        })}
      </div>
      <p className="howto-step__footnote">
        2–8 players. Real time. No second place.
      </p>
    </TutorialStep>
  )
}
