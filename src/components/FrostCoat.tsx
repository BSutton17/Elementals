import { useRef, useState } from 'react'
import './FrostCoat.css'

// A frost coating that seals a button while its owner is Frozen (Ice, Epic 9).
// It sits ON TOP of the button (pointer-events:auto) so it both LOOKS frozen and
// INTERCEPTS every click — a frozen button never silently ignores interaction:
// instead of activating, the ice cracks (fracture lines + falling fragments + a
// powdery snow burst + a brief brighten) and then re-freezes.
//
// Layers, all CSS-animated so the UI never looks static for the freeze's
// duration: an edge-frost border that forms first, a translucent ice fill that
// grows in behind it, crystals sprouting from the corners, a slow shimmering
// sheen, drifting snow, and occasional sparkles. Reusable on any button (the
// ability cards and the shop toggle); `small` trims it for compact controls.

const CRACK_MS = 700

export function FrostCoat({ small = false }: { small?: boolean }) {
  const [cracks, setCracks] = useState<number[]>([])
  const nextId = useRef(0)

  const crack = () => {
    const id = nextId.current++
    setCracks((c) => [...c, id])
    window.setTimeout(() => setCracks((c) => c.filter((x) => x !== id)), CRACK_MS)
  }

  return (
    <div
      className={`frost-coat${small ? ' frost-coat--small' : ''}`}
      role="presentation"
      aria-hidden="true"
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        // Swallow the click so the button beneath can never fire, and crack.
        e.preventDefault()
        e.stopPropagation()
        crack()
      }}
    >
      <div className="frost-coat__ice" />
      <div className="frost-coat__border" />
      <span className="frost-coat__crystal frost-coat__crystal--tl" />
      <span className="frost-coat__crystal frost-coat__crystal--tr" />
      <span className="frost-coat__crystal frost-coat__crystal--bl" />
      <span className="frost-coat__crystal frost-coat__crystal--br" />
      <div className="frost-coat__sheen" />
      <span className="frost-coat__snow frost-coat__snow--1" />
      <span className="frost-coat__snow frost-coat__snow--2" />
      <span className="frost-coat__snow frost-coat__snow--3" />
      <span className="frost-coat__sparkle frost-coat__sparkle--1" />
      <span className="frost-coat__sparkle frost-coat__sparkle--2" />

      {cracks.map((id) => (
        <div className="frost-crack" key={id}>
          <div className="frost-crack__flash" />
          <svg className="frost-crack__lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M50 6 L45 40 L55 60 L47 96" />
            <path d="M50 40 L18 28" />
            <path d="M55 58 L86 68" />
            <path d="M45 40 L14 62" />
          </svg>
          <span className="frost-crack__frag frost-crack__frag--1" />
          <span className="frost-crack__frag frost-crack__frag--2" />
          <span className="frost-crack__frag frost-crack__frag--3" />
          <span className="frost-crack__frag frost-crack__frag--4" />
          <span className="frost-crack__puff" />
        </div>
      ))}
    </div>
  )
}
