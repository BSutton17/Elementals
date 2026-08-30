/**
 * The five monsters.
 *
 * Each one is drawn in its OWN local space — feet on y = 0, roughly 250–400
 * units wide — and the layer places it. Keeping them in a local box means a
 * monster can be redesigned without touching the arena maths, and it is the
 * only way five creatures of very different proportions can share one shadow,
 * one health bar and one hit area.
 *
 * ⚠️ SILHOUETTE FIRST, EVERY TIME. The arena draws this thing somewhere between
 * 120 and 300 screen pixels tall, over a dark board, usually while something
 * else is exploding. Detail is what you notice second; the shape is what tells
 * you which monster you are fighting, so each is built to be identifiable as a
 * black cut-out: the golem is a wall with fists, the bat is a span, the dragon
 * is a neck and a wing, the spider is eight braced legs, the goblin is a hunch
 * with a blade.
 *
 * ⚠️ AND THEY ARE BUILT THE WAY THE CASTLE SKINS ARE BUILT, which is what took
 * the first pass from clip art to something that belongs on this board. Four
 * rules, taken straight from `skins/`:
 *
 *   GRADIENTS, NOT FLAT FILLS. Every mass is lit from above and falls into
 *   shadow at the bottom. A flat fill has no form, and fifteen flat fills side
 *   by side is a diagram.
 *
 *   ONE STROKED OUTLINE PER OBJECT. The silhouette carries a heavy ink line;
 *   everything inside it is an unstroked fill or a hairline. Outlining every
 *   interior shape at the same weight is exactly what makes vector art look
 *   like a sticker.
 *
 *   A RIM LIGHT ON THE TOP EDGES, and occlusion where forms meet. One pale
 *   hairline along an upper contour is the cheapest depth cue there is; a dark
 *   wedge where a limb joins the body is what stops a pile of shapes looking
 *   exploded.
 *
 *   AND TEXTURE THAT SAYS WHAT THE THING IS MADE OF — scale rows, fur, chipped
 *   stone, bristles, hammered iron. Material is most of the difference between
 *   a shape and a creature.
 *
 * ⚠️ THE OTHER FAILURE MODE IS CUTE. Round eyes make a mascot (every eye here
 * is a narrow angled slit under a heavy brow), round bodies make a plush toy,
 * symmetry makes a creature pose, and smooth outlines make it harmless.
 *
 * ⚠️ AND NONE OF THEM MAY READ AS A KINGDOM. The board already has sixteen
 * castles on it wearing skins, several with wings, one with a spider and one
 * with a stone titan's head. So: the golem's veins are cold crystal rather than
 * Earth's rock or Magma's lava, the bat's wings carry finger struts no insect
 * or angel has, the dragon is crimson-and-bone rather than Fire's orange, this
 * spider has no web anywhere near it, and the goblin is the only humanoid in
 * the game.
 */

export type MonsterKind = 'rock' | 'bat' | 'dragon' | 'spider' | 'goblin'

export const MONSTER_KINDS: readonly MonsterKind[] = [
  'rock',
  'bat',
  'dragon',
  'spider',
  'goblin',
]

/** What the HUD calls each one. */
export const MONSTER_NAMES: Record<MonsterKind, string> = {
  rock: 'Stone Colossus',
  bat: 'Night Terror',
  dragon: 'Wyrm',
  spider: 'Broodmother',
  goblin: 'Warbrute',
}

/**
 * How wide each monster stands and how tall it reaches, in its own units.
 *
 * ⚠️ THESE ARE THE DRAWN EXTENTS, INCLUDING WHATEVER IT IS HOLDING. The layer
 * sizes the shadow, the hit area and the targeting reticle from them, so a
 * number that is merely close crops the creature's own weapon out of its hit
 * box — which is exactly what happened to the goblin's cleaver.
 */
export const MONSTER_BOX: Record<MonsterKind, { halfWidth: number; height: number }> = {
  rock: { halfWidth: 132, height: 200 },
  bat: { halfWidth: 202, height: 184 },
  dragon: { halfWidth: 174, height: 224 },
  spider: { halfWidth: 178, height: 158 },
  goblin: { halfWidth: 182, height: 198 },
}

/* ── shared material and lighting helpers ────────────────────────────────── */

/** A top-lit vertical gradient. Every solid mass on every monster uses one. */
function shade(id: string, top: string, mid: string, bottom: string, midStop = 52) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0.18" y2="1">
      <stop offset="0%" stopColor={top} />
      <stop offset={`${midStop}%`} stopColor={mid} />
      <stop offset="100%" stopColor={bottom} />
    </linearGradient>
  )
}

/** A soft radial glow, for throats, cracks and eye clusters. */
function bloom(id: string, colour: string) {
  return (
    <radialGradient id={id}>
      <stop offset="0%" stopColor={colour} stopOpacity="0.7" />
      <stop offset="55%" stopColor={colour} stopOpacity="0.2" />
      <stop offset="100%" stopColor={colour} stopOpacity="0" />
    </radialGradient>
  )
}

/**
 * A glowing eye — a narrow slit, not a disc.
 *
 * ⚠️ THE SHAPE IS THE DIFFERENCE BETWEEN A MONSTER AND A MASCOT. Two bright
 * circles on a dark head is a face from a children's book however sharp the
 * teeth under it are; the same light in a slanted slit under a brow is a thing
 * looking at you. `tilt` drops the inner end — inward and down is a scowl, and
 * it is not interchangeable with the other direction.
 */
function eye(
  x: number,
  y: number,
  len: number,
  colour: string,
  tilt = 0,
  key?: string | number,
) {
  const h = len * 0.4
  const slit = (k: number) =>
    `M ${x - len * k} ${y - tilt * k} Q ${x} ${y - h * k - tilt * 0.5} ${x + len * k} ${y}
     Q ${x} ${y + h * k - tilt * 0.5} ${x - len * k} ${y - tilt * k} z`
  return (
    <g key={key}>
      <ellipse cx={x} cy={y} rx={len * 1.9} ry={h * 2.8} fill={colour} opacity={0.16} />
      <path d={slit(1)} fill={colour} />
      {/* Light has a middle: a hotter core inside the slit. */}
      <path d={slit(0.55)} fill="#ffffff" opacity={0.5} />
    </g>
  )
}

/** A row of teeth along a line, alternating length so it reads as a bite. */
function teeth(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  count: number,
  depth: number,
  colour = '#f3ecdf',
) {
  const items = []
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count
    const x = x0 + (x1 - x0) * t
    const y = y0 + (y1 - y0) * t
    const long = i % 2 === 0 ? depth : depth * 0.58
    const w = ((x1 - x0) / count) * 0.44
    items.push(
      <g key={i}>
        <path d={`M ${x - w} ${y} L ${x + w} ${y} L ${x} ${y + long} z`} fill={colour} />
        {/* Each tooth catches the light down one side. */}
        <path
          d={`M ${x - w * 0.55} ${y} L ${x} ${y + long * 0.9} L ${x - w * 0.12} ${y} z`}
          fill="#ffffff"
          opacity={0.3}
        />
      </g>,
    )
  }
  return <>{items}</>
}

/**
 * The pale hairline along a top edge.
 *
 * ⚠️ ONE STROKE, LOW OPACITY, AND ONLY ON UPWARD-FACING CONTOURS. Carried round
 * a whole outline it is a border, and the creature turns back into a sticker.
 */
function rim(d: string, width = 2, opacity = 0.22, key?: number) {
  return (
    <path
      key={key}
      d={d}
      fill="none"
      stroke="#ffffff"
      strokeWidth={width}
      strokeLinecap="round"
      opacity={opacity}
    />
  )
}

