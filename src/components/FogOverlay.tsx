import { useEffect, useRef } from 'react'
import './FogOverlay.css'

// Full-screen atmospheric weather for the LOCAL player only. A procedural cloud
// on a canvas rather than a flat wash: several parallax LAYERS of soft drifting
// blobs (background slow + very soft, foreground faster + sharper) whose overlaps
// make density POCKETS that continuously form, merge, and dissolve as they drift
// at different speeds, plus short-lived curling WISPS. It fades in as the cloud
// rolls over the screen and thins out when the effect ends. Click-through
// (pointer-events:none) so the affected player can still act. Only this client
// renders it, and each instance lasts exactly as long as its status is active.
//
// Reusable atmospheric framework — swap the palette + layer parameters via the
// `variant`:
//   • 'fog'   — Air's Thick Fog (status `vision:fog`): cool grey-blue, dense,
//     drawn as curved crescent gusts "slicing" the air.
//   • 'toxic' — Nature's Toxic Gas (status `toxicGas`): sickly green, sparser,
//     drawn as soft round gas puffs rather than crescents.

interface Blob {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  swirl: number
  freq: number
  phase: number
  alpha: number
}

interface Wisp extends Blob {
  age: number
  lifetime: number
}

type FogLayer = {
  count: number
  radius: readonly [number, number]
  speed: readonly [number, number]
  swirl: number
  alpha: number
}

/** Per-layer parameters — bigger/slower/softer in back, smaller/faster in front. */
const AIR_LAYERS: FogLayer[] = [
  { count: 130, radius: [220, 380], speed: [6, 14], swirl: 5, alpha: 0.42 },
  { count: 150, radius: [140, 260], speed: [12, 24], swirl: 9, alpha: 0.5 },
  { count: 140, radius: [90, 170], speed: [20, 38], swirl: 14, alpha: 0.58 },
]
// Toxic Gas is a thinner, sparser haze than Thick Fog — fewer, softer puffs.
const NATURE_LAYERS: FogLayer[] = [
  { count: 8, radius: [220, 380], speed: [6, 14], swirl: 5, alpha: 0.42 },
  { count: 16, radius: [140, 260], speed: [12, 24], swirl: 9, alpha: 0.5 },
  { count: 10, radius: [90, 170], speed: [20, 38], swirl: 14, alpha: 0.58 },
]

export type FogVariant = 'fog' | 'toxic'

interface VariantSpec {
  rgb: string
  layers: FogLayer[]
  /** Carve each blob into a crescent (Air) vs. a round gas puff (Nature). */
  crescent: boolean
}

const VARIANTS: Record<FogVariant, VariantSpec> = {
  fog: { rgb: '206, 213, 227', layers: AIR_LAYERS, crescent: true }, // cool misty grey-blue
  toxic: { rgb: '107, 216, 138', layers: NATURE_LAYERS, crescent: false }, // nature green
}

const FADE_IN_MS = 420
const FADE_OUT_MS = 950

