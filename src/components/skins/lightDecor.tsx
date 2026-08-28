import type { DecorProps } from './decor'
import './skins.css'

/**
 * Light's skin decorations.
 *
 * Drawn INSIDE the castle's local space, over the sprite — the keep occupies
 * roughly x −20…20, y −58…−12, the curtain wall x −52…52, y −24…30, and the
 * gate x −11…11, y 10…30. Anything here is layered on top of that.
 *
 * ⚠️ THE SILHOUETTE AND THE HUE ARE NOT NEGOTIABLE. Players pick out who is
 * attacking them from a small castle on a phone, often through fog. A skin may
 * add detail and texture; it may not obscure the shape, and it stays in Light's
 * white and gold.
 *
 * ⚠️ WHITE ON WHITE IS THE WHOLE DIFFICULTY HERE. Every other kingdom gets to
 * put a bright thing on a dark castle and call it a glow. Light's castle is
 * ALREADY the bright thing, so a pale glow laid over it disappears — the same
 * way Ice's frozen falls vanished into an ice-blue wall. Everything that is
 * meant to read as lit is therefore drawn against gold or against a warm
 * shadow, never against the white, and the detailing is gold rather than
 * white-on-white.
 *
 * ⚠️ ONE STROKED OUTLINE PER OBJECT. Everything inside it is an unstroked fill.
 */

const GOLD = '#e3b03c'
const GOLD_LIT = '#ffeba8'
const GOLD_DEEP = '#a2701a'
const MARBLE = '#fdfbf2'
const MARBLE_SHADE = '#ded7c2'
const OUTLINE = '#5c4413'

/**
 * A sunburst.
 *
 * ⚠️ RAY LENGTHS ALTERNATE, AND THAT IS NOT DECORATION. Nature's first
 * mushroom cap came out as a sunflower and Electricity's first hub came out as
 * a gear, both for the same reason: identical spokes at identical angles read
 * as a machined part. Long/short alternation and a taper to a point are what
 * make this a burst of light instead.
 */
function sunburst(
  cx: number,
  cy: number,
  inner: number,
  long: number,
  short: number,
  count: number,
  color: string,
  opacity = 1,
) {
  const rays = Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2
    const len = i % 2 === 0 ? long : short
    const w = i % 2 === 0 ? 0.16 : 0.11
    const tip = [Math.cos(a) * len, Math.sin(a) * len]
    const l = [Math.cos(a - w) * inner, Math.sin(a - w) * inner]
    const r = [Math.cos(a + w) * inner, Math.sin(a + w) * inner]
    return `M ${l[0].toFixed(2)} ${l[1].toFixed(2)} L ${tip[0].toFixed(2)} ${tip[1].toFixed(2)} L ${r[0].toFixed(2)} ${r[1].toFixed(2)} z`
  })
  return (
    <g transform={`translate(${cx} ${cy})`} opacity={opacity}>
      {rays.map((d, i) => (
        <path key={i} d={d} fill={color} />
      ))}
    </g>
  )
}

/**
 * Uncommon — Radiant Lines.
 *
 * The standard castle with light run through it: glowing channels cut into the
 * stone, a sunburst on the keep, and lit accents on the battlements.
 *
 * The lightest possible touch, like Water's Rippled Castle and Space's Star
 * Pattern: everything is clipped to the walls and the keep, so the silhouette
 * is exactly the default one.
 */
