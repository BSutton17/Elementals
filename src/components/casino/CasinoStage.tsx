import { useEffect, useRef, useState } from 'react'
import { SlotMachineOverlay } from '../slotMachine/SlotMachineOverlay'
import { RouletteOverlay } from '../roulette/RouletteOverlay'
import { spinSlotMachine, placeRouletteBet } from '../../game/matchStore'
import { HANDOVER_MS, nextGame, type CasinoDebt, type CasinoGame } from './casinoQueue'

// The one place either casino game is allowed on screen. It owns the stage: at
// most one overlay is mounted, and the next game only steps forward once the
// previous one reports its cinematic fully finished (see `casinoQueue.ts`).

export function CasinoStage({ debt }: { debt: CasinoDebt }) {
  /** Who holds the stage. Sticky — it outlives the server-side debt. */
  const [presenting, setPresenting] = useState<CasinoGame | null>(null)
  /** True during the handover beat, so nothing is mounted mid-transition. */
  const [handingOver, setHandingOver] = useState(false)

  const { spinAt, betAt } = debt
  const waiting = nextGame(debt)

  // Claim the stage for whatever is owed, but never while a game is still
  // playing or the handover beat is running.
  useEffect(() => {
    if (presenting || handingOver || !waiting) return
    setPresenting(waiting)
  }, [presenting, handingOver, waiting])

  // Release the stage when the presenting overlay is visually done, then pause
  // for a beat so the outgoing cabinet clears before the next one drops in.
  const finish = useRef<() => void>(() => {})
  finish.current = () => {
    setPresenting(null)
    // Only bother with the handover beat if something is actually queued.
    const queued = nextGame({ spinAt, betAt })
    if (!queued) return
    setHandingOver(true)
    setTimeout(() => setHandingOver(false), HANDOVER_MS)
  }

  return (
    <>
      {/* Joker's Slot Machine — blocking, and the only way out is to spin. */}
      <SlotMachineOverlay
        active={presenting === 'slot'}
        onSpin={spinSlotMachine}
        onFinished={() => finish.current()}
      />
      {/* Joker's Roulette — blocking; clicking a chip IS the bet. */}
      <RouletteOverlay
        active={presenting === 'roulette'}
        onBet={placeRouletteBet}
        onFinished={() => finish.current()}
      />
    </>
  )
}
