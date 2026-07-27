import { useEffect, useRef } from 'react'
import {
  drawClockFace,
  drawGear,
  drawNumeral,
  drawRipple,
  drawSweepHand,
  type ClockHue,
} from './clockRenderer'
import './ScrambleOverlay.css'

// "Half Past 12" UI scramble (Time) — the victim-only, ~12s temporal-instability
// overlay. A full-screen canvas of drifting transparent clock faces, spinning
// gears, sweeping clock hands, expanding tick ripples, and shaken-loose glowing
// numerals, over a CSS glitch/vignette layer. It must feel disorienting yet
// stay readable and click-through (pointer-events:none), so the game is never
// unplayable. On expiry it runs a RESTORATION sequence: clocks collapse inward,
// gears reverse, the central hand eases to exactly 12, then everything fades.
//
// State lives entirely here; the drawing primitives come from clockRenderer.
// jsdom-safe: with no 2D context it renders nothing (like the other overlays).

const HUES: ClockHue[] = ['gold', 'silver', 'blue']
const NUMERALS = ['12', '1', '2', '3', '6', '9', 'XII', 'IX', 'III', 'VI']

const FADE_IN_MS = 500
const RESTORE_MS = 1300 // the collapse-inward wind-down on expiry
const FREEZE_MIN = 100 // "time briefly stopped" hold (ms)
const FREEZE_MAX = 200
const FREEZE_GAP = [1800, 3600] as const // ms between freezes

interface Clock {
  x: number
  y: number
  r: number
  rot: number
  rotSpeed: number
  minute: number
  hour: number
  handSpeed: number
  dx: number
  dy: number
  hue: ClockHue
  alpha: number
  // Restoration anchors (home = where it collapses toward).
  homeX: number
  homeY: number
}
interface Gear {
  x: number
  y: number
  r: number
  teeth: number
  rot: number
  rotSpeed: number
  hue: ClockHue
}
interface Numeral {
  x: number
  y: number
  text: string
  size: number
  rot: number
  rotSpeed: number
  dx: number
  dy: number
  hue: ClockHue
}
interface Ripple {
  x: number
  y: number
  r: number
  hue: ClockHue
}
interface Sweep {
  cx: number
  cy: number
  length: number
  angle: number
  speed: number
  hue: ClockHue
}

