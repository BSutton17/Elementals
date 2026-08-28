import type { DecorProps } from './decor'
import './skins.css'

/**
 * Air's skin decorations.
 *
 * Drawn INSIDE the castle's local space, over the sprite — the keep occupies
 * roughly x −20…20, y −58…−12, the curtain wall x −52…52, y −24…30, and the
 * gate x −11…11, y 10…30. Anything here is layered on top of that.
 *
 * ⚠️ THE SILHOUETTE AND THE HUE ARE NOT NEGOTIABLE. Players pick out who is
 * attacking them from a small castle on a phone, often through fog. A skin may
 * add detail and texture; it may not obscure the shape, and it stays in Air's
 * pale blues.
 *
 * ⚠️ AND IT MUST READ AT 60% SCALE. Everything here is judged at battlefield
 * size, not at the size it is drawn.
 *
 * ⚠️ ONE STROKED OUTLINE PER OBJECT — where an object is one continuous
 * surface. Everything inside it is an unstroked fill. Water's leviathan was
 * rebuilt from scratch because eleven separately stroked pieces drew a seam
 * between every part of one skull and read as bricks snapped together.
 */

const CLOUD = '#e8f0ff'
const SKY = '#8fa9e0'
const DEEP_SKY = '#3d5a94'
const OUTLINE = '#16233d'

/**
 * A tapering stroke: pointed at both ends, widest in the middle, bent off the
 * straight line by `bend`.
 *
 * ⚠️ WHY THIS IS A FILL AND NOT A STROKE. An SVG stroke is the same width from
 * end to end, and a constant-width curve does not read as movement — it reads
 * as a drawn line, which is how the first pass at Wind Lines ended up looking
 * like cursive handwriting. Taper is the whole cue.
 */
function taper(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  bend: number,
  w: number,
): string {
  const dx = bx - ax
  const dy = by - ay
  const len = Math.hypot(dx, dy) || 1
  const px = -dy / len
  const py = dx / len
  const mx = ax + dx * 0.5 + px * bend
  const my = ay + dy * 0.5 + py * bend
  const u = `${(mx + px * w).toFixed(1)} ${(my + py * w).toFixed(1)}`
  const l = `${(mx - px * w).toFixed(1)} ${(my - py * w).toFixed(1)}`
  return `M ${ax} ${ay} C ${u} ${u} ${bx} ${by} C ${l} ${l} ${ax} ${ay} z`
}

/**
 * Uncommon — Wind Lines.
 *
 * Gusts chased across the stone with a few small spirals caught among them, as
 * though the air is moving around the castle rather than past it.
 *
 * The lightest possible touch, like Water's Rippled Castle and Fire's Ember
 * Stripes: everything is clipped to the walls and the keep, so nothing is added
 * outside the outline and the shape is exactly the default shape.
 */
