import { useEffect, useRef } from 'react'
import { FaHeart } from 'react-icons/fa'
import { GiButterfly } from 'react-icons/gi'

// Cupid's Arrow's "infatuated" mark (Love kingdom). While active, the affected
// castle visibly appears enchanted — gentle, warm, a little unsettling under
// the charm. Renders in the castle's local SVG space (mirrors
// `OrionsBeltRing`/`NaturalTerrainRing`'s architecture: one imperative rAF
// loop, no per-frame React re-render), but deliberately lighter/gentler than
// Orion's Belt's defensive formation — this is ambience, not a structure.
// Modules:
//
//   • heart particles / flower petals / pink shimmer — a pooled ambient
//     particle system (drifting hearts, petals, soft pink dust).
//   • orbiting hearts + ribbons — a few real heart icons and thin glowing
//     ribbon streaks loosely orbit the castle, independently paced.
//   • occasional butterflies — a butterfly drifts across every few seconds.
//   • warm shimmering glow — a slow, soft pulsing halo.
//   • activation sequence — everything blooms in from the impact point.
//   • expiration sequence — the mark fades: orbiting elements drift outward
//     and dissolve, particles thin out, the glow relaxes away.

const HEARTS = 3 // small orbiting heart icons
const RIBBONS = 2 // orbiting ribbon streaks
const ORBIT_R = 58
const ACTIVATE_S = 0.6
const DEACTIVATE_S = 1.0
const POOL = 26

const HEART = '#ff6fa8'
const PETAL = '#ffd1e3'
const DUST = '#fff0f6'
const RIBBON = '#ff4d8d'
const GLOW = '#ff8fc0'

const easeOut = (t: number) => 1 - (1 - t) * (1 - t)

type Kind = 'heart' | 'petal' | 'dust'

interface Particle {
  slot: number
  kind: Kind
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  r: number
  color: string
}

