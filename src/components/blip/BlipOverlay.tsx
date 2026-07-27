import { useEffect, useRef, useState } from 'react'
import { CgSandClock } from 'react-icons/cg'
import { onGameEvents } from '../../game/gameEvents'
import type { AttackUndoneEvent, RawGameEvent } from '../../game/events'
import { drawGear, drawRipple } from '../scramble/clockRenderer'
import { SandSimulation } from '../fatherTime/sandSimulation'
import './BlipOverlay.css'

// Blip! — the victim-only "rewind reality" flourish that plays when the local
// Time kingdom undoes the last attack against it (`attackUndone` event). A
// one-shot ~1.6s sequence, self-contained and click-through:
//
//   • a CgSandClock hourglass flips upside-down, then rights itself at the end;
//   • concentric temporal rings counter-rotate and contract inward (rewinding);
//   • particles spiral BACKWARD into the castle instead of bursting outward;
//   • faint afterimages of the moment trail then merge back together;
//   • it finishes with one golden pulse of sand, then dissolves to shimmer.
//
// The authoritative undo already happened server-side; this is pure cosmetics.
// jsdom-safe (no 2D context → renders nothing but the icon).

const DURATION_MS = 1600
const TAU = Math.PI * 2
const GOLD = '217, 178, 90'
const BLUE = '159, 208, 255'
const SILVER = '207, 214, 224'

interface Mote {
  angle: number
  radius: number
  speed: number
  size: number
  hue: string
}

export function BlipOverlay({ youId }: { youId: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const startRef = useRef(0)
  const rafRef = useRef(0)
  // Drives the CgSandClock icon rotation/opacity via React (cheap, ~per frame
  // it's fine — one element). `phase` is 0..1 across the rewind, -1 when idle.
  const [phase, setPhase] = useState(-1)

  // Trigger on the authoritative undo of an attack against the local player.
  useEffect(() => {
    if (!youId) return
    return onGameEvents((events: RawGameEvent[]) => {
      for (const e of events) {
        if (e.type === 'attackUndone' && (e as unknown as AttackUndoneEvent).playerId === youId) {
          startRef.current = performance.now()
          setPhase(0)
        }
      }
    })
  }, [youId])

  // Canvas rewind animation, (re)started whenever a new rewind begins.
  useEffect(() => {
    if (phase < 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = (canvas.width = window.innerWidth)
    let H = (canvas.height = window.innerHeight)
    const resize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)
    const cx = () => W / 2
    const cy = () => H * 0.46

    const rng = Math.random
    // Motes that spiral INWARD (reality flowing back into the castle).
    const motes: Mote[] = Array.from({ length: 60 }, () => ({
      angle: rng() * TAU,
      radius: 180 + rng() * 320,
      speed: 0.6 + rng() * 1.4,
      size: 2 + rng() * 3.5,
      hue: rng() < 0.5 ? GOLD : rng() < 0.5 ? BLUE : SILVER,
    }))
    const gears = Array.from({ length: 5 }, () => ({
      x: rng() * W,
      y: rng() * H,
      r: 22 + rng() * 46,
      teeth: 8 + Math.floor(rng() * 6),
      rot: rng() * TAU,
      rotSpeed: -(0.8 + rng() * 1.4), // reversed spin
    }))
    // The hourglass sand runs UP during the rewind.
    const sand = new SandSimulation(0, -60, 60, 34, 30)

    const step = (now: number) => {
      const p = Math.min(1, (now - startRef.current) / DURATION_MS)
      setPhase(p)
      ctx.clearRect(0, 0, W, H)
      const cX = cx()
      const cY = cy()

      // Fade envelope: in fast, hold, dissolve at the end.
      const fade = p < 0.12 ? p / 0.12 : p > 0.82 ? Math.max(0, 1 - (p - 0.82) / 0.18) : 1

      // Reversed gears, background.
      for (const g of gears) {
        g.rot += g.rotSpeed * 0.016
        drawGear(ctx, g.x, g.y, g.r, g.teeth, g.rot, 0.14 * fade, 'gold')
      }

      // Concentric temporal rings, counter-rotating, contracting inward as time
      // rewinds toward the castle.
      const rings = 3
      for (let i = 0; i < rings; i++) {
        const baseR = 90 + i * 70
        const r = baseR * (1 - p * 0.55) // contract inward
        const dir = i % 2 === 0 ? 1 : -1
        const spin = now / 1000 * dir * (0.6 + i * 0.2)
        ctx.save()
        ctx.translate(cX, cY)
        ctx.rotate(spin)
        ctx.strokeStyle = `rgba(${i === 1 ? GOLD : BLUE}, ${0.5 * fade})`
        ctx.lineWidth = 2
        // dashed ring so the rotation reads.
        ctx.setLineDash([r * 0.5, r * 0.35])
        ctx.beginPath()
        ctx.arc(0, 0, r, 0, TAU)
        ctx.stroke()
        ctx.restore()
      }
      ctx.setLineDash([])

      // Afterimages: faint ghost rings a beat behind, merging back in.
      for (let k = 1; k <= 2; k++) {
        const ghostR = 60 * (1 - p) + k * 18
        drawRipple(ctx, cX, cY, Math.max(0, ghostR), 0.18 * fade * (1 - p), 'silver')
      }

      // Motes spiral inward and vanish into the castle.
      for (const m of motes) {
        m.angle += m.speed * 0.03
        m.radius -= m.radius * 0.9 * 0.016 * (0.6 + p) // accelerate inward
        if (m.radius < 6) m.radius = 180 + rng() * 200
        const x = cX + Math.cos(m.angle) * m.radius
        const y = cY + Math.sin(m.angle) * m.radius
        ctx.fillStyle = `rgba(${m.hue}, ${0.7 * fade})`
        ctx.beginPath()
        ctx.arc(x, y, m.size, 0, TAU)
        ctx.fill()
      }

      // Hourglass sand running upward (reversed), under the DOM icon.
      ctx.save()
      ctx.translate(cX, cY)
      sand.update(ctx, 0.016, 0.6, fade, true)
      ctx.restore()

      // Final golden pulse of sand as the hourglass rights itself.
      if (p > 0.8) {
        const pulseR = (p - 0.8) / 0.2 * 260
        drawRipple(ctx, cX, cY, pulseR, Math.max(0, 1 - (p - 0.8) / 0.2) * 0.6, 'gold')
      }

      if (p >= 1) {
        ctx.clearRect(0, 0, W, H)
        setPhase(-1)
        rafRef.current = 0
        return
      }
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)

    return () => {
      window.removeEventListener('resize', resize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // Re-run only when a NEW rewind starts (phase resets to 0). We intentionally
    // don't depend on `phase` changing every frame — guard with a ref instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase >= 0 && startRef.current])

  if (phase < 0) return null

  // The hourglass icon: flips to upside-down fast, holds inverted through the
  // rewind, then rotates back upright at the very end as it dissolves.
  const rot = phase < 0.2 ? (phase / 0.2) * 180 : phase < 0.8 ? 180 : 180 + ((phase - 0.8) / 0.2) * 180
  const opacity = phase < 0.12 ? phase / 0.12 : phase > 0.85 ? Math.max(0, 1 - (phase - 0.85) / 0.15) : 1

  return (
    <div className="blip" aria-hidden="true">
      <canvas ref={canvasRef} className="blip__canvas" />
      <span
        className="blip__hourglass"
        style={{ transform: `translate(-50%, -50%) rotate(${rot}deg)`, opacity }}
      >
        <CgSandClock />
      </span>
    </div>
  )
}
