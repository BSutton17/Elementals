import { useState } from 'react'
import { CastleSprite, CASTLE_VIEWBOX } from '../CastleSprite'
import { KINGDOM_THEMES } from '../../game/kingdomThemes'
import { partyAct, type PartySnapshot, type SpotSetup } from '../../game/party'

/**
 * Spot the difference.
 *
 * Two castles, one ornament changed. Tap the one that is different.
 *
 * ⚠️ THE ORNAMENTS ARE THE GAME, NOT DECORATION ON TOP OF IT. The server places
 * them and names which one it altered, so a tap can be scored against a point
 * it actually knows. Recolouring the skin itself would look tidier and be
 * unscoreable — this side is the only one that knows where a skin draws its own
 * detailing, and the server cannot take its word for it.
 *
 * The right-hand castle carries the change, always. Randomising which side
 * would add nothing: both are on screen at once.
 */

export function SpotTheDifferenceGame({
  party,
  youId,
}: {
  party: PartySnapshot
  youId: string | null
}) {
  const setup = party.shared.spot as unknown as SpotSetup | undefined
  const mine = youId ? party.players[youId] : undefined
  const done = mine?.done ?? false
  const [flash, setFlash] = useState<{ x: number; y: number; hit: boolean } | null>(null)

  if (!setup) return null

  const theme = KINGDOM_THEMES[setup.kingdomId as keyof typeof KINGDOM_THEMES]
  const colour = theme?.primary ?? '#7f8ea3'

  const tap = (event: React.PointerEvent<SVGSVGElement>) => {
    if (done) return
    const svg = event.currentTarget
    const box = svg.getBoundingClientRect()
    // The viewBox is '-92 -128 184 172'; a tap in screen pixels has to come back
    // to that space or the server scores it against the wrong point entirely.
    const [minX, minY, width, height] = CASTLE_VIEWBOX.split(' ').map(Number) as [
      number,
      number,
      number,
      number,
    ]
    const x = minX + ((event.clientX - box.left) / box.width) * width
    const y = minY + ((event.clientY - box.top) / box.height) * height

    const target = setup.ornaments[setup.changedIndex]!
    const hit = Math.hypot(x - target.x, y - target.y) <= 16
    setFlash({ x, y, hit })
    window.setTimeout(() => setFlash(null), 500)
    void partyAct({ type: 'tap', x, y })
  }

  const ornaments = (altered: boolean) =>
    setup.ornaments.map((o, i) => {
      const changed = altered && i === setup.changedIndex
      if (changed && setup.kind === 'removed') return null
      return (
        <circle
          key={i}
          cx={o.x}
          cy={o.y}
          r={o.r}
          fill={changed && setup.newColour ? setup.newColour : o.colour}
          stroke="rgba(0,0,0,0.55)"
          strokeWidth={1.6}
          className="party-spot__ornament"
        />
      )
    })

  return (
    <div className="party-spot">
      <div className="party-spot__pair">
        <figure className="party-spot__side">
          <svg viewBox={CASTLE_VIEWBOX} className="party-spot__castle" aria-label="Original castle">
            <CastleSprite color={colour} paint={paintFor(setup)} />
            {ornaments(false)}
          </svg>
          <figcaption className="party-spot__caption">Before</figcaption>
        </figure>

        <figure className="party-spot__side">
          <svg
            viewBox={CASTLE_VIEWBOX}
            className={`party-spot__castle party-spot__castle--live${done ? ' party-spot__castle--found' : ''}`}
            style={{ touchAction: 'manipulation' }}
            onPointerDown={tap}
            data-testid="spot-target"
            aria-label="Altered castle — tap the difference"
          >
            <CastleSprite color={colour} paint={paintFor(setup)} />
            {ornaments(true)}
            {flash && (
              <circle
                cx={flash.x}
                cy={flash.y}
                r={14}
                className={`party-spot__flash party-spot__flash--${flash.hit ? 'hit' : 'miss'}`}
              />
            )}
            {done && (
              <circle
                cx={setup.ornaments[setup.changedIndex]!.x}
                cy={setup.ornaments[setup.changedIndex]!.y}
                r={16}
                className="party-spot__found"
                data-testid="spot-found"
              />
            )}
          </svg>
          <figcaption className="party-spot__caption">
            {done ? 'Found it' : 'Tap the difference'}
          </figcaption>
        </figure>
      </div>

      {!done && (mine?.data.misses as number | undefined) ? (
        <p className="party-spot__misses" data-testid="spot-misses">
          {mine!.data.misses as number} {(mine!.data.misses as number) === 1 ? 'miss' : 'misses'}
        </p>
      ) : null}
    </div>
  )
}

/**
 * The skin's paint, by cosmetic id.
 *
 * The server names the cosmetic and this side owns the geometry — the same
 * split every skin in the game uses. An id this build has never heard of falls
 * back to the kingdom's standard castle rather than rendering nothing.
 */
function paintFor(setup: SpotSetup) {
  // The decor id is the last two segments of the cosmetic id ('castle.water.coral'
  // → 'water.coral'), which is exactly what `Paint.decor` holds.
  const parts = setup.cosmeticId.split('.')
  if (parts.length < 3) return undefined
  return { decor: `${parts[1]}.${parts[2]}` }
}
