import type { DecorProps } from './decor'
import './skins.css'

/**
 * Water's skin decorations.
 *
 * Drawn INSIDE the castle's local space, over the sprite — the keep occupies
 * roughly x −20…20, y −58…−12, the curtain wall x −52…52, y −24…30, and the
 * gate x −11…11, y 10…30. Anything here is layered on top of that.
 *
 * ⚠️ THE SILHOUETTE AND THE HUE ARE NOT NEGOTIABLE. Players pick out who is
 * attacking them from a small castle on a phone, often through fog. A skin may
 * add detail and texture; it may not obscure the shape, and it stays in
 * Water's blues.
 *
 * ⚠️ AND IT MUST READ AT 60% SCALE. Everything here is judged at battlefield
 * size, not at the size it is drawn. Detail that only resolves when zoomed in
 * is detail nobody will ever see.
 */

const MID = '#1f7fbf'
const BRIGHT = '#7fd4ff'
const FOAM = '#dff3ff'

/**
 * Uncommon — Rippled Castle.
 *
 * The standard castle under spreading ripples, with a few droplets. The
 * lightest possible touch: nothing is added outside the outline, so the shape
 * is exactly the shape and the whole effect is surface pattern.
 */
function Ripples({ eliminated, uid }: DecorProps) {
  const rings = [
    { cx: -28, cy: 4, r: 7 },
    { cx: -28, cy: 4, r: 12 },
    { cx: 14, cy: -6, r: 6 },
    { cx: 14, cy: -6, r: 10.5 },
    { cx: 34, cy: 12, r: 5.5 },
    { cx: 34, cy: 12, r: 9.5 },
  ]
  return (
    <g className="skin skin--ripples" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      {/* Clipped to the wall so ripples sit ON the stone, not floating past it. */}
      <clipPath id={`skin-ripple-clip-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <g clipPath={`url(#skin-ripple-clip-${uid})`}>
        {rings.map((ring, i) => (
          <circle
            key={i}
            cx={ring.cx}
            cy={ring.cy}
            r={ring.r}
            fill="none"
            stroke={FOAM}
            strokeWidth={1.6}
            opacity={0.42}
          />
        ))}
      </g>
      {[
        { x: -30, y: -44 },
        { x: 30, y: -50 },
        { x: 26, y: -34 },
      ].map((d, i) => (
        <path
          key={i}
          d={`M ${d.x} ${d.y} c 3.2 4 3.2 6.4 0 8 c -3.2 -1.6 -3.2 -4 0 -8 z`}
          fill={BRIGHT}
          opacity={0.75}
        />
      ))}
    </g>
  )
}

/**
 * Rare — Coral Reef Fortress.
 *
 * A castle GROWN from reef rather than a castle with coral stuck to it.
 *
 * ⚠️ TWO EARLIER VERSIONS FAILED IN OPPOSITE DIRECTIONS, and both are worth
 * naming. The first used one thin forked branch repeated, which read as VEINS.
 * The second added variety but drew fans as tall rounded teardrops with
 * radiating ribs — which read as HOT-AIR BALLOONS — over a six-colour palette
 * of marbles and crayons that looked like spilled sweets.
 *
 * A sea fan is WIDE, FLAT AND LACY, not tall and inflated; and a reef reads as
 * a reef through form and density, not through how many colours are in it. The
 * palette here is two corals plus the jade crust, and nothing else.
 */
function Coral({ eliminated }: DecorProps) {
  const CORAL = '#e07a5f'
  const CORAL_LIGHT = '#f2a88f'
  const JADE = '#2f9c8a'

  /** A sea fan: broad, flat, lacy, and wider than it is tall. */
  const fan = (x: number, y: number, scale: number, flip: number, colour: string) => (
    <g transform={`translate(${x} ${y}) scale(${scale * flip} ${scale})`}>
      {/* A low, spreading outline with a scalloped top edge. */}
      <path
        d="M 0 0 C -14 -2 -22 -6 -24 -12 C -18 -13 -20 -18 -14 -18 C -12 -22 -6 -21 -4 -17
           C -1 -22 5 -21 6 -16 C 12 -19 16 -14 13 -10 C 20 -9 20 -3 12 -1 z"
        fill={colour}
        opacity={0.92}
      />
      {/* Lacy internal branching rather than straight ribs. */}
      {[
        'M 0 -1 C -5 -4 -9 -7 -12 -13',
        'M 0 -1 C -2 -6 -3 -10 -3 -16',
        'M 0 -1 C 3 -5 5 -9 6 -14',
        'M 0 -1 C 6 -3 10 -5 12 -9',
      ].map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#0b2b33" strokeWidth={0.9} opacity={0.32} />
      ))}
    </g>
  )

  /** Brain coral: a lobed mound with deep grooves, never a plain circle. */
  const brain = (x: number, y: number, r: number, colour: string) => (
    <g transform={`translate(${x} ${y})`}>
      <path
        d={`M ${-r} 0 C ${-r} ${-r * 0.9} ${-r * 0.45} ${-r * 1.25} 0 ${-r * 1.1}
            C ${r * 0.45} ${-r * 1.25} ${r} ${-r * 0.9} ${r} 0 z`}
        fill={colour}
        opacity={0.94}
      />
      {[0.3, 0.62].map((o, i) => (
        <path
          key={i}
          d={`M ${-r * 0.85} ${-r * o} q ${r * 0.42} ${r * 0.3} ${r * 0.85} 0 q ${r * 0.42} ${-r * 0.3} ${r * 0.85} 0`}
          fill="none"
          stroke="#0b2b33"
          strokeWidth={0.9}
          opacity={0.42}
        />
      ))}
    </g>
  )

  /** Finger coral: slim tapering fingers, uneven — not a bar chart. */
  const fingers = (x: number, y: number, colour: string) => (
    <g transform={`translate(${x} ${y})`}>
      {[
        { dx: -3.6, h: 8, lean: -1.4 },
        { dx: 0, h: 12.5, lean: 0.4 },
        { dx: 3.4, h: 6.5, lean: 1.6 },
      ].map((f, i) => (
        <path
          key={i}
          d={`M ${f.dx - 1.5} 0 C ${f.dx - 1.4} ${-f.h * 0.6} ${f.dx + f.lean - 1} ${-f.h * 0.8} ${f.dx + f.lean} ${-f.h}
              C ${f.dx + f.lean + 1} ${-f.h * 0.8} ${f.dx + 1.4} ${-f.h * 0.6} ${f.dx + 1.5} 0 z`}
          fill={colour}
          opacity={0.92}
        />
      ))}
    </g>
  )

  return (
    <g className="skin skin--coral" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      {/* Encrusting growth along the parapet. Rounded and irregular so it reads
          as growth ON the wall rather than as a second row of battlements —
          and closed cleanly, because an earlier version left a stray whisker
          poking off the left edge. */}
      <path
        d="M -52 -24 q 5 -6 11 -2 q 4 -7 11 -1 q 7 -8 13 -1 q 6 -6 12 -1 q 8 -7 14 0 q 6 -5 12 -1 q 5 -4 9 0 l 0 5 l -82 0 z"
        fill={JADE}
        opacity={0.85}
      />
      {/* And on the keep, so the tower belongs to the same reef. */}
      <path
        d="M -20 -12 q 5 -6 10 -2 q 5 -6 11 -1 q 6 -5 11 0 l 0 4 l -32 0 z"
        fill={JADE}
        opacity={0.7}
      />

      {/* Fans on the flanks — the shape read first, kept low and wide. */}
      {fan(-54, 22, 1.25, 1, CORAL)}
      {fan(54, 20, 1.15, -1, CORAL)}
      {fan(-30, 30, 0.85, -1, CORAL_LIGHT)}
      {fan(32, 30, 0.8, 1, CORAL_LIGHT)}

      {/* Brains tucked along the base. */}
      {brain(-45, 30, 6, CORAL_LIGHT)}
      {brain(-14, 30, 4.5, CORAL)}
      {brain(16, 30, 5, CORAL_LIGHT)}
      {brain(45, 30, 5.5, CORAL)}
      {brain(-61, 30, 4, CORAL)}
      {brain(61, 30, 4, CORAL_LIGHT)}

      {/* Fingers filling the gaps and climbing the flanks. */}
      {fingers(-24, 30, CORAL)}
      {fingers(25, 30, CORAL)}
      {fingers(-57, 10, CORAL_LIGHT)}
      {fingers(57, 8, CORAL_LIGHT)}

      {/* Glowing sea plants: the only bright note, and the only other hue. */}
      {[
        { x: -37, h: 12 },
        { x: -6, h: 8 },
        { x: 8, h: 9 },
        { x: 38, h: 13 },
      ].map((pl, i) => (
        <g key={i}>
          <path
            d={`M ${pl.x} 30 q ${i % 2 ? 4 : -4} ${-pl.h / 2} 0 ${-pl.h}`}
            fill="none"
            stroke="#6ef2c8"
            strokeWidth={2.2}
            strokeLinecap="round"
            opacity={0.9}
          />
          <circle cx={pl.x} cy={30 - pl.h} r={2.4} fill="#8ef0ff" />
        </g>
      ))}
    </g>
  )
}

