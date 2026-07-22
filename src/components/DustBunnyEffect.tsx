import { useEffect, useRef } from 'react'
import { LuRabbit } from 'react-icons/lu'
import { onGameEvents } from '../game/gameEvents'

// One Dust Bunny's full sequence for a single target (Nature's Dust Bunnies).
// Self-contained, procedurally animated via requestAnimationFrame with imperative
// SVG updates (no per-frame React re-render). Modular phases:
//
//   • travel  — the bunny HOPS from the caster to its target on a bouncy,
//     slightly chaotic arc (varied hop height/count/rotation, occasional
//     stumble), shedding little dust puffs on each landing. No damage yet.
//   • fight   — on arrival it dives into a cartoon brawl CLOUD that never sits
//     still: it squashes, stretches, wobbles, and rotates while dust escapes and
//     comedic bits (the rabbit, spinning stars) pop out for a split second.
//   • hit     — each damage tick compresses the cloud and throws an extra burst
//     of dust + stars, then it resumes churning.
//   • expire  — the cloud settles and shrinks, the bunny pops back out dazed,
//     shakes off, and hops away into a final puff.
//
// Coordinates are the battlefield's 1000×1000 SVG space (from `positionOf`).

interface Vec2 {
  x: number
  y: number
}

const DUST = '#d0c8b6'
const FUR = '#b7ab93'
const BUNNY = '#c4b89e'
const STAR = '#ffe27a'
const N_PARTICLES = 14

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  r: number
  active: boolean
}

/** Points of a small 5-point star centered on origin (for the pop-out sparkles). */
function starPoints(r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    pts.push(`${(Math.cos(a) * rad).toFixed(1)},${(Math.sin(a) * rad).toFixed(1)}`)
  }
  return pts.join(' ')
}

