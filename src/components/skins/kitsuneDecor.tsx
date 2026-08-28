import type { DecorProps } from './decor'
import './skins.css'

/**
 * Kitsune's skin decorations.
 *
 * Drawn INSIDE the castle's local space, over the sprite — the keep occupies
 * roughly x −20…20, y −58…−12, the curtain wall x −52…52, y −24…30, and the
 * gate x −11…11, y 10…30. Anything here is layered on top of that.
 *
 * ⚠️ THE SILHOUETTE AND THE HUE ARE NOT NEGOTIABLE. Players pick out who is
 * attacking them from a small castle on a phone, often through fog. A skin may
 * add detail and texture; it may not obscure the shape, and it stays in
 * Kitsune's sapphire and midnight.
 *
 * ⚠️ THE FOXFIRE IS BLUE, AND THAT IS BOTH CORRECT AND NECESSARY. Kitsunebi is
 * traditionally a pale blue flame, and Fire already owns orange — a warm flame
 * on this castle would read as the wrong kingdom at 60% scale. Blue-white fire
 * on sapphire stone is the whole palette.
 *
 * ⚠️ VERMILION IS FOR ARCHITECTURE ONLY. A torii has to be that red or it stops
 * being a torii, but the red never spreads to anything that could be mistaken
 * for flame.
 *
 * ⚠️ ONE STROKED OUTLINE PER OBJECT. Everything inside it is an unstroked fill.
 */

const SAPPHIRE = '#0f52ba'
const INDIGO = '#1b2f7a'
const MIDNIGHT = '#08183f'
const FOX_FIRE = '#8fd8ff'
const FOX_FIRE_LIT = '#e6f8ff'
const FUR = '#f4f1e8'
const FUR_SHADE = '#c9c8d8'
const VERMILION = '#c2352c'
const GOLD = '#e8b53c'
const OUTLINE = '#061029'

/**
 * A tail.
 *
 * ⚠️ VOLUME FIRST. Seven attempts failed by drawing a thin curved shape and
 * then decorating it — ripples, tufts, locks, wisps — and each decoration
 * bought a new wrong reading: lumps, thorns, then leaves down a frond. The
 * reference makes the actual point plainly: a nine-tail's brush is BROAD. It is
 * roughly a third as wide as it is long, it is shaded from white along the top
 * edge to a cool grey underneath, and its edge undulates gently rather than
 * being cut into shapes. Width and shading do the work; the strand lines are
 * the only detail, and they follow the flow rather than crossing it.
 *
 * ⚠️ AND THE OUTLINE IS ALMOST NOTHING. Every version with a firm dark edge
 * read as something carved — horn, tusk, claw, quill. Fur has no outline; the
 * faintest indigo is the most that can be there and still hold the shape
 * against a dark battlefield.
 */
function tail(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  w: number,
  key: number,
  opts: { tip?: string; body?: string; className?: string; delay?: number } = {},
) {
  const N = 40
  const at = (t: number): [number, number] => {
    const u = 1 - t
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]
  }

  /* Slim where it joins the body, full for most of its length, easing to a
     rounded end. Undulation is gentle and slow — a soft swell in the outline,
     never a shape cut into it. */
  const widthAt = (t: number) => {
    const swell = Math.sin(Math.pow(t, 0.5) * Math.PI * 0.95)
    const wave = 1 + Math.sin(t * Math.PI * 2.6) * 0.08
    /* ⚠️ THE LAST FIFTH TAPERS. Full width all the way to a rounded stop is a
       BANANA — which is what the first volume-first pass came out as. In the
       reference every tail keeps its bulk through the middle and then draws
       down into a soft feathered point over the final stretch. */
    const close = t > 0.78 ? 1 - ((t - 0.78) / 0.22) ** 1.7 * 0.82 : 1
    return w * (0.2 + 0.8 * swell) * wave * close
  }

  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const t = i / N
    const [x, y] = at(t)
    const [x2, y2] = at(Math.min(1, t + 0.02))
    const dx = x2 - x
    const dy = y2 - y
    const len = Math.hypot(dx, dy) || 1
    return { t, x, y, nx: -dy / len, ny: dx / len, dx: dx / len, dy: dy / len, half: widthAt(t) / 2 }
  })

  /** An outline at a fraction of the half-width, optionally offset to one side. */
  const band = (k: number, shift = 0, from = 0) => {
    const seg = pts.filter((p) => p.t >= from)
    const l = seg.map(
      (p) => `${(p.x + p.nx * p.half * (k + shift)).toFixed(1)} ${(p.y + p.ny * p.half * (k + shift)).toFixed(1)}`,
    )
    const r = seg
      .map((p) => `${(p.x - p.nx * p.half * (k - shift)).toFixed(1)} ${(p.y - p.ny * p.half * (k - shift)).toFixed(1)}`)
      .reverse()
    return `M ${l.join(' L ')} L ${r.join(' L ')} z`
  }

  const strand = (k: number) =>
    'M ' +
    pts
      .filter((p) => p.t > 0.1 && p.t < 0.93)
      .map((p) => `${(p.x + p.nx * p.half * k).toFixed(1)} ${(p.y + p.ny * p.half * k).toFixed(1)}`)
      .join(' L ')

  const body = opts.body ?? FUR

  return (
    <g
      key={key}
      className={opts.className}
      style={opts.className ? { animationDelay: `${opts.delay ?? 0}s` } : undefined}
    >
      {/* The mass, then the light along its upper edge, then the shade beneath:
          three bands and the tail has a round section. */}
      {/* ⚠️ THE OUTLINE HAS TO SURVIVE THE OVERLAP. Nine white shapes piled
          together with a hairline edge merge into one cloud — the mass reads,
          but no individual tail does, and "nine tails" stops being legible.
          Slightly firmer, and with the shaded underside carried further up the
          form, each tail keeps its own edge where it crosses its neighbours. */}
      <path d={band(1)} fill={FUR_SHADE} stroke={INDIGO} strokeWidth={1.1} strokeLinejoin="round" />
      <path d={band(0.8, -0.16)} fill={body} />
      <path d={band(0.5, -0.4)} fill="#ffffff" opacity={0.85} />
      {/* Foxfire at the tip, where a spirit fox carries it. */}
      <path d={band(0.94, 0, 0.78)} fill={opts.tip ?? FOX_FIRE_LIT} opacity={0.4} />
      {/* Strand tips escaping past the end: the feathering that stops the point
          from looking cut. */}
      {[-0.5, 0, 0.5].map((k, i) => {
        const e = pts[pts.length - 1]!
        const b = pts.find((q) => q.t >= 0.82)!
        const sx = b.x + b.nx * b.half * k
        const sy = b.y + b.ny * b.half * k
        const len = w * (0.55 + i * 0.18)
        return (
          <path
            key={`t${i}`}
            d={`M ${sx.toFixed(1)} ${sy.toFixed(1)}
                Q ${(sx + e.dx * len * 0.6 + e.nx * len * 0.28 * k).toFixed(1)} ${(sy + e.dy * len * 0.6 + e.ny * len * 0.28 * k).toFixed(1)}
                  ${(sx + e.dx * len + e.nx * len * 0.5 * k).toFixed(1)} ${(sy + e.dy * len + e.ny * len * 0.5 * k).toFixed(1)}`}
            fill="none"
            stroke={i === 1 ? '#ffffff' : FUR}
            strokeWidth={w * 0.16}
            strokeLinecap="round"
            opacity={0.9}
          />
        )
      })}
      {[-0.62, -0.24, 0.2, 0.58].map((k, i) => (
        <path
          key={i}
          d={strand(k)}
          fill="none"
          stroke={i % 2 ? FUR_SHADE : '#ffffff'}
          strokeWidth={0.8}
          opacity={i % 2 ? 0.45 : 0.5}
          strokeLinecap="round"
        />
      ))}
    </g>
  )
}

