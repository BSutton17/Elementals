import { useEffect, useRef } from 'react'
import { drawClockFace } from '../scramble/clockRenderer'
import './BackToTheFutureOverlay.css'

// Back to the Future — victim-only overlay while the local kingdom bears the
// `goldRewind` status (Time's ultimate). A giant translucent clock fills the
// screen, its hands sweeping BACKWARD and fast to sell the reversal of time,
// while the treasury drains at its own gold/sec rate (server-authoritative).
// Full-screen canvas, click-through, jsdom-safe. Fades out when the rewind ends.

const TAU = Math.PI * 2
const FADE_IN_MS = 400
const FADE_OUT_MS = 700
// Backward hand speeds (rad/s) — the minute hand races counter-clockwise.
const MINUTE_SPEED = -3.4
const HOUR_SPEED = -0.85

export function BackToTheFutureOverlay({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef(active)
  activeRef.current = active
  const startRef = useRef<() => void>(() => {})

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return // jsdom / headless

    let W = (canvas.width = window.innerWidth)
    let H = (canvas.height = window.innerHeight)
    const resize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)

    let fade = 0
    let minute = 0
    let hour = 0
    let raf = 0
    let last = performance.now()

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      fade = activeRef.current
        ? Math.min(1, fade + dt * (1000 / FADE_IN_MS))
        : Math.max(0, fade - dt * (1000 / FADE_OUT_MS))

      // Hands sweep backward, fast.
      minute += MINUTE_SPEED * dt
      hour += HOUR_SPEED * dt

      ctx.clearRect(0, 0, W, H)
      const cx = W / 2
      const cy = H / 2
      const r = Math.min(W, H) * 0.34

      // Reverse-time haze that pulses with the ticking.
      ctx.fillStyle = `rgba(159, 208, 255, ${0.05 * fade})`
      ctx.fillRect(0, 0, W, H)

      // A couple of concentric backward rings behind the giant clock.
      for (let i = 1; i <= 2; i++) {
        ctx.strokeStyle = `rgba(217, 178, 90, ${0.12 * fade})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cx, cy, r * (1 + i * 0.12), 0, TAU)
        ctx.stroke()
      }

      // The giant clock, hands wound backward.
      drawClockFace(ctx, cx, cy, r, 0, minute, hour, 0.5 * fade, 'gold')

      if (fade <= 0 && !activeRef.current) {
        ctx.clearRect(0, 0, W, H)
        raf = 0
        return
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

    return () => {
      window.removeEventListener('resize', resize)
      if (raf) cancelAnimationFrame(raf)
      startRef.current = () => {}
    }
  }, [])

  useEffect(() => {
    if (active) startRef.current()
  }, [active])

  return (
    <div className="back-to-future" aria-hidden="true">
      <canvas ref={canvasRef} className="back-to-future__canvas" />
    </div>
  )
}
