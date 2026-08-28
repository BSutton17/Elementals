import type { DecorProps } from './decor'
import './skins.css'

/**
 * Insects' skin decorations.
 *
 * Drawn INSIDE the castle's local space, over the sprite — the keep occupies
 * roughly x −20…20, y −58…−12, the curtain wall x −52…52, y −24…30, and the
 * gate x −11…11, y 10…30. Anything here is layered on top of that.
 *
 * ⚠️ THE SILHOUETTE AND THE HUE ARE NOT NEGOTIABLE. Players pick out who is
 * attacking them from a small castle on a phone, often through fog. A skin may
 * add detail and texture; it may not obscure the shape, and it stays in
 * Insects' chitin green.
 *
 * ⚠️ AND THE HONEY IS NOT LIGHT'S GOLD. Both kingdoms use a warm yellow, so the
 * separation has to be in what it is DOING: Light's gold is metal — trim,
 * finials, hard edges, always still. Honey here is a liquid: it pools, it runs
 * downward, it fills cells and sits in them, and it never draws a straight
 * line. A gold band on this castle would belong to the other kingdom.
 *
 * ⚠️ ONE STROKED OUTLINE PER OBJECT. Everything inside it is an unstroked fill.
 */

const CHITIN = '#a8c020'
const CHITIN_DEEP = '#5c6c12'
const CARAPACE = '#3c4708'
const WING = '#d7e84a'
const HONEY = '#d99a1e'
const HONEY_LIT = '#ffc94d'
const OUTLINE = '#232b05'

/**
 * A hexagon, pointy-topped — which is the orientation a comb tessellates in
 * when its cells are laid out in rows.
 *
 * ⚠️ AND THE SPACING BELOW MATTERS AS MUCH AS THE SHAPE. Cells set too far
 * apart leave the wall showing between them and the comb reads as a sheet of
 * separate TILES; a real comb shares every wall. For this orientation the
 * columns sit √3·r apart, the rows 1.5·r, and alternate rows shift by half a
 * column. Those three numbers are the whole thing.
 */
function hexPath(cx: number, cy: number, r: number): string {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6
    return `${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`
  })
  return `M ${pts.join(' L ')} z`
}

/** Column and row pitch for a comb of cells of radius r. */
const hexStep = (r: number) => ({ x: Math.sqrt(3) * r, y: 1.5 * r })

/**
 * A pair of wings.
 *
 * ⚠️ FOUR PANELS, NOT TWO BLOBS. An insect wing is a membrane with veins in it
 * and a hard leading edge; drawn as a plain lozenge it reads as a leaf, which
 * belongs to Nature. The veins are what make it chitin.
 */
function wings(x: number, y: number, s: number, key: number, spread = 24) {
  return (
    <g key={key} transform={`translate(${x} ${y}) scale(${s})`}>
      {[-1, 1].map((side) => (
        <g key={side} transform={`scale(${side} 1) rotate(${-spread})`}>
          <path
            d="M 0 0 C 5 -3.4 11 -3 12.6 0.4 C 11 3.4 4.6 3.6 0 1 z"
            fill={WING}
            stroke={OUTLINE}
            strokeWidth={0.7}
            strokeLinejoin="round"
            opacity={0.92}
          />
          <path d="M 1 0.4 C 5 -1 9 -1 11.8 0.4" stroke={OUTLINE} strokeWidth={0.5} fill="none" opacity={0.5} />
          <path d="M 2 -1 C 5 -1.8 8 -1.6 10 -0.6" stroke={OUTLINE} strokeWidth={0.4} fill="none" opacity={0.4} />
          <path d="M 2.4 1.4 C 5 1 8 1.2 10.4 1.2" stroke={OUTLINE} strokeWidth={0.4} fill="none" opacity={0.4} />
          <path d="M 0 0 C 5 -3.4 11 -3 12.6 0.4" stroke={CHITIN_DEEP} strokeWidth={0.8} fill="none" />
        </g>
      ))}
    </g>
  )
}

/** An antenna: a curve with a club at the end. */
function antenna(x: number, y: number, dir: 1 | -1, s: number, key: number) {
  return (
    <g key={key} transform={`translate(${x} ${y}) scale(${dir * s} ${s})`}>
      <path d="M 0 0 C 1.4 -4 4 -6.6 7 -7.6" fill="none" stroke={CARAPACE} strokeWidth={1.3} strokeLinecap="round" />
      <ellipse cx={7.6} cy={-8} rx={1.8} ry={1.3} fill={CHITIN} stroke={OUTLINE} strokeWidth={0.7} />
    </g>
  )
}

/**
 * Uncommon — Bug Pattern Castle.
 *
 * The standard castle in chitin: a band of honeycomb, a band of wings, beetle
 * marks between them, antennae on the keep and small wings on the battlements.
 *
 * The lightest possible touch, like Water's Rippled Castle and Space's Star
 * Pattern: everything is clipped to the walls and the keep, so the silhouette
 * is exactly the default one.
 */
