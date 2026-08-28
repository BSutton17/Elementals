import type { DecorProps } from './decor'
import './skins.css'

/**
 * Space's skin decorations.
 *
 * Drawn INSIDE the castle's local space, over the sprite — the keep occupies
 * roughly x −20…20, y −58…−12, the curtain wall x −52…52, y −24…30, and the
 * gate x −11…11, y 10…30. Anything here is layered on top of that.
 *
 * ⚠️ THE SILHOUETTE AND THE HUE ARE NOT NEGOTIABLE. Players pick out who is
 * attacking them from a small castle on a phone, often through fog. A skin may
 * add detail and texture; it may not obscure the shape, and it stays in Space's
 * void violet and starlight cyan.
 *
 * ⚠️ AND IT MUST NOT BECOME ELECTRICITY. That kingdom already owns purple, and
 * its skins are bright violet with yellow. Space is nearly black with cyan —
 * the difference is value, not hue: Electricity glows, Space absorbs.
 *
 * ⚠️ ONE STROKED OUTLINE PER OBJECT. Everything inside it is an unstroked fill.
 */

const STAR = '#eaf6ff'
const CYAN = '#3ad0ff'
const VOID_DEEP = '#160c33'
const HULL = '#2a2350'
const HULL_LIT = '#4a4180'
const OUTLINE = '#080418'

/** A star: a four-pointed spike, which reads at a size a circle cannot. */
function star(x: number, y: number, r: number, o: number, key: number) {
  return (
    <g key={key} transform={`translate(${x} ${y})`} opacity={o}>
      <circle r={r * 2.6} fill={STAR} opacity={0.12} />
      <path
        d={`M 0 ${-r * 2.4} Q ${r * 0.34} ${-r * 0.34} ${r * 2.4} 0
            Q ${r * 0.34} ${r * 0.34} 0 ${r * 2.4}
            Q ${-r * 0.34} ${r * 0.34} ${-r * 2.4} 0
            Q ${-r * 0.34} ${-r * 0.34} 0 ${-r * 2.4} z`}
        fill={STAR}
      />
    </g>
  )
}

/**
 * Uncommon — Star Pattern Castle.
 *
 * The stone gone to void: a dark cosmic wash across the walls with stars,
 * joined constellations and a few small worlds sitting in it.
 *
 * The lightest possible touch, like Water's Rippled Castle and Fire's Ember
 * Stripes: everything is clipped to the walls and the keep, so the silhouette is
 * exactly the default one.
 */
function StarPatternCastle({ eliminated, uid }: DecorProps) {
  /* Constellations: stars first, then the lines that join them, so a line
     never crosses a star it does not belong to. Written as point lists rather
     than paths because the joins have to land exactly on the stars. */
  const CONSTELLATIONS: [number, number][][] = [
    [
      [-44, -14],
      [-36, -4],
      [-27, -9],
      [-19, 2],
    ],
    [
      [14, -16],
      [23, -8],
      [33, -12],
      [42, -3],
      [33, -12],
      [30, -21],
    ],
    [
      [-38, 18],
      [-28, 23],
      [-18, 16],
    ],
  ]

  return (
    <g className="skin skin--starpattern" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      <clipPath id={`skin-star-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-star-keep-${uid}`}>
        <rect x={-20} y={-58} width={40} height={46} rx={3} />
      </clipPath>

      <g clipPath={`url(#skin-star-wall-${uid})`}>
        {/* The void wash: deeper at the bottom, so the wall has some depth
            rather than being a flat dark rectangle. */}
        <rect x={-52} y={-24} width={104} height={54} fill={VOID_DEEP} opacity={0.75} />
        <ellipse cx={-10} cy={26} rx={54} ry={22} fill={OUTLINE} opacity={0.45} />
        <ellipse cx={20} cy={-20} rx={40} ry={16} fill={CYAN} opacity={0.06} />

        {CONSTELLATIONS.map((pts, i) => (
          <polyline
            key={i}
            points={pts.map((p) => p.join(',')).join(' ')}
            fill="none"
            stroke={CYAN}
            strokeWidth={0.9}
            opacity={0.5}
            strokeLinejoin="round"
          />
        ))}
        {CONSTELLATIONS.flat().map((p, i) => star(p[0], p[1], 1.5, 0.95, i))}

        {/* Field stars, at every size — an even scatter reads as a texture
            swatch rather than as a sky. */}
        {[
          { x: -48, y: 6, r: 0.7 }, { x: -32, y: -19, r: 1.1 }, { x: -20, y: 12, r: 0.6 },
          { x: -6, y: -8, r: 0.9 }, { x: 4, y: 20, r: 0.7 }, { x: 10, y: -20, r: 1.2 },
          { x: 26, y: 8, r: 0.6 }, { x: 38, y: 22, r: 1 }, { x: 46, y: -16, r: 0.8 },
          { x: 48, y: 12, r: 0.6 }, { x: -14, y: 26, r: 0.9 }, { x: 20, y: -2, r: 0.7 },
        ].map((s, i) => star(s.x, s.y, s.r, 0.85, 100 + i))}

        {/* Small worlds. Each has a terminator, because a flat disc is a dot. */}
        {[
          { x: -40, y: 8, r: 5, c: '#6f5bd8' },
          { x: 30, y: -14, r: 3.4, c: '#3a8fbf' },
          { x: 8, y: 24, r: 4.2, c: '#b8724a' },
        ].map((pl, i) => (
          <g key={i}>
            <circle cx={pl.x} cy={pl.y} r={pl.r} fill={pl.c} stroke={OUTLINE} strokeWidth={0.9} />
            <path
              d={`M ${pl.x} ${pl.y - pl.r} A ${pl.r} ${pl.r} 0 0 1 ${pl.x} ${pl.y + pl.r}
                  A ${pl.r * 0.55} ${pl.r} 0 0 0 ${pl.x} ${pl.y - pl.r} z`}
              fill={OUTLINE}
              opacity={0.4}
            />
          </g>
        ))}
      </g>

      <g clipPath={`url(#skin-star-keep-${uid})`}>
        <rect x={-20} y={-58} width={40} height={46} fill={VOID_DEEP} opacity={0.75} />
        <ellipse cx={0} cy={-16} rx={26} ry={12} fill={OUTLINE} opacity={0.4} />
        <polyline
          points="-12,-46 -4,-38 4,-44 12,-34"
          fill="none"
          stroke={CYAN}
          strokeWidth={0.9}
          opacity={0.5}
          strokeLinejoin="round"
        />
        {[
          [-12, -46],
          [-4, -38],
          [4, -44],
          [12, -34],
        ].map((p, i) => star(p[0], p[1], 1.4, 0.95, 200 + i))}
        {[
          { x: -14, y: -24, r: 0.8 },
          { x: 10, y: -52, r: 0.9 },
          { x: 14, y: -20, r: 0.6 },
        ].map((s, i) => star(s.x, s.y, s.r, 0.8, 210 + i))}
      </g>
    </g>
  )
}

