import type { DecorProps } from './decor'
import './skins.css'

/**
 * Dark's skin decorations.
 *
 * Drawn INSIDE the castle's local space, over the sprite — the keep occupies
 * roughly x −20…20, y −58…−12, the curtain wall x −52…52, y −24…30, and the
 * gate x −11…11, y 10…30. Anything here is layered on top of that.
 *
 * ⚠️ DARK'S OUTLINE IS PALE, AND THAT IS NOT A STYLE CHOICE. A near-black
 * castle on a near-black battlefield is invisible, so the kingdom overrides the
 * sprite's dark stroke with its white accent (see kingdomThemes). Every skin
 * here keeps a light outline for the same reason — a "darker" Dark skin with a
 * black edge would delete the silhouette players read through fog.
 *
 * ⚠️ AND DARK IS NOT SPACE. Space is void-violet with starlight cyan and a sky
 * full of stars. Dark is near-black with bone white and a single bruised
 * violet, and there is not one star anywhere in it: its emptiness is a hole,
 * not a distance.
 *
 * ⚠️ ONE STROKED OUTLINE PER OBJECT. Everything inside it is an unstroked fill.
 */

const NIGHT = '#14121f'
const NIGHT_DEEP = '#07060d'
const VIOLET = '#7d4fd6'
const VIOLET_LIT = '#c9a6ff'
const BONE = '#e8e4f2'
const IRON = '#26232f'
const BLOOD = '#8e2038'

/**
 * A wisp of darkness: a tapered curl that thins to nothing.
 *
 * ⚠️ IT TAPERS WITH GEOMETRY, NOT WITH A STROKE. A stroked curve has the same
 * width all the way along, which reads as wire — the mistake behind Fire's
 * first phoenix wings. Two curves meeting at a point make smoke.
 */
function wisp(d: string, back: string, key: number, opacity = 0.8) {
  return (
    <g key={key} opacity={opacity}>
      <path d={d} fill={back} />
    </g>
  )
}

/**
 * Uncommon — Shadow Stripes.
 *
 * The standard castle in black and violet: diagonal banding across the walls,
 * shadow pooling at their feet, and smoke curling off the battlements.
 *
 * The lightest possible touch, like Water's Rippled Castle and Space's Star
 * Pattern: everything is clipped to the walls and the keep, so the silhouette
 * is exactly the default one.
 */