export function InfatuatedAura({ active, onExpired }: { active: boolean; onExpired: () => void }) {
  const activeRef = useRef(active)
  activeRef.current = active
  const onExpiredRef = useRef(onExpired)
  onExpiredRef.current = onExpired

  const heartRefs = useRef<(SVGGElement | null)[]>([])
  const ribbonRefs = useRef<(SVGEllipseElement | null)[]>([])
  const butterflyRef = useRef<SVGGElement | null>(null)
  const glowRef = useRef<SVGCircleElement | null>(null)
  const partRefs = useRef<(SVGCircleElement | null)[]>([])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let t = 0
    let phase: 'act' | 'idle' | 'deact' = 'act'
    let bloom = 0
    let dissolve = 0
    let spawnDebt = 0
    let nextButterfly = 2 + Math.random() * 3
    let butterflyT = -1
    let butterflyDir = { x: 1, y: 0 }
    let butterflyStart = { x: 0, y: 0 }

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

    const spawnAmbient = () => {
      const roll = rng()
      if (roll < 0.4) {
        const a = rng() * Math.PI * 2
        spawn({ kind: 'heart', x: Math.cos(a) * ORBIT_R * 0.7, y: Math.sin(a) * ORBIT_R * 0.5, vx: (rng() * 2 - 1) * 6, vy: -(8 + rng() * 10), life: 1.6 + rng() * 1.2, r: 2 + rng() * 1.6, color: HEART })
      } else if (roll < 0.75) {
        spawn({ kind: 'petal', x: (rng() * 2 - 1) * ORBIT_R, y: -ORBIT_R * 0.6 + (rng() * 2 - 1) * 10, vx: (rng() * 2 - 1) * 10, vy: 6 + rng() * 12, life: 1.8 + rng() * 1.4, r: 2.4 + rng() * 2, color: PETAL })
      } else {
        const a = rng() * Math.PI * 2
        spawn({ kind: 'dust', x: Math.cos(a) * ORBIT_R * 0.9, y: Math.sin(a) * ORBIT_R * 0.6, vx: (rng() * 2 - 1) * 8, vy: (rng() * 2 - 1) * 8, life: 1.2 + rng() * 1, r: 1.2 + rng() * 1.2, color: DUST })
      }
    }

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      t += dt

      if (!activeRef.current && phase !== 'deact') {
        phase = 'deact'
        dissolve = 0
      }
      if (phase === 'act') {
        bloom = Math.min(1, bloom + dt / ACTIVATE_S)
        if (bloom >= 1) phase = 'idle'
      } else if (phase === 'deact') {
        dissolve = Math.min(1, dissolve + dt / DEACTIVATE_S)
      }

      const envelope = phase === 'act' ? easeOut(bloom) : phase === 'deact' ? Math.max(0, 1 - dissolve) : 1
      const driftOut = phase === 'deact' ? dissolve * 26 : 0

      // Orbiting hearts.
      for (let i = 0; i < HEARTS; i++) {
        const g = heartRefs.current[i]
        if (!g) continue
        const speed = 0.5 + i * 0.15
        const a = t * speed + (i / HEARTS) * Math.PI * 2
        const r = ORBIT_R * (0.75 + 0.12 * i) + driftOut
        const x = Math.cos(a) * r
        const y = Math.sin(a) * r * 0.55 - Math.sin(t * 1.3 + i) * 4
        const sc = 0.55 * envelope
        g.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${sc.toFixed(3)})`)
        g.setAttribute('opacity', (0.75 * envelope).toFixed(3))
      }

      // Orbiting ribbon streaks (thin ellipses, additive-feeling via low fill + stroke).
      for (let i = 0; i < RIBBONS; i++) {
        const el = ribbonRefs.current[i]
        if (!el) continue
        const speed = -0.3 - i * 0.1
        const a = t * speed + (i / RIBBONS) * Math.PI * 2
        const r = ORBIT_R * 1.05 + driftOut
        const x = Math.cos(a) * r
        const y = Math.sin(a) * r * 0.5
        el.setAttribute('cx', x.toFixed(2))
        el.setAttribute('cy', y.toFixed(2))
        el.setAttribute('transform', `rotate(${((a * 180) / Math.PI).toFixed(1)} ${x.toFixed(2)} ${y.toFixed(2)})`)
        el.setAttribute('opacity', (0.3 * envelope).toFixed(3))
      }

      // Warm shimmering glow, slow pulse.
      if (glowRef.current) {
        const pulse = 1 + 0.08 * Math.sin(t * 0.9)
        glowRef.current.setAttribute('r', (ORBIT_R * 0.9 * pulse).toFixed(2))
        glowRef.current.setAttribute('opacity', (0.1 * envelope).toFixed(3))
      }

      // Occasional butterfly drifting across.
      if (phase !== 'deact') {
        if (butterflyT < 0) {
          nextButterfly -= dt
          if (nextButterfly <= 0) {
            butterflyT = 0
            const a = rng() * Math.PI * 2
            butterflyStart = { x: Math.cos(a) * ORBIT_R * 1.3, y: Math.sin(a) * ORBIT_R * 0.8 }
            butterflyDir = { x: -Math.cos(a), y: -Math.sin(a) * 0.6 }
            nextButterfly = 4 + rng() * 4
          }
        } else {
          butterflyT += dt
          const bt = butterflyT / 1.8
          if (bt >= 1) {
            butterflyT = -1
            butterflyRef.current?.setAttribute('opacity', '0')
          } else if (butterflyRef.current) {
            const x = butterflyStart.x + butterflyDir.x * ORBIT_R * 1.8 * bt
            const y = butterflyStart.y + butterflyDir.y * ORBIT_R * 1.8 * bt + Math.sin(bt * Math.PI * 4) * 8
            const flap = 0.7 + 0.3 * Math.sin(t * 14)
            butterflyRef.current.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${flap.toFixed(2)})`)
            butterflyRef.current.setAttribute('opacity', (0.85 * Math.sin(bt * Math.PI)).toFixed(3))
          }
        }
      } else if (butterflyRef.current) {
        butterflyRef.current.setAttribute('opacity', '0')
      }

      // Ambient particles.
      if (phase !== 'deact') {
        spawnDebt += dt * 7
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
        p.x += p.vx * dt
        p.y += p.vy * dt
        const el = partRefs.current[p.slot]
        if (el) {
          const a = Math.sin(lf * Math.PI)
          el.setAttribute('opacity', (a * envelope).toFixed(3))
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

  return (
    <g className="kingdom-site__infatuated" data-testid="infatuated-aura" aria-hidden="true">
      <circle ref={glowRef} cx={0} cy={0} r={0} fill={GLOW} opacity={0} />
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
      {Array.from({ length: RIBBONS }).map((_, i) => (
        <ellipse
          key={`r${i}`}
          ref={(el) => {
            ribbonRefs.current[i] = el
          }}
          rx={14}
          ry={3}
          fill="none"
          stroke={RIBBON}
          strokeWidth={2}
          opacity={0}
        />
      ))}
      {Array.from({ length: HEARTS }).map((_, i) => (
        <g
          key={`h${i}`}
          ref={(el) => {
            heartRefs.current[i] = el
          }}
          opacity={0}
        >
          <FaHeart size={16} x={-8} y={-8} color={HEART} />
        </g>
      ))}
      <g ref={butterflyRef} opacity={0}>
        <GiButterfly size={14} x={-7} y={-7} color={PETAL} />
      </g>
    </g>
  )
}
