import type { DecorProps } from './decor'
import './skins.css'

/**
 * Joker's skin decorations.
 *
 * Drawn INSIDE the castle's local space, over the sprite — the keep occupies
 * roughly x −20…20, y −58…−12, the curtain wall x −52…52, y −24…30, and the
 * gate x −11…11, y 10…30. Anything here is layered on top of that.
 *
 * ⚠️ THE SILHOUETTE AND THE HUE ARE NOT NEGOTIABLE. Players pick out who is
 * attacking them from a small castle on a phone, often through fog. A skin may
 * add detail and texture; it may not obscure the shape, and it stays in
 * Joker's circus red and white.
 *
 * ⚠️ "MISMATCHED" IS A COMPOSITION, NOT AN ABSENCE OF ONE. This is the one
 * kingdom whose briefs ask for chaos, and chaos drawn carelessly is just mess —
 * the difference is that every wrong-looking thing here is wrong ON PURPOSE and
 * in a way the eye can follow: panels that each hold ONE pattern, tilts that
 * are all a few degrees rather than random, a palette of five fixed colours
 * used in rotation. Nature's first mushroom cap and Fire's candy palette are
 * what happens without that discipline.
 *
 * ⚠️ ONE STROKED OUTLINE PER OBJECT. Everything inside it is an unstroked fill.
 */

const RED = '#e02434'
const RED_DEEP = '#5e0a13'
const CREAM = '#f7f7f2'
const GOLD = '#f5c518'
const TEAL = '#35b6a3'
const PURPLE = '#8a5fd0'
const BLUE = '#3f74c4'
const OUTLINE = '#3d0810'

/** The five accent colours, used in rotation so nothing is ever random. */
const CARNIVAL = [GOLD, TEAL, PURPLE, BLUE, CREAM]

/**
 * Uncommon — Polka Dot Castle.
 *
 * The castle as a fairground prop: each stretch of wall painted with its own
 * pattern — dots on one, stripes on the next, harlequin diamonds on the keep —
 * and a coloured pompom on every battlement.
 *
 * The lightest possible touch, like Water's Rippled Castle and Space's Star
 * Pattern: everything is clipped to the walls and the keep, so the silhouette
 * is exactly the default one.
 */
function PolkaDotCastle({ eliminated, uid }: DecorProps) {
  return (
    <g className="skin skin--polkadot" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-pd-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-pd-keep-${uid}`}>
        <rect x={-21} y={-59} width={42} height={48} rx={3} />
      </clipPath>
      {/* One panel per pattern. ⚠️ MIXING THEM ACROSS THE WHOLE WALL IS NOISE —
          the joke only lands if each block is internally tidy and the blocks
          disagree with each other. */}
      <clipPath id={`skin-pd-left-${uid}`}>
        <rect x={-52} y={-24} width={36} height={54} />
      </clipPath>
      <clipPath id={`skin-pd-mid-${uid}`}>
        <rect x={-16} y={-24} width={32} height={54} />
      </clipPath>
      <clipPath id={`skin-pd-right-${uid}`}>
        <rect x={16} y={-24} width={36} height={54} />
      </clipPath>

      <g clipPath={`url(#skin-pd-wall-${uid})`}>
        {/* Left panel: polka dots, offset row to row. */}
        <g clipPath={`url(#skin-pd-left-${uid})`}>
          <rect x={-52} y={-24} width={36} height={54} fill={RED_DEEP} opacity={0.35} />
          {[-18, -7, 4, 15, 26].map((y, row) =>
            Array.from({ length: 4 }, (_, i) => (
              <circle
                key={`${row}-${i}`}
                cx={-49 + i * 11 + (row % 2 ? 5.5 : 0)}
                cy={y}
                r={3.4}
                fill={CARNIVAL[(row + i) % CARNIVAL.length]}
                stroke={OUTLINE}
                strokeWidth={0.7}
              />
            )),
          )}
        </g>

        {/* Middle panel: vertical big-top stripes. */}
        <g clipPath={`url(#skin-pd-mid-${uid})`}>
          {Array.from({ length: 7 }, (_, i) => (
            <rect
              key={i}
              x={-16 + i * 4.6}
              y={-24}
              width={4.6}
              height={54}
              fill={i % 2 ? CREAM : RED}
              opacity={0.92}
            />
          ))}
        </g>

        {/* Right panel: zig-zag bands, which is a third idea rather than a
            second colourway of the first. */}
        <g clipPath={`url(#skin-pd-right-${uid})`}>
          <rect x={16} y={-24} width={36} height={54} fill={CREAM} opacity={0.9} />
          {[-20, -8, 4, 16, 28].map((y, i) => (
            <path
              key={i}
              d={`M 16 ${y} L 25 ${y + 6} L 34 ${y} L 43 ${y + 6} L 52 ${y}`}
              fill="none"
              stroke={CARNIVAL[(i + 2) % CARNIVAL.length]}
              strokeWidth={2.6}
              strokeLinejoin="round"
            />
          ))}
        </g>

        {/* Panel joins, so the mismatch reads as three painted boards. */}
        {[-16, 16].map((x, i) => (
          <path key={i} d={`M ${x} -24 L ${x} 30`} stroke={OUTLINE} strokeWidth={2} fill="none" />
        ))}
        <path d="M -52 -21 L 52 -21" stroke={GOLD} strokeWidth={1.8} fill="none" />
        <path d="M -52 27 L 52 27" stroke={GOLD} strokeWidth={1.8} fill="none" />
      </g>

      {/* Keep: harlequin diamonds. */}
      <g clipPath={`url(#skin-pd-keep-${uid})`}>
        {Array.from({ length: 5 }, (_, row) =>
          Array.from({ length: 4 }, (_, i) => {
            const cx = -21 + i * 14 + (row % 2 ? 7 : 0)
            const cy = -56 + row * 11
            return (
              <path
                key={`${row}-${i}`}
                d={`M ${cx} ${cy - 6} L ${cx + 7} ${cy} L ${cx} ${cy + 6} L ${cx - 7} ${cy} z`}
                fill={(row + i) % 2 ? RED : CREAM}
                stroke={OUTLINE}
                strokeWidth={0.7}
              />
            )
          }),
        )}
      </g>

      {/* Pompoms on the battlements. Merlon centres come from the sprite: the
          wall's sit at −46, −24, 24 and 46 and the keep's at −15, 0 and 15,
          and anything placed by eye lands half a merlon out. */}
      {[-46, -24, 24, 46].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={-29} r={4.6} fill={CARNIVAL[i % CARNIVAL.length]} stroke={OUTLINE} strokeWidth={0.9} />
          <circle cx={x - 1.4} cy={-30.4} r={1.4} fill={CREAM} opacity={0.75} />
        </g>
      ))}
      {[-15, 0, 15].map((x, i) => (
        <circle key={i} cx={x} cy={-62} r={3.4} fill={CARNIVAL[(i + 2) % CARNIVAL.length]} stroke={OUTLINE} strokeWidth={0.8} />
      ))}

      {/* The gate, striped like an awning. */}
      <path d="M -11 30 L -11 15 C -11 4 11 4 11 15 L 11 30 z" fill={CREAM} opacity={0.25} />
      {[-9, -3, 3, 9].map((x, i) => (
        <path key={i} d={`M ${x} 30 L ${x} ${8 + Math.abs(x) * 0.4}`} stroke={i % 2 ? RED : GOLD} strokeWidth={3} fill="none" />
      ))}
      <path
        d="M -11 30 L -11 15 C -11 4 11 4 11 15 L 11 30"
        fill="none"
        stroke={GOLD}
        strokeWidth={2}
      />
    </g>
  )
}

