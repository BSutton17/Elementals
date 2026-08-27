import type { DecorProps } from './decor'
import './skins.css'

/**
 * Electricity's skin decorations.
 *
 * Drawn INSIDE the castle's local space, over the sprite — the keep occupies
 * roughly x −20…20, y −58…−12, the curtain wall x −52…52, y −24…30, and the
 * gate x −11…11, y 10…30. Anything here is layered on top of that.
 *
 * ⚠️ THE SILHOUETTE AND THE HUE ARE NOT NEGOTIABLE. Players pick out who is
 * attacking them from a small castle on a phone, often through fog. A skin may
 * add detail and texture; it may not obscure the shape, and it stays in
 * Electricity's purple and yellow.
 *
 * ⚠️ AND IT MUST NOT BECOME AIR'S STORM TITAN OR FIRE'S FOUNDRY. Air already
 * owns lightning and Fire already owns heavy industry, so these lean on the two
 * things neither has: printed-circuit geometry, and clean high-voltage plant.
 *
 * ⚠️ ONE STROKED OUTLINE PER OBJECT, where an object is one continuous surface.
 * Everything inside it is an unstroked fill.
 */

const VOLT = '#ffe14a'
const PLASMA = '#c77dff'
const CASING = '#2a1b3d'
const CASING_LIT = '#4b3168'
const OUTLINE = '#160826'

/**
 * Uncommon — Circuit Castle.
 *
 * The stone etched like a board: traces routed across the walls, vias where
 * they change layer, and thin links running between the towers.
 *
 * The lightest possible touch, like Water's Rippled Castle and Fire's Ember
 * Stripes: the routing is clipped to the walls and the keep, so the silhouette
 * is exactly the default one and only the links between towers sit outside it.
 */
function CircuitCastle({ eliminated, uid }: DecorProps) {
  /**
   * A trace, drawn twice: a wide dim pass for the glow and a thin bright core.
   *
   * ⚠️ ROUTED, NOT SCRIBBLED. Board traces run orthogonally and turn at 45°,
   * never at an arbitrary angle — it is the single cue that says circuit rather
   * than decoration, and freehand curves would just be Water's ripples in
   * yellow.
   */
  const trace = (d: string, key: number, c = VOLT) => (
    <g key={key}>
      <path d={d} fill="none" stroke={c} strokeWidth={4} opacity={0.18} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={c} strokeWidth={1.3} opacity={0.95} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )

  /** A via: where a trace changes layer. */
  const via = (x: number, y: number, key: number) => (
    <g key={key}>
      <circle cx={x} cy={y} r={3.2} fill={VOLT} opacity={0.2} />
      <circle cx={x} cy={y} r={1.9} fill={CASING} stroke={VOLT} strokeWidth={1.1} />
    </g>
  )

  return (
    <g className="skin skin--circuit" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      <clipPath id={`skin-circuit-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-circuit-keep-${uid}`}>
        <rect x={-20} y={-58} width={40} height={46} rx={3} />
      </clipPath>

      <g clipPath={`url(#skin-circuit-wall-${uid})`}>
        {[
          'M -56 -12 L -34 -12 L -26 -20 L 4 -20 L 12 -12 L 38 -12 L 44 -6 L 56 -6',
          'M -56 4 L -38 4 L -30 12 L 6 12 L 14 4 L 56 4',
          'M -42 -26 L -42 -4 L -36 2 L -36 32',
          'M 26 -26 L 26 -18 L 32 -12 L 32 32',
          'M -20 32 L -20 22 L -14 16 L 18 16 L 24 22 L 24 32',
          'M -56 22 L -44 22 L -38 28 L -38 32',
          'M 40 32 L 40 24 L 46 18 L 56 18',
        ].map((d, i) => trace(d, i, i % 3 === 2 ? PLASMA : VOLT))}
        {/* ⚠️ VIAS NEED CLEAR AIR. A via's glow is r=3.2, so two of them closer
            than 6.4 apart overlap into one smudged blob — which is exactly what
            happened at (−34,−12) and (−36,−10), 2.8 apart. The vertical trace's
            corner moved down the wall to give it room. Worth checking with a
            distance pass rather than by eye: at 60% scale a collision like that
            just looks like a thicker dot. */}
        {[
          [-34, -12],
          [12, -12],
          [-30, 12],
          [14, 4],
          [-36, 2],
          [32, -12],
          [-14, 16],
          [24, 22],
        ].map(([x, y], i) => via(x, y, 100 + i))}
        {/* Pads: the flat contacts a component would sit on. */}
        {[
          { x: -46, y: 24 },
          { x: 8, y: 26 },
          { x: 44, y: -18 },
        ].map((p, i) => (
          <rect
            key={i}
            x={p.x - 3}
            y={p.y - 2}
            width={6}
            height={4}
            rx={0.8}
            fill={VOLT}
            opacity={0.85}
          />
        ))}
      </g>

      <g clipPath={`url(#skin-circuit-keep-${uid})`}>
        {['M -24 -44 L -6 -44 L 0 -50 L 24 -50', 'M -24 -26 L -10 -26 L -4 -32 L 24 -32'].map(
          (d, i) => trace(d, i, i ? PLASMA : VOLT),
        )}
        {[
          [-6, -44],
          [-10, -26],
        ].map(([x, y], i) => via(x, y, 200 + i))}
      </g>

      {/* Links between the towers. The only thing outside the outline, and thin
          enough that the shape underneath is untouched. */}
      {[
        { d: 'M -46 -26 C -40 -34 -28 -34 -22 -30', a: [-46, -26], b: [-22, -30] },
        { d: 'M 46 -26 C 40 -34 28 -34 22 -30', a: [46, -26], b: [22, -30] },
        { d: 'M -30 -26 C -26 -32 -24 -32 -21 -34', a: [-30, -26], b: [-21, -34] },
        { d: 'M 30 -26 C 26 -32 24 -32 21 -34', a: [30, -26], b: [21, -34] },
      ].map((l, i) => (
        <g key={i}>
          <path d={l.d} fill="none" stroke={VOLT} strokeWidth={3} opacity={0.16} />
          <path d={l.d} fill="none" stroke={VOLT} strokeWidth={1.1} opacity={0.9} />
          <circle cx={l.a[0]} cy={l.a[1]} r={1.8} fill={VOLT} />
          <circle cx={l.b[0]} cy={l.b[1]} r={1.8} fill={VOLT} />
        </g>
      ))}
    </g>
  )
}

