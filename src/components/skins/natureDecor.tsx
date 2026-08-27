import type { DecorProps } from './decor'
import './skins.css'

/**
 * Nature's skin decorations.
 *
 * Drawn INSIDE the castle's local space, over the sprite — the keep occupies
 * roughly x −20…20, y −58…−12, the curtain wall x −52…52, y −24…30, and the
 * gate x −11…11, y 10…30. Anything here is layered on top of that.
 *
 * ⚠️ THE SILHOUETTE AND THE HUE ARE NOT NEGOTIABLE. Players pick out who is
 * attacking them from a small castle on a phone, often through fog. A skin may
 * add detail and texture; it may not obscure the shape, and it stays in Nature's
 * greens.
 *
 * ⚠️ ONE STROKED OUTLINE PER OBJECT, where an object is one continuous surface.
 * Everything inside it is an unstroked fill.
 */

const LEAF = '#4fae63'
const LEAF_LIGHT = '#8fe08a'
const BARK = '#6b4a30'
const BARK_DARK = '#3b2718'
const BLOOM = '#ffe9a8'
const OUTLINE = '#12301c'

/** A leaf: one teardrop with a midrib, pointing along `ang`. */
function leaf(x: number, y: number, ang: number, s: number, fill: string, key: number) {
  return (
    <g key={key} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(0)}) scale(${s})`}>
      <path d="M 0 0 C 4 -3.4 9.5 -2.4 12 0 C 9.5 2.4 4 3.4 0 0 z" fill={fill} stroke={OUTLINE} strokeWidth={0.9} strokeLinejoin="round" />
      <path d="M 1 0 L 10.5 0" stroke={OUTLINE} strokeWidth={0.7} opacity={0.45} />
    </g>
  )
}

/** A small flower: five petals round a centre. */
function bloom(x: number, y: number, r: number, key: number, petal = '#ffd9ef') {
  return (
    <g key={key} transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse
          key={a}
          cx={0}
          cy={-r}
          rx={r * 0.62}
          ry={r}
          fill={petal}
          transform={`rotate(${a})`}
          opacity={0.95}
        />
      ))}
      <circle cx={0} cy={0} r={r * 0.62} fill={BLOOM} />
    </g>
  )
}

/**
 * A vine: a curved stem with leaves alternating along it.
 *
 * ⚠️ THE LEAVES ARE PLACED FROM THE CURVE, not by hand. Leaves that do not sit
 * on the stem, or that all point the same way, read as scattered debris rather
 * than growth — the same failure Ice's frost had when its spurs were written
 * as loose line pairs. Sampling the quadratic gives each leaf a point on the
 * stem and a tangent to lie along.
 */
function vine(
ax: number,
ay: number,
bx: number,
by: number,
bend: number,
count: number,
key: number,
leafScale = 1,
) {
  const dx = bx - ax
  const dy = by - ay
  const len = Math.hypot(dx, dy) || 1
  const px = -dy / len
  const py = dx / len
  const cx = (ax + bx) / 2 + px * bend
  const cy = (ay + by) / 2 + py * bend
  const leaves = []
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1)
    const x = (1 - t) ** 2 * ax + 2 * (1 - t) * t * cx + t ** 2 * bx
    const y = (1 - t) ** 2 * ay + 2 * (1 - t) * t * cy + t ** 2 * by
    const tx = 2 * (1 - t) * (cx - ax) + 2 * t * (bx - cx)
    const ty = 2 * (1 - t) * (cy - ay) + 2 * t * (by - cy)
    const ang = (Math.atan2(ty, tx) * 180) / Math.PI + (i % 2 ? -52 : 52)
    leaves.push(
      leaf(x, y, ang, (0.62 + (i % 3) * 0.12) * leafScale, i % 3 === 1 ? LEAF : LEAF_LIGHT, i),
    )
  }
  return (
    <g key={key}>
      {/* ⚠️ GREEN ON GREEN IS INVISIBLE. Stems and leaves in the mid green sat
          on a castle of almost exactly that green, so only their dark outlines
          showed and the leaves read as hollow seed pods. Same lesson as Ice's
          icicles: contrast is relative to what is underneath, and growth has
          to be LIGHTER than the wall it is climbing. The castle's own paint
          was darkened to meet it halfway. */}
      <path
        d={`M ${ax} ${ay} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${bx} ${by}`}
        fill="none"
        stroke={LEAF_LIGHT}
        strokeWidth={1.9}
        strokeLinecap="round"
      />
      {leaves}
    </g>
  )
}

/**
 * Uncommon — Vine Castle.
 *
 * Growth working its way up the stone: stems climbing the walls, leaves along
 * them, and the odd flower where it has been long enough to bloom.
 *
 * The lightest possible touch, like Water's Rippled Castle and Fire's Ember
 * Stripes: everything is clipped to the walls and the keep, so the silhouette is
 * exactly the default one.
 */
function VineCastle({ eliminated, uid }: DecorProps) {
  return (
    <g className="skin skin--vine" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      <clipPath id={`skin-vine-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-vine-keep-${uid}`}>
        <rect x={-20} y={-58} width={40} height={46} rx={3} />
      </clipPath>

      <g clipPath={`url(#skin-vine-wall-${uid})`}>
        {/* Climbing from the footing, because that is where growth starts. */}
        {vine(-48, 32, -34, -26, 9, 5, 0)}
        {vine(-30, 32, -20, -6, -7, 4, 1)}
        {vine(46, 32, 34, -26, -9, 5, 2)}
        {vine(28, 32, 20, -2, 7, 4, 3)}
        {vine(-52, 6, -24, 14, 6, 3, 4)}
        {vine(52, 2, 26, 12, -6, 3, 5)}
        {bloom(-38, 4, 2.6, 100)}
        {bloom(31, -8, 2.2, 101)}
        {bloom(-27, 22, 2, 102)}
        {bloom(40, 18, 2.4, 103)}
      </g>

      <g clipPath={`url(#skin-vine-keep-${uid})`}>
        {vine(-18, -14, -8, -54, 6, 4, 0)}
        {vine(18, -14, 10, -46, -5, 3, 1)}
        {bloom(-11, -34, 2.2, 104)}
        {bloom(13, -28, 1.9, 105)}
      </g>

      {/* A few tendrils reaching over the parapet, so the growth looks like it
          is still going rather than stopping at a clean line. */}
      {[
        { d: 'M -44 -24 C -46 -30 -40 -32 -38 -28', x: -38, y: -28, a: -30 },
        { d: 'M 42 -24 C 44 -31 38 -33 36 -29', x: 36, y: -29, a: -150 },
        { d: 'M -12 -58 C -14 -64 -8 -66 -6 -62', x: -6, y: -62, a: -30 },
      ].map((t, i) => (
        <g key={i}>
          <path d={t.d} fill="none" stroke={LEAF_LIGHT} strokeWidth={1.6} strokeLinecap="round" />
          {leaf(t.x, t.y, t.a, 0.55, LEAF_LIGHT, i)}
        </g>
      ))}
    </g>
  )
}

