import { useEffect, useRef } from 'react'
import { GiChainedHeart } from 'react-icons/gi'

// Love's "Love Galore" REVEAL aura (Love ultimate). The ultimate stays hidden
// while it silently converts damage into healing; the moment it reveals, this
// blooms over the castle: the ultimate's own icon rises above it, ringed by
// swirling pink ribbons that flutter and orbit while all incoming damage now
// reads as healing. Renders in the castle's local SVG space (mirrors
// InfatuatedAura/OrionsBeltRing: one imperative rAF loop, no per-frame React
// re-render). Mounts on reveal, fades out when the buff ends.
//
// Modules:
//   • swirling ribbons — several thin arcs orbit the castle at varied radii and
//     speeds, each fluttering (its curvature breathes) as it turns.
//   • floating ultimate icon — GiChainedHeart hovers above the castle, bobbing
//     and pulsing with a warm glow.
//   • soft radiant halo — a slow pink pulse behind it all.
//   • activation bloom / expiration fade — everything swells in, then drifts
//     outward and dissolves.

const RIBBONS = 30
const ORBIT_R = 60
const ICON_SIZE = 70
const ICON_RISE = 92 // how far above the castle centre the icon floats
const ACTIVATE_S = 0.7
const DEACTIVATE_S = 0.9

const RIBBON = '#ff4d8d'
const RIBBON_SOFT = '#ff8fc0'
const GLOW = '#ff6fa8'

const easeOut = (t: number) => 1 - (1 - t) * (1 - t)

export function LoveGaloreAura({ active, onExpired }: { active: boolean; onExpired: () => void }) {
  const activeRef = useRef(active)
  activeRef.current = active
  const onExpiredRef = useRef(onExpired)
  onExpiredRef.current = onExpired

  const ribbonRefs = useRef<(SVGPathElement | null)[]>([])
  const iconRef = useRef<SVGGElement | null>(null)
  const glowRef = useRef<SVGCircleElement | null>(null)

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let t = 0
    let phase: 'act' | 'idle' | 'deact' = 'act'
    let bloom = 0
    let dissolve = 0

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

      const envelope =
        phase === 'act' ? easeOut(bloom) : phase === 'deact' ? Math.max(0, 1 - dissolve) : 1
      const driftOut = phase === 'deact' ? dissolve * 30 : 0

      // Swirling, fluttering ribbons.
      for (let i = 0; i < RIBBONS; i++) {
        const el = ribbonRefs.current[i]
        if (!el) continue
        const dir = i % 2 === 0 ? 1 : -1
        const speed = (0.5 + (i % 3) * 0.18) * dir
        const a = t * speed + (i / RIBBONS) * Math.PI * 2
        const r = (ORBIT_R * (0.8 + 0.12 * (i % 3)) + driftOut) * (0.6 + 0.4 * envelope)
        const cx = Math.cos(a) * r
        const cy = Math.sin(a) * r * 0.55
        // A short arc whose bow flutters as it travels (the ribbon rippling).
        const len = 26 + (i % 3) * 6
        const flutter = Math.sin(t * 5 + i) * 9
        const ang = a + Math.PI / 2 // tangent to the orbit
        const dx = Math.cos(ang)
        const dy = Math.sin(ang) * 0.55
        const x1 = cx - dx * len
        const y1 = cy - dy * len
        const x2 = cx + dx * len
        const y2 = cy + dy * len
        // Control point pushed perpendicular to the chord for the ripple.
        const nx = -dy
        const ny = dx
        const cxp = cx + nx * flutter
        const cyp = cy + ny * flutter
        el.setAttribute('d', `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cxp.toFixed(1)} ${cyp.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`)
        el.setAttribute('opacity', (0.75 * envelope).toFixed(3))
        el.setAttribute('stroke', i % 2 === 0 ? RIBBON : RIBBON_SOFT)
      }

      // Soft radiant halo.
      if (glowRef.current) {
        const pulse = 1 + 0.1 * Math.sin(t * 1.4)
        glowRef.current.setAttribute('r', (ORBIT_R * 0.95 * pulse).toFixed(2))
        glowRef.current.setAttribute('opacity', (0.14 * envelope).toFixed(3))
      }

      // Floating ultimate icon: rises into place, then bobs + pulses.
      if (iconRef.current) {
        const rise = ICON_RISE * (0.5 + 0.5 * envelope) + driftOut
        const bob = Math.sin(t * 1.8) * 5
        const sc = (0.9 + 0.1 * Math.sin(t * 2.2)) * (0.4 + 0.6 * envelope)
        iconRef.current.setAttribute('transform', `translate(0 ${(-rise + bob).toFixed(2)}) scale(${sc.toFixed(3)})`)
        iconRef.current.setAttribute('opacity', envelope.toFixed(3))
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
    <g className="kingdom-site__love-galore" data-testid="love-galore-aura" aria-hidden="true">
      <circle ref={glowRef} cx={0} cy={0} r={0} fill={GLOW} opacity={0} />
      {Array.from({ length: RIBBONS }).map((_, i) => (
        <path
          key={`ribbon${i}`}
          ref={(el) => {
            ribbonRefs.current[i] = el
          }}
          fill="none"
          stroke={RIBBON}
          strokeWidth={3}
          strokeLinecap="round"
          opacity={0}
        />
      ))}
      <g ref={iconRef} opacity={0}>
        <GiChainedHeart size={ICON_SIZE} x={-ICON_SIZE / 2} y={-ICON_SIZE / 2} color={RIBBON} />
      </g>
    </g>
  )
}
