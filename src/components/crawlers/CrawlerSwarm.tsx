import { useEffect, useMemo, useRef, useState } from 'react'
import type { IconType } from 'react-icons'
import { GiLadybug, GiLongAntennaeBug, GiSpottedBug } from 'react-icons/gi'
import { AiFillBug, AiOutlineBug, AiTwotoneBug } from 'react-icons/ai'
import { BsBug, BsBugFill } from 'react-icons/bs'
import { RiBug2Fill, RiBug2Line, RiBugFill, RiBugLine } from 'react-icons/ri'
import { DiBugsense } from 'react-icons/di'
import { GrBug } from 'react-icons/gr'
import './CrawlerSwarm.css'

// Insects' "Creepy Crawlers", on the VICTIM's own screen. Bugs crawl over
// everything they own, eating gold, and each one takes two clicks to squash.
//
// The overlay sits above every other layer on purpose. What the ability really
// takes is not gold but ATTENTION: the bugs are in the way, they intercept the
// clicks meant for the buttons underneath, and dealing with them means stopping
// whatever else was being done. An overlay you could click through would be
// scenery.
//
// The MOVEMENT is driven per frame rather than by CSS keyframes. A keyframed
// path can only interpolate straight lines between fixed waypoints, and its
// rotation is whatever was written down rather than wherever the bug is
// actually going — which means it spends most of its time walking sideways.
// Steering it by hand is what makes it read as a living thing: it wanders,
// turns gradually, pauses, and always faces its own direction of travel.
//
// The swarm itself is authoritative server state — this only draws it. A click
// sends "I hit bug 2" and waits; it never decides that a bug is dead, because
// a client that could would clear the whole swarm the instant it landed.

/** Every bug we might send. Three are drawn at random per cast. */
const BUG_ICONS: IconType[] = [
  GiLadybug,
  GiLongAntennaeBug,
  GiSpottedBug,
  DiBugsense,
  AiFillBug,
  AiOutlineBug,
  AiTwotoneBug,
  BsBug,
  // `BsFillBugFill` is an ALIAS of `BsBugFill` in react-icons — the same glyph
  // under two names. Listing both put a duplicate in the pool and let a swarm
  // hand out two identical-looking bugs.
  BsBugFill,
  RiBug2Fill,
  RiBug2Line,
  RiBugFill,
  RiBugLine,
  GrBug,
]

/** Crawl speed, px/sec. Slow on purpose: they are a nuisance to be hunted
 *  down, not something that has to be chased. */
const SPEED_MIN = 26
const SPEED_MAX = 52
/**
 * Hardest turn a bug can hold, radians/sec. At crawl speed this is an arc of
 * roughly a 45px radius — a decided change of direction, not a spin on the
 * spot, which is what a tighter cap produces.
 */
const MAX_TURN = 0.9
/**
 * How quickly the turn rate itself drifts, radians/sec².
 *
 * This is the number that decides whether the path meanders or merely wobbles:
 * it has to be big enough that a bug builds a real turn rate within a second
 * or two of setting off. Too low and it walks in near-straight lines with a
 * slight lean, which is what an earlier value of 2.4 gave — about fifteen
 * degrees of total steering across six seconds.
 */
const TURN_DRIFT = 5
/** How far from an edge a bug starts steering back inward, in px. */
const EDGE_MARGIN = 90
/** Seconds between pauses, and how long one lasts. Real insects scuttle and
 *  stop; constant motion reads as a screensaver. */
const PAUSE_EVERY: [number, number] = [2.5, 7]
const PAUSE_FOR: [number, number] = [0.35, 1.3]

const between = ([lo, hi]: [number, number]) => lo + Math.random() * (hi - lo)

export interface CrawlerMotion {
  x: number
  y: number
  /** Direction of travel, radians. 0 is screen-right. */
  heading: number
  speed: number
  /** Current turn rate, radians/sec — itself drifting. */
  turn: number
  /** Seconds left of the current pause, if any. */
  pausing: number
  /** Seconds until the next pause. */
  untilPause: number
  size: number
}

interface Crawler {
  Icon: IconType
  motion: CrawlerMotion
}

function newMotion(size: number): CrawlerMotion {
  const w = typeof window === 'undefined' ? 1280 : window.innerWidth
  const h = typeof window === 'undefined' ? 720 : window.innerHeight
  return {
    x: EDGE_MARGIN + Math.random() * Math.max(1, w - EDGE_MARGIN * 2),
    y: EDGE_MARGIN + Math.random() * Math.max(1, h - EDGE_MARGIN * 2),
    heading: Math.random() * Math.PI * 2,
    speed: SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN),
    turn: (Math.random() - 0.5) * MAX_TURN,
    pausing: 0,
    untilPause: between(PAUSE_EVERY),
    size,
  }
}

/** Picks `count` distinct icons at random. */
function pickIcons(count: number): IconType[] {
  const pool = [...BUG_ICONS]
  const picked: IconType[] = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]!)
  }
  return picked
}

/**
 * Advances one bug by `dt` seconds, returning whether it actually walked.
 * Mutates in place — this runs every frame for every bug, so it allocates
 * nothing. Exported so the steering can be tested without a frame loop.
 */
