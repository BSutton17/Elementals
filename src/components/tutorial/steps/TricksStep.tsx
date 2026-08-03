import { TutorialStep } from '../TutorialStep'
import { DemoDummyCastle } from '../DemoDummyCastle'
import { AbilityButton } from '../../AbilityButton'
import { ABILITY_METADATA } from '../../../game/abilities'
import { demoCastCost, useTutorialSandbox } from '../../../game/useTutorialSandbox'

// Page 6 — statuses & combos. Cast Waterfall and the dummy is visibly caught
// in a Current (the real battlefield submersion effect), then the page teases
// the wider status bestiary.

const STATUS_CHIPS = [
  { label: 'Burn', color: '#ff6b4a' },
  { label: 'Frozen', color: '#8fe3ff' },
  { label: 'Poison', color: '#6bd88a' },
  { label: 'Thunderdome', color: '#ffd24a' },
  { label: 'Current', color: '#4aa3ff' },
  { label: 'Dust Bunnies', color: '#b7c9ff' },
]

export function TricksStep() {
  const sandbox = useTutorialSandbox({ preselectTarget: true })
  const waterfall = ABILITY_METADATA.waterfall
  const state = sandbox.abilityStates.find((a) => a.id === 'waterfall')
  const soaked = sandbox.dummy.statuses.some((s) => s.id === 'current')

  return (
    <TutorialStep
      kicker="Lesson four"
      title="Every Element Has Tricks"
      lead={
        soaked
          ? 'See the water line? This kingdom is caught in a Current — while it lasts, Water attacks heal the caster and Flood bites harder. Statuses set up combos.'
          : 'Attacks do more than damage: they stick statuses onto their victim. Cast Waterfall and watch what happens to the fire kingdom.'
      }
    >
      <div className="howto-tricks">
        <DemoDummyCastle
          name="Fire"
          kingdomId="fire"
          color="#ff6b4a"
          hp={sandbox.dummy.hp}
          maxHp={sandbox.dummy.maxHp}
          shield={sandbox.dummy.shield}
          statuses={sandbox.dummy.statuses}
          eliminated={sandbox.dummy.eliminated}
          isYourTarget={!sandbox.dummy.eliminated}
          hit={sandbox.lastHit}
        />

        <div className="howto-tricks__cast" data-soaked={soaked || undefined}>
          <AbilityButton
            metadata={waterfall}
            level={state?.level ?? 1}
            cooldownRemaining={state?.cooldownRemaining ?? 0}
            tickRate={sandbox.tickRate}
            currency={sandbox.currency}
            enabled
            cost={demoCastCost(waterfall)}
            onCast={() => sandbox.castAbility('waterfall')}
          />
        </div>

        <div className="howto-tricks__chips" aria-label="Example statuses">
          {STATUS_CHIPS.map((c) => (
            <span
              key={c.label}
              className="howto-tricks__chip"
              style={{ '--chip': c.color } as React.CSSProperties}
            >
              {c.label}
            </span>
          ))}
        </div>

        <p className="howto-step__footnote">
          Every kingdom's kit hides a combo. Finding yours is half the game.
        </p>
      </div>
    </TutorialStep>
  )
}
