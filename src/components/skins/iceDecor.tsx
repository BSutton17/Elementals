import type { DecorProps } from './decor'
import './skins.css'

/**
 * Ice's skin decorations.
 *
 * Drawn INSIDE the castle's local space, over the sprite — the keep occupies
 * roughly x −20…20, y −58…−12, the curtain wall x −52…52, y −24…30, and the
 * gate x −11…11, y 10…30. Anything here is layered on top of that.
 *
 * ⚠️ THE SILHOUETTE AND THE HUE ARE NOT NEGOTIABLE. Players pick out who is
 * attacking them from a small castle on a phone, often through fog. A skin may
 * add detail and texture; it may not obscure the shape, and it stays in Ice's
 * cyans.
 *
 * ⚠️ AND IT MUST NOT BECOME WATER'S FROZEN HARBOR. Water already owns a
 * frost-and-icicle skin. Ice leans on what that one does not have: snowflake
 * geometry and creeping frost tracery for the uncommon, and architecture —
 * arches, spires, lit interiors — for the rare.
 *
 * ⚠️ ONE STROKED OUTLINE PER OBJECT, where an object is one continuous surface.
 * Everything inside it is an unstroked fill.
 */

const FROST = '#eafaff'
const ICE = '#a8e8ff'
const ICE_DEEP = '#3f9fd0'
const OUTLINE = '#0b2c45'

/**
 * Uncommon — Frost Patterns.
 *
 * Snowflakes and creeping frost across the stone, with icicles hung off the
 * parapet and the keep.
 *
 * The lightest possible touch, like Water's Rippled Castle and Fire's Ember
 * Stripes: the patterns are clipped to the walls, so the only thing that leaves
 * the outline is the icicles, and those hang inside the castle's own footprint.
 */