/**
 * Rare — Carnival Fortress.
 *
 * The fairground itself: a big top over the keep, striped canopies on the wall
 * towers, a wheel turning behind one shoulder, bunting between the poles and a
 * bulb-lit sign over the door.
 *
 * ⚠️ THE BUNTING IS NOT A ROW OF EVEN ARCS. Ice's first crown was exactly that
 * and read as party decoration in the worst way — a wallpaper border. Real
 * bunting sags differently between each pair of posts, and the flags are not
 * all the same size.
 */
function CarnivalFortress({ eliminated, uid }: DecorProps) {
  /** A striped canopy: scalloped hem, so it is a tent rather than a cone. */
  const canopy = (x: number, base: number, w: number, h: number, key: number) => (
    <g key={key}>
      <path
        d={`M ${x - w} ${base} L ${x} ${base - h} L ${x + w} ${base} z`}
        fill={CREAM}
        stroke={OUTLINE}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      {[-0.62, -0.2, 0.22, 0.64].map((f, i) => (
        <path
          key={i}
          d={`M ${x + w * f} ${base} L ${x + w * f * 0.12} ${base - h * 0.9} L ${x + w * (f + 0.2) * 0.12} ${base - h * 0.9} L ${x + w * (f + 0.2)} ${base} z`}
          fill={RED}
          opacity={0.95}
        />
      ))}
      {/* Scalloped hem. */}
      <path
        d={Array.from({ length: 6 }, (_, i) => {
          const x0 = x - w + (i * 2 * w) / 6
          const x1 = x - w + ((i + 1) * 2 * w) / 6
          return `${i === 0 ? `M ${x0} ${base}` : ''} Q ${(x0 + x1) / 2} ${base + 3.4} ${x1} ${base}`
        }).join(' ')}
        fill={GOLD}
        stroke={OUTLINE}
        strokeWidth={0.9}
      />
      <circle cx={x} cy={base - h - 2.4} r={1.8} fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
      <path d={`M ${x} ${base - h - 4} L ${x} ${base - h - 11}`} stroke={OUTLINE} strokeWidth={1.1} fill="none" />
      <path
        d={`M ${x} ${base - h - 11} L ${x + 11} ${base - h - 8.6} L ${x} ${base - h - 6.2} z`}
        fill={GOLD}
        stroke={OUTLINE}
        strokeWidth={0.9}
        strokeLinejoin="round"
      />
    </g>
  )

  /** A string of bunting between two points, sagging by `sag`. */
  const bunting = (x0: number, y0: number, x1: number, y1: number, sag: number, n: number, key: number) => {
    const mx = (x0 + x1) / 2
    const my = (y0 + y1) / 2 + sag
    const at = (t: number) => {
      const u = 1 - t
      return [u * u * x0 + 2 * u * t * mx + t * t * x1, u * u * y0 + 2 * u * t * my + t * t * y1]
    }
    return (
      <g key={key}>
        <path d={`M ${x0} ${y0} Q ${mx} ${my} ${x1} ${y1}`} fill="none" stroke={OUTLINE} strokeWidth={1.1} />
        {Array.from({ length: n }, (_, i) => {
          const [px, py] = at((i + 0.5) / n)
          /* Sizes alternate; a row of identical triangles is a wallpaper
             border. */
          const h = i % 3 === 0 ? 8 : i % 3 === 1 ? 6.4 : 7.2
          return (
            <path
              key={i}
              d={`M ${px! - 3.4} ${py!} L ${px! + 3.4} ${py!} L ${px!} ${py! + h} z`}
              fill={CARNIVAL[(i + key) % CARNIVAL.length]}
              stroke={OUTLINE}
              strokeWidth={0.7}
              strokeLinejoin="round"
            />
          )
        })}
      </g>
    )
  }

  /** A bulb-lit sign board. */
  const sign = () => (
    <g>
      <path
        d="M -19 2 L 19 2 L 17 -12 L -17 -12 z"
        fill={RED}
        stroke={OUTLINE}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <path d="M -14 -1 L 14 -1 L 13 -8.5 L -13 -8.5 z" fill={CREAM} opacity={0.9} />
      {[-9, -3, 3, 9].map((x, i) => (
        <path
          key={i}
          d={`M ${x} -2 L ${x + 3} -7.5`}
          stroke={i % 2 ? RED : GOLD}
          strokeWidth={2.2}
          fill="none"
        />
      ))}
      {Array.from({ length: 10 }, (_, i) => {
        const t = i / 9
        const x = -18 + t * 36
        const y = 2 - Math.abs(t - 0.5) * 2
        return (
          <circle
            key={`b${i}`}
            className="skin__bulb"
            style={{ animationDelay: `${(i % 4) * 0.32}s` }}
            cx={x}
            cy={y}
            r={1.7}
            fill={GOLD}
            stroke={OUTLINE}
            strokeWidth={0.6}
          />
        )
      })}
    </g>
  )

  return (
    <g className="skin skin--carnival" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-cf-outside-${uid}`} clipRule="evenodd">
        <path
          d="M -92 -128 L 92 -128 L 92 44 L -92 44 z
             M -53 -25 L 53 -25 L 53 31 L -53 31 z
             M -21 -59 L 21 -59 L 21 -25 L -21 -25 z"
          clipRule="evenodd"
        />
      </clipPath>
      <clipPath id={`skin-cf-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>

      {/* ---- the wheel, turning behind one shoulder ---------------------
          ⚠️ BEHIND, AND OFF TO ONE SIDE. Centred it would be a halo over the
          keep; behind the right shoulder it reads as a fairground standing
          past the walls, which is what the brief asks for. */}
      <g clipPath={`url(#skin-cf-outside-${uid})`}>
        <g transform="translate(58 -20)">
          <circle r={34} fill="none" stroke={OUTLINE} strokeWidth={2.4} />
          <circle r={34} fill="none" stroke={CREAM} strokeWidth={1.2} />
          <g className="skin__wheel">
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i / 12) * Math.PI * 2
              const x = Math.cos(a) * 34
              const y = Math.sin(a) * 34
              return (
                <g key={i}>
                  <path d={`M 0 0 L ${x.toFixed(1)} ${y.toFixed(1)}`} stroke={CREAM} strokeWidth={1} opacity={0.7} />
                  <circle
                    cx={x * 0.94}
                    cy={y * 0.94}
                    r={4.2}
                    fill={CARNIVAL[i % CARNIVAL.length]}
                    stroke={OUTLINE}
                    strokeWidth={0.9}
                  />
                </g>
              )
            })}
          </g>
          <circle r={5} fill={GOLD} stroke={OUTLINE} strokeWidth={1.1} />
          <path d="M -14 34 L 0 4 L 14 34" fill="none" stroke={OUTLINE} strokeWidth={2.4} />
        </g>

        {/* A helter-skelter on the other side, so the fairground has two
            attractions rather than one landmark.
            ⚠️ IT NEEDS THE SLIDE. Drawn as a plain striped cone the first time,
            and half of it sat behind the castle where the clip cut it: what
            showed was a red-and-white wedge that read as a folded curtain. The
            spiral wrapping the tower is the entire tell, so the tower moved
            out to where there is room to see it. */}
        <g transform="translate(-72 2)">
          <path
            d="M -15 28 L 0 -46 L 15 28 z"
            fill={CREAM}
            stroke={OUTLINE}
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
          {/* The slide, spiralling down: each turn is wider than the one above
              it, which is what makes it wrap rather than stack. */}
          {[
            'M -4 -34 C 1 -35.5 4.4 -32 4.6 -28',
            'M 4.6 -28 C 1.6 -24 -3.6 -24.5 -6 -27',
            'M -6 -27 C -8 -21 -3.5 -16 3.4 -16.5',
            'M 3.4 -16.5 C 8.6 -15 9.6 -9 6 -6',
            'M 6 -6 C 0.6 -2.5 -7.4 -3 -10 -6.5',
            'M -10 -6.5 C -12.6 0 -7 6.5 1.4 7',
            'M 1.4 7 C 9 8 12.6 14 10.6 20',
          ].map((d, i) => (
            <path key={i} d={d} stroke={RED} strokeWidth={2.4} fill="none" strokeLinecap="round" />
          ))}
          {[-24, -8, 10].map((y, i) => (
            <path key={`r${i}`} d={`M ${-15 + (y + 46) * 0.04} ${y} L ${15 - (y + 46) * 0.04} ${y}`} stroke={OUTLINE} strokeWidth={0.8} fill="none" opacity={0.3} />
          ))}
          {/* Conical roof and flag. */}
          <path
            d="M -8 -44 L 0 -58 L 8 -44 z"
            fill={RED}
            stroke={OUTLINE}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
          <path d="M 0 -58 L 0 -66" stroke={OUTLINE} strokeWidth={1.1} fill="none" />
          <path d="M 0 -66 L 10 -63.4 L 0 -60.8 z" fill={GOLD} stroke={OUTLINE} strokeWidth={0.9} strokeLinejoin="round" />
          <path d="M -16 28 L 16 28 L 13 32 L -13 32 z" fill={GOLD} stroke={OUTLINE} strokeWidth={1} strokeLinejoin="round" />
        </g>
      </g>

      {/* ---- canopies on the towers -------------------------------------- */}
      {canopy(0, -56, 24, 30, 0)}
      {canopy(-44, -22, 13, 16, 1)}
      {canopy(44, -22, 13, 16, 2)}

      {/* ---- the wall, painted as a midway ------------------------------- */}
      <g clipPath={`url(#skin-cf-wall-${uid})`}>
        <rect x={-52} y={-24} width={104} height={54} fill={CREAM} opacity={0.92} />
        {Array.from({ length: 13 }, (_, i) => (
          <rect key={i} x={-52 + i * 8} y={-24} width={4} height={54} fill={RED} opacity={0.9} />
        ))}
        <rect x={-52} y={-24} width={104} height={6} fill={GOLD} />
        <rect x={-52} y={24} width={104} height={6} fill={GOLD} />
        <path d="M -52 -18 L 52 -18" stroke={OUTLINE} strokeWidth={1} fill="none" opacity={0.6} />
        <path d="M -52 24 L 52 24" stroke={OUTLINE} strokeWidth={1} fill="none" opacity={0.6} />
      </g>

      {/* ---- bunting between the poles ----------------------------------- */}
      {bunting(-52, -26, -18, -20, 9, 5, 0)}
      {bunting(-18, -20, 18, -24, 6, 4, 1)}
      {bunting(18, -24, 52, -18, 11, 6, 2)}

      {/* ---- the sign over the door -------------------------------------- */}
      <g transform="translate(0 4)">{sign()}</g>

      {/* ---- string lights along the parapet ----------------------------- */}
      {[-46, -24, 24, 46].map((x, i) => (
        <g key={i}>
          <path d={`M ${x} -25 L ${x} -32`} stroke={OUTLINE} strokeWidth={1} fill="none" />
          <circle
            className="skin__bulb"
            style={{ animationDelay: `${(i % 3) * 0.4}s` }}
            cx={x}
            cy={-34}
            r={2.8}
            fill={CARNIVAL[i % CARNIVAL.length]}
            stroke={OUTLINE}
            strokeWidth={0.9}
          />
        </g>
      ))}

      {/* ---- the gate, as a ticket booth --------------------------------- */}
      <path d="M -11 30 L -11 15 C -11 4 11 4 11 15 L 11 30 z" fill={RED_DEEP} opacity={0.85} />
      <path
        d="M -11 30 L -11 15 C -11 4 11 4 11 15 L 11 30"
        fill="none"
        stroke={GOLD}
        strokeWidth={2.2}
      />
    </g>
  )
}

