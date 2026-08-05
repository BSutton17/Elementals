import { useMemo } from 'react'
import './KitsuneRushOverlay.css'

// Kitsune Rush, from the Kitsune player's OWN side. For the fifteen seconds the
// Rush runs, blue foxfire streams PAST the camera: streaks, swirls and loops
// flying across the screen and tumbling as they go, over a breathing sapphire
// wash.
//
// Flight is the whole point. The ability is "everything you do happens at
// double speed", and marks that merely flash on and off say nothing about
// speed — they read as a status light. Marks that cross the screen and leave
// say you are moving. So every mark here travels: it enters, crosses, and
// exits, and the ones that are supposed to be loops tumble on the way.
//
// It is deliberately theirs alone. Everyone else sees the ring of foxes lapping
// the Kitsune castle (the Pixi layer); this is what it feels like to be the one
// moving at double speed, so it goes on the caster's screen and nobody else's.
//
// Nothing here is interactive and nothing occludes a decision: the marks are
// thin, brief and `pointer-events: none`, so the battlefield and every control
// stay readable underneath. The whole ability is a tempo buff — it must never
// cost the player the ability to read their own board.

/** How many marks are in flight at once. More reads as noise, not speed. */
const MARK_COUNT = 16

type MarkKind = 'streak' | 'swirl' | 'loop'

interface Mark {
  kind: MarkKind
  /** The SVG path, drawn in a 0–100 box and stretched over the mark's box. */
  d: string
  style: React.CSSProperties
}

/**
 * The three shapes foxfire draws, each authored in a 100×100 box.
 *
 * Streaks are drawn along the +x axis so the wrapper can point them at their
 * own direction of travel — a streak crossing the screen sideways to its
 * flight path looks like a scratch on the lens, not like speed.
 */
const PATHS: Record<MarkKind, string[]> = {
  // Long, tapering tears — the speed lines.
  streak: [
    'M 0 52 Q 40 46 100 50',
    'M 0 46 Q 55 58 100 48',
    'M 0 50 L 100 50',
  ],
  // A curl that doubles back on itself.
  swirl: [
    'M 6 78 C 34 96 74 88 82 58 C 88 34 62 20 46 34 C 32 46 40 66 58 64',
    'M 94 22 C 66 4 26 12 18 42 C 12 66 38 80 54 66 C 68 54 60 34 42 36',
  ],
  // A full closed loop with a tail running out of it.
  loop: [
    'M 10 90 C 40 74 78 78 84 52 C 90 26 56 12 40 30 C 26 46 44 66 66 58 C 84 52 94 34 96 12',
    'M 90 88 C 60 76 22 76 16 50 C 10 24 46 10 62 28 C 76 44 58 66 36 58 C 18 52 8 32 6 10',
  ],
}

/**
 * Builds one screen's worth of flying marks.
 *
 * Every random value is baked into inline custom properties at build time
 * rather than left to CSS: keyframe *offsets* cannot read a `var()`, and a
 * `calc()` divisor cannot either, so the animation has to be handed concrete
 * numbers to fly along.
 */
function buildMarks(): Mark[] {
  const kinds: MarkKind[] = ['streak', 'streak', 'streak', 'swirl', 'loop']
  const marks: Mark[] = []

  for (let i = 0; i < MARK_COUNT; i++) {
    const kind = kinds[i % kinds.length]!
    const variants = PATHS[kind]
    const d = variants[Math.floor(Math.random() * variants.length)]!

    // Each mark flies its own line across the screen. Angles are spread around
    // the full circle so the foxfire streams past from every direction at once
    // rather than all one way, which would read as wind instead of speed.
    const angleDeg = Math.random() * 360
    const angle = (angleDeg * Math.PI) / 180
    // Long enough to be well off-screen at both ends, so nothing is ever seen
    // popping into or out of existence mid-air.
    const distance = 150 + Math.random() * 70 // vmax
    const flyX = Math.cos(angle) * distance
    const flyY = Math.sin(angle) * distance

    // Start off-screen on the far side of that line, i.e. it enters, crosses,
    // and leaves. Positioned as a percentage of the viewport.
    const left = 50 - Math.cos(angle) * 60 + (Math.random() * 30 - 15)
    const top = 50 - Math.sin(angle) * 60 + (Math.random() * 30 - 15)

    const size = 18 + Math.random() * 26 // vmax
    // Streaks whip past; loops and swirls take longer so the curl is legible
    // as a shape rather than smearing into another streak.
    const flight = kind === 'streak' ? 0.85 + Math.random() * 0.5 : 1.5 + Math.random() * 0.9
    // A streak points along its own flight path. A loop tumbles instead — it
    // has no "forward", and spinning is what makes it read as tumbling.
    const rot = kind === 'streak' ? angleDeg : Math.random() * 360
    const spin = kind === 'streak' ? 0 : (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 360)

    marks.push({
      kind,
      d,
      style: {
        left: `${left.toFixed(1)}%`,
        top: `${top.toFixed(1)}%`,
        width: `${size.toFixed(1)}vmax`,
        height: `${size.toFixed(1)}vmax`,
        animationDuration: `${flight.toFixed(2)}s`,
        // Staggered across a window a little longer than the longest flight,
        // so the stream is continuous instead of arriving in waves.
        animationDelay: `${(Math.random() * 2.4).toFixed(2)}s`,
        ['--fly-x' as string]: `${flyX.toFixed(1)}vmax`,
        ['--fly-y' as string]: `${flyY.toFixed(1)}vmax`,
        ['--rot' as string]: `${Math.round(rot)}deg`,
        ['--spin' as string]: `${Math.round(spin)}deg`,
        // Grows slightly as it passes — the near edge of the streak sweeping by.
        ['--scale-in' as string]: (0.7 + Math.random() * 0.25).toFixed(2),
        ['--scale-out' as string]: (1.05 + Math.random() * 0.35).toFixed(2),
      },
    })
  }
  return marks
}

export function KitsuneRushOverlay({ active }: { active: boolean }) {
  // Rebuilt only when the Rush starts, so the marks keep their flight paths for
  // the duration instead of being reshuffled on every parent render.
  const marks = useMemo(() => (active ? buildMarks() : []), [active])
  if (!active) return null

  return (
    <div className="kitsune-rush" data-testid="kitsune-rush-overlay" aria-hidden="true">
      {/* The sapphire wash — a breathing vignette that never covers the centre. */}
      <div className="kitsune-rush__wash" />
      {marks.map((mark, i) => (
        <div
          key={i}
          className={`kitsune-rush__mark kitsune-rush__mark--${mark.kind}`}
          style={mark.style}
        >
          <div className="kitsune-rush__spin">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Drawn twice: a wide soft bloom under a bright thin core, which
                  is what makes a flat stroke read as burning rather than ink. */}
              <path className="kitsune-rush__glow" d={mark.d} />
              <path className="kitsune-rush__core" d={mark.d} />
            </svg>
          </div>
        </div>
      ))}
    </div>
  )
}
