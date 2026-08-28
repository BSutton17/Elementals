import type { DecorProps } from './decor'
import './skins.css'

/**
 * Earth's skin decorations.
 *
 * Drawn INSIDE the castle's local space, over the sprite — the keep occupies
 * roughly x −20…20, y −58…−12, the curtain wall x −52…52, y −24…30, and the
 * gate x −11…11, y 10…30. Anything here is layered on top of that.
 *
 * ⚠️ THE SILHOUETTE AND THE HUE ARE NOT NEGOTIABLE. Players pick out who is
 * attacking them from a small castle on a phone, often through fog. A skin may
 * add detail and texture; it may not obscure the shape, and it stays in Earth's
 * sandstone and ochre.
 *
 * ⚠️ EARTH IS NOT NATURE. Nature owns everything that grows — leaves, vines,
 * mushrooms, timber. Earth is what is left when you take all of that away:
 * cut stone, bare rock and carving. Not one green thing in either of these.
 *
 * ⚠️ ONE STROKED OUTLINE PER OBJECT. Everything inside it is an unstroked fill.
 */

const STONE = '#c9a56b'
const STONE_LIT = '#e6cfa0'
const STONE_MID = '#a8834b'
const STONE_DEEP = '#6d5029'
const CARVE = '#4a3418'
const OUTLINE = '#33240f'

/**
 * An engraved glyph.
 *
 * ⚠️ CARVING IS A GROOVE, WHICH MEANS TWO LINES AND NOT ONE. A single dark
 * stroke on stone reads as ink; a dark line with a lit line under it reads as
 * cut, because that is how a groove catches the light. Same reason Ice's
 * frozen falls needed a shadow before they stopped looking painted on.
 */
function glyph(d: string, key: number, w = 1.4) {
  return (
    <g key={key}>
      <path d={d} fill="none" stroke={STONE_LIT} strokeWidth={w} opacity={0.55} transform="translate(0 1)" />
      <path d={d} fill="none" stroke={CARVE} strokeWidth={w} strokeLinecap="square" />
    </g>
  )
}

/**
 * The glyph vocabulary: spiral, chevrons, sun, steps, eye, wave.
 *
 * ⚠️ THE SUN IS A DISC WITH TICKS, NOT A STAR OF STROKES. Drawn as four
 * crossing lines it came out an asterisk — which at this size is a snowflake,
 * and Ice owns snowflakes.
 */
const GLYPHS = [
  'M -3 3 L 3 3 L 3 -1 L -1 -1 L -1 1 L 1 1',
  'M -4 2 L 0 -2 L 4 2 M -4 5 L 0 1 L 4 5',
  'M -2.6 0 A 2.6 2.6 0 1 1 2.6 0 A 2.6 2.6 0 1 1 -2.6 0 M 0 -5.2 L 0 -3.9 M 0 3.9 L 0 5.2 M -5.2 0 L -3.9 0 M 3.9 0 L 5.2 0',
  'M -4 4 L -4 1 L -1 1 L -1 -2 L 2 -2 L 2 -5',
  'M -4 0 Q 0 -4 4 0 Q 0 4 -4 0 M -1.4 0 A 1.4 1.4 0 0 1 1.4 0',
  'M -4 1 Q -2 -2 0 1 Q 2 4 4 1',
]

/**
 * Uncommon — Stone Lines.
 *
 * The standard castle given its masonry: courses cut across the walls, blocks
 * staggered between them, hairline cracks, and a few engraved symbols.
 *
 * The lightest possible touch, like Water's Rippled Castle and Space's Star
 * Pattern: everything is clipped to the walls and the keep, so the silhouette
 * is exactly the default one.
 */