/**
 * Rare — Treehouse Kingdom.
 *
 * The castle grown into something far older than it: limbs rising past the
 * walls and closing overhead, platforms lashed to them, plank bridges out to the
 * battlements, and roots spread across the footing.
 *
 * ⚠️ THE LIMBS PASS BEHIND THE CASTLE. Decorations draw ON TOP of the sprite, so
 * a branch crossing the walls would paint over them. Clipping to "everywhere
 * except the castle" — an even-odd path of the frame minus the wall and keep —
 * lets each limb disappear behind the silhouette and pick up on the far side,
 * which is the only way a tree can look like it is growing THROUGH a castle
 * rather than in front of one. The technique came from Electricity's containment
 * rings; the bridges and roots stay unclipped so they cross in front, which is
 * the same near/far split those rings needed.
 *
 * ⚠️ RARE MAY REACH PAST THE WALLS BUT NOT PAST THE FRAME, and it does not move.
 */
function TreehouseKingdom({ eliminated, uid }: DecorProps) {
  /** A limb: a tapering bark shape with a lit upper edge. */
  const limb = (d: string, edge: string, key: number, w = 1) => (
    <g key={key}>
      <path d={d} fill={BARK} stroke={OUTLINE} strokeWidth={1.6 * w} strokeLinejoin="round" />
      <path d={edge} fill="none" stroke={BARK_DARK} strokeWidth={1.4 * w} opacity={0.75} />
    </g>
  )

  /** A platform: planks with a bracket under them. */
  const platform = (x: number, y: number, w: number, key: number) => (
    <g key={key}>
      <rect x={x - w} y={y} width={w * 2} height={4} rx={1} fill={BARK} stroke={OUTLINE} strokeWidth={1.2} />
      {Array.from({ length: 4 }, (_, i) => (
        <path key={i} d={`M ${x - w + (i + 1) * ((w * 2) / 5)} ${y} L ${x - w + (i + 1) * ((w * 2) / 5)} ${y + 4}`} stroke={BARK_DARK} strokeWidth={0.9} opacity={0.7} />
      ))}
      <path d={`M ${x - w * 0.5} ${y + 4} L ${x} ${y + 9} L ${x + w * 0.5} ${y + 4}`} fill="none" stroke={BARK_DARK} strokeWidth={1.6} strokeLinejoin="round" />
    </g>
  )

  /** A plank bridge: two ropes with rungs between them. */
  const bridge = (ax: number, ay: number, bx: number, by: number, sag: number, key: number) => {
    const cx = (ax + bx) / 2
    const cy = (ay + by) / 2 + sag
    const rungs = []
    for (let i = 1; i <= 6; i++) {
      const t = i / 7
      const x = (1 - t) ** 2 * ax + 2 * (1 - t) * t * cx + t ** 2 * bx
      const y = (1 - t) ** 2 * ay + 2 * (1 - t) * t * cy + t ** 2 * by
      rungs.push(
        <rect key={i} x={x - 3.4} y={y - 1} width={6.8} height={2.2} rx={0.8} fill={BARK} stroke={OUTLINE} strokeWidth={0.7} />,
      )
    }
    return (
      <g key={key}>
        <path d={`M ${ax} ${ay - 5} Q ${cx} ${cy - 5} ${bx} ${by - 5}`} fill="none" stroke={BARK_DARK} strokeWidth={1.1} />
        <path d={`M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`} fill="none" stroke={BARK_DARK} strokeWidth={1.1} />
        {rungs}
      </g>
    )
  }

  return (
    <g className="skin skin--treehouse" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      <clipPath id={`skin-tree-outside-${uid}`} clipRule="evenodd">
        <path
          d="M -92 -128 L 92 -128 L 92 44 L -92 44 z
             M -53 -25 L 53 -25 L 53 31 L -53 31 z
             M -21 -59 L 21 -59 L 21 -11 L -21 -11 z"
          clipRule="evenodd"
        />
      </clipPath>

      {/* ---- the limbs, growing through -------------------------------- */}
      <g clipPath={`url(#skin-tree-outside-${uid})`}>
        {limb(
          'M -92 44 L -60 44 C -66 6 -58 -40 -34 -76 C -24 -90 -14 -100 -8 -108 L -20 -114 C -30 -104 -42 -88 -52 -70 C -74 -34 -80 8 -92 44 z',
          'M -62 40 C -66 4 -56 -40 -34 -74',
          0,
        )}
        {/* ⚠️ THE TWO LIMBS MUST NOT MATCH. Mirroring one curve gave a
            perfectly symmetrical span, and a symmetrical span is an ARCHWAY — a
            gateway the castle happens to be standing under, not a tree it grew
            inside. This one is thicker, leans further out, and tops out lower
            than its opposite. */}
        {limb(
          'M 92 44 L 58 44 C 66 4 62 -30 42 -62 C 32 -76 20 -86 12 -92 L 24 -100 C 38 -88 52 -72 62 -52 C 78 -24 84 12 92 44 z',
          'M 60 40 C 66 2 60 -30 42 -60',
          1,
        )}
        {/* Secondary limbs branching outward. */}
        {limb(
          'M -70 -8 C -80 -18 -88 -22 -92 -22 L -92 -30 C -84 -30 -74 -24 -66 -14 z',
          'M -70 -10 C -80 -20 -88 -24 -92 -24',
          2,
          0.8,
        )}
        {limb(
          'M 68 -18 C 78 -30 86 -34 92 -34 L 92 -42 C 84 -42 74 -34 65 -23 z',
          'M 68 -20 C 78 -32 86 -36 92 -36',
          3,
          0.8,
        )}
        {/* Foliage where the limbs close overhead. */}
        {/* ⚠️ SIX LEAVES AT SIXTY DEGREES IS A STARFISH. An evenly-spaced
            radial burst reads as a flower or a sea creature, never as foliage.
            The jitter below is deterministic rather than random — a skin has to
            render identically every frame — but it is enough to break the
            rotational symmetry that was doing the damage. */}
        {/* ⚠️ NO SOLID MASS BEHIND THE LEAVES. This was a lobed green shape with
            a scattering of leaves on it, and it read as exactly that: a green
            rectangle with decoration. A canopy is made of leaves — if they do
            not close up on their own the answer is MORE LEAVES, not a fill to
            hide the gaps between them. */}
        {[
          { x: -66, y: -80, s: 1.6, n: 6 },
          { x: -52, y: -92, s: 1.9, n: 7 },
          { x: -36, y: -102, s: 2.1, n: 8 },
          { x: -18, y: -110, s: 2.3, n: 8 },
          { x: 0, y: -116, s: 2.4, n: 8 },
          { x: 18, y: -110, s: 2.3, n: 8 },
          { x: 34, y: -101, s: 2.1, n: 7 },
          { x: 50, y: -90, s: 1.9, n: 7 },
          { x: 64, y: -78, s: 1.6, n: 6 },
          { x: -44, y: -86, s: 1.7, n: 6 },
          { x: -10, y: -98, s: 2, n: 7 },
          { x: 26, y: -92, s: 1.9, n: 7 },
          { x: 58, y: -68, s: 1.4, n: 5 },
          { x: -60, y: -68, s: 1.4, n: 5 },
          { x: -48, y: -60, s: 1.2, n: 6 },
          { x: 46, y: -50, s: 1.15, n: 7 },
          { x: -82, y: -26, s: 1, n: 5 },
          { x: 84, y: -34, s: 1, n: 5 },
        ].map((c, i) => (
          <g key={i} transform={`translate(${c.x} ${c.y}) scale(${c.s})`}>
            {Array.from({ length: c.n }, (_, j) => {
              const spread = 360 / c.n
              const ang = j * spread + ((j * 37 + i * 11) % 26) - 13
              const sc = 0.82 + (((j * 13 + i * 7) % 5) * 0.11)
              const off = ((j * 17 + i * 5) % 4) - 1.5
              return leaf(off, off * 0.6, ang, sc, j % 3 === 0 ? LEAF_LIGHT : LEAF, j)
            })}
          </g>
        ))}
      </g>

      {/* ---- roots across the footing, in front -------------------------
          ⚠️ A ROOT IS NOT A WEDGE. The first set were flat triangles laid along
          the bottom edge, which read as blocks of timber propped against the
          wall rather than as something the tree had put into the ground. These
          leave from under the wall, run out and down, and taper to a point —
          with a knuckle partway along, because a root that changes direction
          once looks grown and a straight one looks cut. */}
      {[
        {
          d: 'M -50 28 C -60 31 -66 35 -76 37 C -82 38 -86 40 -90 43 L -84 44 C -80 42 -74 40 -68 39 C -58 37 -50 34 -44 31 z',
          top: 'M -50 29 C -62 32 -70 37 -82 40',
        },
        {
          d: 'M -26 29 C -34 33 -42 37 -54 40 C -58 41 -60 42 -62 44 L -52 44 C -44 41 -34 37 -22 33 z',
          top: 'M -26 30 C -36 34 -46 38 -58 42',
        },
        {
          d: 'M 48 28 C 60 32 68 36 78 38 C 84 39 88 41 92 44 L 84 44 C 80 42 74 41 68 40 C 58 38 50 35 44 32 z',
          top: 'M 48 29 C 62 33 72 38 84 41',
        },
        {
          d: 'M 24 29 C 34 34 44 38 56 41 C 60 42 62 43 64 44 L 54 44 C 46 42 36 38 20 34 z',
          top: 'M 24 30 C 36 35 46 39 58 43',
        },
      ].map((r, i) => (
        <g key={i}>
          <path d={r.d} fill={BARK} stroke={OUTLINE} strokeWidth={1.3} strokeLinejoin="round" />
          {/* A lit upper edge, so the root has a top rather than being a flat
              silhouette. */}
          <path d={r.top} fill="none" stroke={BARK_DARK} strokeWidth={1.2} opacity={0.6} />
        </g>
      ))}
      {/* Knuckles where the roots break the surface. */}
      {[
        { x: -70, y: 38 },
        { x: -44, y: 41 },
        { x: 72, y: 39 },
        { x: 42, y: 40 },
      ].map((k, i) => (
        <ellipse key={i} cx={k.x} cy={k.y} rx={5} ry={2.2} fill={BARK} stroke={OUTLINE} strokeWidth={1} />
      ))}

      {/* ---- platforms and bridges, in front ---------------------------- */}
      {platform(-66, -14, 13, 0)}
      {platform(68, -26, 12, 1)}
      {platform(-34, -74, 10, 2)}

      {bridge(-53, -12, -24, -25, 7, 0)}
      {bridge(55, -24, 26, -25, 6, 1)}
      {bridge(-34, -70, -12, -58, 5, 2)}

      {/* ---- glowing flowers, lighting the walkways -------------------- */}
      {[
        { x: -66, y: -20, r: 2.6 },
        { x: 68, y: -32, r: 2.4 },
        { x: -34, y: -80, r: 2.2 },
        { x: -78, y: 34, r: 2 },
        { x: 80, y: 36, r: 2.2 },
        { x: -14, y: -62, r: 1.9 },
      ].map((f, i) => (
        <g key={i}>
          <circle cx={f.x} cy={f.y} r={f.r * 3} fill={BLOOM} opacity={0.14} />
          {bloom(f.x, f.y, f.r, 200 + i, '#fff3c4')}
        </g>
      ))}
    </g>
  )
}

