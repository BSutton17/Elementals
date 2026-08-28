import type { ReactNode } from 'react'
import type { DecorProps } from './decor'
import './skins.css'

/**
 * Time's skin decorations.
 *
 * Drawn INSIDE the castle's local space, over the sprite — the keep occupies
 * roughly x −20…20, y −58…−12, the curtain wall x −52…52, y −24…30, and the
 * gate x −11…11, y 10…30. Anything here is layered on top of that.
 *
 * ⚠️ THE SILHOUETTE AND THE HUE ARE NOT NEGOTIABLE. Players pick out who is
 * attacking them from a small castle on a phone, often through fog. A skin may
 * add detail and texture; it may not obscure the shape, and it stays in Time's
 * brass and clock-face beige.
 *
 * ⚠️ NOTHING HERE ROTATES. Both briefs ask for turning gears and rings, and
 * both of these are below legendary. Motion is the legendary tier's only
 * marker, and spending it on an uncommon takes the one signal players have for
 * what a legendary is worth. The gears are drawn mid-turn instead — teeth
 * meshed, hands at an angle — which reads as a mechanism at rest rather than a
 * mechanism that ought to be moving and is not.
 *
 * ⚠️ ONE STROKED OUTLINE PER OBJECT. Everything inside it is an unstroked fill.
 */

const BRASS = '#c9a227'
const BRASS_DARK = '#7a5c1e'
const FACE = '#f0e3c2'
const IRON = '#4a3a28'
const OUTLINE = '#221507'
/** The light that comes through a tear. Shared by the eras table below. */
const RIFT = '#7fe8ff'

/** A gear: teeth around a rim, a hub, and spokes between them. */
function gear(
  cx: number,
  cy: number,
  r: number,
  teeth: number,
  fill: string,
  key: number,
  phase = 0,
) {
  return (
    <g key={key} transform={`translate(${cx} ${cy}) rotate(${phase})`}>
      {Array.from({ length: teeth }, (_, i) => (
        <rect
          key={i}
          x={-r * 0.15}
          y={-r - r * 0.2}
          width={r * 0.3}
          height={r * 0.24}
          rx={r * 0.05}
          fill={fill}
          stroke={OUTLINE}
          strokeWidth={r * 0.06}
          transform={`rotate(${(i * 360) / teeth})`}
        />
      ))}
      <circle r={r} fill={fill} stroke={OUTLINE} strokeWidth={r * 0.1} />
      {/* Lightening holes and hub, as unstroked fills so the gear stays one
          object. */}
      {Array.from({ length: 5 }, (_, i) => (
        <circle
          key={i}
          cx={0}
          cy={-r * 0.55}
          r={r * 0.17}
          fill={OUTLINE}
          opacity={0.45}
          transform={`rotate(${(i * 360) / 5})`}
        />
      ))}
      <circle r={r * 0.28} fill={OUTLINE} opacity={0.5} />
      <circle r={r * 0.13} fill={fill} />
    </g>
  )
}

/** A clock face: ticks round a dial, and hands stopped at an angle. */
function dial(
  cx: number,
  cy: number,
  r: number,
  key: number,
  hour = -40,
  minute = 110,
) {
  return (
    <g key={key} transform={`translate(${cx} ${cy})`}>
      <circle r={r} fill={FACE} stroke={OUTLINE} strokeWidth={r * 0.09} />
      <circle r={r * 0.86} fill="none" stroke={BRASS_DARK} strokeWidth={r * 0.05} opacity={0.6} />
      {Array.from({ length: 12 }, (_, i) => (
        <rect
          key={i}
          x={-r * 0.045}
          y={-r * 0.82}
          width={r * 0.09}
          height={i % 3 === 0 ? r * 0.22 : r * 0.13}
          fill={OUTLINE}
          opacity={i % 3 === 0 ? 0.85 : 0.5}
          transform={`rotate(${i * 30})`}
        />
      ))}
      {/* ⚠️ THE HANDS ARE NOT AT TWELVE. A dial with both hands straight up
          reads as a logo; off-square is what makes it read as a clock telling
          a time. */}
      <rect
        x={-r * 0.05}
        y={-r * 0.5}
        width={r * 0.1}
        height={r * 0.55}
        rx={r * 0.05}
        fill={OUTLINE}
        transform={`rotate(${hour})`}
      />
      <rect
        x={-r * 0.035}
        y={-r * 0.72}
        width={r * 0.07}
        height={r * 0.77}
        rx={r * 0.035}
        fill={OUTLINE}
        transform={`rotate(${minute})`}
      />
      <circle r={r * 0.09} fill={BRASS_DARK} stroke={OUTLINE} strokeWidth={r * 0.04} />
    </g>
  )
}

