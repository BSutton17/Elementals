import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  getDisplaySettings,
  initDisplaySettings,
  setDisplaySettings,
  resetDisplaySettingsForTest,
} from './displaySettings'
import { applyStateSync, subscribeGame, clearGameState } from './gameState'
import type { PartySnapshot } from './party'

/**
 * The two per-device settings, and the one rule that keeps them honest.
 *
 * ⚠️ A COMFORT SETTING MUST NEVER COST SOMEBODY THE GAME. Both of these delay
 * when this client learns things, and Reaction Test is scored by the SERVER from
 * the tick a press arrives against the tick the button turned green — so a
 * player told about green a fifth of a second late posts a fifth of a second
 * worse time for having tried to save their battery. That is the failure these
 * tests exist to prevent, and it is invisible in play: the game still works,
 * the player just quietly loses more.
 */

beforeEach(() => {
  resetDisplaySettingsForTest()
  localStorage.clear()
  clearGameState()
})

afterEach(() => {
  vi.useRealTimers()
})

const party = (resolved: boolean): PartySnapshot => ({
  gameId: 'reaction',
  description: 'Tap when it turns green',
  elapsedTicks: 10,
  ticksRemaining: 100,
  shared: { green: false },
  players: { me: { done: false, outcome: null, finishedTick: null, data: {} } },
  firstFinisherId: null,
  finishOrder: [],
  resolved,
  resultText: null,
})

const sync = (tick: number, p: PartySnapshot | null = null) =>
  applyStateSync({ tick, serverTime: Date.now(), players: [], party: p })

describe('the settings themselves', () => {
  it('start off, because a setting nobody chose is a decision', () => {
    expect(getDisplaySettings()).toEqual({ batterySaver: false, syncRate: 'normal' })
  })

  it('survive a reload, and belong to the device', () => {
    setDisplaySettings({ batterySaver: true, syncRate: 'reduced' })
    resetDisplaySettingsForTest()
    expect(initDisplaySettings()).toEqual({ batterySaver: true, syncRate: 'reduced' })
  })

  it('puts the switch where the stylesheets can see it', () => {
    setDisplaySettings({ batterySaver: true })
    expect(document.documentElement.getAttribute('data-fx')).toBe('low')
    setDisplaySettings({ batterySaver: false })
    expect(document.documentElement.getAttribute('data-fx')).toBeNull()
  })

  it('falls back to the defaults rather than throwing when storage is unusable', () => {
    // Private browsing, or a user who has blocked site data. The game has to
    // start either way.
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(() => initDisplaySettings()).not.toThrow()
    expect(getDisplaySettings().batterySaver).toBe(false)
    spy.mockRestore()
  })

  it('survives junk in storage', () => {
    localStorage.setItem('kingdoms.display', '{ not json')
    expect(() => initDisplaySettings()).not.toThrow()
    expect(getDisplaySettings()).toEqual({ batterySaver: false, syncRate: 'normal' })
  })
})

describe('battery saver redraws less often', () => {
  it('draws every sync when it is off', () => {
    const drew = vi.fn()
    subscribeGame(drew)
    sync(1)
    sync(2)
    sync(3)
    expect(drew).toHaveBeenCalledTimes(3)
  })

  it('coalesces a burst into one redraw when it is on', () => {
    vi.useFakeTimers()
    setDisplaySettings({ batterySaver: true })
    const drew = vi.fn()
    subscribeGame(drew)

    sync(1)
    sync(2)
    sync(3)
    expect(drew).not.toHaveBeenCalled()

    vi.advanceTimersByTime(250)
    expect(drew).toHaveBeenCalledTimes(1)
  })

  it('always draws the last one — a dropped trailing edge would freeze the screen', () => {
    vi.useFakeTimers()
    setDisplaySettings({ batterySaver: true })
    let seen = 0
    subscribeGame(() => (seen += 1))

    sync(1)
    vi.advanceTimersByTime(250)
    expect(seen).toBe(1)
    // …and a lone late sync is not swallowed by the closed window.
    sync(2)
    vi.advanceTimersByTime(250)
    expect(seen).toBe(2)
  })
})

describe('a minigame is never delayed, whatever the settings say', () => {
  it('draws instantly while a session is live', () => {
    vi.useFakeTimers()
    setDisplaySettings({ batterySaver: true })
    const drew = vi.fn()
    subscribeGame(drew)

    // ⚠️ THE WHOLE POINT. Reaction Test is scored from when the press arrives;
    // learning about the green light 200ms late is 200ms added to the player's
    // time, for no reason they could see.
    sync(1, party(false))
    expect(drew).toHaveBeenCalledTimes(1)
    sync(2, party(false))
    expect(drew).toHaveBeenCalledTimes(2)
  })

  it('goes back to coalescing once the session resolves', () => {
    vi.useFakeTimers()
    setDisplaySettings({ batterySaver: true })
    const drew = vi.fn()
    subscribeGame(drew)

    sync(1, party(true)) // resolved: the game is over, the banner is lingering
    expect(drew).not.toHaveBeenCalled()
    vi.advanceTimersByTime(250)
    expect(drew).toHaveBeenCalledTimes(1)
  })

  it('does not sit on a queued redraw when a session starts', () => {
    // A window opened a moment before the minigame began must not hold the
    // first frame of it back.
    vi.useFakeTimers()
    setDisplaySettings({ batterySaver: true })
    const drew = vi.fn()
    subscribeGame(drew)

    sync(1) // opens a coalescing window
    expect(drew).not.toHaveBeenCalled()
    sync(2, party(false)) // the session starts
    expect(drew).toHaveBeenCalledTimes(1)

    // …and the window it cancelled does not fire a second, stale redraw.
    vi.advanceTimersByTime(500)
    expect(drew).toHaveBeenCalledTimes(1)
  })
})
