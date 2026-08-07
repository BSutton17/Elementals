import { useEffect, useState } from 'react'
import './CapriceButterfly.css'

// Insects' "Caprice": a giant butterfly holds the middle of the battlefield.
//
// It is meant to stop the room. While it is there nobody chooses their own
// fight, so the butterfly has to be the obvious reason — big, slow, and far too
// beautiful to be mistaken for a status icon.
//
// The look is built around ONE idea: the wing is a gradient running from deep
// violet where it meets the body out to a luminous teal-green at the tips. That
// transition is the whole identity — not the silhouette, not the pattern — so
// each side gets its own gradient, mirrored, rather than one shared fill that
// would run the same way on both wings and put the dark edge outside on one of
// them.
//
// Everything else is delicacy: translucent membrane, fine vein tracery instead
// of heavy markings, and a scatter of smaller butterflies drifting around it.
// Drawn in the arena SVG so it shares the battlefield's coordinate space.

/** Arena-space centre of the battlefield. */
const CX = 500
const CY = 500

/**
 * The companion butterflies. Each one is placed, then given its own slow drift
 * and its own much faster wingbeat — the two rhythms are deliberately unrelated
 * so the scatter never pulses together.
 */
interface Mote {
  /** Where it sits, relative to the centre. */
  x: number
  y: number
  scale: number
  spin: number
  /** How far it wanders from that spot, and how long a round trip takes. */
  driftX: number
  driftY: number
  driftSeconds: number
  /** Its own wingbeat — fast, and never in step with its neighbours. */
  flutterSeconds: number
  delay: number
}

const MOTES: readonly Mote[] = [
  { x: -300, y: -140, scale: 0.13, spin: -18, driftX: 54, driftY: -38, driftSeconds: 11, flutterSeconds: 0.62, delay: 0 },
  { x: 280, y: -186, scale: 0.11, spin: 22, driftX: -46, driftY: 44, driftSeconds: 13.5, flutterSeconds: 0.48, delay: -2.1 },
  { x: -236, y: 150, scale: 0.1, spin: 14, driftX: 62, driftY: 30, driftSeconds: 9.5, flutterSeconds: 0.71, delay: -4.4 },
  { x: 318, y: 96, scale: 0.12, spin: -26, driftX: -38, driftY: -52, driftSeconds: 12.5, flutterSeconds: 0.55, delay: -1.3 },
  { x: -88, y: -252, scale: 0.09, spin: 8, driftX: 40, driftY: 58, driftSeconds: 10.5, flutterSeconds: 0.44, delay: -6.2 },
  { x: 150, y: 232, scale: 0.1, spin: -12, driftX: -58, driftY: -34, driftSeconds: 14, flutterSeconds: 0.66, delay: -3.7 },
]

/**
 * Drifting motes of light around the butterfly — the enchanted-forest layer.
 *
 * A fixed, hand-seeded scatter rather than `Math.random` at render time: these
 * are decoration, and a stable field is reproducible and screenshot-testable
 * where a fresh one every cast is neither.
 */
interface Pollen {
  x: number
  y: number
  r: number
  /** How far it drifts, and over how long. Biased upward — motes rise. */
  dx: number
  dy: number
  dur: number
  delay: number
  /** Which of the three palette lights it carries. */
  hue: string
}

