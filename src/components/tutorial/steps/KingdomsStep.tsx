import { useState, type CSSProperties } from 'react'
import { TutorialStep } from '../TutorialStep'
import { SELECTABLE_KINGDOMS, type KingdomId } from '../../../game/kingdoms'
import { KINGDOM_PASSIVES_INFO } from '../../../game/kingdomInfo'
import { getAbilitiesForKingdom } from '../../../game/abilities'

// Page 8 — meet the kingdoms: tap through each one's personality, passives, and
// signature ultimate. Fully data-driven off the selectable kingdom list /
// kingdomInfo / abilities, so it can never drift from the lobby.

const FLAVOR: Record<KingdomId, string> = {
  water: 'In honor of Katara',
  fire: 'Glass cannon. Emphasis on cannon.',
  air: 'Everything, everywhere, all at once.',
  earth: 'The best offense is a great defense.',
  electricity: 'Gotta go fast!',
  ice: 'Let\'s chill',
  nature: 'Everything is poisonous. Everything.',
  time: 'Speeds up, slows down, and rewinds the clock.',
  space: 'No one can hear you scream.',
  love: 'Awww, I love you too!',
  // Placeholder kingdoms — flavour lands with their real kits.
  joker: 'May the odds be ever in your favor.',
  light: 'Nothing left to hide behind.',
  dark: 'Something moved.',
}

export function KingdomsStep() {
  const [selected, setSelected] = useState<KingdomId>('water')
  const kingdom = SELECTABLE_KINGDOMS.find((k) => k.id === selected) ?? SELECTABLE_KINGDOMS[0]
  const passives = KINGDOM_PASSIVES_INFO[selected] ?? []
  const ultimate = getAbilitiesForKingdom(selected).find((a) => a.kind === 'ultimate')

  return (
    <TutorialStep
      kicker="Choose your element"
      title="Meet the Kingdoms"
      lead="Each kingdom plays by its own rules: two always-on passives and a kit built around one elemental idea. Tap around and find your personality."
    >
      <div className="howto-kingdoms">
        <div className="howto-kingdoms__tabs" role="tablist" aria-label="Kingdoms">
          {SELECTABLE_KINGDOMS.map((k) => (
            <button
              key={k.id}
              type="button"
              role="tab"
              aria-selected={k.id === selected}
              className={`howto-kingdoms__tab${k.id === selected ? ' howto-kingdoms__tab--active' : ''}`}
              style={{ '--k': k.color } as CSSProperties}
              onClick={() => setSelected(k.id)}
            >
              {k.label}
            </button>
          ))}
        </div>

        <div
          key={selected}
          className="howto-kingdoms__card"
          style={{ '--k': kingdom.color } as CSSProperties}
          data-testid="kingdom-card"
        >
          <h3 className="howto-kingdoms__name">{kingdom.label}</h3>
          <p className="howto-kingdoms__flavor">{FLAVOR[selected]}</p>

          <ul className="howto-kingdoms__passives">
            {passives.map((p) => (
              <li key={p.name}>
                <span className="howto-kingdoms__passive-name">{p.name}</span>
                <span className="howto-kingdoms__passive-desc">{p.description}</span>
              </li>
            ))}
          </ul>

          {ultimate && (
            <p className="howto-kingdoms__ultimate">
              <span className="howto-kingdoms__ultimate-label">Signature ultimate</span>
              <span className="howto-kingdoms__ultimate-name">{ultimate.name}</span>
              <span className="howto-kingdoms__ultimate-desc">{ultimate.description}</span>
            </p>
          )}
        </div>
      </div>
    </TutorialStep>
  )
}
