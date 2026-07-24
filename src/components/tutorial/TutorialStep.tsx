import type { ReactNode } from 'react'

// Shared page frame for every walkthrough step: a kicker line, a big title,
// an optional lead paragraph, then the step's own content (demo or artwork).

interface TutorialStepProps {
  kicker?: string
  title: string
  lead?: ReactNode
  children?: ReactNode
}

export function TutorialStep({ kicker, title, lead, children }: TutorialStepProps) {
  return (
    <section className="howto-step">
      {kicker && <span className="howto-step__kicker">{kicker}</span>}
      <h2 className="howto-step__title">{title}</h2>
      {lead && <p className="howto-step__lead">{lead}</p>}
      {children && <div className="howto-step__body">{children}</div>}
    </section>
  )
}
