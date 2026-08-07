import { useCallback, useEffect, useMemo, useRef } from 'react'
import './KitsuneRushOverlay.css'

// Kitsune Rush, from the Kitsune player's OWN side. For the fifteen seconds the
// Rush runs, blue foxfire is DRAWN across their screen — each streak, swirl and
// loop starting from a point and extending along its own path as though traced
// by hand, holding a moment, then fading.
//
// Two things make it read as drawing rather than as decoration:
//
//   • the stroke itself grows. `pathLength="100"` normalises every path to the
//     same 100 units whatever its real geometry, so one dash animation draws a
//     long streak and a tight loop at the same rate without per-shape maths.
//   • it never repeats in the same place. When a mark finishes it is MOVED —
//     new position, angle, size and shape — before it is drawn again, so the
//     screen fills with foxfire appearing all over rather than a fixed set of
//     marks blinking on and off in their sockets.
//
// The repositioning is driven off `animationiteration` rather than a timer:
// the browser tells us exactly when a cycle ends, so a mark can never be moved
// out from under itself mid-draw.
//
// It is deliberately theirs alone. Everyone else sees the ring of foxes lapping
// the Kitsune castle (the Pixi layer); this is what it feels like to be the one
// moving at double speed, so it goes on the caster's screen and nobody else's.
//
// Nothing here is interactive and nothing occludes a decision: the marks are
// thin, brief and `pointer-events: none`, so the battlefield and every control
// stay readable underneath.

/**
 * How many marks exist at all.
 *
 * Deliberately small. Each one also spends the last quarter of its cycle faded
 * out (see the stylesheet), so at any moment three or four are actually on
 * screen and they visibly take turns — one fading as another is drawn. A
 * screenful of strokes reads as noise and hides the battlefield the buff is
 * supposed to be helping the player fight on.
 */
const MARK_COUNT = 5

type MarkKind = 'streak' | 'swirl' | 'loop'

/**
 * The three shapes foxfire draws, each authored in a 100×100 box.
 *
 * Every one is a single continuous stroke — a shape made of several subpaths
 * would draw all of them at once and lose the sense of one line being traced.
 */
const PATHS: Record<MarkKind, string[]> = {
  // Long tapering tears.
  streak: [
    'M 2 74 Q 42 52 98 26',
    'M 2 30 Q 56 44 98 70',
    'M 4 88 C 34 40, 66 60, 96 14',
  ],
  // A curl that doubles back on itself.
  swirl: [
    'M 6 78 C 34 96 74 88 82 58 C 88 34 62 20 46 34 C 32 46 40 66 58 64',
    'M 94 22 C 66 4 26 12 18 42 C 12 66 38 80 54 66 C 68 54 60 34 42 36',
  ],
  // A closed loop with a tail running out of it.
  loop: [
    'M 10 90 C 40 74 78 78 84 52 C 90 26 56 12 40 30 C 26 46 44 66 66 58 C 84 52 94 34 96 12',
    'M 90 88 C 60 76 22 76 16 50 C 10 24 46 10 62 28 C 76 44 58 66 36 58 C 18 52 8 32 6 10',
  ],
}

const KINDS: MarkKind[] = ['streak', 'streak', 'streak', 'swirl', 'loop']
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)]!

/** Where and how one mark is drawn. Regenerated every time it finishes. */
interface Placement {
  kind: MarkKind
  d: string
  left: number
  top: number
  size: number
  rotate: number
  seconds: number
}

function place(): Placement {
  const kind = pick(KINDS)
  return {
    kind,
    d: pick(PATHS[kind]),
    // Anywhere on screen. Slightly overscanned so a mark can run off an edge
    // instead of every one sitting politely inside the frame.
    left: -8 + Math.random() * 116,
    top: -8 + Math.random() * 116,
    size: 22 + Math.random() * 26,
    rotate: Math.random() * 360,
    // Unhurried. A stroke drawn over three or four seconds reads as a hand
    // moving; the same stroke in under a second reads as a flicker, and five of
    // them flickering at once is the chaos this used to be. Streaks are still
    // the quicker of the two — they are speed lines — but only relatively.
    seconds: kind === 'streak' ? 2.6 + Math.random() * 0.6 : 3.4 + Math.random() * 0.8,
  }
}

export function KitsuneRushOverlay({ active }: { active: boolean }) {
  // The first placements. Everything after this is applied imperatively on
  // each mark's own `animationiteration`, so a redraw never disturbs the
  // others mid-stroke.
  const initial = useMemo(
    () => (active ? Array.from({ length: MARK_COUNT }, place) : []),
    [active],
  )
  const nodes = useRef<(HTMLDivElement | null)[]>([])

  /** Writes a placement onto a mark's DOM node. */
  const apply = useCallback((el: HTMLDivElement, p: Placement) => {
    el.style.left = `${p.left.toFixed(1)}%`
    el.style.top = `${p.top.toFixed(1)}%`
    el.style.width = `${p.size.toFixed(1)}vmax`
    el.style.height = `${p.size.toFixed(1)}vmax`
    el.style.transform = `rotate(${Math.round(p.rotate)}deg)`
    el.style.animationDuration = `${p.seconds.toFixed(2)}s`
    el.dataset.kind = p.kind
    const path = p.d
    for (const node of el.querySelectorAll('path')) node.setAttribute('d', path)
  }, [])

  useEffect(() => {
    if (initial.length === 0) return
    const cleanups: (() => void)[] = []
    initial.forEach((_, i) => {
      const el = nodes.current[i]
      if (!el) return
      // Each finished stroke is redrawn somewhere new. Listening for the
      // iteration boundary means the move always lands between cycles.
      const onIteration = () => apply(el, place())
      el.addEventListener('animationiteration', onIteration)
      cleanups.push(() => el.removeEventListener('animationiteration', onIteration))
    })
    return () => cleanups.forEach((fn) => fn())
  }, [initial, apply])

  if (!active) return null

  return (
    <div className="kitsune-rush" data-testid="kitsune-rush-overlay" aria-hidden="true">
      {/* The sapphire wash — a breathing vignette that never covers the centre. */}
      <div className="kitsune-rush__wash" />
      {initial.map((p, i) => (
        <div
          key={i}
          ref={(el) => {
            nodes.current[i] = el
          }}
          className="kitsune-rush__mark"
          data-kind={p.kind}
          style={{
            left: `${p.left.toFixed(1)}%`,
            top: `${p.top.toFixed(1)}%`,
            width: `${p.size.toFixed(1)}vmax`,
            height: `${p.size.toFixed(1)}vmax`,
            transform: `rotate(${Math.round(p.rotate)}deg)`,
            animationDuration: `${p.seconds.toFixed(2)}s`,
            // Spread EVENLY across the cycle rather than randomly, with only a
            // little jitter. Random delays clump — several marks land on nearly
            // the same offset and the screen pulses full and then empty. An even
            // spread is what makes them hand over to one another.
            animationDelay: `${((i * 0.72) + Math.random() * 0.25).toFixed(2)}s`,
          }}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Drawn twice: a wide soft bloom under a bright thin core, which
                is what makes a flat stroke read as burning rather than ink.
                `pathLength` normalises every shape to 100 units, so one dash
                animation traces a long streak and a tight loop alike. */}
            <path className="kitsune-rush__glow" d={p.d} pathLength={100} />
            <path className="kitsune-rush__core" d={p.d} pathLength={100} />
          </svg>
        </div>
      ))}
    </div>
  )
}
