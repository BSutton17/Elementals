import { useEffect, useState } from 'react'
import './DarkenedOverlay.css'

// Dark's "Night terrors" passive: attacking Dark risks having your OWN screen
// swallowed for a few seconds (status `darkened`). Victim-only and purely
// cosmetic — click-through, so you can still act, you just can't see much.
//
// Two stacked layers sell it as a closing darkness rather than a flat dim:
// a heavy full-screen wash, and a vignette that squeezes inward from the edges
// so the readable area collapses toward the centre. Both crawl slightly while
// active, so the dark feels alive rather than like a paused screenshot.

const FADE_OUT_MS = 900

export function DarkenedOverlay({ active }: { active: boolean }) {
  // Kept mounted through the fade-out so the darkness lifts rather than blinks.
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
      className={`darkened-overlay${active ? ' darkened-overlay--on' : ''}`}
      data-testid="darkened-overlay"
      aria-hidden="true"
    >
      <div className="darkened-overlay__wash" />
      <div className="darkened-overlay__vignette" />
    </div>
  )
}
