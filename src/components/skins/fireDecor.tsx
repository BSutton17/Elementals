import type { DecorProps } from './decor'
import './skins.css'

/**
 * Fire's skin decorations.
 *
 * Drawn INSIDE the castle's local space, over the sprite — the keep occupies
 * roughly x −20…20, y −58…−12, the curtain wall x −52…52, y −24…30, and the
 * gate x −11…11, y 10…30. Anything here is layered on top of that.
 *
 * ⚠️ THE SILHOUETTE AND THE HUE ARE NOT NEGOTIABLE. Players pick out who is
 * attacking them from a small castle on a phone, often through fog. A skin may
 * add detail and texture; it may not obscure the shape, and it stays in Fire's
 * reds and golds.
 *
 * ⚠️ AND IT MUST READ AT 60% SCALE. Everything here is judged at battlefield
 * size, not at the size it is drawn. Detail that only resolves when zoomed in
 * is detail nobody will ever see.
 *
 * ⚠️ ONE STROKED OUTLINE PER OBJECT. Everything inside that outline is an
 * UNSTROKED fill. This is the single most expensive lesson from Water: a shape
 * assembled from many separately stroked pieces draws a seam between every part
 * of what should be one continuous thing, and reads as bricks snapped together.
 */

const EMBER = '#ff6b1a'
const GOLD = '#ffc63d'
const WHITE_HOT = '#fff3d0'
const CHAR = '#3a0f06'
const DEEP_EMBER = '#a52b06'

/**
 * Uncommon — Ember Stripes.
 *
 * Diagonal heat running across the stone with embers caught between the bands.
 * The lightest possible touch, exactly like Water's Rippled Castle: everything
 * is clipped to the walls, so nothing is added outside the outline and the
 * shape is exactly the default shape.
 */
