import { useEffect, useState } from 'react'
import { TutorialStep } from '../TutorialStep'
import { CastleSprite } from '../../CastleSprite'
import { HealthBar } from '../../HealthBar'
import '../../BattlefieldView.css'

// Page 2 — the arena. Castles around a circle; one keeps getting clobbered so
// the HP bar lesson teaches itself.

const RING = [
  { id: 'water', color: '#4aa3ff', angle: -90 },
  { id: 'fire', color: '#ff6b4a', angle: 0 },
  { id: 'ice', color: '#8fe3ff', angle: 90 },
  { id: 'nature', color: '#6bd88a', angle: 180 },
] as const

const MAX_HP = 10_000
const HIT = 1_400
const VICTIM = 'fire'

export function ArenaStep() {
  const [hp, setHp] = useState(MAX_HP)
  const [seq, setSeq] = useState(0)

  // A looping little tragedy: the fire castle takes a hit every couple of
  // seconds until it's nearly done for, then is quietly restored.
  useEffect(() => {
    const timer = setInterval(() => {
      setHp((h) => (h - HIT <= 1_000 ? MAX_HP : h - HIT))
      setSeq((s) => s + 1)
    }, 1_900)
    return () => clearInterval(timer)
  }, [])

  return (
    <TutorialStep
      kicker="The battlefield"
      title="Welcome to the Arena"
      lead="Every kingdom's castle sits around one circle — yours included. Attacks chip away Castle HP, and at zero a kingdom is eliminated. For good."
    >
      <svg className="howto-stage howto-stage--arena" viewBox="-220 -190 440 370" aria-hidden="true">
        {/* The arena ring. */}
        <circle
          r={128}
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth={2}
          strokeDasharray="10 8"
        />
        {RING.map((k) => {
          const rad = (k.angle * Math.PI) / 180
          const x = Math.cos(rad) * 128
          const y = Math.sin(rad) * 128
          const isVictim = k.id === VICTIM
          return (
            <g key={k.id} transform={`translate(${x} ${y}) scale(0.52)`}>
              <g transform="translate(0 -100)">
                <HealthBar hp={isVictim ? hp : MAX_HP} maxHp={MAX_HP} />
              </g>
              <g transform="translate(0 16)">
                <CastleSprite color={k.color} />
              </g>
              {isVictim && seq > 0 && (
                <g key={seq}>
                  <circle className="howto-stage__impact" cx={0} cy={0} r={40} />
                  <text className="howto-stage__damage" x={54} y={-60}>
                    -{HIT}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
      <p className="howto-step__footnote">
        Poor Fire. Keep an eye on every health bar — including your own.
      </p>
    </TutorialStep>
  )
}