/** A foxfire flame: a leaf-shaped wisp with a bright core. */
function foxfire(x: number, y: number, s: number, key: number, cls?: string, delay = 0) {
  return (
    <g key={key} className={cls} style={cls ? { animationDelay: `${delay}s` } : undefined}>
      <circle cx={x} cy={y} r={5.5 * s} fill={FOX_FIRE} opacity={0.2} />
      {/* ⚠️ A FLAME IS NOT A TEARDROP. Drawn as a symmetric leaf — pointed at
          the top, round at the bottom — these read as falling water, and Water
          is a kingdom. Fire has a notch in one side and a tip that leans: the
          asymmetry IS the read, at any size. */}
      <path
        d={`M ${x} ${y + 4.6 * s}
            C ${x - 4 * s} ${y + 2.6 * s} ${x - 4.4 * s} ${y - 2 * s} ${x - 1.2 * s} ${y - 6 * s}
            C ${x - 0.5 * s} ${y - 3.6 * s} ${x + 0.7 * s} ${y - 3 * s} ${x + 1.6 * s} ${y - 4.4 * s}
            C ${x + 2.4 * s} ${y - 1.6 * s} ${x + 4 * s} ${y + 0.4 * s} ${x + 3.2 * s} ${y + 2.4 * s}
            C ${x + 2.6 * s} ${y + 4 * s} ${x + 1.4 * s} ${y + 5 * s} ${x} ${y + 4.6 * s} z`}
        fill={FOX_FIRE}
        stroke={OUTLINE}
        strokeWidth={0.7}
        strokeLinejoin="round"
      />
      <path
        d={`M ${x} ${y + 3 * s}
            C ${x - 2 * s} ${y + 2 * s} ${x - 2.2 * s} ${y - 0.6 * s} ${x - 0.4 * s} ${y - 3 * s}
            C ${x + 0.4 * s} ${y - 1 * s} ${x + 2 * s} ${y + 0.6 * s} ${x + 1.6 * s} ${y + 2 * s}
            C ${x + 1.2 * s} ${y + 3 * s} ${x + 0.6 * s} ${y + 3.4 * s} ${x} ${y + 3 * s} z`}
        fill={FOX_FIRE_LIT}
      />
    </g>
  )
}

/**
 * A kitsune mask.
 *
 * ⚠️ THE FIRST ONE WAS CREEPY, AND THE REASON IS PROPORTION. It had a round
 * face, closed-looking slits and a black wedge for a nose — which is a skull
 * with whiskers, not a mask. A traditional kitsune-men reads from four things,
 * and it needs all four:
 *
 *  · A LONG SNOUT. The face is not a circle: it is wide across the brow and
 *    tapers most of its height down to a narrow muzzle. That taper is the
 *    single biggest difference between "fox" and "cat skull".
 *  · TALL EARS, dark-edged, set wide and leaning outward, with a red inner.
 *  · OPEN EYES. Almonds outlined in red with a clear dark centre, tilted UP at
 *    the outer corner. Slits that curve downward read as closed, and a closed
 *    face is the thing that made the first pass unsettling.
 *  · FLOWING RED CURVES. Not slashes: a stroke that sweeps out of each eye and
 *    up toward the ear, a curl on each cheek, and a crescent on the brow.
 *
 * Guided by the traditional mask rather than copied from it: the shapes here
 * are simplified to survive at 60% scale, where a real mask's fine linework
 * would turn to mud.
 */