/**
 * A canopy: many overlapping leaf clusters, and nothing underneath them.
 *
 * ⚠️ NO SOLID MASS BEHIND THE LEAVES. The first canopy was a lobed green shape
 * with a scattering of leaves sitting on it, and it read as exactly that — a
 * green rectangle with decoration. A canopy is made of leaves; if there are not
 * enough of them to close up on their own, the answer is more leaves, not a
 * fill to hide the gaps. Density does the work here: fifteen-odd clusters
 * overlapping heavily, biggest in the middle where the crown is deepest.
 */
function canopyOf(
  clusters: { x: number; y: number; s: number; n: number }[],
  seed: number,
) {
  return clusters.map((c, i) => (
    <g key={i} transform={`translate(${c.x} ${c.y}) scale(${c.s})`}>
      {Array.from({ length: c.n }, (_, j) => {
        const spread = 360 / c.n
        const ang = j * spread + ((j * 37 + i * 11 + seed) % 26) - 13
        const sc = 0.82 + ((j * 13 + i * 7 + seed) % 5) * 0.11
        const off = ((j * 17 + i * 5 + seed) % 4) - 1.5
        return leaf(off, off * 0.6, ang, sc, j % 3 === 0 ? LEAF_LIGHT : LEAF, j)
      })}
    </g>
  ))
}

