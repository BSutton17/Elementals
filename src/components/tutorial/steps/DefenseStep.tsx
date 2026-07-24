import { TutorialStep } from '../TutorialStep'
import { DemoDummyCastle } from '../DemoDummyCastle'
import { ShopOverlay } from '../../ShopOverlay'
import { getKingdomTheme } from '../../../game/kingdomThemes'
import { useTutorialSandbox } from '../../../game/useTutorialSandbox'

// Page 7 — defense. An unseen rival is pelting YOUR castle; the real
// Repairs & Shields shop is open. Buy a shield, watch it eat the hits.

export function DefenseStep() {
  const sandbox = useTutorialSandbox({ underAttack: true })
  const theme = getKingdomTheme('water')
  const shielded = sandbox.shieldHp > 0

  return (
    <TutorialStep
      kicker="Lesson five"
      title="You WILL Get Hit"
      lead={
        shielded
          ? 'Beautiful. The shield soaks damage before your castle does — and when it breaks, you can raise another. Repairs patch the castle itself, but they are limited. Spend wisely.'
          : 'Someone out there has decided they don’t like you. Open defense comes in two flavors: shields absorb hits, repairs undo them. Buy a shield before the next fireball lands.'
      }
    >
      <div className="howto-defense">
        <DemoDummyCastle
          name="You"
          kingdomId="water"
          color="#4aa3ff"
          hp={sandbox.castleHp}
          maxHp={sandbox.maxCastleHp}
          shield={sandbox.shieldHp}
          citizens={sandbox.citizens}
          incomePerSecond={sandbox.incomePerSecond}
          isYou
          incomingSeq={sandbox.incomingHit?.seq}
        />

        <div className="howto-defense__shop">
          <ShopOverlay
            isOpen
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
            theme={theme}
            onBuyItem={(id) => sandbox.buyItem(id)}
            onClose={() => {}}
          />
        </div>

        <p className="howto-step__footnote">
          In a match this menu lives behind the “Repairs &amp; Shields” button on
          your ability bar — some kingdoms can even seal it shut. Rude.
        </p>
      </div>
    </TutorialStep>
  )
}
