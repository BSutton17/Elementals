import { useEffect, useRef } from 'react'
import { FaHeart } from 'react-icons/fa'
import { onGameEvents } from '../game/gameEvents'
import type {
  DamageEvent,
  RawGameEvent,
  StatusAppliedEvent,
  StatusExpiredEvent,
} from '../game/events'

// Love's BFFS!!! persistent link (the `bffsLink` status). Draws the enchanted
// ribbon spanning the two linked castles for the whole duration — a swaying,
// pulsing connection with hearts travelling both directions. Lives INSIDE the
// battlefield's 1000×1000 SVG (a `<g>` the caller drops in with `positionOf`),
// so it shares the castles' coordinate space and letterboxes with the arena.
// One imperative rAF loop drives everything (no per-frame React re-render),
// mirroring the other status VFX layers. Modules:
//
//   • link tracker — pairs the two `bffsLink` statusApplied events (same
//     caster+tick) into a link; drops it when either end's status expires.
//   • ribbon renderer — a swaying quadratic-bezier path (glow under core) that
//     never sits perfectly straight; constantly pulses.
//   • heart traffic — hearts drift along the ribbon in both directions.
//   • shared-transfer flash — any damage on either endpoint flares the ribbon
//     and sends a bright pulse across it; any status applied to an endpoint
//     briefly tints the ribbon that status's colour before it relaxes back.
//   • unravel — when the link ends the ribbon fades over a short window.

const MAX_LINKS = 4
const HEARTS_PER = 4
const SWAY_AMP = 26 // perpendicular sway amplitude (world units)
const FADE_MS = 500 // unravel time
const RIBBON = '#ff4d8d'
const GOLD = '#e8c66a'
const HEART = '#ff6fa8'

/** Status id → the colour the ribbon briefly takes when that status transfers. */
const STATUS_TINT: Record<string, string> = {
  burn: '#ff5a1e',
  frozen: '#8fe3ff',
  poison: '#6bd88a',
  corroded: '#9acd32',
  chillingRetribution: '#8fd0ff',
  infatuated: '#ff6fa8',
  scrambled: '#d9b25a',
  toxicGas: '#7fd96b',
}

interface LinkSlot {
  active: boolean
  a: string
  b: string
  seed: number
  flash: number // 0..1, decays — brightens on shared damage
  tint: string | null // transient status colour
  tintT: number // 0..1, decays
  fading: number // 0 = solid; >0 counts up to FADE_MS then frees
}

type Vec = { x: number; y: number }

