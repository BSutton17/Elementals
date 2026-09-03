import { useEffect, useRef, useState } from 'react'
import type { PartySnapshot } from '../../game/party'

/**
 * The bomb going off.
 *
 * A ring of fire on the kingdom that was holding it, and a shove to the whole
 * screen. The damage number arrives on its own — the server emits a proper
 * `damage` event so the ordinary floating-number layer shows it — so what is
 * left for this component is the part a number cannot carry: that something
 * EXPLODED, and where.
 *
 * ⚠️ TRIGGERED OFF THE STATE, NOT AN EVENT. The exploded kingdom is marked in
 * the session (`data.exploded`), which means a client that joined late, tabbed
 * back in, or dropped a socket frame still sees the blast — an event fires once
 * and is gone. Fired once per session by remembering which explosion has
 * already been played.
 */

/** Long enough to read, short enough not to sit on the board. */
const BLAST_MS = 1100

export function BombBlast({
  party,
  positionOf,
}: {
  party: PartySnapshot | null | undefined
  positionOf: (id: string) => { x: number; y: number } | undefined
}) {
  const [blast, setBlast] = useState<{ key: number; x: number; y: number } | null>(null)
  const played = useRef<string | null>(null)
  const nextKey = useRef(0)

  const victimId =
    party?.gameId === 'bombAttack'
      ? (Object.entries(party.players).find(([, p]) => p.data.exploded === true)?.[0] ?? null)
      : null

  useEffect(() => {
    if (victimId === null) return
    // One blast per victim per session: the flag stays set for the whole
    // lingering result, and re-firing on every sync would be a strobe.
    if (played.current === victimId) return
    played.current = victimId

    const at = positionOf(victimId)
    if (!at) return
    const key = nextKey.current++
    setBlast({ key, x: at.x, y: at.y })

    document.body.classList.add('party-quake')
    const stop = window.setTimeout(() => {
      document.body.classList.remove('party-quake')
      setBlast(null)
    }, BLAST_MS)
    return () => {
      window.clearTimeout(stop)
      // ⚠️ ALWAYS TAKE THE SHAKE OFF. It lives on <body>, outside this tree, so
      // an unmount mid-blast (the session clearing, the match ending) would
      // leave the whole page shaking with nothing left to stop it.
      document.body.classList.remove('party-quake')
    }
  }, [victimId, positionOf])

  // A session with no explosion yet resets the guard, so the next bomb blasts.
  useEffect(() => {
    if (victimId === null && party?.gameId !== 'bombAttack') played.current = null
  }, [victimId, party?.gameId])

  if (!blast) return null

  return (
    <g className="bomb-blast" data-testid="bomb-blast" aria-hidden="true" key={blast.key}>
      <circle className="bomb-blast__core" cx={blast.x} cy={blast.y} r={40} />
      <circle className="bomb-blast__ring" cx={blast.x} cy={blast.y} r={40} />
      <circle className="bomb-blast__ring bomb-blast__ring--late" cx={blast.x} cy={blast.y} r={40} />
      {/* Debris: eight shards thrown outward, so the blast has grain rather
          than being two expanding circles. */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2
        return (
          <line
            key={i}
            className="bomb-blast__shard"
            x1={blast.x}
            y1={blast.y}
            x2={blast.x + Math.cos(angle) * 96}
            y2={blast.y + Math.sin(angle) * 96}
            style={{ animationDelay: `${i * 12}ms` }}
          />
        )
      })}
    </g>
  )
}
