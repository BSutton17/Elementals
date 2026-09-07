import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeviceSettings } from './DeviceSettings'
import {
  getDisplaySettings,
  resetDisplaySettingsForTest,
} from '../game/displaySettings'

const sendSyncRate = vi.fn()
vi.mock('../sockets/session', () => ({ sendSyncRate: () => sendSyncRate() }))
vi.mock('../sockets/socket', () => ({ socket: { connected: true } }))

describe('the per-device settings panel', () => {
  beforeEach(() => {
    resetDisplaySettingsForTest()
    localStorage.clear()
    sendSyncRate.mockClear()
  })

  it('starts with both off, and turning battery saver on sticks', () => {
    render(<DeviceSettings />)
    const box = screen.getByTestId('setting-battery-saver') as HTMLInputElement
    expect(box.checked).toBe(false)

    fireEvent.click(box)
    expect(getDisplaySettings().batterySaver).toBe(true)
    // …and the stylesheets can see it.
    expect(document.documentElement.getAttribute('data-fx')).toBe('low')
  })

  it('tells the server the moment the rate changes, not at the next connect', () => {
    // ⚠️ THE SETTING IS USUALLY CHANGED MID-MATCH, because that is when the
    // phone is hot enough to make somebody go looking for it. Waiting for the
    // next connection would mean it did nothing until they reloaded.
    render(<DeviceSettings />)
    fireEvent.click(screen.getByTestId('setting-rate-reduced'))

    expect(getDisplaySettings().syncRate).toBe('reduced')
    expect(sendSyncRate).toHaveBeenCalledTimes(1)
  })

  it('can be turned back off again', () => {
    render(<DeviceSettings />)
    fireEvent.click(screen.getByTestId('setting-rate-reduced'))
    fireEvent.click(screen.getByTestId('setting-rate-normal'))
    expect(getDisplaySettings().syncRate).toBe('normal')
    expect(sendSyncRate).toHaveBeenCalledTimes(2)
  })

  it('says out loud that minigames are exempt', () => {
    // The one thing a player must not have to discover for themselves: the
    // saving does not apply where it could cost them a minigame.
    render(<DeviceSettings />)
    expect(screen.getByText(/minigames always run at full speed/i)).toBeTruthy()
  })

  it('says the settings belong to the device, not the account', () => {
    render(<DeviceSettings />)
    expect(screen.getByText(/kept on this device only/i)).toBeTruthy()
  })
})
