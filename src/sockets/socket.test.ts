import { describe, it, expect } from 'vitest'
import { socket, isConnected, disconnectSocket } from './socket'

// Regression coverage for the reusable socket manager (#7). Tests stay offline:
// with autoConnect disabled, no real connection is opened.

describe('socket manager', () => {
  it('exposes a shared socket that does not auto-connect', () => {
    expect(socket).toBeDefined()
    expect(isConnected()).toBe(false)
  })

  it('does not throw when disconnecting while offline', () => {
    expect(() => disconnectSocket()).not.toThrow()
    expect(isConnected()).toBe(false)
  })
})
