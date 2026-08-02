import { useEffect, useRef, useState } from 'react'
import { onGameEvents } from '../../game/gameEvents'
import type { StrikeIncomingEvent } from '../../game/events'
import './LightShowLayer.css'

// Light's Light Show, drawn INSIDE the arena SVG so it lines up exactly with
// the kingdoms it is about to hit — same 0 0 1000 1000 space, same layout.
//
// The ability's whole design is the public warning, so the cinematic is the
// warning: ONE big white disc hangs over the centre of the field, spinning
// faster and faster while a counter ticks 3 → 2 → 1. On zero the disc is gone
// and the light comes down — a laser to every kingdom except Light itself.
//
// The damage is entirely the server's (`resolvePendingStrikes`); the beams here
// fire on the same tick the strike resolves, so what you see is what happened:
// a shielded castle loses its shield, an exposed one takes the hit.

/** The arena centre, in the SVG's own coordinates. */
const CENTRE = { x: 500, y: 500 }
/** Radius of the disc that gathers overhead. */
const DISC_R = 150
/** Degrees the disc turns across the whole countdown — five full rotations. */
const TOTAL_SPIN = 1800
/** How long the lasers stay on screen after they land (ms). The whole layer
 *  unmounts on this — nothing of the Light Show is left behind. */
const BEAM_MS = 1100

interface Show {
  /** Bumped per cast so a second Light Show replays cleanly. */
  key: number
  /** Kingdoms to be struck — everyone but the caster. */
  targets: { x: number; y: number }[]
  /** Seconds on the clock when the warning went up. */
  seconds: number
  /** Milliseconds from the warning until it lands. */
  delayMs: number
}

export function LightShowLayer({
  positions,
  roster,
  tickRate,
}: {
  /** Kingdom positions in arena coordinates, index-matched to `roster`. */
  positions: { x: number; y: number }[]
  roster: { id: string }[]
  tickRate: number
}) {
  const [show, setShow] = useState<Show | null>(null)
  /** Flips on the tick the strike lands, firing the lasers. */
  const [struck, setStruck] = useState(false)

  // The layout is rebuilt every render (new arrays each time), so it is read
  // through refs rather than closed over. Putting it in the effect's deps
  // re-ran the subscription on EVERY render, and the cleanup took the pending
  // strike timer with it — the countdown played and the lasers never fired.
  const layout = useRef({ positions, roster, tickRate })
  layout.current = { positions, roster, tickRate }

  useEffect(() => {
    let toStrike: ReturnType<typeof setTimeout> | undefined
    let toEnd: ReturnType<typeof setTimeout> | undefined

    const unsubscribe = onGameEvents((events) => {
      for (const event of events) {
        if (event.type !== 'strikeIncoming') continue
        const strike = event as unknown as StrikeIncomingEvent
        if (strike.abilityId !== 'lightShow') continue

        const { positions: at, roster: seats, tickRate: rate } = layout.current
        // Everyone but the caster — Light never lights itself up.
        const targets = seats
          .map((p, i) => ({ id: p.id, at: at[i] }))
          .filter((t) => t.id !== strike.ownerId && t.at)
          .map((t) => t.at!)

        const ticks = Math.max(0, strike.resolveTick - strike.tick)
        const delayMs = (ticks / rate) * 1000

        setStruck(false)
        setShow({
          key: strike.resolveTick,
          targets,
          // The COUNTDOWN is whole seconds (3, 2, 1, 0) ticking at real time.
          // The strike itself lands a fraction later — the server holds a
          // quarter-second of grace so a shield bought on zero still counts —
          // so the counter reaches 0 and the light follows.
          seconds: Math.max(1, Math.floor(ticks / rate)),
          delayMs,
        })

        if (toStrike) clearTimeout(toStrike)
        if (toEnd) clearTimeout(toEnd)
        toStrike = setTimeout(() => setStruck(true), delayMs)
        toEnd = setTimeout(() => setShow(null), delayMs + BEAM_MS)
      }
    })

    return () => {
      unsubscribe()
      if (toStrike) clearTimeout(toStrike)
      if (toEnd) clearTimeout(toEnd)
    }
  }, [])

  if (!show) return null

  return (
    <g className="lightshow" data-testid="light-show" key={show.key} aria-hidden="true">
      <defs>
        {/* The glow every part of this is drawn through. */}
        <filter id="lightshow-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="10" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="lightshow-core">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#fff2c4" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Before zero: the disc. After zero: it is GONE and the lasers fire. */}
      {!struck ? (
        <Countdown seconds={show.seconds} delayMs={show.delayMs} />
      ) : (
        <g className="lightshow__strike" data-testid="light-show-strike">
          {/* The detonation at the centre as it lets go. */}
          <circle
            className="lightshow__flash"
            cx={CENTRE.x}
            cy={CENTRE.y}
            r={DISC_R}
            fill="url(#lightshow-core)"
          />
          {show.targets.map((to, i) => (
            <Laser key={i} to={to} index={i} />
          ))}
        </g>
      )}
    </g>
  )
}

