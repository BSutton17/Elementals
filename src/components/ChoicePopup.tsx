import { useEffect } from 'react'
import './ChoicePopup.css'

// The picker for an ability that must be cast AS something (Dark's Yin and
// Yang). Clicking the card opens this rather than casting: two boxes, each
// naming a side and saying plainly what it punishes, and picking one IS the
// cast — there is no separate confirm.
//
// It is a popup rather than a pair of buttons under the card because the choice
// is the whole ability: the caster is committing to a read of what the victim
// will do next, and that deserves to stop the world for a second.

export interface Choice {
  value: string
  label: string
  hint: string
}

export function ChoicePopup({
  title,
  choices,
  onPick,
  onCancel,
}: {
  /** The ability being cast. */
  title: string
  choices: readonly Choice[]
  onPick: (value: string) => void
  onCancel: () => void
}) {
  // Escape backs out — a half-made decision should never be trapping.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div
      className="choice-popup"
      data-testid="choice-popup"
      role="dialog"
      aria-modal="true"
      aria-label={`Choose a side for ${title}`}
      onClick={onCancel}
    >
      <div className="choice-popup__panel" onClick={(e) => e.stopPropagation()}>
        <span className="choice-popup__title">{title}</span>

        <div className="choice-popup__boxes">
          {choices.map((choice) => (
            <button
              key={choice.value}
              type="button"
              className={`choice-popup__box choice-popup__box--${choice.value}`}
              onClick={() => onPick(choice.value)}
              data-testid={`choice-${choice.value}`}
            >
              <span className="choice-popup__label">{choice.label}</span>
              <span className="choice-popup__hint">{choice.hint}</span>
            </button>
          ))}
        </div>

        <span className="choice-popup__foot">
          They will never be told which you picked.
        </span>
      </div>
    </div>
  )
}
