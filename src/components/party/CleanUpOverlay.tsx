import { useRef } from 'react'
import { partyAct, type PartySnapshot } from '../../game/party'
import './CleanUpOverlay.css'

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
      // Elliptical, because the overlay is the viewport and the viewport is not
      // square: a circular test in screen space would clear a wide blob from
      // much further away horizontally than vertically.
      const dx = (x - splat.x) * box.width
      const dy = (y - splat.y) * box.height
      const radius = splat.r * Math.min(box.width, box.height)
      if (Math.hypot(dx, dy) > radius) continue

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
                rx={splat.r * 100}
                ry={splat.r * 78}
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
                cx={splat.r * 78}
                cy={-splat.r * 46}
                rx={splat.r * 30}
                ry={splat.r * 24}
                className={`clean-up__splat clean-up__splat--${splat.shape}`}
              />
              <ellipse
                cx={-splat.r * 62}
                cy={splat.r * 52}
                rx={splat.r * 22}
                ry={splat.r * 18}
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
