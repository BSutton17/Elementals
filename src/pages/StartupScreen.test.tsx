import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StartupScreen } from './StartupScreen'

const noop = () => {}

describe('StartupScreen', () => {
  it('renders the game title', () => {
    render(<StartupScreen name="" onName={noop} onJoin={noop} onJoinPublic={noop} />)
    expect(screen.getByRole('heading', { name: 'Elementals' })).toBeTruthy()
  })

  it('disables Create Room while offline and shows the offline status', () => {
    const { container } = render(
      <StartupScreen name="Alice" onName={noop} onJoin={noop} onJoinPublic={noop} />,
    )
    const create = screen.getByRole('button', {
      name: /create room/i,
    }) as HTMLButtonElement
    expect(create.disabled).toBe(true) // offline
    expect(container.querySelector('.startup__status--offline')).toBeTruthy()
  })

  it('navigates to the join screen', () => {
    // "Join Room" became "Join Private" when public matchmaking arrived — the
    // code-entry screen it opens is unchanged.
    const onJoin = vi.fn()
    render(<StartupScreen name="" onName={noop} onJoin={onJoin} onJoinPublic={noop} />)
    fireEvent.click(screen.getByRole('button', { name: /join private/i }))
    expect(onJoin).toHaveBeenCalledTimes(1)
  })

  it('gates matchmaking behind a name and a connection, like Create Room', () => {
    // ⚠️ THESE TESTS RUN OFFLINE, so `connected` is false throughout and every
    // name-gated button stays disabled — the same reason Create Room is
    // asserted disabled above. What is checked here is that Join Public shares
    // that gate rather than being clickable into a request the server refuses.
    const onJoinPublic = vi.fn()
    render(<StartupScreen name="Alice" onName={noop} onJoin={noop} onJoinPublic={onJoinPublic} />)

    const publicBtn = screen.getByRole('button', {
      name: /join public/i,
    }) as HTMLButtonElement
    expect(publicBtn.disabled).toBe(true)
    fireEvent.click(publicBtn)
    expect(onJoinPublic).not.toHaveBeenCalled()

    // Join Private is not gated: it only opens the code-entry screen, which
    // needs neither a name nor a live socket.
    const privateBtn = screen.getByRole('button', {
      name: /join private/i,
    }) as HTMLButtonElement
    expect(privateBtn.disabled).toBe(false)
  })

  it('opens and closes the How to Play walkthrough', () => {
    render(<StartupScreen name="" onName={noop} onJoin={noop} onJoinPublic={noop} />)
    expect(screen.queryByRole('dialog', { name: /how to play/i })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /^how to play$/i }))
    expect(screen.getByRole('dialog', { name: /how to play/i })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /close tutorial/i }))
    expect(screen.queryByRole('dialog', { name: /how to play/i })).toBeNull()
  })
})