/**
 * Uncommon — Clockwork Castle.
 *
 * The stone fitted out as a movement: a dial on the keep, gears let into the
 * walls, and a repeating band of hands round the curtain.
 *
 * The lightest possible touch, like Water's Rippled Castle and Fire's Ember
 * Stripes: everything is clipped to the walls and the keep, so the silhouette is
 * exactly the default one and only the small gears on the battlements sit
 * outside it.
 */
function ClockworkCastle({ eliminated, uid }: DecorProps) {
  return (
    <g className="skin skin--clockwork" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      <clipPath id={`skin-clock-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-clock-keep-${uid}`}>
        <rect x={-20} y={-58} width={40} height={46} rx={3} />
      </clipPath>

      <g clipPath={`url(#skin-clock-wall-${uid})`}>
        {/* A band of hands round the curtain, all at different times — a band
            of identical ones is a stencil, not a clockwork. */}
        {[-42, -25, -8, 9, 26, 43].map((x, i) => (
          <g key={i} transform={`translate(${x} -15)`}>
            <circle r={3.4} fill="none" stroke={BRASS_DARK} strokeWidth={0.9} opacity={0.6} />
            <g transform={`rotate(${i * 53 - 70})`}>
              <rect x={-0.9} y={-7.5} width={1.8} height={8.6} rx={0.9} fill={BRASS} />
            </g>
            <circle r={1.5} fill={BRASS_DARK} stroke={OUTLINE} strokeWidth={0.6} />
          </g>
        ))}
        {/* Gears let into the stone, meshed rather than scattered: each pair
            touches at the teeth, which is the whole cue that says mechanism. */}
        {gear(-33, 12, 12, 10, BRASS, 0, 8)}
        {gear(-14, 19, 8, 8, BRASS_DARK, 1, 20)}
        {gear(32, 10, 13, 11, BRASS, 2, -6)}
        {gear(13, 18, 7, 8, BRASS_DARK, 3, 14)}
      </g>

      <g clipPath={`url(#skin-clock-keep-${uid})`}>
        {dial(0, -36, 13, 0)}
      </g>

      {/* Small gears on the battlements — the one thing outside the outline,
          and small enough that the shape underneath is untouched. */}
      {[
        { x: -46, y: -34, r: 5 },
        { x: -30, y: -35, r: 4 },
        { x: 30, y: -35, r: 4 },
        { x: 46, y: -34, r: 5 },
      ].map((g, i) => gear(g.x, g.y, g.r, 8, BRASS, 10 + i, i * 17))}
    </g>
  )
}

/**
 * Rare — Chrono Tower.
 *
 * A clock tower that is not all from the same century: the west half is
 * weathered stone, the east half is machined and lit, and enormous gears turn
 * the whole thing over behind the walls.
 *
 * ⚠️ THE SPLIT IS THE SKIN. "Parts existing at different ages" is the brief and
 * it only works if the two halves are genuinely different MATERIALS, not the
 * same wall in two tints — so the west is cracked, chipped and mossy with no
 * straight lines, and the east is flat panels, precise seams and cyan light. A
 * gradient between them would read as a lighting effect; a hard vertical seam
 * down the middle of the castle reads as two ages meeting.
 *
 * ⚠️ RARE MAY REACH PAST THE WALLS BUT NOT PAST THE FRAME, and it does not move.
 */
