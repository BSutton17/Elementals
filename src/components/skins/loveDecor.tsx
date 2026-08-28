import type { DecorProps } from './decor'
import './skins.css'

/**
 * Love's skin decorations.
 *
 * Drawn INSIDE the castle's local space, over the sprite — the keep occupies
 * roughly x −20…20, y −58…−12, the curtain wall x −52…52, y −24…30, and the
 * gate x −11…11, y 10…30. Anything here is layered on top of that.
 *
 * ⚠️ THE SILHOUETTE AND THE HUE ARE NOT NEGOTIABLE. Players pick out who is
 * attacking them from a small castle on a phone, often through fog. A skin may
 * add detail and texture; it may not obscure the shape, and it stays in Love's
 * rose and blush.
 *
 * ⚠️ PINK IS THE EASIEST PALETTE IN THE GAME TO MAKE LOOK CHEAP. Fire's first
 * pass went candy-coloured and had to be rebuilt; a kingdom that is ALREADY
 * pink has no such margin. Every one of these leans on a warm gold and a deep
 * wine for structure, and uses the bright rose sparingly, as the thing that
 * glows rather than the thing everything is made of.
 *
 * ⚠️ ONE STROKED OUTLINE PER OBJECT. Everything inside it is an unstroked fill.
 */

const ROSE = '#ff4d8d'
const BLUSH = '#ffd1e3'
const WINE = '#5c1030'
const WINE_DEEP = '#3a0a1f'
const GOLD = '#e8b53c'
const GOLD_LIT = '#ffe9a8'
const GOLD_DEEP = '#b8862a'
const OUTLINE = '#3a0a1f'

/**
 * A heart.
 *
 * ⚠️ ONE HEART SHAPE FOR THE WHOLE KINGDOM. Four skins draw dozens of these
 * between them, and hearts that differ slightly in proportion from one skin to
 * the next read as sloppiness rather than variety — the lobes are what the eye
 * checks. Built from two mirrored cubics off a single point, scaled.
 */
function heartPath(s: number): string {
  const r = (n: number) => (n * s).toFixed(2)
  return `M 0 ${r(0.42)}
          C ${r(-0.62)} ${r(-0.06)} ${r(-0.98)} ${r(-0.5)} ${r(-0.5)} ${r(-0.78)}
          C ${r(-0.2)} ${r(-0.95)} 0 ${r(-0.68)} 0 ${r(-0.5)}
          C 0 ${r(-0.68)} ${r(0.2)} ${r(-0.95)} ${r(0.5)} ${r(-0.78)}
          C ${r(0.98)} ${r(-0.5)} ${r(0.62)} ${r(-0.06)} 0 ${r(0.42)} z`
}

function Heart({
  x,
  y,
  s,
  fill,
  stroke,
  strokeWidth = 1,
  opacity = 1,
  rotate = 0,
}: {
  x: number
  y: number
  s: number
  fill: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
  rotate?: number
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`} opacity={opacity}>
      <path
        d={heartPath(s)}
        fill={fill}
        stroke={stroke}
        strokeWidth={stroke ? strokeWidth : undefined}
        strokeLinejoin="round"
      />
    </g>
  )
}

/**
 * Uncommon — Heart Pattern Castle.
 *
 * The standard castle papered in hearts: rows of them across the walls, a pair
 * of crossed arrows on each flank, a heart medallion on the keep, and small
 * heart finials on the battlements.
 *
 * The lightest possible touch, like Water's Rippled Castle and Space's Star
 * Pattern: everything is clipped to the walls and the keep, so the silhouette
 * is exactly the default one.
 */
function HeartPatternCastle({ eliminated, uid }: DecorProps) {
  /**
   * ⚠️ THE ROWS ARE OFFSET, LIKE MASONRY. Hearts on a square grid read as
   * wrapping paper or as a tiled background; staggering alternate rows by half
   * a step is what makes a pattern feel applied to a surface rather than
   * printed behind it. Sizes alternate slightly for the same reason.
   */
  const ROWS = [-14, -3, 8, 19]
  const STEP = 15

  /** A cupid's arrow: shaft, fletching, heart-tipped head. */
  const arrow = (x: number, y: number, deg: number, len: number, key: number) => (
    <g key={key} transform={`translate(${x} ${y}) rotate(${deg})`}>
      {/* ⚠️ DARK SHAFT, NOT GOLD. A thin gold line laid over a wall of pink
          hearts is the same value as everything around it, and the first pair
          read as scribbles in the pattern. Wine holds against blush; the gold
          is a highlight down the middle of it, which is what makes it a
          polished shaft rather than a stick. */}
      <path d={`M ${-len / 2} 0 L ${len / 2 - 4} 0`} stroke={WINE_DEEP} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <path d={`M ${-len / 2 + 2} -0.5 L ${len / 2 - 6} -0.5`} stroke={GOLD_LIT} strokeWidth={0.9} fill="none" opacity={0.9} />
      <path
        d={`M ${-len / 2 - 1} 0 L ${-len / 2 + 6} -4.5 L ${-len / 2 + 4} 0 L ${-len / 2 + 6} 4.5 z`}
        fill={BLUSH}
        stroke={WINE_DEEP}
        strokeWidth={0.9}
        strokeLinejoin="round"
      />
      <g transform={`translate(${len / 2 - 2} 0) rotate(90)`}>
        <path d={heartPath(9)} fill={ROSE} stroke={WINE_DEEP} strokeWidth={1} />
      </g>
    </g>
  )

  return (
    <g className="skin skin--heartpattern" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-hp-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-hp-keep-${uid}`}>
        <rect x={-21} y={-59} width={42} height={48} rx={3} />
      </clipPath>

      {/* ---- the wall ---------------------------------------------------- */}
      <g clipPath={`url(#skin-hp-wall-${uid})`}>
        {ROWS.map((y, row) =>
          Array.from({ length: 8 }, (_, i) => {
            const x = -52 + i * STEP + (row % 2 ? STEP / 2 : 0)
            const big = (row + i) % 3 === 0
            return (
              <Heart
                key={`${row}-${i}`}
                x={x}
                y={y}
                s={big ? 8 : 6}
                fill={big ? BLUSH : 'none'}
                stroke={big ? OUTLINE : BLUSH}
                strokeWidth={big ? 0.8 : 1.2}
                opacity={big ? 0.9 : 0.65}
              />
            )
          }),
        )}
        {/* Ribbon bands, top and bottom, so the pattern is contained rather
            than running off the edges. */}
        <path d="M -52 -21 L 52 -21" stroke={GOLD} strokeWidth={1.6} fill="none" />
        <path d="M -52 27 L 52 27" stroke={GOLD} strokeWidth={1.6} fill="none" />

        {/* Crossed arrows on each flank, clear of the gate. */}
        {arrow(-33, 6, -20, 38, 0)}
        {arrow(-33, 6, 20, 38, 1)}
        {arrow(33, 6, 20, 38, 2)}
        {arrow(33, 6, -20, 38, 3)}
      </g>

      {/* ---- the keep: one medallion ------------------------------------- */}
      <g clipPath={`url(#skin-hp-keep-${uid})`}>
        <circle cx={0} cy={-34} r={13} fill={WINE} opacity={0.35} />
        <circle cx={0} cy={-34} r={13} fill="none" stroke={GOLD} strokeWidth={1.6} />
        <Heart x={0} y={-34} s={17} fill={ROSE} stroke={OUTLINE} strokeWidth={1.1} />
        <Heart x={0} y={-36} s={7} fill={BLUSH} opacity={0.8} />
        <path d="M -14 -19 L 14 -19" stroke={GOLD} strokeWidth={1.3} fill="none" />
      </g>

      {/* ---- heart finials on the battlements ---------------------------
          Merlon centres are read from the sprite: the wall's are at −46, −24,
          24 and 46 and the keep's at −15, 0 and 15. They are not evenly
          spaced, and anything placed by eye lands half a merlon out. */}
      {[-46, -24, 24, 46].map((x, i) => (
        <Heart key={i} x={x} y={-29} s={7} fill={ROSE} stroke={OUTLINE} strokeWidth={0.9} />
      ))}
      {[-15, 0, 15].map((x, i) => (
        <Heart key={i} x={x} y={-63} s={5.5} fill={BLUSH} stroke={OUTLINE} strokeWidth={0.8} />
      ))}

      {/* ---- the gate ---------------------------------------------------- */}
      <path
        d="M -12 30 L -12 15 C -12 4 12 4 12 15 L 12 30"
        fill="none"
        stroke={GOLD}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Heart x={0} y={8} s={9} fill={ROSE} stroke={OUTLINE} strokeWidth={0.9} />
    </g>
  )
}

