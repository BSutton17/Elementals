import { describe, it, expect } from 'vitest'
import { nextGame, stageOccupant, HANDOVER_MS } from './casinoQueue'
import {
  CRUISE_SPEED,
  DECEL_MS,
  MIN_CRUISE_MS,
  SPIN_UP_MS,
  SYMBOLS,
  blurFor,
  decelEase,
  landingTarget,
  reelStopMs,
  spinUpSpeed,
  stripOffset,
  symbolAt,
} from '../slotMachine/reelMotion'

describe('casino queue', () => {
  it('picks nothing when nothing is owed', () => {
    expect(nextGame({})).toBeNull()
  })

  it('picks whichever game was dealt first', () => {
    expect(nextGame({ spinAt: 10, betAt: 40 })).toBe('slot')
    expect(nextGame({ spinAt: 40, betAt: 10 })).toBe('roulette')
  })

  it('picks the only game owed', () => {
    expect(nextGame({ spinAt: 10 })).toBe('slot')
    expect(nextGame({ betAt: 10 })).toBe('roulette')
  })

  it('breaks a tie toward the ultimate', () => {
    expect(nextGame({ spinAt: 7, betAt: 7 })).toBe('slot')
  })

  it('never displaces a game that is still playing', () => {
    // The roulette holds the stage even though a slot machine was dealt EARLIER
    // — the wheel is mid-spin and must be allowed to finish.
    expect(stageOccupant('roulette', { spinAt: 1, betAt: 99 })).toBe('roulette')
  })

  it('keeps a finished-server game on screen while its cinematic runs', () => {
    // This is the case that used to break: the victim has bet, so the server
    // cleared `betAt`, but the ball is still rolling. Nothing may take over.
    expect(stageOccupant('roulette', { spinAt: 50 })).toBe('roulette')
  })

  it('hands the stage to the queued game once the stage is released', () => {
    expect(stageOccupant(null, { spinAt: 50 })).toBe('slot')
  })

  it('leaves the stage empty when nothing is owed', () => {
    expect(stageOccupant(null, {})).toBeNull()
  })

  it('pauses between games rather than cutting straight over', () => {
    expect(HANDOVER_MS).toBeGreaterThan(0)
  })
})

describe('slot reel motion', () => {
  it('starts from a standstill and accelerates into the spin', () => {
    // Nothing until the lever is pulled, then a quadratic wind-up.
    expect(spinUpSpeed(0)).toBe(0)
    expect(spinUpSpeed(SPIN_UP_MS)).toBeCloseTo(CRUISE_SPEED, 5)
    // Half way through the wind-up it is at a QUARTER speed, not half — the
    // reel is dragged up to speed rather than snapping there.
    expect(spinUpSpeed(SPIN_UP_MS / 2)).toBeCloseTo(CRUISE_SPEED / 4, 5)
    // And it holds at cruise afterwards rather than running away.
    expect(spinUpSpeed(SPIN_UP_MS * 4)).toBeCloseTo(CRUISE_SPEED, 5)
  })

  it('slows one reel at a time, left to right', () => {
    const stops = [0, 1, 2].map(reelStopMs)
    expect(stops[1]!).toBeGreaterThan(stops[0]!)
    expect(stops[2]!).toBeGreaterThan(stops[1]!)
  })

  it('always lands on the symbol the server rolled', () => {
    for (let target = 0; target < SYMBOLS.length; target++) {
      for (const from of [0, 3.4, 12.9, 101.5]) {
        const to = landingTarget(from, target)
        expect(symbolAt(to)).toBe(SYMBOLS[target])
        // It only ever slows to a stop — never reverses to find its symbol.
        expect(to).toBeGreaterThan(from)
      }
    }
  })

  it('travels far enough that the landing is never a jerk', () => {
    // A reel whose symbol is already in the window still takes a full run at it.
    expect(landingTarget(0, 0)).toBeGreaterThanOrEqual(SYMBOLS.length)
  })

  it('settles rather than stopping dead', () => {
    expect(decelEase(0)).toBe(0)
    expect(decelEase(1)).toBe(1)
    // Most of the ground is covered early: past halfway in the first third.
    expect(decelEase(0.33)).toBeGreaterThan(0.5)
    // …and the last stretch crawls.
    expect(decelEase(1) - decelEase(0.9)).toBeLessThan(0.05)
  })

  it('blurs in proportion to speed, and not at all at rest', () => {
    expect(blurFor(0)).toBe(0)
    expect(blurFor(CRUISE_SPEED)).toBeGreaterThan(blurFor(CRUISE_SPEED / 2))
    // Capped, so a fast reel is a streak and not a smear.
    expect(blurFor(CRUISE_SPEED * 10)).toBeLessThanOrEqual(7)
  })

  it('scrolls the strip smoothly across a symbol boundary', () => {
    // Just before and just after a whole symbol, the strip offset flips from
    // nearly +half a cell to nearly -half — the neighbouring cell taking over.
    expect(stripOffset(3.49)).toBeCloseTo(0.49, 5)
    expect(stripOffset(3.51)).toBeCloseTo(-0.49, 5)
    expect(stripOffset(4)).toBe(0)
    expect(symbolAt(3.49)).toBe(symbolAt(3))
    expect(symbolAt(3.51)).toBe(symbolAt(4))
  })

  it('gives a fast server reply a spin worth watching', () => {
    // Even if the roll comes back instantly, the reels wind up and run before
    // the first one is allowed to start settling.
    expect(MIN_CRUISE_MS).toBeGreaterThan(0)
    expect(SPIN_UP_MS + MIN_CRUISE_MS + DECEL_MS).toBeGreaterThan(2000)
  })
})