export function DustBunnyEffect({
  from,
  to,
  targetId,
  expiring,
  onDone,
}: {
  from: Vec2
  to: Vec2
  targetId: string
  expiring: boolean
  onDone: () => void
}) {
  const rootRef = useRef<SVGGElement>(null)
  const cloudRef = useRef<SVGGElement>(null)
  const bunnyRef = useRef<SVGGElement>(null)
  const popRef = useRef<SVGGElement>(null)
  const popRabbitRef = useRef<SVGGElement>(null)
  const popStarRef = useRef<SVGGElement>(null)
  const partRefs = useRef<Array<SVGCircleElement | null>>([])
  const expiringRef = useRef(expiring)
  expiringRef.current = expiring
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    const rng = Math.random
    const travelMs = 560 + rng() * 180
    const hops = 3 + Math.floor(rng() * 3)
    const hopHeight = 42 + rng() * 46
    const seed = rng() * 1000
    const stumbleAt = 0.35 + rng() * 0.4 // fraction of travel with a wobble

    let phase: 'travel' | 'fight' | 'expire' = 'travel'
    let t = 0 // ms in the current phase
    let hit = 0 // damage-pulse 0..1, decays
    let lastHop = -1
    let popTimer = 400 + rng() * 300
    let popShown = 0 // ms remaining on a pop-out
    let poppedRabbit = false
    let expireDone = false

    const parts: Particle[] = Array.from({ length: N_PARTICLES }, () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      age: 0,
      life: 0,
      r: 3,
      active: false,
    }))

    const spawnDust = (x: number, y: number, spread: number, up: number, big = 1) => {
      const p = parts.find((q) => !q.active)
      if (!p) return
      const a = rng() * Math.PI * 2
      const spd = spread * (0.3 + rng() * 0.7)
      p.x = x
      p.y = y
      p.vx = Math.cos(a) * spd
      p.vy = Math.sin(a) * spd - up
      p.age = 0
      p.life = 420 + rng() * 380
      p.r = (3 + rng() * 4) * big
      p.active = true
    }

    // Damage ticks pulse the fight (only once the bunny has arrived).
    const unsubscribe = onGameEvents((events) => {
      if (phase !== 'fight') return
      for (const e of events) {
        if (
          e.type === 'damage' &&
          (e as { targetId?: string }).targetId === targetId &&
          String((e as { cause?: string }).cause ?? '').startsWith('status:dustBunnies')
        ) {
          hit = 1
        }
      }
    })

    const setXf = (el: SVGGElement | null, xf: string) => el?.setAttribute('transform', xf)

    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      t += dt * 1000
      const time = now / 1000
      hit = Math.max(0, hit - dt * 3.5)

      // --- position + phase --------------------------------------------------
      let cx = to.x
      let cy = to.y
      if (phase === 'travel') {
        const p = Math.min(1, t / travelMs)
        const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2 // easeInOut
        cx = from.x + (to.x - from.x) * e
        cy = from.y + (to.y - from.y) * e
        const hopPhase = (p * hops) % 1
        const hopIdx = Math.floor(p * hops)
        // A stumble: one hop is stunted + spins.
        const stumble = Math.abs(p - stumbleAt) < 0.06
        const h = Math.sin(hopPhase * Math.PI) * hopHeight * (stumble ? 0.35 : 1)
        cy -= h
        const spin = stumble ? p * 900 : Math.sin(p * hops * Math.PI * 2 + seed) * 12
        setXf(bunnyRef.current, `rotate(${spin.toFixed(1)})`)
        if (hopIdx !== lastHop) {
          lastHop = hopIdx
          spawnDust(cx, cy + hopHeight * 0.15 + 10, 60, 5) // puff at each landing
          if (rng() < 0.5) spawnDust(cx, cy, 30, 20, 0.6) // loose fur
        }
        if (p >= 1) {
          phase = 'fight'
          t = 0
          spawnDust(cx, cy, 120, 30, 1.4) // poof on arrival
          spawnDust(cx, cy, 120, 30, 1.4)
        }
      }
      setXf(rootRef.current, `translate(${cx.toFixed(1)} ${cy.toFixed(1)})`)

      // --- bunny vs cloud visibility ----------------------------------------
      const traveling = phase === 'travel'
      if (bunnyRef.current) bunnyRef.current.style.opacity = traveling ? '1' : '0'

      // --- fight cloud -------------------------------------------------------
      if (phase === 'fight' || phase === 'expire') {
        let intensity = 1
        let baseScale = 1
        if (phase === 'expire') {
          const ep = Math.min(1, t / 1500)
          intensity = Math.max(0, 1 - ep / 0.5) // churn dies over first half
          baseScale = 1 - 0.55 * ep
        }
        // Churn: squash/stretch + wobble + rotate, compressed on a hit.
        const wob = Math.sin(time * 14 + seed) * 0.14 * intensity
        const squash = 1 - hit * 0.35
        const sx = (baseScale + wob) * squash
        const sy = (baseScale - wob) * (1 + hit * 0.3)
        const rot = Math.sin(time * 6 + seed) * 8 * intensity
        const puff = 1 + Math.sin(time * 22 + seed) * 0.05 * intensity
        setXf(cloudRef.current, `scale(${(sx * puff).toFixed(3)} ${(sy * puff).toFixed(3)}) rotate(${rot.toFixed(1)})`)
        if (cloudRef.current) cloudRef.current.style.opacity = String(0.9 * (phase === 'expire' ? 1 - Math.min(1, t / 1500) : 1))

        // Continuous escaping dust + fur while fighting.
        if (rng() < 0.35 * intensity) spawnDust(0, -8, 40, 22, 0.8)
        // Hit: extra burst + stars.
        if (hit > 0.85) {
          for (let i = 0; i < 5; i++) spawnDust(0, 0, 130, 30, 1.1)
        }

        // Comedic pop-outs (rabbit / spinning star) — a split second each.
        popTimer -= dt * 1000
        if (popShown > 0) {
          popShown -= dt * 1000
          if (popShown <= 0 && popRef.current) popRef.current.style.opacity = '0'
        } else if (popTimer <= 0 && phase === 'fight' && intensity > 0.5) {
          popTimer = 350 + rng() * 500
          popShown = 130 + rng() * 90
          poppedRabbit = rng() < 0.45
          const ang = rng() * Math.PI * 2
          const dist = 34 + rng() * 16
          const px = Math.cos(ang) * dist
          const py = Math.sin(ang) * dist - 6
          if (popRef.current) {
            popRef.current.style.opacity = '1'
            setXf(popRef.current, `translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${(rng() * 60 - 30).toFixed(1)})`)
          }
          if (popRabbitRef.current) popRabbitRef.current.style.opacity = poppedRabbit ? '1' : '0'
          if (popStarRef.current) popStarRef.current.style.opacity = poppedRabbit ? '0' : '1'
        }

        // Expiration finale: bunny pops out, dazed shake, hops away.
        if (phase === 'expire') {
          const ep = t / 1500
          if (ep > 0.5 && bunnyRef.current) {
            bunnyRef.current.style.opacity = '1'
            const shake = ep < 0.78 ? Math.sin(time * 40) * 8 : 0 // dazed shake
            const hop = ep > 0.78 ? (ep - 0.78) / 0.22 : 0 // hop away + fade
            const bx = hop * 90 * (from.x < to.x ? 1 : -1)
            const by = -Math.sin(hop * Math.PI) * 40
            setXf(bunnyRef.current, `translate(${bx.toFixed(1)} ${by.toFixed(1)}) rotate(${shake.toFixed(1)})`)
            bunnyRef.current.style.opacity = String(1 - hop)
            if (hop > 0.55 && !expireDone) {
              expireDone = true
              spawnDust(bx, by, 70, 10, 1.2) // final puff
            }
          }
          if (ep >= 1) {
            // Finish once particles have drained too.
            if (!parts.some((q) => q.active)) {
              cancelAnimationFrame(raf)
              onDoneRef.current()
              return
            }
          }
        } else if (expiringRef.current) {
          phase = 'expire'
          t = 0
        }
      }

      // --- particles ---------------------------------------------------------
      // Travel particles are world-space (root moves); fight particles are local
      // to the cloud (root is parked at the target), so both just live under root.
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i]!
        const el = partRefs.current[i]
        if (!el) continue
        if (!p.active) {
          el.style.opacity = '0'
          continue
        }
        p.age += dt * 1000
        const lf = p.age / p.life
        if (lf >= 1) {
          p.active = false
          el.style.opacity = '0'
          continue
        }
        p.vy += 60 * dt // gentle settle
        p.x += p.vx * dt
        p.y += p.vy * dt
        // In travel the puffs are dropped in world space; convert to root-local.
        const localX = phase === 'travel' ? p.x - to.x : p.x
        const localY = phase === 'travel' ? p.y - to.y : p.y
        el.setAttribute('cx', localX.toFixed(1))
        el.setAttribute('cy', localY.toFixed(1))
        el.setAttribute('r', (p.r * (1 + lf * 0.6)).toFixed(1))
        el.style.opacity = String((1 - lf) * 0.6)
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      unsubscribe()
      cancelAnimationFrame(raf)
    }
    // Intentionally run once; from/to/targetId are fixed for a given effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <g ref={rootRef}>
      {/* Escaping dust + fur (root-local). */}
      {Array.from({ length: N_PARTICLES }, (_, i) => (
        <circle
          key={i}
          ref={(el) => {
            partRefs.current[i] = el
          }}
          r={3}
          fill={i % 4 === 0 ? FUR : DUST}
          style={{ opacity: 0 }}
        />
      ))}

      {/* The churning brawl cloud (a few overlapping dust blobs). */}
    <g ref={cloudRef} style={{ opacity: 0 }}>
      <ellipse cx={-20} cy={6} rx={45} ry={36} fill={DUST} opacity={1} />
      <ellipse cx={26} cy={-4} rx={42} ry={39} fill={DUST} opacity={1} />
      <ellipse cx={0} cy={-24} rx={39} ry={33} fill="#e2dccd" opacity={0.9} />
      <ellipse cx={6} cy={20} rx={45} ry={30} fill={FUR} opacity={0.9} />
    </g>

      {/* Brief comedic pop-outs (rabbit / spinning star). */}
      <g ref={popRef} style={{ opacity: 0 }}>
        <g ref={popRabbitRef} style={{ opacity: 0 }}>
          <LuRabbit size={30} x={-15} y={-15} color={BUNNY} />
        </g>
        <g ref={popStarRef} style={{ opacity: 0 }}>
          <polygon points={starPoints(13)} fill={STAR} />
        </g>
      </g>

      {/* The hopping bunny (travel) + the one that pops out dazed (expire). */}
      <g ref={bunnyRef}>
        <LuRabbit size={40} x={-20} y={-20} color={BUNNY} />
      </g>
    </g>
  )
}