/**
 * Rare — Spaceship Fortress.
 *
 * The castle rebuilt as a ship: engines under the walls, a docking bay where
 * the gate was, sensor masts off the battlements, and lit windows all through
 * the hull.
 *
 * ⚠️ THE SHIP IS THE CASTLE, NOT A CASTLE ON A SHIP. Air's Skyship bolts a
 * fortress to a hull and lets both read separately; that is the whole idea
 * there. Here the castle's own parts have been REPLACED — the gate is a bay,
 * the merlons are sensor masts, the wall is panelled hull — so there is nothing
 * underneath to read as masonry. Two flying-vessel skins in one game is fine;
 * two that are a castle sitting on a vehicle is not.
 *
 * ⚠️ RARE MAY REACH PAST THE WALLS BUT NOT PAST THE FRAME, and it does not move.
 */
function SpaceshipFortress({ eliminated, uid }: DecorProps) {
  const GLASS = '#7fe3ff'
  const THRUST = '#63b8ff'

  /** An engine bell with its exhaust. */
  const engine = (x: number, y: number, w: number, len: number, key: number) => (
    <g key={key}>
      <path
        d={`M ${x - w * 0.55} ${y} L ${x + w * 0.55} ${y} L ${x + w} ${y + len * 0.5} L ${x - w} ${y + len * 0.5} z`}
        fill={HULL}
        stroke={OUTLINE}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <rect x={x - w * 0.9} y={y + len * 0.45} width={w * 1.8} height={2.4} rx={1.2} fill={HULL_LIT} />
      {/* Exhaust: bright at the throat, gone by the end. Three nested cones,
          because a single flat wedge reads as a traffic cone. */}
      <path
        d={`M ${x - w * 0.85} ${y + len * 0.55} L ${x + w * 0.85} ${y + len * 0.55} L ${x + w * 0.3} ${y + len} L ${x - w * 0.3} ${y + len} z`}
        fill={THRUST}
        opacity={0.22}
      />
      <path
        d={`M ${x - w * 0.55} ${y + len * 0.55} L ${x + w * 0.55} ${y + len * 0.55} L ${x + w * 0.18} ${y + len * 0.9} L ${x - w * 0.18} ${y + len * 0.9} z`}
        fill={THRUST}
        opacity={0.5}
      />
      <path
        d={`M ${x - w * 0.28} ${y + len * 0.55} L ${x + w * 0.28} ${y + len * 0.55} L ${x} ${y + len * 0.78} z`}
        fill={STAR}
        opacity={0.85}
      />
    </g>
  )

  /** A sensor mast where a merlon used to be. */
  const mast = (x: number, y: number, h: number, key: number) => (
    <g key={key}>
      <rect x={x - 1.3} y={y - h} width={2.6} height={h} rx={1.3} fill={HULL_LIT} stroke={OUTLINE} strokeWidth={0.9} />
      <path d={`M ${x - 4} ${y - h} L ${x + 4} ${y - h} L ${x} ${y - h - 5} z`} fill={HULL} stroke={OUTLINE} strokeWidth={0.9} strokeLinejoin="round" />
      <circle cx={x} cy={y - h - 6} r={1.6} fill={CYAN} />
    </g>
  )

  return (
    <g className="skin skin--spaceship" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      <clipPath id={`skin-ship-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-ship-keep-${uid}`}>
        <rect x={-20} y={-58} width={40} height={46} rx={3} />
      </clipPath>

      {/* Engines under the hull. */}
      {engine(-38, 29, 9, 14, 0)}
      {engine(-14, 30, 7, 11, 1)}
      {engine(14, 30, 7, 11, 2)}
      {engine(38, 29, 9, 14, 3)}

      {/* Hull plating over the curtain. */}
      <g clipPath={`url(#skin-ship-wall-${uid})`}>
        <rect x={-52} y={-24} width={104} height={54} fill={HULL} opacity={0.9} />
        {[-24, -8, 8, 22].map((y, i) => (
          <rect key={i} x={-52} y={y} width={104} height={1.6} fill={HULL_LIT} opacity={0.8} />
        ))}
        {[-30, 0, 30].map((x, i) => (
          <rect key={i} x={x} y={-24} width={1.4} height={54} fill={HULL_LIT} opacity={0.5} />
        ))}
        {/* Lit windows: a long run of them, unevenly filled, because a ship
            with every light on reads as a grid rather than as crewed. */}
        {[
          { x: -46, y: -20, on: true }, { x: -40, y: -20, on: true }, { x: -34, y: -20, on: false },
          { x: -46, y: -4, on: false }, { x: -40, y: -4, on: true }, { x: -34, y: -4, on: true },
          { x: 34, y: -20, on: true }, { x: 40, y: -20, on: false }, { x: 46, y: -20, on: true },
          { x: 34, y: -4, on: true }, { x: 40, y: -4, on: true }, { x: 46, y: -4, on: false },
          { x: -46, y: 12, on: true }, { x: -40, y: 12, on: false },
          { x: 40, y: 12, on: true }, { x: 46, y: 12, on: true },
        ].map((w, i) => (
          <rect
            key={i}
            x={w.x - 1.8}
            y={w.y - 3}
            width={3.6}
            height={6}
            rx={1.2}
            fill={w.on ? GLASS : OUTLINE}
            opacity={w.on ? 0.9 : 0.55}
          />
        ))}
        {/* Registry stripe, because a hull this size would carry markings. */}
        <rect x={-24} y={16} width={20} height={3} rx={1.5} fill={CYAN} opacity={0.5} />
        <rect x={6} y={16} width={12} height={3} rx={1.5} fill={CYAN} opacity={0.3} />
      </g>

      {/* The docking bay, where the gate was. */}
      <path d="M -15 30 L -15 8 C -15 -2 15 -2 15 8 L 15 30 z" fill={OUTLINE} opacity={0.85} />
      <path
        d="M -12 30 L -12 9 C -12 1 12 1 12 9 L 12 30"
        fill="none"
        stroke={CYAN}
        strokeWidth={2}
        opacity={0.9}
      />
      {/* Approach lights down the throat of it. */}
      {[14, 20, 26].map((y, i) => (
        <g key={i}>
          <rect x={-9} y={y} width={3} height={1.6} rx={0.8} fill={CYAN} opacity={0.85 - i * 0.2} />
          <rect x={6} y={y} width={3} height={1.6} rx={0.8} fill={CYAN} opacity={0.85 - i * 0.2} />
        </g>
      ))}

      {/* Bridge deck on the keep. */}
      <g clipPath={`url(#skin-ship-keep-${uid})`}>
        <rect x={-20} y={-58} width={40} height={46} fill={HULL} opacity={0.9} />
        <rect x={-20} y={-40} width={40} height={1.6} fill={HULL_LIT} opacity={0.8} />
        <rect x={-20} y={-24} width={40} height={1.6} fill={HULL_LIT} opacity={0.8} />
        {/* A viewport band rather than more windows — a bridge looks out. */}
        <path
          d="M -15 -50 L 15 -50 C 17 -50 17 -44 15 -44 L -15 -44 C -17 -44 -17 -50 -15 -50 z"
          fill={GLASS}
          opacity={0.85}
          stroke={OUTLINE}
          strokeWidth={1.1}
        />
        {[-9, -1, 7].map((x, i) => (
          <rect key={i} x={x} y={-50} width={1.4} height={6} fill={OUTLINE} opacity={0.55} />
        ))}
        {[-12, 0, 12].map((x, i) => (
          <rect key={i} x={x - 2} y={-36} width={4} height={5} rx={1.2} fill={i === 1 ? GLASS : OUTLINE} opacity={i === 1 ? 0.85 : 0.5} />
        ))}
      </g>

      {/* Masts where the merlons were. */}
      {mast(-46, -32, 10, 0)}
      {mast(-24, -32, 7, 1)}
      {mast(24, -32, 7, 2)}
      {mast(46, -32, 12, 3)}
      {/* A dish off one shoulder, so the two sides are not mirror images. */}
      <g transform="translate(58 -8) rotate(18)">
        <path
          d="M 0 1 C -11 -5 -11 -19 0 -24 C 11 -19 11 -5 0 1 z"
          fill={HULL_LIT}
          stroke={OUTLINE}
          strokeWidth={1.3}
          strokeLinejoin="round"
        />
        {/* The concave face. Without it the outline alone is a paddle. */}
        <path d="M 0 -2 C -8 -7 -8 -17 0 -21 C 8 -17 8 -7 0 -2 z" fill={OUTLINE} opacity={0.45} />
        <path d="M 0 -21 L 0 -3" stroke={CYAN} strokeWidth={0.9} opacity={0.5} />
        <path d="M 0 -22 L 0 -28" stroke={HULL_LIT} strokeWidth={1.6} />
        <circle cx={0} cy={-29} r={1.6} fill={CYAN} />
        <rect x={-1.4} y={-2} width={2.8} height={9} rx={1.4} fill={HULL} stroke={OUTLINE} strokeWidth={0.9} />
      </g>
    </g>
  )
}

