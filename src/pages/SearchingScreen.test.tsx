import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Matchmaking is mocked: these tests are about what the screen LOOKS like and
// how it hands off, not about the lobby transport.
const joinPublicRoom = vi.fn()
vi.mock('../game/lobbyStore', () => ({
  joinPublicRoom: (...args: unknown[]) => joinPublicRoom(...args),
}))

const { SearchingScreen } = await import('./SearchingScreen')

const noop = () => {}

describe('SearchingScreen', () => {
  beforeEach(() => {
    joinPublicRoom.mockReset()
    // Never resolves by default, so the screen stays in its searching state.
    joinPublicRoom.mockReturnValue(new Promise(() => {}))
  })

  // The bug this screen had: it rendered on the bare page with no background of
  // its own and came out white, so matchmaking looked like a different app had
  // loaded halfway through the flow. It now shares the menu's `.startup` shell
  // with StartupScreen and JoinScreen.
  it('wears the main menu shell so it matches the rest of the pre-lobby flow', () => {
    const { container } = render(
      <SearchingScreen name="Alice" onSeated={noop} onCancel={noop} />
    )
    const main = container.querySelector('main')!
    expect(main.classList.contains('startup')).toBe(true)
    expect(main.classList.contains('searching')).toBe(true)
    expect(container.querySelector('.startup__content')).toBeTruthy()
  })

  it('uses the menu type and button styles rather than its own', () => {
    const { container } = render(
      <SearchingScreen name="Alice" onSeated={noop} onCancel={noop} />
    )
    expect(container.querySelector('.startup__title')).toBeTruthy()
    expect(container.querySelector('.startup__tagline')).toBeTruthy()
    const cancel = screen.getByRole('button', { name: /cancel/i })
    expect(cancel.classList.contains('startup__secondary')).toBe(true)
  })

  it('shows the search state and a spinner', () => {
    render(<SearchingScreen name="Alice" onSeated={noop} onCancel={noop} />)
    expect(screen.getByText(/searching for room/i)).toBeTruthy()
    expect(screen.getByText(/looking for other players/i)).toBeTruthy()
    expect(screen.getByRole('progressbar')).toBeTruthy()
  })

  it('cancels', () => {
    const onCancel = vi.fn()
    render(<SearchingScreen name="Alice" onSeated={noop} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('reports a failed search with the menu error style and a way back', async () => {
    joinPublicRoom.mockResolvedValue({ ok: false, error: { message: 'No rooms open' } })
    const { container } = render(
      <SearchingScreen name="Alice" onSeated={noop} onCancel={noop} />
    )
    await waitFor(() => expect(screen.getByText('No rooms open')).toBeTruthy())
    expect(container.querySelector('.startup__error')).toBeTruthy()
    expect(screen.getByRole('button', { name: /back/i })).toBeTruthy()
  })

  it('announces the room before handing off, instead of snapping to the lobby', async () => {
    joinPublicRoom.mockResolvedValue({ ok: true })
    const onSeated = vi.fn()
    const { container } = render(
      <SearchingScreen name="Alice" onSeated={onSeated} onCancel={noop} />
    )
    // The hand-off beat: the text swaps to the arrival copy and fades, and the
    // spinner settles rather than stopping dead. Snapping straight to a full
    // lobby reads as a glitch.
    await waitFor(() => expect(screen.getByText(/room found/i)).toBeTruthy())
    expect(screen.getByText(/taking you to the lobby/i)).toBeTruthy()
    expect(container.querySelector('.searching__text--out')).toBeTruthy()
    expect(container.querySelector('.searching__spinner--found')).toBeTruthy()
    // The lobby is not entered until the beat has played.
    expect(onSeated).not.toHaveBeenCalled()
  })
})