/* ── 1. the rock monster ─────────────────────────────────────────────────── */

/**
 * Stone Colossus — a slab-shouldered golem, knuckles on the ground.
 *
 * ⚠️ MASS COMES FROM PROPORTION, NOT SIZE: the shoulders are wider than the
 * stance, the arms are longer than the legs, and the head is small and sunk
 * BETWEEN the shoulders. A golem with its head on top of its shoulders is a
 * statue; one with no visible neck is a thing that could fall on you.
 *
 * ⚠️ AND STONE HAS TO LOOK BROKEN, NOT MOULDED. Flat grey slabs with a line
 * round each read as cardboard. What makes this rock is that every seam is cut
 * DARK with a lit course under it, the corners are chipped, and the veins are
 * built the way Magma builds its cracks — dark edges with the light in the
 * bottom of them, never a bare glowing line.
 */
function RockMonster({ uid }: { uid: string }) {
  const STONE_LIT = '#828b9c'
  const STONE_DARK = '#2f3542'
  const EDGE = '#12151c'
  const VEIN = '#8fe8ff'
  const g = (n: string) => `url(#mon-rk-${n}-${uid})`

  return (
    <g className="monster monster--rock">
      <defs>
        {shade(`mon-rk-body-${uid}`, '#78818f', '#5a6272', '#343a47')}
        {shade(`mon-rk-slab-${uid}`, '#9aa3b2', STONE_LIT, '#4e5665')}
        {shade(`mon-rk-dark-${uid}`, '#454d5c', STONE_DARK, '#1e232c')}
        {bloom(`mon-rk-glow-${uid}`, VEIN)}
      </defs>

      {/* Crystal breaking out of its back — silhouette first, so the outline is
          never a plain box. Each shard is lit down one facet. */}
      <g className="monster__glow">
        <ellipse cx={0} cy={-152} rx={100} ry={74} fill={g('glow')} opacity={0.4} />
        {[
          ['M -64 -140 L -88 -200 L -54 -160 z', 'M -64 -140 L -88 -200'],
          ['M -34 -150 L -46 -212 L -18 -164 z', 'M -34 -150 L -46 -212'],
          ['M 48 -146 L 70 -204 L 34 -160 z', 'M 48 -146 L 70 -204'],
        ].map(([d, lit], i) => (
          <g key={i}>
            <path d={d} fill={VEIN} opacity={0.4} />
            <path d={lit} stroke="#ffffff" strokeWidth={2} opacity={0.5} fill="none" />
          </g>
        ))}
      </g>

      {/* Legs. */}
      <path d="M -66 0 L -60 -36 L -56 -64 L -18 -62 L -20 -34 L -22 0 z" fill={g('dark')} stroke={EDGE} strokeWidth={3.4} strokeLinejoin="round" />
      <path d="M 66 0 L 60 -36 L 56 -64 L 18 -62 L 20 -34 L 22 0 z" fill={g('dark')} stroke={EDGE} strokeWidth={3.4} strokeLinejoin="round" />
      <path d="M -58 -36 L -20 -34 M 58 -36 L 20 -34" stroke={EDGE} strokeWidth={2} opacity={0.5} fill="none" />
      <path d="M -72 0 L -68 -16 L -14 -14 L -16 0 z" fill={g('body')} stroke={EDGE} strokeWidth={2.8} strokeLinejoin="round" />
      <path d="M 72 0 L 68 -16 L 14 -14 L 16 0 z" fill={g('body')} stroke={EDGE} strokeWidth={2.8} strokeLinejoin="round" />

      {/* Arms: three masses each — upper slab, heavier forearm, knuckled fist.
          A single tapering limb reads as a branch. */}
      {[-1, 1].map((dir) => (
        <g key={dir} transform={dir === 1 ? undefined : 'scale(-1 1)'}>
          <path d="M 58 -146 L 94 -140 L 108 -72 L 76 -66 z" fill={g('body')} stroke={EDGE} strokeWidth={3.2} strokeLinejoin="round" />
          <path d="M 76 -68 L 112 -74 L 122 -24 L 84 -20 z" fill={g('slab')} stroke={EDGE} strokeWidth={3.2} strokeLinejoin="round" />
          <path d="M 82 -22 L 124 -26 L 128 -4 L 114 4 L 86 2 z" fill={g('body')} stroke={EDGE} strokeWidth={3.2} strokeLinejoin="round" />
          <path d="M 94 -22 L 96 0 M 108 -24 L 110 0" stroke={EDGE} strokeWidth={2} opacity={0.5} fill="none" />
          {rim('M 78 -68 L 112 -74', 2, 0.2)}
          {rim('M 60 -144 L 92 -138', 2, 0.16)}
          {/* Where the forearm overlaps the upper arm. */}
          <path d="M 76 -68 L 112 -74 L 110 -66 L 78 -60 z" fill={EDGE} opacity={0.3} />
        </g>
      ))}

      {/* Torso: a keystone, narrow at the waist, enormous across the top. */}
      <path
        d="M -50 -46 L -82 -136 L -46 -160 L 46 -160 L 82 -136 L 50 -46 z"
        fill={g('body')}
        stroke={EDGE}
        strokeWidth={3.8}
        strokeLinejoin="round"
      />
      {/* Masonry: seams cut dark with the course below catching a little light.
          Joints that line up are tiling, so they are offset row to row. */}
      {[
        ['M -68 -128 L 68 -128', 'M -66 -125 L 66 -125'],
        ['M -60 -98 L 60 -98', 'M -58 -95 L 58 -95'],
        ['M -54 -70 L 54 -70', 'M -52 -67 L 52 -67'],
      ].map(([cut, lit], i) => (
        <g key={i}>
          <path d={cut} stroke={EDGE} strokeWidth={2.6} opacity={0.7} fill="none" />
          <path d={lit} stroke="#ffffff" strokeWidth={1.4} opacity={0.12} fill="none" />
        </g>
      ))}
      <path
        d="M -22 -128 L -22 -98 M 26 -98 L 26 -70 M 8 -160 L 8 -128 M -40 -70 L -40 -46"
        stroke={EDGE}
        strokeWidth={2}
        opacity={0.45}
        fill="none"
      />
      {/* Chipped corners — the detail that stops flat grey reading as card. */}
      <path d="M -46 -160 l 15 6 l -13 9 z" fill={STONE_DARK} opacity={0.65} />
      <path d="M 46 -160 l -16 4 l 14 10 z" fill={STONE_DARK} opacity={0.5} />
      <path d="M 50 -46 l -12 -10 l 15 -2 z" fill={STONE_LIT} opacity={0.25} />
      <path d="M -50 -46 l 13 -9 l -15 -3 z" fill={STONE_LIT} opacity={0.18} />

      {/* Shoulders: cut slabs standing proud of the torso. */}
      <path d="M -82 -136 L -108 -154 L -96 -184 L -58 -182 L -46 -160 z" fill={g('slab')} stroke={EDGE} strokeWidth={3.4} strokeLinejoin="round" />
      <path d="M 82 -136 L 108 -154 L 96 -184 L 58 -182 L 46 -160 z" fill={g('slab')} stroke={EDGE} strokeWidth={3.4} strokeLinejoin="round" />
      <path d="M -96 -184 L -78 -162 M 96 -184 L 78 -162" stroke={EDGE} strokeWidth={2.2} opacity={0.45} fill="none" />
      {rim('M -108 -154 L -96 -184 L -58 -182', 2.4, 0.26)}
      {rim('M 108 -154 L 96 -184 L 58 -182', 2.4, 0.26)}
      {/* Occlusion where the shoulders meet the torso. */}
      <path d="M -82 -136 L -46 -160 L -44 -150 L -78 -128 z" fill={EDGE} opacity={0.32} />
      <path d="M 82 -136 L 46 -160 L 44 -150 L 78 -128 z" fill={EDGE} opacity={0.32} />

      {/* Head: sunk between the shoulders under a heavy brow. */}
      <path d="M -30 -162 L -26 -190 L 26 -190 L 30 -162 z" fill={g('dark')} stroke={EDGE} strokeWidth={3.2} strokeLinejoin="round" />
      <path d="M -32 -181 L 32 -181 L 26 -170 L -26 -170 z" fill={EDGE} opacity={0.9} />
      {rim('M -26 -190 L 26 -190', 2, 0.2)}
      <path d="M -17 -162 L -13 -153 L 13 -153 L 17 -162 z" fill={g('dark')} stroke={EDGE} strokeWidth={2.4} strokeLinejoin="round" />

      {/* The crystal running through it. ⚠️ COLD, NOT MOLTEN — a glowing orange
          crack is Magma's, and Earth already owns bare rock. Cyan says the
          thing is powered rather than heated, and every vein is dark-edged with
          the light in the bottom of it. */}
      <g className="monster__glow">
        {[
          'M -21 -46 L -27 -70 L -15 -98 L -25 -128 L -13 -160',
          'M 31 -52 L 23 -76 L 35 -102 L 25 -130',
          'M -15 -98 L 5 -106',
          'M 90 -122 L 98 -94',
          'M -90 -122 L -98 -94',
        ].map((d, i) => (
          <g key={i}>
            <path d={d} fill="none" stroke={VEIN} strokeWidth={i < 2 ? 8 : 6} opacity={0.12} strokeLinecap="round" />
            <path d={d} fill="none" stroke={EDGE} strokeWidth={i < 2 ? 4 : 3} strokeLinecap="round" opacity={0.8} />
            <path d={d} fill="none" stroke={VEIN} strokeWidth={i < 2 ? 2 : 1.5} strokeLinecap="round" />
          </g>
        ))}
        {eye(-14, -176, 10, VEIN, 3)}
        {eye(14, -176, 10, VEIN, -3)}
      </g>
    </g>
  )
}

