import type { DecorProps } from './decor'
import './skins.css'

/**
 * Magma's skin decorations.
 *
 * Drawn INSIDE the castle's local space, over the sprite — the keep occupies
 * roughly x −20…20, y −58…−12, the curtain wall x −52…52, y −24…30, and the
 * gate x −11…11, y 10…30. Anything here is layered on top of that.
 *
 * ⚠️ THE SILHOUETTE AND THE HUE ARE NOT NEGOTIABLE. Players pick out who is
 * attacking them from a small castle on a phone, often through fog. A skin may
 * add detail and texture; it may not obscure the shape.
 *
 * ⚠️ MAGMA IS ROCK, NOT FIRE. This is the collision the whole kingdom has to
 * survive: Fire owns flame — tongues, tapers, licks, embers — and anything
 * shaped like one here reads as the wrong kingdom at 60%. Magma is molten STONE:
 * a black crust with light coming up through the cracks in it, moving slowly if
 * at all. Every glow in these skins is a seam in something solid, never a
 * flame, and the palette runs cooler at the top end than Fire's does: basalt
 * black and deep red, with orange only where the crust is broken.
 *
 * ⚠️ ONE STROKED OUTLINE PER OBJECT. Everything inside it is an unstroked fill.
 */

const BASALT = '#2a1008'
const BASALT_LIT = '#4a2013'
const ROCK = '#a8320a'
const MOLTEN = '#ff7518'
const MOLTEN_LIT = '#ffd07a'
const ASH = '#6b5f5a'
const OUTLINE = '#1a0803'

/**
 * A crack: charred edges with light in the bottom of it.
 *
 * ⚠️ A GLOWING LINE ON ITS OWN IS A NEON TUBE. What makes this read as a split
 * in stone is the dark on either side of it — the crust is cold, and only the
 * depth of the crack is lit. Same reason Earth's carvings needed a shadow.
 */
function crack(d: string, key: number, w = 2.6, glow = true) {
  return (
    <g key={key}>
      {glow ? <path d={d} fill="none" stroke={MOLTEN} strokeWidth={w * 2.6} opacity={0.14} strokeLinecap="round" /> : null}
      <path d={d} fill="none" stroke={OUTLINE} strokeWidth={w} strokeLinecap="round" />
      <path d={d} fill="none" stroke={MOLTEN} strokeWidth={w * 0.5} strokeLinecap="round" />
      <path d={d} fill="none" stroke={MOLTEN_LIT} strokeWidth={w * 0.2} strokeLinecap="round" opacity={0.9} />
    </g>
  )
}

/**
 * Uncommon — Lava Cracks.
 *
 * The standard castle with the heat still in it: cracks running through the
 * walls with light in the bottom of them, and molten drips cooling on the
 * battlements.
 *
 * The lightest possible touch, like Water's Rippled Castle and Space's Star
 * Pattern: everything is clipped to the walls and the keep, so the silhouette
 * is exactly the default one.
 */