function FrostPatterns({ eliminated, uid }: DecorProps) {
  /**
   * A six-armed flake: three diameters plus spurs.
   *
   * Real snowflakes are six-fold symmetric, and getting that wrong is the sort
   * of thing that reads as "off" long before anyone can say why.
   */
  const flake = (x: number, y: number, r: number, o: number, key: number) => (
    <g
      key={key}
      transform={`translate(${x} ${y})`}
      stroke={FROST}
      strokeWidth={r * 0.11}
      strokeLinecap="round"
      fill="none"
      opacity={o}
    >
      {[0, 60, 120].map((a) => (
        <path key={a} d={`M ${-r} 0 L ${r} 0`} transform={`rotate(${a})`} />
      ))}
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          <path d={`M ${r * 0.58} 0 l ${-r * 0.24} ${-r * 0.24}`} />
          <path d={`M ${r * 0.58} 0 l ${-r * 0.24} ${r * 0.24}`} />
          <path d={`M ${r * 0.86} 0 l ${-r * 0.16} ${-r * 0.16}`} />
          <path d={`M ${r * 0.86} 0 l ${-r * 0.16} ${r * 0.16}`} />
        </g>
      ))}
    </g>
  )

  /**
   * Frost creeping from a point: a stem with leaflets angled FORWARD along it.
   *
   * ⚠️ HAND-WRITTEN SPURS CROSSED INTO SCRATCHES. Writing these as loose
   * `M`/`L` pairs put leaflets on both sides at whatever angle looked right in
   * the numbers, and at stroke width they crossed each other into X shapes that
   * read as scribble. Deriving them from the stem direction keeps every leaflet
   * at a consistent 60° and pointing the way the frost is travelling, which is
   * what makes it read as growth.
   */
  const fern = (
    x: number,
    y: number,
    dx: number,
    dy: number,
    len: number,
    spurs: number,
    key: number,
  ) => {
    const L = Math.hypot(dx, dy) || 1
    const ux = dx / L
    const uy = dy / L
    let d = `M ${x} ${y} L ${(x + ux * len).toFixed(1)} ${(y + uy * len).toFixed(1)}`
    for (let i = 1; i <= spurs; i++) {
      const t = i / (spurs + 1)
      const px = x + ux * len * t
      const py = y + uy * len * t
      // Shorter towards the tip, the way a frond tapers.
      const sl = len * 0.28 * (1 - t * 0.45)
      const ax = (ux * 0.5 + uy * 0.866) * sl
      const ay = (uy * 0.5 - ux * 0.866) * sl
      const bx = (ux * 0.5 - uy * 0.866) * sl
      const by = (uy * 0.5 + ux * 0.866) * sl
      d += ` M ${px.toFixed(1)} ${py.toFixed(1)} l ${ax.toFixed(1)} ${ay.toFixed(1)}`
      d += ` M ${px.toFixed(1)} ${py.toFixed(1)} l ${bx.toFixed(1)} ${by.toFixed(1)}`
    }
    return (
      <path
        key={key}
        d={d}
        fill="none"
        stroke={FROST}
        strokeWidth={1.2}
        strokeLinecap="round"
        opacity={0.8}
      />
    )
  }

  /** Icicles hanging off an edge. Uneven — an even row is a comb. */
  const icicles = (
    y: number,
    spikes: { x: number; len: number; w: number }[],
    key: number,
  ) => (
    <g key={key}>
      {spikes.map((s, i) => (
        <path
          key={i}
          d={`M ${s.x - s.w} ${y} L ${s.x + s.w} ${y} L ${s.x} ${y + s.len} z`}
          // ⚠️ ICE ON ICE IS INVISIBLE. Filling these with the same blue as the
          // castle left only the dark outline showing, so they read as hollow
          // spikes bitten out of the wall rather than as icicles hanging off it.
          // The fill has to be the brightest thing in the skin.
          fill={FROST}
          stroke={ICE_DEEP}
          strokeWidth={0.7}
          strokeLinejoin="round"
          opacity={0.95}
        />
      ))}
    </g>
  )

  return (
    <g className="skin skin--frost" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      <clipPath id={`skin-frost-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-frost-keep-${uid}`}>
        <rect x={-20} y={-58} width={40} height={46} rx={3} />
      </clipPath>

      <g clipPath={`url(#skin-frost-wall-${uid})`}>
        {/* Frost creeping in from the corners, where it always starts. */}
        {fern(-52, -24, 1, 1, 26, 3, 0)}
        {fern(-52, 30, 1, -0.85, 22, 3, 1)}
        {fern(52, -24, -1, 1, 26, 3, 2)}
        {fern(52, 30, -1, -0.85, 22, 3, 3)}
        {fern(-52, 4, 1, 0.2, 16, 2, 4)}
        {fern(52, 8, -1, -0.2, 16, 2, 5)}
        {flake(-28, 6, 9, 0.85, 100)}
        {flake(20, -8, 7, 0.7, 101)}
        {flake(40, 20, 5.5, 0.6, 102)}
        {flake(-44, 12, 5, 0.55, 103)}
      </g>

      <g clipPath={`url(#skin-frost-keep-${uid})`}>
        {fern(-20, -58, 1, 1, 16, 2, 10)}
        {fern(20, -12, -1, -1, 16, 2, 11)}
        {flake(2, -34, 7, 0.8, 104)}
      </g>

      {/* ⚠️ OFF THE KEEP'S BATTLEMENTS, NOT ITS UNDERSIDE. Hanging these at the
          bottom of the keep put a row of white spikes straight across the middle
          of the castle, which read as TEETH rather than as icicles — and the
          brief says they hang from the towers. */}
      {icicles(
        -51,
        [
          { x: -15, len: 6, w: 1.6 },
          { x: -8, len: 10, w: 1.9 },
          { x: 0, len: 5, w: 1.4 },
          { x: 8, len: 12, w: 2 },
          { x: 15, len: 7, w: 1.5 },
        ],
        200,
      )}
      {icicles(
        -24,
        [
          { x: -44, len: 9, w: 1.9 },
          { x: -36, len: 5, w: 1.5 },
          { x: -24, len: 12, w: 2.2 },
          { x: 26, len: 7, w: 1.7 },
          { x: 36, len: 14, w: 2.3 },
          { x: 45, len: 6, w: 1.6 },
        ],
        201,
      )}
    </g>
  )
}

/**
 * Rare — Ice Palace.
 *
 * Not a castle with frost on it — a palace CUT from ice by somebody who is no
 * longer around: an arcade of pointed arches along the curtain, spires rising
 * off the parapet, and light coming up through all of it from somewhere inside.
 *
 * ⚠️ ARCHES ARE CORRECT HERE, and that is a deliberate exception. Lit arched
 * niches had to be pulled out of Fire's Supernova because they turned a cosmic
 * fortress into a hotel — but "massive frozen arches" is the brief for this one,
 * and reading as ARCHITECTURE is the entire point of an ancient civilisation's
 * palace. The rule was never "no arches"; it was "do not let a skin become a
 * building by accident".
 *
 * ⚠️ RARE MAY REACH PAST THE WALLS BUT NOT PAST THE FRAME. The spires clear the
 * parapet and stop well short of the edges, the same allowance Air's Skyship and
 * Fire's Foundry take.
 */