/** The one big disc: it spins faster and faster while the clock runs down. */
function Countdown({ seconds, delayMs }: { seconds: number; delayMs: number }) {
  const [left, setLeft] = useState(seconds)
  /** The disc's live rotation, stepped every frame. */
  const [angle, setAngle] = useState(0)

  useEffect(() => {
    setLeft(seconds)
    const timers: ReturnType<typeof setTimeout>[] = []
    // A real second per number, counting all the way down to 0. It deliberately
    // does NOT stretch to fill `delayMs`: the counter hitting zero is the
    // promise the ability makes, and the strike arriving fractionally after it
    // is the grace the server grants on top.
    for (let n = 1; n <= seconds; n++) {
      timers.push(setTimeout(() => setLeft(seconds - n), 1000 * n))
    }
    return () => timers.forEach(clearTimeout)
  }, [seconds, delayMs])

  // The rotation is driven here rather than in CSS. A CSS animation on an SVG
  // <g> depends on transform-box / transform-origin resolving the way you
  // expect, and it was not spinning in practice. An SVG `transform` attribute
  // with an explicit centre — rotate(deg, cx, cy) — has no such ambiguity.
  useEffect(() => {
    let frame = 0
    const start = performance.now()
    const step = () => {
      const p = Math.min(1, (performance.now() - start) / Math.max(1, delayMs))
      // Always turning, and always turning FASTER: a linear term keeps it
      // visibly moving from the first frame, a cubic one whips it up into the
      // strike. Five full turns by the time the light comes down.
      // The disc is a fixed size throughout — only its rotation changes.
      setAngle(TOTAL_SPIN * (0.25 * p + 0.75 * p * p * p))
      if (p < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [delayMs])

  // The halo and the countdown pop still run off the wind-up in CSS.
  const style = { '--windup': `${delayMs}ms` } as React.CSSProperties
  // Rotation only — the disc holds one size for the whole countdown.
  const discTransform = `rotate(${angle.toFixed(2)} ${CENTRE.x} ${CENTRE.y})`

  return (
    <g className="lightshow__warning" style={style}>
      {/* Halo bleeding off the edge of the disc. */}
      <circle
        className="lightshow__halo"
        cx={CENTRE.x}
        cy={CENTRE.y}
        r={DISC_R * 1.6}
        fill="url(#lightshow-core)"
      />

      {/* ONE big filled white circle, spinning. A plain disc would look static
          however fast it turned, so the rotation is carried by solid blades cut
          across its face — the disc reads as one object that is clearly
          spinning up. */}
      <g className="lightshow__disc" transform={discTransform}>
        <circle
          className="lightshow__disc-body"
          cx={CENTRE.x}
          cy={CENTRE.y}
          r={DISC_R}
          filter="url(#lightshow-glow)"
        />
        {Array.from({ length: 6 }).map((_, i) => (
          <path
            key={i}
            className="lightshow__blade"
            // A wedge from the centre out to the rim, one per sixth.
            d={wedge(CENTRE, DISC_R, (i / 6) * 360, 26)}
          />
        ))}
        {/* A bright rim so the edge of the disc is unmistakable. */}
        <circle
          className="lightshow__disc-rim"
          cx={CENTRE.x}
          cy={CENTRE.y}
          r={DISC_R}
        />
      </g>

      {/* The clock, dark so it reads against the white disc under it. */}
      <text
        className="lightshow__count"
        x={CENTRE.x}
        y={CENTRE.y}
        textAnchor="middle"
        dominantBaseline="central"
        // Keyed so each number pops in fresh rather than cross-fading.
        key={left}
      >
        {left}
      </text>
    </g>
  )
}

/** A filled wedge of a circle, from `startDeg` spanning `sweepDeg`. */
function wedge(
  c: { x: number; y: number },
  r: number,
  startDeg: number,
  sweepDeg: number,
): string {
  const a0 = (startDeg * Math.PI) / 180
  const a1 = ((startDeg + sweepDeg) * Math.PI) / 180
  const x0 = c.x + r * Math.cos(a0)
  const y0 = c.y + r * Math.sin(a0)
  const x1 = c.x + r * Math.cos(a1)
  const y1 = c.y + r * Math.sin(a1)
  return `M ${c.x} ${c.y} L ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1} Z`
}

/** One laser, from the centre of the field to a kingdom. */
function Laser({ to, index }: { to: { x: number; y: number }; index: number }) {
  // Staggered by a few milliseconds so the volley reads as many beams rather
  // than one symmetrical star.
  const style = { '--delay': `${index * 55}ms` } as React.CSSProperties
  return (
    <g className="lightshow__laser" style={style}>
      {/* Outer corona, then the blinding core on top of it. */}
      <line
        className="lightshow__beam lightshow__beam--corona"
        x1={CENTRE.x}
        y1={CENTRE.y}
        x2={to.x}
        y2={to.y}
        filter="url(#lightshow-glow)"
      />
      <line
        className="lightshow__beam lightshow__beam--core"
        x1={CENTRE.x}
        y1={CENTRE.y}
        x2={to.x}
        y2={to.y}
      />
      {/* The burst where it lands. */}
      <circle
        className="lightshow__impact"
        cx={to.x}
        cy={to.y}
        r={70}
        fill="url(#lightshow-core)"
      />
    </g>
  )
}