function StoneLines({ eliminated, uid }: DecorProps) {
  /**
   * ⚠️ THE JOINTS ARE STAGGERED, COURSE BY COURSE. Blocks whose ends line up
   * vertically are a grid, and a grid of rectangles reads as tiling or as a
   * window — the same failure that turned Light's first wall pattern into a
   * railing. Offsetting alternate courses by half a block is the entire
   * difference between masonry and graph paper.
   */
  const COURSES = [-13, -2, 9, 20]
  const BLOCK = 17

  return (
    <g className="skin skin--stonelines" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-sl-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-sl-keep-${uid}`}>
        <rect x={-21} y={-59} width={42} height={48} rx={3} />
      </clipPath>

      {/* ---- the wall --------------------------------------------------- */}
      <g clipPath={`url(#skin-sl-wall-${uid})`}>
        {/* Courses. */}
        {COURSES.map((y, i) => (
          <g key={i}>
            <path d={`M -52 ${y} L 52 ${y}`} stroke={STONE_DEEP} strokeWidth={1.3} fill="none" opacity={0.8} />
            <path d={`M -52 ${y + 1.2} L 52 ${y + 1.2}`} stroke={STONE_LIT} strokeWidth={0.9} fill="none" opacity={0.45} />
          </g>
        ))}
        {/* Perpends, offset every other course. */}
        {COURSES.map((y, row) =>
          Array.from({ length: 8 }, (_, i) => {
            const x = -52 + i * BLOCK + (row % 2 ? BLOCK / 2 : 0)
            if (x <= -52 || x >= 52) return null
            return (
              <path
                key={`${row}-${i}`}
                d={`M ${x} ${y} L ${x} ${y + 11}`}
                stroke={STONE_DEEP}
                strokeWidth={1.1}
                fill="none"
                opacity={0.65}
              />
            )
          }),
        )}

        {/* Cracks. Branching and off-vertical: a straight one is a joint. */}
        <path
          d="M -44 -24 L -42 -14 L -45 -6 L -43 2 M -45 -6 L -49 -1"
          fill="none"
          stroke={CARVE}
          strokeWidth={0.9}
          opacity={0.75}
        />
        <path
          d="M 33 30 L 35 21 L 32 14 M 35 21 L 39 17"
          fill="none"
          stroke={CARVE}
          strokeWidth={0.9}
          opacity={0.75}
        />
        <path d="M 6 -24 L 8 -18 L 6 -13" fill="none" stroke={CARVE} strokeWidth={0.8} opacity={0.6} />

        {/* Engraved symbols, set on the blocks rather than floating between
            them — a carving that straddles a joint reads as a decal. */}
        {[
          { x: -36, y: 3, g: 0 },
          { x: -19, y: 14, g: 1 },
          { x: 20, y: 3, g: 4 },
          { x: 38, y: 14, g: 3 },
          { x: -36, y: 25, g: 5 },
          { x: 38, y: -8, g: 2 },
        ].map((s, i) => (
          <g key={i} transform={`translate(${s.x} ${s.y}) scale(0.8)`}>
            {glyph(GLYPHS[s.g]!, i)}
          </g>
        ))}
      </g>

      {/* ---- the keep --------------------------------------------------- */}
      <g clipPath={`url(#skin-sl-keep-${uid})`}>
        {[-46, -35, -24].map((y, i) => (
          <g key={i}>
            <path d={`M -21 ${y} L 21 ${y}`} stroke={STONE_DEEP} strokeWidth={1.2} fill="none" opacity={0.8} />
            <path d={`M -21 ${y + 1.1} L 21 ${y + 1.1}`} stroke={STONE_LIT} strokeWidth={0.8} fill="none" opacity={0.45} />
          </g>
        ))}
        {[-46, -35, -24].map((y, row) =>
          [-7, 7].map((x, i) => (
            <path
              key={`${row}-${i}`}
              d={`M ${x + (row % 2 ? 7 : 0)} ${y} L ${x + (row % 2 ? 7 : 0)} ${y + 11}`}
              stroke={STONE_DEEP}
              strokeWidth={1}
              fill="none"
              opacity={0.6}
            />
          )),
        )}
        {/* The big glyph over the gate line, which is what the eye lands on. */}
        <g transform="translate(0 -40) scale(1.5)">{glyph(GLYPHS[2]!, 99, 1.1)}</g>
      </g>

      {/* ---- a carved lintel over the gate ------------------------------ */}
      <path d="M -14 9 L 14 9" stroke={STONE_DEEP} strokeWidth={2} fill="none" />
      <path d="M -14 10.4 L 14 10.4" stroke={STONE_LIT} strokeWidth={1} fill="none" opacity={0.5} />
      {[-8, 0, 8].map((x, i) => (
        <g key={i} transform={`translate(${x} 5) scale(0.55)`}>
          {glyph(GLYPHS[1]!, i, 1.8)}
        </g>
      ))}
    </g>
  )
}

/**
 * Rare — Ancient Temple.
 *
 * The fortress cut into a mountainside: rock rising behind it, colossal seated
 * figures either side, a pillared front, and a stair climbing to the gate.
 *
 * ⚠️ THE MOUNTAIN GOES BEHIND THE CASTLE, THROUGH THE EVEN-ODD CLIP. Drawn on
 * top it is a grey blob covering the sprite; drawn behind, the castle reads as
 * cut INTO it, which is the whole idea.
 *
 * ⚠️ THE STATUES ARE ONE SILHOUETTE EACH, NOT A STACK OF PARTS. Water's first
 * leviathan head was eleven separately stroked pieces and read as lego bricks
 * snapped together. Each figure here is a single outlined body with its detail
 * drawn as unstroked shapes inside that outline.
 */
function AncientTemple({ eliminated, uid }: DecorProps) {
  /**
   * A colossus: one outline, detail inside it, mirrored by `dir`.
   *
   * ⚠️ IT NEEDS SHOULDERS AND A HEADDRESS OR IT IS A CHESS PAWN. The first
   * build tapered smoothly from a wide base to a small round head, which is
   * the silhouette of a pawn (and, with two dots for eyes, of an owl). What
   * makes a seated colossus read is the flare: a head-dress wider than the
   * head, shoulders wider than the waist, and arms coming down onto the knees.
   */
  const colossus = (dir: 1 | -1, key: number) => {
    const x = 68 * dir
    return (
      <g key={key} transform={`translate(${x} 0) scale(${dir} 1)`}>
        {/* Plinth. */}
        <path
          d="M -16 30 L -14 21 L 14 21 L 16 30 z"
          fill={STONE_MID}
          stroke={OUTLINE}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
        {/* One body: knees, lap, waist, shoulders, headdress. */}
        <path
          d="M -13 21 L -12.5 7 L -9 3
             L -8 -12 L -12 -17 L -12.5 -23 L -8.5 -26
             L -9.5 -33 L -5.5 -37.5 L 5.5 -37.5 L 9.5 -33
             L 8.5 -26 L 12.5 -23 L 12 -17 L 8 -12
             L 9 3 L 12.5 7 L 13 21 z"
          fill={STONE}
          stroke={OUTLINE}
          strokeWidth={1.3}
          strokeLinejoin="round"
        />
        {/* Detail, unstroked, inside that one outline. */}
        <path d="M -9 3 L 9 3 L 10 9 L -10 9 z" fill={STONE_DEEP} opacity={0.45} />
        <path d="M -8 -12 L 8 -12 L 7.4 0 L -7.4 0 z" fill={STONE_LIT} opacity={0.3} />
        {/* Head-dress lappets down either side of the face. */}
        <path d="M -9.2 -33 L -5.4 -33.6 L -5 -24 L -8.8 -25.6 z" fill={STONE_DEEP} opacity={0.5} />
        <path d="M 9.2 -33 L 5.4 -33.6 L 5 -24 L 8.8 -25.6 z" fill={STONE_DEEP} opacity={0.5} />
        <path d="M -5.5 -37.5 L 5.5 -37.5 L 5 -34.5 L -5 -34.5 z" fill={STONE_DEEP} opacity={0.55} />
        {/* A brow and a mouth. ⚠️ NO DOT EYES — two dots on a round head is an
            owl, and it was an owl. */}
        <path d="M -3.6 -31 L 3.6 -31" stroke={CARVE} strokeWidth={1.1} fill="none" />
        <path d="M -1.8 -27.4 L 1.8 -27.4" stroke={CARVE} strokeWidth={0.9} fill="none" opacity={0.8} />
        {/* Ceremonial beard, which is the other half of the read. */}
        <path d="M -1.8 -25.5 L 1.8 -25.5 L 1.3 -18 L -1.3 -18 z" fill={STONE_MID} stroke={CARVE} strokeWidth={0.8} />
        {/* Arms onto the knees. */}
        <path d="M -12 -16 L -12.6 5 L -8.4 5 L -8 -16 z" fill={STONE_MID} opacity={0.9} />
        <path d="M 12 -16 L 12.6 5 L 8.4 5 L 8 -16 z" fill={STONE_MID} opacity={0.9} />
        <path d="M -14 21 L 14 21" stroke={OUTLINE} strokeWidth={1.1} fill="none" opacity={0.6} />
      </g>
    )
  }

  /** A pillar standing off the wall, with a shadow behind it. */
  const pillar = (x: number, key: number) => (
    <g key={key}>
      <path d={`M ${x + 3} -14 L ${x + 6.5} -14 L ${x + 6.5} 30 L ${x + 3} 30 z`} fill={STONE_DEEP} opacity={0.45} />
      <path
        d={`M ${x - 4.2} -14 L ${x + 4.2} -14 L ${x + 3.4} 26 L ${x - 3.4} 26 z`}
        fill={STONE}
        stroke={OUTLINE}
        strokeWidth={1.2}
      />
      {[-2, 0, 2].map((o, i) => (
        <path
          key={i}
          d={`M ${x + o} -12 L ${x + o * 0.86} 24`}
          stroke={STONE_DEEP}
          strokeWidth={0.7}
          fill="none"
          opacity={0.5}
        />
      ))}
      <rect x={x - 5.6} y={-18} width={11.2} height={4.4} fill={STONE_MID} stroke={OUTLINE} strokeWidth={1.1} />
      <rect x={x - 5.2} y={26} width={10.4} height={4} fill={STONE_MID} stroke={OUTLINE} strokeWidth={1.1} />
    </g>
  )

  return (
    <g className="skin skin--ancienttemple" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-at-outside-${uid}`} clipRule="evenodd">
        <path
          d="M -92 -128 L 92 -128 L 92 44 L -92 44 z
             M -53 -25 L 53 -25 L 53 31 L -53 31 z
             M -21 -59 L 21 -59 L 21 -11 L -21 -11 z"
          clipRule="evenodd"
        />
      </clipPath>
      <clipPath id={`skin-at-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-at-keep-${uid}`}>
        <rect x={-21} y={-59} width={42} height={48} rx={3} />
      </clipPath>
      <defs>
        <linearGradient id={`skin-at-rock-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8a6a3c" />
          <stop offset="55%" stopColor="#6d5029" />
          <stop offset="100%" stopColor="#4a3719" />
        </linearGradient>
      </defs>

      {/* ---- the mountain ---------------------------------------------- */}
      <g clipPath={`url(#skin-at-outside-${uid})`}>
        <path
          /* ⚠️ THE MAIN PEAK IS OFF TO ONE SIDE. Centred, its apex sat
             directly over the keep and the whole mountain read as a party hat
             on the castle. Pushed left, with the ridge stepping down unevenly
             to the right, it reads as a range the fortress was cut into. */
          d="M -92 44 L -92 -22 L -78 -38 L -64 -30 L -48 -62 L -34 -104
             L -18 -58 L -6 -70 L 8 -48 L 24 -60 L 40 -40 L 58 -52 L 74 -34 L 92 -24 L 92 44 z"
          fill={`url(#skin-at-rock-${uid})`}
          stroke={OUTLINE}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
        {/* Strata: the lines run ACROSS the rock, not down it, or the mountain
            reads as a curtain. */}
        {[
          'M -92 -6 L -60 -14 L -30 -8 L 0 -18 L 34 -10 L 66 -20 L 92 -12',
          'M -92 8 L -56 0 L -22 8 L 10 -2 L 44 6 L 78 -4 L 92 2',
          'M -92 24 L -62 16 L -26 24 L 8 14 L 46 22 L 92 14',
        ].map((d, i) => (
          <path key={i} d={d} fill="none" stroke={CARVE} strokeWidth={1.1} opacity={0.45} />
        ))}
        {/* A lit face on each big shoulder of rock, so it has volume. */}
        <path d="M -48 -62 L -34 -104 L -25 -72 L -40 -58 z" fill={STONE_MID} opacity={0.5} />
        <path d="M 8 -48 L 24 -60 L 26 -44 L 12 -38 z" fill={STONE_MID} opacity={0.35} />
        <path d="M 58 -52 L 74 -34 L 70 -22 L 58 -34 z" fill={STONE_MID} opacity={0.35} />
      </g>

      {/* ---- the colossi ------------------------------------------------ */}
      {colossus(-1, 0)}
      {colossus(1, 1)}

      {/* ---- carvings on the wall --------------------------------------- */}
      <g clipPath={`url(#skin-at-wall-${uid})`}>
        <rect x={-52} y={-24} width={104} height={7} fill={STONE_MID} opacity={0.55} />
        <path d="M -52 -17 L 52 -17" stroke={CARVE} strokeWidth={1.2} fill="none" opacity={0.6} />
        {/* A frieze of glyphs under the parapet: a band of repeats is what
            reads as writing at this size, and the eye needs it to be a BAND
            rather than scattered marks. */}
        {/* ⚠️ A FRIEZE REPEATS. Cycling all six glyphs made each band a row of
            different marks, which reads as scattered scratches; three, in
            order, reads as writing. */}
        {Array.from({ length: 11 }, (_, i) => (
          <g key={i} transform={`translate(${-48 + i * 9.6} -20.5) scale(0.42)`}>
            {glyph([GLYPHS[1], GLYPHS[3], GLYPHS[5]][i % 3]!, i, 2.2)}
          </g>
        ))}
        <path d="M -52 22 L 52 22" stroke={CARVE} strokeWidth={1.2} fill="none" opacity={0.5} />
        {Array.from({ length: 11 }, (_, i) => (
          <g key={`b${i}`} transform={`translate(${-48 + i * 9.6} 26) scale(0.4)`}>
            {glyph([GLYPHS[5], GLYPHS[1], GLYPHS[3]][i % 3]!, i, 2.2)}
          </g>
        ))}
      </g>

      {/* ---- a relief on the keep --------------------------------------- */}
      <g clipPath={`url(#skin-at-keep-${uid})`}>
        <rect x={-15} y={-52} width={30} height={34} fill={STONE_MID} opacity={0.4} />
        <rect
          x={-15}
          y={-52}
          width={30}
          height={34}
          fill="none"
          stroke={CARVE}
          strokeWidth={1.2}
          opacity={0.7}
        />
        <g transform="translate(0 -41) scale(1.7)">{glyph(GLYPHS[2]!, 55, 1.1)}</g>
        <g transform="translate(-9 -25) scale(0.75)">{glyph(GLYPHS[1]!, 56, 1.8)}</g>
        <g transform="translate(9 -25) scale(0.75)">{glyph(GLYPHS[1]!, 57, 1.8)}</g>
        <path d="M -15 -30 L 15 -30" stroke={CARVE} strokeWidth={1} fill="none" opacity={0.55} />
      </g>

      {/* ---- the pillared front ----------------------------------------- */}
      {pillar(-40, 0)}
      {pillar(-22, 1)}
      {pillar(22, 2)}
      {pillar(40, 3)}

      {/* ---- the stair -------------------------------------------------- */}
      {/* ⚠️ THE TREADS NARROW AS THEY RISE. Equal-width steps stacked up are a
          ladder seen flat; tapering them is the only cue that they go away
          from the viewer as well as up. */}
      {[
        { y: 40, w: 30 },
        { y: 36.6, w: 26.5 },
        { y: 33.2, w: 23 },
        { y: 29.8, w: 19.5 },
      ].map((s, i) => (
        <g key={i}>
          <path
            d={`M ${-s.w} ${s.y} L ${s.w} ${s.y} L ${s.w - 2} ${s.y - 3.4} L ${-s.w + 2} ${s.y - 3.4} z`}
            fill={i % 2 ? STONE : STONE_MID}
            stroke={OUTLINE}
            strokeWidth={1.1}
            strokeLinejoin="round"
          />
          <path
            d={`M ${-s.w + 2} ${s.y - 3.4} L ${s.w - 2} ${s.y - 3.4}`}
            stroke={STONE_LIT}
            strokeWidth={0.8}
            fill="none"
            opacity={0.5}
          />
        </g>
      ))}

      {/* ---- the doorway ------------------------------------------------ */}
      <path
        d="M -13 30 L -11.5 8 L 11.5 8 L 13 30"
        fill="none"
        stroke={STONE_DEEP}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <path d="M -15 8 L 15 8 L 14 4 L -14 4 z" fill={STONE_MID} stroke={OUTLINE} strokeWidth={1.2} />
      <g transform="translate(0 -0.5) scale(0.7)">{glyph(GLYPHS[2]!, 77, 1.6)}</g>
    </g>
  )
}

/**
 * Rare — Crystal Cavern.
 *
 * The fortress deep underground: rock closing in overhead and to both sides,
 * stalactites hanging into the frame, and seams of bright crystal growing out
 * through the walls and towers.
 *
 * ⚠️ THREE KINGDOMS ALREADY OWN CRYSTAL, AND THIS IS THE THIRD SKIN OF ONE.
 * Ice's palace is blue-white spikes; Light's cathedral is white crystal
 * architecture with coloured glass. What makes this one Earth is that the
 * crystal is a MINERAL rather than a building material — it grows out of the
 * stone in clusters, at angles nobody chose — and, above all, that the castle
 * is INSIDE something. The cave is the idea; the crystal is the lighting.
 *
 * ⚠️ AND THE CRYSTAL IS AMETHYST, AFTER GREEN FAILED. Green-teal was chosen
 * first to dodge Space's violet and Ice's blue — and green shards sprouting in
 * sprays off the ground came out as GRASS. Tufts of aloe, growing round the
 * walls of the one kingdom whose entire rule is that it owns nothing that
 * grows. Violet has no plant to be mistaken for, and the separation from Space
 * and Electricity is carried by everything else on the sprite: a sandstone
 * castle in a brown cave is not a void-black fortress under a purple sky.
 */
function CrystalCavern({ eliminated, uid }: DecorProps) {
  const XTAL = '#9b6bd8'
  const XTAL_LIT = '#e2d0ff'
  const XTAL_DEEP = '#4e2f8c'
  const ROCK = '#3d2c14'
  const ROCK_LIT = '#5c451f'

  /**
   * A cluster.
   *
   * ⚠️ PRISMS CROSS EACH OTHER; BLADES FAN FROM A ROOT. A spray of upright
   * shards all rising from one point is a tuft of grass whatever colour it is
   * painted — that was the first build. Mineral reads instead from prisms of
   * very different sizes lying ACROSS one another at angles nobody would
   * choose, some leaning past horizontal, each one blunt-tipped with a flat
   * facet cut across it rather than tapering to a blade point.
   */
  const cluster = (
    x: number,
    y: number,
    scale: number,
    key: number,
    shards: [number, number, number][],
  ) => (
    <g key={key} transform={`translate(${x} ${y}) scale(${scale})`}>
      {shards.map(([deg, len, w], i) => (
        <g key={i} transform={`rotate(${deg})`}>
          {/* A hexagonal column with a blunt, faceted tip. */}
          <path
            d={`M ${-w} 2 L ${-w} ${-len * 0.78} L ${-w * 0.42} ${-len}
                L ${w * 0.42} ${-len} L ${w} ${-len * 0.78} L ${w} 2 z`}
            fill={XTAL}
            stroke={OUTLINE}
            strokeWidth={0.9}
            strokeLinejoin="round"
          />
          <path
            d={`M ${-w * 0.34} 2 L ${-w * 0.34} ${-len * 0.8} L ${w * 0.1} ${-len} L ${w * 0.1} 2 z`}
            fill={XTAL_LIT}
            opacity={0.5}
          />
          <path
            d={`M ${w} 2 L ${w} ${-len * 0.78} L ${w * 0.42} ${-len} L ${w * 0.42} 2 z`}
            fill={XTAL_DEEP}
            opacity={0.55}
          />
          <path
            d={`M ${-w * 0.42} ${-len} L ${w * 0.42} ${-len}`}
            stroke={XTAL_LIT}
            strokeWidth={0.9}
            fill="none"
            opacity={0.9}
          />
        </g>
      ))}
    </g>
  )

  /* [angle, length, half-width]. The big one leans one way, the next leans
     hard the other, and a small one lies almost flat across their feet. */
  const SPRAY_A: [number, number, number][] = [
    [-38, 20, 4.4],
    [6, 26, 5.6],
    [44, 13, 3.4],
    [-78, 11, 3],
    [86, 8, 2.6],
  ]
  const SPRAY_B: [number, number, number][] = [
    [-14, 24, 5.2],
    [30, 15, 3.8],
    [-58, 12, 3.2],
    [72, 9, 2.8],
  ]

  return (
    <g className="skin skin--crystalcavern" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-cv-outside-${uid}`} clipRule="evenodd">
        <path
          d="M -92 -128 L 92 -128 L 92 44 L -92 44 z
             M -53 -25 L 53 -25 L 53 31 L -53 31 z
             M -21 -59 L 21 -59 L 21 -11 L -21 -11 z"
          clipRule="evenodd"
        />
      </clipPath>
      <clipPath id={`skin-cv-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <defs>
        <radialGradient id={`skin-cv-glow-${uid}`} gradientUnits="userSpaceOnUse" cx={0} cy={-6} r={96}>
          <stop offset="0%" stopColor={XTAL_LIT} stopOpacity="0.42" />
          <stop offset="45%" stopColor={XTAL} stopOpacity="0.13" />
          <stop offset="100%" stopColor={XTAL_DEEP} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`skin-cv-rock-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#241a0c" />
          <stop offset="100%" stopColor={ROCK} />
        </linearGradient>
        {/* ⚠️ THE CAVE FADES OUT AT THE FRAME, IT DOES NOT STOP AT IT. Filling
            every corner made the whole skin a hard-edged rectangle — on the
            battlefield it read as a playing card sitting among castles rather
            than as a castle. A mask that falls away at the edges gives the
            rock an irregular outer silhouette like every other skin has. */}
        <radialGradient id={`skin-cv-fade-${uid}`} gradientUnits="userSpaceOnUse" cx={0} cy={-26} r={112}>
          <stop offset="0%" stopColor="#fff" />
          <stop offset="58%" stopColor="#fff" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        <mask id={`skin-cv-mask-${uid}`}>
          <rect x={-92} y={-128} width={184} height={172} fill={`url(#skin-cv-fade-${uid})`} />
        </mask>
      </defs>

      <g clipPath={`url(#skin-cv-outside-${uid})`} mask={`url(#skin-cv-mask-${uid})`}>
        {/* ⚠️ THE CAVE HAS TO PAINT ITS OWN DARK. Leaving the space between the
            rock unfilled let the battlefield show through, and the castle
            ended up standing in a navy hole with a torn brown border round it
            — a frame, not an interior. Underground is lightless: the ground
            colour goes down first, and every piece of rock sits on top of it. */}
        <rect x={-92} y={-128} width={184} height={172} fill="#1b1308" />

        {/* The cave: roof and both walls closing in, so the castle is inside
            something rather than standing in front of a backdrop. */}
        <path
          d="M -92 -128 L 92 -128 L 92 -74 L 78 -66 L 66 -80 L 52 -70 L 40 -86
             L 24 -74 L 10 -94 L -6 -78 L -20 -92 L -34 -76 L -48 -88 L -62 -72
             L -76 -84 L -92 -70 z"
          fill={`url(#skin-cv-rock-${uid})`}
          stroke={OUTLINE}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
        <path
          d="M -92 -70 L -92 44 L -58 44 L -62 20 L -70 -2 L -64 -26 L -74 -48 z"
          fill={`url(#skin-cv-rock-${uid})`}
          stroke={OUTLINE}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
        <path
          d="M 92 -74 L 92 44 L 58 44 L 63 20 L 71 -2 L 65 -26 L 75 -50 z"
          fill={`url(#skin-cv-rock-${uid})`}
          stroke={OUTLINE}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />

        {/* A floor, so the cave is a room the castle is standing in rather
            than a ragged frame around the battlefield showing through. */}
        <path
          d="M -92 44 L -92 26 L -66 20 L -40 26 L -12 22 L 18 27 L 48 21 L 74 26 L 92 20 L 92 44 z"
          fill={`url(#skin-cv-rock-${uid})`}
          stroke={OUTLINE}
          strokeWidth={1.3}
          strokeLinejoin="round"
        />
        {/* Strata across the roof: a rock face without bedding lines is a
            silhouette of a rock face. */}
        {[
          'M -92 -104 L -60 -96 L -28 -104 L 6 -94 L 40 -102 L 74 -92 L 92 -98',
          'M -92 -88 L -64 -82 L -34 -90 L 0 -80 L 34 -88 L 68 -78 L 92 -84',
        ].map((d, i) => (
          <path key={i} d={d} fill="none" stroke={ROCK_LIT} strokeWidth={1.1} opacity={0.5} />
        ))}

        {/* Stalactites, hanging at different lengths off the roofline. */}
        {[
          { x: -78, y: -84, l: 26, w: 5 },
          { x: -54, y: -80, l: 16, w: 3.6 },
          { x: -34, y: -76, l: 32, w: 6 },
          { x: -12, y: -84, l: 20, w: 4.2 },
          { x: 16, y: -78, l: 28, w: 5.4 },
          { x: 44, y: -80, l: 18, w: 4 },
          { x: 68, y: -70, l: 24, w: 5 },
        ].map((s, i) => (
          <path
            key={i}
            d={`M ${s.x - s.w} ${s.y} L ${s.x + s.w} ${s.y} L ${s.x} ${s.y + s.l} z`}
            fill={ROCK_LIT}
            stroke={OUTLINE}
            strokeWidth={1.1}
            strokeLinejoin="round"
          />
        ))}

        {/* The ambient light down here comes from the crystal, so it pools
            around the fortress rather than falling on it from above. */}
        <circle cx={0} cy={-2} r={104} fill={`url(#skin-cv-glow-${uid})`} />

        {/* Stalagmites answering the stalactites, because a cave floor with
            nothing rising off it reads as a stage. */}
        {[
          { x: -70, y: 22, l: 20, w: 5 },
          { x: -30, y: 25, l: 12, w: 3.6 },
          { x: 36, y: 24, l: 16, w: 4.4 },
          { x: 78, y: 22, l: 24, w: 5.4 },
        ].map((s2, i) => (
          <path
            key={i}
            d={`M ${s2.x - s2.w} ${s2.y} L ${s2.x + s2.w} ${s2.y} L ${s2.x} ${s2.y - s2.l} z`}
            fill={ROCK_LIT}
            stroke={OUTLINE}
            strokeWidth={1.1}
            strokeLinejoin="round"
          />
        ))}

        {/* Clusters on the cave walls, up where rock is — not standing in rows
            on the floor, which is what made the first set look planted. */}
        {cluster(-76, 6, 0.8, 0, SPRAY_A)}
        {cluster(78, 2, 0.72, 1, SPRAY_B)}
        {cluster(-66, -40, 0.6, 2, SPRAY_B)}
        {cluster(72, -44, 0.55, 3, SPRAY_A)}
        {cluster(-24, -74, 0.48, 4, SPRAY_A)}
        {cluster(32, -70, 0.44, 5, SPRAY_B)}
      </g>

      {/* ---- crystal coming through the stonework ----------------------- */}
      <g clipPath={`url(#skin-cv-wall-${uid})`}>
        {/* Seams: the crystal followed a crack out, so the crack is drawn too.
            ⚠️ SHORT, NOT A ZIGZAG ACROSS THE WHOLE WALL. Long jagged glowing
            lines in violet are a lightning bolt, and Electricity owns those —
            the first pass ran two of them the full width of the curtain. A
            crack is a few units long, mostly straight, and it has a lit vein
            in only part of its length. */}
        {[
          { crack: 'M -44 20 L -41 11 L -43 4', vein: 'M -43.4 16 L -41 11 L -42 7' },
          { crack: 'M 40 -8 L 43 0 L 40 7', vein: 'M 41.2 -4 L 43 0 L 41.4 4' },
          { crack: 'M -14 30 L -11 22 L -13 16', vein: 'M -12.6 26 L -11 22 L -12 19' },
          { crack: 'M 20 30 L 18 23 L 21 17', vein: 'M 19 27 L 18 23 L 19.6 20' },
        ].map((c, i) => (
          <g key={i}>
            <path d={c.crack} fill="none" stroke={CARVE} strokeWidth={2} opacity={0.75} strokeLinecap="round" />
            <path d={c.vein} fill="none" stroke={XTAL} strokeWidth={1.1} opacity={0.9} strokeLinecap="round" />
          </g>
        ))}
        <rect x={-52} y={-24} width={104} height={54} fill={XTAL} opacity={0.06} />
      </g>

      {/* Clusters breaking out THROUGH the walls and the keep — a rare may
          leave the outline, and a crystal that stops politely at the wall edge
          reads as painted on it. */}
      {/* ⚠️ SMALL, AND OFF THE OUTLINE. At full size these covered the
          battlements and crowded the gate, which is the one thing a skin may
          never do — a player has to read this shape through fog to know who is
          attacking them. They sit at the wall's feet and its outer edges, and
          the keep gets one modest seam rather than a crown. */}
      {cluster(-48, 30, 0.62, 10, SPRAY_A)}
      {cluster(42, 30, 0.52, 11, SPRAY_B)}
      {cluster(-53, 4, 0.5, 12, SPRAY_B)}
      {cluster(53, 8, 0.46, 13, SPRAY_A)}
      {cluster(-21, -34, 0.4, 14, SPRAY_A)}
      {cluster(21, -40, 0.36, 15, SPRAY_B)}
    </g>
  )
}

/**
 * Legendary — Mount Colossus.
 *
 * The castle as the chest of a stone giant: a rock head above the keep, two
 * enormous arms brought round to hold the walls, and a ridge of mountains
 * along its shoulders.
 *
 * ⚠️ THE HANDS GO IN FRONT AND EVERYTHING ELSE GOES BEHIND. If the whole titan
 * sits behind the sprite it reads as scenery painted on a backdrop; if it sits
 * in front it covers the silhouette. The split is what makes it hold the
 * castle — the same far/near trick Electricity's rings needed — and the
 * fingers only ever cross the outer edges of the wall, never the gate.
 */
function MountColossus({ eliminated, uid }: DecorProps) {
  const ROCK = '#7c6039'
  const ROCK_LIT = '#a8875a'
  const ROCK_DEEP = '#4a3719'
  const MAGMA = '#ff9a3c'

  /**
   * The forearm and the hand that grips the parapet.
   *
   * ⚠️ AN ARM THAT LOOPS BACK ON ITSELF IS A HANDLE. Two attempts drew the
   * whole limb as a closed crescent sweeping from the shoulder to the wall,
   * and both read as an oval ring stuck to the side of the castle — the inner
   * and outer edges ran parallel, so it had no mass anywhere. What works is
   * having the arm LEAVE THE FRAME: the shoulder is part of the body behind,
   * the forearm runs off the edge of the sprite, and only the hand is drawn in
   * full. The eye completes a limb it cannot entirely see.
   *
   * ⚠️ AND THE HAND HOLDS THE PARAPET, NOT THE MIDDLE. This is the one piece
   * drawn in FRONT of the castle. On the top corners it reads as gripping;
   * anywhere inboard of that it would cover the gate, and covering the
   * silhouette is the line no skin crosses.
   */
  const grip = (dir: 1 | -1, key: number) => (
    <g key={key} transform={`scale(${dir} 1)`}>
      {/* Forearm, running out of frame. */}
      <path
        d="M 52 -26 L 92 -2 L 92 30 L 60 6 z"
        fill={ROCK}
        stroke={OUTLINE}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path d="M 56 -20 L 90 3 L 90 12 L 58 -10 z" fill={ROCK_LIT} opacity={0.4} />
      <path d="M 64 6 L 92 26 L 92 30 L 62 10 z" fill={ROCK_DEEP} opacity={0.45} />
      {/* The back of the hand. */}
      <path
        d="M 30 -30 L 56 -30 C 64 -30 68 -22 66 -14 L 62 2 C 60 8 52 10 46 6 L 30 -6 z"
        fill={ROCK}
        stroke={OUTLINE}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path d="M 36 -26 L 56 -26 C 61 -26 63 -21 62 -16 L 40 -16 z" fill={ROCK_LIT} opacity={0.42} />
      {/* Three fingers curled over the parapet: unequal, with a knuckle cut
          across each. Even capsules side by side are a cartoon glove. */}
      {[
        { x: 30, y: -31, w: 9.5, h: 15 },
        { x: 39.5, y: -32.5, w: 9, h: 18 },
        { x: 48.5, y: -31, w: 8.5, h: 15.5 },
      ].map((f, i) => (
        <g key={i}>
          <path
            d={`M ${f.x} ${f.y} L ${f.x + f.w} ${f.y - 1}
                L ${f.x + f.w} ${f.y + f.h - 1} C ${f.x + f.w} ${f.y + f.h + 3} ${f.x} ${f.y + f.h + 3} ${f.x} ${f.y + f.h} z`}
            fill={i % 2 ? ROCK_LIT : ROCK}
            stroke={OUTLINE}
            strokeWidth={1.3}
            strokeLinejoin="round"
          />
          <path
            d={`M ${f.x + 0.8} ${f.y + 6} L ${f.x + f.w - 0.8} ${f.y + 5}`}
            stroke={ROCK_DEEP}
            strokeWidth={1.2}
            fill="none"
            opacity={0.65}
          />
        </g>
      ))}
    </g>
  )

  return (
    <g className="skin skin--mountcolossus" opacity={eliminated ? 0.45 : 1} aria-hidden="true">
      <clipPath id={`skin-mc-outside-${uid}`} clipRule="evenodd">
        <path
          d="M -92 -128 L 92 -128 L 92 44 L -92 44 z
             M -53 -25 L 53 -25 L 53 31 L -53 31 z
             M -21 -59 L 21 -59 L 21 -11 L -21 -11 z"
          clipRule="evenodd"
        />
      </clipPath>
      <defs>
        <linearGradient id={`skin-mc-body-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8d6f45" />
          <stop offset="100%" stopColor="#4a3719" />
        </linearGradient>
        <radialGradient id={`skin-mc-eye-${uid}`}>
          <stop offset="0%" stopColor="#fff0c8" />
          <stop offset="45%" stopColor={MAGMA} />
          <stop offset="100%" stopColor="#a33c05" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Everything but the hands lives behind the fortress. The whole group
          breathes: a slow rise and fall, which is what turns a rock formation
          into something that is only just alive. */}
      <g clipPath={`url(#skin-mc-outside-${uid})`}>
        <g className="skin__titan">
          {/* Shoulders and back. The shoulders BULGE — that swelling either
              side of the neck is what the arms hang off, and without it the
              forearms in front have nothing to belong to. */}
          <path
            d="M -92 44 L -92 -8
               C -90 -30 -74 -42 -58 -36
               L -44 -32 L -30 -44 L -18 -56 L 18 -56 L 30 -44 L 44 -32 L 58 -36
               C 74 -42 90 -30 92 -8 L 92 44 z"
            fill={`url(#skin-mc-body-${uid})`}
            stroke={OUTLINE}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          {/* ⚠️ THREE BIG PEAKS PER SIDE, NOT EIGHT SMALL ONES. Little
              triangles along a ridge read as spikes on a dinosaur; mountains
              need to differ in height and width enough that the eye reads
              distance between them. */}
          {[
            'M -92 -10 L -78 -58 L -66 -30 L -60 -44 L -52 -18 z',
            'M -58 -24 L -44 -44 L -34 -26 z',
            /* Deliberately not a mirror of the left: a symmetric skyline
               reads as scenery flats rather than as terrain. */
            'M 92 -16 L 80 -52 L 70 -34 L 62 -50 L 52 -18 z',
            'M 58 -24 L 44 -52 L 32 -26 z',
          ].map((d, i) => (
            <path key={i} d={d} fill={ROCK} stroke={OUTLINE} strokeWidth={1.3} strokeLinejoin="round" />
          ))}
          {[
            'M -78 -58 L -70 -30 L -78 -26 z',
            'M -44 -44 L -37 -28 L -44 -25 z',
            'M 80 -52 L 72 -28 L 80 -24 z',
            'M 44 -52 L 37 -30 L 44 -27 z',
          ].map((d, i) => (
            <path key={`f${i}`} d={d} fill={ROCK_LIT} opacity={0.4} />
          ))}

        </g>
      </g>

      {/* ---- the head, over the top of the castle -----------------------
          ⚠️ THIS IS OUTSIDE THE "EVERYWHERE EXCEPT THE CASTLE" CLIP, and it has
          to be. Inside it, anything lowered onto the keep is cut away exactly
          where it overlaps — the clip cannot tell "behind" from "on top of".
          The leviathan sets the precedent: its skull is drawn over the keep and
          bites down across it, which is what makes the palace read as built
          INSIDE the beast rather than standing in front of a picture of one.
          Same here — the jaw comes down over the battlements, so the fortress
          is part of the titan instead of a castle with scenery behind it.

          ⚠️ THE BROW STILL CLEARS THE KEEP'S FACE. Lowered far enough to cover
          the top, not so far that the eyes sit on the wall: the keep reads from
          its shoulders down, which is all a player needs through fog. */}
      <g className="skin__titan">
        <path
          d="M -24 -50 L -26 -68 L -20 -82 L -6 -88 L 6 -88 L 20 -82
             L 26 -68 L 24 -50 L 14 -42 L -14 -42 z"
          fill={ROCK}
          stroke={OUTLINE}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <path d="M -26 -68 L -20 -82 L -8 -78 L -14 -64 z" fill={ROCK_LIT} opacity={0.45} />
        <path d="M 26 -68 L 20 -82 L 8 -78 L 14 -64 z" fill={ROCK_DEEP} opacity={0.4} />
        {/* Brow, nose ridge, cheeks, jaw: the geology of a face. */}
        <path d="M -22 -72 L -6 -75 L 6 -75 L 22 -72 L 22 -66 L 6 -69 L -6 -69 L -22 -66 z" fill={ROCK_DEEP} opacity={0.72} />
        <path d="M -3 -68 L 3 -68 L 4.6 -54 L -4.6 -54 z" fill={ROCK_LIT} opacity={0.32} />
        <path d="M -21 -60 L -11 -55 L -13 -46 L -22 -51 z" fill={ROCK_DEEP} opacity={0.38} />
        <path d="M 21 -60 L 11 -55 L 13 -46 L 22 -51 z" fill={ROCK_DEEP} opacity={0.38} />
        {/* The jaw, closing over the battlements. */}
        <path d="M -14 -50 L 14 -50 L 12 -42 L -12 -42 z" fill={ROCK_DEEP} opacity={0.5} />
        <path
          d="M -15 -44 C -12 -37 12 -37 15 -44 C 8 -40 -8 -40 -15 -44 z"
          fill={ROCK_DEEP}
          opacity={0.6}
        />
        {/* A level, broken skyline — steps rather than horns. */}
        {[
          'M -20 -82 L -19 -88 L -9 -90 L -8 -84 z',
          'M -2 -88 L -1 -94 L 7 -93 L 7 -87 z',
          'M 10 -84 L 11 -89 L 19 -86 L 20 -81 z',
        ].map((d, i) => (
          <path key={i} d={d} fill={ROCK} stroke={OUTLINE} strokeWidth={1.2} strokeLinejoin="round" />
        ))}
        {/* Eyes, set back under the brow: the only saturated thing here. */}
        {[-11, 11].map((x, i) => (
          <g key={i} className="skin__titan-eye" style={{ animationDelay: `${i * 0.35}s` }}>
            <circle cx={x} cy={-64} r={6.5} fill={`url(#skin-mc-eye-${uid})`} />
            <path
              d={`M ${x - 3.4} -64 L ${x} -66.4 L ${x + 3.4} -64 L ${x} -61.6 z`}
              fill="#fff0c8"
              stroke="#a33c05"
              strokeWidth={0.8}
            />
          </g>
        ))}
      </g>

      {/* ---- the hands, in front, holding the walls -------------------- */}
      {grip(-1, 0)}
      {grip(1, 1)}

      {/* Dust shaken loose. Falling, not rising: this thing is made of rock,
          and rock does not float. */}
      {[-70, -40, 36, 58, 74].map((x, i) => (
        <g key={i} className="skin__dust" style={{ animationDelay: `-${i * 1.3}s` }}>
          <circle cx={x} cy={-40} r={i % 2 ? 1.2 : 1.7} fill={ROCK_LIT} opacity={0.7} />
        </g>
      ))}
    </g>
  )
}

export const EarthDecor = {
  'earth.stonelines': StoneLines,
  'earth.temple': AncientTemple,
  'earth.cavern': CrystalCavern,
  'earth.colossus': MountColossus,
}
