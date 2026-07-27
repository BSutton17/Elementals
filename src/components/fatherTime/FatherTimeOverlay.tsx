import { useEffect, useRef } from 'react'
import { onGameEvents } from '../../game/gameEvents'
import type { DamageEvent, StatusTickEvent } from '../../game/events'
import { drawClockFace, drawGear, drawNumeral } from '../scramble/clockRenderer'
import { SandSimulation } from './sandSimulation'
import './FatherTimeOverlay.css'

// Father Time's Mark — the victim-only pressure overlay. A large translucent
// grandfather clock hovers and counts the seconds; every idle second the vice
// tightens (brighter glow, faster sand, more gears, spreading temporal cracks).
// Each damage tick SLAMS the clock forward with a burst of fragments and a
// brief "aging" flash; landing a damaging attack RESETS the countdown and the
// pressure subsides. When the mark ends, the clock shatters into dust, the
// gears stop, and the remaining sand reverses upward.
//
// Driven by authoritative signals: `active` (the local `fatherTimeMark` status)
// gates it; damage events (cause `status:fatherTimeMark`) slam it; `statusTick`
// (interrupted) resets it. jsdom-safe (no 2D context → renders nothing).

const TAU = Math.PI * 2
const GOLD = '217, 178, 90'
const SILVER = '207, 214, 224'
const BLUE = '159, 208, 255'

const FADE_IN_MS = 450
const EXPIRE_MS = 1300
const SLAM_MS = 650
const RESET_MS = 600
const MAX_PRESSURE_SECONDS = 8 // idle seconds to reach full pressure

interface Fragment {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  rotSpeed: number
  size: number
  life: number
  maxLife: number
  gear: boolean
}

