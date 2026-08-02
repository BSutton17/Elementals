import { rarityOf, type CardRarity } from './PlayingCard'

// Blackjack's cinematic broken into named stages, kept as pure data so the
// component only has to say "which stage am I in" and the server can hold its
// damage for exactly as long as the whole thing runs.
//
//   summon    — the card materialises face down over the Joker kingdom
//   approach  — it RUSHES at the camera on an exponential curve, growing and
//               turning over as it comes, so it arrives already face-up
//   showcase  — it floats, glows, and is orbited for a full 3 s
//   throw     — it shrinks and accelerates at the victim, spinning
//   impact    — it slices through and bursts (the damage lands HERE)

export type BlackjackStage =
  | 'summon'
  | 'approach'
  | 'showcase'
  | 'throw'
  | 'impact'
  | 'done'

/** Each stage's duration in ms, in order. */
export const STAGE_MS: Record<Exclude<BlackjackStage, 'done'>, number> = {
  summon: 500,
  // The fly-in absorbed the old separate flip: the card turns over WHILE it
  // rushes the camera rather than after it lands, so the reveal and the
  // approach are one motion. Only the travel BEFORE the reveal was sped up —
  // the showcase that follows still runs its full length.
  approach: 750,
  showcase: 3000, // the promised 3 seconds of clear, readable card
  throw: 500,
  impact: 500,
}

export const STAGE_ORDER: Exclude<BlackjackStage, 'done'>[] = [
  'summon',
  'approach',
  'showcase',
  'throw',
  'impact',
]

/** The tick at which each stage begins, ms from cast. */
export const STAGE_START: Record<Exclude<BlackjackStage, 'done'>, number> =
  STAGE_ORDER.reduce(
    (acc, stage, i) => {
      acc[stage] = i === 0 ? 0 : acc[STAGE_ORDER[i - 1]!] + STAGE_MS[STAGE_ORDER[i - 1]!]
      return acc
    },
    {} as Record<Exclude<BlackjackStage, 'done'>, number>,
  )

/**
 * The whole cinematic's length. The SERVER holds Blackjack's damage for the
 * same window (`BLACKJACK_IMPACT_DELAY` in jokerAbilities.ts) so the victim is
 * never hurt before the card physically reaches them — keep the two in step.
 */
export const BLACKJACK_TOTAL_MS =
  STAGE_ORDER.reduce((sum, s) => sum + STAGE_MS[s], 0)

/** Which stage the cinematic is in at `elapsed` ms. */
export function stageAt(elapsed: number): BlackjackStage {
  for (const stage of STAGE_ORDER) {
    if (elapsed < STAGE_START[stage] + STAGE_MS[stage]) return stage
  }
  return 'done'
}

/** 0→1 progress through the current stage. */
export function stageProgress(elapsed: number, stage: BlackjackStage): number {
  if (stage === 'done') return 1
  const start = STAGE_START[stage]
  return Math.min(1, Math.max(0, (elapsed - start) / STAGE_MS[stage]))
}

/** How loud a card's presentation should be. */
export interface RarityPresentation {
  /** Particle count multiplier for the showcase. */
  particles: number
  /** Bloom size behind the card, in rem. */
  bloomRem: number
  /** Extra full turns during the flip — anticipation scales with the prize. */
  extraFlips: number
  /** Whether the chaotic rainbow/confetti layer runs (jokers only). */
  chaos: boolean
}

const PRESENTATION: Record<CardRarity, RarityPresentation> = {
  number: { particles: 1, bloomRem: 16, extraFlips: 0, chaos: false },
  face: { particles: 2, bloomRem: 24, extraFlips: 1, chaos: false },
  joker: { particles: 3.5, bloomRem: 34, extraFlips: 2, chaos: true },
}

export function presentationFor(card: string): RarityPresentation {
  return PRESENTATION[rarityOf(card)]
}

/**
 * Exponential ease-in — barely moves, then rushes. This is the fly-in's curve:
 * the card hangs a moment before hurtling at the camera, rather than sliding in
 * at a constant rate.
 */
export function expoIn(p: number): number {
  return p <= 0 ? 0 : Math.pow(2, 10 * (p - 1))
}

/** Smooth 0→1, used for the turn-over so the reveal reads at any speed. */
export function smoothstep(p: number): number {
  const t = Math.min(1, Math.max(0, p))
  return t * t * (3 - 2 * t)
}

/**
 * How far through its turn-over the card is during the approach, 0→1. It
 * completes just BEFORE the card lands, so the last stretch of the rush is
 * spent face-up and readable.
 */
export const REVEAL_COMPLETE_AT = 0.85

/**
 * How many HALF-turns the card makes on its way in. This must always be ODD:
 * the front face is mounted at 180°, so an even number of half-turns lands the
 * card back-side-to-the-camera and the whole reveal shows a card back. Better
 * cards spin longer, but they still have to finish facing the player.
 */
export function halfTurnsFor(extraFlips: number): number {
  return 1 + extraFlips * 2
}

/** The card's total turn, in degrees, once the reveal is complete. */
export function flipDegreesFor(extraFlips: number): number {
  return halfTurnsFor(extraFlips) * 180
}

/**
 * Whether the FRONT of the card is the side facing the camera at `flipDeg`.
 * The front sits at 180°, so it is visible whenever the card's own rotation
 * puts it in the far half-turn — true for 180°, false again at 360°, and so on
 * through a multi-turn reveal.
 */
export function isFaceUp(flipDeg: number): boolean {
  return Math.cos((flipDeg * Math.PI) / 180) < 0
}