function WindLines({ eliminated, uid }: DecorProps) {
  /**
   * A spiral, hand-written rather than generated: two and a half turns is all
   * that resolves at battlefield size, and a generated curve would only add
   * points nobody can see.
   */
  const spiral = (x: number, y: number, s: number, key: number) => (
    <path
      key={key}
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M 5.5 -1 C 6 2.6 3 5.2 -0.4 4.8 C -4 4.4 -5.8 0.6 -4.8 -2.4
         C -3.8 -5.2 -0.4 -6.2 1.8 -4.6 C 3.6 -3.3 3.6 -0.6 2 0.6"
      fill="none"
      stroke={CLOUD}
      strokeWidth={1.8}
      strokeLinecap="round"
      opacity={0.95}
    />
  )

  return (
    <g className="skin skin--windlines" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      <clipPath id={`skin-wind-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-wind-keep-${uid}`}>
        <rect x={-20} y={-58} width={40} height={46} rx={3} />
      </clipPath>

      <g clipPath={`url(#skin-wind-wall-${uid})`}>
        {/* Gusts streaming across the wall. Uneven lengths, bends and heights,
            because a matched set reads as ruled lines rather than moving air. */}
        {[
          { a: [-62, -12], b: [14, -18], bend: -3, w: 2.4, o: 1 },
          { a: [-58, 3], b: [-6, -1], bend: -2, w: 1.7, o: 0.75 },
          { a: [-26, 17], b: [50, 13], bend: 3, w: 2.2, o: 0.95 },
          { a: [6, -22], b: [58, -20], bend: -2, w: 1.6, o: 0.7 },
          { a: [-60, 25], b: [-16, 22], bend: 2, w: 1.5, o: 0.65 },
          { a: [18, 4], b: [62, 1], bend: -2.5, w: 1.9, o: 0.85 },
          { a: [-40, -4], b: [4, -7], bend: 2, w: 1.3, o: 0.6 },
        ].map((g, i) => (
          <path
            key={i}
            d={taper(g.a[0], g.a[1], g.b[0], g.b[1], g.bend, g.w)}
            fill={CLOUD}
            opacity={g.o}
          />
        ))}
        {spiral(-34, 13, 1, 100)}
        {spiral(31, -11, 0.8, 101)}
      </g>

      {/* The keep carries the same language, so the tower belongs to the castle
          rather than sitting on top of a different one. */}
      <g clipPath={`url(#skin-wind-keep-${uid})`}>
        {[
          { a: [-26, -44], b: [18, -47], bend: -2, w: 1.9, o: 0.95 },
          { a: [-24, -28], b: [14, -31], bend: 2, w: 1.4, o: 0.7 },
        ].map((g, i) => (
          <path
            key={i}
            d={taper(g.a[0], g.a[1], g.b[0], g.b[1], g.bend, g.w)}
            fill={CLOUD}
            opacity={g.o}
          />
        ))}
        {spiral(3, -19, 0.68, 102)}
      </g>
    </g>
  )
}

/**
 * Rare — Skyship Fortress.
 *
 * The castle bolted to the deck of a sky barge: a hull slung beneath it, lateen
 * sails out on either beam, lift envelopes tethered to the rails, and screws
 * turning on outriggers.
 *
 * ⚠️ RARE MAY REACH PAST THE WALLS BUT NOT PAST THE FRAME. This is the widest a
 * rare gets, and it stops deliberately short of the edges — breaking the
 * sprite's bounds is what marks a legendary and it is the only thing that does.
 * Fire's Inferno Foundry set the same precedent with its stacks.
 *
 * ⚠️ THE CENTRE STAYS CLEAR. Everything is arranged around the castle — hull
 * below, sails and envelopes on the beams, screws on the outriggers — because
 * the keep and gate are the shape players actually read.
 */