/**
 * Rare — Frozen Harbor.
 *
 * A coastal fortress iced over: snow packed on every parapet, icicles under the
 * lip, docks frozen into the waterline, and blue water still forcing its way
 * through the cracks — the detail that keeps this a WATER skin and not an Ice
 * one.
 */
function Frozen({ eliminated }: DecorProps) {
  const ICE = '#eaf7ff'
  const SHADOW = '#b7d9ec'

  return (
    <g className="skin skin--frozen" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      {/* Snow PACKED ON the merlons: wide, flat, and slightly overhanging.
          Earlier these were tall and notched, which read as little shirts hung
          on the battlements. Snow settles; it does not stand up. */}
      {[
        { x: -20, y: -64, w: 10 },
        { x: -5, y: -64, w: 10 },
        { x: 10, y: -64, w: 10 },
        { x: -52, y: -32, w: 12 },
        { x: -30, y: -32, w: 12 },
        { x: 18, y: -32, w: 12 },
        { x: 40, y: -32, w: 12 },
      ].map((cap, i) => (
        <path
          key={i}
          d={`M ${cap.x - 2} ${cap.y + 3} q ${cap.w / 2 + 2} -6 ${cap.w + 4} 0 z`}
          fill={ICE}
        />
      ))}

      {/* A drift along the wall's top edge, tying the merlon caps together. */}
      <path
        d="M -52 -24 q 12 -5 24 -1 q 14 -5 27 -1 q 13 -4 26 0 q 12 -3 27 2 l 0 4 l -104 0 z"
        fill={ICE}
        opacity={0.85}
      />

      {/* Icicles hanging from that drift: thin, sharp, uneven. */}
      {[-46, -38, -28, -16, 8, 20, 31, 42, 48].map((x, i) => (
        <path
          key={i}
          d={`M ${x} -20 l 2.2 0 l -1.1 ${5 + ((i * 3) % 8)} z`}
          fill={ICE}
          opacity={0.92}
        />
      ))}

      {/* Docks frozen into the waterline. Attached to the wall and standing on
          pilings, with a hint of frozen sea under them — floating grey combs
          beside the castle read as unrelated objects. */}
      {[-1, 1].map((side) => (
        <g key={side}>
          <rect x={side < 0 ? -72 : 52} y={19} width={20} height={3.5} fill="#9db6c6" />
          {[1, 8, 15].map((o) => (
            <rect
              key={o}
              x={(side < 0 ? -71 : 53) + o}
              y={22.5}
              width={2.2}
              height={7.5}
              fill="#7c97a8"
            />
          ))}
          <rect
            x={side < 0 ? -74 : 52}
            y={29}
            width={22}
            height={2.5}
            fill={SHADOW}
            opacity={0.8}
          />
        </g>
      ))}

      {/* Water still moving through the ice. Branching rather than zig-zag:
          the earlier version read as lightning bolts. */}
      {[
        'M -40 -16 c 2 6 -1 8 1 12 M -39 -8 c -4 2 -5 5 -6 8',
        'M -4 -14 c 3 5 0 9 2 13 M -2 -6 c 4 2 5 4 6 7',
        'M 34 -16 c -3 6 0 9 -2 13 M 32 -8 c 4 2 6 4 7 8',
      ].map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={MID}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.9}
        />
      ))}
    </g>
  )
}

