import { useEffect, useRef } from 'react'
import { GiAsteroid, GiMoon, GiFragmentedMeteor, GiCutDiamond, GiStoneSphere } from 'react-icons/gi'
import type { IconType } from 'react-icons'

// Orion's Belt (Space utility, `orionsBelt` status). While active, a miniature
// planetary system of orbiting celestial bodies surrounds the castle — the
// defensive formation whose gravity deflects incoming attacks (the actual
// deflection/MISS sequence is a separate PixiJS layer, `framework.
// deflectByOrionsBelt`, driven by `attackMissed`; this SVG layer is purely the
// persistent ambient formation, mirroring Earth's NaturalTerrainRing). Renders
// in the castle's local SVG space (a `<g>` the caller positions), driven by one
// rAF loop with imperative refs (no per-frame React re-render). Modules:
//
//   • orbital celestial system / asteroid generator — 7 bodies cycling through
//     5 body types (asteroid, moon, fragment, crystal, glowing rock), each with
//     its OWN size, icon, tint, glowing "mineral vein" dot(s), orbit ellipse
//     (radius/tilt/speed/phase all individually varied), and self-spin — a
//     miniature system, not a flat uniform ring.
//   • independent orbital controller — the whole formation slowly rotates
//     while each body ALSO spins on its own axis and gently wobbles its own
//     radius, so nothing reads as static or perfectly synchronized.
//   • cosmic atmosphere — floating dust, tiny orbiting twinkling stars, soft
//     nebula puffs, occasional streaking meteor fragments, and a slow, faint
//     pulsing lensing ring.
//   • activation sequence — the belt tears open at the castle and the bodies
//     fly OUTWARD from that point into their orbits (a "constellation" forming).
//   • orbital collapse sequence — orbits decay outward (bodies drift away into
//     deep space), each dissolving into a puff of stardust as it fades, while
//     the lensing ring relaxes away.

const N = 7 // celestial bodies in the formation
const BASE_RX = 108 // base horizontal orbit radius
const BASE_RY = 44 // base vertical radius (flat, ground-plane-ish ellipse)
const FORMATION_SEC = 22 // seconds per shared formation revolution
const ACTIVATE_S = 0.8
const DEACTIVATE_S = 1.6
const DRIFT_AWAY = 150 // how much the orbit radius grows while decaying away
const POOL = 30 // ambient particle pool

const ASTEROID = '#7a5a9e'
const MOON = '#c9b8ff'
const FRAGMENT = '#5b3aa6'
const CRYSTAL = '#9d6bff'
const GLOW_ROCK = '#8be3ff'
const VEIN = '#3ad0ff'
const DUST = '#5b3aa6'
const STAR = '#e6d8ff'
const NEBULA = '#6a2fd6'
const LENS = '#3ad0ff'

const BODY_ICONS: IconType[] = [GiAsteroid, GiMoon, GiFragmentedMeteor, GiCutDiamond, GiStoneSphere]
const BODY_COLORS = [ASTEROID, MOON, FRAGMENT, CRYSTAL, GLOW_ROCK]

const easeOut = (t: number) => 1 - (1 - t) * (1 - t)

interface Body {
  icon: IconType
  color: string
  size: number
  rx: number
  ry: number
  phase: number
  orbitSpeed: number // rad/sec, sign = direction
  spinSpeed: number // deg/sec, own-axis spin
  wobbleFreq: number
  wobbleAmp: number
  veinCount: number
}

type Kind = 'dust' | 'star' | 'nebula' | 'meteor' | 'stardust'

interface Particle {
  slot: number
  kind: Kind
  x: number
  y: number
  vx: number
  vy: number
  gravity: number
  age: number
  life: number
  r: number
  color: string
  orbit: boolean
  angle: number
  angVel: number
  radius: number
}

function makeBodies(): Body[] {
  const bodies: Body[] = []
  for (let i = 0; i < N; i++) {
    const t = i % BODY_ICONS.length
    bodies.push({
      icon: BODY_ICONS[t]!,
      color: BODY_COLORS[t]!,
      size: 16 + Math.random() * 16,
      rx: BASE_RX * (0.75 + Math.random() * 0.5),
      ry: BASE_RY * (0.7 + Math.random() * 0.6),
      phase: (i / N) * Math.PI * 2 + Math.random() * 0.3,
      orbitSpeed: (Math.random() < 0.15 ? -1 : 1) * (0.7 + Math.random() * 0.6),
      spinSpeed: (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 90),
      wobbleFreq: 0.4 + Math.random() * 0.6,
      wobbleAmp: 6 + Math.random() * 10,
      veinCount: 1 + Math.floor(Math.random() * 2),
    })
  }
  return bodies
}

