import { FaCrown } from 'react-icons/fa'
import { TutorialStep } from '../TutorialStep'

// The send-off — a quick recap and a push out the door.

export function SendOffStep({ onClose }: { onClose: () => void }) {
  return (
    <TutorialStep kicker="That's everything" title="Your Throne Awaits">
      <div className="howto-sendoff">
        <span className="howto-sendoff__crown" aria-hidden="true">
          <FaCrown />
        </span>
        <ul className="howto-sendoff__recap">
          <li>Citizens make gold. Gold makes everything else.</li>
          <li>Pick a target, unload your kit, upgrade what works.</li>
          <li>Shields and repairs keep you alive. Use them.</li>
          <li>Be the last castle standing.</li>
        </ul>
        <button
          type="button"
          className="howto__cta"
          onClick={onClose}
          data-testid="sendoff-cta"
        >
          Let's Play
        </button>
      </div>
    </TutorialStep>
  )
}