/* ── 2. the bat monster ──────────────────────────────────────────────────── */

/**
 * Night Terror — a bat the size of a house, wings out.
 *
 * ⚠️ THE SPAN IS THE MONSTER. A bat's body is small and its wings are absurd,
 * so the silhouette has to be almost all wing — the body here is a fifth of the
 * width. Make the body bigger and it stops being a bat and becomes a gargoyle.
 *
 * ⚠️ FINGER STRUTS AND A SCALLOPED TRAILING EDGE, or it is a moth. Four struts
 * radiate from the shoulder and the membrane between them sags — that pair of
 * facts is the entire difference between a bat wing and every other wing on
 * this board, of which there are already three.
 *
 * ⚠️ AND THE MEMBRANE HAS TO LOOK THIN. Filled flat it was a cape; what makes
 * it skin is a lit sheet where it stretches taut near the arm, shadow in the
 * folds, and the bones showing through as darker lines under the pale struts.
 */
function BatMonster({ uid }: { uid: string }) {
  const FUR_LIT = '#463655'
  const STRUT = '#d3c7e0'
  const EDGE = '#0b0810'
  const EYE = '#ff9d21'
  const g = (n: string) => `url(#mon-bt-${n}-${uid})`

  const wing = (dir: 1 | -1) => (
    <g transform={dir === 1 ? undefined : 'scale(-1 1)'}>
      <path
        d="M 12 -144
           C 68 -176, 144 -174, 200 -136
           C 180 -110, 166 -100, 154 -82
           C 132 -106, 116 -114, 106 -106
           C 116 -76, 112 -58, 100 -44
           C 78 -78, 60 -88, 52 -80
           C 58 -50, 50 -34, 36 -22
           C 26 -54, 14 -72, 8 -82
           z"
        fill={g('wing')}
        stroke={EDGE}
        strokeWidth={3.4}
        strokeLinejoin="round"
      />
      {/* Taut and lit near the arm, folded and dark below it. */}
      <path d="M 24 -140 C 76 -164, 138 -160, 188 -132 C 150 -142, 92 -146, 30 -128 z" fill="#ffffff" opacity={0.09} />
      <path d="M 30 -120 C 76 -128, 122 -122, 160 -106" fill="none" stroke={EDGE} strokeWidth={2.6} opacity={0.35} />
      <path d="M 26 -100 C 62 -100, 88 -94, 108 -84" fill="none" stroke={EDGE} strokeWidth={2.2} opacity={0.28} />
      {/* Arm and four fingers, each ending in a claw. Bone under, pale over. */}
      <path d="M 12 -144 L 200 -136" stroke={EDGE} strokeWidth={7} strokeLinecap="round" fill="none" opacity={0.5} />
      <path d="M 12 -144 L 200 -136" stroke={STRUT} strokeWidth={4.6} strokeLinecap="round" fill="none" opacity={0.92} />
      <path d="M 14 -138 L 154 -82" stroke={STRUT} strokeWidth={3.4} strokeLinecap="round" fill="none" opacity={0.75} />
      <path d="M 14 -132 L 100 -44" stroke={STRUT} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.68} />
      <path d="M 12 -126 L 36 -22" stroke={STRUT} strokeWidth={2.6} strokeLinecap="round" fill="none" opacity={0.62} />
      <path d="M 200 -136 q 20 -8 24 -20 q -18 -2 -30 8 z" fill={STRUT} stroke={EDGE} strokeWidth={1.8} strokeLinejoin="round" />
      <path d="M 154 -82 q 13 -3 17 -11 q -13 -4 -21 3 z" fill={STRUT} stroke={EDGE} strokeWidth={1.4} opacity={0.92} />
    </g>
  )

  return (
    <g className="monster monster--bat">
      <defs>
        {shade(`mon-bt-wing-${uid}`, '#4a3a5e', '#33263f', '#1a1322')}
        {shade(`mon-bt-body-${uid}`, '#3d2f4c', '#241b2e', '#120d18')}
        {shade(`mon-bt-head-${uid}`, '#584465', FUR_LIT, '#291f33')}
        {bloom(`mon-bt-glow-${uid}`, EYE)}
      </defs>

      <g className="monster__wing monster__wing--left">{wing(-1)}</g>
      <g className="monster__wing monster__wing--right">{wing(1)}</g>

      {/* Feet, hooked, as if it has just dropped onto something. */}
      <path d="M -31 0 q -13 -25 2 -40 l 19 9 q -9 19 0 31 z" fill={g('body')} stroke={EDGE} strokeWidth={2.8} strokeLinejoin="round" />
      <path d="M 31 0 q 13 -25 -2 -40 l -19 9 q 9 19 0 31 z" fill={g('body')} stroke={EDGE} strokeWidth={2.8} strokeLinejoin="round" />
      {[-36, -22, 22, 36].map((x, i) => (
        <path key={i} d={`M ${x} 0 q ${x < 0 ? -8 : 8} -9 ${x < 0 ? -2 : 2} -15`} stroke={STRUT} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.8} />
      ))}

      {/* Body: narrow, long, ribbed. */}
      <path
        d="M -21 -136 C -31 -102, -27 -56, -15 -28 L 15 -28 C 27 -56, 31 -102, 21 -136 z"
        fill={g('body')}
        stroke={EDGE}
        strokeWidth={3.2}
        strokeLinejoin="round"
      />
      {[-110, -92, -74, -56].map((y, i) => (
        <path key={i} d={`M ${-18 + i} ${y} q 18 9 ${36 - i * 2} 0`} fill="none" stroke={EDGE} strokeWidth={2.2} opacity={0.3} />
      ))}
      {rim('M -19 -128 C -27 -100, -24 -60, -14 -34', 2.4, 0.14)}
      {/* Fur tufts where the wings join, breaking the seam. */}
      {[-1, 1].map((dir) => (
        <g key={dir} transform={dir === 1 ? undefined : 'scale(-1 1)'}>
          <path d="M 21 -132 q 15 5 22 18 q -17 -2 -26 -8 z" fill={FUR_LIT} stroke={EDGE} strokeWidth={2} strokeLinejoin="round" />
          <path d="M 24 -126 l 8 8 M 30 -122 l 6 7" stroke={EDGE} strokeWidth={1.6} opacity={0.45} fill="none" />
        </g>
      ))}

      {/* Ears: tall and raked BACK — upright ears are a rabbit. */}
      <path d="M -27 -150 q -28 -32 -32 -58 q 26 9 43 37 z" fill={g('body')} stroke={EDGE} strokeWidth={3} strokeLinejoin="round" />
      <path d="M 27 -150 q 28 -32 32 -58 q -26 9 -43 37 z" fill={g('body')} stroke={EDGE} strokeWidth={3} strokeLinejoin="round" />
      <path d="M -49 -192 q 7 17 15 28 M 49 -192 q -7 17 -15 28" fill="none" stroke={FUR_LIT} strokeWidth={3} opacity={0.65} />
      {rim('M -27 -150 q -28 -32 -32 -58', 2, 0.16)}
      {rim('M 27 -150 q 28 -32 32 -58', 2, 0.16)}

      {/* Head: WIDE and FLAT with a brow shelf, not a ball. */}
      <path
        d="M -38 -144 C -42 -164, -25 -176, 0 -176 C 25 -176, 42 -164, 38 -144
           C 32 -129, -32 -129, -38 -144 z"
        fill={g('head')}
        stroke={EDGE}
        strokeWidth={3.2}
        strokeLinejoin="round"
      />
      <path d="M -36 -157 C -21 -166, 21 -166, 36 -157 C 21 -152, -21 -152, -36 -157 z" fill={EDGE} opacity={0.75} />
      {rim('M -34 -164 C -18 -174, 18 -174, 34 -164', 2.2, 0.24)}
      {/* Nose-leaf: the fleshy spear that makes a bat's face grotesque. */}
      <path d="M 0 -150 L 8 -134 L 0 -125 L -8 -134 z" fill={FUR_LIT} stroke={EDGE} strokeWidth={2} strokeLinejoin="round" />
      <path d="M 0 -146 L 0 -128" stroke={EDGE} strokeWidth={1.6} opacity={0.55} fill="none" />
      {/* Mouth, open, teeth top and bottom. */}
      <path d="M -19 -131 C -17 -115, 17 -115, 19 -131 z" fill="#0f0a14" stroke={EDGE} strokeWidth={2} />
      {teeth(-17, -130, 17, -130, 7, 8, '#efe6f5')}
      <path d="M -13 -118 l 3 -9 l 4 9 z M 10 -118 l 3 -9 l 3 9 z" fill="#efe6f5" />
      <g className="monster__glow">
        {eye(-17, -157, 10, EYE, 3)}
        {eye(17, -157, 10, EYE, -3)}
      </g>
    </g>
  )
}