function ShadowStripes({ eliminated, uid }: DecorProps) {
  /**
   * ⚠️ THE STRIPES RUN DIAGONALLY. Horizontal bands on this sprite read as
   * courses of masonry (which is Earth's) and a mix of horizontals and
   * verticals reads as a railing (which is what Light's first wall became).
   * A rake belongs to neither.
   */
  const STRIPES = [-64, -46, -28, -10, 8, 26, 44, 62]

  return (
    <g className="skin skin--shadowstripes" opacity={eliminated ? 0.55 : 1} aria-hidden="true">
      <clipPath id={`skin-ss-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-ss-keep-${uid}`}>
        <rect x={-21} y={-59} width={42} height={48} rx={3} />
      </clipPath>
      <defs>
        <linearGradient id={`skin-ss-pool-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={NIGHT_DEEP} stopOpacity="0" />
          <stop offset="100%" stopColor={NIGHT_DEEP} stopOpacity="0.85" />
        </linearGradient>
      </defs>

      {/* ---- the wall ---------------------------------------------------- */}
      <g clipPath={`url(#skin-ss-wall-${uid})`}>
        {STRIPES.map((x, i) => (
          <path
            key={i}
            d={`M ${x} 30 L ${x + 9} 30 L ${x + 27} -24 L ${x + 18} -24 z`}
            fill={i % 2 ? VIOLET : NIGHT_DEEP}
            opacity={i % 2 ? 0.5 : 0.85}
          />
        ))}
        {/* Shadow pooling at the foot of the wall, which is what stops the
            banding from reading as wallpaper. */}
        <rect x={-52} y={6} width={104} height={24} fill={`url(#skin-ss-pool-${uid})`} />
        <path d="M -52 -24 L 52 -24 L 52 -19 L -52 -19 z" fill={NIGHT_DEEP} opacity={0.7} />
      </g>

      {/* ---- the keep ---------------------------------------------------- */}
      <g clipPath={`url(#skin-ss-keep-${uid})`}>
        {[-30, -12, 6, 24].map((x, i) => (
          <path
            key={i}
            d={`M ${x} -11 L ${x + 7} -11 L ${x + 23} -59 L ${x + 16} -59 z`}
            fill={i % 2 ? VIOLET : NIGHT_DEEP}
            opacity={i % 2 ? 0.45 : 0.8}
          />
        ))}
        <rect x={-21} y={-20} width={42} height={9} fill={NIGHT_DEEP} opacity={0.75} />
      </g>

      {/* ---- wisps off the battlements ------------------------------------
          Merlon centres are read from the sprite: the wall's are at −46, −24,
          24 and 46, and the keep's at −15, 0 and 15. They are not evenly
          spaced, and placing anything on them by eye lands it half a merlon
          out. */}
      {[
        { x: -46, s: -1 },
        { x: -24, s: 1 },
        { x: 24, s: -1 },
        { x: 46, s: 1 },
      ].map((m, i) =>
        wisp(
          /* ⚠️ WIDE ENOUGH TO BE SMOKE. The first curls were about two units
             across their whole length and read as insect antennae — a wisp
             needs a body at the base before it thins away, or it is a hair. */
          `M ${m.x - 4.2} -26 C ${m.x - 7 * m.s} -33 ${m.x + 7 * m.s} -39 ${m.x + 3 * m.s} -49
           C ${m.x + 3.4 * m.s} -40 ${m.x - 4 * m.s} -35 ${m.x + 4.2} -26 z`,
          NIGHT_DEEP,
          i,
          0.8,
        ),
      )}
      {[-15, 15].map((x, i) =>
        wisp(
          `M ${x - 3.4} -60 C ${x - 6} -68 ${x + 6} -72 ${x + 2.6} -81
           C ${x + 2.8} -72 ${x - 3.6} -69 ${x + 3.4} -60 z`,
          NIGHT_DEEP,
          i + 10,
          0.68,
        ),
      )}
      {/* A violet ember in each curl, so the smoke has a source. */}
      {[-46, -24, 24, 46].map((x, i) => (
        <circle key={i} cx={x} cy={-27} r={1.5} fill={VIOLET_LIT} opacity={0.85} />
      ))}
    </g>
  )
}

/**
 * Rare — Gothic Fortress.
 *
 * Black stone under enormous spires: iron-framed glass, gargoyles crouched on
 * the wall, and a portcullis across the gate.
 *
 * ⚠️ IT MUST NOT BE LIGHT'S CATHEDRAL. Both have spires and coloured glass, so
 * everything else is opposed: that one is white marble with a rose window and
 * daylight behind it; this is black stone with iron tracery, blood-red glass
 * and nothing behind it at all. Gargoyles are the tell — a cathedral that
 * looks cursed rather than sacred.
 */
function GothicFortress({ eliminated, uid }: DecorProps) {
  /** A spire: needle-thin, with a lit edge so black reads against black. */
  const spire = (x: number, base: number, h: number, w: number, key: number) => (
    <g key={key}>
      <path
        d={`M ${x - w} ${base} L ${x} ${base - h} L ${x + w} ${base} z`}
        fill={NIGHT}
        stroke={BONE}
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
      <path d={`M ${x - w} ${base} L ${x} ${base - h}`} stroke={BONE} strokeWidth={0.9} fill="none" opacity={0.5} />
      <path
        d={`M ${x - w * 0.5} ${base - h * 0.45} L ${x + w * 0.5} ${base - h * 0.45}`}
        stroke={IRON}
        strokeWidth={1.4}
        fill="none"
      />
      <circle cx={x} cy={base - h - 2.6} r={1.6} fill={VIOLET_LIT} stroke={NIGHT_DEEP} strokeWidth={0.6} />
    </g>
  )

  /** A lancet in iron, glazed blood-red. */
  const window = (x: number, key: number) => (
    <g key={key}>
      <path
        d={`M ${x - 5.4} 20 L ${x - 5.4} -2 Q ${x} -15 ${x + 5.4} -2 L ${x + 5.4} 20 z`}
        fill={NIGHT_DEEP}
      />
      <path
        d={`M ${x - 4.2} 19 L ${x - 4.2} -1.5 Q ${x} -12.6 ${x + 4.2} -1.5 L ${x + 4.2} 19 z`}
        fill={BLOOD}
        opacity={0.85}
      />
      <path d={`M ${x} 19 L ${x} -12`} stroke={IRON} strokeWidth={1.2} fill="none" />
      <path d={`M ${x - 4} 7 L ${x + 4} 7`} stroke={IRON} strokeWidth={1.1} fill="none" />
      <path
        d={`M ${x - 4.2} 19 L ${x - 4.2} -1.5 Q ${x} -12.6 ${x + 4.2} -1.5 L ${x + 4.2} 19`}
        fill="none"
        stroke={BONE}
        strokeWidth={1.1}
        opacity={0.75}
      />
    </g>
  )

  /**
   * A gargoyle: crouched, wings folded up, head thrust forward.
   *
   * ⚠️ ONE OUTLINE. Water's first leviathan head was eleven separately stroked
   * pieces and read as lego bricks; a creature this small has no margin for it
   * at all.
   */
  const gargoyle = (x: number, dir: 1 | -1, key: number) => (
    <g key={key} transform={`translate(${x} -24) scale(${dir} 1)`}>
      {/* ⚠️ IT NEEDS A POSE, NOT A SHAPE. The first one was a ten-point blob
          with a white edge and it read as a crumpled paper bird. A gargoyle is
          legible from four things and no fewer: haunches on the parapet, wings
          folded up BEHIND the shoulders, a head thrust forward past the chest,
          and feet gripping the edge. */}
      <path
        d="M -8 0 L -7 -5 L -10 -12 L -4.5 -8.5 L -6.5 -16 L -1 -9.5
           L 3 -12.5 L 9.5 -11.5 L 11 -8 L 5 -6.5 L 6 -2 L 8.5 0 z"
        fill={NIGHT}
        stroke={BONE}
        strokeWidth={0.9}
        strokeLinejoin="round"
      />
      {/* Wing membranes, so the two peaks read as folded wings. */}
      <path d="M -7 -5 L -10 -12 L -4.5 -8.5 z" fill={IRON} opacity={0.9} />
      <path d="M -4.5 -8.5 L -6.5 -16 L -1 -9.5 z" fill={IRON} opacity={0.75} />
      {/* Chest and snout. */}
      <path d="M -1 -9.5 L 3 -12.5 L 4 -7 L 0 -5 z" fill={NIGHT_DEEP} opacity={0.7} />
      <path d="M 9.5 -11.5 L 11 -8 L 6 -7 z" fill={IRON} opacity={0.85} />
      <circle cx={7.6} cy={-10.2} r={1.1} fill={VIOLET_LIT} />
    </g>
  )

  return (
    <g className="skin skin--gothicfortress" opacity={eliminated ? 0.55 : 1} aria-hidden="true">
      <clipPath id={`skin-gf-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-gf-keep-${uid}`}>
        <rect x={-21} y={-59} width={42} height={48} rx={3} />
      </clipPath>

      {/* ---- spires ------------------------------------------------------ */}
      {spire(-46, -20, 30, 5.5, 0)}
      {spire(46, -20, 30, 5.5, 1)}
      {spire(-28, -20, 40, 5, 2)}
      {spire(28, -20, 40, 5, 3)}
      {spire(0, -56, 42, 7, 4)}

      {/* ---- black stone, with pilasters rather than buttresses ---------- */}
      <g clipPath={`url(#skin-gf-wall-${uid})`}>
        <rect x={-52} y={-24} width={104} height={54} fill={NIGHT} opacity={0.9} />
        {[-52, -32, -12, 8, 28, 48].map((x, i) => (
          <g key={i}>
            <rect x={x} y={-24} width={4.5} height={54} fill={NIGHT_DEEP} />
            <rect x={x + 4.5} y={-24} width={1.4} height={54} fill={BONE} opacity={0.18} />
          </g>
        ))}
        <rect x={-52} y={-24} width={104} height={5} fill={IRON} />
        <path d="M -52 -19 L 52 -19" stroke={BONE} strokeWidth={1} fill="none" opacity={0.55} />
        {window(-40, 0)}
        {window(-22, 1)}
        {window(22, 2)}
        {window(40, 3)}
      </g>

      {/* ---- the keep: one great window --------------------------------- */}
      <g clipPath={`url(#skin-gf-keep-${uid})`}>
        <rect x={-21} y={-59} width={42} height={48} fill={NIGHT} opacity={0.9} />
        <path
          d="M -9 -18 L -9 -38 Q 0 -52 9 -38 L 9 -18 z"
          fill={NIGHT_DEEP}
          stroke={BONE}
          strokeWidth={1.2}
        />
        <path d="M -7 -19 L -7 -37 Q 0 -49 7 -37 L 7 -19 z" fill={BLOOD} opacity={0.8} />
        <path d="M 0 -19 L 0 -48" stroke={IRON} strokeWidth={1.3} fill="none" />
        <path d="M -6.6 -30 L 6.6 -30" stroke={IRON} strokeWidth={1.2} fill="none" />
        <path d="M -6.6 -24 L 6.6 -24" stroke={IRON} strokeWidth={1.1} fill="none" />
      </g>

      {/* ---- gargoyles, on the corners of the parapet -------------------- */}
      {gargoyle(-42, 1, 0)}
      {gargoyle(42, -1, 1)}

      {/* ---- the iron gate ----------------------------------------------- */}
      <path d="M -11 30 L -11 15 C -11 4 11 4 11 15 L 11 30 z" fill={NIGHT_DEEP} />
      {[-7.5, -3.7, 0, 3.7, 7.5].map((x, i) => (
        <path key={i} d={`M ${x} 30 L ${x} ${x === 0 ? 5.4 : 7.5}`} stroke={IRON} strokeWidth={1.6} fill="none" />
      ))}
      {[12, 20, 28].map((y, i) => (
        <path key={i} d={`M -10 ${y} L 10 ${y}`} stroke={IRON} strokeWidth={1.4} fill="none" />
      ))}
      <path
        d="M -11 30 L -11 15 C -11 4 11 4 11 15 L 11 30"
        fill="none"
        stroke={BONE}
        strokeWidth={1.8}
      />
    </g>
  )
}

/**
 * Rare — Void Fortress.
 *
 * A castle with pieces of itself missing: holes torn clean through the walls
 * into nothing, violet energy running along the tears, and the fragments that
 * came away still hanging in the air.
 *
 * ⚠️ THE HOLES NEVER TOUCH THE OUTLINE. A void that eats the edge of the sprite
 * eats the silhouette with it, and the silhouette is how a player knows who is
 * attacking them. Every tear sits inside the wall with stone all around it.
 *
 * ⚠️ AND IT MUST NOT BE GOTHIC FORTRESS. Same kingdom, same tier. That one is
 * dense — spires, iron, glass, more castle than the castle. This one is the
 * opposite: things REMOVED, and what is left is lit from inside the gaps.
 */
function VoidFortress({ eliminated, uid }: DecorProps) {
  /** A tear: a hard-edged hole with a lit rim on one side. */
  const tear = (d: string, key: number) => (
    <g key={key}>
      <path d={d} fill={NIGHT_DEEP} />
      <path d={d} fill="none" stroke={VIOLET} strokeWidth={1.6} opacity={0.9} />
      <path d={d} fill="none" stroke={VIOLET_LIT} strokeWidth={0.7} opacity={0.8} />
    </g>
  )

  /**
   * ⚠️ A TEAR IS JAGGED. Five points with gentle turns is a puddle — the first
   * set read as amoebas floating on the wall. Reality coming apart has splinter
   * angles in it: long straight runs meeting at sharp corners, with one spike
   * driven back into the stone.
   */
  const TEARS = [
    'M -46 -16 L -37 -19 L -30 -13 L -22 -17 L -19 -6 L -26 -1 L -23 6 L -34 4 L -41 8 L -43 -2 z',
    'M 18 -18 L 27 -14 L 33 -19 L 40 -11 L 45 -2 L 37 3 L 39 10 L 28 7 L 21 0 L 24 -8 z',
    'M -14 12 L -5 8 L 0 14 L 8 12 L 9 22 L 1 25 L 3 30 L -7 28 L -13 24 z',
  ]

  return (
    <g className="skin skin--voidfortress" opacity={eliminated ? 0.55 : 1} aria-hidden="true">
      <clipPath id={`skin-vf-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-vf-keep-${uid}`}>
        <rect x={-21} y={-59} width={42} height={48} rx={3} />
      </clipPath>
      <defs>
        <radialGradient id={`skin-vf-halo-${uid}`}>
          <stop offset="0%" stopColor={VIOLET} stopOpacity="0.45" />
          <stop offset="100%" stopColor={VIOLET} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ---- the wall ---------------------------------------------------- */}
      <g clipPath={`url(#skin-vf-wall-${uid})`}>
        <rect x={-52} y={-24} width={104} height={54} fill={NIGHT} opacity={0.75} />
        {/* Cracks running out of each tear. Short and branching: a long even
            zigzag in violet is a lightning bolt, and Electricity owns those. */}
        {[
          'M -22 -6 L -14 -4 L -10 -12 M -14 -4 L -12 4',
          'M 42 2 L 46 10 M 42 2 L 48 -2',
          'M 20 -16 L 14 -20 L 16 -24',
          'M 6 20 L 14 22 L 18 16',
          'M -42 2 L -48 8 M -44 -14 L -50 -18',
        ].map((d, i) => (
          <g key={i}>
            <path d={d} fill="none" stroke={VIOLET} strokeWidth={1.8} opacity={0.55} strokeLinecap="round" />
            <path d={d} fill="none" stroke={VIOLET_LIT} strokeWidth={0.8} opacity={0.9} strokeLinecap="round" />
          </g>
        ))}
        {TEARS.map((d, i) => (
          <g key={i}>
            <circle
              cx={i === 0 ? -33 : i === 1 ? 31 : -4}
              cy={i === 0 ? -6 : i === 1 ? -3 : 19}
              r={20}
              fill={`url(#skin-vf-halo-${uid})`}
            />
            {tear(d, i)}
          </g>
        ))}
      </g>

      {/* ---- the keep ---------------------------------------------------- */}
      <g clipPath={`url(#skin-vf-keep-${uid})`}>
        <rect x={-21} y={-59} width={42} height={48} fill={NIGHT} opacity={0.7} />
        <circle cx={2} cy={-34} r={18} fill={`url(#skin-vf-halo-${uid})`} />
        {tear('M -10 -44 L 4 -48 L 12 -36 L 4 -24 L -8 -28 z', 9)}
        {[
          'M 12 -36 L 18 -32 M -8 -28 L -12 -20',
          'M -10 -44 L -14 -50',
        ].map((d, i) => (
          <g key={i}>
            <path d={d} fill="none" stroke={VIOLET} strokeWidth={1.6} opacity={0.55} strokeLinecap="round" />
            <path d={d} fill="none" stroke={VIOLET_LIT} strokeWidth={0.7} opacity={0.9} strokeLinecap="round" />
          </g>
        ))}
      </g>

      {/* ---- the pieces that came away -----------------------------------
          They hang OUTSIDE the walls, which is a rare's licence, and they are
          the thing that says the stone went somewhere rather than simply
          being painted black. */}
      {/* ⚠️ THE PIECES ARE BROKEN STONE, NOT CONFETTI. Four-point quads with a
          bright edge, scattered evenly at similar sizes, read as diamonds — the
          first set looked like UI decoration sprinkled over the castle. Chunks
          need uneven silhouettes, a lit top face where the light catches, and
          sizes that differ enough to say one wall came apart rather than that
          someone applied a pattern. */}
      {[
        { x: -62, y: -10, s: 7.5, r: 16 },
        { x: -68, y: 12, s: 4, r: -28 },
        { x: 60, y: -22, s: 6, r: 34 },
        { x: 67, y: 6, s: 3.2, r: -14 },
        { x: 34, y: -38, s: 4.4, r: 22 },
      ].map((f, i) => (
        <g key={i} transform={`translate(${f.x} ${f.y}) rotate(${f.r})`}>
          <path
            /* Two silhouettes, alternating: one a long splinter, one a blunt
               shard. A single formula for all of them produced five identical
               hexagons, which read as nuts rather than as rubble. */
            d={
              i % 2 === 0
                ? `M ${-f.s} ${-f.s * 0.35} L ${-f.s * 0.2} ${-f.s} L ${f.s * 0.9} ${-f.s * 0.45}
                   L ${f.s * 0.55} ${f.s * 0.35} L ${-f.s * 0.45} ${f.s} z`
                : `M ${-f.s * 0.9} ${-f.s * 0.8} L ${f.s * 0.5} ${-f.s} L ${f.s} ${f.s * 0.2}
                   L ${-f.s * 0.1} ${f.s * 0.9} L ${-f.s} ${f.s * 0.1} z`
            }
            fill={NIGHT}
            stroke={BONE}
            strokeWidth={0.9}
            strokeLinejoin="round"
            opacity={0.95}
          />
          <path
            d={`M ${-f.s * 0.9} ${-f.s * 0.5} L ${f.s * 0.4} ${-f.s * 0.9} L ${f.s * 0.1} ${-f.s * 0.1} z`}
            fill={VIOLET}
            opacity={0.35}
          />
        </g>
      ))}

      {/* The gate opens onto the same nothing. */}
      <path d="M -11 30 L -11 15 C -11 4 11 4 11 15 L 11 30 z" fill={NIGHT_DEEP} />
      <path
        d="M -11 30 L -11 15 C -11 4 11 4 11 15 L 11 30"
        fill="none"
        stroke={VIOLET}
        strokeWidth={2}
      />
    </g>
  )
}

/**
 * Legendary — Abyssal Throne.
 *
 * The fortress over a hole in the world: an eclipse standing behind it,
 * tendrils of shadow come up out of the dark to hold it, and a throne burning
 * violet in the gateway.
 *
 * ⚠️ THE TENDRILS ARE SPLIT FAR AND NEAR, like Electricity's rings and Space's
 * orbits. All behind and the castle sits on top of them like a model on a
 * plinth; all in front and they cover the silhouette. Far ones are clipped and
 * pass behind, near ones cross the outer edges of the wall only.
 */
function AbyssalThrone({ eliminated, uid }: DecorProps) {
  /**
   * A tendril, built from a spine rather than drawn by hand.
   *
   * ⚠️ FILLED AND TAPERED, NEVER STROKED. A stroked curve is the same width for
   * its whole length with a rounded cap on the end, and at this scale that is a
   * CABLE — the first build hung four off the castle and they read as bag
   * handles. Same lesson as the phoenix's wings.
   *
   * ⚠️ AND NARROW. The second build filled them by hand and made them 25 units
   * across at the base, which is half the height of the curtain wall: they came
   * out as black CURTAINS draped over the castle, covering the very silhouette
   * they are supposed to be gripping. Width is a fraction of the wall now, and
   * it falls away to nothing at the tip.
   *
   * The spine is one cubic; the outline walks up one side and back down the
   * other, offsetting along the normal by a width that decays with t.
   */
  const tendril = (
    p0: [number, number],
    p1: [number, number],
    p2: [number, number],
    p3: [number, number],
    w: number,
    key: number,
    delay: number,
  ) => {
    const N = 18
    const at = (t: number): [number, number] => {
      const u = 1 - t
      return [
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      ]
    }
    const left: string[] = []
    const right: string[] = []
    for (let i = 0; i <= N; i++) {
      const t = i / N
      const [x, y] = at(t)
      const [x2, y2] = at(Math.min(1, t + 0.02))
      const dx = x2 - x
      const dy = y2 - y
      const len = Math.hypot(dx, dy) || 1
      /* Width decays fast, so most of the tendril is thin and only its root is
         heavy — a linear taper reads as a wedge. */
      const half = (w * Math.pow(1 - t, 1.6)) / 2
      const nx = (-dy / len) * half
      const ny = (dx / len) * half
      left.push(`${(x + nx).toFixed(1)} ${(y + ny).toFixed(1)}`)
      right.unshift(`${(x - nx).toFixed(1)} ${(y - ny).toFixed(1)}`)
    }
    const d = `M ${left.join(' L ')} L ${right.join(' L ')} z`
    const spine = `M ${p0[0]} ${p0[1]} C ${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]} ${p3[0]} ${p3[1]}`
    return (
      <g key={key} className="skin__tendril" style={{ animationDelay: `${delay}s` }}>
        {/* ⚠️ NOT BLACK. Filled with the same near-black as the background, a
            tendril is invisible except for its edge — which put the build back
            to the wire it started as. It carries its own value: a bruised
            violet-black that reads against the battlefield, with a lit rim
            down the leading side. */}
        <path d={d} fill={`url(#skin-at2-limb-${uid})`} />
        <path d={d} fill="none" stroke={VIOLET} strokeWidth={0.9} opacity={0.45} strokeLinejoin="round" />
        <path d={spine} fill="none" stroke={VIOLET_LIT} strokeWidth={1} opacity={0.35} strokeLinecap="round" />
      </g>
    )
  }

  return (
    <g className="skin skin--abyssalthrone" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-at2-outside-${uid}`} clipRule="evenodd">
        <path
          d="M -92 -128 L 92 -128 L 92 44 L -92 44 z
             M -53 -25 L 53 -25 L 53 31 L -53 31 z
             M -21 -59 L 21 -59 L 21 -11 L -21 -11 z"
          clipRule="evenodd"
        />
      </clipPath>
      <clipPath id={`skin-at2-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-at2-keep-${uid}`}>
        <rect x={-21} y={-59} width={42} height={48} rx={3} />
      </clipPath>
      <defs>
        <radialGradient id={`skin-at2-corona-${uid}`} gradientUnits="userSpaceOnUse" cx={0} cy={-76} r={54}>
          <stop offset="52%" stopColor={VIOLET} stopOpacity="0" />
          <stop offset="62%" stopColor={VIOLET_LIT} stopOpacity="0.55" />
          <stop offset="72%" stopColor={VIOLET} stopOpacity="0.24" />
          <stop offset="100%" stopColor={VIOLET} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`skin-at2-throne-${uid}`}>
          <stop offset="0%" stopColor={VIOLET_LIT} stopOpacity="0.9" />
          <stop offset="60%" stopColor={VIOLET} stopOpacity="0.35" />
          <stop offset="100%" stopColor={VIOLET} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`skin-at2-limb-${uid}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#2a1f47" />
          <stop offset="60%" stopColor="#1a1330" />
          <stop offset="100%" stopColor="#0d0a18" />
        </linearGradient>
        <linearGradient id={`skin-at2-rock-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#221a3a" />
          <stop offset="55%" stopColor="#120e22" />
          <stop offset="100%" stopColor="#08060f" />
        </linearGradient>
        <linearGradient id={`skin-at2-portal-${uid}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#3a2470" />
          <stop offset="45%" stopColor="#6f45c0" />
          <stop offset="100%" stopColor="#c9a6ff" />
        </linearGradient>
        <linearGradient id={`skin-at2-panel-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#221b3b" />
          <stop offset="100%" stopColor="#0c0918" />
        </linearGradient>
      </defs>

      <g clipPath={`url(#skin-at2-outside-${uid})`}>
        {/* ---- the eclipse ------------------------------------------------
            A black disc: the corona is the only thing that proves it is there,
            which is exactly why it can be pure black and still read at 60%. */}
        <g className="skin__eclipse">
          <circle cx={0} cy={-76} r={54} fill={`url(#skin-at2-corona-${uid})`} />
        </g>
        <circle cx={0} cy={-76} r={29} fill={NIGHT_DEEP} />
        <circle cx={0} cy={-76} r={29} fill="none" stroke={VIOLET_LIT} strokeWidth={1.4} opacity={0.6} />
        {/* Shards holding station around it, so the eclipse belongs to the
            same object as the castle rather than being a backdrop behind it. */}
        {[
          { a: -152, r: 41, s: 5.5 },
          { a: -100, r: 45, s: 3.6 },
          { a: -28, r: 42, s: 4.8 },
        ].map((sh, i) => {
          const rad = (sh.a * Math.PI) / 180
          const x = Math.cos(rad) * sh.r
          const y = -76 + Math.sin(rad) * sh.r
          return (
            <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${sh.a + 90})`}>
              <path
                d={`M 0 ${-sh.s * 1.8} L ${sh.s * 0.7} 0 L 0 ${sh.s * 1.2} L ${-sh.s * 0.7} 0 z`}
                fill={`url(#skin-at2-limb-${uid})`}
                stroke={VIOLET_LIT}
                strokeWidth={1}
                strokeLinejoin="round"
              />
            </g>
          )
        })}

        {/* ---- far tendrils, rising behind the fortress ------------------- */}
        {(
          [
            [[-72, 40], [-70, 4], [-58, -16], [-34, -34], 13, 0],
            [[74, 40], [72, 6], [58, -14], [34, -32], 12, 1.1],
            [[-40, 42], [-40, 16], [-34, -2], [-22, -20], 9, 2.2],
            [[46, 42], [46, 14], [40, -4], [26, -22], 8.5, 0.6],
          ] as [number[], number[], number[], number[], number, number][]
        ).map((t, i) =>
          tendril(
            t[0] as [number, number],
            t[1] as [number, number],
            t[2] as [number, number],
            t[3] as [number, number],
            t[4],
            i,
            t[5],
          ),
        )}
      </g>

      {/* ---- the island the fortress stands on --------------------------
          ⚠️ THIS IS WHAT MAKES IT ONE OBJECT. Without it the skin was an
          eclipse, a castle and some tendrils sharing a frame — three things
          that happened to be near each other. The castle needs ground, the
          tendrils need somewhere to grip, and "floating" needs a bottom edge
          you can see: a slab of obsidian with nothing under it says all three
          at once. */}
      <path
        d="M -62 30 L 62 30 L 56 36 L 44 34 L 34 40 L 22 36 L 12 43 L 0 38
           L -12 43 L -22 36 L -34 40 L -44 34 L -56 36 z"
        fill={`url(#skin-at2-rock-${uid})`}
        stroke={VIOLET}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <path
        d="M -62 30 L 62 30"
        stroke={VIOLET_LIT}
        strokeWidth={1.6}
        opacity={0.75}
        fill="none"
      />
      {/* Cracks in the slab, lit from underneath. */}
      {['M -40 30 L -36 37', 'M -14 30 L -10 39', 'M 16 30 L 20 38', 'M 42 30 L 46 35'].map((d, i) => (
        <path key={i} d={d} stroke={VIOLET} strokeWidth={1.1} fill="none" opacity={0.55} />
      ))}

      {/* ---- the fortress ------------------------------------------------ */}
      <g clipPath={`url(#skin-at2-wall-${uid})`}>
        <rect x={-52} y={-24} width={104} height={54} fill={`url(#skin-at2-panel-${uid})`} />
        {/* Pilasters, so the wall is built rather than painted. */}
        {/* ⚠️ FOUR BAYS, NOT SIX. Six pilasters and four lit seams put ten
            vertical lines across a 104-unit wall, and evenly spaced verticals
            at that density are prison bars — the same trap that turned Light's
            first wall into a railing. Wide bays with one seam each read as
            architecture. */}
        {[-52, -28, 22, 47].map((x, i) => (
          <g key={i}>
            <rect x={x} y={-24} width={5.5} height={54} fill={NIGHT_DEEP} />
            <rect x={x + 5.5} y={-24} width={1.2} height={54} fill={VIOLET} opacity={0.28} />
          </g>
        ))}
        {/* Cornice and plinth: the top and bottom edges a finished wall has. */}
        <rect x={-52} y={-24} width={104} height={6} fill={NIGHT_DEEP} />
        <path d="M -52 -18 L 52 -18" stroke={VIOLET_LIT} strokeWidth={1.1} fill="none" opacity={0.6} />
        <rect x={-52} y={12} width={104} height={18} fill={VIOLET} opacity={0.07} />
        <rect x={-52} y={24} width={104} height={6} fill={NIGHT_DEEP} />
        <path d="M -52 24 L 52 24" stroke={VIOLET_LIT} strokeWidth={1.1} fill="none" opacity={0.5} />
        {/* Seams, breathing. */}
        {/* An inset panel in each bay. Empty black rectangles read as unfinished;
            a recessed frame is the difference between a wall and a placeholder,
            and it costs four lines. */}
        {[-45, 25].map((x, i) => (
          <g key={`bay${i}`}>
            <rect x={x} y={-12} width={22} height={32} fill={NIGHT_DEEP} opacity={0.8} />
            <rect
              x={x}
              y={-12}
              width={22}
              height={32}
              fill="none"
              stroke={VIOLET}
              strokeWidth={0.9}
              opacity={0.45}
            />
            <path d={`M ${x + 2} ${-9} L ${x + 20} ${-9}`} stroke={VIOLET_LIT} strokeWidth={0.7} fill="none" opacity={0.4} />
          </g>
        ))}
        {/* Rim light just inside the silhouette: the fortress is lit from
            behind by the eclipse, and this is what says so. */}
        <rect
          x={-50.5}
          y={-22.5}
          width={101}
          height={51}
          rx={3}
          fill="none"
          stroke={VIOLET_LIT}
          strokeWidth={1.2}
          opacity={0.35}
        />
        {[-38, 38].map((x, i) => (
          <g key={i} className="skin__abyss-vein" style={{ animationDelay: `${i * 0.9}s` }}>
            <path d={`M ${x} 24 L ${x} -18`} stroke={VIOLET} strokeWidth={4} opacity={0.18} fill="none" />
            <path d={`M ${x} 24 L ${x} -18`} stroke={VIOLET_LIT} strokeWidth={1.1} fill="none" />
          </g>
        ))}
      </g>

      {/* ---- the keep, framed as a niche --------------------------------
          A pointed arch around the keep ties it to the eclipse standing behind
          it: without the frame the disc sits BEHIND a plain tower, and with it
          the tower is the thing the disc is arranged around. */}
      <g clipPath={`url(#skin-at2-keep-${uid})`}>
        <rect x={-21} y={-59} width={42} height={48} fill={`url(#skin-at2-panel-${uid})`} />
        {/* ⚠️ THE OPENINGS CARRY THE LIGHT. Filled near-black, the niche and the
            gate were two dark shapes stacked under a dark tower, and the throne
            standing in front of them disappeared into the same value — the
            whole middle of the skin was one black column. Lit from inside, they
            become a hierarchy the eye can climb: eclipse, portal, throne. */}
        <path
          d="M -15 -11 L -15 -38 Q 0 -56 15 -38 L 15 -11"
          fill={`url(#skin-at2-portal-${uid})`}
          opacity={0.55}
          stroke={VIOLET_LIT}
          strokeWidth={1.4}
        />
        <path
          d="M -11 -11 L -11 -37 Q 0 -51 11 -37 L 11 -11"
          fill="none"
          stroke={VIOLET_LIT}
          strokeWidth={1}
          opacity={0.75}
        />
        <g className="skin__abyss-vein">
          <path d="M 0 -11 L 0 -48" stroke={VIOLET_LIT} strokeWidth={1.2} fill="none" opacity={0.8} />
        </g>
      </g>

      {/* ---- obsidian on the battlements --------------------------------
          Merlon centres are read from the sprite: the wall's are at −46, −24,
          24 and 46 and the keep's at −15, 0 and 15. They are not evenly
          spaced, and anything placed on them by eye lands half a merlon out. */}
      {[-46, -24, 24, 46].map((x, i) => (
        <g key={i}>
          {/* Obsidian, not bunting: narrow, tall, and dark with one lit edge.
              A short pale triangle on a merlon is a tent. */}
          <path
            d={`M ${x - 2.8} -25 L ${x} -39 L ${x + 2.8} -25 z`}
            fill={`url(#skin-at2-limb-${uid})`}
            stroke={VIOLET_LIT}
            strokeWidth={0.9}
            strokeLinejoin="round"
          />
          <path d={`M ${x - 2.8} -25 L ${x} -39`} stroke={VIOLET_LIT} strokeWidth={0.9} fill="none" opacity={0.7} />
        </g>
      ))}
      {[-15, 0, 15].map((x, i) => (
        <path
          key={i}
          d={`M ${x - 2.2} -60 L ${x} -71 L ${x + 2.2} -60 z`}
          fill={`url(#skin-at2-limb-${uid})`}
          stroke={VIOLET_LIT}
          strokeWidth={0.9}
          strokeLinejoin="round"
        />
      ))}

      {/* ---- the throne ---------------------------------------------------
          ⚠️ IT HAS TO BE THE CENTREPIECE, NOT A DETAIL IN A DOORWAY. The skin
          is named after it, and the first version was a six-unit shape lost in
          the gate arch. The back now rises out of the gateway and onto the
          wall, so the throne is the first thing the eye lands on and the rest
          of the castle is arranged around it. */}
      <g className="skin__throne">
        <circle cx={0} cy={6} r={26} fill={`url(#skin-at2-throne-${uid})`} />
      </g>
      <path
        d="M -11 30 L -11 15 C -11 4 11 4 11 15 L 11 30 z"
        fill={`url(#skin-at2-portal-${uid})`}
        opacity={0.75}
      />
      {/* Steps up to it. */}
      <path d="M -13 30 L 13 30 L 11 26 L -11 26 z" fill={NIGHT} stroke={VIOLET} strokeWidth={0.9} />
      {/* ⚠️ A THRONE IS WIDE AND SQUARE-SHOULDERED. The first one swept from a
          narrow seat to a point with two fins off the sides, which is a ROCKET
          — or a dagger, depending on how long you look. What makes it a throne
          is a back broader than the seat, flat shoulders with finials standing
          on them, and armrests you could put an arm on. */}
      <path
        d="M -10 27 L -10 16 L -9 -1 L -10 -8 L -5.5 -8 L -4 -13 L -2 -8
           L 2 -8 L 4 -13 L 5.5 -8 L 10 -8 L 9 -1 L 10 16 L 10 27 z"
        fill={NIGHT}
        stroke={VIOLET_LIT}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      {/* Back panel, lit from within. */}
      <path d="M -6.6 -6 L 6.6 -6 L 6 14 L -6 14 z" fill={VIOLET_LIT} opacity={0.4} />
      <path d="M -6.6 -6 L 6.6 -6 L 6.2 -1 L -6.2 -1 z" fill={VIOLET_LIT} opacity={0.7} />
      {/* Armrests: the detail that reads as furniture at any size. */}
      <path d="M -13 18 L -8 18 L -8 14 L -13 15 z" fill={NIGHT} stroke={VIOLET_LIT} strokeWidth={1} strokeLinejoin="round" />
      <path d="M 13 18 L 8 18 L 8 14 L 13 15 z" fill={NIGHT} stroke={VIOLET_LIT} strokeWidth={1} strokeLinejoin="round" />
      {/* The seat. */}
      <path d="M -8 27 L 8 27 L 8 18 L -8 18 z" fill={NIGHT_DEEP} stroke={VIOLET} strokeWidth={0.9} />
      <g className="skin__abyss-vein" style={{ animationDelay: '1.1s' }}>
        <path d="M 0 20 L 0 -12" stroke={VIOLET_LIT} strokeWidth={1.2} fill="none" opacity={0.8} />
      </g>
      <path
        d="M -11 30 L -11 15 C -11 4 11 4 11 15 L 11 30"
        fill="none"
        stroke={VIOLET}
        strokeWidth={2}
      />

      {/* ---- near tendrils, gripping the island ------------------------
          They come up OUTSIDE the wall and curl onto the slab, which is what
          connects the three parts of the skin into one shape. Only their thin
          upper half crosses the wall's outer edge — a tendril across the
          middle would cover the gate, and covering the silhouette is the line
          no skin crosses. */}
      {(
        [
          [[-70, 44], [-72, 22], [-64, 8], [-52, -14], 12, 1.6],
          [[68, 44], [70, 24], [62, 10], [50, -12], 11, 0.3],
        ] as [number[], number[], number[], number[], number, number][]
      ).map((t, i) =>
        tendril(
          t[0] as [number, number],
          t[1] as [number, number],
          t[2] as [number, number],
          t[3] as [number, number],
          t[4],
          i + 20,
          t[5],
        ),
      )}

      {/* Embers coming up out of the dark under the island. */}
      {[-50, -26, 22, 44].map((x, i) => (
        <g key={i} className="skin__mote" style={{ animationDelay: `-${i * 1.4}s` }}>
          <circle cx={x} cy={40} r={i % 2 ? 1.4 : 1.9} fill={VIOLET_LIT} />
        </g>
      ))}
    </g>
  )
}

export const DarkDecor = {
  'dark.stripes': ShadowStripes,
  'dark.gothic': GothicFortress,
  'dark.void': VoidFortress,
  'dark.abyssal': AbyssalThrone,
}
