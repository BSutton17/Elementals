import { useEffect, useState, type ReactElement } from 'react'
import { ProgressDots } from '../components/tutorial/ProgressDots'
import { ThroneStep } from '../components/tutorial/steps/ThroneStep'
import { ArenaStep } from '../components/tutorial/steps/ArenaStep'
import { EconomyStep } from '../components/tutorial/steps/EconomyStep'
import { TargetStep } from '../components/tutorial/steps/TargetStep'
import { ArsenalStep } from '../components/tutorial/steps/ArsenalStep'
import { TricksStep } from '../components/tutorial/steps/TricksStep'
import { DefenseStep } from '../components/tutorial/steps/DefenseStep'
import { KingdomsStep } from '../components/tutorial/steps/KingdomsStep'
import { SendOffStep } from '../components/tutorial/steps/SendOffStep'
import { markTutorialSeen } from '../game/tutorial'
import './HowToPlay.css'

// The How to Play walkthrough: a full-screen, paged overlay that teaches the
// game as an animated storybook with hands-on demos. Client-only — every demo
// runs on the local tutorial sandbox, never the socket.

interface StepApi {
  onClose: () => void
}

const STEPS: ReadonlyArray<{
  id: string
  label: string
  render: (api: StepApi) => ReactElement
}> = [
  { id: 'throne', label: 'Welcome', render: () => <ThroneStep /> },
  { id: 'arena', label: 'The Arena', render: () => <ArenaStep /> },
  { id: 'economy', label: 'Gold & Citizens', render: () => <EconomyStep /> },
  { id: 'target', label: 'Targeting', render: () => <TargetStep /> },
  { id: 'arsenal', label: 'Your Arsenal', render: () => <ArsenalStep /> },
  { id: 'tricks', label: 'Elemental Tricks', render: () => <TricksStep /> },
  { id: 'defense', label: 'Defense', render: () => <DefenseStep /> },
  { id: 'kingdoms', label: 'The Kingdoms', render: () => <KingdomsStep /> },
  {
    id: 'sendoff',
    label: 'Ready',
    render: ({ onClose }) => <SendOffStep onClose={onClose} />,
  },
]

export function HowToPlay({ onClose }: { onClose: () => void }) {
  // Track [page, direction] together so the enter animation knows which way
  // the page is travelling (forward slides left, back slides right).
  const [[index, dir], setNav] = useState<[number, number]>([0, 1])
  const step = STEPS[index]
  const isLast = index === STEPS.length - 1

  const goTo = (next: number) => {
    if (next < 0 || next >= STEPS.length) return
    setNav(([cur]) => [next, next >= cur ? 1 : -1])
  }

  // Opening the walkthrough counts as having seen it (stops the menu nudge).
  useEffect(() => {
    markTutorialSeen()
  }, [])

  // Keyboard: arrows page, Escape leaves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') setNav(([cur]) => (cur < STEPS.length - 1 ? [cur + 1, 1] : [cur, 1]))
      else if (e.key === 'ArrowLeft') setNav(([cur]) => (cur > 0 ? [cur - 1, -1] : [cur, -1]))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="howto" role="dialog" aria-modal="true" aria-label="How to play">
      <div className="howto__backdrop" onClick={onClose} />
      <div className="howto__panel">
        <button
          type="button"
          className="howto__skip"
          onClick={onClose}
          aria-label="Close tutorial"
        >
          Skip ✕
        </button>

        {/* Re-key the page on index so the enter animation replays. */}
        <div
          key={step.id}
          className={`howto__page howto__page--${dir >= 0 ? 'fwd' : 'back'}`}
          data-testid={`howto-page-${step.id}`}
        >
          {step.render({ onClose })}
        </div>

        <footer className="howto__nav">
          <button
            type="button"
            className="howto__nav-btn"
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
          >
            ← Back
          </button>

          <ProgressDots
            labels={STEPS.map((s) => s.label)}
            index={index}
            onSelect={goTo}
          />

          {isLast ? (
            <button type="button" className="howto__nav-btn howto__nav-btn--primary" onClick={onClose}>
              Let's Play
            </button>
          ) : (
            <button
              type="button"
              className="howto__nav-btn howto__nav-btn--primary"
              onClick={() => goTo(index + 1)}
            >
              Next →
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