function BugPatternCastle({ eliminated, uid }: DecorProps) {
  /** A beetle seen from above: one outline, wing-cases inside it. */
  const beetle = (x: number, y: number, s: number, key: number) => (
    <g key={key} transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={0} rx={4.2} ry={6} fill={CARAPACE} stroke={OUTLINE} strokeWidth={0.8} />
      <path d="M 0 -6 L 0 5.4" stroke={CHITIN_DEEP} strokeWidth={0.8} fill="none" />
      <path d="M -4 -2.6 C -2.4 -4.4 2.4 -4.4 4 -2.6" stroke={CHITIN_DEEP} strokeWidth={0.7} fill="none" />
      <ellipse cx={0} cy={-6.4} rx={2.4} ry={2} fill={CARAPACE} stroke={OUTLINE} strokeWidth={0.7} />
      <path d="M -1.4 -8.4 C -2 -10 -3 -10.6 -4 -10.8 M 1.4 -8.4 C 2 -10 3 -10.6 4 -10.8" stroke={CARAPACE} strokeWidth={0.8} fill="none" />
    </g>
  )

  return (
    <g className="skin skin--bugpattern" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-bp-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-bp-keep-${uid}`}>
        <rect x={-21} y={-59} width={42} height={48} rx={3} />
      </clipPath>

      {/* ---- the wall: three bands, each with one idea in it -------------
          ⚠️ ONE MOTIF PER BAND. Honeycomb, wings and beetles mixed evenly
          across the whole wall is a jumble; blocked into rows, each row reads
          at a glance and the wall reads as decorated rather than as busy. */}
      <g clipPath={`url(#skin-bp-wall-${uid})`}>
        {/* Honeycomb along the top. */}
        {[0, 1].map((row) =>
          Array.from({ length: 8 }, (_, i) => (
            <path
              key={`h${row}-${i}`}
              d={hexPath(-50 + i * 14 + (row % 2 ? 7 : 0), -18 + row * 9, 6.4)}
              fill="none"
              stroke={CHITIN_DEEP}
              strokeWidth={1.2}
              opacity={0.85}
            />
          )),
        )}
        <path d="M -52 -3 L 52 -3" stroke={CARAPACE} strokeWidth={1.6} fill="none" opacity={0.8} />
        {/* Wings through the middle. */}
        {[-38, -14, 14, 38].map((x, i) => (
          <g key={i}>{wings(x, 8, 0.85, i)}</g>
        ))}
        <path d="M -52 20 L 52 20" stroke={CARAPACE} strokeWidth={1.6} fill="none" opacity={0.8} />
        {/* Beetles along the foot. */}
        {[-44, -28, 28, 44].map((x, i) => (
          <g key={`b${i}`}>{beetle(x, 26, 0.72, i)}</g>
        ))}
      </g>

      {/* ---- the keep: one big beetle emblem ----------------------------- */}
      <g clipPath={`url(#skin-bp-keep-${uid})`}>
        {Array.from({ length: 3 }, (_, i) => (
          <path
            key={i}
            d={hexPath(-14 + i * 14, -52, 7)}
            fill="none"
            stroke={CHITIN_DEEP}
            strokeWidth={1.1}
            opacity={0.7}
          />
        ))}
        {wings(0, -30, 1.5, 10, 18)}
        {beetle(0, -30, 1.5, 11)}
      </g>

      {/* ---- antennae and wings on the battlements ----------------------
          Merlon centres come from the sprite: the wall's are at −46, −24, 24
          and 46 and the keep's at −15, 0 and 15. */}
      {antenna(-4, -63, -1, 1, 0)}
      {antenna(4, -63, 1, 1, 1)}
      {[-46, -24, 24, 46].map((x, i) => (
        <g key={i}>{wings(x, -28, 0.55, i + 10, 32)}</g>
      ))}

      {/* ---- the gate ---------------------------------------------------- */}
      <path
        d="M -12 30 L -12 15 C -12 4 12 4 12 15 L 12 30"
        fill="none"
        stroke={CARAPACE}
        strokeWidth={2.2}
      />
      <path d={hexPath(0, 12, 6)} fill="none" stroke={WING} strokeWidth={1.4} />
    </g>
  )
}

/**
 * Rare — Giant Hive.
 *
 * The fortress rebuilt as a hive: the whole face combed into cells with light
 * in them, hexagonal towers on the corners, honey running down the wall and
 * pooling at its foot, and bees working around it.
 *
 * ⚠️ THE COMB IS NOT A UNIFORM GRID. Every cell the same and every cell lit is
 * wallpaper — the pattern reads before the object does. A real comb has capped
 * cells, empty ones and full ones in irregular groups, and that variation is
 * what makes it a structure rather than a texture.
 */
function GiantHive({ eliminated, uid }: DecorProps) {
  /** A bee: striped body, a pair of wings, and enough head to point it. */
  const bee = (x: number, y: number, s: number, deg: number, key: number, cls?: string, delay = 0) => (
    <g key={key} className={cls} style={cls ? { animationDelay: `${delay}s` } : undefined}>
      <g transform={`translate(${x} ${y}) rotate(${deg}) scale(${s})`}>
        <g opacity={0.75}>
          <ellipse cx={-0.6} cy={-2.6} rx={3.4} ry={1.9} fill={WING} stroke={OUTLINE} strokeWidth={0.4} transform="rotate(-18)" />
          <ellipse cx={1.6} cy={-2.2} rx={3} ry={1.7} fill={WING} stroke={OUTLINE} strokeWidth={0.4} transform="rotate(14)" />
        </g>
        <ellipse cx={0} cy={0} rx={4.4} ry={3} fill={HONEY_LIT} stroke={OUTLINE} strokeWidth={0.8} />
        <path d="M -1.2 -2.8 L -1.2 2.8 M 1.4 -2.7 L 1.4 2.7" stroke={CARAPACE} strokeWidth={1.3} fill="none" />
        <ellipse cx={-4.6} cy={0} rx={1.7} ry={1.6} fill={CARAPACE} stroke={OUTLINE} strokeWidth={0.6} />
        <path d="M -5.4 -1.4 C -6.4 -2.6 -7.2 -3 -8 -3.2" stroke={CARAPACE} strokeWidth={0.7} fill="none" />
      </g>
    </g>
  )

  /** A hexagonal tower: a cell seen face-on, with depth cut into it. */
  const tower = (x: number, base: number, r: number, key: number) => (
    <g key={key}>
      <path d={hexPath(x, base - r * 0.92, r)} fill={HONEY} stroke={OUTLINE} strokeWidth={1.3} strokeLinejoin="round" />
      <path d={hexPath(x, base - r * 0.92, r * 0.66)} fill={CARAPACE} opacity={0.55} />
      <path d={hexPath(x, base - r * 0.92, r * 0.66)} fill={`url(#skin-gh-cell-${uid})`} />
      <path
        d={`M ${x - r * 0.66} ${base - r * 0.92} L ${x - r} ${base - r * 0.92}`}
        stroke={HONEY_LIT}
        strokeWidth={1}
        fill="none"
        opacity={0.8}
      />
    </g>
  )

  /* ⚠️ CELLS IN GROUPS, NOT AT RANDOM. Scattered lit cells look like noise;
     bees fill a comb outward from the middle, so the lit ones cluster. */
  const LIT = new Set([
    '0-3', '0-4', '1-3', '1-4', '1-5', '2-2', '2-3', '2-5', '3-3', '3-4', '4-3',
    '0-7', '1-7', '2-0', '3-0',
  ])
  const CAPPED = new Set(['0-0', '1-0', '2-7', '3-1', '3-7', '4-0', '4-6', '0-1'])

  return (
    <g className="skin skin--gianthive" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-gh-outside-${uid}`} clipRule="evenodd">
        <path
          d="M -92 -128 L 92 -128 L 92 44 L -92 44 z
             M -53 -25 L 53 -25 L 53 31 L -53 31 z
             M -21 -59 L 21 -59 L 21 -25 L -21 -25 z"
          clipRule="evenodd"
        />
      </clipPath>
      <clipPath id={`skin-gh-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-gh-keep-${uid}`}>
        <rect x={-21} y={-59} width={42} height={48} rx={3} />
      </clipPath>
      <defs>
        <radialGradient id={`skin-gh-cell-${uid}`}>
          <stop offset="0%" stopColor={HONEY_LIT} stopOpacity="0.95" />
          <stop offset="65%" stopColor={HONEY} stopOpacity="0.6" />
          <stop offset="100%" stopColor={HONEY} stopOpacity="0.25" />
        </radialGradient>
        <radialGradient id={`skin-gh-glow-${uid}`} gradientUnits="userSpaceOnUse" cx={0} cy={0} r={92}>
          <stop offset="0%" stopColor={HONEY_LIT} stopOpacity="0.16" />
          <stop offset="100%" stopColor={HONEY} stopOpacity="0" />
        </radialGradient>
      </defs>

      <g clipPath={`url(#skin-gh-outside-${uid})`}>
        <circle cx={0} cy={0} r={92} fill={`url(#skin-gh-glow-${uid})`} />
        {/* Bees working the outside of the hive. */}
        {bee(-66, -18, 1.15, -14, 0, 'skin__bee', 0)}
        {bee(64, -34, 1, 16, 1, 'skin__bee', -1.3)}
        {bee(-44, -52, 0.85, 8, 2, 'skin__bee', -2.6)}
        {bee(52, 8, 0.9, -10, 3, 'skin__bee', -3.9)}
      </g>

      {/* ---- the comb ---------------------------------------------------- */}
      <g clipPath={`url(#skin-gh-wall-${uid})`}>
        <rect x={-52} y={-24} width={104} height={54} fill={CARAPACE} opacity={0.9} />
        {Array.from({ length: 5 }, (_, row) =>
          Array.from({ length: 8 }, (_, i) => {
            const step = hexStep(8)
            const cx = -52 + i * step.x + (row % 2 ? step.x / 2 : 0)
            const cy = -20 + row * step.y
            const id = `${row}-${i}`
            const lit = LIT.has(id)
            const capped = CAPPED.has(id)
            return (
              <g key={id}>
                <path d={hexPath(cx, cy, 8)} fill={lit ? HONEY : '#2b3306'} stroke={OUTLINE} strokeWidth={1.1} />
                {lit ? <path d={hexPath(cx, cy, 6.2)} fill={`url(#skin-gh-cell-${uid})`} /> : null}
                {capped ? <path d={hexPath(cx, cy, 6.6)} fill={HONEY} opacity={0.75} /> : null}
                {!lit && !capped ? <path d={hexPath(cx, cy, 5.6)} fill="#1d2304" opacity={0.8} /> : null}
              </g>
            )
          }),
        )}
        {/* Honey running down between the cells and gathering at the foot.
            ⚠️ IT NEVER DRAWS A STRAIGHT LINE. Straight warm bands are Light's
            metal trim; honey is a liquid and has to behave like one. */}
        {[
          'M -30 -24 C -28 -12 -32 -2 -30 10 C -29 18 -31 24 -30 30',
          'M 8 -24 C 10 -14 6 -4 8 8 C 9 16 7 24 8 30',
          'M 38 -24 C 40 -16 36 -6 38 4 C 39 14 37 22 38 30',
        ].map((d, i) => (
          <g key={`r${i}`}>
            <path d={d} fill="none" stroke={HONEY} strokeWidth={4.4} opacity={0.55} strokeLinecap="round" />
            <path d={d} fill="none" stroke={HONEY_LIT} strokeWidth={1.6} opacity={0.9} strokeLinecap="round" />
          </g>
        ))}
        <path
          d="M -52 26 C -34 23 -18 28 0 25 C 18 22 34 27 52 24 L 52 30 L -52 30 z"
          fill={HONEY}
          opacity={0.8}
        />
        <path
          d="M -52 26 C -34 23 -18 28 0 25 C 18 22 34 27 52 24"
          fill="none"
          stroke={HONEY_LIT}
          strokeWidth={1.4}
          opacity={0.9}
        />
      </g>

      {/* ---- the keep: one great cell ------------------------------------ */}
      <g clipPath={`url(#skin-gh-keep-${uid})`}>
        <rect x={-21} y={-59} width={42} height={48} fill={CARAPACE} opacity={0.92} />
        <path d={hexPath(0, -34, 17)} fill={HONEY} stroke={OUTLINE} strokeWidth={1.4} />
        <path d={hexPath(0, -34, 13)} fill={`url(#skin-gh-cell-${uid})`} />
        <path d={hexPath(0, -34, 13)} fill="none" stroke={HONEY_LIT} strokeWidth={1} opacity={0.8} />
        {[-1, 1].map((side) => (
          <path
            key={side}
            d={hexPath(side * 17, -52, 7)}
            fill={HONEY}
            stroke={OUTLINE}
            strokeWidth={1.1}
            opacity={0.9}
          />
        ))}
      </g>

      {/* ---- hexagonal towers on the parapet ---------------------------- */}
      {tower(-46, -24, 9, 0)}
      {tower(-24, -24, 7, 1)}
      {tower(24, -24, 7, 2)}
      {tower(46, -24, 9, 3)}
      {tower(0, -58, 8, 4)}

      {/* Two bees working the face of the hive, in front of it. */}
      {bee(-14, 2, 1, 12, 10, 'skin__bee', -0.7)}
      {bee(26, -14, 0.95, -16, 11, 'skin__bee', -2.1)}

      {/* ---- the gate: the way in --------------------------------------- */}
      <path d={hexPath(0, 20, 13)} fill="#1d2304" stroke={OUTLINE} strokeWidth={1.4} />
      <path d={hexPath(0, 20, 10)} fill={`url(#skin-gh-cell-${uid})`} opacity={0.5} />
      <path d="M -11 30 L -11 15 C -11 4 11 4 11 15 L 11 30" fill="none" stroke={HONEY} strokeWidth={2.2} />
    </g>
  )
}

/**
 * Rare — Ant Colony.
 *
 * The castle as a nest: tunnels bored through packed earth with ants working
 * them, turf and flowers along the top, and spoil scattered round the foot.
 *
 * ⚠️ IT MUST NOT BE EARTH, AND IT MUST NOT BE NATURE. Earth owns cut stone and
 * bare rock, so this is SOIL — dark, loose, full of grit, never dressed. Nature
 * owns growing things, so the turf is a shallow band along the top and the
 * flowers are three or four heads on short stems: enough to say the nest is
 * under a meadow, never enough to be a garden. The subject is the tunnels and
 * the ants in them.
 */
function AntColony({ eliminated, uid }: DecorProps) {
  const SOIL = '#6b4a2a'
  const SOIL_DARK = '#3f2a16'
  const TUNNEL = '#221407'
  const GRIT = '#8a6742'
  const TURF = '#4f7a1e'
  const TURF_LIT = '#79ad33'
  const ANT = '#8f3f16'
  const ANT_DARK = '#2a1105'
  const ANT_LIT = '#c4703a'

  /**
   * An ant.
   *
   * ⚠️ THREE SEGMENTS, AND THE MIDDLE ONE IS SMALLEST. Two blobs and legs is a
   * spider; the head-thorax-abdomen rhythm, with a waist between the last two,
   * is what makes it an ant at six units long. The legs come off the MIDDLE
   * segment only, which is the other half of the read.
   */
  const ant = (x: number, y: number, s: number, deg: number, key: number) => (
    <g key={key} transform={`translate(${x} ${y}) rotate(${deg}) scale(${s})`}>
      {/* ⚠️ AN ANT THE COLOUR OF ITS TUNNEL IS AN INVISIBLE ANT. The first ten
          were drawn in the same near-black as the bores they walk through, and
          the colony simply was not there. Warm red-brown with a lit back is
          what a wood ant actually is, and it happens to be the one value that
          reads against both the dark of a tunnel and the mid-brown of soil. */}
      <path
        d="M -1.6 0 L -3.4 -2 M -1.6 0 L -3.8 0 M -1.6 0 L -3.4 2
           M 0.4 0 L 2.4 -2 M 0.4 0 L 2.6 0 M 0.4 0 L 2.4 2"
        stroke={ANT_DARK}
        strokeWidth={0.6}
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx={-3.4} cy={0} rx={2.2} ry={1.8} fill={ANT} stroke={ANT_DARK} strokeWidth={0.5} />
      <ellipse cx={-0.6} cy={0} rx={1.2} ry={1} fill={ANT} stroke={ANT_DARK} strokeWidth={0.5} />
      <ellipse cx={2} cy={0} rx={1.6} ry={1.4} fill={ANT} stroke={ANT_DARK} strokeWidth={0.5} />
      <ellipse cx={-3.6} cy={-0.6} rx={1.1} ry={0.6} fill={ANT_LIT} opacity={0.8} />
      <path d="M 3.2 -0.6 C 4.2 -1.8 5 -2 5.6 -2 M 3.2 0.6 C 4.2 1.8 5 2 5.6 2" stroke={ANT_DARK} strokeWidth={0.55} fill="none" />
    </g>
  )

  /** A tuft of grass with the odd flower in it. */
  const turf = (x: number, y: number, s: number, key: number, flower?: string) => (
    <g key={key} transform={`translate(${x} ${y}) scale(${s})`}>
      {[-4, -2, 0, 2, 4].map((dx, i) => (
        <path
          key={i}
          d={`M ${dx} 0 C ${dx + (i % 2 ? 1.4 : -1.4)} -3 ${dx + (i % 2 ? 2.4 : -2.4)} -5 ${dx + (i % 2 ? 2 : -2)} -7.5`}
          stroke={i % 2 ? TURF : TURF_LIT}
          strokeWidth={1.3}
          fill="none"
          strokeLinecap="round"
        />
      ))}
      {flower ? (
        <g>
          <path d="M 1 0 C 1.6 -4 2 -6 2.4 -9" stroke={TURF} strokeWidth={1} fill="none" />
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse
              key={a}
              cx={2.4}
              cy={-9}
              rx={1.9}
              ry={1.1}
              fill={flower}
              stroke={OUTLINE}
              strokeWidth={0.4}
              transform={`rotate(${a} 2.4 -9)`}
            />
          ))}
          <circle cx={2.4} cy={-9} r={1} fill={HONEY_LIT} stroke={OUTLINE} strokeWidth={0.4} />
        </g>
      ) : null}
    </g>
  )

  return (
    <g className="skin skin--antcolony" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-ac-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-ac-keep-${uid}`}>
        <rect x={-21} y={-59} width={42} height={48} rx={3} />
      </clipPath>

      {/* ---- spoil scattered round the foot ------------------------------ */}
      {[
        { x: -66, y: 36, r: 5 },
        { x: -58, y: 41, r: 3 },
        { x: -44, y: 38, r: 3.6 },
        { x: 46, y: 39, r: 4.4 },
        { x: 60, y: 35, r: 3.2 },
        { x: 68, y: 40, r: 5.4 },
        { x: 12, y: 40, r: 3 },
      ].map((d, i) => (
        <g key={i}>
          <path
            d={`M ${d.x - d.r} ${d.y} C ${d.x - d.r * 0.8} ${d.y - d.r * 0.9} ${d.x + d.r * 0.6} ${d.y - d.r} ${d.x + d.r} ${d.y} z`}
            fill={SOIL}
            stroke={OUTLINE}
            strokeWidth={0.8}
            strokeLinejoin="round"
          />
          <circle cx={d.x - d.r * 0.3} cy={d.y - d.r * 0.35} r={d.r * 0.18} fill={GRIT} opacity={0.8} />
        </g>
      ))}
      {ant(54, 36, 0.9, 12, 91)}

      {/* ---- the wall: packed earth, tunnelled through ------------------- */}
      <g clipPath={`url(#skin-ac-wall-${uid})`}>
        <rect x={-52} y={-24} width={104} height={54} fill={SOIL} />
        {/* Grit, so the fill reads as soil rather than as paint. */}
        {Array.from({ length: 40 }, (_, i) => {
          const gx = -50 + ((i * 37) % 100)
          const gy = -20 + ((i * 53) % 48)
          return <circle key={i} cx={gx} cy={gy} r={i % 3 === 0 ? 1.2 : 0.7} fill={i % 2 ? GRIT : SOIL_DARK} opacity={0.55} />
        })}
        {/* ⚠️ THE TUNNELS ARE A NETWORK, NOT A PATTERN. Evenly spaced parallel
            bores are a radiator; a nest branches, doubles back, widens into
            chambers and dead-ends. Drawn as thick dark strokes with rounded
            caps, which is what a bored passage looks like in section. */}
        {[
          'M -52 -14 C -40 -12 -34 -18 -24 -14 C -14 -10 -8 -16 2 -14',
          'M -24 -14 C -22 -4 -28 2 -26 12 L -28 26',
          'M 2 -14 C 8 -6 4 2 10 8 C 16 14 12 22 16 30',
          'M -26 12 C -16 14 -8 10 2 12 C 10 14 16 10 24 12',
          'M 24 12 C 30 6 26 -2 32 -8 L 34 -18',
          'M -40 -12 C -44 -4 -40 4 -44 12 L -42 24',
          'M 34 -18 C 42 -16 46 -20 52 -18',
        ].map((d, i) => (
          <g key={`t${i}`}>
            {/* ⚠️ NARROWER THAN THEY WERE. At nine units across, the bores were
                as wide as the ants were long and the wall read as a cave
                system; a nest tunnel is barely wider than the animal in it.
                Thinner runs also let the soil between them read, which is what
                makes the network look dug rather than drawn. */}
            <path d={d} fill="none" stroke={SOIL_DARK} strokeWidth={6.2} strokeLinecap="round" />
            <path d={d} fill="none" stroke={TUNNEL} strokeWidth={4.2} strokeLinecap="round" />
          </g>
        ))}
        {/* Chambers where the runs meet. */}
        {[
          { x: -24, y: -14, r: 4.4 },
          { x: -26, y: 12, r: 5 },
          { x: 24, y: 12, r: 4 },
          { x: 34, y: -18, r: 3.6 },
        ].map((c, i) => (
          <g key={`c${i}`}>
            <circle cx={c.x} cy={c.y} r={c.r + 1.2} fill={SOIL_DARK} />
            <circle cx={c.x} cy={c.y} r={c.r} fill={TUNNEL} />
          </g>
        ))}
        {/* The colony at work: ants along the runs, facing the way they go. */}
        {/* ⚠️ FOUR, NOT TEN. A wall crawling with insects is unsettling rather
            than charming — the eye starts counting legs. A few ants spaced well
            apart read as a working colony and let the tunnels be the subject,
            which is what the skin is actually about. */}
        {ant(-40, -12.6, 1, 6, 0)}
        {ant(-26.5, 2, 1, 84, 1)}
        {ant(12, 9, 1, 40, 2)}
        {ant(42, -17.4, 0.95, -8, 3)}
      </g>

      {/* ---- the keep: the deep nest ------------------------------------- */}
      <g clipPath={`url(#skin-ac-keep-${uid})`}>
        <rect x={-21} y={-59} width={42} height={48} fill={SOIL} />
        {Array.from({ length: 16 }, (_, i) => (
          <circle
            key={i}
            cx={-18 + ((i * 29) % 38)}
            cy={-56 + ((i * 41) % 44)}
            r={i % 3 === 0 ? 1.1 : 0.7}
            fill={i % 2 ? GRIT : SOIL_DARK}
            opacity={0.5}
          />
        ))}
        {['M 0 -11 C -6 -20 2 -28 -2 -36 C -6 -44 0 -50 -2 -58', 'M -2 -36 C 4 -34 10 -38 14 -34', 'M 2 -28 C -6 -26 -12 -30 -16 -26'].map(
          (d, i) => (
            <g key={i}>
              <path d={d} fill="none" stroke={SOIL_DARK} strokeWidth={5.6} strokeLinecap="round" />
              <path d={d} fill="none" stroke={TUNNEL} strokeWidth={3.8} strokeLinecap="round" />
            </g>
          ),
        )}
        <circle cx={-2} cy={-36} r={6.4} fill={SOIL_DARK} />
        <circle cx={-2} cy={-36} r={5} fill={TUNNEL} />
        {/* The queen's chamber, with eggs in it. */}
        {[
          [-3.6, -37.6],
          [-0.6, -38.4],
          [-2.6, -34.8],
          [0.6, -35.2],
        ].map(([ex, ey], i) => (
          <ellipse key={i} cx={ex} cy={ey} rx={1.2} ry={0.9} fill={WING} opacity={0.85} />
        ))}
        {ant(-2, -18, 1, -80, 20)}
      </g>

      {/* ---- turf along the top ------------------------------------------
          Merlon centres come from the sprite: the wall's are at −46, −24, 24
          and 46 and the keep's at −15, 0 and 15. The turf sits between them so
          the battlements still read. */}
      {/* ⚠️ THE TURF SITS BETWEEN THE MERLONS, NOT OVER THEM. A band across the
          whole parapet buried the battlements, and the castle lost the notched
          top edge players read it by. The sprite's merlons are at −46, −24, 24
          and 46; the grass goes in the gaps. */}
      <path
        d="M -52 -21 C -44 -24 -36 -19 -28 -22 C -18 -25 -8 -19 2 -22
           C 12 -25 22 -19 32 -22 C 42 -25 48 -19 52 -21 L 52 -17 L -52 -17 z"
        fill={TURF}
        stroke={OUTLINE}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      {turf(-35, -21, 0.9, 0, '#f2f0e4')}
      {turf(-9, -22, 0.85, 1)}
      {turf(9, -21, 0.9, 2, '#e8698c')}
      {turf(35, -21, 0.8, 3)}
      <path
        d="M -21 -56 C -16 -58 -12 -54 -8 -56 C -2 -58 2 -54 8 -56 C 14 -58 18 -54 21 -56 L 21 -52 L -21 -52 z"
        fill={TURF}
        stroke={OUTLINE}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      {turf(-8, -56, 0.7, 4, '#f5d94a')}
      {turf(8, -56, 0.65, 5)}

      {/* ---- the gate: the way in --------------------------------------- */}
      <path d="M -11 30 L -11 15 C -11 4 11 4 11 15 L 11 30 z" fill={TUNNEL} />
      <path d="M -11 30 L -11 15 C -11 4 11 4 11 15 L 11 30" fill="none" stroke={SOIL_DARK} strokeWidth={2.6} />
      {ant(-4, 24, 1.1, -84, 30)}
    </g>
  )
}

