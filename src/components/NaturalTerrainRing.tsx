import { useEffect, useRef } from 'react'
import { CiMountain1 } from 'react-icons/ci'

// Natural Terrain (Earth passive, Epic 9). While the Earth kingdom carries the
// `naturalTerrain` status, a protective ring of glowing stone "mountain
// guardians" (the CiMountain1 icon reforged as a magical Earth emblem) slowly
// orbits its castle — calm and steadfast, not energetic. Rendered in the
// castle's local SVG space (a `<g>` the caller positions on the castle), driven
// by one rAF loop with imperative refs (no per-frame React re-render), so it can
// stay active for long periods cheaply. Organized into small modules:
//
//   • mountain renderer   — each guardian = soft earthy glow + a golden edge
//     highlight under a slate/stone icon.
//   • orbital controller   — evenly-spaced icons rotate slowly on an elliptical
//     (ground-plane) orbit, gently bobbing up and down (enchanted guardians).
//   • glow controller       — each guardian gently pulses; once per revolution
//     one or two briefly BRIGHTEN and burst dust + stone fragments.
//   • stone/dust particles  — floating pebbles, falling dust, drifting moss,
//     small fragments orbiting between the icons, dirt rising and settling.
//   • activation sequence   — fragments rise from the ground and assemble into
//     the glowing mountains, taking their orbit positions as dust settles.
//   • deactivation sequence — the rotation slows, the icons crack into fragments,
//     crumble to dust, sink back into the ground, and the particles fade.
//
// Colours are fixed earthy tones (it's always the Earth kingdom): slate,
// sandstone, moss, with faint gold in the carved edges.

const N = 6 // guardians in the ring
const ORBIT_RX = 104 // horizontal orbit radius (surrounds the castle)
const ORBIT_RY = 46 // vertical radius — a flat, ground-plane ellipse
const SIZE = 30 // mountain icon size (world units)
const ORBIT_SEC = 18 // seconds per revolution — slow + calm
const BOB = 6 // vertical bob amplitude
const RING_LIFT = -8 // raise the ring's centre slightly above the castle base
const GROUND_Y = 44 // where guardians rise from / sink back into
const ACTIVATE_S = 1.0
const DEACTIVATE_S = 1.2
const POOL = 34 // ambient particle pool

const SLATE = '#6b7280'
const GOLD = '#e8c66a'
const GLOW = '#a8946a'
const DUST = '#bfae8f'
const MOSS = '#7a8f5a'
const ROCK = '#8a7c66'

const easeOut = (t: number) => 1 - (1 - t) * (1 - t)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

type Kind = 'pebble' | 'dust' | 'leaf' | 'fragment' | 'burstRock' | 'burstDust'

interface Particle {
  slot: number
  kind: Kind
  x: number
  y: number
  vx: number
  vy: number
  gravity: number
  sway: number
  swayF: number
  phase: number
  age: number
  life: number
  r: number
  color: string
  orbit: boolean
  angle: number
  angVel: number
  radius: number
}