function LavaCracks({ eliminated, uid }: DecorProps) {
  /**
   * ⚠️ CRACKS BRANCH, AND THEY DO NOT MEET AT EVEN ANGLES. A row of parallel
   * jags is a lightning bolt (Electricity's) and a neat network is a circuit
   * board (also Electricity's). Stone splits along one main line with shorter
   * ones running off it at irregular angles, and the branches get thinner.
   */
  const WALL_CRACKS = [
    'M -52 -6 L -40 -2 L -30 -10 L -18 -4',
    'M -30 -10 L -26 -20',
    'M -40 -2 L -38 8 L -44 16',
    'M 52 2 L 40 6 L 30 -2 L 20 4',
    'M 30 -2 L 32 -14',
    'M 40 6 L 42 16 L 36 24',
    'M -6 30 L -2 20 L -8 12',
    'M 12 30 L 8 22 L 14 14 L 10 6',
  ]

  return (
    <g className="skin skin--lavacracks" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-lc-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-lc-keep-${uid}`}>
        <rect x={-21} y={-59} width={42} height={48} rx={3} />
      </clipPath>

      {/* ---- the wall ---------------------------------------------------- */}
      <g clipPath={`url(#skin-lc-wall-${uid})`}>
        {/* Cooled crust over the stone, so the cracks have something to be
            cracks IN. */}
        <rect x={-52} y={-24} width={104} height={54} fill={BASALT} opacity={0.55} />
        {[
          'M -52 -14 C -34 -18 -18 -12 0 -16 C 18 -20 34 -14 52 -18',
          'M -52 12 C -32 8 -16 14 2 10 C 20 6 36 12 52 8',
        ].map((d, i) => (
          <path key={i} d={d} fill="none" stroke={BASALT_LIT} strokeWidth={2.4} opacity={0.6} />
        ))}
        {WALL_CRACKS.map((d, i) => crack(d, i, i % 3 === 0 ? 3 : 2))}
        {/* Heat pooling at the foot of the wall: the ground under a hot castle
            is the cheapest way to say the whole thing is still cooling. */}
        <rect x={-52} y={22} width={104} height={8} fill={MOLTEN} opacity={0.18} />
        <path d="M -52 24 C -30 21 -10 26 10 23 C 30 20 40 25 52 23" fill="none" stroke={MOLTEN} strokeWidth={1.6} opacity={0.75} />
      </g>

      {/* ---- the keep ---------------------------------------------------- */}
      <g clipPath={`url(#skin-lc-keep-${uid})`}>
        <rect x={-21} y={-59} width={42} height={48} fill={BASALT} opacity={0.5} />
        {[
          'M 0 -11 L 4 -22 L -2 -32 L 2 -44 L -2 -56',
          'M 4 -22 L 14 -26',
          'M -2 -32 L -12 -34',
          'M 2 -44 L 12 -48',
        ].map((d, i) => crack(d, i + 20, i === 0 ? 3 : 1.8))}
      </g>

      {/* ---- molten drips off the battlements ---------------------------
          Merlon centres come from the sprite: the wall's are at −46, −24, 24
          and 46 and the keep's at −15, 0 and 15.
          ⚠️ A DRIP HANGS AND SWELLS. A tapering spike pointing down is an
          icicle, which belongs to Ice; molten rock is heavy and gathers into a
          bead at the bottom before it falls. */}
      {[
        { x: -46, len: 9 },
        { x: -24, len: 6 },
        { x: 24, len: 7.5 },
        { x: 46, len: 5 },
      ].map((d, i) => (
        <g key={i}>
          <circle cx={d.x} cy={-20 + d.len} r={4.6} fill={MOLTEN} opacity={0.18} />
          <path
            d={`M ${d.x - 2.2} -22 C ${d.x - 2.4} ${-22 + d.len * 0.6} ${d.x - 2.6} ${-20 + d.len} ${d.x} ${-19 + d.len}
                C ${d.x + 2.6} ${-20 + d.len} ${d.x + 2.4} ${-22 + d.len * 0.6} ${d.x + 2.2} -22 z`}
            fill={MOLTEN}
            stroke={OUTLINE}
            strokeWidth={0.9}
            strokeLinejoin="round"
          />
          <path
            d={`M ${d.x - 0.9} -21 C ${d.x - 1} ${-21 + d.len * 0.6} ${d.x - 1} ${-20 + d.len * 0.9} ${d.x} ${-19.6 + d.len}`}
            fill="none"
            stroke={MOLTEN_LIT}
            strokeWidth={1.1}
            opacity={0.9}
          />
        </g>
      ))}
      {[-15, 0, 15].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={-54} r={3.4} fill={MOLTEN} opacity={0.2} />
          <path
            d={`M ${x - 1.7} -56 C ${x - 1.8} -53.6 ${x - 2} -52.4 ${x} -51.8
                C ${x + 2} -52.4 ${x + 1.8} -53.6 ${x + 1.7} -56 z`}
            fill={MOLTEN}
            stroke={OUTLINE}
            strokeWidth={0.8}
            strokeLinejoin="round"
          />
        </g>
      ))}

      {/* ---- the gate: the arch has split ------------------------------- */}
      {crack('M -12 30 L -12 15 C -12 4 12 4 12 15 L 12 30', 40, 2.4)}
    </g>
  )
}

/**
 * Rare — Volcano Fortress.
 *
 * The castle sitting in a live crater: the cone rising behind it, lava running
 * down between the towers into a pool at its foot, and smoke going up.
 *
 * ⚠️ THE SMOKE IS NOT FLAME. Fire owns everything with a tongue on it. Smoke
 * is built from soft overlapping lobes that widen as they rise, with no points
 * anywhere — and it is grey-brown rather than orange, so at 60% the two
 * kingdoms never trade places.
 */