function Embers({ eliminated, uid }: DecorProps) {
  return (
    <g className="skin skin--embers" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      <clipPath id={`skin-ember-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <clipPath id={`skin-ember-keep-${uid}`}>
        <rect x={-20} y={-58} width={40} height={46} rx={3} />
      </clipPath>

      {/* Bands on the wall. Rotated as a group so they stay parallel, and
          unevenly spaced — an even ladder reads as masonry, not as heat. */}
      <g clipPath={`url(#skin-ember-wall-${uid})`}>
        <g transform="rotate(-16)">
          {[
            { y: -30, h: 5 },
            { y: -14, h: 3 },
            { y: 2, h: 6 },
            { y: 20, h: 4 },
          ].map((b, i) => (
            <rect key={i} x={-95} y={b.y} width={190} height={b.h} fill={EMBER} opacity={0.55} />
          ))}
          {[
            { y: -27, h: 1.6 },
            { y: 5, h: 2 },
          ].map((b, i) => (
            <rect key={i} x={-95} y={b.y} width={190} height={b.h} fill={GOLD} opacity={0.7} />
          ))}
        </g>
      </g>

      {/* The keep carries the same bands, so the tower belongs to the castle
          rather than sitting on top of a different one. */}
      <g clipPath={`url(#skin-ember-keep-${uid})`}>
        <g transform="rotate(-16)">
          {[-46, -30].map((y, i) => (
            <rect key={i} x={-40} y={y} width={80} height={4} fill={EMBER} opacity={0.5} />
          ))}
        </g>
      </g>

      {/* Embers caught between the bands. Scattered, never on a grid. */}
      {[
        { x: -38, y: -6, r: 1.9 },
        { x: -22, y: 14, r: 1.3 },
        { x: -8, y: -18, r: 1.6 },
        { x: 17, y: 6, r: 2.1 },
        { x: 31, y: -14, r: 1.4 },
        { x: 43, y: 18, r: 1.7 },
        { x: -4, y: -44, r: 1.5 },
        { x: 11, y: -34, r: 1.2 },
      ].map((e, i) => (
        <g key={i}>
          <circle cx={e.x} cy={e.y} r={e.r * 2.4} fill={EMBER} opacity={0.22} />
          <circle cx={e.x} cy={e.y} r={e.r} fill={WHITE_HOT} opacity={0.95} />
        </g>
      ))}
    </g>
  )
}

/**
 * Rare — Inferno Foundry.
 *
 * A working forge: riveted iron plate over the stone, tall stacks venting heat,
 * and molten metal glowing through cracks in the plating.
 *
 * ⚠️ THE MOLTEN METAL IS CRACKS, NOT BARS. A first version ran straight
 * full-height channels of even width down the wall and they read as FLUORESCENT
 * STRIP LIGHTS bolted to a brown building. Heat escaping through a broken
 * surface has to be jagged and uneven or it looks manufactured — which is the
 * exact opposite of the thing being depicted.
 *
 * ⚠️ THE GATE IS THE FOCAL POINT and everything else is arranged in bands
 * around it. Water's legendary had to be rebuilt because ribs, falling water and
 * bubbles all overlapped down the middle until the centre was noise.
 */
function Foundry({ eliminated, uid }: DecorProps) {
  const IRON = '#241a16'
  const IRON_LIGHT = '#4a3630'

  /**
   * A stack: one tapered outline, glowing mouth, nothing stroked inside.
   * Tall and narrow — an earlier set was squat enough to read as jars with lids.
   */
  const stack = (x: number, h: number, w: number, key: number) => (
    <g key={key} transform={`translate(${x} -24)`}>
      <path
        d={`M ${-w} 0 L ${-w * 0.66} ${-h} L ${w * 0.66} ${-h} L ${w} 0 z`}
        fill={IRON}
        stroke={CHAR}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Reinforcing bands and the hot mouth, both as fills. */}
      <rect x={-w * 0.9} y={-h * 0.5} width={w * 1.8} height={2} fill={IRON_LIGHT} />
      <rect x={-w * 0.96} y={-h * 0.78} width={w * 1.92} height={2.4} fill={IRON_LIGHT} />
      <path
        d={`M ${-w * 0.66} ${-h} L ${w * 0.66} ${-h} L ${w * 0.5} ${-h + 4} L ${-w * 0.5} ${-h + 4} z`}
        fill={EMBER}
      />
      <rect x={-w * 0.66} y={-h - 1.4} width={w * 1.32} height={1.8} fill={GOLD} />
    </g>
  )

  return (
    <g className="skin skin--foundry" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      {/* Stacks on the flanks only — never over the keep, which has to stay the
          tallest thing on the castle. */}
      {[
        { x: -43, h: 30, w: 5 },
        { x: -31, h: 21, w: 4.2 },
        { x: 41, h: 27, w: 5.4 },
      ].map((s, i) => stack(s.x, s.h, s.w, i))}

      <clipPath id={`skin-foundry-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <g clipPath={`url(#skin-foundry-wall-${uid})`}>
        {/* Iron plate: two courses with rivets. Fills only. */}
        {[
          { y: -24, h: 14 },
          { y: 3, h: 12 },
        ].map((p, i) => (
          <g key={i}>
            <rect x={-52} y={p.y} width={104} height={p.h} fill={IRON} opacity={0.92} />
            <rect
              x={-52}
              y={p.y + p.h - 1.8}
              width={104}
              height={1.8}
              fill={IRON_LIGHT}
              opacity={0.85}
            />
            {[-46, -33, -20, -7, 6, 19, 32, 45].map((x, j) => (
              <circle key={j} cx={x} cy={p.y + 3.4} r={1.1} fill={IRON_LIGHT} />
            ))}
          </g>
        ))}

        {/* Molten metal glowing through cracks. Jagged, wandering, and of
            uneven length — the point is that the surface FAILED here. */}
        {[
          'M -47 30 L -45 23 L -49 16 L -46 3 L -48 -5 L -43 -12 L -46 -24',
          'M -46 3 L -40 -2 L -37 -9',
          'M -24 30 L -22 24 L -26 14 L -23 9 L -25 1',
          'M 9 -24 L 12 -17 L 8 -9 L 11 -1 L 7 9 L 10 15',
          'M 8 -9 L 2 -5 L -1 1',
          'M 30 30 L 28 23 L 32 15 L 27 4 L 31 -4 L 28 -11 L 30 -24',
          'M 44 13 L 47 6 L 43 -2 L 46 -9 L 44 -17',
        ].map((d, i) => (
          <g key={i}>
            <path d={d} fill="none" stroke={EMBER} strokeWidth={5} opacity={0.3} strokeLinecap="round" />
            <path d={d} fill="none" stroke={GOLD} strokeWidth={1.9} opacity={0.95} strokeLinecap="round" />
          </g>
        ))}

        {/* A pipe run with elbows. One horizontal line of industry across the
            plate, which also breaks up the two flat courses. */}
        <path
          d="M -52 -6 L -36 -6 L -30 -12 L -14 -12 L -8 -6 L 8 -6 L 14 -12 L 34 -12 L 40 -6 L 52 -6"
          fill="none"
          stroke={IRON}
          strokeWidth={4.4}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M -52 -6 L -36 -6 L -30 -12 L -14 -12 L -8 -6 L 8 -6 L 14 -12 L 34 -12 L 40 -6 L 52 -6"
          fill="none"
          stroke={IRON_LIGHT}
          strokeWidth={1.4}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.7}
        />
        {[-30, -14, 14, 34].map((x, i) => (
          <circle key={i} cx={x} cy={-12} r={2.2} fill={IRON_LIGHT} />
        ))}
      </g>

      {/* The furnace mouth over the gate. Heavy straps only — an earlier
          version crossed bars both ways and read as a window with panes. */}
      <path d="M -15 30 L -15 8 C -15 -1 15 -1 15 8 L 15 30 z" fill={EMBER} opacity={0.4} />
      <path d="M -11 30 L -11 9 C -11 2 11 2 11 9 L 11 30 z" fill={GOLD} opacity={0.62} />
      <path d="M -7 30 L -7 11 C -7 6 7 6 7 11 L 7 30 z" fill={WHITE_HOT} opacity={0.45} />
      {[14, 22].map((y, i) => (
        <rect key={i} x={-16} y={y} width={32} height={3} rx={1.5} fill={IRON} />
      ))}

      {/* Slag pooling along the footing, with the hot core showing through. */}
      <path
        d="M -52 30 q 9 -6 17 -1 q 10 -7 19 -1 q 11 -6 21 -1 q 10 -5 19 0 q 8 -3 14 1 l 0 4 l -90 0 z"
        fill={EMBER}
        opacity={0.85}
      />
      <path
        d="M -46 32 q 11 -4 21 0 q 12 -4 23 0 q 11 -3 20 1 l 0 3 l -64 0 z"
        fill={GOLD}
        opacity={0.9}
      />
    </g>
  )
}

/**
 * Rare — Phoenix Fortress.
 *
 * Two burning wings spread from behind the walls and a crest of plumage crowns
 * the keep. The castle is on fire and entirely unbothered by it.
 *
 * ⚠️ FEATHERS OVERLAP AND FAN. THEY DO NOT TILE. Three earlier wings failed in
 * three different ways and the pair of failures worth remembering are opposites.
 * Separate, evenly-sized, evenly-spaced lozenges with gaps between them read as
 * a rack of CANDLES. Fusing them into one mass with a toothed trailing edge then
 * read as BLOCKY — straight-line teeth are a saw blade, and no amount of
 * tapering the mass fixed it, because the problem was that the edge was made of
 * straight lines at all.
 *
 * What a wing actually is: long curved feathers radiating from one shoulder,
 * heavily overlapping, each a different length. The rounded tips ARE the
 * trailing edge, so it comes out curved for free. Individual outlines are
 * correct here — unlike the leviathan's skull, these genuinely are separate
 * objects rather than parts of one continuous surface.
 *
 * ⚠️ RARE STAYS INSIDE THE WALLS. The wings sweep up and out but stop well short
 * of the frame, because breaking the sprite's bounds is what marks a legendary
 * and it is the only thing that does.
 */
function Phoenix({ eliminated, uid }: DecorProps) {
  const DEEP_RED = '#a51e0c'

  /**
   * ⚠️ FEATHERS ROOT ALONG AN ARM, NOT AT ONE POINT. Fanning them all from a
   * single shoulder produced a hand fan - a spray of palm fronds. A real wing
   * has a leading arm out to the wrist, with long primaries fanning off the end
   * and shorter secondaries trailing back along its length.
   */

  /**
   * One feather: a curved lens from the shoulder out to a tip.
   *
   * `bow` bends it away from the straight line so the feather curves like a
   * real one; `w` is its half-width at the widest point.
   */
  const feather = (
    sx: number,
    sy: number,
    tx: number,
    ty: number,
    w: number,
    bow: number,
    colour: string,
    key: number,
  ) => {
    const dx = tx - sx
    const dy = ty - sy
    const len = Math.hypot(dx, dy) || 1
    const px = -dy / len
    const py = dx / len
    const mx = sx + dx * 0.55 + px * bow
    const my = sy + dy * 0.55 + py * bow
    const a = `${(mx + px * w).toFixed(1)} ${(my + py * w).toFixed(1)}`
    const b = `${(mx - px * w).toFixed(1)} ${(my - py * w).toFixed(1)}`
    return (
      <g key={key}>
        <path
          d={`M ${sx} ${sy} C ${a} ${a} ${tx} ${ty} C ${b} ${b} ${sx} ${sy} z`}
          fill={colour}
          stroke={CHAR}
          strokeWidth={1.1}
          strokeLinejoin="round"
        />
        {/* Shaft, unstroked, so each feather still reads as one object. */}
        <path
          d={`M ${sx} ${sy} Q ${mx} ${my} ${tx} ${ty}`}
          fill="none"
          stroke={WHITE_HOT}
          strokeWidth={0.8}
          opacity={0.35}
        />
      </g>
    )
  }

  /* Longest and darkest first, so shorter brighter feathers layer over them and
     the wing reads as having depth rather than as a flat fan. */
  const FEATHERS = [
    // Primaries, fanning off the wrist. Broad - a slender lens is a blade.
    { sx: 42, sy: -56, tx: 44, ty: -102, w: 9, bow: -4, c: DEEP_RED },
    { sx: 42, sy: -56, tx: 62, ty: -94, w: 9.5, bow: -5, c: DEEP_RED },
    { sx: 42, sy: -56, tx: 74, ty: -78, w: 10, bow: -5, c: EMBER },
    { sx: 42, sy: -56, tx: 78, ty: -60, w: 9.5, bow: -4, c: EMBER },
    // Secondaries, trailing back along the arm.
    { sx: 34, sy: -47, tx: 74, ty: -42, w: 9, bow: -4, c: GOLD },
    { sx: 26, sy: -38, tx: 68, ty: -27, w: 8.5, bow: -3, c: EMBER },
    { sx: 18, sy: -28, tx: 58, ty: -16, w: 8, bow: -3, c: GOLD },
  ]

  return (
    <g className="skin skin--phoenix" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      {[-1, 1].map((side) => (
        <g key={side} transform={`scale(${side} 1)`}>
          {/* The arm itself, so the feathers hang off a body rather than
              floating in formation. */}
          <path
            d="M 14 -22 C 24 -34 34 -46 46 -58 C 48 -52 44 -46 38 -40 C 30 -32 22 -24 18 -18 z"
            fill={DEEP_RED}
            stroke={CHAR}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
          {FEATHERS.map((f, i) => feather(f.sx, f.sy, f.tx, f.ty, f.w, f.bow, f.c, i))}
        </g>
      ))}

      {/* Crest over the keep: the same fan, small, and shorter than the wings so
          the keep still reads as the tallest part of the castle. */}
      {[
        // Broad, like the wing feathers. Thin ones read as candles - which is
        // exactly what the first crest looked like.
        { tx: -17, ty: -80, w: 5.5, bow: 3 },
        { tx: -8, ty: -90, w: 6.5, bow: 1.5 },
        { tx: 1, ty: -94, w: 7, bow: 0 },
        { tx: 10, ty: -88, w: 6.5, bow: -1.5 },
        { tx: 18, ty: -78, w: 5.5, bow: -3 },
      ].map((f, i) => {
        const sx = 0
        const sy = -56
        const dx = f.tx - sx
        const dy = f.ty - sy
        const len = Math.hypot(dx, dy) || 1
        const px = -dy / len
        const py = dx / len
        const mx = sx + dx * 0.55 + px * f.bow
        const my = sy + dy * 0.55 + py * f.bow
        const a = `${(mx + px * f.w).toFixed(1)} ${(my + py * f.w).toFixed(1)}`
        const b = `${(mx - px * f.w).toFixed(1)} ${(my - py * f.w).toFixed(1)}`
        return (
          <path
            key={i}
            d={`M ${sx} ${sy} C ${a} ${a} ${f.tx} ${f.ty} C ${b} ${b} ${sx} ${sy} z`}
            fill={i === 2 ? WHITE_HOT : i % 2 ? EMBER : GOLD}
            stroke={CHAR}
            strokeWidth={1.1}
            strokeLinejoin="round"
          />
        )
      })}

      {/* Flame licking up the wall face, clipped so it never leaves the stone. */}
      <clipPath id={`skin-phoenix-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <g clipPath={`url(#skin-phoenix-wall-${uid})`}>
        {/* A sheet of fire along the footing, so the wall is standing IN it
            rather than having flames dotted along it. */}
        <path
          d="M -52 30 q 9 -7 18 -2 q 10 -8 20 -2 q 11 -7 21 -2 q 10 -6 19 -1 q 8 -4 14 1 l 0 8 l -92 0 z"
          fill={EMBER}
          opacity={0.5}
        />
        {[
          { x: -49, h: 20, lean: 4, w: 3 },
          { x: -42, h: 32, lean: -5, w: 3.6 },
          { x: -34, h: 44, lean: 6, w: 4.2 },
          { x: -26, h: 25, lean: -4, w: 3.2 },
          { x: -18, h: 36, lean: 5, w: 3.8 },
          { x: 17, h: 30, lean: -5, w: 3.5 },
          { x: 25, h: 41, lean: 4, w: 4 },
          { x: 33, h: 23, lean: -6, w: 3 },
          { x: 41, h: 35, lean: 5, w: 3.7 },
          { x: 48, h: 21, lean: -4, w: 3.1 },
        ].map((f, i) => (
          <path
            key={i}
            d={`M ${f.x - f.w} 30
                C ${f.x - f.w - 1} ${30 - f.h * 0.4} ${f.x + f.lean - 3} ${30 - f.h * 0.62} ${f.x + f.lean} ${30 - f.h}
                C ${f.x + f.lean + 2} ${30 - f.h * 0.6} ${f.x + f.w + 1} ${30 - f.h * 0.32} ${f.x + f.w} 30 z`}
            fill={i % 2 ? EMBER : GOLD}
            opacity={0.62}
          />
        ))}
      </g>

      {/* The keep burns as well - an earlier version left it as the one cold
          surface on a castle that is supposed to be entirely alight. */}
      <clipPath id={`skin-phoenix-keep-${uid}`}>
        <rect x={-20} y={-58} width={40} height={46} rx={3} />
      </clipPath>
      <g clipPath={`url(#skin-phoenix-keep-${uid})`}>
        {[
          { x: -15, h: 22, lean: 3 },
          { x: -7, h: 30, lean: -3 },
          { x: 2, h: 25, lean: 4 },
          { x: 11, h: 33, lean: -2 },
          { x: 17, h: 19, lean: 3 },
        ].map((f, i) => (
          <path
            key={i}
            d={`M ${f.x - 3.2} -12
                C ${f.x - 4} ${-12 - f.h * 0.4} ${f.x + f.lean - 2} ${-12 - f.h * 0.62} ${f.x + f.lean} ${-12 - f.h}
                C ${f.x + f.lean + 2} ${-12 - f.h * 0.6} ${f.x + 4} ${-12 - f.h * 0.3} ${f.x + 3.2} -12 z`}
            fill={i % 2 ? EMBER : GOLD}
            opacity={0.55}
          />
        ))}
      </g>

      {/* Sparks carried up off the fire. Scattered, never on a grid. */}
      {[
        { x: -58, y: 8, r: 1.8 },
        { x: -47, y: -30, r: 1.3 },
        { x: -24, y: -44, r: 1.6 },
        { x: -9, y: -66, r: 1.2 },
        { x: 14, y: -52, r: 1.7 },
        { x: 30, y: -36, r: 1.3 },
        { x: 52, y: -14, r: 1.9 },
        { x: 61, y: 12, r: 1.4 },
      ].map((s, i) => (
        <g key={i}>
          {/* ⚠️ A HALO OVER OPEN BACKGROUND IS A DISC, NOT A GLOW. At 22%% these
              were dark brown coins scattered round the castle - the embers on
              the walls get away with it because they sit on lit stone. */}
          <circle cx={s.x} cy={s.y} r={s.r * 1.7} fill={GOLD} opacity={0.16} />
          <circle cx={s.x} cy={s.y} r={s.r} fill={WHITE_HOT} opacity={0.95} />
        </g>
      ))}
    </g>
  )
}

/**
 * Legendary — Supernova Citadel.
 *
 * A miniature star burns where the keep's roof should be, two solar rings tilt
 * around it, and the fortress floats over a pool of plasma.
 *
 * ⚠️ THIS IS THE PATTERN FOR EVERY LEGENDARY, established by Water's Leviathan.
 * It is ALLOWED, and expected, to break the sprite's bounds — previews are
 * framed to `CASTLE_VIEWBOX`, which is sized for exactly this. Uncommon and rare
 * stay inside the walls; the legendary is where the money went.
 *
 * ⚠️ AND IT MOVES. Motion is what the tier is for. Still slow — long periods,
 * small amplitudes — because seven of these can share a phone screen for fifteen
 * minutes. Everything stops under `prefers-reduced-motion` and when the castle
 * dies (skins.css).
 *
 * ⚠️ THE STAR IS THE FOCAL POINT, SO THE CASTLE'S OWN DETAIL STAYS LOW-CONTRAST.
 * A first version took that too far and left the walls completely bare, which
 * read as unfinished next to the sky above them. Star-metal inlay, lit niches
 * and a radiant gate give it something to look at without competing.
 *
 * ⚠️ AND THE PLASMA IS A POOL, NOT A PILE OF WAVES. Four stacked wavy bands
 * whose crests did not line up read as sloppy — and, in an earlier pass, as sand
 * dunes. Nested ellipses have one clean silhouette and a rim that actually
 * follows the shape underneath.
 */
function Supernova({ eliminated, uid }: DecorProps) {
  const RING_OUTER = '#ff8a3d'
  const STAR_Y = -86

  return (
    <g className="skin skin--supernova" opacity={eliminated ? 0.4 : 1} aria-hidden="true">
      {/* ---- the plasma pool the fortress floats over --------------------- */}
      <g className="skin__plasma">
{/* ⚠️ THIS POOL HAS FAILED TWICE, IN OPPOSITE DIRECTIONS. Bands with
            mismatched crests looked sloppy. Nested ellipses were too clean and
            read as a rug the castle stands on. Giving every band ONE shared
            crest rhythm then lined the crests up into contour lines and it read
            as a stepped LAYER CAKE.

            So there is one pool outline, and the hotter layers are the SAME
            path scaled about the pool's centre. Nesting by scale cannot
            mismatch and cannot step, and the falloff reads as heat. */}
        {[
          { k: 1, fill: DEEP_EMBER, o: 0.4 },
          { k: 0.88, fill: DEEP_EMBER, o: 1 },
          { k: 0.68, fill: EMBER, o: 1 },
          { k: 0.44, fill: GOLD, o: 1 },
          { k: 0.2, fill: WHITE_HOT, o: 0.9 },
        ].map((layer, i) => (
          <path
            key={i}
            d="M -84 37 C -84 31 -58 28 -30 27.4 C -10 27 10 27 30 27.4
               C 58 28 84 31 84 37 C 84 42 58 44 0 44 C -58 44 -84 42 -84 37 z"
            fill={layer.fill}
            opacity={layer.o}
            transform={`translate(0 36) scale(${layer.k}) translate(0 -36)`}
          />
        ))}
        {/* Flames off the surface. ⚠️ AT PARTIAL OPACITY OVER THE DEEP RED
            POOL THESE WENT OLIVE and read as little shrubs sprouting round the
            edge - which is precisely the sloppiness they were added to fix.
            Full opacity, and an ember halo so each one reads as burning. */}
        {[
          { x: -44, h: 20 },
          { x: 42, h: 17 },
        ].map((f, i) => (
          <g key={i}>
            <path
              d={`M ${f.x - 7} 32 C ${f.x - 8} ${32 - f.h * 0.45} ${f.x - 2} ${32 - f.h * 0.6} ${f.x + (i ? 4 : -4)} ${32 - f.h - 4}
                  C ${f.x + 4} ${32 - f.h * 0.6} ${f.x + 8} ${32 - f.h * 0.3} ${f.x + 7} 32 z`}
              fill={EMBER}
              opacity={0.55}
            />
            <path
              d={`M ${f.x - 4} 32 C ${f.x - 5} ${32 - f.h * 0.42} ${f.x - 1} ${32 - f.h * 0.62} ${f.x + (i ? 3 : -3)} ${32 - f.h}
                  C ${f.x + 2} ${32 - f.h * 0.6} ${f.x + 4.5} ${32 - f.h * 0.3} ${f.x + 4} 32 z`}
              fill={GOLD}
            />
          </g>
        ))}

      </g>

      {/* ---- the citadel's own detail ------------------------------------- */}
      <clipPath id={`skin-nova-wall-${uid}`}>
        <rect x={-52} y={-24} width={104} height={54} rx={4} />
      </clipPath>
      <g clipPath={`url(#skin-nova-wall-${uid})`}>
        {/* Star-metal inlay: quiet horizontal courses. */}
        {[-13, 1, 15].map((y, i) => (
          <rect key={i} x={-52} y={y} width={104} height={1.1} fill={GOLD} opacity={0.4} />
        ))}
{/* ⚠️ LIT ARCHED NICHES READ AS WINDOWS, and four of them turned a
            cosmic fortress into a hotel. Starlight splitting the stone says the
            same thing - this place is full of the star's energy - without
            turning it into architecture. Uneven runs and jogs, because an even
            one is a lightning bolt. */}
        {[
          'M -50 30 L -47 21 L -51 13 L -48 4 L -50 -6 L -46 -14 L -48 -24',
          'M -30 -24 L -27 -16 L -31 -8 L -28 2 L -31 9',
          'M 24 30 L 27 22 L 23 13 L 26 5 L 24 -3 L 27 -12 L 25 -24',
          'M 44 -24 L 47 -15 L 43 -7 L 46 3 L 44 11 L 47 18',
        ].map((d, i) => (
          <g key={i}>
            <path d={d} fill="none" stroke={EMBER} strokeWidth={4} opacity={0.28} strokeLinecap="round" />
            <path d={d} fill="none" stroke={GOLD} strokeWidth={1.4} opacity={0.85} strokeLinecap="round" />
          </g>
        ))}
        {/* Star points caught in the metal. Scattered, never on a grid. */}
        {[
          { x: -47, y: -19, r: 1.1 },
          { x: -20, y: 8, r: 0.9 },
          { x: -8, y: -18, r: 1.2 },
          { x: 12, y: 20, r: 0.9 },
          { x: 24, y: -8, r: 1.1 },
          { x: 47, y: 22, r: 1 },
        ].map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={WHITE_HOT} opacity={0.9} />
        ))}
      </g>

      {/* The keep, carrying the same inlay so it belongs to the same building. */}
      <g>
        {[-46, -34].map((y, i) => (
          <rect key={i} x={-20} y={y} width={40} height={1.1} fill={GOLD} opacity={0.35} />
        ))}
        {[
          'M -8 -12 L -5 -22 L -9 -30 L -6 -40 L -8 -50',
          'M 7 -14 L 10 -24 L 6 -33 L 9 -43',
        ].map((d, i) => (
          <g key={i}>
            <path d={d} fill="none" stroke={EMBER} strokeWidth={3.4} opacity={0.3} strokeLinecap="round" />
            <path d={d} fill="none" stroke={GOLD} strokeWidth={1.3} opacity={0.8} strokeLinecap="round" />
          </g>
        ))}
      </g>

      {/* A radiant gate: light from the star reaching all the way down. */}
      {/* A radiant gate. The arch is TRACED rather than filled - a filled one
          is a bright vertical bar, which reads as a door with a light behind it
          rather than as a threshold full of starlight. */}
      <path d="M -15 30 L -15 8 C -15 -3 15 -3 15 8 L 15 30 z" fill={EMBER} opacity={0.28} />
      <path
        d="M -12 30 L -12 8 C -12 0 12 0 12 8 L 12 30"
        fill="none"
        stroke={GOLD}
        strokeWidth={2.2}
        opacity={0.9}
      />

      {/* Glowing tips on the battlements. */}
      {[-46, -30, 30, 46].map((x, i) => (
        <circle key={i} cx={x} cy={-25} r={1.6} fill={WHITE_HOT} opacity={0.85} />
      ))}

      {/* ---- solar rings --------------------------------------------------
          Two tilted ellipses turning at different rates and directions, each
          carrying a bright bead so the motion reads as ORBIT rather than as a
          shape wobbling in place.                                            */}
      <g className="skin__ring">
        <ellipse
          cx={0}
          cy={STAR_Y}
          rx={86}
          ry={24}
          fill="none"
          stroke={RING_OUTER}
          strokeWidth={2.4}
          opacity={0.55}
          transform={`rotate(-14 0 ${STAR_Y})`}
        />
        <circle cx={86} cy={STAR_Y} r={3.4} fill={WHITE_HOT} transform={`rotate(-14 0 ${STAR_Y})`} />
      </g>
      <g className="skin__ring skin__ring--slow">
        <ellipse
          cx={0}
          cy={STAR_Y}
          rx={62}
          ry={17}
          fill="none"
          stroke={GOLD}
          strokeWidth={2}
          opacity={0.75}
          transform={`rotate(22 0 ${STAR_Y})`}
        />
        <circle cx={-62} cy={STAR_Y} r={2.8} fill={WHITE_HOT} transform={`rotate(22 0 ${STAR_Y})`} />
      </g>

      {/* Corona rays: thin and long, so they read as LIGHT rather than as the
          folded-paper shards a wider, stubbier version produced. */}
      {[
        { a: -74, len: 46 },
        { a: -28, len: 32 },
        { a: 16, len: 40 },
        { a: 58, len: 28 },
        { a: 104, len: 43 },
        { a: 148, len: 30 },
        { a: 196, len: 38 },
        { a: 238, len: 26 },
      ].map((r, i) => (
        <path
          key={i}
          d={`M -2 ${STAR_Y} L 2 ${STAR_Y} L 0 ${STAR_Y - r.len} z`}
          fill={GOLD}
          opacity={0.62}
          className="skin__flare"
          transform={`rotate(${r.a} 0 ${STAR_Y})`}
          style={{ animationDelay: `${i * 0.45}s` }}
        />
      ))}

      {/* ---- the star -----------------------------------------------------
          Layered glow rather than a filter: a drop-shadow on seven castles is
          expensive, and stacked translucent circles read the same.           */}
      <g className="skin__star">
        <circle cx={0} cy={STAR_Y} r={34} fill={DEEP_EMBER} opacity={0.12} />
        <circle cx={0} cy={STAR_Y} r={27} fill={DEEP_EMBER} opacity={0.16} />
        <circle cx={0} cy={STAR_Y} r={21} fill={EMBER} opacity={0.28} />
        <circle cx={0} cy={STAR_Y} r={16} fill={EMBER} opacity={0.5} />
        <circle cx={0} cy={STAR_Y} r={12} fill={GOLD} opacity={0.92} />
        <circle cx={0} cy={STAR_Y} r={7.5} fill={WHITE_HOT} />
      </g>

      {/* Cinders rising past the fortress, out on the flanks so the middle of
          the wall stays clear. */}
      {[
        { x: -58, y: 24, r: 2.2, d: 0 },
        { x: -46, y: 6, r: 1.6, d: 1.7 },
        { x: 48, y: 18, r: 2, d: 0.9 },
        { x: 60, y: 2, r: 1.5, d: 2.5 },
        { x: -34, y: -34, r: 1.8, d: 3.3 },
        { x: 38, y: -40, r: 2.1, d: 2 },
      ].map((c, i) => (
        <circle
          key={i}
          cx={c.x}
          cy={c.y}
          r={c.r}
          fill={GOLD}
          opacity={0.6}
          className="skin__cinder"
          style={{ animationDelay: `${c.d}s` }}
        />
      ))}
    </g>
  )
}

export const FireDecor = {
  'fire.embers': Embers,
  'fire.foundry': Foundry,
  'fire.phoenix': Phoenix,
  'fire.supernova': Supernova,
}
