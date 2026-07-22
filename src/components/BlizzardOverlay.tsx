import { useEffect, useRef } from 'react'
import './BlizzardOverlay.css'

// Global arctic-storm overlay (Ice's Blizzard ultimate, Epic 9). Unlike the
// victim-only FogOverlay, this is a WORLD weather event: it renders on EVERY
// player's screen at once (mounted whenever any kingdom carries the `blizzard`
// status) so the whole battlefield is visibly engulfed. A full-screen canvas —
//
//   • storm darkening    — the scene dims as dense clouds roll in.
//   • gray-white flash   — a ~2s whiteout at the onset (fades in ~180ms, holds,
//     fades out) that reduces contrast without hiding the battlefield.
//   • layered snowfall    — several parallax layers: big fast foreground flakes
//     (drawn as wind streaks) over small slow background flakes → real depth.
//   • horizontal wind + gusts — snow blows DIAGONALLY; gusts periodically surge
//     the speed, then settle, so it never feels static or flat.
//   • fine ice particles  — tiny fast specks mixed through the snow.
//   • ground powder        — low rolling clouds of blown powder near the bottom.
//
// It builds quickly on cast and, on expiry, TAPERS (snow thins, wind weakens)
// rather than cutting out. jsdom-safe: with no 2D context it renders nothing.

interface Flake {
  x: number
  y: number
  r: number
  fall: number // base fall speed (px/s)
  windMul: number
  alpha: number
  streak: boolean
}

/** Snow layers, back → front: smaller/slower/softer behind, big/fast in front. */
const LAYERS = [
  { count: 70, size: [0.8, 2.0] as const, speed: [55, 100] as const, windMul: 0.55, alpha: 0.45, streak: false },
  { count: 55, size: [1.8, 3.4] as const, speed: [120, 200] as const, windMul: 0.85, alpha: 0.7, streak: false },
  { count: 42, size: [3.0, 5.5] as const, speed: [230, 360] as const, windMul: 1.2, alpha: 0.92, streak: true },
]
const ICE_COUNT = 46 // fine fast specks
const POWDER_COUNT = 26 // rolling ground powder
const WIND_X = -150 // baseline horizontal wind (px/s), blowing left
const BUILD_MS = 700 // storm builds quickly to full intensity
const TAPER_MS = 1900 // snow/wind ease out on expiry
// Onset gray-white whiteout envelope (~2s total).
const FLASH_IN = 180
const FLASH_HOLD = 1300
const FLASH_OUT = 520
const FLASH_PEAK = 0.34

function flashAlpha(ms: number): number {
  if (ms < FLASH_IN) return FLASH_PEAK * (ms / FLASH_IN)
  if (ms < FLASH_IN + FLASH_HOLD) return FLASH_PEAK
  if (ms < FLASH_IN + FLASH_HOLD + FLASH_OUT) return FLASH_PEAK * (1 - (ms - FLASH_IN - FLASH_HOLD) / FLASH_OUT)
  return 0
}

