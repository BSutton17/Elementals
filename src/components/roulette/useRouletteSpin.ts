import { useEffect, useRef, useState } from 'react'
import { angleOfPocket } from './wheel'

/**
 * The physical spin, shared by the victim's table and Joker's mirror so both
 * run the identical motion from the same landed pocket.
 *
 * A real wheel turns one way and the ball is thrown the other; the ball rides
 * the outer track, loses speed, then drops into the pocket ring. Here the head
 * gets a long counter-clockwise decel, the ball a longer clockwise one, and the
 * two angles are chosen so the ball's final position sits exactly over the
 * winning pocket under the fixed marker at 12 o'clock.
 */

/** How long the wheel is in motion (ms). Sits inside the server's 6s reveal. */
export const SPIN_MS = 5200
/** Ball starts dropping toward the pockets this far into the spin. */
const DROP_AT = 0.62

export interface SpinState {
  wheelAngle: number
  ballAngle: number
  ballDrop: number
  spinMs: number
  settled: boolean
}

const AT_REST: SpinState = {
  wheelAngle: 0,
  ballAngle: 0,
  ballDrop: 1,
  spinMs: 0,
  settled: true,
}

/**
 * Drives a spin toward `pocket`. Pass null while no result is known yet — the
 * wheel idles. Set `pocket` to start; the hook returns the angles to render.
 */
export function useRouletteSpin(pocket: number | null): SpinState {
  const [state, setState] = useState<SpinState>(AT_REST)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    },
    [],
  )

  useEffect(() => {
    if (pocket === null) {
      setState(AT_REST)
      return
    }
    timers.current.forEach(clearTimeout)
    timers.current = []

    // The head settles so the winning pocket is under the 12 o'clock marker;
    // the ball ends on the marker itself. Several extra turns each so the
    // motion reads as a real throw rather than a jump to the answer.
    const wheelAngle = -(360 * 4) - angleOfPocket(pocket)
    const ballAngle = 360 * 9

    // One frame at the start position, so the browser has something to
    // transition FROM — otherwise it snaps straight to the end.
    setState({ wheelAngle: 0, ballAngle: 0, ballDrop: 0, spinMs: 0, settled: false })
    timers.current.push(
      setTimeout(() => {
        setState({ wheelAngle, ballAngle, ballDrop: 0, spinMs: SPIN_MS, settled: false })
      }, 30),
    )
    // The ball loses the track and falls into the pockets late in the spin.
    timers.current.push(
      setTimeout(
        () => setState((prev) => ({ ...prev, ballDrop: 1 })),
        30 + SPIN_MS * DROP_AT,
      ),
    )
    timers.current.push(
      setTimeout(
        () => setState((prev) => ({ ...prev, settled: true })),
        30 + SPIN_MS,
      ),
    )
  }, [pocket])

  return state
}
