import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PartyDebugPanel } from './PartyDebugPanel'

/**
 * The launcher used to check the minigames by hand.
 *
 * ⚠️ WHAT IS WORTH TESTING HERE IS THE SILENCE. This panel is a testing tool,
 * so its failure mode is uniquely expensive: a button that appears to do
 * nothing reads as "that minigame is broken", and the next hour goes into a
 * game that was never started. Every refusal has to reach the screen.
 *
 * The server is mocked because the panel deliberately knows nothing — the list,
 * the reasons and the refusals all come from it.
 */

const start = vi.fn()
const list = vi.fn()

vi.mock('../../game/party', () => ({
  partyDebugStart: (id: string) => start(id),
  partyDebugAvailable: () => list(),
}))

const game = (id: string, reason: string | null = null) => ({
  id,
  description: `the ${id} game`,
  reason,
})

describe('the minigame launcher', () => {
  beforeEach(() => {
    start.mockReset()
    list.mockReset()
    start.mockResolvedValue({ ok: true, error: null })
  })

  it('draws nothing at all when the server does not offer it', async () => {
    list.mockResolvedValue({ available: false, games: [] })
    const { container } = render(<PartyDebugPanel />)
    await waitFor(() => expect(list).toHaveBeenCalled())
    // Not merely hidden: on a deployed build for a non-admin there must be no
    // toggle to find, in the DOM or otherwise.
    expect(container.querySelector('.party-debug')).toBeNull()
  })

  it('lists every game the server sent, whatever they are called', async () => {
    // Deliberately not the real ids: the panel must never hold its own copy of
    // the registry, or a renamed game silently disappears from the check.
    list.mockResolvedValue({
      available: true,
      games: [game('alpha'), game('beta'), game('gamma')],
    })
    render(<PartyDebugPanel />)

    fireEvent.click(await screen.findByTestId('party-debug-toggle'))
    expect(screen.getByTestId('party-debug-alpha')).toBeTruthy()
    expect(screen.getByTestId('party-debug-gamma')).toBeTruthy()
    expect(screen.getByText(/3 minigames/)).toBeTruthy()
  })

  it('says why a game will not start, instead of the description', async () => {
    list.mockResolvedValue({
      available: true,
      games: [game('haunted', 'Needs an eliminated kingdom to raise')],
    })
    render(<PartyDebugPanel />)

    fireEvent.click(await screen.findByTestId('party-debug-toggle'))
    const button = screen.getByTestId('party-debug-haunted')
    expect(button.textContent).toContain('Needs an eliminated kingdom to raise')
    // Still pressable: the reason can be stale, and pressing it is how you find
    // out whether it still holds.
    expect((button as HTMLButtonElement).disabled).toBe(false)
  })

  it('shows the server’s own words when a start is refused', async () => {
    list.mockResolvedValue({ available: true, games: [game('haunted')] })
    start.mockResolvedValue({ ok: false, error: 'Needs an eliminated kingdom to raise' })
    render(<PartyDebugPanel />)

    fireEvent.click(await screen.findByTestId('party-debug-toggle'))
    fireEvent.click(screen.getByTestId('party-debug-haunted'))

    expect(await screen.findByText('Needs an eliminated kingdom to raise')).toBeTruthy()
    // And the panel stays open — a refusal you have to reopen the panel to read
    // is a refusal nobody reads.
    expect(screen.getByTestId('party-debug-panel')).toBeTruthy()
  })

  it('re-asks the list after a start, because starting one changes the others', async () => {
    list.mockResolvedValue({ available: true, games: [game('goldParty')] })
    render(<PartyDebugPanel />)

    fireEvent.click(await screen.findByTestId('party-debug-toggle'))
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByTestId('party-debug-goldParty'))

    // Raising ghosts is exactly what makes Haunted startable, so a list fetched
    // once on mount goes stale the moment anything is played.
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
  })
})