/* ── 3. the dragon monster ───────────────────────────────────────────────── */

/**
 * Wyrm — the tallest of the five, in profile: neck up, jaws open, one wing
 * half-furled.
 *
 * ⚠️ IN PROFILE, WHICH IS THE FIX FOR EVERYTHING THAT WAS WRONG WITH IT. Drawn
 * facing the viewer it came out as a ball with a tube on it — and worse, the
 * tail swept out on the SAME side as the head, so the creature appeared to have
 * two necks. Side-on, a dragon is a legible animal: head at one end, tail at
 * the other, the back running between them, and the ridge along that back edge
 * where a ridge actually goes.
 *
 * ⚠️ THE BODY IS ONE CLOSED PATH FROM CHEST TO TAIL. Drawing the torso, the
 * neck and the tail as separate blobs is what produced a snowman; a single
 * outline means the silhouette is decided in one place, and the spikes can be
 * hung on the line it already describes.
 *
 * ⚠️ AND SCALES ARE ROWS, NOT SPOTS. A few scattered marks read as damage; rows
 * of overlapping arcs that follow the body's own curve are what make it
 * reptile.
 */
function DragonMonster({ uid }: { uid: string }) {
  const SCALE_LIT = '#b8394b'
  const BELLY = '#dcc79e'
  const BONE = '#eee2c8'
  const EDGE = '#160709'
  const EMBER = '#ffb03a'
  const g = (n: string) => `url(#mon-dr-${n}-${uid})`

  const ridge = (points: [number, number, number][]) => (
    <>
      {points.map(([x, y, h], i) => (
        <g key={i}>
          <path
            d={`M ${x} ${y} L ${x - h * 0.75} ${y - h * 0.95} L ${x + h * 0.55} ${y - h * 0.35} z`}
            fill={BONE}
            stroke={EDGE}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <path d={`M ${x} ${y} L ${x - h * 0.75} ${y - h * 0.95}`} stroke="#ffffff" strokeWidth={1.4} opacity={0.35} fill="none" />
        </g>
      ))}
    </>
  )

  /** A row of scales along a line — overlapping arcs, not dots. */
  const scales = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    n: number,
    r: number,
    key: number,
  ) => (
    <g key={key} opacity={0.3}>
      {Array.from({ length: n }, (_, i) => {
        const t = i / (n - 1)
        const x = x0 + (x1 - x0) * t
        const y = y0 + (y1 - y0) * t
        return (
          <path
            key={i}
            d={`M ${x - r} ${y} a ${r} ${r * 0.8} 0 0 1 ${r * 2} 0`}
            fill="none"
            stroke={EDGE}
            strokeWidth={1.8}
          />
        )
      })}
    </g>
  )

  return (
    <g className="monster monster--dragon">
      <defs>
        {shade(`mon-dr-body-${uid}`, SCALE_LIT, '#7d1b28', '#38090f')}
        {shade(`mon-dr-limb-${uid}`, '#932536', '#66151f', '#2c060c')}
        {shade(`mon-dr-wing-${uid}`, '#5c1420', '#3f0c15', '#210407')}
        {bloom(`mon-dr-glow-${uid}`, EMBER)}
      </defs>

      {/* Far hind leg, behind everything. */}
      <path
        d="M -30 -104 C -54 -96, -58 -64, -44 -34 L -46 -6 L -20 -6 L -22 -40
           C -30 -60, -24 -80, -8 -88 z"
        fill={g('wing')}
        stroke={EDGE}
        strokeWidth={3}
        strokeLinejoin="round"
      />

      {/* ── the silhouette: chest → throat → skull → nape → back → tail ─── */}
      <path
        d="M 40 -104
           C 46 -132, 42 -156, 56 -176
           C 68 -192, 92 -200, 118 -196
           L 150 -186
           L 148 -168
           L 116 -170
           C 98 -172, 84 -164, 78 -150
           C 72 -136, 78 -122, 88 -112
           L 74 -96
           C 62 -108, 52 -120, 50 -134
           C 44 -118, 46 -104, 52 -92
           C 62 -74, 60 -48, 36 -34
           C 8 -18, -34 -22, -56 -44
           C -76 -62, -104 -70, -140 -60
           L -146 -76
           C -104 -92, -70 -86, -48 -70
           C -40 -92, -22 -112, 4 -118
           C 20 -122, 32 -114, 40 -104 z"
        fill={g('body')}
        stroke={EDGE}
        strokeWidth={3.6}
        strokeLinejoin="round"
      />

      {/* Scale rows, following the body's own curves. */}
      {scales(-6, -104, 34, -96, 7, 7, 0)}
      {scales(-18, -88, 30, -78, 8, 6.5, 1)}
      {scales(-40, -74, -100, -70, 7, 6, 2)}
      {scales(46, -150, 60, -126, 4, 6, 3)}
      {scales(74, -178, 100, -186, 4, 5.5, 4)}

      {/* Belly: a pale plane under the chest, plated across. */}
      <path
        d="M 46 -84 C 56 -60, 46 -40, 24 -30 C 0 -20, -30 -26, -48 -44
           C -26 -34, 4 -34, 24 -46 C 40 -56, 46 -68, 46 -84 z"
        fill={BELLY}
        stroke={EDGE}
        strokeWidth={1.8}
        strokeLinejoin="round"
        opacity={0.92}
      />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M ${34 - i * 18} ${-52 + i * 2} q -6 12 -14 18`} fill="none" stroke={EDGE} strokeWidth={1.8} opacity={0.38} />
      ))}

      {/* Shoulder, haunch, and the shadow where the near leg overlaps. */}
      <ellipse cx={16} cy={-96} rx={27} ry={23} fill={SCALE_LIT} opacity={0.26} />
      <ellipse cx={-30} cy={-76} rx={25} ry={21} fill={EDGE} opacity={0.22} />
      {rim('M 4 -118 C 24 -123, 34 -114, 41 -104', 2.4, 0.22)}
      {rim('M -48 -70 C -70 -86, -104 -92, -145 -76', 2, 0.13)}
      {rim('M 56 -176 C 68 -192, 92 -200, 117 -196', 2.4, 0.2)}

      {/* Near hind leg: haunch, shin, clawed foot. */}
      <path
        d="M 2 -96 C 26 -92, 38 -66, 30 -40 L 32 -8 L 6 -8 L 8 -44
           C 2 -62, -6 -74, -18 -78 z"
        fill={g('limb')}
        stroke={EDGE}
        strokeWidth={3.4}
        strokeLinejoin="round"
      />
      <path d="M 2 -8 L 40 -8 q 14 0 18 8 l -58 2 z" fill={g('limb')} stroke={EDGE} strokeWidth={2.8} strokeLinejoin="round" />
      {[14, 30].map((x, i) => (
        <path key={i} d={`M ${x} 2 q 12 -4 18 2`} stroke={BONE} strokeWidth={3.4} strokeLinecap="round" fill="none" />
      ))}
      {rim('M 2 -96 C 26 -92, 38 -68, 31 -44', 2.2, 0.18)}

      {/* Foreclaw, tucked under the chest — small, and it says biped. */}
      <path d="M 52 -92 C 66 -84, 70 -70, 64 -58 L 52 -62 C 56 -72, 54 -82, 44 -86 z" fill={g('limb')} stroke={EDGE} strokeWidth={2.6} strokeLinejoin="round" />
      <path d="M 62 -58 q 8 4 8 12 M 58 -58 q 2 8 -2 14" stroke={BONE} strokeWidth={2.6} strokeLinecap="round" fill="none" />

      {/* The wing, folded high on the shoulder, elbow claw off the top. */}
      <g className="monster__wing monster__wing--furled">
        <path
          d="M 12 -122 C -22 -160, -74 -168, -112 -146
             C -84 -146, -62 -136, -50 -122
             C -66 -110, -74 -96, -74 -84
             C -50 -104, -20 -114, 6 -112 z"
          fill={g('wing')}
          stroke={EDGE}
          strokeWidth={3.2}
          strokeLinejoin="round"
        />
        <path d="M 4 -128 C -30 -152, -70 -156, -100 -142 C -66 -148, -30 -140, 0 -120 z" fill="#ffffff" opacity={0.07} />
        <path d="M 12 -122 L -104 -144" stroke={BONE} strokeWidth={4.4} strokeLinecap="round" opacity={0.85} fill="none" />
        <path d="M 10 -116 L -50 -122" stroke={BONE} strokeWidth={3.2} strokeLinecap="round" opacity={0.6} fill="none" />
        <path d="M 8 -112 L -74 -84" stroke={BONE} strokeWidth={2.8} strokeLinecap="round" opacity={0.52} fill="none" />
        <path d="M -112 -146 q -14 -12 -14 -24 q 16 6 24 18 z" fill={BONE} stroke={EDGE} strokeWidth={2.2} strokeLinejoin="round" />
      </g>

      {/* ── the head ─────────────────────────────────────────────────────── */}
      <path d="M 116 -170 C 130 -166, 146 -158, 150 -148 L 112 -146 C 104 -152, 106 -164, 116 -170 z" fill={g('limb')} stroke={EDGE} strokeWidth={2.8} strokeLinejoin="round" />
      <path d="M 118 -164 C 130 -160, 140 -154, 144 -150 L 116 -149 z" fill="#26080a" />
      <g className="monster__glow">
        <ellipse cx={126} cy={-158} rx={24} ry={14} fill={g('glow')} />
        <ellipse cx={128} cy={-158} rx={12} ry={5} fill={EMBER} opacity={0.7} transform="rotate(10 128 -158)" />
      </g>
      {teeth(112, -172, 148, -166, 7, 8, BONE)}
      <path d="M 116 -152 l 3 9 l 6 -6 z M 132 -150 l 3 9 l 6 -7 z" fill={BONE} />
      {/* Brow shelf, eye under it, nostril. */}
      <path d="M 92 -184 C 104 -192, 122 -192, 132 -184 C 120 -180, 102 -180, 92 -184 z" fill={EDGE} opacity={0.7} />
      <g className="monster__glow">{eye(110, -178, 11, EMBER, -3)}</g>
      <ellipse cx={140} cy={-178} rx={4} ry={3} fill={EDGE} opacity={0.75} transform="rotate(-14 140 -178)" />
      {/* Horns. */}
      <path d="M 92 -190 C 66 -212, 34 -220, 12 -212 C 42 -210, 68 -200, 86 -182 z" fill={BONE} stroke={EDGE} strokeWidth={2.6} strokeLinejoin="round" />
      <path d="M 92 -190 C 66 -212, 34 -220, 12 -212" stroke="#ffffff" strokeWidth={2} opacity={0.3} fill="none" />
      <path d="M 100 -190 C 82 -204, 60 -208, 46 -204 C 68 -200, 84 -192, 94 -182 z" fill="#cdbf9c" stroke={EDGE} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M 96 -158 l -12 6 l 10 6 z" fill={BONE} stroke={EDGE} strokeWidth={1.8} strokeLinejoin="round" />

      {/* Ridge: nape → back → tail, on the silhouette's own top edge. */}
      {ridge([
        [86, -180, 8],
        [72, -166, 10],
        [60, -148, 11],
        [50, -128, 12],
        [34, -114, 13],
        [12, -114, 13],
        [-12, -102, 12],
        [-34, -84, 10],
        [-60, -72, 9],
        [-90, -74, 7],
        [-122, -70, 6],
      ])}
    </g>
  )
}

/* ── 4. the spider monster ───────────────────────────────────────────────── */

/**
 * Broodmother — eight legs braced, abdomen low, front pair raised.
 *
 * ⚠️ THE KNEE GOES UP BEFORE THE FOOT GOES DOWN. Drawn as a smooth curve from
 * body to floor, a spider leg is a tentacle or a hair; the raised knee is the
 * entire silhouette of the animal, and eight of them make it unmistakable
 * before any detail lands. Each leg also TAPERS — eight tubes of even width
 * read as scaffolding.
 *
 * ⚠️ AND A SPIDER IS HAIRY. Bare curved tubes were the biggest single reason
 * this read as a diagram: bristles round the abdomen break the outline
 * everywhere and are what make it unpleasant rather than neat.
 *
 * ⚠️ NO WEB ANYWHERE. Insects' legendary castle skin is a spider on a web; this
 * is a spider on the ground. If they share silk they become the same thing seen
 * twice.
 */
function SpiderMonster({ uid }: { uid: string }) {
  const CARAPACE = '#2a2230'
  const CARAPACE_LIT = '#4d4055'
  const RAISED = '#5f4f69'
  const JOINT = '#8ce06a'
  const EDGE = '#0d0a11'
  const EYE = '#b6ff5a'
  const g = (n: string) => `url(#mon-sp-${n}-${uid})`

  /** One planted leg: femur out and UP to the knee, tibia down to the tip. */
  const leg = (
    hipX: number,
    hipY: number,
    dir: 1 | -1,
    reach: number,
    lift: number,
    w: number,
    key: number,
  ) => {
    const kneeX = hipX + dir * reach * 0.58
    const kneeY = hipY - lift
    const d = `M ${hipX} ${hipY}
               Q ${hipX + dir * reach * 0.26} ${hipY - lift * 1.05} ${kneeX} ${kneeY}
               Q ${hipX + dir * reach * 0.96} ${kneeY * 0.38} ${hipX + dir * reach} 0`
    return (
      <g key={key}>
        <path d={d} fill="none" stroke={EDGE} strokeWidth={w + 3.5} strokeLinecap="round" />
        <path d={d} fill="none" stroke={CARAPACE} strokeWidth={w} strokeLinecap="round" />
        {/* A lit edge down the top of the limb. */}
        <path d={d} fill="none" stroke="#ffffff" strokeWidth={w * 0.22} strokeLinecap="round" opacity={0.16} />
        {/* Bristles on the femur, angled back toward the body. */}
        {[0.2, 0.34, 0.48].map((t, i) => {
          const bx = hipX + dir * reach * t * 0.9
          const by = hipY - lift * (t / 0.58) * 0.92
          return (
            <path
              key={i}
              d={`M ${bx} ${by} l ${dir * 4} -10`}
              stroke={EDGE}
              strokeWidth={2.4}
              strokeLinecap="round"
              fill="none"
            />
          )
        })}
        <circle cx={kneeX} cy={kneeY} r={w * 0.62} fill={CARAPACE_LIT} stroke={EDGE} strokeWidth={2} />
        <circle cx={kneeX} cy={kneeY} r={w * 0.24} fill={JOINT} opacity={0.9} />
      </g>
    )
  }

  return (
    <g className="monster monster--spider">
      <defs>
        {shade(`mon-sp-abdomen-${uid}`, '#4a3d53', CARAPACE, '#151020')}
        {shade(`mon-sp-head-${uid}`, '#5d4d67', CARAPACE_LIT, '#231c2b')}
        {bloom(`mon-sp-glow-${uid}`, EYE)}
      </defs>

      <g className="monster__legs">
        {leg(-26, -78, -1, 142, 70, 9, 0)}
        {leg(-24, -70, -1, 112, 54, 8.4, 1)}
        {leg(-20, -62, -1, 78, 40, 7.8, 2)}
        {leg(26, -78, 1, 142, 70, 9, 3)}
        {leg(24, -70, 1, 112, 54, 8.4, 4)}
        {leg(20, -62, 1, 78, 40, 7.8, 5)}
      </g>

      {/* ⚠️ NOT A MIRRORED PAIR. Two identical raised legs at matching angles
          read as a machine part, or as pincers. One reaches high and forward,
          the other stays lower and swings out. */}
      <g className="monster__legs monster__legs--raised">
        {[
          { d: 'M -18 -88 Q -74 -146 -126 -142 Q -92 -124 -74 -92', knee: [-84, -136] },
          { d: 'M 20 -84 Q 70 -120 122 -108 Q 88 -100 70 -78', knee: [76, -110] },
        ].map((l, i) => (
          <g key={i}>
            <path d={l.d} fill="none" stroke={EDGE} strokeWidth={13} strokeLinecap="round" />
            <path d={l.d} fill="none" stroke={RAISED} strokeWidth={9} strokeLinecap="round" />
            <path d={l.d} fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" opacity={0.14} />
            <circle cx={l.knee[0]} cy={l.knee[1]} r={6.5} fill={CARAPACE_LIT} stroke={EDGE} strokeWidth={2} />
            <circle cx={l.knee[0]} cy={l.knee[1]} r={2.6} fill={JOINT} opacity={0.9} />
          </g>
        ))}
        <path d="M -126 -142 q -16 -6 -20 -16 q 16 -2 26 8 z" fill={RAISED} stroke={EDGE} strokeWidth={2} strokeLinejoin="round" />
        <path d="M 122 -108 q 16 -4 20 -14 q -16 -4 -26 6 z" fill={RAISED} stroke={EDGE} strokeWidth={2} strokeLinejoin="round" />
      </g>

      {/* Bristles first, so they sit behind the abdomen and break its outline. */}
      {Array.from({ length: 14 }, (_, i) => {
        const a = (-72 + i * 11) * (Math.PI / 180)
        const x = Math.sin(a) * 62
        const y = -58 - Math.cos(a) * 50
        return (
          <path
            key={i}
            d={`M ${x} ${y} l ${Math.sin(a) * 15} ${-Math.cos(a) * 13}`}
            stroke={EDGE}
            strokeWidth={3.2}
            strokeLinecap="round"
            fill="none"
          />
        )
      })}
      <ellipse cx={0} cy={-58} rx={62} ry={50} fill={g('abdomen')} stroke={EDGE} strokeWidth={3.6} />
      {/* A sheen across the top of the shell. */}
      <ellipse cx={-16} cy={-78} rx={30} ry={18} fill="#ffffff" opacity={0.09} />
      {rim('M -54 -76 C -40 -100, 34 -104, 54 -74', 2.4, 0.18)}

      {/* Waist, then the cephalothorax — without the gap the two blobs merge
          into one lump and it stops reading as a spider. */}
      <ellipse cx={0} cy={-92} rx={16} ry={10} fill={EDGE} />
      <ellipse cx={0} cy={-102} rx={38} ry={27} fill={g('head')} stroke={EDGE} strokeWidth={3.2} />
      <path d="M -30 -112 C -14 -120, 14 -120, 30 -112" fill="none" stroke={EDGE} strokeWidth={2.4} opacity={0.4} />
      {rim('M -32 -108 C -18 -122, 18 -122, 32 -108', 2.2, 0.2)}

      {/* ⚠️ EIGHT EYES, NOT TWO: two eyes on a round head is a cartoon face,
          and the cluster is what says spider. */}
      <g className="monster__glow">
        <ellipse cx={0} cy={-107} rx={36} ry={17} fill={g('glow')} opacity={0.55} />
        {eye(-15, -108, 8, EYE, 2)}
        {eye(15, -108, 8, EYE, -2)}
        {[
          [-7, -116, 3],
          [7, -116, 3],
          [-25, -104, 2.8],
          [25, -104, 2.8],
          [-12, -98, 2.4],
          [12, -98, 2.4],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill={EYE} opacity={0.85} />
        ))}
      </g>

      {/* Chelicerae, thick and angled inward, fangs hooking under. */}
      <path d="M -16 -86 C -20 -74, -14 -66, -6 -62 L -2 -70 C -8 -74, -11 -80, -10 -88 z" fill={CARAPACE_LIT} stroke={EDGE} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M 16 -86 C 20 -74, 14 -66, 6 -62 L 2 -70 C 8 -74, 11 -80, 10 -88 z" fill={CARAPACE_LIT} stroke={EDGE} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M -9 -66 C -12 -56, -8 -48, -1 -42 L -3 -52 C -6 -56, -7 -60, -6 -66 z" fill="#efe6f5" stroke={EDGE} strokeWidth={1.6} strokeLinejoin="round" />
      <path d="M 9 -66 C 12 -56, 8 -48, 1 -42 L 3 -52 C 6 -56, 7 -60, 6 -66 z" fill="#efe6f5" stroke={EDGE} strokeWidth={1.6} strokeLinejoin="round" />

      {/* The hourglass — the one spider marking everybody reads as "venomous".
          ⚠️ DRAWN LAST AND LOW. Centred on the abdomen it was covered twice
          over: the head hid its top half and the fangs hid what was left, so
          all that showed was a green triangle on a stalk — a wine glass. */}
      <g className="monster__glow">
        <path d="M -15 -58 L 15 -58 L 4 -40 L 15 -22 L -15 -22 L -4 -40 z" fill={JOINT} opacity={0.9} />
        <path d="M -9 -55 L 9 -55 L 2 -41 L 9 -26 L -9 -26 L -2 -41 z" fill="#e8ffd4" opacity={0.4} />
      </g>
    </g>
  )
}