function ChronoTower({ eliminated, uid }: DecorProps) {
  const STONE = '#8d8578'
  const STONE_DARK = '#575146'
  const MOSS = '#6f8a52'
  const CHROME = '#c8d4de'
  const CHROME_DARK = '#6f7d8a'
  const LIT = '#7fe8ff'

  return (
    <g className="skin skin--chrono" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      <clipPath id={`skin-chrono-outside-${uid}`} clipRule="evenodd">
        <path
          d="M -92 -128 L 92 -128 L 92 44 L -92 44 z
             M -53 -25 L 53 -25 L 53 31 L -53 31 z
             M -21 -59 L 21 -59 L 21 -11 L -21 -11 z"
          clipRule="evenodd"
        />
      </clipPath>
      <clipPath id={`skin-chrono-west-${uid}`}>
        <path d="M -52 -24 L 0 -24 L 0 30 L -52 30 z M -20 -58 L 0 -58 L 0 -12 L -20 -12 z" />
      </clipPath>
      <clipPath id={`skin-chrono-east-${uid}`}>
        <path d="M 0 -24 L 52 -24 L 52 30 L 0 30 z M 0 -58 L 20 -58 L 20 -12 L 0 -12 z" />
      </clipPath>

      {/* Gears behind the castle, so the tower looks driven from within. */}
      <g clipPath={`url(#skin-chrono-outside-${uid})`}>
        {gear(-58, -6, 30, 14, BRASS_DARK, 0, 7)}
        {gear(60, 2, 26, 13, BRASS_DARK, 1, -11)}
        {gear(-14, -74, 22, 12, BRASS, 2, 15)}
        {gear(34, -62, 15, 10, BRASS, 3, -20)}
        {/* A mechanical ring round the upper works. Static: rare does not move. */}
        <ellipse
          cx={0}
          cy={-58}
          rx={70}
          ry={26}
          fill="none"
          stroke={IRON}
          strokeWidth={5}
          transform="rotate(-9 0 -58)"
        />
        <ellipse
          cx={0}
          cy={-58}
          rx={70}
          ry={26}
          fill="none"
          stroke={BRASS}
          strokeWidth={1.6}
          opacity={0.7}
          transform="rotate(-9 0 -58)"
        />
      </g>

      {/* ---- west: ancient stone ---------------------------------------- */}
      <g clipPath={`url(#skin-chrono-west-${uid})`}>
        <rect x={-52} y={-58} width={52} height={88} fill={STONE} opacity={0.92} />
        {/* Courses, deliberately uneven — dressed stone that has settled. */}
        {[-14, -2, 11, 23].map((y, i) => (
          <path
            key={i}
            d={`M -52 ${y} C -40 ${y - 1.2} -26 ${y + 1} -14 ${y - 0.6} L 0 ${y + 0.8}`}
            fill="none"
            stroke={STONE_DARK}
            strokeWidth={1.3}
            opacity={0.8}
          />
        ))}
        {/* Cracks and lost corners. */}
        {['M -44 30 L -41 18 L -46 8 L -42 -4', 'M -22 -24 L -19 -14 L -24 -6', 'M -8 30 L -11 20 L -6 12'].map(
          (d, i) => (
            <path key={i} d={d} fill="none" stroke={STONE_DARK} strokeWidth={1.5} opacity={0.9} />
          ),
        )}
        {[
          { x: -52, y: -24, r: 5 },
          { x: -30, y: 30, r: 4 },
          { x: -10, y: -24, r: 3.5 },
        ].map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={c.r} fill={OUTLINE} opacity={0.35} />
        ))}
        {/* Moss in the joints, because nothing is that old and still clean. */}
        {[
          'M -52 26 q 8 -4 16 -1 q 9 -3 14 1 l 0 5 l -30 0 z',
          'M -34 -24 q 6 4 12 1 l 0 -4 l -12 0 z',
        ].map((d, i) => (
          <path key={i} d={d} fill={MOSS} opacity={0.75} />
        ))}
      </g>

      {/* ---- east: machined and lit -------------------------------------- */}
      <g clipPath={`url(#skin-chrono-east-${uid})`}>
        <rect x={0} y={-58} width={52} height={88} fill={CHROME_DARK} opacity={0.9} />
        {/* Panels: flat, square, and exactly regular — the opposite of the west
            in every respect, which is what makes the seam read. */}
        {[
          { x: 4, y: -20, w: 20, h: 14 },
          { x: 28, y: -20, w: 20, h: 14 },
          { x: 4, y: -2, w: 20, h: 14 },
          { x: 28, y: -2, w: 20, h: 14 },
          { x: 4, y: 16, w: 20, h: 12 },
          { x: 28, y: 16, w: 20, h: 12 },
          { x: 3, y: -54, w: 15, h: 18 },
        ].map((p, i) => (
          <g key={i}>
            <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={1.5} fill={CHROME} opacity={0.22} />
            <rect
              x={p.x}
              y={p.y}
              width={p.w}
              height={p.h}
              rx={1.5}
              fill="none"
              stroke={LIT}
              strokeWidth={0.9}
              opacity={0.65}
            />
          </g>
        ))}
        {/* Conduit, and the light running in it. */}
        <path
          d="M 0 8 L 14 8 L 20 2 L 40 2 L 46 8 L 52 8"
          fill="none"
          stroke={LIT}
          strokeWidth={1.4}
          opacity={0.85}
          strokeLinejoin="round"
        />
        {[10, 26, 44].map((x, i) => (
          <circle key={i} cx={x} cy={-24} r={1.8} fill={LIT} opacity={0.9} />
        ))}
      </g>

      {/* The seam itself: where the two ages meet. */}
      <line x1={0} y1={-58} x2={0} y2={30} stroke={OUTLINE} strokeWidth={2.4} />
      <line x1={0} y1={-58} x2={0} y2={30} stroke={LIT} strokeWidth={0.9} opacity={0.55} />

      {/* The tower's own dial, straddling the seam — half aged, half lit. */}
      <g>
        {dial(0, -36, 17, 0, -55, 128)}
        <path
          d="M 0 -53 A 17 17 0 0 1 0 -19 z"
          fill={LIT}
          opacity={0.13}
        />
        <path
          d="M 0 -53 A 17 17 0 0 0 0 -19 z"
          fill={STONE_DARK}
          opacity={0.18}
        />
      </g>
    </g>
  )
}