export function BlizzardOverlay({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef(active)
  activeRef.current = active
  // Lets the [active] effect resume the loop after it self-stops, WITHOUT the
  // main effect tearing the loop down on deactivation (so the taper-out runs).
  const startRef = useRef<() => void>(() => {})

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return // jsdom / headless — nothing to animate

    const rng = Math.random
    let W = 0
    let H = 0
    const resize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const rand = ([lo, hi]: readonly [number, number]) => lo + rng() * (hi - lo)
    const makeLayer = (l: (typeof LAYERS)[number]): Flake[] =>
      Array.from({ length: l.count }, () => ({
        x: rng() * W,
        y: rng() * H,
        r: rand(l.size),
        fall: rand(l.speed),
        windMul: l.windMul,
        alpha: l.alpha,
        streak: l.streak,
      }))
    const layers = LAYERS.map(makeLayer)
    const ice: Flake[] = Array.from({ length: ICE_COUNT }, () => ({
      x: rng() * W, y: rng() * H, r: 0.6 + rng() * 0.9,
      fall: 200 + rng() * 220, windMul: 1.35, alpha: 0.85, streak: false,
    }))
    const powder: Flake[] = Array.from({ length: POWDER_COUNT }, () => ({
      x: rng() * W, y: H * (0.72 + rng() * 0.28), r: 14 + rng() * 34,
      fall: 4 + rng() * 12, windMul: 1.6, alpha: 0.10 + rng() * 0.10, streak: false,
    }))

    let intensity = 0
    let flashMs = Infinity // no flash until the first activation
    let prevActive = false
    let raf = 0
    let last = performance.now()

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = now / 1000
      const on = activeRef.current

      // Rising edge → kick off the onset whiteout.
      if (on && !prevActive) flashMs = 0
      prevActive = on
      if (flashMs !== Infinity) flashMs += dt * 1000

      intensity = on
        ? Math.min(1, intensity + dt * (1000 / BUILD_MS))
        : Math.max(0, intensity - dt * (1000 / TAPER_MS))

      ctx.clearRect(0, 0, W, H)
      if (intensity <= 0 && flashAlpha(flashMs) <= 0 && !on) {
        raf = 0
        return // fully cleared — stop the loop
      }

      // Gusts: a rolling surge that periodically intensifies then settles.
      const gust = 1 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.55)) + 0.28 * Math.max(0, Math.sin(t * 1.9 + 1))
      const windX = WIND_X * gust

      // Storm darkening (dense clouds roll in), behind the snow.
      ctx.fillStyle = `rgba(28, 38, 58, ${0.16 * intensity})`
      ctx.fillRect(0, 0, W, H)

      // Rolling ground powder — low, mostly horizontal, soft.
      for (const p of powder) {
        p.x += windX * p.windMul * dt
        p.y += Math.sin(t * 0.8 + p.r) * 6 * dt
        if (p.x < -p.r) p.x = W + p.r
        else if (p.x > W + p.r) p.x = -p.r
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r)
        g.addColorStop(0, `rgba(236, 244, 255, ${p.alpha * intensity})`)
        g.addColorStop(1, 'rgba(236, 244, 255, 0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // Snow layers (back → front) + fine ice specks, blown diagonally.
      const drawFlakes = (flakes: Flake[]) => {
        for (const f of flakes) {
          const vx = windX * f.windMul
          const vy = f.fall * (0.85 + 0.3 * gust)
          f.x += vx * dt
          f.y += vy * dt
          if (f.y > H + f.r) { f.y = -f.r; f.x = rng() * W }
          if (f.x < -f.r) f.x = W + f.r
          else if (f.x > W + f.r) f.x = -f.r
          const a = f.alpha * intensity
          ctx.strokeStyle = ctx.fillStyle = `rgba(248, 251, 255, ${a})`
          if (f.streak) {
            // Motion streak along the wind for the fast foreground flakes.
            ctx.lineWidth = f.r
            ctx.lineCap = 'round'
            ctx.beginPath()
            ctx.moveTo(f.x, f.y)
            ctx.lineTo(f.x - vx * 0.03, f.y - vy * 0.03)
            ctx.stroke()
          } else {
            ctx.beginPath()
            ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
      drawFlakes(layers[0]!)
      drawFlakes(ice)
      drawFlakes(layers[1]!)
      drawFlakes(layers[2]!)

      // Onset gray-white whiteout on top (reduces contrast, never hides).
      const fa = flashAlpha(flashMs)
      if (fa > 0) {
        ctx.fillStyle = `rgba(226, 232, 240, ${fa})`
        ctx.fillRect(0, 0, W, H)
      }

      raf = requestAnimationFrame(step)
    }

    const start = () => {
      if (raf) return
      last = performance.now()
      raf = requestAnimationFrame(step)
    }
    startRef.current = start
    if (activeRef.current) start()

    // Set up ONCE and keep the loop alive across active changes — deactivation
    // lets the loop taper to nothing and self-stop, rather than being cancelled.
    return () => {
      window.removeEventListener('resize', resize)
      if (raf) cancelAnimationFrame(raf)
      startRef.current = () => {}
    }
  }, [])

  // Resume the (self-stopping) loop whenever a blizzard starts.
  useEffect(() => {
    if (active) startRef.current()
  }, [active])

  return <canvas ref={canvasRef} className="blizzard-overlay" aria-hidden="true" />
}