/**
 * Rare — Power Station.
 *
 * The castle re-fitted as high-voltage plant: coil towers standing off either
 * beam, transformers banked against the walls, cable swagged between them, and
 * the gate lit by whatever is running through it.
 *
 * ⚠️ THIS IS NOT FIRE'S INFERNO FOUNDRY. That one is soot, iron and molten
 * metal — heavy, warm and broken. This one is clean, cold and working: pale
 * casings, precise geometry, and light that comes from current rather than from
 * heat. Two industrial skins in one game is fine; two that look alike is not.
 *
 * ⚠️ RARE MAY REACH PAST THE WALLS BUT NOT PAST THE FRAME, the same allowance
 * Air's Skyship and Ice's monuments take.
 *
 * ⚠️ AND IT DOES NOT MOVE, however much a power station wants to. Motion is the
 * legendary tier's, and it is the only thing that marks it — a rare that pulses
 * takes the one signal players have for what a legendary is worth.
 */
function PowerStation({ eliminated, uid }: DecorProps) {
  /** A coil tower: stacked insulators under a toroid. */
  const coil = (side: number) => (
    <g key={side} transform={`scale(${side} 1)`}>
      {/* Plinth and mast — one outline each, details as fills. */}
      <path
        d="M 60 34 L 82 34 L 79 22 L 63 22 z"
        fill={CASING}
        stroke={OUTLINE}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <rect x={68} y={-28} width={6} height={52} rx={1.5} fill={CASING} stroke={OUTLINE} strokeWidth={1.3} />
      {/* Insulator discs. Uneven spacing — an even stack is a radiator. */}
      {[18, 6, -8].map((y, i) => (
        <ellipse
          key={i}
          cx={71}
          cy={y}
          rx={9 - i * 0.7}
          ry={2.2}
          fill={CASING_LIT}
          stroke={OUTLINE}
          strokeWidth={1}
        />
      ))}
      {/* The toroid.
          ⚠️ A TORUS IS A RING, NOT A DISC. Filling the ellipse and putting a
          smaller bright ellipse on top gave a fried egg on a plate — or, at
          this angle, a flying saucer. Stroking it instead makes the stroke the
          TUBE, which is what a torus actually is. */}
      <ellipse cx={71} cy={-32} rx={13} ry={4.8} fill="none" stroke={OUTLINE} strokeWidth={9} />
      <ellipse cx={71} cy={-32} rx={13} ry={4.8} fill="none" stroke={CASING_LIT} strokeWidth={6.4} />
      <ellipse cx={71} cy={-33.4} rx={13} ry={4.8} fill="none" stroke={VOLT} strokeWidth={1.8} opacity={0.9} />
      <ellipse cx={71} cy={-32} rx={20} ry={8.6} fill="none" stroke={VOLT} strokeWidth={1.2} opacity={0.26} />
    </g>
  )

  /** A transformer: a finned casing with a bushing on top. */
  const transformer = (side: number) => (
    <g key={side} transform={`scale(${side} 1)`}>
      <rect x={40} y={8} width={20} height={22} rx={2} fill={CASING} stroke={OUTLINE} strokeWidth={1.5} />
      {/* Cooling fins as fills. */}
      {[11, 15, 19, 23, 27].map((y, i) => (
        <rect key={i} x={40} y={y} width={20} height={1.6} fill={CASING_LIT} />
      ))}
      {[46, 54].map((x, i) => (
        <g key={i}>
          <path
            d={`M ${x - 3.4} 9 L ${x + 3.4} 9 L ${x + 2.2} 3 L ${x - 2.2} 3 z`}
            fill={CASING_LIT}
            stroke={OUTLINE}
            strokeWidth={0.9}
            strokeLinejoin="round"
          />
          <circle cx={x} cy={1.6} r={2.2} fill={VOLT} opacity={0.9} />
        </g>
      ))}
    </g>
  )

  return (
    <g className="skin skin--powerstation" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      {/* Cable, swagged. Drawn first so every run disappears behind its plant. */}
      {[
        'M -71 -34 C -50 -8 50 -8 71 -34',
        'M -71 -34 C -46 -22 -30 -46 -14 -56',
        'M 71 -34 C 46 -22 30 -46 14 -56',
        'M -46 2 C -30 12 30 12 46 2',
      ].map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={CASING}
          strokeWidth={2.6}
          strokeLinecap="round"
          opacity={0.95}
        />
      ))}

      {[-1, 1].map(coil)}
      {[-1, 1].map(transformer)}

      {/* Conduit and bus-bar across the curtain, so the wall is part of the
          plant rather than a castle the plant is standing next to. */}
      <clipPath id={`skin-power-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <g clipPath={`url(#skin-power-wall-${uid})`}>
        <rect x={-52} y={-20} width={104} height={5} fill={CASING} />
        <rect x={-52} y={-20} width={104} height={1.4} fill={CASING_LIT} />
        {[-44, -28, -12, 8, 24, 40].map((x, i) => (
          <rect key={i} x={x} y={-15} width={3} height={8} rx={1} fill={CASING_LIT} />
        ))}
        {/* Bus-bar with current in it. */}
        <path
          d="M -52 22 L -30 22 L -22 14 L 14 14 L 22 22 L 52 22"
          fill="none"
          stroke={VOLT}
          strokeWidth={5}
          opacity={0.16}
          strokeLinejoin="round"
        />
        <path
          d="M -52 22 L -30 22 L -22 14 L 14 14 L 22 22 L 52 22"
          fill="none"
          stroke={VOLT}
          strokeWidth={1.6}
          opacity={0.9}
          strokeLinejoin="round"
         
        />
        {/* Vents, because a facility has to breathe somewhere. */}
        {[-38, 30].map((x, i) => (
          <g key={i}>
            <rect x={x - 8} y={-8} width={16} height={12} rx={1.5} fill={CASING} stroke={OUTLINE} strokeWidth={1.1} />
            {[-5, -1, 3].map((dy, j) => (
              <rect key={j} x={x - 6} y={-dy + 1} width={12} height={1.4} fill={CASING_LIT} />
            ))}
          </g>
        ))}
      </g>

      {/* The gate, carrying whatever the plant is making. Traced rather than
          filled — a filled arch is a bright bar, which reads as a door with a
          lamp behind it. */}
      <path d="M -15 30 L -15 8 C -15 -3 15 -3 15 8 L 15 30 z" fill={PLASMA} opacity={0.22} />
      <path
        d="M -12 30 L -12 8 C -12 0 12 0 12 8 L 12 30"
        fill="none"
        stroke={VOLT}
        strokeWidth={2.2}
        opacity={0.9}
       
      />

      {/* Charge on the battlements, where the cable lands. */}
      {[-46, -30, 30, 46].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={-26} r={4} fill={VOLT} opacity={0.2} />
          <circle cx={x} cy={-26} r={1.7} fill={VOLT} />
        </g>
      ))}
    </g>
  )
}

