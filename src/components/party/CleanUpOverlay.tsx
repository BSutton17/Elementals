import { useRef, useState } from 'react'
import { partyAct, type PartySnapshot } from '../../game/party'
import './CleanUpOverlay.css'

/**
 * The mess, wiped off the screen with a finger.
 *
 * ⚠️ IT COVERS EVERYTHING, AND CLEARS ONLY WHERE YOU WIPE. It used to be seven
 * blobs scattered over the screen, which left most of it clean and made
 * "cleaning" into tapping seven targets — whack-a-mole, over in a second. The
 * server now sends a tile per patch of screen with every tile filled, and a
 * swipe clears the tiles it passes over, so what is left is the shape of where
 * you have not been.
 *
 * ⚠️ A FULL-SCREEN OVERLAY, NOT A PANEL, AND THAT IS THE WHOLE GAME. The spill
 * is supposed to be in the way of the match you are playing — put it in a
 * dialog and it stops being a mess and becomes a chore in a box. It sits above
 * the battlefield, obscures it, and hands the board back the moment it is
 * clean.
 *
 * ⚠️ AND WIPING IS DRAGGING, NOT TAPPING. Tiles clear where the pointer travels
 * — mouse or finger, button down or not, because a touch screen has no hover.
 */

/**
 * The cloth, in pixels — a fingertip rather than a cursor.
 *
 * In pixels rather than as a fraction of the screen, because a finger is the
 * same size on a phone as on a monitor and it is the finger this has to match.
 */
const BRUSH_PX = 44

/**
 * How far apart the samples along one swipe are.
 *
 * ⚠️ A SWIPE IS A LINE, NOT A POINT, AND THIS IS WHY IT NEEDS SAMPLING. A fast
 * flick moves hundreds of pixels between two pointer events; clearing only
 * around the latest one leaves untouched islands strung along the path, which
 * looks like the wipe failing rather than like a stroke. Half a brush width
 * keeps the swept area continuous.
 */
const STEP_PX = BRUSH_PX / 2

interface Splat {
  id: number
  x: number
  y: number
  r: number
  shape: number
  rotation: number
}

export function CleanUpOverlay({
  party,
  youId,
}: {
  party: PartySnapshot | null | undefined
  youId: string | null
}) {
  // Tiles this side has already reported. Optimistic, so a tile disappears
  // under the finger rather than a round trip later.
  const [gone, setGone] = useState<ReadonlySet<number>>(new Set())
  const last = useRef<{ x: number; y: number } | null>(null)

  if (!party || party.gameId !== 'cleanUp' || party.resolved) return null
  const mine = youId ? party.players[youId] : undefined
  if (!mine || mine.done) return null

  const splats = (mine.data.splats as Splat[] | undefined) ?? []
  const wiped = (mine.data.wiped as number[] | undefined) ?? []

  const isGone = (id: number) => gone.has(id) || wiped.includes(id)

  /** Every tile whose centre the cloth covers at this point. */
  const under = (px: number, py: number, box: DOMRect) => {
    const hit: number[] = []
    for (const splat of splats) {
      if (isGone(splat.id)) continue
      const dx = splat.x * box.width - px
      const dy = splat.y * box.height - py
      if (Math.hypot(dx, dy) <= BRUSH_PX) hit.push(splat.id)
    }
    return hit
  }

  const rub = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - box.left
    const y = event.clientY - box.top

    // Sample along the stroke since the last event, not just at its end.
    const from = last.current ?? { x, y }
    const span = Math.hypot(x - from.x, y - from.y)
    const steps = Math.min(64, Math.max(1, Math.ceil(span / STEP_PX)))

    const cleared = new Set<number>()
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      for (const id of under(from.x + (x - from.x) * t, from.y + (y - from.y) * t, box)) {
        cleared.add(id)
      }
    }
    last.current = { x, y }
    if (cleared.size === 0) return

    setGone((prev) => new Set([...prev, ...cleared]))
    // One message for the whole stroke: a flick crosses a dozen tiles, and one
    // round trip each would put more wiping than game on the socket.
    void partyAct({ type: 'wipe', ids: [...cleared] })
  }

  const left = splats.filter((s) => !isGone(s.id))

  return (
    <div
      className="clean-up"
      data-testid="clean-up"
      onPointerMove={rub}
      onPointerDown={(e) => {
        // A press starts a fresh stroke, so the gap from wherever the pointer
        // last was is not swept as though the finger had dragged across it.
        last.current = null
        rub(e)
      }}
      onPointerUp={() => {
        last.current = null
      }}
      // The overlay takes pointer events — it has to feel the wiping — but
      // hands the board back the moment there is nothing left to clean.
      style={{ pointerEvents: left.length === 0 ? 'none' : 'auto' }}
    >
      <svg className="clean-up__glass" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <filter id="clean-up-goo">
            {/* Blurring then re-contrasting the alpha melts neighbouring tiles
                into one another, so a covered screen looks poured rather than
                tiled — and a cleared path has soft, ragged edges. */}
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.4" result="soft" />
            <feColorMatrix
              in="soft"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            />
          </filter>
        </defs>
        <g filter="url(#clean-up-goo)">
          {left.map((splat) => (
            <g
              key={splat.id}
              transform={`translate(${splat.x * 100} ${splat.y * 100}) rotate(${splat.rotation})`}
            >
              {/* ⚠️ ONE ELLIPSE PER TILE, AND NO SATELLITES. The blobs used to
                  carry spatter, which made sense when there were seven of them
                  on an otherwise clean screen. Sixty tiles that each throw
                  spatter is the same paint drawn three times over. */}
              <ellipse
                rx={splat.r * 100}
                ry={splat.r * 78}
                className={`clean-up__splat clean-up__splat--${splat.shape}`}
              />
            </g>
          ))}
        </g>
      </svg>

      <p className="clean-up__hint">Wipe it off</p>
    </div>
  )
}
