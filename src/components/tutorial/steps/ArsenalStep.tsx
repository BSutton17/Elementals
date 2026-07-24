import { TutorialStep } from '../TutorialStep'
import { DemoDummyCastle } from '../DemoDummyCastle'
import { AbilityBar } from '../../AbilityBar'
import { getKingdomTheme } from '../../../game/kingdomThemes'
import { useTutorialSandbox } from '../../../game/useTutorialSandbox'

// Page 5 — the arsenal. The REAL in-game ability bar, live, pointed at a
// practice dummy. Cast, watch cooldowns spin, buy an upgrade.

export function ArsenalStep() {
  const sandbox = useTutorialSandbox({ preselectTarget: true })
  const theme = getKingdomTheme(sandbox.kingdomId)

  return (
    <TutorialStep
      kicker="Lesson three"
      title="Unleash the Kit"
      lead="Every kingdom fields three attacks, one utility, and one ultimate. This is Water's — and this is the exact bar you'll fight with. Fire away."
    >
      <div className="howto-arsenal">
        <DemoDummyCastle
          name="Sir Practiceton"
          kingdomId="fire"
          color="#ff6b4a"
          hp={sandbox.dummy.hp}
          maxHp={sandbox.dummy.maxHp}
          shield={sandbox.dummy.shield}
          statuses={sandbox.dummy.statuses}
          eliminated={sandbox.dummy.eliminated}
          isYourTarget={sandbox.dummy.selected && !sandbox.dummy.eliminated}
          hit={sandbox.lastHit}
        />

        <div className="howto-arsenal__bar">
          <AbilityBar
            kingdomId={sandbox.kingdomId}
            theme={theme}
            currency={sandbox.currency}
            citizens={sandbox.citizens}
            castleHp={sandbox.castleHp}
            maxCastleHp={sandbox.maxCastleHp}
            shieldHp={sandbox.shieldHp}
            nextCitizenCost={sandbox.nextCitizenCost}
            nextRepairCost={sandbox.nextRepairCost}
            shieldCost={sandbox.shieldCost}
            repairsUsed={sandbox.repairsUsed}
            maxRepairs={sandbox.maxRepairs}
            incomePerSecond={sandbox.incomePerSecond}
            abilities={sandbox.abilityStates}
            tickRate={sandbox.tickRate}
            onCastAbility={(id) => sandbox.castAbility(id)}
            onUpgradeAbility={(id) => sandbox.upgradeAbility(id)}
            onBuyItem={(id) => sandbox.buyItem(id)}
          />
        </div>

        <p className="howto-step__footnote">
          Hotkeys mirror the tags on each card (Q · W · E · R · Space). Hover a card
          to buy upgrades — stronger casts, same gold. If the dummy falls, don't
          worry: it rebuilds. It has infinite patience.
        </p>
      </div>
    </TutorialStep>
  )
}
