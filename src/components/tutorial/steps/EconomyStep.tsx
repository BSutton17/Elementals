import { GiReceiveMoney } from 'react-icons/gi'
import { IoMdPeople } from 'react-icons/io'
import { TutorialStep } from '../TutorialStep'
import { useTutorialSandbox } from '../../../game/useTutorialSandbox'

// Page 3 — the economy, live. Gold ticks up in front of the player; hiring a
// citizen visibly raises the income rate. First taste of "clicking works".

export function EconomyStep() {
  const sandbox = useTutorialSandbox()
  const canAfford = sandbox.currency >= sandbox.nextCitizenCost

  return (
    <TutorialStep
      kicker="Lesson one"
      title="Gold Makes the Kingdom Go Round"
      lead="Your citizens quietly fill the vault every second. Gold pays for attacks, shields, repairs, upgrades — everything. More citizens, faster gold."
    >
      <div className="howto-economy">
        <div className="howto-economy__vault" data-testid="economy-vault">
          <span className="howto-economy__icon" aria-hidden="true">
            <GiReceiveMoney />
          </span>
          <span className="howto-economy__gold" data-testid="economy-gold">
            {Math.floor(sandbox.currency)}g
          </span>
          <span className="howto-economy__rate">+{sandbox.incomePerSecond.toFixed(1)}/s</span>
        </div>

        <div className="howto-economy__citizens" aria-label={`${sandbox.citizens} citizens`}>
          {Array.from({ length: Math.min(sandbox.citizens, 18) }).map((_, i) => (
            <span key={i} className="howto-economy__citizen" aria-hidden="true">
              <IoMdPeople />
            </span>
          ))}
          <span className="howto-economy__citizen-count">{sandbox.citizens} citizens</span>
        </div>

        <button
          type="button"
          className="howto__cta howto__cta--small"
          disabled={!canAfford}
          onClick={() => sandbox.buyItem('citizen')}
          data-testid="hire-citizen"
        >
          Hire Citizen ({sandbox.nextCitizenCost}g)
        </button>

        <p className="howto-step__footnote">
          Try it — watch the +/s climb. Each new hire costs a little more than the last.
        </p>
      </div>
    </TutorialStep>
  )
}