const POLLEN: readonly Pollen[] = [
  { x: 401, y: 73, r: 2.8, dx: -41, dy: -40, dur: 11.3, delay: -5.6, hue: 'a' },
  { x: 343, y: -239, r: 4.7, dx: -41, dy: -30, dur: 13.0, delay: -7.3, hue: 'a' },
  { x: 322, y: 177, r: 4.5, dx: 0, dy: -65, dur: 7.5, delay: -5.1, hue: 'c' },
  { x: -337, y: -116, r: 4.3, dx: -44, dy: -24, dur: 8.0, delay: -6.5, hue: 'a' },
  { x: -230, y: 88, r: 3.2, dx: 8, dy: -22, dur: 15.2, delay: -1.6, hue: 'a' },
  { x: 126, y: 246, r: 4.0, dx: -40, dy: -54, dur: 14.1, delay: -6.5, hue: 'c' },
  { x: 254, y: 123, r: 2.4, dx: 30, dy: -39, dur: 13.8, delay: -9.9, hue: 'b' },
  { x: -273, y: -189, r: 4.2, dx: 7, dy: -63, dur: 8.8, delay: -0.8, hue: 'a' },
  { x: -65, y: -201, r: 4.7, dx: 31, dy: -22, dur: 9.4, delay: -5.8, hue: 'c' },
  { x: 328, y: -121, r: 3.9, dx: 26, dy: -44, dur: 14.3, delay: -11.9, hue: 'b' },
  { x: -74, y: -356, r: 2.1, dx: 42, dy: -57, dur: 14.4, delay: -11.6, hue: 'a' },
  { x: 395, y: -83, r: 3.5, dx: 31, dy: -42, dur: 10.1, delay: -1.7, hue: 'c' },
  { x: 199, y: -157, r: 4.7, dx: 1, dy: -44, dur: 15.9, delay: -1.0, hue: 'a' },
  { x: 109, y: -293, r: 3.2, dx: -44, dy: -60, dur: 14.9, delay: -3.3, hue: 'c' },
  { x: -262, y: -49, r: 4.8, dx: -24, dy: -57, dur: 11.5, delay: -11.8, hue: 'a' },
  { x: -241, y: 111, r: 4.2, dx: -7, dy: -50, dur: 14.3, delay: -3.5, hue: 'b' },
  { x: -412, y: -153, r: 2.8, dx: 46, dy: -59, dur: 7.3, delay: -5.4, hue: 'c' },
  { x: -307, y: 220, r: 1.6, dx: 40, dy: -61, dur: 9.7, delay: -7.5, hue: 'c' },
  { x: 315, y: -71, r: 3.0, dx: 39, dy: -29, dur: 13.3, delay: -1.3, hue: 'b' },
  { x: -433, y: -101, r: 2.9, dx: -32, dy: -28, dur: 12.5, delay: -3.0, hue: 'c' },
  { x: -286, y: 131, r: 3.1, dx: 43, dy: -40, dur: 7.5, delay: -8.0, hue: 'a' },
  { x: -162, y: 109, r: 4.7, dx: 25, dy: -34, dur: 11.4, delay: -6.7, hue: 'a' },
  { x: -398, y: 158, r: 2.4, dx: -9, dy: -40, dur: 8.4, delay: -1.0, hue: 'a' },
  { x: 197, y: 150, r: 2.8, dx: 17, dy: -42, dur: 15.3, delay: -1.2, hue: 'a' },
  { x: 88, y: -287, r: 3.3, dx: -7, dy: -32, dur: 9.8, delay: -11.3, hue: 'a' },
  { x: -201, y: 340, r: 2.2, dx: 10, dy: -46, dur: 11.7, delay: -3.4, hue: 'a' },
]

/**
 * The spawn: pink and green motes gather in a ring, rush together, and blow
 * back out as the butterfly arrives.
 *
 * How long the whole arrival takes. The layer is unmounted afterwards rather
 * than left sitting invisible for the remaining twenty-odd seconds.
 */
const SPAWN_MS = 2400

interface Spark {
  /** Where it forms up, on the ring. */
  ringX: number
  ringY: number
  /** Where it is thrown on the burst — a different angle, so the explosion
   *  scatters rather than retracing the way it came in. */
  burstX: number
  burstY: number
  r: number
  delay: number
  hue: 'pink' | 'green' | 'pale'
}

/**
 * Deterministic rather than `Math.random`: the same reasoning as the pollen
 * field above — a stable arrangement is reproducible and screenshot-testable,
 * and nobody watching a two-second burst can tell it is the same every cast.
 *
 * The delay rises with the angle, so the ring is DRAWN around the circle
 * instead of appearing all at once, and the convergence inherits that sweep.
 */
