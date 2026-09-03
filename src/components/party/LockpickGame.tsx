import { useEffect, useRef, useState } from 'react'
import { partyAct, type LockState, type PartySnapshot } from '../../game/party'

/**
 * Pick the lock.
 *
 * A needle sweeps the dial; press while it is in the green. Five locks.
 *
 * ⚠️ THE NEEDLE'S POSITION IS COMPUTED FROM THE CLOCK, NOT ACCUMULATED. Adding
 * a step per frame drifts — a phone that drops frames ends up with a needle in
 * a different place from the one the server is about to score against. The
 * angle is derived from elapsed time and the lock's speed, so the drawing and
 * the number sent are the same value by construction.
 */

const RADIUS = 42
const CENTRE = 50

export function LockpickGame({
  party,
  youId,
}: {
  party: PartySnapshot
  youId: string | null
}) {
  const mine = youId ? party.players[youId] : undefined
  const lock = mine?.data.lock as unknown as LockState | undefined
  const target = (party.shared.target as number | undefined) ?? 5
  const done = mine?.done ?? false

  const [angle, setAngle] = useState(0)
  const frame = useRef<number | null>(null)
  const startedAt = useRef(performance.now())
  const armed = useRef(true)
  /**
   * Where the needle was when this lock started, and which way it is going.
   *
   * ⚠️ IT REVERSES, IT DOES NOT RESET. Snapping back to twelve o'clock after
   * every pick makes each lock the same lock: the needle always starts in the
   * same place, so the only thing that changes is where the zone landed. Coming
   * back the way it came means the next approach is read off the last one, and
   * a run of five feels like one continuous mechanism rather than five reloads.
   */
  const base = useRef(0)
  const direction = useRef(1)
  const live = useRef(0)

  // A new lock — picked or fumbled — turns the needle around from where it is.
  useEffect(() => {
    base.current = live.current
    direction.current = -direction.current
    startedAt.current = performance.now()
    armed.current = true
  }, [lock?.zoneStart, lock?.picked, lock?.misses])

  useEffect(() => {
    if (done || !lock) return
    const speed = lock.speed
    const step = () => {
      const elapsed = (performance.now() - startedAt.current) / 1000
      const swept = base.current + direction.current * elapsed * speed
      const normalized = ((swept % 360) + 360) % 360
      live.current = normalized
      setAngle(normalized)
      frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    }
  }, [done, lock?.speed, lock?.zoneStart, lock?.picked, lock?.misses])

  if (!lock) return null

  const strike = () => {
    if (done || !armed.current) return
    // One strike per sweep-start, so a mashed button cannot fire ten times in a
    // frame and brute-force the window.
    armed.current = false
    void partyAct({ type: 'strike', angle }).then(() => {
      armed.current = true
    })
  }

  const polar = (degrees: number, radius: number) => {
    // 0° is twelve o'clock and it turns clockwise, which is what the server's
    // zone maths assumes.
    const radians = ((degrees - 90) * Math.PI) / 180
    return { x: CENTRE + radius * Math.cos(radians), y: CENTRE + radius * Math.sin(radians) }
  }

  const arcPath = (from: number, width: number, radius: number) => {
    const start = polar(from, radius)
    const end = polar(from + width, radius)
    const large = width > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`
  }

  const needle = polar(angle, RADIUS)
  const picked = lock.picked;

  return (
    <div className="party-lock">
      <div className="party-lock__pips" data-testid="lock-pips">
        {Array.from({ length: target }, (_, i) => (
          <span
            key={i}
            className={`party-lock__pip${i < picked ? ' party-lock__pip--set' : ''}`}
          />
        ))}
      </div>

      <svg className="party-lock__dial" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx={CENTRE} cy={CENTRE} r={RADIUS} className="party-lock__ring" />
        <path d={arcPath(lock.zoneStart, lock.zoneWidth, RADIUS)} className="party-lock__zone" />
        <line
          x1={CENTRE}
          y1={CENTRE}
          x2={needle.x}
          y2={needle.y}
          className="party-lock__needle"
        />
        <circle cx={CENTRE} cy={CENTRE} r={4} className="party-lock__hub" />
      </svg>

      <button
        type="button"
        className="party-lock__strike"
        onPointerDown={strike}
        disabled={done}
        data-testid="lock-strike"
      >
        {done ? 'Picked' : 'Pick'}
      </button>

      {lock.misses > 0 && !done && (
        <p className="party-lock__miss" data-testid="lock-misses">
          {lock.misses === 1 ? 'It slipped — go again' : `${lock.misses} slips`}
        </p>
      )}
    </div>
  )
}