function Skyship({ eliminated }: DecorProps) {
  const WOOD = '#8a6a45'
  const WOOD_DARK = '#54402a'
  const BRASS = '#e8b964'

  /**
   * A lateen sail: one triangular outline off the mast, seams as unstroked
   * fills.
   *
   * ⚠️ TRIANGULAR ON PURPOSE. A square sail bellied out from a yard drew a big
   * pale rounded blob that read as a CLOUD sitting beside the castle — which, on
   * an Air skin, is the one wrong answer that also looks deliberate. A triangle
   * with a straight luff and a boom under the foot is unmistakably canvas.
   */
  const sail = (side: number) => (
    <g key={side} transform={`scale(${side} 1)`}>
      <rect x={24} y={-88} width={3.4} height={66} rx={1.7} fill={WOOD_DARK} />
      <path
        d="M 27 -84 C 40 -78 50 -69 56 -58 L 27 -36 z"
        fill={CLOUD}
        stroke={OUTLINE}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      {[
        'M 29 -72 C 39 -67 47 -60 51 -53',
        'M 29 -58 C 36 -54 41 -49 44 -45',
      ].map((d, i) => (
        <path key={i} d={d} fill="none" stroke={SKY} strokeWidth={1.4} opacity={0.8} />
      ))}
      {/* Boom under the foot, and a pennant so the mast earns its height. */}
      <path d="M 27 -36 L 56 -58" stroke={WOOD_DARK} strokeWidth={2} strokeLinecap="round" />
      <path d="M 27 -88 L 37 -85 L 27 -82 z" fill={BRASS} />
    </g>
  )

  /**
   * A lift envelope on tethers.
   *
   * ⚠️ TEARDROP, NOT A ROUND OVAL. Round ones with vertical gores read as PAPER
   * LANTERNS strung off the side of the ship. A shouldered top tapering to a
   * neck is the shape that says gas bag.
   */
  const envelope = (side: number) => (
    <g key={side} transform={`scale(${side} 1)`}>
      <path
        d="M 68 -28 L 62 -4 M 68 -28 L 76 -4"
        stroke={WOOD_DARK}
        strokeWidth={1}
        opacity={0.7}
        fill="none"
      />
      <path
        d="M 68 -62 C 79 -62 84 -52 82 -42 C 80 -34 73 -29 68 -26
           C 63 -29 56 -34 54 -42 C 52 -52 57 -62 68 -62 z"
        fill={SKY}
        stroke={OUTLINE}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      {[-5, 0, 5].map((dx, i) => (
        <path
          key={i}
          d={`M ${68 + dx} -61 C ${68 + dx * 1.6} -50 ${68 + dx * 1.5} -38 ${68 + dx * 0.4} -27`}
          fill="none"
          stroke={DEEP_SKY}
          strokeWidth={1}
          opacity={0.45}
        />
      ))}
      <rect x={64} y={-27} width={8} height={3} rx={1.5} fill={WOOD_DARK} />
    </g>
  )

  /**
   * A screw on an outrigger.
   *
   * ⚠️ NARROW ANGULAR BLADES. Rounded ones read as PETALS, which turned the
   * first pair into pinwheels — or worse, flowers — hanging off a warship.
   */
  const screw = (side: number) => (
    <g key={side} transform={`scale(${side} 1)`}>
      <rect x={52} y={9} width={13} height={3} rx={1.5} fill={WOOD_DARK} />
      {[0, 118, 242].map((a, i) => (
        <path
          key={i}
          d="M 0 0 L 2.2 -4 L 1.4 -13 L 0 -15.5 L -1.4 -13 L -2.2 -4 z"
          fill={CLOUD}
          stroke={OUTLINE}
          strokeWidth={1.1}
          strokeLinejoin="round"
          transform={`translate(67 10.5) rotate(${a})`}
        />
      ))}
      <circle cx={67} cy={10.5} r={2.6} fill={BRASS} stroke={OUTLINE} strokeWidth={1} />
    </g>
  )

  return (
    <g className="skin skin--skyship" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      {/* Rigging first, so every line disappears behind whatever it is tied to. */}
      {[-1, 1].map((side) => (
        <path
          key={side}
          d={`M ${side * 26} -82 L ${side * 58} 26 M ${side * 26} -82 L ${side * 6} 26`}
          stroke={WOOD_DARK}
          strokeWidth={0.9}
          opacity={0.5}
          fill="none"
        />
      ))}

      {[-1, 1].map(envelope)}
      {[-1, 1].map(sail)}
      {[-1, 1].map(screw)}

      {/* The hull, slung under the castle. One outline; planking inside it is
          fills only. */}
      <path
        d="M -66 26 L 66 26 C 60 36 40 42 0 42 C -40 42 -60 36 -66 26 z"
        fill={WOOD}
        stroke={OUTLINE}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {['M -62 31 C -38 35 38 35 62 31', 'M -54 36 C -32 39 32 39 54 36'].map((d, i) => (
        <path key={i} d={d} fill="none" stroke={WOOD_DARK} strokeWidth={1.3} opacity={0.7} />
      ))}
      {/* A brass strake along the gunwale. Thin — a thick one turned the hull
          into a serving tray. */}
      <rect x={-66} y={25} width={132} height={1.8} rx={0.9} fill={BRASS} />
      {[-54, -32, 32, 54].map((x, i) => (
        <circle key={i} cx={x} cy={30} r={1.3} fill={BRASS} opacity={0.75} />
      ))}
    </g>
  )
}

/**
 * Rare — Cloud Palace.
 *
 * A castle built out of weather: banks of cloud packed around the walls, pale
 * crystal growing off the battlements, and the top of the keep dissolving into
 * mist. Smaller platforms drift alongside it.
 *
 * ⚠️ THE KEEP FADES, IT DOES NOT DISAPPEAR. Mist over the tower is the whole
 * idea of the skin and also the one thing that could break the silhouette, so
 * it is drawn as translucent lobes that soften the top edge rather than as an
 * opaque mass that eats it. A player still has to pick this castle out of a fog
 * bank at 60% scale.
 *
 * ⚠️ RARE STAYS SHORT OF THE FRAME. The drifting platforms reach out past the
 * walls but stop well inside the bounds, because breaking them is what marks a
 * legendary and it is the only thing that does.
 */