const SPARKS: readonly Spark[] = Array.from({ length: 44 }, (_, i) => {
  const n = 44
  const angle = (i / n) * Math.PI * 2
  const ringR = 296 + (i % 5) * 20
  // Kicked off its inbound line by a few degrees, and thrown much further.
  const burstAngle = angle + (((i % 7) - 3) * Math.PI) / 90
  const burstR = 540 + (i % 6) * 46
  return {
    ringX: Math.round(Math.cos(angle) * ringR),
    ringY: Math.round(Math.sin(angle) * ringR),
    burstX: Math.round(Math.cos(burstAngle) * burstR),
    burstY: Math.round(Math.sin(burstAngle) * burstR),
    r: 3 + (i % 4) * 1.6,
    delay: Number(((i / n) * 0.34).toFixed(3)),
    hue: i % 3 === 0 ? 'pink' : i % 3 === 1 ? 'green' : 'pale',
  }
})

function SpawnBurst() {
  return (
    <g className="caprice__spawn" data-testid="caprice-spawn">
      {SPARKS.map((s, i) => (
        <circle
          key={i}
          className={`caprice__spark caprice__spark--${s.hue}`}
          cx={CX}
          cy={CY}
          r={s.r}
          style={
            {
              animationDelay: `${s.delay}s`,
              ['--ring-x' as string]: `${s.ringX}px`,
              ['--ring-y' as string]: `${s.ringY}px`,
              ['--burst-x' as string]: `${s.burstX}px`,
              ['--burst-y' as string]: `${s.burstY}px`,
            } as React.CSSProperties
          }
        />
      ))}
      {/* The shock of light at the moment they meet. */}
      <circle className="caprice__flash" cx={CX} cy={CY} r={90} />
    </g>
  )
}

/** One wing pair, mirrored by `side`. Shapes are authored for the left and
 *  flipped, so the two are exactly symmetrical. */
function Wing({ side }: { side: -1 | 1 }) {
  const s = side
  const fill = side === -1 ? 'url(#caprice-wing-l)' : 'url(#caprice-wing-r)'
  const lower = side === -1 ? 'url(#caprice-lower-l)' : 'url(#caprice-lower-r)'
  return (
    <g className={`caprice__wing caprice__wing--${side === -1 ? 'left' : 'right'}`}>
      {/* Forewing: long, softly scalloped, sweeping up and back. */}
      <path
        className="caprice__fore"
        d={`M ${CX} ${CY - 26}
            C ${CX + s * 120} ${CY - 232}, ${CX + s * 272} ${CY - 246}, ${CX + s * 318} ${CY - 128}
            C ${CX + s * 350} ${CY - 44}, ${CX + s * 264} ${CY + 22}, ${CX + s * 150} ${CY + 26}
            C ${CX + s * 78} ${CY + 28}, ${CX + s * 24} ${CY + 6}, ${CX} ${CY - 26} Z`}
        fill={fill}
      />
      {/* Hindwing: rounder and shorter, with the trailing lobe Shinobu's
          butterflies are usually drawn with. */}
      <path
        className="caprice__hind"
        d={`M ${CX} ${CY + 4}
            C ${CX + s * 116} ${CY + 30}, ${CX + s * 208} ${CY + 118}, ${CX + s * 160} ${CY + 212}
            C ${CX + s * 128} ${CY + 272}, ${CX + s * 44} ${CY + 250}, ${CX + s * 26} ${CY + 168}
            C ${CX + s * 16} ${CY + 118}, ${CX + s * 8} ${CY + 62}, ${CX} ${CY + 4} Z`}
        fill={lower}
      />

      {/* Vein tracery — fine lines fanning from the body toward the tips.
          Delicacy rather than markings: heavy eyespots would fight the
          gradient, which is the thing actually doing the work here. */}
      <path className="caprice__vein" d={`M ${CX + s * 14} ${CY - 22} C ${CX + s * 130} ${CY - 150}, ${CX + s * 240} ${CY - 178}, ${CX + s * 296} ${CY - 136}`} />
      <path className="caprice__vein" d={`M ${CX + s * 14} ${CY - 14} C ${CX + s * 128} ${CY - 96}, ${CX + s * 246} ${CY - 108}, ${CX + s * 314} ${CY - 92}`} />
      <path className="caprice__vein" d={`M ${CX + s * 14} ${CY - 6} C ${CX + s * 122} ${CY - 40}, ${CX + s * 236} ${CY - 30}, ${CX + s * 296} ${CY - 22}`} />
      <path className="caprice__vein" d={`M ${CX + s * 12} ${CY + 22} C ${CX + s * 96} ${CY + 76}, ${CX + s * 156} ${CY + 146}, ${CX + s * 140} ${CY + 196}`} />
      <path className="caprice__vein" d={`M ${CX + s * 10} ${CY + 40} C ${CX + s * 66} ${CY + 92}, ${CX + s * 92} ${CY + 160}, ${CX + s * 74} ${CY + 214}`} />

      {/* A few soft lights caught in the membrane. */}
      <ellipse className="caprice__spot" cx={CX + s * 244} cy={CY - 128} rx={26} ry={19} />
      <ellipse className="caprice__spot caprice__spot--small" cx={CX + s * 168} cy={CY - 62} rx={15} ry={11} />
      <ellipse className="caprice__spot caprice__spot--small" cx={CX + s * 118} cy={CY + 168} rx={17} ry={13} />
    </g>
  )
}

