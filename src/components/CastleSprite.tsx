import { useId } from 'react'
import { DEFAULT_CASTLE_OUTLINE } from '../game/kingdomThemes'
import { Decor } from './skins/decor'

/**
 * Castle renderer (ticket #194): the visual representation of one kingdom's
 * castle, drawn as a parametric SVG group centered on (0, 0). Everything is
 * driven by props (color, outline, eliminated) and grouped under stable class
 * names so future tickets can layer on animations, upgrade variants, and hit
 * effects without touching callers.
 *
 * `outline` exists because the default near-black stroke vanishes on a castle
 * that is itself dark — Dark's theme flips it to white so the silhouette still
 * reads against the battlefield.
 */
/**
 * How a castle is painted. Every field is optional and falls back to the
 * kingdom's own colour, so a partial skin is a valid skin — and a client on an
 * older build that does not recognise a field still renders a castle rather
 * than crashing.
 *
 * Mirrors the server's `data/cosmetics.Paint`.
 */
export interface Paint {
  fill?: string
  outline?: string
  /** Battlements, gate arch and other detailing. Defaults to the main fill. */
  accent?: string
  /** Multiplies every stroke, for a heavier or lighter silhouette. */
  strokeScale?: number
  /** A two-stop gradient for the main fill; overrides `fill` when present. */
  gradient?: { from: string; to: string }
  /**
   * A decoration drawn over the castle, by id (see `skins/decor`). An id this
   * build does not know draws nothing, so an older client shows a plainer
   * castle rather than a broken one.
   */
  decor?: string
}

/**
 * The viewBox every castle preview should use.
 *
 * ⚠️ WIDER THAN THE CASTLE. The sprite itself spans x −52…52, y −84…30, but
 * LEGENDARY skins are allowed — expected — to break out of that: a leviathan's
 * skull crowns the keep and its fins reach past the walls. Framing previews to
 * the plain castle would guillotine exactly the part that makes a legendary
 * worth buying.
 *
 * Any decoration must stay inside this box.
 */
export const CASTLE_VIEWBOX = '-92 -128 184 172'

export function CastleSprite({
  color,
  outline = DEFAULT_CASTLE_OUTLINE,
  eliminated = false,
  paint,
}: {
  /** The kingdom's colour — the floor every skin is layered over. */
  color: string
  outline?: string
  eliminated?: boolean
  /**
   * An equipped skin, or undefined for the kingdom's standard look.
   *
   * ⚠️ COSMETIC ONLY. A skin may restyle the fill, the detailing and the
   * stroke weight, but the caller still passes the kingdom's colour and the
   * silhouette is unchanged — players identify who is attacking them by the
   * colour of a small castle on a phone, often through fog or darkness. No
   * skin may make Fire look like Water.
   */
  paint?: Paint
}) {
  // Gradients need a document-unique id; `useId` gives one per instance, so
  // seven castles on a battlefield never collide.
  const instanceId = useId().replace(/:/g, '')
  const gradientId = `castle-grad-${instanceId}`
  // Resolved once, so the JSX below reads the same as it did before skins.
  const fill = paint?.gradient ? `url(#${gradientId})` : (paint?.fill ?? color)
  const stroke = paint?.outline ?? outline
  const accent = paint?.accent ?? fill
  const w = (base: number) => base * (paint?.strokeScale ?? 1)
  return (
    <g
      className="castle"
      data-testid="castle"
      data-eliminated={eliminated || undefined}
      opacity={eliminated ? 0.35 : 1}
    >
      {paint?.gradient && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={paint.gradient.from} />
            <stop offset="100%" stopColor={paint.gradient.to} />
          </linearGradient>
        </defs>
      )}
      {/* Keep (center tower) */}
      <rect x={-20} y={-58} width={40} height={46} rx={3} fill={fill} stroke={stroke} strokeWidth={w(3)} />
      {/* Keep battlements — the detailing a skin can accent separately from
          the main body. */}
      <rect x={-20} y={-64} width={10} height={10} fill={accent} stroke={stroke} strokeWidth={w(2)} />
      <rect x={-5} y={-64} width={10} height={10} fill={accent} stroke={stroke} strokeWidth={w(2)} />
      <rect x={10} y={-64} width={10} height={10} fill={accent} stroke={stroke} strokeWidth={w(2)} />
      {/* Curtain wall */}
      <rect x={-52} y={-24} width={104} height={54} rx={4} fill={fill} stroke={stroke} strokeWidth={w(3)} />
      {/* Wall battlements */}
      <rect x={-52} y={-32} width={12} height={12} fill={accent} stroke={stroke} strokeWidth={w(2)} />
      <rect x={-30} y={-32} width={12} height={12} fill={accent} stroke={stroke} strokeWidth={w(2)} />
      <rect x={18} y={-32} width={12} height={12} fill={accent} stroke={stroke} strokeWidth={w(2)} />
      <rect x={40} y={-32} width={12} height={12} fill={accent} stroke={stroke} strokeWidth={w(2)} />
      {/* Gate — filled with the dark default so it always reads as a recess,
          but outlined like the rest so the arch stays visible on a castle whose
          own colour is dark (Dark's white outline). */}
      <path
        d="M -11 30 v -20 a 11 11 0 0 1 22 0 v 20 z"
        fill={DEFAULT_CASTLE_OUTLINE}
        stroke={stroke}
        strokeWidth={w(2)}
        opacity={0.8}
      />
      {/* Banner */}
      <line x1={0} y1={-64} x2={0} y2={-84} stroke={stroke} strokeWidth={w(3)} />
      <path d="M 0 -84 l 22 6 l -22 6 z" fill={accent} stroke={stroke} strokeWidth={w(2)} />

      {/* Decoration last, so it layers over the castle rather than under it. */}
      <Decor
        id={paint?.decor}
        color={color}
        outline={stroke}
        accent={accent}
        eliminated={eliminated}
        uid={instanceId}
      />
    </g>
  )
}