export function stepMotion(m: CrawlerMotion, dt: number): boolean {
  // Pausing: it stops, has a look around, and goes on. The turn keeps drifting
  // while stopped, so it often sets off in a new direction.
  if (m.pausing > 0) {
    m.pausing -= dt
  } else {
    m.untilPause -= dt
    if (m.untilPause <= 0) {
      m.pausing = between(PAUSE_FOR)
      m.untilPause = between(PAUSE_EVERY)
    }
  }
  const moving = m.pausing <= 0

  // A random walk on the TURN RATE rather than on the heading itself: nudging
  // the heading directly would jitter, where drifting the rate produces long
  // smooth curves that occasionally tighten — which is what wandering is.
  m.turn += (Math.random() - 0.5) * TURN_DRIFT * dt
  m.turn = Math.max(-MAX_TURN, Math.min(MAX_TURN, m.turn))

  // Steer away from the edges before reaching them, harder the closer it gets,
  // so a bug curves away from the rim instead of bouncing off it.
  const w = window.innerWidth
  const h = window.innerHeight
  const pad = EDGE_MARGIN
  let avoid = 0
  if (m.x < pad) avoid += (1 - m.x / pad) * Math.sign(Math.sin(m.heading) || 1)
  if (m.x > w - pad) avoid -= (1 - (w - m.x) / pad) * Math.sign(Math.sin(m.heading) || 1)
  if (m.y < pad) avoid -= (1 - m.y / pad) * Math.sign(Math.cos(m.heading) || 1)
  if (m.y > h - pad) avoid += (1 - (h - m.y) / pad) * Math.sign(Math.cos(m.heading) || 1)
  m.heading += (m.turn + avoid * 3) * dt

  if (moving) {
    m.x += Math.cos(m.heading) * m.speed * dt
    m.y += Math.sin(m.heading) * m.speed * dt
  }

  // Backstop: never let one escape, however the steering resolved.
  m.x = Math.max(0, Math.min(w - m.size, m.x))
  m.y = Math.max(0, Math.min(h - m.size, m.y))
  return moving
}

export function CrawlerSwarm({
  bugHits,
  hitsToKill,
  onSquash,
}: {
  /** Clicks landed on each bug so far, straight from synced state. A bug is
   *  dead — and gone — once its count reaches `hitsToKill`. */
  bugHits: number[] | null
  hitsToKill: number
  /** Reports a click on bug `index` to the server. */
  onSquash: (index: number) => void
}) {
  const count = bugHits?.length ?? 0
  // Rebuilt only when a swarm arrives, so the bugs keep wandering from wherever
  // they had got to rather than teleporting on every sync.
  const crawlers = useMemo<Crawler[]>(() => {
    if (count === 0) return []
    return pickIcons(count).map((Icon) => ({
      Icon,
      motion: newMotion(44 + Math.random() * 26),
    }))
  }, [count])

  const nodes = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (crawlers.length === 0) return
    // jsdom has no real frame loop and no layout; skip rather than spin.
    if (typeof window === 'undefined' || !window.requestAnimationFrame) return

    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      // Clamped: a backgrounded tab resumes with a huge delta, which would
      // teleport every bug across the screen in one step.
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      for (let i = 0; i < crawlers.length; i++) {
        const el = nodes.current[i]
        if (!el) continue
        const m = crawlers[i]!.motion
        const moving = stepMotion(m, dt)
        // The icons are drawn head-up, so a quarter turn puts the head where
        // the bug is actually going.
        const deg = (m.heading * 180) / Math.PI + 90
        el.style.transform = `translate3d(${m.x.toFixed(1)}px, ${m.y.toFixed(1)}px, 0) rotate(${deg.toFixed(1)}deg)`
        // Legs only work while it is actually walking.
        el.dataset.moving = moving ? 'true' : 'false'
      }
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [crawlers])

  // A short flinch when a bug is hit but survives, so the first click visibly
  // registers rather than appearing to do nothing.
  const [struck, setStruck] = useState<number | null>(null)
  const previous = useRef<number[]>([])
  useEffect(() => {
    if (!bugHits) {
      previous.current = []
      return
    }
    const before = previous.current
    previous.current = [...bugHits]
    const hit = bugHits.findIndex((h, i) => h > (before[i] ?? 0) && h < hitsToKill)
    if (hit < 0) return
    setStruck(hit)
    const timer = setTimeout(() => setStruck(null), 260)
    return () => clearTimeout(timer)
  }, [bugHits, hitsToKill])

  if (!bugHits || crawlers.length === 0) return null

  return (
    <div className="crawlers" data-testid="crawler-swarm">
      {crawlers.map((crawler, i) => {
        const hits = bugHits[i] ?? 0
        if (hits >= hitsToKill) return null // squashed and gone
        const { Icon, motion } = crawler
        return (
          <button
            type="button"
            key={i}
            ref={(el) => {
              nodes.current[i] = el
            }}
            className={`crawlers__bug${struck === i ? ' crawlers__bug--struck' : ''}`}
            data-testid={`crawler-${i}`}
            data-moving="true"
            aria-label={`Squash bug ${i + 1}`}
            onClick={() => onSquash(i)}
            style={{
              width: `${motion.size}px`,
              height: `${motion.size}px`,
              transform: `translate3d(${motion.x}px, ${motion.y}px, 0)`,
            }}
          >
            {/* The legs: there is no per-leg geometry in an icon, so the
                scuttle is sold by rocking and squashing the body on a short
                cycle. At this size that reads as six legs working. */}
            <span className="crawlers__body">
              <Icon />
            </span>
          </button>
        )
      })}
    </div>
  )
}
