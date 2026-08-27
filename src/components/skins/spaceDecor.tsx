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

export const SpaceDecor = {
  'space.starpattern': StarPatternCastle,
  'space.spaceship': SpaceshipFortress,
}
