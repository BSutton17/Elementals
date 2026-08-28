import type { ReactNode } from 'react'
import { AirDecor } from './airDecor'
import { DarkDecor } from './darkDecor'
import { EarthDecor } from './earthDecor'
import { ElectricityDecor } from './electricityDecor'
import { FireDecor } from './fireDecor'
import { IceDecor } from './iceDecor'
import { InsectsDecor } from './insectsDecor'
import { JokerDecor } from './jokerDecor'
import { KitsuneDecor } from './kitsuneDecor'
import { LightDecor } from './lightDecor'
import { LoveDecor } from './loveDecor'
import { MagmaDecor } from './magmaDecor'
import { NatureDecor } from './natureDecor'
import { SpaceDecor } from './spaceDecor'
import { TimeDecor } from './timeDecor'
import { WaterDecor } from './waterDecor'

/**
 * The decoration registry.
 *
 * A skin's `paint.decor` is an ID, and this maps it to the geometry that draws
 * it — the same split the game already uses for abilities, where the server
 * emits an event id and the client decides what it looks like.
 *
 * ⚠️ AN UNKNOWN ID DRAWS NOTHING. A client one release behind a new skin shows
 * a plainer castle in the right colours rather than a broken one, and a retired
 * decoration never leaves a hole.
 */

export interface DecorProps {
  /** The kingdom's own colour, so a decoration can stay in its family. */
  color: string
  /** The skin's outline, for detailing that should match the silhouette. */
  outline: string
  /** The skin's accent, for detailing that should match the battlements. */
  accent: string
  /** True while the castle is dead — decorations should go quiet, not vanish. */
  eliminated: boolean
  /**
   * For skins that look different from match to match: a stable number chosen
   * by the SERVER, so every client draws the same castle. Undefined for the
   * shop and for skins that do not vary.
   */
  variantSeed?: number
  /**
   * Document-unique suffix for any id this decoration defines.
   *
   * ⚠️ CLIP PATHS AND GRADIENTS MUST USE THIS. Seven castles share one screen
   * and several of them can be wearing the same skin, so a hardcoded id is
   * emitted seven times over. `url(#id)` then resolves to whichever copy the
   * document happens to hold, and unmounting that castle can strip the
   * definition out from under the others.
   */
  uid: string
}

export const DECOR: Record<string, (props: DecorProps) => ReactNode> = {
  ...WaterDecor,
  ...FireDecor,
  ...AirDecor,
  ...IceDecor,
  ...ElectricityDecor,
  ...NatureDecor,
  ...TimeDecor,
  ...SpaceDecor,
  ...LightDecor,
  ...EarthDecor,
  ...DarkDecor,
  ...LoveDecor,
  ...JokerDecor,
  ...KitsuneDecor,
  ...MagmaDecor,
  ...InsectsDecor,
}

/** Draws a decoration by id, or nothing if it is unknown. */
export function Decor({ id, ...props }: DecorProps & { id?: string }): ReactNode {
  if (!id) return null
  const render = DECOR[id]
  return render ? render(props) : null
}
