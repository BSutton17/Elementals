import {
  WHEEL_POCKETS,
  POCKET_ARC,
  colorOfPocket,
  COLOR_FILL,
} from './wheel'

// The wheel itself, as SVG so it stays crisp at any size and scales cleanly
// between the victim's full table and Joker's small mirror. 37 real pockets,
// drawn as wedges in true order with their numbers standing upright.
//
// Motion is driven entirely by the two rotation props: the CALLER decides the
// angles and the CSS transitions carry them, so the victim's table and Joker's
// mirror can run the exact same spin from the same numbers.

const SIZE = 200
const C = SIZE / 2
const RIM_OUTER = 98
const RIM_INNER = 66
const BALL_TRACK = 88

/** A wedge path between two angles (degrees, clockwise from 12 o'clock). */
function wedge(from: number, to: number, rOuter: number, rInner: number): string {
  const pt = (angle: number, r: number) => {
    const rad = ((angle - 90) * Math.PI) / 180
    return [C + r * Math.cos(rad), C + r * Math.sin(rad)] as const
  }
  const [x1, y1] = pt(from, rOuter)
  const [x2, y2] = pt(to, rOuter)
  const [x3, y3] = pt(to, rInner)
  const [x4, y4] = pt(from, rInner)
  return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 0 0 ${x4} ${y4} Z`
}

export function RouletteWheel({
  wheelAngle,
  ballAngle,
  /** 0 = out on the rim, 1 = dropped into a pocket. */
  ballDrop,
  spinMs,
  className,
}: {
  wheelAngle: number
  ballAngle: number
  ballDrop: number
  spinMs: number
  className?: string
}) {
  // The ball rides the outer track, then falls to the pocket ring as it slows.
  const ballRadius = BALL_TRACK - ballDrop * (BALL_TRACK - (RIM_INNER + 16))

  return (
    <svg
      className={className}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label="Roulette wheel"
      data-testid="roulette-wheel"
    >
      <defs>
        <radialGradient id="rw-bowl" cx="38%" cy="30%">
          <stop offset="0%" stopColor="#6b4423" />
          <stop offset="70%" stopColor="#3b2413" />
          <stop offset="100%" stopColor="#1d120a" />
        </radialGradient>
        <radialGradient id="rw-hub" cx="38%" cy="30%">
          <stop offset="0%" stopColor="#f2d68a" />
          <stop offset="60%" stopColor="#b8912f" />
          <stop offset="100%" stopColor="#6d5416" />
        </radialGradient>
        <radialGradient id="rw-ball" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#dedede" />
          <stop offset="100%" stopColor="#9a9a9a" />
        </radialGradient>
      </defs>

      {/* The wooden bowl the wheel sits in — this part never turns. */}
      <circle cx={C} cy={C} r={99} fill="url(#rw-bowl)" />
      <circle cx={C} cy={C} r={99} fill="none" stroke="#8a6a3a" strokeWidth={2} />

      {/* The turning wheel head. */}
      <g
        style={{
          transform: `rotate(${wheelAngle}deg)`,
          transformOrigin: '50% 50%',
          transition: spinMs > 0 ? `transform ${spinMs}ms cubic-bezier(0.12, 0.62, 0.15, 1)` : 'none',
        }}
      >
        {WHEEL_POCKETS.map((pocket, i) => {
          const from = i * POCKET_ARC
          const to = from + POCKET_ARC
          const mid = from + POCKET_ARC / 2
          const color = colorOfPocket(pocket)
          const rad = ((mid - 90) * Math.PI) / 180
          const tx = C + (RIM_INNER + 17) * Math.cos(rad)
          const ty = C + (RIM_INNER + 17) * Math.sin(rad)
          return (
            <g key={pocket}>
              <path
                d={wedge(from, to, RIM_OUTER, RIM_INNER)}
                fill={COLOR_FILL[color]}
                stroke="#c9a227"
                strokeWidth={0.5}
              />
              {/* Numbers point outward, the way they do on a real head. */}
              <text
                x={tx}
                y={ty}
                fill="#f4efe2"
                fontSize={8}
                fontWeight={700}
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(${mid} ${tx} ${ty})`}
              >
                {pocket}
              </text>
            </g>
          )
        })}

        {/* Hub, with the frets radiating out of it. */}
        <circle cx={C} cy={C} r={RIM_INNER} fill="url(#rw-hub)" />
        <circle cx={C} cy={C} r={RIM_INNER - 10} fill="#2a1a0e" opacity={0.55} />
        {Array.from({ length: 8 }).map((_, i) => (
          <rect
            key={i}
            x={C - 1.5}
            y={C - RIM_INNER + 4}
            width={3}
            height={RIM_INNER - 18}
            rx={1.5}
            fill="#d9b64a"
            opacity={0.8}
            transform={`rotate(${i * 45} ${C} ${C})`}
          />
        ))}
        <circle cx={C} cy={C} r={9} fill="url(#rw-hub)" stroke="#6d5416" strokeWidth={1} />
      </g>

      {/* The ball orbits on its own arm, counter to the head. */}
      <g
        style={{
          transform: `rotate(${ballAngle}deg)`,
          transformOrigin: '50% 50%',
          transition: spinMs > 0 ? `transform ${spinMs}ms cubic-bezier(0.1, 0.55, 0.1, 1)` : 'none',
        }}
      >
        <circle
          cx={C}
          cy={C - ballRadius}
          r={4.6}
          fill="url(#rw-ball)"
          data-testid="roulette-ball"
          style={{
            transition: spinMs > 0 ? `cy ${spinMs}ms cubic-bezier(0.3, 0, 0.6, 1)` : 'none',
          }}
        />
      </g>

    </svg>
  )
}