function foxMask(x: number, y: number, s: number, key: number, eyeTilt = 0) {
  return (
    <g key={key} transform={`translate(${x} ${y}) scale(${s})`}>
      {/* Ears: tall, leaning out, dark rim with a red inner. */}
      <path
        d="M -7.4 -6 L -9.6 -17.5 L -1.8 -10.4 z"
        fill={FUR}
        stroke={OUTLINE}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <path d="M -7.6 -8.6 L -8.8 -15.2 L -3.8 -10.8 z" fill={VERMILION} opacity={0.85} />
      <path
        d="M 7.4 -6 L 9.6 -17.5 L 1.8 -10.4 z"
        fill={FUR}
        stroke={OUTLINE}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <path d="M 7.6 -8.6 L 8.8 -15.2 L 3.8 -10.8 z" fill={VERMILION} opacity={0.85} />

      {/* The face: broad at the brow, tapering to a narrow muzzle. */}
      <path
        d="M -7.6 -7.4 C -8.4 -1 -7 4.4 -4.2 8
           C -2.8 10 -1.4 11.4 0 12.4
           C 1.4 11.4 2.8 10 4.2 8
           C 7 4.4 8.4 -1 7.6 -7.4
           C 4.6 -10.4 -4.6 -10.4 -7.6 -7.4 z"
        fill={FUR}
        stroke={OUTLINE}
        strokeWidth={1}
        strokeLinejoin="round"
      />

      {/* Brow crescent. */}
      <path d="M -3.4 -6.2 C -1.6 -7.8 1.6 -7.8 3.4 -6.2" fill="none" stroke={VERMILION} strokeWidth={1.3} strokeLinecap="round" />

      {/* Eyes: almonds, tilted up at the outer corner, with a dark centre. */}
      {[-1, 1].map((side) => (
        <g key={side} transform={`scale(${side} 1)`}>
          {/* ⚠️ THE EYE IS CLOSED. Open, it stares — and a staring animal face is
              unsettling however it is drawn: whites made it worse, a solid dark
              almond only made it blank. A closed eye is a single curve, and it
              reads as calm rather than as watching. The red rim sits above it,
              where the brow marking would be. */}
          {/* ⚠️ A STRAIGHT BLACK BAR, NOT A SHAPE. Every version that gave the
              eye a FORM — almond, slit, closed curve — gave the mask an
              expression, and an expression on an animal face is what kept
              reading as unsettling. A carved mask can get away with a plain
              horizontal stroke: it is unmistakably an eye, and it says nothing
              at all. `eyeTilt` leans the bar on the legendary, dropping the
              INNER end toward the muzzle. Outward would raise the brow into a
              scowl; inward reads as watchful. */}
          <path
            d={`M -6.6 ${(-2.8 - eyeTilt * 0.5).toFixed(2)} L -1.4 ${(-2.8 + eyeTilt * 0.5).toFixed(2)}`}
            stroke="#14100f"
            strokeWidth={1.7}
            strokeLinecap="round"
            fill="none"
          />
          {/* The sweep out of the eye, toward the ear. */}
          <path
            d="M -7 -5.4 C -7.9 -7.2 -7.6 -8.8 -6.4 -10.2"
            fill="none"
            stroke={VERMILION}
            strokeWidth={1.2}
            strokeLinecap="round"
          />
          {/* The cheek curl. */}
          <path
            d="M -6.4 1 C -5.4 3.2 -4 4.8 -2.2 5.6"
            fill="none"
            stroke={VERMILION}
            strokeWidth={1.2}
            strokeLinecap="round"
          />
        </g>
      ))}

      {/* Muzzle line and nose tip: small, at the very end of the snout. */}
      <path d="M 0 4.6 L 0 9.4" stroke={VERMILION} strokeWidth={0.9} fill="none" opacity={0.8} />
      <path d="M -1.4 10.4 C -0.6 9.6 0.6 9.6 1.4 10.4 C 0.8 11.6 -0.8 11.6 -1.4 10.4 z" fill={OUTLINE} />
    </g>
  )
}

/**
 * Uncommon — Fox-Tail Pattern.
 *
 * The standard castle in a fox's colours: banded tail stripes across the walls,
 * masks set among them, and a curled tail wrapped round each shoulder.
 *
 * The lightest possible touch, like Water's Rippled Castle and Space's Star
 * Pattern: everything is clipped to the walls and the keep, so the silhouette
 * is exactly the default one.
 */