function CloudPalace({ eliminated, uid }: DecorProps) {
  const CRYSTAL = '#bcd8f5'
  const CRYSTAL_DEEP = '#7fa8d8'

  /** One cloud: lobes on top, flat underneath. A single outline, always. */
  const puff = (x: number, y: number, s: number, fill: string, o: number, key: number) => (
    <path
      key={key}
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M -18 0 C -23 0 -25 -5 -21 -8 C -23 -14 -16 -18 -11 -14
         C -9 -21 1 -21 4 -14 C 9 -19 17 -15 15 -8
         C 21 -7 21 0 15 0 z"
      fill={fill}
      opacity={o}
    />
  )

  /** A crystal: one faceted outline, facets inside it as unstroked fills. */
  const shard = (x: number, y: number, h: number, w: number, key: number) => (
    <g key={key} transform={`translate(${x} ${y})`}>
      <path
        d={`M 0 ${-h} L ${w} ${-h * 0.58} L ${w * 0.62} 0 L ${-w * 0.62} 0 L ${-w} ${-h * 0.58} z`}
        fill={CRYSTAL}
        stroke={OUTLINE}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <path
        d={`M 0 ${-h} L ${-w} ${-h * 0.58} L ${-w * 0.62} 0 L 0 0 z`}
        fill={CRYSTAL_DEEP}
        opacity={0.5}
      />
      <path d={`M 0 ${-h} L 0 0`} stroke={CLOUD} strokeWidth={0.9} opacity={0.55} />
    </g>
  )

  return (
    <g className="skin skin--cloudpalace" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      {/* ⚠️ THE CASTLE ITSELF HAS TO BE MADE OF SOMETHING. The clouds and the
          crystal growth were carrying this skin entirely and the walls
          underneath were still a plain gradient, which reads as unfinished
          rather than as restrained — the same note Fire's Supernova needed. The
          walls are carved crystal now: broad facet planes as unstroked fills
          with lit seams along the edges where two planes meet, which is what
          makes a flat surface look like it has been cut.

          Deliberately low-contrast. The banks of cloud and the shards are the
          loud parts and have to stay that way. */}
      <clipPath id={`skin-cloud-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-cloud-keep-${uid}`}>
        <rect x={-20} y={-58} width={40} height={46} rx={3} />
      </clipPath>

      <g clipPath={`url(#skin-cloud-wall-${uid})`}>
        {[
          { d: 'M -52 -24 L -22 -24 L -36 30 L -52 30 z', f: CRYSTAL_DEEP, o: 0.22 },
          { d: 'M -22 -24 L 8 -24 L 20 8 L -4 30 L -36 30 z', f: CRYSTAL, o: 0.3 },
          { d: 'M 8 -24 L 32 -24 L 30 4 L 20 8 z', f: CRYSTAL_DEEP, o: 0.16 },
          { d: 'M 32 -24 L 52 -24 L 52 30 L 24 30 L 30 4 z', f: CRYSTAL, o: 0.24 },
        ].map((f, i) => (
          <path key={i} d={f.d} fill={f.f} opacity={f.o} />
        ))}
        {[
          'M -22 -24 L -36 30',
          'M 8 -24 L 20 8 L -4 30',
          'M 32 -24 L 30 4 L 24 30',
        ].map((d, i) => (
          <path key={i} d={d} fill="none" stroke={CLOUD} strokeWidth={1.4} opacity={0.8} />
        ))}
        {/* Wisps drifting across the face, so the wall is inside the weather
            and not merely standing next to it. */}
        {[
          { x: -30, y: 18, s: 0.34 },
          { x: 22, y: -6, s: 0.28 },
        ].map((w, i) => puff(w.x, w.y, w.s, CLOUD, 0.3, 300 + i))}
      </g>

      <g clipPath={`url(#skin-cloud-keep-${uid})`}>
        {[
          { d: 'M -20 -58 L -4 -58 L -10 -12 L -20 -12 z', f: CRYSTAL_DEEP, o: 0.2 },
          { d: 'M -4 -58 L 10 -58 L 6 -12 L -10 -12 z', f: CRYSTAL, o: 0.28 },
        ].map((f, i) => (
          <path key={i} d={f.d} fill={f.f} opacity={f.o} />
        ))}
        {['M -4 -58 L -10 -12', 'M 10 -58 L 6 -12'].map((d, i) => (
          <path key={i} d={d} fill="none" stroke={CLOUD} strokeWidth={1.3} opacity={0.75} />
        ))}
      </g>

      {/* ⚠️ NO LOOSE SHARDS ON THE WALL FACE. Mid-wall crystals with their own
          outline read as STICKERS applied to the stone rather than crystal
          growing out of it. The battlement shards work because they break the
          parapet line; these had nothing to emerge from. The facets above do
          the job instead — the wall IS the crystal. */}

      {/* A crystal arch over the gate. Traced, not filled — a filled one is a
          bright bar, which reads as a door with a lamp behind it. */}
      <path
        d="M -13 30 L -13 8 C -13 -2 13 -2 13 8 L 13 30"
        fill="none"
        stroke={CLOUD}
        strokeWidth={2.2}
        opacity={0.75}
      />

      {/* Platforms drifting alongside, each carrying its own crystal. Uneven
          heights and sizes, because a matched set reads as a diagram. */}
      {[
        { x: -70, y: -34, s: 0.5 },
        { x: 68, y: -52, s: 0.42 },
        { x: -62, y: 6, s: 0.38 },
        { x: 74, y: 2, s: 0.46 },
      ].map((p, i) => (
        <g key={i}>
          {puff(p.x, p.y, p.s, CLOUD, 0.9, i)}
          {shard(p.x, p.y - 20 * p.s, 11 * p.s + 4, 4 * p.s + 1.6, 200 + i)}
        </g>
      ))}

      {/* Banks packed along the footing, so the castle sits in weather rather
          than on ground. */}
      {[
        { x: -52, y: 33, s: 0.78 },
        { x: -22, y: 35, s: 0.92 },
        { x: 12, y: 34, s: 0.85 },
        { x: 46, y: 33, s: 0.72 },
        { x: -68, y: 30, s: 0.5 },
        { x: 68, y: 31, s: 0.55 },
      ].map((p, i) => puff(p.x, p.y, p.s, CLOUD, 0.95, i))}

      {/* And along the parapet, tucked behind the battlements. */}
      {[
        { x: -40, y: -22, s: 0.5 },
        { x: -6, y: -23, s: 0.42 },
        { x: 34, y: -22, s: 0.46 },
      ].map((p, i) => puff(p.x, p.y, p.s, CLOUD, 0.65, i))}

      {/* Crystal growing off the battlements and the keep. */}
      {[
        { x: -46, y: -25, h: 13, w: 4.2 },
        { x: -30, y: -25, h: 9, w: 3.4 },
        { x: 30, y: -25, h: 15, w: 4.6 },
        { x: 46, y: -25, h: 10, w: 3.6 },
        { x: -13, y: -59, h: 11, w: 3.6 },
        { x: 13, y: -59, h: 13, w: 4 },
      ].map((c, i) => shard(c.x, c.y, c.h, c.w, i))}

      {/* The keep dissolving. Layered translucent lobes, lightest at the top —
          a single flat mass would just be a lid. */}
      {/* ⚠️ MIST HAS TO BE NEARLY OPAQUE AND HAS TO OVERLAP THE STONE. Faint
          white over the dark background behind the keep is not mist, it is
          GREY - the first pass read as smudges of smoke floating above the
          tower. These sit ON the keep's top edge and are bright enough to be
          cloud, with only the highest few fading out. */}
      {[
        { x: -9, y: -50, s: 0.66, o: 0.92 },
        { x: 11, y: -53, s: 0.6, o: 0.88 },
        { x: -1, y: -58, s: 0.72, o: 0.75 },
        // The faint ones have to OVERLAP the bright ones. Isolated against the
        // dark background they blend to grey and read as soot, not vapour.
        { x: 8, y: -61, s: 0.54, o: 0.6 },
        { x: -13, y: -59, s: 0.48, o: 0.55 },
        // Nothing fainter than this. Anything below about half opacity has a
        // rim that does not overlap a brighter lobe, and that rim is grey.
      ].map((p, i) => puff(p.x, p.y, p.s, CLOUD, p.o, i))}
    </g>
  )
}