/**
 * Rare — Mad Jester Castle.
 *
 * A cap-and-bells pulled down over the keep, harlequin panels that do not line
 * up, playing cards nailed on at angles, and bells hanging off the parapet.
 *
 * ⚠️ NOTHING IS PERFECTLY SYMMETRIC, AND EVERY TILT IS SMALL. The brief asks
 * for crooked, and crooked is a narrow target: under two degrees reads as a
 * mistake in the drawing, over about eight reads as broken rather than
 * mischievous. Everything here leans between three and seven, and no two
 * things lean the same way.
 *
 * ⚠️ AND IT MUST NOT BE CARNIVAL FORTRESS. Same kingdom, same tier: that one is
 * a place — tents, a wheel, a midway. This one is a character: the castle is
 * WEARING something.
 */
function MadJesterCastle({ eliminated, uid }: DecorProps) {
  /** A bell, with a clapper and a highlight. */
  const bell = (x: number, y: number, s: number, key: number, tilt = 0) => (
    <g key={key} transform={`translate(${x} ${y}) rotate(${tilt})`}>
      <path
        d={`M ${-3.4 * s} ${2.6 * s} C ${-3.4 * s} ${-1.4 * s} ${-2.2 * s} ${-3.4 * s} 0 ${-3.4 * s}
            C ${2.2 * s} ${-3.4 * s} ${3.4 * s} ${-1.4 * s} ${3.4 * s} ${2.6 * s} z`}
        fill={GOLD}
        stroke={OUTLINE}
        strokeWidth={0.9}
        strokeLinejoin="round"
      />
      <path
        d={`M ${-2.2 * s} ${-1.8 * s} C ${-2 * s} ${-2.8 * s} ${-1 * s} ${-3 * s} ${-0.4 * s} ${-2.9 * s}`}
        stroke="#fff6cf"
        strokeWidth={0.9 * s}
        fill="none"
        opacity={0.85}
      />
      <circle cx={0} cy={3.4 * s} r={1.1 * s} fill={GOLD} stroke={OUTLINE} strokeWidth={0.7} />
    </g>
  )

  /** A playing card, pinned on at an angle. */
  const card = (x: number, y: number, deg: number, suit: 'spade' | 'heart' | 'club' | 'diamond', key: number) => {
    const red = suit === 'heart' || suit === 'diamond'
    const pip =
      suit === 'spade'
        ? 'M 0 -4.6 C 3.4 -1.4 4.2 0.6 2.4 2 C 1.4 2.8 0.4 2.2 0 1.4 C -0.4 2.2 -1.4 2.8 -2.4 2 C -4.2 0.6 -3.4 -1.4 0 -4.6 z M -0.9 1.8 L -1.8 4.4 L 1.8 4.4 L 0.9 1.8 z'
        : suit === 'heart'
          ? 'M 0 4.2 C -4.6 0.4 -4.2 -3.4 -1.8 -4 C -0.6 -4.3 0 -3.2 0 -2.4 C 0 -3.2 0.6 -4.3 1.8 -4 C 4.2 -3.4 4.6 0.4 0 4.2 z'
          : suit === 'diamond'
            ? 'M 0 -4.8 L 3.4 0 L 0 4.8 L -3.4 0 z'
            : 'M 0 -4.4 A 2.1 2.1 0 1 1 -1.4 -0.8 A 2.1 2.1 0 1 1 -1.9 2.4 A 2.1 2.1 0 1 1 1.9 2.4 A 2.1 2.1 0 1 1 1.4 -0.8 A 2.1 2.1 0 1 1 0 -4.4 z M -0.9 2 L -1.8 4.6 L 1.8 4.6 L 0.9 2 z'
    return (
      <g key={key} transform={`translate(${x} ${y}) rotate(${deg})`}>
        <rect x={-7} y={-10} width={14} height={20} rx={2} fill={CREAM} stroke={OUTLINE} strokeWidth={1.1} />
        <g transform="translate(0 0.4) scale(1.25)">
          <path d={pip} fill={red ? RED : OUTLINE} />
        </g>
        <circle cx={0} cy={-8} r={1} fill={GOLD} stroke={OUTLINE} strokeWidth={0.5} />
      </g>
    )
  }

  return (
    <g className="skin skin--madjester" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-mj-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-mj-keep-${uid}`}>
        <rect x={-21} y={-59} width={42} height={48} rx={3} />
      </clipPath>

      {/* ---- harlequin panels that do not line up ------------------------ */}
      <g clipPath={`url(#skin-mj-wall-${uid})`}>
        <rect x={-52} y={-24} width={104} height={54} fill={CREAM} opacity={0.9} />
        {[
          { x: -52, w: 30, deg: -4, a: RED, b: PURPLE },
          { x: -22, w: 26, deg: 3, a: TEAL, b: CREAM },
          { x: 4, w: 22, deg: -3, a: GOLD, b: RED },
          { x: 26, w: 26, deg: 5, a: PURPLE, b: CREAM },
        ].map((panel, p) => (
          <g key={p} transform={`rotate(${panel.deg} ${panel.x + panel.w / 2} 3)`}>
            {Array.from({ length: 6 }, (_, row) =>
              Array.from({ length: 3 }, (_, i) => {
                const cx = panel.x + i * (panel.w / 2.4) + (row % 2 ? panel.w / 4.8 : 0)
                const cy = -26 + row * 11
                return (
                  <path
                    key={`${row}-${i}`}
                    d={`M ${cx} ${cy - 6.5} L ${cx + 6.5} ${cy} L ${cx} ${cy + 6.5} L ${cx - 6.5} ${cy} z`}
                    fill={(row + i) % 2 ? panel.a : panel.b}
                    stroke={OUTLINE}
                    strokeWidth={0.7}
                    opacity={0.95}
                  />
                )
              }),
            )}
          </g>
        ))}
        {/* Crooked seams between the panels. */}
        {[
          'M -22 -24 L -20 30',
          'M 4 -24 L 2 30',
          'M 26 -24 L 29 30',
        ].map((d, i) => (
          <path key={i} d={d} stroke={OUTLINE} strokeWidth={2} fill="none" />
        ))}
      </g>

      {/* ---- cards pinned to the wall ------------------------------------ */}
      {card(-36, 6, -13, 'spade', 0)}
      {card(-17, 14, 9, 'heart', 1)}
      {card(18, 6, -7, 'club', 2)}
      {card(38, 10, 14, 'diamond', 3)}

      {/* ---- the cap, pulled down over the keep --------------------------
          ⚠️ THE POINTS HANG. The first cap had two thin crescents sticking out
          sideways under a round band, and the whole thing read as a hamburger —
          or a UFO, depending on the moment. A jester's cap is legible from
          three things: a crown that FITS the head, points that flop DOWN under
          their own weight with a curl at the end, and a bell on each. One point
          may stand up; all of them standing up is a crown, and all of them
          sideways is scenery.

          ⚠️ AND THE THREE ARE DELIBERATELY UNEQUAL. Different lengths, different
          angles, different colours — a symmetric cap-and-bells is a logo. */}

      {/* ⚠️ WIDE WHERE THEY LEAVE THE CROWN. Drawn as even bands the points
          read as ribbons or eyebrows; cloth hangs from a seam, so each one is
          twelve units across where it joins the cap and comes to almost
          nothing at the bell. */}
      {/* ⚠️ THE POINTS STAY ABOVE THE PARAPET. They used to sweep down to y −19,
          which is below the wall top: each one crossed the battlements, cut
          through two merlons and put its bell in the middle of the masonry —
          the arch was the messiest part of the skin for exactly that reason.
          They now come to rest just past the corners at −30, so the cloth
          hangs OUTSIDE the silhouette and the bells swing clear of it. */}
      {/* Left point: shortest, curling forward. */}
      <path
        d="M -19 -56 C -32 -52 -44 -44 -53 -32
           L -45 -26 C -38 -36 -28 -42 -10 -45 z"
        fill={PURPLE}
        stroke={OUTLINE}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      {/* Right point: longest, flopping further out. */}
      <path
        d="M 19 -57 C 34 -53 50 -44 61 -31
           L 52 -25 C 45 -36 34 -42 11 -47 z"
        fill={TEAL}
        stroke={OUTLINE}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      {/* Centre point: the one that stands, leaning off true. */}
      <path
        d="M -7 -57 C -11 -74 0 -86 16 -91
           L 20 -81 C 8 -77 2 -68 6 -57 z"
        fill={GOLD}
        stroke={OUTLINE}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />

      {/* A shadow the cap throws on the keep: without it the hat floats a pixel
          above the tower it is supposed to be pulled down over. */}
      <path d="M -21 -40 L 21 -40 L 21 -35 L -21 -35 z" fill={RED_DEEP} opacity={0.35} />

      {/* The crown, fitted over the keep. */}
      <path
        d="M -21 -42 C -21 -60 21 -62 21 -42 z"
        fill={RED}
        stroke={OUTLINE}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <path d="M 0 -56.5 C 0 -50 0 -46 0 -42" stroke={OUTLINE} strokeWidth={1.1} fill="none" opacity={0.55} />
      <path
        d="M -21 -42 C -21 -60 0 -61 0 -42 z"
        fill={PURPLE}
        opacity={0.9}
      />
      {/* Brim, scalloped, sitting a little crooked. */}
      <g transform="rotate(-2 0 -40)">
        <path
          d="M -24 -44 L 24 -44 L 24 -39 L -24 -39 z"
          fill={GOLD}
          stroke={OUTLINE}
          strokeWidth={1.2}
        />
        {[-18, -6, 6, 18].map((x, i) => (
          <path
            key={i}
            d={`M ${x - 6} -39 Q ${x} -33.5 ${x + 6} -39 z`}
            fill={GOLD}
            stroke={OUTLINE}
            strokeWidth={1}
            strokeLinejoin="round"
          />
        ))}
      </g>
      {/* ⚠️ A BELL NEEDS A CUFF. Hung straight off the end of a point it looks
          stuck on; a band where the cloth is gathered is the join, and it is
          the difference between a costume and two shapes touching. */}
      {[
        { x: -49, y: -29, deg: -34 },
        { x: 57, y: -28, deg: 32 },
        { x: 18, y: -87, deg: -10 },
      ].map((c, i) => (
        <g key={i} transform={`translate(${c.x} ${c.y}) rotate(${c.deg})`}>
          <path
            d="M -4.6 -3.4 L 4.6 -3.4 L 3.6 2.2 L -3.6 2.2 z"
            fill={GOLD}
            stroke={OUTLINE}
            strokeWidth={1}
            strokeLinejoin="round"
          />
          <path d="M -3.6 -1 L 3.6 -1" stroke={OUTLINE} strokeWidth={0.8} fill="none" opacity={0.5} />
        </g>
      ))}
      {bell(-51, -22, 1.7, 10, -16)}
      {bell(59, -21, 1.8, 11, 14)}
      {bell(19, -90, 1.5, 12, -10)}

      {/* ---- bells along the parapet ------------------------------------- */}
      {/* ⚠️ NOT UNDER THE POINTS. The corner merlons at ±46 sit directly below
          where the cap's side points come down, and a bell hanging under a bell
          is the kind of pile-up that makes a busy skin look careless rather
          than exuberant. The two inner merlons carry them instead. */}
      {[
        { x: -24, t: 5 },
        { x: 24, t: -4 },
      ].map((b, i) => (
        <g key={i}>
          <path d={`M ${b.x} -25 L ${b.x} -30`} stroke={OUTLINE} strokeWidth={1} fill="none" />
          {bell(b.x, -34, 1.15, i + 20, b.t)}
        </g>
      ))}

      {/* ---- the gate, hung crooked -------------------------------------- */}
      <g transform="rotate(-3 0 20)">
        <path d="M -11 30 L -11 15 C -11 4 11 4 11 15 L 11 30 z" fill={RED_DEEP} opacity={0.8} />
        <path
          d="M -11 30 L -11 15 C -11 4 11 4 11 15 L 11 30"
          fill="none"
          stroke={GOLD}
          strokeWidth={2.2}
        />
        {bell(0, 9, 1.2, 30, 6)}
      </g>
    </g>
  )
}

/**
 * Legendary — Chaos Casino.
 *
 * A casino that has no business staying up: a roulette wheel turning behind
 * the keep, house cards fanned out past the walls, dice adrift, a marquee of
 * chasing bulbs, and the whole thing floating on its own neon.
 *
 * ⚠️ THE WHEEL TURNS BEHIND THE FORTRESS, NEVER ACROSS IT. It is inside the
 * "everywhere except the castle" clip, so however far it spins it cannot cover
 * the silhouette — the rule Air's gale arcs set and Space's orbits kept.
 */
function ChaosCasino({ eliminated, uid }: DecorProps) {
  /** A die, with the pips of one face. */
  const die = (x: number, y: number, s: number, deg: number, pips: number, key: number) => {
    const P: Record<number, [number, number][]> = {
      1: [[0, 0]],
      2: [
        [-1, -1],
        [1, 1],
      ],
      3: [
        [-1, -1],
        [0, 0],
        [1, 1],
      ],
      5: [
        [-1, -1],
        [1, -1],
        [0, 0],
        [-1, 1],
        [1, 1],
      ],
    }
    return (
      <g key={key} transform={`translate(${x} ${y}) rotate(${deg})`}>
        <rect x={-s} y={-s} width={s * 2} height={s * 2} rx={s * 0.28} fill={CREAM} stroke={OUTLINE} strokeWidth={1.1} />
        <rect x={-s} y={-s} width={s * 2} height={s * 0.5} rx={s * 0.2} fill="#ffffff" opacity={0.5} />
        {(P[pips] ?? P[1]!).map(([px, py], i) => (
          <circle key={i} cx={px! * s * 0.45} cy={py! * s * 0.45} r={s * 0.17} fill={RED_DEEP} />
        ))}
      </g>
    )
  }

  return (
    <g className="skin skin--chaoscasino" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-ch-outside-${uid}`} clipRule="evenodd">
        <path
          d="M -92 -128 L 92 -128 L 92 44 L -92 44 z
             M -53 -25 L 53 -25 L 53 31 L -53 31 z
             M -21 -59 L 21 -59 L 21 -25 L -21 -25 z"
          clipRule="evenodd"
        />
      </clipPath>
      <clipPath id={`skin-ch-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <defs>
        <radialGradient id={`skin-ch-neon-${uid}`} gradientUnits="userSpaceOnUse" cx={0} cy={-16} r={100}>
          <stop offset="0%" stopColor={GOLD} stopOpacity="0.3" />
          <stop offset="45%" stopColor={RED} stopOpacity="0.16" />
          <stop offset="100%" stopColor={PURPLE} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`skin-ch-pad-${uid}`}>
          <stop offset="0%" stopColor={GOLD} stopOpacity="0.8" />
          <stop offset="45%" stopColor={RED} stopOpacity="0.3" />
          <stop offset="100%" stopColor={RED} stopOpacity="0" />
        </radialGradient>
      </defs>

      <g clipPath={`url(#skin-ch-outside-${uid})`}>
        <circle cx={0} cy={-16} r={100} fill={`url(#skin-ch-neon-${uid})`} />

        {/* ---- the cards the house is built on -------------------------- */}
        {/* ⚠️ A FAN, NOT A SCATTER. Four cards at four sizes and four unrelated
            angles read as debris blown past the castle. Dealt as a hand — one
            size, angles stepping evenly, tops following an arc — the same four
            cards read as a deliberate arrangement, which is the whole
            difference between chaotic and messy. */}
        {[
          { x: -70, y: -14, deg: -34, w: 25, h: 37 },
          { x: -46, y: -40, deg: -17, w: 25, h: 37 },
          { x: 46, y: -40, deg: 17, w: 25, h: 37 },
          { x: 70, y: -14, deg: 34, w: 25, h: 37 },
        ].map((c, i) => (
          <g key={i} transform={`translate(${c.x} ${c.y}) rotate(${c.deg})`}>
            <rect x={-c.w / 2} y={-c.h / 2} width={c.w} height={c.h} rx={3} fill={CREAM} stroke={OUTLINE} strokeWidth={1.4} />
            <rect
              x={-c.w / 2 + 2.5}
              y={-c.h / 2 + 2.5}
              width={c.w - 5}
              height={c.h - 5}
              rx={2}
              fill="none"
              stroke={i % 2 ? RED : OUTLINE}
              strokeWidth={0.9}
            />
            {i % 2 ? (
              <path d="M 0 7 C -8 0.6 -7.2 -6 -3.2 -7 C -1 -7.5 0 -5.6 0 -4.2 C 0 -5.6 1 -7.5 3.2 -7 C 7.2 -6 8 0.6 0 7 z" fill={RED} />
            ) : (
              <path
                d="M 0 -8 C 6 -2.4 7.4 0.8 4.2 3.2 C 2.4 4.6 0.7 3.6 0 2.2 C -0.7 3.6 -2.4 4.6 -4.2 3.2 C -7.4 0.8 -6 -2.4 0 -8 z M -1.6 3 L -3.2 7.6 L 3.2 7.6 L 1.6 3 z"
                fill={OUTLINE}
              />
            )}
          </g>
        ))}

        {/* ---- the roulette wheel --------------------------------------- */}
        <g transform="translate(0 -74)">
          <circle r={35} fill={RED_DEEP} stroke={GOLD} strokeWidth={2.6} />
          <g className="skin__wheel">
            {Array.from({ length: 18 }, (_, i) => {
              const a0 = (i / 18) * Math.PI * 2
              const a1 = ((i + 1) / 18) * Math.PI * 2
              const r = 31
              return (
                <path
                  key={i}
                  d={`M 0 0 L ${(Math.cos(a0) * r).toFixed(2)} ${(Math.sin(a0) * r).toFixed(2)}
                      A ${r} ${r} 0 0 1 ${(Math.cos(a1) * r).toFixed(2)} ${(Math.sin(a1) * r).toFixed(2)} z`}
                  fill={i % 2 ? RED : '#141018'}
                  stroke={GOLD}
                  strokeWidth={0.6}
                />
              )
            })}
            {/* The ball, riding the rim: what separates a roulette wheel from
                a pie chart or a gear. */}
            <circle cx={0} cy={-27} r={3} fill={CREAM} stroke={OUTLINE} strokeWidth={0.8} />
          </g>
          <circle r={9} fill={GOLD} stroke={OUTLINE} strokeWidth={1.2} />
          <circle r={4} fill={RED_DEEP} />
          <circle r={35} fill="none" stroke={OUTLINE} strokeWidth={1.2} />
          {/* The pointer. ⚠️ A DISC OF ALTERNATING WEDGES IS A PIE CHART until
              something is reading it — the flag at the top is what says this is
              a wheel that stops somewhere, and it stays still while the wheel
              turns under it. */}
          <path
            d="M 0 -40 L 5.5 -30 L -5.5 -30 z"
            fill={CREAM}
            stroke={OUTLINE}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
        </g>

        {/* ---- dice adrift ---------------------------------------------- */}
        {/* Dice on the same arc as the cards, and within one size family: three
            different sizes at three different radii was the other half of the
            scatter. */}
        <g className="skin__dice" style={{ animationDelay: '0s' }}>
          {die(-78, 16, 8, -18, 5, 0)}
        </g>
        <g className="skin__dice" style={{ animationDelay: '-2.2s' }}>
          {die(78, 14, 7.4, 24, 3, 1)}
        </g>
        <g className="skin__dice" style={{ animationDelay: '-4.4s' }}>
          {die(-20, -104, 7, 12, 2, 2)}
        </g>
      </g>

      {/* ---- the house itself -------------------------------------------- */}
      <g clipPath={`url(#skin-ch-wall-${uid})`}>
        <rect x={-52} y={-24} width={104} height={54} fill="#1b1220" opacity={0.92} />
        <rect x={-52} y={-24} width={104} height={6} fill={RED} />
        <rect x={-52} y={24} width={104} height={6} fill={RED} />
        {/* Rim light just inside the silhouette. Every legendary that reads as
            one object has one: the house is lit by its own marquee, and this is
            what says so. */}
        <rect
          x={-50.5}
          y={-22.5}
          width={101}
          height={51}
          rx={3}
          fill="none"
          stroke={GOLD}
          strokeWidth={1.3}
          opacity={0.45}
        />
        {/* Neon pinstripes. */}
        {[-40, -26, 26, 40].map((x, i) => (
          <g key={i}>
            <path d={`M ${x} 24 L ${x} -18`} stroke={GOLD} strokeWidth={3.4} opacity={0.18} fill="none" />
            <path d={`M ${x} 24 L ${x} -18`} stroke={GOLD} strokeWidth={1} fill="none" />
          </g>
        ))}
        {/* A chip stack on each flank, because a casino is not just lights. */}
        {/* ⚠️ MATCHED, LEFT AND RIGHT. The stacks used to run different colour
            sequences on each side, which reads as two unrelated piles rather
            than as a table that was set. Same three chips, same order. */}
        {[-33, 33].map((x, i) => (
          <g key={`c${i}`}>
            {[0, 1, 2].map((k) => (
              <g key={k}>
                <ellipse
                  cx={x}
                  cy={19 - k * 4.6}
                  rx={9}
                  ry={3.1}
                  fill={[GOLD, TEAL, RED][k]}
                  stroke={OUTLINE}
                  strokeWidth={0.9}
                />
                <ellipse cx={x} cy={19 - k * 4.6} rx={4.6} ry={1.5} fill={CREAM} opacity={0.55} />
              </g>
            ))}
          </g>
        ))}
      </g>

      {/* ---- the marquee ------------------------------------------------- */}
      {Array.from({ length: 14 }, (_, i) => {
        const x = -48 + i * 7.4
        return (
          <circle
            key={i}
            className="skin__bulb"
            style={{ animationDelay: `${(i % 4) * 0.28}s` }}
            cx={x}
            cy={-27}
            r={2.4}
            fill={i % 2 ? GOLD : CREAM}
            stroke={OUTLINE}
            strokeWidth={0.8}
          />
        )
      })}
      {[-15, 0, 15].map((x, i) => (
        <circle
          key={i}
          className="skin__bulb"
          style={{ animationDelay: `${(i % 3) * 0.36}s` }}
          cx={x}
          cy={-62}
          r={2.6}
          fill={i === 1 ? GOLD : RED}
          stroke={OUTLINE}
          strokeWidth={0.8}
        />
      ))}

      {/* ---- the door, under an arch of light ---------------------------- */}
      <g className="skin__aura">
        <path d="M -12 30 L -12 12 C -12 1 12 1 12 12 L 12 30 z" fill={GOLD} opacity={0.28} />
      </g>
      <path
        d="M -12 30 L -12 12 C -12 1 12 1 12 12 L 12 30"
        fill="none"
        stroke={GOLD}
        strokeWidth={2.4}
      />
      {die(0, 16, 6.5, -8, 5, 90)}

      {/* ---- it floats on its own neon ----------------------------------- */}
      <ellipse cx={0} cy={34} rx={58} ry={9} fill={`url(#skin-ch-pad-${uid})`} />
      <ellipse cx={0} cy={33} rx={30} ry={4} fill={GOLD} opacity={0.5} />
      {[-44, -20, 8, 30, 48].map((x, i) => (
        <g key={i} className="skin__mote" style={{ animationDelay: `-${i * 1.25}s` }}>
          <ellipse cx={x} cy={38} rx={4.4} ry={1.5} fill={CARNIVAL[i % CARNIVAL.length]} stroke={OUTLINE} strokeWidth={0.6} />
        </g>
      ))}
    </g>
  )
}

export const JokerDecor = {
  'joker.polkadot': PolkaDotCastle,
  'joker.carnival': CarnivalFortress,
  'joker.jester': MadJesterCastle,
  'joker.casino': ChaosCasino,
}