export function CapriceButterfly({ active }: { active: boolean }) {
  // The arrival plays once, then the whole layer goes away. Keyed off `active`
  // so a second cast later in the match spawns it again rather than having the
  // butterfly simply reappear. The hook runs before the early return below —
  // bailing out first would make it conditional.
  const [arriving, setArriving] = useState(true)
  useEffect(() => {
    if (!active) return
    setArriving(true)
    const id = window.setTimeout(() => setArriving(false), SPAWN_MS)
    return () => window.clearTimeout(id)
  }, [active])

  if (!active) return null

  return (
    <g className="caprice" data-testid="caprice-butterfly" aria-hidden="true">
      <defs>
        {/* The wing. Violet where it meets the body, out through indigo and
            cyan to a luminous pale green at the tip — mirrored per side so the
            dark end is always the one against the body. */}
        <linearGradient id="caprice-wing-l" x1="100%" y1="60%" x2="0%" y2="10%">
          <stop offset="0%" stopColor="#3b0764" />
          <stop offset="26%" stopColor="#6d28d9" />
          <stop offset="52%" stopColor="#7c3aed" />
          <stop offset="76%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#bbf7d0" />
        </linearGradient>
        <linearGradient id="caprice-wing-r" x1="0%" y1="60%" x2="100%" y2="10%">
          <stop offset="0%" stopColor="#3b0764" />
          <stop offset="26%" stopColor="#6d28d9" />
          <stop offset="52%" stopColor="#7c3aed" />
          <stop offset="76%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#bbf7d0" />
        </linearGradient>
        {/* The hindwings run the same way but deeper and greener. */}
        <linearGradient id="caprice-lower-l" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2e1065" />
          <stop offset="40%" stopColor="#5b21b6" />
          <stop offset="74%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#a7f3d0" />
        </linearGradient>
        <linearGradient id="caprice-lower-r" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2e1065" />
          <stop offset="40%" stopColor="#5b21b6" />
          <stop offset="74%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#a7f3d0" />
        </linearGradient>
        {/* The glow it sits in — the reason the eye goes to the middle. */}
        <radialGradient id="caprice-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(124, 58, 237, 0.36)" />
          <stop offset="50%" stopColor="rgba(34, 211, 238, 0.16)" />
          <stop offset="100%" stopColor="rgba(167, 243, 208, 0)" />
        </radialGradient>
      </defs>

      <circle className="caprice__halo" cx={CX} cy={CY} r={380} fill="url(#caprice-halo)" />

      {arriving && <SpawnBurst />}

      {/* The reveal is its own group, wrapping the drift rather than sharing an
          element with it. Two CSS animations on one element cannot both drive
          `transform` — the later one simply wins — so the arrival scale and the
          endless hover have to live on separate nodes. */}
      <g className="caprice__reveal">
        <g className="caprice__body-group">
          <Wing side={-1} />
          <Wing side={1} />

          {/* Body: slim and dark, so the wings carry everything. */}
          <ellipse className="caprice__thorax" cx={CX} cy={CY - 34} rx={15} ry={30} />
          <ellipse className="caprice__abdomen" cx={CX} cy={CY + 62} rx={11} ry={84} />
          <ellipse className="caprice__head" cx={CX} cy={CY - 68} rx={13} ry={12} />

          {/* Antennae — on their own slower rhythm, so it reads as curious
              rather than as part of the wingbeat. */}
          <g className="caprice__antennae">
            <path
              className="caprice__antenna"
              d={`M ${CX - 5} ${CY - 78} C ${CX - 42} ${CY - 140}, ${CX - 78} ${CY - 162}, ${CX - 104} ${CY - 146}`}
            />
            <circle className="caprice__club" cx={CX - 104} cy={CY - 146} r={7} />
            <path
              className="caprice__antenna"
              d={`M ${CX + 5} ${CY - 78} C ${CX + 42} ${CY - 140}, ${CX + 78} ${CY - 162}, ${CX + 104} ${CY - 146}`}
            />
            <circle className="caprice__club" cx={CX + 104} cy={CY - 146} r={7} />
          </g>
        </g>
      </g>

      {/* Motes of light drifting through the whole scene. Small, slow and
          everywhere — this is the layer that turns a butterfly on a dark
          background into a clearing in an enchanted forest.

          Drawn on `<circle>`, which positions by cx/cy rather than by a
          transform attribute, so the drift animation can sit directly on the
          element with nothing to collide with. */}
      <g className="caprice__pollen">
        {POLLEN.map((mote, i) => (
          <circle
            key={i}
            className={`caprice__mote-light caprice__mote-light--${mote.hue}`}
            cx={CX + mote.x}
            cy={CY + mote.y}
            r={mote.r}
            style={
              {
                animationDuration: `${mote.dur}s`,
                animationDelay: `${mote.delay}s`,
                ['--pollen-x' as string]: `${mote.dx}px`,
                ['--pollen-y' as string]: `${mote.dy}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </g>

      {/* A scatter of smaller butterflies flying around it. Shinobu's are never
          alone, and a single insect however large reads as a specimen — the
          swarm is what makes it mystical.

          Three nested groups, and the nesting is load-bearing: a CSS transform
          animation OVERRIDES an SVG `transform` attribute outright, so the
          drift, the placement and the wingbeat cannot share an element. Drift
          is outermost (in arena units, before the scale), placement is the
          attribute in the middle, and the beat is innermost. */}
      <g className="caprice__motes">
        {MOTES.map((mote, i) => (
          <g
            key={i}
            className="caprice__mote"
            style={
              {
                animationDuration: `${mote.driftSeconds}s`,
                animationDelay: `${mote.delay}s`,
                ['--drift-x' as string]: `${mote.driftX}px`,
                ['--drift-y' as string]: `${mote.driftY}px`,
              } as React.CSSProperties
            }
          >
            <g transform={`translate(${CX + mote.x} ${CY + mote.y}) rotate(${mote.spin}) scale(${mote.scale})`}>
              <g
                className="caprice__mote-wings"
                style={{ animationDuration: `${mote.flutterSeconds}s` }}
              >
                <path
                  d={`M 0 -26 C -120 -232, -272 -246, -318 -128 C -350 -44, -264 22, -150 26 C -78 28, -24 6, 0 -26 Z`}
                  fill="url(#caprice-wing-l)"
                />
                <path
                  d={`M 0 -26 C 120 -232, 272 -246, 318 -128 C 350 -44, 264 22, 150 26 C 78 28, 24 6, 0 -26 Z`}
                  fill="url(#caprice-wing-r)"
                />
              </g>
              <ellipse cx={0} cy={0} rx={16} ry={54} fill="#2e1065" />
            </g>
          </g>
        ))}
      </g>
    </g>
  )
}