/**
 * Legendary — Storm Titan.
 *
 * A fortress riding inside its own hurricane: spiral arms of wind wheeling
 * around it, a storm head boiling overhead, and lightning coming down onto the
 * towers.
 *
 * ⚠️ THIS IS THE PATTERN FOR EVERY LEGENDARY, established by Water's Leviathan.
 * It is ALLOWED, and expected, to break the sprite's bounds — previews are
 * framed to `CASTLE_VIEWBOX`, which is sized for exactly this. Uncommon and rare
 * stay inside the walls; the legendary is where the money went.
 *
 * ⚠️ THE CASTLE SITS IN THE EYE. The arms wheel around it and never across it,
 * so the silhouette a player reads through fog is untouched by the biggest
 * effect in the set. This is the same discipline that emptied the middle of the
 * leviathan's walls and kept the supernova's centre clear.
 *
 * ⚠️ LIGHTNING MUST NOT STROBE. Each bolt is lit for a couple of frames of a
 * four-and-a-half second cycle and the three are staggered, so there is
 * normally no bolt at all and never more than one. Seven of these can share a
 * phone screen for fifteen minutes; a castle that flashes continuously is both
 * unreadable and genuinely unpleasant. Everything stops under
 * `prefers-reduced-motion` and when the castle dies (skins.css).
 */