export function FatherTimeOverlay({
  active,
  youId,
}: {
  active: boolean
  youId: string | null
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(active)
  activeRef.current = active
  // Event-driven pulses the RAF loop reads (refs so events don't re-render).
  const idleSeconds = useRef(0)
  const slamAt = useRef(-Infinity)
  const resetAt = useRef(-Infinity)
  const pendingFragments = useRef(0)
  const startRef = useRef<() => void>(() => {})

  // Slam on each Father Time damage tick; reset on an interrupt.
  useEffect(() => {
    if (!youId) return
    return onGameEvents((events) => {
      for (const e of events) {
        if (
          e.type === 'damage' &&
          (e as unknown as DamageEvent).cause === 'status:fatherTimeMark' &&
          (e as unknown as DamageEvent).targetId === youId
        ) {
          idleSeconds.current += 1
          slamAt.current = performance.now()
          pendingFragments.current += 14
        } else if (
          e.type === 'statusTick' &&
          (e as unknown as StatusTickEvent).statusId === 'fatherTimeMark' &&
          (e as unknown as StatusTickEvent).playerId === youId &&
          (e as unknown as StatusTickEvent).interrupted
        ) {
          idleSeconds.current = 0
          resetAt.current = performance.now()
        }
      }
    })
  }, [youId])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return // jsdom / headless

    let W = 0
    let H = 0
    let cx = 0
    let cy = 0
    let sandL: SandSimulation
    let sandR: SandSimulation
    const resize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
      cx = W / 2
      cy = H * 0.46
      sandL = new SandSimulation(W * 0.12, H * 0.28, H * 0.72, 26, 34)
      sandR = new SandSimulation(W * 0.88, H * 0.28, H * 0.72, 26, 34)
    }
    resize()
    window.addEventListener('resize', resize)

    const gears = Array.from({ length: 8 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 24 + Math.random() * 70,
      teeth: 8 + Math.floor(Math.random() * 8),
      rot: Math.random() * TAU,
      rotSpeed: (Math.random() - 0.5) * 1.6,
    }))
    const cracks = Array.from({ length: 14 }, (_, i) => ({
      angle: (i / 14) * TAU + Math.random() * 0.3,
      jitter: Math.random() * 0.4,
    }))
    const fragments: Fragment[] = []

    let fade = 0
    let phase: 'in' | 'expiring' = 'in'
    let expireT = 0
    let handAngle = 0
    let raf = 0
    let last = performance.now()

    const spawnFragments = (n: number, burst: boolean) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU
        const spd = (burst ? 260 : 120) + Math.random() * (burst ? 360 : 200)
        fragments.push({
          x: cx,
          y: cy,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd - 60,
          rot: Math.random() * TAU,
          rotSpeed: (Math.random() - 0.5) * 8,
          size: 5 + Math.random() * 12,
          life: 0,
          maxLife: 700 + Math.random() * 600,
          gear: Math.random() < 0.4,
        })
      }
    }

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = now / 1000

      if (activeRef.current) {
        fade = Math.min(1, fade + dt * (1000 / FADE_IN_MS))
        phase = 'in'
        expireT = 0
        wrap.classList.remove('father-time--expiring')
      } else if (phase === 'in') {
        phase = 'expiring'
        wrap.classList.add('father-time--expiring')
        spawnFragments(30, true) // the clock shatters into dust
      }
      if (phase === 'expiring') {
        expireT += dt * 1000
        fade = Math.max(0, 1 - expireT / EXPIRE_MS)
      }

      // Pressure ramps with idle seconds; the slam adds a short spike.
      const slamK = Math.max(0, 1 - (now - slamAt.current) / SLAM_MS)
      const resetK = Math.max(0, 1 - (now - resetAt.current) / RESET_MS)
      const pressure = Math.min(1, idleSeconds.current / MAX_PRESSURE_SECONDS)
      const glow = Math.min(1, pressure + slamK * 0.5 + resetK * 0.6)
      wrap.classList.toggle('father-time--slam', slamK > 0.6 && phase === 'in')

      if (pendingFragments.current > 0) {
        spawnFragments(pendingFragments.current, false)
        pendingFragments.current = 0
      }

      ctx.clearRect(0, 0, W, H)

      // Background gears — more of them spin the longer you hesitate.
      const activeGears = phase === 'expiring' ? gears.length : Math.round(2 + pressure * (gears.length - 2))
      gears.forEach((g, i) => {
        const spin = phase === 'expiring' ? 0 : g.rotSpeed * (0.5 + pressure)
        g.rot += spin * dt
        if (i < activeGears) drawGear(ctx, g.x, g.y, g.r, g.teeth, g.rot, 0.16 * fade, i % 2 ? 'silver' : 'gold')
      })

      // Spectral hourglasses — sand falls faster under pressure, reverses on end.
      sandL.update(ctx, dt, pressure, fade, phase === 'expiring')
      sandR.update(ctx, dt, pressure, fade, phase === 'expiring')

      // Temporal cracks radiating from the clock — spread with pressure.
      const crackLen = (120 + pressure * 320) * (phase === 'expiring' ? 1 - expireT / EXPIRE_MS : 1)
      ctx.strokeStyle = `rgba(${GOLD}, ${(0.1 + pressure * 0.35) * fade})`
      ctx.lineWidth = 1 + pressure
      for (const c of cracks) {
        const a = c.angle
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        const mx = cx + Math.cos(a) * crackLen * 0.5
        const my = cy + Math.sin(a) * crackLen * 0.5
        ctx.lineTo(mx + Math.cos(a + c.jitter) * 14, my + Math.sin(a + c.jitter) * 14)
        ctx.lineTo(cx + Math.cos(a) * crackLen, cy + Math.sin(a) * crackLen)
        ctx.stroke()
      }

      // The hovering clock: its hand slams forward one hour-mark per idle second
      // (a violent overshoot on the slam), glowing brighter under pressure.
      const targetHand = idleSeconds.current * (TAU / 12)
      const overshoot = slamK * 0.28
      handAngle += (targetHand - handAngle) * Math.min(1, dt * 12) + overshoot * (targetHand - handAngle > 0 ? 1 : 0) * dt * 4
      const clockR = 150 * (phase === 'expiring' ? 1 - expireT / EXPIRE_MS * 0.6 : 1 + slamK * 0.03)
      // Glow ring behind the face.
      ctx.fillStyle = `rgba(${BLUE}, ${0.05 * glow * fade})`
      ctx.beginPath()
      ctx.arc(cx, cy, clockR * 1.25, 0, TAU)
      ctx.fill()
      drawClockFace(
        ctx,
        cx,
        cy,
        clockR,
        0,
        handAngle,
        handAngle * 0.3,
        (0.3 + glow * 0.4) * fade,
        'gold',
      )
      // The counting numeral in the middle (seconds elapsed while idle).
      if (phase === 'in') {
        drawNumeral(ctx, cx, cy + clockR + 34, String(idleSeconds.current), 30, 0, (0.4 + glow * 0.5) * fade, 'silver')
      }

      // Flying clock/gear fragments (slam bursts + the final shatter).
      for (let i = fragments.length - 1; i >= 0; i--) {
        const f = fragments[i]!
        f.life += dt * 1000
        if (f.life >= f.maxLife) {
          fragments.splice(i, 1)
          continue
        }
        f.vy += 420 * dt
        f.x += f.vx * dt
        f.y += f.vy * dt
        f.rot += f.rotSpeed * dt
        const a = (1 - f.life / f.maxLife) * 0.8 * fade
        if (f.gear) {
          drawGear(ctx, f.x, f.y, f.size, 8, f.rot, a, 'silver')
        } else {
          ctx.save()
          ctx.translate(f.x, f.y)
          ctx.rotate(f.rot)
          ctx.strokeStyle = `rgba(${SILVER}, ${a})`
          ctx.lineWidth = 2
          ctx.strokeRect(-f.size / 2, -f.size / 2, f.size, f.size)
          ctx.restore()
        }
      }

      if (fade <= 0 && !activeRef.current && fragments.length === 0) {
        ctx.clearRect(0, 0, W, H)
        wrap.classList.remove('father-time--expiring', 'father-time--slam')
        idleSeconds.current = 0
        raf = 0
        return
      }
      raf = requestAnimationFrame(step)
      void t
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
    if (active) {
      idleSeconds.current = 0
      startRef.current()
    }
  }, [active])

  return (
    <div ref={wrapRef} className="father-time" aria-hidden="true">
      <canvas ref={canvasRef} className="father-time__canvas" />
      <div className="father-time__age" />
    </div>
  )
}
