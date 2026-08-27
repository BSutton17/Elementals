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
  /**
   * A vine: a curved stem with leaves alternating along it.
   *
   * ⚠️ THE LEAVES ARE PLACED FROM THE CURVE, not by hand. Leaves that do not sit
   * on the stem, or that all point the same way, read as scattered debris rather
   * than growth — the same failure Ice's frost had when its spurs were written
   * as loose line pairs. Sampling the quadratic gives each leaf a point on the
   * stem and a tangent to lie along.
   */
  const vine = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    bend: number,
    count: number,
    key: number,
  ) => {
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
        leaf(x, y, ang, 0.62 + (i % 3) * 0.12, i % 3 === 1 ? LEAF : LEAF_LIGHT, i),
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

export const NatureDecor = {
  'nature.vine': VineCastle,
  'nature.treehouse': TreehouseKingdom,
}