function StormTitan({ eliminated, uid }: DecorProps) {
  const STORM_DARK = '#16233d'
  const STORM_MID = '#22355c'
  const STORM = '#2f4771'
  const BOLT = '#dff0ff'
  const ARC = '#7fd4ff'

  /**
   * A jagged bolt as a FILLED polygon, wide at the head and narrowing to the
   * tip. A stroked one is constant width down its whole length and reads as
   * cable hanging off the clouds — the same reason Wind Lines' gusts are fills.
   */
  const strike = (x: number, y: number, s: number, flip: number, delay: number, key: number) => (
    <g
      key={key}
      className="skin__bolt"
      style={{ animationDelay: `${delay}s` }}
      transform={`translate(${x} ${y}) scale(${s * flip} ${s})`}
    >
      <path
        d="M 0 0 L 9 2 L 3 15 L 11 18 L 2 32 L 7 35 L -5 54 L -1 36 L -8 33 L 0 18 L -7 15 z"
        fill={BOLT}
        opacity={0.3}
        transform="scale(1.7) translate(-1 -1)"
      />
      <path
        d="M 0 0 L 9 2 L 3 15 L 11 18 L 2 32 L 7 35 L -5 54 L -1 36 L -8 33 L 0 18 L -7 15 z"
        fill={BOLT}
      />
    </g>
  )

  return (
    <g className="skin skin--stormtitan" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      {/* ---- gales, furthest back ----------------------------------------
          ⚠️ THESE STREAM, THEY DO NOT ROTATE. Spinning a ring of arms about the
          castle is the obvious build and it is wrong twice over: filled arms
          closed into a solid oval that read as an EGG, and any rigid rotation
          eventually sweeps them straight across the sprite — the one thing a
          skin may never do, because that silhouette is how players know who is
          attacking them. A marching dash pattern on a static arc cannot: the
          geometry never moves, only the gaps in it.                          */}
      {[
        { d: 'M -88 -26 C -84 -66 -52 -96 -8 -101', w: 7, o: 0.45, dur: 5.5, c: STORM },
        { d: 'M 88 -18 C 86 -60 54 -94 8 -100', w: 6, o: 0.45, dur: 6.8, c: STORM },
        { d: 'M -70 42 C -86 20 -90 -12 -84 -36', w: 5, o: 0.5, dur: 4.2, c: STORM_DARK },
        { d: 'M 70 46 C 86 24 90 -8 84 -32', w: 5, o: 0.5, dur: 7.4, c: STORM_DARK },
        { d: 'M -60 40 C -70 12 -64 -22 -44 -44', w: 3, o: 0.6, dur: 3.4, c: SKY },
        { d: 'M 62 42 C 74 14 68 -20 46 -42', w: 3, o: 0.6, dur: 3.9, c: SKY },
      ].map((a, i) => (
        <path
          key={i}
          d={a.d}
          fill="none"
          stroke={a.c}
          strokeWidth={a.w}
          strokeLinecap="round"
          opacity={a.o}
          // The dash pattern is GEOMETRY, not styling, so it lives here rather
          // than in the stylesheet. Solid, these arcs read as a cage of nested
          // arches; broken, they read as wind. The CSS only marches the offset.
          strokeDasharray="26 18"
          className="skin__gale"
          style={{ animationDuration: `${a.dur}s` }}
        />
      ))}

      {/* ---- the storm head ----------------------------------------------
          One lobed mass, not a row of puffs — seven separate cloud shapes in a
          line read as a HEDGE. */}
      <g className="skin__canopy">
        <path
          d="M -80 -66 C -89 -70 -87 -82 -76 -83 C -79 -95 -64 -102 -54 -95
             C -51 -107 -33 -111 -26 -100 C -19 -113 -1 -114 5 -102
             C 13 -114 31 -111 35 -99 C 44 -108 60 -102 59 -92
             C 71 -96 81 -85 75 -76 C 87 -74 88 -66 78 -66 z"
          fill={STORM_DARK}
        />
        {[
          'M -66 -88 C -58 -97 -41 -98 -33 -90 C -47 -84 -58 -83 -66 -88 z',
          'M -18 -101 C -8 -110 11 -109 18 -99 C 2 -93 -9 -94 -18 -101 z',
          'M 33 -96 C 43 -104 58 -102 61 -92 C 47 -87 39 -90 33 -96 z',
        ].map((d, i) => (
          <path key={i} d={d} fill={STORM_MID} opacity={0.95} />
        ))}
        {/* Underlit rim: the storm is lit from inside by whatever is about to
            come out of it. */}
        <path
          d="M -76 -67 C -40 -60 40 -60 76 -67"
          fill="none"
          stroke={ARC}
          strokeWidth={2}
          opacity={0.28}
        />
      </g>

      {/* ---- the citadel's own charge -------------------------------------
          ⚠️ A LEGENDARY'S CASTLE CANNOT BE BARE. Fire's Supernova had to be
          rebuilt for exactly this: the sky above it was finished and the walls
          were still just a gradient, which reads as unfinished rather than as
          restrained. Storm-iron courses, lightning caught in the stone, charged
          battlements, a gate full of it. All of it low-contrast against a very
          dark castle, so the wings and the strikes still win. */}
      <clipPath id={`skin-storm-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-storm-keep-${uid}`}>
        <rect x={-20} y={-58} width={40} height={46} rx={3} />
      </clipPath>

      <g clipPath={`url(#skin-storm-wall-${uid})`}>
        {[-12, 4, 20].map((y, i) => (
          <rect key={i} x={-52} y={y} width={104} height={1.4} fill={STORM_MID} opacity={0.85} />
        ))}
        {[
          'M -44 30 L -41 20 L -45 11 L -42 1 L -44 -9 L -41 -24',
          'M 40 -24 L 43 -14 L 39 -5 L 42 5 L 40 15 L 43 22',
        ].map((d, i) => (
          <g key={i} className="skin__vein" style={{ animationDelay: `${i * 0.9}s` }}>
            <path d={d} fill="none" stroke={ARC} strokeWidth={4.5} opacity={0.2} strokeLinecap="round" />
            <path d={d} fill="none" stroke={BOLT} strokeWidth={1.2} opacity={0.75} strokeLinecap="round" />
          </g>
        ))}
      </g>

      <g clipPath={`url(#skin-storm-keep-${uid})`}>
        {[-46, -32].map((y, i) => (
          <rect key={i} x={-20} y={y} width={40} height={1.3} fill={STORM_MID} opacity={0.8} />
        ))}
        {['M 6 -14 L 9 -25 L 5 -35 L 8 -47'].map(
          (d, i) => (
            <g key={i} className="skin__vein" style={{ animationDelay: `${0.4 + i * 1.1}s` }}>
              <path d={d} fill="none" stroke={ARC} strokeWidth={4} opacity={0.2} strokeLinecap="round" />
              <path d={d} fill="none" stroke={BOLT} strokeWidth={1.2} opacity={0.7} strokeLinecap="round" />
            </g>
          ),
        )}
      </g>

      {/* A gate full of storm light. The arch is TRACED rather than filled — a
          filled one is a bright vertical bar, which reads as a door with a lamp
          behind it. */}
      <path d="M -15 30 L -15 8 C -15 -3 15 -3 15 8 L 15 30 z" fill={ARC} opacity={0.18} />
      <path
        d="M -12 30 L -12 8 C -12 0 12 0 12 8 L 12 30"
        fill="none"
        stroke={ARC}
        strokeWidth={2.2}
        opacity={0.8}
      />

      {/* Charged battlements. */}
      {[-46, -30, 30, 46].map((x, i) => (
        <g key={i} className="skin__vein" style={{ animationDelay: `${i * 0.7}s` }}>
          <circle cx={x} cy={-25} r={4} fill={ARC} opacity={0.22} />
          <circle cx={x} cy={-25} r={1.6} fill={BOLT} opacity={0.95} />
        </g>
      ))}

      {/* ---- lightning ----------------------------------------------------
          ⚠️ MUST NOT STROBE. Each bolt is lit for a sliver of a four-and-a-half
          second cycle and the four are staggered, so there is normally no bolt
          on screen and never more than one. Seven of these can share a phone for
          fifteen minutes; a castle that flashes continuously is unreadable and
          genuinely unpleasant. */}
      {strike(-24, -64, 0.7, 1, 0, 0)}
      {strike(20, -66, 0.62, -1, 1.1, 1)}
      {strike(48, -62, 0.5, 1, 2.2, 2)}
      {strike(-52, -60, 0.46, -1, 3.3, 3)}

      {/* The glow where each one lands, so a strike has consequence. */}
      {[
        { x: -28, y: -26, d: 0 },
        { x: 18, y: -28, d: 1.1 },
        { x: 47, y: -30, d: 2.2 },
        { x: -51, y: -32, d: 3.3 },
      ].map((s, i) => (
        <g key={i} className="skin__strike" style={{ animationDelay: `${s.d}s` }}>
          <circle cx={s.x} cy={s.y} r={13} fill={BOLT} opacity={0.2} />
          <circle cx={s.x} cy={s.y} r={6} fill={BOLT} opacity={0.55} />
        </g>
      ))}

      {/* Debris caught in the rotation, out on the flanks so the middle of the
          wall stays clear. */}
      {[
        { x: -68, y: 18, w: 9, r: -22, d: 0 },
        { x: -62, y: -4, w: 6, r: -14, d: 1.3 },
        { x: 62, y: 10, w: 8, r: 18, d: 0.7 },
        { x: 70, y: -12, w: 5, r: 26, d: 2.1 },
        { x: -74, y: 34, w: 7, r: -30, d: 2.7 },
        { x: 72, y: 30, w: 6, r: 24, d: 1.8 },
      ].map((g, i) => (
        /* ⚠️ THE ROTATION GOES ON A WRAPPER, NOT ON THE ANIMATED NODE. A CSS
           `transform` beats the `transform` attribute on the same element, so
           `.skin__debris` (which animates translateX) was quietly throwing this
           rotation away and every scrap of debris lay flat. Invisible in a
           still, because a static render applies no CSS. */
        <g key={i} transform={`rotate(${g.r} ${g.x + g.w / 2} ${g.y})`}>
          <rect
            x={g.x}
            y={g.y}
            width={g.w}
            height={1.6}
            rx={0.8}
            fill={CLOUD}
            opacity={0.5}
            className="skin__debris"
            style={{ animationDelay: `${g.d}s` }}
          />
        </g>
      ))}
    </g>
  )
}

export const AirDecor = {
  'air.windlines': WindLines,
  'air.skyship': Skyship,
  'air.cloudpalace': CloudPalace,
  'air.stormtitan': StormTitan,
}