/**
 * Rare — Romantic Palace.
 *
 * Not a fortress: ogee domes and a balustrade where the battlements were, tall
 * glazed windows, lanterns on the wall, rose beds along the foot of it, a
 * fountain to either side of the door and a little bridge up to it.
 *
 * ⚠️ ELEGANT MEANS THE MILITARY PARTS GO. The brief is explicit that this is
 * extravagant rather than militaristic, so the merlons are dressed over with a
 * balustrade, the arrow-slit proportions become tall glazed windows, and the
 * gate becomes a door with a canopy. A castle with bunting on it is still a
 * castle.
 *
 * ⚠️ AND THE GARDEN IS ROSES, NOT FOLIAGE. Nature owns leaves; every green
 * thing here is a few dark strokes UNDER a bloom, never a plant in its own
 * right.
 */
function RomanticPalace({ eliminated, uid }: DecorProps) {
  const LEAF = '#4a6b45'

  /** An ogee dome: two S-curves to a point, which is what makes it romantic
   *  rather than a cone or a bubble. */
  const dome = (x: number, base: number, w: number, h: number, key: number) => (
    <g key={key}>
      <path
        d={`M ${x - w} ${base}
            C ${x - w} ${base - h * 0.55} ${x - w * 0.5} ${base - h * 0.7} ${x} ${base - h}
            C ${x + w * 0.5} ${base - h * 0.7} ${x + w} ${base - h * 0.55} ${x + w} ${base} z`}
        fill={`url(#skin-rp-dome-${uid})`}
        stroke={OUTLINE}
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
      <path
        d={`M ${x - w * 0.55} ${base - h * 0.12} C ${x - w * 0.5} ${base - h * 0.6} ${x - w * 0.2} ${base - h * 0.8} ${x} ${base - h * 0.94}`}
        fill="none"
        stroke={GOLD_LIT}
        strokeWidth={1.2}
        opacity={0.75}
      />
      <rect x={x - w - 1.5} y={base - 1} width={(w + 1.5) * 2} height={3} fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
      <circle cx={x} cy={base - h - 2.2} r={1.6} fill={GOLD_LIT} stroke={OUTLINE} strokeWidth={0.7} />
    </g>
  )

  /**
   * A lantern hanging off a bracket.
   *
   * ⚠️ A TRAPEZOID ON A STRING IS A BUCKET. That is what the first pass looked
   * like hanging off the wall. A lantern reads from four things: an arm out of
   * the wall, a cap on top, a body with a visible pane, and — above all — light
   * coming off it. Without the glow it is a pail whatever shape it is.
   */
  const lantern = (x: number, y: number, key: number) => (
    <g key={key}>
      {/* Bracket and hook. */}
      <path d={`M ${x} ${y - 11} L ${x} ${y - 5}`} stroke={GOLD} strokeWidth={1.2} fill="none" />
      <path d={`M ${x - 3} ${y - 11} L ${x + 3} ${y - 11}`} stroke={GOLD} strokeWidth={1.4} fill="none" />
      <circle cx={x} cy={y + 1} r={9} fill={GOLD_LIT} opacity={0.22} />
      <circle cx={x} cy={y + 1} r={5} fill={GOLD_LIT} opacity={0.3} />
      {/* Cap, body, finial. */}
      <path
        d={`M ${x - 4} ${y - 5} L ${x + 4} ${y - 5} L ${x + 2.6} ${y - 7.4} L ${x - 2.6} ${y - 7.4} z`}
        fill={GOLD}
        stroke={OUTLINE}
        strokeWidth={0.7}
        strokeLinejoin="round"
      />
      <path
        d={`M ${x - 3.4} ${y - 5} L ${x + 3.4} ${y - 5} L ${x + 2.6} ${y + 4.6} L ${x - 2.6} ${y + 4.6} z`}
        fill={GOLD_LIT}
        stroke={OUTLINE}
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
      <path d={`M ${x} ${y - 4} L ${x} ${y + 3.6}`} stroke={GOLD} strokeWidth={0.8} fill="none" opacity={0.8} />
      <path d={`M ${x - 1.4} ${y + 4.6} L ${x + 1.4} ${y + 4.6} L ${x} ${y + 6.8} z`} fill={GOLD} stroke={OUTLINE} strokeWidth={0.6} />
    </g>
  )

  /** A rose bush: blooms first, and only enough green to sit them on. */
  const bush = (x: number, y: number, s: number, key: number) => (
    <g key={key}>
      {[
        [-4, 0.5],
        [0, -2],
        [4, 0.5],
        [-2, 2.5],
        [2.4, 2.6],
      ].map(([dx, dy], i) => (
        <path
          key={`l${i}`}
          d={`M ${x + dx! * s * 0.9} ${y + dy! * s * 0.9 + 2.5 * s} L ${x + dx! * s} ${y + dy! * s}`}
          stroke={LEAF}
          strokeWidth={1.1 * s}
          fill="none"
          opacity={0.85}
        />
      ))}
      {[
        [-4, 0.5, 3.4],
        [0, -2, 4.2],
        [4, 0.5, 3.2],
        [-2, 2.5, 2.6],
        [2.4, 2.6, 2.8],
      ].map(([dx, dy, r], i) => (
        <g key={i}>
          <circle cx={x + dx! * s} cy={y + dy! * s} r={r! * s} fill={ROSE} stroke={OUTLINE} strokeWidth={0.7} />
          <circle cx={x + dx! * s} cy={y + dy! * s} r={r! * s * 0.45} fill={BLUSH} opacity={0.9} />
        </g>
      ))}
    </g>
  )

  /**
   * A fountain.
   *
   * ⚠️ THE WATER HAS TO BE THE BIGGEST THING IN IT. Two builds put the
   * masonry first — a basin, a pedestal, an upper bowl — and both read as a
   * small table, or a lamp, or a mushroom. At this size the stonework is four
   * or five units tall and cannot carry the idea; the PLUME can. So the bowl
   * is one shallow dish and everything above it is water: a column up the
   * middle and arcs falling wide on both sides, in near-white so they are the
   * lightest thing on the sprite.
   */
  const fountain = (x: number, key: number) => (
    <g key={key}>
      {/* The plume, first and largest. */}
      <path
        d={`M ${x} 30 C ${x - 1.5} 20 ${x - 1} 14 ${x} 8`}
        stroke="#ffffff"
        strokeWidth={2.6}
        fill="none"
        strokeLinecap="round"
        opacity={0.95}
      />
      {[
        [-1, 15, 34],
        [1, 15, 34],
        [-1, 10.5, 30],
        [1, 10.5, 30],
      ].map(([dir, spread, land], i) => (
        <path
          key={i}
          d={`M ${x} 9 C ${x + dir! * spread! * 0.5} 11 ${x + dir! * spread!} 22 ${x + dir! * spread! * 0.82} ${land!}`}
          stroke="#ffeaf3"
          strokeWidth={i < 2 ? 1.6 : 1.2}
          fill="none"
          strokeLinecap="round"
          opacity={0.9}
        />
      ))}
      <circle cx={x} cy={7} r={2.4} fill="#ffffff" opacity={0.9} />
      {[
        [-9, 16],
        [8, 14],
        [-5, 12],
      ].map(([dx, dy], i) => (
        <circle key={`d${i}`} cx={x + dx!} cy={dy!} r={1.1} fill="#ffeaf3" opacity={0.8} />
      ))}
      {/* One shallow dish under it, and the lit surface of the water. */}
      <ellipse cx={x} cy={36} rx={15} ry={5.4} fill={BLUSH} stroke={OUTLINE} strokeWidth={1} />
      <ellipse cx={x} cy={35.2} rx={12.4} ry={4} fill="#ffeaf3" />
      <path d={`M ${x - 8} 35.4 C ${x - 4} 34.2 ${x - 1} 36.4 ${x + 3} 35`} stroke={BLUSH} strokeWidth={0.9} fill="none" />
      <path d={`M ${x - 3} 37.4 C ${x + 1} 36.2 ${x + 4} 38 ${x + 8} 36.6`} stroke={BLUSH} strokeWidth={0.8} fill="none" opacity={0.85} />
      <path d={`M ${x - 3} 33 L ${x - 2} 30 L ${x + 2} 30 L ${x + 3} 33 z`} fill={BLUSH} stroke={OUTLINE} strokeWidth={0.8} />
    </g>
  )

  return (
    <g className="skin skin--romanticpalace" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-rp-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-rp-keep-${uid}`}>
        <rect x={-21} y={-59} width={42} height={48} rx={3} />
      </clipPath>
      <defs>
        <linearGradient id={`skin-rp-dome-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={BLUSH} />
          <stop offset="45%" stopColor="#ffeaf3" />
          <stop offset="100%" stopColor={ROSE} />
        </linearGradient>
        <linearGradient id={`skin-rp-glass-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GOLD_LIT} stopOpacity="0.9" />
          <stop offset="100%" stopColor={ROSE} stopOpacity="0.75" />
        </linearGradient>
      </defs>

      {/* ---- the grounds, in front of and below the walls ---------------- */}
      {fountain(-62, 0)}
      {fountain(62, 1)}
      {bush(-40, 34, 0.85, 2)}
      {bush(-22, 36, 0.7, 3)}
      {bush(24, 35, 0.78, 4)}
      {bush(42, 34, 0.9, 5)}

      {/* The bridge up to the door: a shallow arch with a rail, so the palace
          is approached rather than walled off. */}
      <path
        d="M -18 42 C -10 34 10 34 18 42 L 18 44 L -18 44 z"
        fill={BLUSH}
        stroke={OUTLINE}
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
      <path d="M -18 38 C -10 31 10 31 18 38" fill="none" stroke={GOLD} strokeWidth={1.3} />
      {[-13, -6, 6, 13].map((x, i) => (
        <path key={i} d={`M ${x} ${37 - Math.abs(x) * 0.18} L ${x} ${41 - Math.abs(x) * 0.1}`} stroke={GOLD} strokeWidth={1} fill="none" />
      ))}

      {/* ---- the palace front -------------------------------------------- */}
      <g clipPath={`url(#skin-rp-wall-${uid})`}>
        <rect x={-52} y={-24} width={104} height={54} fill="#ffeaf3" opacity={0.9} />
        <rect x={-52} y={-24} width={104} height={6} fill={GOLD} opacity={0.9} />
        <rect x={-52} y={25} width={104} height={5} fill={GOLD} opacity={0.9} />
        {/* Tall glazed windows where the arrow slits would be. */}
        {[-40, -24, 24, 40].map((x, i) => (
          <g key={i}>
            <path
              d={`M ${x - 5} 20 L ${x - 5} -4 Q ${x} -14 ${x + 5} -4 L ${x + 5} 20 z`}
              fill={`url(#skin-rp-glass-${uid})`}
              stroke={GOLD}
              strokeWidth={1.3}
            />
            <path d={`M ${x} 20 L ${x} -12`} stroke={BLUSH} strokeWidth={0.9} fill="none" opacity={0.8} />
            <path d={`M ${x - 4.6} 6 L ${x + 4.6} 6`} stroke={BLUSH} strokeWidth={0.8} fill="none" opacity={0.8} />
          </g>
        ))}
        {/* Swags between the windows: the extravagance the brief asks for. */}
        {[-32, 32].map((x, i) => (
          <g key={i}>
            <path
              d={`M ${x - 7} -12 C ${x - 3} -5 ${x + 3} -5 ${x + 7} -12`}
              fill="none"
              stroke={GOLD}
              strokeWidth={1.2}
              opacity={0.9}
            />
            <Heart x={x} y={-4} s={5} fill={ROSE} stroke={OUTLINE} strokeWidth={0.7} />
          </g>
        ))}
      </g>

      {/* A balustrade dressing over the battlements. */}
      <rect x={-52} y={-28} width={104} height={2.6} fill={BLUSH} stroke={OUTLINE} strokeWidth={0.8} />
      {Array.from({ length: 17 }, (_, i) => (
        <path
          key={i}
          d={`M ${-49 + i * 6.2} -25.4 L ${-49 + i * 6.2} -21`}
          stroke={BLUSH}
          strokeWidth={2.2}
          fill="none"
        />
      ))}

      {/* ---- the keep, given a face -------------------------------------- */}
      <g clipPath={`url(#skin-rp-keep-${uid})`}>
        <rect x={-21} y={-59} width={42} height={48} fill="#ffeaf3" opacity={0.92} />
        <path
          d={`M -8 -14 L -8 -38 Q 0 -50 8 -38 L 8 -14 z`}
          fill={`url(#skin-rp-glass-${uid})`}
          stroke={GOLD}
          strokeWidth={1.4}
        />
        <path d="M 0 -14 L 0 -47" stroke={BLUSH} strokeWidth={1} fill="none" opacity={0.85} />
        <path d="M -21 -20 L 21 -20" stroke={GOLD} strokeWidth={1.4} fill="none" opacity={0.9} />
        <Heart x={0} y={-24} s={7} fill={ROSE} stroke={OUTLINE} strokeWidth={0.8} />
      </g>

      {/* ---- domes ------------------------------------------------------- */}
      {dome(0, -58, 15, 26, 0)}
      {dome(-46, -24, 9, 16, 1)}
      {dome(46, -24, 9, 16, 2)}

      {/* ---- lanterns along the front ------------------------------------ */}
      {lantern(-46, -12, 0)}
      {lantern(-14, -12, 1)}
      {lantern(14, -12, 2)}
      {lantern(46, -12, 3)}

      {/* ---- the door, with its canopy ----------------------------------- */}
      <path d="M -11 30 L -11 14 C -11 3 11 3 11 14 L 11 30 z" fill={`url(#skin-rp-glass-${uid})`} opacity={0.85} />
      <path d="M 0 30 L 0 4" stroke={GOLD} strokeWidth={1.1} fill="none" opacity={0.9} />
      <path
        d="M -15 6 C -9 -2 9 -2 15 6 L 13 8 C 8 2 -8 2 -13 8 z"
        fill={ROSE}
        stroke={OUTLINE}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <path
        d="M -11 30 L -11 14 C -11 3 11 3 11 14 L 11 30"
        fill="none"
        stroke={GOLD}
        strokeWidth={2}
      />
    </g>
  )
}

/**
 * Rare — Cupid's Castle.
 *
 * A fortress carried on a pair of enormous golden wings, in a bank of cloud,
 * with arrows crossed behind the keep and hearts adrift around it.
 *
 * ⚠️ IT MUST NOT BE LIGHT'S CELESTIAL PALACE. Both have giant wings behind the
 * castle, so the difference has to be structural, not decorative: those are
 * white feathers RAISED above the keep like something praying; these are gold,
 * they spread wide and LOW, and the castle sits on them — a vehicle rather
 * than a vision. Every feather here also ends in a rounded lobe rather than a
 * point, which is what keeps them cupid rather than angelic.
 *
 * ⚠️ AND IT MUST NOT BE ROMANTIC PALACE EITHER. Same kingdom, same tier: that
 * one is architecture on the ground with gardens; this one has no ground at
 * all.
 */
function CupidsCastle({ eliminated, uid }: DecorProps) {
  /* Feathers grow along an arm, they do not radiate from the shoulder — the
     sea-urchin lesson from Light's wings, applied from the start. */
  /* ⚠️ COMPUTED, NOT JUDGED. Feathers add their whole length on top of wherever
     the arm ends, and the first set ran to x 126 in a frame that stops at 92 —
     every tip would have been sliced off square. These reach x 81 of 89 and
     y −51, which keeps them WIDE AND LOW: Light's celestial wings climb to
     −115, and that difference in posture is most of what separates the two
     skins at a glance. */
  const ARM = { c: [24, -22] as const, t: [44, -38] as const }

  const armAt = (u: number) => {
    const x = 2 * (1 - u) * u * ARM.c[0] + u * u * ARM.t[0]
    const y = 2 * (1 - u) * u * ARM.c[1] + u * u * ARM.t[1]
    const dx = 2 * (1 - u) * ARM.c[0] + 2 * u * (ARM.t[0] - ARM.c[0])
    const dy = 2 * (1 - u) * ARM.c[1] + 2 * u * (ARM.t[1] - ARM.c[1])
    return { x, y, deg: (Math.atan2(dy, dx) * 180) / Math.PI }
  }

  /**
   * ⚠️ ONE WING, NOT A PILE OF FEATHERS. The first build stacked three rows of
   * separately outlined lobes, and every lobe carried its own dark stroke: the
   * result was a heap of overlapping scales with no outer shape at all, which
   * is what made it read as a shell or a fan. A real wing is a single
   * silhouette with the feathering drawn INSIDE it — so the membrane is built
   * first, from the arm out to the trailing edge, and the feathers are just the
   * notches and quill lines on top of it. One stroked outline per object, which
   * has been the rule from Water onward and was quietly broken here.
   */
  const ROWS = [
    /* ⚠️ THE OUTERMOST FEATHER CONTINUES THE ARM. At a wider sweep its tip
       sat off the line of the leading edge, and the jump from the arm's end to
       that tip put a dark spike on top of the wing. 14° keeps the outer edge
       one continuous curve. */
    { n: 7, u0: 0.5, u1: 1, len0: 27, len1: 35, sweep0: 46, sweep1: 14 },
    { n: 6, u0: 0.2, u1: 0.56, len0: 20, len1: 27, sweep0: 66, sweep1: 48 },
  ]

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t

  /** Where a row's feather tips land, in order out along the arm. */
  const tipsOf = (row: (typeof ROWS)[number]) =>
    Array.from({ length: row.n }, (_, i) => {
      const t = row.n === 1 ? 0 : i / (row.n - 1)
      const u = lerp(row.u0, row.u1, t)
      const base = armAt(u)
      const len = lerp(row.len0, row.len1, t)
      const a = ((base.deg + lerp(row.sweep0, row.sweep1, t)) * Math.PI) / 180
      return {
        base,
        tip: [base.x + Math.cos(a) * len, base.y + Math.sin(a) * len] as [number, number],
      }
    })

  const wing = () => {
    const outer = tipsOf(ROWS[0]!)
    const inner = tipsOf(ROWS[1]!)

    /* The membrane: out along the arm, then back along the tips of the
       primaries and the secondaries. Scalloped between the tips, so the
       trailing edge is feathered rather than a smooth curve. */
    const trailing = [...outer].reverse()
    /* ⚠️ THE SHOULDER IS ROUNDED. Starting the membrane at the origin gave the
       wing a sharp point where it meets the castle, and a wing that comes to a
       spike at the body reads as a fin. */
    let d = `M -1 3 C 1 -3 5 -6 11 -7 Q ${ARM.c[0]} ${ARM.c[1]} ${ARM.t[0]} ${ARM.t[1]}`
    trailing.forEach((f, i) => {
      const prev = i === 0 ? null : trailing[i - 1]!
      if (prev) {
        const mx = (prev.tip[0] + f.tip[0]) / 2
        const my = (prev.tip[1] + f.tip[1]) / 2
        const bx = (prev.base.x + f.base.x) / 2
        const by = (prev.base.y + f.base.y) / 2
        /* Pull the control point back toward the arm: that dip is the notch
           between two feathers. */
        d += ` Q ${(mx * 0.78 + bx * 0.22).toFixed(1)} ${(my * 0.78 + by * 0.22).toFixed(1)} ${f.tip[0].toFixed(1)} ${f.tip[1].toFixed(1)}`
      } else {
        d += ` L ${f.tip[0].toFixed(1)} ${f.tip[1].toFixed(1)}`
      }
    })
    d += ` L ${inner[0]!.tip[0].toFixed(1)} ${inner[0]!.tip[1].toFixed(1)} z`

    return (
      <g>
        <path d={d} fill={`url(#skin-cc2-wing-${uid})`} stroke={OUTLINE} strokeWidth={1.3} strokeLinejoin="round" />
        {/* Quills: one line per feather, stopping short of the edge. */}
        {outer.map((f, i) => (
          <path
            key={`q${i}`}
            d={`M ${f.base.x.toFixed(1)} ${f.base.y.toFixed(1)} L ${(f.base.x + (f.tip[0] - f.base.x) * 0.86).toFixed(1)} ${(f.base.y + (f.tip[1] - f.base.y) * 0.86).toFixed(1)}`}
            stroke={OUTLINE}
            strokeWidth={0.9}
            opacity={0.4}
            fill="none"
          />
        ))}
        {/* The covert row, drawn as one band over the membrane's root rather
            than as loose feathers: it is what gives the wing a shoulder. */}
        <path
          d={
            `M 0 0 Q ${(ARM.c[0] * 0.6).toFixed(1)} ${(ARM.c[1] * 0.6).toFixed(1)} ${inner[inner.length - 1]!.base.x.toFixed(1)} ${inner[inner.length - 1]!.base.y.toFixed(1)} ` +
            [...inner]
              .reverse()
              .map((f) => `L ${f.tip[0].toFixed(1)} ${f.tip[1].toFixed(1)}`)
              .join(' ') +
            ' z'
          }
          fill={GOLD_LIT}
          stroke={OUTLINE}
          strokeWidth={1.1}
          strokeLinejoin="round"
          opacity={0.95}
        />
        {inner.map((f, i) => (
          <path
            key={`i${i}`}
            d={`M ${f.base.x.toFixed(1)} ${f.base.y.toFixed(1)} L ${(f.base.x + (f.tip[0] - f.base.x) * 0.8).toFixed(1)} ${(f.base.y + (f.tip[1] - f.base.y) * 0.8).toFixed(1)}`}
            stroke={OUTLINE}
            strokeWidth={0.8}
            opacity={0.32}
            fill="none"
          />
        ))}
        {/* The leading edge, last, so it is unbroken. */}
        <path
          d={`M 0 0 Q ${ARM.c[0]} ${ARM.c[1]} ${ARM.t[0]} ${ARM.t[1]}`}
          fill="none"
          stroke={GOLD}
          strokeWidth={3.4}
          strokeLinecap="round"
        />
        <path
          d={`M 0 0 Q ${ARM.c[0]} ${ARM.c[1]} ${ARM.t[0]} ${ARM.t[1]}`}
          fill="none"
          stroke="#fff6d8"
          strokeWidth={1.2}
          strokeLinecap="round"
          opacity={0.9}
        />
      </g>
    )
  }

  /** A cloud: overlapping lobes with a flat base, never a row of circles. */
  const cloud = (x: number, y: number, s: number, key: number, o = 0.9) => (
    <g key={key} opacity={o}>
      <path
        d={`M ${x - 14 * s} ${y} C ${x - 16 * s} ${y - 6 * s} ${x - 9 * s} ${y - 9 * s} ${x - 5 * s} ${y - 6 * s}
            C ${x - 3 * s} ${y - 12 * s} ${x + 5 * s} ${y - 12 * s} ${x + 6 * s} ${y - 6 * s}
            C ${x + 11 * s} ${y - 9 * s} ${x + 16 * s} ${y - 4 * s} ${x + 14 * s} ${y} z`}
        fill={BLUSH}
        stroke={OUTLINE}
        strokeWidth={0.9}
        strokeLinejoin="round"
      />
      <path
        d={`M ${x - 12 * s} ${y - 1.5 * s} C ${x - 8 * s} ${y - 4 * s} ${x - 2 * s} ${y - 4 * s} ${x + 2 * s} ${y - 2 * s}`}
        fill="none"
        stroke="#ffffff"
        strokeWidth={1.1}
        opacity={0.75}
      />
    </g>
  )

  return (
    <g className="skin skin--cupidscastle" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-cc2-outside-${uid}`} clipRule="evenodd">
        <path
          d="M -92 -128 L 92 -128 L 92 44 L -92 44 z
             M -53 -25 L 53 -25 L 53 31 L -53 31 z
             M -21 -59 L 21 -59 L 21 -25 L -21 -25 z"
          clipRule="evenodd"
        />
      </clipPath>
      <clipPath id={`skin-cc2-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <defs>
        <linearGradient id={`skin-cc2-wing-${uid}`} x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0%" stopColor="#fff2c8" />
          <stop offset="45%" stopColor={GOLD_LIT} />
          <stop offset="100%" stopColor={GOLD} />
        </linearGradient>
        <radialGradient id={`skin-cc2-glow-${uid}`} gradientUnits="userSpaceOnUse" cx={0} cy={-10} r={96}>
          <stop offset="0%" stopColor={ROSE} stopOpacity="0.3" />
          <stop offset="55%" stopColor={ROSE} stopOpacity="0.12" />
          <stop offset="100%" stopColor={ROSE} stopOpacity="0" />
        </radialGradient>
      </defs>

      <g clipPath={`url(#skin-cc2-outside-${uid})`}>
        <circle cx={0} cy={-10} r={96} fill={`url(#skin-cc2-glow-${uid})`} />

        {/* Arrows crossed behind the keep. */}
        {[-1, 1].map((side) => (
          <g key={side} transform={`scale(${side} 1) rotate(-24 0 -50)`}>
            <path d="M -6 -50 L 46 -50" stroke={GOLD} strokeWidth={2.4} fill="none" strokeLinecap="round" />
            <path
              d="M 46 -50 L 38 -55 L 40 -50 L 38 -45 z"
              fill={BLUSH}
              stroke={OUTLINE}
              strokeWidth={0.8}
              strokeLinejoin="round"
            />
            <g transform="translate(-8 -50) rotate(-90)">
              <path d={heartPath(11)} fill={ROSE} stroke={OUTLINE} strokeWidth={1} />
            </g>
          </g>
        ))}

        {/* The wings the fortress rides on. The mirror is on the OUTER group:
            a CSS transform on the same element as a transform attribute wins,
            and that is how the leviathan lost a fin. */}
        {/* ⚠️ THE SHOULDER SITS ABOVE THE PARAPET. Rounding it improved the
            wing and immediately pushed its root below the wall top, where the
            clip cut it into two gold blobs sitting on the battlements. The
            whole wing lifts instead of the shoulder being re-pointed. */}
        <g transform="translate(9 -30)">{wing()}</g>
        <g transform="translate(-9 -30) scale(-1 1)">{wing()}</g>
      </g>

      {/* ---- gilding on the fortress ------------------------------------- */}
      <g clipPath={`url(#skin-cc2-wall-${uid})`}>
        <rect x={-52} y={-24} width={104} height={5} fill={GOLD} opacity={0.9} />
        <rect x={-52} y={25} width={104} height={5} fill={GOLD} opacity={0.9} />
        {[-38, -20, 20, 38].map((x, i) => (
          <g key={i}>
            <path d={`M ${x} 25 L ${x} -19`} stroke={ROSE} strokeWidth={2.6} fill="none" opacity={0.35} />
            <path d={`M ${x} 25 L ${x} -19`} stroke={BLUSH} strokeWidth={0.9} fill="none" opacity={0.8} />
          </g>
        ))}
      </g>
      {[-46, -24, 24, 46].map((x, i) => (
        <Heart key={i} x={x} y={-29} s={7} fill={ROSE} stroke={OUTLINE} strokeWidth={0.9} />
      ))}

      {/* ---- cloud bank it rests in -------------------------------------- */}
      {cloud(-44, 40, 1.05, 0)}
      {cloud(40, 41, 1.15, 1)}
      {cloud(-4, 44, 1.3, 2)}
      {cloud(-72, 24, 0.62, 3, 0.85)}
      {cloud(72, 20, 0.58, 4, 0.8)}

      {/* Hearts adrift. */}
      {[
        { x: -66, y: -44, s: 9 },
        { x: 62, y: -52, s: 7 },
        { x: -30, y: -76, s: 6 },
        { x: 34, y: -70, s: 8 },
      ].map((h, i) => (
        <Heart key={i} x={h.x} y={h.y} s={h.s} fill={ROSE} stroke={OUTLINE} strokeWidth={0.9} opacity={0.9} />
      ))}

      {/* The gate. */}
      <path
        d="M -12 30 L -12 15 C -12 4 12 4 12 15 L 12 30"
        fill="none"
        stroke={GOLD}
        strokeWidth={2.2}
      />
      <Heart x={0} y={9} s={9} fill={GOLD_LIT} stroke={OUTLINE} strokeWidth={0.9} />
    </g>
  )
}

/**
 * Legendary — Eternal Love Palace.
 *
 * Two enormous hearts locked through each other behind the keep, wings of
 * light thrown wide across the sky, and rose-gold energy running between the
 * towers. It floats on its own light.
 *
 * ⚠️ THE WINGS ARE NOT FEATHERED. Light's Celestial Palace already owns
 * feathers, and Cupid's Castle in this very kingdom owns gold ones. These are
 * bands of light — layered sweeps with soft ends, wider and lower than either
 * — so the three read as three different ideas at a glance.
 *
 * ⚠️ AND THE HEARTS ACTUALLY INTERLOCK. Two hearts overlapping is a sticker;
 * one passing THROUGH the other, near half over and far half under, is the
 * thing the brief asks for. Same far/near split as Electricity's rings.
 */
function EternalLovePalace({ eliminated, uid }: DecorProps) {
  const CY = -56

  return (
    <g className="skin skin--eternallove" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-el-outside-${uid}`} clipRule="evenodd">
        <path
          d="M -92 -128 L 92 -128 L 92 44 L -92 44 z
             M -53 -25 L 53 -25 L 53 31 L -53 31 z
             M -21 -59 L 21 -59 L 21 -25 L -21 -25 z"
          clipRule="evenodd"
        />
      </clipPath>
      <clipPath id={`skin-el-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      {/* The right heart's far half: everything left of its crossing point, so
          the left heart passes in front of it there. */}
      <clipPath id={`skin-el-far-${uid}`}>
        <rect x={-92} y={-128} width={92} height={172} />
      </clipPath>
      <clipPath id={`skin-el-near-${uid}`}>
        <rect x={0} y={-128} width={92} height={172} />
      </clipPath>
      <defs>
        {/* ⚠️ THE ROOT HAS TO BE NEARLY WHITE. Rose at 40% over a near-black
            battlefield is a smudge, and the first wings read as two dark
            shapes rather than as light — the same mistake as Dark's tendrils,
            in the opposite direction. Light is the brightest thing in a frame
            or it is not light. */}
        <linearGradient id={`skin-el-wing-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff8fb" stopOpacity="0.95" />
          <stop offset="30%" stopColor={GOLD_LIT} stopOpacity="0.6" />
          <stop offset="65%" stopColor={ROSE} stopOpacity="0.34" />
          <stop offset="100%" stopColor={ROSE} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`skin-el-heart-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff8ab8" />
          <stop offset="60%" stopColor={ROSE} />
          <stop offset="100%" stopColor="#c31d63" />
        </linearGradient>
        <radialGradient id={`skin-el-aura-${uid}`} gradientUnits="userSpaceOnUse" cx={0} cy={-30} r={104}>
          <stop offset="0%" stopColor="#fff3f8" stopOpacity="0.4" />
          <stop offset="40%" stopColor={ROSE} stopOpacity="0.2" />
          <stop offset="100%" stopColor={ROSE} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`skin-el-dome-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff6d8" />
          <stop offset="45%" stopColor={GOLD_LIT} />
          <stop offset="100%" stopColor={GOLD} />
        </linearGradient>
        <linearGradient id={`skin-el-terrace-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff2f7" />
          <stop offset="55%" stopColor="#f0cddd" />
          <stop offset="100%" stopColor="#c98fab" />
        </linearGradient>
        <radialGradient id={`skin-el-pad-${uid}`}>
          <stop offset="0%" stopColor="#fff3f8" stopOpacity="0.85" />
          <stop offset="45%" stopColor={ROSE} stopOpacity="0.35" />
          <stop offset="100%" stopColor={ROSE} stopOpacity="0" />
        </radialGradient>
      </defs>

      <g clipPath={`url(#skin-el-outside-${uid})`}>
        <g className="skin__aura">
          <circle cx={0} cy={-30} r={104} fill={`url(#skin-el-aura-${uid})`} />
        </g>

        {/* Wings of light: bands, not feathers. Each is drawn from a wide root
            to a soft end, and the rows overlap so the wing has an edge. */}
        {[-1, 1].map((side) => (
          <g key={side} transform={`scale(${side} 1)`}>
            <g className="skin__love-wing">
              {[
                { d: 'M 8 -36 C 42 -56 76 -72 98 -92 C 78 -58 48 -36 12 -25 z', o: 1, edge: 'M 8 -36 C 42 -56 76 -72 98 -92' },
                { d: 'M 8 -32 C 40 -46 74 -56 96 -64 C 74 -38 44 -22 10 -15 z', o: 0.9, edge: 'M 8 -32 C 40 -46 74 -56 96 -64' },
                { d: 'M 8 -28 C 36 -34 66 -38 90 -38 C 68 -16 40 -7 10 -5 z', o: 0.75, edge: 'M 8 -28 C 36 -34 66 -38 90 -38' },
              ].map((w, i) => (
                /* ⚠️ NO STROKED EDGE. A hard line along the top of a band of
                   light is a wire — the nebula lesson, and Ice's aurora before
                   it. Presence comes from drawing each band three times,
                   slightly turned, at a third of the strength: the overlaps
                   build a soft edge that a stroke can only fake. */
                <g key={i}>
                  {[-2.2, 0, 2.2].map((rot, j) => (
                    <g key={j} transform={`rotate(${rot} 8 -30)`}>
                      <path d={w.d} fill={`url(#skin-el-wing-${uid})`} opacity={w.o * 0.45} />
                    </g>
                  ))}
                </g>
              ))}
            </g>
          </g>
        ))}

        {/* ---- the two hearts ------------------------------------------ */}
        {/* Far half of the right heart. */}
        <g clipPath={`url(#skin-el-far-${uid})`}>
          <g className="skin__heartbeat" style={{ animationDelay: '0.35s' }}>
            <g transform={`translate(16 ${CY}) rotate(16)`}>
              <path d={heartPath(58)} fill={`url(#skin-el-heart-${uid})`} opacity={0.18} />
              <path d={heartPath(58)} fill="none" stroke={GOLD_DEEP} strokeWidth={6.5} opacity={0.9} />
            </g>
          </g>
        </g>
        {/* The left heart, whole.
            ⚠️ ONE RIBBON, NOT THREE STROKES. Each heart was a gold stroke, a
            rose stroke and a wash stacked on the same path, and three edges
            within two units of each other read as a printing error rather than
            as gilding. It is one band with a highlight inside it now — which is
            also what lets the interlock read, because a single clean edge is
            the only kind you can follow through a crossing. */}
        <g className="skin__heartbeat">
          <g transform={`translate(-16 ${CY}) rotate(-16)`}>
            <path d={heartPath(58)} fill={`url(#skin-el-heart-${uid})`} opacity={0.2} />
            <path d={heartPath(58)} fill="none" stroke={GOLD} strokeWidth={6.5} />
            <path d={heartPath(58)} fill="none" stroke="#fff6d8" strokeWidth={2} opacity={0.85} />
          </g>
        </g>
        {/* Near half of the right heart, drawn last so it crosses in front. */}
        <g clipPath={`url(#skin-el-near-${uid})`}>
          <g className="skin__heartbeat" style={{ animationDelay: '0.35s' }}>
            <g transform={`translate(16 ${CY}) rotate(16)`}>
              <path d={heartPath(58)} fill={`url(#skin-el-heart-${uid})`} opacity={0.2} />
              <path d={heartPath(58)} fill="none" stroke={GOLD} strokeWidth={6.5} />
              <path d={heartPath(58)} fill="none" stroke="#fff6d8" strokeWidth={2} opacity={0.85} />
            </g>
          </g>
        </g>
      </g>

      {/* ---- the palace --------------------------------------------------- */}
      <g clipPath={`url(#skin-el-wall-${uid})`}>
        <rect x={-52} y={-24} width={104} height={6} fill={GOLD} opacity={0.95} />
        <rect x={-52} y={24} width={104} height={6} fill={GOLD} opacity={0.95} />
        <rect x={-52} y={10} width={104} height={16} fill={ROSE} opacity={0.1} />
        {/* Recessed bays: a legendary wall with nothing on it reads as
            unfinished however good the things around it are. */}
        {[-47, 25].map((x, i) => (
          <g key={`bay${i}`}>
            <rect x={x} y={-12} width={22} height={30} fill="#fff3f8" opacity={0.35} />
            <rect x={x} y={-12} width={22} height={30} fill="none" stroke={GOLD} strokeWidth={1} opacity={0.8} />
            <Heart x={x + 11} y={-2} s={9} fill={ROSE} stroke={WINE_DEEP} strokeWidth={0.8} opacity={0.9} />
          </g>
        ))}
        {/* Rim light just inside the silhouette: the hearts behind the palace
            are the light source, and nothing said so. */}
        <rect
          x={-50.5}
          y={-22.5}
          width={101}
          height={51}
          rx={3}
          fill="none"
          stroke="#fff6d8"
          strokeWidth={1.3}
          opacity={0.4}
        />
        {/* Energy running up the seams. */}
        {[-38, -20, 20, 38].map((x, i) => (
          <g key={i} className="skin__aura" style={{ animationDelay: `${i * 0.6}s` }}>
            <path d={`M ${x} 24 L ${x} -18`} stroke={ROSE} strokeWidth={4} opacity={0.2} fill="none" />
            <path d={`M ${x} 24 L ${x} -18`} stroke="#fff3f8" strokeWidth={1.1} fill="none" />
          </g>
        ))}
      </g>

      {/* Energy flowing BETWEEN the towers.
          ⚠️ THE ARCS NEVER MOVE — only the gaps in them do. A ribbon of light
          swinging across the sprite would cover the silhouette; a marching dash
          on a static arc cannot, which is the rule Air's gale arcs set. */}
      {[
        { d: 'M -46 -30 C -30 -46 30 -46 46 -30', w: 2.4, dur: 5 },
        { d: 'M -24 -28 C -12 -38 12 -38 24 -28', w: 1.8, dur: 3.6 },
      ].map((a, i) => (
        <g key={i}>
          <path d={a.d} fill="none" stroke={ROSE} strokeWidth={a.w + 2.5} opacity={0.16} />
          <path
            className="skin__love-flow"
            style={{ animationDuration: `${a.dur}s` }}
            d={a.d}
            fill="none"
            stroke={GOLD_LIT}
            strokeWidth={a.w}
            strokeDasharray="9 7"
            strokeLinecap="round"
          />
        </g>
      ))}

      {/* ---- domes ------------------------------------------------------
          ⚠️ A LEGENDARY NEEDS A CROWN. Everything grand about this skin was
          happening AROUND the castle — hearts behind it, wings past it, light
          under it — while the castle itself was the stock silhouette with gold
          bands on it. Ogee domes are Love's own architecture (Romantic Palace
          set them), so borrowing them here ties the kingdom together and gives
          the eye somewhere to land between the hearts. */}
      {[
        { x: 0, base: -58, w: 16, h: 27 },
        { x: -46, base: -24, w: 9.5, h: 16 },
        { x: 46, base: -24, w: 9.5, h: 16 },
      ].map((d, i) => (
        <g key={i}>
          <path
            d={`M ${d.x - d.w} ${d.base}
                C ${d.x - d.w} ${d.base - d.h * 0.55} ${d.x - d.w * 0.5} ${d.base - d.h * 0.7} ${d.x} ${d.base - d.h}
                C ${d.x + d.w * 0.5} ${d.base - d.h * 0.7} ${d.x + d.w} ${d.base - d.h * 0.55} ${d.x + d.w} ${d.base} z`}
            fill={`url(#skin-el-dome-${uid})`}
            stroke={OUTLINE}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
          <path
            d={`M ${d.x - d.w * 0.55} ${d.base - d.h * 0.12} C ${d.x - d.w * 0.5} ${d.base - d.h * 0.6} ${d.x - d.w * 0.2} ${d.base - d.h * 0.8} ${d.x} ${d.base - d.h * 0.94}`}
            fill="none"
            stroke="#fff6d8"
            strokeWidth={1.4}
            opacity={0.8}
          />
          <rect
            x={d.x - d.w - 1.6}
            y={d.base - 1.2}
            width={(d.w + 1.6) * 2}
            height={3.2}
            fill={GOLD}
            stroke={OUTLINE}
            strokeWidth={0.8}
          />
          <Heart x={d.x} y={d.base - d.h - 4} s={i === 0 ? 8 : 6} fill={GOLD_LIT} stroke={OUTLINE} strokeWidth={0.8} />
        </g>
      ))}

      {/* Gilded battlements, from the sprite's real merlon centres. */}
      {/* ⚠️ ONLY THE MERLONS THE DOMES DO NOT STAND ON. The corner domes landed
          on x ±46, exactly where two of these hearts already were, and a finial
          growing out of another finial is clutter rather than richness. */}
      {[-24, 24].map((x, i) => (
        <Heart key={i} x={x} y={-30} s={8} fill={GOLD_LIT} stroke={OUTLINE} strokeWidth={0.9} />
      ))}
      {[-15, 15].map((x, i) => (
        <Heart key={i} x={x} y={-63} s={6} fill={GOLD_LIT} stroke={OUTLINE} strokeWidth={0.8} />
      ))}

      {/* The gate, open onto light. */}
      <g className="skin__aura">
        <path d="M -12 30 L -12 9 C -12 -2 12 -2 12 9 L 12 30 z" fill="#fff3f8" opacity={0.35} />
        <path
          d="M -12 30 L -12 9 C -12 -2 12 -2 12 9 L 12 30"
          fill="none"
          stroke={GOLD_LIT}
          strokeWidth={2.4}
        />
      </g>

      {/* ---- the terrace it floats on ------------------------------------
          ⚠️ A GLOW IS NOT A FOUNDATION. With only a pool of light under it the
          palace looked cropped off at the wall's foot; a marble tier with a
          gold lip and a broken underside gives it something to stand on, tells
          the eye where the object ends, and makes "floating" a thing you can
          see rather than a thing you are told. Same fix the Abyssal Throne's
          island made. */}
      <ellipse cx={0} cy={34} rx={64} ry={10} fill={`url(#skin-el-pad-${uid})`} />
      <path
        d="M -58 30 L 58 30 L 52 37 L 40 35 L 30 41 L 18 36 L 8 43 L -4 38
           L -14 43 L -24 36 L -34 41 L -44 35 L -52 37 z"
        fill={`url(#skin-el-terrace-${uid})`}
        stroke={GOLD}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      <path d="M -58 30 L 58 30" stroke="#fff6d8" strokeWidth={1.8} fill="none" opacity={0.85} />
      {['M -38 30 L -34 37', 'M -12 30 L -8 40', 'M 16 30 L 20 38', 'M 40 30 L 44 35'].map((d, i) => (
        <path key={i} d={d} stroke={ROSE} strokeWidth={1} fill="none" opacity={0.5} />
      ))}
      {[-50, -26, 10, 34, 54].map((x, i) => (
        <g key={i} className="skin__mote" style={{ animationDelay: `-${i * 1.2}s` }}>
          <g transform={`translate(${x} 43)`}>
            <path d={heartPath(i % 2 ? 5 : 6.5)} fill={ROSE} opacity={0.9} />
          </g>
        </g>
      ))}
    </g>
  )
}

export const LoveDecor = {
  'love.hearts': HeartPatternCastle,
  'love.romantic': RomanticPalace,
  'love.cupid': CupidsCastle,
  'love.eternal': EternalLovePalace,
}