/**
 * Rare — Tesla Tower.
 *
 * ⚠️ THE CASTLE IS THE COIL. It is not a castle with coils parked beside it —
 * that was the first version, and it was simply the Power Station again with
 * taller towers. The keep IS the secondary, wound turn by turn up its whole
 * height; the toroid replaces its roof; the primary wraps the footing; and the
 * gate is the spark gap. Nothing stands next to the castle at all, which is the
 * only way two coil skins in one kingdom can be told apart at a glance.
 *
 * ⚠️ RARE MAY REACH PAST THE WALLS BUT NOT PAST THE FRAME, and it does not move.
 * Motion belongs to the legendary tier and is the only thing that marks it.
 */
function TeslaTower({ eliminated, uid }: DecorProps) {
  const HOT = '#fff8d0'

  /** A jagged arc. Uneven segments — an even zigzag is bunting. */
  const arc = (d: string, key: number, w = 1.3) => (
    <g key={key}>
      <path d={d} fill="none" stroke={VOLT} strokeWidth={w * 3.4} opacity={0.15} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={VOLT} strokeWidth={w} opacity={0.95} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )

  /**
   * Back at the footing, where they belong.
   *
   * ⚠️ RAISING THESE WAS AN OVER-CORRECTION. The only thing wrong with them was
   * that each turn was drawn wholly in front of the castle or wholly behind it;
   * their POSITION was right the first time. Riding them up the wall to force an
   * overlap moved the coil off the base it is supposed to wrap, which is a worse
   * error than the one it fixed. The far/near split below is the whole fix.
   */
  const PRIMARY = [
    { cy: 27, rx: 70, ry: 11 },
    { cy: 21, rx: 65, ry: 10 },
    { cy: 15, rx: 60, ry: 9 },
  ]

  type Turn = (typeof PRIMARY)[number]

  /** Half a turn of the primary. 'far' is the top arc, 'near' the bottom. */
  const turn = (t: Turn, half: 'far' | 'near') => {
    const d =
      half === 'far'
        ? `M ${-t.rx} ${t.cy} A ${t.rx} ${t.ry} 0 0 1 ${t.rx} ${t.cy}`
        : `M ${t.rx} ${t.cy} A ${t.rx} ${t.ry} 0 0 1 ${-t.rx} ${t.cy}`
    return (
      <g opacity={half === 'far' ? 0.8 : 1}>
        <path d={d} fill="none" stroke={OUTLINE} strokeWidth={6} strokeLinecap="round" />
        <path
          d={d}
          fill="none"
          stroke={CASING_LIT}
          strokeWidth={3.6}
          strokeLinecap="round"
        />
        <path
          d={d}
          fill="none"
          stroke={VOLT}
          strokeWidth={1.1}
          opacity={half === 'far' ? 0.3 : 0.7}
          strokeLinecap="round"
        />
      </g>
    )
  }

  return (
    <g className="skin skin--tesla" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      <clipPath id={`skin-tesla-keep-${uid}`}>
        <rect x={-20} y={-58} width={40} height={46} rx={3} />
      </clipPath>
      <clipPath id={`skin-tesla-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      {/* Everywhere except the castle, so the primary can pass behind it. */}
      <clipPath id={`skin-tesla-outside-${uid}`} clipRule="evenodd">
        <path
          d="M -92 -128 L 92 -128 L 92 44 L -92 44 z
             M -53 -25 L 53 -25 L 53 31 L -53 31 z
             M -21 -59 L 21 -59 L 21 -11 L -21 -11 z"
          clipRule="evenodd"
        />
      </clipPath>

      {/* ---- the primary: flat turns wrapping the footing ----------------
          ⚠️ A TURN GOES ROUND, SO HALF OF IT IS IN FRONT. Drawn unclipped, every
          turn painted across the walls and the castle looked like it was standing
          behind its own coil. Clipped entirely behind, the coil stopped wrapping
          anything and became a rug on the floor. Both halves are wrong on their
          own: the far half (top arc) is clipped and disappears behind the
          castle, the near half (bottom arc) is drawn unclipped further down so
          it crosses in front. Exactly the split the Thunder God's rings needed. */}
      <g clipPath={`url(#skin-tesla-outside-${uid})`}>
        {PRIMARY.map((t, i) => (
          <g key={i}>{turn(t, 'far')}</g>
        ))}
      </g>

      {/* ---- the secondary: the keep, wound ------------------------------ */}
      <g clipPath={`url(#skin-tesla-keep-${uid})`}>
        <rect x={-20} y={-50} width={40} height={38} fill={CASING} opacity={0.4} />
        {Array.from({ length: 13 }, (_, i) => (
          <path
            key={i}
            d={`M -21 ${-14 - i * 2.8} L 21 ${-15.4 - i * 2.8}`}
            stroke={CASING_LIT}
            strokeWidth={1.5}
            opacity={0.95}
          />
        ))}
        {/* The winding lit from within, brightest at the top where it feeds the
            topload. */}
        {[0.25, 0.55, 0.8].map((t, i) => (
          <path
            key={i}
            d={`M -21 ${-14 - t * 34} L 21 ${-15.4 - t * 34}`}
            stroke={VOLT}
            strokeWidth={1.7}
            opacity={0.35 + i * 0.22}
          />
        ))}
      </g>

      {/* ---- the topload, replacing the keep's roof ---------------------- */}
      <ellipse cx={0} cy={-74} rx={31} ry={10} fill="none" stroke={OUTLINE} strokeWidth={14} />
      <ellipse cx={0} cy={-74} rx={31} ry={10} fill="none" stroke={CASING_LIT} strokeWidth={10} />
      <ellipse cx={0} cy={-76.5} rx={31} ry={10} fill="none" stroke={VOLT} strokeWidth={2.4} opacity={0.9} />
      <ellipse cx={0} cy={-74} rx={39} ry={15} fill="none" stroke={VOLT} strokeWidth={1.3} opacity={0.2} />
      {/* The breakout point, where the discharge leaves. */}
      <circle cx={0} cy={-86} r={3.2} fill={HOT} />
      <circle cx={0} cy={-86} r={6.5} fill={VOLT} opacity={0.28} />

      {/* ---- discharge ---------------------------------------------------
          Off the topload and down onto the battlements, which is where a real
          one would find earth. Uneven and asymmetric. */}
      {[
        'M -29 -78 L -40 -68 L -33 -60 L -45 -48 L -39 -37 L -47 -26',
        'M 30 -77 L 38 -66 L 30 -58 L 41 -45 L 34 -36 L 40 -26',
        'M -16 -86 L -25 -96 L -15 -100',
        'M 18 -85 L 28 -94 L 20 -102 L 29 -107',
        'M 31 -74 L 44 -71 L 38 -64',
      ].map((d, i) => arc(d, i, i < 2 ? 1.5 : 1))}

      {/* ---- the wall: the capacitor bank ------------------------------- */}
      <g clipPath={`url(#skin-tesla-wall-${uid})`}>
        {[-45, -35, 33, 43].map((x, i) => (
          <g key={i}>
            <rect x={x - 5} y={-14} width={10} height={24} rx={2} fill={CASING} stroke={OUTLINE} strokeWidth={1.1} />
            <rect x={x - 5} y={-11} width={10} height={1.6} fill={CASING_LIT} />
            <rect x={x - 5} y={4} width={10} height={1.6} fill={CASING_LIT} />
            <circle cx={x} cy={-17} r={1.9} fill={VOLT} opacity={0.9} />
          </g>
        ))}
        {/* Bus bar linking the bank to the gap. */}
        <path
          d="M -45 -18 L -20 -18 L -14 -12 L 14 -12 L 20 -18 L 43 -18"
          fill="none"
          stroke={VOLT}
          strokeWidth={1.4}
          opacity={0.75}
          strokeLinejoin="round"
        />
      </g>

      {/* ---- the spark gap at the gate ----------------------------------- */}
      <g clipPath={`url(#skin-tesla-wall-${uid})`}>
        {[-1, 1].map((side) => (
          <rect
            key={side}
            x={side === -1 ? -13 : 8}
            y={2}
            width={5}
            height={9}
            rx={1}
            fill={CASING_LIT}
            stroke={OUTLINE}
            strokeWidth={1}
          />
        ))}
        <path d="M -8 6 L -3 9 L 2 4 L 8 7" fill="none" stroke={HOT} strokeWidth={1.6} strokeLinejoin="round" />
        <path d="M -8 6 L -3 9 L 2 4 L 8 7" fill="none" stroke={VOLT} strokeWidth={5} opacity={0.2} strokeLinejoin="round" />
      </g>

      {/* The near halves of the primary, in front of the castle. */}
      {PRIMARY.map((t, i) => (
        <g key={i}>{turn(t, 'near')}</g>
      ))}

      {/* Earth straps at the corners, so the charge has somewhere to go. */}
      {[-1, 1].map((side) => (
        <g key={side}>
          <rect x={side * 46 - 2} y={-26} width={4} height={10} rx={1} fill={CASING_LIT} stroke={OUTLINE} strokeWidth={0.9} />
          <circle cx={side * 46} cy={-28} r={2.2} fill={VOLT} />
        </g>
      ))}
    </g>
  )
}

/**
 * Legendary — Thunder God Citadel.
 *
 * A reactor where the keep's roof should be, containment rings running right
 * around the fortress, and bolts coming off them into the battlements.
 *
 * ⚠️ THIS IS THE PATTERN FOR EVERY LEGENDARY, established by Water's Leviathan:
 * it breaks the sprite's bounds, it moves, and it has ONE signature form you see
 * before anything else. Here that is the rings.
 *
 * ⚠️ THE RINGS PASS BEHIND THE CASTLE, and that needed a real technique rather
 * than a compromise. Decorations draw ON TOP of the sprite, so a ring drawn
 * around the castle would cross straight over the walls — which is why Air's
 * Storm Titan had to give up on a rotating hurricane entirely. Clipping to
 * "everywhere except the castle" (an even-odd path: the frame, minus the wall
 * and the keep) lets the ring simply stop at the silhouette and pick up again on
 * the far side. The eye fills in the rest, and the castle is never touched.
 *
 * ⚠️ AND THE RINGS DO NOT SPIN. The energy travels along them via a marching
 * dash instead, so the geometry never moves and can never drift over the
 * castle — the same fix the Storm Titan's gales use.
 */
function ThunderGod({ eliminated, uid }: DecorProps) {
  const HOT = '#fff8d0'

  /** Centred on the castle's mass, not above it, so they wrap rather than hover. */
  const CY = 2
  const RINGS = [
    { rx: 86, ry: 42, rot: -12, w: 7, o: 0.5, dur: 6 },
    { rx: 72, ry: 33, rot: 9, w: 5.5, o: 0.6, dur: 4.4 },
    { rx: 58, ry: 25, rot: -6, w: 4, o: 0.7, dur: 3.2 },
  ]

  type Ring = (typeof RINGS)[number]

  /**
   * Half a ring. 'far' is the top arc, 'near' the bottom one — the two are
   * separate paths so they can be layered on opposite sides of the castle.
   */
  const ringArc = (r: Ring, half: 'far' | 'near') => {
    const d =
      half === 'far'
        ? `M ${-r.rx} ${CY} A ${r.rx} ${r.ry} 0 0 1 ${r.rx} ${CY}`
        : `M ${r.rx} ${CY} A ${r.rx} ${r.ry} 0 0 1 ${-r.rx} ${CY}`
    return (
      <g transform={`rotate(${r.rot} 0 ${CY})`}>
        <path d={d} fill="none" stroke={CASING} strokeWidth={r.w + 3} strokeLinecap="round" />
        <path d={d} fill="none" stroke={CASING_LIT} strokeWidth={r.w} strokeLinecap="round" />
        <path
          d={d}
          fill="none"
          stroke={VOLT}
          strokeWidth={r.w * 0.42}
          opacity={r.o}
          strokeDasharray="18 26"
          strokeLinecap="round"
          className="skin__gale"
          style={{ animationDuration: `${r.dur}s` }}
        />
      </g>
    )
  }

  return (
    <g className="skin skin--thundergod" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      {/* Everywhere except the castle. */}
      <clipPath id={`skin-thunder-outside-${uid}`} clipRule="evenodd">
        <path
          d="M -92 -128 L 92 -128 L 92 44 L -92 44 z
             M -53 -25 L 53 -25 L 53 31 L -53 31 z
             M -21 -59 L 21 -59 L 21 -11 L -21 -11 z"
          clipRule="evenodd"
        />
      </clipPath>

      {/* Float glow: the fortress is not resting on anything. */}
      <ellipse cx={0} cy={36} rx={72} ry={8} fill={PLASMA} opacity={0.18} />
      <ellipse cx={0} cy={35} rx={48} ry={4.5} fill={VOLT} opacity={0.22} />

      {/* ---- containment rings ------------------------------------------
          ⚠️ A RING HAS A FAR HALF AND A NEAR HALF. Clipping the WHOLE ring to
          "outside the castle" put every part of it behind the walls, so the
          castle sat on top of the rings like a model on a plinth rather than
          standing inside them. The far half (the top arc) is clipped and
          disappears behind the silhouette; the near half (the bottom arc) is
          drawn unclipped, later, and passes in FRONT of the wall. That is the
          whole of the perspective, and it is what actually makes the rings
          encircle the castle instead of sitting under it.

          They still do not spin: the charge travels via a marching dash, so the
          geometry never moves and can never drift somewhere it should not be. */}
      <g clipPath={`url(#skin-thunder-outside-${uid})`}>
        {RINGS.map((r, i) => (
          <g key={i}>{ringArc(r, 'far')}</g>
        ))}
      </g>

      {/* ---- the reactor, where the keep's roof should be ----------------- */}
      {/* ⚠️ IT CROWNS THE KEEP, IT DOES NOT SWALLOW IT. Centred at −64 with a
          30-unit glow this covered the whole tower, and a legendary that erases
          part of the silhouette is worse than one that is dull — that shape is
          how players know who is attacking them. Raised and tightened so the
          keep still reads underneath, the same way Water's skull and Fire's star
          sit ON the keep rather than over it. */}
      <g className="skin__reactor">
        {/* ⚠️ GLOW WITH A BRIGHT PIGMENT, NOT A MID-TONE. Purple at a tenth
            opacity over a near-black background does not glow — it just makes
            the background less black, which paints a dark EGG round the core.
            Same lesson as Ice's aurora and Fire's sparks. Bright yellow at very
            low opacity is light; dim purple at low opacity is paint. */}
        <circle cx={0} cy={-84} r={27} fill={VOLT} opacity={0.05} />
        <circle cx={0} cy={-84} r={21} fill={VOLT} opacity={0.09} />
        <circle cx={0} cy={-84} r={15} fill={VOLT} opacity={0.28} />
        <circle cx={0} cy={-84} r={10} fill={VOLT} opacity={0.7} />
        <circle cx={0} cy={-84} r={6.5} fill={HOT} />
      </g>
      {/* Containment arms cradling it. One outline each. */}
      {[-1, 1].map((side) => (
        <path
          key={side}
          d={`M ${side * 15} -58 C ${side * 25} -66 ${side * 26} -88 ${side * 19} -98
              L ${side * 13} -95 C ${side * 19} -86 ${side * 18} -70 ${side * 10} -62 z`}
          fill={CASING}
          stroke={OUTLINE}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      ))}

      {/* ---- bolts off the rings into the battlements --------------------
          ⚠️ MUST NOT STROBE. Each is lit for a sliver of a long cycle and the
          four are staggered, so there is normally nothing on screen and never
          more than one. Seven of these can share a phone for fifteen minutes. */}
      {[
        { d: 'M -58 -44 L -50 -38 L -58 -33 L -48 -27', delay: 0 },
        { d: 'M 58 -46 L 50 -39 L 58 -34 L 48 -27', delay: 1.1 },
        { d: 'M -30 -52 L -24 -44 L -32 -38 L -26 -27', delay: 2.2 },
        { d: 'M 32 -50 L 26 -43 L 34 -37 L 28 -27', delay: 3.3 },
      ].map((b, i) => (
        <g key={i} className="skin__bolt" style={{ animationDelay: `${b.delay}s` }}>
          <path d={b.d} fill="none" stroke={HOT} strokeWidth={6} opacity={0.22} strokeLinecap="round" strokeLinejoin="round" />
          <path d={b.d} fill="none" stroke={HOT} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
      {[
        { x: -47, y: -26, d: 0 },
        { x: 47, y: -26, d: 1.1 },
        { x: -26, y: -26, d: 2.2 },
        { x: 28, y: -26, d: 3.3 },
      ].map((s, i) => (
        <g key={i} className="skin__strike" style={{ animationDelay: `${s.d}s` }}>
          <circle cx={s.x} cy={s.y} r={10} fill={HOT} opacity={0.2} />
          <circle cx={s.x} cy={s.y} r={4.5} fill={HOT} opacity={0.6} />
        </g>
      ))}

      {/* ---- the citadel's own charge ------------------------------------
          A legendary's walls cannot be a bare gradient; that was the note Fire's
          Supernova and Air's Storm Titan both needed. */}
      <clipPath id={`skin-thunder-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <g clipPath={`url(#skin-thunder-wall-${uid})`}>
        <rect x={-52} y={-18} width={104} height={4} fill={CASING} />
        <rect x={-52} y={-18} width={104} height={1.2} fill={CASING_LIT} />
        {[-44, -26, 22, 40].map((x, i) => (
          <g key={i} className="skin__charge" style={{ animationDelay: `${i * 0.9}s` }}>
            <path
              d={`M ${x} 30 L ${x + 3} 20 L ${x - 2} 11 L ${x + 2} 2 L ${x - 1} -8 L ${x + 2} -14`}
              fill="none"
              stroke={VOLT}
              strokeWidth={4.5}
              opacity={0.16}
              strokeLinecap="round"
            />
            <path
              d={`M ${x} 30 L ${x + 3} 20 L ${x - 2} 11 L ${x + 2} 2 L ${x - 1} -8 L ${x + 2} -14`}
              fill="none"
              stroke={VOLT}
              strokeWidth={1.3}
              opacity={0.85}
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>

      {/* The gate, traced rather than filled. */}
      <path d="M -15 30 L -15 8 C -15 -3 15 -3 15 8 L 15 30 z" fill={PLASMA} opacity={0.22} />
      <path
        d="M -12 30 L -12 8 C -12 0 12 0 12 8 L 12 30"
        fill="none"
        stroke={VOLT}
        strokeWidth={2.2}
        opacity={0.9}
        className="skin__charge"
      />

      {/* The near halves of the rings, unclipped and drawn last so they cross
          in front of the wall. */}
      {RINGS.map((r, i) => (
        <g key={i}>{ringArc(r, 'near')}</g>
      ))}

      {/* Sparks rising off the flanks. */}
      {[
        { x: -62, y: 20, r: 1.9, d: 0 },
        { x: 60, y: 14, r: 1.7, d: 1.5 },
        { x: -50, y: -4, r: 1.4, d: 2.6 },
        { x: 54, y: -8, r: 1.5, d: 0.8 },
      ].map((m, i) => (
        <circle
          key={i}
          cx={m.x}
          cy={m.y}
          r={m.r}
          fill={VOLT}
          opacity={0.7}
          className="skin__mote"
          style={{ animationDelay: `${m.d}s` }}
        />
      ))}
    </g>
  )
}

export const ElectricityDecor = {
  'electricity.circuit': CircuitCastle,
  'electricity.powerstation': PowerStation,
  'electricity.tesla': TeslaTower,
  'electricity.thundergod': ThunderGod,
}