/**
 * The eras Time Rift Fortress can be built from.
 *
 * ⚠️ APPEND ONLY. The server sends a seed, not a list of eras, and the trio is
 * derived from that seed against this array — so inserting or reordering an
 * entry changes what an existing seed produces. Two clients on different
 * releases would then draw the same castle differently. Adding to the end is
 * safe; anything else is not.
 *
 * Each renderer is handed the band it has to fill. `x0`/`x1` are the band's
 * edges, so an era can run detail right up to the tear on either side.
 */
type Band = { x0: number; x1: number }

const ERAS: { id: string; name: string; base: string; render: (b: Band) => ReactNode }[] = [
  {
    id: 'ruin',
    name: 'Ancient ruin',
    base: '#7d7466',
    render: ({ x0, x1 }) => (
      <>
        {[-13, 1, 16].map((y, i) => (
          <path
            key={i}
            d={`M ${x0} ${y} C ${x0 + 8} ${y - 1.4} ${x1 - 8} ${y + 1.2} ${x1} ${y - 0.5}`}
            fill="none"
            stroke="#4e483d"
            strokeWidth={1.3}
            opacity={0.8}
          />
        ))}
        <path
          d={`M ${x0 + 8} 30 L ${x0 + 11} 17 L ${x0 + 6} 7 L ${x0 + 10} -6`}
          fill="none"
          stroke="#4e483d"
          strokeWidth={1.5}
          opacity={0.9}
        />
        {[
          { x: x0, y: -24, r: 6 },
          { x: (x0 + x1) / 2, y: 30, r: 5 },
        ].map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={c.r} fill={OUTLINE} opacity={0.4} />
        ))}
        <path
          d={`M ${x0} 25 q 8 -5 16 -1 q 8 -3 14 1 l 0 6 l -30 0 z`}
          fill="#6f8a52"
          opacity={0.7}
        />
      </>
    ),
  },
  {
    id: 'medieval',
    name: 'Medieval',
    base: '#9a7647',
    render: ({ x0, x1 }) => (
      <>
        {[-16, -6, 4, 14, 24].map((y, i) => (
          <rect key={i} x={x0} y={y} width={x1 - x0} height={1.2} fill="#5f4526" opacity={0.75} />
        ))}
        {[0.25, 0.55, 0.85].map((t, i) => (
          <rect
            key={i}
            x={x0 + (x1 - x0) * t}
            y={-16}
            width={1.2}
            height={40}
            fill="#5f4526"
            opacity={0.5}
          />
        ))}
        {/* An arrow slit: the only era here that would want one. */}
        <path
          d={`M ${(x0 + x1) / 2 - 2} -4 L ${(x0 + x1) / 2 + 2} -4 L ${(x0 + x1) / 2 + 2} 10 L ${(x0 + x1) / 2 - 2} 10 z`}
          fill={OUTLINE}
          opacity={0.65}
        />
      </>
    ),
  },
  {
    id: 'japan',
    name: 'Ancient Japan',
    base: '#e6ddcb',
    render: ({ x0, x1 }) => (
      <>
        {/* Timber frame over plaster: uprights and a nuki beam, which is the
            frame pattern that says this and not "white wall". */}
        {[0.18, 0.44, 0.7, 0.94].map((t, i) => (
          <rect
            key={i}
            x={x0 + (x1 - x0) * t}
            y={-20}
            width={2.4}
            height={50}
            fill="#5a3a24"
            opacity={0.9}
          />
        ))}
        <rect x={x0} y={2} width={x1 - x0} height={2.6} fill="#5a3a24" opacity={0.9} />
        {/* A tiled eave, with the upturn at the end. */}
        <path
          d={`M ${x0 - 2} -20 L ${x1 + 2} -20 L ${x1 + 5} -25 L ${x0 - 5} -25 z`}
          fill="#3f4a52"
          stroke={OUTLINE}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
        <path
          d={`M ${x0 - 5} -25 q -4 0 -5 -4`}
          fill="none"
          stroke="#3f4a52"
          strokeWidth={2.6}
          strokeLinecap="round"
        />
        {[0.3, 0.6].map((t, i) => (
          <circle key={i} cx={x0 + (x1 - x0) * t} cy={14} r={3.2} fill="#b03a2e" opacity={0.85} />
        ))}
      </>
    ),
  },
  {
    id: 'russia',
    name: 'Old Russia',
    base: '#d9d2c4',
    render: ({ x0, x1 }) => {
      const mid = (x0 + x1) / 2
      return (
        <>
          {/* An onion dome sitting on the parapet — the one silhouette nobody
              mistakes for anything else. */}
          <path
            d={`M ${mid} -46 C ${mid + 11} -38 ${mid + 9} -26 ${mid} -20
                C ${mid - 9} -26 ${mid - 11} -38 ${mid} -46 z`}
            fill="#2e8b7a"
            stroke={OUTLINE}
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
          <path
            d={`M ${mid} -52 L ${mid} -46 M ${mid - 3} -49 L ${mid + 3} -49`}
            stroke="#e0b83a"
            strokeWidth={1.6}
          />
          {[0.2, 0.5, 0.8].map((t, i) => (
            <path
              key={i}
              d={`M ${x0 + (x1 - x0) * t} 26 l 5 -6 l 5 6 z`}
              fill="#b03a2e"
              opacity={0.85}
            />
          ))}
          <rect x={x0} y={-2} width={x1 - x0} height={3} fill="#2e8b7a" opacity={0.7} />
          <rect x={x0} y={12} width={x1 - x0} height={3} fill="#e0b83a" opacity={0.6} />
        </>
      )
    },
  },
  {
    id: 'egypt',
    name: 'Ancient Egypt',
    base: '#d8b978',
    render: ({ x0, x1 }) => (
      <>
        {/* Battered wall: the face leans in, which is the giveaway. */}
        <path
          d={`M ${x0} 30 L ${x0 + 5} -24 L ${x1 - 5} -24 L ${x1} 30 z`}
          fill="#c2a05e"
          opacity={0.6}
        />
        <rect x={x0} y={-20} width={x1 - x0} height={4} fill="#8a6a2e" opacity={0.8} />
        {/* A register of glyphs. Simple marks, but ruled and evenly spaced,
            which is what reading as writing requires. */}
        {[0.12, 0.32, 0.52, 0.72, 0.9].map((t, i) => (
          <g key={i} transform={`translate(${x0 + (x1 - x0) * t} 4)`}>
            <rect x={-1.4} y={-6} width={2.8} height={5} fill="#6b4f1e" opacity={0.85} />
            <circle cy={2} r={1.6} fill="#6b4f1e" opacity={0.85} />
            <rect x={-2} y={5} width={4} height={1.4} fill="#6b4f1e" opacity={0.85} />
          </g>
        ))}
        <rect x={x0} y={16} width={x1 - x0} height={2} fill="#8a6a2e" opacity={0.7} />
      </>
    ),
  },
  {
    id: 'future',
    name: 'Futuristic',
    base: '#5f6d7a',
    render: ({ x0, x1 }) => {
      const w = x1 - x0
      return (
        <>
          {[
            { x: x0 + 3, y: -18, w: w * 0.42, h: 13 },
            { x: x0 + w * 0.52, y: -18, w: w * 0.42, h: 13 },
            { x: x0 + 3, y: -1, w: w * 0.42, h: 13 },
            { x: x0 + w * 0.52, y: -1, w: w * 0.42, h: 13 },
            { x: x0 + 3, y: 16, w: w - 6, h: 11 },
          ].map((p, i) => (
            <g key={i}>
              <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={1.4} fill="#b9c6d2" opacity={0.25} />
              <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={1.4} fill="none" stroke={RIFT} strokeWidth={0.85} opacity={0.6} />
            </g>
          ))}
          {[0.25, 0.7].map((t, i) => (
            <circle key={i} cx={x0 + w * t} cy={-22} r={1.7} fill={RIFT} opacity={0.9} />
          ))}
        </>
      )
    },
  },
  {
    id: 'dystopia',
    name: 'Dystopian',
    base: '#6b5f56',
    render: ({ x0, x1 }) => {
      const w = x1 - x0
      return (
        <>
          {/* Corrugated sheet, bolted on over whatever was there. */}
          {Array.from({ length: Math.max(3, Math.round(w / 5)) }, (_, i) => (
            <rect
              key={i}
              x={x0 + i * 5}
              y={-24}
              width={2.2}
              height={54}
              fill="#4a4038"
              opacity={0.55}
            />
          ))}
          {/* Hazard stripes, and rust where the sheet meets the stone. */}
          <g>
            <rect x={x0} y={4} width={w} height={7} fill="#c8a227" opacity={0.85} />
            {Array.from({ length: Math.max(2, Math.round(w / 7)) }, (_, i) => (
              <path
                key={i}
                d={`M ${x0 + i * 7} 11 l 4 -7 l 3.5 0 l -4 7 z`}
                fill={OUTLINE}
                opacity={0.8}
              />
            ))}
          </g>
          <path
            d={`M ${x0} -24 q ${w * 0.3} 5 ${w * 0.55} 1 q ${w * 0.3} -4 ${w * 0.45} 2 l 0 -5 l ${-w} 0 z`}
            fill="#8a4b2a"
            opacity={0.7}
          />
          {[0.2, 0.55, 0.85].map((t, i) => (
            <circle key={i} cx={x0 + w * t} cy={-14} r={1.5} fill="#3a332c" />
          ))}
        </>
      )
    },
  },
]