/**
 * Legendary — The Weaver.
 *
 * The castle has lost. A spider stands over the keep with its legs braced on
 * the walls, and the web it has spun runs from the towers out to everything
 * around them — the fortress is a frame for the web now, not a fortress.
 *
 * ⚠️ THE WEB MAY CROSS THE CASTLE; NOTHING ELSE MAY. Silk is a hairline, and a
 * hairline over a silhouette does not hide it — that is the one exception the
 * rule has, and it is what makes "taken over" drawable at all. The spider's
 * BODY stays above the keep and its legs arc outside the walls, so the shape a
 * player reads through fog is still there under the threads.
 *
 * ⚠️ AND A SPIDER LEG BENDS UP BEFORE IT COMES DOWN. Drawn as a smooth curve
 * from body to floor it reads as a tentacle or a hair; the raised knee is the
 * whole silhouette of the animal, and eight of them make the shape recognisable
 * before any detail does.
 */
function TheWeaver({ eliminated, uid }: DecorProps) {
  const SILK = '#e8f0c8'
  const BODY = '#2b3407'
  const BODY_LIT = '#556b12'

  /**
   * One leg: femur out and UP to the knee, tibia down to the tip, tapering.
   * `reach` is how far out it plants, `lift` how high the knee rides.
   */
  const leg = (
    hipX: number,
    hipY: number,
    dir: 1 | -1,
    reach: number,
    lift: number,
    drop: number,
    w: number,
    key: number,
  ) => {
    const kneeX = hipX + dir * reach * 0.62
    const kneeY = hipY - lift
    /* ⚠️ THE FOOT COMES BACK IN. A leg that plants directly under its own knee
       is a stilt; a spider's tibia angles inward as it drops, which is what
       gives the whole animal its hunched stance. */
    const tipX = hipX + dir * reach * 0.86
    const tipY = hipY + drop
    const femur = `M ${hipX} ${hipY} Q ${hipX + dir * reach * 0.3} ${hipY - lift * 0.95} ${kneeX} ${kneeY}`
    const tibia = `M ${kneeX} ${kneeY} Q ${kneeX + dir * reach * 0.2} ${kneeY + (tipY - kneeY) * 0.5} ${tipX} ${tipY}`
    return (
      <g key={key}>
        {/* ⚠️ THE SEGMENTS TAPER. Drawn at one width from hip to foot, eight
            legs read as scaffolding poles — the animal disappears into its own
            structure. The femur is heavy, the tibia is two thirds of it, and
            the foot is a point. */}
        <path d={femur} fill="none" stroke={OUTLINE} strokeWidth={w + 1.6} strokeLinecap="round" />
        <path d={femur} fill="none" stroke={BODY} strokeWidth={w} strokeLinecap="round" />
        <path d={tibia} fill="none" stroke={OUTLINE} strokeWidth={w * 0.66 + 1.4} strokeLinecap="round" />
        <path d={tibia} fill="none" stroke={BODY} strokeWidth={w * 0.66} strokeLinecap="round" />
        {/* The last stretch, thinner still, so the leg comes to a foot. */}
        <path
          d={`M ${kneeX + dir * reach * 0.28} ${kneeY + (tipY - kneeY) * 0.62} Q ${tipX + dir * 2} ${tipY - 6} ${tipX} ${tipY}`}
          fill="none"
          stroke={BODY}
          strokeWidth={w * 0.34}
          strokeLinecap="round"
        />
        <circle cx={kneeX} cy={kneeY} r={w * 0.66} fill={BODY_LIT} stroke={OUTLINE} strokeWidth={0.9} />
        <path d={femur} fill="none" stroke={CHITIN} strokeWidth={w * 0.2} opacity={0.4} strokeLinecap="round" />
      </g>
    )
  }

  /** A wrapped bundle hanging on a thread: what the castle's defenders became. */
  const cocoon = (x: number, y: number, s: number, key: number, delay: number) => (
    <g key={key} className="skin__dangle" style={{ animationDelay: `${delay}s` }}>
      <path d={`M ${x} ${y - 26 * s} L ${x} ${y - 9 * s}`} stroke={SILK} strokeWidth={0.8} opacity={0.7} fill="none" />
      <ellipse cx={x} cy={y} rx={5 * s} ry={9 * s} fill={SILK} stroke={OUTLINE} strokeWidth={1} opacity={0.92} />
      {[-5, -1.5, 2, 5.5].map((dy, i) => (
        <path
          key={i}
          d={`M ${x - 4.6 * s} ${y + dy * s} Q ${x} ${y + (dy + 2) * s} ${x + 4.6 * s} ${y + dy * s}`}
          stroke={CARAPACE}
          strokeWidth={0.7}
          fill="none"
          opacity={0.35}
        />
      ))}
    </g>
  )

  /* Anchors the web is strung between: the tower tops and the frame's edges. */
  const HUB: [number, number] = [0, -52]
  const ANCHORS: [number, number][] = [
    [-88, -26],
    [-74, -84],
    [-30, -116],
    [26, -118],
    [72, -88],
    [88, -30],
    [76, 34],
    [-78, 36],
  ]

  return (
    <g className="skin skin--weaver" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-sw-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <defs>
        <radialGradient id={`skin-sw-aura-${uid}`} gradientUnits="userSpaceOnUse" cx={0} cy={-40} r={110}>
          <stop offset="0%" stopColor={CHITIN} stopOpacity="0.16" />
          <stop offset="100%" stopColor={CARAPACE} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`skin-sw-abdomen-${uid}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={BODY_LIT} />
          <stop offset="55%" stopColor={BODY} />
          <stop offset="100%" stopColor="#12180a" />
        </linearGradient>
      </defs>

      <circle cx={0} cy={-40} r={110} fill={`url(#skin-sw-aura-${uid})`} />

      {/* ---- the web ------------------------------------------------------
          Radials first, then the spiral strung between them. The whole thing
          shimmers together rather than moving, because a web that MOVES is a
          net being dragged; a web catches the light and holds still. */}
      <g className="skin__web">
        {ANCHORS.map(([ax, ay], i) => (
          <path
            key={`r${i}`}
            d={`M ${HUB[0]} ${HUB[1]} L ${ax} ${ay}`}
            stroke={SILK}
            strokeWidth={0.9}
            opacity={0.55}
            fill="none"
          />
        ))}
        {/* ⚠️ THE ANIMATION THIS SKIN NEEDED, AND WHY IT IS A DASH. The first
            pass breathed the whole web's opacity and shifted the spider by a
            unit and a half — true to how a real web behaves and completely
            invisible at the size a castle is actually seen. This runs a short
            bright segment down each radial instead: only `stroke-dashoffset`
            changes, so not one strand ever moves and the web still cannot
            sweep across the castle it is drawn over. Staggered, because eight
            pulses leaving the hub together is a starburst. */}
        {ANCHORS.map(([ax, ay], i) => (
          <path
            key={`p${i}`}
            className="skin__silk-pulse"
            style={{ animationDelay: `${-(i * 0.42).toFixed(2)}s` }}
            d={`M ${HUB[0]} ${HUB[1]} L ${ax} ${ay}`}
            stroke={SILK}
            strokeWidth={1.5}
            fill="none"
          />
        ))}
        {[0.3, 0.48, 0.66, 0.84, 1].map((t, ring) => (
          <path
            key={`s${ring}`}
            d={
              ANCHORS.map(([ax, ay], i) => {
                const x = HUB[0] + (ax - HUB[0]) * t
                const y = HUB[1] + (ay - HUB[1]) * t
                const [px, py] = ANCHORS[(i + ANCHORS.length - 1) % ANCHORS.length]!
                const cx = HUB[0] + ((ax + px) / 2 - HUB[0]) * t * 0.82
                const cy = HUB[1] + ((ay + py) / 2 - HUB[1]) * t * 0.82
                return `${i === 0 ? 'M' : 'Q'} ${i === 0 ? '' : `${cx.toFixed(1)} ${cy.toFixed(1)} `}${x.toFixed(1)} ${y.toFixed(1)}`
              }).join(' ') + ' z'
            }
            fill="none"
            stroke={SILK}
            strokeWidth={ring === 4 ? 0.9 : 0.7}
            opacity={0.42}
          />
        ))}
      </g>

      {/* Silk gathered where the web meets the stonework. */}
      <g clipPath={`url(#skin-sw-wall-${uid})`}>
        {[
          'M -52 -18 C -40 -14 -30 -20 -18 -16 C -6 -12 4 -18 16 -14 C 28 -10 40 -16 52 -12',
          'M -52 8 C -38 12 -26 6 -12 10 C 2 14 16 8 30 12 C 40 15 46 11 52 13',
        ].map((d, i) => (
          <path key={i} d={d} fill="none" stroke={SILK} strokeWidth={0.8} opacity={0.4} />
        ))}
        {[-52, 52].map((x, i) => (
          <path
            key={`c${i}`}
            d={`M ${x} -24 C ${x + (i ? -18 : 18)} -18 ${x + (i ? -14 : 14)} -4 ${x} 4 z`}
            fill={SILK}
            opacity={0.22}
          />
        ))}
      </g>

      {/* ---- the legs, braced on the walls ------------------------------- */}
      {leg(-9, -50, -1, 74, 40, 78, 5, 0)}
      {leg(-9, -46, -1, 58, 32, 74, 4.6, 1)}
      {leg(-9, -42, -1, 42, 24, 70, 4.2, 2)}
      {leg(-8, -38, -1, 26, 16, 64, 3.8, 3)}
      {leg(9, -50, 1, 74, 40, 78, 5, 4)}
      {leg(9, -46, 1, 58, 32, 74, 4.6, 5)}
      {leg(9, -42, 1, 42, 24, 70, 4.2, 6)}
      {leg(8, -38, 1, 26, 16, 64, 3.8, 7)}

      {/* ---- the spider itself ------------------------------------------- */}
      <g className="skin__spider">
        {/* Abdomen, above and behind the head end. */}
        <ellipse cx={0} cy={-64} rx={17} ry={15} fill={`url(#skin-sw-abdomen-${uid})`} stroke={OUTLINE} strokeWidth={1.4} />
        {/* The mark on its back: one shape, so it reads at 60%. */}
        <path
          d="M 0 -76 L 5 -68 L 2 -68 L 4 -58 L 0 -52 L -4 -58 L -2 -68 L -5 -68 z"
          fill={CHITIN}
          opacity={0.85}
        />
        <path d="M -14 -70 C -8 -74 8 -74 14 -70" fill="none" stroke={BODY_LIT} strokeWidth={1.2} opacity={0.7} />
        {/* Cephalothorax, lower and smaller. */}
        <ellipse cx={0} cy={-45} rx={11} ry={9} fill={BODY} stroke={OUTLINE} strokeWidth={1.4} />
        <path d="M -8 -48 C -4 -51 4 -51 8 -48" fill="none" stroke={BODY_LIT} strokeWidth={1.1} opacity={0.8} />
        {/* Eyes: two rows, the front pair larger. ⚠️ SIX, NOT TWO. Two eyes on
            a round head is a face and reads as a cartoon; the cluster is what
            says spider. */}
        {[
          { x: -4.6, y: -40, r: 2 },
          { x: 4.6, y: -40, r: 2 },
          { x: -1.6, y: -41.5, r: 1.2 },
          { x: 1.6, y: -41.5, r: 1.2 },
          { x: -7, y: -43, r: 1 },
          { x: 7, y: -43, r: 1 },
        ].map((e, i) => (
          <circle key={i} cx={e.x} cy={e.y} r={e.r} fill={WING} stroke={OUTLINE} strokeWidth={0.6} />
        ))}
        {/* Fangs. */}
        <path d="M -4 -37 C -4.6 -34 -3.6 -32 -2.6 -31" fill="none" stroke={OUTLINE} strokeWidth={1.6} strokeLinecap="round" />
        <path d="M 4 -37 C 4.6 -34 3.6 -32 2.6 -31" fill="none" stroke={OUTLINE} strokeWidth={1.6} strokeLinecap="round" />
      </g>

      {/* ---- what is left of the garrison -------------------------------- */}
      {cocoon(-62, 6, 1, 20, 0)}
      {cocoon(58, -6, 0.85, 21, -1.4)}
      {cocoon(34, 22, 0.7, 22, -2.8)}

      {/* The gate, webbed shut. */}
      <path d="M -11 30 L -11 15 C -11 4 11 4 11 15 L 11 30 z" fill="#12180a" />
      {[
        'M -11 22 C -4 18 4 24 11 20',
        'M -11 12 C -4 16 4 10 11 14',
        'M -6 30 C -2 20 -4 10 0 5',
        'M 6 30 C 3 20 5 10 2 5',
      ].map((d, i) => (
        <path key={i} d={d} fill="none" stroke={SILK} strokeWidth={0.9} opacity={0.75} />
      ))}
      <path d="M -11 30 L -11 15 C -11 4 11 4 11 15 L 11 30" fill="none" stroke={CARAPACE} strokeWidth={2.2} />
    </g>
  )
}

export const InsectsDecor = {
  'insects.bugpattern': BugPatternCastle,
  'insects.hive': GiantHive,
  'insects.ants': AntColony,
  'insects.butterfly': TheWeaver,
}
