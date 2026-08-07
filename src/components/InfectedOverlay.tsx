import { useEffect, useState } from 'react'
import './InfectedOverlay.css'

// Insects' "Infected", on the victim's own screen.
//
// For fifteen seconds every attack they fumble rebounds into their own castle,
// and Butterflies is already making half of those attacks go wide. This is what
// that feels like from the inside: they cannot focus, and they are the reason
// their own swings are missing.
//
// The disorientation is built from THREE things, because a flat blur just reads
// as a broken renderer:
//
//   • an uneven blur — the whole screen is soft, and a heavier patch of blur
//     wanders slowly across it, so nothing stays legible for long.
//   • the focus itself breathing in and out, so the eye keeps trying to adjust
//     and never settles.
//   • faint magenta and green fringing drifting in opposite directions, which
//     is what makes it read as sickness rather than as fog.
//
// Deliberately NOT opaque and deliberately mild. The victim has to keep playing
// through it for fifteen seconds — the ability is meant to make fighting back
// unpleasant and error-prone, not to take their screen away. Click-through, so
// it never eats an action.

/** Held mounted through the fade so the sickness lifts rather than blinks. */
const FADE_OUT_MS = 1200

export function InfectedOverlay({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(active)

  useEffect(() => {
    if (active) {
      setVisible(true)
      return
    }
    const timer = setTimeout(() => setVisible(false), FADE_OUT_MS)
    return () => clearTimeout(timer)
  }, [active])

  if (!visible) return null

  return (
    <div
      className={`infected-overlay${active ? ' infected-overlay--on' : ''}`}
      data-testid="infected-overlay"
      aria-hidden="true"
    >
      {/* The base softening, breathing in and out. */}
      <div className="infected-overlay__blur" />
      {/* A heavier patch of blur that wanders — transforming a backdrop-filter
          element moves the REGION it samples, so the out-of-focus area drifts
          across the board rather than sitting still. */}
      <div className="infected-overlay__swim" />
      {/* Colour separation, the two halves pulling apart. */}
      <div className="infected-overlay__fringe infected-overlay__fringe--magenta" />
      <div className="infected-overlay__fringe infected-overlay__fringe--green" />
      {/* A sickly wash so the whole thing is tinted, not merely soft. */}
      <div className="infected-overlay__wash" />
    </div>
  )
}
