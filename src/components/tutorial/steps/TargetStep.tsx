import { TutorialStep } from '../TutorialStep'
import { DemoDummyCastle } from '../DemoDummyCastle'
import { useTutorialSandbox } from '../../../game/useTutorialSandbox'

// Page 4 — targeting. Click the rival castle; the real target ring locks on.

export function TargetStep() {
  const sandbox = useTutorialSandbox()
  const locked = sandbox.dummy.selected

  return (
    <TutorialStep
      kicker="Lesson two"
      title="Pick On Somebody"
      lead={
        locked
          ? 'Locked on! Your attacks now fly at this unlucky kingdom. You can switch targets at any moment mid-match — loyalty is optional.'
          : 'It’s a free-for-all, so aim before you fire: click a rival castle to make it your target.'
      }
    >
      <div className={`howto-target${locked ? ' howto-target--locked' : ''}`}>
        <DemoDummyCastle
          name="Sir Practiceton"
          kingdomId="fire"
          color="#ff6b4a"
          hp={sandbox.dummy.hp}
          maxHp={sandbox.dummy.maxHp}
          shield={sandbox.dummy.shield}
          statuses={sandbox.dummy.statuses}
          eliminated={sandbox.dummy.eliminated}
          isYourTarget={locked}
          onSelect={() => sandbox.selectTarget(!locked)}
        />
        {!locked && (
          <p className="howto-target__hint" data-testid="target-hint">
            ☝ Click the castle
          </p>
        )}
      </div>
    </TutorialStep>
  )
}