/**
 * Rare — Time Rift Fortress.
 *
 * One castle in three centuries at once, and never reliably the same three:
 * every match rolls a different trio out of six, with reality torn open along
 * the joins.
 *
 * ⚠️ THE SERVER ROLLS IT, NOT THIS. `paint.variantSeed` arrives already decided,
 * derived from the room code and the player id, because seven people are
 * looking at the same castle and a seed rolled locally would give each of them
 * a different one. Without a seed — in the shop, or on a skin that does not
 * vary — it falls back to a fixed trio rather than picking one at random, so a
 * preview is stable while you look at it.
 *
 * ⚠️ IT MUST NOT BE CHRONO TOWER WITH AN EXTRA STRIPE. That skin is a clock
 * tower: a dial and enormous gears, with a two-age split as texture underneath.
 * This one has no gears and no dial at all. The tears are the subject, the eras
 * exist to give them something to tear between, and the roll is what makes it a
 * different castle every match rather than a picture of three centuries.
 *
 * ⚠️ THE WALL DOES NOT LINE UP ACROSS A RIFT. Courses, battlement heights and
 * detailing all step as they cross. Matched detail either side of a glowing
 * line is a crack painted on one wall; the misalignment is what makes it two
 * walls that never met.
 */
function TimeRiftFortress({ eliminated, uid, variantSeed }: DecorProps) {
  /* Three distinct eras, drawn from the seed. A fixed trio when there is no
     seed, so the shop preview does not flicker between renders. */
  const picked = (() => {
    if (variantSeed === undefined) return [0, 1, 5]
    const pool = ERAS.map((_, i) => i)
    const out: number[] = []
    let h = variantSeed >>> 0
    for (let n = 0; n < 3; n++) {
      h = (Math.imul(h, 1664525) + 1013904223) >>> 0
      out.push(pool.splice(h % pool.length, 1)[0])
    }
    return out
  })()

  /* Boundaries deliberately off-thirds: an evenly divided castle reads as a
     flag. Wall spans −52…52, keep −20…20. */
  const CUTS = [-19, 16]
  const BANDS = [
    { x0: -52, x1: CUTS[0] },
    { x0: CUTS[0], x1: CUTS[1] },
    { x0: CUTS[1], x1: 52 },
  ]

  const rift = (d: string, key: number) => (
    <g key={key}>
      <path d={d} fill="none" stroke={RIFT} strokeWidth={9} opacity={0.12} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={RIFT} strokeWidth={4.5} opacity={0.3} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="#eaffff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )

  return (
    <g className="skin skin--timerift" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      {BANDS.map((b, i) => {
        const era = ERAS[picked[i]]
        const keepL = Math.max(b.x0, -20)
        const keepR = Math.min(b.x1, 20)
        return (
          <g key={i}>
            <clipPath id={`skin-rift-${i}-${uid}`}>
              <path
                d={`M ${b.x0} -24 L ${b.x1} -24 L ${b.x1} 30 L ${b.x0} 30 z
                    ${keepR > keepL ? `M ${keepL} -58 L ${keepR} -58 L ${keepR} -12 L ${keepL} -12 z` : ''}`}
              />
            </clipPath>
            <g clipPath={`url(#skin-rift-${i}-${uid})`}>
              <rect x={b.x0} y={-58} width={b.x1 - b.x0} height={88} fill={era.base} opacity={0.94} />
              {era.render(b)}
            </g>
          </g>
        )
      })}

      {/* The tears. */}
      {rift(`M ${CUTS[0]} -32 L ${CUTS[0] + 3} -20 L ${CUTS[0] - 3} -8 L ${CUTS[0] + 2} 4 L ${CUTS[0] - 4} 16 L ${CUTS[0] + 1} 30`, 0)}
      {rift(`M ${CUTS[1]} -32 L ${CUTS[1] + 4} -19 L ${CUTS[1] - 2} -6 L ${CUTS[1] + 3} 6 L ${CUTS[1] - 3} 18 L ${CUTS[1] + 1} 30`, 1)}
      {rift(`M ${CUTS[0]} -58 L ${CUTS[0] + 3} -46 L ${CUTS[0] - 2} -34 L ${CUTS[0]} -30`, 2)}

      {/* Battlements stepping across each tear — three versions of one wall
          would not agree on how high the parapet sits. */}
      {[
        { x: -46, y: -35, w: 12, h: 4, e: picked[0] },
        { x: -30, y: -36, w: 12, h: 5, e: picked[0] },
        { x: 18, y: -29, w: 12, h: 4, e: picked[2] },
        { x: 40, y: -30, w: 12, h: 5, e: picked[2] },
      ].map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          fill={ERAS[b.e].base}
          stroke={OUTLINE}
          strokeWidth={1.1}
        />
      ))}

      {/* Motes of the wrong century, drifting out of the tears. */}
      {[
        { x: -24, y: -14, r: 1.5 },
        { x: -14, y: 12, r: 1.1 },
        { x: 22, y: -12, r: 1.4 },
        { x: 10, y: 20, r: 1 },
        { x: -20, y: -44, r: 1.2 },
      ].map((m, i) => (
        <g key={i}>
          <circle cx={m.x} cy={m.y} r={m.r * 3} fill={RIFT} opacity={0.14} />
          <circle cx={m.x} cy={m.y} r={m.r} fill="#eaffff" opacity={0.9} />
        </g>
      ))}
    </g>
  )
}