function RadiantLines({ eliminated, uid }: DecorProps) {
  /**
   * ⚠️ MERLON POSITIONS ARE COPIED FROM THE SPRITE, NOT EYEBALLED. The wall's
   * battlements sit at x −52, −30, 18 and 40 with a width of 12, so their
   * centres are −46, −24, 24 and 46 — not the tidy ±30/±46 a symmetric castle
   * suggests, because the sprite's own battlements are not symmetric. Guessing
   * put two accents half a merlon off, which is the same mistake that left
   * Electricity's circuit nodes overlapping.
   */
  const WALL_MERLONS = [-46, -24, 24, 46]
  const KEEP_MERLONS = [-15, 0, 15]

  return (
    <g className="skin skin--radiantlines" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-rl-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-rl-keep-${uid}`}>
        <rect x={-21} y={-59} width={42} height={48} rx={3} />
      </clipPath>

      {/* ---- the wall ---------------------------------------------------
          ⚠️ EVERY LINE HERE RADIATES. The first build ran two rails along the
          wall and joined them with uprights, and a grid of horizontals and
          verticals is a railing — it read as a balcony rather than as light in
          the stone. Trim lines now run one way only, and everything else fans
          out of a centre. */}
      <g clipPath={`url(#skin-rl-wall-${uid})`}>
        {[-19, 26].map((y, i) => (
          <g key={i}>
            <path d={`M -52 ${y + 1} L 52 ${y + 1}`} stroke={MARBLE_SHADE} strokeWidth={2} fill="none" />
            <path d={`M -52 ${y} L 52 ${y}`} stroke={GOLD} strokeWidth={1.5} fill="none" />
            <path d={`M -52 ${y} L 52 ${y}`} stroke={GOLD_LIT} strokeWidth={0.5} fill="none" />
          </g>
        ))}

        {/* A burst in the middle of each stretch of wall, clear of the gate.
            ⚠️ NO RING AROUND IT. A circle with evenly spaced spokes crossing it
            is a ship's wheel, and that is exactly what the first pass looked
            like. The rays start outside the hub instead of running through
            one. */}
        {[-32, 32].map((x, i) => (
          <g key={i}>
            {sunburst(x, 4, 6, 18, 10.5, 16, GOLD, 0.6)}
            <circle cx={x} cy={4} r={4.6} fill={GOLD_LIT} stroke={OUTLINE} strokeWidth={1} />
            <circle cx={x} cy={4} r={1.8} fill={GOLD} />
          </g>
        ))}
      </g>

      {/* ---- the keep: the big burst ----------------------------------- */}
      <g clipPath={`url(#skin-rl-keep-${uid})`}>
        {sunburst(0, -34, 4.6, 15, 9, 16, GOLD, 0.7)}
        <circle cx={0} cy={-34} r={5.4} fill={GOLD_LIT} stroke={OUTLINE} strokeWidth={1} />
        <circle cx={0} cy={-34} r={2.4} fill={GOLD} />
        <path d="M -13 -19 L 13 -19" stroke={GOLD} strokeWidth={1.3} fill="none" />
      </g>

      {/* ---- lit battlements ------------------------------------------- */}
      {WALL_MERLONS.map((x, i) => (
        <path
          key={i}
          d={`M ${x} -30.6 L ${x + 3.1} -26 L ${x} -21.4 L ${x - 3.1} -26 z`}
          fill={GOLD_LIT}
          stroke={GOLD_DEEP}
          strokeWidth={0.9}
        />
      ))}
      {KEEP_MERLONS.map((x, i) => (
        <path
          key={i}
          d={`M ${x} -62.4 L ${x + 2.6} -59 L ${x} -55.6 L ${x - 2.6} -59 z`}
          fill={GOLD_LIT}
          stroke={GOLD_DEEP}
          strokeWidth={0.8}
        />
      ))}

      {/* ---- the gate arch, traced in gold ----------------------------- */}
      <path
        d="M -12 30 L -12 15 C -12 4 12 4 12 15 L 12 30"
        fill="none"
        stroke={GOLD}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d="M -12 30 L -12 15 C -12 4 12 4 12 15 L 12 30"
        fill="none"
        stroke={GOLD_LIT}
        strokeWidth={0.7}
        strokeLinecap="round"
      />
    </g>
  )
}

/**
 * Rare — Solar Temple.
 *
 * A white-and-gold temple built around a giant sun: a colonnade standing off
 * the wall, a pediment over the gate, and the disc itself rising behind the
 * keep with its beams thrown out past the walls.
 *
 * ⚠️ THE ARCHES ARE STRUCTURES, NOT HOLES. Ice's first palace cut arch shapes
 * into the curtain wall and every one of them read as a garage door. These are
 * built instead: each has two columns with a base and a capital, it stands
 * proud of the wall with its own shadow cast onto the masonry behind it, and
 * the wall stays visible through the opening.
 *
 * ⚠️ AND THE BEAMS ARE FILLED, NOT STROKED. A stroke has hard edges, and a
 * hard-edged band of light is a ribbon — the lesson Ice's aurora took three
 * tries to learn. Each beam is a wedge with a gradient down its length.
 */
function SolarTemple({ eliminated, uid }: DecorProps) {
  /* The sun's centre. High enough that its crown clears the keep and its beams
     reach the open corners of the frame, low enough that the disc still reads
     as sitting behind the fortress rather than floating above it. */
  const SX = 0
  const SY = -54
  const R = 42

  /* One arch, twice: a pair of columns with a span between them. The `dir`
     just mirrors the shadow, which always falls away from the gate. */
  const arch = (x0: number, x1: number, dir: 1 | -1, key: number) => {
    const top = -12
    const mid = (x0 + x1) / 2
    const rise = 13
    return (
      <g key={key}>
        {/* Cast shadow on the wall behind, which is what puts the colonnade in
            front of it rather than painted onto it. */}
        <path
          d={`M ${x0 + 3 * dir} ${top} L ${x0 + 3 * dir} 30 L ${x0 + 6.5 * dir} 30 L ${x0 + 6.5 * dir} ${top} z
              M ${x1 + 3 * dir} ${top} L ${x1 + 3 * dir} 30 L ${x1 + 6.5 * dir} 30 L ${x1 + 6.5 * dir} ${top} z`}
          fill={MARBLE_SHADE}
          opacity={0.75}
        />
        {/* The span. */}
        <path
          d={`M ${x0} ${top} Q ${mid} ${top - rise} ${x1} ${top}
              L ${x1} ${top - 4} Q ${mid} ${top - rise - 5} ${x0} ${top - 4} z`}
          fill={MARBLE}
          stroke={OUTLINE}
          strokeWidth={1.1}
        />
        <path
          d={`M ${x0} ${top - 4} Q ${mid} ${top - rise - 5} ${x1} ${top - 4}`}
          fill="none"
          stroke={GOLD}
          strokeWidth={1.4}
        />
        {[x0, x1].map((cx, i) => (
          <g key={i}>
            {/* Shaft, capital, base — a column is three pieces or it is a
                stick. */}
            <path
              d={`M ${cx - 2.6} ${top} L ${cx - 2.2} 26 L ${cx + 2.2} 26 L ${cx + 2.6} ${top} z`}
              fill={MARBLE}
              stroke={OUTLINE}
              strokeWidth={1.1}
            />
            <path
              d={`M ${cx - 1.1} ${top + 3} L ${cx - 0.9} 24`}
              stroke={MARBLE_SHADE}
              strokeWidth={0.8}
              fill="none"
            />
            <path
              d={`M ${cx + 1.1} ${top + 3} L ${cx + 0.9} 24`}
              stroke={MARBLE_SHADE}
              strokeWidth={0.8}
              fill="none"
            />
            <rect
              x={cx - 4}
              y={top - 3.4}
              width={8}
              height={3.6}
              fill={GOLD}
              stroke={OUTLINE}
              strokeWidth={1}
            />
            <rect
              x={cx - 4.4}
              y={26}
              width={8.8}
              height={4}
              fill={GOLD}
              stroke={OUTLINE}
              strokeWidth={1}
            />
          </g>
        ))}
      </g>
    )
  }

  return (
    <g className="skin skin--solartemple" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      {/* "Everywhere except the castle": an even-odd clip of the frame minus
          the wall and the keep, so the sun passes BEHIND the fortress. Without
          it the disc lands on top and the temple turns into a sticker. */}
      <clipPath id={`skin-st-outside-${uid}`} clipRule="evenodd">
        <path
          d="M -92 -128 L 92 -128 L 92 44 L -92 44 z
             M -53 -25 L 53 -25 L 53 31 L -53 31 z
             M -21 -59 L 21 -59 L 21 -25 L -21 -25 z"
          clipRule="evenodd"
        />
      </clipPath>
      <clipPath id={`skin-st-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <defs>
        <linearGradient id={`skin-st-beam-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={GOLD_LIT} stopOpacity="0.55" />
          <stop offset="45%" stopColor={GOLD} stopOpacity="0.22" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`skin-st-disc-${uid}`}>
          <stop offset="0%" stopColor="#fffdf2" />
          <stop offset="58%" stopColor={GOLD_LIT} />
          <stop offset="100%" stopColor={GOLD} />
        </radialGradient>
        <linearGradient id={`skin-st-dome-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={GOLD_LIT} />
          <stop offset="42%" stopColor={GOLD} />
          <stop offset="100%" stopColor={GOLD_DEEP} />
        </linearGradient>
        <radialGradient id={`skin-st-halo-${uid}`}>
          <stop offset="55%" stopColor={GOLD_LIT} stopOpacity="0.35" />
          <stop offset="100%" stopColor={GOLD_LIT} stopOpacity="0" />
        </radialGradient>
      </defs>

      <g clipPath={`url(#skin-st-outside-${uid})`}>
        <circle cx={SX} cy={SY} r={R * 1.75} fill={`url(#skin-st-halo-${uid})`} />

        {/* Beams. Drawn pointing +x and rotated into place, so each one's
            gradient runs down its own length.

            ⚠️ THEY END INSIDE THE FRAME. The first pass ran them to a radius of
            116 from a centre that has only 74 above it and 92 to the side, so
            every beam hit the frame and stopped in a straight cut — light that
            ends in a hard line is a blade. The longest now finishes at 72.

            ⚠️ AND EACH IS DRAWN TWICE, slightly turned, at half strength. A
            single filled wedge has a crisp edge down both sides whatever its
            fill does; overlapping two is what softens it without a blur
            filter. */}
        {Array.from({ length: 16 }, (_, i) => {
          const long = i % 2 === 0
          const len = long ? 30 : 17
          const w = long ? 5.4 : 3.2
          return (
            <g key={i} transform={`rotate(${(i / 16) * 360 + 11.25} ${SX} ${SY})`}>
              {[-1.6, 1.6].map((off, j) => (
                <g key={j} transform={`rotate(${off} ${SX} ${SY})`} opacity={0.6}>
                  <path
                    d={`M ${SX + R - 6} ${SY - w} L ${SX + R + len} ${SY} L ${SX + R - 6} ${SY + w} z`}
                    fill={`url(#skin-st-beam-${uid})`}
                  />
                </g>
              ))}
            </g>
          )
        })}

        <circle
          cx={SX}
          cy={SY}
          r={R}
          fill={`url(#skin-st-disc-${uid})`}
          stroke={GOLD_DEEP}
          strokeWidth={1.6}
        />
        {/* Two rings inside the rim, so the disc is a symbol rather than a
            blob. The first build also engraved a ring of rays across its face,
            which at this size read as the teeth of a gear. */}
        <circle cx={SX} cy={SY} r={R - 6} fill="none" stroke={GOLD} strokeWidth={1.8} opacity={0.75} />
        <circle cx={SX} cy={SY} r={R - 11} fill="none" stroke={GOLD} strokeWidth={0.9} opacity={0.5} />
      </g>

      {/* ---- marble facing on the wall --------------------------------- */}
      <g clipPath={`url(#skin-st-wall-${uid})`}>
        <rect x={-52} y={-24} width={104} height={54} fill={MARBLE} opacity={0.92} />
        <rect x={-52} y={-24} width={104} height={5} fill={GOLD} opacity={0.9} />
        <path d="M -52 -18.6 L 52 -18.6" stroke={GOLD_DEEP} strokeWidth={0.8} fill="none" />
        <rect x={-52} y={26} width={104} height={4} fill={GOLD} opacity={0.9} />
        {/* Courses, faint — marble is not a flat sheet. */}
        {[-6, 6, 18].map((y, i) => (
          <path key={i} d={`M -52 ${y} L 52 ${y}`} stroke={MARBLE_SHADE} strokeWidth={0.7} fill="none" />
        ))}
      </g>

      {/* ---- the colonnade, standing off the wall ---------------------- */}
      {arch(-44, -20, -1, 0)}
      {arch(20, 44, 1, 1)}

      {/* ---- the pediment over the gate -------------------------------- */}
      <path
        d="M -26 -14 L 0 -33 L 26 -14 z"
        fill={MARBLE}
        stroke={OUTLINE}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <path d="M -26 -14 L 0 -33 L 26 -14" fill="none" stroke={GOLD} strokeWidth={1.6} />
      <rect x={-28} y={-14} width={56} height={4.4} fill={GOLD} stroke={OUTLINE} strokeWidth={1.1} />
      {sunburst(0, -19, 3, 9, 5.5, 12, GOLD, 0.85)}
      <circle cx={0} cy={-19} r={3.4} fill={GOLD_LIT} stroke={GOLD_DEEP} strokeWidth={0.9} />

      {/* ---- the gate: gilded doors ------------------------------------ */}
      <path
        d="M -11 30 L -11 15 C -11 5 11 5 11 15 L 11 30 z"
        fill={MARBLE}
        stroke={OUTLINE}
        strokeWidth={1.2}
      />
      <path d="M 0 30 L 0 8.5" stroke={GOLD_DEEP} strokeWidth={1} fill="none" />
      <path
        d="M -11 30 L -11 15 C -11 5 11 5 11 15 L 11 30"
        fill="none"
        stroke={GOLD}
        strokeWidth={2}
      />
      {sunburst(0, 17, 2, 7, 4.2, 12, GOLD, 0.75)}
      <circle cx={0} cy={17} r={2.6} fill={GOLD_LIT} stroke={GOLD_DEEP} strokeWidth={0.8} />

      {/* ---- the dome ---------------------------------------------------
          Wide, on a drum, with ribs and a lantern. ⚠️ A DOME NEEDS ITS DRUM. Set
          straight onto the keep the curve reads as a bubble stuck to the roof;
          the short cylinder under it is what makes it architecture. And the
          ribs converge on the finial rather than running parallel, or the
          curve flattens out into a bonnet. */}
      <rect x={-21} y={-63} width={42} height={7} fill={MARBLE} stroke={OUTLINE} strokeWidth={1.1} />
      <path d="M -21 -60.5 L 21 -60.5" stroke={GOLD} strokeWidth={1.1} fill="none" />
      {/* A cornice, because a wide dome overhangs its drum and needs somewhere
          to land. */}
      <path
        d="M -25 -63 L 25 -63 L 22 -66.5 L -22 -66.5 z"
        fill={GOLD}
        stroke={OUTLINE}
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
      <path
        d="M -25 -66 C -25 -84 -14 -92 0 -92 C 14 -92 25 -84 25 -66 z"
        fill={`url(#skin-st-dome-${uid})`}
        stroke={OUTLINE}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      {[-16, -8, 0, 8, 16].map((x, i) => (
        <path
          key={i}
          d={`M ${x} -66 C ${x} -82 ${x * 0.4} -90.4 0 -91.4`}
          fill="none"
          stroke={GOLD_DEEP}
          strokeWidth={0.9}
          opacity={0.6}
        />
      ))}
      <path
        d="M -21 -73 C -20.4 -84 -11 -90.4 -2.5 -91"
        fill="none"
        stroke={GOLD_LIT}
        strokeWidth={2}
        opacity={0.85}
      />
      {/* Lantern and finial. */}
      <rect x={-4} y={-97.5} width={8} height={6} fill={GOLD} stroke={OUTLINE} strokeWidth={1} />
      <circle cx={0} cy={-101.4} r={3.2} fill={GOLD_LIT} stroke={OUTLINE} strokeWidth={1} />
      {sunburst(0, -101.4, 3.4, 9, 5.4, 12, GOLD_LIT, 0.9)}
    </g>
  )
}

/**
 * Rare — Crystal Cathedral.
 *
 * The castle rebuilt as a cathedral in white crystal: lancet windows and a
 * rose window glazed in colour, flying buttresses standing off both walls,
 * spires above the roofline, and the light coming through all of it pooling on
 * the ground below.
 *
 * ⚠️ IT MUST NOT BE ICE'S PALACE. Ice already owns crystal castles, and a
 * white faceted fortress is exactly what that skin is. The separation is
 * colour and architecture together: Ice is blue-white, hard-edged and opaque —
 * this is warm white with COLOURED glass in it, and it is built out of things
 * Ice has none of, which is to say windows, tracery and buttresses. A player
 * who cannot tell them apart at 60% is the failure condition.
 *
 * ⚠️ THE WINDOWS ARE SET INTO THE WALL, NOT LAID ON IT. Ice's first attempt
 * put crystals on the masonry and every one read as a sticker. Each window
 * here has a recess, a sill and a frame, and the glass sits behind the frame.
 */
function CrystalCathedral({ eliminated, uid }: DecorProps) {
  const CRYSTAL = '#f7f4ea'
  const CRYSTAL_DEEP = '#cfc7b4'
  /* ⚠️ ONE STEP OFF FULL SATURATION. Pure hues at this size read as a toy —
     the same trap Fire's first ember palette fell into. Real glass is deep and
     slightly greyed, and it also has to sit under a warm white castle without
     turning the whole thing into a beach ball. */
  const RUBY = '#a8425a'
  const SAPPHIRE = '#3a67ad'
  const EMERALD = '#3c8a68'
  const AMBER = '#d09a34'
  const GLASS = [RUBY, SAPPHIRE, AMBER, EMERALD]

  /** A lancet: pointed arch, frame, glass, mullion. */
  const lancet = (x: number, key: number, a: string, b: string) => (
    <g key={key}>
      {/* Recess, so the window is a hole in the wall rather than a decal. */}
      <path
        d={`M ${x - 5.6} 20 L ${x - 5.6} -2 Q ${x} -15.5 ${x + 5.6} -2 L ${x + 5.6} 20 z`}
        fill={CRYSTAL_DEEP}
      />
      <path
        d={`M ${x - 4.6} 19 L ${x - 4.6} -1.5 Q ${x} -13.5 ${x + 4.6} -1.5 L ${x + 4.6} 19 z`}
        fill={a}
      />
      <path
        d={`M ${x} 19 L ${x} -12.6 Q ${x + 4.6} -1.5 ${x + 4.6} -1.5 L ${x + 4.6} 19 z`}
        fill={b}
        opacity={0.9}
      />
      {/* Mullion and transom: the lead that makes it glass and not paint. */}
      <path d={`M ${x} 19 L ${x} -13`} stroke={CRYSTAL} strokeWidth={1} fill="none" />
      <path d={`M ${x - 4.4} 8 L ${x + 4.4} 8`} stroke={CRYSTAL} strokeWidth={0.9} fill="none" />
      <path
        d={`M ${x - 4.6} 19 L ${x - 4.6} -1.5 Q ${x} -13.5 ${x + 4.6} -1.5 L ${x + 4.6} 19`}
        fill="none"
        stroke={GOLD}
        strokeWidth={1.3}
      />
      {/* Sill. */}
      <rect x={x - 6.6} y={19} width={13.2} height={2.6} fill={GOLD} stroke={OUTLINE} strokeWidth={0.8} />
    </g>
  )

  /** A spire: a facet down the middle so it reads as crystal, not as a cone. */
  const spire = (x: number, base: number, h: number, w: number, key: number) => (
    <g key={key}>
      <path
        d={`M ${x - w} ${base} L ${x} ${base - h} L ${x + w} ${base} z`}
        fill={`url(#skin-cc-spire-${uid})`}
        stroke={OUTLINE}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <path d={`M ${x} ${base} L ${x} ${base - h}`} stroke={CRYSTAL} strokeWidth={0.9} fill="none" opacity={0.9} />
      <path
        d={`M ${x - w} ${base} L ${x} ${base - h * 0.55}`}
        stroke={CRYSTAL_DEEP}
        strokeWidth={0.8}
        fill="none"
      />
      <circle cx={x} cy={base - h - 2.4} r={1.8} fill={GOLD_LIT} stroke={OUTLINE} strokeWidth={0.8} />
    </g>
  )

  /**
   * A flying buttress: pier, arc, and a pinnacle on top.
   *
   * ⚠️ IT STANDS AWAY FROM THE WALL. The whole point of a buttress is the gap
   * between it and the building; drawn flush it is just a thicker wall, and
   * drawn as a line it is a stick. Pier at x, arc reaching back to the wall.
   */
  const buttress = (dir: 1 | -1, key: number) => {
    const px = 62 * dir
    return (
      <g key={key}>
        {/* The pier, stepped rather than tapered: a smooth taper with a point
            on top is a candle, which is what the first pass looked like. */}
        <path
          d={`M ${px - 5 * dir} 30 L ${px - 4 * dir} 6 L ${px + 4.2 * dir} 6 L ${px + 5.6 * dir} 30 z`}
          fill={CRYSTAL}
          stroke={OUTLINE}
          strokeWidth={1.1}
        />
        <path
          d={`M ${px - 3.4 * dir} 6 L ${px - 2.8 * dir} -8 L ${px + 3 * dir} -8 L ${px + 3.6 * dir} 6 z`}
          fill={CRYSTAL}
          stroke={OUTLINE}
          strokeWidth={1.1}
        />
        <path d={`M ${px - 4 * dir} 6 L ${px + 4.2 * dir} 6`} stroke={GOLD} strokeWidth={1.2} fill="none" />
        {/* Pinnacle. */}
        <path
          d={`M ${px - 3 * dir} -8 L ${px + 0.2 * dir} -20 L ${px + 3.4 * dir} -8 z`}
          fill={CRYSTAL}
          stroke={OUTLINE}
          strokeWidth={1}
          strokeLinejoin="round"
        />
        {/* A niche in the pier: an unbroken white shaft is a candle, which is
            what the first two passes looked like. */}
        <path
          d={`M ${px - 1.6 * dir} 24 L ${px - 1.4 * dir} 15 Q ${px + 0.6 * dir} 11 ${px + 2.4 * dir} 15 L ${px + 2.6 * dir} 24 z`}
          fill={CRYSTAL_DEEP}
          opacity={0.85}
        />
        {/* The flyer: two curves closed into a band, so it has depth like
            masonry — a single stroke is a stick. The gap between the pier and
            the wall is the entire point of a buttress; drawn flush it is just
            a thicker wall, so the underside is shaded to hold the gap open. */}
        <path
          d={`M ${px - 2.4 * dir} -7 Q ${px - 16 * dir} -20 ${51 * dir} -20
              L ${51 * dir} -11 Q ${px - 11 * dir} -11 ${px - 1.4 * dir} 3 z`}
          fill={CRYSTAL}
          stroke={OUTLINE}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
        <path
          d={`M ${51 * dir} -11 Q ${px - 11 * dir} -11 ${px - 1.4 * dir} 3`}
          fill="none"
          stroke={CRYSTAL_DEEP}
          strokeWidth={2}
          opacity={0.9}
        />
        <path
          d={`M ${px - 2.4 * dir} -7 Q ${px - 16 * dir} -20 ${51 * dir} -20`}
          fill="none"
          stroke={GOLD}
          strokeWidth={1.3}
          opacity={0.9}
        />
      </g>
    )
  }

  return (
    <g className="skin skin--crystalcathedral" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-cc-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-cc-keep-${uid}`}>
        <rect x={-21} y={-59} width={42} height={48} rx={3} />
      </clipPath>
      <defs>
        <linearGradient id={`skin-cc-spire-${uid}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={CRYSTAL_DEEP} />
          <stop offset="60%" stopColor={CRYSTAL} />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
        <linearGradient id={`skin-cc-facet-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="100%" stopColor={CRYSTAL_DEEP} stopOpacity="0.35" />
        </linearGradient>
        {GLASS.map((c, i) => (
          <radialGradient key={i} id={`skin-cc-pool-${uid}-${i}`}>
            <stop offset="0%" stopColor={c} stopOpacity="0.85" />
            <stop offset="55%" stopColor={c} stopOpacity="0.4" />
            <stop offset="100%" stopColor={c} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>

      {/* ---- light on the ground ---------------------------------------
          What comes THROUGH the windows, which is the difference between a
          cathedral and a white castle. Set below the footing so it reads as
          floor rather than as a stain on the wall. */}
      {[
        { x: -44, y: 36, rx: 20, ry: 7.5, g: 1 },
        { x: -16, y: 39, rx: 15, ry: 6, g: 0 },
        { x: 18, y: 38, rx: 17, ry: 6.6, g: 3 },
        { x: 46, y: 35, rx: 16, ry: 6.2, g: 2 },
      ].map((p, i) => (
        <ellipse key={i} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill={`url(#skin-cc-pool-${uid}-${p.g})`} />
      ))}

      {/* ---- buttresses, standing off the walls ------------------------ */}
      {buttress(-1, 0)}
      {buttress(1, 1)}

      {/* ---- spires above the roofline --------------------------------- */}
      {spire(-46, -20, 26, 6, 0)}
      {spire(46, -20, 26, 6, 1)}
      {spire(-27, -20, 34, 5.5, 2)}
      {spire(27, -20, 34, 5.5, 3)}
      {spire(0, -56, 36, 7.5, 4)}

      {/* ---- the wall: crystal, then glass ----------------------------- */}
      <g clipPath={`url(#skin-cc-wall-${uid})`}>
        {/* Facets. Long and vertical, because a cathedral wall is a set of
            bays — square facets would read as brickwork. */}
        {[-52, -38, -24, 10, 24, 38].map((x, i) => (
          <path
            key={i}
            d={`M ${x} -24 L ${x + 13} -24 L ${x + 9} 30 L ${x - 3} 30 z`}
            fill={`url(#skin-cc-facet-${uid})`}
            opacity={i % 2 ? 0.5 : 0.75}
          />
        ))}
        <path d="M -52 -19 L 52 -19" stroke={GOLD} strokeWidth={1.4} fill="none" opacity={0.85} />
        <path d="M -52 26 L 52 26" stroke={GOLD} strokeWidth={1.4} fill="none" opacity={0.85} />
        {lancet(-40, 0, RUBY, SAPPHIRE)}
        {lancet(-22, 1, AMBER, EMERALD)}
        {lancet(22, 2, EMERALD, AMBER)}
        {lancet(40, 3, SAPPHIRE, RUBY)}
      </g>

      {/* ---- the rose window ------------------------------------------- */}
      <g clipPath={`url(#skin-cc-keep-${uid})`}>
        <circle cx={0} cy={-35} r={14.5} fill={CRYSTAL_DEEP} />
        <circle cx={0} cy={-35} r={13} fill="#241f14" />
        {/* ⚠️ NOT TWELVE EQUAL WEDGES. Equal segments in rotating colours is a
            colour wheel — which is exactly what the first build looked like. A
            rose window is a hierarchy: a medallion at the middle, a ring of
            small lights around it, and a ring of larger petals outside those,
            all held in white tracery. The size difference between the rings is
            what makes it architecture rather than a chart. */}
        {Array.from({ length: 8 }, (_, i) => {
          /* Placed by rotating one upright petal rather than by computing a
             point for each, so all eight are identical and the ring cannot
             drift out of true. */
          const fill = i % 2 === 0 ? SAPPHIRE : i % 4 === 1 ? RUBY : AMBER
          return (
            <g key={i} transform={`rotate(${((i / 8) * 360).toFixed(1)} 0 -35)`}>
              <path
                d="M 0 -29.6 Q 4.6 -37 0 -46.2 Q -4.6 -37 0 -29.6 z"
                fill={fill}
                stroke={CRYSTAL}
                strokeWidth={1}
              />
            </g>
          )
        })}
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2
          return (
            <circle
              key={i}
              cx={Math.cos(a) * 5.2}
              cy={-35 + Math.sin(a) * 5.2}
              r={1.9}
              fill={i % 2 ? AMBER : EMERALD}
              stroke={CRYSTAL}
              strokeWidth={0.8}
            />
          )
        })}
        <circle cx={0} cy={-35} r={2.6} fill={GOLD_LIT} stroke={OUTLINE} strokeWidth={0.9} />
        <circle cx={0} cy={-35} r={13} fill="none" stroke={CRYSTAL} strokeWidth={1.4} />
        <circle cx={0} cy={-35} r={13} fill="none" stroke={GOLD} strokeWidth={1.8} opacity={0.9} />
        {/* Two small lancets under it, so the keep is a west front. */}
        {[-9, 9].map((x, i) => (
          <g key={i}>
            <path
              d={`M ${x - 3.2} -12 L ${x - 3.2} -17 Q ${x} -22.5 ${x + 3.2} -17 L ${x + 3.2} -12 z`}
              fill={i ? SAPPHIRE : RUBY}
              stroke={GOLD}
              strokeWidth={1}
            />
          </g>
        ))}
      </g>

      {/* ---- the gate, given a point ----------------------------------- */}
      <path
        d="M -11.5 30 L -11.5 12 Q 0 -4 11.5 12 L 11.5 30"
        fill="none"
        stroke={GOLD}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      <path
        d="M -7 30 L -7 13 Q 0 2 7 13 L 7 30 z"
        fill={AMBER}
        opacity={0.5}
        stroke={GOLD}
        strokeWidth={1}
      />
      <path d="M 0 30 L 0 5" stroke={CRYSTAL} strokeWidth={1} fill="none" opacity={0.8} />
    </g>
  )
}