export function OrionsBeltRing({ active, onExpired }: { active: boolean; onExpired: () => void }) {
  const activeRef = useRef(active)
  activeRef.current = active
  const onExpiredRef = useRef(onExpired)
  onExpiredRef.current = onExpired

  const bodiesRef = useRef<Body[] | null>(null)
  if (!bodiesRef.current) bodiesRef.current = makeBodies()

  const bodyRefs = useRef<(SVGGElement | null)[]>([])
  const iconRefs = useRef<(SVGGElement | null)[]>([])
  const veinRefs = useRef<(SVGGElement | null)[]>([])
  const partRefs = useRef<(SVGCircleElement | null)[]>([])
  const lensRef = useRef<SVGCircleElement | null>(null)

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let t = 0
    let angle = 0
    let phase: 'act' | 'idle' | 'deact' = 'act'
    let assemble = 0
    let dissolve = 0
    let dissolved = false
    let spawnDebt = 0
    const bodies = bodiesRef.current!

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

    // A body's orbit position (before assemble/dissolve radius scaling).
    const orbitPos = (b: Body, radiusScale: number) => {
      const a = angle * b.orbitSpeed + b.phase
      const wob = 1 + Math.sin(t * b.wobbleFreq + b.phase) * (b.wobbleAmp / BASE_RX)
      const rx = b.rx * radiusScale * wob
      const ry = b.ry * radiusScale * wob
      const depth = (Math.sin(a) + 1) / 2
      return { x: Math.cos(a) * rx, y: Math.sin(a) * ry, depth, a }
    }

    const dissolveBurst = (x: number, y: number, color: string) => {
      for (let k = 0; k < 6; k++) {
        const a = rng() * Math.PI * 2
        const s = 15 + rng() * 40
        spawn({ kind: 'stardust', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 10, gravity: -6, life: 0.8 + rng() * 0.6, r: 1.4 + rng() * 1.6, color, orbit: false, angle: 0, angVel: 0, radius: 0 })
      }
    }

    const spawnAmbient = () => {
      const roll = rng()
      if (roll < 0.3) {
        // Floating cosmic dust drifting through the formation.
        const a = rng() * Math.PI * 2
        spawn({ kind: 'dust', x: Math.cos(a) * BASE_RX * 1.1, y: Math.sin(a) * BASE_RY * 1.1, vx: (rng() * 2 - 1) * 6, vy: (rng() * 2 - 1) * 6, gravity: 0, life:2.4 + rng() * 1.6, r: 2 + rng() * 2.4, color: DUST, orbit: false, angle: 0, angVel: 0, radius: 0 })
      } else if (roll < 0.55) {
        // A tiny orbiting, twinkling star.
        const radius = BASE_RX * (0.4 + rng() * 0.3)
        spawn({ kind: 'star', x: 0, y: 0, vx: 0, vy: 0, gravity: 0, life:2 + rng() * 2, r: 1 + rng() * 1.2, color: STAR, orbit: true, angle: rng() * Math.PI * 2, angVel: (rng() < 0.5 ? 1 : -1) * (0.35 + rng() * 0.3), radius })
      } else if (roll < 0.78) {
        // A soft drifting nebula puff.
        spawn({ kind: 'nebula', x: (rng() * 2 - 1) * BASE_RX, y: (rng() * 2 - 1) * BASE_RY, vx: (rng() * 2 - 1) * 4, vy: -(3 + rng() * 5), gravity: 0, life:2.6 + rng() * 1.8, r: 8 + rng() * 8, color: NEBULA, orbit: false, angle: 0, angVel: 0, radius: 0 })
      } else {
        // An occasional meteor fragment streaking past.
        const a = rng() * Math.PI * 2
        spawn({ kind: 'meteor', x: Math.cos(a) * BASE_RX * 1.3, y: Math.sin(a) * BASE_RY * 1.3, vx: -Math.cos(a) * 60, vy: -Math.sin(a) * 60, gravity: 0, life:0.5 + rng() * 0.3, r: 1.6, color: GLOW_ROCK, orbit: false, angle: 0, angVel: 0, radius: 0 })
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
        assemble = Math.min(1, assemble + dt / ACTIVATE_S)
        if (assemble >= 1) phase = 'idle'
      } else if (phase === 'deact') {
        dissolve = Math.min(1, dissolve + dt / DEACTIVATE_S)
      }

      const spinScale = phase === 'act' ? easeOut(assemble) : phase === 'deact' ? 1 - dissolve * 0.6 : 1
      angle += (Math.PI * 2) / FORMATION_SEC * spinScale * dt

      if (phase === 'deact' && !dissolved && dissolve > 0.05) {
        dissolved = true
        for (const b of bodies) {
          const pos = orbitPos(b, 1)
          dissolveBurst(pos.x, pos.y, b.color)
        }
      }

      // --- Celestial bodies: orbit + self-spin + assemble/decay ------------
      for (let i = 0; i < N; i++) {
        const b = bodies[i]!
        const g = bodyRefs.current[i]
        const icon = iconRefs.current[i]
        const vein = veinRefs.current[i]
        if (!g || !icon) continue

        let radiusScale = 1
        let sc = 1 // full scale while idle; overridden below during act/deact
        if (phase === 'act') {
          const e = easeOut(Math.min(1, Math.max(0, (assemble - (i / N) * 0.3) / 0.7)))
          radiusScale = e
          sc = e
        } else if (phase === 'deact') {
          radiusScale = 1 + (DRIFT_AWAY / BASE_RX) * dissolve
          sc = Math.max(0, 1 - dissolve)
        }
        const pos = orbitPos(b, radiusScale)
        const depthScale = 0.75 + 0.35 * pos.depth
        const finalScale = sc * depthScale
        g.setAttribute('transform', `translate(${pos.x.toFixed(2)} ${pos.y.toFixed(2)}) scale(${finalScale.toFixed(3)})`)
        icon.setAttribute('transform', `rotate(${(t * b.spinSpeed).toFixed(1)}) translate(${-b.size / 2} ${-b.size / 2})`)
        icon.setAttribute('opacity', (0.55 + 0.45 * pos.depth).toFixed(3))
        if (vein) {
          const pulse = 0.35 + 0.35 * Math.sin(t * 1.6 + i * 1.7)
          vein.setAttribute('opacity', pulse.toFixed(3))
        }
      }

      // --- Lensing ring: a slow, faint, pulsing halo around the formation --
      if (lensRef.current) {
        const pulse = 1 + 0.06 * Math.sin(t * 0.5)
        const baseR = (BASE_RX + BASE_RY) * 0.62 * pulse
        const envelope = phase === 'act' ? easeOut(assemble) : phase === 'deact' ? Math.max(0, 1 - dissolve) : 1
        lensRef.current.setAttribute('r', String(baseR))
        lensRef.current.setAttribute('opacity', (0.14 * envelope).toFixed(3))
      }

      // --- Ambient cosmic atmosphere ----------------------------------------
      if (phase !== 'deact') {
        spawnDebt += dt * 10
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
          p.y = Math.sin(p.angle) * p.radius * (BASE_RY / BASE_RX)
        } else {
          p.vy += p.gravity * dt
          p.x += p.vx * dt
          p.y += p.vy * dt
        }
        const el = partRefs.current[p.slot]
        if (el) {
          const twinkle = p.kind === 'star' ? 0.5 + 0.5 * Math.sin(t * 6 + p.slot) : 1
          const a = (p.kind === 'nebula' || p.kind === 'dust' ? Math.sin(lf * Math.PI) : 1 - lf) * twinkle
          el.setAttribute('opacity', (Math.max(0, a) * (phase === 'deact' ? Math.max(0, 1 - dissolve) : 1)).toFixed(3))
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

  const bodies = bodiesRef.current!

  return (
    <g className="kingdom-site__orions-belt" data-testid="orions-belt-ring" aria-hidden="true">
      {/* Soft lensing halo behind everything. */}
      <circle ref={lensRef} cx={0} cy={0} r={0} fill="none" stroke={LENS} strokeWidth={2} opacity={0} />
      {/* Ambient particle pool (dust, twinkling stars, nebula, meteors, stardust). */}
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
      {bodies.map((b, i) => {
        const Icon = b.icon
        return (
          <g
            key={i}
            ref={(el) => {
              bodyRefs.current[i] = el
            }}
            transform="translate(0 0) scale(0)"
          >
            <g
              ref={(el) => {
                veinRefs.current[i] = el
              }}
              opacity={0}
            >
              <circle r={b.size * 0.5} fill={VEIN} opacity={0.22} />
            </g>
            <g
              ref={(el) => {
                iconRefs.current[i] = el
              }}
            >
              <Icon size={b.size} color={b.color} />
            </g>
          </g>
        )
      })}
    </g>
  )
}