/**
 * Legendary — Eternal Citadel.
 *
 * The fortress suspended inside a working golden movement: a dial ring around
 * it, hands sweeping past on their own time, and eras drifting through open
 * portals.
 *
 * ⚠️ THIS IS THE PATTERN FOR EVERY LEGENDARY. It breaks the sprite's bounds, it
 * moves, and it has ONE signature form: the hands.
 *
 * ⚠️ THE HANDS TURN ABOUT THE CASTLE AND PASS BEHIND IT. Anything rotating
 * about the castle's own centre will cross it, which is the one thing a skin may
 * never do — it is what forced Air's Storm Titan to abandon a rotating hurricane
 * outright. Clipping to "everywhere except the castle" solves it properly: the
 * hands sweep round, vanish behind the fortress and come out the far side,
 * which is exactly what something suspended INSIDE a mechanism should look like.
 * Electricity's containment rings established the technique; this is the first
 * skin where the thing doing the passing actually rotates.
 */
function EternalCitadel({ eliminated, uid }: DecorProps) {
  const GOLD = '#f0c94a'
  const GOLD_DARK = '#8a6a1c'
  const PORTAL = '#7fe8ff'

  /** A clock hand: a tapering shaft with a counterweight behind the pivot. */
  const hand = (len: number, w: number, cls: string, dur: number, key: number) => (
    <g key={key} className={cls} style={{ animationDuration: `${dur}s` }}>
      <path
        d={`M 0 0 L ${w} ${-len * 0.22} L ${w * 0.45} ${-len} L 0 ${-len * 1.06}
            L ${-w * 0.45} ${-len} L ${-w} ${-len * 0.22} z`}
        fill={GOLD}
        stroke={OUTLINE}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <path
        d={`M 0 0 L ${w * 0.7} ${len * 0.16} L 0 ${len * 0.3} L ${-w * 0.7} ${len * 0.16} z`}
        fill={GOLD_DARK}
        stroke={OUTLINE}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <path d={`M 0 ${-len * 0.1} L 0 ${-len * 0.92}`} stroke={GOLD_DARK} strokeWidth={1.3} opacity={0.6} />
    </g>
  )

  return (
    <g className="skin skin--eternal" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      <clipPath id={`skin-eternal-outside-${uid}`} clipRule="evenodd">
        <path
          d="M -92 -128 L 92 -128 L 92 44 L -92 44 z
             M -53 -25 L 53 -25 L 53 31 L -53 31 z
             M -21 -59 L 21 -59 L 21 -11 L -21 -11 z"
          clipRule="evenodd"
        />
      </clipPath>

      <g clipPath={`url(#skin-eternal-outside-${uid})`}>
        {/* The movement: a toothed rim and a dial ring, centred on the castle. */}
        <g transform="translate(0 -6)">
          {Array.from({ length: 40 }, (_, i) => (
            <rect
              key={i}
              x={-3}
              y={-96}
              width={6}
              height={9}
              rx={1.4}
              fill={GOLD_DARK}
              stroke={OUTLINE}
              strokeWidth={1}
              transform={`rotate(${i * 9})`}
            />
          ))}
          <circle r={88} fill="none" stroke={GOLD_DARK} strokeWidth={7} />
          <circle r={88} fill="none" stroke={GOLD} strokeWidth={2.4} opacity={0.75} />
          <circle r={72} fill="none" stroke={GOLD_DARK} strokeWidth={3.4} opacity={0.85} />
          {/* Hour marks on the inner ring. */}
          {Array.from({ length: 12 }, (_, i) => (
            <rect
              key={i}
              x={-1.8}
              y={-72}
              width={3.6}
              height={i % 3 === 0 ? 11 : 6}
              fill={GOLD}
              opacity={i % 3 === 0 ? 0.95 : 0.6}
              transform={`rotate(${i * 30})`}
            />
          ))}
        </g>

        {/* Portals, with a fragment of the wrong century inside each. */}
        {[
          { x: -74, y: -52, rx: 15, ry: 20, rot: -18, era: 'M -6 8 L -6 -6 L 6 -6 L 6 8 z M -6 -6 L 0 -12 L 6 -6', d: 0 },
          { x: 76, y: -34, rx: 13, ry: 18, rot: 14, era: 'M -7 8 L -7 -4 L -2 -4 L -2 -9 L 3 -9 L 3 -4 L 7 -4 L 7 8 z', d: 1.6 },
          { x: -66, y: 24, rx: 12, ry: 16, rot: 8, era: 'M -6 8 L -6 -7 L 6 -7 L 6 8 z M -3 -4 L 3 -4 M -3 1 L 3 1', d: 3 },
        ].map((p, i) => (
          <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
            <ellipse rx={p.rx * 1.5} ry={p.ry * 1.5} fill={PORTAL} opacity={0.08} className="skin__portal" style={{ animationDelay: `${p.d}s` }} />
            <ellipse rx={p.rx} ry={p.ry} fill="#0d1b24" opacity={0.85} />
            <ellipse rx={p.rx} ry={p.ry} fill="none" stroke={PORTAL} strokeWidth={2.2} className="skin__portal" style={{ animationDelay: `${p.d}s` }} />
            <ellipse rx={p.rx * 0.72} ry={p.ry * 0.72} fill="none" stroke={PORTAL} strokeWidth={1} opacity={0.45} />
            <path d={p.era} fill={GOLD} opacity={0.8} stroke={OUTLINE} strokeWidth={0.9} strokeLinejoin="round" />
          </g>
        ))}
      </g>

      {/* ---- the hands, IN FRONT of the castle --------------------------
          ⚠️ THEY WERE INSIDE THE "EVERYWHERE EXCEPT THE CASTLE" CLIP, and every
          time one swept over the keep the clip ate it: a hand would travel to
          the castle, vanish, and reappear on the other side. That is the
          correct treatment for the RING — a ring passes behind a thing standing
          in the middle of it — but a clock's hands sweep across its FACE, and
          here the castle is the face. They are the one moving part that has to
          cross the sprite.
          
          ⚠️ AND THAT IS ALLOWED BECAUSE THEY ARE NARROW. Nine units on a
          hundred-unit wall is a bar, not a mask; the silhouette reads straight
          through it, the same licence the Weaver's web and the Colossus's
          fingers get. A hand as wide as a tower would not be allowed. */}
      <g transform="translate(0 -6)">
        {hand(64, 9, 'skin__hand', 48, 0)}
        {hand(84, 6, 'skin__hand skin__hand--minute', 19, 1)}
      </g>

      {/* The pivot they turn on, over the keep. */}
      <circle cx={0} cy={-6} r={7} fill={GOLD} stroke={OUTLINE} strokeWidth={2} />
      <circle cx={0} cy={-6} r={2.6} fill={GOLD_DARK} />

      {/* Fragments adrift between the portals. */}
      {[
        { x: -46, y: -46, r: 2, d: 0 },
        { x: 52, y: -56, r: 1.6, d: 1.4 },
        { x: 62, y: 12, r: 1.8, d: 2.7 },
        { x: -58, y: 4, r: 1.4, d: 0.8 },
      ].map((m, i) => (
        <circle
          key={i}
          cx={m.x}
          cy={m.y}
          r={m.r}
          fill={PORTAL}
          opacity={0.75}
          className="skin__mote"
          style={{ animationDelay: `${m.d}s` }}
        />
      ))}
    </g>
  )
}

export const TimeDecor = {
  'time.clockwork': ClockworkCastle,
  'time.chrono': ChronoTower,
  'time.rift': TimeRiftFortress,
  'time.eternal': EternalCitadel,
}