function FoxTailPattern({ eliminated, uid }: DecorProps) {
  return (
    <g className="skin skin--foxtail" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-ft-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-ft-keep-${uid}`}>
        <rect x={-21} y={-59} width={42} height={48} rx={3} />
      </clipPath>

      {/* ---- the wall: tail banding -------------------------------------
          ⚠️ THE BANDS TAPER AND LEAN. Even upright stripes are a big top, which
          belongs to Joker; a fox's tail is banded across a curve, so each band
          is wider at the bottom than the top and the whole run rakes. */}
      <g clipPath={`url(#skin-ft-wall-${uid})`}>
        {Array.from({ length: 9 }, (_, i) => {
          const x = -56 + i * 13
          return (
            <path
              key={i}
              d={`M ${x} 30 L ${x + 9} 30 L ${x + 20} -24 L ${x + 14} -24 z`}
              fill={i % 2 ? INDIGO : MIDNIGHT}
              opacity={i % 2 ? 0.55 : 0.75}
            />
          )
        })}
        {/* Tips: a fox's tail is white at the end, and the wall reads as tail
            rather than as stripes because of these. */}
        {Array.from({ length: 5 }, (_, i) => {
          const x = -50 + i * 26
          return (
            <path
              key={`t${i}`}
              d={`M ${x} 30 L ${x + 9} 30 L ${x + 13} 12 L ${x + 4} 12 z`}
              fill={FUR}
              opacity={0.85}
            />
          )
        })}
        <path d="M -52 -20 L 52 -20" stroke={GOLD} strokeWidth={1.6} fill="none" opacity={0.9} />
        <path d="M -52 26 L 52 26" stroke={GOLD} strokeWidth={1.6} fill="none" opacity={0.9} />
      </g>

      {/* ---- the keep: a foxfire disc ------------------------------------
          ⚠️ NO MASKS ON THE UNCOMMON. A face repeated across a wall watches the
          player, and three of them at this size turned a pattern into a stare —
          the tier is a PATTERN, and it holds together on banding, flame and
          fur alone. The mask is the rare's motif, where there is one of it and
          it is the thing you are meant to look at. */}
      <g clipPath={`url(#skin-ft-keep-${uid})`}>
        <circle cx={0} cy={-34} r={14} fill={MIDNIGHT} opacity={0.45} />
        <circle cx={0} cy={-34} r={14} fill="none" stroke={GOLD} strokeWidth={1.5} />
        {foxfire(0, -36, 1.5, 30)}
      </g>

      {/* ---- tails curled round the shoulders ---------------------------
          Clipped to the wall, so the outline never changes: on an uncommon the
          tail is painted ON the castle rather than wrapped around it. */}
      <g clipPath={`url(#skin-ft-wall-${uid})`}>
        {/* ⚠️ A PALE WEDGE IS A DRAPE. Wide and indigo-bodied, these hung off
            the top corners like curtains rather than curling round anything.
            Narrower, in the kingdom's own white-and-foxfire, and curling up
            from the FOOT of the wall, they read as a tail wrapped round the
            tower — which is what an uncommon is allowed: painted on, inside the
            outline, silhouette untouched. */}
        {tail([-50, 32], [-60, 14], [-48, -6], [-28, -12], 16, 20)}
        {tail([50, 32], [60, 14], [48, -6], [28, -12], 16, 21)}
      </g>

      {/* ---- battlements ------------------------------------------------
          Merlon centres come from the sprite: the wall's are at −46, −24, 24
          and 46 and the keep's at −15, 0 and 15. */}
      {[-46, -24, 24, 46].map((x, i) => (
        <g key={i}>{foxfire(x, -29, 0.75, i)}</g>
      ))}
      {[-15, 0, 15].map((x, i) => (
        <g key={i}>{foxfire(x, -62, 0.6, i + 10)}</g>
      ))}

      {/* ---- the gate ---------------------------------------------------- */}
      <path
        d="M -12 30 L -12 15 C -12 4 12 4 12 15 L 12 30"
        fill="none"
        stroke={VERMILION}
        strokeWidth={2.4}
      />
      <path
        d="M -12 30 L -12 15 C -12 4 12 4 12 15 L 12 30"
        fill="none"
        stroke={GOLD}
        strokeWidth={0.9}
        opacity={0.8}
      />
    </g>
  )
}

/**
 * Rare — Kitsune Shrine.
 *
 * The fortress as a shrine: a torii standing in front of the gate, fox statues
 * on plinths either side, stone lanterns on the wall, maples turning red past
 * the corners and foxfire burning at the entrance.
 *
 * ⚠️ THE MAPLES ARE NOT NATURE'S TREES. Nature owns green canopies; these are
 * autumn — vermilion and rust, small, and cropped to a few clusters rather than
 * a foliage mass. The moment one reads as a green tree it belongs to another
 * kingdom.
 */
function KitsuneShrine({ eliminated, uid }: DecorProps) {
  /** A stone lantern: base, post, fire box with a lit window, and a cap. */
  const lantern = (x: number, y: number, s: number, key: number) => (
    <g key={key} transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M -6 0 L 6 0 L 4.6 -3.4 L -4.6 -3.4 z" fill={FUR_SHADE} stroke={OUTLINE} strokeWidth={0.9} strokeLinejoin="round" />
      <rect x={-2} y={-11} width={4} height={7.6} fill={FUR_SHADE} stroke={OUTLINE} strokeWidth={0.8} />
      <circle cx={0} cy={-16} r={7} fill={FOX_FIRE} opacity={0.18} />
      <path d="M -5 -11 L 5 -11 L 4.4 -19 L -4.4 -19 z" fill={FUR} stroke={OUTLINE} strokeWidth={0.9} />
      <path d="M -2.6 -12.6 L 2.6 -12.6 L 2.2 -17.4 L -2.2 -17.4 z" fill={FOX_FIRE_LIT} />
      <path d="M -7.4 -19 L 7.4 -19 L 5.4 -23.4 L -5.4 -23.4 z" fill={FUR_SHADE} stroke={OUTLINE} strokeWidth={0.9} strokeLinejoin="round" />
      <circle cx={0} cy={-25} r={1.6} fill={FUR_SHADE} stroke={OUTLINE} strokeWidth={0.7} />
    </g>
  )

  /** A seated fox statue: ears up, chest forward, tail curled at the base. */
  const statue = (dir: 1 | -1, key: number) => (
    <g key={key} transform={`translate(${66 * dir} 0) scale(${dir} 1)`}>
      <path d="M -12 30 L -10 21 L 10 21 L 12 30 z" fill={FUR_SHADE} stroke={OUTLINE} strokeWidth={1.1} strokeLinejoin="round" />
      {/* One outline: haunches, chest, neck, head, ears. */}
      {/* ⚠️ IT NEEDS A SEATED POSE, NOT A MASS. Drawn as one rounded body with
          a head on it, a shrine fox is a white blob — the same failure Earth's
          colossi had as chess pawns. Front legs straight down to the plinth, a
          chest that steps forward of them, and a narrow waist behind: three
          changes of width, and the animal reads. */}
      <path
        d="M -9 21 L -7.6 6 C -7.6 1 -5 -1.6 -2.4 -2.4
           L -3 -6.4 L -6.6 -13 L -1.6 -10 L 1.6 -10 L 6.6 -13 L 3 -6.4
           L 2.4 -2.4 C 6 -1 8 4 8.6 12 L 9 21 z"
        fill={FUR}
        stroke={OUTLINE}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      {/* Front legs and the shadow between them. */}
      <path d="M -6 21 L -5 6 L -1.6 6 L -2.2 21 z" fill={FUR_SHADE} opacity={0.85} />
      <path d="M 2 21 L 1.6 6 L 5 6 L 6 21 z" fill={FUR_SHADE} opacity={0.6} />
      <path d="M -1.6 21 L 1.6 21 L 1.4 9 L -1.4 9 z" fill={FUR_SHADE} opacity={0.45} />
      <path d="M -6.6 -13 L -4.6 -8.4 L -2.4 -9.6 z" fill={VERMILION} />
      <path d="M 6.6 -13 L 4.6 -8.4 L 2.4 -9.6 z" fill={VERMILION} />
      <path d="M -2.6 -6.6 L -1.4 -6.6 M 1.4 -6.6 L 2.6 -6.6" stroke={OUTLINE} strokeWidth={1} fill="none" />
      {/* The bib every shrine fox wears — and the fastest way to read it as
          one rather than as a dog. */}
      <path d="M -5 -1 C -2 2 2 2 5 -1 L 4 5 C 1 7 -1 7 -4 5 z" fill={VERMILION} stroke={OUTLINE} strokeWidth={0.9} strokeLinejoin="round" />
      {/* Tail curled up behind the haunches. */}
      {tail([-9, 20], [-18, 13], [-16, 1], [-7, -4], 13, key + 40, { tip: '#ffffff', body: FUR_SHADE })}
    </g>
  )

  /** A maple: a few clusters of small leaves on a bare stem. */
  const maple = (x: number, y: number, s: number, key: number) => (
    <g key={key} transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M 0 24 C -1 12 -3 6 -6 0 M 0 24 C 1 12 3 4 7 -3" stroke="#4a3524" strokeWidth={2.2} fill="none" />
      {[
        [-8, -2, 6],
        [0, -8, 7],
        [8, -5, 6],
        [-3, 2, 5],
        [5, 3, 4.5],
      ].map(([cx, cy, r], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={r} fill={i % 2 ? VERMILION : '#d9683a'} stroke={OUTLINE} strokeWidth={0.7} />
          <circle cx={cx! - r! * 0.3} cy={cy! - r! * 0.3} r={r! * 0.4} fill="#f0a05a" opacity={0.7} />
        </g>
      ))}
    </g>
  )

  return (
    <g className="skin skin--kitsuneshrine" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-ks-outside-${uid}`} clipRule="evenodd">
        <path
          d="M -92 -128 L 92 -128 L 92 44 L -92 44 z
             M -53 -25 L 53 -25 L 53 31 L -53 31 z
             M -21 -59 L 21 -59 L 21 -11 L -21 -11 z"
          clipRule="evenodd"
        />
      </clipPath>
      <clipPath id={`skin-ks-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>

      {/* ---- maples, behind the walls ------------------------------------ */}
      <g clipPath={`url(#skin-ks-outside-${uid})`}>
        {maple(-74, -2, 1.05, 0)}
        {maple(76, -6, 0.95, 1)}
        {maple(-58, -30, 0.6, 2)}
        {maple(60, -34, 0.55, 3)}
      </g>

      {/* ---- the shrine roof over the keep -------------------------------
          ⚠️ THE EAVES TURN UP AT THE ENDS. A straight-sided roof is a tent, and
          the upturn is the single detail that says which country this is. */}
      {/* ⚠️ A ROOF HAS SLOPES AND A RIDGE. Built from two curves meeting at a
          crown it came out a dome — a UFO with an aerial on top — because a
          continuous curve has no eave, no ridge and no pitch. What makes this
          roof Japanese is three things in order: straight pitches falling from
          a short flat ridge, eaves that overhang, and corners that flick UP at
          the very ends. The upturn belongs to the last few units only; curve
          the whole slope and you are back to a dome. */}
      {/* Upper roof. */}
      <path
        d="M -13 -80 L 13 -80 L 33 -62 C 37 -66 40 -68 44 -70
           L 40 -58 L -40 -58 L -44 -70 C -40 -68 -37 -66 -33 -62 z"
        fill={MIDNIGHT}
        stroke={OUTLINE}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <path d="M -40 -58 L 40 -58" stroke={GOLD} strokeWidth={1.4} fill="none" />
      <path d="M -13 -80 L 13 -80" stroke={GOLD} strokeWidth={2.4} fill="none" />
      {/* Tiling: a few pitch lines, which is what gives the slope its plane. */}
      {[-24, -12, 12, 24].map((x, i) => (
        <path
          key={i}
          d={`M ${x * 0.45} -78 L ${x} -59`}
          stroke={INDIGO}
          strokeWidth={1}
          fill="none"
          opacity={0.7}
        />
      ))}
      {/* Lower roof, wider and shallower: a shrine is tiered. */}
      <path
        d="M -22 -56 L 22 -56 L 42 -46 C 46 -50 49 -52 53 -54
           L 49 -42 L -49 -42 L -53 -54 C -49 -52 -46 -50 -42 -46 z"
        fill={INDIGO}
        stroke={OUTLINE}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <path d="M -49 -42 L 49 -42" stroke={GOLD} strokeWidth={1.3} fill="none" />
      <circle cx={0} cy={-84} r={2.6} fill={GOLD} stroke={OUTLINE} strokeWidth={0.9} />
      <path d="M 0 -84 L 0 -80" stroke={GOLD} strokeWidth={1.6} fill="none" />

      {/* ---- the wall, plastered and boarded ----------------------------- */}
      <g clipPath={`url(#skin-ks-wall-${uid})`}>
        <rect x={-52} y={-24} width={104} height={54} fill="#f2efe4" opacity={0.9} />
        <rect x={-52} y={-24} width={104} height={7} fill={MIDNIGHT} />
        <rect x={-52} y={22} width={104} height={8} fill={INDIGO} opacity={0.85} />
        {[-40, -20, 20, 40].map((x, i) => (
          <rect key={i} x={x} y={-17} width={3.4} height={39} fill="#7a6a52" opacity={0.55} />
        ))}
        <path d="M -52 -17 L 52 -17" stroke={OUTLINE} strokeWidth={1} fill="none" opacity={0.5} />
        <path d="M -52 22 L 52 22" stroke={OUTLINE} strokeWidth={1} fill="none" opacity={0.5} />
      </g>

      {/* ---- fox statues on their plinths -------------------------------- */}
      {statue(-1, 0)}
      {statue(1, 1)}

      {/* ---- stone lanterns ---------------------------------------------- */}
      {lantern(-40, 30, 0.95, 10)}
      {lantern(40, 30, 0.95, 11)}

      {/* ---- the torii, standing in front of the gate --------------------
          ⚠️ TWO LINTELS, AND THE TOP ONE CURVES AND OVERHANGS. One straight
          crossbar is a football goal; the kasagi's curve and the shorter nuki
          under it are what make it a torii. */}
      <g>
        <path d="M -26 32 L -22 -14 L -17 -14 L -21 32 z" fill={VERMILION} stroke={OUTLINE} strokeWidth={1.2} strokeLinejoin="round" />
        <path d="M 26 32 L 22 -14 L 17 -14 L 21 32 z" fill={VERMILION} stroke={OUTLINE} strokeWidth={1.2} strokeLinejoin="round" />
        <path d="M -28 -4 L 28 -4 L 28 0.6 L -28 0.6 z" fill={VERMILION} stroke={OUTLINE} strokeWidth={1.1} />
        <path
          d="M -33 -14 C -18 -19 18 -19 33 -14 L 33 -9.4 C 18 -14.4 -18 -14.4 -33 -9.4 z"
          fill={VERMILION}
          stroke={OUTLINE}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
        <rect x={-2.6} y={-14} width={5.2} height={11} fill={VERMILION} stroke={OUTLINE} strokeWidth={1} />
      </g>

      {/* ---- foxfire at the entrance ------------------------------------- */}
      {foxfire(-15, 16, 1.1, 20, 'skin__foxfire', 0)}
      {foxfire(15, 14, 1, 21, 'skin__foxfire', 0.8)}
      {foxfire(0, 2, 0.8, 22, 'skin__foxfire', 1.6)}
    </g>
  )
}

/**
 * Rare — Nine-Tail Palace.
 *
 * An elegant palace with enormous tails curling round it: two sweeping up past
 * the shoulders, two arching between the towers like bridges, and the rest
 * banked behind.
 *
 * ⚠️ IT MUST NOT BE KITSUNE SHRINE. Same kingdom, same tier: that one is a
 * PLACE — torii, statues, lanterns, ground. This one is the creature's tails
 * and almost nothing else, and the architecture under them is stripped back to
 * let them read.
 */
function NineTailPalace({ eliminated, uid }: DecorProps) {
  return (
    <g className="skin skin--ninetail" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-nt-outside-${uid}`} clipRule="evenodd">
        <path
          d="M -92 -128 L 92 -128 L 92 44 L -92 44 z
             M -53 -25 L 53 -25 L 53 31 L -53 31 z
             M -21 -59 L 21 -59 L 21 -11 L -21 -11 z"
          clipRule="evenodd"
        />
      </clipPath>
      <clipPath id={`skin-nt-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-nt-keep-${uid}`}>
        <rect x={-21} y={-59} width={42} height={48} rx={3} />
      </clipPath>
      <defs>
        <radialGradient id={`skin-nt-glow-${uid}`} gradientUnits="userSpaceOnUse" cx={0} cy={-20} r={96}>
          <stop offset="0%" stopColor={FOX_FIRE} stopOpacity="0.26" />
          <stop offset="50%" stopColor={FOX_FIRE} stopOpacity="0.12" />
          <stop offset="100%" stopColor={SAPPHIRE} stopOpacity="0" />
        </radialGradient>
      </defs>

      <g clipPath={`url(#skin-nt-outside-${uid})`}>
        <circle cx={0} cy={-20} r={96} fill={`url(#skin-nt-glow-${uid})`} />

        {/**
         * ⚠️ TAILS SWEEP; THEY DO NOT RADIATE. Fanned symmetrically out of the
         * middle, five of them came out as a ring of horns above the keep — no
         * structure, no theme, just spikes. A fox's tails all move TOGETHER:
         * they leave the body on one side, curve through a shared arc, and
         * finish with the flick at the tip pointing the same way. Sweeping them
         * as a group is what turns five shapes into one animal, and it is the
         * difference between a crown of spines and something curled around a
         * building.
         */}
        {/* ⚠️ AND THEY ARE NARROW ENOUGH TO BE TAILS. At three times longer
            than wide these were petals whatever shape the tip was; nearer five
            to one, with an S in the spine and a hook at the end, they are
            brushes. The curl is what a tail does that a petal never does. */}
        {/* ⚠️ THEY OVERLAP. Fanned with clear air between them, five tails read
            as five separate objects arranged around a building — which is why
            the skin kept looking like a crown or a wreath whatever the shapes
            were. In the reference the tails pile INTO one another and the mass
            is the subject; the fan is tighter here and the lengths differ
            enough that the outline of the group is uneven. */}
        {/* Five spines, each drawn rather than generated, curling different
            ways — the same reason the legendary's nine are hand-drawn. */}
        {[
          /* ⚠️ THE FAN HAS TO CLEAR ITS OWN PALACE. Rooted low and curling
             tight, most of every tail sat behind the keep and the roof, where
             the clip removes it — five tails went in and about three tips came
             out. They start wider and reach higher now, so the visible part of
             each one is most of its length. */
          /* Two of the five fall rather than rise: a fan where everything
             sweeps upward has no weight to it. */
          /* Rising spines with the tips hooked over, same as the legendary. */
          /* The upward-curling fan, restored — see the legendary's note. */
          { p: [[-14, -6], [-56, -16], [-84, -44], [-58, -74]], w: 30 },
          { p: [[-8, -10], [-38, -34], [-52, -70], [-20, -92]], w: 28 },
          { p: [[0, -12], [-2, -44], [22, -74], [6, -106]], w: 26 },
          { p: [[8, -10], [38, -32], [52, -68], [20, -90]], w: 28 },
          { p: [[14, -6], [58, -16], [86, -42], [62, -72]], w: 30 },
        ].map((t, i) =>
          tail(
            t.p[0] as [number, number],
            t.p[1] as [number, number],
            t.p[2] as [number, number],
            t.p[3] as [number, number],
            t.w,
            i,
          ),
        )}
      </g>

      {/* ---- the palace ---------------------------------------------------
          ⚠️ AN ELEGANT PALACE HAS TO LOOK BUILT. Under the first set of tails
          was a plain dark box with two panels on it, which is why the skin read
          as "some shapes near a castle" rather than as a palace with tails: the
          creature was doing all the work. It now wears the same shrine roof as
          Kitsune Shrine — one kingdom, one architecture — over a lattice front
          with a gold cornice and plinth. */}
      <g clipPath={`url(#skin-nt-wall-${uid})`}>
        <rect x={-52} y={-24} width={104} height={54} fill={MIDNIGHT} opacity={0.6} />
        <rect x={-52} y={-24} width={104} height={6} fill={GOLD} opacity={0.9} />
        <rect x={-52} y={24} width={104} height={6} fill={GOLD} opacity={0.9} />
        {/* Shoji lattice: two bays of it, which is what says palace rather than
            fortress. */}
        {[-46, 22].map((x, i) => (
          <g key={i}>
            <rect x={x} y={-13} width={24} height={32} fill={SAPPHIRE} opacity={0.4} />
            <rect x={x} y={-13} width={24} height={32} fill="none" stroke={FOX_FIRE} strokeWidth={1} opacity={0.75} />
            {[8, 16, 24].map((dx, k) => (
              <path key={k} d={`M ${x + dx} -13 L ${x + dx} 19`} stroke={FOX_FIRE} strokeWidth={0.6} opacity={0.45} fill="none" />
            ))}
            {[8, 19].map((dy, k) => (
              <path key={`h${k}`} d={`M ${x} ${-13 + dy} L ${x + 24} ${-13 + dy}`} stroke={FOX_FIRE} strokeWidth={0.6} opacity={0.45} fill="none" />
            ))}
          </g>
        ))}
        <rect
          x={-50.5}
          y={-22.5}
          width={101}
          height={51}
          rx={3}
          fill="none"
          stroke={FOX_FIRE}
          strokeWidth={1.2}
          opacity={0.45}
        />
      </g>

      {/* The keep, given a lattice window of its own. */}
      <g clipPath={`url(#skin-nt-keep-${uid})`}>
        <rect x={-21} y={-59} width={42} height={48} fill={MIDNIGHT} opacity={0.55} />
        <rect x={-11} y={-44} width={22} height={26} fill={SAPPHIRE} opacity={0.45} />
        <rect x={-11} y={-44} width={22} height={26} fill="none" stroke={FOX_FIRE} strokeWidth={1} opacity={0.8} />
        <path d="M 0 -44 L 0 -18" stroke={FOX_FIRE} strokeWidth={0.6} opacity={0.5} fill="none" />
        <path d="M -11 -31 L 11 -31" stroke={FOX_FIRE} strokeWidth={0.6} opacity={0.5} fill="none" />
      </g>

      {/* The shrine roof: straight pitches off a short ridge, overhanging
          eaves, and the flick up at the very ends. */}
      <path
        d="M -12 -76 L 12 -76 L 31 -60 C 35 -64 38 -66 42 -68
           L 38 -56 L -38 -56 L -42 -68 C -38 -66 -35 -64 -31 -60 z"
        fill={MIDNIGHT}
        stroke={OUTLINE}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <path d="M -38 -56 L 38 -56" stroke={GOLD} strokeWidth={1.4} fill="none" />
      <path d="M -12 -76 L 12 -76" stroke={GOLD} strokeWidth={2.2} fill="none" />
      {[-22, -11, 11, 22].map((x, i) => (
        <path key={i} d={`M ${x * 0.45} -74 L ${x} -57`} stroke={INDIGO} strokeWidth={1} fill="none" opacity={0.7} />
      ))}
      <circle cx={0} cy={-80} r={2.4} fill={GOLD} stroke={OUTLINE} strokeWidth={0.9} />

      {/* ---- the two that come round the front ---------------------------
          They lie ALONG the foot of the palace and flick up at the corners,
          which is how a fox lies around something. Up the sides they merely
          covered the walls. */}
      {/* ⚠️ NOTHING ALONG THE BOTTOM. Two tails lying across the foot of the
          palace added mass exactly where the eye needs the building to meet the
          ground, and they fought the gate for attention. The fan behind and the
          two threading between the towers carry the idea on their own. */}

      {/* Foxfire along the parapet, on the sprite's real merlon centres. */}
      {[-46, -24, 24, 46].map((x, i) => (
        <g key={i}>{foxfire(x, -30, 0.8, i + 20)}</g>
      ))}

      {/* The gate. */}
      <path
        d="M -12 30 L -12 14 C -12 3 12 3 12 14 L 12 30"
        fill="none"
        stroke={GOLD}
        strokeWidth={2.4}
      />
      {foxfire(0, 12, 1, 30)}
    </g>
  )
}

/**
 * Legendary — Nine-Tailed Spirit Palace.
 *
 * The fox itself: a spirit curled round the whole fortress, its head resting
 * above one shoulder, nine tails fanned across the sky behind, and a sea of
 * foxfire underneath.
 *
 * ⚠️ THE HEAD IS OFF TO ONE SIDE. Centred over the keep it becomes a mask on a
 * pole — the same failure Earth's colossus had before its head moved — and a
 * creature CURLED round something does not face straight out of the picture.
 */
function NineTailedSpiritPalace({ eliminated, uid }: DecorProps) {
  /**
   * Nine tails, fanned behind the palace.
   *
   * ⚠️ THEY HAVE TO CLEAR THE CASTLE TO READ AS TAILS. The first set were
   * short, wide and rooted at the wall, so what showed above the parapet was a
   * ring of stubby blades — a collar, or a crown of leaves. A tail is mostly
   * LENGTH: these start behind the keep and reach two thirds of the way up the
   * frame, and the fan is stepped so the middle ones are longest.
   *
   * ⚠️ AND THE FAN IS NOT SYMMETRIC ABOUT THE KEEP. It leans away from the head,
   * which is what stops the composition reading as a heraldic badge.
   */
  /**
   * Nine tails.
   *
   * ⚠️ HAND-DRAWN, NOT GENERATED. These came out of a formula: one spine shape
   * swept through nine angles, which is why they looked stiff — every tail was
   * the same curve rotated, so the group had the regularity of a fan blade
   * assembly rather than the drift of fur. Nine separate spines, each with its
   * own S and its own hook, are the only way the mass reads as alive.
   *
   * ⚠️ AND THEY CURL IN DIFFERENT DIRECTIONS. Three hook back to the left,
   * four to the right, two barely at all. Uniform curl is just a different kind
   * of stiffness — it reads as a pattern, which is what a fan is.
   */
  const TAILS: {
    p: [[number, number], [number, number], [number, number], [number, number]]
    w: number
    d: number
  }[] = [
    /* ⚠️ NOT ALL OF THEM CURL UP. Nine tails all hooking the same way is the
       stiffness again in its last form — the group sweeps like a single comb.
       Four of these fall instead: two on the outside, where a tail hanging
       down is what gives the fan its weight, and two through the middle so the
       drop is not just an edge treatment. */
    /* ⚠️ THEY ALL GO UP; ONLY THE ENDS COME DOWN. The previous fix made four
       whole tails fall, which is not the same thing at all — a tail that
       descends from the root reads as hanging, and the fan lost its lift. Every
       spine here rises through its first three points and then puts its last
       point BELOW the third, so the curve climbs, tops out, and hooks over. The
       hook is what a heavy brush does at the end of its arc; the climb is what
       makes it a fan. How far each one drops varies, so the tops are uneven. */
    /* ⚠️ THESE ARE THE UPWARD-CURLING SPINES, RESTORED. Two later passes tried
       to add a downward hook — first by letting whole tails fall from the root,
       then by dropping the last fifth of each curve — and both cost more than
       they bought: falling tails lost the fan its lift, and hooked tips folded
       the shapes back on themselves. Nine hand-drawn spines that all sweep up,
       each with its own S, is the version that read. */
    { p: [[-12, 8], [-54, 8], [-86, -14], [-74, -46]], w: 30, d: 0 },
    { p: [[-10, 2], [-48, -12], [-78, -46], [-48, -74]], w: 29, d: -0.8 },
    { p: [[-8, -2], [-34, -28], [-54, -60], [-22, -82]], w: 28, d: -1.7 },
    { p: [[-4, -6], [-16, -36], [-22, -72], [6, -96]], w: 27, d: -2.5 },
    { p: [[0, -8], [6, -40], [24, -70], [6, -100]], w: 26, d: -3.3 },
    { p: [[4, -6], [26, -34], [48, -62], [24, -90]], w: 27, d: -4.1 },
    { p: [[8, -2], [36, -20], [66, -44], [42, -72]], w: 28, d: -4.9 },
    { p: [[10, 2], [50, -4], [82, -20], [64, -52]], w: 29, d: -5.7 },
    { p: [[12, 8], [52, 12], [86, 6], [78, -24]], w: 26, d: -6.5 },
  ]

  return (
    <g className="skin skin--spiritpalace" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-sp-outside-${uid}`} clipRule="evenodd">
        <path
          d="M -92 -128 L 92 -128 L 92 44 L -92 44 z
             M -53 -25 L 53 -25 L 53 31 L -53 31 z
             M -21 -59 L 21 -59 L 21 -11 L -21 -11 z"
          clipRule="evenodd"
        />
      </clipPath>
      <clipPath id={`skin-sp-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <defs>
        <radialGradient id={`skin-sp-aura-${uid}`} gradientUnits="userSpaceOnUse" cx={0} cy={-34} r={112}>
          <stop offset="0%" stopColor={FOX_FIRE_LIT} stopOpacity="0.34" />
          <stop offset="42%" stopColor={FOX_FIRE} stopOpacity="0.17" />
          <stop offset="100%" stopColor={SAPPHIRE} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`skin-sp-sea-${uid}`}>
          <stop offset="0%" stopColor={FOX_FIRE_LIT} stopOpacity="0.85" />
          <stop offset="45%" stopColor={FOX_FIRE} stopOpacity="0.35" />
          <stop offset="100%" stopColor={SAPPHIRE} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`skin-sp-body-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor={FUR} />
          <stop offset="100%" stopColor={FUR_SHADE} />
        </linearGradient>
      </defs>

      <g clipPath={`url(#skin-sp-outside-${uid})`}>
        <g className="skin__aura">
          <circle cx={0} cy={-34} r={112} fill={`url(#skin-sp-aura-${uid})`} />
        </g>

        {/* The nine tails, swaying on staggered clocks. */}
        {/* ⚠️ NO WHITE OVERRIDE. This passed the pale body gradient, which put
            the legendary straight back to the tusks the rare had just escaped.
            It uses the kingdom's tail: dark at the root, white at the tip. */}
        {TAILS.map((t, i) =>
          tail(t.p[0], t.p[1], t.p[2], t.p[3], t.w, i, {
            className: 'skin__tail',
            delay: t.d,
          }),
        )}

        {/* The body, curling round the right shoulder and down behind. */}
        <path
          d="M 12 34 C 50 32 74 12 73 -16 C 72 -40 56 -54 36 -56
             L 33 -43 C 48 -41 58 -32 59 -15 C 60 6 42 21 10 23 z"
          fill={`url(#skin-sp-body-${uid})`}
          stroke={OUTLINE}
          strokeWidth={1.3}
          strokeLinejoin="round"
        />
        <path d="M 14 31 C 48 29 70 10 69 -15" fill="none" stroke={FOX_FIRE} strokeWidth={1.3} opacity={0.55} />

        {/* The head.
            ⚠️ IT IS THE KINGDOM'S OWN MASK, SCALED UP. Hand-drawing a second
            fox face produced something closer to a skull than a spirit — and
            worse, it did not match the masks on the uncommon, so the kingdom
            had two different foxes in it. Reusing the mask guarantees the
            proportions that make it read: a long snout, tall red-lined ears,
            open almond eyes, and flowing red curves rather than slashes. */}
        <g transform="translate(50 -60) rotate(-10)">
          {/* The ruff the face sits in. */}
          <path
            d="M -24 -8 C -28 10 -16 28 2 32 C 20 28 30 10 26 -8
               C 20 6 12 14 1 14 C -10 14 -19 6 -24 -8 z"
            fill={`url(#skin-sp-body-${uid})`}
            stroke={OUTLINE}
            strokeWidth={1.2}
            strokeLinejoin="round"
            opacity={0.95}
          />
          <g className="skin__foxfire">
            <circle cx={0} cy={0} r={26} fill={FOX_FIRE} opacity={0.16} />
          </g>
          {foxMask(0, -2, 2.1, 99, 1.5)}
        </g>
      </g>

      {/* ---- the palace -------------------------------------------------- */}
      <g clipPath={`url(#skin-sp-wall-${uid})`}>
        <rect x={-52} y={-24} width={104} height={54} fill={MIDNIGHT} opacity={0.62} />
        <rect x={-52} y={-24} width={104} height={6} fill={GOLD} opacity={0.9} />
        <rect x={-52} y={24} width={104} height={6} fill={GOLD} opacity={0.9} />
        {[-42, 20].map((x, i) => (
          <g key={i}>
            <rect x={x} y={-12} width={22} height={30} fill={SAPPHIRE} opacity={0.4} />
            <rect x={x} y={-12} width={22} height={30} fill="none" stroke={FOX_FIRE} strokeWidth={0.9} opacity={0.7} />
            <path d={`M ${x + 11} -12 L ${x + 11} 18`} stroke={FOX_FIRE} strokeWidth={0.7} opacity={0.4} fill="none" />
          </g>
        ))}
        {/* Rim light inside the silhouette: the fox is the light source, and
            every legendary that holds together says so somewhere. */}
        <rect
          x={-50.5}
          y={-22.5}
          width={101}
          height={51}
          rx={3}
          fill="none"
          stroke={FOX_FIRE}
          strokeWidth={1.3}
          opacity={0.5}
        />
        {[-30, 30].map((x, i) => (
          <g key={i} className="skin__aura" style={{ animationDelay: `${i * 0.8}s` }}>
            <path d={`M ${x} 24 L ${x} -18`} stroke={FOX_FIRE} strokeWidth={3.4} opacity={0.18} fill="none" />
            <path d={`M ${x} 24 L ${x} -18`} stroke={FOX_FIRE_LIT} strokeWidth={1} fill="none" />
          </g>
        ))}
      </g>

      {/* ---- the shrine roof, the same one the rare wears ----------------
          Straight pitches off a short ridge, overhanging eaves, and the flick
          UP at the very ends. Curve the whole slope and it is a dome. */}
      <path
        d="M -13 -78 L 13 -78 L 33 -60 C 37 -64 40 -66 44 -68
           L 40 -56 L -40 -56 L -44 -68 C -40 -66 -37 -64 -33 -60 z"
        fill={MIDNIGHT}
        stroke={OUTLINE}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <path d="M -40 -56 L 40 -56" stroke={GOLD} strokeWidth={1.4} fill="none" />
      <path d="M -13 -78 L 13 -78" stroke={GOLD} strokeWidth={2.4} fill="none" />
      {[-24, -12, 12, 24].map((x, i) => (
        <path key={i} d={`M ${x * 0.45} -76 L ${x} -57`} stroke={INDIGO} strokeWidth={1} fill="none" opacity={0.7} />
      ))}
      <circle cx={0} cy={-82} r={2.6} fill={GOLD} stroke={OUTLINE} strokeWidth={0.9} />
      <path d="M 0 -82 L 0 -78" stroke={GOLD} strokeWidth={1.6} fill="none" />

      {/* ---- the sea of foxfire ------------------------------------------ */}
      <ellipse cx={0} cy={37} rx={78} ry={13} fill={`url(#skin-sp-sea-${uid})`} />
      <path
        d="M -74 32 C -48 26 -20 24 0 24 C 20 24 48 26 74 32"
        fill="none"
        stroke={FOX_FIRE_LIT}
        strokeWidth={1.6}
        opacity={0.6}
      />
      {[
        { x: -60, y: 34, s: 1.5 },
        { x: -34, y: 39, s: 1.15 },
        { x: -8, y: 35, s: 1.7 },
        { x: 20, y: 40, s: 1.25 },
        { x: 46, y: 34, s: 1.55 },
        { x: 70, y: 38, s: 1.05 },
      ].map((f, i) => foxfire(f.x, f.y, f.s, i + 40, 'skin__foxfire', -(i * 0.55)))}

      {/* The gate, open onto the same light. */}
      <g className="skin__aura">
        <path d="M -12 30 L -12 12 C -12 1 12 1 12 12 L 12 30 z" fill={FOX_FIRE} opacity={0.3} />
        <path
          d="M -12 30 L -12 12 C -12 1 12 1 12 12 L 12 30"
          fill="none"
          stroke={FOX_FIRE_LIT}
          strokeWidth={2.4}
        />
      </g>
    </g>
  )
}

export const KitsuneDecor = {
  'kitsune.foxtail': FoxTailPattern,
  'kitsune.shrine': KitsuneShrine,
  'kitsune.ninetail': NineTailPalace,
  'kitsune.spirit': NineTailedSpiritPalace,
}