/**
 * Legendary — Celestial Palace.
 *
 * A palace of light: wings thrown out behind it, halos standing over the keep,
 * a fan of beams turning slowly behind everything, and the ground gone — it
 * rests on light instead.
 *
 * ⚠️ THE WINGS ARE ROWS, NOT A ROW. Fire's phoenix took four attempts —
 * candles, then loops, then a saw blade, then tapered feathers — and what
 * finally worked was overlapping ROWS of different lengths with a curved
 * leading edge. One row of shapes fanned out of a point is a hand of cards
 * whatever the shapes are.
 *
 * ⚠️ AND THEY GO BEHIND THE CASTLE. Wings that pass in front cover the
 * silhouette, which is the one thing a skin may never do.
 */
function CelestialPalace({ eliminated, uid }: DecorProps) {
  const HALO = '#ffe9a8'

  /**
   * The wing.
   *
   * ⚠️ FEATHERS GROW ALONG AN ARM. They do NOT radiate from the shoulder.
   * Fanning them all out of one point is what made the first build a sea
   * urchin — and it is the same failure as Fire's phoenix, which went through
   * candles, loops and a saw blade before rows-along-a-bone finally read as a
   * wing. The bases march out along a curved arm, the lengths grow toward the
   * tip, and the sweep tightens as they go, so the tips trace a trailing edge.
   *
   * ⚠️ AND IT NEEDS A MEMBRANE. Feathers alone are a comb; the filled body of
   * light between the arm and the tips is what gives the wing mass.
   */
  /* ⚠️ THE WING GOES UP, NOT SIDEWAYS, AND THE FRAME IS WHY. From a shoulder
     at x 16 there are only 76 units of room to the frame edge but 110 above,
     and the primaries add their whole length on top of wherever the arm ends —
     a wing that reaches outward runs its tips off the edge and gets sliced
     square, which is what the first two sets of numbers did. Swept up and out
     instead, the same span of feather fits with room to spare and the wing
     reads as raised rather than as clipped. These extents are computed, not
     judged: tips reach x 85 of 89 and y −115 of −124. */
  const ARM = { c: [12, -40] as const, t: [34, -70] as const }

  /** A point on the arm, and the direction it is heading there. */
  const armAt = (u: number) => {
    const x = 2 * (1 - u) * u * ARM.c[0] + u * u * ARM.t[0]
    const y = 2 * (1 - u) * u * ARM.c[1] + u * u * ARM.t[1]
    const dx = 2 * (1 - u) * ARM.c[0] + 2 * u * (ARM.t[0] - ARM.c[0])
    const dy = 2 * (1 - u) * ARM.c[1] + 2 * u * (ARM.t[1] - ARM.c[1])
    return { x, y, deg: (Math.atan2(dy, dx) * 180) / Math.PI }
  }

  /** One feather: broad at the base, rounded at the tip. */
  const feather = (len: number, w: number) =>
    `M 0 0 C ${(len * 0.3).toFixed(1)} ${-w} ${(len * 0.78).toFixed(1)} ${(-w * 0.62).toFixed(1)} ${len.toFixed(1)} 0
     C ${(len * 0.78).toFixed(1)} ${(w * 0.72).toFixed(1)} ${(len * 0.3).toFixed(1)} ${(w * 0.95).toFixed(1)} 0 0 z`

  const ROWS = [
    /* primaries — the long ones off the outer arm */
    { n: 7, u0: 0.55, u1: 1, len0: 34, len1: 44, sweep0: 40, sweep1: 16, o: 0.72 },
    /* secondaries */
    { n: 6, u0: 0.25, u1: 0.62, len0: 26, len1: 34, sweep0: 62, sweep1: 44, o: 0.82 },
    /* coverts, tucked along the shoulder */
    { n: 5, u0: 0.06, u1: 0.36, len0: 14, len1: 22, sweep0: 80, sweep1: 64, o: 0.92 },
  ]

  const wing = () => {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    /* The membrane runs out along the arm and back along the primaries' tips,
       so its trailing edge is exactly where the feathers end. */
    const outer = ROWS[0]
    const tips = Array.from({ length: outer.n }, (_, i) => {
      const t = i / (outer.n - 1)
      const u = lerp(outer.u0, outer.u1, t)
      const base = armAt(u)
      const len = lerp(outer.len0, outer.len1, t) * 0.94
      const a = ((base.deg + lerp(outer.sweep0, outer.sweep1, t)) * Math.PI) / 180
      return [base.x + Math.cos(a) * len, base.y + Math.sin(a) * len]
    }).reverse()

    return (
      <g>
        <path
          d={
            `M 0 0 Q ${ARM.c[0]} ${ARM.c[1]} ${ARM.t[0]} ${ARM.t[1]} ` +
            tips.map((t) => `L ${t[0].toFixed(1)} ${t[1].toFixed(1)}`).join(' ') +
            ' z'
          }
          fill={`url(#skin-cp-feather-${uid})`}
          opacity={0.42}
        />
        {ROWS.map((row, ri) => (
          <g key={ri}>
            {Array.from({ length: row.n }, (_, i) => {
              const t = row.n === 1 ? 0 : i / (row.n - 1)
              const u = lerp(row.u0, row.u1, t)
              const base = armAt(u)
              const len = lerp(row.len0, row.len1, t)
              const deg = base.deg + lerp(row.sweep0, row.sweep1, t)
              return (
                <g key={i} transform={`translate(${base.x.toFixed(1)} ${base.y.toFixed(1)}) rotate(${deg.toFixed(1)})`}>
                  <path d={feather(len, len * 0.17)} fill={`url(#skin-cp-feather-${uid})`} opacity={row.o} />
                  <path
                    d={`M 0 0 C ${(len * 0.3).toFixed(1)} ${(-len * 0.17).toFixed(1)} ${(len * 0.78).toFixed(1)} ${(-len * 0.1).toFixed(1)} ${len.toFixed(1)} 0`}
                    fill="none"
                    stroke="#fffdf5"
                    strokeWidth={0.9}
                    opacity={row.o * 0.8}
                  />
                </g>
              )
            })}
          </g>
        ))}
        {/* The arm itself, bright along its leading edge. */}
        <path
          d={`M 0 0 Q ${ARM.c[0]} ${ARM.c[1]} ${ARM.t[0]} ${ARM.t[1]}`}
          fill="none"
          stroke="#fffdf5"
          strokeWidth={2.4}
          strokeLinecap="round"
          opacity={0.9}
        />
      </g>
    )
  }

  return (
    <g className="skin skin--celestialpalace" opacity={eliminated ? 0.45 : 1} aria-hidden="true">
      <clipPath id={`skin-cp-outside-${uid}`} clipRule="evenodd">
        <path
          d="M -92 -128 L 92 -128 L 92 44 L -92 44 z
             M -53 -25 L 53 -25 L 53 31 L -53 31 z
             M -21 -59 L 21 -59 L 21 -25 L -21 -25 z"
          clipRule="evenodd"
        />
      </clipPath>
      <clipPath id={`skin-cp-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <defs>
        <linearGradient id={`skin-cp-feather-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="45%" stopColor={HALO} stopOpacity="0.68" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`skin-cp-beam-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={HALO} stopOpacity="0.2" />
          <stop offset="100%" stopColor={HALO} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`skin-cp-aura-${uid}`} gradientUnits="userSpaceOnUse" cx={0} cy={-24} r={104}>
          <stop offset="0%" stopColor="#fffaf0" stopOpacity="0.5" />
          <stop offset="38%" stopColor={HALO} stopOpacity="0.22" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`skin-cp-pad-${uid}`}>
          <stop offset="0%" stopColor="#fffaf0" stopOpacity="0.85" />
          <stop offset="45%" stopColor={HALO} stopOpacity="0.4" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
        </radialGradient>
      </defs>

      <g clipPath={`url(#skin-cp-outside-${uid})`}>
        <g className="skin__aura">
          <circle cx={0} cy={-24} r={104} fill={`url(#skin-cp-aura-${uid})`} />
        </g>

        {/* The fan turns behind the palace. Clipped, so it can never sweep
            across the silhouette however far round it goes. */}
        <g className="skin__beam-fan">
          {Array.from({ length: 16 }, (_, i) => (
            <g key={i} transform={`rotate(${i * 22.5} 0 -40)`}>
              <path d="M 0 -52 L 118 -40 L 0 -28 z" fill={`url(#skin-cp-beam-${uid})`} />
            </g>
          ))}
        </g>

        {/* Wings. Anchored at the shoulders and beating on opposite sides of
            the same clock; the mirror flips the rotation with it, so they beat
            outward together rather than both leaning the same way. */}
        {/* ⚠️ THE MIRROR GOES ON THE LEFT WING. A feather is drawn pointing
            +x, so the unflipped group is the RIGHT wing. Putting the flip on
            the right-hand group instead aimed both wings inward, straight into
            the castle — where the clip that keeps them behind the fortress
            promptly hid every one of them, and the skin rendered with no wings
            at all. */}
        <g transform="translate(16 -18)">
          <g className="skin__wing">{wing()}</g>
        </g>
        <g transform="translate(-16 -18) scale(-1 1)">
          <g className="skin__wing">{wing()}</g>
        </g>

        {/* Halos over the keep.
            ⚠️ THE GEOMETRY NEVER MOVES — only the gaps in it do. Spinning a
            ring about the castle eventually sweeps it across the sprite, which
            is why Air's gale arcs became a marching dash; the same rule holds
            here, and a dash also reads as light travelling round the ring. */}
        {[
          /* ⚠️ TWO SIMILAR RINGS SIDE BY SIDE IS A LASSO. The first pair were
             44×13 and 30×9 six units apart, and overlapping ellipses of nearly
             the same size read as a loop of rope rather than as haloes. One is
             the halo over the keep; the other is far bigger and rings the whole
             palace, so the difference between them is obvious. */
          { cy: -74, rx: 26, ry: 7.5, w: 2.4, dash: '15 8', dur: 5.4 },
          { cy: -34, rx: 84, ry: 26, w: 3, dash: '30 14', dur: 9 },
        ].map((h, i) => (
          <g key={i}>
            <ellipse cx={0} cy={h.cy} rx={h.rx} ry={h.ry} fill="none" stroke={GOLD} strokeWidth={h.w} opacity={0.35} />
            <ellipse
              className="skin__halo-march"
              style={{ animationDuration: `${h.dur}s` }}
              cx={0}
              cy={h.cy}
              rx={h.rx}
              ry={h.ry}
              fill="none"
              stroke={HALO}
              strokeWidth={h.w}
              strokeDasharray={h.dash}
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>

      {/* ---- the palace itself ----------------------------------------- */}
      <g clipPath={`url(#skin-cp-wall-${uid})`}>
        <rect x={-52} y={-24} width={104} height={5} fill={GOLD} opacity={0.92} />
        <rect x={-52} y={25} width={104} height={5} fill={GOLD} opacity={0.92} />
        {/* Light coming up through the seams. */}
        {[-38, -22, 22, 38].map((x, i) => (
          <g key={i} className="skin__aura" style={{ animationDelay: `${i * 0.8}s` }}>
            <path d={`M ${x} 25 L ${x} -19`} stroke={HALO} strokeWidth={4} opacity={0.16} fill="none" />
            <path d={`M ${x} 25 L ${x} -19`} stroke="#fffdf5" strokeWidth={1.2} fill="none" />
          </g>
        ))}
      </g>

      {/* Gilded battlements — merlon centres read from the sprite. */}
      {[-46, -24, 24, 46].map((x, i) => (
        <path
          key={i}
          d={`M ${x} -31 L ${x + 3.4} -26 L ${x} -21 L ${x - 3.4} -26 z`}
          fill={HALO}
          stroke={GOLD_DEEP}
          strokeWidth={0.9}
        />
      ))}
      {[-15, 0, 15].map((x, i) => (
        <path
          key={i}
          d={`M ${x} -63 L ${x + 2.8} -59 L ${x} -55 L ${x - 2.8} -59 z`}
          fill={HALO}
          stroke={GOLD_DEEP}
          strokeWidth={0.8}
        />
      ))}

      {/* The gate, standing open onto light. */}
      <g className="skin__aura">
        <path d="M -12 30 L -12 9 C -12 -2 12 -2 12 9 L 12 30 z" fill={HALO} opacity={0.3} />
        <path
          d="M -12 30 L -12 9 C -12 -2 12 -2 12 9 L 12 30"
          fill="none"
          stroke={GOLD_LIT}
          strokeWidth={2.4}
        />
      </g>

      {/* ---- it rests on light, not on ground -------------------------- */}
      <ellipse cx={0} cy={34} rx={62} ry={9} fill={`url(#skin-cp-pad-${uid})`} />
      <ellipse cx={0} cy={33} rx={34} ry={4.4} fill="#fffdf5" opacity={0.55} />
      {[-44, -26, -8, 12, 30, 46].map((x, i) => (
        <g key={i} className="skin__mote" style={{ animationDelay: `-${i * 1.1}s` }}>
          <circle cx={x} cy={36} r={i % 2 ? 1.5 : 2.1} fill={HALO} />
        </g>
      ))}
    </g>
  )
}

export const LightDecor = {
  'light.radiant': RadiantLines,
  'light.solartemple': SolarTemple,
  'light.cathedral': CrystalCathedral,
  'light.celestial': CelestialPalace,
}
