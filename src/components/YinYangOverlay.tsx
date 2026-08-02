import './YinYangOverlay.css'

// Dark's Yin and Yang, from the VICTIM's side. The taijitu turns slowly in the
// middle of their screen for as long as the wager runs.
//
// There is deliberately NO text here — no side named, no hint, no countdown.
// The entire ability is that the victim does not know which way the bet was
// placed: telling them whether to hire or hold would hand them the answer. All
// they get is the symbol, and the knowledge that a decision is riding on what
// they do next.

export function YinYangOverlay({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <div className="yinyang" data-testid="yinyang-overlay" aria-hidden="true">
      <svg className="yinyang__symbol" viewBox="-110 -110 220 220">
        {/* The white half is the whole disc; the black half is laid over it. */}
        <circle cx="0" cy="0" r="100" fill="#f7f7f2" />
        <path d="M 0 -100 A 100 100 0 0 1 0 100 A 50 50 0 0 1 0 0 A 50 50 0 0 0 0 -100 Z" fill="#0b0b12" />
        {/* Each half carries a dot of the other. */}
        <circle cx="0" cy="-50" r="16" fill="#0b0b12" />
        <circle cx="0" cy="50" r="16" fill="#f7f7f2" />
        <circle cx="0" cy="0" r="100" fill="none" stroke="#8a8a99" strokeWidth="4" />
      </svg>
    </div>
  )
}
