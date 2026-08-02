import { useEffect, useRef, useState } from 'react'
import { CiNoWaitingSign } from 'react-icons/ci'
import { HiOutlineEmojiSad } from 'react-icons/hi'
import { onGameEvents } from '../../game/gameEvents'
import type { DamageEvent } from '../../game/events'
import './WagerResultLayer.css'

// The verdict on Dark's Yin and Yang, drawn inside the arena SVG above the
// kingdom that was wagered on.
//
// The victim spends the whole wager not knowing which side was called — the
// overlay on their screen says nothing on purpose. This is the moment they find
// out whether they read it right, and it is public: everyone watching sees the
// call land or miss.
//
// The outcome is read off the settlement's own `damage` event, whose cause the
// server tags `yinYang:<side>:<right|wrong>`. No extra event needed, and the
// icon can never disagree with the damage that was actually dealt.

/** How long the verdict hangs over the castle (ms). */
const HOLD_MS = 2600
/** How far above the castle it sits, in arena units. */
const ABOVE = 178

interface Verdict {
  key: number
  playerId: string
  /** Did they read the wager correctly (and take only half)? */
  right: boolean
}

export function WagerResultLayer({
  positionOf,
}: {
  /** Arena position of a kingdom, or undefined if it has none. */
  positionOf: (id: string) => { x: number; y: number } | undefined
}) {
  const [verdicts, setVerdicts] = useState<Verdict[]>([])
  // Read through a ref: `positionOf` is rebuilt every render, and putting it in
  // the deps would re-subscribe constantly and drop pending timers.
  const locate = useRef(positionOf)
  locate.current = positionOf

  useEffect(() => {
    let seq = 0
    const timers: ReturnType<typeof setTimeout>[] = []

    const unsubscribe = onGameEvents((events) => {
      for (const event of events) {
        if (event.type !== 'damage') continue
        const dmg = event as unknown as DamageEvent
        if (!dmg.cause?.startsWith('yinYang:')) continue

        // cause is `yinYang:<side>:<right|wrong>` — the side stays secret even
        // now; only whether they read it is shown.
        const right = dmg.cause.endsWith(':right')
        const key = ++seq
        setVerdicts((prev) => [...prev, { key, playerId: dmg.targetId, right }])
        timers.push(
          setTimeout(
            () => setVerdicts((prev) => prev.filter((v) => v.key !== key)),
            HOLD_MS,
          ),
        )
      }
    })

    return () => {
      unsubscribe()
      timers.forEach(clearTimeout)
    }
  }, [])

  if (verdicts.length === 0) return null

  return (
    <g className="wager-result" data-testid="wager-result" aria-hidden="true">
      {verdicts.map((v) => {
        const at = locate.current(v.playerId)
        if (!at) return null
        const Icon = v.right ? CiNoWaitingSign : HiOutlineEmojiSad
        return (
          <g
            key={v.key}
            className={`wager-result__mark wager-result__mark--${v.right ? 'right' : 'wrong'}`}
            transform={`translate(${at.x} ${at.y - ABOVE})`}
            data-testid={`wager-${v.right ? 'right' : 'wrong'}`}
          >
            <Icon size={78} x={-39} y={-39} color={v.right ? '#8fe3a0' : '#ff8f9a'} />
          </g>
        )
      })}
    </g>
  )
}