export function FogOverlay({
  active,
  variant = 'fog',
}: {
  active: boolean
  variant?: FogVariant
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return // no 2D context (jsdom) — nothing to animate

    const { rgb: FOG_RGB, layers: LAYERS, crescent } = VARIANTS[variant]
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
    const makeLayer = (l: FogLayer): Blob[] =>
      Array.from({ length: l.count }, () => {
        const dir = rng() * Math.PI * 2
        const spd = rand(l.speed)
        return {
          x: rng() * W,
          y: rng() * H,
          r: rand(l.radius),
          vx: Math.cos(dir) * spd,
          vy: Math.sin(dir) * spd,
          swirl: l.swirl,
          freq: 0.2 + rng() * 0.5,
          phase: rng() * Math.PI * 2,
          alpha: l.alpha,
        }
      })
    const layers = LAYERS.map(makeLayer)
    const wisps: Wisp[] = []

    let fade = 0
    let raf = 0
    let last = performance.now()
    let wispDebt = 0

    // Draw each blob as a soft gradient puff. For Air (crescent) it's carved into
    // a curved sliver oriented along its motion, so the fog reads like gusts
    // slicing the air; for Nature (toxic) it stays a round, billowing gas puff.
    const drawBlob = (b: Blob, a: number) => {
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r)
      g.addColorStop(0, `rgba(${FOG_RGB}, ${a})`)
      g.addColorStop(0.7, `rgba(${FOG_RGB}, ${a * 0.5})`)
      g.addColorStop(1, `rgba(${FOG_RGB}, 0)`)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
      if (crescent) {
        const ang = Math.atan2(b.vy, b.vx)
        const off = b.r * 0.48
        ctx.arc(b.x + Math.cos(ang) * off, b.y + Math.sin(ang) * off, b.r * 0.86, 0, Math.PI * 2, true)
        ctx.fill('evenodd') // subtract offset circle → crescent
      } else {
        ctx.fill()
      }
    }

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = now / 1000

      // Fade in while active; thin out when the buff ends.
      fade = activeRef.current
        ? Math.min(1, fade + dt * (1000 / FADE_IN_MS))
        : Math.max(0, fade - dt * (1000 / FADE_OUT_MS))

      ctx.clearRect(0, 0, W, H)

      for (const layer of layers) {
        for (const b of layer) {
          // Drift + a slow perpendicular swirl → billowing, not sliding.
          b.x += (b.vx + Math.cos(t * b.freq + b.phase) * b.swirl) * dt
          b.y += (b.vy + Math.sin(t * b.freq * 1.3 + b.phase) * b.swirl) * dt
          if (b.x < -b.r) b.x = W + b.r
          else if (b.x > W + b.r) b.x = -b.r
          if (b.y < -b.r) b.y = H + b.r
          else if (b.y > H + b.r) b.y = -b.r
          drawBlob(b, b.alpha * fade)
        }
      }

      // Faint curling wisps that appear briefly then dissolve.
      wispDebt += dt * 6 * fade
      while (wispDebt >= 1 && wisps.length < 24) {
        wispDebt -= 1
        const dir = rng() * Math.PI * 2
        wisps.push({
          x: rng() * W,
          y: rng() * H,
          r: 30 + rng() * 60,
          vx: Math.cos(dir) * (30 + rng() * 40),
          vy: Math.sin(dir) * (30 + rng() * 40),
          swirl: 18,
          freq: 0.5 + rng(),
          phase: rng() * Math.PI * 2,
          alpha: 0.3,
          age: 0,
          lifetime: 900 + rng() * 900,
        })
      }
      for (let i = wisps.length - 1; i >= 0; i--) {
        const w = wisps[i]!
        w.age += dt * 1000
        const lifeFrac = w.age / w.lifetime
        if (lifeFrac >= 1) {
          wisps.splice(i, 1)
          continue
        }
        w.x += (w.vx + Math.cos(t * w.freq + w.phase) * w.swirl) * dt
        w.y += (w.vy + Math.sin(t * w.freq + w.phase) * w.swirl) * dt
        // Fade in then out over the wisp's short life.
        const env = Math.sin(lifeFrac * Math.PI)
        drawBlob(w, w.alpha * env * fade)
      }

      if (fade <= 0 && !activeRef.current) {
        ctx.clearRect(0, 0, W, H)
        raf = 0
        return // fully dissipated — stop the loop
      }
      raf = requestAnimationFrame(step)
    }

    const start = () => {
      if (raf) return
      last = performance.now()
      raf = requestAnimationFrame(step)
    }
    if (active) start()

    // React to `active` flipping true while faded out (effect re-runs on active).
    return () => {
      window.removeEventListener('resize', resize)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [active, variant])

  return <canvas ref={canvasRef} className="fog-overlay" aria-hidden="true" />
}
