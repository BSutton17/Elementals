import { useEffect, useRef, useState } from 'react'

// Half Past 12 — the victim's own HUD numbers slip out of sync with reality.
// While the scramble is active this hook produces randomized DISPLAY values that
// churn on a timer; consumers show these instead of the real numbers. It is
// PURELY COSMETIC: callers keep using the real values for every decision (can I
// afford this? is it on cooldown?), so nothing here changes what a click does.
//
//   • gold        → 0–1000        every 0.5s
//   • income /s   → 12.0–100.0    every 0.5s
//   • citizens    → 10–50         every 0.5s
//   • castle HP   → 0–10000       every 0.5s
//   • shield HP   → 0–2000        every 0.5s   (only shown when a shield is up)
//   • Supernova meter (Space only) → 0–250     every 0.5s (its full charge range)
//   • ability costs (cast / upgrade / unlock) → 0–1000 per ability, every 0.5s
//   • "can I afford it?" LOOK → flips with 20% chance every 1s (visual only)

export interface ScrambleDisplay {
  gold: number
  incomePerSecond: number
  citizens: number
  castleHp: number
  shieldHp: number
  /** Scrambled displayed Supernova charge (Space only; 0–250). */
  supernovaMeter: number
  /** Scrambled displayed cast cost for an ability id (0–1000). */
  cost: (abilityId: string) => number
  /** Scrambled displayed upgrade cost for an ability id (0–1000). */
  upgradeCost: (abilityId: string) => number
  /** Scrambled displayed unlock/buy cost for an ability id (0–1000). */
  unlockCost: (abilityId: string) => number
  /** Scrambled displayed cooldown for an ability id, in seconds (1–30). */
  cooldown: (abilityId: string) => number
  /** Whether an ability should currently LOOK affordable (visual only). */
  affordable: (abilityId: string) => boolean
}

const ri = (lo: number, hi: number) => Math.floor(lo + Math.random() * (hi - lo + 1))
const rf = (lo: number, hi: number) => lo + Math.random() * (hi - lo)

interface Scalars {
  gold: number
  incomePerSecond: number
  citizens: number
  castleHp: number
  shieldHp: number
  supernovaMeter: number
}

function genScalars(): Scalars {
  return {
    gold: ri(0, 1000),
    incomePerSecond: rf(12, 100),
    citizens: ri(10, 50),
    castleHp: ri(0, 10000),
    shieldHp: ri(0, 2000),
    supernovaMeter: ri(0, 250),
  }
}

interface Costs {
  cost: number
  upgrade: number
  unlock: number
  cooldown: number
}

export function useScrambleValues(active: boolean): ScrambleDisplay | null {
  const [vals, setVals] = useState<Scalars>(genScalars)
  // Per-ability random costs, regenerated each 0.5s window (lazy per id).
  const costRef = useRef<Map<string, Costs>>(new Map())
  // Per-ability "looks affordable" flag, flipped 20%/1s (persists between flips).
  const affordRef = useRef<Map<string, boolean>>(new Map())
  const [, force] = useState(0)

  useEffect(() => {
    if (!active) return
    costRef.current.clear()
    affordRef.current.clear()
    setVals(genScalars())

    // Numbers + ability costs churn every half second.
    const valueTimer = setInterval(() => {
      costRef.current.clear() // fresh random costs next access
      setVals(genScalars())
    }, 500)

    // Affordability LOOK flips independently once a second (visual only).
    const affordTimer = setInterval(() => {
      for (const [id, cur] of affordRef.current) {
        if (Math.random() < 0.2) affordRef.current.set(id, !cur)
      }
      force((n) => n + 1)
    }, 1000)

    return () => {
      clearInterval(valueTimer)
      clearInterval(affordTimer)
    }
  }, [active])

  if (!active) return null

  const costsFor = (id: string): Costs => {
    let c = costRef.current.get(id)
    if (!c) {
      c = { cost: ri(0, 1000), upgrade: ri(0, 1000), unlock: ri(0, 1000), cooldown: ri(1, 30) }
      costRef.current.set(id, c)
    }
    return c
  }

  return {
    ...vals,
    cost: (id) => costsFor(id).cost,
    upgradeCost: (id) => costsFor(id).upgrade,
    unlockCost: (id) => costsFor(id).unlock,
    cooldown: (id) => costsFor(id).cooldown,
    affordable: (id) => {
      if (!affordRef.current.has(id)) affordRef.current.set(id, true)
      return affordRef.current.get(id)!
    },
  }
}