export function BffsLinkLayer({
  positionOf,
}: {
  positionOf: (id: string) => { x: number; y: number } | undefined
}) {
  const posRef = useRef(positionOf)
  posRef.current = positionOf

  const glowRefs = useRef<(SVGPathElement | null)[]>([])
  const coreRefs = useRef<(SVGPathElement | null)[]>([])
  const heartRefs = useRef<(SVGGElement | null)[][]>([])

  const slotsRef = useRef<LinkSlot[]>(
    Array.from({ length: MAX_LINKS }, () => ({
      active: false, a: '', b: '', seed: 0, flash: 0, tint: null, tintT: 0, fading: 0,
    })),
  )

  // --- event tracking: activate / flash / tint / end links --------------------
  useEffect(() => {
    return onGameEvents((events: RawGameEvent[]) => {
      const slots = slotsRef.current

      // Pair the two bffsLink applications in this batch (same caster + tick).
      const pairs = new Map<string, string[]>()
      for (const e of events) {
        if (e.type !== 'statusApplied') continue
        const a = e as unknown as StatusAppliedEvent
        if (a.statusId !== 'bffsLink') continue
        const key = `${a.sourceId}:${a.tick}`
        const list = pairs.get(key) ?? []
        list.push(a.targetId)
        pairs.set(key, list)
      }
      for (const ids of pairs.values()) {
        if (ids.length < 2) continue
        const [a, b] = ids
        const existing = slots.find(
          (s) => s.active && ((s.a === a && s.b === b) || (s.a === b && s.b === a)),
        )
        const slot = existing ?? slots.find((s) => !s.active)
        if (!slot) continue
        slot.active = true
        slot.a = a!
        slot.b = b!
        slot.seed = Math.random() * Math.PI * 2
        slot.fading = 0
        slot.flash = 1 // the bond forming reads as a bright pulse
      }

      // Any status applied to an endpoint tints the ribbon that status's colour;
      // any damage on an endpoint flares it (shared-pain transfer).
      for (const e of events) {
        if (e.type === 'statusApplied') {
          const a = e as unknown as StatusAppliedEvent
          if (a.statusId === 'bffsLink') continue
          const tint = STATUS_TINT[a.statusId]
          if (!tint) continue
          for (const s of slots) {
            if (s.active && (s.a === a.targetId || s.b === a.targetId)) {
              s.tint = tint
              s.tintT = 1
              s.flash = Math.max(s.flash, 0.7)
            }
          }
        } else if (e.type === 'damage') {
          const d = e as unknown as DamageEvent
          for (const s of slots) {
            if (s.active && (s.a === d.targetId || s.b === d.targetId)) s.flash = 1
          }
        } else if (e.type === 'statusExpired') {
          const x = e as unknown as StatusExpiredEvent
          if (x.statusId !== 'bffsLink') continue
          for (const s of slots) {
            if (s.active && (s.a === x.playerId || s.b === x.playerId) && s.fading === 0) {
              s.fading = 0.0001 // begin the unravel
            }
          }
        }
      }
    })
  }, [])

  // --- render loop ------------------------------------------------------------
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let t = 0

    // Quadratic-bezier point + a heart-shaped-ish small marker position.
    const bezier = (p0: Vec, c: Vec, p1: Vec, u: number): Vec => {
      const mu = 1 - u
      return {
        x: mu * mu * p0.x + 2 * mu * u * c.x + u * u * p1.x,
        y: mu * mu * p0.y + 2 * mu * u * c.y + u * u * p1.y,
      }
    }

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      t += dt
      const pos = posRef.current

      for (let i = 0; i < MAX_LINKS; i++) {
        const s = slotsRef.current[i]!
        const glow = glowRefs.current[i]
        const core = coreRefs.current[i]
        const hearts = heartRefs.current[i] ?? []
        if (!glow || !core) continue

        const A = s.active ? pos(s.a) : undefined
        const B = s.active ? pos(s.b) : undefined
        if (!s.active || !A || !B) {
          glow.setAttribute('opacity', '0')
          core.setAttribute('opacity', '0')
          for (const h of hearts) h?.setAttribute('opacity', '0')
          continue
        }

        // Unravel: count up, then free the slot.
        let envelope = 1
        if (s.fading > 0) {
          s.fading += dt * 1000
          envelope = Math.max(0, 1 - s.fading / FADE_MS)
          if (s.fading >= FADE_MS) {
            s.active = false
            continue
          }
        }

        // Swaying control point: midpoint pushed perpendicular by a slow sine.
        const mx = (A.x + B.x) / 2
        const my = (A.y + B.y) / 2
        const dx = B.x - A.x
        const dy = B.y - A.y
        const len = Math.max(1, Math.hypot(dx, dy))
        const px = -dy / len
        const py = dx / len
        const sway = Math.sin(t * 1.4 + s.seed) * SWAY_AMP
        const cx = mx + px * sway
        const cy = my + py * sway
        const d = `M ${A.x.toFixed(1)} ${A.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${B.x.toFixed(1)} ${B.y.toFixed(1)}`

        const pulse = 0.75 + 0.25 * Math.sin(t * 3 + s.seed)
        const flash = s.flash
        if (s.flash > 0) s.flash = Math.max(0, s.flash - dt * 2.4)
        if (s.tintT > 0) s.tintT = Math.max(0, s.tintT - dt * 1.2)
        const coreColor = s.tint && s.tintT > 0.02 ? s.tint : RIBBON

        glow.setAttribute('d', d)
        glow.setAttribute('stroke', GOLD)
        glow.setAttribute('stroke-width', String(10 + flash * 14))
        glow.setAttribute('opacity', ((0.18 + flash * 0.35) * envelope).toFixed(3))

        core.setAttribute('d', d)
        core.setAttribute('stroke', coreColor)
        core.setAttribute('stroke-width', String(3 + flash * 4))
        core.setAttribute('opacity', ((0.55 * pulse + flash * 0.45) * envelope).toFixed(3))

        // Hearts drift along the ribbon, half each direction; a flash speeds the
        // damaged→partner transfer.
        for (let h = 0; h < hearts.length; h++) {
          const node = hearts[h]
          if (!node) continue
          const dir = h % 2 === 0 ? 1 : -1
          const speed = 0.12 + flash * 0.5
          let u = ((t * speed + h / hearts.length) % 1 + 1) % 1
          if (dir < 0) u = 1 - u
          const pt = bezier(A, { x: cx, y: cy }, B, u)
          const sc = (0.5 + 0.3 * Math.sin(t * 5 + h)) * envelope
          node.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)}) scale(${sc.toFixed(2)})`)
          node.setAttribute('opacity', ((0.7 + flash * 0.3) * envelope).toFixed(3))
        }
      }

      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => {
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <g className="battlefield__bffs-links" data-testid="bffs-link-layer" aria-hidden="true">
      {Array.from({ length: MAX_LINKS }).map((_, i) => (
        <g key={i}>
          <path
            ref={(el) => {
              glowRefs.current[i] = el
            }}
            fill="none"
            strokeLinecap="round"
            opacity={0}
            style={{ mixBlendMode: 'screen' }}
          />
          <path
            ref={(el) => {
              coreRefs.current[i] = el
            }}
            fill="none"
            strokeLinecap="round"
            opacity={0}
          />
          {Array.from({ length: HEARTS_PER }).map((_, h) => (
            <g
              key={h}
              ref={(el) => {
                if (!heartRefs.current[i]) heartRefs.current[i] = []
                heartRefs.current[i]![h] = el
              }}
              opacity={0}
            >
              <FaHeart size={14} x={-7} y={-7} color={HEART} />
            </g>
          ))}
        </g>
      ))}
    </g>
  )
}