export function ScrambleOverlay({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(active)
  activeRef.current = active
  const startRef = useRef<() => void>(() => {})

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
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

    const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]!
    const range = (lo: number, hi: number) => lo + rng() * (hi - lo)

    // --- populate the temporal field ---------------------------------------
    // Spread the clocks across a jittered grid so they cover the whole screen
    // rather than clustering — each lands in its own cell, then drifts.
    const COLS = 4
    const ROWS = 3
    const clocks: Clock[] = []
    for (let gy = 0; gy < ROWS; gy++) {
      for (let gx = 0; gx < COLS; gx++) {
        // Skip the middle cell — the anchor clock owns the centre.
        if (gy === 1 && (gx === 1 || gx === 2)) continue
        const x = ((gx + 0.2 + rng() * 0.6) / COLS) * W
        const y = ((gy + 0.2 + rng() * 0.6) / ROWS) * H
        clocks.push({
          x,
          y,
          homeX: x,
          homeY: y,
          r: range(32, 92),
          rot: range(0, Math.PI * 2),
          rotSpeed: range(-0.5, 0.5),
          minute: range(0, Math.PI * 2),
          hour: range(0, Math.PI * 2),
          handSpeed: range(0.6, 2.4) * (rng() < 0.5 ? -1 : 1), // some run backward
          dx: range(-22, 22),
          dy: range(-18, 18),
          hue: pick(HUES),
          alpha: range(0.25, 0.55),
        })
      }
    }
    // A central anchor clock that the restoration hand settles on (at 12).
    const anchor: Clock = {
      x: W / 2,
      y: H / 2,
      homeX: W / 2,
      homeY: H / 2,
      r: 150,
      rot: 0,
      rotSpeed: 0.12,
      minute: range(0, Math.PI * 2),
      hour: range(0, Math.PI * 2),
      handSpeed: 1.6,
      dx: 0,
      dy: 0,
      hue: 'gold',
      alpha: 0.32,
    }
    const gears: Gear[] = Array.from({ length: 6 }, () => ({
      x: range(0, 1) * W,
      y: range(0, 1) * H,
      r: range(26, 90),
      teeth: Math.floor(range(8, 16)),
      rot: range(0, Math.PI * 2),
      rotSpeed: range(-1.1, 1.1),
      hue: pick(HUES),
    }))
    const numerals: Numeral[] = Array.from({ length: 10 }, () => ({
      x: range(0, 1) * W,
      y: range(0, 1) * H,
      text: pick(NUMERALS),
      size: range(18, 46),
      rot: range(-0.4, 0.4),
      rotSpeed: range(-0.4, 0.4),
      dx: range(-18, 18),
      dy: range(-18, 18),
      hue: pick(HUES),
    }))
    const ripples: Ripple[] = []
    const sweeps: Sweep[] = [
      { cx: 0, cy: 0, length: Math.hypot(W, H), angle: 0, speed: 0.22, hue: 'blue' },
      { cx: W, cy: H, length: Math.hypot(W, H), angle: Math.PI, speed: -0.16, hue: 'silver' },
    ]

    let fade = 0
    let phase: 'in' | 'restoring' = 'in'
    let restoreT = 0
    let rippleDebt = 0
    let freezeUntil = 0
    let nextFreeze = performance.now() + range(...FREEZE_GAP)
    let raf = 0
    let last = performance.now()

    const step = (now: number) => {
      const rawDt = Math.min(0.05, (now - last) / 1000)
      last = now

      // "Time briefly stopped": during a freeze we still draw, but advance
      // nothing — the field hangs, then jumps back to life.
      const frozen = now < freezeUntil
      if (!frozen && now >= nextFreeze && activeRef.current && phase === 'in') {
        freezeUntil = now + range(FREEZE_MIN, FREEZE_MAX)
        nextFreeze = now + range(...FREEZE_GAP)
        wrap.classList.add('scramble--freeze')
      }
      if (frozen) {
        // hold — redraw last frame's positions without integrating time.
      } else {
        wrap.classList.remove('scramble--freeze')
      }
      const dt = frozen ? 0 : rawDt
      const t = now / 1000

      // Fade in while active; on deactivation switch to the restoration phase.
      if (activeRef.current) {
        fade = Math.min(1, fade + rawDt * (1000 / FADE_IN_MS))
        phase = 'in'
        restoreT = 0
        wrap.classList.remove('scramble--restoring')
      } else if (phase === 'in') {
        phase = 'restoring'
        wrap.classList.add('scramble--restoring')
      }
      if (phase === 'restoring') {
        restoreT += rawDt * 1000
        fade = Math.max(0, 1 - restoreT / RESTORE_MS)
      }
      // Eased restoration progress 0→1 (clocks collapse, hands settle to 12).
      const rp = phase === 'restoring' ? Math.min(1, restoreT / RESTORE_MS) : 0
      const collapse = rp * rp * (3 - 2 * rp) // smoothstep

      ctx.clearRect(0, 0, W, H)

      // Sweeping hands, far background.
      for (const s of sweeps) {
        s.angle += s.speed * dt
        drawSweepHand(ctx, s.cx, s.cy, s.length, s.angle, 0.16 * fade, s.hue)
      }

      // Gears behind everything — reverse their spin during restoration.
      for (const g of gears) {
        const spin = phase === 'restoring' ? -g.rotSpeed : g.rotSpeed
        g.rot += spin * dt
        drawGear(ctx, g.x, g.y, g.r, g.teeth, g.rot, 0.22 * fade, g.hue)
      }

      // Expanding tick ripples — the visual "tick" of unstable time.
      rippleDebt += dt * 2.2 * fade
      while (rippleDebt >= 1 && ripples.length < 14 && phase === 'in') {
        rippleDebt -= 1
        ripples.push({ x: range(0, 1) * W, y: range(0, 1) * H, r: 2, hue: pick(HUES) })
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp2 = ripples[i]!
        rp2.r += 140 * dt
        const a = Math.max(0, 1 - rp2.r / 220) * 0.5 * fade
        if (a <= 0) {
          ripples.splice(i, 1)
          continue
        }
        drawRipple(ctx, rp2.x, rp2.y, rp2.r, a, rp2.hue)
      }

      // Drifting clock faces (+ a faint temporal ECHO trailing behind each).
      const drawOneClock = (c: Clock) => {
        // Integrate drift + spin; wrap around the screen edges.
        c.x += c.dx * dt
        c.y += c.dy * dt
        c.rot += c.rotSpeed * dt
        // Hands sweep (some backward); during restoration they ease toward 12.
        if (phase === 'restoring') {
          c.minute += (0 - c.minute) * Math.min(1, dt * 6) * 0 // frozen sweep
          c.minute *= 1 - collapse
          c.hour *= 1 - collapse
          // collapse toward home→center.
          const cx = W / 2
          const cy = H / 2
          c.x += (cx - c.x) * collapse * 0.12
          c.y += (cy - c.y) * collapse * 0.12
        } else {
          c.minute += c.handSpeed * dt
          c.hour += c.handSpeed * 0.4 * dt
        }
        if (c.x < -c.r) c.x = W + c.r
        else if (c.x > W + c.r) c.x = -c.r
        if (c.y < -c.r) c.y = H + c.r
        else if (c.y > H + c.r) c.y = -c.r
        const rr = c.r * (1 - collapse * 0.7)
        // Temporal echo: a faint copy a beat behind, offset along its motion.
        drawClockFace(
          ctx,
          c.x - c.dx * 0.06,
          c.y - c.dy * 0.06,
          rr,
          c.rot - c.rotSpeed * 0.08,
          c.minute,
          c.hour,
          c.alpha * 0.28 * fade,
          c.hue,
        )
        drawClockFace(ctx, c.x, c.y, rr, c.rot, c.minute, c.hour, c.alpha * fade, c.hue)
      }
      for (const c of clocks) drawOneClock(c)

      // The anchor clock: during restoration its hands settle to exactly 12.
      anchor.rot += (phase === 'restoring' ? -anchor.rotSpeed : anchor.rotSpeed) * dt
      if (phase === 'restoring') {
        anchor.minute *= 1 - collapse
        anchor.hour *= 1 - collapse
      } else {
        anchor.minute += anchor.handSpeed * dt
        anchor.hour += anchor.handSpeed * 0.4 * dt
      }
      drawClockFace(
        ctx,
        anchor.x,
        anchor.y,
        anchor.r * (1 - collapse * 0.35),
        phase === 'restoring' ? 0 : anchor.rot,
        anchor.minute,
        anchor.hour,
        anchor.alpha * fade,
        'gold',
      )

      // Shaken-loose glowing numerals.
      for (const n of numerals) {
        n.x += n.dx * dt
        n.y += n.dy * dt
        n.rot += n.rotSpeed * dt
        if (phase === 'restoring') {
          n.x += (W / 2 - n.x) * collapse * 0.1
          n.y += (H / 2 - n.y) * collapse * 0.1
        }
        if (n.x < -40) n.x = W + 40
        else if (n.x > W + 40) n.x = -40
        if (n.y < -40) n.y = H + 40
        else if (n.y > H + 40) n.y = -40
        drawNumeral(ctx, n.x, n.y, n.text, n.size, n.rot, 0.5 * fade, n.hue)
      }

      // A subtle time-pulse haze that breathes with the ticking.
      const pulse = 0.04 + 0.03 * (0.5 + 0.5 * Math.sin(t * 3))
      ctx.fillStyle = `rgba(217, 178, 90, ${pulse * fade})`
      ctx.fillRect(0, 0, W, H)

      if (fade <= 0 && !activeRef.current) {
        ctx.clearRect(0, 0, W, H)
        wrap.classList.remove('scramble--restoring', 'scramble--freeze')
        raf = 0
        return // fully restored — stop the loop
      }
      raf = requestAnimationFrame(step)
    }

    const start = () => {
      if (raf) return
      last = performance.now()
      nextFreeze = last + range(...FREEZE_GAP)
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

  // Resume the (self-stopping) loop whenever the scramble (re)starts.
  useEffect(() => {
    if (active) startRef.current()
  }, [active])

  return (
    <div ref={wrapRef} className="scramble" aria-hidden="true">
      <canvas ref={canvasRef} className="scramble__canvas" />
      <div className="scramble__glitch" />
      <div className="scramble__vignette" />
    </div>
  )
}