function IcePalace({ eliminated, uid }: DecorProps) {
  /** A spire: one faceted outline, facets and inner light as unstroked fills. */
  const spire = (x: number, base: number, h: number, w: number, key: number) => (
    <g key={key} transform={`translate(${x} ${base})`}>
      <path
        d={`M 0 ${-h} L ${w} ${-h * 0.62} L ${w * 0.72} 0 L ${-w * 0.72} 0 L ${-w} ${-h * 0.62} z`}
        fill={ICE}
        stroke={OUTLINE}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      <path
        d={`M 0 ${-h} L ${-w} ${-h * 0.62} L ${-w * 0.72} 0 L 0 0 z`}
        fill={ICE_DEEP}
        opacity={0.55}
      />
      {/* The light inside it. */}
      <path
        d={`M 0 ${-h * 0.72} L ${w * 0.34} ${-h * 0.34} L 0 ${-h * 0.08} L ${-w * 0.34} ${-h * 0.34} z`}
        fill={FROST}
        opacity={0.75}
      />
    </g>
  )

  /**
   * A freestanding arch: two legs and a span, cut from ice.
   *
   * ⚠️ THESE STAND BESIDE THE PALACE, NOT IN ITS WALL. Cutting big openings
   * into the curtain turned the castle into a FACADE WITH GARAGE DOORS — three
   * dark mouths in a row along the footing, which is a warehouse. Monuments
   * flanking the building give the same "massive frozen arches" without the
   * castle having to pretend it is a shopfront, and they carry far more scale
   * because they run the full height of the sprite.
   */
  const monument = (side: number, key: number) => (
    <g key={key} transform={`scale(${side} 1)`}>
      <path
        // ⚠️ HEAVIER THAN FEELS RIGHT ON PAPER. Legs eight units wide against a
        // seventy-unit rise read as SKINNY AND AWKWARD - wire, not carved ice.
        // "Massive" means the leg has to be a serious fraction of the opening,
        // so these are half again as thick and the whole arch is shorter.
        d="M 46 38 L 50 -6 Q 50 -32 67 -32 Q 84 -32 84 -6 L 88 38 L 75 38 L 72 -6
           Q 72 -19 67 -19 Q 62 -19 62 -6 L 59 38 z"
        fill={ICE}
        stroke={OUTLINE}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      {/* The shaded face, so the arch has depth rather than being a flat band. */}
      <path
        d="M 88 38 L 84 -6 Q 84 -28 70 -31 Q 78 -25 78 -6 L 82 38 z"
        fill={ICE_DEEP}
        opacity={0.5}
      />
      {/* A lit inner edge — light from the palace catching on the ice. */}
      <path
        d="M 59 38 L 62 -6 Q 62 -19 67 -19"
        fill="none"
        stroke={FROST}
        strokeWidth={1.6}
        opacity={0.8}
      />
      {/* Facet seams down each leg, so the ice reads as cut rather than cast. */}
      {['M 52 36 L 56 -4', 'M 82 36 L 78 -4', 'M 67 -32 L 67 -19'].map((d, i) => (
        <path key={i} d={d} fill="none" stroke={FROST} strokeWidth={1.1} opacity={0.5} />
      ))}
      {/* Keystone at the crown of the span. */}
      <path d="M 61 -30 L 67 -38 L 73 -30 L 70 -24 L 64 -24 z" fill={FROST} opacity={0.85} stroke={OUTLINE} strokeWidth={0.9} strokeLinejoin="round" />
      {/* Plinths, so the legs land on something. */}
      {[{x: 43, w: 18}, {x: 72, w: 18}].map((b, i) => (
        <rect key={i} x={b.x} y={30} width={b.w} height={5} rx={1.2} fill={ICE} stroke={OUTLINE} strokeWidth={1.1} />
      ))}
    </g>
  )

  return (
    <g className="skin skin--icepalace" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      {/* ⚠️ ONE FOUNDATION, OR IT IS THREE OBJECTS. The monuments read as
          separate props parked either side of a castle until something carried
          underneath all of them. A terrace does that, and it is also what an
          ancient site would actually have: the building and its arches share a
          platform because they were cut at the same time. */}
      <path
        d="M -92 38 L 92 38 L 92 44 L -92 44 z"
        fill={ICE_DEEP}
        stroke={OUTLINE}
        strokeWidth={1.4}
      />
      <path
        d="M -76 33 L 76 33 L 80 38 L -80 38 z"
        fill={ICE}
        stroke={OUTLINE}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <path d="M -76 33 L 76 33 L 76 35 L -76 35 z" fill={FROST} opacity={0.7} />
      {/* Ice sheeting the curtain: broad facet planes with lit seams where two
          planes meet, which is what makes a flat surface look cut. */}
      <clipPath id={`skin-palace-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-palace-keep-${uid}`}>
        <rect x={-20} y={-58} width={40} height={46} rx={3} />
      </clipPath>

      <g clipPath={`url(#skin-palace-wall-${uid})`}>
        {[
          { d: 'M -52 -24 L -26 -24 L -38 30 L -52 30 z', f: ICE_DEEP, o: 0.3 },
          { d: 'M -26 -24 L 6 -24 L 16 8 L -8 30 L -38 30 z', f: ICE, o: 0.24 },
          { d: 'M 6 -24 L 30 -24 L 28 6 L 16 8 z', f: ICE_DEEP, o: 0.2 },
          { d: 'M 30 -24 L 52 -24 L 52 30 L 22 30 L 28 6 z', f: ICE, o: 0.28 },
        ].map((f, i) => (
          <path key={i} d={f.d} fill={f.f} opacity={f.o} />
        ))}
        {['M -26 -24 L -38 30', 'M 6 -24 L 16 8 L -8 30', 'M 30 -24 L 28 6 L 22 30'].map((d, i) => (
          <path key={i} d={d} fill="none" stroke={FROST} strokeWidth={1.3} opacity={0.7} />
        ))}
      </g>

      <g clipPath={`url(#skin-palace-keep-${uid})`}>
        {[
          { d: 'M -20 -58 L -6 -58 L -11 -12 L -20 -12 z', f: ICE_DEEP, o: 0.32 },
          { d: 'M -6 -58 L 9 -58 L 5 -12 L -11 -12 z', f: ICE, o: 0.26 },
        ].map((f, i) => (
          <path key={i} d={f.d} fill={f.f} opacity={f.o} />
        ))}
        {['M -6 -58 L -11 -12', 'M 9 -58 L 5 -12'].map((d, i) => (
          <path key={i} d={d} fill="none" stroke={FROST} strokeWidth={1.2} opacity={0.65} />
        ))}
      </g>

      {/* The arcade. Lit from behind, so the palace looks occupied. */}
      {[-1, 1].map((side, i) => monument(side, i))}

      {/* No buttresses here. They were added to close the gap between arch and
          castle, but the monument's inner leg already overlaps the curtain, so
          all they did was add a small angled tab either side of the gate. The
          terrace underneath and the cornice above are what actually bind this
          into one building. */}

      {/* The gate arch is TRACED, not filled. A filled one is a bright bar,
          which reads as a door with a lamp behind it rather than as a threshold
          with a lit hall beyond — the same lesson Fire's Supernova needed. */}
      <path d="M -15 30 L -15 8 C -15 -3 15 -3 15 8 L 15 30 z" fill={FROST} opacity={0.2} />
      <path
        d="M -12 30 L -12 8 C -12 0 12 0 12 8 L 12 30"
        fill="none"
        stroke={FROST}
        strokeWidth={2.4}
        opacity={0.85}
      />

      {/* A cornice along the parapet. The spires were separate objects standing
          in a row until a continuous course ran under them. */}
      <path d="M -53 -27 L 53 -27 L 53 -22 L -53 -22 z" fill={ICE} stroke={OUTLINE} strokeWidth={1.2} />
      <path d="M -53 -27 L 53 -27 L 53 -25.4 L -53 -25.4 z" fill={FROST} opacity={0.8} />
      <path d="M -21 -61 L 21 -61 L 21 -56 L -21 -56 z" fill={ICE} stroke={OUTLINE} strokeWidth={1.1} />
      <path d="M -21 -61 L 21 -61 L 21 -59.6 L -21 -59.6 z" fill={FROST} opacity={0.8} />

      {/* Spires off the parapet and the keep, tallest at the flanks. */}
      {[
        { x: -47, base: -24, h: 31, w: 6.2 },
        { x: -36, base: -24, h: 14, w: 4 },
        { x: -27, base: -24, h: 21, w: 4.6 },
        { x: 28, base: -24, h: 17, w: 4.2 },
        { x: 37, base: -24, h: 27, w: 5.4 },
        { x: 47, base: -24, h: 13, w: 3.8 },
        { x: -12, base: -58, h: 16, w: 4 },
        { x: 13, base: -58, h: 24, w: 5 },
      ].map((s, i) => spire(s.x, s.base, s.h, s.w, i))}
    </g>
  )
}