/**
 * Rare — Alien Planet Base.
 *
 * A holding on somebody else's world: crust underfoot that is the wrong colour,
 * rock hanging in the air because the gravity here does not agree with ours,
 * two moons up, and growth that is nobody's idea of a plant.
 *
 * ⚠️ IT MUST NOT BE SPACESHIP FORTRESS. That one is a vessel — engines, hull,
 * docking bay, built to move. This is planted: it has ground, a horizon and
 * weather, and nothing about it could leave. Same kingdom, opposite premise.
 *
 * ⚠️ AND THE PLANTS MUST NOT BE NATURE'S. Nature owns leaves, and a leaf here
 * would just read as a green kingdom in purple. These are bulbs on bare stalks
 * with no foliage at all — the silhouette is a pod, not a frond.
 *
 * ⚠️ RARE MAY REACH PAST THE WALLS BUT NOT PAST THE FRAME, and it does not move.
 */
function AlienPlanetBase({ eliminated, uid }: DecorProps) {
  const CRUST = '#4a2f5e'
  const CRUST_LIT = '#6d4a86'
  const FLESH = '#c96fb0'
  const BIO = '#7ff0a8'
  const MOON = '#b9b0cf'

  /** A bulb on a bare stalk. No leaves — that is Nature's, and it shows. */
  const pod = (x: number, y: number, h: number, r: number, lean: number, key: number) => (
    <g key={key}>
      <path
        d={`M ${x - 1.4} ${y} C ${x - 1.6} ${y - h * 0.5} ${x + lean - 1.8} ${y - h * 0.8} ${x + lean} ${y - h}
            C ${x + lean + 1.8} ${y - h * 0.8} ${x + 1.6} ${y - h * 0.5} ${x + 1.4} ${y} z`}
        fill={CRUST_LIT}
        stroke={OUTLINE}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <ellipse
        cx={x + lean}
        cy={y - h - r * 0.5}
        rx={r}
        ry={r * 1.25}
        fill={FLESH}
        stroke={OUTLINE}
        strokeWidth={1.1}
      />
      {/* Lit from inside, which is what makes it read as alive rather than as
          a berry. */}
      <ellipse cx={x + lean} cy={y - h - r * 0.5} rx={r * 0.42} ry={r * 0.62} fill={BIO} opacity={0.8} />
      {[-0.5, 0.5].map((o, i) => (
        <path
          key={i}
          d={`M ${x + lean} ${y - h - r * 1.6} q ${o * 4} -3 ${o * 6} -7`}
          fill="none"
          stroke={BIO}
          strokeWidth={0.9}
          opacity={0.75}
          strokeLinecap="round"
        />
      ))}
    </g>
  )

  /** Rock hanging in the air, with the ground-glow that explains why. */
  const floater = (x: number, y: number, s: number, key: number) => (
    <g key={key} transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={9} rx={11} ry={2.6} fill={BIO} opacity={0.18} />
      <path
        d="M -11 2 L -6 -6 L 3 -8 L 10 -2 L 8 5 L -2 8 z"
        fill={CRUST}
        stroke={OUTLINE}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      <path d="M -11 2 L -6 -6 L 3 -8 L 1 1 z" fill={CRUST_LIT} opacity={0.6} />
      <path d="M -8 3 L 1 1 L 8 5" fill="none" stroke={BIO} strokeWidth={0.9} opacity={0.55} />
    </g>
  )

  return (
    <g className="skin skin--alienbase" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      <clipPath id={`skin-alien-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>

      {/* Two moons, different sizes and phases — a matched pair reads as a
          logo, and one moon is just Earth. */}
      <g>
        <circle cx={-64} cy={-84} r={13} fill={MOON} opacity={0.9} stroke={OUTLINE} strokeWidth={1.2} />
        <path d="M -64 -97 A 13 13 0 0 1 -64 -71 A 8 13 0 0 0 -64 -97 z" fill={OUTLINE} opacity={0.35} />
        {[
          { x: -68, y: -88, r: 2.4 },
          { x: -60, y: -80, r: 1.6 },
          { x: -66, y: -78, r: 1.2 },
        ].map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={c.r} fill={OUTLINE} opacity={0.25} />
        ))}
      </g>
      <g>
        <circle cx={62} cy={-100} r={7} fill="#8fd8c0" opacity={0.85} stroke={OUTLINE} strokeWidth={1.1} />
        <path d="M 62 -107 A 7 7 0 0 0 62 -93 A 4 7 0 0 1 62 -107 z" fill={OUTLINE} opacity={0.3} />
      </g>

      {/* Rock that has not come down. */}
      {floater(-74, -34, 1.1, 0)}
      {floater(70, -50, 0.85, 1)}
      {floater(78, -12, 0.65, 2)}
      {floater(-82, 4, 0.7, 3)}

      {/* Monoliths: somebody else built these, and left. */}
      {[-1, 1].map((side) => (
        <g key={side} transform={`scale(${side} 1)`}>
          <path
            d="M 60 34 L 76 34 L 72 -22 L 63 -22 z"
            fill={CRUST}
            stroke={OUTLINE}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <path d="M 60 34 L 63 -22 L 67 -22 L 66 34 z" fill={CRUST_LIT} opacity={0.5} />
          {/* Marks cut into it. Regular, because it is made, unlike the rock. */}
          {[-12, 0, 12, 24].map((y, i) => (
            <rect key={i} x={66} y={y} width={5} height={1.8} rx={0.9} fill={BIO} opacity={0.8} />
          ))}
          <circle cx={68} cy={-27} r={2.6} fill={BIO} />
          <circle cx={68} cy={-27} r={6} fill={BIO} opacity={0.15} />
        </g>
      ))}

      {/* The crust. Angular, because this is rock rather than soil. */}
      <path
        d="M -92 36 L -74 30 L -58 35 L -40 31 L -20 36 L 0 32 L 20 37 L 40 32 L 58 36 L 76 31 L 92 35
           L 92 44 L -92 44 z"
        fill={CRUST}
        stroke={OUTLINE}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <path
        d="M -92 36 L -74 30 L -58 35 L -40 31 L -20 36 L 0 32 L 20 37 L 40 32 L 58 36 L 76 31 L 92 35"
        fill="none"
        stroke={BIO}
        strokeWidth={1.1}
        opacity={0.45}
      />

      {/* Growth. */}
      {pod(-46, 34, 22, 5, -5, 0)}
      {pod(-34, 33, 13, 3.6, 3, 1)}
      {pod(38, 34, 26, 5.5, 6, 2)}
      {pod(50, 33, 15, 4, -4, 3)}
      {pod(-12, 36, 9, 2.8, 2, 4)}
      {pod(16, 36, 11, 3.2, -3, 5)}

      {/* The wall, colonised: ribbing and lit seams so the stone looks like it
          has been grown over rather than painted. */}
      <g clipPath={`url(#skin-alien-wall-${uid})`}>
        <rect x={-52} y={-24} width={104} height={54} fill={CRUST} opacity={0.4} />
        {[-44, -28, -12, 8, 24, 40].map((x, i) => (
          <path
            key={i}
            d={`M ${x} 30 C ${x + 3} 16 ${x - 3} 4 ${x + 2} -10 C ${x + 4} -16 ${x + 1} -20 ${x + 3} -24`}
            fill="none"
            stroke={CRUST_LIT}
            strokeWidth={3}
            opacity={0.55}
            strokeLinecap="round"
          />
        ))}
        {[
          { x: -38, y: 6 },
          { x: -6, y: 18 },
          { x: 18, y: -2 },
          { x: 44, y: 14 },
        ].map((g, i) => (
          <g key={i}>
            <circle cx={g.x} cy={g.y} r={5} fill={BIO} opacity={0.14} />
            <circle cx={g.x} cy={g.y} r={1.6} fill={BIO} />
          </g>
        ))}
      </g>
    </g>
  )
}

/**
 * Legendary — Cosmic Nexus.
 *
 * The fortress at the middle of a small galaxy: arms of nebula turning around
 * it, planets running their orbits, and a core burning inside the walls that
 * the whole thing is built on.
 *
 * ⚠️ THE CASTLE IS THE CORE, WHICH IS HOW THIS AVOIDS BEING FIRE'S SUPERNOVA.
 * That skin puts a star above the keep and hangs thin rings off it. Here the
 * light comes from INSIDE the fortress — through the gate, up the seams, out of
 * the battlements — and the galaxy is the thing around it. Two skins about
 * space with rings on them is fine; two with a burning ball over the keep is
 * not.
 *
 * ⚠️ THE ORBITS HAVE A FAR HALF AND A NEAR HALF. Clipping a whole ring behind
 * the castle makes the castle sit on top of it like a model on a plinth — the
 * error the Thunder God's rings were rebuilt for. Far halves are clipped and
 * vanish behind; near halves are drawn unclipped, later, and cross in front.
 *
 * ⚠️ THE NEBULA IS GRADIENT-FILLED, NOT STROKED. A stroke has hard edges, and a
 * hard-edged band of colour is a ribbon rather than gas — Ice's aurora took
 * three attempts to learn that, and this is the same problem with the same fix.
 */
function CosmicNexus({ eliminated, uid }: DecorProps) {
  const CORE = '#fff4d0'
  const NEB_A = '#a86fff'
  const NEB_B = '#3ad0ff'

  /* Centred a little above the castle's middle, so the galaxy sits around the
     keep rather than around the gate. */
  const CY = -8

  /**
   * ⚠️ EVERY NUMBER HERE IS FRAME-BOUND. The sprite frame stops at x ±92 and
   * y 44, and the clip cuts anything past it dead square — which is how the
   * Spaceship's engine plumes came out sliced. The bound is NOT `ry`: tilting
   * an ellipse by `rot` makes it reach further down than its own minor axis,
   * so the real limit is `sqrt((rx·sin rot)² + (ry·cos rot)²) + pr <= 50`
   * below the centre and the matching expression + the planet's ring across.
   * The planets got their size from what was left after that, not the other
   * way round.
   *
   * ⚠️ `phase` STAGGERS THE STARTS. Without it every planet begins at the same
   * point on its ring — which is the first frame anyone sees, and a row of
   * planets lined up on one side reads as a diagram of an orbit rather than as
   * a system going round. Applied as a negative delay, so each starts partway
   * through its own cycle. The six of them are spread across the six sixths of
   * a lap rather than picked by eye, because the first pass put four of them
   * down the same side and it read as a pile-up rather than as a system.
   */
  const ORBITS = [
    {
      rx: 76, ry: 36, rot: -14, w: 1.8, dur: 44,
      planets: [
        { c: '#6f5bd8', pr: 9, phase: 0.05, halo: true },
        { c: '#9b7ae0', pr: 5, phase: 0.55 },
      ],
    },
    {
      rx: 68, ry: 31, rot: 9, w: 1.6, dur: 32,
      planets: [{ c: '#3a8fbf', pr: 7.2, phase: 0.38 }],
    },
    {
      rx: 54, ry: 23, rot: -5, w: 1.4, dur: 23,
      planets: [
        { c: '#b8724a', pr: 6, phase: 0.88 },
        { c: '#d9a066', pr: 4, phase: 0.22 },
      ],
    },
    {
      rx: 40, ry: 15, rot: 15, w: 1.2, dur: 16,
      planets: [{ c: '#4fc9c0', pr: 5, phase: 0.71 }],
    },
  ]

  type Orbit = (typeof ORBITS)[number]

  const arc = (o: Orbit, half: 'far' | 'near') =>
    half === 'far'
      ? `M ${-o.rx} ${CY} A ${o.rx} ${o.ry} 0 0 1 ${o.rx} ${CY}`
      : `M ${o.rx} ${CY} A ${o.rx} ${o.ry} 0 0 1 ${-o.rx} ${CY}`

  const ring = (o: Orbit, half: 'far' | 'near', key: number) => (
    <g key={key} transform={`rotate(${o.rot} 0 ${CY})`}>
      <path
        d={arc(o, half)}
        fill="none"
        stroke={CYAN}
        strokeWidth={o.w}
        opacity={half === 'far' ? 0.3 : 0.55}
        strokeLinecap="round"
      />
      {/* ⚠️ EACH PLANET IS DRAWN TWICE, AND ONLY ONE COPY IS VISIBLE AT A TIME.
          The rings alone used to carry the depth: the planets rode the near
          pass, unclipped, and sailed straight THROUGH the keep on the half of
          the lap they should have been hidden for.
          The far copy is clipped (the castle covers it) and the near copy is
          not, and a step-end opacity animation hands the planet from one to the
          other at the two points where its ring crosses the castle. Both copies
          run the ORBIT'S OWN duration and are offset by its phase, so the
          hand-off happens at the same instant for both however the orbit is
          tuned — see `skin-planet-front` / `skin-planet-back`.
          Which half is which: the far arc sweeps over the TOP, and rotate() in
          a y-down space turns clockwise, so angle 0→180 is the front (right,
          bottom, left) and 180→360 is the back. */}
      {o.planets.map((pl, i) => {
          /* ⚠️ A ROTATION DRAWS A CIRCLE, AND THESE RINGS ARE ELLIPSES. Spun
             on its own, a planet at radius `rx` leaves the ring it is supposed
             to be on the moment it turns — the first build sent one straight
             out through the bottom of the frame. So the whole orbit is built
             inside a group squashed to `ry / rx`: the planet really does go
             round a circle, the squash turns that circle into exactly the
             ellipse that is drawn, and an equal-and-opposite squash on the
             planet itself keeps it round. The rotate and its counter-rotate
             cancel between the two, so nothing is left leaning.

             ⚠️ AND THE START ANGLE IS A TRANSFORM, NOT ONLY A DELAY. A
             negative animation-delay staggers them once the animation is
             running, but anywhere it is not — a paused tab, a still, and above
             all prefers-reduced-motion, where the orbit is switched off
             entirely — every planet sits at its ring's start point and they
             stack up in one heap on the right. */
          const k = o.ry / o.rx
          const a = pl.phase * 360
          /* ⚠️ THE BASE OPACITY IS THE STILL FRAME. With animation off — a
             paused tab, a thumbnail, prefers-reduced-motion — the keyframes
             never run, so each copy has to already be showing the right half:
             a planet parked on the back of its lap is the clipped one. */
          const onFarHalf = pl.phase >= 0.5
          const visible =
            half === 'far' ? (onFarHalf ? 1 : 0) : onFarHalf ? 0 : 1
          return (
            <g
              key={i}
              className={half === 'far' ? 'skin__planet-back' : 'skin__planet-front'}
              style={{
                opacity: visible,
                animationDuration: `${o.dur}s`,
                animationDelay: `${-pl.phase * o.dur}s`,
              }}
            >
            <g transform={`translate(0 ${CY}) scale(1 ${k.toFixed(4)})`}>
              <g transform={`rotate(${a})`}>
                <g
                  className="skin__orbit"
                  style={{ transformOrigin: '0px 0px', animationDuration: `${o.dur}s` }}
                >
                  <g transform={`translate(${o.rx} 0)`}>
                    <g className="skin__orbit-upright" style={{ animationDuration: `${o.dur}s` }}>
                      <g transform={`rotate(${-a}) scale(1 ${(1 / k).toFixed(4)})`}>
                        {/* The big one wears a ring of its own. One planet, not
                            all of them — a system where everything has rings is
                            a pattern. */}
                        {'halo' in pl && pl.halo ? (
                          <g transform="rotate(-18)">
                            <ellipse
                              rx={pl.pr * 1.85}
                              ry={pl.pr * 0.42}
                              fill="none"
                              stroke={CYAN}
                              strokeWidth={1.6}
                              opacity={0.75}
                            />
                          </g>
                        ) : null}
                        <circle r={pl.pr} fill={pl.c} stroke={OUTLINE} strokeWidth={1} />
                        {/* ⚠️ THE RETURN ARC SWEEPS THE SAME WAY AS THE FIRST.
                            With the other flag it bulges back across the middle,
                            so the shadow covers all but two thin crescents and
                            the planet reads as a donut — which is exactly how it
                            rendered the first time. */}
                        <path
                          d={`M 0 ${-pl.pr} A ${pl.pr} ${pl.pr} 0 0 1 0 ${pl.pr} A ${pl.pr * 0.75} ${pl.pr} 0 0 1 0 ${-pl.pr} z`}
                          fill={OUTLINE}
                          opacity={0.45}
                        />
                      </g>
                    </g>
                  </g>
                </g>
              </g>
            </g>
            </g>
          )
        })}
    </g>
  )

  return (
    <g className="skin skin--cosmicnexus" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      {/* "Everywhere except the castle": the frame, with the wall and the keep
          punched out of it.
          ⚠️ THE TWO HOLES MUST NOT OVERLAP. Under even-odd, a point inside all
          three rectangles has crossed three edges — an ODD number — so it fills
          again: the keep hole used to run to y −11 while the wall hole starts at
          −25, and that 42×14 band where they crossed re-appeared as a pale
          rectangle sitting on the castle, right under the keep. It is the same
          fault that put a translucent rectangle on Mad Jester, and it was in
          twenty-three skins. The keep hole now stops exactly where the wall
          hole begins; the band is still excluded, by the wall. */}
      <clipPath id={`skin-nexus-outside-${uid}`} clipRule="evenodd">
        <path
          d="M -92 -128 L 92 -128 L 92 44 L -92 44 z
             M -53 -25 L 53 -25 L 53 31 L -53 31 z
             M -21 -59 L 21 -59 L 21 -25 L -21 -25 z"
          clipRule="evenodd"
        />
      </clipPath>
      <clipPath id={`skin-nexus-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-nexus-keep-${uid}`}>
        <rect x={-20} y={-58} width={40} height={46} rx={3} />
      </clipPath>
      <defs>
        {/* ⚠️ THE FADE IS RADIAL FROM THE CORE, NOT LEFT-TO-RIGHT. A linear
            gradient fades every arm along the same axis, so the arms running
            up and down got a hard edge across them and read as fins rather
            than as gas. In user space, centred on the galaxy, one gradient
            thins every arm with distance from the middle whichever way it
            points. */}
        {[NEB_A, NEB_B].map((c, i) => (
          <radialGradient
            key={i}
            id={`skin-neb-${uid}-${i}`}
            gradientUnits="userSpaceOnUse"
            cx={0}
            cy={CY}
            r={112}
          >
            <stop offset="0%" stopColor={c} stopOpacity="0.34" />
            <stop offset="34%" stopColor={c} stopOpacity="0.24" />
            <stop offset="68%" stopColor={c} stopOpacity="0.1" />
            <stop offset="100%" stopColor={c} stopOpacity="0" />
          </radialGradient>
        ))}
        {/* The pool of light under a top edge: strongest at the stone's face
            and gone within a dozen units, which is how a surface lit from just
            above it falls off. */}
        <linearGradient id={`skin-nexus-rim-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CORE} stopOpacity="0.3" />
          <stop offset="100%" stopColor={CORE} stopOpacity="0" />
        </linearGradient>
        <radialGradient
          id={`skin-nexus-core-${uid}`}
          gradientUnits="userSpaceOnUse"
          cx={0}
          cy={CY}
          r={72}
        >
          <stop offset="0%" stopColor={CORE} stopOpacity="0.5" />
          <stop offset="26%" stopColor="#c9a3ff" stopOpacity="0.26" />
          <stop offset="62%" stopColor={NEB_A} stopOpacity="0.12" />
          <stop offset="100%" stopColor={NEB_A} stopOpacity="0" />
        </radialGradient>
      </defs>

      <g clipPath={`url(#skin-nexus-outside-${uid})`}>
        {/* The core, seen around the fortress. The arms all converge on a point
            that is hidden behind the keep, so without this the middle of the
            galaxy is the one part of it you cannot see — and the castle stops
            reading as the thing at the centre. */}
        <circle cx={0} cy={CY} r={72} fill={`url(#skin-nexus-core-${uid})`} />

        {/* Nebula arms, sweeping out of the fortress.
            ⚠️ EACH ARM IS DRAWN THREE TIMES, slightly turned and scaled, at a
            third of the opacity. A single filled path has a crisp edge down
            both sides no matter what its fill does, and a crisp-edged band of
            colour is a ribbon. Overlapping copies is what softens the sides
            — without a blur filter, which would have to re-render every frame
            of a 90-second rotation on up to seven castles at once. */}
        <g className="skin__galaxy">
          {[
            { d: 'M 0 -8 C 38 -34 82 -38 104 -20 C 108 -4 86 8 56 4 C 28 1 8 -2 0 -8 z', g: 0 },
            { d: 'M 0 -8 C -38 16 -82 20 -104 4 C -108 -12 -86 -24 -56 -20 C -28 -17 -8 -14 0 -8 z', g: 1 },
            { d: 'M 0 -8 C 22 -50 16 -92 -16 -116 C -36 -110 -34 -78 -20 -50 C -11 -30 -4 -14 0 -8 z', g: 1 },
            { d: 'M 0 -8 C -20 32 -14 64 16 84 C 34 78 34 52 20 30 C 11 10 4 -2 0 -8 z', g: 0 },
            { d: 'M 0 -8 C 40 -8 78 -46 84 -78 C 66 -88 42 -66 24 -40 C 12 -22 5 -12 0 -8 z', g: 0 },
          ].flatMap((a, i) =>
            [
              { rot: -3.5, k: 1.07 },
              { rot: 0, k: 1 },
              { rot: 3.5, k: 0.93 },
            ].map((c, j) => (
              <g
                key={`${i}-${j}`}
                transform={`rotate(${c.rot} 0 ${CY}) translate(0 ${CY}) scale(${c.k}) translate(0 ${-CY})`}
                opacity={0.42}
              >
                <path d={a.d} fill={`url(#skin-neb-${uid}-${a.g})`} />
              </g>
            )),
          )}
        </g>

        {/* Field stars. The whole field turns the other way from the galaxy
            and much slower, which is what makes the arms read as nearer than
            the sky behind them — and each star breathes on its own offset, so
            they never blink as a group. */}
        <g className="skin__starfield">
          {[
            { x: -80, y: -60, r: 1.2 }, { x: -58, y: -92, r: 0.9 }, { x: -30, y: -114, r: 1.4 },
            { x: 22, y: -104, r: 1 }, { x: 54, y: -78, r: 1.3 }, { x: 80, y: -52, r: 0.9 },
            { x: 86, y: 14, r: 1.1 }, { x: -86, y: 22, r: 1 }, { x: 44, y: -118, r: 0.8 },
            { x: -46, y: -70, r: 0.7 }, { x: 66, y: -34, r: 0.8 }, { x: -70, y: -12, r: 1 },
            { x: 8, y: -122, r: 1.1 }, { x: -14, y: -84, r: 0.7 }, { x: 36, y: -60, r: 0.6 },
            { x: -66, y: -40, r: 0.8 }, { x: 74, y: -100, r: 1 }, { x: -88, y: -86, r: 0.9 },
            { x: 60, y: 6, r: 0.7 }, { x: -34, y: 30, r: 0.8 },
          ].map((st, i) => (
            <g
              key={i}
              className="skin__twinkle"
              style={{ animationDelay: `-${(i * 0.83) % 4.6}s`, animationDuration: `${3.2 + (i % 5) * 0.7}s` }}
            >
              {star(st.x, st.y, st.r, 0.9, i)}
            </g>
          ))}
        </g>

        {/* The far halves of the orbits. */}
        {ORBITS.map((o, i) => ring(o, 'far', 100 + i))}
      </g>

      {/* ---- the fortress itself ----------------------------------------
          ⚠️ THE CASTLE HAD TO EARN ITS PLACE AT THE MIDDLE OF THIS. Everything
          around it was a galaxy and the castle was four cream blocks on a flat
          purple slab — the eye went to the orbits and slid off the thing they
          were orbiting. A skin may draw OVER the sprite (decor layers last), so
          this is where the fortress gets its stonework: courses cut into the
          wall, a lit edge along every top, glow escaping from behind the
          merlons, and fissures with the core showing through them. */}

      {/* Wall: coursed stone. The seams are DARK, not light — a joint is a
          shadow, and drawing them bright turns a wall into a grid. */}
      <g clipPath={`url(#skin-nexus-wall-${uid})`}>
        {[-10, 4, 18].map((y, i) => (
          <path
            key={`c${i}`}
            d={`M -52 ${y} L 52 ${y}`}
            stroke="#0b0620"
            strokeWidth={1.1}
            opacity={0.55}
            fill="none"
          />
        ))}
        {/* Verticals, offset course to course the way stone is actually laid:
            joints that line up read as tiling rather than as masonry. */}
        {[
          [-38, -24, -10], [-12, -10, 4], [14, 4, 18], [-24, 18, 30],
          [12, -24, -10], [36, -10, 4], [-40, 4, 18], [26, 18, 30],
          [40, -24, -10], [-36, 18, 30],
        ].map(([x, y0, y1], i) => (
          <path
            key={`v${i}`}
            d={`M ${x} ${y0} L ${x} ${y1}`}
            stroke="#0b0620"
            strokeWidth={1}
            opacity={0.45}
            fill="none"
          />
        ))}
        {/* The core showing through seams it has split open. They spread down
            and OUT from under the keep, because that is where the light is;
            the first pass ran four identical ribbons straight down the wall and
            they read as candle wax. */}
        {[
          'M -8 -24 L -12 -13 L -7 -3 L -12 7',
          'M 9 -24 L 13 -12 L 8 -1',
          'M -33 -6 L -29 4 L -34 15',
          'M 34 -10 L 30 1 L 35 12',
        ].map((d, i) => (
          <g key={`f${i}`} className="skin__core-vein" style={{ animationDelay: `${i * 0.55}s` }}>
            <path d={d} fill="none" stroke={CORE} strokeWidth={3.4} opacity={0.1} strokeLinejoin="round" />
            <path d={d} fill="none" stroke={CORE} strokeWidth={0.9} opacity={0.62} strokeLinejoin="round" />
          </g>
        ))}
        {/* Brightest just under the battlements, falling away to shadow at the
            foot — so the wall is a surface with a light above it rather than a
            flat fill. */}
        <rect x={-52} y={-24} width={104} height={13} fill={`url(#skin-nexus-rim-${uid})`} />
        <rect x={-52} y={16} width={104} height={14} fill="#050212" opacity={0.4} />
      </g>

      {/* Keep: the same stone, fewer courses — a full grid on a block this
          small turns to noise at 60%. */}
      <g clipPath={`url(#skin-nexus-keep-${uid})`}>
        {[-40, -24].map((y, i) => (
          <path key={i} d={`M -20 ${y} L 20 ${y}`} stroke="#0b0620" strokeWidth={1} opacity={0.5} fill="none" />
        ))}
        {[[-7, -58, -40], [8, -40, -24], [-9, -24, -12]].map(([x, y0, y1], i) => (
          <path
            key={`kv${i}`}
            d={`M ${x} ${y0} L ${x} ${y1}`}
            stroke="#0b0620"
            strokeWidth={0.9}
            opacity={0.4}
            fill="none"
          />
        ))}
        {/* One crack, and it stops halfway. A fissure that runs the full height
            of a face splits it in two and the block stops reading as solid. */}
        <g className="skin__core-vein">
          <path d="M -4 -52 L -7 -43 L -2 -34" fill="none" stroke={CORE} strokeWidth={3.2} opacity={0.1} strokeLinejoin="round" />
          <path d="M -4 -52 L -7 -43 L -2 -34" fill="none" stroke={CORE} strokeWidth={0.85} opacity={0.6} strokeLinejoin="round" />
        </g>
        <rect x={-20} y={-58} width={40} height={11} fill={`url(#skin-nexus-rim-${uid})`} />
      </g>

      {/* ⚠️ A LIT EDGE, ON THE TOP FACES ONLY. One hairline of core colour
          along each top turns a flat slab into a lit surface, and it is the
          cheapest depth cue there is. Carried round the sides it is a border. */}
      <g fill="none" stroke={CORE} opacity={0.5}>
        <path d="M -50 -23.2 L 50 -23.2" strokeWidth={1.1} />
        <path d="M -18.5 -57.2 L 18.5 -57.2" strokeWidth={1} />
      </g>

      {/* Out through the gate: the fortress is lit from within. */}
      <g className="skin__core-glow">
        <path d="M -15 30 L -15 8 C -15 -3 15 -3 15 8 L 15 30 z" fill={CORE} opacity={0.22} />
        <path
          d="M -12 30 L -12 8 C -12 0 12 0 12 8 L 12 30"
          fill="none"
          stroke={CORE}
          strokeWidth={2.4}
          opacity={0.9}
        />
      </g>

      {/* And out from behind the battlements.
          ⚠️ MERLON CENTRES COME FROM THE SPRITE, NOT FROM THE EYE. The wall's
          sit at −46, −24, 24 and 46 and the keep's at −15, 0 and 15; two of
          these used to be at ±30, which is half a merlon out — close enough to
          read as a mistake rather than as a decision. */}
      {[
        { x: -46, y: -26, s: 1 }, { x: -24, y: -26, s: 1 }, { x: 24, y: -26, s: 1 },
        { x: 46, y: -26, s: 1 }, { x: -15, y: -59, s: 0.8 }, { x: 0, y: -59, s: 0.8 },
        { x: 15, y: -59, s: 0.8 },
      ].map((m, i) => (
        <g key={i} className="skin__core-vein" style={{ animationDelay: `${i * 0.45}s` }}>
          {/* ⚠️ TIGHT AND BRIGHT, NOT BROAD AND FAINT. A wide ellipse of pale
              cream at low opacity over a dark wall is grey, and seven of them
              sat on the battlements like caps of smoke. Small and bright reads
              as light; large and dim reads as dirt. */}
          <ellipse cx={m.x} cy={m.y - 4.5 * m.s} rx={4.4 * m.s} ry={2.6 * m.s} fill={CORE} opacity={0.3} />
          <ellipse cx={m.x} cy={m.y - 4.5 * m.s} rx={2 * m.s} ry={1.2 * m.s} fill={CORE} opacity={0.75} />
        </g>
      ))}

      {/* The near halves, in front of the fortress. */}
      {ORBITS.map((o, i) => ring(o, 'near', 200 + i))}
    </g>
  )
}

export const SpaceDecor = {
  'space.starpattern': StarPatternCastle,
  'space.spaceship': SpaceshipFortress,
  'space.alienbase': AlienPlanetBase,
  'space.nexus': CosmicNexus,
}