export function NaturalTerrainRing({ active, onExpired }: { active: boolean; onExpired: () => void }) {
  const activeRef = useRef(active)
  activeRef.current = active
  const onExpiredRef = useRef(onExpired)
  onExpiredRef.current = onExpired

  const mtnRefs = useRef<(SVGGElement | null)[]>([])
  const glowRefs = useRef<(SVGGElement | null)[]>([])
  const partRefs = useRef<(SVGCircleElement | null)[]>([])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let t = 0
    let angle = 0
    let lastRevAngle = 0
    let phase: 'act' | 'idle' | 'deact' = 'act'
    let assemble = 0
    let dissolve = 0
    let crumbled = false
    let spawnDebt = 0
    const flash = new Array<number>(N).fill(0)

    const particles: Particle[] = []
    const freeSlots: number[] = Array.from({ length: POOL }, (_, i) => i)
    const rng = Math.random

    const setP = (p: Particle) => {
      const el = partRefs.current[p.slot]
      if (!el) return
      el.setAttribute('cx', String(p.x))
      el.setAttribute('cy', String(p.y))
      el.setAttribute('r', String(p.r))
      el.setAttribute('fill', p.color)
    }
    const hideSlot = (slot: number) => {
      const el = partRefs.current[slot]
      if (el) el.setAttribute('opacity', '0')
    }
    const spawn = (p: Omit<Particle, 'slot' | 'age'>) => {
      const slot = freeSlots.pop()
      if (slot === undefined) return
      particles.push({ ...p, slot, age: 0 })
    }

    // Guardian orbit position (before per-guardian assemble/dissolve offset).
    const orbitPos = (i: number) => {
      const a = angle + (i / N) * Math.PI * 2
      const depth = (Math.sin(a) + 1) / 2 // 0 = back, 1 = front
      return {
        x: Math.cos(a) * ORBIT_RX,
        y: RING_LIFT + Math.sin(a) * ORBIT_RY - Math.sin(t * 0.9 + i) * BOB,
        depth,
        a,
      }
    }

    const burstAt = (x: number, y: number, rocks: number, dusts: number) => {
      for (let k = 0; k < rocks; k++) {
        const a = rng() * Math.PI * 2
        const s = 40 + rng() * 90
        spawn({ kind: 'burstRock', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, gravity: 220, sway: 0, swayF: 0, phase: 0, life: 0.6 + rng() * 0.4, r: 1.5 + rng() * 1.8, color: ROCK, orbit: false, angle: 0, angVel: 0, radius: 0 })
      }
      for (let k = 0; k < dusts; k++) {
        const a = rng() * Math.PI * 2
        const s = 20 + rng() * 50
        spawn({ kind: 'burstDust', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, gravity: -10, sway: 0, swayF: 0, phase: 0, life: 0.7 + rng() * 0.5, r: 3 + rng() * 3, color: DUST, orbit: false, angle: 0, angVel: 0, radius: 0 })
      }
    }

    const spawnAmbient = () => {
      const roll = rng()
      if (roll < 0.4) {
        // Floating pebble drifting slowly around the ring.
        const a = rng() * Math.PI * 2
        spawn({ kind: 'pebble', x: Math.cos(a) * ORBIT_RX * 0.9, y: RING_LIFT + Math.sin(a) * ORBIT_RY * 0.9, vx: (rng() * 2 - 1) * 6, vy: -(4 + rng() * 8), gravity: 3, sway: 4, swayF: 1 + rng(), phase: rng() * 6, life: 2.2 + rng() * 1.6, r: 1.4 + rng() * 1.4, color: ROCK, orbit: false, angle: 0, angVel: 0, radius: 0 })
      } else if (roll < 0.68) {
        // Falling dust settling around the castle base.
        spawn({ kind: 'dust', x: (rng() * 2 - 1) * ORBIT_RX, y: RING_LIFT - ORBIT_RY * 0.4 + (rng() * 2 - 1) * 20, vx: (rng() * 2 - 1) * 8, vy: 10 + rng() * 18, gravity: 26, sway: 3, swayF: 2 + rng(), phase: rng() * 6, life: 1.6 + rng() * 1.2, r: 1.6 + rng() * 2, color: DUST, orbit: false, angle: 0, angVel: 0, radius: 0 })
      } else if (roll < 0.82) {
        // A drifting leaf / bit of moss.
        spawn({ kind: 'leaf', x: (rng() * 2 - 1) * ORBIT_RX * 0.8, y: RING_LIFT - ORBIT_RY + (rng() * 2 - 1) * 10, vx: (rng() * 2 - 1) * 10, vy: 8 + rng() * 12, gravity: 4, sway: 12, swayF: 1.4 + rng(), phase: rng() * 6, life: 2.6 + rng() * 1.8, r: 2 + rng() * 1.6, color: MOSS, orbit: false, angle: 0, angVel: 0, radius: 0 })
      } else {
        // A small stone fragment orbiting BETWEEN the mountain icons.
        const radius = ORBIT_RX * (0.55 + rng() * 0.25)
        spawn({ kind: 'fragment', x: 0, y: 0, vx: 0, vy: 0, gravity: 0, sway: 0, swayF: 0, phase: 0, life: 3.5 + rng() * 2.5, r: 1.6 + rng() * 1.6, color: ROCK, orbit: true, angle: rng() * Math.PI * 2, angVel: (rng() < 0.5 ? 1 : -1) * (0.2 + rng() * 0.2), radius })
      }
    }

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      t += dt

      // Phase progression.
      if (!activeRef.current && phase !== 'deact') {
        phase = 'deact'
        dissolve = 0
      }
      if (phase === 'act') {
        assemble = Math.min(1, assemble + dt / ACTIVATE_S)
        if (assemble >= 1) phase = 'idle'
      } else if (phase === 'deact') {
        dissolve = Math.min(1, dissolve + dt / DEACTIVATE_S)
      }

      // Rotation: ramps up on activate, slows to a stop on deactivate.
      const spinScale = phase === 'act' ? easeOut(assemble) : phase === 'deact' ? 1 - dissolve : 1
      angle += (Math.PI * 2) / ORBIT_SEC * spinScale * dt

      // Once per revolution, brighten one or two guardians + a small burst.
      if (phase === 'idle' && angle - lastRevAngle >= Math.PI * 2) {
        lastRevAngle += Math.PI * 2
        const count = 1 + (rng() < 0.4 ? 1 : 0)
        for (let k = 0; k < count; k++) {
          const i = Math.floor(rng() * N)
          flash[i] = 1
          const pos = orbitPos(i)
          burstAt(pos.x, pos.y, 3, 4)
        }
      }

      // On deactivation start, crack every guardian apart once.
      if (phase === 'deact' && !crumbled) {
        crumbled = true
        for (let i = 0; i < N; i++) {
          const pos = orbitPos(i)
          burstAt(pos.x, pos.y, 5, 5)
        }
      }

      // --- Guardians: orbit + bob + assemble/dissolve + pulse/flash ----------
      for (let i = 0; i < N; i++) {
        const g = mtnRefs.current[i]
        const glow = glowRefs.current[i]
        if (!g || !glow) continue
        const pos = orbitPos(i)
        let sc = 0.8 + 0.2 * pos.depth // subtle depth (front bigger)
        let py = pos.y
        if (phase === 'act') {
          // Staggered rise from the ground into position.
          const e = easeOut(Math.min(1, Math.max(0, (assemble - (i / N) * 0.35) / 0.65)))
          sc *= e
          py = lerp(GROUND_Y, pos.y, e)
        } else if (phase === 'deact') {
          sc *= 1 - dissolve
          py = lerp(pos.y, GROUND_Y, dissolve)
        }
        g.setAttribute('transform', `translate(${pos.x} ${py}) scale(${sc.toFixed(3)})`)
        // Gentle pulse + per-revolution flash, dimmed by depth.
        const pulse = 0.45 + 0.22 * Math.sin(t * 0.8 + i * 1.1)
        const op = Math.min(1, (pulse + flash[i] * 0.9) * (0.6 + 0.4 * pos.depth) * (phase === 'deact' ? 1 - dissolve : 1))
        glow.setAttribute('opacity', op.toFixed(3))
        if (flash[i] > 0) flash[i] = Math.max(0, flash[i] - dt * 2)
      }

      // --- Ambient particles --------------------------------------------------
      if (phase !== 'deact') {
        spawnDebt += dt * 16
        while (spawnDebt >= 1) {
          spawnDebt -= 1
          spawnAmbient()
        }
      }
      for (let j = particles.length - 1; j >= 0; j--) {
        const p = particles[j]!
        p.age += dt
        const lf = p.age / p.life
        if (lf >= 1) {
          hideSlot(p.slot)
          freeSlots.push(p.slot)
          particles.splice(j, 1)
          continue
        }
        if (p.orbit) {
          p.angle += p.angVel * dt
          p.x = Math.cos(p.angle) * p.radius
          p.y = RING_LIFT + Math.sin(p.angle) * p.radius * (ORBIT_RY / ORBIT_RX) - Math.sin(t + p.angle) * 3
        } else {
          p.vy += p.gravity * dt
          p.x += (p.vx + Math.cos(t * p.swayF + p.phase) * p.sway) * dt
          p.y += p.vy * dt
        }
        const el = partRefs.current[p.slot]
        if (el) {
          // Fade out over life (dust/leaves fade in then out).
          const a = p.kind === 'dust' || p.kind === 'burstDust' ? Math.sin(lf * Math.PI) : 1 - lf
          el.setAttribute('opacity', (Math.max(0, a) * (phase === 'deact' ? 1 - dissolve : 1)).toFixed(3))
        }
        setP(p)
      }

      if (phase === 'deact' && dissolve >= 1) {
        raf = 0
        onExpiredRef.current()
        return
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => {
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // One reusable mountain guardian: soft glow discs + a golden edge highlight
  // under the slate stone icon.
  const guardian = (i: number) => (
    <g
      key={i}
      ref={(el) => {
        mtnRefs.current[i] = el
      }}
      transform="translate(0 44) scale(0)"
    >
      <g
        ref={(el) => {
          glowRefs.current[i] = el
        }}
        opacity="0"
      >
        <circle r={SIZE * 0.85} fill={GLOW} opacity={0.16} />
        <circle r={SIZE * 0.5} fill={GOLD} opacity={0.16} />
      </g>
      {/* Golden edge highlight offset behind the stone icon. */}
      <g opacity={0.55}>
        <CiMountain1 size={SIZE} x={-SIZE / 2 - 1} y={-SIZE / 2 - 1} color={GOLD} />
      </g>
      <CiMountain1 size={SIZE} x={-SIZE / 2} y={-SIZE / 2} color={SLATE} />
    </g>
  )

  return (
    <g className="kingdom-site__natural-terrain" data-testid="natural-terrain" aria-hidden="true">
      {/* Ambient particle pool (pebbles, dust, leaves, orbiting fragments). */}
      {Array.from({ length: POOL }).map((_, i) => (
        <circle
          key={`p${i}`}
          ref={(el) => {
            partRefs.current[i] = el
          }}
          r={0}
          opacity={0}
        />
      ))}
      {Array.from({ length: N }).map((_, i) => guardian(i))}
    </g>
  )
}