/**
 * Legendary — Leviathan Palace.
 *
 * The skull of a great sea beast crowns the keep, its ribs cage the walls, and
 * vast fins sweep out well past the castle. The palace is not decorated with a
 * leviathan; it is built inside one.
 *
 * ⚠️ THIS IS THE PATTERN FOR EVERY LEGENDARY. A legendary has to be the same
 * castle and obviously a different object at a glance — which means it is
 * ALLOWED, and expected, to break the sprite's bounds. Previews are framed to
 * `CASTLE_VIEWBOX`, which is sized for exactly this. Uncommon and rare stay
 * inside the walls; the legendary is where the money went.
 *
 * ⚠️ AND IT MOVES. Motion is what the tier is for. Still slow — long periods,
 * small amplitudes — because seven of these can share a battlefield for fifteen
 * minutes. Everything stops under `prefers-reduced-motion` and when the castle
 * dies (skins.css).
 */
function Leviathan({ eliminated }: DecorProps) {
  const DEEP = '#0d3b66'
  const BONE = '#cfe8f7'
  const BONE_DARK = '#7fa8c4'
  const THROAT = '#05182c'

  return (
    <g className="skin skin--leviathan" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      {/* ---- fins ---------------------------------------------------------
          Broad wings with a TALL BASE held flush against the wall, because a
          fin that only touches at a point floats free of the castle and reads
          as a stray feather. An earlier version also curled its trailing edge
          back on itself with a notch, which read as a shrimp.                 */}
      {[-1, 1].map((side) => (
        <g key={side} transform={`scale(${side} 1)`} className="skin__fin">
          <path
            d="M 48 -14 C 62 -28 78 -34 87 -28 C 80 -8 66 10 48 18 z"
            fill={DEEP}
            stroke={BRIGHT}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
          {/* Rays fanning from the base to the tip: what makes a blade a fin. */}
          {[
            'M 50 -10 C 62 -21 76 -28 84 -28',
            'M 50 -2 C 62 -13 74 -21 81 -23',
            'M 50 6 C 61 -3 71 -11 77 -17',
            'M 50 13 C 59 6 68 -2 73 -10',
          ].map((d, i) => (
            <path key={i} d={d} fill="none" stroke={BRIGHT} strokeWidth={1.1} opacity={0.45} />
          ))}
          <path
            d="M 48 -14 C 62 -28 78 -34 87 -28"
            fill="none"
            stroke={FOAM}
            strokeWidth={1.6}
            strokeLinecap="round"
            className="skin__fin-edge"
          />
        </g>
      ))}

      {/* ---- ribs: two per side, on the flanks only ----------------------
          An earlier version ran four of these plus four falling-water sheets
          straight down the middle of the wall and the centre turned to noise. */}
      {[
        'M -47 28 C -51 8 -46 -10 -35 -21',
        'M -34 28 C -38 10 -34 -8 -25 -20',
        'M 47 28 C 51 8 46 -10 35 -21',
        'M 34 28 C 38 10 34 -8 25 -20',
      ].map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={BONE}
          strokeWidth={2.2}
          strokeLinecap="round"
          opacity={0.24}
        />
      ))}

      {/* ---- the head -----------------------------------------------------
          ⚠️ THE MAW IS THE SUBJECT, NOT THE CRANIUM. Six earlier heads failed
          and the last two name the trap precisely. One was built from eleven
          separately dark-stroked pieces and read as LEGO BRICKS SNAPPED
          TOGETHER — a seam drawn between every part of one continuous bone.
          Fixing that with a single outline then produced a big round cranium
          over a small even tooth band, which is the SKULL EMOJI: a mascot, not
          a monster. Drawn face-on at this size, a round braincase always drifts
          there.

          So the proportions are inverted. The braincase is a low angular wedge;
          the jaws are enormous, open, and biting down over the keep, with a
          near-black throat between them. Menace comes from that void and from
          irregular fangs, not from anatomy diagrams.

          Two rules hold the head together:
            · ONE stroked outline per BONE. Upper skull is one path; the lower
              jaw is a second, because it genuinely is a separate bone.
            · Everything inside an outline is an UNSTROKED fill — shadow where
              bone recedes, dark where it opens. A stroke inside the outline is
              the brick bug coming back.                                       */}
      <g className="skin__skull">
        {/* Horns: heavy backswept wedges. Thin crescents read as feathers. */}
        {[-1, 1].map((side) => (
          <g key={side}>
            <path
              d={`M ${side * 18} -101 Q ${side * 40} -118 ${side * 62} -123
                  Q ${side * 44} -108 ${side * 24} -94 z`}
              fill={BONE_DARK}
              stroke={DEEP}
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
            <path
              d={`M ${side * 28} -88 Q ${side * 44} -94 ${side * 58} -88
                  Q ${side * 43} -83 ${side * 30} -75 z`}
              fill={BONE_DARK}
              stroke={DEEP}
              strokeWidth={1.3}
              strokeLinejoin="round"
              opacity={0.85}
            />
          </g>
        ))}

        {/* The throat, behind both jaws. Near-black: this void is the whole
            reason the head reads as a threat. */}
        <path d="M -27 -74 L 27 -74 L 23 -44 L -23 -44 z" fill={THROAT} />

        {/* Lower jaw — its own bone, so its own outline is correct here. */}
        <path
          d="M -33 -52 C -31 -41 -19 -34 0 -34 C 19 -34 31 -41 33 -52
             C 22 -47 -22 -47 -33 -52 z"
          fill={BONE_DARK}
          stroke={DEEP}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
        {[
          { x: -22, y: -49, len: 11 },
          { x: -11, y: -43, len: 9 },
          { x: 0, y: -40, len: 12 },
          { x: 11, y: -43, len: 8 },
          { x: 22, y: -49, len: 10 },
        ].map((f, i) => (
          <path
            key={i}
            d={`M ${f.x - 2.8} ${f.y} L ${f.x + 2.8} ${f.y} L ${f.x} ${f.y - f.len} z`}
            fill={FOAM}
            stroke={DEEP}
            strokeWidth={0.8}
            strokeLinejoin="round"
          />
        ))}

        {/* THE upper skull: a low angular braincase flaring into a wide jaw. */}
        <path
          d="M 0 -121 C 8 -121 14 -118 18 -113 L 26 -104 C 29 -99 31 -93 31 -87
             L 34 -80 C 34 -76 32 -73 29 -72 L -29 -72 C -32 -73 -34 -76 -34 -80
             L -31 -87 C -31 -93 -29 -99 -26 -104 L -18 -113 C -14 -118 -8 -121 0 -121 z"
          fill={BONE}
          stroke={DEEP}
          strokeWidth={2.4}
          strokeLinejoin="round"
        />

        {/* --- interior: fills only, never strokes -------------------------- */}

        {/* Brow, overhanging. The shadow it throws is what sets the eyes back. */}
        <path
          d="M -31 -93 C -20 -99 -9 -100 0 -98 C 9 -100 20 -99 31 -93
             L 31 -87 L -31 -87 z"
          fill={BONE_DARK}
          opacity={0.8}
        />

        {/* Temple hollows. */}
        {[-1, 1].map((side) => (
          <path
            key={side}
            d={`M ${side * 26} -104 C ${side * 29} -99 ${side * 31} -94 ${side * 31} -89
                L ${side * 25} -92 C ${side * 24} -97 ${side * 24} -100 ${side * 24} -103 z`}
            fill={DEEP}
            opacity={0.4}
          />
        ))}

        {/* Sockets: narrow and set wide. A tall socket reads as a cartoon eye. */}
        {[-1, 1].map((side) => (
          <path
            key={side}
            d={`M ${side * 9} -95 L ${side * 26} -98 L ${side * 27} -89 L ${side * 12} -87 z`}
            fill={THROAT}
          />
        ))}
        {[-1, 1].map((side) => (
          <path
            key={side}
            d={`M ${side * 13} -93 L ${side * 23} -95 L ${side * 24} -91 L ${side * 15} -89 z`}
            fill={BRIGHT}
            className={side < 0 ? 'skin__eye' : 'skin__eye skin__eye--right'}
          />
        ))}

        {/* Nostril slits, flanking the midline of the muzzle. */}
        {[-1, 1].map((side) => (
          <path
            key={side}
            d={`M ${side * 5} -84 C ${side * 8} -83 ${side * 8} -80 ${side * 6} -78
                C ${side * 4} -79 ${side * 4} -82 ${side * 5} -84 z`}
            fill={DEEP}
            opacity={0.55}
          />
        ))}

        {/* Palate shadow along the biting edge, so the jaw has depth. */}
        <path d="M -29 -76 L 29 -76 L 29 -72 L -29 -72 z" fill={DEEP} opacity={0.45} />

        {/* Upper fangs. Irregular in length AND spacing — an even row is a
            zipper, and a zipper is not frightening. */}
        {[
          { x: -25, len: 10, w: 3.2 },
          { x: -17, len: 20, w: 3.8 },
          { x: -8, len: 12, w: 3 },
          { x: 2, len: 22, w: 4 },
          { x: 12, len: 14, w: 3.4 },
          { x: 22, len: 11, w: 3 },
        ].map((f, i) => (
          <path
            key={i}
            d={`M ${f.x - f.w} -73 L ${f.x + f.w} -73 L ${f.x} ${-73 + f.len} z`}
            fill={FOAM}
            stroke={DEEP}
            strokeWidth={0.9}
            strokeLinejoin="round"
          />
        ))}
      </g>

      {/* ---- the core, burning in the gate ------------------------------- */}
      {/* The only thing left in the middle of the wall, so it reads as a focal
          point rather than one more overlapping element. */}
      <g className="skin__core">
        <circle cx={0} cy={18} r={13} fill={BRIGHT} opacity={0.18} />
        <circle cx={0} cy={18} r={8} fill={BRIGHT} opacity={0.45} />
        <circle cx={0} cy={18} r={4.5} fill={FOAM} />
      </g>

      {/* Bubbles, kept out to the flanks so the centre stays clear. */}
      {[
        { x: -58, y: 22, r: 2.6, d: 0 },
        { x: -44, y: 4, r: 1.9, d: 1.6 },
        { x: 46, y: 16, r: 2.3, d: 0.8 },
        { x: 59, y: 0, r: 1.7, d: 2.4 },
        { x: -40, y: -34, r: 2, d: 3.2 },
        { x: 43, y: -38, r: 2.4, d: 1.9 },
      ].map((b, i) => (
        <circle
          key={i}
          cx={b.x}
          cy={b.y}
          r={b.r}
          fill={FOAM}
          opacity={0.5}
          className="skin__bubble"
          style={{ animationDelay: `${b.d}s` }}
        />
      ))}
    </g>
  )
}

export const WaterDecor = {
  'water.ripples': Ripples,
  'water.coral': Coral,
  'water.frozen': Frozen,
  'water.leviathan': Leviathan,
}
