import { useEffect, useRef, useState } from 'react'
import {
  DECEL_MS,
  MIN_CRUISE_MS,
  SPIN_UP_MS,
  STAGGER_MS,
  SYMBOLS,
  VERDICT_DELAY_MS,
  blurFor,
  decelEase,
  landingTarget,
  spinUpSpeed,
  stripOffset,
  symbolAt,
} from './reelMotion'

// Drives the three reels from a single rAF loop. Each reel is a position, a
// speed, and — once the server has rolled — a landing it is easing into.
//
// Nothing moves until the player pulls the lever: the machine sits there daring
// you to touch it. The pull winds the reels up, and when the server's true
// symbols come back each reel settles onto its own, left to right.
//
// Position is a float index into the symbol strip and only ever INCREASES; the
// reels are rendered scrolling downward from it (see `stripOffset`), so a reel
// never has to run backwards to find its symbol.

export interface ReelView {
  /** Symbol currently in the window. */
  symbol: string
  /** The symbol above the window, sliding down into it. */
  above: string
  /** The symbol below the window, sliding out of it. */
  below: string
  /** How far the strip is scrolled out of the window, -0.5→0.5 of a cell. */
  offset: number
  /** Motion blur in px. */
  blur: number
  /** Still turning? */
  moving: boolean
  /** Has this reel settled onto its server-given symbol? A reel that is merely
   *  stationary (the machine is idle) has NOT landed. */
  landed: boolean
}

interface Reel {
  pos: number
  speed: number
  /** Set once the server has rolled: when this reel begins easing to its landing. */
  decelAt: number | null
  /** Where it is easing from / to, captured when deceleration begins. */
  from: number
  to: number | null
  /** The symbol index it must land on. Only meaningful once the server rolled. */
  landingIndex: number
  landed: boolean
}

const REEL_COUNT = 3

function freshReels(): Reel[] {
  return Array.from({ length: REEL_COUNT }, (_, i) => ({
    // Stagger the resting symbols so the machine doesn't sit on three of a kind.
    pos: i * 2,
    speed: 0,
    decelAt: null,
    from: 0,
    to: null,
    landingIndex: 0,
    landed: false,
  }))
}

function viewOf(reel: Reel): ReelView {
  const i = ((Math.round(reel.pos) % SYMBOLS.length) + SYMBOLS.length) % SYMBOLS.length
  return {
    symbol: symbolAt(reel.pos),
    // The reels spin DOWNWARD, so the cell above the window holds the symbol
    // coming next and the cell below holds the one just left behind.
    above: SYMBOLS[(i + 1) % SYMBOLS.length]!,
    below: SYMBOLS[(i - 1 + SYMBOLS.length) % SYMBOLS.length]!,
    offset: stripOffset(reel.pos),
    blur: blurFor(reel.speed),
    moving: reel.speed > 0.4,
    landed: reel.landed,
  }
}

export function useReels(mounted: boolean) {
  const reels = useRef<Reel[]>(freshReels())
  /** When the lever was pulled. Null while the machine is idle. */
  const spinFrom = useRef<number | null>(null)
  const [view, setView] = useState<ReelView[]>(() => reels.current.map(viewOf))
  /** Bumped as each reel locks, so the caller can react to a landing. */
  const [landedCount, setLandedCount] = useState(0)

  const frame = useRef(0)

  useEffect(() => {
    if (!mounted) return
    reels.current = freshReels()
    spinFrom.current = null
    setLandedCount(0)
    setView(reels.current.map(viewOf))
    let last = performance.now()

    const loop = () => {
      const now = performance.now()
      const dt = Math.min(64, now - last) / 1000
      last = now
      let justLanded = 0

      // Idle: the reels rest on their symbols until the lever is pulled.
      if (spinFrom.current != null) {
        const sincePull = now - spinFrom.current
        for (const reel of reels.current) {
          if (reel.to != null && reel.decelAt != null) {
            // Settling onto its symbol.
            const t = (now - reel.decelAt) / DECEL_MS
            if (t >= 1) {
              reel.pos = reel.to
              reel.speed = 0
              if (!reel.landed) {
                reel.landed = true
                justLanded += 1
              }
            } else {
              const previous = reel.pos
              reel.pos = reel.from + (reel.to - reel.from) * decelEase(t)
              reel.speed = dt > 0 ? (reel.pos - previous) / dt : 0
            }
            continue
          }
          if (reel.decelAt != null && now >= reel.decelAt) {
            // Its moment arrived: capture the landing and start easing.
            reel.from = reel.pos
            reel.to = landingTarget(reel.pos, reel.landingIndex)
            continue
          }
          // Winding up, then cruising until this reel's turn to slow.
          reel.speed = spinUpSpeed(sincePull)
          reel.pos += reel.speed * dt
        }
      }

      if (justLanded) setLandedCount((n) => n + justLanded)
      setView(reels.current.map(viewOf))
      frame.current = requestAnimationFrame(loop)
    }

    frame.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame.current)
  }, [mounted])

  /** The lever was pulled: wind the reels up while the server rolls. */
  const begin = () => {
    spinFrom.current = performance.now()
    for (const reel of reels.current) {
      reel.decelAt = null
      reel.to = null
      reel.landed = false
    }
  }

  /**
   * The server handed back the true symbols: give each reel its landing,
   * staggered left to right. Returns how long until the last reel locks and the
   * verdict is due, so the payout is timed to the actual motion rather than to
   * a guess about how fast the server replied.
   *
   * The reels are held at cruise for at least MIN_CRUISE_MS after winding up,
   * so even an instant server reply still buys a spin worth watching.
   */
  const commit = (symbols: string[]): number => {
    const now = performance.now()
    const pulledAt = spinFrom.current ?? now
    // Don't start slowing before the reels have wound up and run a little.
    const firstDecel = Math.max(now, pulledAt + SPIN_UP_MS + MIN_CRUISE_MS)
    reels.current.forEach((reel, i) => {
      const index = SYMBOLS.indexOf(symbols[i] as (typeof SYMBOLS)[number])
      reel.landingIndex = index >= 0 ? index : 0
      reel.decelAt = firstDecel + STAGGER_MS * i
    })
    const lastLanding = firstDecel + STAGGER_MS * (reels.current.length - 1) + DECEL_MS
    return lastLanding - now + VERDICT_DELAY_MS
  }

  /** Stop the reels dead (the server refused the pull). */
  const release = () => {
    spinFrom.current = null
    for (const reel of reels.current) {
      reel.decelAt = null
      reel.to = null
      reel.landed = false
      reel.speed = 0
      reel.pos = Math.round(reel.pos)
    }
  }

  return { view, begin, commit, release, landedCount }
}