function VolcanoFortress({ eliminated, uid }: DecorProps) {
  /**
   * A smoke plume.
   *
   * ⚠️ NOT A STRING OF CIRCLES. Drawn as separate discs it reads as bubbles or
   * as a cartoon cloud — each circle keeps its own edge and the eye counts
   * them. Smoke is ONE mass that widens as it climbs and drifts as it widens,
   * so the column is a single path with lobes bulging off its sides, and the
   * only thing that varies down its length is width and opacity.
   *
   * ⚠️ AND IT HAS NO POINTS ANYWHERE. Fire owns every shape with a tongue on
   * it; a plume that tapers to a tip at the top is a flame in grey paint.
   */
  const smoke = (x: number, y: number, s: number, drift: number, key: number, cls?: string, delay = 0) => {
    const h = 46 * s
    const w0 = 7 * s
    const w1 = 20 * s
    const dx = drift
    return (
      <g key={key} className={cls} style={cls ? { animationDelay: `${delay}s` } : undefined} opacity={0.72}>
        <path
          d={`M ${x - w0} ${y}
              C ${x - w0 * 1.6} ${y - h * 0.28} ${x + dx * 0.3 - w1 * 0.8} ${y - h * 0.5} ${x + dx * 0.55 - w1 * 0.72} ${y - h * 0.72}
              C ${x + dx * 0.8 - w1} ${y - h * 0.94} ${x + dx - w1 * 0.5} ${y - h * 1.12} ${x + dx} ${y - h * 1.1}
              C ${x + dx + w1 * 0.62} ${y - h * 1.14} ${x + dx * 0.9 + w1} ${y - h * 0.92} ${x + dx * 0.6 + w1 * 0.66} ${y - h * 0.7}
              C ${x + dx * 0.35 + w1 * 0.6} ${y - h * 0.46} ${x + w0 * 1.7} ${y - h * 0.24} ${x + w0} ${y} z`}
          fill={ASH}
          opacity={0.5}
        />
        {/* Two lobes bulging off the column, so its edge is not a smooth taper. */}
        <circle cx={x + dx * 0.5 - w1 * 0.5} cy={y - h * 0.62} r={w1 * 0.52} fill={ASH} opacity={0.42} />
        <circle cx={x + dx * 0.85 + w1 * 0.3} cy={y - h * 0.98} r={w1 * 0.58} fill={ASH} opacity={0.38} />
        <circle cx={x + dx * 0.2} cy={y - h * 0.3} r={w0 * 1.5} fill={ASH} opacity={0.34} />
      </g>
    )
  }

  /** A lava run: a dark channel with the flow lit inside it. */
  const flow = (d: string, key: number, w = 6) => (
    <g key={key}>
      <path d={d} fill="none" stroke={MOLTEN} strokeWidth={w * 2.2} opacity={0.13} strokeLinecap="round" />
      <path d={d} fill="none" stroke={BASALT} strokeWidth={w} strokeLinecap="round" />
      <path d={d} fill="none" stroke={ROCK} strokeWidth={w * 0.66} strokeLinecap="round" />
      <path d={d} fill="none" stroke={MOLTEN} strokeWidth={w * 0.4} strokeLinecap="round" />
      <path d={d} fill="none" stroke={MOLTEN_LIT} strokeWidth={w * 0.16} strokeLinecap="round" opacity={0.9} />
    </g>
  )

  return (
    <g className="skin skin--volcanofortress" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-vf2-outside-${uid}`} clipRule="evenodd">
        <path
          d="M -92 -128 L 92 -128 L 92 44 L -92 44 z
             M -53 -25 L 53 -25 L 53 31 L -53 31 z
             M -21 -59 L 21 -59 L 21 -11 L -21 -11 z"
          clipRule="evenodd"
        />
      </clipPath>
      <clipPath id={`skin-vf2-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <defs>
        <linearGradient id={`skin-vf2-cone-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BASALT_LIT} />
          <stop offset="60%" stopColor={BASALT} />
          <stop offset="100%" stopColor="#170703" />
        </linearGradient>
        <radialGradient id={`skin-vf2-heat-${uid}`} gradientUnits="userSpaceOnUse" cx={0} cy={-4} r={96}>
          <stop offset="0%" stopColor={MOLTEN} stopOpacity="0.24" />
          <stop offset="55%" stopColor={ROCK} stopOpacity="0.1" />
          <stop offset="100%" stopColor={ROCK} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`skin-vf2-pool-${uid}`}>
          <stop offset="0%" stopColor={MOLTEN_LIT} stopOpacity="0.95" />
          <stop offset="45%" stopColor={MOLTEN} stopOpacity="0.6" />
          <stop offset="100%" stopColor={ROCK} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ⚠️ THE CASTLE IS THE VOLCANO, NOT A CASTLE IN FRONT OF ONE. The first
          build put a cone behind the sprite: a mountain that happened to have a
          fortress parked on its slope, where the eye read two objects and the
          castle was the smaller one. Everything volcanic now belongs to the
          BUILDING — the keep is the cone, its top is the crater, and the lava
          comes over that rim and runs down the walls. Nothing at all is drawn
          behind the sprite, which is also what separates this from World
          Volcano, where the castle really does sit on a mountain. */}
      <g clipPath={`url(#skin-vf2-outside-${uid})`}>
        <circle cx={0} cy={-30} r={86} fill={`url(#skin-vf2-heat-${uid})`} />

        {/* Smoke, leaving the keep's own crater. */}
        {smoke(-6, -66, 0.9, -14, 0, 'skin__smoke', 0)}
        {smoke(10, -68, 0.68, 12, 1, 'skin__smoke', -4.5)}
      </g>

      {/* ---- the crater, sitting on the keep ---------------------------- */}
      {/* The cone's shoulders: they flare out from the keep's top corners, so
          the tower reads as the upper third of a volcano rather than as a box
          with a hat on. */}
      {/* ⚠️ THE CONE REACHES THE WALL. Ending it halfway down the keep left a
          box below a triangle — a cone-shaped HAT on a tower, which is two
          objects again. Carried all the way to the parapet it replaces the keep
          instead of decorating it, and the fortress reads as one volcanic mass
          with a crater on top. */}
      <path
        d="M -36 -24 L -21 -62 L 21 -62 L 36 -24 z"
        fill={`url(#skin-vf2-cone-${uid})`}
        stroke={OUTLINE}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      {/* The lit flank, and one shadowed one: two planes, as on any cone. */}
      <path d="M -36 -24 L -21 -62 L -2 -62 L -14 -24 z" fill={BASALT_LIT} opacity={0.55} />
      <path d="M 36 -24 L 21 -62 L 10 -62 L 20 -24 z" fill="#150603" opacity={0.5} />
      {/* The rim: broken, uneven, and glowing where the crust is thinnest. */}
      <path
        d="M -23 -62 L -14 -68 L -6 -63 L 3 -70 L 12 -64 L 23 -62"
        fill={BASALT}
        stroke={OUTLINE}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <ellipse cx={0} cy={-64} rx={22} ry={7} fill={MOLTEN} opacity={0.28} />
      <path
        d="M -23 -62 L -14 -68 L -6 -63 L 3 -70 L 12 -64 L 23 -62"
        fill="none"
        stroke={MOLTEN}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      <path
        d="M -23 -62 L -14 -68 L -6 -63 L 3 -70 L 12 -64 L 23 -62"
        fill="none"
        stroke={MOLTEN_LIT}
        strokeWidth={1}
        strokeLinecap="round"
      />

      {/* Lava coming over the rim and down the cone: this is the join between
          the crater and the walls, and without it the crater is a separate
          object again. */}
      {flow('M -14 -66 C -20 -56 -26 -44 -29 -32 L -31 -24', 60, 4)}
      {flow('M 12 -64 C 19 -54 26 -42 30 -32 L 32 -24', 61, 3.6)}

      {/* Seams down the keep, following the cone's fall line. */}
      {/* Not mirrored: two symmetric chevrons down the middle of a cone read
          as a zip fastener. */}
      {['M -10 -56 L -16 -42 L -12 -28', 'M 6 -58 L 12 -46 L 10 -32 L 16 -26'].map((d, i) =>
        crack(d, i + 70, 1.8),
      )}

      {/* ---- the fortress, crusted over ---------------------------------- */}
      <g clipPath={`url(#skin-vf2-wall-${uid})`}>
        <rect x={-52} y={-24} width={104} height={54} fill={BASALT} opacity={0.85} />
        {[
          'M -52 -12 C -34 -16 -20 -10 -2 -14 C 16 -18 34 -12 52 -16',
          'M -52 10 C -34 6 -18 12 0 8 C 18 4 34 10 52 6',
        ].map((d, i) => (
          <path key={i} d={d} fill="none" stroke={BASALT_LIT} strokeWidth={2.6} opacity={0.7} />
        ))}
        {/* Lava running BETWEEN the towers, down the face of the wall. */}
        {/* Three runs, not four, and thinner: at four the wall was more lava
            than masonry and the castle stopped reading as a building. */}
        {flow('M -36 -24 C -34 -10 -38 2 -34 16 L -36 30', 30, 4)}
        {flow('M -8 -24 C -6 -12 -10 0 -6 14 L -8 30', 31, 3.4)}
        {flow('M 34 -24 C 36 -12 32 0 36 14 L 34 30', 32, 4)}
        {/* The pool the runs feed. */}
        <rect x={-52} y={22} width={104} height={8} fill={MOLTEN} opacity={0.3} />
        <path d="M -52 23 C -30 20 -12 25 8 22 C 28 19 38 24 52 22" fill="none" stroke={MOLTEN_LIT} strokeWidth={1.6} opacity={0.85} />
      </g>

      {/* Crust on the battlements, from the sprite's real merlon centres. */}
      {[-46, -24, 24, 46].map((x, i) => (
        <g key={i}>
          <path
            d={`M ${x - 5} -25 L ${x - 2} -31 L ${x + 1} -27 L ${x + 4} -32 L ${x + 5} -25 z`}
            fill={BASALT}
            stroke={OUTLINE}
            strokeWidth={1}
            strokeLinejoin="round"
          />
          <path d={`M ${x - 3} -26.5 L ${x + 3} -26.5`} stroke={MOLTEN} strokeWidth={1.2} fill="none" />
        </g>
      ))}

      {/* The gate, opening onto the crater's throat. */}
      <path d="M -11 30 L -11 15 C -11 4 11 4 11 15 L 11 30 z" fill="#120502" />
      <ellipse cx={0} cy={24} rx={13} ry={7} fill={`url(#skin-vf2-pool-${uid})`} />
      {crack('M -11 30 L -11 15 C -11 4 11 4 11 15 L 11 30', 50, 2.6)}
    </g>
  )
}

/**
 * Rare — Obsidian Citadel.
 *
 * The fortress cut from volcanic glass: flat black facets, blades rising off
 * every corner, and thin seams of light where the glass has fractured.
 *
 * ⚠️ IT MUST NOT BE VOLCANO FORTRESS. Same kingdom, same tier. That one is a
 * PLACE — a crater, a cone, smoke, rivers running down a mountainside. This one
 * is a MATERIAL: no landscape at all, nothing behind the castle, and every
 * shape belongs to the building itself.
 *
 * ⚠️ GLASS IS FLAT PLANES AND HARD HIGHLIGHTS. Rock is shaded with gradients
 * and rough edges; obsidian is the opposite — big facets of nearly flat colour
 * meeting at sharp angles, with the light arriving as narrow straight streaks
 * rather than as a soft sheen. Curved shading anywhere on this skin would make
 * it stone again.
 */
function ObsidianCitadel({ eliminated, uid }: DecorProps) {
  const GLASS = '#171018'
  const GLASS_LIT = '#2e2436'
  const GLASS_EDGE = '#57496a'

  /** A blade of obsidian: two flat faces meeting at a lit edge. */
  const blade = (x: number, base: number, h: number, w: number, lean: number, key: number) => (
    <g key={key}>
      <path
        d={`M ${x - w} ${base} L ${x + lean} ${base - h} L ${x + w * 0.15} ${base} z`}
        fill={GLASS}
        stroke={OUTLINE}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <path
        d={`M ${x + w * 0.15} ${base} L ${x + lean} ${base - h} L ${x + w} ${base} z`}
        fill={GLASS_LIT}
        stroke={OUTLINE}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      {/* The lit arris: one straight streak, never a curve. */}
      <path
        d={`M ${x + w * 0.15} ${base - 1} L ${x + lean} ${base - h}`}
        stroke={GLASS_EDGE}
        strokeWidth={1.1}
        fill="none"
        opacity={0.9}
      />
      <path
        d={`M ${x + lean * 0.4} ${base - h * 0.55} L ${x + lean} ${base - h}`}
        stroke={MOLTEN}
        strokeWidth={0.9}
        fill="none"
        opacity={0.55}
      />
    </g>
  )

  return (
    <g className="skin skin--obsidian" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-ob-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-ob-keep-${uid}`}>
        <rect x={-21} y={-59} width={42} height={48} rx={3} />
      </clipPath>

      {/* ---- blades off the corners and the keep ------------------------
          A rare may leave the outline; these are the only things that do, and
          they lean OUTWARD so the castle keeps its shoulders. */}
      {blade(-48, -20, 30, 7, -6, 0)}
      {blade(-32, -22, 20, 5, -3, 1)}
      {blade(48, -20, 34, 7, 7, 2)}
      {blade(33, -22, 22, 5, 4, 3)}
      {blade(-14, -56, 26, 5.5, -4, 4)}
      {blade(14, -56, 30, 5.5, 5, 5)}

      {/* ---- the wall, faceted ------------------------------------------- */}
      <g clipPath={`url(#skin-ob-wall-${uid})`}>
        <rect x={-52} y={-24} width={104} height={54} fill={GLASS} />
        {/* Facets: flat panels of two values, meeting at hard diagonals. */}
        {[
          { d: 'M -52 -24 L -20 -24 L -34 30 L -52 30 z', f: GLASS_LIT },
          { d: 'M -20 -24 L 6 -24 L -6 30 L -34 30 z', f: GLASS },
          { d: 'M 6 -24 L 30 -24 L 26 30 L -6 30 z', f: GLASS_LIT },
          { d: 'M 30 -24 L 52 -24 L 52 30 L 26 30 z', f: GLASS },
        ].map((p, i) => (
          <path key={i} d={p.d} fill={p.f} opacity={0.95} />
        ))}
        {['M -20 -24 L -34 30', 'M 6 -24 L -6 30', 'M 30 -24 L 26 30'].map((d, i) => (
          <path key={`e${i}`} d={d} stroke={GLASS_EDGE} strokeWidth={1} fill="none" opacity={0.55} />
        ))}
        {/* Specular streaks: straight, narrow, and all at the same angle,
            because they are one light source reflecting off flat faces. */}
        {[
          'M -46 24 L -30 -22',
          'M -12 26 L 2 -20',
          'M 34 22 L 46 -18',
        ].map((d, i) => (
          <path key={`s${i}`} d={d} stroke="#ffffff" strokeWidth={i === 1 ? 2.2 : 1.4} fill="none" opacity={0.13} />
        ))}
        {/* Fractures with light in them, following the facet edges rather than
            wandering across the faces. */}
        {/* ⚠️ FRACTURES RUN, THEY DO NOT RADIATE. Three short arms meeting at
            one point is a symbol — the first set read as peace signs scattered
            over the wall. Glass cracks along one long line with branches
            leaving it at different places, and no branch is as long as the
            line it left. */}
        {[
          'M -52 10 L -38 4 L -24 8 L -8 -2 L 6 2',
          'M -38 4 L -34 -12',
          'M -8 -2 L -6 14 L -12 24',
          'M 52 -8 L 38 -2 L 26 -8 L 14 4 L 6 2',
          'M 26 -8 L 30 -20',
          'M 14 4 L 18 18 L 12 28',
        ].map((d, i) => crack(d, i + 10, i % 3 === 0 ? 2.6 : 1.7))}
      </g>

      {/* ---- the keep ---------------------------------------------------- */}
      <g clipPath={`url(#skin-ob-keep-${uid})`}>
        <rect x={-21} y={-59} width={42} height={48} fill={GLASS} />
        <path d="M -21 -59 L 2 -59 L -8 -11 L -21 -11 z" fill={GLASS_LIT} opacity={0.9} />
        <path d="M 2 -59 L -8 -11" stroke={GLASS_EDGE} strokeWidth={1} fill="none" opacity={0.55} />
        <path d="M -16 -14 L -2 -56" stroke="#ffffff" strokeWidth={1.8} fill="none" opacity={0.14} />
        {[
          'M -21 -46 L -8 -40 L 2 -46 L 14 -38 L 21 -40',
          'M -8 -40 L -6 -24 L -12 -14',
          'M 14 -38 L 16 -26',
        ].map((d, i) => crack(d, i + 30, i === 0 ? 2.4 : 1.7))}
      </g>

      {/* ---- the gate: a fracture right through it ----------------------- */}
      <path d="M -11 30 L -11 15 C -11 4 11 4 11 15 L 11 30 z" fill="#0d070f" />
      {crack('M -11 30 L -11 15 C -11 4 11 4 11 15 L 11 30', 40, 2.4)}
      {crack('M -4 30 L 0 18 L -3 8', 41, 1.6)}
    </g>
  )
}

/**
 * Legendary — World Volcano.
 *
 * The castle on the summit of something enormous: ridges falling away on both
 * sides, lava running down all of them, an ash column standing over it and the
 * mountain throwing molten rock into the sky.
 *
 * ⚠️ THE MOUNTAIN IS BUILT DOWNWARD FROM THE CASTLE. The sprite cannot move, so
 * "the castle emerges from the peak" has to be drawn as slopes that START at
 * its footing and fall away to the corners of the frame. Building the mountain
 * first and trying to sit the castle on it puts the summit in the wrong place
 * every time.
 */
function WorldVolcano({ eliminated, uid }: DecorProps) {
  /** One thrown rock: a chunk with a molten core and a short trail. */
  const ejecta = (x: number, y: number, s: number, key: number, delay: number) => (
    <g key={key} className="skin__erupt" style={{ animationDelay: `${delay}s` }}>
      <g transform={`translate(${x} ${y})`}>
        {/* ⚠️ A DARK CENTRE INSIDE A BRIGHT OUTLINE IS A RING. The first chunks
            were basalt filled with a molten stroke round them, and at this size
            that reads as a coin or a washer floating in the sky. A thrown rock
            is SOLID and lit: hot fill, dark crust on one side only, and a short
            trail behind it so it is travelling rather than hanging. */}
        {/* ⚠️ THE TRAIL IS A STREAK, NOT A CONE. A wide triangle under a round
            head is a map pin, and six of them hanging in the sky looked like
            markers dropped on the scene. A thin line, offset to one side, reads
            as motion. */}
        <path
          d={`M ${-s * 0.5} ${s * 0.6} L ${-s * 1.1} ${s * 3.4}`}
          stroke={MOLTEN}
          strokeWidth={s * 0.4}
          strokeLinecap="round"
          opacity={0.55}
          fill="none"
        />
        <circle r={s * 1.5} fill={MOLTEN} opacity={0.18} />
        <path
          d={`M ${-s} ${-s * 0.4} L ${-s * 0.3} ${-s} L ${s * 0.8} ${-s * 0.5} L ${s} ${s * 0.5} L 0 ${s} L ${-s * 0.8} ${s * 0.4} z`}
          fill={MOLTEN}
          stroke={OUTLINE}
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
        <path
          d={`M ${s * 0.8} ${-s * 0.5} L ${s} ${s * 0.5} L 0 ${s} L ${s * 0.2} ${s * 0.1} z`}
          fill={BASALT}
          opacity={0.85}
        />
        <path d={`M ${-s * 0.5} ${-s * 0.35} L ${s * 0.1} ${-s * 0.15}`} stroke={MOLTEN_LIT} strokeWidth={s * 0.36} strokeLinecap="round" />
      </g>
    </g>
  )

  return (
    <g className="skin skin--worldvolcano" opacity={eliminated ? 0.5 : 1} aria-hidden="true">
      <clipPath id={`skin-wv-outside-${uid}`} clipRule="evenodd">
        <path
          d="M -92 -128 L 92 -128 L 92 44 L -92 44 z
             M -53 -25 L 53 -25 L 53 31 L -53 31 z
             M -21 -59 L 21 -59 L 21 -11 L -21 -11 z"
          clipRule="evenodd"
        />
      </clipPath>
      <clipPath id={`skin-wv-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <defs>
        <linearGradient id={`skin-wv-near-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BASALT_LIT} />
          <stop offset="70%" stopColor={BASALT} />
          <stop offset="100%" stopColor="#150603" />
        </linearGradient>
        <radialGradient id={`skin-wv-sky-${uid}`} gradientUnits="userSpaceOnUse" cx={0} cy={-30} r={112}>
          <stop offset="0%" stopColor={MOLTEN} stopOpacity="0.3" />
          <stop offset="45%" stopColor={ROCK} stopOpacity="0.14" />
          <stop offset="100%" stopColor={ROCK} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`skin-wv-throat-${uid}`}>
          <stop offset="0%" stopColor="#fff2d0" stopOpacity="0.95" />
          <stop offset="40%" stopColor={MOLTEN} stopOpacity="0.7" />
          <stop offset="100%" stopColor={ROCK} stopOpacity="0" />
        </radialGradient>
      </defs>

      <g clipPath={`url(#skin-wv-outside-${uid})`}>
        <g className="skin__aura">
          <circle cx={0} cy={-30} r={112} fill={`url(#skin-wv-sky-${uid})`} />
        </g>

        {/* The ash column, standing over everything. */}
        <g className="skin__smoke">
          <path
            d="M -16 -58 C -30 -76 -36 -96 -26 -114 C -14 -126 14 -126 26 -114
               C 36 -96 30 -76 16 -58 z"
            fill={ASH}
            opacity={0.42}
          />
          {/* Two lobes only: at three the column counted as a bunch of
              balloons rather than reading as one mass of ash. */}
          <circle cx={-18} cy={-102} r={22} fill={ASH} opacity={0.3} />
          <circle cx={16} cy={-112} r={26} fill={ASH} opacity={0.26} />
        </g>

        {/* ---- the mountain, falling away from the castle ---------------
            Far ridge first, then the near one: two planes, like the rare's
            cone, because a single mass has no form. */}
        <path
          d="M 92 44 L 92 -2 L 62 -14 L 34 -34 L 16 -52 L 0 -44 L -18 -52
             L -40 -34 L -66 -14 L -92 -2 L -92 44 z"
          fill="#1c0803"
        />
        <path
          d="M 92 44 L 74 12 L 46 -14 L 22 -40 L 0 -50 L -24 -40 L -50 -14 L -76 12 L -92 44 z"
          fill={`url(#skin-wv-near-${uid})`}
          stroke={OUTLINE}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
        {/* Ridge lines running down the near face, all converging on the
            summit, which is what makes the castle read as standing on it. */}
        {[
          'M -14 -46 L -34 -18 L -48 12 L -56 44',
          'M -4 -50 L -10 -16 L -14 14 L -16 44',
          'M 10 -48 L 20 -18 L 30 12 L 38 44',
        ].map((d, i) => (
          <path key={i} d={d} fill="none" stroke={OUTLINE} strokeWidth={1.6} opacity={0.5} />
        ))}

        {/* ---- lava rivers, cascading ------------------------------------
            ⚠️ THE GEOMETRY NEVER MOVES; THE DASHES DO. A river drawn as a
            travelling shape would sweep across the sprite, and nothing may
            cover the silhouette — the same rule Air's gale arcs set. A marching
            dash on a static channel reads as flow and cannot. */}
        {[
          { d: 'M -20 -48 C -30 -28 -44 -6 -52 20 L -58 44', w: 6, dur: 5 },
          { d: 'M -6 -52 C -10 -26 -14 0 -16 22 L -18 44', w: 5, dur: 6.4 },
          { d: 'M 12 -50 C 20 -26 30 -2 38 20 L 44 44', w: 6, dur: 5.6 },
          { d: 'M 26 -40 C 38 -22 52 -6 66 8 L 78 24', w: 4.5, dur: 7.2 },
        ].map((r, i) => (
          <g key={i}>
            <path d={r.d} fill="none" stroke={MOLTEN} strokeWidth={r.w * 2.4} opacity={0.12} strokeLinecap="round" />
            <path d={r.d} fill="none" stroke={BASALT} strokeWidth={r.w} strokeLinecap="round" />
            {/* ⚠️ THE CHANNEL IS LIT ALL THE WAY DOWN. With only a dashed line
                on it, a river read as a dashed LINE — the gaps were the loudest
                thing about it. A continuous molten core carries the glow, and
                the marching dash is a brighter pulse travelling along something
                that is already flowing. */}
            <path d={r.d} fill="none" stroke={ROCK} strokeWidth={r.w * 0.7} strokeLinecap="round" />
            <path d={r.d} fill="none" stroke={MOLTEN} strokeWidth={r.w * 0.44} strokeLinecap="round" />
            <path
              className="skin__lava"
              style={{ animationDuration: `${r.dur}s` }}
              d={r.d}
              fill="none"
              stroke={MOLTEN_LIT}
              strokeWidth={r.w * 0.3}
              strokeDasharray="14 20"
              strokeLinecap="round"
            />
          </g>
        ))}

        {/* ---- the eruption ---------------------------------------------- */}
        <ellipse cx={0} cy={-52} rx={30} ry={12} fill={`url(#skin-wv-throat-${uid})`} />
        {/* Two arcs leaving the summit, rather than six chunks spread evenly
            over the sky: an eruption throws rock along a path. */}
        {ejecta(-20, -74, 3.4, 0, 0)}
        {ejecta(-36, -92, 2.6, 1, -1.1)}
        {ejecta(-54, -102, 2, 2, -2.2)}
        {ejecta(18, -78, 3.8, 3, -3.3)}
        {ejecta(38, -96, 2.8, 4, -4.4)}
        {ejecta(58, -106, 2.2, 5, -5.5)}
      </g>

      {/* ---- the summit fortress ----------------------------------------- */}
      <g clipPath={`url(#skin-wv-wall-${uid})`}>
        <rect x={-52} y={-24} width={104} height={54} fill={BASALT} opacity={0.9} />
        {[
          'M -52 -10 C -34 -14 -18 -8 0 -12 C 18 -16 34 -10 52 -14',
          'M -52 12 C -34 8 -18 14 0 10 C 18 6 34 12 52 8',
        ].map((d, i) => (
          <path key={i} d={d} fill="none" stroke={BASALT_LIT} strokeWidth={2.6} opacity={0.7} />
        ))}
        {['M -34 -24 C -32 -8 -36 6 -32 30', 'M 4 -24 C 6 -8 2 6 6 30', 'M 36 -24 C 38 -10 34 4 38 30'].map(
          (d, i) => (
            <g key={`f${i}`}>
              <path d={d} fill="none" stroke={MOLTEN} strokeWidth={9} opacity={0.12} strokeLinecap="round" />
              <path d={d} fill="none" stroke={BASALT} strokeWidth={4} strokeLinecap="round" />
              <path d={d} fill="none" stroke={MOLTEN} strokeWidth={2.2} strokeLinecap="round" />
              <path
                className="skin__lava"
                style={{ animationDuration: `${4.4 + i}s` }}
                d={d}
                fill="none"
                stroke={MOLTEN_LIT}
                strokeWidth={1.2}
                strokeDasharray="12 18"
                strokeLinecap="round"
              />
            </g>
          ),
        )}
        {/* Rim light inside the silhouette: the throat behind is the light
            source, and every legendary that holds together says so somewhere. */}
        <rect
          x={-50.5}
          y={-22.5}
          width={101}
          height={51}
          rx={3}
          fill="none"
          stroke={MOLTEN}
          strokeWidth={1.3}
          opacity={0.5}
        />
      </g>

      {/* Crust on the battlements, from the sprite's real merlon centres. */}
      {[-46, -24, 24, 46].map((x, i) => (
        <g key={i}>
          <path
            d={`M ${x - 5} -25 L ${x - 2} -32 L ${x + 1} -27 L ${x + 4} -33 L ${x + 5} -25 z`}
            fill={BASALT}
            stroke={OUTLINE}
            strokeWidth={1}
            strokeLinejoin="round"
          />
          <path d={`M ${x - 3} -26.5 L ${x + 3} -26.5`} stroke={MOLTEN} strokeWidth={1.2} fill="none" />
        </g>
      ))}

      {/* The gate, opening onto the throat. */}
      <path d="M -11 30 L -11 15 C -11 4 11 4 11 15 L 11 30 z" fill="#120502" />
      <g className="skin__aura">
        <ellipse cx={0} cy={24} rx={14} ry={8} fill={`url(#skin-wv-throat-${uid})`} />
      </g>
      {crack('M -11 30 L -11 15 C -11 4 11 4 11 15 L 11 30', 50, 2.6)}
    </g>
  )
}

export const MagmaDecor = {
  'magma.cracks': LavaCracks,
  'magma.volcano': VolcanoFortress,
  'magma.obsidian': ObsidianCitadel,
  'magma.world': WorldVolcano,
}