/**
 * Rare — Mushroom Fortress.
 *
 * A fungal wood the castle is standing in the middle of: caps from ankle-high
 * to taller than the keep, leaning off true, and some of them behind it.
 *
 * ⚠️ MUSHROOMS DO NOT GROW STRAIGHT UP. A stand of vertical stems is a row of
 * bollards — real ones lean toward light and away from each other, and the cap
 * tilts with the stem. Every stem here curves, and the caps tilt to match.
 *
 * ⚠️ AND SOME OF THEM ARE BEHIND. A wood the castle sits inside has growth on
 * both sides of it; everything in front reads as a hedge planted along a wall.
 * The behind ones use the same "everywhere except the castle" clip that
 * Electricity's rings and the World Tree's limbs use.
 *
 * ⚠️ THE KEEP IS LEFT ALONE. "Some towers partially replaced" is the brief and
 * the corner towers are the ones that can afford it — the keep is the tallest
 * point of the silhouette and the thing players read at 60% scale.
 *
 * ⚠️ THIS IS WHERE NATURE LEAVES ITS GREENS, deliberately: "colorful" is the
 * brief and a bloom that is all one hue is moss.
 */
function MushroomFortress({ eliminated, uid }: DecorProps) {
  const CAP_RED = '#e0574f'
  const CAP_VIOLET = '#a878d8'
  const CAP_AMBER = '#e8a94a'
  const CAP_PINK = '#f08fb8'
  const STEM = '#f0e7d2'
  const GLOW = '#bfffcf'

  type Shroom = {
    x: number
    y: number
    h: number
    r: number
    c: string
    lean: number
    spots?: boolean
  }

  /**
   * One mushroom. `lean` is how far the cap sits off the base, and the stem
   * curves to reach it rather than kinking — a leaning stem that is straight
   * reads as a signpost knocked askew.
   */
  const shroom = (m: Shroom, key: number) => {
    const cx = m.x + m.lean
    const top = m.y - m.h
    const tilt = m.lean * 0.45
    return (
      <g key={key}>
        <path
          d={`M ${m.x - m.r * 0.22} ${m.y}
              C ${m.x - m.r * 0.26} ${m.y - m.h * 0.45} ${cx - m.r * 0.32} ${m.y - m.h * 0.78} ${cx - m.r * 0.28} ${top}
              L ${cx + m.r * 0.28} ${top}
              C ${cx + m.r * 0.32} ${m.y - m.h * 0.78} ${m.x + m.r * 0.26} ${m.y - m.h * 0.45} ${m.x + m.r * 0.22} ${m.y} z`}
          fill={STEM}
          stroke={OUTLINE}
          strokeWidth={1.1}
          strokeLinejoin="round"
        />
        <g transform={`rotate(${tilt.toFixed(1)} ${cx} ${top})`}>
          {/* Gill-light: the glow under the cap, which is the enchanted part. */}
          <path
            d={`M ${cx - m.r * 0.86} ${top} C ${cx - m.r * 0.5} ${top + m.r * 0.3} ${cx + m.r * 0.5} ${top + m.r * 0.3} ${cx + m.r * 0.86} ${top} z`}
            fill={GLOW}
            opacity={0.5}
          />
          <path
            d={`M ${cx - m.r} ${top} C ${cx - m.r} ${top - m.r * 0.95} ${cx + m.r} ${top - m.r * 0.95} ${cx + m.r} ${top}
                C ${cx + m.r * 0.5} ${top + m.r * 0.16} ${cx - m.r * 0.5} ${top + m.r * 0.16} ${cx - m.r} ${top} z`}
            fill={m.c}
            stroke={OUTLINE}
            strokeWidth={1.3}
            strokeLinejoin="round"
          />
          {m.spots !== false &&
            [-0.45, 0.05, 0.5].map((o, i) => (
              <ellipse
                key={i}
                cx={cx + m.r * o}
                cy={top - m.r * (0.4 - Math.abs(o) * 0.24)}
                rx={m.r * 0.15}
                ry={m.r * 0.11}
                fill={STEM}
                opacity={0.9}
              />
            ))}
        </g>
      </g>
    )
  }

  /* Behind the castle: taller and leaning outward, so the wood reads as
     continuing past the fortress rather than stopping at its wall. */
  const BEHIND: Shroom[] = [
    { x: -30, y: 30, h: 62, r: 20, c: CAP_VIOLET, lean: -16 },
    { x: 26, y: 30, h: 70, r: 22, c: CAP_RED, lean: 15 },
    { x: -6, y: 30, h: 48, r: 14, c: CAP_AMBER, lean: -7, spots: false },
    { x: 8, y: 30, h: 40, r: 12, c: CAP_PINK, lean: 9, spots: false },
  ]

  /* In front: the giants on the flanks, then everything small. */
  const FRONT: Shroom[] = [
    { x: -66, y: 38, h: 56, r: 24, c: CAP_RED, lean: -13 },
    { x: 70, y: 38, h: 44, r: 20, c: CAP_VIOLET, lean: 12 },
    { x: -50, y: 38, h: 26, r: 14, c: CAP_AMBER, lean: 7, spots: false },
    { x: 56, y: 36, h: 30, r: 15, c: CAP_PINK, lean: -8 },
    { x: -86, y: 40, h: 22, r: 12, c: CAP_VIOLET, lean: -6, spots: false },
    { x: 88, y: 40, h: 26, r: 12, c: CAP_AMBER, lean: 7, spots: false },
    { x: -46, y: -22, h: 15, r: 13, c: CAP_PINK, lean: -5 },
    { x: 46, y: -22, h: 13, r: 11, c: CAP_AMBER, lean: 4, spots: false },
    { x: -70, y: 38, h: 9, r: 5.5, c: CAP_PINK, lean: 3, spots: false },
    { x: -58, y: 41, h: 6, r: 4.2, c: CAP_AMBER, lean: -2, spots: false },
    { x: -44, y: 39, h: 12, r: 6, c: CAP_VIOLET, lean: 4, spots: false },
    { x: -34, y: 42, h: 7, r: 4.4, c: CAP_RED, lean: -3, spots: false },
    { x: -16, y: 40, h: 9, r: 5, c: CAP_AMBER, lean: 3, spots: false },
    { x: -4, y: 42, h: 6, r: 3.8, c: CAP_PINK, lean: -2, spots: false },
    { x: 12, y: 39, h: 11, r: 5.6, c: CAP_VIOLET, lean: -4, spots: false },
    { x: 30, y: 41, h: 7, r: 4.6, c: CAP_RED, lean: 3, spots: false },
    { x: 44, y: 39, h: 12, r: 6, c: CAP_PINK, lean: -4, spots: false },
    { x: 64, y: 42, h: 7, r: 4.4, c: CAP_AMBER, lean: 3, spots: false },
  ]

  return (
    <g className="skin skin--mushroom" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      <clipPath id={`skin-shroom-outside-${uid}`} clipRule="evenodd">
        <path
          d="M -92 -128 L 92 -128 L 92 44 L -92 44 z
             M -53 -25 L 53 -25 L 53 31 L -53 31 z
             M -21 -59 L 21 -59 L 21 -11 L -21 -11 z"
          clipRule="evenodd"
        />
      </clipPath>
      <clipPath id={`skin-shroom-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>

      <g clipPath={`url(#skin-shroom-outside-${uid})`}>
        {BEHIND.map(shroom)}
      </g>

      {FRONT.map((m, i) => shroom(m, 100 + i))}

      {/* Shelf fungus out of the stone. */}
      <g clipPath={`url(#skin-shroom-wall-${uid})`}>
        {[
          { x: -34, y: 2, w: 11 },
          { x: -18, y: 20, w: 8 },
          { x: 20, y: -6, w: 10 },
          { x: 34, y: 16, w: 9 },
          { x: 4, y: 24, w: 7 },
        ].map((f, i) => (
          <g key={i}>
            <path
              d={`M ${f.x - f.w} ${f.y} C ${f.x - f.w * 0.8} ${f.y - f.w * 0.8} ${f.x + f.w * 0.5} ${f.y - f.w * 0.9} ${f.x + f.w} ${f.y - f.w * 0.15} C ${f.x + f.w * 0.4} ${f.y + f.w * 0.2} ${f.x - f.w * 0.4} ${f.y + f.w * 0.2} ${f.x - f.w} ${f.y} z`}
              fill={i % 2 ? CAP_AMBER : LEAF_LIGHT}
              stroke={OUTLINE}
              strokeWidth={1.1}
              strokeLinejoin="round"
            />
            <path
              d={`M ${f.x - f.w * 0.6} ${f.y} L ${f.x + f.w * 0.6} ${f.y}`}
              stroke={GLOW}
              strokeWidth={1.2}
              opacity={0.6}
            />
          </g>
        ))}
        {[
          { x: -44, y: 26 },
          { x: -8, y: 8 },
          { x: 12, y: 26 },
          { x: 44, y: 4 },
        ].map((g, i) => (
          <g key={i}>
            <circle cx={g.x} cy={g.y} r={5} fill={GLOW} opacity={0.16} />
            <circle cx={g.x} cy={g.y} r={1.7} fill={GLOW} />
          </g>
        ))}
      </g>

      {/* Spore-light. Many, and of every size: four evenly-sized dots read as
          dust on the lens. */}
      {[
        { x: -84, y: -30, r: 2.4 }, { x: -70, y: -6, r: 1.2 }, { x: -60, y: -44, r: 1.8 },
        { x: -48, y: -58, r: 1 }, { x: -36, y: -34, r: 2.1 }, { x: -30, y: 8, r: 1.3 },
        { x: -18, y: -48, r: 1.6 }, { x: -8, y: -70, r: 1.1 }, { x: 4, y: -40, r: 2.3 },
        { x: 14, y: -62, r: 1.4 }, { x: 24, y: -20, r: 1 }, { x: 32, y: -52, r: 1.9 },
        { x: 44, y: -36, r: 1.2 }, { x: 56, y: -60, r: 1.6 }, { x: 66, y: -26, r: 2.2 },
        { x: 74, y: -50, r: 1.1 }, { x: 84, y: -14, r: 1.5 }, { x: -76, y: -66, r: 1.3 },
        { x: 20, y: -84, r: 1.7 }, { x: -22, y: -88, r: 1.2 },
      ].map((s, i) => (
        <g key={i}>
          <circle cx={s.x} cy={s.y} r={s.r * 3.2} fill={GLOW} opacity={0.1} />
          <circle cx={s.x} cy={s.y} r={s.r} fill={GLOW} opacity={0.85} />
        </g>
      ))}
    </g>
  )
}

/**
 * Legendary — World Tree.
 *
 * A tree of a size the sprite cannot otherwise express, with a fortress at the
 * foot of it that the roots have already taken.
 *
 * ⚠️ THE CASTLE IS SHRUNK TO 0.55 (see `paint.scale`). Everything before this
 * tried to make the tree look enormous while the castle stayed the size it
 * always is, and it never worked — a trunk wide enough to dwarf a full-size
 * castle simply filled the frame and stopped being a trunk, because a shape
 * with nothing beside it has no scale to be read against. Scale is a RATIO. The
 * cheapest way to make one thing huge is to make the other thing small, and the
 * clip bounds below follow the shrunken castle rather than the default one.
 *
 * ⚠️ THAT IS A COST, NOT A FREE WIN: a smaller castle is a smaller tap target
 * and a slightly harder read on a crowded battlefield. Worth it for one
 * legendary in sixteen kingdoms, and not a thing to repeat.
 *
 * ⚠️ AND IT MUST NOT BE TREEHOUSE KINGDOM. That is habitation — platforms,
 * bridges, somewhere people live. This is possession: nothing built, and the
 * castle losing.
 */
function WorldTree({ eliminated, uid }: DecorProps) {
  const GLOW = '#c8ffb0'

  /* The castle at 0.62, anchored at its footing: wall x ±32.2 / y −3.5…30,
     keep x ±12.4 / y −24.6…4. The clip holes have to match, or limbs pass in
     front of a castle they should be behind.
     ⚠️ 0.55 WAS TOO FAR. It looked right in the shop and disappeared entirely
     at 60% battlefield scale — which is the size that actually matters, because
     that is where a player has to pick out who is attacking them. Judge a
     shrink at battlefield scale, never in the detail view. */
  const HOLES = `M -33 -4 L 33 -4 L 33 31 L -33 31 z
                 M -13 -25 L 13 -25 L 13 5 L -13 5 z`

  const bough = (d: string, shade: string, key: number, w = 1.6) => (
    <g key={key}>
      <path d={d} fill={BARK} stroke={OUTLINE} strokeWidth={w} strokeLinejoin="round" />
      <path d={shade} fill="none" stroke={BARK_DARK} strokeWidth={1.4} opacity={0.65} />
    </g>
  )

  return (
    <g className="skin skin--worldtree" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      <clipPath id={`skin-world-outside-${uid}`} clipRule="evenodd">
        <path d={`M -92 -128 L 92 -128 L 92 44 L -92 44 z ${HOLES}`} clipRule="evenodd" />
      </clipPath>

      <g clipPath={`url(#skin-world-outside-${uid})`}>
        {/* The trunk. Well over twice the castle's width and leaving the top of
            the frame, which it can only do because the castle is small. */}
        <path
          d="M -50 44 C -47 6 -42 -26 -38 -56 C -36 -74 -35 -92 -34 -112
             L 34 -112 C 35 -92 36 -74 38 -56 C 42 -26 47 6 50 44 z"
          fill={BARK}
          stroke={OUTLINE}
          strokeWidth={2.2}
          strokeLinejoin="round"
        />
        {/* The hollow the tree has grown around. Clipped to everything except
            the castle, so it reads as a dark recess FRAMING the fortress rather
            than a shape on top of it — and that ring of shadow is what keeps a
            castle this small findable against bark at battlefield scale. */}
        <path
          d="M -44 32 C -46 6 -42 -14 -34 -30 C -26 -44 -10 -50 0 -50
             C 10 -50 26 -44 34 -30 C 42 -14 46 6 44 32 z"
          fill="#1b1109"
          opacity={0.92}
        />
        <path
          d="M -40 32 C -42 8 -38 -12 -31 -27 C -24 -39 -9 -45 0 -45
             C 9 -45 24 -39 31 -27 C 38 -12 42 8 40 32 z"
          fill="none"
          stroke={BARK_DARK}
          strokeWidth={2}
          opacity={0.8}
        />
        {[
          'M -44 42 C -41 4 -36 -30 -33 -96',
          'M -18 44 C -18 6 -18 -34 -17 -104',
          'M 16 44 C 16 6 16 -34 15 -104',
          'M 44 42 C 41 4 36 -30 33 -96',
        ].map((d, i) => (
          <path key={i} d={d} fill="none" stroke={BARK_DARK} strokeWidth={1.9} opacity={0.6} />
        ))}

        {/* Limbs out and back DOWN over the fortress — the tree closing round
            it rather than standing behind it. */}
        {/* ⚠️ LIMBS REACH UP. Sweeping them out and back DOWN made the tree
            look like it was drooping over the castle — closer to a willow than
            to something ancient and enormous. A tree that size lifts; the
            weight reads in the trunk, not in the branches hanging. */}
        {bough(
          'M -36 -60 C -56 -66 -74 -78 -86 -98 L -78 -104 C -68 -86 -52 -74 -34 -70 z',
          'M -37 -62 C -56 -68 -72 -79 -84 -97',
          0,
        )}
        {bough(
          'M 36 -66 C 58 -72 78 -84 90 -104 L 82 -110 C 72 -92 54 -80 34 -76 z',
          'M 37 -68 C 58 -74 76 -85 88 -103',
          1,
        )}
        {bough(
          'M -38 -34 C -54 -38 -68 -46 -78 -58 L -70 -64 C -62 -52 -50 -46 -36 -43 z',
          'M -39 -36 C -54 -40 -66 -47 -76 -58',
          2,
          1.4,
        )}
        {bough(
          'M 38 -40 C 56 -44 70 -52 80 -64 L 72 -70 C 64 -58 52 -52 36 -49 z',
          'M 39 -42 C 56 -46 68 -53 78 -64',
          3,
          1.4,
        )}
      </g>

      {/* ---- roots ------------------------------------------------------
          Long, and they dive and surface — a root that holds one height is a
          log, and the crossings are only legible because these change depth. */}
      {[
        {
          d: 'M -40 30 C -54 42 -66 26 -80 38 C -85 42 -89 39 -92 42 L -92 37 C -88 34 -84 38 -78 33 C -64 21 -52 36 -38 25 z',
          s: 'M -40 32 C -56 43 -66 28 -80 39',
        },
        {
          d: 'M -26 32 C -40 41 -50 27 -64 40 C -70 45 -74 41 -78 44 L -78 39 C -73 36 -69 40 -62 34 C -46 21 -38 35 -24 27 z',
          s: 'M -26 34 C -42 43 -50 29 -64 41',
        },
        {
          d: 'M 40 30 C 56 43 68 25 82 39 C 86 43 90 39 92 42 L 92 37 C 88 34 85 38 80 34 C 64 20 52 37 38 25 z',
          s: 'M 40 32 C 56 44 68 27 82 40',
        },
        {
          d: 'M 26 32 C 42 42 52 26 66 41 C 72 46 76 42 80 44 L 80 39 C 75 36 71 40 64 35 C 48 21 38 36 24 27 z',
          s: 'M 26 34 C 44 44 52 28 66 42',
        },
        {
          d: 'M -14 33 C -36 25 -54 45 -74 35 C -82 31 -88 36 -92 32 L -92 27 C -86 31 -80 26 -70 30 C -52 38 -36 19 -12 27 z',
          s: 'M -14 35 C -36 27 -54 46 -74 37',
        },
        {
          d: 'M 14 33 C 38 24 56 46 76 36 C 84 31 88 36 92 32 L 92 27 C 87 31 81 26 72 31 C 54 39 38 18 12 27 z',
          s: 'M 14 35 C 38 26 56 47 76 38',
        },
      ].map((r, i) => (
        <g key={i}>
          <path d={r.d} fill={BARK} stroke={OUTLINE} strokeWidth={1.4} strokeLinejoin="round" />
          <path d={r.s} fill="none" stroke={BARK_DARK} strokeWidth={1.2} opacity={0.6} />
          <path
            d={r.s}
            fill="none"
            stroke={GLOW}
            strokeWidth={1.4}
            strokeLinecap="round"
            opacity={0.8}
            strokeDasharray="9 26"
            className="skin__sap"
            style={{ animationDelay: `${i * 0.7}s` }}
          />
        </g>
      ))}

      {/* ⚠️ VINES ON THE CASTLE, NOT ROOTS. Bark climbing the walls read as more
          of the same timber and simply thickened the trunk — the castle looked
          armoured rather than overgrown. Vines are the softer, greener thing
          the uncommon already uses, and they say "taken" without adding more
          brown to a frame that is mostly brown. Leaves are scaled down to match
          a castle at 0.62; at full size they would swamp it. */}
      <clipPath id={`skin-world-castle-${uid}`}>
        <rect x={-33} y={-25} width={66} height={56} rx={3} />
      </clipPath>
      <g clipPath={`url(#skin-world-castle-${uid})`}>
        {vine(-30, 31, -22, -2, 5, 4, 0, 0.62)}
        {vine(-13, 31, -8, 3, -4, 3, 1, 0.62)}
        {vine(30, 31, 22, -3, -5, 4, 2, 0.62)}
        {vine(13, 31, 8, 5, 4, 3, 3, 0.62)}
        {vine(-10, 4, -5, -22, 4, 3, 4, 0.55)}
        {vine(10, 4, 6, -19, -4, 3, 5, 0.55)}
      </g>
      {/* A few tendrils over the parapet, so the growth is still going. */}
      {[
        { d: 'M -26 -4 C -28 -9 -22 -11 -20 -7', x: -20, y: -7, a: -30 },
        { d: 'M 26 -4 C 28 -10 22 -12 20 -8', x: 20, y: -8, a: -150 },
        { d: 'M -8 -25 C -10 -30 -4 -32 -2 -28', x: -2, y: -28, a: -30 },
      ].map((t, i) => (
        <g key={i}>
          <path d={t.d} fill="none" stroke={LEAF_LIGHT} strokeWidth={1.3} strokeLinecap="round" />
          {leaf(t.x, t.y, t.a, 0.45, LEAF_LIGHT, i)}
        </g>
      ))}

      {/* ---- the crown ---------------------------------------------------
          Leaves big enough that a handful fill the sky, which is the other half
          of what makes the trunk beneath them look enormous. */}
      <g className="skin__canopy-sway">
        {canopyOf(
          [
            { x: -78, y: -80, s: 2.9, n: 6 },
            { x: -52, y: -98, s: 3.6, n: 7 },
            { x: -22, y: -112, s: 4.2, n: 7 },
            { x: 10, y: -118, s: 4.4, n: 7 },
            { x: 42, y: -108, s: 3.8, n: 7 },
            { x: 68, y: -92, s: 3.2, n: 6 },
            { x: 86, y: -70, s: 2.4, n: 5 },
            { x: -88, y: -58, s: 2.2, n: 5 },
            { x: -36, y: -84, s: 2.8, n: 6 },
            { x: 28, y: -88, s: 3, n: 6 },
          ],
          3,
        )}
      </g>

      {/* Light coming up out of the ground where the roots run. */}
      {[-74, -36, 34, 74].map((x, i) => (
        <ellipse
          key={i}
          cx={x}
          cy={41}
          rx={16}
          ry={4}
          fill={GLOW}
          opacity={0.14}
          className="skin__sap-glow"
          style={{ animationDelay: `${i * 0.8}s` }}
        />
      ))}

      {/* Spores drifting up through the crown. */}
      {[
        { x: -66, y: 22, r: 1.8, d: 0 },
        { x: -34, y: 0, r: 1.4, d: 1.7 },
        { x: 30, y: 14, r: 1.6, d: 0.9 },
        { x: 62, y: -8, r: 1.5, d: 2.6 },
        { x: -50, y: -34, r: 1.3, d: 3.4 },
        { x: 52, y: -40, r: 1.5, d: 2 },
      ].map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.r}
          fill={GLOW}
          opacity={0.7}
          className="skin__mote"
          style={{ animationDelay: `${s.d}s` }}
        />
      ))}
    </g>
  )
}

export const NatureDecor = {
  'nature.vine': VineCastle,
  'nature.treehouse': TreehouseKingdom,
  'nature.mushroom': MushroomFortress,
  'nature.worldtree': WorldTree,
}