/**
 * Rare — Glacier Fortress.
 *
 * A castle cut into the flank of something much bigger than it: enormous ice
 * walls shouldering up either side, frozen falls hanging off them, and snow
 * lying on every horizontal surface.
 *
 * ⚠️ THE GLACIER STAYS OUTSIDE THE CURTAIN. Ice walls that overlapped the
 * castle would bury the silhouette players read through fog, so the masses
 * begin where the wall ends. They are also deliberately angular — a glacier is
 * fractured, and rounded lobes would read as more cloud, which Air already owns.
 */
function GlacierFortress({ eliminated, uid }: DecorProps) {
  /**
   * A frozen fall: a sheet of ice down a face, fringed with icicles.
   *
   * ⚠️ NO POOL AT THE BOTTOM. A tapering column with an ellipse under it is an
   * EXCLAMATION MARK, which is exactly what the first pass looked like — four
   * of them standing around the castle. The fringe does the job of saying the
   * fall ends here, and says "frozen" while it is at it.
   */
  const fall = (x: number, y: number, w: number, h: number, key: number) => (
    <g key={key}>
      <path
        d={`M ${x - w} ${y} L ${x + w} ${y} L ${x + w * 0.86} ${y + h} L ${x - w * 0.86} ${y + h} z`}
        fill={ICE}
        stroke={OUTLINE}
        strokeWidth={1}
        strokeLinejoin="round"
        opacity={0.92}
      />
      {[-0.5, -0.15, 0.2, 0.55].map((o, i) => (
        <path
          key={i}
          d={`M ${x + w * o} ${y + 2} L ${x + w * o * 0.85} ${y + h - 2}`}
          stroke={FROST}
          strokeWidth={1.2}
          strokeLinecap="round"
          opacity={0.65}
        />
      ))}
      {[-0.6, -0.2, 0.2, 0.6].map((o, i) => (
        <path
          key={i}
          d={`M ${x + w * o - w * 0.2} ${y + h} L ${x + w * o + w * 0.2} ${y + h} L ${x + w * o} ${y + h + (i % 2 ? 4 : 7)} z`}
          fill={FROST}
          opacity={0.95}
        />
      ))}
    </g>
  )

  return (
    <g className="skin skin--glacier" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      {/* The masses themselves. Big angular blocks, darker behind and paler in
          front, so the flank reads as having depth. */}
      {[-1, 1].map((side) => (
        <g key={side} transform={`scale(${side} 1)`}>
          <path
            d="M 52 38 L 52 -40 L 58 -54 L 64 -44 L 71 -68 L 77 -52 L 83 -74 L 88 -56 L 90 -46 L 90 38 z"
            fill={ICE_DEEP}
            stroke={OUTLINE}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
          {/* Facet planes as unstroked fills — one outline per mass. */}
          <path d="M 71 -68 L 77 -52 L 72 38 L 52 38 L 52 -40 L 58 -54 L 64 -44 z" fill={ICE} opacity={0.32} />
          <path d="M 83 -74 L 88 -56 L 90 -46 L 90 38 L 80 38 z" fill={FROST} opacity={0.22} />
          {['M 71 -68 L 72 38', 'M 77 -52 L 80 38', 'M 83 -74 L 87 -20', 'M 58 -54 L 62 20', 'M 52 -14 L 90 -20', 'M 52 8 L 90 2', 'M 54 24 L 90 20'].map((d, i) => (
            <path key={i} d={d} fill="none" stroke={FROST} strokeWidth={1.2} opacity={0.5} />
          ))}
          {/* Snow lying on the upward faces. */}
          {[
            'M 52 -40 L 58 -54 L 62 -49 L 56 -36 z',
            'M 64 -44 L 71 -68 L 75 -62 L 68 -40 z',
            'M 77 -52 L 83 -74 L 87 -67 L 81 -48 z',
          ].map((d, i) => (
            <path key={i} d={d} fill={FROST} opacity={0.9} />
          ))}
        </g>
      ))}

      {/* Frozen falls off the glacier faces and the parapet. */}
      {fall(-70, -42, 10, 42, 0)}
      {fall(72, -48, 9, 48, 1)}
      {fall(-40, -24, 8, 26, 2)}
      {fall(34, -24, 9, 30, 3)}

      {/* Snow on the battlements. ⚠️ FLUSH, NOT DRAPED. Water's Frozen Harbor
          had caps that overhung each merlon and they read as little shirts hung
          out to dry; snow sits ON a surface. */}
      {[
        { x: -52, w: 14 },
        { x: -34, w: 12 },
        { x: -16, w: 10 },
        { x: 12, w: 12 },
        { x: 30, w: 12 },
        { x: 44, w: 14 },
      ].map((c, i) => (
        <path
          key={i}
          d={`M ${c.x} -24 q ${c.w * 0.3} -3.4 ${c.w * 0.55} -1 q ${c.w * 0.25} -2.6 ${c.w * 0.45} 1 z`}
          fill={FROST}
          opacity={0.95}
        />
      ))}
      {[-14, 0, 14].map((x, i) => (
        <path
          key={i}
          d={`M ${x - 6} -58 q 3 -3.2 6 -1 q 3 -2.4 6 1 z`}
          fill={FROST}
          opacity={0.95}
        />
      ))}

      {/* Rime creeping across the curtain, so the wall belongs to the glacier. */}
      <clipPath id={`skin-glacier-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <g clipPath={`url(#skin-glacier-wall-${uid})`}>
        {[
          { d: 'M -52 -24 L -30 -24 L -38 30 L -52 30 z', o: 0.26 },
          { d: 'M 26 -24 L 52 -24 L 52 30 L 20 30 z', o: 0.22 },
        ].map((f, i) => (
          <path key={i} d={f.d} fill={FROST} opacity={f.o} />
        ))}
        {/* Drifts, not a blob: angular, uneven, and banked against the wall. */}
        <path
          d="M -52 30 L -44 24 L -34 28 L -24 22 L -12 27 L 0 23 L 12 28 L 24 24 L 34 29 L 44 25 L 52 30 z"
          fill={FROST}
          opacity={0.9}
        />
      </g>
    </g>
  )
}

/**
 * Legendary — Frozen Crown.
 *
 * A citadel wearing a crown it did not carve: colossal shards standing in an
 * arc above and around it, smaller ones turning overhead, and aurora running
 * through the towers and the sky behind them.
 *
 * ⚠️ THIS IS THE PATTERN FOR EVERY LEGENDARY, established by Water's Leviathan.
 * It breaks the sprite's bounds — previews are framed to `CASTLE_VIEWBOX`, which
 * is sized for exactly this — it moves, and it has ONE signature form you see
 * before anything else. Air's Storm Titan had to be rebuilt because it had no
 * such form; the crown is this one's.
 *
 * ⚠️ THE ORBIT IS SMALL ON PURPOSE. Shards turning on a wide ring would sweep
 * straight through the castle, which is the one thing a skin may never do. The
 * turning ones ride a circle high enough that even its lowest point clears the
 * keep, and they counter-rotate so they stay upright the whole way round. The
 * big crown shards do not move at all — scale comes from them, motion from the
 * small ones.
 *
 * ⚠️ AURORA IS THE ONE PLACE ICE LEAVES ITS CYANS, and only just: a green and a
 * violet at low opacity behind everything else. An aurora that is only blue is
 * not an aurora.
 */
function FrozenCrown({ eliminated, uid }: DecorProps) {
  const AURORA_G = '#a8ffdd'
  const AURORA_V = '#cbb8ff'

  /** A shard standing at `deg` around a centre, pointing outward. */
  const shard = (
    cx: number,
    cy: number,
    deg: number,
    dist: number,
    len: number,
    w: number,
    key: number,
  ) => {
    const t = (deg * Math.PI) / 180
    const x = cx + Math.cos(t) * dist
    const y = cy + Math.sin(t) * dist
    return (
      <g key={key} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${deg + 90})`}>
        <path
          d={`M 0 ${-len} L ${w} ${-len * 0.52} L ${w * 0.6} ${len * 0.18} L ${-w * 0.6} ${len * 0.18} L ${-w} ${-len * 0.52} z`}
          fill={ICE}
          stroke={OUTLINE}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
        <path
          d={`M 0 ${-len} L ${-w} ${-len * 0.52} L ${-w * 0.6} ${len * 0.18} L 0 ${len * 0.18} z`}
          fill={ICE_DEEP}
          opacity={0.5}
        />
        <path
          d={`M 0 ${-len * 0.74} L ${w * 0.32} ${-len * 0.3} L 0 ${-len * 0.02} L ${-w * 0.32} ${-len * 0.3} z`}
          fill={FROST}
          opacity={0.8}
          className="skin__shardglow"
          style={{ animationDelay: `${(key % 5) * 0.8}s` }}
        />
      </g>
    )
  }

  /**
   * Ribbons: wide at the top, narrow at the foot, and curving as they fall.
   * Held out here so the gradient defs and the paths cannot drift apart.
   */
  const AURORA = [
    // ⚠️ THREE, AND OUT ON THE FLANKS. Four curtains spread across the whole
    // width put light directly behind the crown and the keep, which is where
    // the eye is supposed to go. Pushed outward they frame instead of crowd.
    { d: 'M -90 30 C -78 -14 -94 -58 -86 -104 L -48 -104 C -58 -58 -62 -14 -70 30 z', c: AURORA_G, dur: 11 },
    { d: 'M 54 28 C 68 -18 54 -62 60 -102 L 92 -102 C 88 -62 84 -18 74 28 z', c: AURORA_V, dur: 9.5 },
    { d: 'M -48 30 C -40 -10 -52 -44 -48 -76 L -22 -76 C -26 -44 -32 -10 -38 30 z', c: ICE, dur: 13 },
  ]

  return (
    <g className="skin skin--frozencrown" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      {/* ---- aurora, behind everything -----------------------------------
          ⚠️ THIS TOOK THREE WRONG TOOLS BEFORE THE RIGHT ONE. A mid-tone green
          at low opacity only made the background less black. Brightening the
          pigment turned it into a crisp bar of light. Stacking strokes of
          decreasing width to fake a falloff produced visible CONCENTRIC RINGS,
          because a stroke edge is hard however many you pile up.

          An SVG gradient with transparent stops is the only thing here that
          actually has soft edges, so each curtain is a tapering ribbon filled
          with one — transparent at both sides, brightest up the middle. Wide at
          the top and narrow at the foot, the way a curtain of light hangs. */}
      <defs>
        {AURORA.map((a, i) => (
          <linearGradient key={i} id={`skin-aurora-${uid}-${i}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={a.c} stopOpacity="0" />
            <stop offset="22%" stopColor={a.c} stopOpacity="0.05" />
            <stop offset="48%" stopColor={a.c} stopOpacity="0.15" />
            <stop offset="60%" stopColor={FROST} stopOpacity="0.17" />
            <stop offset="80%" stopColor={a.c} stopOpacity="0.05" />
            <stop offset="100%" stopColor={a.c} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {AURORA.map((a, i) => (
        <path
          key={i}
          d={a.d}
          fill={`url(#skin-aurora-${uid}-${i})`}
          className="skin__aurora"
          style={{ animationDuration: `${a.dur}s`, animationDelay: `${i * 1.4}s` }}
        />
      ))}

      {/* ---- the crown: colossal, still, and the thing you see first -----
          ⚠️ A CROWN IS A BAND WITH POINTS ON IT. Seven shards standing in an arc
          with gaps between them are stalagmites floating in formation — they
          never resolved into one object. The circlet is what makes it a crown,
          and the small shards fill the gaps so the ring reads as continuous. */}
      <path
        d="M -62.8 -48.4 A 66 66 0 0 1 62.8 -48.4 L 54.2 -45.6 A 57 57 0 0 0 -54.2 -45.6 z"
        fill={ICE}
        stroke={OUTLINE}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <path
        d="M -60.9 -52.3 A 62 62 0 0 1 60.9 -52.3 L 59.9 -50.4 A 60 60 0 0 0 -59.9 -50.4 z"
        fill={FROST}
        opacity={0.8}
      />
      {/* Stones set into the band. */}
      {[212, 232, 257, 283, 308, 328].map((deg, i) => {
        const t = (deg * Math.PI) / 180
        return (
          <circle
            key={i}
            cx={(Math.cos(t) * 61.5).toFixed(1)}
            cy={(-28 + Math.sin(t) * 61.5).toFixed(1)}
            r={2.6}
            fill={FROST}
            stroke={OUTLINE}
            strokeWidth={0.9}
            className="skin__shardglow"
            style={{ animationDelay: `${i * 0.5}s` }}
          />
        )
      })}

      {/* Small points between the tall ones, so the ring has no holes in it. */}
      {[212, 232, 257, 283, 308, 328].map((deg, i) =>
        shard(0, -28, deg, 62, 11, 4.5, 50 + i),
      )}
      {[
        { deg: 202, len: 20, w: 6.5 },
        { deg: 221, len: 26, w: 8 },
        { deg: 244, len: 31, w: 9.5 },
        { deg: 270, len: 34, w: 10.5 },
        { deg: 296, len: 30, w: 9.5 },
        { deg: 319, len: 25, w: 8 },
        { deg: 338, len: 19, w: 6.5 },
      ].map((c, i) => shard(0, -28, c.deg, 62, c.len, c.w, i))}

      {/* ---- the turning ones -------------------------------------------- */}
      <g className="skin__crown">
        {[0, 90, 180, 270].map((deg, i) => {
          const t = (deg * Math.PI) / 180
          const x = Math.cos(t) * 32
          const y = -94 + Math.sin(t) * 32
          return (
            // Counter-rotated at the same rate, so each shard travels the circle
            // without ever tipping over.
            <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
              <g className="skin__crown-upright">
                <path
                  d="M 0 -13 L 4.5 -5 L 2.8 5 L -2.8 5 L -4.5 -5 z"
                  fill={ICE}
                  stroke={OUTLINE}
                  strokeWidth={1.1}
                  strokeLinejoin="round"
                />
                <path d="M 0 -13 L -4.5 -5 L -2.8 5 L 0 5 z" fill={ICE_DEEP} opacity={0.5} />
              </g>
            </g>
          )
        })}
      </g>

      {/* ---- aurora running through the citadel -------------------------- */}
      <clipPath id={`skin-crown-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-crown-keep-${uid}`}>
        <rect x={-20} y={-58} width={40} height={46} rx={3} />
      </clipPath>

      <g clipPath={`url(#skin-crown-wall-${uid})`}>
        {[
          { d: 'M -52 -24 L -24 -24 L -34 30 L -52 30 z', f: ICE, o: 0.22 },
          { d: 'M 22 -24 L 52 -24 L 52 30 L 16 30 z', f: ICE, o: 0.18 },
        ].map((f, i) => (
          <path key={i} d={f.d} fill={f.f} opacity={f.o} />
        ))}
        {[
          { d: 'M -40 30 C -36 14 -42 0 -38 -24', c: AURORA_G },
          { d: 'M -14 30 C -10 12 -16 -4 -12 -24', c: ICE },
          { d: 'M 16 30 C 20 12 14 -2 18 -24', c: AURORA_V },
          { d: 'M 40 30 C 44 14 38 0 42 -24', c: AURORA_G },
        ].map((v, i) => (
          <g key={i} className="skin__aurora" style={{ animationDelay: `${i * 1.1}s` }}>
            <path d={v.d} fill="none" stroke={v.c} strokeWidth={6} opacity={0.16} strokeLinecap="round" />
            <path d={v.d} fill="none" stroke={FROST} strokeWidth={1.2} opacity={0.6} strokeLinecap="round" />
          </g>
        ))}
      </g>

      <g clipPath={`url(#skin-crown-keep-${uid})`}>
        {['M -8 -12 C -4 -26 -10 -38 -6 -58', 'M 9 -12 C 13 -28 7 -40 11 -58'].map((d, i) => (
          <g key={i} className="skin__aurora" style={{ animationDelay: `${0.6 + i * 1.3}s` }}>
            <path d={d} fill="none" stroke={i ? AURORA_V : AURORA_G} strokeWidth={5.5} opacity={0.16} strokeLinecap="round" />
            <path d={d} fill="none" stroke={FROST} strokeWidth={1.2} opacity={0.55} strokeLinecap="round" />
          </g>
        ))}
      </g>

      {/* The gate, traced rather than filled — a filled arch is a bright bar,
          which reads as a door with a lamp behind it. */}
      <path
        d="M -12 30 L -12 8 C -12 0 12 0 12 8 L 12 30"
        fill="none"
        stroke={FROST}
        strokeWidth={2.4}
        opacity={0.85}
      />

      {/* Motes drifting up off the citadel, out on the flanks. */}
      {[
        { x: -60, y: 22, r: 1.9, d: 0 },
        { x: -46, y: 2, r: 1.4, d: 1.6 },
        { x: 48, y: 16, r: 1.7, d: 0.9 },
        { x: 62, y: -2, r: 1.3, d: 2.4 },
      ].map((m, i) => (
        <circle
          key={i}
          cx={m.x}
          cy={m.y}
          r={m.r}
          fill={FROST}
          opacity={0.6}
          className="skin__mote"
          style={{ animationDelay: `${m.d}s` }}
        />
      ))}
    </g>
  )
}

export const IceDecor = {
  'ice.frost': FrostPatterns,
  'ice.palace': IcePalace,
  'ice.glacier': GlacierFortress,
  'ice.crown': FrozenCrown,
}
