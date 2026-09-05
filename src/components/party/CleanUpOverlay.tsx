import { useEffect, useRef, useState } from 'react'
import { partyAct, type PartySnapshot } from '../../game/party'
import './CleanUpOverlay.css'

/**
 * How much bigger each blob is on a phone.
 *
 * ⚠️ A FRACTION OF THE VIEWPORT IS NOT A FRACTION OF THE SCREEN'S USEFULNESS.
 * The server sends every splat as a share of the width, which keeps the mess
 * looking identical at every size — and that was the problem: the same
 * proportion that buries a monitor barely marks a phone, where the board is
 * already small and the blobs landed in the gaps between things. Doubled here
 * rather than in `buildMess`, because a splat's radius never leaves this side:
 * the server only records which id was wiped.
 */
const PHONE_SCALE = 2
const PHONE_MAX_PX = 820

/**
 * The mess, wiped off the screen with a finger.
 *
 * ⚠️ A FULL-SCREEN OVERLAY, NOT A PANEL, AND THAT IS THE WHOLE GAME. The spill
 * is supposed to be in the way of the match you are playing — put it in a
 * dialog and it stops being a mess and becomes a chore in a box. It sits above
 * the battlefield, obscures it, and passes every click it does not use straight
 * through, so the war carries on underneath while you scrub.
 *
 * ⚠️ AND WIPING IS DRAGGING, NOT TAPPING. A splat clears when the pointer
 * travels across it — mouse or finger, with the button down or not, because a
 * touch screen has no hover. Tapping each blob would be a different, worse
 * game: whack-a-mole rather than cleaning.
 */
export function CleanUpOverlay({
  party,
  youId,
}: {
  party: PartySnapshot | null | undefined
  youId: string | null
}) {
  const wiping = useRef(new Set<number>())

  // Watched rather than read once: a phone rotated mid-game changes which of
  // these two the screen is, and the drawn blob and the hit test have to agree
  // about that at all times.
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= PHONE_MAX_PX,
  )
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth <= PHONE_MAX_PX)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const scale = narrow ? PHONE_SCALE : 1

  if (!party || party.gameId !== 'cleanUp' || party.resolved) return null
  const mine = youId ? party.players[youId] : undefined
  if (!mine || mine.done) return null

  const splats = (mine.data.splats as
    | { id: number; x: number; y: number; r: number; shape: number; rotation: number }[]
    | undefined) ?? []
  const wiped = (mine.data.wiped as number[] | undefined) ?? []

  const rub = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - box.left) / box.width
    const y = (event.clientY - box.top) / box.height

    for (const splat of splats) {
      if (wiped.includes(splat.id) || wiping.current.has(splat.id)) continue
      // ⚠️ TESTED AGAINST THE ELLIPSE THAT IS ACTUALLY DRAWN. The blob is
      // painted in a stretched viewBox — wide as `r` of the width, tall as
      // 0.78r of the HEIGHT — so on a portrait phone it is far taller than it
      // is wide. Comparing one distance against one radius (as this did) meant
      // the top and bottom thirds of every blob were dead: you dragged over the
      // mess, saw nothing happen, and dragged again.
      const dx = (x - splat.x) * box.width
      const dy = (y - splat.y) * box.height
      const rx = splat.r * scale * box.width
      const ry = splat.r * 0.78 * scale * box.height
      if ((dx / rx) ** 2 + (dy / ry) ** 2 > 1) continue

      wiping.current.add(splat.id)
      void partyAct({ type: 'wipe', splatId: splat.id })
    }
  }

  const left = splats.filter((s) => !wiped.includes(s.id) && !wiping.current.has(s.id))

  return (
    <div
      className="clean-up"
      data-testid="clean-up"
      onPointerMove={rub}
      onPointerDown={rub}
      // The overlay itself takes pointer events (it has to feel the wiping) but
      // never blocks the game: `pointer-events` is dropped once it is empty.
      style={{ pointerEvents: left.length === 0 ? 'none' : 'auto' }}
    >
      <svg className="clean-up__glass" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <filter id="clean-up-goo">
            {/* Blurring then re-contrasting the alpha melts neighbouring blobs
                into one another, so a spill looks poured rather than stamped. */}
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
              <ellipse
                rx={splat.r * 100 * scale}
                ry={splat.r * 78 * scale}
                className={`clean-up__splat clean-up__splat--${splat.shape}`}
              />
              {/* Two satellites, so a blob has spatter rather than being an
                  oval somebody placed.

                  ⚠️ THE SAME SHAPE CLASS AS THEIR PARENT. Left on the base
                  class they took the default tint, so every splat came out
                  with green edges regardless of its own colour — the goo
                  filter then blended the two into a halo, which looked like a
                  rendering fault rather than spatter. */}
              <ellipse
                cx={splat.r * 78 * scale}
                cy={-splat.r * 46 * scale}
                rx={splat.r * 30 * scale}
                ry={splat.r * 24 * scale}
                className={`clean-up__splat clean-up__splat--${splat.shape}`}
              />
              <ellipse
                cx={-splat.r * 62 * scale}
                cy={splat.r * 52 * scale}
                rx={splat.r * 22 * scale}
                ry={splat.r * 18 * scale}
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