/* ── 5. the goblin monster ───────────────────────────────────────────────── */

/**
 * Warbrute — the only humanoid on the board, and built like a bouncer.
 *
 * ⚠️ IT HAD TO BE BROAD, NOT SMALL. A goblin's usual read is "little and
 * sneaky", which is the opposite of a thing that hits the whole table for
 * hundreds every ten seconds. Its shoulders sit above its head line, its stance
 * is narrower than its shoulders, and its head is thrust forward of its chest,
 * so it is always leaning at you.
 *
 * ⚠️ THE WEAPON IS PART OF THE SILHOUETTE, WHICH MEANS IT IS PART OF THE BOX.
 * Given a bare fist this reads as an ape; the notched cleaver held out to one
 * side is what makes the shape unmistakable — and the first build let it hang
 * seventy units outside the declared box, so the arena cropped it out of the
 * hit area and the reticle.
 *
 * ⚠️ AND FLAT GREEN IS A FROG. What makes it skin is the mottling: darker
 * blotches over the chest and shoulders, a lighter plane high on the ribs,
 * shadow in the gut, and old scars. Same for the iron — hammered, chipped and
 * rusted at the rivets, never a clean grey shape.
 */
function GoblinMonster({ uid }: { uid: string }) {
  const SKIN_LIT = '#88a659'
  const SKIN_DARK = '#2f3f1c'
  const IRON_LIT = '#a4a6ae'
  const RUST = '#7a3f20'
  const EDGE = '#0f1408'
  const EYE = '#ff4a3d'
  const g = (n: string) => `url(#mon-gb-${n}-${uid})`

  return (
    <g className="monster monster--goblin">
      <defs>
        {shade(`mon-gb-skin-${uid}`, '#7a9748', '#5f7a3a', '#33441d')}
        {shade(`mon-gb-limb-${uid}`, '#6d8a41', '#516a30', '#283616')}
        {shade(`mon-gb-head-${uid}`, '#95b365', SKIN_LIT, '#4a6129')}
        {shade(`mon-gb-iron-${uid}`, '#b2b4bc', '#6d6f77', '#37393f')}
        {bloom(`mon-gb-glow-${uid}`, EYE)}
      </defs>

      {/* Legs. */}
      <path d="M -46 0 C -54 -30, -42 -54, -22 -60 L -4 -42 C -18 -34, -22 -18, -16 0 z" fill={g('limb')} stroke={EDGE} strokeWidth={3.2} strokeLinejoin="round" />
      <path d="M 46 0 C 54 -30, 42 -54, 22 -60 L 4 -42 C 18 -34, 22 -18, 16 0 z" fill={g('limb')} stroke={EDGE} strokeWidth={3.2} strokeLinejoin="round" />
      <path d="M -54 0 q -14 -8 -4 -16 l 38 0 l 4 16 z" fill={g('skin')} stroke={EDGE} strokeWidth={2.8} strokeLinejoin="round" />
      <path d="M 54 0 q 14 -8 4 -16 l -38 0 l -4 16 z" fill={g('skin')} stroke={EDGE} strokeWidth={2.8} strokeLinejoin="round" />
      <path d="M -50 -4 l 8 -6 M -34 -4 l 6 -6 M 50 -4 l -8 -6 M 34 -4 l -6 -6" stroke={EDGE} strokeWidth={2.2} strokeLinecap="round" fill="none" opacity={0.55} />

      {/* Torso, leaning forward, shoulders hunched high. */}
      <path
        d="M -56 -136 C -70 -110, -60 -70, -30 -56 L 34 -56 C 62 -72, 68 -112, 52 -138
           C 30 -152, -36 -150, -56 -136 z"
        fill={g('skin')}
        stroke={EDGE}
        strokeWidth={3.6}
        strokeLinejoin="round"
      />
      {/* Chest plane high, gut in shadow — muscle, not belly. */}
      <path d="M -34 -122 C -18 -108, 16 -108, 32 -124 C 24 -100, -24 -100, -34 -122 z" fill={SKIN_LIT} opacity={0.5} />
      <path d="M -30 -70 C -12 -58, 14 -58, 30 -70 C 22 -54, -20 -54, -30 -70 z" fill={EDGE} opacity={0.2} />
      <path d="M -2 -120 L -2 -96" stroke={EDGE} strokeWidth={2.4} opacity={0.35} fill="none" />
      {rim('M -54 -138 C -32 -150, 30 -152, 51 -139', 2.4, 0.2)}
      {/* Mottling and old scars. */}
      {[
        'M -40 -118 q 10 -6 18 2 q -10 4 -18 -2 z',
        'M 26 -112 q 12 -4 18 4 q -12 3 -18 -4 z',
        'M -20 -78 q 14 -4 22 3 q -14 4 -22 -3 z',
      ].map((d, i) => (
        <path key={i} d={d} fill={SKIN_DARK} opacity={0.32} />
      ))}
      <path d="M 14 -128 l 10 16 M 20 -126 l -4 8" stroke={SKIN_DARK} strokeWidth={2.2} strokeLinecap="round" fill="none" opacity={0.65} />

      {/* Neck, so the head is attached rather than balanced on the shoulders. */}
      <path d="M -6 -150 C -10 -138, -8 -128, 0 -122 L 34 -126 C 26 -134, 24 -144, 26 -154 z" fill={g('limb')} stroke={EDGE} strokeWidth={2.8} strokeLinejoin="round" />

      {/* Iron: a layered pauldron, hammered and riveted, and a strap. */}
      <path d="M -58 -134 q -26 -18 -8 -38 q 28 -12 44 6 l -12 30 z" fill={g('iron')} stroke={EDGE} strokeWidth={3.2} strokeLinejoin="round" />
      <path d="M -62 -158 l 10 -14 l 8 12 l 10 -10 l 6 14 z" fill={IRON_LIT} stroke={EDGE} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M -52 -150 q 10 6 16 2 M -46 -136 q 12 4 18 -2" stroke={EDGE} strokeWidth={1.8} opacity={0.4} fill="none" />
      {[
        [-52, -146],
        [-38, -140],
        [-30, -152],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={2.8} fill={IRON_LIT} stroke={EDGE} strokeWidth={1.2} />
          <circle cx={x! - 0.6} cy={y! - 0.6} r={1} fill="#ffffff" opacity={0.55} />
        </g>
      ))}
      <path d="M -44 -128 L 36 -80" stroke={RUST} strokeWidth={11} opacity={0.95} fill="none" />
      <path d="M -44 -128 L 36 -80" stroke={EDGE} strokeWidth={2.4} opacity={0.28} fill="none" />
      <path d="M -40 -124 L 32 -78" stroke="#a86038" strokeWidth={2.4} opacity={0.5} fill="none" />
      <path d="M -6 -108 l 12 7 l -4 8 l -12 -7 z" fill={g('iron')} stroke={EDGE} strokeWidth={1.8} />

      {/* Left arm, hanging, fist closed. */}
      <path d="M -54 -124 C -78 -106, -84 -72, -72 -44 L -48 -50 C -58 -74, -54 -94, -38 -108 z" fill={g('limb')} stroke={EDGE} strokeWidth={3.2} strokeLinejoin="round" />
      <path d="M -72 -44 q -16 12 -4 22 q 18 8 32 -4 l -8 -20 z" fill={g('skin')} stroke={EDGE} strokeWidth={3} strokeLinejoin="round" />
      <path d="M -66 -30 l 2 8 M -56 -28 l 2 8" stroke={EDGE} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.5} />
      {rim('M -54 -124 C -76 -106, -82 -76, -72 -46', 2, 0.13)}

      {/* Right arm, out and up, holding the cleaver. */}
      <path d="M 52 -128 C 80 -118, 96 -96, 94 -70 L 70 -66 C 72 -88, 62 -102, 42 -112 z" fill={g('limb')} stroke={EDGE} strokeWidth={3.2} strokeLinejoin="round" />
      <path d="M 94 -70 q 16 8 8 22 q -18 8 -30 -4 l 4 -20 z" fill={g('skin')} stroke={EDGE} strokeWidth={3} strokeLinejoin="round" />
      {rim('M 52 -128 C 78 -118, 94 -98, 93 -72', 2, 0.15)}

      <g className="monster__blade">
        {/* Haft, then a heavy chipped blade. A clean edge is a prop; a chipped
            one has been used. */}
        <path d="M 88 -58 L 122 -150" stroke={RUST} strokeWidth={9} strokeLinecap="round" fill="none" />
        <path d="M 90 -62 L 122 -148" stroke="#a86038" strokeWidth={2.6} strokeLinecap="round" fill="none" opacity={0.45} />
        <path d="M 92 -70 l 24 8 l -4 12 l -24 -8 z" fill={g('iron')} stroke={EDGE} strokeWidth={2} strokeLinejoin="round" />
        <path
          d="M 112 -144 L 150 -190 L 172 -178 L 160 -166 L 172 -156 L 152 -148 L 160 -134 L 126 -122 z"
          fill={g('iron')}
          stroke={EDGE}
          strokeWidth={3.2}
          strokeLinejoin="round"
        />
        {/* The bevel: one bright line down the cutting edge, grime at the
            spine. */}
        <path d="M 118 -140 L 152 -180" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.4} />
        <path d="M 128 -128 L 158 -160" stroke={EDGE} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.22} />
        <path d="M 150 -190 l 8 -10 l 6 12 z" fill={IRON_LIT} stroke={EDGE} strokeWidth={1.8} strokeLinejoin="round" />
      </g>

      {/* Head: thrust forward, low between the shoulders, brow you cannot see
          past. */}
      <path d="M -20 -158 C -26 -180, -6 -196, 18 -194 C 44 -192, 56 -174, 50 -154 C 44 -136, -12 -138, -20 -158 z" fill={g('head')} stroke={EDGE} strokeWidth={3.4} strokeLinejoin="round" />
      {rim('M -18 -166 C -22 -184, -2 -194, 20 -193', 2.4, 0.22)}
      {/* Ears, swept back, notched, with veins. */}
      <path d="M -18 -172 C -46 -186, -68 -182, -80 -170 C -58 -172, -40 -164, -20 -156 z" fill={g('skin')} stroke={EDGE} strokeWidth={2.8} strokeLinejoin="round" />
      <path d="M 48 -170 C 72 -188, 92 -186, 102 -174 C 82 -174, 64 -164, 48 -154 z" fill={g('skin')} stroke={EDGE} strokeWidth={2.8} strokeLinejoin="round" />
      <path d="M -30 -170 C -44 -176, -58 -177, -68 -172 M 60 -170 C 74 -178, 86 -179, 94 -175" stroke={EDGE} strokeWidth={1.8} opacity={0.35} fill="none" />
      <path d="M -62 -176 l 6 8 M 84 -180 l -6 8" stroke={EDGE} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.5} />
      {/* Brow shelf. */}
      <path d="M -16 -174 C -2 -186, 32 -188, 46 -176 C 30 -170, -2 -168, -16 -174 z" fill={EDGE} opacity={0.65} />
      {/* Jaw, open, underbite tusks. */}
      <path d="M -10 -152 C 4 -140, 34 -140, 46 -152 C 40 -132, 2 -130, -10 -152 z" fill="#1e1105" stroke={EDGE} strokeWidth={2.4} strokeLinejoin="round" />
      {teeth(-6, -150, 42, -150, 7, 7, '#e2dcc4')}
      <path d="M 6 -140 l -6 16 l 11 -3 z" fill="#e2dcc4" stroke={EDGE} strokeWidth={1.4} strokeLinejoin="round" />
      <path d="M 32 -140 l 6 16 l -11 -3 z" fill="#e2dcc4" stroke={EDGE} strokeWidth={1.4} strokeLinejoin="round" />
      <path d="M 4 -138 l -3 10 M 34 -138 l 3 10" stroke="#ffffff" strokeWidth={1.4} opacity={0.35} fill="none" />
      <g className="monster__glow">
        {eye(4, -166, 10, EYE, 3)}
        {eye(32, -166, 10, EYE, -3)}
      </g>
    </g>
  )
}

/* ── the registry ────────────────────────────────────────────────────────── */

const RENDERERS: Record<MonsterKind, (props: { uid: string }) => React.JSX.Element> = {
  rock: RockMonster,
  bat: BatMonster,
  dragon: DragonMonster,
  spider: SpiderMonster,
  goblin: GoblinMonster,
}

/**
 * Draws one monster in its own local space (feet on y = 0).
 *
 * `uid` namespaces the gradient ids, so two of these can share one document
 * without either stealing the other's fills — which is exactly what a review
 * page does.
 *
 * An unknown kind draws nothing rather than throwing: the server owns which
 * monster spawned, and a client one release behind must not crash on a kind it
 * has never heard of — it simply shows the health bar and the hit area, which
 * is enough to keep playing.
 */
export function MonsterBody({ kind, uid = 'm' }: { kind: MonsterKind; uid?: string }) {
  const Body = RENDERERS[kind]
  return Body ? <Body uid={uid} /> : null
}
